ALTER TABLE "CategorySyncJob"
  ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'sync',
  ADD COLUMN IF NOT EXISTS "detectedPanels" TEXT[] NOT NULL DEFAULT '{}';

-- Compatibilidad con cuentas históricas (creadas antes de este proyecto,
-- 28-29/8/2026): si ya tenían categorías, una integración de búsqueda o
-- credenciales guardadas de 10minutesWebsite, su "primera conexión" ya
-- pasó hace tiempo. Se marcan como confirmadas sin asignarles un dominio
-- (queda NULL), para que ningún flujo nuevo las bloquee pidiéndoles elegir
-- un sitio, y para que las consultas que ya filtran por
-- "selectedSiteDomain ? {...} : {}" sigan comportándose exactamente igual
-- que antes (sin filtro), en vez de arriesgar mezclar o desconectar datos
-- reales de un cliente por adivinar un dominio.
UPDATE "User" u
SET "siteSelectionConfirmed" = true
WHERE u."siteSelectionConfirmed" = false
  AND (
    EXISTS (SELECT 1 FROM "Category" c WHERE c."userId" = u.id)
    OR EXISTS (SELECT 1 FROM "SearchIntegration" si WHERE si."userId" = u.id)
    OR EXISTS (
      SELECT 1 FROM "Credential" cr
      WHERE cr."userId" = u.id AND cr.platform = '10minutesWebsite'
    )
  );
