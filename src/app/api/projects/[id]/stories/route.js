// src/app/api/projects/[id]/stories/route.js
import prisma from '@/lib/prisma';
import { getUserFromCookies } from '@/lib/auth';

async function ensureOwner(projectId, userId) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  return p && p.ownerId === userId ? p : null;
}

export async function GET(_req, { params }) {
  const auth = await getUserFromCookies();
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const ok = await ensureOwner(params.id, auth.id);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });

  const stories = await prisma.userStory.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, status: true },
  });
  return Response.json({ stories });
}

// src/app/api/projects/[id]/stories/route.js (append this)
export async function POST(req, { params }) {
  const auth = await getUserFromCookies();
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const ok = await ensureOwner(params.id, auth.id);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const title = String(body.title || '').trim();
  const description = body.description?.trim() || null;
  const status = ['TODO', 'IN_PROGRESS', 'DONE'].includes(body.status)
    ? body.status
    : 'TODO';
  if (!title)
    return Response.json({ error: 'Title is required' }, { status: 400 });

  const story = await prisma.userStory.create({
    data: { projectId: params.id, title, description, status },
    select: { id: true, title: true, status: true },
  });
  return Response.json({ story }, { status: 201 });
}
