import { Request, Response } from 'express';

/**
 * Create a task
 */
/**
 * Create a task (Supports multiple assignees)
 */
export const createTask = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const creatorId = req.user!.id;
    const { title, description, assigneeId, assigneeIds, dueDate, status } = req.body; // Support both single and multiple

    // 1. Role Check: Only ADMIN or LEADER can create tasks
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!creator || (creator.role !== 'ADMIN' && creator.role !== 'LEADER')) {
      return res.status(403).json({
        success: false,
        message: 'Only Admin or Leader can create tasks',
      });
    }

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }

    // 2. Resolve Assignees
    let finalAssigneeIds: number[] = [];

    if (assigneeIds && Array.isArray(assigneeIds)) {
      finalAssigneeIds = assigneeIds.map((id: any) => Number(id));
    } else if (assigneeId) {
      finalAssigneeIds = [Number(assigneeId)];
    } else {
      return res.status(400).json({
         success: false,
         message: 'At least one assignee is required',
      });
    }

    // 3. Create Tasks (One per assignee to track individual progress)
    // We use a transaction to ensure all are created or none
    const createdTasks = await prisma.$transaction(
      finalAssigneeIds.map((id) => 
        prisma.task.create({
          data: {
            title,
            description,
            assigneeId: id,
            creatorId,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'PENDING',
          },
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `${createdTasks.length} task(s) created successfully`,
      data: createdTasks,
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all tasks (with filters)
 */
export const getTasks = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { status, assigneeId, creatorId } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (assigneeId) {
      where.assigneeId = Number(assigneeId);
    }

    if (creatorId) {
      where.creatorId = Number(creatorId);
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get my tasks (assigned to me)
 */
export const getMyTasks = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { status } = req.query;

    const where: any = { assigneeId: userId };

    if (status) {
      where.status = status;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get task by ID
 */
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = parseInt(req.params.id as string, 10);

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update task
 */
export const updateTask = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = parseInt(req.params.id as string, 10);
    const { title, description, assigneeId, dueDate, status } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(assigneeId && { assigneeId: Number(assigneeId) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(status && { status }),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update task status (for assignee)
 */
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const id = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    // Verify task belongs to this user
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Allow creator or assignee to update status
    if (task.assigneeId !== userId && task.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own tasks',
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      message: 'Task status updated',
      data: updatedTask,
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete task
 */
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = parseInt(req.params.id as string, 10);

    await prisma.task.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
