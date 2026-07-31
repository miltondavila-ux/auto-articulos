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
  `apps/web/src/lib/trigger-worker.ts`). Repo: `apps/worker`. Solo un
  proceso de `run-once.ts` corre a la vez a nivel de GitHub Actions
  (`concurrency: group: auto-articulos-worker`, `cancel-in-progress: false`,
  sin cambios), pero DENTRO de ese proceso ahora hay concurrencia real: 2
  "lanes" de publicación de artículos + 1 lane de sincronización de
  categorías corren en paralelo (`Promise.all` en `run-once.ts`), cada uno
  tomando el usuario más antiguo que no esté ya en uso — `reservation.ts`
  (reserva en memoria por `userId`) garantiza que nunca dos lanes abran
  sesión contra la MISMA cuenta de 10minutesWebsite al mismo tiempo (eso
  podría invalidar la sesión y romper el trabajo en curso), pero sí permite
  que usuarios distintos avancen a la vez sin esperarse entre sí. Pedido
  explícito del usuario (31/7/2026). `TITLE_LANE_CONCURRENCY = 2` en
  `run-once.ts` es a propósito conservador (el runner de GitHub Actions
  tiene solo 2 vCPU) — subirlo es seguro de intentar si se ve estable, solo
  cambiar esa constante.
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
- `monthlyArticleLimit Int? @default(300)` y `dailyArticleLimit Int? @default(40)`
  — límites estándar aplicados a **todos** los usuarios actuales (pedido
  explícito del 31/7/2026), editables individualmente desde Usuarios. Se
  validan al crear una corrida (`POST /api/runs`, `apps/web/src/app/api/runs/route.ts`):
  si se supera el límite mensual o el diario, la API devuelve 403 con el
  mensaje explicando cuánto queda.

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
11. **Worker con concurrencia real por usuario** (ver sección Arquitectura
    arriba) — antes todo el trabajo de todos los usuarios pasaba por una
    cola secuencial de a uno; ahora varios usuarios distintos avanzan en
    paralelo (`apps/worker/src/reservation.ts`,
    `apps/worker/src/run-once.ts`, cambios en `queue.ts`/`categorySync.ts`).
    Sin cambios en `worker.yml` — sigue siendo un solo proceso de GitHub
    Actions a la vez, la concurrencia es interna a ese proceso.
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

## Pendiente / próximos pasos

1. Corregir el registro de usuario cuyo correo aparece con el prefijo
   accidental `Ahora :` en la pestaña de accesos y en uso de base de datos.
2. Confirmar operativamente que los usuarios recién creados guarden sus
   propias credenciales de 10minutesWebsite y sincronicen categorías (esto
   es trabajo de cada usuario final, no de código).
3. `CODEX_PROMPT.md` se recreó en esta sesión (ver ese archivo) para poder
   continuar desde Codex leyendo únicamente este HANDOFF — si se vuelve a
   borrar y hace falta, recrearlo con el mismo patrón.

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
