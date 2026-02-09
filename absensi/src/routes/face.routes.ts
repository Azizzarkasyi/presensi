import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  registerFace,
  verifyFace,
  getFaceStatus,
  deleteFace,
} from '../controllers/face.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'face-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// All routes require authentication
router.post('/register', authenticate, upload.single('photo'), registerFace);
router.post('/verify', authenticate, verifyFace);
router.get('/status', authenticate, getFaceStatus);
router.delete('/', authenticate, deleteFace);

export default router;
