import { Router } from 'express';
import {
  superAdminLogin,
  getTenants,
  getTenantById,
  createTenant,
  deleteTenant,
  deactivateTenant,
  activateTenant,
  createSuperAdmin,
  getSuperAdminProfile,
} from '../controllers/super-admin.controller';
import { superAdminAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/login', superAdminLogin);
router.post('/setup', createSuperAdmin); // Initial setup only

// Protected routes (require super admin token)
router.get('/profile', superAdminAuth, getSuperAdminProfile);
router.get('/tenants', superAdminAuth, getTenants);
router.get('/tenants/:id', superAdminAuth, getTenantById);
router.post('/tenants', superAdminAuth, createTenant);
router.delete('/tenants/:id', superAdminAuth, deleteTenant);
router.patch('/tenants/:id/deactivate', superAdminAuth, deactivateTenant);
router.patch('/tenants/:id/activate', superAdminAuth, activateTenant);

export default router;
