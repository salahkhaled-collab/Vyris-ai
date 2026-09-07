-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accessLevel" "AccessLevel" NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN "role" "Role";
ALTER TABLE "Invite" ADD COLUMN "accessLevel" "AccessLevel" NOT NULL DEFAULT 'MEMBER';
