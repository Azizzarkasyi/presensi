import { getTenantPrisma } from '../prisma/tenant-prisma';
import { PrismaClient } from '@prisma/client';

const publicPrisma = new PrismaClient();

async function test() {
  const tenants = await publicPrisma.tenant.findMany();
  for (const tenant of tenants) {
    console.log(`Checking tenant: ${tenant.schemaName}`);
    const prisma = getTenantPrisma(tenant.schemaName);
    const attendances = await prisma.attendance.findMany();
    console.log(`Attendances in ${tenant.schemaName}:`, attendances.map(a => ({
      date: a.date,
      clockIn: a.clockIn
    })));
  }
}
test();
