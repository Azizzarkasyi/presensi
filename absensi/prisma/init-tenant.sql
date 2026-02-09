-- SQL Template untuk membuat schema tenant baru
-- Ganti 'tenant_X' dengan nama schema yang diinginkan

-- 1. Buat schema
CREATE SCHEMA IF NOT EXISTS tenant_X;

-- 2. Buat enum types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'tenant_X')) THEN
        CREATE TYPE tenant_X."Role" AS ENUM ('ADMIN', 'LEADER', 'USER');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalaryType' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'tenant_X')) THEN
        CREATE TYPE tenant_X."SalaryType" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'tenant_X')) THEN
        CREATE TYPE tenant_X."AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'SICK', 'LEAVE', 'ALPHA');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'tenant_X')) THEN
        CREATE TYPE tenant_X."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');
    END IF;
END$$;

-- 3. Buat tabel CompanyConfig
CREATE TABLE IF NOT EXISTS tenant_X."CompanyConfig" (
    "id" SERIAL PRIMARY KEY,
    "companyName" VARCHAR(255) NOT NULL DEFAULT 'My Company',
    "maxBreakMinutesPerDay" INTEGER NOT NULL DEFAULT 60,
    "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 15,
    "overtimeRateMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "workStartTime" VARCHAR(10) NOT NULL DEFAULT '09:00',
    "workEndTime" VARCHAR(10) NOT NULL DEFAULT '17:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Buat tabel User
CREATE TABLE IF NOT EXISTS tenant_X."User" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" tenant_X."Role" NOT NULL DEFAULT 'USER',
    "photo" VARCHAR(255),
    "faceDescriptor" TEXT,
    "faceRegistered" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salaryType" tenant_X."SalaryType" NOT NULL DEFAULT 'MONTHLY',
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startWorkTime" VARCHAR(10) NOT NULL DEFAULT '09:00',
    "latePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- 5. Buat tabel Attendance
CREATE TABLE IF NOT EXISTS tenant_X."Attendance" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES tenant_X."User"("id"),
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "clockInPhoto" VARCHAR(255),
    "clockOutPhoto" VARCHAR(255),
    "status" tenant_X."AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "totalBreakMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "date")
);

-- 6. Buat tabel Break
CREATE TABLE IF NOT EXISTS tenant_X."Break" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES tenant_X."User"("id"),
    "attendanceId" INTEGER REFERENCES tenant_X."Attendance"("id"),
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "startPhoto" VARCHAR(255),
    "endPhoto" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Buat tabel Task
CREATE TABLE IF NOT EXISTS tenant_X."Task" (
    "id" SERIAL PRIMARY KEY,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "assigneeId" INTEGER NOT NULL REFERENCES tenant_X."User"("id"),
    "creatorId" INTEGER NOT NULL REFERENCES tenant_X."User"("id"),
    "status" tenant_X."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Buat tabel Payroll
CREATE TABLE IF NOT EXISTS tenant_X."Payroll" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES tenant_X."User"("id"),
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "workingDays" INTEGER NOT NULL DEFAULT 0,
    "workingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "breakDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Insert default CompanyConfig
INSERT INTO tenant_X."CompanyConfig" ("companyName") 
VALUES ('My Company')
ON CONFLICT DO NOTHING;
