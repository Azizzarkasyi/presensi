import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting attendance migration for all tenants...");

  const tenants = await prisma.tenant.findMany({
    orderBy: {id: "asc"},
  });

  console.log(`Found ${tenants.length} tenants.`);

  for (const tenant of tenants) {
    const schemaName = tenant.schemaName;
    console.log(`Migrating schema: ${schemaName}...`);

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${schemaName}"."Attendance"
        ADD COLUMN IF NOT EXISTS "leaveApprovalStatus" VARCHAR(255) NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "leaveReviewNote" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "leaveReviewedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "correctionStatus" VARCHAR(255) NOT NULL DEFAULT 'NONE',
        ADD COLUMN IF NOT EXISTS "correctionReason" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "correctionRequestedClockIn" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "correctionRequestedClockOut" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "correctionReviewNote" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "correctionRequestedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "correctionReviewedAt" TIMESTAMP(3);
      `);
      console.log(`  - Attendance columns ready in ${schemaName}`);
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
