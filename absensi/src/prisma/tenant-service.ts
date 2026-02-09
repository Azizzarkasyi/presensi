import { PrismaClient } from '@prisma/client';
import { getPublicPrisma, getTenantPrisma } from './tenant-prisma';
import bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const SALT_ROUNDS = 10;

/**
 * Service for managing tenants (companies)
 */
export class TenantService {
  private publicPrisma: PrismaClient;

  constructor() {
    this.publicPrisma = getPublicPrisma();
  }

  /**
   * Get all tenants
   */
  async getAllTenants() {
    return this.publicPrisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a tenant by ID
   */
  async getTenantById(id: number) {
    return this.publicPrisma.tenant.findUnique({
      where: { id },
    });
  }

  /**
   * Get a tenant by schema name
   */
  async getTenantBySchema(schemaName: string) {
    return this.publicPrisma.tenant.findUnique({
      where: { schemaName },
    });
  }

  /**
   * Create a new tenant with its schema and default admin
   */
  async createTenant(data: {
    name: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
  }) {
    // Generate schema name from tenant ID
    const tenant = await this.publicPrisma.tenant.create({
      data: {
        name: data.name,
        schemaName: 'temp_placeholder',
      },
    });

    const schemaName = `tenant_${tenant.id}`;

    // Update with actual schema name
    await this.publicPrisma.tenant.update({
      where: { id: tenant.id },
      data: { schemaName },
    });

    // Create the schema and tables
    await this.provisionTenantSchema(schemaName);

    // Create default admin user in the tenant schema
    await this.createTenantAdmin(schemaName, {
      email: data.adminEmail,
      password: data.adminPassword,
      name: data.adminName,
    });

    // Create default company config
    await this.createDefaultConfig(schemaName, data.name);

    return { ...tenant, schemaName };
  }

  /**
   * Create schema and tables for a tenant using raw SQL
   */
  private async provisionTenantSchema(schemaName: string) {
    // Create the schema
    await this.publicPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Create enums in tenant schema
    await this.createEnums(schemaName);

    // Create tables in tenant schema
    await this.createTables(schemaName);
  }

  /**
   * Create enum types in tenant schema
   */
  private async createEnums(schemaName: string) {
    const enums = [
      { name: 'Role', values: ['ADMIN', 'LEADER', 'USER'] },
      { name: 'SalaryType', values: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'] },
      { name: 'AttendanceStatus', values: ['PRESENT', 'LATE', 'ABSENT', 'SICK', 'LEAVE', 'ALPHA'] },
      { name: 'TaskStatus', values: ['PENDING', 'IN_PROGRESS', 'DONE'] },
    ];

    for (const enumDef of enums) {
      const values = enumDef.values.map(v => `'${v}'`).join(', ');
      await this.publicPrisma.$executeRawUnsafe(
        `DO $$ BEGIN CREATE TYPE "${schemaName}"."${enumDef.name}" AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN null; END $$;`
      );
    }
  }

  /**
   * Create tables in tenant schema
   */
  private async createTables(schemaName: string) {
    // CompanyConfig table
    await this.publicPrisma.$executeRawUnsafe(`
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

    // User table
    await this.publicPrisma.$executeRawUnsafe(`
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

    // Attendance table
    await this.publicPrisma.$executeRawUnsafe(`
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

    // Break table
    await this.publicPrisma.$executeRawUnsafe(`
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

    // Task table
    await this.publicPrisma.$executeRawUnsafe(`
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

    // Payroll table
    await this.publicPrisma.$executeRawUnsafe(`
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
  }

  /**
   * Create admin user in tenant schema
   */
  private async createTenantAdmin(
    schemaName: string,
    data: { email: string; password: string; name: string }
  ) {
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const prisma = getTenantPrisma(schemaName);

    await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'ADMIN',
        isActive: true,
      },
    });
  }

  /**
   * Create default company config in tenant schema
   */
  private async createDefaultConfig(schemaName: string, companyName: string) {
    const prisma = getTenantPrisma(schemaName);

    const existing = await prisma.companyConfig.findFirst();
    
    if (existing) {
      await prisma.companyConfig.update({
        where: { id: existing.id },
        data: { companyName },
      });
    } else {
      await prisma.companyConfig.create({
        data: { companyName },
      });
    }
  }

  /**
   * Delete a tenant and its schema
   */
  async deleteTenant(id: number) {
    const tenant = await this.getTenantById(id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Drop the schema
    await this.publicPrisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${tenant.schemaName}" CASCADE`
    );

    // Delete tenant record
    await this.publicPrisma.tenant.delete({
      where: { id },
    });

    return tenant;
  }

  /**
   * Deactivate a tenant
   */
  async deactivateTenant(id: number) {
    return this.publicPrisma.tenant.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Activate a tenant
   */
  async activateTenant(id: number) {
    return this.publicPrisma.tenant.update({
      where: { id },
      data: { isActive: true },
    });
  }
}

export const tenantService = new TenantService();
