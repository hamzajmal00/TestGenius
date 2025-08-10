// src/app/api/auth/register/route.js
import prisma from '@/lib/prisma';
import { hashPassword, signJwt, setAuthCookie } from '@/lib/auth';

export async function POST(req) {
  try {
    const body = await req.json();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '').trim();
    const name = body.name?.trim() || null;

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return Response.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    const token = signJwt({ sub: user.id, email: user.email });
    await setAuthCookie(token);

    return Response.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (e) {
    console.error('register error', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
