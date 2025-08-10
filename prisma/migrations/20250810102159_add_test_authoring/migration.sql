-- CreateEnum
CREATE TYPE "public"."SuiteStatus" AS ENUM ('DRAFT', 'APPROVED', 'CHANGED');

-- CreateEnum
CREATE TYPE "public"."CaseStatus" AS ENUM ('DRAFT', 'APPROVED', 'CHANGED');

-- CreateTable
CREATE TABLE "public"."TestSuite" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userStoryIds" TEXT[],
    "title" TEXT NOT NULL,
    "status" "public"."SuiteStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TestCase" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "specText" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "priority" TEXT,
    "status" "public"."CaseStatus" NOT NULL DEFAULT 'DRAFT',
    "trace" JSONB,
    "testDataId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Run" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "env" TEXT NOT NULL,
    "matrix" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "reportUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."TestCase" ADD CONSTRAINT "TestCase_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "public"."TestSuite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."TestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Run" ADD CONSTRAINT "Run_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "public"."TestSuite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
