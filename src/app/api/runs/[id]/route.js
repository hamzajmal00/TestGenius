import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_req, { params }) {
  const { id } = params;
  const run = await prisma.run.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ run });
}
