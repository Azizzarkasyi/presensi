import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting tenant migration...');
  try {
    const tenants = await prisma.tenant.findMany();
    
    for (const tenant of tenants) {
      console.log(`Migrating schema: ${tenant.schemaName}`);
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${tenant.schemaName}"."User" 
          ADD COLUMN IF NOT EXISTS "maxBreakMinutes" INTEGER;
        `);
        console.log(`Successfully added maxBreakMinutes to ${tenant.schemaName}`);
      } catch (e) {
        console.error(`Failed to migrate ${tenant.schemaName}:`, e);
      }
    }
    console.log('Migration completed.');
  } catch (e) {
    console.error('Error fetching tenants:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
