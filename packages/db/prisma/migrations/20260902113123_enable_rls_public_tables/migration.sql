-- Aviso de seguridad de Supabase: "rls_disabled_in_public" (crítico).
-- Estas 26 tablas del esquema `public` estaban expuestas por completo a la
-- API REST automática de Supabase (PostgREST): cualquiera con la URL del
-- proyecto podía leer, editar y borrar sus datos usando la anon key, sin
-- pasar por el backend de la aplicación.
--
-- La aplicación accede a la base exclusivamente vía Prisma, con el rol
-- `postgres` (bypassa RLS por definición en Supabase). Activar RLS sin
-- políticas no cambia el comportamiento de la app: solo bloquea por defecto
-- a los roles `anon` y `authenticated` que usa PostgREST, que es exactamente
-- lo que había quedado expuesto.
--
-- No se agregan políticas porque no hay ningún acceso legítimo vía
-- PostgREST/anon key en este proyecto (confirmado: no hay uso de
-- supabase-js/anon key en el código de apps/ ni packages/).

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BlueskyIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BusinessProfileIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BusinessProfilePost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CategorySyncJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Credential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DevToIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Language" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LanguageSyncJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MastodonIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OAuthAccessToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OAuthAuthorizationCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OAuthRefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OpportunityCluster" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OpportunityGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OpportunityTitle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PinterestIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProductUpdate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Run" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SearchIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SocialOpportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Title" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TitleEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TrialDomainRegistry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
