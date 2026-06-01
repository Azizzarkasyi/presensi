import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const attendances = await prisma.attendance.findMany();
  console.log('All attendances:', attendances.map(a => ({
    date: a.date,
    clockIn: a.clockIn
  })));
}
test();
