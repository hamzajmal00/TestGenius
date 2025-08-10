/*
  Warnings:

  - You are about to drop the column `lastStatus` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Project" DROP COLUMN "lastStatus",
ADD COLUMN     "testStatus" "public"."ProjectStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "userStories" INTEGER NOT NULL DEFAULT 0;
