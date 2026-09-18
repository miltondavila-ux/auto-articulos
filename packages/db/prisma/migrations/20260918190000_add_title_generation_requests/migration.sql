-- CREACION DE PUBLICACIONES PROPIAS: registro de solicitudes de títulos con la IA
-- del sistema. Solo agrega una tabla nueva; no altera ni borra nada existente.
CREATE TABLE IF NOT EXISTS "TitleGenerationRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "slot" INTEGER NOT NULL,
  "categoryId" TEXT NOT NULL,
  "categoryName" TEXT NOT NULL,
  "inputs" JSONB,
  "offeredTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TitleGenerationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TitleGenerationRequest_userId_dayKey_slot_key"
  ON "TitleGenerationRequest" ("userId", "dayKey", "slot");

CREATE INDEX IF NOT EXISTS "TitleGenerationRequest_userId_createdAt_idx"
  ON "TitleGenerationRequest" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "TitleGenerationRequest_createdAt_idx"
  ON "TitleGenerationRequest" ("createdAt");

DO $$
BEGIN
  ALTER TABLE "TitleGenerationRequest"
    ADD CONSTRAINT "TitleGenerationRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
