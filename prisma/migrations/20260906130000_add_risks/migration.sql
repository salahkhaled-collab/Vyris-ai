-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATING', 'RESOLVED');

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "RiskSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "teamId" TEXT,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
