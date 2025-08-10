// src/app/api/projects/[id]/route.js
import prisma from '@/lib/prisma';
import { getUserFromCookies } from '@/lib/auth';

async function ensureOwner(id, userId) {
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p || p.ownerId !== userId) return null;
  return p;
}

export async function GET(_req, { params }) {
  const auth = await getUserFromCookies();
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await ensureOwner(params.id, auth.id);
  if (!p) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ project: p });
}

export async function PATCH(req, { params }) {
  const auth = await getUserFromCookies();
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await ensureOwner(params.id, auth.id);
  if (!p) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const data = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.description === 'string')
    data.description = body.description.trim();
  if (typeof body.lastStatus === 'string') data.lastStatus = body.lastStatus;
  const updated = await prisma.project.update({ where: { id: p.id }, data });
  return Response.json({ project: updated });
}

export async function DELETE(_req, { params }) {
  const auth = await getUserFromCookies();
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await ensureOwner(params.id, auth.id);
  if (!p) return Response.json({ error: 'Not found' }, { status: 404 });
  await prisma.project.delete({ where: { id: p.id } });
  return Response.json({ ok: true });
}
