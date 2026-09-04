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
