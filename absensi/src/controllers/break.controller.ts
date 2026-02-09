import { Request, Response } from 'express';

/**
 * Start a break
 */
export const startBreak = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { faceVerified } = req.body;
    const photo = req.file ? req.file.filename : null;

    // Check if user has face registered
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.faceRegistered && faceVerified !== 'true' && faceVerified !== true) {
      return res.status(400).json({
        success: false,
        message: 'Face verification required for starting break',
      });
    }

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: today,
        clockOut: null,
      },
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'You must clock in first before starting a break',
      });
    }

    // Check if there's already an active break
    const activeBreak = await prisma.break.findFirst({
      where: {
        userId,
        attendanceId: attendance.id,
        endTime: null,
      },
    });

    if (activeBreak) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active break',
      });
    }

    // Check max break minutes
    const config = await prisma.companyConfig.findFirst();
    const maxBreakMinutes = config?.maxBreakMinutesPerDay || 60;

    if (attendance.totalBreakMinutes >= maxBreakMinutes) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum break time of ${maxBreakMinutes} minutes for today`,
      });
    }

    const breakRecord = await prisma.break.create({
      data: {
        userId,
        attendanceId: attendance.id,
        startTime: new Date(),
        startPhoto: photo,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Break started',
      data: breakRecord,
    });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * End a break
 */
export const endBreak = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { faceVerified } = req.body;
    const photo = req.file ? req.file.filename : null;

    // Check if user has face registered
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.faceRegistered && faceVerified !== 'true' && faceVerified !== true) {
      return res.status(400).json({
        success: false,
        message: 'Face verification required for ending break',
      });
    }

    // Find active break
    const activeBreak = await prisma.break.findFirst({
      where: {
        userId,
        endTime: null,
      },
      include: { attendance: true },
    });

    if (!activeBreak) {
      return res.status(400).json({
        success: false,
        message: 'No active break found',
      });
    }

    const endTime = new Date();
    const duration = Math.round(
      (endTime.getTime() - activeBreak.startTime.getTime()) / 60000
    );

    // Update break
    const updatedBreak = await prisma.break.update({
      where: { id: activeBreak.id },
      data: {
        endTime,
        duration,
        endPhoto: photo,
      },
    });

    // Update attendance total break minutes
    if (activeBreak.attendanceId) {
      await prisma.attendance.update({
        where: { id: activeBreak.attendanceId },
        data: {
          totalBreakMinutes: {
            increment: duration,
          },
        },
      });
    }

    res.json({
      success: true,
      message: 'Break ended',
      data: {
        ...updatedBreak,
        duration,
      },
    });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get today's breaks
 */
export const getTodayBreaks = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const breaks = await prisma.break.findMany({
      where: {
        userId,
        startTime: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const totalMinutes = breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const activeBreak = breaks.find((b) => !b.endTime);

    res.json({
      success: true,
      data: {
        breaks,
        totalMinutes,
        activeBreak: activeBreak || null,
      },
    });
  } catch (error) {
    console.error('Get today breaks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get break history
 */
export const getBreakHistory = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [breaks, total] = await Promise.all([
      prisma.break.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.break.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: breaks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get break history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
