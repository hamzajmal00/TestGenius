// /api/extract-required-data/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'deepseek/deepseek-chat-v3-0324:free';

export async function POST(req) {
  try {
    const { url, userStory, testCode } = await req.json();

    let prompt;

    if (testCode) {
      // Extract data from existing test code
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
  },
  {
    "key": "password",
    "name": "Password", 
    "description": "Password for the user account",
    "type": "password",
    "required": true,
    "placeholder": "Enter password"
  }
]

Return only the JSON array without any markdown formatting.`;
    } else {
      // Extract data requirements from URL and user story
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
          {
            role: 'user',
            content: prompt,
          },
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

    const rawResponse = response.data.choices[0].message.content;

    // Clean and parse JSON response
    let cleanedResponse = rawResponse
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    try {
      const requiredData = JSON.parse(cleanedResponse);
      return NextResponse.json({ requiredData });
    } catch (parseError) {
      // Fallback if JSON parsing fails
      const fallbackData = [
        {
          key: 'username',
          name: 'Username',
          description: 'Username for login',
          type: 'text',
          required: true,
          placeholder: 'Enter username',
        },
        {
          key: 'password',
          name: 'Password',
          description: 'Password for login',
          type: 'password',
          required: true,
          placeholder: 'Enter password',
        },
      ];
      return NextResponse.json({ requiredData: fallbackData });
    }
  } catch (error) {
    console.error('Error extracting required data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract required data' },
      { status: 500 }
    );
  }
}
