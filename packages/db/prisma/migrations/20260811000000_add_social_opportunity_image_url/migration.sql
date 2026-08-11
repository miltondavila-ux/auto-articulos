-- La columna SocialOpportunity.imageUrl existe en el schema.prisma (aadida
-- para mostrar la miniatura antes de aprobar y que el worker la reutilice al
-- publicar) pero la migracin nunca se aplic a produccin, causando el error
-- P2022 "column does not exist" al intentar prisma.socialOpportunity.create
-- en /api/social-opportunities/generate (10/8/2026).
ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
