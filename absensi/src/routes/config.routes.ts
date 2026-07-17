import { Router } from 'express';
import { getConfig, updateConfig, getBillingStatus, uploadPaymentProof } from '../controllers/config.controller';
import upload from '../config/multer';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getConfig);
router.put('/', authenticate, authorizeAdmin, updateConfig);
router.get('/billing', authenticate, authorizeAdmin, getBillingStatus);
router.post('/billing/:id/proof', authenticate, authorizeAdmin, upload.single('paymentProof'), uploadPaymentProof);

export default router;
