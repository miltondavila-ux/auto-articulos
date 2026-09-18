# FASE 0 — ARQUITECTURA · CONEXION COMPOSIO

**Conversación:** `Claude - CONEXION COMPOSIO` · **Rama:** `claude/conexion-composio` · **Base:** `origin/main` `068a0b1`
**Fecha:** 2026-09-18 · **Estado:** PROPUESTA PARA APROBACIÓN — no se ha escrito código de la Fase 2 ni posteriores
**Documento maestro:** `MASTER_BLUEPRINT_CONEXION_COMPOSIO.md` (§16 exige esta entrega)

> No deberá escribirse una sola línea de código hasta que esta fase haya sido revisada y aprobada por Milton.

---

## 0. Resumen ejecutivo

1. **Es viable**, con cuatro de las seis conexiones (Search Console, Analytics, Facebook, Instagram). Business Profile y Threads no existen en Composio.
2. **Hay dos decisiones que dependen de Milton antes de aprobar** (§1): la marca "Composio" que verá el cliente en Google, y una brecha de funciones (Stories de Facebook).
3. **El diseño no toca ninguna tabla ni función existente.** Todo lo nuevo vive en dos modelos nuevos y en un adaptador; con el interruptor en `PROPIA`, el comportamiento es idéntico al actual.
4. **Costo:** el plan gratis de Composio (100.000 llamadas/mes, tope duro) probablemente alcanza al inicio; el plan Scale cuesta 29 USD/mes (§11).
5. Mi borrador de la Fase 1 **compila sin errores** (`tsc`: 0) y se conserva con ajustes (§14).

## 1. Decisiones que necesito de Milton

| # | Tema | Hallazgo | Recomendación |
|---|---|---|---|
| **D1** | **Lo que ve el cliente** | Con OAuth administrado, la pantalla de Google dice **"Composio wants to access your account"** y el enlace pasa por `connect.composio.dev`. Composio lo documenta. Por tanto la conexión **no es invisible** para el cliente. Esto choca con la marca blanca (`tagcrush`). Mostrar tu marca exige OAuth propio, y eso te devuelve al problema de la aprobación de Google. | Aceptar la marca Composio en las cuentas normales (ya declarada en P11). Decidir si `tagcrush` queda **fuera** del interruptor: recomiendo que **sí quede fuera** y siga por la vía propia. |
| **D2** | **Stories de Facebook** | Hoy se publican con `photo_stories`. Composio **no tiene** herramienta de Stories para Facebook (44 herramientas revisadas). | Con la vía Composio, las Stories de Facebook **no se publican**, o esa función sigue por la vía propia. Recomiendo lo primero, documentado en pantalla. |
| **D3** | **Stories y Reels de Instagram** | Composio describe Reels y carruseles; Stories no queda claro en su descripción. | No decidir hoy: se prueba con una cuenta real al inicio de la Fase 3. Si no hay Stories, mismo criterio que D2. |
| **D4** | **Auth configs** | Composio necesita un `auth_config_id` por toolkit (4 en total). Se crean **una sola vez en el panel de Composio** (Platform → Auth Configs, con OAuth administrado). | Crearlos en el panel y pegar los 4 identificadores en el módulo, para que la clave de API **no necesite** permiso de escritura sobre Auth configs. |

Si Milton aprueba las recomendaciones, la Fase 0 queda cerrada sin más preguntas.

## 2. Evidencia verificada (las incógnitas de la Fase 0)

| Ítem del Blueprint | Resultado | Fuente |
|---|---|---|
| (a) Enlace de conexión | `POST /connected_accounts/link` con `auth_config_id` y `user_id` (obligatorios) y `callback_url` (opcional). Responde `redirect_url`, `connected_account_id`, `expires_at`. Tras autenticar, Composio redirige a `callback_url` con `status` y `connected_account_id`. | Documentación oficial de Composio |
| Ejecución | `POST /tools/execute/{tool_slug}` con `connected_account_id`, `user_id`, `arguments`. Responde `data`, `successful`, `error`, `log_id`. Devuelve 200 aunque la herramienta falle: **hay que leer `successful`**. | Documentación oficial |
| Existencia de rutas | `connected_accounts/link`, `connected_accounts`, `connected_accounts/{id}`, `…/refresh`, `tools/execute/{slug}`, `auth_configs` responden 401 sin clave (existen). | Sondeo sin credenciales |
| (b) Mapeo cliente ↔ Composio | `user_id` = `User.id` interno (opaco, estable, no es correo). | Diseño |
| (c) Dónde corre cada cosa | Ver §5. El worker ya descifra secretos con `CREDENTIALS_ENCRYPTION_KEY` y lee la base de datos, así que **lee la clave de Composio de `SystemSetting` sin secretos nuevos**. | Código: `daily-sitemaps.yml`, `worker.yml` |
| (d) Límites y costo | Ver §11. | composio.dev/pricing |
| (e) Integraciones existentes | Ver §4. | Auditoría de código |
| (f) Lista blanca | Ver §7. | Catálogo oficial de Composio × código actual |
| (g) Revocación a 14 días | Ver §9. | Código: workflows existentes |
| Permiso de la clave | **No verificado:** el diálogo de Composio no dice qué permiso cubre `tools/execute` (Tools no ofrece "Write"). Se comprueba en la Fase 2 con la clave real. Por eso la clave debe crearse con lectura general **más** escritura en Connected accounts y Session tool execution. | Diálogo de creación de clave |

## 3. Arquitectura propuesta

```
Cliente ──► Configuración: botón "Conectar" (igual que hoy)
                │
                ▼
     resolveRoute(app)  ◄── IntegrationRoute (interruptor por app, admin)
        │            │
     PROPIA       COMPOSIO
        │            │
   código actual   ComposioAdapter
   (sin cambios)     ├─ startConnection()   → POST /connected_accounts/link
                     ├─ handleCallback()    → GET /connected_accounts/{id} (verifica)
                     └─ run(app, op, args)  → POST /tools/execute/{slug}  ◄── LISTA BLANCA
```

**Principios de diseño**
- **Cero cambios en tablas existentes.** Las tablas `SearchIntegration`, `FacebookPageIntegration`, `InstagramIntegration` y las demás no se modifican. Sus filas son de un solo registro por cliente (`userId @unique` en Meta) y no pueden alojar dos conexiones a la vez.
- **Resolución explícita.** Una función `resolveConnection(userId, app)` devuelve la conexión Composio si existe y está `ACTIVE`; si no, la fila propia. Con esto la conservación de 14 días y la vuelta atrás son automáticas: la fila propia sigue ahí y basta con que la Composio deje de estar `ACTIVE`.
- **Un adaptador por app** en `packages/shared` con la misma forma que las funciones actuales (listar sitios, enviar sitemap, publicar…), de modo que los llamadores cambian **una línea**, no su lógica.
- **La lista blanca vive en un solo sitio**: `run()` rechaza cualquier herramienta que no esté en la tabla de §7.
- **El callback no se cree a ciegas.** Los parámetros `status` y `connected_account_id` llegan por URL y pueden falsificarse. Al volver, el servidor consulta `GET /connected_accounts/{id}` y exige `status=ACTIVE` **y** que su `user_id` sea el de la sesión.

**Alternativa descartada (Opción Y):** pedir a Composio el token de acceso y reutilizar las funciones actuales. Exigiría el mínimo de cambios, pero devuelve los tokens a Auto Artículos (contradice P11), salta la lista blanca (P7) y depende de que Composio exponga el token. **Se descarta.**

## 4. Auditoría de las integraciones existentes (para no alterarlas)

**Modelos (todos permanecen intactos):** `SearchIntegration` (Google/Bing; único por `userId+provider+siteDomain`), `FacebookPageIntegration`, `InstagramIntegration`, `BusinessProfileIntegration` y `ThreadsIntegration` (estas dos, fuera de alcance).

**Puntos de consumo que la Fase 2/3 adaptará** (cada uno cambia solo su origen de conexión):

| Área | Archivos |
|---|---|
| Search Console — worker | `apps/worker/src/googleIndexing.ts`, `send-daily-sitemaps.ts` |
| Search Console — web | `api/search-integrations/google/route.ts` y `callback`, `api/site-selection`, `api/sitemap/send`, `api/titles/[id]/google-inspection`, `api/opportunities`, `api/pre-validation`, `api/configuration-status`, `api/dashboard-stats`, `lib/domain-validation.ts` |
| Analytics | `api/google-analytics/route.ts` y `callback`, `lib/google-analytics-signals.ts` |
| Facebook/Instagram | `apps/worker/src/socialPublish.ts`, `api/search-integrations/facebook-pages`, `instagram` y su `callback`, `api/social-opportunities/generate` |

Funciones de `packages/shared` que hoy reciben un token y que el adaptador espeja: `google-search-console.ts`, `google-analytics.ts`, `facebook-pages-api.ts`, `instagram-api.ts`.

## 5. Dónde corre cada llamada

| Operación | Dónde | Motivo |
|---|---|---|
| Guardar/verificar clave, interruptor, resumen | `apps/web` (rutas de admin) | Interacción de administrador |
| Iniciar conexión y callback | `apps/web` | Requiere sesión del cliente |
| Sitemaps diarios, inspección tras publicar, publicación en redes | `apps/worker` (GitHub Actions) | Ya es donde corren hoy |
| Revocación a 14 días | Worker, workflow diario nuevo (§9) | Mismo patrón que `daily-sitemaps.yml` |

La clave se lee de `SystemSetting` (cifrada) tanto en web como en worker.

## 6. Modelo de datos

**Este modelo sustituye al §11 del Blueprint**, que preveía extender las tablas existentes; la auditoría del §4 muestra que no es viable (una sola fila por cliente).

Cambio de schema **mínimo y aditivo**: un enum y dos modelos nuevos. Ninguna tabla existente cambia. **El schema y su migración SQL (idempotente, como `20260908162000`) viajan en el mismo commit** (regla suprema). Nada de `--accept-data-loss`.

**`IntegrationRoute`** — el interruptor
- `app` (PK: `google_search_console` | `google_analytics` | `facebook` | `instagram`)
- `route` (`OWN` por defecto | `COMPOSIO`)
- `authConfigId` (nullable; identificador del panel de Composio, no secreto)
- `updatedAt`, `updatedById`

**`ComposioConnection`** — la conexión de un cliente
- `id`, `userId` (→ User, cascade), `app`
- `connectedAccountId` (el de Composio), `status` (`INITIATED` | `ACTIVE` | `FAILED` | `REVOKED`)
- Selección propia de cada app, todo opcional: `siteDomain`, `siteUrl`, `sitemapUrl`, `propertyId`, `pageId`, `pageName`, `igAccountId`, `username`
- Estado de sincronización de sitemap (espejo de los campos que hoy tiene `SearchIntegration`)
- `activatedAt`, **`legacyRevokeAt`** (= `activatedAt` + 14 días; nulo si no había conexión propia), `createdAt`, `updatedAt`
- Único: `(userId, app, siteDomain)`; índices por `userId` y `status`

**Reconexión pendiente:** no se guarda; se **calcula**. Un cliente la tiene si el interruptor de una app es `COMPOSIO`, tiene fila propia de esa app y no tiene `ComposioConnection` en `ACTIVE`. Así no hay estado que pueda desincronizarse.

**Los tokens OAuth no se almacenan** en Auto Artículos.

## 7. Lista blanca (P7)

Cruce del código actual con las herramientas reales de cada toolkit:

| App | Operación actual | Herramienta Composio permitida |
|---|---|---|
| Search Console | listar sitios | `GOOGLE_SEARCH_CONSOLE_LIST_SITES` |
| | listar sitemaps | `GOOGLE_SEARCH_CONSOLE_LIST_SITEMAPS` |
| | enviar sitemap | `GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP` |
| | inspeccionar URL | `GOOGLE_SEARCH_CONSOLE_INSPECT_URL` |
| | consultar métricas | `GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY` |
| | — | **Bloqueadas:** `ADD_SITE`, `DELETE_SITE`, `GET_SITE`, `GET_SITEMAP` |
| Analytics | listar cuentas y propiedades | `GOOGLE_ANALYTICS_LIST_ACCOUNTS`, `GOOGLE_ANALYTICS_LIST_PROPERTIES_FILTERED` |
| | consultar resumen | `GOOGLE_ANALYTICS_RUN_REPORT` |
| | — | **Bloqueadas:** las otras 66 (crear, actualizar, archivar, enviar eventos…) |
| Facebook | listar Páginas | `FACEBOOK_LIST_MANAGED_PAGES` |
| | publicar texto/enlace | `FACEBOOK_CREATE_POST` |
| | publicar foto | `FACEBOOK_CREATE_PHOTO_POST` |
| | Stories | **Sin equivalente** (D2) |
| Instagram | leer cuenta | `INSTAGRAM_GET_USER_INFO` |
| | crear contenedor (imagen, Reel, carrusel) | `INSTAGRAM_POST_IG_USER_MEDIA`, `INSTAGRAM_CREATE_CAROUSEL_CONTAINER` |
| | publicar | `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH` |
| | ver límite de publicación | `INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT` |

Los eslugs se congelan al implementar contra la versión del toolkit vigente (`version` explícita en cada llamada, no "latest") para que un cambio de Composio no altere el comportamiento sin aviso. Cualquier ampliación requiere cambio de código y revisión.

## 8. Flujos de usuario

**Administrador (una vez):** crea las 4 auth configs y la clave de API en Composio → pega la clave y los 4 identificadores en `/dashboard/composio` → "Verificar y guardar" → prueba la conexión.

**Cambio de interruptor:** Milton pasa una app a `COMPOSIO` → no se corta nada → los clientes con esa app conectada por la vía propia ven el banner en Inicio → el resumen por app muestra cuántos están pendientes.

**Cliente que reconecta:** pulsa "Conectar" → el servidor crea el enlace (`user_id` = su id, `callback_url` propia) → el cliente autoriza en Google/Meta (ve "Composio") → vuelve a `/api/composio/callback` → el servidor verifica la cuenta con Composio → elige sitio/propiedad/Página → conexión `ACTIVE`, `legacyRevokeAt` = hoy + 14 días → el banner desaparece.

**Vuelta atrás dentro de los 14 días:** Milton devuelve el interruptor a `PROPIA`; `resolveConnection` vuelve a la fila propia, que nunca se borró.

## 9. Revocación a 14 días

Workflow diario nuevo, `composio-revocacion.yml`, separado del de sitemaps (no se edita el existente), con el mismo patrón: `DATABASE_URL` y `CREDENTIALS_ENCRYPTION_KEY`, `concurrency` para evitar corridas dobles, `timeout-minutes` corto y `workflow_dispatch` para probar a mano.

Para cada `ComposioConnection ACTIVE` con `legacyRevokeAt` vencido: revoca el token propio en Google/Meta, borra la fila propia y limpia `legacyRevokeAt`. **Salvaguarda:** si la revocación falla (Google/Meta caído), no se borra nada y se reintenta al día siguiente; nunca queda una fila propia sin token válido y sin registrar. Este trabajo va en la Fase 2, con su propia auditoría.

## 10. Mapa de navegación

- **Administración** (grupo desplegable, ya en mi borrador): Usuarios · **Composio**. No se modifica `usuarios/page.tsx`.
- **Inicio:** banner de reconexión (una línea por app pendiente).
- **Configuración:** los botones "Conectar" actuales; el texto de privacidad (P11) aparece en el paso previo a la autorización.

## 11. Costos y límites

| Plan | Precio | Llamadas incluidas | Límite de tasa |
|---|---|---|---|
| Free | 0 USD | 100.000/mes, **tope duro** (se pausa hasta el mes siguiente) | 2.000/min |
| Scale | 29 USD/mes | 100.000 y luego 0,30 USD por cada 1.000 | 10.000/min |

Cuentas conectadas ilimitadas en ambos. **Estimación (supuestos, por confirmar con el número real de clientes):** un cliente activo consume del orden de 30–60 llamadas por día (sitemap diario, inspección por artículo, métricas, 3–6 llamadas por publicación en Instagram). Con 50 clientes serían unas 45.000–90.000 llamadas al mes (dentro del plan gratis); con 100 clientes se superaría el tope. **Riesgo:** el tope duro del plan Free pausa todas las conexiones Composio a fin de mes. Mitigación: alerta al 80% de uso en el módulo y paso a Scale antes del primer cliente real; el límite de tasa devuelve 429 con `Retry-After`, que el adaptador respeta.

## 12. Estructura de carpetas propuesta

```
packages/shared/src/composio/          client.ts · adapter.ts · allowlist.ts · apps.ts
packages/db/prisma/                    schema.prisma (+enum, +2 modelos) · migrations/<fecha>_add_composio_connections/
apps/web/src/lib/composio.ts           (existente en el borrador: clave y verificación)
apps/web/src/lib/composio-route.ts     resolveConnection · resolveRoute
apps/web/src/app/api/admin/composio/   route.ts · accounts/ · routes/ (interruptor) · summary/
apps/web/src/app/api/composio/         connect/ · callback/
apps/web/src/app/dashboard/composio/   page.tsx · ComposioPanel.tsx
apps/web/src/components/               ReconnectBanner.tsx
apps/worker/src/                       composioRevocation.ts
.github/workflows/                     composio-revocacion.yml
```

## 13. Stack

El existente, sin cambios de versión: Next.js (App Router), TypeScript, Prisma/PostgreSQL, worker en Node con GitHub Actions, cifrado AES-256-GCM (`encryptSecret`). Sin dependencias nuevas: las llamadas a Composio usan `fetch` con `AbortSignal.timeout`, igual que el resto del proyecto (no se añade el SDK de Composio). **No se cambia ninguna versión de software.**

## 14. Estado del borrador de la Fase 1 (sin commit)

| Archivo | Estado |
|---|---|
| `apps/web/src/lib/composio.ts` | Compila. **Ajustar:** versión de API explícita, guardar `authConfigId` por app, respetar `Retry-After`. |
| `api/admin/composio/route.ts` y `accounts/route.ts` | Compilan. Se conservan. |
| `dashboard/composio/page.tsx` y `ComposioPanel.tsx` | Compilan. **Ampliar** con los 4 identificadores de auth config, el interruptor y el resumen. |
| `components/DashboardNav.tsx` | Compila. Se conserva (grupo Administración). |

Verificación: `tsc --noEmit` = **0 errores** tras generar el cliente de Prisma (los errores anteriores se debían a que no estaba generado). `next build` y prueba funcional con una clave real **aún no se han ejecutado**; se hacen en la Fase 1 con la clave que pegue Milton. La Fase 1 **no requiere cambio de schema** (usa `SystemSetting`).

## 15. Roadmap por fases (refinado)

| Fase | Entrega | Migración | Riesgo | Puerta |
|---|---|---|---|---|
| **1** | Módulo admin: clave, 4 auth configs, verificación, cuentas conectadas. | No | Bajo | `next build`, prueba con clave real, 3 auditorías, autorización |
| **2a** | Schema + migración juntos (`IntegrationRoute`, `ComposioConnection`), interruptor, resumen, `resolveConnection`. Sin cambio de comportamiento con todo en `PROPIA`. | **Sí** | Medio | Prueba de regresión con todo en `PROPIA` |
| **2b** | Search Console y Analytics por Composio, banner, callback verificado, texto de privacidad. | No | Medio | Cuenta de prueba local + verificación en Producción con autorización |
| **2c** | Revocación a 14 días. | No | Medio | Prueba con fecha simulada y con fallo forzado |
| **3** | Facebook e Instagram (publicación). Prueba de Stories/Reels (D3). | No | Alto | Publicación real en cuenta de prueba, con evidencia |
| **4** | Investigación de Business Profile y Threads con terceros. Solo informe. | No | Bajo | — |

## 16. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| El cliente ve "Composio" en Google (D1) | Decisión de Milton; texto de transparencia (P11); `tagcrush` fuera. |
| `tools/execute` devuelve 200 aunque falle | Leer siempre `successful`; tratar `error` como fallo. |
| Callback falsificado | Verificar la cuenta con Composio y comparar `user_id` con la sesión. |
| Cambio de versión de un toolkit | `version` fija por llamada. |
| Tope duro del plan Free | Alerta al 80%; paso a Scale (§11). |
| Permisos de la clave insuficientes | Verificar en Fase 1 con la clave real. |
| Dos conexiones activas a la vez | `resolveConnection` prioriza Composio solo si está `ACTIVE`; nunca opera con ambas. |
| Revocación deja huérfanos | Salvaguarda de §9: sin borrar hasta confirmar. |
| Edición concurrente de archivos calientes | Reservas; no se toca `usuarios/page.tsx` ni el árbol principal. |
| Prisma y el árbol principal | Todo el trabajo en el worktree propio; no ejecutar `migrate` sin autorización y sin capitán de migración. |

## 17. Propuestas de mejora (no incluidas, para decidir después)

1. Alerta en el módulo al acercarse al tope de llamadas (mencionada en §11; recomendada dentro de la Fase 2a).
2. Historial de cambios de interruptor por cliente (descartado en P9; el `auditLog` ya registra cada cambio).
3. Interruptor por cliente además del global, útil para probar con una sola cuenta antes de mover a todos. **Recomendación fuerte:** una lista corta de "cuentas piloto" reduce el riesgo de la Fase 2b y 3 a casi cero.

## 18. Coordinación

- **Reservas activas:** `apps/web/src/components/DashboardNav.tsx`; todo lo nuevo (`composio*`) es propio. No se toca `usuarios/page.tsx` (cambio sin atribuir de otra tarea).
- **Capitanía de migración:** a reclamar en la Fase 2a antes de tocar `schema.prisma`. Nadie más ejecuta Prisma hasta su liberación.
- **Archivos con cambios sin commit de esta conversación:** los del §14, más `INVENTARIO_CONVERSACIONES.md` y los dos documentos `.md` de este proyecto.
- **Producción y Preview:** sin cambios, sin despliegues.
- **Alcance de cada PR:** exclusivo de su fase; commit con archivos explícitos, nunca `git add .`.

## 19. Qué apruebas al aprobar esta Fase 0

1. La arquitectura de §3 (adaptador, resolución explícita, cero cambios en tablas existentes) y la descartada Opción Y.
2. Las recomendaciones D1–D4 de §1 (o tus cambios).
3. El modelo de datos de §6 y la lista blanca de §7.
4. El roadmap de §15, empezando por la **Fase 1** (módulo admin, sin migración).
5. Que la Fase 1 termina en prueba con tu clave real y **no se despliega a Producción sin tu autorización explícita**.
