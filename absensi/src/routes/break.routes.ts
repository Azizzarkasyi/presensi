import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  startBreak,
  endBreak,
  getTodayBreaks,
  getBreakHistory,
} from '../controllers/break.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'break-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// All routes require authentication
router.post('/start', authenticate, upload.single('photo'), startBreak);
router.post('/end', authenticate, upload.single('photo'), endBreak);
router.get('/today', authenticate, getTodayBreaks);
router.get('/history', authenticate, getBreakHistory);

export default router;
