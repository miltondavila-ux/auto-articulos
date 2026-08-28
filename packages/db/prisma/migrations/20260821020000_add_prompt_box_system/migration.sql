-- CreateTable
CREATE TABLE "PromptBox" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "executionOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inputSchema" TEXT,
    "outputSchema" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptBoxExecution" (
    "id" TEXT NOT NULL,
    "promptBoxId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "model" TEXT,
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptBoxExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeGenerationHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptualModel" TEXT,
    "composition" TEXT,
    "headlineText" TEXT,
    "textPosition" TEXT,
    "logoPosition" TEXT,
    "publicationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreativeGenerationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromptBox_slug_key" ON "PromptBox"("slug");

-- CreateIndex
CREATE INDEX "PromptBox_executionOrder_idx" ON "PromptBox"("executionOrder");

-- CreateIndex
CREATE INDEX "PromptBoxExecution_promptBoxId_createdAt_idx" ON "PromptBoxExecution"("promptBoxId", "createdAt");

-- CreateIndex
CREATE INDEX "CreativeGenerationHistory_userId_createdAt_idx" ON "CreativeGenerationHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PromptBoxExecution" ADD CONSTRAINT "PromptBoxExecution_promptBoxId_fkey" FOREIGN KEY ("promptBoxId") REFERENCES "PromptBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeGenerationHistory" ADD CONSTRAINT "CreativeGenerationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
