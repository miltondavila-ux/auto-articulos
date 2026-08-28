-- Permiso individual y conexión OAuth2 de Tumblr.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowTumblrPublishing" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "TumblrIntegration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "blogIdentifier" TEXT NOT NULL,
  "blogTitle" TEXT,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TumblrIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TumblrIntegration_userId_key" ON "TumblrIntegration"("userId");
DO $$ BEGIN
  ALTER TABLE "TumblrIntegration" ADD CONSTRAINT "TumblrIntegration_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "ProductUpdate" ("id", "date", "title", "category", "summary", "example", "modulePath", "sourceCommit")
VALUES (
  'tumblr-integration-20260823',
  '2026-08-23T00:00:00.000Z',
  'Integración de Tumblr preparada',
  'nuevas-herramientas',
  'Se agregó la conexión de Tumblr con permiso por usuario, OAuth2, selección de blog y publicación automática de artículos con imagen OG. La conexión queda lista para configurar las credenciales de la aplicación.',
  'En Configuración → Redes Sociales aparecerá Tumblr para ingresar el Consumer Key y Consumer Secret, conectar la cuenta y seleccionar el blog.',
  '/dashboard/configuracion',
  'b04b0e9'
)
ON CONFLICT ("sourceCommit") DO NOTHING;
