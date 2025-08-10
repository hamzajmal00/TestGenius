import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import prisma from '@/lib/prisma';
import { chatWithRetry } from '@/lib/openrouter';

const MODEL_CANDIDATES = (
  process.env.OPENROUTER_FALLBACK_MODELS ||
  'deepseek/deepseek-chat-v3-0324:free|deepseek/deepseek-chat:free|qwen/qwen2.5-7b-instruct:free'
).split('|');

function cleanTestCode(rawCode) {
  if (!rawCode) return '';
  let cleaned = rawCode.replace(/```(?:javascript|js|cypress)?\n?/g, '');
  cleaned = cleaned.replace(/```\n?/g, '');
  cleaned = cleaned.trim().replace(/\r\n/g, '\n');
  const lines = cleaned.split('\n');
  const normalized = lines.map((line) =>
    line.replace(/^\t+/, (tabs) => '  '.repeat(tabs.length))
  );
  return normalized.join('\n');
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
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const pageInfo = await page.evaluate(() => {
      const forms = Array.from(document.forms)
        .slice(0, 20)
        .map((form) => ({
          id: form.id,
          action: form.action,
          method: form.method,
          inputs: Array.from(form.elements)
            .slice(0, 50)
            .map((el) => ({
              name: el.name,
              type: el.type,
              id: el.id,
              placeholder: el.placeholder,
              required: el.required,
              testid: el.getAttribute('data-testid'),
              ariaLabel: el.getAttribute('aria-label'),
              labelText: el.id
                ? document
                    .querySelector(`label[for="${el.id}"]`)
                    ?.textContent?.trim() || null
                : null,
              role: el.getAttribute('role'),
            })),
        }));

      const buttons = Array.from(
        document.querySelectorAll(
          'button, input[type="submit"], input[type="button"]'
        )
      )
        .slice(0, 50)
        .map((btn) => ({
          text: (btn.textContent || btn.value || '').trim(),
          type: btn.type,
          id: btn.id,
          className: btn.className,
          testid: btn.getAttribute('data-testid'),
          ariaLabel: btn.getAttribute('aria-label'),
          role: btn.getAttribute('role'),
        }));

      const links = Array.from(document.querySelectorAll('a'))
        .slice(0, 50)
        .map((link) => ({
          text: link.textContent.trim(),
          href: link.href,
          id: link.id,
          testid: link.getAttribute('data-testid'),
          ariaLabel: link.getAttribute('aria-label'),
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
    if (browser) await browser.close();
  }
}

export async function POST(req) {
  // Read body exactly once
  const payload = await req.json().catch(() => ({}));
  try {
    const { url, userStory, testData = {}, storyId } = payload;

    if (!url || !userStory) {
      return NextResponse.json(
        { error: 'URL and user story are required' },
        { status: 400 }
      );
    }

    const pageStructure = await scrapePageStructure(url);

    const testDataString =
      Object.keys(testData).length > 0
        ? JSON.stringify(testData, null, 2)
        : '{}';

    // Use relative path with baseUrl
    let visitUrl = url;
    try {
      const u = new URL(url);
      visitUrl = u.pathname + (u.search || '');
    } catch {}

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
1. Use describe() and it() blocks.
2. Use cy.visit('${visitUrl}') (baseUrl is configured).
3. Include assertions to verify the user story requirements.
4. Handle form interactions if applicable.
5. Add robust waits (assert element state), avoid arbitrary timeouts.
6. Stub external network calls via cy.intercept and assert on requests.
7. Use provided test data in the test.
8. Prefer selectors: data-testid > label text > aria-label > placeholder. Avoid XPath.
9. Do NOT use cy.exec, cy.task, cy.writeFile, cy.readFile.
10. Add concise comments explaining key steps.

Return ONLY the Cypress test code (no markdown).`;

    // ---- LLM with retry + fallback models ----
    const content = await chatWithRetry({
      messages: [
        {
          role: 'system',
          content:
            'You are an expert QA engineer specializing in Cypress test automation. Generate clean, maintainable Cypress test code that follows best practices.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
      models: MODEL_CANDIDATES,
      maxAttemptsPerModel: 3,
    });

    let cleanedTestCode = cleanTestCode(content);

    // Ensure { failOnStatusCode:false } on cy.visit()
    cleanedTestCode = cleanedTestCode.replace(
      /cy\.visit\(([^)]+)\)(?!\s*,\s*\{)/g,
      (_match, urlParam) => {
        if (urlParam.includes('{') && urlParam.includes('}')) {
          return `cy.visit(${urlParam})`;
        }
        return `cy.visit(${urlParam}, { failOnStatusCode: false })`;
      }
    );

    // Security: ban certain commands
    const banned = [
      /cy\.exec\(/,
      /cy\.writeFile\(/,
      /cy\.task\(/,
      /cy\.readFile\(/,
    ];
    if (banned.some((r) => r.test(cleanedTestCode))) {
      throw new Error('Generated test contains banned Cypress commands.');
    }

    // Persist generation if storyId provided
    let generation = null;
    if (storyId) {
      generation = await prisma.testGeneration.create({
        data: {
          storyId,
          url,
          model: MODEL_CANDIDATES[0],
          testCode: cleanedTestCode,
          pageStructure: pageStructure || undefined,
          testData: Object.keys(testData).length ? testData : undefined,
        },
        select: { id: true },
      });

      await prisma.requiredField.updateMany({
        where: { storyId, generationId: null },
        data: { generationId: generation.id },
      });

      await prisma.userStory.update({
        where: { id: storyId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return NextResponse.json({
      testCode: cleanedTestCode,
      pageStructure,
      generationId: generation?.id || null,
    });
  } catch (error) {
    console.error('Error generating test:', error);

    const { url, userStory } = payload || {};

    // Keep your graceful fallback, but now caller can see reason clearly
    const fallbackTest = `describe('${(userStory || 'User Story Test').replace(
      /'/g,
      "\\'"
    )}', () => {
  it('should complete the user scenario', () => {
    cy.visit('${url || '/'}', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    // TODO: Implement specific steps based on the user story
  });
});`;

    // If it was a rate limit, share a 429 so UI can show countdown
    const status = error?.response?.status === 429 ? 429 : 200;

    return NextResponse.json(
      {
        testCode: fallbackTest,
        pageStructure: null,
        error:
          'Generated fallback test due to: ' +
          (error?.response?.status === 429
            ? 'Rate limited (429)'
            : error.message || 'Unknown error'),
      },
      { status }
    );
  }
}
