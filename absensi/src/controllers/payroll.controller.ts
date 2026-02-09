import { Request, Response } from 'express';

/**
 * Generate payroll for a user
 */
export const generatePayroll = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { userId, periodStart, periodEnd } = req.body;

    if (!userId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'userId, periodStart, and periodEnd are required',
      });
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Get user with salary info
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get company config for overtime rate
    const config = await prisma.companyConfig.findFirst();
    const overtimeRate = config?.overtimeRateMultiplier || 1.5;

    // Get attendance records for the period
    const attendances = await prisma.attendance.findMany({
      where: {
        userId: Number(userId),
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { breaks: true },
    });

    // Calculate working stats
    let workingDays = 0;
    let workingHours = 0;
    let lateCount = 0;
    let totalBreakMinutes = 0;

    for (const attendance of attendances) {
      if (attendance.clockIn && attendance.clockOut) {
        workingDays++;
        
        const hoursWorked = 
          (attendance.clockOut.getTime() - attendance.clockIn.getTime()) / 3600000;
        workingHours += hoursWorked;
        
        if (attendance.status === 'LATE') {
          lateCount++;
        }
        
        totalBreakMinutes += attendance.totalBreakMinutes;
      }
    }

    // Calculate salary based on type
    let baseSalary = user.salary;
    
    switch (user.salaryType) {
      case 'HOURLY':
        baseSalary = user.salary * workingHours;
        break;
      case 'DAILY':
        baseSalary = user.salary * workingDays;
        break;
      case 'WEEKLY':
        baseSalary = user.salary * Math.ceil(workingDays / 7);
        break;
      case 'MONTHLY':
      default:
        baseSalary = user.salary;
        break;
    }

    // Calculate deductions
    const lateDeductions = lateCount * user.latePenalty;

    // Calculate overtime (assuming 8 hours per day is standard)
    const expectedHours = workingDays * 8;
    const overtimeHours = Math.max(0, workingHours - expectedHours);
    
    // Calculate hourly rate for overtime
    let hourlyRate = user.salary;
    if (user.salaryType === 'MONTHLY') {
      hourlyRate = user.salary / 160; // Assuming 160 hours per month
    } else if (user.salaryType === 'DAILY') {
      hourlyRate = user.salary / 8;
    } else if (user.salaryType === 'WEEKLY') {
      hourlyRate = user.salary / 40;
    }
    
    const overtimeBonus = overtimeHours * hourlyRate * overtimeRate;

    // Total deductions
    const totalDeductions = lateDeductions;

    // Net salary
    const netSalary = baseSalary + overtimeBonus - totalDeductions;

    // Create payroll record
    const payroll = await prisma.payroll.create({
      data: {
        userId: Number(userId),
        periodStart: startDate,
        periodEnd: endDate,
        baseSalary,
        workingDays,
        workingHours,
        overtimeHours,
        lateDeductions,
        breakDeductions: 0, // Can implement break penalties if needed
        overtimeBonus,
        deductions: totalDeductions,
        netSalary,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Payroll generated successfully',
      data: payroll,
    });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get payroll history for a user
 */
export const getUserPayrolls = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = parseInt(req.params.userId as string, 10);

    const payrolls = await prisma.payroll.findMany({
      where: { userId },
      orderBy: { periodEnd: 'desc' },
    });

    res.json({
      success: true,
      data: payrolls,
    });
  } catch (error) {
    console.error('Get user payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get my payroll history
 */
export const getMyPayrolls = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;

    const payrolls = await prisma.payroll.findMany({
      where: { userId },
      orderBy: { periodEnd: 'desc' },
    });

    res.json({
      success: true,
      data: payrolls,
    });
  } catch (error) {
    console.error('Get my payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all payrolls (Admin)
 */
export const getAllPayrolls = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { periodStart, periodEnd } = req.query;

    const where: any = {};

    if (periodStart && periodEnd) {
      where.periodStart = { gte: new Date(periodStart as string) };
      where.periodEnd = { lte: new Date(periodEnd as string) };
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { periodEnd: 'desc' },
    });

    res.json({
      success: true,
      data: payrolls,
    });
  } catch (error) {
    console.error('Get all payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get payroll by ID
 */
export const getPayrollById = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = parseInt(req.params.id as string, 10);

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll not found',
      });
    }

    res.json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    console.error('Get payroll by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete payroll
 */
export const deletePayroll = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = parseInt(req.params.id as string, 10);

    await prisma.payroll.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Payroll deleted successfully',
    });
  } catch (error) {
    console.error('Delete payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
