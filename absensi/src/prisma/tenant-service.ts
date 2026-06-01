import {PrismaClient} from "@prisma/client";
import {getPublicPrisma, getTenantPrisma} from "./tenant-prisma";
import bcrypt from "bcryptjs";
import {randomBytes} from "crypto";
import {exec} from "child_process";
import {promisify} from "util";
import {TenantMigrator} from "./tenant-migrator";

const execAsync = promisify(exec);
const SALT_ROUNDS = 10;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

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
    const tenants = await this.publicPrisma.tenant.findMany({
      orderBy: {createdAt: "desc"},
    });

    return Promise.all(
      tenants.map(async tenant => {
        try {
          const tenantPrisma = getTenantPrisma(tenant.schemaName);
          const [admin, userCount, activeUserCount, leaderCount] =
            await Promise.all([
              tenantPrisma.user.findFirst({
                where: {role: "ADMIN"},
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                  isActive: true,
                },
              }),
              tenantPrisma.user.count(),
              tenantPrisma.user.count({where: {isActive: true}}),
              tenantPrisma.user.count({where: {role: "LEADER"}}),
            ]);

          return {
            ...tenant,
            adminName: admin?.name || "-",
            adminEmail: admin?.email || "-",
            adminIsActive: admin?.isActive ?? false,
            userCount,
            activeUserCount,
            leaderCount,
          };
        } catch (error) {
          console.error(
            `Failed to load tenant summary for ${tenant.schemaName}:`,
            error,
          );
          return {
            ...tenant,
            adminName: "-",
            adminEmail: "-",
            adminIsActive: false,
            userCount: 0,
            activeUserCount: 0,
            leaderCount: 0,
          };
        }
      }),
    );
  }

  /**
   * Get a tenant by ID
   */
  async getTenantById(id: number) {
    return this.publicPrisma.tenant.findUnique({
      where: {id},
    });
  }

  /**
   * Get detailed tenant data including admin account and employees
   */
  async getTenantDetails(id: number) {
    const tenant = await this.getTenantById(id);
    if (!tenant) {
      return null;
    }

    const tenantPrisma = getTenantPrisma(tenant.schemaName);

    const [adminAccount, companyConfig, users] = await Promise.all([
      tenantPrisma.user.findFirst({
        where: {role: "ADMIN"},
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      tenantPrisma.companyConfig.findFirst({
        select: {
          id: true,
          companyName: true,
          maxBreakMinutesPerDay: true,
          lateThresholdMinutes: true,
          overtimeRateMultiplier: true,
          officeLatitude: true,
          officeLongitude: true,
          allowedRadiusMeters: true,
          updatedAt: true,
        },
      }),
      tenantPrisma.user.findMany({
        orderBy: [{role: "asc"}, {name: "asc"}],
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          faceRegistered: true,
          salaryType: true,
          salary: true,
          startWorkTime: true,
          endWorkTime: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const roleCounts = users.reduce(
      (acc, user) => {
        if (user.role === "ADMIN") acc.admin += 1;
        if (user.role === "LEADER") acc.leader += 1;
        if (user.role === "USER") acc.user += 1;
        if (user.isActive) acc.active += 1;
        return acc;
      },
      {admin: 0, leader: 0, user: 0, active: 0},
    );

    return {
      ...tenant,
      adminAccount,
      companyConfig,
      employees: users,
      employeeCount: users.length,
      roleCounts,
    };
  }

  /**
   * Get a tenant by schema name
   */
  async getTenantBySchema(schemaName: string) {
    return this.publicPrisma.tenant.findUnique({
      where: {schemaName},
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
        schemaName: "temp_placeholder",
      },
    });

    const schemaName = `tenant_${tenant.id}`;

    // Update with actual schema name
    await this.publicPrisma.tenant.update({
      where: {id: tenant.id},
      data: {schemaName},
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

    return {...tenant, schemaName};
  }

  /**
   * Create schema and tables for a tenant using Prisma DB Push
   */
  private async provisionTenantSchema(schemaName: string) {
    // Create the schema in PostgreSQL
    await this.publicPrisma.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,
    );

    // Use Prisma CLI to push the exact schema.prisma structure into the new schema
    await TenantMigrator.pushSchemaToTenant(schemaName);
  }

  /**
   * Create admin user in tenant schema
   */
  private async createTenantAdmin(
    schemaName: string,
    data: {email: string; password: string; name: string},
  ) {
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const prisma = getTenantPrisma(schemaName);

    await prisma.user.create({
      data: {
        email: normalizeEmail(data.email),
        password: hashedPassword,
        name: data.name,
        role: "ADMIN",
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
        where: {id: existing.id},
        data: {companyName},
      });
    } else {
      await prisma.companyConfig.create({
        data: {companyName},
      });
    }
  }

  /**
   * Update a tenant
   */
  async updateTenant(id: number, data: {name: string}) {
    const tenant = await this.publicPrisma.tenant.update({
      where: {id},
      data: {name: data.name},
    });

    // Also update company name in tenant's config
    try {
      const tenantPrisma = getTenantPrisma(tenant.schemaName);
      const config = await tenantPrisma.companyConfig.findFirst();
      if (config) {
        await tenantPrisma.companyConfig.update({
          where: {id: config.id},
          data: {companyName: data.name},
        });
      }
    } catch (e) {
      console.error("Failed to update tenant company config name", e);
    }

    return tenant;
  }

  /**
   * Delete a tenant and its schema
   */
  async deleteTenant(id: number) {
    const tenant = await this.getTenantById(id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Drop the schema
    await this.publicPrisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${tenant.schemaName}" CASCADE`,
    );

    // Delete tenant record
    await this.publicPrisma.tenant.delete({
      where: {id},
    });

    return tenant;
  }

  /**
   * Deactivate a tenant
   */
  async deactivateTenant(id: number) {
    return this.publicPrisma.tenant.update({
      where: {id},
      data: {isActive: false},
    });
  }

  /**
   * Activate a tenant
   */
  async activateTenant(id: number) {
    return this.publicPrisma.tenant.update({
      where: {id},
      data: {isActive: true},
    });
  }

  /**
   * Reset tenant admin password and return a temporary password
   */
  async resetTenantAdminPassword(id: number, password?: string) {
    const tenant = await this.getTenantById(id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const tenantPrisma = getTenantPrisma(tenant.schemaName);
    const admin = await tenantPrisma.user.findFirst({
      where: {role: "ADMIN"},
      select: {id: true, email: true, name: true},
    });

    if (!admin) {
      throw new Error("Admin user not found");
    }

    const temporaryPassword =
      password ||
      `${randomBytes(4).toString("hex")}${Math.floor(Date.now() % 1000)}`;
    const hashedPassword = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

    await tenantPrisma.user.update({
      where: {id: admin.id},
      data: {password: hashedPassword},
    });

    return {
      tenant,
      admin,
      temporaryPassword,
    };
  }
}

export const tenantService = new TenantService();
