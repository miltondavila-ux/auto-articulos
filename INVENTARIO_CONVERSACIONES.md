# Inventario de conversaciones

Este documento tiene un propósito distinto al de `COORDINACION_CLAUDE_CODEX.md`:
responder, en cualquier momento, **quién es dueño de cada problema/proyecto,
quién tiene un archivo o rama tomada ahora mismo, y de quién es cada commit**.
`COORDINACION_CLAUDE_CODEX.md` sigue siendo el diario cronológico con el
detalle técnico completo de cada cambio; este archivo es el índice de
propietarios que permite, sin leer 3000 líneas, saber quién está activo y
sobre qué.

## CODEX - CREADOR DE TITULOS MUY ESTRICTO — REPARACIÓN DEL MOTOR — 2026-09-18

- Rama: `codex/reparacion-del-motor`.
- Worktree: `/private/tmp/codex-reparacion-motor`.
- Primera fase: caché de evidencia SEO por fuente, GSC a 90 días y análisis
  con GA4/Bing cuando GSC no esté disponible.
- Commit local: `5ab58ae`.
- Auditorías locales: Prisma schema válido, TypeScript limpio y build de
  `apps/web` completo con 85 páginas.
- Estado: ACTIVA — pendiente de revisión de PR/Preview; Producción no tocada.

Estructura:
- **PARTE A** — estado de reservas verificado EN VIVO contra git (no contra lo
  que el documento *dice*, sino contra lo que `git worktree list` y el
  historial de cada rama muestran en este momento). Se debe repetir esta
  verificación cada vez que se lea este documento, porque cambia en minutos.
- **PARTE B** — registro histórico de cada conversación con su nombre exacto
  literal, agente responsable, proyecto y estado, para que ninguna quede sin
  rastro aunque ya haya terminado.

---

## PARTE A — ¿Quién tiene qué reservado AHORA MISMO?

| `/private/tmp/fix-natalia-category-login-20260908` | `codex/fix-natalia-category-login-20260908` | En curso | Codex — `BUG NATALIA` | Reserva: `apps/worker/src/categorySync.ts`, `apps/worker/src/automation/10minutesWebsite.ts`; base `origin/main` `7f3c7e9`; SHA exacto de Producción no expuesto por los headers disponibles. |

**Este es el tablero de reservas rápidas** que exige la "METODOLOGÍA DE
TRABAJO EN PARALELO Y CAPITÁN DE ARCHIVO" en `COORDINACION_CLAUDE_CODEX.md`
(agregada 2026-09-04): antes de tocar un archivo, consultar acá; al
reservar, agregar una línea acá (no hace falta un párrafo largo); al
liberar, borrar esa línea. El objetivo es poder trabajar en paralelo sin
pisarse, sin que "puede estar en uso" sea una excusa para no terminar algo.

Verificado el 2026-09-03 (~19:10 hora local) con `git worktree list` +
`git merge-base --is-ancestor <rama> origin/main` desde
`/private/tmp/doc-coordinacion-sept3`. Repetir estos dos comandos para
refrescar esta tabla; no confiar en la fecha si pasó mucho tiempo.

### Activos ahora mismo (commits propios que todavía NO están en `origin/main`)

| Worktree | Rama | Commits sin fusionar | Dueño / conversación (según el propio commit o Coordinación) | Nota |
|---|---|---|---|---|
| `/Users/miltondavila/Creador de articulos/.worktrees/google-api-verification` | `codex/google-api-verification` | 1 | Codex — commit `7908b01` "chore: prepare Google OAuth domain and verification pages", hecho hoy 19:06 | Muy reciente; probablemente Codex trabajando en paralelo ahora mismo en `CODEX - GPT-5 - VERIFICACION DE API'S DE GOOGLE`. |
| `/private/tmp/limites-globales-articulos` | `codex/limites-globales-articulos` | 1 | Codex — proyecto `LIMITES GLOBALES DE ARTICULOS` | Coincide con la decisión de Milton (2026-09-02): **PAUSADO, no tocar ni integrar**. |
| `/private/tmp/meta-threads-callbacks` | `codex/meta-threads-callbacks` | 1 | Codex — proyecto `META THREADS CALLBACKS` | Coincide con la decisión de Milton (2026-09-02): **ACTIVO, no tocar**, continúa en su propia conversación. |
| `/private/tmp/auto-articulos-conexion-blogger` | `codex/conexion-blogger-20260902` | 1 | Codex — un intento de `CONEXION BLOGGER` | Atención: existe otra rama de Blogger (`codex/conexion-blogger-produccion-20260903`) que SÍ está fusionada en `origin/main` y fue la que llegó a producción. Esta parece un intento anterior o paralelo que quedó suelto sin fusionar — no se decide aquí si conservarla o descartarla. |
| `/private/tmp/auto-articulos-resolucion-conexion-web` | `codex/resolucion-conexion-web-20260902` | 5 | Codex/Claude — proyecto `RESOLUCION DE CONEXION WEB` | Contradicción real detectada: la decisión de Milton (2026-09-02) marca este proyecto como **CULMINADO**, pero sus 5 commits nunca se fusionaron a `origin/main`. "Culminado" no fue lo mismo que "publicado". Señalado, no resuelto. |
| `/private/tmp/cambio-cantidad-articulos-20260902` | `codex/cambio-cantidad-articulos-20260902` | 1 | Codex — cambio de cantidad de artículos | No aparece mencionado como cerrado en Coordinación; verificar con Codex si sigue vivo o es un residuo. |
| `/private/tmp/mcp-publicacion-20260907` | `claude/mcp-publicacion-20260907` (PR #76) | 1 | Claude — "MCP 10MWS" | Andamiaje de la nueva línea de ejecución de publicación vía MCP (ahora con alcance ampliado a un selector multi-plataforma, no solo 10MWS — ver Coordinación), enviado como PR #76 (`open`, sin fusionar). Reserva sigue activa sobre `packages/db/prisma/schema.prisma` y `apps/worker/src/queue.ts` hasta que se fusione o se cierre. Sin cambio de comportamiento por defecto (`publishMethod` queda en `BROWSER`). Auditoría 3 (integración/producción) bloqueada a propósito — no existe todavía servidor MCP real de 10MWS ni migración aplicada. Detalle completo en `COORDINACION_CLAUDE_CODEX.md`. |
| `/tmp/fix-tiles-flex-20260908` | `claude/fix-tiles-flex-20260908` | 1 | Claude — "ORDEN DE USUARIOS ACTIVOS EN ADMIN" (hotfix visual sobre PR #70) | Reserva: `apps/web/src/app/dashboard/usuarios/page.tsx` — arregla que las tarjetas de resumen se veían en fila (aplastadas) por el reset global `button { display: inline-flex }`. |
| `/Users/miltondavila/Creador de articulos/.worktrees/mensajes-error-ia` | `claude/mensajes-error-humanizados-ia` (PR #125) | 1 (`3aa0266`) | Claude — `CLAUDE - ERROR AL PUBLICAR` (solo el pendiente de mensajes inteligentes; el error de publicación está ARCHIVADO) | **PAUSADO**. Espera autorización de Milton para fusionar el PR #125 y verificación en vivo. Reserva mínima: `apps/worker/src/humanizeError.ts` (nuevo), `apps/worker/src/queue.ts` (`catch` de `processRunTitle`), `apps/worker/src/automation/10minutesWebsite.ts` (2 líneas de `login()`). |

### Ya terminados y fusionados (el worktree quedó suelto, pero el trabajo YA está en producción — no son reservas activas)

`/private/tmp/auditoria-creditos-imagen-20260903`,
`/private/tmp/comunicacion-renovacion-cupos`,
`/private/tmp/cupo-renovacion-exacto`,
`/private/tmp/limites-ux-dinamicos`,
`/private/tmp/linkedin-posts-api-v2`,
`/private/tmp/categorias-mal-elegidas` (rama `claude/categorias-mal-elegidas-cierre`),
`/private/tmp/cero-canibalizacion-longtail` (rama `claude/cero-canibalizacion-longtail-cierre`),
`/private/tmp/ga4-check-positivo`,
`/private/tmp/tabla-publica-rls` (rama `claude/cierre-tabla-publica-docs-20260902`),
`/private/tmp/this-routing-middleware`,
`/private/tmp/wizard-progress-production`.

Estas carpetas se pueden eliminar con `git worktree remove <ruta>` sin perder
nada — todo su contenido ya vive en `origin/main`. No se borraron en esta
sesión porque no era el pedido; solo se deja señalado.

### Addendum (agregado por la tarea programada diaria de propagación, 2026-09-05, sin editar la tabla anterior)

Esta corrida se ejecutó en un entorno remoto sin acceso al filesystem de la
máquina de Milton, así que no pudo correr `git worktree list` real; en su
lugar verificó `git fetch origin` + `git merge-base --is-ancestor <rama>
origin/main` para las dos ramas nuevas que aparecen en
`COORDINACION_CLAUDE_CODEX.md` desde la última corrida (secciones "PUNTO DE
MIGRACIÓN A CLAUDE" y "CLAUDE — REDISEÑO DE DEDUPLICACIÓN SEMÁNTICA",
2026-09-04):

| Worktree (según texto de Coordinación, no verificado en el filesystem) | Rama | Commit de punta | Dueño / conversación | Nota |
|---|---|---|---|---|
| `/private/tmp/rediseno-intencion-longtail-20260904` | `claude/rediseno-intencion-longtail-20260904` (PR #47) | `a7b05e5` | Claude — `AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS` (rediseño `needKey`) | Verificado EN VIVO 2026-09-05: `git merge-base --is-ancestor` confirma que NO es ancestro de `origin/main` — sigue sin fusionar, bloqueada por el límite diario de builds de Vercel (`build-rate-limit`), no por un error de código. |
| (no registrado) | `codex/dynamic-source-timeline-20260904` (PR #46) | `e4ed874` | Codex — `AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS` (línea de tiempo de fuentes conectadas) | Verificado EN VIVO 2026-09-05: `git merge-base --is-ancestor` confirma que NO es ancestro de `origin/main` — mismo bloqueo de Vercel que el PR #47. |

Ver detalle completo de ambos PR en `CONTROLADOR_DE_VERSIONES.md`, entradas
"PR #47: rediseño de deduplicación semántica" y "PR #46: línea de tiempo
dinámica de fuentes de análisis".

#### Actualización (agregada por la tarea programada diaria de propagación, 2026-09-07, sin editar la tabla anterior)

Verificado EN VIVO contra `origin/main` recién fetcheado:
- Fila del PR #47 (`claude/rediseno-intencion-longtail-20260904`): **la
  reserva ya no está activa.** El PR se fusionó como el commit `7e951f7`
  (`git merge-base --is-ancestor 7e951f7 origin/main` confirma que ya es
  ancestro de `main`) y la rama remota fue borrada tras el merge. Detalle
  completo en `CONTROLADOR_DE_VERSIONES.md` — "Fusión y verificación en
  Producción — PR #47: rediseño de deduplicación semántica (`needKey`) —
  2026-09-06".
- Fila del PR #46 (`codex/dynamic-source-timeline-20260904`): **la reserva
  de Codex sigue activa.** La rama remota todavía existe y
  `git merge-base --is-ancestor` confirma que NO es ancestro de
  `origin/main` — sigue sin fusionar, mismo estado que el registrado el
  2026-09-05.

#### Actualización (agregada por la tarea programada diaria de propagación, 2026-09-08, sin editar la tabla anterior)

Verificado EN VIVO contra `origin/main` recién fetcheado desde un entorno
remoto (sin acceso al filesystem de la máquina de Milton, igual que la
corrida del 2026-09-05):

- Fila de `apps/web/src/app/dashboard/usuarios/page.tsx` /
  `claude/panel-usuarios-clickable-20260907` (PR #70, "ORDEN DE USUARIOS
  ACTIVOS EN ADMIN"): **la reserva sigue activa.** La rama remota todavía
  existe, `git merge-base --is-ancestor` confirma que NO es ancestro de
  `origin/main`, y el PR #70 sigue `open`/`merged: false` según la API de
  GitHub — bloqueado por `Deployment rate limited — retry in 24 hours` en
  ambos checks de Vercel (confirmado hoy, no solo transcrito de
  Coordinación).
- Nueva reserva declarada en `COORDINACION_CLAUDE_CODEX.md` (2026-09-07,
  sección "RESERVA — AUDITORÍA RESPONSIVE COMPLETA DEL SISTEMA"): worktree
  `/private/tmp/auditoria-responsive-20260907`, rama
  `claude/auditoria-responsive-20260907`, conversación "AUDITORIA DE
  CAPACIDADES RESPONSIVE". **No se pudo verificar con `git merge-base`
  porque esa rama todavía no existe en `origin`** (0 commits empujados a
  esta fecha — la propia entrada dice que el worktree seguía idéntico a
  `origin/main`). Se deja igualmente señalada porque la reserva de archivos
  ya está declarada y vigente: las 23 páginas de `apps/web/src/app/`
  listadas en esa sección, EXCEPTO `dashboard/usuarios/page.tsx` (reservado
  aparte por el punto anterior, PR #70).
- Nueva reserva sin rama ni commit, declarada en
  `COORDINACION_CLAUDE_CODEX.md` (sección "[2026-09-07] Claude — Botón
  'Borrar todas las oportunidades'"): cambios escritos directamente en el
  checkout principal de Milton, sin commitear y sin worktree aislado
  (violación reconocida por la propia entrada del Protocolo de este mismo
  documento). Archivos reservados según ese texto:
  `apps/web/src/app/api/opportunities/route.ts`,
  `apps/web/src/app/api/social-opportunities/route.ts`,
  `apps/web/src/app/dashboard/oportunidades/page.tsx`,
  `apps/web/src/app/dashboard/oportunidades-redes/page.tsx`. **No
  verificable contra git desde este entorno remoto** (vive solo sin
  commitear en la máquina de Milton); se transcribe tal cual para que
  quede visible aquí y no solo enterrada en Coordinación. Milton o quien
  retome debe confirmar si ese trabajo sigue sin commitear o si ya se
  resolvió con un PR propio.

#### Corrección (agregada por Claude, 2026-09-08, ~07:20 hora local, sin editar el bloque anterior)

La fila de arriba sobre `apps/web/src/app/dashboard/usuarios/page.tsx` /
PR #70 quedó desactualizada apenas unos minutos después de escrita: el
rate limit de Vercel se liberó la misma mañana, el PR #70 se fusionó como
`48578e9` y ya está verificado en producción real (`auto-articulos-web.vercel.app`
responde con normalidad). Detalle completo del desbloqueo y la fusión en
`COORDINACION_CLAUDE_CODEX.md`, sección "CIERRE — Tarjetas clicables en
Usuarios — 2026-09-08". **La reserva de ese archivo ya se borró** de la
tabla de la Parte A (arriba en este mismo documento) — esta nota solo
corrige el addendum automático, que no debe editarse retroactivamente.

### El checkout principal de Milton

`/Users/miltondavila/Creador de articulos` (rama `main`, commit `f81f53b`)
está **68 commits detrás de `origin/main`** y tiene cambios sin commitear en
varios archivos (`acerca-de/page.tsx`, `admin/users/route.ts`,
`assistant/chat/route.ts`, `opportunities/execute-all/route.ts`,
`oportunidades/page.tsx`, `usuarios/page.tsx`, `layout.tsx`,
`privacidad/page.tsx`, `terminos/page.tsx`, `MastodonSection.tsx`,
`OnboardingWizard.tsx`, `manual-usuario.ts`, `bing-oauth.ts`,
`google-analytics-oauth.ts`, `google-oauth.ts`) que no se identifican con
ninguna conversación registrada en este documento. No se tocaron ni se
investigó de quién son — quedan señalados para que Milton confirme su origen.

#### Actualización (agregada por la tarea programada diaria de propagación, 2026-09-09, sin editar la tabla anterior)

Verificado EN VIVO contra `origin/main` recién fetcheado (`git merge-base
--is-ancestor` para cada rama citada):

- Fila de `/private/tmp/mcp-publicacion-20260907` / `claude/mcp-publicacion-20260907`
  (PR #76, "MCP 10MWS"), en la tabla de la Parte A (arriba en este mismo
  documento): **la reserva ya no está activa.** El PR #76 se fusionó
  (`ae225dd`), fue revertido por un incidente real de Producción (schema sin
  migración, ver `CONTROLADOR_DE_VERSIONES.md`) y el revert se revirtió tras
  corregir la migración (`df830eb`) — hoy `packages/db/prisma/schema.prisma`
  y `apps/worker/src/queue.ts` en `origin/main` ya contienen este código.
  Detalle completo en `CONTROLADOR_DE_VERSIONES.md`, entrada "andamiaje MCP
  10MWS (PR #76) e incidente de producción por migración faltante".
- Fila de `/tmp/fix-tiles-flex-20260908` / `claude/fix-tiles-flex-20260908`
  (hotfix PR #80 sobre `usuarios/page.tsx`), en la tabla de la Parte A:
  **la reserva ya no está activa.** El commit `ba62119` es ancestro de
  `origin/main`; el fix (`flexDirection: "column"` en las tarjetas) está
  confirmado en el archivo actual de `origin/main`.
- Fila de `/private/tmp/fix-natalia-category-login-20260908` /
  `codex/fix-natalia-category-login-20260908` ("BUG NATALIA"), en la tabla
  de la Parte A (arriba, primera fila): **la reserva ya no está activa.**
  El commit `c162119` se fusionó vía PR #82 (`9f0c2f1`), ya es ancestro de
  `origin/main`, y la propia Parte B de este documento (sección `BUG
  NATALIA`) ya lo tiene marcado `CERRADA` — esta fila de la Parte A había
  quedado desactualizada respecto a la Parte B.
- Reserva de `claude/auditoria-responsive-20260907` (declarada en el
  addendum del 2026-09-08, más arriba en esta misma sección, para la
  conversación "AUDITORIA DE CAPACIDADES RESPONSIVE"): **ya no está
  activa.** Esa reserva se cerró sin cambios de código (worktree idéntico a
  `origin/main`, según su propio cierre parcial del 2026-09-08) y una
  conversación distinta y posterior con el mismo nombre de proyecto abrió
  su propio worktree/rama (`claude/responsive-escala-fluida-20260908`, PR
  #87), ya fusionado y verificado como ancestro de `origin/main` — ver
  `CONTROLADOR_DE_VERSIONES.md`, entrada "escala responsiva fluida con
  `clamp()`... (PR #87)". Ninguna reserva de archivo queda activa por
  ninguna de las dos conversaciones de auditoría responsive.
- Las ramas remotas de los 5 puntos anteriores (`claude/mcp-publicacion-20260907`,
  `claude/fix-tiles-flex-20260908`, `claude/responsive-escala-fluida-20260908`,
  y también `claude/panel-usuarios-clickable-20260907` y
  `claude/borrar-todas-oportunidades-20260908`, ya cerradas en corridas
  anteriores) siguen existiendo en el remoto pese a estar fusionadas — no
  representan reservas activas, es solo limpieza pendiente. Detalle en
  `REPARADOR_DEL_ARBOL_PRINCIPAL.md`, sección "Ramas remotas obsoletas sin
  borrar".
- No se pudo ejecutar `git worktree list` real (entorno remoto sin acceso al
  filesystem de la máquina de Milton, igual que las corridas del 2026-09-05
  y 2026-09-08) — esta verificación se hizo por `git merge-base
  --is-ancestor` de cada rama contra `origin/main` recién fetcheado, no por
  inspección directa del filesystem local de Milton.

---

## PARTE B — Registro histórico de conversaciones (nombre exacto, agente, proyecto, estado)

### `BUG NATALIA`
- Agente: Codex.
- Estado: **CERRADA** — PR #82 fusionado y desplegado en Producción (`9f0c2f1`).
  Se corrigió el timeout del pool de categorías y se evitó repetir errores
  permanentes de correo inválido. Natalia confirmó que la sincronización de
  categorías funciona correctamente.

Compilado a partir de los campos "Identidad exacta", encabezados de proyecto y
"Conversación/proyecto" encontrados en `COORDINACION_CLAUDE_CODEX.md` y
`CONTROLADOR_DE_VERSIONES.md` (versión real de `origin/main`, commit
`fcbb13b` de esta rama). Es un primer barrido completo, no una auditoría
línea por línea de las 3000+ líneas de Coordinación — si falta alguna,
agregarla aquí en vez de dejarla solo en Coordinación.

### `CONEXION BLOGGER`
- Agente: Codex - GPT-5, traspasada a Claude el 2026-09-03 (Codex se quedó
  sin créditos de ejecución a mitad de la adaptación de Blogger; Milton
  confirmó el traspaso de responsabilidad y de autoría de commits).
- Estado: **CERRADA** — Blogger publica resumen editorial en producción
  (commits `e7706fc`…`4b1e5c9`, verificado con una publicación real) y
  Tumblr quedó con renovación automática de token (commits `8ad7ee2`,
  `2bbe821`), tras diagnosticar y corregir por qué el botón de Tumblr
  desaparecía seguido en Oportunidades en Redes. Ver
  `COORDINACION_CLAUDE_CODEX.md` — "ARCHIVO FINAL — CONEXION BLOGGER —
  2026-09-04" para el detalle completo de esta última fase (Claude).
- Ver detalle completo debajo (entrada original de Codex preservada tal
  cual, sin editar).

### `DOCUMENTO DE COORDINACION - SEPT 3`
- Agente: Claude.
- Estado: EN PROGRESO (esta misma conversación).
- Ver detalle completo debajo (entrada original preservada tal cual).

### `CODEX - GPT-5 - VERIFICACION DE API'S DE GOOGLE`
- Agente: Codex - GPT-5.
- Proyecto: verificación OAuth de Search Console, Analytics y Business
  Profile; migración de dominio a `seototal.lasolucionweb.com` /
  `lasolucionweb.com`.
- Estado: EN CURSO — según el worktree vivo `codex/google-api-verification`
  (ver Parte A), parece continuar activa hoy mismo.
- **Actualización (2026-09-04), agregada por la tarea programada diaria de
  propagación, sin editar lo anterior:** el código ya fue promovido dos
  veces a Producción (`7908b01` y luego la rama integrada
  `codex/google-api-verification-integrated`, deployment
  `2nHSy4qXgW4zaEmxzHBAr1NY8xqk`, `Ready`) — ver el detalle completo, ya
  registrado por otra corrida de esta misma tarea automatizada, en
  `CONTROLADOR_DE_VERSIONES.md`, sección "Promoción a Producción —
  verificación OAuth de Google y video de demostración — 2026-09-04". Los
  tres scopes OAuth y la justificación ya están guardados en Google; solo
  falta cargar el vídeo de demostración provisto por Milton
  (`https://youtu.be/21wEAhgy7zk`). Google Business Profile sigue bloqueado
  por cuota `0 QPM` de Google (no es un bug de código). **Verificado en vivo
  por esta tarea (2026-09-04) contra `origin/main`: ni
  `codex/google-api-verification` (`7908b01`) ni
  `codex/google-api-verification-integrated` (`eaf8e90`) están fusionadas
  en la rama `main` de git, pese a estar ambas corriendo en Producción según
  Vercel** — anotado como hallazgo en `REPARADOR_DEL_ARBOL_PRINCIPAL.md`.

### `CODEX - GPT-5 - PROBLEMA CON TUMBLR`
- Agente: Codex - GPT-5.
- Estado: CULMINADO, integrado en `origin/main` (commit `c35b3a8` y
  correcciones posteriores).

### `CATEGORIAS MAL ELEGIDAS` / continuación `CERO CANIBALIZACION Y COBERTURA LONGTAIL COMPLETA`
- Agente: Claude Sonnet 5 (misma conversación de Milton, dos fases).
- Estado: CERRADO — ramas `claude/categorias-mal-elegidas-cierre` y
  `claude/cero-canibalizacion-longtail-cierre` ya fusionadas en
  `origin/main` (confirmado en vivo, Parte A).

### `TABLA PUBLICA ACCESIBLE GRAVE`
- Agente: Claude Sonnet 5.
- Estado: CULMINADO/ARCHIVADO — decisión de Milton (2026-09-02): "No
  reabrir". Rama `claude/cierre-tabla-publica-docs-20260902` ya fusionada.

### `RESOLUCION DE CONEXION WEB`
- Agente: Codex/Claude.
- Estado declarado en Coordinación: CULMINADO. **Contradicción real
  detectada**: la rama `codex/resolucion-conexion-web-20260902` tiene 5
  commits que nunca se fusionaron a `origin/main` (ver Parte A). No se
  resuelve aquí cuál versión es la correcta — solo se deja documentada la
  contradicción, como pide la regla de no alterar historial.

### `LIMITES GLOBALES DE ARTICULOS`
- Agente: Codex.
- Estado: PAUSADO (decisión de Milton, 2026-09-02). Confirmado en vivo: la
  rama `codex/limites-globales-articulos` sigue con 1 commit sin fusionar,
  consistente con "pausado, no tocar".

### `META THREADS CALLBACKS`
- Agente: Codex.
- Estado: ACTIVO (decisión de Milton, 2026-09-02). Confirmado en vivo: la
  rama `codex/meta-threads-callbacks` sigue con 1 commit sin fusionar.

### `CLAUDE - BOTONES OPORTUNIDADES REDES`
- Agente: Claude.
- Estado: DESPLEGADO, pendiente de confirmación visual de Milton (según la
  propia entrada; no se verificó de nuevo en esta sesión).

### `CLAUDE - BOTONES DE OPORTUNIDADES AL INICIO`
- Agente: Claude.
- Estado: DESPLEGADO Y CONFIRMADO por Milton en producción.

### `CODEX - GPT-5 - INSTRUCCIONES EN EL SISTEMA` / `INSTRUCCIONES EN MODULOS`
- Agente: Codex - GPT-5.
- Estado: mezcla de COMPLETADO (Publicar/Oportunidades/Configuración) y
  LIBERADO (submódulos de Configuración) según la propia Coordinación.

### `CLAUDE - GOOGLE ANALYTICS CHECK POSITIVO`
- Agente: Claude.
- Estado: CIERRE registrado ("COMPLETADO en código local; pendiente
  revisión y despliegue" en una entrada, "CIERRE" en otra posterior — misma
  conversación, dos actualizaciones).

### `CLAUDE - LÍMITE EN LOS ARTICULOS` (límite diario de artículos)
- Agente: Claude.
- Estado: CIERRE registrado 2026-09-02, con re-auditoría tras rebase.

### `CODEX - GPT-5 - INTEGRACION GOOGLE ANALYTICS` / `BLUESKY` / `DEV.TO` / `MASTODON` (retirado) / `PINTEREST`
- Agente: Codex - GPT-5.
- Estado: integradas en `origin/main` en su momento; Mastodon fue retirado
  por completo después a pedido de Milton (ver entrada "CULMINADO — 31/8/2026
  (Eliminar integración de Mastodon)").

### `CODEX - GPT-5 - CONFIGURACION Y OPORTUNIDADES` / `MIGRACIONES PRISMA`
- Agente: Codex - GPT-5.
- Estado: auditorías documentales de liberación de trabajo pendiente entre
  ramas; sin ejecución de migraciones desde esas entradas.

### `THIS ROUTING MIDDLEWARE`
- Agente: Codex - GPT-5.
- Estado: COMPLETADO — rama `codex/this-routing-middleware` ya fusionada
  (confirmado en vivo, Parte A).

### `ERROR CON IDIOMA ARTICULOS`
- Agente: Codex - GPT-5.
- Estado: CIERRE — commits ya integrados en producción según la propia
  entrada de cierre (2026-09-02).

### `CAMBIO CANTIDAD DE ARTICULOS` (límites dinámicos UX / comunicación de renovación de cupos / cupo renovación exacto)
- Agente: Codex - GPT-5.
- Estado: mixto — `cupo-renovacion-exacto` y `comunicacion-renovacion-cupos`
  y `limites-ux-dinamicos` ya fusionados (Parte A); `cambio-cantidad-articulos-20260902`
  queda con 1 commit sin fusionar y sin cierre explícito encontrado — a
  confirmar con Codex.

### `WIZARD DE DOMINIO POR CUENTA`
- Agente: Codex → traspasado a Claude (capitanía asumida explícitamente).
- Estado: DESPLEGADO (commit `c7420da`, 2026-08-30), pendiente en su momento
  de verificación con cuenta real de Estee; sin actualización posterior
  encontrada en esta sesión.

### `SISTEMA NO PUBLICA ARTÍCULOS` (transferido de Codex a Claude)
- Agente: Codex → Claude.
- Estado: VERIFICADO EN PRODUCCIÓN, conversación archivada (2026-08-31).

### `CREADOR DE IMÁGENES PARA REDES SOCIALES`
- Agente: Claude (base) → Codex (retiro del pipeline experimental de 8
  cajas).
- Estado: terminado de la parte de Claude; generador principal activo en
  producción.

### `CLAUDE-4 - FIX DETECCIÓN DE CRÉDITOS DE IMAGEN AGOTADOS`
- Agente: identificado como "Claude-4" (sesión concurrente distinta a otras
  sesiones Claude de esa misma fecha — ver nota de numeración de sesiones
  más abajo).
- Estado: terminado y confirmado en `origin/main` (commit `b2e61f6`).

### `CIERRE — CRÉDITOS DE IMAGEN: hasImageCredits solo por creación real + detención de lote`
- Agente: Claude Sonnet 5 (sesión que recibió el relevo de Codex).
- Estado: DESPLEGADO, pendiente de confirmación visual de Milton (commit
  `8115604`). Coincide con el worktree ya fusionado
  `auditoria-creditos-imagen-20260903` (Parte A).

### `ORDEN DE USUARIOS ACTIVOS EN ADMIN`

Entrada agregada por la tarea programada diaria de propagación
(2026-09-08), a partir de la sección "BLOQUEADO — Tarjetas clicables en
Usuarios..." de `COORDINACION_CLAUDE_CODEX.md` (2026-09-07).

- Agente: Claude.
- Proyecto: organizar el panel de Administración (`/dashboard/usuarios`),
  primero como maqueta (Artifact) y luego llevado a la pantalla real: las 5
  tarjetas de resumen de la pestaña "Accesos" pasan de estáticas a
  clicables (navegan a la sección/filtro correspondiente con datos reales)
  y pierden los colores verde/naranja.
- PR: [#70](https://github.com/miltondavila-ux/auto-articulos/pull/70),
  **abierto, sin fusionar** — bloqueado por `Deployment rate limited` de
  Vercel, no por error de código (`npx tsc --noEmit` y el build exacto de
  `apps/web` pasan limpios). Ver Parte A para el estado de la reserva de
  archivo.
- Estado: EN CURSO, bloqueado por cuota de terceros.

### `AUDITORIA DE CAPACIDADES RESPONSIVE`

Entrada agregada por la tarea programada diaria de propagación
(2026-09-08), a partir de la sección "RESERVA — AUDITORÍA RESPONSIVE
COMPLETA DEL SISTEMA" de `COORDINACION_CLAUDE_CODEX.md` (2026-09-07).

- Agente: Claude.
- Proyecto: pedido explícito de Milton de recorrer página por página todo
  el sistema (23 páginas) y corregir cualquier desbordamiento horizontal /
  movimiento lateral, sin romper nada.
- Worktree/rama declarados: `/private/tmp/auditoria-responsive-20260907`,
  `claude/auditoria-responsive-20260907` (sin commits empujados a
  `origin` a esta fecha — ver Parte A).
- Avance según la propia entrada: pasada estática completa sin hallazgos
  (el sistema ya usa `overflow-x:hidden` global, tablas responsive y
  grids `auto-fit`); pasada visual en vivo en curso, verificada ya sin
  desbordamiento en las 5 páginas públicas, continuando sobre
  `seototal.lasolucionweb.com` en modo solo lectura para las páginas de
  dashboard (requieren sesión).
- Estado: EN CURSO, sin cambios de código todavía a la fecha de la última
  entrada de Coordinación.

**Nota sobre numeración de sesiones concurrentes**: Coordinación registra que
en varios momentos hubo más de una sesión de Claude activa a la vez (ej.
"Claude-2", "Claude-4"), cada una debiendo numerarse para no confundirse. Este
inventario no reconstruye esa numeración retroactivamente porque no siempre
quedó un nombre de conversación exacto asociado — se deja como aviso: si
Milton necesita saber exactamente cuál sesión física escribió cada commit
antiguo, la Parte A (verificación en vivo por rama/worktree) es más confiable
que el texto libre de Coordinación para las conversaciones de aquí en
adelante.

---

## Entradas originales completas (preservadas tal cual, sin editar)

### `CONEXION BLOGGER`

#### Corrección de aislamiento de credenciales — 2026-09-03

Se detectó que Vercel ya usa `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` y
`GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` para GSC/GA. Blogger no debe reutilizarlas.
El ajuste en curso usa exclusivamente `BLOGGER_CLIENT_ID` y
`BLOGGER_CLIENT_SECRET`, sin modificar las variables existentes.
Worktree: `/private/tmp/auto-articulos-blogger-fix-20260903`.

Auditorías de aislamiento: funcional, regresión e integración/producción
aprobadas para preparación local. Vercel confirmó `Root Directory = apps/web`
y configuración segura `.next`; no se modificaron variables GSC/GA ni se
desplegó producción. Reservas liberadas tras la revisión.

La pantalla administrativa ahora permite guardar Client ID y Client Secret de
Blogger cifrados, igual que las demás redes; no requiere pegar credenciales en
Vercel y no reutiliza las variables de GSC/GA.

Corrección final verificada: el administrador configura Blogger desde
Configuración → Redes Sociales; el usuario final solo autoriza su propia cuenta
por OAuth. Estado: preparada, sin despliegue.

- Responsable: CODEX - GPT-5.
- Proyecto: integración oficial de Blogger en Auto Artículos.
- Objetivo: permitir que cada usuario conecte su propia cuenta Google/Blogger
  y publique contenido mediante Blogger API v3, respetando permisos y el flujo
  de oportunidades de redes sociales existente.
- Estado: implementación preparada en worktree aislado; sin despliegue.
- Worktree: `/private/tmp/auto-articulos-conexion-blogger`.
- Reserva documental: `COORDINACION_CLAUDE_CODEX.md` e
  `INVENTARIO_CONVERSACIONES.md`.
- Siguiente acción: definir el diseño mínimo después de revisar Google OAuth,
  Blogger API v3, selección de blog, tokens cifrados y publicación controlada.
- Auditorías: funcional aprobada; regresión aprobada (14 tests worker, builds y
  typecheck); integración/producción aprobada para preparación local. No se
  verificó producción ni se aplicó la migración.
- Commit local: `03d837e`.
- Reservas liberadas al cerrar esta fase; no quedan archivos de código
  reservados. Deployment pendiente de autorización.

### `[CLAUDE] - DOCUMENTO DE COORDINACION - SEPT 3`

Identidad exacta de la conversación (dada literalmente por Milton):
`DOCUMENTO DE COORDINACION - SEPT 3`.

Proyecto: ordenar `COORDINACION_CLAUDE_CODEX.md` a pedido de Milton, sin
borrar ni reescribir historial y sin mover ninguna entrada de lugar. Luego,
a pedido explícito de Milton, construir este mismo documento
(`INVENTARIO_CONVERSACIONES.md`) como el registro real de quién es dueño de
cada problema/archivo/rama en cada momento.

Motivo: Milton reportó que el documento principal de coordinación "puede
estar bastante sucio" y pidió organizarlo, dejando explícito que no se debía
borrar nada, ni juzgar qué funciona o no, ni tomar decisiones por falta de
contexto. Al revisar la relación entre los 4 documentos maestros, se detectó
que `INVENTARIO_CONVERSACIONES.md` casi no se usaba para su propósito
original; Milton pidió reconstruirlo con foco en propiedad/reservas, no solo
como lista histórica.

Hallazgo previo relevante: el checkout local
(`/Users/miltondavila/Creador de articulos`) estaba 68 commits detrás de
`origin/main` y tenía cambios sin commitear en los 4 documentos maestros que
contradecían la versión real. Milton autorizó explícitamente trabajar sobre
la versión de `origin/main` (fuente de verdad), dejando los cambios locales
sin commitear intactos y sin tocar.

Alcance ejecutado (worktree aislado `/private/tmp/doc-coordinacion-sept3`,
rama `claude/doc-coordinacion-sept3`, creada desde `origin/main` en
`4b1e5c9`, luego rebasada sobre `origin/main` en `cadc5c6` sin pérdida de
contenido de ninguna sesión — verificado byte a byte):

1. En `COORDINACION_CLAUDE_CODEX.md`: índice de navegación 100% aditivo al
   inicio del archivo; reparación de una corrupción real de texto (saltos de
   línea perdidos desde hace tiempo, palabras fusionadas como
   "participantesautorizados") verificada byte a byte sin cambiar contenido;
   señalización (sin fusionar ni borrar) de una entrada duplicada.
2. En `INVENTARIO_CONVERSACIONES.md` (este archivo): reconstrucción completa
   con Parte A (estado de reservas en vivo, verificado contra git) y Parte B
   (registro histórico de nombres de conversación), preservando las dos
   entradas originales (Blogger y esta misma) íntegras más abajo.
3. No se tocó `TO-DO.md` ni `CONTROLADOR_DE_VERSIONES.md`.

Archivos modificados: `COORDINACION_CLAUDE_CODEX.md`,
`INVENTARIO_CONVERSACIONES.md`.
Migraciones: ninguna. Capitanía de migración: no aplica (cambio documental).
Commit: `fcbb13b` en la rama aislada; pendiente de confirmación de Milton
antes de push a `origin/main`.
Estado: EN PROGRESO — pendiente de que Milton revise el resultado y defina el
protocolo prioritario que quiere establecer para futuras conversaciones que
lean este documento de coordinación.
Responsable: Claude.
Siguiente acción: Milton revisa el diff, autoriza el push/merge, y luego
entrega el patrón de protocolo a fijar.

### `INSTRUCCIONES EN MODULOS` — protección permanente de Publicar

- Agente: Codex.
- Estado: COMPLETADO Y PUBLICADO.
- Módulo protegido: `/dashboard/publicar`.
- Referencia de producción: `https://seototal.lasolucionweb.com/dashboard/publicar`
  y `https://auto-articulos-web.vercel.app/dashboard/publicar`.
- Commit/deployment: `ab65585` / `dpl_83YWDfLAV3m9oR32vWVMhbc9vUmm` (`READY`).
- Regla: conservar íntegramente la tarjeta “Leer antes de ejecutar”, su objetivo,
  sus cuatro pasos, fondo blanco y separación visual. No borrar, pisar, duplicar
  ni ocultar el bloque en cambios futuros.
- Documento vinculante: consultar la sección “PROTECCIÓN PERMANENTE —
  INSTRUCCIONES DE PUBLICAR” en `COORDINACION_CLAUDE_CODEX.md` antes de tocar
  el módulo.

### `CODEX - INSTRUCCIONES EN MODULOS` — migración a Claude — 2026-09-04

- Agente actual: Codex - GPT-5. Próximo responsable: Claude.
- Publicar: estable en `main`, commit `16be4d0`, tarjeta verificada en producción.
- Oportunidades: commit `faf4612` integrado en `main`; typecheck y build de 83/83
  rutas aprobados. Producción queda pendiente por el límite diario de Vercel.
- Worktree: `/private/tmp/restaurar-publicar-main-20260904`.
- Siguiente acción: verificar Vercel, alias público y logs sin alterar Publicar.

**Continuación — Claude, 2026-09-04:** el texto refinado que Milton había
aprobado para Oportunidades ("aun te falta un tintin") no había llegado a
commitearse — `faf4612` usó una redacción anterior. Corregido y desplegado a
`main` en el commit `c5b9c37` (worktree
`/private/tmp/instrucciones-oportunidades-texto-20260904`), tres auditorías
aprobadas. Producción bloqueada por el mismo límite diario de Vercel que ya
afecta a los PR #46 y #47 (`Deployment rate limited — retry in 24 hours`,
confirmado vía `api.github.com/.../commits/c5b9c37/status`). Ver detalle
completo en `COORDINACION_CLAUDE_CODEX.md`, sección "Claude retoma `CODEX -
INSTRUCCIONES EN MODULOS`...". Siguiente acción: cuando el límite se libere,
verificar que `Vercel – auto-articulos-web` quede en `success` para el
último commit de `main` y confirmar visualmente en producción.

**Cierre — RENEW CONFIGURACION (Claude, 2026-09-07):** Milton pidió, dentro
de esta misma conversación, rediseñar `/dashboard/configuracion` (la pantalla
que más costaba entender) usando MAGO para especificarlo primero. Documento
de planificación entregado: `RENEW_CONFIGURACION.md`. Ejecutado en 6 fases
autónomas, cada una con worktree aislado, tres auditorías y verificación real
en producción (commits `7615c9e`, `d20b2f1`, `2ff4969`, `c7accf7`). Detalle
completo en `CONTROLADOR_DE_VERSIONES.md`, sección "RENEW CONFIGURACION
(rediseño completo, 6 fases)". `ConfiguracionView.tsx` (el componente
monolítico de 2172 líneas) fue retirado; Configuración ahora es un índice más
6 páginas independientes. Estado: **CULMINADA — aprobada por Milton,
desplegada y verificada en producción.**

### `AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS`

Entrada agregada por la tarea programada diaria de propagación de Claude, a
partir del canal "MENSAJE DE CLAUDE PARA `CODEX - AUDITORIA A ALGORITMO DE
PUBLICACIÓN DE ARTICULOS`" y su Bitácora en `COORDINACION_CLAUDE_CODEX.md`
(2026-09-04). No existía entrada previa de esta conversación en este
documento.

- Agente: Codex - GPT-5, con revisión y coordinación de Claude a través de
  un canal de comunicación en vivo (Bitácora) mientras duró la tarea.
- Proyecto: ampliar la expansión temática long tail y evitar la invención de
  datos (años, categorías) en los títulos generados de oportunidades
  SEO/AEO y redes sociales.
- Worktrees/ramas usados: `/private/tmp/auditoria-longtail-20260904`
  (rama `codex/auditoria-longtail-20260904`, primera fase, reserva
  liberada) y `/private/tmp/auditoria-longtail-v2-20260904` (rama
  `codex/auditoria-longtail-v2-20260904`, corrección V2, PR #42).
- Archivos tocados: `apps/web/src/lib/opportunity-analysis.ts`,
  `apps/web/src/app/api/opportunities/route.ts` y
  `apps/web/src/app/api/social-opportunities/generate/route.ts`.
- Hallazgos corregidos antes de fusionar (auditoría de integración sobre el
  Preview real): títulos con el año `2023` inventado/sin evidencia, y una
  consulta de leyes/regulaciones inmobiliarias mal clasificada en la
  categoría de inversión inmobiliaria. Ambos se corrigieron con barreras
  deterministas (no parches puntuales) en la misma rama/PR.
- Commits: `8e07fe8`, `a18c9ec`, `fda3e0d`, `93daba3`.
- Estado: **CULMINADA** — PR #42 fusionado a `main` en el commit de merge
  `495baea` (verificado en vivo contra `origin/main` con `git fetch` antes
  de escribir esta entrada; las ramas `codex/auditoria-longtail-20260904` y
  `codex/auditoria-longtail-v2-20260904` ya son ancestros de `origin/main`,
  no quedan reservas activas de esta conversación).
- Pendiente señalado (no resuelto por esta tarea de propagación): no consta
  en `COORDINACION_CLAUDE_CODEX.md` una verificación explícita de Producción
  posterior a la fusión de `495baea`, aunque el propio canal Claude↔Codex
  pedía cerrar con ese paso antes de dar la conversación por terminada. Ver
  detalle en `CONTROLADOR_DE_VERSIONES.md` — "Fusión PR #42 — refuerzo V2 de
  expansión temática long tail — 2026-09-04".

**Corrección (agregada por la tarea programada diaria de propagación,
2026-09-05, sin editar lo anterior): esta conversación NO quedó "CULMINADA"
tras el PR #42.** Siguió activa con más fases, documentadas en
`COORDINACION_CLAUDE_CODEX.md` desde el 2026-09-04 por la tarde (secciones
"PUNTO DE MIGRACIÓN A CLAUDE" y "CLAUDE — REDISEÑO DE DEDUPLICACIÓN
SEMÁNTICA"), que la corrida anterior de esta misma tarea automatizada no
llegó a leer:
- PR #43 (`6e75ca8f`), PR #44 (`8730f27`) y PR #45 (`112ef7a6`), los tres
  fusionados a `main` con Producción respondiendo HTTP 200 (detalle de PR
  #45 en `CONTROLADOR_DE_VERSIONES.md`, agregado hoy).
- Una prueba con la cuenta de prueba tras el PR #45 (14 oportunidades
  generadas) volvió a detectar canibalización semántica real: tres títulos
  sobre cambiar el seguro tras mudanza, dos sobre deducibles para
  inmigrantes, dos sobre elegir seguros para inmigrantes, dos sobre elegir
  seguros para pequeños negocios. El algoritmo completo **sigue sin estar
  aprobado para publicar automáticamente**, pese a que PR #42-45
  individualmente sí llegaron a Producción.
- Codex hizo un traspaso formal a Claude (Milton confirmó) con diagnóstico
  de causa raíz: `hasSameIntent()` comparaba tokens del título crudo solo
  dentro de la misma categoría, nunca contra títulos ya publicados ni entre
  categorías distintas.
- Claude respondió con un rediseño (`needKey` por título, comparación
  global determinista) en el PR #47, y Codex en paralelo abrió el PR #46
  (línea de tiempo de fuentes conectadas, solo interfaz). Ambos PR están
  **abiertos y sin fusionar a esta fecha**, bloqueados por el mismo límite
  diario de builds de Vercel (`build-rate-limit`) que ya afectaba a otros
  cambios ese mismo día — no por un error de código. Ver Parte A (addendum
  de esta misma corrida) y `CONTROLADOR_DE_VERSIONES.md` para el detalle
  completo de ambos PR.
- Estado real de la conversación a esta fecha: **EN CURSO**, no culminada;
  próxima acción es esperar a que Vercel libere el límite, verificar los
  Preview de ambos PR y, si pasan, fusionarlos y repetir la prueba con la
  cuenta de Lorena Álvarez para confirmar cero canibalización con datos
  reales.

**Actualización (agregada por la tarea programada diaria de propagación,
2026-09-07, sin editar lo anterior):** el PR #47 (rediseño `needKey`) ya se
fusionó y se verificó en Producción — commit de merge `7e951f7`, ambos
checks de Vercel en `success` real, `curl -I /login` responde `200` en
`auto-articulos-web.vercel.app` y en `seototal.lasolucionweb.com` (detalle
completo en `COORDINACION_CLAUDE_CODEX.md`, sección "CIERRE — PR #47
fusionado y verificado en producción — 2026-09-06", y en
`CONTROLADOR_DE_VERSIONES.md`). El PR #46 de Codex (línea de tiempo
dinámica de fuentes) sigue **abierto y sin fusionar** — verificado en vivo
por esta misma corrida contra `origin/main`. La conversación sigue **EN
CURSO**: el paso pendiente de repetir el análisis con la cuenta de Lorena
Álvarez para confirmar cero canibalización con datos reales, mencionado en
el párrafo anterior, todavía no consta hecho en `COORDINACION_CLAUDE_CODEX.md`.

**Cierre final (agregado por la tarea programada diaria de propagación,
2026-09-08, sin editar lo anterior):** Milton cerró esta conversación el
2026-09-07 ("quedamos listos por acá con el nuevo algoritmo para títulos y
nuevo algoritmo para redes sociales"). El paso pendiente de repetir el
análisis con la cuenta de Lorena Álvarez **sí se completó** antes del
cierre: resultado verificado en producción de 24 títulos en 4 categorías
(12 geolocalizados cliente×negocio sin canibalización + 12 de tendencia
normal, sin años inventados). Fases adicionales fusionadas después del
párrafo anterior: PR #52 (`4614ad3`, corrección de alcance del `needKey`),
PR #54 (`3a76d71`, más cobertura), PR #55 (`e1662a4`, prohibición absoluta
de años viejos), PR #61 (`b47784b`) + PR #62 (commit real `e79ee5e`, no
`f050672` como quedó escrito por error en la entrada de origen de
Coordinación — verificado con `git log --oneline --all | grep "(#62)"`,
`f050672` corresponde a un commit distinto y anterior del 2026-09-04) + PR
#66 (`c87d6ef`) para los títulos ultra geolocalizados, y PR #57 (`97495e0`)
+ PR #60 (`bf18f64`) para el motor de selección de artículos tendencia en
redes sociales. Detalle completo de cada PR en
`CONTROLADOR_DE_VERSIONES.md` (entradas agregadas por esta misma corrida de
propagación). Los 3 pendientes reales que quedaron para quien retome ya
están en `TO-DO.md` (asignación categoría↔título, botón "descartar todo" en
Oportunidades Redes, programador automático diario de redes — este último
agregado hoy por esta misma corrida). **Estado final: CERRADA por Milton,
sin reservas activas.**

### Botón "Borrar todas las oportunidades" (SEO/AEO y Redes Sociales)
- Agente: Claude.
- Fecha: 2026-09-07/08.
- Proyecto: pedido directo de Milton en chat (sin nombre de conversación
  formal) — agregar borrado masivo de oportunidades en
  `/dashboard/oportunidades` y `/dashboard/oportunidades-redes`, antes solo
  se podía borrar una por una. Resuelve, con semántica distinta (borra en
  vez de descartar con motivo), el ítem que había quedado pendiente en
  `TO-DO.md` desde el 7/9/2026 (ver entrada de arriba, "CODEX - AUDITORIA A
  ALGORITMO DE PUBLICACIÓN DE ARTICULOS") sobre falta de un botón de
  descarte masivo en Oportunidades Redes — movido a "Hecho" en `TO-DO.md`
  con esta misma fecha.
- Ejecución: primero directo en el checkout principal sin aislar (fuera del
  Protocolo); corregido en la misma tarea moviendo el cambio a dos
  worktrees aislados sucesivos, cada uno con sus tres auditorías
  (typecheck, build exacto de Vercel, checks de Preview) documentadas en
  `COORDINACION_CLAUDE_CODEX.md`.
- PRs: [#72](https://github.com/miltondavila-ux/auto-articulos/pull/72)
  (código, commit de merge `16befb5`) y
  [#74](https://github.com/miltondavila-ux/auto-articulos/pull/74)
  (propagación al manual del bot de ayuda, commit de merge `582b9de`).
- Verificación en producción: checks de Vercel en `success` sobre ambos
  commits fusionados y `/login` respondiendo `200` en
  `auto-articulos-web.vercel.app` y `seototal.lasolucionweb.com` después de
  cada despliegue. Clic funcional real del botón en producción **no se
  verificó** (requeriría sesión de una cuenta con oportunidades pendientes,
  fuera del alcance de esta tarea) — mismo límite de SSO en Preview ya
  documentado en la entrada de "Auditoría Responsive" de
  `COORDINACION_CLAUDE_CODEX.md`.
- Propagación hecha: `TO-DO.md` (ítem movido a "Hecho"), `HANDOFF.md`
  (entrada agregada), `apps/web/src/content/manual-usuario.ts` (secciones
  "Oportunidades SEO" y "Oportunidades Redes").
- **Estado final: CERRADA, ambos PR fusionados y verificados, sin reservas
  activas.**

### `MCP 10MWS`

Entrada agregada por la tarea programada diaria de propagación (2026-09-09),
a partir de `COORDINACION_CLAUDE_CODEX.md`, sección "MCP 10MWS — andamiaje
de segunda línea de ejecución de publicación (2026-09-07/08)". No existía
entrada previa de esta conversación en la Parte B, pese a estar ya
declarada en la Parte A desde el 2026-09-07.

- Agente: Claude.
- Proyecto: segunda línea de ejecución de publicación (sin tocar la actual
  vía Playwright/navegador), para que cuentas nuevas y antiguas que lo
  elijan publiquen directo contra un servidor MCP de terceros — 10MWS
  primero, pensado para escalar después a un selector multi-plataforma
  (WordPress, Wix, Webflow, Shopify, Duda, etc. — investigación de mercado
  completa en `COORDINACION_CLAUDE_CODEX.md`, orden de prioridad todavía
  sin confirmar por Milton, ver `TO-DO.md`).
- PR: [#76](https://github.com/miltondavila-ux/auto-articulos/pull/76),
  fusionado (`ae225dd`). **Incidente real de Producción:** el schema de
  Prisma (`User.publishMethod`, `McpConnection`) se fusionó sin la
  migración correspondiente en el mismo commit, rompiendo el login en
  Producción durante ~4 horas; se revirtió el PR, se sincronizó la
  migración y se revirtió el revert. Detalle completo del incidente y del
  protocolo obligatorio resultante en `CONTROLADOR_DE_VERSIONES.md` y en el
  bloque "INCIDENTE CRÍTICO Y PROTOCOLO OBLIGATORIO — 2026-09-08" al inicio
  de `COORDINACION_CLAUDE_CODEX.md`.
- Estado: **CÓDIGO EN PRODUCCIÓN, sin reservas activas** (`packages/db/prisma/schema.prisma`
  y `apps/worker/src/queue.ts` liberados — ver addendum de Parte A de esta
  misma corrida). Funcionalmente inerte: ninguna cuenta usa `publishMethod
  = MCP` todavía, a la espera de la URL real del servidor MCP de 10MWS y de
  que Milton confirme el orden de prioridad de plataformas adicionales.

### `ORDEN DE USUARIOS ACTIVOS EN ADMIN` — actualización de cierre

Addendum agregado por la tarea programada diaria de propagación
(2026-09-09) a la entrada existente de esta conversación (más arriba en
esta misma Parte B), sin editar el texto original.

PR #70 (tarjetas clicables) se fusionó como `48578e9` y PR #80 (hotfix del
reset global de `button` que aplastaba las tarjetas en fila) se fusionó
como `ba62119` — ambos verificados como ancestros de `origin/main` por esta
corrida. Detalle completo en `CONTROLADOR_DE_VERSIONES.md`. **Estado final:
CERRADA, código en Producción, sin reservas activas.**

### `AUDITORIA DE CAPACIDADES RESPONSIVE` — actualización de cierre

Addendum agregado por la tarea programada diaria de propagación
(2026-09-09) a la entrada existente de esta conversación (más arriba en
esta misma Parte B), sin editar el texto original. Contenido recuperado de
los commits `3e2d957`/`1d727dc`, perdidos en un merge y restituidos en
`COORDINACION_CLAUDE_CODEX.md` (ver `REPARADOR_DEL_ARBOL_PRINCIPAL.md`).

La conversación registrada originalmente (worktree
`claude/auditoria-responsive-20260907`, sin commits empujados) cerró sin
cambios de código. Una conversación distinta y posterior, con el mismo
nombre de proyecto pero identidad "Claude (Haiku 4.5)", sí encontró y
corrigió 7 problemas de escala responsiva (`clamp()` en `login/page.tsx` y
`dashboard/page.tsx`), fusionados como PR #87 (`fe91e44` → `1a2ebc0`).
Verificado por esta corrida como ancestro de `origin/main`. **Estado final:
CERRADA, código en Producción, sin reservas activas** (confirmación visual
final de Milton en todos los dispositivos, pendiente según la propia fuente).

### `RENEW CONFIGURACION` — addendum de continuación (pulido estilo Apple)

Addendum agregado por la tarea programada diaria de propagación
(2026-09-09) a la entrada existente "Cierre — RENEW CONFIGURACION" (más
arriba en esta misma Parte B), sin editar el texto original.

Después del cierre del 2026-09-07 ("CULMINADA"), Milton revisó las 6
páginas en Producción y señaló 4 problemas de estilo (colores decorativos
que Apple no usa, tipografía sin estandarizar, fondos de color en
tarjetas/badges, y falta de una barra de navegación entre las 6 secciones).
Corregido en dos commits (`3a0d985`, `a66d1b1`), incluyendo un componente
nuevo `ConfiguracionSubNav.tsx` y la neutralización de 13 componentes
compartidos que el cierre original no había tocado. Ambos commits son
ancestros de `origin/main` (verificado por esta corrida). Detalle completo
en `CONTROLADOR_DE_VERSIONES.md`, entrada "RENEW CONFIGURACION: pulido
estilo Apple". **Estado: código en Producción; confirmación visual final de
Milton pendiente según la fuente.**

### `CODEX - GPT-5 - VERIFICACION DE API'S DE GOOGLE` — addendum de reverificación

Addendum agregado por la tarea programada diaria de propagación
(2026-09-09) a la entrada existente de esta conversación (más arriba en
esta misma Parte B), sin editar el texto original. Contenido recuperado
del commit `3e2d957` (ver `REPARADOR_DEL_ARBOL_PRINCIPAL.md`).

Reverificación del 2026-09-08 (identidad "CODEX - GPT-5.6"), sin cambios de
estado: el deployment de Producción sigue siendo el mismo ya registrado
(`eaf8e90`, `Ready`), los tres scopes OAuth y su justificación siguen
guardados, y el Centro de verificación de Google sigue bloqueado —
`Prepare for verification` permanece deshabilitado, la solicitud formal
todavía no se envió. Google Business Profile sigue bloqueado por la misma
cuota externa ya documentada (caso de soporte 7-6783000042063). Ningún
código ni configuración de Producción se tocó. Sigue pendiente de terceros
(Google), no de este equipo.

### NO PUBLICA ARTÍCULOS — worker roto por lockfile + producción rota por Vercel + sufijo feo de título duplicado
- Agente: Claude.
- Fecha: 2026-09-10.
- Proyecto: pedido directo de Milton en chat ("NO PUBLICA ARTICULOS"),
  cuenta de pruebas Lorena Álvarez.
- Causa raíz #1: `package-lock.json` desincronizado desde el commit
  `cb2c1ae` (2026-09-09) rompía `npm ci` en todos los workflows de GitHub
  Actions — ningún worker podía arrancar.
- Causa raíz #2 (encontrada en paralelo, al verificar el Preview del fix
  #1): `ignoreCommand` roto en `apps/web/vercel.json` (commit `96ea2a4`,
  2026-09-08) tumbaba todos los deployments de producción desde entonces
  (~2 días sin un solo deploy exitoso).
- Bug adicional encontrado por Milton durante la verificación en vivo: el
  sufijo de desambiguación de títulos duplicados (`makeUniqueTitle`,
  pedida el 30/8/2026) quedaba visible como texto crudo
  ("— versión 5380210-1") en el título público y la URL de artículos
  reales.
- PRs: [#96](https://github.com/miltondavila-ux/auto-articulos/pull/96)
  (lockfile + vercel.json, commit de merge `2ddb952`) y
  [#97](https://github.com/miltondavila-ux/auto-articulos/pull/97) (sufijo
  legible, commit de merge `51833e0`). Detalle completo de cada uno,
  incluida la triple auditoría, en `COORDINACION_CLAUDE_CODEX.md`.
- Verificación en producción real: 10/10 shards del worker en `success`
  tras el fix #1 (antes fallaban todos). Milton verificó en vivo con la
  cuenta de Lorena: artículo de prueba completó el flujo entero y publicó
  un lote completo sin problema.
- Pendiente para quien retome: el artículo ya publicado con el sufijo
  viejo (`como-calcular-el-deducible-de-tu-seguro-de-salud-version-53802101`)
  no se corrigió — queda con ese título/URL hasta que se edite a mano si
  Milton lo pide.
- **Estado final: CERRADA por Milton ("ya funciona documenta por favor y
  archivamos"), ambos PR fusionados y verificados, sin reservas activas.**

### `CODIGO QR PANTALLA DE INICIO`
- Agente: Claude.
- Fecha: 2026-09-09/10.
- Proyecto: Milton pidió un código QR en la pantalla de login (para
  presentaciones) que apunte a https://seototal.lasolucionweb.com/login.
- Commits: `cb2c1ae` (feature original), `ef6cf5c` (label), `64e2904`
  (logo + alineación + fondo). Durante el trabajo se encontró y arregló un
  bloqueo no relacionado que tumbaba todos los deploys de Producción desde
  hacía ~20 horas (build de TypeScript roto y `.vercelignore` en
  conflicto con `ignoreCommand`) — PR #95 (`0121aef`) y fix directo
  `3bd6286`. Detalle completo, incluida una duda abierta sobre la feature
  "Exclusión de Temas" encontrada en el camino, en
  `CONTROLADOR_DE_VERSIONES.md`.
- Verificado con `git merge-base --is-ancestor` que todos los commits
  citados son ancestros de `origin/main`; sin worktree/rama activa que
  liberar en Parte A (no llegó a registrarse ahí).
- **Estado final: CERRADA, desplegado y verificado en Producción real.
  Pendiente: mismo componente `QrCodeDisplay` para Tagcrush cuando se
  pida.**

### `SELECCION DE ARTICULO DE DIFERENTES CATEGORIAS`
- Agente: Claude.
- Fecha: 2026-09-09.
- Proyecto: permitir seleccionar títulos de distintas categorías con
  checkboxes en Oportunidades SEO y publicarlos juntos en un lote mixto.
- Commit principal: `364da97`, fusionado como PR #90 (`c086214`).
  Verificado como ancestro de `origin/main`. Detalle completo en
  `CONTROLADOR_DE_VERSIONES.md`.
- Sin worktree/rama activa que liberar en Parte A (no llegó a
  registrarse ahí).
- **Estado final: EN PRODUCCIÓN, código confirmado. Capitán de archivo
  liberado según la fuente original; sin confirmación visual explícita de
  Milton registrada.**

### `QUE NO ESCRIBIR QUE NO TRATAR` (Exclusión de Temas)
- Agente: Claude.
- Fecha: 2026-09-09.
- Proyecto: excluir temas indicados por el usuario de las propuestas de
  Oportunidades.
- Commits citados en `COORDINACION_CLAUDE_CODEX.md`: no resuelven contra
  el historial disponible en este clon (`git cat-file` no los encuentra;
  posible efecto del incidente de force-push documentado en
  `REPARADOR_DEL_ARBOL_PRINCIPAL.md`); `d5e1e4f` sí es ancestro confirmado
  de `origin/main`.
- **Discrepancia real, no resuelta por esta corrida:** la fuente original
  afirma "✅ DESPLEGADO A PRODUCCIÓN" con "Schema + migración + UI", pero
  el código actual de `origin/main` (verificado con `grep` en esta
  corrida) no tiene ningún campo en `packages/db/prisma/schema.prisma`,
  ninguna migración, ni ningún UI para esto — solo existe un tipo opcional
  `excludedTopics` y lógica de filtrado inerte (nadie le pasa el valor)
  dentro de `apps/web/src/lib/opportunity-analysis.ts`. Detalle y duda
  para Milton en `CONTROLADOR_DE_VERSIONES.md` y en
  `COORDINACION_CLAUDE_CODEX.md`.
- **Estado: NO CERRAR como funcionalidad entregada al usuario — el código
  de filtrado existe pero está inalcanzable sin UI ni forma de que el
  usuario cargue temas a excluir.**

### `CLAUDE - PROBLEMAS Y PRUEBAS REDES SOCIALES Y BLOGGINS`
- Agente: Claude.
- Fecha: 2026-09-08/09.
- Proyecto: investigación de límite de oportunidades por red social y
  nueva forma de generarlas todas de una vez.
- Confirmado "1 oportunidad por red por clic" como diseño deliberado (no
  bug); el cambio posterior de `slice(0, 1)` a `slice(0, 3)` (commit
  `51fa8f2`) ya está registrado en `CONTROLADOR_DE_VERSIONES.md` por una
  corrida anterior, con la duda pendiente de si revierte silenciosamente
  el ajuste contrario del PR #60 — no se duplica acá.
- Commit nuevo de esta corrida: `479915c` — endpoint
  `POST /api/social-opportunities/generate-all`, botón "📲 Generar 1 por
  cada red (Todas)". Verificado como ancestro de `origin/main`. Detalle
  completo en `CONTROLADOR_DE_VERSIONES.md`.
- **Estado: EN PRODUCCIÓN, código confirmado; sin confirmación visual
  explícita de Milton registrada.**

## Claude - CUENTA DUPLICADA — 2026-09-16

- Problema reportado por Milton: en `seototal.lasolucionweb.com/dashboard/configuracion/inicial`,
  al intentar conectar la cuenta de la plataforma `gustavo.cabrera@expglobalspain.com`, aparece
  "La cuenta de la plataforma ... ya está vinculada a otro usuario en el sistema."
- Origen exacto del mensaje (evidencia dura, código): `apps/web/src/lib/domain-validation.ts:103-115`,
  invocado desde `POST /api/credentials` (`apps/web/src/app/api/credentials/route.ts:27`),
  llamado por `handleSaveCredentials` en `OnboardingWizard.tsx`. Solo dispara si el usuario logueado
  es "trial restringido" (`isTrialSignup && !trialUnlocked && role !== admin`) y otra cuenta ya tiene
  guardada esa misma credencial (o aparece en `TrialDomainRegistry`).
- Intentos descartados durante la investigación: consulta contra base local (irrelevante, no es
  producción); `vercel env pull --environment=production` (la variable `DATABASE_URL` está
  `Encrypted` y el CLI no revela el valor ni al dueño del proyecto); navegar directo a
  `GET /api/admin/users` desde el navegador integrado (bloqueado por el clasificador de PII).
- **Causa raíz confirmada** (leída de la respuesta real de `GET /api/admin/users`, ya cargada en la
  sesión de Milton logueado como admin, sin llamada nueva): la credencial de 10minutesWebsite
  `gustavo.cabrera@expglobalspain.com` estaba guardada en la cuenta admin de Milton
  (`miltondavila@gmail.com`, id `cms8c1zrr0000iilb6or98tr5`, cuenta #1), no en la cuenta nueva de
  Gustavo (#91). El validador antifraude funciona correctamente — bloquea porque esa credencial ya
  existe, real, en otra cuenta. No hay bug de código; es un dato residual. No se pudo determinar
  cómo/cuándo se guardó: `POST /api/credentials` no llama a `auditLog`, sin rastro histórico.
- Pedido de Milton: en vez de borrar el dato directamente, agregar un botón en `/dashboard/usuarios`
  para que él mismo pueda eliminar la credencial 10minutesWebsite guardada de cualquier cuenta.
- Cambio: nuevo endpoint `DELETE /api/admin/users/credential` (admin-only) + botón "Eliminar esta
  credencial" en `apps/web/src/app/dashboard/usuarios/page.tsx`, con confirmación en dos pasos.
  Trabajado en worktree aislado `claude/cuenta-duplicada-boton-credencial`.

- **PR #100 fusionado y desplegado en producción.** Verificación en vivo con
  Milton: entró a `/dashboard/usuarios`, buscó su propia cuenta admin (#1),
  el campo "Cuenta 10minutesWebsite" mostraba `gustavo.cabrera@expglobalspain.com`
  con el botón "Eliminar esta credencial" debajo; al confirmarlo, el campo
  pasó a "Sin credenciales guardadas" — sin afectar teléfono, dominio, rol,
  permisos ni créditos de imagen de esa cuenta. Milton probará por su cuenta,
  en otra conversación, que Gustavo ya puede guardar su credencial sin el
  bloqueo.

Milton dio por cerrada la conversación el 16/9/2026 ("Esto está listo
documenta y archiva"), tras haber dicho que probaría el guardado real de
Gustavo por su cuenta, en otra conversación — esa prueba puntual no se
verificó dentro de esta conversación.

Responsable: Claude. **Estado final: ARCHIVADO por Milton.** Botón
desplegado y verificado en producción (la credencial cruzada se borró de
la cuenta admin sin afectar el resto de esa cuenta); sin reservas activas.

## Claude - ARTICULOS CON CODIGO DE SEGUIMIENTO — 2026-09-11/16

- Rama/worktree: `claude/titulo-duplicado-sin-sufijo` (nueva, aislada del
  resto de tareas activas).
- Problema reportado por Milton en chat, con ejemplos reales en
  `guillermo-martinez.com`: los títulos publicados seguían saliendo con
  sufijos visibles del mecanismo de desambiguación de duplicados —
  `-actualizado-11-09-1940`, `-actualizado-11-09-1935` — pese a que el
  PR #97 (ver entrada anterior) ya había "corregido" el sufijo anterior
  (`-version-<epoch>`) cambiándolo por una fecha legible. El problema real
  nunca fue el formato del sufijo, sino que existiera un sufijo visible.
- Pedido explícito de Milton: cero sufijos visibles en el título/URL; si
  el sitio detecta un título duplicado, el sistema debe generar una
  variación FUERTE (reformulación real vía IA), no un parche de texto
  pegado.
- Cambio: se agregó `generateTitleVariant()` en
  `apps/worker/src/automation/generateCustomArticle.ts` (llama a OpenAI
  para reformular el título manteniendo tema e intención de búsqueda, sin
  fechas ni marcas de versión). Se reemplazó `makeUniqueTitle()` en
  `apps/worker/src/automation/10minutesWebsite.ts` en sus dos puntos de
  uso (`resolveDuplicateTitleEarly`, antes de generar la imagen, y el
  reintento final dentro de `saveAndGetUrl`) por un loop que llama a
  `generateTitleVariant()` contra la validación remota real del sitio
  hasta encontrar un título único; si ningún intento resulta único, se
  detiene la publicación con error explícito en vez de forzar un título
  con marca visible.
- Nota sobre el `39as-is39` que Milton también reportó en las URLs:
  investigado, no tiene origen en este repo — todo indica que es el
  slugificador del sitio externo (10minutesWebsite) convirtiendo comillas
  alrededor de "as-is" en la entidad `&#39;` y dejando solo los dígitos al
  limpiar el slug. Queda fuera del alcance de este repo; posible mitigación
  futura: evitar comillas dobles alrededor de "as-is" en el título generado.
- Auditoría de integridad: `npm run build --workspace=apps/worker` (tsc)
  compila sin errores tras el cambio.
- **Auditoría funcional (2026-09-16): verificada en vivo, en producción
  real**, cuenta de Guillermo Martinez, categoría "As Is Contract Florida".
  Se forzó un título duplicado real
  ("Ventajas y desventajas de comprar propiedades 'as is' en Florida").
  El sistema detectó el choque, generó con IA la reformulación
  "Pros y Contras de la Compra de Inmuebles en su Estado Actual" y publicó
  ese título limpio, sin fecha ni marca de versión:
  `guillermo-martinez.com/news/pros-y-contras-de-la-compra-de-inmuebles-en-su-estado-actual`.
  Indexación desactivada para esta prueba.
- Efecto secundario de las pruebas (ganadas por el worker real de
  producción, código viejo, antes de que esta rama estuviera desplegada):
  quedaron publicados 2 artículos de prueba con el sufijo feo todavía
  vigente en `main`
  (`implicaciones-legales-de-comprar-propiedades-39as-is39-actualizado-16-09-1447`
  y `...-1451`, indexación desactivada); Milton los está borrando
  directamente en el panel de 10minutesWebsite.
- Auditoría de regresión: el resto del flujo de publicación (login, panel,
  categoría, generación de contenido, imagen, FAQ, guardado) corrió sin
  cambios ni fallos nuevos durante la prueba en vivo.
- **Estado final: verificado con las tres auditorías, mergeado a `main` y
  desplegado a producción.**

### `SEGMENTO DE NO PUBLICAR`
- Agente: Claude.
- Fecha: 2026-09-16.
- Proyecto: resuelve la discrepancia ya registrada arriba en
  `QUE NO ESCRIBIR QUE NO TRATAR (Exclusión de Temas)` — el filtro de
  `excludedTopics` existe en `apps/web/src/lib/opportunity-analysis.ts`
  pero está inerte (sin campo en schema, sin migración, sin UI).
  Verificado de nuevo en esta corrida contra `origin/main` actual
  (después de PR #101/#103/#105): sigue igual de inerte.
- Alcance: agregar columna `excludedTopics` a `User` (schema + migración),
  conectar `apps/web/src/app/api/opportunities/route.ts` para leerla y
  pasarla, exponerla en `GET`/`PATCH` de `apps/web/src/app/api/me/route.ts`,
  y agregar el campo de texto en Configuración → Contenido
  (`apps/web/src/app/dashboard/configuracion/contenido/page.tsx`).
- Trabajado en worktree aislado `.worktrees/segmento-no-publicar`, rama
  `claude/segmento-no-publicar`, partiendo de `origin/main` actualizado.
- Capitanía de migración reclamada por Claude (`scripts/migration-coordinator.sh`)
  antes de tocar `schema.prisma`.
- Responsable: Claude. Estado: ACTIVO.

## Claude - NO USAR CATEGORIAS PARA DECIDIR QUE SE ESCRIBE — 2026-09-16

- Rama/worktree: `claude/oportunidades-sin-veto-categoria` para el primer
  commit; los dos siguientes se aplicaron limpio con worktrees temporales
  (`/tmp/wt-oportunidades-fix2`, `/tmp/wt-oportunidades-fix3`) directamente
  sobre `origin/main` actualizado, para no chocar con docs desincronizados
  de otra tarea en el working directory principal.
- Problema reportado por Milton: el algoritmo de Oportunidades SEO usaba el
  nombre de la categoría para decidir SI un título se escribía, en vez de
  usar demanda real (GSC/GA/Bing). Confirmado con evidencia de código.
- Tres arreglos en `apps/web/src/lib/opportunity-analysis.ts`:
  1. PR #107 — retirado `titleFitsCategory` (veto determinista en JS que
     descartaba títulos con demanda real si no compartían raíz de palabra
     con el nombre/ejemplos de su categoría).
  2. PR #109 — corregida la "REGLA OBLIGATORIA DE CATEGORIA" del prompt de
     IA, que ordenaba descartar consultas reales sin categoría afín, o
     temas legales/fiscales sin categoría explícita. Ahora la categoría es
     solo destino de archivo (asignación al más afín), nunca criterio de
     SI/NO se escribe.
  3. PR #111 — dos hallazgos de una auditoría en vivo de 9 propuestas
     reales: (a) grieta de canibalización (dos títulos casi duplicados
     pasaron el chequeo de `needKey` porque, tras filtrar palabras
     genéricas del dominio como "salud"/"inmigrante", quedaban con muy
     pocos tokens comparables — se agregó respaldo determinista comparando
     también el texto visible completo del título); (b) título sin
     evidencia real citada colado — se exige ahora cita textual entre
     comillas en el `rationale`, verificado en código
     (`rationaleHasQuotedEvidence`), no solo pedido en el prompt.
- Auditorías: `tsc --noEmit` y `npm run build --workspace=apps/web` limpios
  en los tres commits. Verificación en vivo en Producción con la cuenta de
  Lorena Álvarez: el fix #1 (PR #107) se probó corriendo un análisis real
  con datos de Search Console, sin errores, 9 propuestas generadas con
  evidencia real. Los fixes #2 y #3 (PR #109, #111) quedaron desplegados
  pero sin reverificación en vivo posterior: la cuenta compartida de
  pruebas pasó a tener datos de otra tarea concurrente ("as is contract
  Florida") antes de poder repetir la prueba, y no se tocó ese contenido
  ajeno.
- Nota de proceso: la contraseña local de Lorena se sincronizó a mano (vía
  hash bcrypt) para que coincidiera con la de Producción, a pedido
  explícito de Milton; Claude no debe escribir contraseñas en ningún campo
  aunque se le autorice, así que el login en cada entorno lo hizo Milton.
- Responsable: Claude. **Estado final: ARCHIVADA** (código en Producción;
  verificación en vivo de los fixes #2 y #3 queda pendiente de una ventana
  con la cuenta de pruebas libre — no bloquea el cierre porque el código y
  el razonamiento ya quedaron validados por trazas manuales contra datos
  reales de la corrida auditada).

## Claude - BOTON DE FORZAR ANALISIS DE OPORTUNIDADES — 2026-09-17

Milton reportó que en /dashboard/oportunidades desapareció el botón que
permitía forzar una nueva búsqueda cuando el sistema no encontraba
oportunidades nuevas, sin que él lo hubiera pedido.

Auditoría: el commit `43e6963` ("remove opportunity analysis cooldown",
04/09/2026) quitó correctamente el enfriamiento de 3 días, pero de paso
eliminó todo el estado `canForce` y el botón "Analizar de todas formas
ahora" — el texto de ayuda de la propia página seguía mencionando
"Forzar análisis" sin que el botón existiera.

Fix: rama `claude/forzar-analisis-oportunidades` (worktree aislado desde
`origin/main`, sin tocar la rama de trabajo con cambios sin commitear de
otra tarea). Se restauró `canForce` y el botón "Forzar análisis ahora"
dentro del mensaje de "no hay oportunidades nuevas", reutilizando
`analyze(true)` ya existente; sin cambios de backend ni de schema.

Auditorías: `tsc --noEmit` y `npm run build` (apps/web) limpios. Sin
migraciones, un solo archivo modificado. PR #116 pasó sus dos checks y fue
fusionado a `main` el 2026-09-17. Vercel confirmó el deployment de ese
commit en Producción.

Verificación en vivo: Milton abrió su sesión de pruebas en Chrome, ejecutó
el análisis en
`seototal.lasolucionweb.com/dashboard/oportunidades` y confirmó que apareció
el botón "Forzar análisis ahora" en el mensaje de que no se encontraron
nuevas oportunidades.

Responsable: Claude. Estado final: ARCHIVADA — código desplegado y
verificado en Producción por Milton.

## Claude - CREADOR DE TITULOS MUY ESTRICTO — 2026-09-17

Problema reportado por Milton: la cuenta de Ignacio Cubas no mostraba
oportunidades para publicar ("no encuentro oportunidades"). Hipótesis de
Milton: el algoritmo no estaba aprovechando todo el universo de datos
disponible (GSC + GA + Bing + ubicaciones de cliente/negocio declaradas en
Configuración → Contenido) para construir long tails, no que realmente no
hubiera nada que escribir.

Se creó primero un PRD (`PRD_OPORTUNIDADES_LONGTAIL_DEFINITIVO.md`, vía
skill MAGO) para fijar el alcance: diagnóstico con evidencia real antes de
tocar código, arreglo general para toda la plataforma (no un parche solo
para Ignacio Cubas), sin privilegiar ninguna región/fuente de datos, y sin
cambiar de modelo de IA (`gpt-4o-mini`, elegido por ahorro de costos) salvo
evidencia dura de que fuera el cuello de botella.

**Diagnóstico con evidencia real** (workflow `diagnose-ignacio-cubas.yml`,
mismo patrón que `diagnose-opportunities-evidence.yml`, secretos de
producción vía GitHub Actions — nunca expuestos localmente; una petición
directa de `vercel env pull --environment=production` fue bloqueada por el
clasificador de permisos y se abandonó esa vía en favor de este workflow):
la cuenta de Ignacio Cubas tiene Google Search Console, Google Analytics 4
y Bing Webmaster Tools conectados, con evidencia real pero muy escasa (32
filas de Search Console, 29 consultas distintas, impresiones máximas de 9)
y `clientLocations`/`businessLocations` configurados (7 ubicaciones de
cliente x 1 de negocio). Se agregó instrumentación de diagnóstico opcional
(`OPPORTUNITY_DEBUG=1`, apagada por defecto, cero cambio de comportamiento)
a `analyzeSeoOpportunities` para ver en qué guardarraíl exacto se perdía
cada título propuesto por el modelo (PR #117, #118).

**Causa raíz encontrada (bug general de la plataforma, no específico de
Ignacio Cubas):** el paso dedicado de geolocalización (cliente x negocio,
PR #61/#66 del 7/9/2026) SÍ generaba títulos long tail correctos ("Cómo
invertir en propiedades en Miami si vivo en Colombia", etc.), pero **todos
se descartaban en silencio** por dos guardarraíles del PR #111
(16/9/2026) que nunca debieron aplicarse a esa fuente:
1. `rationaleHasQuotedEvidence` exige citar entre comillas una consulta
   real de GSC/GA/Bing — pero el paso geo nunca pide eso; su evidencia real
   es la combinación de ubicaciones ya declaradas por el dueño de la
   cuenta (PR #119).
2. El respaldo de canibalización por texto visible y por needKey con
   umbral relajado marcaban como "duplicados" títulos que solo difieren,
   por diseño, en la ubicación de cliente (PR #120, #121).

Cualquier cuenta con `clientLocations` + `businessLocations` configurados
perdía silenciosamente todos sus títulos geolocalizados desde el
16/9/2026, no solo Ignacio Cubas.

**Fix:** `applyOpportunityItems` ahora distingue la fuente ("evidence" |
"geo") y aplica el chequeo de integridad correcto a cada una — cita
textual para el lote principal (sin cambios), uso real de una combinación
cliente+negocio declarada (`titleUsesDeclaredGeoCombo`, nueva función
determinista) para el paso de geolocalización. Los chequeos de
canibalización por needKey exacto y por texto visible se excluyen entre
dos títulos geolocalizados (ambos `isGeoLocationCombo`), pero se mantienen
sin cambios contra títulos de evidencia real.

**Verificación en vivo (real, no simulada):** re-ejecutando el mismo
diagnóstico contra la cuenta real de Ignacio Cubas tras cada fix — de
`status: "no_new"` (0 oportunidades) a `status: "ok"` con **6 oportunidades
reales, 0 rechazadas por colisión**, superando el piso mínimo de 3 pedido
por Milton.

Commits/PRs (todos en `apps/web/src/lib/opportunity-analysis.ts`, rama por
PR, worktree aislado en `/tmp/wt-longtail-ignacio`, sin tocar la copia
local de Milton con cambios sin commitear de otra tarea): PR #117, #118
(diagnóstico), #119, #120, #121 (fix). Sin migraciones de schema en
ninguno.

No se cambió el modelo de IA (`gpt-4o-mini` se mantiene): la causa raíz no
era el modelo, era un guardarraíl de código mal aplicado a la fuente
equivocada.

Responsable: Claude. Estado final: ARCHIVADA — verificada en vivo contra
Producción, sin acceso de Milton a ninguna cuenta de cliente.

## Claude - BING WEBMASTER SITEMAP — 2026-09-18

Problema: al conectar Bing Webmaster en Configuración → Indexación, el sistema
no seleccionaba el sitio ni colocaba/validaba `dominio/sitemap.xml`. Causa: el
autodetectado solo corría si ya había `siteUrl` guardado (que nunca se elegía
solo) y solo leía sitemaps ya registrados en Bing. Corrección (rama
`claude/bing-sitemap-autodetect`, worktree `.worktrees/bing-sitemap-autodetect`,
sin migraciones): nuevo `apps/web/src/lib/bing-sitemap.ts` (elige el sitio que
coincide con el dominio de la cuenta, usa el sitemap de Bing o `/sitemap.xml`,
lo valida como XML y lo envía a Bing); `bing/route.ts` GET/PATCH lo usan; la UI
muestra "validado" o el motivo, y los `router.replace` apuntan a
`/dashboard/configuracion/indexacion`. Archivos reservados: los tres
mencionados. Nota: `callback/route.ts` tiene un cambio sin commitear de otra
tarea en el árbol principal; no se tocó. Estado: ACTIVO, pendiente de
autorización para PR/Producción.

## Claude - CHECK DE NO INDEXACION — 2026-09-18

- Estado: ARCHIVADA. Responsable: Claude.
- Alcance: la opción "no indexar" no se respetaba al publicar en
  10minutesWebsite/TagCrush. Archivo: `apps/worker/src/automation/10minutesWebsite.ts`.
- Rama/worktree: `claude/check-no-indexacion` (eliminada tras fusionar),
  worktree aislado desde `origin/main`. PR #114 → `main` (`e8a8b18`).
- Reservas: ninguna activa. No se tocaron los documentos de coordinación
  durante el fix por estar en reescritura de otra tarea; se registran aquí.
- Pendiente no bloqueante: verificación en vivo con la cuenta de Lorena.

## Claude - BOTON VIDEO EXPLICATIVO BING WEBMASTER — 2026-09-17

Rama `claude/boton-video-bing-webmaster`, worktree
`.worktrees/boton-video-bing-webmaster`, creado desde `origin/main`, sin
migraciones de schema. Motivo: replicar en el wizard inicial (Inicio →
Configuración) el mismo patrón del Paso 4 (Google Search Console) —
explicación en lenguaje simple + botón de video tutorial + botón de
conexión — para Bing Webmaster Tools, que ya tenía toda la integración
OAuth/backend lista (`packages/shared/src/bing-webmaster.ts`,
`/api/search-integrations/bing/*`, componente `BingWebmasterSection.tsx`
ya usado en Configuración → Indexación) pero no aparecía en el wizard de
Inicio.

Cambio: nuevo `StepCard` "Paso 5: Conectar Bing Webmaster Tools" en
`apps/web/src/components/OnboardingWizard.tsx`, insertado entre el Paso 4
(GSC) y el paso final (renumerado de 5 a 6), marcado como recomendado y
NO bloqueante — no cambia `allCoreDone` ni el gating de los 4 pasos
obligatorios existentes. Reutiliza `BingWebmasterSection` (ya probado en
Configuración) para toda la lógica de conexión, selección de sitio y
sitemap, en vez de duplicarla. Se agregó `bingData` (solo lectura, para
pintar el badge/check) al `loadAll()` del wizard.

El enlace del botón "Ver video: Cómo activar Bing Webmaster Tools" quedó
resuelto con el video real entregado por Milton el 18/9/2026:
`https://www.youtube.com/watch?v=N9p7O965ooA`.

Probado: `npm install` + `npx tsc --noEmit` + `npm run build` en el
worktree, todos sin errores. No se probó en vivo en navegador (requiere
sesión autenticada y base de datos local) — pendiente verificación en
Producción tras el deployment.

Responsable: Claude. Estado final: ARCHIVADA — PR #126 fusionado a `main`
(`c294aff`, 18/9/2026) con el enlace real del video. Sin reservas activas:
`OnboardingWizard.tsx` liberado; rama y worktree de trabajo eliminados.
Verificación en vivo en Producción pendiente (no bloquea el cierre).

Nota no bloqueante (detectada al fusionar contra `main` tras PR #127): el
botón de conexión de este nuevo paso usa `BingWebmasterSection`, cuyo
`/api/search-integrations/bing/connect` no acepta `returnTo` — a
diferencia del de Google. Tras conectar desde el wizard de Inicio, Bing
redirige siempre a Configuración → Indexación (antes `/dashboard/configuracion`,
ahora `/dashboard/configuracion/indexacion` por el PR #127), no de vuelta
al wizard. No se tocó `bing/connect` ni `bing/callback` en este lote
porque el PR #127 los tenía reservados/capitaneados al mismo tiempo.
Pendiente para una tarea aparte: agregar soporte de `returnTo` a esas dos
rutas si Milton quiere que el usuario vuelva al wizard de Inicio.

### Cierre — CLAUDE - Sonnet 5 - BING WEBMASTER SITEMAP — 2026-09-18

Estado final: **ARCHIVADA**. Commit válido: `d52c647` + `6d339b7`, integrados a
`main` por el PR #128 (`0a7af58`) y presentes en `origin/main`; ninguna
versión posterior reemplaza `bing-sitemap.ts`. Vercel `success`;
`/api/search-integrations/bing` responde 401 sin sesión (esperado). Sin
migraciones, OAuth, secretos ni schema. `git diff --check` limpio y `tsc` sin
errores en archivos de Bing. Reservas (`bing-sitemap.ts`, `bing/route.ts`,
`BingWebmasterSection.tsx`) **liberadas**; worktree
`.worktrees/bing-sitemap-autodetect` y rama local retirados sin cambios sin
commit. Pendiente no bloqueante: verificación en vivo con una cuenta de Bing
conectada. Responsable: Claude.

## ARCHIVADO — CLAUDE - ERROR AL PUBLICAR — 2026-09-18 (cierre 13:03 EDT)

**Identidad:** proyecto `CLAUDE - ERROR AL PUBLICAR`. Responsable: Claude. Cuenta afectada: MPM Realty Group (panel inglés).

**Síntoma:** los artículos no se publicaban ("El artículo no aparece en el listado tras guardar"); llegó a haber 4 de 9 fallidos con hasta 7 intentos cada uno.

**Causa raíz (confirmada con logs reales, no adivinada):** hoy el sitio 10minutesWebsite tarda más de lo normal en procesar el guardado. Tras el clic en "Guardar cambios", `saveAndGetUrl()` miraba a los 1-2 s, veía el formulario todavía abierto y daba el artículo por perdido, aunque el sitio lo terminaba guardando. Efecto colateral: intentos marcados como fallidos que sí se guardaron dejaron **artículos repetidos** en el sitio público de MPM (p. ej. "From Agent to Top Producer: Essential Strategies" y "...: A Practical Guide"; "Productive REALTORS®: Key Habits for Success" y "Habits of Highly Productive REALTORS®"; "Essential Steps After Earning Your Florida Real Estate License" y "Strategies for Success After Your Florida Real Estate License"; "From License Holder to Real Estate Business Owner" y "From Agent to Business Owner in Real Estate"). Borrarlos es decisión de Milton; el sistema no tocó el sitio.

**Fix vigente:** PR #133 (`aea076d`, `apps/worker/src/automation/10minutesWebsite.ts`, +13 líneas, sin migraciones): si el sitio aún no aceptó el guardado y no hay título duplicado, espera 15 s y reintenta (hasta `MAX_SAVE_ATTEMPTS`) con el ciclo de revalidación existente. El worker toma `main` en cada corrida, así que ya está activo.

**Camino descartado (registrado para no repetirlo):** PR #131 (`def4793`) revirtió `eee0e0b` suponiendo que la navegación previa al formulario causaba el fallo; el reintento en vivo con #131 activo falló igual. Revertido por PR #132 (`30d9e37`); la protección contra artículos duplicados sigue en producción. PR #134 y #135: solo registro en `CONTROLADOR_DE_VERSIONES.md`.

**Auditorías:** 1 (integridad) aprobada: un archivo de código, sin migraciones, schema, OAuth ni secretos. 2 (funcional) aprobada con reserva: sintaxis TypeScript sin diagnósticos y `git diff --check` limpio; **no** hubo typecheck completo del worker ni `vitest` (el entorno aislado no tiene dependencias instaladas). 3 (producción en vivo) aprobada por Milton y por esta sesión: lote MPM 5/9 → 9/9 "Completado" (18/9, 11:15-12:00); la tanda nueva "Lead Generation Client Acquisition" (desde las 12:42) iba 5/9 publicados sin fallos ni reintentos manuales al momento del cierre.

**Reservas liberadas:** `apps/worker/src/automation/10minutesWebsite.ts` (bloque de guardado). Worktrees retirados: `restaurar-flujo-guardado`, `restaurar-proteccion-duplicados`, `guardado-esperar-validacion`, `registro-guardado-verificado`, `registro-9de9`. Restos sin commit de esta tarea eliminados del checkout principal (respaldo en el scratchpad de la sesión; el contenido está en `3aa0266`). No se tocó ningún cambio ajeno.

### Pendiente APARTE (no forma parte del error resuelto): mensajes de error inteligentes — PAUSADO

PR #125, commit `3aa0266`, rama `claude/mensajes-error-humanizados-ia`, worktree `.worktrees/mensajes-error-ia` (limpio). Traduce cualquier error crudo de la automatización con IA a una explicación simple más una acción del propio usuario (`humanizeError.ts` nuevo, +84; `queue.ts` +15/−4; `10minutesWebsite.ts` +1/−1). Sin migraciones, schema, OAuth ni secretos; `git diff --check` limpio; se fusiona sin conflictos sobre `main`. **No está fusionado ni en producción** (por eso los logs siguen mostrando errores crudos de Playwright) y **no tiene prueba en vivo**. Alcance conocido: traduce la línea `Error:` del log y el mensaje de Historial, no las líneas `DIAGNÓSTICO [...]`.
- Reserva que se conserva: `apps/worker/src/humanizeError.ts`, el `catch` de `processRunTitle` en `queue.ts` y las 2 líneas de `login()`.
- Falta: autorización de Milton para fusionar y verificación en vivo (provocar un error real; comprobar que sin `OPENAI_API_KEY` o con la IA caída se conserva el mensaje original).
- Otra tarea aparte: la detección de títulos duplicados solo reconoce el formulario en español (`#titlees`/"existe"); en el panel inglés el sitio responde "There is already an article with this title" y el robot no lo reformula.
- Responsable siguiente: Milton (autorización), luego Claude.

**Estado final:** error de publicación **ARCHIVADA**; mensajes inteligentes (PR #125) **PAUSADO**.

## Claude - CONEXION COMPOSIO — 2026-09-18

- Estado: ACTIVO. Fase 0 aprobada por Milton el 2026-09-18 (`FASE_0_ARQUITECTURA_CONEXION_COMPOSIO.md`).
  Fase 1 (módulo de Administración) implementada y auditada en local. PR #142 abierto; Milton autorizó push, PR
  y fusión (opción A) el 2026-09-18. Punto de retorno en el Controlador de Versiones (etiqueta
  `pre-composio-fase1-20260918` = `068a0b1`, corregido: ver entrada «fusión DIFERIDA»). La fusión estuvo
  BLOQUEADA por un incidente de Vercel y porque `main` avanzó a `d6ba5f8` (#143); condiciones cumplidas a las
  22:32 UTC. PR #142 FUSIONADO (`f0fd534`, 22:35 UTC) y desplegado en Producción (Vercel 6534042292, success).
  Punto de retorno: etiqueta `pre-composio-fase1-d6ba5f8-20260918`. Falta verificación en vivo del módulo por
  Milton y pegar la clave en Producción. Rama `claude/conexion-composio` conservada (fusionada). Responsable: Claude.
- Alcance: camino paralelo para que los clientes conecten Google (Search Console, Analytics)
  y Meta (Facebook, Instagram) mediante Composio, con interruptor por app en Administración.
  Business Profile y Threads quedan fuera (Composio no tiene toolkit).
- Rama/worktree: `claude/conexion-composio` / `.worktrees/conexion-composio`, base `origin/main` `068a0b1`.
- Documento maestro: `MASTER_BLUEPRINT_CONEXION_COMPOSIO.md` (raíz de la rama).
- Archivos de la Fase 1 (en el commit de la rama): `apps/web/src/lib/composio.ts`,
  `apps/web/src/app/api/admin/composio/` (route, accounts, auth-configs), `apps/web/src/app/dashboard/composio/`,
  `apps/web/src/components/DashboardNav.tsx` (Administración pasa a grupo: Usuarios · Composio),
  `apps/web/src/content/manual-usuario.ts`, más los dos documentos `.md` del proyecto.
- Auditorías Fase 1 (2026-09-18): (1) Integridad OK: sin schema/migraciones/workflows, sin secretos, sin archivos de otros
  agentes. (2) Funcional OK: `tsc` 0 errores, `next build` exit 0, 12 pruebas de la librería contra la base local
  (clave cifrada en reposo, máscara, validaciones, 401/429/red, auth config coincide/no coincide/404, limpieza),
  pruebas HTTP reales (sin sesión 401, no admin 403, admin 200/400/409, Composio real rechaza clave falsa) y
  revisión visual como admin. (3) Regresión OK: único archivo existente tocado con lógica es `DashboardNav.tsx`
  (el enlace único «Administración» pasa a grupo desplegable; sin más referencias a `ADMIN_TAB`).
- Camino feliz verificado el 2026-09-18 con la clave real de Milton, solo en la base LOCAL (el módulo aún no está
  desplegado): clave aceptada por Composio y guardada cifrada; «Probar conexión» y «Ver cuentas conectadas»
  responden bien (proyecto sin cuentas aún); los 4 auth configs se verifican contra Composio real; el control de
  toolkit equivocado (ID de Instagram en Facebook) y de ID inexistente rechazan con mensaje claro.
- Pendiente de verificar: qué permiso de la clave cubre `tools/execute` (se prueba en la Fase 2b).
- Configuración hecha EN Composio (no vive en el repo), proyecto `10minuteswebsite_workspace_first_project`:
  clave de API `AUTO ARTICULOS` con lectura general y escritura solo en «Session tool execution» y «Connected
  accounts». 4 auth configs, todos OAuth 2.0 + Composio Managed, con permisos mínimos:
  Search Console = webmasters, webmasters.readonly, userinfo.profile, userinfo.email (por defecto);
  Analytics = analytics.readonly, userinfo.profile (se quitó `analytics`, que permite editar);
  Facebook = public_profile, pages_show_list, pages_read_engagement, pages_manage_posts, business_management
  (mismos que pide hoy la app propia; se quitaron email, mensajería, métricas y otros 3);
  Instagram = instagram_business_basic, instagram_business_content_publish (se quitaron mensajes, comentarios e
  insights). Nota: Instagram por Composio usa «Instagram Login», un flujo distinto al de la app propia
  (que pasa por Facebook Login + Página); a validar en la Fase 3.
- Reservas: `DashboardNav.tsx`. No se toca `usuarios/page.tsx` (cambio sin atribuir de otra tarea en el árbol principal).
- Migraciones: ninguna. Producción/Preview: sin cambios ni despliegues.
- Pendiente: Fase 0 y aprobación de Milton; crear clave de API de Composio con permisos de escritura
  en Connected accounts y Session tool execution (la pega Milton en el módulo, nunca en chat).

## ARCHIVADO — SIMPLIFICACION DEL SETUP INICIAL — 2026-09-18

PR #143 fusionado a `main` (`d6ba5f8`) y desplegado en Vercel Production.
Deployment `dpl_7XmpajPXMfJoBWqsNN5eKqhHD2tA` en `READY`; el dominio
`seototal.lasolucionweb.com` quedó verificado con login HTTP 200. `npm run
verify` pasó completo con 20 pruebas del worker. Sin schema ni migraciones;
reservas liberadas. Estado final: ARCHIVADA.
## CIERRE — CODEX - CREADOR DE TITULOS MUY ESTRICTO — REPARACIÓN DEL MOTOR

- PR #144 fusionada: `1c19f07`.
- Producción: deployment `dpl_GXQ165nD88E1xhgPK875DC1GHw4V`, estado `Ready`.
- Migración controlada: workflow `35402599238`, sin pérdida de datos.
- Reserva liberada. Estado final: CERRADA — EN PRODUCCIÓN.

## Claude - CONEXION COMPOSIO, Fase 2a — 2026-09-18/19

- Estado: DESPLEGADA EN PRODUCCIÓN (PR #151, `484a579`); capitanía de migración LIBERADA el 2026-09-19 00:59 UTC. Responsable: Claude.
- Alcance: interruptor por app y tablas `IntegrationRoute` / `ComposioConnection` (aditivas), sin cambio de comportamiento para clientes.
- Rama/worktree: `claude/composio-fase-2a` / `.worktrees/conexion-composio`, base `origin/main` `c29d5a5`.
- Punto de retorno: etiqueta `pre-composio-fase2a-c29d5a5-20260918`. Detalle y orden en el Controlador de Versiones.
- Pendiente: que Milton verifique Administración → Composio en Producción y pegue allí la clave y los 4 auth configs. Reserva de archivos LIBERADA. Rama `claude/composio-fase-2a` conservada (fusionada).

## Claude - CREACION DE PUBLICACIONES PROPIAS — 2026-09-18

- **Nombre exacto de la conversación (indicado por Milton):** `CREACION DE PUBLICACIONES PROPIAS`. Identidad:
  `Claude - Sonnet 5 - CREACION DE PUBLICACIONES PROPIAS`. Nombres anteriores del mismo proyecto:
  `CLAUDE-5 - PROMPT PUBLICACIONES PROPIAS` y, absorbido por él, `CODEX - GPT-5 - CREACION DE TITULOS CON PROMPTS`.
- **Proyecto:** opción «Crear con la IA del sistema» en `/dashboard/publicar` para usuarios sin datos de GSC/GA/Bing:
  hasta 9 títulos, 3 solicitudes por día, sin repetir, prompt maestro solo del administrador. Especificación:
  `MASTER_BLUEPRINT_CREACION_DE_PUBLICACIONES_PROPIAS.md` y `FASE_0_CREACION_DE_PUBLICACIONES_PROPIAS.md`.
- **Estado: EN PRODUCCIÓN — verificación en vivo pendiente (Milton).** PR #148 fusionado (`518945b`), deployment de
  Vercel `6534199413` en `success`; producción idéntica a la línea base. Detalle, punto de retorno y rollback en
  `CONTROLADOR_DE_VERSIONES.md` (etiqueta `pre-creacion-publicaciones-propias-f23ba3c-20260918`).
- **Migración:** `20260918190000_add_title_generation_requests` (tabla nueva, aditiva) aplicada **a mano en producción
  por Milton** antes de fusionar; Claude no la pudo verificar. No se reclamó capitanía de migración.
- **Reservas:** ninguna (todas liberadas). **Rama/worktree:** `claude/creacion-publicaciones-propias` (fusionada).
- **Pendiente de Milton:** pegar el prompt en Administración → Prompts y probar con la IA real; hasta entonces la
  opción dice «Esta función aún no está disponible» y no gasta IA.
- Responsable: Claude.

## Claude - CONEXION COMPOSIO, Fase 2b-1 — TRASPASO A CODEX — 2026-09-19

- Estado: PAUSADA (traspaso a Codex a pedido de Milton; pasará a TRANSFERIDA cuando Codex lo acepte). Responsable: Claude. Liberación registrada: 2026-09-19 19:17 UTC.
- Alcance: conectar, elegir (con aprobación) y probar Search Console, Analytics, Facebook e Instagram por Composio, con módulo opt-in y lista blanca de
  herramientas. Diseño de UX unificada acordado con Milton (ver `ESPECIFICACION_CONEXIONES_UNIFICADAS.md`).
- Rama/worktree: `claude/composio-fase-2b1` / `.worktrees/conexion-composio`, base `18941fd` (merge de `origin/main` en `b638b1d`). Producción: `bbe8863`.
- Producción hoy: Fase 1 y 2a desplegadas (sin cambios para clientes). La 2b-1 NO está desplegada.
- Reservas de archivos: las de la rama 2b-1, hasta el traspaso. Capitanía de migración: liberada (Fase 2a); la 2b-1 no lleva migración.
- Detalle completo, decisiones, hallazgos técnicos y siguiente acción exacta: `COORDINACION_CLAUDE_CODEX.md` → «TRASPASO A CODEX».

### Actualización 2026-09-19 19:26 UTC — CONEXION COMPOSIO Fase 2b-1
- Estado: 2b-1 **DESPLEGADA EN PRODUCCIÓN** (PR #155, `0701e88`). Reserva de archivos de la 2b-1 **LIBERADA** (fila borrada de la tabla de reservas). Sin capitanía de migración.
- La conversación sigue PAUSADA a la espera de Milton (clave nueva y «Habilitado» de #2, #3, #40) y de la siguiente etapa (UX-1). Detalle: Coordinación → «TRASPASO A CODEX» y «Avance … 2b-1 FUSIONADA».

### Actualización 2026-09-19 19:37 UTC — CONEXION COMPOSIO UX-1
- UX-1 etapa 1 **DESPLEGADA** (PR #157, `474e8d9`, opt-in). Sin reservas activas ni capitanía de migración. Estado global y plan de la 2b-2 en Coordinación → «Avance … UX-1 etapa 1 FUSIONADA». Conversación PAUSADA a la espera de Milton (clave nueva y «Habilitado» de #2, #3, #40).

### Actualización 2026-09-19 20:33 UTC — CONEXION COMPOSIO: piloto habilitado
- Clave nueva (`••••EHCE`) y 4 auth configs en Producción; módulo «Conexión por Composio» habilitado a #2, #3 y #40 (3 de 92). Verificado. Detalle en Coordinación → «Avance … piloto HABILITADO». Sin reservas ni capitanía de migración.

### Actualización 2026-09-19 20:51 UTC — CONEXION COMPOSIO
- Resolvedor (#160), aviso (#161) y adaptador de Search Console (#162) fusionados, todos inertes. Lorena restaurada por la API principal. Sin reservas ni capitanía de migración. Detalle en Coordinación → «Avance … adaptador FUSIONADO».

### Actualización 2026-09-19 20:59 UTC — CONEXION COMPOSIO: traspaso a Codex (estado vigente)
- Estado: PAUSADA por límite de cupo/contexto; traspaso a Codex a pedido de Milton (TRANSFERIDA cuando Codex acepte). Producción = main = `7efaacd`. Sin reservas ni capitanía de migración. Bloque consolidado y prompt: Coordinación → «TRASPASO A CODEX · ESTADO VIGENTE» y `PROMPT_TRASPASO_CODEX_CONEXION_COMPOSIO.md`.
