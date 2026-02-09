import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  clockIn,
  clockOut,
  getHistory,
  getTodayAttendance,
  getStatistics,
  getAllTodayAttendance,
  getAttendanceReport,
} from '../controllers/attendance.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware';

const router = Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'attendance-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, JPG, and PNG files are allowed'));
  },
});

// All routes require authentication
router.post('/clock-in', authenticate, upload.single('photo'), clockIn);
router.post('/clock-out', authenticate, upload.single('photo'), clockOut);
router.get('/today', authenticate, getTodayAttendance);
router.get('/history', authenticate, getHistory);
router.get('/statistics', authenticate, getStatistics);

// Admin routes
router.get('/admin/today', authenticate, authorizeAdmin, getAllTodayAttendance);
router.get('/admin/report', authenticate, authorizeAdmin, getAttendanceReport);

export default router;
