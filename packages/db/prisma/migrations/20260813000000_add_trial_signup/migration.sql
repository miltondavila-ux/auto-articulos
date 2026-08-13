-- Sistema de prueba gratuita (13/8/2026): botón "Solicitar prueba" en Login.
-- trialUnlocked default true para no bloquear a NINGÚN usuario existente
-- (solo los nuevos registros de prueba se crean explícitamente en false).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTrialSignup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialUnlocked" BOOLEAN NOT NULL DEFAULT true;
