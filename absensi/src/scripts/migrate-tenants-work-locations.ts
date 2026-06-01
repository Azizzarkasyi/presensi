import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting workLocations migration for all tenants...");

  const tenants = await prisma.tenant.findMany({
    orderBy: {id: "asc"},
  });

  console.log(`Found ${tenants.length} tenants.`);

  for (const tenant of tenants) {
    const schemaName = tenant.schemaName;
    console.log(`Migrating schema: ${schemaName}...`);

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${schemaName}"."User"
        ADD COLUMN IF NOT EXISTS "workLocations" JSONB;
      `);
      console.log(`  - workLocations ready in ${schemaName}`);
    } catch (error) {
      console.error(`  - Failed migrating ${schemaName}:`, error);
    }
  }

  console.log("Migration complete.");
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
