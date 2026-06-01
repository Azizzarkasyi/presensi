import { getPublicPrisma, getTenantPrisma } from './src/prisma/tenant-prisma';

async function checkData() {
  const publicPrisma = getPublicPrisma();
  
  console.log('=== Checking Tenants ===');
  const tenants = await publicPrisma.tenant.findMany();
  console.log('Tenants:', JSON.stringify(tenants, null, 2));
  
  if (tenants.length > 0) {
    console.log('\n=== Checking Users in tenant_1 ===');
    const tenantPrisma = getTenantPrisma('tenant_1');
    const users = await tenantPrisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    console.log('Users:', JSON.stringify(users, null, 2));
  }
}

checkData().catch(console.error).finally(() => process.exit(0));
