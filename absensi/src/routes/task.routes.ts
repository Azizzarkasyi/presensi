import { Router } from 'express';
import {
  createTask,
  getTasks,
  getMyTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from '../controllers/task.controller';
import { authenticate, authorizeLeaderOrAdmin } from '../middleware/auth.middleware';

const router = Router();

// User routes
router.get('/my', authenticate, getMyTasks);
router.patch('/:id/status', authenticate, updateTaskStatus);

// Leader/Admin routes
router.post('/', authenticate, authorizeLeaderOrAdmin, createTask);
router.get('/', authenticate, authorizeLeaderOrAdmin, getTasks);
router.get('/:id', authenticate, getTaskById);
router.put('/:id', authenticate, authorizeLeaderOrAdmin, updateTask);
router.delete('/:id', authenticate, authorizeLeaderOrAdmin, deleteTask);

export default router;
