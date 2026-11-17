-- One row per user per active day, for investor metrics. Additive only.
CREATE TABLE "UserActivityDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserActivityDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserActivityDay_userId_day_key" ON "UserActivityDay"("userId", "day");
CREATE INDEX "UserActivityDay_day_idx" ON "UserActivityDay"("day");

ALTER TABLE "UserActivityDay" ADD CONSTRAINT "UserActivityDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
