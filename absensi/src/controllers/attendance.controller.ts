import { Request, Response } from 'express';

/**
 * Clock In
 */
export const clockIn = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { status, latitude, longitude, faceVerified } = req.body;
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
        message: 'Face verification required for clock in',
      });
    }

    // Get today's date (date only, no time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already exists for today
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: today,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already recorded for today',
      });
    }

    // Get company config for late threshold
    const config = await prisma.companyConfig.findFirst();
    const workStartTime = config?.workStartTime || user.startWorkTime || '09:00';
    const lateThreshold = config?.lateThresholdMinutes || 15;

    // Determine status - check if late
    const now = new Date();
    const [startHour, startMinute] = workStartTime.split(':').map(Number);
    
    let attendanceStatus = status || 'PRESENT';
    if (attendanceStatus === 'PRESENT') {
      const startTimeToday = new Date(today);
      startTimeToday.setHours(startHour, startMinute + lateThreshold, 0, 0);
      
      if (now > startTimeToday) {
        attendanceStatus = 'LATE';
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: today,
        clockIn: now,
        clockInPhoto: photo,
        status: attendanceStatus,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Clock in successful',
      data: attendance,
      isLate: attendanceStatus === 'LATE',
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Clock Out
 */
export const clockOut = async (req: Request, res: Response) => {
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
        message: 'Face verification required for clock out',
      });
    }

    // Find today's attendance
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
        message: 'No active check-in found or already clocked out',
      });
    }

    // Check if there's an active break
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
        message: 'Please end your break before clocking out',
      });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: new Date(),
        clockOutPhoto: photo,
      },
    });

    res.json({
      success: true,
      message: 'Clock out successful',
      data: updatedAttendance,
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get attendance history for current user
 */
export const getHistory = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [history, total] = await Promise.all([
      prisma.attendance.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        include: { breaks: true },
        skip,
        take: Number(limit),
      }),
      prisma.attendance.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: history,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get today's attendance for current user
 */
export const getTodayAttendance = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: today,
      },
      include: { breaks: true },
    });

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get attendance statistics for current user
 */
export const getStatistics = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { month, year } = req.query;

    const targetMonth = month ? Number(month) - 1 : new Date().getMonth();
    const targetYear = year ? Number(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { breaks: true },
    });

    const stats = {
      totalDays: attendances.length,
      present: attendances.filter((a) => a.status === 'PRESENT').length,
      late: attendances.filter((a) => a.status === 'LATE').length,
      absent: attendances.filter((a) => a.status === 'ABSENT').length,
      sick: attendances.filter((a) => a.status === 'SICK').length,
      leave: attendances.filter((a) => a.status === 'LEAVE').length,
      totalBreakMinutes: attendances.reduce((sum, a) => sum + a.totalBreakMinutes, 0),
    };

    res.json({
      success: true,
      data: stats,
      period: {
        month: targetMonth + 1,
        year: targetYear,
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Admin: Get all attendance for today
 */
export const getAllTodayAttendance = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
      where: { date: today },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        breaks: true,
      },
      orderBy: { clockIn: 'asc' },
    });

    res.json({
      success: true,
      data: attendances,
    });
  } catch (error) {
    console.error('Get all today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Admin: Get attendance report
 */
export const getAttendanceReport = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { startDate, endDate, userId } = req.query;

    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (userId) {
      where.userId = Number(userId);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        breaks: true,
      },
      orderBy: [{ date: 'desc' }, { clockIn: 'asc' }],
    });

    res.json({
      success: true,
      data: attendances,
    });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
