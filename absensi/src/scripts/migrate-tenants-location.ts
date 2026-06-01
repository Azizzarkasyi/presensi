import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting geolocation migration for active tenants...');

  // 1. Get all active tenants
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
  });

  console.log(`Found ${tenants.length} active tenants.`);

  for (const tenant of tenants) {
    const schemaName = tenant.schemaName;
    console.log(`Migrating schema: ${schemaName}...`);

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${schemaName}"."CompanyConfig"
        ADD COLUMN IF NOT EXISTS "officeLatitude" DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS "officeLongitude" DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS "allowedRadiusMeters" INTEGER NOT NULL DEFAULT 50;
      `);
      console.log(`Successfully migrated ${schemaName}.`);
    } catch (error) {
      console.error(`Error migrating ${schemaName}:`, error);
    }
  }

  console.log('Migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
