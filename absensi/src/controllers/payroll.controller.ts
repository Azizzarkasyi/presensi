import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import path from 'path';

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
        
        let hoursWorked = 
          (attendance.clockOut.getTime() - attendance.clockIn.getTime()) / 3600000;
        
        const breakHours = (attendance.totalBreakMinutes || 0) / 60;
        hoursWorked = Math.max(0, hoursWorked - breakHours);
        
        workingHours += hoursWorked;
        
        if (attendance.status === 'LATE' && attendance.lateDeductionStatus !== 'APPROVED') {
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
    
    // Total deductions
    const totalDeductions = lateDeductions;

    // Fix bug: If HOURLY, the baseSalary ALREADY paid for the overtime hours at 1.0x rate.
    // So the overtimeBonus should only be the remaining 0.5x (or (overtimeRate - 1.0)x) bonus.
    // For NON-HOURLY, baseSalary is fixed, so overtime pays the FULL overtimeRate (e.g. 1.5x)
    let overtimeBonus = 0;
    if (user.salaryType === 'HOURLY') {
      overtimeBonus = overtimeHours * hourlyRate * (overtimeRate - 1.0);
    } else {
      overtimeBonus = overtimeHours * hourlyRate * overtimeRate;
    }

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

/**
 * Mark as Paid
 */
export const markAsPaid = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = parseInt(req.params.id as string, 10);

    let paymentProof = null;
    if (req.file) {
      paymentProof = `/uploads/${req.file.filename}`;
    }

    const payload: any = {
      paymentStatus: 'PAID',
    };
    if (paymentProof) {
      payload.paymentProof = paymentProof;
    }

    const payroll = await prisma.payroll.update({
      where: { id },
      data: payload,
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    res.json({
      success: true,
      message: 'Payroll marked as paid successfully',
      data: payroll
    });
  } catch (error) {
    console.error('Mark as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Export Payroll to Excel
 */
export const exportExcel = async (req: Request, res: Response) => {
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
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { periodEnd: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Penggajian');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nama Karyawan', key: 'name', width: 25 },
      { header: 'Periode Mulai', key: 'periodStart', width: 15 },
      { header: 'Periode Selesai', key: 'periodEnd', width: 15 },
      { header: 'Hari Kerja', key: 'workingDays', width: 15 },
      { header: 'Jam Kerja', key: 'workingHours', width: 15 },
      { header: 'Gaji Pokok', key: 'baseSalary', width: 15 },
      { header: 'Bonus Lembur', key: 'overtimeBonus', width: 15 },
      { header: 'Total Potongan', key: 'deductions', width: 15 },
      { header: 'Gaji Bersih', key: 'netSalary', width: 15 },
      { header: 'Status Pembayaran', key: 'paymentStatus', width: 20 },
    ];

    payrolls.forEach(p => {
      worksheet.addRow({
        id: p.id,
        name: p.user.name,
        periodStart: p.periodStart.toISOString().split('T')[0],
        periodEnd: p.periodEnd.toISOString().split('T')[0],
        workingDays: p.workingDays,
        workingHours: p.workingHours.toFixed(2),
        baseSalary: p.baseSalary,
        overtimeBonus: p.overtimeBonus,
        deductions: p.deductions,
        netSalary: p.netSalary,
        paymentStatus: p.paymentStatus,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'laporan_gaji.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Export My Payroll to Excel
 */
export const exportMyExcel = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { periodStart, periodEnd } = req.query;

    const where: any = { userId };
    if (periodStart && periodEnd) {
      where.periodStart = { gte: new Date(periodStart as string) };
      where.periodEnd = { lte: new Date(periodEnd as string) };
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { periodEnd: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Gaji Saya');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Periode Mulai', key: 'periodStart', width: 15 },
      { header: 'Periode Selesai', key: 'periodEnd', width: 15 },
      { header: 'Hari Kerja', key: 'workingDays', width: 15 },
      { header: 'Jam Kerja', key: 'workingHours', width: 15 },
      { header: 'Gaji Pokok', key: 'baseSalary', width: 15 },
      { header: 'Bonus Lembur', key: 'overtimeBonus', width: 15 },
      { header: 'Total Potongan', key: 'deductions', width: 15 },
      { header: 'Gaji Bersih', key: 'netSalary', width: 15 },
      { header: 'Status Pembayaran', key: 'paymentStatus', width: 20 },
    ];

    payrolls.forEach(p => {
      worksheet.addRow({
        id: p.id,
        periodStart: p.periodStart.toISOString().split('T')[0],
        periodEnd: p.periodEnd.toISOString().split('T')[0],
        workingDays: p.workingDays,
        workingHours: p.workingHours.toFixed(2),
        baseSalary: p.baseSalary,
        overtimeBonus: p.overtimeBonus,
        deductions: p.deductions,
        netSalary: p.netSalary,
        paymentStatus: p.paymentStatus,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=gaji_saya.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
