-- Guarda la URL exacta de la imagen OG usada como referencia visual.
ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "ogImageUrl" TEXT;
