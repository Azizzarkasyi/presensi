import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

async function ensureAttendanceEnums(schemaName: string) {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'LeaveApprovalStatus' AND n.nspname = '${schemaName}'
      ) THEN
        CREATE TYPE "${schemaName}"."LeaveApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'CorrectionStatus' AND n.nspname = '${schemaName}'
      ) THEN
        CREATE TYPE "${schemaName}"."CorrectionStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
      END IF;
    END $$;
  `);
}

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
      await ensureAttendanceEnums(schemaName);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${schemaName}"."Attendance"
        ADD COLUMN IF NOT EXISTS "leaveApprovalStatus" "${schemaName}"."LeaveApprovalStatus" NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "leaveReviewNote" TEXT,
        ADD COLUMN IF NOT EXISTS "leaveReviewedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "correctionStatus" "${schemaName}"."CorrectionStatus" NOT NULL DEFAULT 'NONE',
        ADD COLUMN IF NOT EXISTS "correctionReason" TEXT,
        ADD COLUMN IF NOT EXISTS "correctionRequestedClockIn" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "correctionRequestedClockOut" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "correctionReviewNote" TEXT,
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
