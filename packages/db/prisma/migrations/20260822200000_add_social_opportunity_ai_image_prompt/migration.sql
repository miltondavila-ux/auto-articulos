-- El campo "imageUrl" ya existe en la tabla real desde la migración
-- 20260811000000, pero nunca se declaró en schema.prisma (Prisma Client no
-- podía leerla/escribirla). Se agrega acá de forma idempotente por si algún
-- entorno no la tiene. "aiImagePrompt" es una columna nueva.
ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "aiImagePrompt" TEXT;
