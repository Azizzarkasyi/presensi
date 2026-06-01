import { TenantMigrator } from '../prisma/tenant-migrator';

async function main() {
  console.log('Starting full tenant migration...');
  try {
    await TenantMigrator.syncAllTenants();
  } catch (e) {
    console.error('Error during migration:', e);
    process.exit(1);
  }
}

main();
