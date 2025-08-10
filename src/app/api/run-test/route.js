export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const IS_GITHUB = process.env.CI_REMOTE === 'github';
const GH_REPO = process.env.GH_REPO;
const GH_TOKEN = process.env.GITHUB_TOKEN;
const CI_SHARED_SECRET = process.env.CI_SHARED_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { testCode, testData = {}, url, generationId, storyId } = body || {};

  if (!testCode || !url) {
    return NextResponse.json(
      { error: 'Test code and URL are required' },
      { status: 400 }
    );
  }

  // Ensure we have a generation to attach runs to
  let genId = generationId;
  if (!genId && storyId) {
    const g = await prisma.testGeneration.create({
      data: {
        storyId,
        url,
        model: 'enqueue/github-actions',
        testCode,
        testData,
      },
      select: { id: true },
    });
    genId = g.id;
  }

  // Create a QUEUED run
  const run = await prisma.testRun.create({
    data: { generationId: genId, status: 'QUEUED', startedAt: new Date() },
    select: { id: true },
  });

  // Local/dev fallback: don’t actually run CI
  if (!IS_GITHUB) {
    return NextResponse.json({
      queued: true,
      runId: run.id,
      note: 'CI_REMOTE is not github; set env vars to trigger GitHub Actions.',
    });
  }

  // Dispatch a GitHub workflow
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GH_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          event_type: 'run-cypress',
          client_payload: {
            runId: run.id,
            generationId: genId,
            url,
            testCode,
            testData,
            callbackUrl: `${APP_URL}/api/ci/report`,
            sharedSecret: CI_SHARED_SECRET,
          },
        }),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GitHub dispatch failed: ${res.status} ${txt}`);
    }

    return NextResponse.json({ queued: true, runId: run.id });
  } catch (e) {
    await prisma.testRun.update({
      where: { id: run.id },
      data: {
        status: 'ERRORED',
        finishedAt: new Date(),
        errorOutput: String(e),
      },
    });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
