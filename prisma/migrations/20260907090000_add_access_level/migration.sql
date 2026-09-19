-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable: existing users backfill as ADMIN, new users default to MEMBER
ALTER TABLE "User" ADD COLUMN "accessLevel" "AccessLevel" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "User" ALTER COLUMN "accessLevel" SET DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN "role" "Role";
ALTER TABLE "Invite" ADD COLUMN "accessLevel" "AccessLevel" NOT NULL DEFAULT 'MEMBER';
