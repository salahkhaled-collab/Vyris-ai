-- Commitment tracking. Additive only: new enums and a new table.
CREATE TYPE "CommitmentDirection" AS ENUM ('MINE', 'THEIRS');
CREATE TYPE "CommitmentStatus" AS ENUM ('OPEN', 'DONE', 'DROPPED');

CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "counterpart" TEXT,
    "direction" "CommitmentDirection" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "CommitmentStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceRef" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Commitment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Commitment_ownerId_status_idx" ON "Commitment"("ownerId", "status");

ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
