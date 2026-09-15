-- AlterTable
ALTER TABLE "User" ADD COLUMN "dashboardLayout" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
