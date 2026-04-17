import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

async function main() {
  const publicPrisma = new PrismaClient();

  console.log('🌱 Starting database seed...');

  // Create Super Admin
  console.log('Creating Super Admin...');
  const superAdminPassword = await bcrypt.hash('Aziz30112002', SALT_ROUNDS);
  
  const superAdmin = await publicPrisma.superAdmin.upsert({
    where: { email: 'azizsework@gmail.com' },
    update: {},
    create: {
      email: 'azizsework@gmail.com',
      password: superAdminPassword,
      name: 'Super Admin',
    },
  });
  console.log(`✓ Super Admin created: ${superAdmin.email}`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('┌────────────────────────────────────────────────────┐');
  console.log('│ Super Admin                                        │');
  console.log('│   Email: azizsework@gmail.com                      │');
  console.log('│   Password: Aziz30112002                           │');
  console.log('└────────────────────────────────────────────────────┘');

  await publicPrisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
