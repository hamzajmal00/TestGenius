// app/api/run-test/route.js
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// 🧼 Clean AI-generated test code
function cleanTestCode(code) {
  return code?.replace(/```(javascript)?/g, '').trim() || '';
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
    const { testCode, testData = {}, url } = await req.json();

    if (!testCode || !url) {
      return NextResponse.json(
        { error: 'Test code and URL are required' },
        { status: 400 }
      );
    }

    // 🧱 Ensure Cypress project folders
    await ensureCypressStructure();

    // 🌍 Get baseUrl from full URL
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

    // ▶️ Run Cypress test
    let result;
    try {
      const { stdout, stderr } = await execPromise(
        `npx cypress run --spec "cypress/e2e/${fileName}" --browser chrome --headless`,
        {
          env: {
            ...process.env,
          },
          timeout: 120000,
        }
      );

      const passed =
        stdout.includes('All specs passed!') ||
        (stdout.includes('passing') && !stdout.includes('failing'));

      result = {
        passed,
        testCode: finalTestCode,
        output: stdout,
        errorOutput: stderr,
        testFilePath: `cypress/e2e/${fileName}`,
      };
    } catch (err) {
      result = {
        passed: false,
        testCode: finalTestCode,
        output: err.stdout || '',
        errorOutput: err.stderr || err.message,
        testFilePath: `cypress/e2e/${fileName}`,
        executionError: true,
      };
    }

    return NextResponse.json(result);
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
