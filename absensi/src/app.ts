import express, {Express, Request, Response, NextFunction} from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import {tenantMiddleware, optionalTenantMiddleware} from "./middleware/tenant";

// Routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import attendanceRoutes from "./routes/attendance.routes";
import taskRoutes from "./routes/task.routes";
import payrollRoutes from "./routes/payroll.routes";
import breakRoutes from "./routes/break.routes";
import faceRoutes from "./routes/face.routes";
import configRoutes from "./routes/config.routes";
import superAdminRoutes from "./routes/super-admin.routes";

const app: Express = express();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {recursive: true});
}

// Update konfigurasi CORS
app.use(
  cors({
    origin: true, // Allow all origins for now to fix connection issues
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use("/uploads", express.static(uploadsDir));

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Multi-Tenant Attendance API is running",
    version: "2.0.0",
  });
});

// Auth routes
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes); // Fallback for stripped Nginx

// Super Admin routes
app.use("/api/super-admin", superAdminRoutes);
app.use("/super-admin", superAdminRoutes); // Fallback

// Tenant list endpoint
const tenantListHandler = async (req: Request, res: Response) => {
  try {
    const {getPublicPrisma} = require("./prisma/tenant-prisma");
    const prisma = getPublicPrisma();

    const tenants = await prisma.tenant.findMany({
      where: {isActive: true},
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    });

    res.json({success: true, data: tenants});
  } catch (error) {
    console.error("Get tenants error:", error);
    res.status(500).json({success: false, message: "Internal server error"});
  }
};
app.get("/api/tenants", tenantListHandler);
app.get("/tenants", tenantListHandler);

// All tenant-specific routes need tenant middleware
const apiRoutes = [
  {path: "/users", router: userRoutes},
  {path: "/attendance", router: attendanceRoutes},
  {path: "/tasks", router: taskRoutes},
  {path: "/payroll", router: payrollRoutes},
  {path: "/break", router: breakRoutes},
  {path: "/face", router: faceRoutes},
  {path: "/config", router: configRoutes},
];

apiRoutes.forEach(route => {
  app.use(`/api${route.path}`, tenantMiddleware, route.router);
  app.use(route.path, tenantMiddleware, route.router); // Fallback
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// Auto-migrate schema length for existing tenants on boot
setTimeout(async () => {
  try {
    const {getPublicPrisma} = require("./prisma/tenant-prisma");
    const prisma = getPublicPrisma();
    const tenants = await prisma.tenant.findMany();
    for (const tenant of tenants) {
      await prisma
        .$executeRawUnsafe(
          `DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_type t
              JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE t.typname = 'LeaveApprovalStatus' AND n.nspname = '${tenant.schemaName}'
            ) THEN
              CREATE TYPE "${tenant.schemaName}"."LeaveApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
            END IF;
          END $$;`,
        )
        .catch(() => {});
      await prisma
        .$executeRawUnsafe(
          `DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_type t
              JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE t.typname = 'CorrectionStatus' AND n.nspname = '${tenant.schemaName}'
            ) THEN
              CREATE TYPE "${tenant.schemaName}"."CorrectionStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
            END IF;
          END $$;`,
        )
        .catch(() => {});
      await prisma
        .$executeRawUnsafe(
          `ALTER TABLE "${tenant.schemaName}"."User" ALTER COLUMN "startWorkTime" TYPE VARCHAR(255)`,
        )
        .catch(() => {});
      await prisma
        .$executeRawUnsafe(
          `ALTER TABLE "${tenant.schemaName}"."User" ALTER COLUMN "endWorkTime" TYPE VARCHAR(255)`,
        )
        .catch(() => {});
      await prisma
        .$executeRawUnsafe(
          `ALTER TABLE "${tenant.schemaName}"."User" ADD COLUMN IF NOT EXISTS "workLocations" JSONB`,
        )
        .catch(() => {});
      await prisma
        .$executeRawUnsafe(
          `ALTER TABLE "${tenant.schemaName}"."Attendance"
          ADD COLUMN IF NOT EXISTS "leaveApprovalStatus" "${tenant.schemaName}"."LeaveApprovalStatus" NOT NULL DEFAULT 'PENDING',
          ADD COLUMN IF NOT EXISTS "leaveReviewNote" TEXT,
          ADD COLUMN IF NOT EXISTS "leaveReviewedAt" TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS "correctionStatus" "${tenant.schemaName}"."CorrectionStatus" NOT NULL DEFAULT 'NONE',
          ADD COLUMN IF NOT EXISTS "correctionReason" TEXT,
          ADD COLUMN IF NOT EXISTS "correctionRequestedClockIn" TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS "correctionRequestedClockOut" TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS "correctionReviewNote" TEXT,
          ADD COLUMN IF NOT EXISTS "correctionRequestedAt" TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS "correctionReviewedAt" TIMESTAMP(3)`,
        )
        .catch(() => {});
    }
  } catch (e) {
    // Ignore migration errors
  }
}, 5000);

export default app;
