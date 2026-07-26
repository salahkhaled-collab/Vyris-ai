-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK');

-- CreateTable
CREATE TABLE "StrategicBet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "horizon" TEXT NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'ON_TRACK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "teamId" TEXT,

    CONSTRAINT "StrategicBet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StrategicBet" ADD CONSTRAINT "StrategicBet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicBet" ADD CONSTRAINT "StrategicBet_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
