// src/app/api/projects/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromCookies } from '@/lib/auth';

function j(err, status = 400) {
  return NextResponse.json({ error: err }, { status });
}

export async function GET(_req, { params }) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return j('Unauthorized', 401);

    const p = await prisma.project.findUnique({
      where: { id: params.id },
      include: { _count: { select: { stories: true } } },
    });
    if (!p || p.ownerId !== auth.id) return j('Not found', 404);

    return NextResponse.json({ project: p });
  } catch (e) {
    console.error('GET /api/projects/[id] error:', e);
    return j('Internal error', 500);
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return j('Unauthorized', 401);

    const existing = await prisma.project.findUnique({
      where: { id: params.id },
    });
    if (!existing || existing.ownerId !== auth.id) return j('Not found', 404);

    const body = await req.json().catch(() => ({}));
    const { name, description, testStatus } = body;

    const ALLOWED = ['PENDING', 'PASSING', 'FAILING'];
    if (testStatus !== undefined && !ALLOWED.includes(testStatus)) {
      return j('Invalid testStatus. Use PENDING | PASSING | FAILING.', 422);
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(testStatus !== undefined ? { testStatus } : {}),
      },
      include: { _count: { select: { stories: true } } },
    });

    return NextResponse.json({ project });
  } catch (e) {
    console.error('PUT /api/projects/[id] error:', e);
    return j('Internal error', 500);
  }
}

export async function DELETE(_req, { params }) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return j('Unauthorized', 401);

    const existing = await prisma.project.findUnique({
      where: { id: params.id },
    });
    if (!existing || existing.ownerId !== auth.id) return j('Not found', 404);

    // Manual cascade: runs -> generations -> requiredFields -> stories -> project
    await prisma.testRun.deleteMany({
      where: { generation: { story: { projectId: params.id } } },
    });
    await prisma.testGeneration.deleteMany({
      where: { story: { projectId: params.id } },
    });
    await prisma.requiredField.deleteMany({
      where: { story: { projectId: params.id } },
    });
    await prisma.userStory.deleteMany({
      where: { projectId: params.id },
    });
    await prisma.project.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/projects/[id] error:', e);
    return j('Internal error', 500);
  }
}
