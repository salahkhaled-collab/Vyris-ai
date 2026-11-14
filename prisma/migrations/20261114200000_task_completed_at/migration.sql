-- When a task was marked DONE. Additive: a nullable column, no data changes.
ALTER TABLE "Task" ADD COLUMN "completedAt" TIMESTAMP(3);
