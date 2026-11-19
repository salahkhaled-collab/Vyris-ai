-- When each user's morning notification goes out. Additive, nullable.
ALTER TABLE "User" ADD COLUMN "pushHour" INTEGER;
