-- Two new optional columns. Additive only: existing rows get NULL.
ALTER TABLE "User" ADD COLUMN "timeZone" TEXT;
ALTER TABLE "AiMessage" ADD COLUMN "actions" JSONB;
