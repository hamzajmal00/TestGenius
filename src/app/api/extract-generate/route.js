// /api/generate-test/route.js
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import axios from 'axios';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'deepseek/deepseek-chat-v3-0324:free';

function cleanTestCode(rawCode) {
  if (!rawCode) return '';

  // Remove markdown code blocks
  let cleaned = rawCode.replace(/```(?:javascript|js|cypress)?\n?/g, '');
  cleaned = cleaned.replace(/```\n?/g, '');

  // Remove extra whitespace and normalize line endings
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/\r\n/g, '\n');

  // Ensure proper indentation (2 spaces)
  const lines = cleaned.split('\n');
  const normalizedLines = lines.map((line) => {
    // Count leading spaces
    // Convert tabs to spaces
    const noTabs = line.replace(/^\t+/, (tabs) => '  '.repeat(tabs.length));
    return noTabs;
  });

  return normalizedLines.join('\n');
}

async function scrapePageStructure(url) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Navigate to page with timeout
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Extract page structure
    const pageInfo = await page.evaluate(() => {
      const forms = Array.from(document.forms).map((form) => ({
        id: form.id,
        action: form.action,
        method: form.method,
        inputs: Array.from(form.elements).map((element) => ({
          name: element.name,
          type: element.type,
          id: element.id,
          placeholder: element.placeholder,
          required: element.required,
        })),
      }));

      const buttons = Array.from(
        document.querySelectorAll(
          'button, input[type="submit"], input[type="button"]'
        )
      ).map((btn) => ({
        text: btn.textContent || btn.value,
        type: btn.type,
        id: btn.id,
        className: btn.className,
      }));

      const links = Array.from(document.querySelectorAll('a'))
        .slice(0, 10)
        .map((link) => ({
          text: link.textContent.trim(),
          href: link.href,
          id: link.id,
        }));

      return {
        title: document.title,
        forms,
        buttons,
        links,
        url: window.location.href,
      };
    });

    return pageInfo;
  } catch (error) {
    console.error('Scraping error:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function POST(req) {
  try {
    const { url, userStory, testData = {} } = await req.json();

    if (!url || !userStory) {
      return NextResponse.json(
        { error: 'URL and user story are required' },
        { status: 400 }
      );
    }

    // Scrape page structure
    const pageStructure = await scrapePageStructure(url);

    // Create test data string
    const testDataString =
      Object.keys(testData).length > 0
        ? JSON.stringify(testData, null, 2)
        : '{}';

    const prompt = `Generate a comprehensive Cypress test based on the following:

URL: ${url}
User Story: ${userStory}

Page Structure: ${
      pageStructure
        ? JSON.stringify(pageStructure, null, 2)
        : 'Could not scrape page structure'
    }

Test Data: ${testDataString}

Requirements:
1. Create a complete Cypress test using describe() and it() blocks
2. Include proper setup and teardown
3. Use cy.visit() to navigate to the URL
4. Include assertions to verify the user story requirements
5. Handle form interactions if applicable
6. Add proper waits and error handling
7. Use the provided test data in the test
8. Include comments explaining test steps
9. Follow Cypress best practices

Generate only the Cypress test code without any markdown formatting or explanations.`;

    const response = await axios.post(
      API_URL,
      {
        model: MODEL_NAME,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert QA engineer specializing in Cypress test automation. Generate clean, maintainable Cypress test code that follows best practices.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    const rawTestCode = response.data.choices[0].message.content;
    const cleanedTestCode = cleanTestCode(rawTestCode);
    const cleanedTestCodeUpdate = cleanedTestCode.replace(
      /cy\.visit\(([^)]+)\)(?!\s*,\s*\{)/g,
      (_match, urlParam) => {
        // Check if the parameter already contains options object
        if (urlParam.includes('{') && urlParam.includes('}')) {
          return `cy.visit(${urlParam})`;
        }
        return `cy.visit(${urlParam}, { failOnStatusCode: false })`;
      }
    );
    return NextResponse.json({
      testCode: cleanedTestCodeUpdate,
      pageStructure: pageStructure,
    });
  } catch (error) {
    console.error('Error generating test:', error);

    // Return a basic fallback test
    const fallbackTest = `describe('${userStory || 'User Story Test'}', () => {
  it('should complete the user scenario', () => {
    // Visit the page
    cy.visit('${url}');
    
    // Add your test steps here
    cy.get('body').should('be.visible');
    
    // TODO: Implement specific test steps based on user story
  });
});`;

    return NextResponse.json(
      {
        testCode: fallbackTest,
        pageStructure: null,
        error:
          'Generated fallback test due to: ' +
          (error.message || 'Unknown error'),
      },
      { status: 200 }
    );
  }
}
