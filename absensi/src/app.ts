import express, {Express, Request, Response, NextFunction} from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";

import {tenantMiddleware, optionalTenantMiddleware} from "./middleware/tenant";
import {autoMigrateTenants} from "./config/auto-migrate";

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

// ============================================
// Security: CORS Whitelist
// ============================================
const allowedOrigins = [
  "https://app-presensi.yexsx.my.id",
  "https://api-presensi.yexsx.my.id",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow localhost in development
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://192.168.")
      ) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
  }),
);

// ============================================
// Security: Rate Limiting
// ============================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login attempts per window
  message: {
    success: false,
    message:
      "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: {
    success: false,
    message: "Terlalu banyak request. Coba lagi nanti.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use("/api/", apiLimiter);
app.use("/api/auth", authLimiter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use("/uploads", express.static(uploadsDir));

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Multi-Tenant Attendance API is running",
    version: "2.1.0",
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

// Auto-migrate schema for existing tenants on boot (delayed)
setTimeout(() => {
  autoMigrateTenants();
}, 5000);

export default app;
