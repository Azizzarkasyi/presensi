import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getPublicPrisma, getTenantPrisma } from '../prisma/tenant-prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

interface TenantUser {
  tenantId: number;
  tenantName: string;
  schemaName: string;
  user: {
    id: number;
    email: string;
    password: string;
    name: string;
    role: string;
    isActive: boolean;
    photo?: string;
    faceRegistered?: boolean;
    salaryType?: string;
    salary?: number;
    startWorkTime?: string;
  };
}

/**
 * Auto-lookup login - find user across all tenants by email
 * No need to select company first
 */
/**
 * Auto-lookup login - find user across all tenants by email
 * No need to select company first
 */
export async function autoLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password harus diisi',
      });
    }

    const publicPrisma = getPublicPrisma();

    // 1. Check if user is Super Admin
    const superAdmin = await publicPrisma.superAdmin.findUnique({
      where: { email },
    });

    if (superAdmin) {
      const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
      if (isPasswordValid) {
        // Generate JWT for Super Admin
        const token = jwt.sign(
          {
            id: superAdmin.id,
            email: superAdmin.email,
            role: 'SUPER_ADMIN',
            isSuperAdmin: true,
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        return res.json({
          success: true,
          data: {
            token,
            user: {
              id: superAdmin.id,
              email: superAdmin.email,
              name: superAdmin.name,
              role: 'SUPER_ADMIN',
              photo: null,
            },
            isSuperAdmin: true,
            // No tenant data for Super Admin
            tenant: null,
          },
        });
      }
      // If password invalid for Super Admin, we could stop here or continue checking tenants.
      // For security/UX, usually unique email implies we stop, but if they have same email for standard user, 
      // we might want to allow that? For now, let's treat Super Admin as exclusive.
      return res.status(401).json({
        success: false,
        message: 'Password salah (Super Admin)',
      });
    }

    // 2. Standard User Login (Check all tenants)
    // Get all active tenants
    const tenants = await publicPrisma.tenant.findMany({
      where: { isActive: true },
    });

    // ... (rest of the existing logic)

    // Search for user in each tenant schema
    const foundUsers: TenantUser[] = [];

    for (const tenant of tenants) {
      try {
        const tenantPrisma = getTenantPrisma(tenant.schemaName);

        const user = await tenantPrisma.user.findUnique({
          where: { email },
        });

        if (user) {
          foundUsers.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            schemaName: tenant.schemaName,
            user: {
              id: user.id,
              email: user.email,
              password: user.password,
              name: user.name,
              role: user.role,
              isActive: user.isActive,
              photo: user.photo || undefined,
              faceRegistered: user.faceRegistered,
              salaryType: user.salaryType,
              salary: user.salary,
              startWorkTime: user.startWorkTime,
            },
          });
        }
      } catch (err) {
        // Skip tenant if schema doesn't exist or has issues
        console.error(`Error checking tenant ${tenant.schemaName}:`, err);
      }
    }

    // No user found in any tenant
    if (foundUsers.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email tidak ditemukan',
      });
    }

    // If user exists in multiple tenants, return the list for selection
    if (foundUsers.length > 1) {
      return res.status(200).json({
        success: true,
        requireTenantSelection: true,
        message: 'Email terdaftar di beberapa perusahaan, pilih salah satu',
        data: {
          tenants: foundUsers.map(fu => ({
            tenantId: fu.tenantId,
            tenantName: fu.tenantName,
          })),
        },
      });
    }

    // Single tenant - verify password and login
    const foundUser = foundUsers[0];

    if (!foundUser.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akun tidak aktif',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, foundUser.user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Password salah',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: foundUser.user.id,
        email: foundUser.user.email,
        role: foundUser.user.role,
        tenantId: foundUser.tenantId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: foundUser.user.id,
          email: foundUser.user.email,
          name: foundUser.user.name,
          role: foundUser.user.role,
          photo: foundUser.user.photo,
          faceRegistered: foundUser.user.faceRegistered,
          salaryType: foundUser.user.salaryType,
          salary: foundUser.user.salary,
          startWorkTime: foundUser.user.startWorkTime,
        },
        tenant: {
          id: foundUser.tenantId,
          name: foundUser.tenantName,
        },
      },
    });
  } catch (error) {
    console.error('Auto login error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

/**
 * Login with specific tenant (when user has accounts in multiple tenants)
 */
export async function loginWithTenant(req: Request, res: Response) {
  try {
    const { email, password, tenantId } = req.body;

    if (!email || !password || !tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, dan tenantId harus diisi',
      });
    }

    const publicPrisma = getPublicPrisma();

    // Get the tenant
    const tenant = await publicPrisma.tenant.findUnique({
      where: { id: Number(tenantId) },
    });

    if (!tenant || !tenant.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Perusahaan tidak ditemukan atau tidak aktif',
      });
    }

    // Get user from tenant schema
    const tenantPrisma = getTenantPrisma(tenant.schemaName);
    const user = await tenantPrisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email tidak ditemukan di perusahaan ini',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akun tidak aktif',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Password salah',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: tenant.id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          photo: user.photo,
          faceRegistered: user.faceRegistered,
          salaryType: user.salaryType,
          salary: user.salary,
          startWorkTime: user.startWorkTime,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
      },
    });
  } catch (error) {
    console.error('Login with tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}
