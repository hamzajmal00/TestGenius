// src/app/api/auth/login/route.js
import prisma from '@/lib/prisma';
import { verifyPassword, signJwt, setAuthCookie } from '@/lib/auth';

export async function POST(req) {
  try {
    const body = await req.json();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '').trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok)
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = signJwt({ sub: user.id, email: user.email });
    await setAuthCookie(token);

    return Response.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) {
    console.error('login error', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
