-- CreateEnum
CREATE TYPE "public"."RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'ERRORED');

-- CreateTable
CREATE TABLE "public"."TestGeneration" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "model" TEXT,
    "testCode" TEXT NOT NULL,
    "pageStructure" JSONB,
    "testData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RequiredField" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "generationId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "placeholder" TEXT,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequiredField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TestRun" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "status" "public"."RunStatus" NOT NULL DEFAULT 'RUNNING',
    "passed" BOOLEAN,
    "testFilePath" TEXT,
    "output" TEXT,
    "errorOutput" TEXT,
    "executionError" BOOLEAN DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "artifacts" JSONB,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestGeneration_storyId_idx" ON "public"."TestGeneration"("storyId");

-- CreateIndex
CREATE INDEX "RequiredField_storyId_idx" ON "public"."RequiredField"("storyId");

-- CreateIndex
CREATE INDEX "RequiredField_generationId_idx" ON "public"."RequiredField"("generationId");

-- CreateIndex
CREATE UNIQUE INDEX "RequiredField_storyId_key_key" ON "public"."RequiredField"("storyId", "key");

-- CreateIndex
CREATE INDEX "TestRun_generationId_idx" ON "public"."TestRun"("generationId");

-- AddForeignKey
ALTER TABLE "public"."TestGeneration" ADD CONSTRAINT "TestGeneration_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "public"."UserStory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequiredField" ADD CONSTRAINT "RequiredField_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "public"."UserStory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequiredField" ADD CONSTRAINT "RequiredField_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "public"."TestGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TestRun" ADD CONSTRAINT "TestRun_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "public"."TestGeneration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
