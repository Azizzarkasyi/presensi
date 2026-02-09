import { Router } from 'express';
import {
  generatePayroll,
  getUserPayrolls,
  getMyPayrolls,
  getAllPayrolls,
  getPayrollById,
  deletePayroll,
} from '../controllers/payroll.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware';

const router = Router();

// User route
router.get('/my', authenticate, getMyPayrolls);

// Admin routes
router.post('/generate', authenticate, authorizeAdmin, generatePayroll);
router.get('/', authenticate, authorizeAdmin, getAllPayrolls);
router.get('/user/:userId', authenticate, authorizeAdmin, getUserPayrolls);
router.get('/:id', authenticate, authorizeAdmin, getPayrollById);
router.delete('/:id', authenticate, authorizeAdmin, deletePayroll);

export default router;
