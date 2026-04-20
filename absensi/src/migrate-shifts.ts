import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    try {
      console.log(`Updating ${tenant.schemaName}...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${tenant.schemaName}"."User" ALTER COLUMN "startWorkTime" TYPE VARCHAR(255)`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${tenant.schemaName}"."User" ALTER COLUMN "endWorkTime" TYPE VARCHAR(255)`);
      console.log(`Success ${tenant.schemaName}`);
    } catch(e) {
      console.error(`Failed ${tenant.schemaName}`, e);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
