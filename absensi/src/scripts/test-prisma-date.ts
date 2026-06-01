import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  process.env.TZ = "Asia/Jakarta";
  
  const targetYear = 2026;
  const targetMonth = 5; // June
  
  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
  
  console.log("Query bounds:");
  console.log("gte:", startDate);
  console.log("lte:", endDate);
  
  const today = new Date(Date.UTC(2026, 5, 1)); // 2026-06-01T00:00:00Z
  console.log("\nMock Attendance Date:", today);
  
  console.log("\nDoes today match the JS bounds?");
  console.log(today >= startDate && today <= endDate);
  
  // We can't query the tenant DB easily with mock data unless we insert it.
}
test();
