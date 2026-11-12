-- New, empty table for daily workspace numbers ("unusual changes").
-- Additive only: no existing table or row is changed.
CREATE TABLE "WorkspaceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "openTasks" INTEGER NOT NULL,
    "overdue" INTEGER NOT NULL,
    "blocked" INTEGER NOT NULL,
    "doneLast7" INTEGER NOT NULL,
    "createdLast7" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceSnapshot_userId_day_key" ON "WorkspaceSnapshot"("userId", "day");

ALTER TABLE "WorkspaceSnapshot" ADD CONSTRAINT "WorkspaceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
