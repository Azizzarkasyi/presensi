import { Request, Response } from 'express';

/**
 * Get company config
 */
export const getConfig = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;

    let config = await prisma.companyConfig.findFirst();

    if (!config) {
      // Create default config if not exists
      config = await prisma.companyConfig.create({
        data: {},
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update company config (Admin only)
 */
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const {
      companyName,
      maxBreakMinutesPerDay,
      lateThresholdMinutes,
      overtimeRateMultiplier,
      workStartTime,
      workEndTime,
    } = req.body;

    let config = await prisma.companyConfig.findFirst();

    if (!config) {
      config = await prisma.companyConfig.create({
        data: {
          companyName,
          maxBreakMinutesPerDay,
          lateThresholdMinutes,
          overtimeRateMultiplier,
          workStartTime,
          workEndTime,
        },
      });
    } else {
      config = await prisma.companyConfig.update({
        where: { id: config.id },
        data: {
          ...(companyName && { companyName }),
          ...(maxBreakMinutesPerDay !== undefined && { maxBreakMinutesPerDay }),
          ...(lateThresholdMinutes !== undefined && { lateThresholdMinutes }),
          ...(overtimeRateMultiplier !== undefined && { overtimeRateMultiplier }),
          ...(workStartTime && { workStartTime }),
          ...(workEndTime && { workEndTime }),
        },
      });
    }

    res.json({
      success: true,
      message: 'Config updated successfully',
      data: config,
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
