import { NextResponse } from 'next/server';
import axios from 'axios';
import prisma from '@/lib/prisma';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'deepseek/deepseek-chat-v3-0324:free';

function cleanToJsonArray(raw) {
  if (!raw) return '[]';
  let cleaned = raw.replace(/```json|```/g, '').trim();

  // Try direct parse
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {}

  // Try to extract first JSON array in the text
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      JSON.parse(match[0]);
      return match[0];
    } catch {}
  }

  return '[]';
}

export async function POST(req) {
  try {
    const { url, userStory, testCode, storyId } = await req.json();

    let prompt;
    if (testCode) {
      prompt = `Analyze this Cypress test code and extract all the required test data:

${testCode}

User Story: ${userStory}

Please identify:
1. Input fields that need data (username, password, email, etc.)
2. Expected values for assertions
3. Any other dynamic data needed

Return a JSON array of required data fields with this structure:
[
  {
    "key": "username",
    "name": "Username",
    "description": "Valid username for login",
    "type": "text",
    "required": true,
    "placeholder": "Enter username"
  }
]

Return only the JSON array without any markdown formatting.`;
    } else {
      prompt = `Based on this user story and URL, determine what test data will be required:

URL: ${url}
User Story: ${userStory}

Analyze what input data would be needed to test this scenario. Consider:
1. Form fields that need to be filled
2. Login credentials if authentication is required
3. Test data for different scenarios (valid/invalid inputs)
4. Expected outcomes for assertions

Return a JSON array of required data fields with this structure:
[
  {
    "key": "username",
    "name": "Username",
    "description": "Valid username for login",
    "type": "text",
    "required": true,
    "placeholder": "Enter username"
  }
]

Return only the JSON array without any markdown formatting.`;
    }

    const response = await axios.post(
      API_URL,
      {
        model: MODEL_NAME,
        messages: [
          {
            role: 'system',
            content:
              'You are a QA engineer expert at analyzing test requirements and extracting needed test data. Always return valid JSON arrays.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    const rawResponse = response.data?.choices?.[0]?.message?.content || '[]';
    const cleaned = cleanToJsonArray(rawResponse);

    let requiredData;
    try {
      requiredData = JSON.parse(cleaned);
      if (!Array.isArray(requiredData)) requiredData = [];
    } catch {
      requiredData = [];
    }

    // Persist to DB if we have a storyId
    if (storyId && requiredData.length) {
      await Promise.all(
        requiredData.map((f) =>
          prisma.requiredField.upsert({
            where: { storyId_key: { storyId, key: String(f.key) } }, // compound unique
            update: {
              name: String(f.name ?? f.key),
              description: String(f.description ?? ''),
              type: String(f.type ?? 'text'),
              required: Boolean(f.required ?? false),
              placeholder: f.placeholder ? String(f.placeholder) : null,
              options: f.options ? f.options : null,
            },
            create: {
              storyId,
              key: String(f.key),
              name: String(f.name ?? f.key),
              description: String(f.description ?? ''),
              type: String(f.type ?? 'text'),
              required: Boolean(f.required ?? false),
              placeholder: f.placeholder ? String(f.placeholder) : null,
              options: f.options ? f.options : null,
            },
          })
        )
      );
    }

    return NextResponse.json({ requiredData });
  } catch (error) {
    console.error('Error extracting required data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract required data' },
      { status: 500 }
    );
  }
}
