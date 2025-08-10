// src/lib/openrouter.js
import axios from 'axios';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Configure fallback models via ENV, or use sane defaults
const DEFAULT_MODELS = (
  process.env.OPENROUTER_FALLBACK_MODELS ||
  'deepseek/deepseek-chat-v3-0324:free|deepseek/deepseek-chat:free|qwen/qwen2.5-7b-instruct:free'
).split('|');

const cache = new Map(); // in-memory prompt cache { key: { exp, val } }
const CACHE_TTL_MS = 60_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) {
    cache.delete(key);
    return null;
  }
  return e.val;
}
function cacheSet(key, val, ttl = CACHE_TTL_MS) {
  cache.set(key, { exp: Date.now() + ttl, val });
}

function buildKey({ model, messages, temperature, max_tokens }) {
  return JSON.stringify({ model, messages, temperature, max_tokens });
}

function computeWaitMs(err, attempt) {
  // Respect Retry-After if present
  const ra = err?.response?.headers?.['retry-after'];
  if (ra) {
    const seconds = Number(ra);
    if (!Number.isNaN(seconds) && seconds > 0)
      return seconds * 1000 + Math.floor(Math.random() * 250);
  }
  // Or exponential backoff with jitter
  const base = Math.min(1000 * 2 ** (attempt - 1), 10_000);
  return base + Math.floor(Math.random() * 300);
}

export async function chatWithRetry({
  messages,
  temperature = 0.1,
  max_tokens = 2000,
  models = DEFAULT_MODELS,
  maxAttemptsPerModel = 3,
}) {
  // Cache first model+prompt to cut duplicate hits during bursts
  const primaryKey = buildKey({
    model: models[0],
    messages,
    temperature,
    max_tokens,
  });
  const cached = cacheGet(primaryKey);
  if (cached) return cached;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  };

  let lastErr;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const res = await axios.post(
          API_URL,
          { model, messages, temperature, max_tokens },
          { headers, timeout: 30_000 }
        );
        const content = res.data?.choices?.[0]?.message?.content ?? '';
        // Cache only success from first model to reduce token use
        if (model === models[0]) cacheSet(primaryKey, content);
        return content;
      } catch (err) {
        lastErr = err;
        const status = err?.response?.status;

        // For 429/503, wait and retry; for other 4xx (e.g., 400) break early
        if (status === 429 || status === 503) {
          const waitMs = computeWaitMs(err, attempt);
          await sleep(waitMs);
          continue;
        }
        if (status && status >= 400 && status < 500) break; // don’t keep retrying bad requests
        // 5xx: backoff
        const waitMs = computeWaitMs(err, attempt);
        await sleep(waitMs);
      }
    }
    // move to next model
  }

  // Throw last error so caller can decide on graceful fallback
  throw lastErr || new Error('LLM request failed');
}
