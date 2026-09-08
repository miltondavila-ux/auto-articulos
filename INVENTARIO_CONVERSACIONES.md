# Inventario de conversaciones

Este documento tiene un propósito distinto al de `COORDINACION_CLAUDE_CODEX.md`:
responder, en cualquier momento, **quién es dueño de cada problema/proyecto,
quién tiene un archivo o rama tomada ahora mismo, y de quién es cada commit**.
`COORDINACION_CLAUDE_CODEX.md` sigue siendo el diario cronológico con el
detalle técnico completo de cada cambio; este archivo es el índice de
propietarios que permite, sin leer 3000 líneas, saber quién está activo y
sobre qué.

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
| `/private/tmp/doc-coordinacion-sept3` | `claude/doc-coordinacion-sept3` | 1 | Claude — esta misma sesión, "DOCUMENTO DE COORDINACION - SEPT 3" | Soy yo, ahora mismo. |
| `/Users/miltondavila/Creador de articulos/.worktrees/google-api-verification` | `codex/google-api-verification` | 1 | Codex — commit `7908b01` "chore: prepare Google OAuth domain and verification pages", hecho hoy 19:06 | Muy reciente; probablemente Codex trabajando en paralelo ahora mismo en `CODEX - GPT-5 - VERIFICACION DE API'S DE GOOGLE`. |
| `/private/tmp/limites-globales-articulos` | `codex/limites-globales-articulos` | 1 | Codex — proyecto `LIMITES GLOBALES DE ARTICULOS` | Coincide con la decisión de Milton (2026-09-02): **PAUSADO, no tocar ni integrar**. |
| `/private/tmp/meta-threads-callbacks` | `codex/meta-threads-callbacks` | 1 | Codex — proyecto `META THREADS CALLBACKS` | Coincide con la decisión de Milton (2026-09-02): **ACTIVO, no tocar**, continúa en su propia conversación. |
| `/private/tmp/auto-articulos-conexion-blogger` | `codex/conexion-blogger-20260902` | 1 | Codex — un intento de `CONEXION BLOGGER` | Atención: existe otra rama de Blogger (`codex/conexion-blogger-produccion-20260903`) que SÍ está fusionada en `origin/main` y fue la que llegó a producción. Esta parece un intento anterior o paralelo que quedó suelto sin fusionar — no se decide aquí si conservarla o descartarla. |
| `/private/tmp/auto-articulos-resolucion-conexion-web` | `codex/resolucion-conexion-web-20260902` | 5 | Codex/Claude — proyecto `RESOLUCION DE CONEXION WEB` | Contradicción real detectada: la decisión de Milton (2026-09-02) marca este proyecto como **CULMINADO**, pero sus 5 commits nunca se fusionaron a `origin/main`. "Culminado" no fue lo mismo que "publicado". Señalado, no resuelto. |
| `/private/tmp/cambio-cantidad-articulos-20260902` | `codex/cambio-cantidad-articulos-20260902` | 1 | Codex — cambio de cantidad de artículos | No aparece mencionado como cerrado en Coordinación; verificar con Codex si sigue vivo o es un residuo. |
| `/private/tmp/mcp-publicacion-20260907` | `claude/mcp-publicacion-20260907` | 0 | Claude — "MCP 10MWS" | Nueva línea de ejecución de publicación vía MCP (paralela a la actual por navegador), en diseño/andamiaje. Reserva: `packages/db/prisma/schema.prisma`, `apps/worker/src/queue.ts`. Sin cambio de comportamiento por defecto (nuevo `publishMethod` queda en `BROWSER`). Ver `COORDINACION_CLAUDE_CODEX.md` para el detalle. |
| `/tmp/fix-tiles-flex-20260908` | `claude/fix-tiles-flex-20260908` | 1 | Claude — "ORDEN DE USUARIOS ACTIVOS EN ADMIN" (hotfix visual sobre PR #70) | Reserva: `apps/web/src/app/dashboard/usuarios/page.tsx` — arregla que las tarjetas de resumen se veían en fila (aplastadas) por el reset global `button { display: inline-flex }`. |

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

---

## PARTE B — Registro histórico de conversaciones (nombre exacto, agente, proyecto, estado)

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
