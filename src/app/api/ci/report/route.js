export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { sharedSecret, runId, passed, output, errorOutput, testFilePath } =
    body;

  if (!sharedSecret || sharedSecret !== process.env.CI_SHARED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!runId)
    return NextResponse.json({ error: 'runId required' }, { status: 400 });

  await prisma.testRun.update({
    where: { id: runId },
    data: {
      status: passed ? 'PASSED' : 'FAILED',
      passed: !!passed,
      output: output || '',
      errorOutput: errorOutput || '',
      testFilePath: testFilePath || '',
      finishedAt: new Date(),
    },
  });

  // (Optional) update story/project aggregate status here if you want

  return NextResponse.json({ ok: true });
}
