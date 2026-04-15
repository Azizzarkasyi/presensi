import { Router } from 'express';
import {
  generatePayroll,
  getUserPayrolls,
  getMyPayrolls,
  getAllPayrolls,
  getPayrollById,
  deletePayroll,
  markAsPaid,
  exportExcel,
  exportMyExcel,
} from '../controllers/payroll.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware';
import upload from '../config/multer';

const router = Router();

// User route
router.get('/my/export/excel', authenticate, exportMyExcel);
router.get('/my', authenticate, getMyPayrolls);

// Admin routes
router.post('/generate', authenticate, authorizeAdmin, generatePayroll);
router.get('/', authenticate, authorizeAdmin, getAllPayrolls);
router.get('/export/excel', authenticate, authorizeAdmin, exportExcel);
router.get('/user/:userId', authenticate, authorizeAdmin, getUserPayrolls);
router.get('/:id', authenticate, authorizeAdmin, getPayrollById);
router.patch('/:id/pay', authenticate, authorizeAdmin, upload.single('paymentProof'), markAsPaid);
router.delete('/:id', authenticate, authorizeAdmin, deletePayroll);

export default router;
