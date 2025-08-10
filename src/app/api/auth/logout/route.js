// src/app/api/auth/logout/route.js
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  await clearAuthCookie();
  return Response.json({ ok: true });
}
