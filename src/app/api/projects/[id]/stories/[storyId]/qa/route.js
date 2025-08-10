// app/api/projects/[id]/stories/[storyId]/qa/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_req, { params }) {
  const { id: projectId, storyId } = params; // match folder names

  if (!projectId || !storyId) {
    return NextResponse.json(
      { error: 'Missing projectId or storyId' },
      { status: 400 }
    );
  }

  // Ensure story exists AND belongs to this project
  const story = await prisma.userStory.findUnique({
    where: { id: storyId },
    select: { id: true, projectId: true },
  });
  if (!story || story.projectId !== projectId) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  try {
    const [requiredFields, latestGeneration] = await Promise.all([
      prisma.requiredField.findMany({
        where: { storyId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          type: true,
          required: true,
          placeholder: true,
          options: true,
        },
      }),
      prisma.testGeneration.findFirst({
        where: { storyId },
        orderBy: { createdAt: 'desc' },
        include: {
          runs: {
            orderBy: { startedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              status: true,
              passed: true,
              startedAt: true,
              finishedAt: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      requiredFields,
      latestGeneration: latestGeneration
        ? {
            id: latestGeneration.id,
            url: latestGeneration.url,
            model: latestGeneration.model,
            testCode: latestGeneration.testCode,
            pageStructure: latestGeneration.pageStructure,
            testData: latestGeneration.testData,
            createdAt: latestGeneration.createdAt,
            runs: latestGeneration.runs,
          }
        : null,
    });
  } catch (e) {
    console.error('Load Story QA failed', e);
    return NextResponse.json(
      { error: 'Failed to load story QA data' },
      { status: 500 }
    );
  }
}
