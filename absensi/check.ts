import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const leaves = await prisma.$queryRawUnsafe('SELECT * FROM tenant_4."Attendance" ORDER BY "createdAt" DESC LIMIT 5;');
  console.log(leaves);
}
main().finally(() => prisma.$disconnect());
