// src/app/api/_debug-db/route.js
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const url = process.env.DATABASE_URL || '';
    const cols = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'User'
      ORDER BY ordinal_position
    `;
    return Response.json({
      databaseUrl: url,
      columns: cols.map((c) => c.column_name),
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
