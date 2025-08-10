import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
  const {
    suiteId,
    env = 'staging',
    matrix = { browsers: ['chromium'] },
  } = await req.json();
  const run = await prisma.run.create({
    data: { suiteId, env, matrix, status: 'QUEUED' },
  });
  // TODO: trigger your CI/worker via webhook here
  return NextResponse.json({ run });
}
