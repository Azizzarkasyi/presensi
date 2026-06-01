import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting user geolocation migration for active tenants...");

  // 1. Get all active tenants
  const tenants = await prisma.tenant.findMany({
    where: {isActive: true},
  });

  console.log(`Found ${tenants.length} active tenants.`);

  for (const tenant of tenants) {
    const schemaName = tenant.schemaName;
    console.log(`Migrating schema: ${schemaName}...`);

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${schemaName}"."User"
        ADD COLUMN IF NOT EXISTS "workLatitude" DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS "workLongitude" DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS "workRadius" INTEGER,
        ADD COLUMN IF NOT EXISTS "workLocations" JSONB;
      `);
      console.log(`Successfully migrated ${schemaName}.`);
    } catch (error) {
      console.error(`Error migrating ${schemaName}:`, error);
    }
  }

  console.log("Migration complete.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
