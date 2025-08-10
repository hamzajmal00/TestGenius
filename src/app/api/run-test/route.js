import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import prisma from '@/lib/prisma';

const execPromise = util.promisify(exec);

// 🧼 Clean AI-generated test code
function cleanTestCode(code) {
  return (
    code
      ?.replace(/```(javascript|js|cypress)?/g, '')
      .replace(/```/g, '')
      .trim() || ''
  );
}

// 📁 Ensure required Cypress folders
async function ensureCypressStructure() {
  const dirs = ['cypress', 'cypress/e2e', 'cypress/support'];
  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir);
    try {
      await fs.access(fullPath);
    } catch {
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  const supportFile = path.join(process.cwd(), 'cypress/support/e2e.js');
  try {
    await fs.access(supportFile);
  } catch {
    await fs.writeFile(supportFile, '// Cypress support file\n', 'utf-8');
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { testCode, testData = {}, url, generationId, storyId } = body;

    if (!testCode || !url) {
      return NextResponse.json(
        { error: 'Test code and URL are required' },
        { status: 400 }
      );
    }

    // 🧱 Ensure Cypress project folders
    await ensureCypressStructure();

    // 🌍 baseUrl from URL
    const baseUrl = new URL(url).origin;
    const timestamp = Date.now();
    const fileName = `generated-${timestamp}.spec.cy.js`;
    const filePath = path.join(process.cwd(), 'cypress/e2e', fileName);

    // 📦 Inject testData if provided
    let finalTestCode = cleanTestCode(testCode);
    if (Object.keys(testData).length > 0) {
      const testDataCode = `const testData = ${JSON.stringify(
        testData,
        null,
        2
      )};\n\n`;
      finalTestCode = testDataCode + finalTestCode;
    }

    // 💾 Write test file
    await fs.writeFile(filePath, finalTestCode, 'utf-8');

    // 🛠 Write Cypress config if not exists
    const configPath = path.join(process.cwd(), 'cypress.config.js');
    const configContent = `
const { defineConfig } = require('cypress');
module.exports = defineConfig({
  e2e: {
    baseUrl: '${baseUrl}',
    supportFile: false,
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // Add node event listeners if needed
    },
  },
});
`;
    try {
      await fs.access(configPath);
    } catch {
      await fs.writeFile(configPath, configContent, 'utf-8');
    }

    // Ensure we have a generation to link the run to
    let genId = generationId;
    if (!genId && storyId) {
      const g = await prisma.testGeneration.create({
        data: {
          storyId,
          url,
          model: 'manual/run-without-generator',
          testCode: finalTestCode,
        },
        select: { id: true },
      });
      genId = g.id;
    }

    if (!genId) {
      // Hard requirement: link runs to a generation for traceability
      const g = await prisma.testGeneration.create({
        data: {
          storyId:
            storyId ||
            (
              await prisma.userStory.findFirst({ select: { id: true } })
            )?.id ||
            'unknown',
          url,
          model: 'manual/run',
          testCode: finalTestCode,
        },
        select: { id: true },
      });
      genId = g.id;
    }

    // Create RUN record (RUNNING)
    const run = await prisma.testRun.create({
      data: {
        generationId: genId,
        status: 'RUNNING',
      },
      select: { id: true },
    });

    // ▶️ Run Cypress test
    let stdout = '';
    let stderr = '';
    let passed = false;
    let executionError = false;

    try {
      const result = await execPromise(
        `npx cypress run --spec "cypress/e2e/${fileName}" --browser chrome --headless`,
        {
          env: { ...process.env },
          timeout: 120000,
        }
      );
      stdout = result.stdout || '';
      stderr = result.stderr || '';
      passed =
        stdout.includes('All specs passed!') ||
        (stdout.includes('passing') && !stdout.includes('failing'));
    } catch (err) {
      stdout = err.stdout || '';
      stderr = err.stderr || err.message;
      executionError = true;
      passed = false;
    }

    // Update RUN record
    await prisma.testRun.update({
      where: { id: run.id },
      data: {
        status: passed ? 'PASSED' : 'FAILED',
        passed,
        testFilePath: `cypress/e2e/${fileName}`,
        output: stdout,
        errorOutput: stderr,
        executionError,
        finishedAt: new Date(),
      },
    });

    // Optional: update story status and project roll-up
    const gen = await prisma.testGeneration.findUnique({
      where: { id: genId },
      select: { storyId: true },
    });

    if (gen?.storyId) {
      await prisma.userStory.update({
        where: { id: gen.storyId },
        data: { status: passed ? 'DONE' : 'IN_PROGRESS' },
      });

      // Roll up to project status
      const story = await prisma.userStory.findUnique({
        where: { id: gen.storyId },
        select: { projectId: true },
      });

      if (story?.projectId) {
        const failing = await prisma.testRun.count({
          where: {
            status: 'FAILED',
            generation: { story: { projectId: story.projectId } },
          },
        });
        const passingCount = await prisma.testRun.count({
          where: {
            status: 'PASSED',
            generation: { story: { projectId: story.projectId } },
          },
        });

        await prisma.project.update({
          where: { id: story.projectId },
          data: {
            testStatus:
              failing > 0
                ? 'FAILING'
                : passingCount > 0
                ? 'PASSING'
                : 'PENDING',
          },
        });
      }
    }

    return NextResponse.json({
      passed,
      testCode: finalTestCode,
      output: stdout,
      errorOutput: stderr,
      testFilePath: `cypress/e2e/${fileName}`,
      generationId: genId,
      runId: run.id,
    });
  } catch (err) {
    console.error('❌ Cypress execution failed:', err);
    return NextResponse.json(
      {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
