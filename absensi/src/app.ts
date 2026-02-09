import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { tenantMiddleware, optionalTenantMiddleware } from './middleware/tenant';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import attendanceRoutes from './routes/attendance.routes';
import taskRoutes from './routes/task.routes';
import payrollRoutes from './routes/payroll.routes';
import breakRoutes from './routes/break.routes';
import faceRoutes from './routes/face.routes';
import configRoutes from './routes/config.routes';
import superAdminRoutes from './routes/super-admin.routes';

const app: Express = express();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Update konfigurasi CORS
app.use(cors({
    origin: true, // Allow all origins for now to fix connection issues
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    success: true,
    message: 'Multi-Tenant Attendance API is running',
    version: '2.0.0',
  });
});

// Auth routes (auto-login - no tenant context needed)
app.use('/api/auth', authRoutes);

// Super Admin routes (no tenant context needed)
app.use('/api/super-admin', superAdminRoutes);

// Tenant list endpoint (public, for mobile app to show company list)
app.get('/api/tenants', async (req: Request, res: Response) => {
  try {
    const { getPublicPrisma } = require('./prisma/tenant-prisma');
    const prisma = getPublicPrisma();
    
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: tenants,
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// All tenant-specific routes need tenant middleware
app.use('/api/users', tenantMiddleware, userRoutes);
app.use('/api/attendance', tenantMiddleware, attendanceRoutes);
app.use('/api/tasks', tenantMiddleware, taskRoutes);
app.use('/api/payroll', tenantMiddleware, payrollRoutes);
app.use('/api/break', tenantMiddleware, breakRoutes);
app.use('/api/face', tenantMiddleware, faceRoutes);
app.use('/api/config', tenantMiddleware, configRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export default app;
