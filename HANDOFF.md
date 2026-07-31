# HANDOFF — Auto Artículos

Última actualización: 2026-07-31 (noche), por Claude Code.

Este documento es la fuente de verdad para retomar el proyecto sin necesitar
el historial de chat. Mantenlo actualizado después de cada sesión de trabajo
importante: qué cambió, qué quedó pendiente, qué se rompió.

## Qué es esto

"Auto Artículos" es un sistema multi-tenant que automatiza la publicación de
artículos en **10minutesWebsite** (plataforma de marketing inmobiliario/de
seguros) usando Playwright. Un usuario pega una lista de títulos, el sistema
genera contenido + imagen con IA en 10minutesWebsite y publica cada artículo
automáticamente.

Escala objetivo real: **~60 usuarios activos**. Actualmente hay **45 usuarios**
creados en el sistema (1 admin + 44 usuarios normales, incluida Sandra).

## Arquitectura

- **Dashboard**: Next.js 16 (App Router) + React 19, desplegado en **Vercel**.
  Repo: `apps/web`. Despliegue: `cd apps/web && npx vercel --prod --yes`
  (el push a GitHub por sí solo **no** dispara un deploy automático en este
  proyecto — hay que correr `vercel --prod --yes` manualmente después de
  cada push).
- **Worker**: Node/TypeScript con Playwright, corre en **GitHub Actions**
  (`.github/workflows/worker.yml`), disparado por cron cada 5 min Y por
  `workflow_dispatch` instantáneo desde la API (`triggerWorkerNow()` en
  `apps/web/src/lib/trigger-worker.ts`). Repo: `apps/worker`.
  **Actualizado 31/7/2026 (noche), carga real de ~40 usuarios activos**:
  ahora corren **5 shards en paralelo** por corrida (`strategy.matrix` en
  `worker.yml`), cada uno un proceso de Node completamente separado, y
  dentro de cada shard 2 "lanes" de publicación de artículos + 2 lanes de
  sincronización de categorías (`TITLE_LANE_CONCURRENCY` /
  `SYNC_LANE_CONCURRENCY` en `run-once.ts`). El bloqueo por usuario
  (`reservation.ts`) YA NO es en memoria (eso solo servía dentro de un
  mismo proceso) — es un **claim atómico en la base de datos**
  (`User.workerBusyUntil`, `UPDATE` condicional con vencimiento de 5 min
  como red de seguridad si un proceso muere sin liberarlo), probado bajo
  concurrencia simulada antes de desplegar: de 3 intentos simultáneos por
  el mismo usuario, exactamente uno gana el claim. Esto garantiza que nunca
  dos shards/lanes abran sesión contra la MISMA cuenta de 10minutesWebsite
  a la vez (podría invalidar la sesión), pero permite que usuarios
  distintos avancen todos en paralelo a través de los 5 shards. Además,
  `triggerWorkerNow()` ahora chequea primero si ya hay una corrida
  `in_progress`/`queued` en GitHub Actions antes de disparar otra — antes,
  disparos repetidos (varias personas actuando casi al mismo tiempo)
  cancelaban la corrida en cola anterior entre sí ("guerra de disparos",
  visto en vivo esa misma noche). El `concurrency: group:
  auto-articulos-worker` de `worker.yml` sigue existiendo para evitar que
  dos TANDAS de 5 shards se disparen una encima de la otra, pero los 5
  shards DENTRO de una misma tanda corren en paralelo sin problema.
- **Base de datos**: PostgreSQL en **Supabase Pro** (pagado). Prisma como ORM
  (`packages/db`).
- **Automatización**: Playwright headless controla un navegador con las
  credenciales guardadas y cifradas de cada usuario para 10minutesWebsite —
  NO se automatiza el navegador del usuario final, es 100% server-side.
- **Repo**: `https://github.com/miltondavila-ux/auto-articulos` (rama `main`,
  todo se despliega directo a producción, no hay staging).
- **Producción**: `https://auto-articulos-web.vercel.app`.

## Base de datos: Supabase (estado resuelto y estable)

Org "LaSolucionWeb", proyecto "Auto Articulos", región `ca-central-1`, ref
`uqqclaezxagukoyiiiol`, plan **Pro** (8GB de almacenamiento incluido).

**Lección importante** (costó varias horas de depuración): el host unificado
por proyecto `db.<ref>.supabase.co` (cualquier puerto) **no es alcanzable
desde las funciones serverless de Vercel** (probablemente solo tiene ruta
IPv6, y Vercel/Lambda solo sale por IPv4). El **Session pooler**
(`aws-0-ca-central-1.pooler.supabase.com:5432`) sí es alcanzable pero solo
permite **15 conexiones simultáneas** (`EMAXCONNSESSION` bajo tráfico real).
La opción correcta para un entorno serverless/concurrente es el
**Transaction pooler**: mismo host, **puerto 6543**, con `?pgbouncer=true`
al final (desactiva los prepared statements de Prisma, requerido en modo
transacción).

Cadenas de conexión actuales: guardadas únicamente en Vercel
(producción+preview) y en el secret de GitHub Actions `DATABASE_URL`, que el
workflow reutiliza para `DATABASE_URL`/`DIRECT_URL`. No copiar contraseñas,
tokens ni URLs con credenciales dentro de archivos del repo.

### Proceso para aplicar una migración nueva contra producción

```bash
cd packages/db
npx prisma format --schema=prisma/schema.prisma
DATABASE_URL="<transaction-pooler-url-from-secure-storage>" \
DIRECT_URL="<direct-url-from-secure-storage>" \
npx prisma migrate deploy --schema=prisma/schema.prisma
npx prisma generate --schema=prisma/schema.prisma
```

Para scripts puntuales contra producción (backfills, resets), usar
`DATABASE_URL` (el transaction pooler) con un `node -e "..."` cargando
`@prisma/client` directamente — patrón usado varias veces esta sesión para
backfills de teléfono y nombre/apellido.

**`vercel env pull` está confirmado roto en este entorno** (devuelve valores
vacíos) — no confiar en él nunca, usar el patrón de endpoint temporal o
scripts directos con Prisma (ver sección de patrones más abajo).

## Credenciales de acceso

- No guardar contraseñas reales en este archivo ni en ningún archivo del
  repo. El acceso admin y los secretos de infraestructura viven fuera del
  repositorio.
- Los usuarios bulk-creados tienen una clave aleatoria de 12 caracteres,
  recuperable desde Usuarios → pestaña "Accesos a usuarios" → botón "Copiar
  credenciales". Las cuentas antiguas sin `initialPasswordEncrypted` muestran
  ese botón deshabilitado; usar "Editar" → nueva contraseña para dejarles una
  clave copiable.

## Modelo de usuario (`packages/db/prisma/schema.prisma`)

Campos agregados a `User` a lo largo de esta sesión y la anterior:

- `initialPasswordEncrypted String?` — copia cifrada (AES-256-GCM, reutiliza
  `packages/shared/src/crypto.ts`) y **recuperable** de la contraseña, aparte
  del hash bcrypt de `passwordHash` (que sigue siendo lo único usado para
  autenticar). Existe para que el admin pueda compartir credenciales con la
  persona invitada en cualquier momento — pedido explícito del usuario.
- `name String?` — campo original de nombre combinado, ya no se usa para
  mostrar (queda por compatibilidad, algunos registros viejos lo tienen).
- `firstName String?` / `lastName String?` — split real de nombre/apellido,
  editable desde Usuarios. Backfillado para los usuarios actuales; producción
  ya muestra nombre y apellido también para Milton, Mario y Lorena.
- `phone String?` — backfillado para los usuarios que lo tenían en la
  planilla original.
- `monthlyArticleLimit Int? @default(300)` y `dailyArticleLimit Int? @default(95)`
  — límites estándar aplicados a **todos** los usuarios actuales (pedido
  explícito del 31/7/2026; el diario empezó en 40 y se subió a 95 el mismo
  día), editables individualmente desde Usuarios. Se validan al crear una
  corrida (`POST /api/runs`, `apps/web/src/app/api/runs/route.ts`): si se
  supera el límite mensual o el diario, la API devuelve 403 con el mensaje
  explicando cuánto queda.
- `workerBusyUntil DateTime?` — bloqueo entre procesos del worker (ver
  Arquitectura arriba), NO relacionado con límites de artículos.

## Cambios importantes de esta sesión (31/7/2026), en orden

1. **Rediseño de continuidad de lotes** (`apps/worker/src/queue.ts`): un
   título que agota sus reintentos (`MAX_ATTEMPTS = 3`) ya no detiene todo
   el lote — solo se marca `error` (`markTitleError()`) y el worker sigue
   con el siguiente título pendiente. El `Run` solo pasa a `halted` (ahora
   mostrado como "Con errores", no "Detenido") cuando ya no quedan títulos
   pendientes Y al menos uno terminó en error. Único caso que sigue
   deteniendo todo de inmediato: credenciales de 10minutesWebsite faltantes.
2. **Recuperación automática de títulos atascados**
   (`apps/worker/src/cleanup.ts` → `recoverStuckTitles()`): un título en
   `processing` sin actividad por más de 10 min se reintenta solo o se marca
   error, según cuántos intentos lleve. Se corre una vez al inicio de cada
   invocación del worker (`apps/worker/src/run-once.ts`).
3. **Reintentos manuales**: `POST /api/titles/[id]/retry` (un título) y
   `POST /api/runs/[id]/retry` (todos los títulos en error de una corrida de
   una vez) — ambos disparan el worker de inmediato. Botones "Reintentar" /
   "Reintentar ahora" en Inicio, y "REINTENTAR" en Historial.
4. **Distinción visual de corridas con error**: fondo amarillo (`#fff8e6`) +
   badge ámbar en Historial para corridas `halted`.
5. **Transparencia en sincronización de categorías**
   (`apps/web/src/app/dashboard/configuracion/page.tsx`): distingue "en cola"
   (`pending`) de "conectando ahora mismo" (`running`), y muestra el mensaje
   de error REAL guardado en `CategorySyncJob.errorMessage` en vez de un
   genérico "falló, intenta de nuevo".
6. **Hipótesis de tokens de imagen agotados**: el error de timeout al
   generar imagen en 10minutesWebsite (`page.waitForFunction` en
   `apps/worker/src/automation/10minutesWebsite.ts`) ahora agrega al mensaje:
   "es posible que se hayan acabado los tokens de generación de imágenes de
   la cuenta en 10minutesWebsite."
7. **Rediseño completo de login/branding**: `apps/web/src/app/login/page.tsx`
   con imagen de fondo full-bleed (`/login-hero.jpg`) + degradado hacia
   `#031537`, favicon (`apps/web/src/app/icon.png`) y OG image
   (`apps/web/public/og-image.jpg`, fondo 100% azul de marca) con la foto
   del usuario. Bug de plomería encontrado y corregido en el camino: el
   middleware de sesión (`apps/web/src/proxy.ts`) bloqueaba `/login-hero.jpg`
   porque su matcher no excluía archivos estáticos de `/public` — se agregó
   una excepción por extensión de imagen.
8. **Alta masiva de 41 usuarios nuevos** (Sandra ya existía) desde una lista
   de 45 filas provista por el usuario, vía endpoint temporal (creado,
   usado una vez, borrado). Cada uno con clave aleatoria de 12 caracteres,
   guardada cifrada y recuperable.
9. **Botón "Copiar credenciales"** en Usuarios: copia
   `Correo electrónico / Clave / Acceso a la plataforma` al portapapeles,
   deshabilitado cuando no hay clave recuperable guardada.
10. **Límite diario subido a 95** (era 40 al principio) — mismo mecanismo
    que el mensual, aplicado a los 45 usuarios.
11. **Worker con concurrencia real por usuario, primera versión** (en
    memoria, dentro de un solo proceso) — antes todo el trabajo de todos los
    usuarios pasaba por una cola secuencial de a uno; esta primera versión
    dejó avanzar varios usuarios en paralelo pero solo DENTRO de un mismo
    proceso de `run-once.ts`. **Superada la misma noche por el ítem 18**
    (multi-proceso real) al ver que no alcanzaba para ~40 usuarios activos.
12. **FAQ generado con IA en vez de plantilla fija**
    (`apps/worker/src/faqPrompt.ts`, nuevo): antes el widget FAQ usaba
    preguntas de relleno genéricas ("¿Qué opciones tengo disponibles?",
    "¿A quién puedo contactar?"...) armadas cortando oraciones del texto a
    lo bruto. Ahora se le pide a `gpt-4o-mini` que lea el resumen y el
    contenido real del artículo y genere 4-6 preguntas que la gente
    realmente buscaría sobre ESE tema puntual, con respuestas basadas solo
    en el contenido (si la IA no devuelve nada usable, se omite el FAQ en
    vez de mostrar relleno). Además, pedido explícito: el FAQ ya **no se ve
    en el artículo** — solo se inserta el `<script
type="application/ld+json">` (schema.org FAQPage) en el campo Widget,
    se quitó el bloque de HTML visible que se mostraba antes.
    **Ajuste posterior**: el usuario aclaró que el patrón de preguntas de
    alta intención ("¿Qué debo saber sobre X?", "¿Qué opciones tengo?",
    "¿Cómo tomar la mejor decisión?") no era el problema — el problema eran
    las respuestas mal redactadas. El prompt ahora pide explícitamente que
    el modelo REDACTE las respuestas (no que corte oraciones del texto),
    con estilo AEO (citables directamente por buscadores/IA), e incorpore
    contexto geográfico (Estados Unidos / Florida, mercado principal de la
    plataforma) en las preguntas cuando corresponda. Probado en aislado con
    un artículo de ejemplo (seguro médico vs. incapacidad) antes de dar por
    bueno el cambio — ver commit `47777d7`.
13. **Panel de Usuarios rehecho**:
    - Layout del dashboard a ancho completo (`maxWidth: 1400`, antes 820).
    - Split de nombre en `firstName`/`lastName` + columna de teléfono,
      editables vía "Editar".
    - Buscador por correo/nombre/apellido.
    - Límite diario (95) además del mensual (300), ambos editables.
    - En "Uso de la base de datos", los usuarios con una corrida
      `running`/`pending` en este momento se resaltan con fondo celeste y
      una etiqueta "● En uso ahora" (`apps/web/src/app/api/admin/usage/route.ts`
      calcula `active` por usuario).
    - **Convertido a pestañas** ("Accesos a usuarios" / "Creación de
      usuarios" / "Uso de base de datos") — antes las tres secciones se
      mostraban todas a la vez, ahora solo se renderiza la pestaña activa.
    - Verificado visualmente en producción el 31/7/2026: las tres pestañas
      cambian correctamente, cargan datos reales y mantienen el layout
      esperado. El login admin real también respondió correctamente.
14. **Limpieza de nombres de categoría** (`fetchCategories()` en
    `apps/worker/src/automation/10minutesWebsite.ts`): el atributo
    `data-content` del `<option>` en 10minutesWebsite trae HTML de un ícono
    pegado al nombre (ej. `<i class='fa-solid ...'></i>&nbsp; Finanza`), y se
    guardaba tal cual. Ahora se limpia con el parser HTML del navegador
    (`innerHTML` + `textContent`) antes de guardar. Las categorías que ya
    quedaron "sucias" en la base se autocorrigen la próxima vez que ese
    usuario sincronice (upsert por `externalId`).
15. **FAQ probado en vivo con 3 artículos reales** (Milton y Mariana Romero)
    tras el commit `47777d7` — quedó **sin ningún HTML visible** en la
    página (solo el `<script type="application/ld+json">`) y con preguntas
    específicas del contenido + Florida/Estados Unidos incorporado
    naturalmente. **Nota de timing importante**: si se prueba un artículo
    justo cuando ya había una corrida de GitHub Actions en curso (el cron
    corre cada 5 min y cada job puede durar hasta 18 min de `BUDGET_MS`),
    esa corrida sigue usando el código que tenía al arrancar — un push
    reciente no la afecta hasta que termine y arranque la siguiente. Si algo
    se ve con código viejo justo después de un deploy, puede ser esto, no
    necesariamente que el fix no se aplicó — confirmar con
    `gh run list --workflow=worker.yml` (columna `headSha`) antes de asumir
    que el código está mal.
16. **Error de formulario con hipótesis de límite diario** (encontrado en
    vivo con la cuenta de Mariana Romero, `#type` nunca aparecía y tiraba
    timeout 3-5 veces seguidas antes de funcionar): el mensaje ahora sugiere
    que la cuenta pudo haber alcanzado un límite diario de artículos en
    10minutesWebsite (ej. 10/día) que no debería aplicar a cuentas del
    programa de posicionamiento, y pide contactar al servicio al cliente de
    10minutesWebsite para que lo revisen (`createArticleDraft()` en
    `10minutesWebsite.ts`).
17. **Botón "Reintentar ahora" (Inicio, título en `processing`) sacado del
    `<details>`**: antes quedaba anidado junto con el texto explicativo
    dentro de "¿Parece atascado?" (solo visible al expandir); ahora es un
    botón independiente, siempre visible.
18. **Multi-proceso real: 5 shards de GitHub Actions en paralelo** (ver
    sección Arquitectura arriba para el detalle completo). Encontrado en
    vivo esa misma noche con ~40 usuarios activos: la corrida única con
    lanes en memoria (ítem 11) se veía forzada a encolar/cancelar corridas
    entre sí cuando muchas personas disparaban el worker casi al mismo
    tiempo, dejando trabajo esperando de más (el sync de categorías de
    Lizzammar Oropeza quedó "pending" varios minutos por esto). Se
    diagnosticó comparando `gh run list --workflow=worker.yml` (columna
    `headSha`/`status`/`conclusion`) contra los `CategorySyncJob` en la
    base — varias corridas "cancelled" seguidas en segundos, superponiéndose
    entre sí. Solución: `worker.yml` con `strategy.matrix: shard: [1..5]` +
    bloqueo por usuario movido a la base de datos (`reservation.ts`,
    `User.workerBusyUntil`) para que sea seguro entre procesos separados.
    Probado con 3 intentos simultáneos de reserva sobre el mismo usuario
    antes de desplegar (exactamente uno ganó).
19. **`triggerWorkerNow()` ya no dispara si ya hay una corrida activa**
    (`apps/web/src/lib/trigger-worker.ts`, función `isWorkerAlreadyActive`):
    consulta la API de GitHub por corridas `in_progress`/`queued` de
    `worker.yml` antes de disparar una nueva — evita la "guerra de
    disparos" descrita en el ítem 18. La corrida activa vuelve a revisar la
    base de datos en cada vuelta de su loop, así que igual recoge el
    trabajo nuevo sin necesidad de un disparo adicional.

## Aclaración: "Artículos publicados" vs. "Títulos" en Usuarios

Son dos números DISTINTOS a propósito, no un bug — puede confundir porque
están en la misma página (pestañas distintas):

- **Artículos publicados** (pestaña "Accesos a usuarios",
  `apps/web/src/app/api/admin/users/route.ts`) cuenta solo `Title` con
  `status = 'success'`.
- **Títulos** (pestaña "Uso de base de datos",
  `apps/web/src/app/api/admin/usage/route.ts`) cuenta TODOS los `Title` del
  usuario sin importar el estado (pendientes, error, cancelados, exitosos),
  porque esa sección mide espacio ocupado en la base, no artículos
  publicados.

## Integración de indexación Google/Bing (solicitada, diseño pendiente)

Pedido del usuario el 31/7/2026: que cada usuario conecte sus propias cuentas
de Google Search Console y Bing Webmaster, y que cada URL publicada se envíe
automáticamente a los buscadores.

Conclusiones confirmadas contra documentación oficial:

- **No se deben pedir ni guardar contraseñas de Gmail/Microsoft.** Ambos
  servicios se conectan mediante OAuth 2.0: el usuario inicia sesión en la
  página oficial, concede permiso y la app guarda cifrado únicamente el
  `refresh_token` revocable.
- La separación es estrictamente **multi-tenant**: existe un solo cliente
  OAuth global de Auto Artículos (el `client_id`/`client_secret` de la app),
  pero cada usuario de Auto Artículos inicia su propio consentimiento y
  obtiene su propio `refresh_token` cifrado. Cada registro queda relacionado
  por `userId`, lista únicamente las propiedades de Search Console de esa
  persona y solo puede enviar/consultar URLs para la propiedad que esa misma
  persona seleccione. Nunca se reutiliza un token, correo o propiedad entre
  usuarios.
- La **Google Indexing API no se puede usar para estos artículos**: Google la
  limita a páginas con `JobPosting` o `BroadcastEvent` dentro de
  `VideoObject`. Intentar usarla para artículos normales incumpliría la
  política oficial.
- Para Google, el flujo válido es Search Console API con scope
  `https://www.googleapis.com/auth/webmasters`: elegir una propiedad
  verificada, registrar/enviar su sitemap y consultar posteriormente el
  estado de la URL con URL Inspection. Search Console no ofrece un endpoint
  público para solicitar indexación individual de artículos normales.
- Para Bing, Bing Webmaster OAuth 2.0 con scope `webmaster.manage` sí permite
  llamar `SubmitUrl` con cada `articleUrl` publicada. La propiedad debe estar
  previamente verificada en Bing Webmaster.
- En ambos casos, enviar sitemap/URL acelera el descubrimiento, pero **no
  garantiza** que Google o Bing indexen la página; la decisión final siempre
  es del buscador.
- Punto de integración previsto: después de que `apps/worker/src/queue.ts`
  confirme y guarde `result.articleUrl`. Un fallo de Google/Bing nunca debe
  convertir un artículo ya publicado en error; se registrará como estado de
  indexación separado y reintentable.
- Diseño de datos previsto: una integración por usuario/proveedor con tokens
  cifrados, propiedad elegida y sitemap de Google; estados separados de
  envío Google/Bing por `Title`. La pantalla Configuración tendrá botones
  "Conectar Google Search Console" y "Conectar Bing Webmaster", selector de
  propiedad, estado, desconexión y mensajes claros.

Bloqueo externo actual (no es un bug del código): antes de que los usuarios
puedan autorizar la app hay que registrar dos clientes OAuth y guardar sus
secretos solo en Vercel/GitHub, nunca en el repo:

1. Google Cloud: habilitar Search Console API, configurar consentimiento
   externo y crear cliente web con callback
   `https://auto-articulos-web.vercel.app/api/search-integrations/google/callback`.
   Para ~60 usuarios en producción se debe publicar/verificar la app; en modo
   Testing los refresh tokens expiran a los 7 días.
2. Bing Webmaster: Settings → API Access → OAuth Client, scope
   `webmaster.manage`, callback
   `https://auto-articulos-web.vercel.app/api/search-integrations/bing/callback`.

No se modificó código ni base de datos todavía: primero se documentó la
limitación real para no construir una integración de Google prohibida ni
guardar contraseñas de usuarios.

### Inicio de configuración Google Cloud (costo cero)

El usuario confirmó que la integración no debe generar ningún costo. La
documentación oficial de Google indica que **todo uso de Search Console API
es gratuito**, sujeto únicamente a cuotas. No se habilitarán Compute Engine,
Vertex AI, almacenamiento, bases de datos ni otros productos facturables, y
no se aceptará ninguna activación de pago.

Estado al pausar:

- Se abrió `https://console.cloud.google.com/` en el navegador seguro.
- Google mostró la pantalla oficial de inicio de sesión; la sesión todavía no
  está autenticada.
- No se creó proyecto, no se habilitó API, no se configuró OAuth y no se
  vinculó facturación.
- Próximo paso: el usuario debe iniciar sesión personalmente en esa pestaña
  (sin compartir su contraseña) y avisar cuando vea Google Cloud Console.

Avance posterior confirmado por el usuario:

- Inició sesión desde su navegador habitual.
- Creó un proyecto separado llamado **Auto Artículos Search Console**, para
  no mezclar esta integración con su proyecto existente "Drive - files to
  share".
- La creación del proyecto no habilitó servicios facturables. Siguiente paso:
  habilitar únicamente Google Search Console API desde APIs y servicios.
- Captura del usuario confirmó después que **Google Search Console API**
  (`searchconsole.googleapis.com`) quedó habilitada dentro de **Auto
  Artículos Search Console**. No se habilitó facturación ni otro servicio.
  Siguiente paso: configurar la pantalla/identidad de consentimiento OAuth.
- En Información de la marca, Google mostró como requisitos las URLs públicas
  de inicio, privacidad y condiciones. Se crearon sin servicios adicionales:
  `/acerca-de`, `/privacidad` y `/terminos`, con navegación común, contacto,
  descripción clara del uso de datos de Google, separación multi-tenant,
  revocación/eliminación y aclaración de que no se garantiza indexación. Se
  agregaron a `PUBLIC_PATHS` en `apps/web/src/proxy.ts`. El logotipo se omitió
  por ahora porque es opcional y puede añadir revisión de marca innecesaria.
- Páginas validadas con Prettier, `npx tsc --noEmit` y build completo; commit
  `c4b1899`, push a `main` y deploy Vercel
  `dpl_D5oM5LuecC2Pw5FBtT489i7noa6d`. Las tres URLs públicas respondieron
  HTTP 200 sin sesión:
  `https://auto-articulos-web.vercel.app/acerca-de`,
  `https://auto-articulos-web.vercel.app/privacidad` y
  `https://auto-articulos-web.vercel.app/terminos`.
- Antes de copiar esas URLs a Google se detectó un requisito de verificación:
  para una app OAuth externa en producción, Google exige que homepage,
  privacidad y condiciones estén en un dominio propio verificado por DNS en
  Search Console. `vercel.app` pertenece a Vercel y puede ser rechazado aunque
  controlemos el subdominio asignado. Se pausó el formulario sin guardar URLs.
  Solución gratuita si el usuario ya posee un dominio: agregar en Vercel un
  subdominio como `autoarticulos.<dominio-propio>` y verificar por DNS ese
  dominio con la misma cuenta que es Owner/Editor del proyecto Google Cloud.
  Pendiente confirmar qué dominio propio administra el usuario y si tiene
  acceso a sus DNS; no comprar ni activar nada facturable.
- `vercel domains ls` confirmó que el equipo actual tiene **0 dominios
  propios**. Se eligió por ahora la ruta gratuita para menos de 100 usuarios:
  OAuth externo no verificado en estado Production (advertencia de Google y
  límite vitalicio de 100 usuarios, suficiente para los ~60 actuales). No usar
  Testing porque sus refresh tokens expiran a los 7 días.
- Implementación Google completada en código: modelo `SearchIntegration` estrictamente por
  `userId`+proveedor, tokens cifrados, campos de estado Google en `Title`,
  callbacks OAuth con estado CSRF, listado/validación de propiedades del
  usuario, selector de propiedad+sitemap en Configuración y hook del worker
  que reenvía el sitemap tras publicar sin convertir fallos de Google en fallo
  del artículo. También se añadieron los secretos Google al entorno del
  workflow del worker. Prisma format/generate, Prettier de TS/Markdown,
  `tsc --noEmit` para web y worker y ambos builds terminaron correctamente.
  La migración está creada pero todavía no aplicada ni desplegada; falta crear
  el cliente OAuth real y cargar sus secretos antes de habilitar la conexión.

## Pendiente / próximos pasos

1. En Google Auth Platform configurar Público externo, alcance
   `https://www.googleapis.com/auth/webmasters`, publicar en Production y crear
   el cliente web con callback
   `https://auto-articulos-web.vercel.app/api/search-integrations/google/callback`.
   Guardar ID/secreto en Vercel y GitHub sin pegarlos en archivos ni chat.
2. Aplicar la migración `20260731210000_add_google_search_console`, desplegar
   web+worker y validar solamente el login OAuth y listado de propiedades; no
   disparar una publicación automática.
3. Implementar Bing después de cerrar y validar Google.
4. Corregir el registro de usuario cuyo correo aparece con el prefijo
   accidental `Ahora :` en la pestaña de accesos y en uso de base de datos.
5. Confirmar operativamente que los usuarios recién creados guarden sus
   propias credenciales de 10minutesWebsite y sincronicen categorías (esto
   es trabajo de cada usuario final, no de código).
6. `CODEX_PROMPT.md` y este `HANDOFF.md` ya quedaron commiteados en git por
   Codex (antes eran solo locales) — ya no hay riesgo de perderlos si se
   borran del disco, están en el historial de `main`.
7. **Verificar que el rollout de los 5 shards (ítem 18) funcione como se
   espera** en la próxima corrida real: confirmar con
   `gh run list --workflow=worker.yml` que aparecen 5 jobs paralelos por
   corrida, y que el `CategorySyncJob` pendiente de Lizzammar Oropeza
   (`lizzaoropezarealtor@gmail.com`) termina en `success` o `error` en vez
   de quedar `pending`.
   Si algo falla, `reservation.ts`/`run-once.ts` son los archivos a revisar
   primero.

## Reglas y preferencias del usuario (NO ignorar)

- **El usuario prueba, la IA no.** Nunca disparar corridas de prueba de la
  automatización de publicación por iniciativa propia. Sí está bien:
  desplegar, hacer diagnósticos de solo-lectura, revisar logs.
- Nunca `git add -A` ni `git add .` — el directorio de trabajo también tiene
  `PRD_CALCULADORA_ROGE.md` y `calculadora-roge/`, un proyecto no relacionado
  del usuario que nunca debe tocarse ni incluirse en commits. Usar siempre
  rutas de archivo explícitas.
- Nunca `git commit --amend` salvo pedido explícito — siempre commits nuevos.
- Presupuesto: $0 salvo Supabase Pro (ya pagado) y OpenAI API. No asumir
  presupuesto ilimitado para otras cosas sin preguntar.
- Comunicación: directa, sin rodeos, corrige rápido si algo no es lo pedido.
  Prefiere que se investigue con evidencia real (logs, gráficas) antes de
  dar diagnósticos especulativos.
- Verificar en el navegador los cambios de UI antes de darlos por buenos
  cuando sea posible.
- Formatear y correr `tsc --noEmit` (en `apps/web` y `apps/worker` según
  corresponda) antes de cada commit.
- Después de cada push a `main`, correr `cd apps/web && npx vercel --prod --yes`
  manualmente — el push por sí solo no despliega.
- Mantener este HANDOFF.md actualizado al final de cada sesión de trabajo
  importante (pedido explícito, ver también `CODEX_PROMPT.md`).
- No guardar el contenido de los artículos en la base de datos — solo
  título, resumen corto, URL y estado. Mantener la base lo más liviana
  posible (limpieza automática de eventos de log viejos ya implementada en
  `apps/worker/src/cleanup.ts`).

## Patrón: endpoint admin temporal (para llegar a producción sin `vercel env pull`)

Para tareas puntuales contra la base de producción (resets, migraciones
manuales, altas masivas):

1. Crear una ruta API temporal admin-gated (usa `requireAdmin()` de
   `apps/web/src/lib/current-user.ts`).
2. Deploy (`vercel --prod --yes`), llamar con `curl` usando una cookie de
   sesión admin válida, confirmar resultado.
3. Borrar el archivo de la ruta, commit, deploy de nuevo. No dejar estos
   endpoints en producción.

Excepción permanente e intencional: `GET /api/admin/inspect-runs` (solo
lectura, admin-gated) — se dejó a propósito para poder revisar el historial
de cualquier usuario sin pedirle capturas de pantalla.

Para backfills de datos (no requieren exponer un endpoint HTTP), es más
simple correr un script `node -e "..."` local usando `@prisma/client` con
`DATABASE_URL` apuntando al transaction pooler de producción — así se hizo
para teléfono y nombre/apellido de los 42 usuarios bulk-creados.
