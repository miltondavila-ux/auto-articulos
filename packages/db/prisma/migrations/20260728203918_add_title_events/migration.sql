-- CreateTable
CREATE TABLE "TitleEvent" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TitleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TitleEvent_titleId_createdAt_idx" ON "TitleEvent"("titleId", "createdAt");

-- AddForeignKey
ALTER TABLE "TitleEvent" ADD CONSTRAINT "TitleEvent_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
