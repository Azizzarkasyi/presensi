import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Need to run after migration is applied
// This seed uses raw SQL to create tenant schema since Prisma doesn't support dynamic schemas well

async function main() {
  const publicPrisma = new PrismaClient();

  console.log('🌱 Starting database seed...');

  // Create Super Admin
  console.log('Creating Super Admin...');
  const superAdminPassword = await bcrypt.hash('superadmin123', SALT_ROUNDS);
  
  const superAdmin = await publicPrisma.superAdmin.upsert({
    where: { email: 'superadmin@test.com' },
    update: {},
    create: {
      email: 'superadmin@test.com',
      password: superAdminPassword,
      name: 'Super Admin',
    },
  });
  console.log(`✓ Super Admin created: ${superAdmin.email}`);

  // Check if Demo Tenant already exists
  const existingTenant = await publicPrisma.tenant.findUnique({
    where: { name: 'Demo Company' },
  });

  if (!existingTenant) {
    console.log('Creating Demo Tenant...');
    
    // Create tenant record
    const tenant = await publicPrisma.tenant.create({
      data: {
        name: 'Demo Company',
        schemaName: 'temp_placeholder',
      },
    });

    const schemaName = `tenant_${tenant.id}`;

    // Update schema name
    await publicPrisma.tenant.update({
      where: { id: tenant.id },
      data: { schemaName },
    });

    // Create the schema
    await publicPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Create enums
    const enums = [
      { name: 'Role', values: ['ADMIN', 'LEADER', 'USER'] },
      { name: 'SalaryType', values: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'] },
      { name: 'AttendanceStatus', values: ['PRESENT', 'LATE', 'ABSENT', 'SICK', 'LEAVE', 'ALPHA'] },
      { name: 'TaskStatus', values: ['PENDING', 'IN_PROGRESS', 'DONE'] },
    ];

    for (const enumDef of enums) {
      const values = enumDef.values.map(v => `'${v}'`).join(', ');
      await publicPrisma.$executeRawUnsafe(
        `DO $$ BEGIN CREATE TYPE "${schemaName}"."${enumDef.name}" AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN null; END $$;`
      );
    }

    // Create tables
    await publicPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."CompanyConfig" (
        "id" SERIAL PRIMARY KEY,
        "companyName" VARCHAR(255) NOT NULL DEFAULT 'My Company',
        "maxBreakMinutesPerDay" INTEGER NOT NULL DEFAULT 60,
        "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 15,
        "overtimeRateMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
        "workStartTime" VARCHAR(10) NOT NULL DEFAULT '09:00',
        "workEndTime" VARCHAR(10) NOT NULL DEFAULT '17:00',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await publicPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."User" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "role" "${schemaName}"."Role" NOT NULL DEFAULT 'USER',
        "photo" VARCHAR(255),
        "faceDescriptor" TEXT,
        "faceRegistered" BOOLEAN NOT NULL DEFAULT false,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "salaryType" "${schemaName}"."SalaryType" NOT NULL DEFAULT 'MONTHLY',
        "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "startWorkTime" VARCHAR(10) NOT NULL DEFAULT '09:00',
        "latePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0
      )
    `);

    await publicPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."Attendance" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "${schemaName}"."User"("id") ON DELETE CASCADE,
        "date" DATE NOT NULL DEFAULT CURRENT_DATE,
        "clockIn" TIMESTAMP(3),
        "clockOut" TIMESTAMP(3),
        "clockInPhoto" VARCHAR(255),
        "clockOutPhoto" VARCHAR(255),
        "status" "${schemaName}"."AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
        "latitude" DOUBLE PRECISION,
        "longitude" DOUBLE PRECISION,
        "totalBreakMinutes" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "date")
      )
    `);

    await publicPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."Break" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "${schemaName}"."User"("id") ON DELETE CASCADE,
        "attendanceId" INTEGER REFERENCES "${schemaName}"."Attendance"("id") ON DELETE SET NULL,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3),
        "duration" INTEGER,
        "startPhoto" VARCHAR(255),
        "endPhoto" VARCHAR(255),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await publicPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."Task" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "assigneeId" INTEGER NOT NULL REFERENCES "${schemaName}"."User"("id") ON DELETE CASCADE,
        "creatorId" INTEGER NOT NULL REFERENCES "${schemaName}"."User"("id") ON DELETE CASCADE,
        "status" "${schemaName}"."TaskStatus" NOT NULL DEFAULT 'PENDING',
        "dueDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await publicPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."Payroll" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "${schemaName}"."User"("id") ON DELETE CASCADE,
        "periodStart" TIMESTAMP(3) NOT NULL,
        "periodEnd" TIMESTAMP(3) NOT NULL,
        "baseSalary" DOUBLE PRECISION NOT NULL,
        "workingDays" INTEGER NOT NULL DEFAULT 0,
        "workingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "lateDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "breakDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "overtimeBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "deductions" DOUBLE PRECISION NOT NULL,
        "netSalary" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(`✓ Tenant created: Demo Company (schema: ${schemaName})`);

    // Create users in tenant using raw SQL
    const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
    const leaderPassword = await bcrypt.hash('leader123', SALT_ROUNDS);
    const userPassword = await bcrypt.hash('user123', SALT_ROUNDS);

    await publicPrisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}"."User" ("email", "password", "name", "role", "salary", "salaryType")
      VALUES ('admin@demo.com', '${adminPassword}', 'Demo Admin', 'ADMIN', 10000000, 'MONTHLY')
    `);
    console.log('✓ Admin created: admin@demo.com');

    await publicPrisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}"."User" ("email", "password", "name", "role", "salary", "salaryType")
      VALUES ('leader@demo.com', '${leaderPassword}', 'Demo Leader', 'LEADER', 7000000, 'MONTHLY')
    `);
    console.log('✓ Leader created: leader@demo.com');

    await publicPrisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}"."User" ("email", "password", "name", "role", "salary", "salaryType")
      VALUES ('user@demo.com', '${userPassword}', 'Demo User', 'USER', 5000000, 'MONTHLY')
    `);
    console.log('✓ User created: user@demo.com');

    // Create company config
    await publicPrisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}"."CompanyConfig" ("companyName")
      VALUES ('Demo Company')
    `);
    console.log('✓ Company config created');

  } else {
    console.log(`✓ Tenant already exists: ${existingTenant.name}`);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('┌────────────────────────────────────────────────────┐');
  console.log('│ Super Admin                                        │');
  console.log('│   Email: superadmin@test.com                       │');
  console.log('│   Password: superadmin123                          │');
  console.log('├────────────────────────────────────────────────────┤');
  console.log('│ Demo Company (Tenant ID: 1)                        │');
  console.log('│                                                    │');
  console.log('│   Admin:                                           │');
  console.log('│     Email: admin@demo.com                          │');
  console.log('│     Password: admin123                             │');
  console.log('│                                                    │');
  console.log('│   Leader:                                          │');
  console.log('│     Email: leader@demo.com                         │');
  console.log('│     Password: leader123                            │');
  console.log('│                                                    │');
  console.log('│   User:                                            │');
  console.log('│     Email: user@demo.com                           │');
  console.log('│     Password: user123                              │');
  console.log('└────────────────────────────────────────────────────┘');

  await publicPrisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
