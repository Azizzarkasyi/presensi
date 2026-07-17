import { Request, Response } from 'express';
import { getPublicPrisma } from '../prisma/tenant-prisma';

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
      officeLatitude,
      officeLongitude,
      allowedRadiusMeters,
    } = req.body;

    let config = await prisma.companyConfig.findFirst();

    if (!config) {
      config = await prisma.companyConfig.create({
        data: {
          companyName,
          maxBreakMinutesPerDay,
          lateThresholdMinutes,
          overtimeRateMultiplier,
          officeLatitude,
          officeLongitude,
          allowedRadiusMeters,
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
          ...(officeLatitude !== undefined && { officeLatitude }),
          ...(officeLongitude !== undefined && { officeLongitude }),
          ...(allowedRadiusMeters !== undefined && { allowedRadiusMeters }),
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

/**
 * Get tenant active billing status (Admin only)
 */
export const getBillingStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const publicPrisma = getPublicPrisma();
    
    const unpaidBilling = await publicPrisma.subscriptionBilling.findFirst({
      where: {
        tenantId,
        status: 'PENDING',
      },
      orderBy: [
        { year: 'asc' },
        { month: 'asc' }
      ]
    });
    
    // Get superadmin bank details
    const superAdmin = await publicPrisma.superAdmin.findFirst();

    res.json({
      success: true,
      data: {
        hasUnpaidBilling: !!unpaidBilling,
        billing: unpaidBilling,
        bankDetails: superAdmin ? {
          bankName: superAdmin.bankName,
          bankAccount: superAdmin.bankAccount,
          bankAccountName: superAdmin.bankAccountName,
        } : null
      },
    });
  } catch (error) {
    console.error('Get billing status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Upload payment proof for tenant billing
 */
export const uploadPaymentProof = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const billingId = parseInt(req.params.id as string);
    const publicPrisma = getPublicPrisma();
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payment proof image is required' });
    }

    const billing = await publicPrisma.subscriptionBilling.findFirst({
      where: { id: billingId, tenantId },
    });

    if (!billing) {
      return res.status(404).json({ success: false, message: 'Billing not found' });
    }

    const updatedBilling = await publicPrisma.subscriptionBilling.update({
      where: { id: billingId },
      data: {
        paymentProof: `/api/uploads/${req.file.filename}`,
      }
    });

    res.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: updatedBilling,
    });
  } catch (error) {
    console.error('Upload proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
