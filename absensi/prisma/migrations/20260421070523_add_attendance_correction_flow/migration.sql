-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "correctionReason" TEXT,
ADD COLUMN     "correctionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "correctionRequestedClockIn" TIMESTAMP(3),
ADD COLUMN     "correctionRequestedClockOut" TIMESTAMP(3),
ADD COLUMN     "correctionReviewNote" TEXT,
ADD COLUMN     "correctionReviewedAt" TIMESTAMP(3),
ADD COLUMN     "correctionStatus" "CorrectionStatus" NOT NULL DEFAULT 'NONE';
