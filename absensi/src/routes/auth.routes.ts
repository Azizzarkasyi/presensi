import { Router } from 'express';
import { autoLogin, loginWithTenant } from '../controllers/auth.controller';

const router = Router();

// Auto login - finds tenant from email automatically
router.post('/auto-login', autoLogin);

// Login with specific tenant (when email exists in multiple tenants)
router.post('/login-with-tenant', loginWithTenant);

export default router;
