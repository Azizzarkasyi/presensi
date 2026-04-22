// ============================================
// Shared TypeScript Types for Presensi App
// ============================================

// --- Enums ---
export type Role = "ADMIN" | "LEADER" | "USER";
export type SalaryType = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
export type AttendanceStatus =
  | "PRESENT"
  | "LATE"
  | "ABSENT"
  | "SICK"
  | "LEAVE"
  | "ALPHA";
export type LeaveApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type CorrectionStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";
export type PaymentStatus = "PENDING" | "PAID";

// --- Models ---
export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  photo?: string | null;
  faceRegistered?: boolean;
  isActive?: boolean;
  salaryType?: SalaryType;
  salary?: number;
  startWorkTime?: string;
  endWorkTime?: string;
  latePenalty?: number;
  workLatitude?: number | null;
  workLongitude?: number | null;
  workRadius?: number | null;
  workLocations?: WorkLocation[] | null;
  createdAt?: string;
}

export interface WorkLocation {
  latitude: number;
  longitude: number;
  radius: number;
}

export interface Tenant {
  id: number;
  name: string;
}

export interface Attendance {
  id: number;
  userId: number;
  user?: Pick<User, "id" | "name" | "email" | "role">;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  clockInPhoto?: string | null;
  clockOutPhoto?: string | null;
  status: AttendanceStatus;
  leaveApprovalStatus: LeaveApprovalStatus;
  leaveReviewNote?: string | null;
  leaveDescription?: string | null;
  correctionStatus: CorrectionStatus;
  correctionReason?: string | null;
  correctionRequestedClockIn?: string | null;
  correctionRequestedClockOut?: string | null;
  correctionReviewNote?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  totalBreakMinutes: number;
  breaks?: Break[];
  createdAt: string;
}

export interface Break {
  id: number;
  userId: number;
  attendanceId?: number | null;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  startPhoto?: string | null;
  endPhoto?: string | null;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  assigneeId: number;
  assignee?: Pick<User, "id" | "name" | "email">;
  creatorId: number;
  creator?: Pick<User, "id" | "name" | "email">;
  status: TaskStatus;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payroll {
  id: number;
  userId: number;
  user?: Pick<User, "id" | "name" | "email">;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  workingDays: number;
  workingHours: number;
  overtimeHours: number;
  lateDeductions: number;
  breakDeductions: number;
  overtimeBonus: number;
  deductions: number;
  netSalary: number;
  paymentStatus: PaymentStatus;
  paymentProof?: string | null;
  createdAt: string;
}

export interface CompanyConfig {
  id: number;
  companyName: string;
  maxBreakMinutesPerDay: number;
  lateThresholdMinutes: number;
  overtimeRateMultiplier: number;
  officeLatitude?: number | null;
  officeLongitude?: number | null;
  allowedRadiusMeters: number;
}

export interface AttendanceStats {
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  sick: number;
  leave: number;
  totalBreakMinutes: number;
}

// --- API Response ---
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
