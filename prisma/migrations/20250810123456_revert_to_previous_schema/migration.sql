/*
  Warnings:

  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Run` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TestCase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TestSuite` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_caseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Run" DROP CONSTRAINT "Run_suiteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TestCase" DROP CONSTRAINT "TestCase_suiteId_fkey";

-- DropTable
DROP TABLE "public"."Comment";

-- DropTable
DROP TABLE "public"."Run";

-- DropTable
DROP TABLE "public"."TestCase";

-- DropTable
DROP TABLE "public"."TestSuite";

-- DropEnum
DROP TYPE "public"."CaseStatus";

-- DropEnum
DROP TYPE "public"."SuiteStatus";
