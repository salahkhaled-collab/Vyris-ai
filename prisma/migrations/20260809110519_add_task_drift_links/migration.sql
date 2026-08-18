-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "objectiveId" TEXT,
ADD COLUMN     "strategicBetId" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_strategicBetId_fkey" FOREIGN KEY ("strategicBetId") REFERENCES "StrategicBet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
