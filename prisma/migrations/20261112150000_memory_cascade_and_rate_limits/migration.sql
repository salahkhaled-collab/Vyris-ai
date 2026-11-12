-- Deleting a user now deletes their saved AI notes (previously RESTRICT, which
-- made account deletion fail for anyone with a note). No rows are changed.
ALTER TABLE "Memory" DROP CONSTRAINT "Memory_userId_fkey";
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New, empty table for abuse limits.
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
