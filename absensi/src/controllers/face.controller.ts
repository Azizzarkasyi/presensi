import { Request, Response } from 'express';

/**
 * Register face descriptor
 */
export const registerFace = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { faceDescriptor } = req.body;
    const photo = req.file ? req.file.filename : null;

    if (!faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: 'Face descriptor is required',
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        faceDescriptor: JSON.stringify(faceDescriptor),
        faceRegistered: true,
        ...(photo && { photo }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        faceRegistered: true,
        photo: true,
      },
    });

    res.json({
      success: true,
      message: 'Face registered successfully',
      data: user,
    });
  } catch (error) {
    console.error('Register face error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Verify face against stored descriptor
 */
export const verifyFace = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const { faceDescriptor } = req.body;

    if (!faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: 'Face descriptor is required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.faceRegistered || !user.faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: 'Face not registered',
      });
    }

    // Compare face descriptors using Euclidean distance
    const storedDescriptor = JSON.parse(user.faceDescriptor);
    const inputDescriptor = faceDescriptor;

    const distance = calculateEuclideanDistance(storedDescriptor, inputDescriptor);
    const threshold = 0.6; // Adjust based on your face recognition model
    const isMatch = distance < threshold;

    res.json({
      success: true,
      data: {
        verified: isMatch,
        distance,
        threshold,
      },
    });
  } catch (error) {
    console.error('Verify face error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get face registration status
 */
export const getFaceStatus = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        faceRegistered: true,
        photo: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        faceRegistered: user.faceRegistered,
        photo: user.photo,
      },
    });
  } catch (error) {
    console.error('Get face status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete face registration
 */
export const deleteFace = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        faceDescriptor: null,
        faceRegistered: false,
      },
      select: {
        id: true,
        faceRegistered: true,
      },
    });

    res.json({
      success: true,
      message: 'Face registration deleted',
      data: user,
    });
  } catch (error) {
    console.error('Delete face error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Calculate Euclidean distance between two face descriptors
 */
function calculateEuclideanDistance(
  descriptor1: number[],
  descriptor2: number[]
): number {
  if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2)) {
    return Infinity;
  }

  if (descriptor1.length !== descriptor2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
  }

  return Math.sqrt(sum);
}
