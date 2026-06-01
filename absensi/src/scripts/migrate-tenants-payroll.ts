import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting payroll migration for active tenants...');

  // 1. Get all active tenants
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
  });

  console.log(`Found ${tenants.length} active tenants.`);

  for (const tenant of tenants) {
    const schemaName = tenant.schemaName;
    console.log(`Migrating schema: ${schemaName}...`);

    try {
      // PaymentStatus ENUM creation
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '${schemaName}')) THEN
                CREATE TYPE "${schemaName}"."PaymentStatus" AS ENUM ('PENDING', 'PAID');
            END IF;
        END$$;
      `);

      // Add columns to Payroll table
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${schemaName}"."Payroll"
        ADD COLUMN IF NOT EXISTS "paymentStatus" "${schemaName}"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "paymentProof" VARCHAR(255);
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
