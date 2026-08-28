-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN "infoSections" JSONB;

-- AlterTable
ALTER TABLE "HealthReport" ADD COLUMN "patientName" TEXT;
ALTER TABLE "HealthReport" ADD COLUMN "referredDoctorName" TEXT;
ALTER TABLE "HealthReport" ADD COLUMN "referredDoctorSpecialty" TEXT;
ALTER TABLE "HealthReport" ADD COLUMN "comments" TEXT;
