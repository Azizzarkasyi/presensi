import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPublicPrisma, getTenantPrisma } from '../prisma/tenant-prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        isSuperAdmin?: boolean;
      };
    }
  }
}

/**
 * Authentication middleware for tenant users
 * Requires valid JWT token in Authorization header
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: string;
      isSuperAdmin?: boolean;
    };

    // Check if user exists in tenant schema
    if (!decoded.isSuperAdmin && req.prisma) {
      const user = await req.prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive',
        });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
}

/**
 * Authorization middleware for admin-only routes
 */
export function authorizeAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  if (req.user.role !== 'ADMIN' && !req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
}

/**
 * Authorization middleware for leader or admin routes
 */
export function authorizeLeaderOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  if (!['ADMIN', 'LEADER'].includes(req.user.role) && !req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Leader or Admin access required',
    });
  }

  next();
}

/**
 * Authentication middleware for super admin
 */
export async function superAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: string;
      isSuperAdmin?: boolean;
    };

    if (!decoded.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required',
      });
    }

    // Verify super admin exists
    const prisma = getPublicPrisma();
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: decoded.id },
    });

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Super admin not found',
      });
    }

    req.user = decoded;
    req.isSuperAdmin = true;
    next();
  } catch (error) {
    console.error('Super admin auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
}

/**
 * Role-based authorization middleware
 */
export const authorize = (roles: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (req.user.isSuperAdmin) {
      return next(); // Super admin has access to everything
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};
