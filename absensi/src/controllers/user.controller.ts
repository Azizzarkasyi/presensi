import {Prisma} from "@prisma/client";
import {Request, Response} from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "7d") as jwt.SignOptions["expiresIn"];

type WorkLocation = {
  latitude: number;
  longitude: number;
  radius: number;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

function parseWorkLocationEntry(
  value: unknown,
  defaultRadius: number,
): WorkLocation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const location = value as {
    latitude?: unknown;
    longitude?: unknown;
    radius?: unknown;
  };

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const radiusValue =
    location.radius === undefined || location.radius === null
      ? defaultRadius
      : Number(location.radius);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const radius =
    Number.isFinite(radiusValue) && radiusValue > 0
      ? radiusValue
      : defaultRadius;

  return {
    latitude,
    longitude,
    radius,
  };
}

function parseWorkLocations(
  value: unknown,
  defaultRadius: number,
): WorkLocation[] | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  let rawValue = value;

  if (typeof value === "string") {
    try {
      rawValue = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(rawValue)) {
    return null;
  }

  const locations = rawValue
    .map(item => parseWorkLocationEntry(item, defaultRadius))
    .filter((item): item is WorkLocation => item !== null);

  return locations.length > 0 ? locations : null;
}

function resolvePrimaryWorkLocation(locations: WorkLocation[] | null) {
  return locations && locations.length > 0 ? locations[0] : null;
}

/**
 * Login - Tenant user login
 * Requires X-Tenant-ID header to be set
 */
export const login = async (req: Request, res: Response) => {
  try {
    const {email, password} = req.body;
    const prisma = req.prisma!;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {email},
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Generate JWT with tenant ID
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: req.tenantId,
      },
      JWT_SECRET,
      {expiresIn: JWT_EXPIRES_IN},
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
          endWorkTime: user.endWorkTime,
        },
        tenantId: req.tenantId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: {id: userId},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        photo: true,
        faceRegistered: true,
        salaryType: true,
        salary: true,
        startWorkTime: true,
        endWorkTime: true,
        workLatitude: true,
        workLongitude: true,
        workRadius: true,
        workLocations: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update current user profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const {name, startWorkTime} = req.body;
    const photo = req.file ? req.file.filename : undefined;

    const user = await prisma.user.update({
      where: {id: userId},
      data: {
        ...(name && {name}),
        ...(photo && {photo}),
        ...(startWorkTime && {startWorkTime}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        photo: true,
        faceRegistered: true,
        startWorkTime: true,
        endWorkTime: true,
        workLatitude: true,
        workLongitude: true,
        workRadius: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all users (Admin only)
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;

    const users = await prisma.user.findMany({
      orderBy: {createdAt: "desc"},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        photo: true,
        faceRegistered: true,
        isActive: true,
        salaryType: true,
        salary: true,
        startWorkTime: true,
        endWorkTime: true,
        workLatitude: true,
        workLongitude: true,
        workRadius: true,
        workLocations: true,
        latePenalty: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get user by ID (Admin only)
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = parseInt(req.params.id as string, 10);

    const user = await prisma.user.findUnique({
      where: {id},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        photo: true,
        faceRegistered: true,
        isActive: true,
        salaryType: true,
        salary: true,
        startWorkTime: true,
        endWorkTime: true,
        workLatitude: true,
        workLongitude: true,
        workRadius: true,
        workLocations: true,
        latePenalty: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Create a new user (Admin only)
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const {
      email,
      password,
      name,
      role,
      salaryType,
      salary,
      startWorkTime,
      endWorkTime,
      latePenalty,
      workLatitude,
      workLongitude,
      workRadius,
      workLocations,
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and name are required",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: {email: normalizedEmail},
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const parsedWorkLocations = parseWorkLocations(workLocations, 50);
    const primaryLocation = resolvePrimaryWorkLocation(parsedWorkLocations);
    const resolvedWorkLatitude =
      workLatitude !== undefined
        ? parseFloat(workLatitude)
        : (primaryLocation?.latitude ?? null);
    const resolvedWorkLongitude =
      workLongitude !== undefined
        ? parseFloat(workLongitude)
        : (primaryLocation?.longitude ?? null);
    const resolvedWorkRadius =
      workRadius !== undefined
        ? parseInt(workRadius, 10)
        : (primaryLocation?.radius ?? null);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        role: role || "USER",
        salaryType: salaryType || "MONTHLY",
        salary: salary ? parseFloat(salary) : 0,
        startWorkTime: startWorkTime || "09:00",
        endWorkTime: endWorkTime || "17:00",
        workLatitude: Number.isFinite(resolvedWorkLatitude as number)
          ? resolvedWorkLatitude
          : null,
        workLongitude: Number.isFinite(resolvedWorkLongitude as number)
          ? resolvedWorkLongitude
          : null,
        workRadius: Number.isFinite(resolvedWorkRadius as number)
          ? resolvedWorkRadius
          : null,
        ...(parsedWorkLocations ? {workLocations: parsedWorkLocations} : {}),
        latePenalty: latePenalty ? parseFloat(latePenalty) : 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        salaryType: true,
        salary: true,
        startWorkTime: true,
        endWorkTime: true,
        workLatitude: true,
        workLongitude: true,
        workRadius: true,
        workLocations: true,
        latePenalty: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update user (Admin only)
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = parseInt(req.params.id as string, 10);
    const {
      name,
      email,
      role,
      salaryType,
      salary,
      startWorkTime,
      endWorkTime,
      latePenalty,
      isActive,
      workLatitude,
      workLongitude,
      workRadius,
      workLocations,
    } = req.body;
    const parsedWorkLocations = parseWorkLocations(workLocations, 50);
    const primaryLocation = resolvePrimaryWorkLocation(parsedWorkLocations);
    const resolvedWorkLatitude =
      workLatitude !== undefined
        ? workLatitude === null
          ? null
          : parseFloat(workLatitude)
        : primaryLocation?.latitude;
    const resolvedWorkLongitude =
      workLongitude !== undefined
        ? workLongitude === null
          ? null
          : parseFloat(workLongitude)
        : primaryLocation?.longitude;
    const resolvedWorkRadius =
      workRadius !== undefined
        ? workRadius === null
          ? null
          : parseInt(workRadius, 10)
        : primaryLocation?.radius;
    const shouldUpdateLocationFields =
      workLocations !== undefined ||
      workLatitude !== undefined ||
      workLongitude !== undefined ||
      workRadius !== undefined;
    const normalizedEmail = email ? normalizeEmail(email) : undefined;

    const user = await prisma.user.update({
      where: {id},
      data: {
        ...(name && {name}),
        ...(normalizedEmail && {email: normalizedEmail}),
        ...(role && {role}),
        ...(salaryType && {salaryType}),
        ...(salary !== undefined && {salary: parseFloat(salary)}),
        ...(startWorkTime && {startWorkTime}),
        ...(endWorkTime && {endWorkTime}),
        ...(latePenalty !== undefined && {
          latePenalty: parseFloat(latePenalty),
        }),
        ...(isActive !== undefined && {isActive}),
        ...(shouldUpdateLocationFields
          ? {
              workLatitude:
                resolvedWorkLatitude !== undefined &&
                resolvedWorkLatitude !== null &&
                Number.isFinite(Number(resolvedWorkLatitude))
                  ? Number(resolvedWorkLatitude)
                  : null,
              workLongitude:
                resolvedWorkLongitude !== undefined &&
                resolvedWorkLongitude !== null &&
                Number.isFinite(Number(resolvedWorkLongitude))
                  ? Number(resolvedWorkLongitude)
                  : null,
              workRadius:
                resolvedWorkRadius !== undefined &&
                resolvedWorkRadius !== null &&
                Number.isFinite(Number(resolvedWorkRadius))
                  ? Number(resolvedWorkRadius)
                  : null,
            }
          : {}),
        ...(workLocations !== undefined && {
          workLocations: parsedWorkLocations ?? Prisma.DbNull,
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        salaryType: true,
        salary: true,
        startWorkTime: true,
        endWorkTime: true,
        workLatitude: true,
        workLongitude: true,
        workRadius: true,
        workLocations: true,
        latePenalty: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete user (Admin only)
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = parseInt(req.params.id as string, 10);

    // Don't allow deleting yourself
    if (req.user!.id === id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    await prisma.user.delete({
      where: {id},
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Change password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const {currentPassword, newPassword} = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {id: userId},
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: {id: userId},
      data: {password: hashedPassword},
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
