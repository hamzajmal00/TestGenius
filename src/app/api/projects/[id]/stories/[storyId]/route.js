import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function ensureStory(projectId, storyId) {
  const st = await prisma.userStory.findUnique({
    where: { id: storyId },
    select: { id: true, projectId: true },
  });
  if (!st || st.projectId !== projectId) return null;
  return st;
}

export async function PUT(req, { params }) {
  const { id: projectId, storyId } = params;
  const body = await req.json().catch(() => ({}));
  const { title, description, status } = body;

  const st = await ensureStory(projectId, storyId);
  if (!st)
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  const updated = await prisma.userStory.update({
    where: { id: storyId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  });

  return NextResponse.json({ story: updated });
}

export async function DELETE(_req, { params }) {
  const { id: projectId, storyId } = params;

  const st = await ensureStory(projectId, storyId);
  if (!st)
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  // Remove dependent QA data (runs -> generations -> required fields) then the story
  await prisma.testRun.deleteMany({
    where: { generation: { storyId } },
  });
  await prisma.testGeneration.deleteMany({
    where: { storyId },
  });
  await prisma.requiredField.deleteMany({
    where: { storyId },
  });

  await prisma.userStory.delete({ where: { id: storyId } });

  return NextResponse.json({ ok: true });
}
