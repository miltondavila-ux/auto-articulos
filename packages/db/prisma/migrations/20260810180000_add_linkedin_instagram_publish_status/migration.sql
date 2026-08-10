-- El schema.prisma ya tenia estas columnas (LinkedIn e Instagram publish
-- tracking) pero la migracion nunca se aplico a produccion, causando que
-- CADA corrida del worker fallara con P2022 "column does not exist" al
-- intentar leer Title.linkedinPublishStatus en negocio de Business Profile
-- (apps/worker/src/businessProfilePublish.ts). Esto bloqueaba TODOS los
-- runs de TODOS los usuarios, no solo uno especifico (10/8/2026).
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "linkedinPublishStatus" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "linkedinPostId" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "linkedinPublishError" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "linkedinPublishAt" TIMESTAMP(3);
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "instagramPublishStatus" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "instagramPostId" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "instagramPublishError" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "instagramPublishAt" TIMESTAMP(3);
-- threadsPublishStatus / twitterPublishStatus tambien existen en el schema
-- y no tienen migracion propia en el historial (se aplicaron antes por
-- fuera de este flujo) -- se incluyen aqui con IF NOT EXISTS por seguridad,
-- sin efecto si ya existen.
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "threadsPublishStatus" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "threadsPostId" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "threadsPublishError" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "threadsPublishAt" TIMESTAMP(3);
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "twitterPublishStatus" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "twitterPostId" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "twitterPublishError" TEXT;
ALTER TABLE "Title" ADD COLUMN IF NOT EXISTS "twitterPublishAt" TIMESTAMP(3);
