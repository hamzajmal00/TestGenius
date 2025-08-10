// src/app/api/projects/route.js
import prisma from '@/lib/prisma';
import { getUserFromCookies } from '@/lib/auth';

export async function GET() {
  const auth = await getUserFromCookies();
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { ownerId: auth.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      userStories: true,
      testStatus: true,
      createdAt: true,
      _count: { select: { stories: true } },
    },
  });
  return Response.json({ projects });
}

// src/app/api/projects/route.js  (POST handler)
export async function POST(req) {
  const auth = await getUserFromCookies();
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || '').trim();
  const description = body.description?.trim() || null;
  const testStatus = ['PASSING', 'FAILING', 'PENDING'].includes(body.testStatus)
    ? body.testStatus
    : 'PENDING';

  if (!name)
    return Response.json({ error: 'Name is required' }, { status: 400 });

  const project = await prisma.project.create({
    data: { name, description, testStatus, ownerId: auth.id },
  });
  return Response.json({ project }, { status: 201 });
}
