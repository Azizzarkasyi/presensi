import {Request, Response} from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {getPublicPrisma} from "../prisma/tenant-prisma";
import {tenantService} from "../prisma/tenant-service";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "super-admin-secret";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "7d") as jwt.SignOptions["expiresIn"];

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const findSuperAdminByEmail = async (
  prisma: ReturnType<typeof getPublicPrisma>,
  email: string,
) => {
  const normalizedEmail = normalizeEmail(email);

  const superAdmin = await prisma.superAdmin.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
  });

  if (superAdmin) {
    return superAdmin;
  }

  const rawMatches = await prisma.$queryRawUnsafe<any[]>(
    'SELECT * FROM "SuperAdmin" WHERE LOWER(TRIM("email")) = LOWER(TRIM($1)) LIMIT 1',
    normalizedEmail,
  );

  return rawMatches[0] || null;
};

/**
 * Super Admin Login
 */
export async function superAdminLogin(req: Request, res: Response) {
  try {
    const {email, password} = req.body;
    const normalizedEmail = normalizeEmail(email || "");

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const prisma = getPublicPrisma();
    const superAdmin = await findSuperAdminByEmail(prisma, normalizedEmail);

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: superAdmin.id,
        email: superAdmin.email,
        role: "SUPER_ADMIN",
        isSuperAdmin: true,
      },
      JWT_SECRET,
      {expiresIn: JWT_EXPIRES_IN},
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.name,
          role: "SUPER_ADMIN",
        },
      },
    });
  } catch (error) {
    console.error("Super admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Get all tenants
 */
export async function getTenants(req: Request, res: Response) {
  try {
    const tenants = await tenantService.getAllTenants();

    res.json({
      success: true,
      data: tenants,
    });
  } catch (error) {
    console.error("Get tenants error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Get tenant by ID
 */
export async function getTenantById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    const tenant = await tenantService.getTenantDetails(id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error("Get tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Reset tenant admin password
 */
export async function resetTenantAdminPassword(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    const {password} = req.body;

    if (password && String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    const result = await tenantService.resetTenantAdminPassword(
      id,
      password ? String(password) : undefined,
    );

    res.json({
      success: true,
      message: "Password admin tenant berhasil direset",
      data: {
        tenant: result.tenant,
        admin: result.admin,
        temporaryPassword: result.temporaryPassword,
      },
    });
  } catch (error: any) {
    console.error("Reset tenant admin password error:", error);

    if (error.message === "Tenant not found") {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    if (error.message === "Admin user not found") {
      return res.status(404).json({
        success: false,
        message: "Admin user not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Create a new tenant with admin user
 */
export async function createTenant(req: Request, res: Response) {
  try {
    const {name, adminEmail, adminPassword, adminName} = req.body;
    const normalizedAdminEmail = normalizeEmail(adminEmail || "");

    if (!name || !normalizedAdminEmail || !adminPassword || !adminName) {
      return res.status(400).json({
        success: false,
        message: "Name, adminEmail, adminPassword, and adminName are required",
      });
    }

    const tenant = await tenantService.createTenant({
      name,
      adminEmail: normalizedAdminEmail,
      adminPassword,
      adminName,
    });

    res.status(201).json({
      success: true,
      message: "Tenant created successfully with admin user",
      data: tenant,
    });
  } catch (error: any) {
    console.error("Create tenant error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Tenant name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Update a tenant
 */
export async function updateTenant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    const {name} = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tenant name is required",
      });
    }

    const tenant = await tenantService.updateTenant(id, {name});

    res.json({
      success: true,
      message: "Tenant updated successfully",
      data: tenant,
    });
  } catch (error: any) {
    console.error("Update tenant error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Tenant name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Delete a tenant
 */
export async function deleteTenant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);

    const tenant = await tenantService.deleteTenant(id);

    res.json({
      success: true,
      message: "Tenant deleted successfully",
      data: tenant,
    });
  } catch (error: any) {
    console.error("Delete tenant error:", error);

    if (error.message === "Tenant not found") {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Deactivate a tenant
 */
export async function deactivateTenant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);

    const tenant = await tenantService.deactivateTenant(id);

    res.json({
      success: true,
      message: "Tenant deactivated successfully",
      data: tenant,
    });
  } catch (error) {
    console.error("Deactivate tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Activate a tenant
 */
export async function activateTenant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);

    const tenant = await tenantService.activateTenant(id);

    res.json({
      success: true,
      message: "Tenant activated successfully",
      data: tenant,
    });
  } catch (error) {
    console.error("Activate tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Create a super admin (initial setup only)
 */
export async function createSuperAdmin(req: Request, res: Response) {
  try {
    const {email, password, name, setupKey} = req.body;

    // Require setup key for security
    const SETUP_KEY = process.env.SUPER_ADMIN_SETUP_KEY || "initial-setup-key";

    if (setupKey !== SETUP_KEY) {
      return res.status(403).json({
        success: false,
        message: "Invalid setup key",
      });
    }

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and name are required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const prisma = getPublicPrisma();

    const superAdmin = await prisma.superAdmin.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    res.status(201).json({
      success: true,
      message: "Super admin created successfully",
      data: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
      },
    });
  } catch (error: any) {
    console.error("Create super admin error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Get super admin profile
 */
export async function getSuperAdminProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const prisma = getPublicPrisma();
    const superAdmin = await prisma.superAdmin.findUnique({
      where: {id: userId},
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "Super admin not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...superAdmin,
        role: "SUPER_ADMIN",
      },
    });
  } catch (error) {
    console.error("Get super admin profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
