import {Request, Response} from "express";

function getDistanceFromLatLonInM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Distance in meters
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function parseTimeOnDate(date: Date, timeText: string) {
  const [hourText, minuteText] = timeText.split(":").map(value => value.trim());
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

type WorkLocation = {
  latitude: number;
  longitude: number;
  radius: number;
};

function normalizeWorkLocation(
  value: unknown,
  defaultRadius: number,
): WorkLocation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const location = value as {
    latitude?: unknown;
    longitude?: unknown;
    radius?: unknown;
  };

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const radiusValue =
    location.radius === undefined || location.radius === null
      ? defaultRadius
      : Number(location.radius);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const radius =
    Number.isFinite(radiusValue) && radiusValue > 0
      ? radiusValue
      : defaultRadius;

  return {
    latitude,
    longitude,
    radius,
  };
}

function getAllowedWorkLocations(user: any, config: any): WorkLocation[] {
  const hasCompanyLocation =
    config?.officeLatitude !== null &&
    config?.officeLatitude !== undefined &&
    config?.officeLongitude !== null &&
    config?.officeLongitude !== undefined;

  if (!hasCompanyLocation) {
    return [];
  }

  const defaultRadius = config?.allowedRadiusMeters ?? 50;

  const companyLocation = normalizeWorkLocation(
    {
      latitude: config.officeLatitude,
      longitude: config.officeLongitude,
      radius: config.allowedRadiusMeters,
    },
    defaultRadius,
  );

  return companyLocation ? [companyLocation] : [];
}

function isWithinAnyAllowedLocation(
  latitude: number,
  longitude: number,
  locations: WorkLocation[],
) {
  let nearest: {distance: number; radius: number} | null = null;

  for (const location of locations) {
    const distance = getDistanceFromLatLonInM(
      latitude,
      longitude,
      location.latitude,
      location.longitude,
    );

    if (distance <= location.radius) {
      return {allowed: true, nearest: {distance, radius: location.radius}};
    }

    if (!nearest || distance < nearest.distance) {
      nearest = {distance, radius: location.radius};
    }
  }

  return {allowed: false, nearest};
}

/**
 * Clock In
 */
export const clockIn = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const {status, latitude, longitude, faceVerified} = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    // Check if user has face registered
    const user = await prisma.user.findUnique({
      where: {id: userId},
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      user.faceRegistered &&
      faceVerified !== "true" &&
      faceVerified !== true
    ) {
      return res.status(400).json({
        success: false,
        message: "Face verification required for clock in",
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
        message: "Attendance already recorded for today",
      });
    }

    // Get company config for late threshold and location rules
    const config = await prisma.companyConfig.findFirst();

    const allowedLocations = getAllowedWorkLocations(user, config);

    // Validasi radius lokasi jika referensi lokasi ditemukan
    if (allowedLocations.length > 0) {
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message:
            "Akses ditolak: Sistem memerlukan lokasi (GPS) untuk memvalidasi absensi Anda.",
        });
      }

      const currentLatitude = parseFloat(latitude);
      const currentLongitude = parseFloat(longitude);

      if (Number.isNaN(currentLatitude) || Number.isNaN(currentLongitude)) {
        return res.status(400).json({
          success: false,
          message: "Akses ditolak: Koordinat lokasi tidak valid.",
        });
      }

      const validation = isWithinAnyAllowedLocation(
        currentLatitude,
        currentLongitude,
        allowedLocations,
      );

      if (!validation.allowed) {
        const nearestDistance = validation.nearest?.distance ?? 0;
        const nearestRadius =
          validation.nearest?.radius ?? allowedLocations[0].radius;
        return res.status(400).json({
          success: false,
          message: `Absen ditolak: Anda berada di luar semua radius lokasi kerja. Jarak terdekat ${Math.round(nearestDistance)} meter, batas maksimal ${nearestRadius} meter.`,
        });
      }
    }

    const workStartTime = user.startWorkTime || "09:00";
    const isFLEX = workStartTime.toUpperCase() === "FLEX";
    const lateThreshold = config?.lateThresholdMinutes || 15;

    // Determine status - check if late
    const now = new Date();

    let attendanceStatus = status || "PRESENT";
    if (attendanceStatus === "PRESENT" && !isFLEX) {
      try {
        const shiftTimes = workStartTime
          .split(",")
          .map(s => s.trim())
          .filter(s => s);
        if (shiftTimes.length === 0) shiftTimes.push("09:00");

        // Cek apakah absen masuk pada window salah satu shift
        let foundOnTimeShift = false;
        for (const st of shiftTimes) {
          const parts = st.split(":");
          if (parts.length === 2) {
            const sh = parseInt(parts[0], 10);
            const sm = parseInt(parts[1], 10);
            if (!isNaN(sh) && !isNaN(sm)) {
              const shiftDate = new Date(today);
              shiftDate.setHours(sh, sm, 0, 0);
              const shiftStart = new Date(shiftDate);
              const shiftEnd = new Date(shiftDate);
              shiftEnd.setMinutes(shiftEnd.getMinutes() + lateThreshold);
              if (now >= shiftStart && now <= shiftEnd) {
                foundOnTimeShift = true;
                break;
              }
            }
          }
        }
        if (!foundOnTimeShift) {
          // Jika tidak ada shift yang cocok, cek apakah sudah lewat semua shift + lateThreshold
          let allShiftEnd = shiftTimes
            .map(st => {
              const parts = st.split(":");
              if (parts.length === 2) {
                const sh = parseInt(parts[0], 10);
                const sm = parseInt(parts[1], 10);
                if (!isNaN(sh) && !isNaN(sm)) {
                  const shiftDate = new Date(today);
                  shiftDate.setHours(sh, sm, 0, 0);
                  shiftDate.setMinutes(shiftDate.getMinutes() + lateThreshold);
                  return shiftDate;
                }
              }
              return null;
            })
            .filter(Boolean);
          const lastShiftEnd =
            allShiftEnd.length > 0 ? allShiftEnd[allShiftEnd.length - 1] : null;
          if (lastShiftEnd && now > lastShiftEnd) {
            attendanceStatus = "LATE";
          }
        }
      } catch (err) {
        console.error("Shift logic error:", err);
        attendanceStatus = "LATE";
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
      message: "Clock in successful",
      data: attendance,
      isLate: attendanceStatus === "LATE",
    });
  } catch (error) {
    console.error("Clock in error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Request Leave/Sick (Izin/Sakit)
 */
export const requestLeave = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const {status, date, description} = req.body;
    const photo = req.file ? req.file.filename : null;

    if (!["SICK", "LEAVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status harus SICK atau LEAVE",
      });
    }

    if (!photo) {
      return res.status(400).json({
        success: false,
        message: "Dokumen / Foto Surat wajib dilampirkan",
      });
    }

    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date);
    }
    targetDate.setHours(0, 0, 0, 0);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: targetDate,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Kehadiran/Izin sudah tercatat untuk tanggal tersebut",
      });
    }

    // Save description in clockOutPhoto (Repurpose for Zero-Migration storage strategy)
    // Trim to 255 chars to prevent database text-overflow
    const safeDesc = description ? description.substring(0, 250) : null;

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: targetDate,
        status: status,
        leaveApprovalStatus: "PENDING",
        clockInPhoto: photo, // Repurpose for Document URL
        clockOutPhoto: safeDesc, // Repurpose for Keterangan Text
      },
    });

    res.status(201).json({
      success: true,
      message: "Pengajuan Izin berhasil dicatat",
      data: attendance,
    });
  } catch (error) {
    console.error("Request leave error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Admin: Get leave requests
 */
export const getLeaveRequests = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const {status = "PENDING"} = req.query;

    const where: any = {
      status: {
        in: ["SICK", "LEAVE"],
      },
    };

    const requests = await prisma.attendance.findMany({
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
      },
      orderBy: [{date: "desc"}, {createdAt: "desc"}],
    });

    const filteredRequests =
      status && status !== "ALL"
        ? requests.filter(
            request => String(request.leaveApprovalStatus) === String(status),
          )
        : requests;

    res.json({
      success: true,
      data: filteredRequests,
    });
  } catch (error) {
    console.error("Get leave requests error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Admin: Approve or reject leave request
 */
export const reviewLeaveRequest = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = Number(req.params.id);
    const {action, note} = req.body;

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action harus APPROVED atau REJECTED",
      });
    }

    const request = await prisma.attendance.findUnique({
      where: {id},
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (!["SICK", "LEAVE"].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: "Record ini bukan pengajuan izin/sakit",
      });
    }

    const updated = await prisma.attendance.update({
      where: {id},
      data: {
        leaveApprovalStatus: action,
        leaveReviewNote: note ? String(note).substring(0, 250) : null,
        leaveReviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: `Leave request ${action.toLowerCase()} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error("Review leave request error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * User: Request attendance correction
 */
export const requestAttendanceCorrection = async (
  req: Request,
  res: Response,
) => {
  try {
    const prisma = req.prisma!;
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const {correctionReason, requestedClockIn, requestedClockOut} = req.body;

    if (!correctionReason || (!requestedClockIn && !requestedClockOut)) {
      return res.status(400).json({
        success: false,
        message: "Alasan koreksi dan minimal satu jam koreksi wajib diisi",
      });
    }

    const attendance = await prisma.attendance.findUnique({
      where: {id},
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    if (attendance.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak bisa mengajukan koreksi untuk data orang lain",
      });
    }

    if (attendance.correctionStatus === "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Koreksi sebelumnya masih menunggu persetujuan admin",
      });
    }

    const requestedClockInDate = requestedClockIn
      ? parseTimeOnDate(attendance.date, String(requestedClockIn))
      : null;
    const requestedClockOutDate = requestedClockOut
      ? parseTimeOnDate(attendance.date, String(requestedClockOut))
      : null;

    if (
      (requestedClockIn && !requestedClockInDate) ||
      (requestedClockOut && !requestedClockOutDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Format jam harus HH:MM",
      });
    }

    const updated = await prisma.attendance.update({
      where: {id},
      data: {
        correctionStatus: "PENDING",
        correctionReason: String(correctionReason).substring(0, 250),
        correctionRequestedClockIn: requestedClockInDate,
        correctionRequestedClockOut: requestedClockOutDate,
        correctionRequestedAt: new Date(),
        correctionReviewedAt: null,
        correctionReviewNote: null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Pengajuan koreksi absensi berhasil dikirim",
      data: updated,
    });
  } catch (error) {
    console.error("Request attendance correction error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Admin: Get attendance corrections
 */
export const getAttendanceCorrections = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const {status = "PENDING"} = req.query;

    const where: any = {
      correctionStatus: status === "ALL" ? {not: "NONE"} : status,
    };

    const corrections = await prisma.attendance.findMany({
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
      },
      orderBy: [{correctionRequestedAt: "desc"}, {updatedAt: "desc"}],
    });

    res.json({
      success: true,
      data: corrections,
    });
  } catch (error) {
    console.error("Get attendance corrections error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Admin: Review attendance correction
 */
export const reviewAttendanceCorrection = async (
  req: Request,
  res: Response,
) => {
  try {
    const prisma = req.prisma!;
    const id = Number(req.params.id);
    const {action, note} = req.body;

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action harus APPROVED atau REJECTED",
      });
    }

    const attendance = await prisma.attendance.findUnique({
      where: {id},
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    if (attendance.correctionStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Tidak ada pengajuan koreksi yang menunggu",
      });
    }

    const updated = await prisma.attendance.update({
      where: {id},
      data: {
        correctionStatus: action,
        correctionReviewNote: note ? String(note).substring(0, 250) : null,
        correctionReviewedAt: new Date(),
        ...(action === "APPROVED" && attendance.correctionRequestedClockIn
          ? {clockIn: attendance.correctionRequestedClockIn}
          : {}),
        ...(action === "APPROVED" && attendance.correctionRequestedClockOut
          ? {clockOut: attendance.correctionRequestedClockOut}
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: `Attendance correction ${action.toLowerCase()} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error("Review attendance correction error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
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
    const {faceVerified, latitude, longitude} = req.body;
    const photo = req.file ? req.file.filename : null;

    // Check if user has face registered
    const user = await prisma.user.findUnique({
      where: {id: userId},
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      user.faceRegistered &&
      faceVerified !== "true" &&
      faceVerified !== true
    ) {
      return res.status(400).json({
        success: false,
        message: "Face verification required for clock out",
      });
    }

    // Get config to validate distance for clock out too
    const config = await prisma.companyConfig.findFirst();

    const allowedLocations = getAllowedWorkLocations(user, config);

    if (allowedLocations.length > 0) {
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message:
            "Akses ditolak: Sistem memerlukan lokasi (GPS) untuk memvalidasi absensi pulang Anda.",
        });
      }

      const currentLatitude = parseFloat(latitude);
      const currentLongitude = parseFloat(longitude);

      if (Number.isNaN(currentLatitude) || Number.isNaN(currentLongitude)) {
        return res.status(400).json({
          success: false,
          message: "Akses ditolak: Koordinat lokasi tidak valid.",
        });
      }

      const validation = isWithinAnyAllowedLocation(
        currentLatitude,
        currentLongitude,
        allowedLocations,
      );

      if (!validation.allowed) {
        const nearestDistance = validation.nearest?.distance ?? 0;
        const nearestRadius =
          validation.nearest?.radius ?? allowedLocations[0].radius;
        return res.status(400).json({
          success: false,
          message: `Pulang ditolak: Anda berada di luar semua radius lokasi kerja. Jarak terdekat ${Math.round(nearestDistance)} meter, batas maksimal ${nearestRadius} meter.`,
        });
      }
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
        message: "No active check-in found or already clocked out",
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
        message: "Please end your break before clocking out",
      });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: {id: attendance.id},
      data: {
        clockOut: new Date(),
        clockOutPhoto: photo,
      },
    });

    res.json({
      success: true,
      message: "Clock out successful",
      data: updatedAttendance,
    });
  } catch (error) {
    console.error("Clock out error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
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
    const {page = 1, limit = 20} = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [history, total] = await Promise.all([
      prisma.attendance.findMany({
        where: {userId},
        orderBy: {date: "desc"},
        include: {breaks: true},
        skip,
        take: Number(limit),
      }),
      prisma.attendance.count({where: {userId}}),
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
    console.error("Get history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
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
      include: {breaks: true},
    });

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error("Get today attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
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
    const {month, year} = req.query;

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
      include: {breaks: true},
    });

    const stats = {
      totalDays: attendances.length,
      present: attendances.filter(a => a.status === "PRESENT").length,
      late: attendances.filter(a => a.status === "LATE").length,
      absent: attendances.filter(a => a.status === "ABSENT").length,
      sick: attendances.filter(a => a.status === "SICK").length,
      leave: attendances.filter(a => a.status === "LEAVE").length,
      totalBreakMinutes: attendances.reduce(
        (sum, a) => sum + a.totalBreakMinutes,
        0,
      ),
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
    console.error("Get statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
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
      where: {date: today},
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
      orderBy: {clockIn: "asc"},
    });

    res.json({
      success: true,
      data: attendances,
    });
  } catch (error) {
    console.error("Get all today attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Admin: Get attendance report
 */
export const getAttendanceReport = async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const {startDate, endDate, userId} = req.query;

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
      orderBy: [{date: "desc"}, {clockIn: "asc"}],
    });

    res.json({
      success: true,
      data: attendances,
    });
  } catch (error) {
    console.error("Get attendance report error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
