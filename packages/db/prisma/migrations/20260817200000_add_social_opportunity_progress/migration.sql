-- Seguimiento durable de publicaciones sociales. IF NOT EXISTS permite aplicar
-- esta migración de forma segura aunque alguna columna ya exista en producción.
ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "progressPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "progressStage" TEXT;
ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "finishedAt" TIMESTAMP(3);
