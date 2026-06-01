import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const targetMonth = new Date().getMonth();
  const targetYear = new Date().getFullYear();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  console.log('Server Current Time:', new Date());
  console.log('targetMonth:', targetMonth);
  console.log('startDate:', startDate);
  console.log('endDate:', endDate);
}
test();
