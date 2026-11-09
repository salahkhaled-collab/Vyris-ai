-- CreateTable
CREATE TABLE "ProjectEmail" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT,
    "snippet" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "linkedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEmail_projectId_threadId_key" ON "ProjectEmail"("projectId", "threadId");

-- CreateIndex
CREATE INDEX "ProjectEmail_projectId_receivedAt_idx" ON "ProjectEmail"("projectId", "receivedAt");

-- AddForeignKey
ALTER TABLE "ProjectEmail" ADD CONSTRAINT "ProjectEmail_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEmail" ADD CONSTRAINT "ProjectEmail_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
