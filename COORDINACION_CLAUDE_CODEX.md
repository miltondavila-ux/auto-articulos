## ELIMINACIÓN POPUP QR DE CRÉDITOS DE IMAGEN (2026-08-31)

Identidad exacta: Claude Sonnet 5 (sesión de Milton en su árbol local).

Motivo: Milton pidió eliminar de raíz el popup "Créditos de imagen
agotados" (QR a WhatsApp) que veía en Oportunidades, sin dañar nada más.

Cambios: se borró `apps/web/src/components/CreditsQrAlert.tsx` (polling a
`/api/runs` cada 8s + modal con QR de wa.link/ohi9ut) y su uso en
`apps/web/src/app/dashboard/layout.tsx`; se quitó la dependencia `qrcode`
(y `@types/qrcode`) de `apps/web/package.json` por quedar sin uso.

No se tocó el mensaje de error real del worker ("Sin créditos de imagen en
10minutesWebsite" en `apps/worker/src/queue.ts`) ni el gate
`hasImageCredits` de `PreValidationGuard`/`ImageCreditsModal` (validación
distinta, por cuenta de usuario, no es la que aparecía en la captura de
Milton).

Conflicto detectado al hacer rebase: otra sesión (Codex/Milton) había
tocado el mismo archivo minutos antes (`93dbb37` le quitaba el emoji ⚠️,
`973e78f` y `6df3455` lo habían creado). Se resolvió manteniendo el
borrado, ya que el pedido explícito de Milton fue eliminar la validación,
no ajustarla.

Capitanía de migración: reclamada y liberada por Claude; sin migraciones
aplicadas.

Estado: DESPLEGADO — commit `ced3fe4` en `origin/main`, deploy de Vercel
(`auto-articulos-web`) confirmado en éxito vía API de GitHub. No se pudo
verificar visualmente en producción por falta de credenciales de la
cuenta de prueba Lorena Álvarez en esta sesión.

## INVENTARIO DE CONVERSACIONES

Identidad exacta:
CODEX - GPT-5 - PROBLEMA CON TUMBLR

Proyecto:
Integración y publicación de Tumblr en Auto Artículos.

Motivo de creación:
Tumblr aparecía desconectado después de activar el permiso de una cuenta y
conectar una cuenta legítima de Tumblr.

Objetivo:
Auditar y corregir la separación entre conexión OAuth y permiso de publicación.

Alcance:
Estado de conexión, permiso por cuenta, interfaz de Tumblr y publicación.

Exclusiones:
No se modificaron otras redes ni se aplicaron migraciones.

Archivos y commits:
`apps/web/src/app/api/search-integrations/tumblr/route.ts`,
`apps/web/src/components/TumblrSection.tsx`; commit funcional `c35b3a8`;
registro y coordinación `e43a071`, `f886542`.

Estado:
Corrección terminada; subida a `origin/main`.

Producción:
Publicada en producción mediante `origin/main`; despliegue automático activado.

Conversaciones relacionadas:
Auditorías e integración Tumblr registradas en este documento; commits `b04b0e9`,
`22e6054`, `1c645ae` y `99da8fd`.

Responsable:
Codex - GPT-5.

Siguiente acción:
Verificar en producción que una cuenta con Tumblr activado permanezca conectada
y pueda publicar.

Decisión de Milton:
La corrección debe desplegarse en producción. Milton no ha declarado esta
conversación CULMINADA, ARCHIVADA, ABANDONADA ni UNIFICADA.

---

> **Actualización — 23/8/2026 (Google Business Profile):** La cuota de `mybusinessaccountmanagement.googleapis.com` estaba configurada en **0 solicitudes/minuto**, por lo que era imposible listar fichas. Milton abrió la solicitud oficial de acceso básico a la API de Perfil de Empresa de Google. **Caso 2-7941000041573**; Google estima revisión de **7 a 10 días hábiles**. Hasta aprobación, no probar carga de fichas. Recordatorio programado para el 30/8/2026: revisar aprobación, probar con Lorena Álvarez y documentar el resultado. El módulo debe continuar integrado exclusivamente a **Oportunidades Redes**, respetando permisos por usuario; no publicar cada artículo automáticamente.

# Coordinación de trabajo: Claude, Codex y AntigravityEste archivo es el tablero operativo compartido para los **tres participantesautorizados: Claude, Codex y Antigravity (Google)**. Evita que modifiquen almismo tiempo los mismos archivos o desplieguen cambiosincompatibles. `HANDOFF.md` conserva el historial completo del proyecto; estearchivo indica quién está trabajando ahora, en qué parte y con qué archivos.## `TO-DO.md` — buzón de ideas de Milton (leer, nunca ejecutar sin pedido)Existe un tercer archivo en la raíz del repo, `TO-DO.md` (agregado 7/8/2026),donde Milton guarda ideas sueltas para pedirlas más adelante. **Ningún agente(Claude, Codex, Antigravity) debe ejecutar, proponer iniciar ni investigar unítem de esa lista por su cuenta** — un ítem escrito ahí es una nota que él sedeja a sí mismo, no una instrucción, ni siquiera si lleva tiempo ahí o parecesimple. Se puede y conviene leerlo para tener contexto de hacia dónde va elproyecto; se actúa sobre un ítem solo cuando Milton lo pide explícitamente enla conversación activa. Al ejecutar algo de ahí, moverlo a la sección "Hecho"de `TO-DO.md` y documentar el cambio real en `HANDOFF.md` como de costumbre.## Regla obligatoria antes de iniciar cualquier tarea (OPTIMIZADA PARA MÍNIMO CONSUMO DE TOKENS)Claude, Codex y Antigravity deben hacer lo siguiente **antes de leer o modificar código**:1. Leer únicamente la sección "Trabajo activo" de este archivo (NUNCA leer el archivo completo).2. Ejecutar `git status --short` y `git log -5 --oneline`.3. Revisar únicamente el estado actual de `HANDOFF.md` si es relevante para la tarea.4. Confirmar que ningún otro agente tenga reservados los archivos o el área.5. Registrar su tarea en "Trabajo activo" antes de editar.6. Si existe una reserva que se cruza con la tarea, detenerse y coordinar.## ORDEN OBLIGATORIA — nadie daña el trabajo de nadie**Orden directa de Milton (13/8/2026):** ningún agente (Claude, Codex,Antigravity) puede dañar, sobrescribir, perder ni absorber sin darse cuentael trabajo de otro agente ni del usuario. Esto no es una sugerencia, es unaorden.**Incidente real que la motiva:** el mismo 13/8/2026, una sesión hizo commitde un cambio en `COORDINACION_CLAUDE_CODEX.md` mientras OTRA sesión tenía uncambio distinto al mismo archivo ya escrito en disco pero sin commiteartodavía. El commit de la primera sesión absorbió sin querer el cambio de lasegunda. En este caso no se perdió contenido — pero es exactamente el tipode accidente que la próxima vez SÍ puede borrar o corromper trabajo real.**Reglas concretas para que no vuelva a pasar:**- Antes de cualquier `git add`/`git commit`, correr `git status --short` y  `git diff --staged` (o revisar el diff de cada archivo agregado) para  confirmar que lo que se va a commitear es SOLO lo propio, y no un cambio  ajeno que estaba en disco sin commitear.- Nunca usar `git add .` ni `git add -A` — agregar únicamente las rutas  exactas que el propio agente modificó (regla ya existente, reforzada acá
- Nunca usar `git add .` ni `git add -A` — agregar únicamente las rutas  exactas

> **Trabajo activo — 23/8/2026 (Tumblr):** Codex implementó la integración Tumblr sin modificar las redes existentes: permiso por usuario, credenciales globales cifradas, OAuth2 (`basic write offline_access`), callback `/api/search-integrations/tumblr/callback`, selección de blog, oportunidades y publicación de posts con imagen OG. El commit `b04b0e9` quedó separado y enviado a `main`. Pendiente: aplicar la migración en Supabase, desplegar y luego ingresar Consumer Key/Secret desde Configuración → Redes Sociales → Tumblr.

> **Decisión de coordinación — 23/8/2026 (Google Analytics):** La rama `codex/integracion-google-analytics` no debe fusionarse completa: está desfasada respecto a `origin/main` y su diff elimina integraciones y workflows ya desplegados (Tumblr, Pinterest, Bluesky, DEV.to, Mastodon, prompt pipeline y workflows). El responsable debe rebasar una copia aislada sobre el `origin/main` actual, extraer únicamente los archivos necesarios para Google Analytics y su migración, restaurar cualquier archivo existente que no pertenezca al proyecto, ejecutar typecheck/build y revisar el diff exacto antes de solicitar publicación. No borrar ni reemplazar integraciones existentes. La producción queda protegida hasta completar esa separación y auditoría.

## Liberación coordinada de main — 23/8/2026

[CODEX] - REDES SOCIALES
Proyecto: lote de Tumblr, menú/no-cache, enlaces del historial y ajustes de publicación social realizados en este worktree.
Archivos: no hay cambios locales pendientes; el worktree está limpio.
Commit: `b04b0e9` (integración Tumblr) y `25aee57` (documentación de coordinación); los cambios publicados están incorporados en `origin/main`.
Estado: terminado.
¿Publicado en producción?: sí; Tumblr y los ajustes asociados fueron desplegados. La rama actual coincide con `origin/main`.
¿Debe conservarse?: sí, en `origin/main`; no conservar copias locales redundantes.
Acción inmediata: liberar este lote y no realizar cambios, migraciones ni despliegues adicionales desde esta sesión.
Responsable siguiente: responsable del siguiente lote identificado en este documento; cualquier cambio nuevo debe usar su propia rama o worktree.
Capitanía de migración: no.

## Proyecto: wizard de dominio por cuenta — 2026-08-28

Responsable: CODEX - GPT-5.
Worktree aislado: `/private/tmp/wizard-dominio-por-cuenta`.
Rama: `codex/wizard-dominio-por-cuenta`.

Objetivo: permitir que una cuenta de Auto Artículos vinculada a 10minutesWebsite,
Tagcrush, `.net` o `.site` seleccione un único dominio durante la primera
conexión, para no mezclar categorías, publicaciones, oportunidades ni datos de
Search Console, Analytics y Bing.

Avance: se añadieron campos separados para dominio real, panel/idioma y estado
de confirmación; migración idempotente; validación de dominio; wizard; filtro
por dominio en categorías, oportunidades e historial; y sincronización del
worker limitada al panel seleccionado. Los usuarios históricos sin dominio
confirmado mantienen compatibilidad.

Auditorías: Prisma, typecheck Web, build Worker, build Web y diff/check pasaron.
La validación externa de correspondencia dominio-panel aún está pendiente.

Bloqueo actual: `SearchIntegration` conserva una única conexión por usuario y
proveedor (`userId_provider`). Para permitir varias conexiones por dominio hay
que migrar a `userId_provider_siteDomain` y actualizar todas las consultas de
Google Search Console, Google Analytics, Bing, sitemaps, inspección y métricas.

Producción: sin cambios. No hay commit ni despliegue. No se aplicaron
migraciones en Supabase.

### RELEVO A CLAUDE — ESTADO REAL AL 2026-08-29

Responsable siguiente: CLAUDE. CODEX libera la ejecución de este proyecto y no
mantiene capitanía activa. Claude debe retomar el worktree existente sin borrar,
restaurar ni mezclar los cambios allí presentes.

Alcance del relevo: Claude toma COMPLETAMENTE todo el proyecto de cambio de
idioma/doble dominio, no solo el login ni solo el wizard. El alcance incluye la
definición funcional, detección de múltiples sitios durante la primera conexión,
selección del dominio por cuenta, separación de idioma/panel, categorías,
publicación, oportunidades SEO/AEO, oportunidades sociales, Google Analytics,
Google Search Console, Bing Webmaster Tools, sitemaps, inspección, métricas,
worker de sincronización, migración de datos históricos, compatibilidad con
usuarios existentes, pruebas locales, tres auditorías independientes,
documentación, commit, revisión de rama y eventual despliegue únicamente tras
autorización expresa de Milton. No cerrar el proyecto declarando terminado solo
porque el login local funcione.

Solicitud funcional definitiva de Milton: durante la primera conexión del
wizard, si las mismas credenciales de 10minutesWebsite/Tagcrush (`.net` o
`.site`) exponen más de un sitio/panel/idioma, el usuario debe escoger el
dominio con el que trabajará esta cuenta de Auto Artículos. La cuenta debe
sincronizar y operar únicamente con ese sitio. Para el segundo dominio el
cliente creará otra cuenta de Auto Artículos. No se debe mantener el selector
posterior de sitio que había sido planteado inicialmente, ni mezclar todas las
categorías antes de escoger.

Estado Git: trabajo SIN COMMIT y SIN DEPLOY exclusivamente en
`/private/tmp/wizard-dominio-por-cuenta`, rama
`codex/wizard-dominio-por-cuenta`, creada desde `origin/main` en `d2fa802`.
No fusionar ni desplegar hasta terminar la revisión funcional y tres auditorías
independientes. El checkout principal no debe tocarse.

Cambios implementados actualmente:

- Prisma: `User.selectedSiteDomain`, `User.selectedSitePanel`,
  `User.siteSelectionConfirmed`; `Category.siteDomain`;
  `SearchIntegration.siteDomain`; unicidad por
  `(userId, provider, siteDomain)`.
- Migración nueva:
  `packages/db/prisma/migrations/20260828150000_add_selected_site_domain/migration.sql`.
- API nueva `apps/web/src/app/api/site-selection/route.ts` para leer y guardar
  dominio/panel confirmado.
- Wizard: formulario para dominio/panel y bloqueo de la primera sincronización
  hasta confirmar dominio; usuarios históricos con categorías conservan la
  compatibilidad.
- Worker de 10minutesWebsite: acepta `selectedPanel` y limita la descarga de
  categorías a ese panel cuando existe selección.
- Categorías nuevas se etiquetan con `siteDomain`.
- Publicaciones, oportunidades, Search Console, GA4, Bing, sitemaps,
  inspección y estadísticas fueron ajustados para consultar por dominio.
- Login local: `apps/web/src/app/login/page.tsx` usa navegación completa tras
  autenticar y tiene un fallback de formulario nativo. La API de login acepta
  JSON o `formData`. Revisar cuidadosamente este cambio antes de conservarlo;
  fue agregado para diagnosticar pruebas locales y no es el objetivo central.

Archivos modificados por este proyecto:

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260828150000_add_selected_site_domain/migration.sql`
- `apps/web/src/app/api/site-selection/route.ts`
- `apps/web/src/components/OnboardingWizard.tsx`
- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/api/opportunities/route.ts`
- `apps/web/src/app/api/runs/route.ts`
- `apps/web/src/app/api/search-integrations/google/route.ts`
- `apps/web/src/app/api/search-integrations/google/callback/route.ts`
- `apps/web/src/app/api/search-integrations/bing/route.ts`
- `apps/web/src/app/api/search-integrations/bing/callback/route.ts`
- `apps/web/src/app/api/google-analytics/route.ts`
- `apps/web/src/app/api/google-analytics/callback/route.ts`
- `apps/web/src/app/api/sitemap/send/route.ts`
- `apps/web/src/app/api/sitemap/send-bing/route.ts`
- `apps/web/src/app/api/titles/[id]/google-inspection/route.ts`
- `apps/web/src/app/api/configuration-status/route.ts`
- `apps/web/src/app/api/pre-validation/route.ts`
- `apps/web/src/app/api/dashboard-stats/route.ts`
- `apps/web/src/app/api/bing/master-index/route.ts`
- `apps/web/src/app/api/social-opportunities/generate/route.ts`
- `apps/web/src/lib/google-analytics-signals.ts`
- `apps/worker/src/automation/10minutesWebsite.ts`
- `apps/worker/src/categorySync.ts`
- `apps/worker/src/googleIndexing.ts`
- `apps/worker/src/bingIndexing.ts`
- `apps/worker/src/send-daily-sitemaps.ts`
- `COORDINACION_CLAUDE_CODEX.md`

`apps/web/next-env.d.ts` aparece modificado por las compilaciones; auditar si es
un cambio generado y excluirlo de la entrega si no contiene una necesidad
funcional. No usar `git add .` ni `git add -A`.

Entorno local aislado preparado:

- PostgreSQL local: `127.0.0.1:55432`, base `autoarticulos`, usuario
  `autoarticulos`, datos en `/private/tmp/auto-articulos-pgdata`.
- El historial completo de migraciones no pudo ejecutarse en una base vacía por
  un fallo PREEXISTENTE en `20260823150000_add_tumblr_integration` (inserta un
  `ProductUpdate.updatedAt` nulo). Para la prueba local se utilizó
  `prisma db push --accept-data-loss` únicamente contra esta base desechable.
- `.env.local` es local/no versionado. La clave de cifrado debe ser Base64 y
  decodificar a 32 bytes; el primer intento falló por no respetar esto.
- Para probar sesión por HTTP local, ejecutar Next en desarrollo:
  `npm run dev --workspace=apps/web -- --webpack --hostname 127.0.0.1 --port 3100`.
  `next start` usa `NODE_ENV=production`, marca la cookie como Secure y no es
  apropiado para esta prueba HTTP. NO debilitar la cookie de producción.
- Login verificado mediante navegador real en
  `http://127.0.0.1:3100/login`: formulario -> cookie ->
  `http://127.0.0.1:3100/dashboard` funcionó.

Auditorías ya ejecutadas durante el desarrollo: `prisma generate`, validación
del schema, typecheck Web, build Worker, build Web con webpack y `git diff
--check` pasaron en distintas etapas. Después de los cambios más recientes de
login y del cierre funcional se deben repetir desde cero; todavía NO cuentan
como las tres auditorías finales exigidas por Milton.

Riesgos y trabajo pendiente antes de considerar completo:

1. La asociación dominio-panel solo valida formato de dominio; todavía no
   demuestra contra 10minutesWebsite/Tagcrush que el dominio pertenece al panel
   escogido.
2. El wizard todavía no implementa una detección previa completa que muestre
   los sitios reales devueltos por las credenciales antes de sincronizar. El
   panel puede terminar derivado del idioma o escrito manualmente.
3. Las integraciones históricas tienen `siteDomain = ''`. Definir migración o
   asignación segura al confirmar dominio para no hacer parecer desconectados
   Search Console/GA4/Bing existentes.
4. La sincronización filtrada no borra categorías antiguas de otros paneles;
   revisar que ningún endpoint sin filtro pueda volver a mezclarlas.
5. Auditar todas las consultas de `SearchIntegration` y confirmar que no queda
   ninguna dependencia de la antigua unicidad `(userId, provider)`.
6. Revisar el fallback agregado al login y conservar solo lo necesario. No
   cambiar la seguridad de cookies productivas.
7. Ejecutar tres auditorías finales independientes por segmentos: datos y
   migración; wizard/API/compatibilidad; worker/publicación/oportunidades e
   integraciones. Solo después hacer prueba manual completa con credenciales de
   una cuenta que realmente exponga dos dominios.

Estado de producción: intacto. No hay autorización vigente para desplegar este
trabajo. No aplicar migraciones en Supabase, no fusionar a `main`, no publicar
la rama y no tocar Vercel hasta que Milton revise el resultado de las tres
auditorías y autorice expresamente el despliegue.

### CLAUDE — RESOLUCIÓN: UNA SOLA SOLUCIÓN Y CAPITANÍA ASUMIDA, 2026-08-30

Milton confirmó explícitamente: este es **un solo proyecto**, no dos. La
conversación/rama `codex/problemas-usuarios-doble-idioma-final` (worktree
`/private/tmp/problemas-usuarios-doble-idioma`, commits `960e977` y `cb73e5f`,
28/8/2026) fue el intento **anterior** sobre el mismo objetivo, migrado hacia
esta conversación — no es trabajo de un tercero independiente.

Ese intento anterior implementaba `User.activeSitePanel` (migración propia
`20260828120000_add_active_site_panel`) con un selector **posterior**: se
sincronizaban las categorías de TODOS los paneles primero, sin filtrar, y
luego se dejaba elegir cuál mostrar. Es exactamente el diseño que Milton
rechazó de forma explícita en la sección "RELEVO A CLAUDE" de este mismo
documento ("no se debe mantener el selector posterior de sitio... ni mezclar
todas las categorías antes de escoger"). Además su archivo
`apps/web/src/app/api/site-selection/route.ts` colisionaba directamente (misma
ruta, contenido incompatible) con el de esta rama.

**Resolución, con autorización explícita de Milton**: se descarta esa rama por
completo y queda **una sola solución oficial**, la de este worktree
(`codex/wizard-dominio-por-cuenta`): detección real de paneles antes de
sincronizar, confirmación de un único sitio por cuenta, inmutable, sin
selector posterior. Se eliminó el worktree y la rama
`codex/problemas-usuarios-doble-idioma-final` (`git worktree remove` + `git
branch -D`, ambos limpios, sin cambios sin commitear perdidos — verificado
antes de borrar). No queda ningún artefacto suelto de ese intento anterior.

Milton asignó la capitanía de este proyecto a Claude de forma explícita
("ahora tú eres el programador que tomó el mando"). Asumo la responsabilidad
completa de esta única solución hasta su publicación.

**Verificación de compatibilidad con `main` real** (no con la base vieja
`d2fa802` de este worktree, que ya está 60 commits detrás): se construyó un
commit real de todo el trabajo (incluidos los archivos nuevos sin trackear) y
se simuló el merge de 3 vías contra `origin/main` actual con `git
merge-tree`. Resultado: un solo conflicto, de texto, en
`COORDINACION_CLAUDE_CODEX.md` (dos sesiones documentando en el mismo
archivo) — cero conflictos de código. Se materializó ese resultado fusionado
en un worktree aparte y se corrió `prisma generate`, `tsc --noEmit` (web y
worker) y el build completo de ambas apps sobre el código combinado real:
todo pasó limpio. El schema y las migraciones de Prisma no cambiaron en esos
60 commits de `main`, así que no hay riesgo de choque ahí.

Pendiente antes de publicar: resolver a mano el conflicto de texto del
documento de coordinación (trivial) al momento de rebasar/fusionar sobre
`main` actual.

**Segunda rama huérfana encontrada y eliminada**: `codex/problemas-usuarios-doble-idioma-20260828`
(sin worktree activo, 13 commits propios no presentes en `origin/main`).
A diferencia de la anterior, esta NO era un intento paralelo reciente: es una
rama vieja y muy desactualizada respecto a `main` actual — el diff contra
`origin/main` mostraba 184 archivos con más de 12.800 líneas borradas frente a
solo ~10.500 agregadas, incluyendo integraciones que hoy SÍ están en
producción (Tumblr, Bluesky, DevTo, Mastodon, Pinterest, `aiImageGenerator.ts`,
etc.). Fusionarla por error habría sido destructivo. Se confirmó con Milton
antes de borrar (`git branch -D`); no tenía worktree ni cambios sin commitear
que perder.

Estado tras la resolución: una sola rama viva para este objetivo
(`codex/wizard-dominio-por-cuenta`), un solo responsable (Claude, capitanía
asignada explícitamente por Milton), sin ramas ni worktrees huérfanos
relacionados al tema de dominios/paneles/idiomas.

### CLAUDE — TRES AUDITORÍAS Y CORRECCIONES, 2026-08-29

Responsable: Claude. Continúo en el mismo worktree/rama, sin commit, sin
deploy, sin migraciones en Supabase. Revisé críticamente el trabajo de Codex
(no lo di por terminado) y corregí los riesgos #1, #2, #3 y #6 que había
dejado pendientes explícitamente; documento aquí el resultado real de las
tres auditorías exigidas.

**Hallazgo central**: el objetivo de Milton no estaba realmente implementado.
El wizard solo dejaba escribir a mano un "dominio" y un "panel" en texto
libre, sin verificar nada contra la cuenta real (riesgo #1/#2 de Codex). El
worker sí tenía desde antes una función de detección REAL (`listPanelLabels`,
navega al selector de paneles de la cuenta y lee las etiquetas reales), pero
nunca estaba conectada al wizard. Además, el formulario de confirmación de
dominio tenía un bug que lo hacía invisible en el flujo normal: quedaba
anidado dentro del modo "editar credenciales", y justo después de guardarlas
por primera vez `editingCreds` pasaba a `false`, así que el formulario nunca
llegaba a mostrarse.

**Rediseño implementado** (sin texto libre, sin selector posterior):

- Nuevo modo `"detect"` en `CategorySyncJob` (`mode`, `detectedPanels String[]`)
  en vez de una tabla nueva — reutiliza toda la infraestructura de cola/
  recuperación de jobs atascados ya probada.
- `detectSites()` nuevo en `apps/worker/src/automation/10minutesWebsite.ts`:
  inicia sesión de verdad y devuelve los paneles reales (`listPanelLabels`),
  sin tocar categorías.
- `processNextSiteDetection()` en `apps/worker/src/categorySync.ts`, cableado
  en `index.ts` (loop local), `run-once.ts` (worker de producción) y
  `run-test-once.ts` (worker de pruebas dedicado) — llega a los tres puntos
  de entrada reales, no solo al loop de desarrollo.
- `POST/GET /api/site-selection/detect`: encola y consulta la detección (mismo
  patrón que `/api/categories/sync`, con protección de trial y de jobs
  atascados).
- `PATCH /api/site-selection` reescrito: ya NO acepta un dominio de texto
  libre. Exige que `panel` coincida exactamente con uno de los paneles reales
  del último job de detección exitoso (o que sea "" si la cuenta no tiene
  selector de paneles). `selectedSiteDomain` se deriva SIEMPRE del panel real
  confirmado — nunca son dos valores independientes que puedan no coincidir,
  así que el riesgo #1 de Codex ("el dominio no demuestra pertenecer al
  panel") queda resuelto de raíz, no parcheado.
- La confirmación es **inmutable**: una vez `siteSelectionConfirmed`, un
  segundo PATCH devuelve 400 ("ya está confirmado... crea otra cuenta").
  Verificado en vivo (ver pruebas abajo).
- Wizard (`OnboardingWizard.tsx`): el bloque de confirmación de sitio ahora es
  independiente de `editingCreds` — se muestra siempre que hay credenciales
  guardadas y el sitio no está confirmado. 0 o 1 panel real detectado =
  autoconfirmación silenciosa (sin fricción para el caso común); 2+ paneles =
  lista real (radio buttons) con las etiquetas EXACTAS devueltas por el sitio,
  nunca texto libre. `handleSyncCategories` ahora exige `siteSelectionConfirmed`
  siempre (antes solo cuando `categories.length === 0`, un hueco real).
- Migración `20260829120000_add_site_detection`: agrega las columnas y además
  una migración de datos (riesgo #3): marca `siteSelectionConfirmed = true`
  para cualquier usuario que YA tuviera categorías, una integración de
  búsqueda o credenciales de 10minutesWebsite antes de este proyecto, dejando
  su dominio en `NULL` — así ningún flujo nuevo los bloquea ni intenta
  adivinarles un dominio, y las consultas existentes (que ya saltaban el
  filtro cuando `selectedSiteDomain` es falsy) siguen funcionando exactamente
  igual que antes. Probado localmente con un usuario sintético: `UPDATE 1`,
  quedó confirmado con dominio `null`.
- Bug propio encontrado y corregido durante la prueba en vivo: `GET
  /api/categories` y `POST /api/categories/sync` leían/creaban
  `CategorySyncJob` sin filtrar por `mode`, así que un job de detección se
  colaba como si fuera "el último intento de sincronizar categorías"
  (mensaje de error duplicado y confuso en el wizard). Corregido en ambos
  archivos (`mode: "sync"` explícito).
- Riesgo #6 (fallback de login): revisado — ambas ramas (JSON y formulario
  nativo) usan exactamente `secure: process.env.NODE_ENV === "production"`
  para la cookie de sesión; no hay debilitamiento de la cookie productiva. Se
  conserva tal cual.

**Auditoría 1 — Schema, migración, datos históricos y compatibilidad**:
`prisma validate` correcto; `prisma generate` correcto; migración nueva
idempotente (`ADD COLUMN IF NOT EXISTS`); migración de datos de compatibilidad
probada localmente (ver arriba); unicidad `(userId, provider, siteDomain)`
revisada — no se encontró ninguna consulta restante dependiente de la vieja
`(userId, provider)`. Resultado: **aprobada**.

**Auditoría 2 — Wizard, API, detección, validación y experiencia de usuario**:
probada en vivo contra el servidor local (`estee.audit.20260829@example.com`,
Postgres en `127.0.0.1:55432`, `npm run dev --workspace=apps/web -- --webpack
--hostname 127.0.0.1 --port 3100`, worker local drenando la cola real):
login → guardar credenciales → bloque de confirmación de sitio visible de
inmediato → detección real contra 10minutesWebsite.net/.site/tagcrush.net
(falló con credenciales falsas, como se esperaba, con mensaje claro y botón
de reintentar) → simulé en la base un resultado de detección con 2 paneles
reales ("English"/"Español") → el wizard mostró el selector real, confirmé
"Español" → `selectedSiteDomain`/`selectedSitePanel` quedaron en "Español",
`siteSelectionConfirmed=true`, Paso 2 se desbloqueó → confirmé que un segundo
PATCH para cambiar de sitio es rechazado. Resultado: **aprobada** para lo que
se pudo probar sin una cuenta real de dos dominios; la detección real contra
un caso real con 2+ paneles verdaderos queda pendiente de la primera cuenta
real que Milton identifique con ese caso (no se puede fabricar de forma
segura sin tocar una cuenta de cliente).

**Auditoría 3 — Worker, categorías, publicaciones, oportunidades, Search
Console, GA4, Bing y regresiones**: revisadas todas las consultas de
`SearchIntegration` y `Category` en `opportunities`, `runs`,
`social-opportunities/generate`, `dashboard-stats`, `configuration-status`,
`pre-validation`, `google-analytics(+callback)`, `search-integrations/google
(+callback)`, `search-integrations/bing(+callback)`,
`sitemap/send(+send-bing)`, `titles/[id]/google-inspection`,
`bing/master-index`, `google-analytics-signals.ts` y
`send-daily-sitemaps.ts`: todas filtran por `siteDomain` cuando el usuario
tiene uno confirmado, y no filtran (comportamiento histórico) cuando no lo
tiene — patrón consistente, sin huecos encontrados. `categorySync.ts`
reconcilia categorías por panel sin cruzar paneles entre sí (ya existía,
revisado). Resultado: **aprobada**.

**Repetición final tras las correcciones**: `prisma validate`, `tsc --noEmit`
(web y worker), `npm run build --workspace=apps/worker`, `npm run build
--workspace=apps/web -- --webpack` y `git diff --check` — todos correctos.

**Pendiente real, no de código**: falta la prueba con una cuenta real que
exponga 2+ dominios/paneles verdaderos (la simulación en base de datos
demuestra que el mecanismo funciona, pero no reemplaza esa prueba). Cuando
Milton identifique una cuenta así, correrla en este mismo entorno local antes
de autorizar despliegue.

Estado de producción: sigue intacto. Sin commit, sin push, sin migración en
Supabase, sin autorización de despliegue. Servidor de desarrollo y worker
local quedaron corriendo en este entorno aislado para que Milton pueda seguir
probando (`http://127.0.0.1:3100`); deben detenerse antes de cerrar la sesión
si no se van a seguir usando.

## 2026-08-29 — Reparación de corridas sin worker

**CODEX - GPT-5 - EL SISTEMA NO PUBLICA ARTÍCULOS**

Problema observado en producción con Nélida: una ejecución de un solo artículo
quedó en `0/1`, mostrando “El worker está iniciando” durante más de 190
segundos. La auditoría de GitHub Actions confirmó que varios shards terminaron
con `trabajo=false` y el título específico no fue reclamado.

Corrección integrada: se eliminó de `triggerWorkerNow()` el bloqueo global que
evitaba enviar un nuevo `workflow_dispatch` cuando existía cualquier corrida
reciente. El `main` actual ya separaba cada disparo manual por `github.run_id`,
por lo que las reservas atómicas por usuario protegen contra procesamiento
duplicado sin impedir que otro disparo recoja trabajo pendiente. También se
retiraron tres bindings obsoletos de `confirmedImageCredits` que impedían el
typecheck del `main` posterior a la eliminación de la validación previa de
créditos.

Worktree aislado: `/private/tmp/fix-worker-queue-race`.
Rama funcional: `codex/fix-worker-queue-race`.
Commits de preparación: `c9bcd69` y `db0021e`.
PR: `#18`.
Commit fusionado en `main`: `5e2862c24201bb9c4b5ea08d8ce9452ab2248e74`.

Archivos funcionales modificados:
- `apps/web/src/lib/trigger-worker.ts`
- `apps/web/src/app/api/opportunities/execute/route.ts`
- `apps/web/src/app/api/opportunities/execute-all/route.ts`
- `apps/web/src/app/api/runs/route.ts`

### Inventario exacto de auditorías y pruebas ya ejecutadas

Claude no debe repetir estas pruebas salvo que `main` avance después de
`5e2862c` o aparezca una evidencia nueva que contradiga los resultados.

1. **Inspección de la corrida afectada en GitHub Actions.** Se consultó la
   corrida `33259574730` (`#1528`) y sus diez jobs. Ocho shards terminaron en
   `success` indicando `trabajo=false` y “No había trabajo pendiente”. Los dos
   jobs que aún estaban `in_progress` no entregaban logs en ese momento. Se
   descargaron y filtraron los logs completos de los ocho jobs terminados: el
   título “Beneficios de las ayudas para el down payment en Miami para nuevos
   residentes colombianos” no aparecía en ninguno. Resultado: confirmado que
   el trabajo no había sido reclamado; no era todavía un fallo de contenido,
   imagen ni guardado en 10MinutesWebsite.

2. **Auditoría estática del disparador y la cola.** Se revisaron
   `trigger-worker.ts`, `worker.yml`, `run-once.ts`, `queue.ts` y
   `reservation.ts`. Se confirmó que `triggerWorkerNow()` podía devolver
   `alreadyActive` por cualquier workflow reciente y omitir el dispatch. Al
   mismo tiempo, `main` ya contenía grupos independientes por `github.run_id`
   para los dispatches manuales y reservas atómicas por usuario. Resultado:
   eliminar el bloqueo global es compatible con la protección existente y no
   permite dos publicaciones simultáneas en la misma cuenta.

3. **Aislamiento y alcance.** El cambio se desarrolló exclusivamente en
   `/private/tmp/fix-worker-queue-race`. Se ejecutaron `git status --short`,
   `git diff --check`, `git diff --stat` y revisión de nombres de archivos
   antes de cada commit. El diff final frente al `main` real contiene cuatro
   archivos, cero archivos eliminados, cero migraciones y ningún cambio en el
   algoritmo de publicación, Playwright, imágenes, historial o redes.

4. **Actualización contra el `main` real.** El primer borrador partió de
   `d2fa802`, pero antes de fusionar se hizo `git fetch origin main` y se
   detectó que producción había avanzado a `ac5a7ed`. Se rebasó la rama. Los
   conflictos se resolvieron conservando la implementación de concurrencia por
   `github.run_id` ya presente en `main`; por eso `worker.yml` no forma parte
   del diff final. No se desplegó la base anterior ni el commit preliminar
   `3f3c80c`.

5. **Generación de Prisma.** `npm run generate --workspace=packages/db`
   terminó correctamente con Prisma `5.22.0`. El primer intento dentro del
   sandbox había fallado por `EPERM` sobre la caché de Prisma; se repitió con
   el permiso correcto. No fue un fallo del código ni requiere volver a
   investigarse.

6. **Build del worker.** `npm run build --workspace=apps/worker` terminó sin
   errores después de generar Prisma.

7. **Pruebas automatizadas del worker.** `npm test --workspace=apps/worker`
   terminó con `10 tests`, `10 pass`, `0 fail`, `0 skipped`. Cubrió botones de
   WhatsApp/llamada, normalización telefónica, marcadores codificados, descarte
   de CTAs generados, etiquetas huérfanas, distribución de botones, marcadores
   recuperables, eliminación de scripts/JSON-LD y conversión de tablas.

8. **Build web y typecheck.** El build con Turbopack no pudo ejecutarse dentro
   del entorno porque Turbopack intentó abrir un puerto y recibió `EPERM`; no
   era un error del proyecto. Se ejecutó `npx next build --webpack`: compiló,
   completó TypeScript y generó `78/78` rutas. En la primera pasada el
   typecheck detectó tres bindings obsoletos `confirmedImageCredits` dejados
   por el cambio de créditos de `main`; se retiraron sin modificar la forma de
   la petición ni su comportamiento. La segunda pasada terminó correctamente.

9. **Verificación del PR.** PR `#18`, head final
   `db0021e0bfeef2e6762368e4d6e40b81a2132c23`, fusionado por squash. GitHub
   confirmó `merged: true`; commit resultante
   `5e2862c24201bb9c4b5ea08d8ce9452ab2248e74`.

10. **Verificación de despliegue.** El estado combinado del commit mostró
    `Vercel – auto-articulos-web: success`. La comprobación directa
    `GET /login?verify=5e2862c` respondió `HTTP/2 200`, `age: 0`,
    `cache-control: no-store` y servidor `Vercel`. Esto confirma despliegue y
    respuesta del dominio; no sustituye las dos pruebas funcionales reales
    pendientes indicadas abajo.

Producción: Vercel `auto-articulos-web` reportó `success` para el commit
`5e2862c`; `/login?verify=5e2862c` respondió HTTP 200, `age: 0`.

Pruebas reales pendientes, en este orden:
1. Nélida: ejecutar una oportunidad nueva de un solo artículo y confirmar que
   el worker la reclama sin quedar indefinidamente en “iniciando”.
2. Historial: usar `Reintentar` sobre un artículo no publicado y confirmar que
   navega a Publicaciones en Curso, crea el disparo y el worker lo reclama.

No se canceló ni modificó la corrida que estaba activa durante la auditoría.
Responsable siguiente: Codex o Claude debe acompañar ambas pruebas y registrar
el resultado real; no declarar el incidente culminado hasta aprobar las dos.

## ENTREGA FORMAL Y LIBERACIÓN — 2026-08-28

Identidad exacta:
CODEX - GPT-5 - PROBLEMA CON TUMBLR

Proyecto:
Auditoría, corrección y liberación documental de integraciones sociales,
Google Analytics, configuración, oportunidades y migraciones Prisma.

Archivos bajo mi control:
Únicamente la documentación modificada en este lote; ningún archivo de código
queda reservado.

Rama y worktree:
`codex/liberar-inventario-20260828` en
`/private/tmp/auto-articulos-liberar-inventario`.

Commits:
`b23b5b0` y `8e063a2` (documentación); el commit funcional de Tumblr es
`c35b3a8`, integrado en `origin/main`.

Migraciones pendientes:
No se aplicó ninguna. Quedan por confirmar individualmente las migraciones de
Tumblr, Bluesky, inteligencia de oportunidades, retiro de PromptBox y las que
correspondan exclusivamente a Google Analytics.

Pruebas ejecutadas:
`git status`, `git log`, `git worktree list`, revisión de ramas/commits,
auditoría documental y `git diff --check`. No se ejecutaron pruebas externas ni
SQL contra producción.

Estado de producción:
El código de Tumblr está integrado en `origin/main`; los estados de producción
de las demás integraciones quedan documentados como no verificados. No se hizo
ningún despliegue de código en esta entrega.

Confirmación de liberación:
Queda liberado todo control, reserva o capitanía sobre archivos, áreas, ramas y
worktrees compartidos. No quedan cambios locales sin declarar en este worktree.
No se borró, restauró ni sobrescribió código ajeno.

Siguiente acción:
El responsable designado por Milton debe tomar cada proyecto por separado,
revisar su diff desde `origin/main` y reclamar explícitamente cualquier
migración antes de aplicarla.

[CLAUDE] - MEJORAS APPLE HIG EN COMO FUNCIONA/INICIO, SYNC DE CATEGORÍAS (WENDY CHAWA) Y GRÁFICO/PALETA DE TREMOR
Proyecto: en esta sesión (rama `claude/coordination-document-bu3fbo`, publicando siempre directo a `main`): (1) diagnóstico y fix de sincronización de categorías atascada prematuramente (caso Wendy Chawa); (2) reescritura completa e iterativa de `/dashboard/como-funciona` (botón de estado, ejemplo narrativo, explicación de indexar/posicionar/SEO-AEO/Google/Bing/Search Console, negritas, reordenamiento); (3) botón "Comienza aquí" movido de Cómo Funciona a Inicio, e invitación a leer Cómo Funciona agregada al wizard; (4) botón rojo Ferrari en Oportunidades cuando no hay resultados nuevos; (5) backfill del changelog de usuario (`ProductUpdate`) para el hueco 10/8→23/8 y workflow reutilizable para futuras entradas; (6) arreglo del gráfico "Tu ritmo" de Inicio (clases de Tremor purgadas por Tailwind) y realineación de la paleta de Tremor a los colores Apple ya establecidos, tras reportarse que "carnavalizaba" el tema.
Archivos: sin cambios locales pendientes — el worktree está limpio (`git status --short` vacío). Áreas tocadas ya integradas en `origin/main`: `apps/worker/src/categorySync.ts`, `apps/worker/src/cleanup.ts`, `apps/web/src/lib/sync-jobs.ts`, `apps/web/src/app/dashboard/como-funciona/page.tsx`, `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/dashboard/oportunidades/page.tsx`, `apps/web/src/components/OnboardingWizard.tsx`, `apps/web/tailwind.config.js`, además de varios `scripts/*.ts` y `.github/workflows/*.yml` de solo-lectura/backfill (diagnóstico y changelog).
Commit: cadena continua sobre `main` desde `65fd59d` hasta `0afe47c`/`d1890e0` (más de 30 commits pequeños, cada uno documentado en su propia entrada de este mismo tablero con fecha 18-23/8/2026); rama local sincronizada con `origin/main` en `440e87f` (fast-forward, sin conflictos) al momento de escribir esta entrada.
Estado: terminado.
¿Publicado en producción?: sí — cada commit se empujó directo a `main` en el momento (no hay lote pendiente de desplegar); no hubo migraciones de Prisma en ninguno de estos cambios (ni falta aplicar nada en Supabase).
¿Debe conservarse?: sí, ya vive en `origin/main`; no hay copias locales redundantes que conservar.
Acción inmediata: liberar este lote; sin cambios, migraciones ni despliegues adicionales pendientes de esta sesión.
Responsable siguiente: quien tome el próximo lote sobre `main`; si alguien retoma algo de "Cómo Funciona", "Inicio" o el gráfico de Tremor, coordinar aquí antes de tocar los mismos archivos.
Capitanía de migración: no (ningún cambio de esta sesión tocó `schema.prisma` ni requirió migración).

## 2026-08-24 — Codex: visibilidad coherente de redes para Lorena

[Codex] - [COHERENCIA DEL MÓDULO OPORTUNIDADES EN REDES]
Proyecto: hacer que Oportunidades use el mismo permiso efectivo que Configuración.
Archivos: `apps/web/src/app/api/social-opportunities/generate/route.ts`.
Commit: `d777f16` (`fix: align allowed social networks for Lorena`).
Estado: terminado en código; rama aislada publicada para revisión.
¿Publicado en producción?: no; pendiente de integración por el responsable de `main`.
¿Debe conservarse?: sí.
Acción inmediata: revisar e integrar únicamente `d777f16`; no aplicar migraciones.
Responsable siguiente: responsable autorizado de `main`.
Capitanía de migración: no.

## Instrucciones de pestañas para conexiones sociales — 24/8/2026

[CODEX] - REDES SOCIALES
Proyecto: hacer explícito el procedimiento de pestañas antes de configurar cualquier red social.
Archivos: `apps/web/src/components/PasosAntesDeConectar.tsx`, `apps/web/src/components/BrowserTabsConnectionNotice.tsx` y `apps/web/src/app/dashboard/configuracion/page.tsx`.
Estado: terminado en código; se muestra la instrucción de cerrar las demás pestañas, mantener abierta Auto Artículos y autorizar en una pestaña nueva.
¿Publicado en producción?: no.
¿Debe conservarse?: sí.
Acción inmediata: revisar el despliegue de este lote; no cambia la lógica OAuth ni requiere migración.
Responsable siguiente: responsable de `main`.
Capitanía de migración: no.

## Retiro de las 8 cajas de prompts — 24/8/2026

[CODEX] - GENERADOR PRINCIPAL DE IMÁGENES IA
Proyecto: eliminación definitiva del experimento de 8 PromptBox y de su asociación por usuario, porque el generador principal ya funciona correctamente.
Archivos: `apps/worker/src/promptBoxPipeline.ts` eliminado; retirados el panel y endpoints administrativos de PromptBox; `socialPublish.ts` usa directamente `aiImageGenerator.ts`; eliminados los modelos Prisma `PromptBox`, `PromptBoxExecution` y `CreativeGenerationHistory`; eliminado `User.usePromptBoxPipeline`.
Commit: pendiente de commit de este lote.
Estado: terminado en código; migración pendiente de ejecución coordinada.
¿Publicado en producción?: no; requiere desplegar el lote y aplicar la migración `20260824090000_remove_prompt_box_system`.
¿Debe conservarse?: sí, únicamente el generador principal y la migración de retiro; no conservar copias activas del pipeline experimental.
Acción inmediata: revisar diff, confirmar compilación y solicitar publicación; ejecutar la migración solo con capitanía reclamada inmediatamente antes.
Responsable siguiente: responsable de `main` para revisar/integrar el commit y aplicar la migración coordinada.
Capitanía de migración: no; todavía no se ejecuta ninguna migración.

## Retiro de las 8 cajas de prompts — 24/8/2026

[CODEX] - GENERADOR PRINCIPAL DE IMÁGENES IA
Proyecto: eliminación definitiva del experimento de 8 PromptBox y de su asociación por usuario, porque el generador principal ya funciona correctamente.
Archivos: `apps/worker/src/promptBoxPipeline.ts` eliminado; retirados el panel y endpoints administrativos de PromptBox; `socialPublish.ts` usa directamente `aiImageGenerator.ts`; eliminados los modelos Prisma `PromptBox`, `PromptBoxExecution` y `CreativeGenerationHistory`; eliminado `User.usePromptBoxPipeline`.
Commit: `148205b`.
Estado: terminado en código; migración pendiente de ejecución coordinada.
¿Publicado en producción?: no; requiere desplegar el lote y aplicar la migración `20260824090000_remove_prompt_box_system`.
¿Debe conservarse?: sí, únicamente el generador principal y la migración de retiro; no conservar copias activas del pipeline experimental.
Acción inmediata: revisar diff, confirmar compilación y solicitar publicación; ejecutar la migración solo con capitanía reclamada inmediatamente antes.
Responsable siguiente: responsable de `main` para revisar/integrar el commit y aplicar la migración coordinada.
Capitanía de migración: no; todavía no se ejecuta ninguna migración.

## Estado visual pendiente de Google Business Profile — 24/8/2026

[CODEX] - REDES SOCIALES
Proyecto: mostrar el estado de Google Business Profile en Configuración.
Archivos: `apps/web/src/components/BusinessProfileSection.tsx`.
Commit: `e83018f`.
Estado: PENDIENTE; Google aún no aprobó el acceso y el botón de conexión permanece deshabilitado.
¿Publicado en producción?: no.
¿Debe conservarse?: sí.
Acción inmediata: publicar únicamente el indicador `PENDIENTE`; no habilitar OAuth, publicación ni migraciones.
Responsable siguiente: responsable de `main` cuando Google apruebe el acceso.
Capitanía de migración: no.

## Respuesta al protocolo de liberación coordinada — 2026-08-24 (Claude-4)

[CLAUDE-4] - FIX DETECCIÓN DE CRÉDITOS DE IMAGEN AGOTADOS
Proyecto: el worker nunca detectaba el mensaje REAL de 10minutesWebsite cuando se agotan los créditos de generación de imagen (500 de `response_image_chatgpt.php`, `"Se han agotado los créditos de tu imagen..."`); solo comparaba contra un texto de suposición interna sin datos de red, así que el popup "Créditos de imagen agotados" nunca se disparaba pese al error real y repetido reportado por Milton.
Archivos: `apps/worker/src/queue.ts`.
Commit: `b2e61f6` (fix). Documentado también en una entrada de coordinación propia (`e2755c0`) que ya no existe en este archivo — este documento fue reescrito/reducido por otra sesión durante la liberación coordinada; el commit sigue íntegro en el historial de `origin/main`.
Estado: terminado.
¿Publicado en producción?: sí; confirmado con `git merge-base --is-ancestor b2e61f6 origin/main` justo antes de escribir esto.
¿Debe conservarse?: sí, en `origin/main`; no conservar copias locales redundantes.
Acción inmediata: ninguna de mi parte. El árbol local de Milton (checkout principal, no este worktree) todavía muestra `apps/worker/src/queue.ts` y `COORDINACION_CLAUDE_CODEX.md` como modificados sin commitear — son copias mías, previas a descubrir que ese árbol estaba fuertemente divergido de `origin/main`, y su contenido YA está publicado en los commits de arriba. No las voy a descartar por mi cuenta (regla 6: no tocar cambios ajenos sin documentar); quien tenga autoridad sobre el checkout principal puede confirmarlas como redundantes y descartarlas con `git checkout -- apps/worker/src/queue.ts COORDINACION_CLAUDE_CODEX.md`.
Responsable siguiente: responsable de `main`.
Capitanía de migración: no.

**Sobre el resto del árbol local de Milton (checkout principal):** hay decenas de archivos sin commitear (integración Bluesky, Google Analytics, historial de inteligencia de oportunidades, `ComienzaAqui.tsx`, `contactButtons.test.ts`, `diagnose-stefany.js`, `diagnose-svetlana.js`, `docs/`, `AUDITORIA_MASTER_BLUEPRINT_INTELIGENCIA_SEO.md`, dos migraciones nuevas sin aplicar) que **no son míos y no tengo contexto sobre ellos**. No los toco, no los reclamo, no los descarto. Que los declare quien los escribió, siguiendo este mismo protocolo.
## Respuesta a liberación coordinada — Creador de Imágenes para Redes Sociales (Claude, trabajo del 22/8/2026)

[CLAUDE] - CREADOR DE IMÁGENES PARA REDES SOCIALES
Proyecto: generador principal de imágenes con IA (`aiImageGenerator.ts`) — proveedor intercambiable (OpenAI/Ideogram/Nano Banana), prompt de Director Creativo simplificado a una línea de etiquetas + texto exacto, e historial con imagen/prompt visibles en `/dashboard/historial`.
Archivos: `apps/worker/src/aiImageGenerator.ts`, `apps/worker/src/socialPublish.ts`, `apps/web/src/app/dashboard/historial/page.tsx`, `packages/db/prisma/schema.prisma` (columnas `imageUrl`/`aiImagePrompt` en `SocialOpportunity` — migración ya aplicada por Milton en Supabase el 22/8/2026).
Commit: mi último commit fue `3b1db79` (22/8/2026, traspaso a Codex). Todo el trabajo posterior a esa fecha lo hizo Codex, incluido el retiro del pipeline experimental de 8 cajas que dejé documentado como pendiente.
Estado: terminado de mi parte. Codex confirmó en este mismo documento ("Retiro de las 8 cajas de prompts — 24/8/2026") que "el generador principal ya funciona correctamente" — mi trabajo quedó como base estable, sin que yo tenga visibilidad de ajustes posteriores.
¿Publicado en producción?: sí, cada commit se pusheó directo a `main` en su momento.
¿Debe conservarse?: sí, es el generador activo hoy.
Acción inmediata: ninguna de mi parte — árbol de trabajo limpio (confirmado con `git status`), sin cambios locales sin commitear. No voy a tocar el trabajo posterior de Codex (retiro del pipeline, migración `20260824090000_remove_prompt_box_system`) sin que Milton lo pida explícitamente.
Responsable siguiente: Codex, para la migración pendiente ya declarada arriba.
Capitanía de migración: no — no tengo ninguna migración propia pendiente.

## LIBERACIÓN Y ENTREGA SEPARADA DE PENDIENTES — 2026-08-28

Se revisaron las áreas solicitadas. Ninguna se mezcla con otra; las áreas sin
commit o sin worktree identificable quedan expresamente pendientes y liberadas.

### CODEX - GPT-5 - PROBLEMA CON TUMBLR
Proyecto: conexión y publicación Tumblr.
Motivo/objetivo: separar estado OAuth de permiso de publicación.
Alcance/exclusiones: endpoint de estado e interfaz; sin migraciones ni otras redes.
Archivos y commits: rutas Tumblr y `TumblrSection.tsx`; `c35b3a8`, `03aeffe`.
Rama/worktree: `codex/problema-con-tumblr-fix` / `/private/tmp/auto-articulos-tumblr-fix`.
Migraciones: `20260823150000_add_tumblr_integration`, aplicación no verificada.
Pruebas: `git diff --check`; typecheck bloqueado por dependencias ausentes.
Estado/producción: terminado; commit funcional está en `origin/main`; deployment no verificado directamente.
Conversaciones relacionadas: integración Tumblr y correcciones `b04b0e9`, `22e6054`, `1c645ae`, `99da8fd`.
Responsable: Codex. Siguiente acción: prueba real de conexión y publicación. Decisión de Milton: conservar.

### CODEX - GPT-5 - INTEGRACION GOOGLE ANALYTICS
Proyecto: integración GA4.
Motivo/objetivo: extraer únicamente GA4 y rebasarlo sobre `origin/main` actual sin eliminar integraciones.
Alcance/exclusiones: OAuth/listado/señales GA4; excluir cualquier cambio ajeno.
Archivos y commits: rama `codex/integracion-google-analytics`; relacionados `82300bc`, `d7eb1f4`, `4af73b7`; extracción pendiente.
Rama/worktree: rama remota disponible; worktree exclusivo de extracción aún no creado.
Migraciones: las que acompañen exclusivamente GA4, por identificar; no aplicar.
Pruebas: no ejecutar hasta extraer sobre `origin/main` y revisar diff.
Estado/producción: pendiente; no publicar la rama completa.
Conversaciones relacionadas: `codex/ga4-production-clean` y documentación GA4.
Responsable: integrador designado por Milton. Siguiente acción: crear worktree limpio desde `origin/main`, extraer solo GA4. Decisión de Milton: conservar integraciones existentes.

### CODEX - GPT-5 - BLUESKY
Proyecto: conexión y publicación Bluesky.
Motivo/objetivo: mantener integración disponible para oportunidades sociales.
Alcance/exclusiones: código y migración Bluesky; sin cambios de otras redes.
Archivos y commits: `packages/shared/src/bluesky-api.ts`, rutas/componentes Bluesky; `e34fe4f` y cambios posteriores de producción.
Rama/worktree: integrado en `origin/main`; worktree de origen no identificado.
Migraciones: `20260823170000_add_bluesky_integration`, estado de producción no verificado.
Pruebas: no hay prueba de producción registrada.
Estado/producción: código integrado; conexión/publicación real pendiente de verificación.
Conversaciones relacionadas: oportunidades sociales.
Responsable: responsable de redes sociales. Siguiente acción: prueba real y confirmar migración. Decisión de Milton: conservar.

### CODEX - GPT-5 - DEV.TO
Proyecto: conexión y publicación DEV.to.
Motivo/objetivo: preservar publicación por cuenta y cuerpo editorial completo.
Alcance/exclusiones: integración DEV.to; sin reabrir cambios de contenido ajenos.
Archivos y commits: código DEV.to; `2e5d2ba`, `8dcd14b`, `bb1236b`, `f6c6122`, `7c4d4e1`, `679d7c3`, `1086e4f`, `0789fec`.
Rama/worktree: integrado en `origin/main`; origen aislado no identificado.
Migraciones: ninguna nueva identificada.
Pruebas: no hay prueba de publicación real registrada.
Estado/producción: integrado; producción pendiente de verificación funcional.
Conversaciones relacionadas: publicaciones sociales.
Responsable: responsable de redes sociales. Siguiente acción: probar conexión y publicación. Decisión de Milton: conservar.

### CODEX - GPT-5 - MASTODON
Proyecto: conexión y publicación Mastodon.
Motivo/objetivo: conservar URL de instancia y solicitudes de oportunidades.
Alcance/exclusiones: integración Mastodon; sin cambios en OAuth ajeno.
Archivos y commits: código Mastodon; `c6f3ccc`, `a2c42c2`, `7180008`, `0bb709d`.
Rama/worktree: integrado en `origin/main`; origen aislado no identificado.
Migraciones: ninguna identificada.
Pruebas: no hay prueba real registrada.
Estado/producción: integrado; producción pendiente de verificación.
Conversaciones relacionadas: oportunidades sociales.
Responsable: responsable de redes sociales. Siguiente acción: prueba real. Decisión de Milton: conservar.

### CODEX - GPT-5 - PINTEREST
Proyecto: conexión y publicación Pinterest.
Motivo/objetivo: preservar permiso por usuario y selección de tablero.
Alcance/exclusiones: integración Pinterest; sin cambios en Tumblr.
Archivos y commits: código Pinterest; `40f41c7`, `ff06269`, `e3557e2`, `99da8fd`.
Rama/worktree: integrado en `origin/main`; origen aislado no identificado.
Migraciones: ninguna pendiente identificada.
Pruebas: no hay prueba real registrada.
Estado/producción: integrado; producción pendiente de verificación.
Conversaciones relacionadas: redes sociales y configuración.
Responsable: responsable de redes sociales. Siguiente acción: verificar conexión/publicación. Decisión de Milton: conservar.

### CODEX - GPT-5 - CONFIGURACION Y OPORTUNIDADES
Proyecto: páginas de configuración y oportunidades sociales/SEO.
Motivo/objetivo: liberar trabajo pendiente sin absorber cambios ajenos.
Alcance/exclusiones: únicamente auditoría documental; no se modificó código de ramas activas.
Archivos y commits: ramas `codex/configuracion-paginas-independientes-20260828`, `codex/configuracion-paginas-reales`, `codex/arreglo-configuracion-release` y áreas de oportunidades; revisar diffs individualmente.
Rama/worktree: worktrees existentes `/private/tmp/arreglo-configuracion-limpio` y otros registrados por `git worktree list`.
Migraciones: no aplicar ninguna durante esta liberación.
Pruebas: no consolidar ni probar hasta que cada responsable entregue su diff.
Estado/producción: pendientes y liberados; no se declara producción.
Conversaciones relacionadas: doble instrucción, configuración Apple, oportunidades sociales.
Responsable: cada responsable de rama. Siguiente acción: entregar diff y pruebas por separado. Decisión de Milton: no mezclar.

### CODEX - GPT-5 - MIGRACIONES PRISMA
Proyecto: inventario y capitanía de migraciones.
Motivo/objetivo: liberar migraciones pendientes sin aplicarlas unilateralmente.
Alcance/exclusiones: identificar migraciones y estado; no ejecutar SQL.
Archivos y commits: `packages/db/prisma/schema.prisma` y migraciones `20260823150000_add_tumblr_integration`, `20260823170000_add_bluesky_integration`, `20260824010000_add_opportunity_intelligence_history`, `20260824090000_remove_prompt_box_system` y GA4 por confirmar.
Rama/worktree: auditoría documental en `codex/liberar-inventario-20260828` / `/private/tmp/auto-articulos-liberar-inventario`.
Migraciones: ninguna aplicada desde esta entrega; capitanía no reclamada.
Pruebas: revisión de nombres/historial; no conexión ni ejecución contra Supabase.
Estado/producción: pendientes de confirmación individual.
Conversaciones relacionadas: GA4, Tumblr, Bluesky, generador IA y oportunidades.
Responsable: Milton debe designar capitán. Siguiente acción: comparar schema/diffs y confirmar aplicación en producción. Decisión de Milton: no aplicar hasta autorización explícita.

## 2026-08-26 — Auditoría y corrección de PROBLEMA CON TUMBLR

**CODEX - GPT-5 - PROBLEMA CON TUMBLR**

Se confirmó que el endpoint de estado mezclaba conexión y permiso: cuando
`canPublishToNetwork` devolvía falso respondía `connected: false`, aunque
existiera una integración OAuth guardada. Esto presentaba una cuenta conectada
como desconectada.

Se corrigió para devolver por separado `connected`, `allowed` y `forbidden`, y
la interfaz ahora informa que falta activar el permiso. La protección de
publicación permanece activa en los endpoints de conexión, callback, cambios,
eliminación y publicación.

Commit: `c35b3a8`, rama aislada `codex/problema-con-tumblr-fix`.
Estado: corrección confirmada en producción por Milton; no requiere migración.
Pruebas: `git diff --check` correcto. El typecheck completo quedó bloqueado por
dependencias no instaladas en el worktree aislado. Producción queda marcada como
confirmada por el responsable, sin verificación independiente desde esta sesión.

## Documentación de proyecto — Creador de Imágenes para Redes Sociales — 20-22/8/2026 (Claude)

[CLAUDE] - CREADOR DE IMÁGENES PARA REDES SOCIALES
Proyecto: sistema de generación de imágenes con IA para publicaciones de Instagram/Facebook, partiendo de la imagen OG del artículo + logo del usuario. Arco completo de la sesión: (1) construcción y depuración inicial de un pipeline experimental de 8 "Cajas" de prompts encadenados (`promptBoxPipeline.ts`), con varias rondas de auditoría (imágenes pasadas correctamente entre cajas, `CreativeGenerationHistory` para variar el modelo conceptual, extracción robusta de JSON truncado); (2) fix de un bug de producción real en el generador viejo y el nuevo (`baseContext` decía "Instagram" hardcodeado incluso para Facebook Story); (3) fix de cumplimiento de Meta: `is_ai_generated` se mandaba siempre `true` a la API de Instagram sin importar si la imagen era generada por IA o la foto real sin tocar; (4) tras 9/9 pruebas reales fallidas con `gpt-image-1-mini` por corrupción de texto en español, evaluación y adopción de fal.ai/Ideogram V3 como proveedor alternativo; (5) Milton comparó en vivo el resultado del pipeline de 8 cajas contra una prueba manual en ChatGPT Images con un prompt mucho más corto (etiquetas + texto exacto) — el resultado corto fue notablemente mejor, así que **se pausó el pipeline de 8 cajas** (después retirado por completo por Codex) y se simplificó el generador principal (`aiImageGenerator.ts`) al mismo mecanismo: una sola llamada a `gpt-4o-mini` que decide mensaje + etiquetas de un catálogo cerrado, en una línea de salida; (6) arquitectura de proveedor de imagen intercambiable sin tocar el resto del pipeline (`IMAGE_PROVIDER`: `openai` / `fal` / `nano`), agregando fal.ai/Ideogram y luego Nano Banana (Gemini) tras varias fallas reales de Ideogram (sin texto, texto deforme, imagen sin relación con la OG); (7) regla de diseño reforzada por Milton durante la tarde del 22/8: el código nunca debe agregar, traducir ni reescribir instrucciones sobre el prompt del admin — solo transporta datos; todo ajuste de comportamiento vive en el prompt, editable en el panel admin sin redeploy; (8) historial (`/dashboard/historial`) ahora muestra la imagen generada y el prompt exacto usado por publicación, para no depender de leer logs de GitHub Actions.
Archivos: `apps/worker/src/aiImageGenerator.ts` (generador activo — decisión de mensaje/etiquetas, los 3 adaptadores de proveedor, composición de logo), `apps/worker/src/socialPublish.ts` (selección de generador, `is_ai_generated`), `packages/shared/src/instagram-api.ts` (`is_ai_generated` en `publishInstagramImage`/`publishInstagramStory`), `apps/web/src/app/dashboard/historial/page.tsx` y su ruta API (imagen/prompt visibles), `packages/db/prisma/schema.prisma` (columnas `imageUrl`/`aiImagePrompt` en `SocialOpportunity`, migración aplicada por Milton en Supabase el 22/8/2026), `.github/workflows/{worker,social-worker,worker-test}.yml` (`FAL_API_KEY`/`IMAGE_PROVIDER`), variable de repo `IMAGE_PROVIDER` (hoy en `nano`). El pipeline experimental (`promptBoxPipeline.ts` y todo lo asociado) fue construido y luego pausado por mí, y retirado por completo por Codex el 24/8/2026 (ver entrada "Retiro de las 8 cajas de prompts" arriba) — no es parte del estado final.
Commit: cadena de commits propios entre `3519159` y `3b1db79` (~30 commits, cada uno documentado en su propia entrada de este tablero con fecha 20-22/8/2026), más la respuesta al protocolo de liberación (`f0219a2`, fusionada en `0d46113`). Nota: `4805c83`, `7d783b9`, `b2e61f6` y `e2755c0` intercalados en ese rango **no son míos** — son de otra sesión concurrente ("Claude-4") trabajando sobre el mismo `main` compartido.
Estado: terminado de mi parte. Confirmado por Codex ("el generador principal ya funciona correctamente") como base estable tras el retiro del experimento de 8 cajas.
¿Publicado en producción?: sí, cada commit se pusheó directo a `main` en su momento; sin cambios locales pendientes (árbol limpio).
¿Debe conservarse?: sí — es el mecanismo de generación de imágenes con IA activo hoy.
Acción inmediata: ninguna de mi parte. Pendiente real, no mío: probar en vivo el proveedor `nano` (Nano Banana) con el prompt vigente — no llegué a confirmar un resultado bueno antes de que la sesión pasara a manos de Codex.
Responsable siguiente: quien continúe las pruebas de calidad de imagen (Codex o Milton directamente).
Capitanía de migración: no.

## [CLAUDE] - BOTONES OPORTUNIDADES REDES — 31/8/2026

Identidad exacta: CLAUDE - BOTONES OPORTUNIDADES REDES.

Proyecto: pantalla `/dashboard/oportunidades-redes`.

Motivo/objetivo: Milton pidió (1) que solo aparezcan los botones de las
redes realmente configuradas y listas para usarse, ocultando las demás; (2)
tras ver la pantalla, que los botones nunca se vean de ancho desigual — deben
ser uniformes y responsive en todas las pantallas (Apple no mostraría botones
más largos que otros).

Hallazgo sobre el punto (1): ya estaba resuelto e integrado en `origin/main`
desde antes de esta conversación (commit `c07f5ab`, sesión anterior) — no
requirió código nuevo, solo se verificó y se le informó a Milton.

Trabajo nuevo de esta conversación (punto 2): los botones de red usaban
`flex: "1 1 180px"` dentro de un contenedor `flex-wrap`, así que en la
última fila con menos elementos cada botón se estiraba para llenar el
espacio sobrante (Mastodon y DEV.to quedaban el doble de anchos). Se
cambió a `display: grid` con `gridTemplateColumns: repeat(auto-fill,
minmax(160px, 1fr))`, que da columnas de ancho igual sin importar cuántos
botones caigan en la última fila, y se mantiene responsive en móvil.

Archivos: únicamente
`apps/web/src/app/dashboard/oportunidades-redes/page.tsx`.

Commit `6469b33` (`fix: grid de ancho uniforme para botones de redes en
Oportunidades`), rama `claude/fix-oportunidades-redes-buttons-width`
(pusheada, no eliminada). Fusionado a `main` por fast-forward.
`origin/main` quedó en `6469b33`.

Pruebas: `tsc --noEmit` sobre `apps/web` sin errores nuevos (los 2 errores
preexistentes de `CreditsQrAlert.tsx` por falta del paquete `qrcode` son
ajenos a este cambio y no se tocaron).

Estado: DESPLEGADO — pendiente de confirmación visual de Milton en
producción (no se pudo verificar en vivo desde esta sesión por falta de
credenciales de la cuenta de prueba Lorena Álvarez).

Capitanía de migración: reclamada y liberada por Claude durante esta
conversación; sin migraciones aplicadas.

Responsable: Claude. Siguiente acción: Milton confirma visualmente en
`https://auto-articulos-web.vercel.app/dashboard/oportunidades-redes`.
Decisión de Milton: pendiente.

## 2026-08-31 — Cierre: TRANSFERIDO DE CODEX - SISTEMA NO PUBLICA ARTÍCULOS

[CLAUDE] - SISTEMA NO PUBLICA ARTÍCULOS

Proyecto: retomar la conversación transferida de Codex sobre el sistema que
no publicaba artículos, diagnosticar y corregir de raíz, no con parches.

Causa raíz real encontrada (confirmada con `git log -S` y evidencia en vivo,
no supuesta): el commit `a00c636` (28/8, 22:02) agregó `validator.resetForm()`
dentro de `revalidateTitleAndForm()` en `10minutesWebsite.ts` — ese método de
jQuery Validate ejecuta el `reset()` nativo del `<form>`, que borraba
título/resumen/tipo justo antes de guardar. Los tres parches de emergencia
escritos esa misma noche (`b0882b8`, `6823b82`) eran para tapar síntomas de
ese mismo bug, no problemas independientes; se retiraron junto con la causa.

Cambios desplegados en `main` (todos con 3 auditorías y Vercel `success`):
- `144de95`/`6df3455`: detección de "Insufficient credits" en inglés y
  popup con QR de WhatsApp para créditos generales agotados.
- `e6bceb6`: reparado un diagnóstico propio roto por `__name`/esbuild.
- `cbd8b09`: **fix de la causa raíz** — `resetForm()` → `hideErrors()`.
- `9d60269`/`e89ea97`: retirada doble invalidación y el desbloqueo forzado
  del botón (parches de crisis ya innecesarios).
- `99ea137`/`1840734`/`d83507d`/`dbf99a6`/`ea2a0da`: título duplicado ahora
  se detecta ANTES de generar la imagen (ahorra tiempo/créditos), mensaje
  claro con enlaces reales a lo que ya existe, sección propia en Historial
  ("Artículos repetidos que no se publicarán"), aviso visible "Validando…",
  agrupado por fecha (Hoy/Ayer/fecha).
- `4001a83`: el cron de GitHub Actions (`*/5 * * * *`) compartía un solo
  grupo de concurrencia entre corridas programadas — bajo carga alta,
  GitHub llegó a descartar disparos completos (confirmado: ~1h sin ninguna
  corrida mientras 3 lotes reales corrían). Cada corrida ahora tiene su
  propio grupo por `run_id`; las reservas atómicas por usuario
  (`reservation.ts`) ya cubrían la seguridad, verificado en el código.
- `5a0a109`: un run/título cancelado por el usuario no tenía forma de
  reintentarse desde Historial — habilitado.
- `f726422`: script + workflow (`Database Write - Bajar limite diario a 5`)
  para bajar `dailyArticleLimit` a 5 en usuarios no-admin — **PENDIENTE**:
  preparado pero no ejecutado; requiere disparo manual en la pestaña Actions
  (o via `gh workflow run`, ahora que `gh auth login` quedó activo).
- `ec5a70f`/`93dbb37`/`33bef57`: auditoría responsive completa de Historial
  — 8 encabezados sin `flexWrap` que cortaban botones/enlaces en móvil
  (confirmado con capturas reales de Milton), corregidos todos; emoji
  retirado de `CreditsQrAlert` (regla de estilo Apple del usuario).

Verificación en producción: confirmada en vivo por Milton con lotes reales
(individual, categoría de 4, categoría de 9 en Lorena Álvarez) — artículos
publicándose de punta a punta, incluidos casos de título duplicado con
mutación automática y publicación exitosa en el primer intento.

Metodología (dejada explícita en `CONTROLADOR_DE_VERSIONES.md` para que se
repita si el sistema vuelve a fallar): usar `git log -S` para encontrar el
commit exacto que rompió el comportamiento, comparar contra la versión
anterior que funcionaba, diagnosticar con evidencia en vivo — nunca
apilar un parche nuevo sobre un síntoma sin entender la causa.

Archivos modificados: `apps/worker/src/queue.ts`,
`apps/worker/src/automation/10minutesWebsite.ts`,
`apps/web/src/components/CreditsQrAlert.tsx`,
`apps/web/src/app/dashboard/layout.tsx`,
`apps/web/src/app/dashboard/historial/page.tsx`,
`apps/web/src/components/dashboard-ui.tsx`,
`apps/web/src/app/api/titles/[id]/retry/route.ts`,
`apps/web/src/app/api/runs/[id]/retry/route.ts`,
`.github/workflows/worker.yml`,
`.github/workflows/set-daily-limit.yml`,
`apps/worker/src/set-daily-limit.ts`.
Migraciones: ninguna.
Capitanía de migración: reclamada y liberada varias veces durante esta
conversación, siempre coordinando con la sesión paralela que trabajaba
"BOTONES OPORTUNIDADES REDES" en archivos distintos.

Estado: VERIFICADO EN PRODUCCIÓN. Esta conversación se archiva hoy.

Pendiente para quien retome:
1. Disparar manualmente "Database Write - Bajar limite diario a 5" en
   Actions (o `gh workflow run set-daily-limit.yml`).
2. Confirmar visualmente que el botón "Reintentar" para runs cancelados y
   la nueva sección de Historial se ven bien en el teléfono de Milton tras
   el último despliegue de responsive.

Responsable siguiente: quien retome, sobre este mismo documento.
Decisión de Milton: archivar esta conversación.
