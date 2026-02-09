import { Router } from 'express';
import { getConfig, updateConfig } from '../controllers/config.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getConfig);
router.put('/', authenticate, authorizeAdmin, updateConfig);

export default router;
