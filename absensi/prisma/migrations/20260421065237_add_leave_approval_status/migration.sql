-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "LeaveApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "leaveApprovalStatus" "LeaveApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "leaveReviewNote" TEXT,
ADD COLUMN     "leaveReviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "paymentProof" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
