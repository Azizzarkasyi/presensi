import { getTenantPrisma } from '../prisma/tenant-prisma';
import { PrismaClient } from '@prisma/client';

async function test() {
  const publicPrisma = new PrismaClient();
  const tenants = await publicPrisma.tenant.findMany();
  let allCount = 0;
  for (const tenant of tenants) {
    const prisma = getTenantPrisma(tenant.schemaName);
    const attendances = await prisma.attendance.findMany({
      orderBy: { date: 'desc' },
      take: 10
    });
    console.log(`Recent attendances in ${tenant.schemaName}:`, attendances.map(a => ({
      id: a.id,
      date: a.date.toISOString(),
      clockIn: a.clockIn ? new Date(a.clockIn).toISOString() : null
    })));
    allCount += attendances.length;
  }
  if (allCount === 0) {
    console.log("No attendances found in any tenant!");
  }
}
test();
