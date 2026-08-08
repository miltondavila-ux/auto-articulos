# HANDOFF — Auto Artículos

Última actualización: 2026-08-07, por Antigravity (Arquitecto Principal del Sistema).

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

- **Principio Cloud 100% (Independencia de máquina local)**: Todo el código fuente, configuración, workflows y documentación residen exclusivamente en **GitHub** (`https://github.com/miltondavila-ux/auto-articulos.git`). La computadora del usuario **no procesa ni aloja nada**; la plataforma se ejecuta 100% en la nube (Vercel + GitHub Actions + Supabase Pro).
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
20. **Límite diario real de 10minutesWebsite detiene TODO el lote de
    inmediato** (`DailyLimitReachedError` en `10minutesWebsite.ts`,
    manejado en `queue.ts`): se confirmó en vivo (cuenta de Lizzammar
    Oropeza) que el sitio muestra el texto exacto "Se alcanzó el límite
    diario de creación de artículos. Solo puedes crear 10 artículos al
    día." — antes cada título restante del lote reintentaba contra ese
    mismo límite (hasta `MAX_ATTEMPTS` cada uno), desperdiciando turnos del
    worker que podían usar otros usuarios. Ahora, al detectar ese mensaje
    exacto (no una hipótesis), se detiene TODO el lote de una vez —mismo
    tratamiento que credenciales faltantes— con un mensaje que incluye el
    enlace real de servicio al cliente
    (`https://www.10minuteswebsite.com/ayuda`).
21. **Verificación en vivo del rollout de 5 shards (31/7/2026, ~21:47)**:
    el usuario ya había solicitado a soporte de 10minutesWebsite que le
    quitaran el límite de 10/día a la cuenta de Lizzammar Oropeza. Con el
    código viejo (2 lanes en un solo proceso) el lote de Milton
    (`miltondavila@gmail.com`, 9 títulos) estuvo **11 minutos sin ningún
    intento** porque ambos lanes quedaron ocupados procesando el lote
    grande de Lizzammar (que subió de 10 a 20 artículos exitosos al
    quitarle el límite). El cron de GitHub además se demoró varios minutos
    en disparar la primera corrida con el código nuevo (demora ya conocida
    del lado de GitHub) — se disparó manualmente con
    `gh workflow run worker.yml` para destrabarlo (no es una prueba de
    publicación, procesa trabajo real ya pendiente). Confirmado con
    `gh run view <id>`: la corrida mostró los **5 jobs `procesar (1..5)`
    corriendo en paralelo**; el lote de Milton pasó de 0 a 8/9 publicados en
    pocos minutos y el de Lizzammar terminó 20/20 en éxito. Sin errores en
    ningún shard (solo una advertencia inofensiva de GitHub sobre Node 20
    deprecado en los runners, no afecta el funcionamiento).
22. **Ejecución y Monitoreo del Worker en GitHub Actions (7/8/2026)**: Antigravity verificó la corrida activa de GitHub Actions (`worker.yml`, Run ID `31227842921`), levantada automáticamente con los **10 shards paralelos (`procesar 1..10`)** procesando el trabajo pendiente en la base de datos de producción.
23. **Respaldo Total del Proyecto en GitHub (7/8/2026)**: Antigravity respaldó y sincronizó el 100% de los archivos locales en la rama `main` de GitHub (`https://github.com/miltondavila-ux/auto-articulos.git`), incluyendo archivos pendientes. Estado verificado: `working tree clean`.
24. **Exclusión Estricta de Calculadora Roge (7/8/2026)**: Por confirmación explícita del usuario de que Calculadora Roge no pertenece al proyecto Auto Artículos, se eliminaron inmediatamente sus archivos del seguimiento de git (`git rm --cached`) y del repositorio de GitHub, y se agregaron permanentemente a `.gitignore`.
25. **Fase Redes Sociales: Integración de Meta Threads API (7/8/2026)**: Antigravity diseñó e implementó la arquitectura de integración con Meta Threads API v1.0. Incluye modelo `ThreadsIntegration` en Prisma, cifrado AES-256-GCM para Long-Lived Tokens (60 días con autorrefresco), API endpoints `/api/search-integrations/threads`, flujo OAuth 2.0, tarjeta UI `ThreadsSection` en Configuración -> Integraciones y hook no-bloqueante de publicación automática de Hilos en el Worker (`notifyThreads`).
26. **Gestor de Configuración General de Llaves de API (7/8/2026)**: Antigravity creó el modelo `SystemSetting` en Prisma para almacenar las llaves de aplicación de APIs (ej. `THREADS_APP_ID`, `THREADS_APP_SECRET`) cifradas con AES-256-GCM directamente en la base de datos, permitiendo al usuario/administrador ingresar sus credenciales globales desde la interfaz gráfica sin necesidad de modificar variables de entorno en Vercel.

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
  La migración quedó aplicada en producción (confirmado operativamente porque
  OAuth persistió la integración de Lorena).
- Google Auth Platform quedó como app externa en Production con scope
  `webmasters`. El cliente OAuth definitivo tiene el origen y callback de
  producción. Un secreto anterior apareció en una captura y se descartó; el
  usuario creó un tercer cliente limpio y descargó su JSON. Sus credenciales
  se cargaron directamente como secretos cifrados en Vercel Production y
  GitHub Actions, sin imprimirlos ni copiarlos al repo. Deploy confirmado:
  `dpl_H3bRf2vBJETpmUX2pz192PwYzdu7`.
- `lorenalvarez30@gmail.com` completó OAuth correctamente. Esto valida la
  separación por usuario, callback, cifrado y persistencia. Falta que Lorena
  elija su propiedad y sitemap.
- Aclaración solicitada por el usuario: el flujo manual más rápido es
  Inspeccionar URL → Probar URL publicada → Solicitar indexación, pero Google
  no expone por API la prueba publicada ni el botón Solicitar indexación para
  artículos normales. Se implementó el máximo flujo oficial: tras publicar,
  reenviar sitemap, consultar automáticamente el estado individual con URL
  Inspection API y guardar el resultado; Inicio e Historial muestran
  “Actualizar estado” y un acceso directo a Search Console para que el usuario
  pulse manualmente Solicitar indexación. No se usa Indexing API porque Google
  la restringe a `JobPosting`/`BroadcastEvent`. Validado con Prettier,
  `tsc --noEmit` y builds completos de web/worker. Commit `4641960`, push a
  `main` y deploy Vercel `dpl_3T67yEFLhWoPAMBb1GUTCbEK4uLC` completados.
- Diagnóstico de `mariodavila@gmail.com` solicitado inmediatamente después:
  workflow temporal de solo lectura confirmó en la base real del worker que
  no está bloqueado por el sistema (`workerBusyUntil = null`), tiene una
  credencial, 4 categorías y límites internos 300/mes y 95/día. Su corrida
  más reciente quedó `halted` porque 10minutesWebsite devolvió explícitamente
  su límite externo de 10 artículos diarios. Un título quedó en error y los
  demás pendientes; reabrir ahora repetiría el mismo rechazo. Debe esperar al
  día siguiente o pedir a soporte de 10minutesWebsite que retire el límite de
  esa cuenta del programa. No se modificaron sus datos ni se disparó el worker.
  El workflow diagnóstico se eliminó después de obtener evidencia.
- Rediseño de escalabilidad solicitado después de observar a
  `lorenalvarez30@gmail.com` esperando demasiado: el esquema de 5 shards × 2
  lanes solo podía publicar para 10 usuarios simultáneos, examinaba únicamente
  los primeros 20 runs y cada lane ocioso moría después de 1.5 segundos. Si
  llegaban usuarios mientras el workflow seguía activo, `triggerWorkerNow()`
  evitaba otra corrida pero la capacidad ya apagada no regresaba, creando cola.
  Nueva arquitectura preparada: **10 shards × 4 lanes = 40 usuarios publicando
  simultáneamente**, 1 lane de categorías por shard, hasta 100 runs candidatos
  y lanes vivos/polling cada 5 s durante todo el presupuesto de 18 min. Solo el
  shard 1 ejecuta mantenimiento para evitar 10 limpiezas duplicadas. El repo es
  público: runners estándar gratis; GitHub Free permite 20 jobs concurrentes,
  usamos 10 y dejamos margen. Entregado en commit `90b0b16` y deploy Vercel
  `dpl_WZah6vUN2eB4JpQLBF2B15ApuNjT`. Validación real de infraestructura en la
  primera corrida automática nueva `30670137653` (schedule, SHA `90b0b16`):
  se levantaron los 10 shards y los diez alcanzaron simultáneamente el paso
  `Procesar trabajo pendiente`. Codex no disparó el worker ni creó una
  publicación; se avisó al usuario que ya podía ejecutar su prueba.

## RESUELTO (1/8/2026): bug del schema FAQ en Google Search Console

**Estado: resuelto y confirmado por el usuario en producción** (ver sección
"RESUELTO" más abajo). Se deja toda la investigación documentada porque
explica una lección importante sobre el campo Widget de 10minutesWebsite que
puede ser relevante para futuras integraciones con ese campo.

### Qué pasó

El usuario reportó que Google Search Console marca "Detectados errores de
sintaxis en los datos estructurados" / "Falta el carácter '}' o el nombre del
miembro del objeto" en artículos publicados. Se confirmó que es el **schema
FAQ** (`apps/worker/src/automation/10minutesWebsite.ts`, antes
`fillFaqWidget`/`buildFaqSchema`), no otra cosa — el usuario probó quitando el
FAQ del campo Widget de un artículo y la validación pasó limpia.

### Causa raíz confirmada con evidencia directa (no es una hipótesis)

1. Nuestro código genera JSON-LD válido: `JSON.stringify(schema)` con comillas
   dobles, verificado.
2. En la página PÚBLICA, el schema aparece con comillas simples:
   `{'@context':'https://schema.org',...}` — JSON inválido (las comillas
   simples no existen en la gramática JSON).
3. **Prueba decisiva del usuario**: abrió el artículo para EDITAR en
   10minutesWebsite (no la página pública) y miró qué hay GUARDADO en el campo
   "Widget (opcional)" (`#widgetcode`). Ya estaba con comillas simples ahí
   también — incluso el propio `<script type='application/ld+json'>` (su
   atributo `type`) apareció con comillas simples, cuando nosotros mandamos
   `type="application/ld+json"` con comillas dobles.
4. Conclusión: **10minutesWebsite convierte TODAS las comillas dobles (`"`,
   U+0022) en comillas simples (`'`, U+0027) al GUARDAR ese campo específico**
   — es una transformación de texto plano, ciega (no distingue JSON de HTML
   de nada), aplicada a absolutamente todo lo que se guarda en el Widget. No
   importa si lo llena Playwright o un humano a mano: el daño ya está en el
   valor persistido, antes de que la página se renderice.
5. Por qué es imposible arreglarlo mandando JSON de otra forma: JSON exige
   comillas dobles literales para sus delimitadores, sin excepción ni
   alternativa (a diferencia de HTML, que acepta comillas simples o dobles
   indistintamente en atributos). Si el campo destruye el 100% de las
   comillas dobles que le llegan, no existe ninguna forma de codificar JSON
   válido a través de él — probar con entidades HTML (`&quot;`) tampoco
   sirve, porque el contenido de un `<script>` es "raw text": el navegador
   (y el parser de Google) NO decodifica entidades ahí, así que
   `&quot;` llegaría literal, igual de inválido.

### Alternativas consideradas y descartadas

- **Reportar el bug a soporte de 10minutesWebsite**: sigue siendo válido
  hacerlo (afecta a cualquiera que use ese campo con comillas dobles: JSON,
  ciertos atributos, algunos snippets de JS), pero no es una solución
  inmediata — depende de que ellos lo arreglen.
- **Microdata en vez de JSON-LD** (atributos HTML tipo `itemscope
itemtype="https://schema.org/FAQPage"`): sobrevive a la conversión de
  comillas porque HTML no exige un tipo de comilla específico. PERO Microdata
  solo es legítimo para Google si anota contenido que el usuario **ve** en la
  página — ocultarlo (como pidió el usuario originalmente) podría leerse como
  contenido oculto manipulador y arriesgar TODO el sitio, no solo el FAQ. El
  usuario, al preguntársele, **descartó (dismissed) la pregunta** de si
  quería hacerlo visible — no se implementó.
- **Dejar el FAQ pausado indefinidamente**: el usuario explícitamente NO
  quiso esto como solución final, pidió seguir buscando un arreglo real.

### Solución que se está probando ahora mismo (en curso, sin confirmar)

**Idea**: en vez de mandar el JSON-LD directo por el campo Widget, mandar un
`<script>` (SIN `type="application/ld+json"`, o sea JavaScript normal y
ejecutable) que construya el schema EN TIEMPO DE EJECUCIÓN en el navegador
con `JSON.stringify()`, y lo inyecte dinámicamente como un
`<script type="application/ld+json">` nuevo en el `<head>`. Por qué debería
funcionar:

1. El código fuente que mandamos usa comillas invertidas (backticks, `` ` ``)
   para el texto de las preguntas/respuestas y comillas simples para las
   claves de JS (`'@context'`, etc.) — NINGÚN carácter `"` literal en todo el
   snippet, así que la conversión ciega de 10minutesWebsite no tiene nada que
   tocar.
2. JavaScript acepta comillas simples, dobles o invertidas indistintamente
   para sus propios string literals — a diferencia de JSON, no le importa el
   estilo de comilla. Aunque 10minutesWebsite mangle algo, seguiría siendo JS
   válido.
3. `JSON.stringify()` se ejecuta EN EL NAVEGADOR del visitante/rastreador, y
   SIEMPRE produce JSON con comillas dobles correctas, sin importar cómo
   estaba escrito el código fuente que lo generó.
4. Googlebot SÍ ejecuta JavaScript al rastrear (es un hecho documentado por
   Google, no una suposición) y SÍ recoge JSON-LD inyectado dinámicamente al
   DOM — es un patrón oficialmente soportado, no un truco cuestionable.
5. Sigue siendo invisible en la página (es solo ejecución de script, no
   agrega HTML visible) — cumple el requisito original del usuario.

**Snippet exacto que se le dio al usuario para probar manualmente** (pegado
en el campo Widget del artículo
`https://www.segurosdesaludyvida.com/noticias/acceso-a-obamacare-para-personas-con-discapacidad`,
reemplazando el JSON-LD roto que ya estaba ahí):

```html
<script>
  (function () {
    var faqs = [
      [`pregunta 1`, `respuesta 1`],
      [`pregunta 2`, `respuesta 2`],
      // ... (backticks para CADA pregunta/respuesta, ver el commit o el chat
      // para el snippet completo con las 5 preguntas reales de ese artículo)
    ];
    var schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(function (pair) {
        return {
          "@type": "Question",
          name: pair[0],
          acceptedAnswer: { "@type": "Answer", text: pair[1] },
        };
      }),
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.text = JSON.stringify(schema);
    document.head.appendChild(s);
  })();
</script>
```

### RESUELTO (1/8/2026) — confirmado por el usuario en producción

El usuario pegó manualmente ese snippet en el Widget del artículo real y
volvió a probarlo en Google Search Console: **"esto funcionó perfectamente"**
— ya no marca error de sintaxis. Con esa confirmación se portó la misma
lógica al código:

- `apps/worker/src/automation/10minutesWebsite.ts`: `buildFaqSchema()`
  reescrita para generar el `<script>` JS auto-inyector (con backticks para
  el texto de cada pregunta/respuesta) en vez del JSON-LD directo. Se agregó
  `escapeForTemplateLiteral()` para escapar backslash/backtick/`${` por si
  el contenido generado por IA llegara a incluir alguno de esos caracteres
  (el snippet de prueba manual no tenía este escape porque las 5
  preguntas/respuestas de ese artículo puntual no lo necesitaban).
- La llamada `await fillFaqWidget(...)` en `publishArticle()` está
  **reactivada** (ya no comentada) — el FAQ vuelve a generarse en todos los
  artículos nuevos, ahora con el formato correcto.
- Probado en aislado con `vm.runInNewContext` simulando `document`/
  `JSON.stringify` antes de confiar en el fix, incluyendo casos límite
  (texto con backtick, `${...}`, comillas dobles y backslash) — el script
  se ejecuta sin errores de sintaxis y produce JSON válido en todos los
  casos. `tsc --noEmit` limpio.
- **VERIFICADO EN PRODUCCIÓN (1/8/2026 ~16:29 UTC), confirmado por el
  usuario en Search Console ("ahora sí funcionó")**: artículo
  `https://www.segurosdesaludyvida.com/noticias/como-calificar-para-obamacare-como-inmigrante`,
  publicado por el worker automáticamente (no pegado a mano) con el commit
  `a7a2f42`. Chequeado también del lado del código: el script inyectado en
  el `<head>` tiene comillas dobles correctas
  (`{"@context":"https://schema.org",...}`) y `JSON.parse()` lo valida sin
  error. **El fix funciona end-to-end con Playwright, no solo con el pegado
  manual del usuario — queda cerrado.**
  - Nota de timing (ya documentada en otros lados de este archivo, se repite
    porque volvió a pasar acá): los primeros artículos publicados justo
    después del push (`como-encontrar-medicos-y-hospitales-en-florida`,
    procesado 16:19:46 UTC) todavía salieron con el bug viejo, porque la
    corrida de GitHub Actions que los procesó había arrancado a las
    16:05:17 UTC — 9 minutos ANTES de que el commit `a7a2f42` (16:14:07 UTC)
    quedara pusheado. Una corrida en curso sigue usando el código que tenía
    al arrancar. Si se ve el bug viejo justo después de un fix, confirmar
    con `gh run list --workflow=worker.yml` (columna `headSha` vs. hora del
    commit) antes de asumir que el fix no sirvió.

**189 artículos viejos con el FAQ roto** (schema activo desde el 29/7/2026,
25 runs/usuarios distintos): el usuario decidió explícitamente **dejarlos
así por ahora** (no es grave — Google solo ignora el schema roto, no
penaliza el posicionamiento). No se construyó ningún script de limpieza
masiva. Si en el futuro se quiere limpiar esos 189 (o republicar su FAQ con
el formato nuevo), sería una tarea aparte: visitar cada artículo por su URL
de edición en 10minutesWebsite y reemplazar el contenido del campo Widget —
a construir con cuidado y probar en 1 solo artículo antes de correrla en los 189.

## RESUELTO (1/8/2026): sitemap de Google se enviaba una vez POR ARTÍCULO en vez de una vez por lote

Pedido explícito del usuario: si un lote publica 9 artículos, no tiene
sentido reenviar el mismo sitemap del sitio 9 veces seguidas (Google igual
lo rastrea una sola vez y descubre las 9 URLs nuevas) — solo gasta cuota de
la API de Search Console de más.

- `apps/worker/src/googleIndexing.ts` (`notifyGoogle()`): ahora solo llama
  `submitGoogleSitemap()` si NINGÚN OTRO título del mismo `runId` ya tiene
  `googleIndexingAt` seteado (o sea, es el primero de ese lote en pasar por
  acá). La consulta de indexación por URL (`inspectGoogleUrl`) SÍ se sigue
  haciendo por cada artículo — eso es legítimamente por-URL, no redundante.
  No hizo falta ninguna migración nueva (se detecta consultando los títulos
  del mismo run, no un campo nuevo).
- `apps/worker/src/queue.ts`: `notifyGoogle()` ahora recibe también `run.id`.
- `apps/web/src/components/GoogleIndexingStatus.tsx`: se agregó un check
  separado y explícito — **"✓ Sitemap enviado a Google" / "✗ Sitemap no
  enviado"** — distinto del check de "✓ Indexada en Google" que ya existía
  (son objetivos distintos: uno es "se lo avisamos a Google ya", el otro es
  "Google ya terminó de indexarla", que puede tardar días y no depende de
  nosotros). Pedido explícito del usuario: quería ver un check por artículo
  confirmando que el objetivo del envío de sitemap se cumplió.
- `tsc --noEmit` limpio en `apps/worker` y `apps/web`. **No se verificó
  visualmente en el navegador ni con un artículo real nuevo** (cuota de la
  sesión se agotó justo después de implementar) — pendiente de confirmar
  con el próximo artículo real que se publique.
- **RESUELTO (1/8/2026, tarde)**: el token de Vercel CLI había vencido
  (`Error: The specified token is not valid`). El usuario corrió
  `npx vercel whoami` (que disparó un login por device-code) y quedó
  autenticado de nuevo como `miltondavila-6917`. Con eso se desplegó
  `dpl_CTeyXid3N8wQNXyzHmN9REokezEz`, incluyendo el check visible "✓
  Sitemap enviado a Google" (`GoogleIndexingStatus.tsx`) y el mensaje claro
  de "Google Search Console no está conectado" para el caso `not_configured`
  (ver más abajo). Ya no está bloqueado.
- **Bug encontrado y corregido en el camino (1/8/2026)**: un usuario
  (`gestions.pascual@gmail.com`) tenía el email guardado como
  `"Ahora : gestions.pascual@gmail.com"` — un error de tipeo en la planilla
  original de alta masiva que le rompía el login (email inválido). Corregido
  directo en producción con un script puntual. Se escaneó el resto de los
  usuarios por el mismo patrón (espacios o formato de email inválido) — no
  se encontró ningún otro caso.
- **Causa raíz real del caso mostrado por el usuario** (artículo de
  `segurosdesaludyvida.com` con "✗ Sitemap no enviado" y el enlace de Search
  Console que "no llevaba a nada"): esa cuenta específica **todavía no tiene
  conectada una propiedad de Google Search Console** —
  `googleIndexingStatus` = `"not_configured"`, no un bug. Antes el mensaje no
  lo explicaba (mostraba la misma cruz roja que un error real, y el enlace
  caía genérico a la página de inicio de Search Console porque sin
  `siteUrl` no tenía a dónde apuntar). Ahora el mensaje dice claramente
  "Google Search Console no está conectado para esta cuenta" con un enlace
  directo a Configuración. **Sigue pendiente que cada dueño de cuenta
  conecte su propia cuenta de Google una vez** (acción de cada usuario, no
  de código — ver ítem 2 de "Pendiente" más abajo).

## RESUELTO (1/8/2026): máximo de títulos por lote configurable por usuario

Pedido del usuario: reemplazar el máximo fijo global de 20 títulos por un
valor que el administrador pueda configurar para cada cuenta, conservando 20
como predeterminado y validándolo obligatoriamente en servidor tanto desde
Publicar como desde Oportunidades.

- `User.maxTitlesPerBatch Int @default(20)` agregado al schema y nueva
  migración `20260801190000_add_max_titles_per_batch`. La columna es obligatoria
  y la migración asigna 20 a todos los usuarios existentes.
- Administración de Usuarios permite indicar el máximo al crear una cuenta y
  modificarlo después en la tabla de accesos. La API acepta únicamente enteros
  positivos; no confía en las restricciones del campo HTML.
- `POST /api/runs` obtiene el máximo del usuario autenticado y rechaza en el
  servidor cualquier lote de Publicar que lo supere. La pantalla Publicar carga
  el valor real mediante `/api/me`, lo muestra en el contador y desactiva el
  botón cuando corresponde.
- `POST /api/opportunities/execute` aplica la misma validación antes de crear un
  `Run`. Oportunidades muestra el máximo real y desactiva la ejecución completa
  de una categoría cuando contiene demasiados títulos; los títulos individuales
  siguen disponibles si el máximo es al menos 1.
- Verificaciones locales completadas: Prisma format/generate, Prettier de las
  rutas explícitas modificadas, `npx tsc --noEmit` limpio en web y worker, y
  build completo de Next.js exitoso. No se disparó el worker, no se ejecutó una
  oportunidad y no se publicó ningún artículo.
- Entrega completada en commit `9cf7785`, pusheado a `main`. La migración se
  aplicó correctamente en producción mediante GitHub Actions
  (`30711443186`, conclusión `success`) y asignó 20 a las cuentas existentes.
  Vercel desplegó el cambio junto con la detección automática de sitemap que
  Claude había dejado pendiente: deployment
  `dpl_D56uMg9asdwF6ozSuccNEKDv7RSk`, estado `READY`, alias
  `https://auto-articulos-web.vercel.app`.
- No se probó creando un lote ni ejecutando Oportunidades, porque ambas acciones
  podrían disparar la publicación real. Esa validación funcional queda para el
  usuario; las verificaciones de schema, tipos, build, migración y deployment sí
  quedaron completas.

## RESUELTO (1/8/2026): creación completa de usuarios

Pedido del usuario: corregir el formulario de creación administrativa, que solo
mostraba nombre, correo, contraseña y máximo por lote, para que permita definir
desde el alta todos los datos de la cuenta.

- El formulario de Administración → Creación de usuarios ahora incluye nombre,
  apellido, teléfono, correo electrónico, contraseña temporal, rol
  Usuario/Administrador, límite mensual, límite diario y máximo de títulos por
  lote.
- Los valores iniciales conservan las reglas vigentes: rol Usuario, 300
  artículos mensuales, 95 diarios y 20 títulos por lote. El formulario se
  limpia y restablece esos valores después de una creación exitosa.
- `POST /api/admin/users` valida también en servidor que nombre, apellido,
  teléfono y correo estén presentes, que el correo tenga formato válido, que el
  rol sea exclusivamente `user`/`admin`, que los límites sean enteros no
  negativos y que el máximo por lote sea un entero positivo. No se confía solo
  en los campos HTML.
- La cuenta se guarda desde el inicio con nombre combinado compatible,
  nombre/apellido separados, teléfono, rol y los tres límites seleccionados. No
  hizo falta migración porque todos esos campos ya existen en `User`.
- Prettier, TypeScript y build completo de Next.js terminaron correctamente. No
  se creó ningún usuario real durante las pruebas.
- Commit `6508de2` pusheado a `main`; deployment Vercel
  `dpl_8JbECg94AfFV5mechnCYR1UDPids` en estado `READY` y asociado al alias de
  producción.

## RESUELTO (1/8/2026): auditoría integral y limpieza conservadora

Pedido del usuario: auditar todo el código, retirar elementos sin uso y código
basura sin romper el comportamiento productivo.

- Se revisaron los 64 módulos TypeScript/TSX, rutas Next, worker, paquetes
  compartidos, manifests, configuraciones, workflows y activos rastreados. Knip
  y Depcheck quedaron sin archivos, exports ni dependencias sin uso; Madge no
  encontró dependencias circulares.
- Se eliminó el único export público innecesario
  (`OpportunityAnalysisGroup`, que solo se usa dentro de su módulo) y el script
  roto `next lint`, retirado por Next 16. Se sustituyó por un comando funcional
  `typecheck`.
- Los cuatro proyectos TypeScript ahora activan `noUnusedLocals` y
  `noUnusedParameters`, de modo que el build rechazará nuevo código muerto en
  web, worker, db y shared.
- Se consolidaron reglas redundantes de `.gitignore`, manteniendo
  `.env.example` rastreable; el ejemplo de entorno se actualizó con todas las
  variables realmente usadas y se retiró la referencia obsoleta a Neon.
- Se corrigió el comentario contradictorio del endpoint administrativo
  permanente de diagnóstico y se agregó `metadataBase` al layout raíz, quitando
  las advertencias de metadatos sociales del build sin alterar rutas ni UI.
- No se borraron rutas, migraciones, activos ni infraestructura: la auditoría
  confirmó que están referenciados o tienen una función operativa/documental.
  Tampoco se tocaron datos ni se ejecutaron publicaciones, análisis SEO o envíos
  de sitemap.
- `npm audit` reporta tres avisos altos transitivos de `postcss`/`sharp` a través
  de la versión más reciente disponible de Next (`16.2.12`). La única corrección
  automática propuesta fuerza un downgrade incompatible a Next 9; no se aplicó
  para cumplir la instrucción de no romper producción. Debe revisarse cuando
  Next publique una versión compatible corregida.
- Verificación final: Prettier; TypeScript limpio en web, worker, db y shared;
  builds completos de web/worker; Knip sin hallazgos; Depcheck sin hallazgos;
  Madge sin ciclos; build Vercel con las 29 rutas correcto y sin la advertencia
  anterior de `metadataBase`. Commit `d12fc7a` pusheado a `main` y deployment
  `dpl_FAWT9PFAN5zVWNcoE4hR3smRBce9` en estado `READY`, asociado al alias de
  producción.

## RESUELTO (1/8/2026): envío diario centralizado de sitemaps

Pedido del usuario: dejar de enviar el sitemap después de cada artículo o
categoría y enviar, una vez al día alrededor de las 12:00 a. m., los sitemaps de
todos los usuarios a sus respectivas cuentas de Google Search Console.

- `notifyGoogle()` ya no llama a `submitGoogleSitemap()`: después de publicar un
  artículo conserva únicamente la inspección individual de su URL. Esto aplica
  igual a títulos creados desde Publicar y desde Oportunidades, porque ambos
  terminan en la misma cola del worker.
- Nuevo ejecutor `send-daily-sitemaps.ts`: consulta todas las integraciones
  Google con propiedad y sitemap configurados, renueva el token OAuth de cada
  usuario y envía cada sitemap. Trabaja en grupos de cinco; un fallo individual
  queda registrado y no impide procesar las demás cuentas.
- Nuevo workflow `daily-sitemaps.yml`, separado del worker de publicaciones y
  sin Playwright. Tiene horarios 04:00/05:00 UTC y comprueba el desfase de
  `America/New_York`, por lo que solo uno corre a la medianoche correcta tanto
  en horario de verano como de invierno. También admite ejecución manual para
  diagnóstico explícito.
- La UI ya no afirma que el sitemap se envió por artículo: ahora explica que el
  sitemap tiene envío diario a las 12:00 a. m. y mantiene separado el estado de
  indexación de cada URL.
- Verificaciones completadas: Prettier, `tsc --noEmit` en web y worker, builds
  completos de ambos proyectos y prueba de las cuatro combinaciones de cron y
  desfase EDT/EST. No se ejecutó el proceso manualmente para no enviar sitemaps
  reales fuera del horario acordado y no se publicó ningún artículo.
- Commit `0ddc029` pusheado a `main`. GitHub reconoció el workflow **Envío
  diario de sitemaps** con ID `325202521`; todavía tiene 0 ejecuciones, como se
  esperaba, porque no se disparó manualmente. La actualización web quedó en
  producción mediante Vercel `dpl_2mdKZNS4z6iAQgRFoC8krwUaBrbt` (`READY`).

## RESUELTO (1/8/2026): Usuarios se convierte en Administración

Pedido del usuario: renombrar visualmente el módulo **Usuarios** como
**Administración** y convertir la página en un dashboard moderno con
indicadores claros y accesos a sus tres áreas principales.

- La navegación superior ahora dice **Administración**. Se conserva la URL
  `/dashboard/usuarios` para no romper enlaces guardados ni accesos existentes.
- La página abre con un encabezado visual de centro de control y cuatro tarjetas
  de indicadores calculadas con los datos reales que ya cargan las APIs:
  usuarios totales/administradores, usuarios activos ahora, artículos publicados
  entre todas las cuentas y porcentaje/espacio disponible de la base de datos.
- Los tres botones pequeños se reemplazaron por tarjetas de navegación modernas,
  responsivas y accesibles para **Accesos a usuarios**, **Creación de usuarios**
  y **Uso de la base de datos**. La tarjeta activa queda diferenciada sin perder
  el contenido y las capacidades existentes de cada sección. Cada tarjeta abre
  su área y desplaza suavemente la vista hasta el contenido correspondiente.
- Verificaciones completadas: Prettier, `npx tsc --noEmit` en web y builds
  completos local/Vercel exitosos. Commit `8f74800` pusheado a `main` y
  deployment `dpl_F9HVraJCfuXkGj2ubCA8kWwd9AoT` en estado `READY`, asociado al
  alias `https://auto-articulos-web.vercel.app`.
- No fue posible hacer la inspección visual autenticada desde Codex porque el
  único navegador disponible no comparte la sesión del usuario. El build de
  producción y las rutas sí quedaron verificados; la revisión visual final
  corresponde a la sesión admin del usuario.

## RESUELTO (1/8/2026): roles administradores editables desde Usuarios

Pedido del usuario: desde `/dashboard/usuarios`, poder convertir otra cuenta
en Administrador para que vea y gestione las mismas secciones administrativas
que la cuenta principal.

- La columna **Rol** ahora contiene un selector `Usuario` / `Administrador` y
  un botón explícito **Guardar rol** para cada cuenta ajena. La pantalla explica
  que asignar Administrador concede acceso a las secciones administrativas.
- `PATCH /api/admin/users` acepta `role` únicamente con los valores reales del
  enum Prisma (`user` o `admin`) y sigue protegido por `requireAdmin()`, por lo
  que un usuario normal no puede promoverse a sí mismo llamando la API.
- La cuenta administradora conectada aparece marcada como **Tu cuenta** y no
  puede degradarse desde la interfaz. El servidor repite esa protección aunque
  alguien intente saltarse la UI, evitando perder accidentalmente el acceso
  administrativo.
- No hace falta migración: `User.role` y el enum `UserRole` ya existían. No se
  cambió el rol de ningún usuario durante el desarrollo.
- Verificaciones completadas: Prettier, `npx tsc --noEmit` en web y builds
  completos de Next.js local y Vercel exitosos. Commit `88f7265` pusheado a
  `main`; deployment `dpl_HZdrbWia3ZuHP8hPPdcQoTThGo2b` en estado `READY` y
  asociado al alias `https://auto-articulos-web.vercel.app`.
- No se cambió el rol real de ninguna cuenta durante la validación. El usuario
  puede hacerlo desde Usuarios → Accesos a usuarios → Rol → Guardar rol.

## RESUELTO (2/8/2026): servidor .net vs .site por usuario (fotos rotas en Europa)

Reportado por el usuario: usuarios europeos (ej. Lidia Capdevila) tienen su
cuenta real en `10minutesWebsite.site`, no `.net`. Artículo de ejemplo sin
foto:
`https://www.lidiacapdevila.com/noticias/estrategias-clave-para-invertir-en-propiedades-en-barcelona`
(`article-86920-1.webp?mtime=null` — imagen nunca guardada de verdad, aunque
el log decía "Imagen generada." sin error).

Causa raíz: `BASE_URL` estaba harcodeado a `.net` en
`apps/worker/src/automation/10minutesWebsite.ts`. El login y la creación de
artículo funcionan igual en ambos dominios, pero la imagen se ve bien en la
vista previa (dentro de la sesión `.net`) y nunca queda persistida en el
storage real cuando la cuenta vive en `.site`.

- `User.platformDomain String @default("net")` — migración
  `20260802200000_add_user_platform_domain`, aplicada en producción. Los 55
  usuarios existentes quedaron en `"net"` (sin cambio de comportamiento).
  Lidia se actualizó manualmente a `"site"`.
- `10minutesWebsite.ts`: `BASE_URL` fijo reemplazado por
  `resolveBaseUrl(platformDomain)`, pasado como parámetro a través de
  `publishArticle()`/`fetchCategories()` → `login()`/`createArticleDraft()`/
  `saveAndGetUrl()`. `TenMinutesWebsiteCredentials` ahora incluye
  `platformDomain?: string | null`.
- `queue.ts`/`categorySync.ts`: leen `user.platformDomain` (via `include`/
  query adicional) y lo pasan en las credenciales.
- Dropdown "Servidor de 10minutesWebsite" (`.net`/`.site`) en Administración
  → Creación de usuarios y en cada fila de Accesos a usuarios (guardado
  inmediato, mismo patrón que el selector de Rol).
- `tsc --noEmit` limpio en `apps/worker` y `apps/web`. Commit `aef65c2`
  pusheado y desplegado a Vercel Production.
- **Pendiente de confirmar**: que el próximo artículo real de Lidia (con
  `platformDomain = "site"`) publique la imagen correctamente. No se disparó
  ninguna publicación de prueba — corresponde al usuario.
- Si aparecen más usuarios europeos con el mismo síntoma (imagen con
  `mtime=null` en el HTML publicado), el arreglo es simplemente cambiarles
  el dropdown a `.site` desde Administración — no hace falta tocar código.

## RESUELTO (5-6/8/2026): sesión larga — sitemap real, Oportunidades, Bing, Business Profile

Sesión extensa, muchos pedidos encadenados. Resumen por tema. Todo verificado
con `tsc --noEmit` + build en ambos apps antes de cada deploy salvo que se
indique lo contrario.

### Estado de sitemap por artículo (real, no aspiracional)
- `SearchIntegration.lastSitemapSyncAt/Status/Error` — nuevos campos, migración
  `20260805220000_add_sitemap_sync_status`. `send-daily-sitemaps.ts` y el nuevo
  `POST /api/sitemap/send` (botón "Enviar sitemap ahora" en Configuración) los
  actualizan con el resultado REAL de cada intento.
- `GoogleIndexingStatus.tsx` (Inicio + Historial) muestra "✓ Sitemap enviado:
  fecha" o "todavía no confirmado", leyendo `Title.lastSitemapSentAt`.
- Se eliminó el mensaje estático "El sitemap se enviará en el próximo proceso
  diario programado" que `googleIndexing.ts` pegaba en TODOS los mensajes de
  indexación — era el origen real de la confusión reportada por el usuario.

### "Publicaciones en Curso" (nuevo ítem de menú)
- La vista de progreso en vivo (antes mezclada en Inicio) se extrajo a
  `apps/web/src/components/LiveRunProgress.tsx`, vive en
  `/dashboard/publicaciones-en-curso`. Publicar y Ejecutar (Oportunidades)
  redirigen ahí automáticamente; Inicio solo muestra un aviso corto con enlace.

### Oportunidades: aviso de divulgación con aceptación registrada
- `User.opportunitiesDisclosureAcceptedAt` (migración
  `20260805230000_add_opportunities_disclosure`) — aviso legal bloqueante la
  primera vez que se entra a Oportunidades (algoritmo automatizado + IA, sin
  responsabilidad del admin), fecha/hora exacta de aceptación registrada,
  visible también en Administración → detalle de usuario.

### Oportunidades: segmentación por cliente/ubicación/producto — Y el bug grave que causó
- Se agregó consulta adicional a Search Console por país
  (`queryGoogleSearchAnalytics(..., ["country"])`) para segmentar títulos por
  perfil de cliente/ubicación/producto (patrón "Cómo [producto] en [ciudad] si
  soy [perfil]").
- **BUG GRAVE encontrado por el usuario en la cuenta de Eira**: el modelo
  generaba una ciudad/estado de EE. UU. DISTINTA por título (Georgia, Texas,
  California, Nevada...) sin ninguna evidencia real — pura invención. Causa
  raíz: Search Console solo da país como dimensión (nunca ciudad/estado); el
  prompt pedía ubicación en todos los títulos sin exigir evidencia literal.
- **Arreglado en dos pasadas** (`apps/web/src/lib/opportunity-analysis.ts`):
  primero regla anti-invención específica de ubicaciones (nunca mencionar
  ciudad/estado/país que no aparezca LITERALMENTE en consulta/página/título
  real), después **generalizada a cualquier dato específico** (pedido
  explícito: "no podemos equivocarnos") — ingredientes, cifras, marcas,
  características, etc. también necesitan evidencia literal o se omiten.
  Incluye el ejemplo real del error como caso prohibido explícito en el
  prompt.
- **Pendiente para el usuario**: las categorías de Oportunidades generadas
  para Eira (y cualquier otro usuario) ANTES de este fix pueden tener
  ubicaciones inventadas — conviene "Eliminar categoría" y volver a analizar.
  No se tocaron datos de ningún usuario real por Claude.
- De paso se encontraron y arreglaron **bytes NUL reales** incrustados en ese
  mismo archivo (`row.keys.join(" ")` tenía un byte `0x00` en vez de espacio;
  git lo marcaba como binario). No rompía el build pero corrompía la
  comparación actual-vs-anterior. Escaneado todo `apps/`+`packages/`: fue el
  único archivo afectado.
- Enfriamiento de "no hay oportunidades nuevas" bajado de 7 a 3 días (pedido
  explícito) — `COOLDOWN_DAYS` en `apps/web/src/app/api/opportunities/route.ts`
  + texto correspondiente en `oportunidades/page.tsx`.

### Bing Webmaster Tools — integración completa, probada en producción
- OAuth paralelo a Google (`apps/web/src/lib/bing-oauth.ts`, scope
  `webmaster.manage`). Reutiliza el modelo `SearchIntegration` existente con
  `provider: "bing"` — no hizo falta modelo nuevo.
- `packages/shared/src/bing-webmaster.ts`: `listBingSites` (GetUserSites),
  `submitBingSitemap` (SubmitFeed), y **`submitBingUrl`** (SubmitUrl) — Bing sí
  permite indexación instantánea por URL (cupo real: 10,000/día por dominio),
  a diferencia de Google (Indexing API restringida a JobPosting/
  BroadcastEvent). Verificado contra documentación oficial de Microsoft.
- `apps/worker/src/bingIndexing.ts` (`notifyBing()`) llamado en `queue.ts`
  justo después de `notifyGoogle()`, apenas se confirma `articleUrl` real.
- Sección "Bing Webmaster Tools" en Configuración, mismo patrón conectar/
  elegir sitio que Google.
- **Probado en producción con la cuenta real de Lorena Álvarez
  (segurosdesaludyvida.com)**: OAuth, selección de sitio y envío de sitemap
  confirmados exitosos (`lastSitemapSyncStatus: "success"`). La indexación
  instantánea por artículo nuevo queda pendiente de confirmar con la próxima
  publicación real de esa cuenta.
- Credenciales OAuth (`BING_WEBMASTER_CLIENT_ID/SECRET`) registradas por el
  usuario en bing.com/webmasters → Settings → API Access, guardadas en Vercel
  (Production) y GitHub Actions secrets, wireadas en `worker.yml`.

### Google Business Profile — investigado, implementado, DESHABILITADO en UI hasta aprobación de Google
- Investigación exhaustiva contra documentación oficial (no asumida):
  `localPosts.create` SIGUE activo (contradice una suposición inicial de que
  Google lo restringió en 2024 — falso, verificado en vivo). Requiere
  aprobación previa de Google ("Basic API Access") a nivel de PROYECTO, no por
  usuario — una vez aprobado, cada usuario conecta su cuenta vía OAuth normal
  igual que Search Console.
- Implementación completa (asumiendo aprobación futura): modelos
  `BusinessProfileIntegration`/`BusinessProfilePost`, migración
  `20260805233000_add_business_profile`, `Title.summary` (nuevo, resumen real
  del artículo capturado al publicar), OAuth connect/callback, selector de
  ubicación, worker lane `businessProfilePublish.ts` que genera resumen
  adaptado por IA (hasta 1500 caracteres) + imagen con OpenAI (`gpt-image-1`,
  mismo prompt que ya usa 10minutesWebsite) subida a **Vercel Blob** (store
  nuevo `auto-articulos-business-profile`, público) + `createLocalPost` con
  CTA al artículo real.
- **El botón "Conectar Google Business Profile" está deshabilitado (gris) en
  Configuración a propósito** — pedido explícito porque usuarios lo tocaban y
  no funcionaba (Google no ha aprobado el acceso todavía). Reactivar en
  `BusinessProfileSection.tsx` cuando llegue la aprobación.
- **Solicitud de acceso ya enviada a Google**
  (`support.google.com/business/contact/api_default`, "Application for Basic
  API Access"), usando la cuenta/sitio propios del usuario
  (`10minutesWebsite.com`, confirmado por el usuario como su negocio propio
  verificado) como caso calificador. Plazo esperado: 7-10 días hábiles (puede
  variar). Nada más que hacer hasta que Google responda — al aprobar, falta:
  habilitar la 8va API ("Google My Business API", oculta hasta aprobación) y
  probar publicación real con un usuario de prueba.

### Incidente: `apps/web/.env.local` sobreescrito por accidente
- `vercel blob create-store ... --yes` (para el store de Business Profile)
  **sobreescribió `.env.local` completo**, borrando `DATABASE_URL`,
  `SESSION_SECRET`, `CREDENTIALS_ENCRYPTION_KEY` y las llaves de Google/OpenAI
  locales.
- Recuperados `DATABASE_URL`/`CREDENTIALS_ENCRYPTION_KEY`/`OPENAI_API_KEY`
  desde `apps/worker/.env` (mismo valor compartido en el monorepo);
  `SESSION_SECRET` regenerado (solo local, sin impacto en producción).
- **`GOOGLE_SEARCH_CONSOLE_CLIENT_ID`/`CLIENT_SECRET` y
  `GITHUB_ACTIONS_TOKEN` quedaron vacíos en local y NO son recuperables** —
  Vercel los guardó como "Sensitive" (write-only, ni el dueño de la cuenta
  puede releerlos; confirmado intentando `vercel env pull` contra production
  explícitamente). Producción sigue intacta, solo afecta pruebas locales de
  conectar Google. Si hace falta probar ese flujo en local, pedirle al
  usuario el Client ID/Secret desde Google Cloud Console o generar uno nuevo.

### Otros cambios puntuales
- Límite diario bajado de 95 a **20 para los 55 usuarios existentes** (pedido
  explícito), migración `20260806000000_set_daily_limit_20` (incluye
  `UPDATE "User"` real, no solo cambio de default). Cuentas nuevas también
  arrancan en 20.
- Grid de detalle de usuario en Administración (`minmax(160px,1fr)` →
  `230px`) — se veía apretado en pantallas anchas con el campo nuevo de Aviso
  de Oportunidades.

## RESUELTO (7/8/2026): generación de contenido colgada en idiomas no españoles

Cuentas con `contentLanguage` distinto de español (Gustavo Torres, Svetlana)
nunca lograban publicar: el artículo se quedaba en "Generando contenido con
inteligencia artificial" y moría por timeout, siempre.

### Causa raíz (confirmada en producción, commit `1284cec`)

La espera de "contenido generado" **no usaba el locator `dialog` de Playwright**
que usa el resto de `createArticleDraft()`. Reimplementaba la búsqueda del modal
a mano dentro del navegador (`document.querySelectorAll(".modal")` + comparación
exacta contra `CHATGPT_MODAL_TITLE_TEXTS`). Esa búsqueda casera no ubicaba el
modal en esas cuentas, así que la condición devolvía `false` para siempre.

**El artículo ya estaba generado y el código no lo veía.** Prueba directa, del
log de producción: en el mismo instante del timeout, el volcado de diagnóstico
—que sí usa el locator— leyó los cinco campos completos y correctos (contenido
de 5958 chars, resumen, título "Navigating Home Buying in Baja California",
prompt de imagen). Mismo momento, dos resultados opuestos.

Verificado tras el arreglo: la generación en inglés tarda **21 segundos**
(10:59:12 → 10:59:33), y la corrida terminó en `success` — la primera del día
que no murió cortada por el tope de 20 minutos de GitHub.

### Dos hipótesis previas que la evidencia DESCARTÓ

Quedan escritas a propósito, porque costaron horas y llevaron a cambios que
hubo que revertir:

1. **"El sitio tarda más generando en otros idiomas."** Falso: tarda 21s. La
   señal que lo desmentía estaba desde el principio y se pasó por alto — los
   fallos ocurrían clavados EXACTAMENTE en el límite (3 veces a 90s y, tras
   subirlo, 3 veces a 180000ms). Una generación lenta habría dado tiempos
   variables y alguna corrida buena; fallar siempre al milisegundo del tope
   significa que la condición nunca podía volverse verdadera.
2. **"`en_VI` es un valor corrupto, hay que ponerlo en `en`."** Falso y
   contraproducente: `en_VI` es el valor REAL que 10minutesWebsite usa para
   inglés, leído bien por `fetchLanguages()`. Al cambiarlo a `en` en la base,
   `selectOption()` dejó de encontrar la opción y se perdían ~30 segundos por
   artículo en un timeout silencioso. Se revirtió a `en_VI`.

**Lección**: la selección de idioma nunca tuvo nada que ver. El log decía
"Idioma del contenido aplicado: en_VI" y aun así colgaba.

### Regla que se desprende (aplicar en el resto del archivo)

No reimplementar la búsqueda de elementos con selectores crudos dentro de
`page.evaluate`/`waitForFunction` cuando ya existe un locator de Playwright para
lo mismo. Duplicar esa lógica es lo que produjo un fallo silencioso e
indistinguible de "el sitio está lento".

Queda pendiente revisar si `generateImage()` tiene el mismo problema: busca
`img[alt="Preview"]` con el texto en inglés fijo, sin tratamiento bilingüe. Se
le agregó un volcado de diagnóstico en el commit `b3035b1` para averiguarlo con
evidencia en lugar de suponerlo.

### Los otros tres bugs que aparecieron detrás (todos resueltos y verificados)

Al desatascar el contenido, la publicación avanzó a pasos donde esas cuentas
nunca habían llegado, y aparecieron tres bugs más. **Los ids del formulario de
10minutesWebsite NO son iguales en todas las cuentas**, y el código los tenía
escritos a mano para las cuentas en español:

1. **Prompt de imagen (`dcbd76a`)**: el código escribía en `#images`, que no
   existe en la cuenta de Gustavo. El `fill` esperaba 30s, fallaba en silencio,
   y luego se pulsaba "Generar imagen" con el campo vacío → el sitio contestaba
   `This field is required` y la vista previa se quedaba en 0px para siempre. El
   mensaje de error culpaba a los tokens de imagen, que no tenían nada que ver.
2. **Resumen (`dcbd76a`)**: el campo real es `#excerpt`, el código lo leía de
   `#excerptes`. Con el id equivocado el resumen quedaba en cadena vacía, así
   que **nunca se aplicaba el recorte a 300 chars** (se vio un intento con 308,
   por encima del límite que deshabilita "Guardar cambios" en silencio) y ese
   vacío se arrastraba al prompt de imagen y al FAQ.
3. **Texto propio del usuario (`94fb39e`)**: el sitio deja el textarea del
   contenido del modal (`#respose_content`) con `disabled`. El `fill` esperaba
   30s y lanzaba, **abortando el artículo completo por un añadido cosmético**,
   tres intentos seguidos. Afectaba a cualquier usuario con `articleSignature`
   configurado, en cualquier idioma — no solo a los de idioma no español. Ahora
   se le quita el `disabled` antes de escribir y, sobre todo, **ese paso ya no
   puede tumbar la publicación**: si falla, avisa en el log y el artículo sale
   sin ese texto.

Ambos campos (prompt y resumen) se ubican ahora por id conocido primero y, si no
está, por un campo cuyo `id`/`name` hable de imagen o de resumen. Las cuentas que
ya funcionaban no cambian de comportamiento.

### Mejora pedida en la misma sesión: traducir el texto propio (`566adef`)

Con Svetlana el artículo salía entero en rumano y terminaba con el párrafo de
firma en español. Nuevo `apps/worker/src/translateText.ts` (mismo patrón que
`faqPrompt.ts`, gpt-4o-mini): traduce `articleSignature` al idioma del artículo,
respetando nombres propios. **Nunca bloquea la publicación** — sin clave, con
error de red, con idioma español o sin idioma, devuelve el texto original;
verificado con prueba local de los cuatro caminos. Cachea por idioma+texto, así
la firma se traduce una vez por proceso y no una vez por artículo.

### Estado al cierre

**Todo resuelto y verificado en producción por el usuario**, en dos cuentas y
tres idiomas:

- **Gustavo Torres (inglés, `en_VI`)**: publica correctamente.
- **Svetlana Botnarciuc (rumano, `ro_RO`)**: título dado en español, artículo
  escrito en rumano, bio traducida al rumano, imagen generada y artículo
  publicado.
- Las cuentas en español no cambiaron de comportamiento en ningún paso.

### Incidente propio a registrar

Durante la depuración se usó `git add -A` (prohibido por las reglas de este
archivo), lo que metió `PRD_CALCULADORA_ROGE.md` y `calculadora-roge/` en un
commit; un `git reset --hard` posterior los **borró del disco**. Se recuperaron
íntegros desde el objeto de git y volvieron a quedar sin trackear. Refuerza por
qué la regla existe: agregar siempre rutas explícitas.

## Pendiente / próximos pasos

0. ~~Construir módulo **Oportunidades**~~ — **HECHO** en commits `05d8d6b` y
   `2f33164`; migración y deploy productivo confirmados. La primera ejecución
   del botón **Analizar oportunidades** corresponde al usuario.

### Módulo Oportunidades (implementación 31/7/2026)

- Nueva pestaña `/dashboard/oportunidades` y API multiusuario bajo
  `/api/opportunities`. Cada análisis se ejecuta únicamente al pulsar el botón;
  no hay consumo periódico en segundo plano.
- Mejora UX del 1/8/2026: al pulsar **Analizar oportunidades** se muestra un
  temporizador `mm:ss`, barra de progreso y una línea de cuatro etapas
  (consultar Search Console, comparar tendencias, crear long tails y validar
  duplicados/canibalización), además del aviso de no cerrar la página. Es
  progreso informativo mientras responde una única solicitud; no dispara
  publicaciones.
- Configuración real confirmada el 1/8/2026: el usuario creó una clave nueva,
  guardó `OPENAI_API_KEY` en Vercel Production, redistribuyó el deployment y
  confirmó que la prueba de **Analizar oportunidades fue exitosa**. La clave no
  se copió al chat, repositorio ni documentos. No se ejecutaron ni publicaron
  los títulos generados durante esta comprobación por parte de Codex.
- Temporizador entregado en commit `5720368`. La captura final de Vercel del
  1/8/2026 confirmó el deployment **Listo** en **Producción**, con el commit
  correcto `5720368`. No hace falta volver a redistribuirlo.
- Consulta Search Analytics de la propiedad Google elegida por ese usuario:
  compara los últimos 28 días consolidados (hasta tres días antes) con los 28
  anteriores, usando consulta+página, impresiones, clics, CTR y posición.
- El prompt recibe hasta 250 oportunidades de rendimiento, las categorías
  reales sincronizadas y hasta 1.000 títulos publicados del usuario. Exige
  seleccionar máximo 10 categorías por éxito/tendencia y exactamente 9 títulos
  long tail distintos por categoría, sin duplicados ni canibalización. La
  salida se vuelve a validar en servidor antes de guardarse.
- Nuevos modelos `OpportunityGroup`/`OpportunityTitle`, ambos aislados por
  `userId` y relacionados con `Category`. Un nuevo análisis reemplaza las
  sugerencias anteriores del mismo usuario, nunca las de otra cuenta.
- UI con eliminar/ejecutar para categoría completa y para cada título. Ejecutar
  crea un `Run`/`Title` normal en el flujo existente y elimina únicamente las
  oportunidades transferidas; por eso aparecen en Inicio/Histórico y las
  procesa el mismo worker de Publicar. No existe un límite interno nuevo de 10
  artículos vinculado a 10MinutesWebsite.
- Migración: `20260731224000_add_opportunities`, aplicada en producción por el
  workflow `30707560663`. Código validado con Prisma format/generate,
  TypeScript, build completo de Next.js y carga autenticada de la página/API
  (sin pulsar Analizar ni Ejecutar). Commits `05d8d6b` y `2f33164`; deploy
  productivo `dpl_21hmZQbA7FZzF6kCtmJdsxTWn4mU`.
- Prisma Migrate no debe usar el Transaction pooler `:6543`: el primer intento
  falló con `prepared statement s0 does not exist` y el segundo quedó esperando
  el advisory lock. `.github/workflows/migrate.yml` ahora transforma la URL en
  memoria a Session pooler `:5432` solo durante la migración (sin imprimir
  secretos); así terminó en 19 s. Web y worker siguen usando `:6543`.

1. ~~Validar el estado individual de Google con un artículo ya existente~~ —
   **HECHO**, ver secciones RESUELTO de indexación/sitemap arriba.
2. ~~Lorena debe seleccionar su propiedad y guardar su sitemap~~ — **HECHO**
   para Google Y Bing (5-6/8/2026). El resto de los usuarios lo hacen cada uno
   por su cuenta, una sola vez, cuando quieran conectar Search Console/Bing.
3. El usuario puede borrar de su Desktop el JSON OAuth definitivo después de
   confirmar que los secretos funcionan; ya existe copia cifrada en
   Vercel/GitHub y no debe subirse al repo.
4. ~~Implementar Bing después de cerrar y validar Google~~ — **HECHO**
   (5-6/8/2026), ver sección RESUELTO de Bing arriba. Probado en producción
   con la cuenta de Lorena.
5. ~~Corregir el registro de usuario cuyo correo aparece con el prefijo
   accidental `Ahora :`~~ — **HECHO** (1/8/2026), ver sección RESUELTO del
   sitemap por lote más arriba.
6. Confirmar operativamente que los usuarios recién creados guarden sus
   propias credenciales de 10minutesWebsite y sincronicen categorías (esto
   es trabajo de cada usuario final, no de código).
7. `CODEX_PROMPT.md` y este `HANDOFF.md` ya quedaron commiteados en git por
   Codex (antes eran solo locales) — ya no hay riesgo de perderlos si se
   borran del disco, están en el historial de `main`.
8. ~~Verificar que el rollout de los 5 shards funcione~~ — **HECHO y
   confirmado en vivo el 31/7/2026 21:47 UTC** (ver ítem 21 del changelog):
   5 jobs paralelos confirmados, lote de Milton y de Lizzammar avanzaron
   correctamente sin errores. Área del worker liberada para Codex en
   `COORDINACION_CLAUDE_CODEX.md`.
9. **Google Business Profile: esperando aprobación de Google** ("Basic API
   Access", solicitud enviada 6/8/2026, plazo esperado 7-10 días hábiles). El
   botón de conectar está deshabilitado a propósito hasta entonces. Cuando el
   usuario confirme la aprobación (cuota pasa de 0 a 300 QPM en Google Cloud
   Console, o llega el correo de confirmación): reactivar el botón en
   `BusinessProfileSection.tsx` y probar la publicación real con un usuario
   de prueba antes de anunciarlo al resto.
10. **Eira: revisar/borrar oportunidades generadas ANTES del fix de
    anti-invención** (5-6/8/2026) — pueden tener ciudades/estados inventados.
    Recomendado, no ejecutado por Claude (son datos de un usuario real).
11. Confirmar que la indexación instantánea de Bing (`SubmitUrl`) funciona
    end-to-end con el próximo artículo real que publique Lorena Álvarez — el
    OAuth y el sitemap ya se probaron, pero el hook de indexación por artículo
    todavía no se vio correr con una publicación real.
12. **Restaurar en `apps/web/.env.local`** (si se necesita probar OAuth de
    Google en local): `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`/`CLIENT_SECRET` y
    `GITHUB_ACTIONS_TOKEN` — se perdieron el 5/8/2026 (ver sección de
    incidente arriba) y Vercel no permite releerlos. Pedírselos al usuario o
    generar credenciales nuevas.

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
- **Cero tolerancia a datos inventados en Oportunidades** (pedido explícito,
  5-6/8/2026, tras el bug de ubicaciones inventadas en la cuenta de Eira):
  cualquier dato específico en un título (ubicación, ingrediente, cifra,
  característica, marca, etc.) debe tener evidencia LITERAL en consultas/
  páginas reales de Search Console o en títulos ya publicados por ese
  usuario — nunca inferido por "suena relacionado con la categoría". Nunca
  debilitar la regla anti-invención de `opportunity-analysis.ts` sin que el
  usuario lo pida explícitamente.
- `vercel env add`/variables marcadas "Sensitive" en Vercel son de **un solo
  sentido**: ni el CLI ni el dashboard del dueño de la cuenta pueden volver a
  leer el valor después de guardarlo (confirmado 5/8/2026). Si se necesita el
  valor real después, hay que pedírselo de nuevo al usuario o regenerarlo en
  su fuente original — no perder tiempo reintentando `vercel env pull`.
- Antes de correr cualquier comando de `vercel` que no sea `deploy`/`--prod`
  (ej. `vercel blob create-store`, `vercel env add`), considerar si puede
  sobreescribir `.env.local` — ya pasó una vez (5/8/2026) y se perdieron
  variables locales que no eran parte del comando.
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
