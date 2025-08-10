// /api/debug-test/route.js
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TEMP_DIR = path.join(process.cwd(), 'temp');

export async function POST(req) {
  try {
    const { testCode, testData = {}, url } = await req.json();

    const testId = uuidv4();
    const testDir = path.join(TEMP_DIR, testId);

    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'cypress', 'e2e'), { recursive: true });

    // Create the test file
    const finalTestCode = testCode.replace(
      /const testUser = \{[^}]*\};/,
      `const testUser = ${JSON.stringify(testData, null, 2)};`
    );

    await fs.writeFile(
      path.join(testDir, 'cypress', 'e2e', 'test.cy.js'),
      finalTestCode
    );

    // Create simple cypress config
    const config = {
      e2e: {
        baseUrl: new URL(url).origin,
        supportFile: false,
        specPattern: 'cypress/e2e/**/*.cy.js',
        video: false,
        screenshotOnRunFailure: true,
        chromeWebSecurity: false,
        defaultCommandTimeout: 15000,
        retries: { runMode: 0 },
      },
    };

    await fs.writeFile(
      path.join(testDir, 'cypress.config.js'),
      `module.exports = ${JSON.stringify(config, null, 2)};`
    );

    // Check if cypress is available
    const checkCypress = await new Promise((resolve) => {
      const check = spawn('npx', ['cypress', '--version'], {
        cwd: testDir,
        stdio: 'pipe',
      });

      let output = '';
      check.stdout.on('data', (data) => (output += data.toString()));
      check.stderr.on('data', (data) => (output += data.toString()));

      check.on('close', (code) => {
        resolve({ available: code === 0, output });
      });

      check.on('error', (err) => {
        resolve({ available: false, output: err.message });
      });
    });

    // Try to run cypress verify
    const verifyCypress = await new Promise((resolve) => {
      const verify = spawn('npx', ['cypress', 'verify'], {
        cwd: testDir,
        stdio: 'pipe',
      });

      let output = '';
      verify.stdout.on('data', (data) => (output += data.toString()));
      verify.stderr.on('data', (data) => (output += data.toString()));

      verify.on('close', (code) => {
        resolve({ verified: code === 0, output });
      });

      verify.on('error', (err) => {
        resolve({ verified: false, output: err.message });
      });
    });

    // Read the generated files
    const generatedConfig = await fs.readFile(
      path.join(testDir, 'cypress.config.js'),
      'utf-8'
    );
    const generatedTest = await fs.readFile(
      path.join(testDir, 'cypress', 'e2e', 'test.cy.js'),
      'utf-8'
    );

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });

    return NextResponse.json({
      debug: {
        testId,
        cypressCheck: checkCypress,
        cypressVerify: verifyCypress,
        generatedFiles: {
          config: generatedConfig,
          test: generatedTest.substring(0, 500) + '...',
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd(),
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      debug: {
        error: error.message,
        stack: error.stack,
      },
    });
  }
}
