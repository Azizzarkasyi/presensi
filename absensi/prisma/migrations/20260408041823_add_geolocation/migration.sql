-- AlterTable
ALTER TABLE "CompanyConfig" ADD COLUMN     "allowedRadiusMeters" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "officeLatitude" DOUBLE PRECISION,
ADD COLUMN     "officeLongitude" DOUBLE PRECISION;
