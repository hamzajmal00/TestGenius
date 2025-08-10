// src/lib/prisma.js
// import { PrismaClient } from '@prisma/client';

// let prisma;
// if (process.env.NODE_ENV === 'production') {
//   prisma = new PrismaClient();
// } else {
//   globalThis.__prisma ||= new PrismaClient();
//   prisma = globalThis.__prisma;
// }
// export default prisma;

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
