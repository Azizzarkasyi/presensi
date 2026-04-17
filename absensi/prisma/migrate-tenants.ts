import { PrismaClient } from '@prisma/client';

async function migrateTenants() {
  const publicPrisma = new PrismaClient();
  console.log('Starting migration for existing tenants...');

  try {
    const tenants = await publicPrisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenants to migrate.`);

    for (const tenant of tenants) {
      const schemaName = tenant.schemaName;
      console.log(`Migrating schema: ${schemaName}`);

      try {
        // Drop workStartTime and workEndTime from CompanyConfig
        await publicPrisma.$executeRawUnsafe(`
          ALTER TABLE "${schemaName}"."CompanyConfig"
          DROP COLUMN IF EXISTS "workStartTime",
          DROP COLUMN IF EXISTS "workEndTime";
        `);
        console.log(`  - Dropped work times from CompanyConfig in ${schemaName}`);
      } catch (err) {
        console.log(`  - Note: Columns might already be dropped or table missing in ${schemaName}`);
      }

      try {
        // Add endWorkTime to User
        await publicPrisma.$executeRawUnsafe(`
          ALTER TABLE "${schemaName}"."User"
          ADD COLUMN IF NOT EXISTS "endWorkTime" VARCHAR(10) NOT NULL DEFAULT '17:00';
        `);
        console.log(`  - Added endWorkTime to User in ${schemaName}`);
      } catch (err) {
        console.log(`  - Note: Column might already exist or table missing in ${schemaName}`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await publicPrisma.$disconnect();
  }
}

migrateTenants();
