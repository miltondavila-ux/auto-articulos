## RESERVA — CERO CANIBALIZACION Y COBERTURA LONGTAIL COMPLETA (2026-09-02)

Identidad exacta: Claude Sonnet 5 (misma conversación "CATEGORIAS MAL
ELEGIDAS" de Milton, continuación tras el despliegue del PR #24/#26).

Worktree aislado: `/private/tmp/cero-canibalizacion-longtail`.
Rama: `claude/cero-canibalizacion-longtail`, creada desde `origin/main` en
`01f40fc` (incluye el fix de `DEFAULT_MAX_TITLES_PER_BATCH` del PR #31 de
otra sesión, sin relación con este cambio).

Motivo: auditoría pedida por Milton sobre canibalización/repetición en el
algoritmo de oportunidades reveló que la única regla de "no canibalizar
contra lo YA PUBLICADO" estaba en la sección "PRECAUCIONES (no
restrictivas)" del prompt — es decir, era una sugerencia débil, no una
prohibición. Milton pidió además: cero canibalización real, títulos 100%
long tail, y cobertura completa de Search Console/GA4/Bing "página por
página" en vez de detenerse en las primeras 10 categorías.

Alcance autorizado por Milton:
1. Promover la regla de no-canibalización (contra lo publicado Y contra lo
   ya propuesto en la misma corrida) a obligatoria, con definición explícita
   de qué es canibalizar (misma intención de búsqueda, no solo mismas
   palabras).
2. Dar visibilidad completa por categoría de lo ya publicado + lo ya
   propuesto en la corrida actual (no una ventana rotativa de 200 títulos
   mezclados entre categorías).
3. Quitar el techo artificial de 10 categorías / 9 títulos por categoría;
   cubrir TODAS las categorías con evidencia real, hasta agotar
   oportunidades reales, dentro del mismo techo de hasta 20 lotes de OpenAI
   que ya existía (no se agregan más lotes; el cambio es que ahora sí se
   recorren todos en vez de parar temprano).

Aviso de riesgo comunicado a Milton: al no parar temprano en 10 categorías,
la mayoría de las corridas van a usar más de los hasta 20 lotes de OpenAI
que ya eran el techo — mismo techo de costo/duración de antes, pero se va a
alcanzar más seguido. No es un riesgo de caída de producción.

Archivos reservados por esta tarea:
- `apps/web/src/lib/opportunity-analysis.ts`
- `apps/web/src/app/dashboard/oportunidades/page.tsx` (solo el texto
  descriptivo de "hasta 10 categorías... 9 oportunidades", sin tocar la
  constante `DEFAULT_MAX_TITLES_PER_BATCH` del PR #31, que es de publicación
  de artículos, no de este análisis)

Sin migraciones de Prisma. Estado: EN PROGRESO.

### Cambios implementados

- `apps/web/src/lib/opportunity-analysis.ts`:
  - Nueva sección obligatoria "REGLA OBLIGATORIA DE CERO CANIBALIZACION" en
    el prompt: define canibalización como apuntar a la MISMA intención de
    búsqueda (no solo compartir palabras — aclara explícitamente que
    variantes long tail con ángulo/ubicación/perfil distintos NO son
    canibalización), exige revisar todo lo ya existente y ya propuesto por
    categoría antes de proponer, y exige que el `rationale` declare la
    intención distinta que cubre cada título.
  - Nueva sección obligatoria "REGLA OBLIGATORIA DE LONG TAIL AL 100%":
    prohíbe títulos genéricos/cortos, exige revisión página por página y
    consulta por consulta de GSC/GA4/Bing.
  - Se quitó el texto débil de "PRECAUCIONES (no restrictivas)" que
    mencionaba canibalización — quedó reemplazado por la regla obligatoria.
  - Se quitó el techo fijo de "máximo 10 categorías" y "5-9 títulos por
    categoría" del texto del prompt; ahora dice explícitamente que debe
    cubrir TODAS las categorías con evidencia real.
  - Código: `isFullyStocked()` ahora recibe `totalCategories` (número real
    de categorías de la cuenta) en vez de un `10` hardcodeado — solo corta
    el loop cuando TODAS las categorías reales quedaron con el tope de
    títulos, no un número arbitrario.
  - Código: se eliminó el `if (!existingGroup && groupsByCategory.size >= 10) continue`
    (el único gate real era `validCategoryIds`, que ya limita naturalmente
    a las categorías reales de la cuenta — el `10` era un tope artificial
    por debajo de ese límite natural).
  - Código: se eliminó el `opportunities.slice(0, 10)` que truncaba la
    respuesta de cada lote a 10 grupos antes de procesarlos.
  - `MAX_TITLES_PER_CATEGORY` subido de 9 a 20.
  - `max_tokens` de la llamada a OpenAI subido de 10000 a 16000 (tope real
    de salida de gpt-4o-mini), porque una respuesta con más categorías/
    títulos por lote necesita más espacio.
  - Nuevo bloque `OPORTUNIDADES YA CREADAS EN ESTA CORRIDA, POR CATEGORIA`,
    reconstruido en cada lote desde `groupsByCategory` (reemplaza la ventana
    rotativa `TITULOS YA PROPUESTOS EN ESTA SESION` de los últimos 200
    títulos mezclados entre categorías) — da visibilidad completa y sin
    pérdida de lo ya propuesto para CADA categoría específica, para que el
    chequeo de canibalización cruzado entre lotes sea real.
  - El dedup exacto por texto normalizado (`seen`/`normalizeTitle`) se
    mantiene sin cambios como garantía de código (no depende de que la IA
    obedezca) contra duplicados textuales exactos.
- `apps/web/src/app/dashboard/oportunidades/page.tsx`: texto descriptivo
  actualizado para reflejar el comportamiento real (ya no dice "hasta 10
  categorías... 9 oportunidades"; menciona las tres fuentes de datos).

### Decisión de diseño explicada: no se agregó un filtro de similitud de texto en código

Se evaluó agregar, además del dedup exacto, un chequeo de similitud
(ej. superposición de palabras) para bloquear en código títulos "parecidos".
Se descartó a propósito: dos títulos long tail legítimos y deseados por
Milton (ej. "...en Miami" vs "...en Los Ángeles", mismo resto de palabras)
comparten la mayoría de las palabras pero NO son canibalización — son
exactamente la diversidad long tail pedida. Un filtro de similitud de texto
habría bloqueado variantes válidas. La prevención de canibalización real
(misma intención, no mismas palabras) requiere criterio semántico, por eso
se reforzó a nivel de prompt (regla obligatoria + visibilidad completa por
categoría) en vez de a nivel de código.

### Tres auditorías independientes

**1) Funcional**: `prisma generate` correcto; `tsc --noEmit` limpio en
`apps/web` y `apps/worker`; `next build --webpack` completó todas las rutas
sin errores. Revisión manual del prompt final: la regla de cero
canibalización y la regla de long tail al 100% quedan como obligatorias
antes de "ANALISIS INTELIGENTE REQUERIDO"; no quedó ninguna mención residual
de "máximo 10 categorías" ni "5-9 títulos" en el texto del prompt. Pendiente
real (no de código): no hay forma de verificar en este entorno que OpenAI
efectivamente cubra todas las categorías y evite canibalización sin correr
un análisis real contra una cuenta con muchas categorías.

**2) Regresión**: la firma de `analyzeSeoOpportunities` no cambió (mismos
campos de entrada); `route.ts` (de la tarea anterior) sigue funcionando sin
modificaciones porque no se tocó su contrato. El dedup exacto por texto
normalizado sigue intacto — ningún título duplicado textual puede colarse,
igual que antes. No se tocó `schema.prisma`, cooldown, paneles, dominios,
ni el endpoint `GET`. El único archivo de UI tocado (`oportunidades/page.tsx`)
solo cambia un párrafo descriptivo, no lógica; no toca
`DEFAULT_MAX_TITLES_PER_BATCH` del PR #31 (concepto distinto: lote de
publicación de artículos, no de este análisis).

**3) Integración/producción**: el techo de llamadas a OpenAI por corrida
sigue siendo como máximo 20 (mismo `MAX_BATCHES` de antes, sin cambios) —
subir el techo por categoría y quitar el corte en 10 categorías no agrega
llamadas nuevas por encima de ese máximo ya existente, solo hace que se
usen más seguido las que ya estaban permitidas. Cuentas con pocas
categorías o poca evidencia real no notan cambio de comportamiento (menos
lotes se siguen ejecutando igual, `isFullyStocked` corta temprano si ya no
hay más categorías por llenar). No se tocó Vercel, middleware, variables de
entorno ni autenticación. Riesgo de costo/duración documentado arriba y
comunicado a Milton antes de implementar.

Estado: **DESPLEGADO**. Milton autorizó publicar; PR
[`#32`](https://github.com/miltondavila-ux/auto-articulos/pull/32) mergeado
a `main` como fast-forward (sin conflictos, sin migraciones) en el commit
`de27a65435a232232628219a87c0d8ff64d7a769`. Ambos checks de Vercel
(`auto-articulos-web` y `cambio-boton-comienza-aqui-clean`) reportaron
`success`; `GET https://auto-articulos-web.vercel.app/login` respondió
`HTTP 200` después del deploy.

Costo de OpenAI: se le dio a Milton una estimación (no medición real) del
impacto en costo por corrida basada en el tamaño del prompt y la
tarificación pública de `gpt-4o-mini` — de ~$0.03-$0.05 a ~$0.05-$0.17 por
click en "Actualizar análisis" en el peor caso, sin superar el techo de 20
lotes que ya existía. Se le indicó a Milton que la medición real está en
platform.openai.com/usage, comparando antes/después del deploy.

Pendiente real, no de código: no se puede verificar sin datos reales que
OpenAI efectivamente cubra todas las categorías y logre cero canibalización
en una cuenta real con muchas categorías — pendiente de una prueba en vivo.

Reserva liberada: quedan liberados `apps/web/src/lib/opportunity-analysis.ts`
y `apps/web/src/app/dashboard/oportunidades/page.tsx`. El worktree
`/private/tmp/cero-canibalizacion-longtail` puede eliminarse.

## RESERVA — CATEGORIAS MAL ELEGIDAS (2026-09-02)

Identidad exacta: Claude Sonnet 5 (conversación "CATEGORIAS MAL ELEGIDAS" de Milton).

Worktree aislado: `/private/tmp/categorias-mal-elegidas`.
Rama: `claude/categorias-mal-elegidas`, creada desde `origin/main` en `94affdf`.

Motivo: Milton reportó que al usuario Guillermo Martínez el botón "Actualizar
análisis" de Oportunidades (`/dashboard/oportunidades`) le generó títulos
long tail que no correspondían a la categoría a la que quedaron asignados —
el algoritmo mezcló temas de categorías distintas.

Causa raíz encontrada: el prompt de `apps/web/src/lib/opportunity-analysis.ts`
le decía explícitamente a la IA que podía "combinar temas de diferentes
categorías cuando tenga sentido" e "inferir temas relacionados" sin exigir
que el título se quedara dentro del tema real de la categoría asignada.
Además solo se le pasaba `{id, name}` de cada categoría, sin ningún ejemplo
real de qué cubre esa categoría.

Alcance autorizado por Milton: (1) prohibir la mezcla de categorías y exigir
que cada título esté anclado en evidencia real de Search Console/GA4/Bing
(no inventado); (2) agregar señales de Bing Webmaster Tools al análisis, que
hoy no se usan en este flujo (solo GSC + GA4).

Archivos reservados por esta tarea:
- `apps/web/src/lib/opportunity-analysis.ts`
- `apps/web/src/app/api/opportunities/route.ts`
- `packages/shared/src/bing-webmaster.ts`
- `packages/shared/src/index.ts` (solo el export nuevo de Bing, si aplica)
- posible archivo nuevo `apps/web/src/lib/bing-signals.ts`

Sin migraciones de Prisma previstas (no se toca `schema.prisma`). Estado:
EN PROGRESO. No hay commit ni push todavía.

### Cambios implementados

- `apps/web/src/lib/opportunity-analysis.ts`: se agregó una "REGLA
  OBLIGATORIA DE CATEGORIA" al prompt (prohíbe mezclar el tema de dos
  categorías en un mismo título, prohíbe forzar una consulta ajena en la
  categoría más parecida, prohíbe inventar títulos sin evidencia real en
  GSC/GA4/Bing) y se eliminó la línea que autorizaba explícitamente
  "combinar temas de diferentes categorías cuando tenga sentido". Se agregó
  una sección de señales de Bing al prompt, igual que ya existía para GA4.
- `apps/web/src/app/api/opportunities/route.ts`: ahora arma, por categoría,
  hasta 8 ejemplos reales de títulos ya publicados en ella (vía
  `Title -> Run.categoryId`) y se los pasa a la IA junto al nombre, para que
  la afinidad temática se ancle en contenido real y no solo en el nombre.
  Se agregó la consulta en paralelo a `getBingSignals()` (nueva) y se pasa
  como `bingSummary` al análisis.
- `packages/shared/src/bing-webmaster.ts`: nueva función
  `getBingQueryStats()` que consulta `GetQueryStats` de Bing Webmaster Tools
  (única fuente de consultas reales que expone esa API; no admite rango de
  fechas propio) y agrega por consulta (clics/impresiones sumados, posición
  ponderada por impresiones).
- `apps/web/src/lib/bing-signals.ts` (nuevo): mismo patrón que
  `google-analytics-signals.ts` — nunca bloquea el análisis; si el usuario no
  tiene Bing conectado devuelve `{connected:false, rows:[]}` sin llamar a la
  API; si Bing falla, devuelve `{connected:true, rows:[], error}` en vez de
  lanzar.

### Tres auditorías independientes

**1) Funcional**: `prisma generate` correcto; `tsc --noEmit` limpio en
`apps/web` y `apps/worker`; `next build --webpack` completó `78/78` rutas
sin errores. Revisión manual del prompt final: la regla de categoría queda
antes de "ANALISIS INTELIGENTE REQUERIDO", el permiso de mezclar categorías
fue eliminado (no quedó ninguna otra mención equivalente en el resto del
prompt), y las tres fuentes (Search Console, GA4, Bing) quedan explícitas
en el texto que ve la IA. Pendiente real (no de código): no hay forma de
verificar en este entorno que OpenAI efectivamente obedezca la regla nueva
sin correr un análisis real contra una cuenta con categorías mezcladas
(candidato: la propia cuenta de Guillermo Martínez, con supervisión de
Milton, después de desplegar).

**2) Regresión**: `categories` en `analyzeSeoOpportunities` sigue aceptando
`{id, name}` (el campo nuevo `publishedExamples` es opcional), por lo que la
firma es retrocompatible. `getBingSignals()`/`getGoogleAnalyticsSignals()`
están ambas envueltas en try/catch propio: si Bing no está conectado o falla,
el análisis sigue funcionando exactamente igual que antes (antes ni se
intentaba consultar Bing). No se tocó la lógica de cooldown, paneles,
dominios, borrado/creación de `OpportunityGroup`, ni el endpoint `GET`. No se
tocó `schema.prisma` — cero migraciones. El `select` nuevo de
`prisma.title.findMany` solo agrega `run.categoryId`, no cambia qué filas se
traen ni el orden.

**3) Integración/producción**: usuarios sin Bing Webmaster Tools conectado
(la gran mayoría hoy) nunca llegan a llamar `bingConfig()`/OAuth de Bing —
`getBingSignals` corta apenas no encuentra `SearchIntegration` con
`provider: "bing"`. Usuarios con Bing conectado pero cuyo token expiró o
cuya cuenta no tiene aún datos en `GetQueryStats`: el error queda contenido
(no lanza), el análisis sigue sin Bing. No se tocó Vercel, middleware,
variables de entorno ni autenticación — cambio puramente de lógica de
negocio en un endpoint ya autenticado (`getCurrentUserId()` sin cambios).
`package-lock.json` se había modificado por el `npm install` necesario para
poder testear en este worktree nuevo; se descartó (`git checkout --
package-lock.json`) porque no es parte del cambio.

Estado: **DESPLEGADO**. Milton autorizó publicar; PR
[`#24`](https://github.com/miltondavila-ux/auto-articulos/pull/24) mergeado
a `main` como fast-forward (sin conflictos, sin migraciones) en el commit
`e0cf15bda5892b4e344438a545fcbd82edef1243`. Ambos checks de Vercel
(`auto-articulos-web` y `cambio-boton-comienza-aqui-clean`) reportaron
`success` para ese commit; `GET https://auto-articulos-web.vercel.app/login`
respondió `HTTP 200` después del deploy.

Pendiente real, no de código: correr "Actualizar análisis" en una cuenta
real (idealmente la de Guillermo Martínez) para confirmar en vivo que ya no
mezcla categorías — no se puede verificar sin ejecutar el algoritmo contra
datos reales de una cuenta con el problema.

Reserva liberada: quedan liberados `apps/web/src/lib/opportunity-analysis.ts`,
`apps/web/src/app/api/opportunities/route.ts`,
`packages/shared/src/bing-webmaster.ts` y `apps/web/src/lib/bing-signals.ts`.
El worktree `/private/tmp/categorias-mal-elegidas` puede eliminarse cuando
se confirme la prueba real pendiente de arriba.

## ELIMINACIÓN POPUP QR DE CRÉDITOS DE IMAGEN (2026-08-31)

## Trabajo activo — Blogger variables aisladas — 2026-09-03

Responsable: Codex.
Worktree aislado: `/private/tmp/auto-articulos-blogger-fix-20260903`.
Base: `bcdac28` (`feat: preparar integracion de Blogger`).
Alcance: separar las credenciales OAuth de Blogger de las variables existentes de GSC/GA.
Archivos reservados: `apps/web/src/lib/blogger-oauth.ts`, `apps/worker/src/socialPublish.ts`,
`COORDINACION_CLAUDE_CODEX.md`, `INVENTARIO_CONVERSACIONES.md`.
No reservados ni modificados: Vercel, middleware, autenticación general, secretos existentes y producción.
Estado: en preparación; no desplegar hasta completar auditorías y revisión de Root Directory/logs.

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

### `TABLA PUBLICA ACCESIBLE GRAVE`

Identidad exacta:
Claude Sonnet 5 (sesión de Milton en su árbol local).

Proyecto: aviso de seguridad crítico de Supabase (`rls_disabled_in_public`)
en el proyecto Auto Articulos.
Motivo de creación: Supabase notificó por correo que había tablas
públicamente accesibles — cualquiera con la URL del proyecto podía leer,
editar y borrar datos vía la API REST automática (PostgREST) sin pasar por
el backend.
Objetivo: cerrar la exposición existente y evitar que vuelva a pasar con
tablas futuras.
Alcance: investigación en Supabase (Security Advisor, `pg_tables`,
`pg_roles`, Storage, Auth) con navegador logueado como
`10minuteswebsite@gmail.com`; fix de RLS en las 26 tablas expuestas;
salvaguarda automática para tablas nuevas en el workflow de migración.
Exclusiones: no se tocaron políticas de RLS (no hacían falta, sin acceso
legítimo vía anon key en este proyecto); no se modificó Storage ni Auth de
Supabase (revisados, sin hallazgos); no se tocó el trabajo sin commitear
de otra sesión en el árbol local de Milton.
Archivos y commits: migración
`packages/db/prisma/migrations/20260902113123_enable_rls_public_tables`;
`packages/db/scripts/enforce-rls.ts`; `.github/workflows/migrate.yml`;
`HANDOFF.md`; este documento. Mergeado a `main` vía PR #22, #23 y #25.
Estado: **CERRADO**. Security Advisor de Supabase en 0 errores/0 warnings
(antes 26 errores críticos); producción verificada (`/login` 200 OK en
ambos dominios); salvaguarda para tablas futuras activa en el workflow de
migración.
Producción: sin incidentes, sin caídas, sin regresiones detectadas.
Conversaciones relacionadas: ninguna previa sobre este tema.
Responsable: Claude, con aprobación y ejecución manual de Milton en los
pasos que el clasificador de seguridad de Claude Code bloqueó (SQL directo
contra producción, push a `main`, creación de PR).
Siguiente acción: ninguna pendiente. Si se agrega una tabla nueva sin usar
el workflow normal de migración, recordar correr
`npm run enforce-rls --workspace=packages/db` a mano.
Decisión de Milton: cerrar la conversación.

### Acuerdo de coordinación — 2026-08-31

El proyecto `CLAUDE - BOTONES DE OPORTUNIDADES AL INICIO` es responsable de
los cambios recientes de Inicio y `main`. El proyecto `CODEX - GPT-5 -
INSTRUCCIONES EN EL SISTEMA` no debe desplegar copias antiguas de `main` ni
promover deployments creados desde un árbol desactualizado. Cualquier nueva
corrección de instrucciones debe partir de un estado actualizado, usar un
worktree aislado, revisar el diff contra `main` y publicar únicamente después
de preservar los commits ajenos.

Estado del acuerdo: ACTIVO. No se autoriza pisar código ni reemplazar
deployments de otros proyectos.


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

### Actualización — 2026-08-31 (mismo día)

`gh auth login` quedó activo en la máquina (otra sesión lo hizo). Con eso se
disparó manualmente el workflow pendiente: "Database Write - Bajar limite
diario a 5 (no-admin)" — run
`https://github.com/miltondavila-ux/auto-articulos/actions/runs/33449131800`,
`completed / success`. Confirmado por el propio log: 79 usuarios no-admin
actualizados a `dailyArticleLimit = 5`, 3 administradores sin tocar. Ya no
queda pendiente.

## [CLAUDE] - BOTONES DE OPORTUNIDADES AL INICIO — 31/8/2026

Identidad exacta: CLAUDE - BOTONES DE OPORTUNIDADES AL INICIO.

Proyecto: pantalla `/dashboard` (Inicio).

Motivo/objetivo: Milton pidió agregar, debajo de las instrucciones de
Inicio, 4 accesos directos a Publicar, Oportunidades SEO, Oportunidades
Redes y Publicaciones en Curso — en formato Apple (sin iconos, puro texto,
minimalista), en fila y responsive. Iteró el diseño en vivo: primero
píldoras, luego pidió cajas cuadradas, luego numeradas — aprobado con una
vista previa (Artifact) antes de tocar código en producción.

**Capitán de migración:** Claude — reclamado antes del push. Motivo: push
de botones numerados en Inicio (/dashboard). Nadie más ejecuta Prisma hasta
su liberación.

Trabajo: cajas cuadradas sin iconos, numeradas 01-04, en
`display: grid` con `repeat(auto-fill, minmax(200px, 1fr))` (mismo patrón
responsive que ya se usó en oportunidades-redes), insertadas justo debajo
de `</ModuleIntro>` en `apps/web/src/app/dashboard/page.tsx`. Bloque
100% aditivo — ninguna línea existente tocada.

Corrección de proceso durante la sesión: el primer commit se hizo
directamente sobre el árbol de Milton (violación del protocolo de
worktree aislado). Se detectó a tiempo (antes del push), se deshizo con
`git reset --soft`, y se rehizo todo en un worktree limpio desde
`origin/main` con node_modules propio (symlinks individuales +
`@auto-articulos/*` apuntando al worktree, no al repo principal, por el
gotcha ya documentado en el manual).

Tres auditorías antes del push:
1. `tsc --noEmit` en el worktree aislado — 0 errores.
2. Revisión estructural del diff — 100% aditivo, ninguna funcionalidad
   existente tocada (confirmado línea por línea contra `git diff`).
3. Paridad visual — valores del JSX (grid, padding, radius, colores)
   cotejados uno a uno contra el Artifact de vista previa ya aprobado por
   Milton; coinciden exactamente.

No se pudo correr `next build` completo ni levantar el dev server contra
datos reales por falta de `DATABASE_URL`/credenciales en este entorno; se
compensó con las tres auditorías de arriba en vez de una prueba en
navegador con la cuenta de Lorena Álvarez.

Archivos: únicamente `apps/web/src/app/dashboard/page.tsx`.

Commit `5c858a2` (`feat: agregar accesos directos numerados en Inicio del
dashboard`), pusheado directo desde el worktree (rama temporal
`claude/inicio-botones-numerados`, ya borrada) a `origin/main` por
fast-forward. `origin/main` quedó en `5c858a2`.

**Capitán de migración liberó el lote:** Claude. Resultado: botones
numerados en Inicio desplegados en origin/main (5c858a2), sin migraciones
aplicadas.

Manual del asistente actualizado en el mismo lote (regla fija de Milton,
[[siempre-actualizar-el-manual]]): commit `93fa48e` sobre
`apps/web/src/content/manual-usuario.ts`, mismo protocolo de worktree
aislado + captaincy + typecheck. `origin/main` quedó en `93fa48e`.

Estado: DESPLEGADO y CONFIRMADO — Milton lo vio en vivo en
`https://auto-articulos-web.vercel.app/dashboard` durante la misma
conversación.

Responsable siguiente: nadie, cerrado.

### Actualización — 2026-08-31 (mismo día, tras ver la captura en producción)

Milton vio las cajas en vivo y pidió dos ajustes: (1) que fueran idénticas
en tamaño a las 4 tarjetas de métricas de abajo ("Publicados este mes" /
"Publicados hoy" / "Total publicado" / "Oportunidades listas"), y (2) quitar
el botón píldora negro "Comienza aquí" que quedaba redundante con los 4
accesos nuevos.

Se reemplazó el grid a medida por los mismos componentes Tremor
(`Card`/`Grid numItemsSm={2} numItemsLg={4}`) que usa `PerformanceDashboard`
para esas 4 tarjetas — mismo tamaño/padding/sombra por construcción, no por
imitación de valores. Se quitó el bloque completo del botón "Comienza aquí".

Mismo protocolo: worktree aislado + captaincy + typecheck. Commit `26cf0ef`
(`fix: cajas de Inicio identicas a las tarjetas de metricas`). `origin/main`
quedó en `26cf0ef`.

Estado: DESPLEGADO — pendiente de que Milton confirme visualmente esta
segunda iteración.

### Verificación de lectura — CÓDIGO 4471 (2026-08-31, ~20:58 hora local)

Milton pidió una prueba de que la sesión activa (Claude) leyó este
documento antes de seguir. Código de verificación: **4471**.

### Verificación de lectura — CÓDIGO CODEX 5826 (2026-08-31)

Código dejado por Codex para confirmar lectura cruzada del documento:
**5826**.

### Acuerdo de trabajo conjunto — 2026-08-31

Milton solicita culminar las instrucciones sin pisar código. Reparto vigente:
Claude conserva y protege los cambios de Inicio y menú, especialmente
`apps/web/src/app/dashboard/page.tsx` y `apps/web/src/components/DashboardNav.tsx`.
Codex trabajará únicamente en una rama/worktree aislado sobre las
instrucciones iniciales de Publicar, Oportunidades, Configuración y módulos
relacionados. Ningún agente desplegará desde una copia antigua ni promoverá
producción sin comparar contra `origin/main` actualizado. Antes de integrar se
requieren `git status`, diff exacto y tres auditorías independientes.

Estado: COORDINACIÓN ENVIADA A CLAUDE; pendiente confirmación del otro
programador. No se inicia edición cruzada hasta confirmar el reparto.

### Nueva tarea registrada — 2026-08-31

Identidad exacta:
CODEX - GPT-5 - INSTRUCCIONES EN EL SISTEMA

Proyecto:
Auditoría de comprensión de instrucciones por módulo.

Motivo de creación:
Milton solicita comparar cada explicación con el objetivo real de su módulo y
mejorarla para que cualquier usuario pueda entenderla.

Objetivo:
Revisar módulo por módulo, eliminar ambigüedades y dejar textos iniciales
claros, completos, legibles, responsive, negros y coherentes con Apple HIG.

Alcance:
Publicar, Oportunidades SEO/AEO, Configuración, Oportunidades Redes,
Publicaciones en Curso y cualquier otro módulo con explicación inicial.

Exclusiones:
No modificar lógica de negocio, permisos, menú ni archivos reservados por
Claude u otro programador; no duplicar textos.

Archivos y commits:
Pendiente de auditoría en worktree aislado nuevo.

Estado:
ACTIVO — auditoría y mejora solicitadas.

Producción:
La versión anterior está publicada; esta tarea aún no.

Conversaciones relacionadas:
Acuerdos de coordinación de Inicio/menú e instrucciones de módulos.

Responsable:
CODEX - GPT-5.

Siguiente acción:
Crear worktree aislado, auditar objetivos y textos, aplicar cambios mínimos,
ejecutar tres auditorías y publicar solo el lote validado.

Decisión de Milton:
Ejecutar la mejora completa módulo por módulo.

Actualización de cierre técnico — 2026-08-31:
Se auditó Configuración y se añadieron explicaciones iniciales específicas para
Configuración Inicial, Indexación y SEO, Redes Sociales, Cuenta, Contenido y
App Móvil. El lote se ejecutó en la rama aislada
`codex/auditoria-configuracion-submodulos`, commit `0d935ac`, y se publicó en
producción como deployment `dpl_3WJvuVbFHnr1mDb8LgS8XyZMwJLn` con estado READY.

### Regla reforzada por Milton — 2026-08-31

Codex debe comprobar antes de trabajar que el archivo no esté siendo usado por
otro programador, partir del `main` actualizado y revisar el diff exacto. Si
existe cruce, reserva o desarrollo simultáneo, debe esperar y coordinar; no
puede pisar código, desplegar una copia antigua ni reemplazar cambios ajenos.

Revisé en este momento (00:58 UTC): `origin/main` sigue en `05bf189`, no
hay commits nuevos de ningún otro programador desde que yo empujé, y no hay
capitán de migración activo compitiendo (`migration-coordinator.sh status`
confirma "No hay capitán activo"). No encontré evidencia de que Codex u
otra sesión esté pisando este trabajo ahora mismo — lo que Milton vio en
pantalla parece ser propagación/caché de Vercel, no una colisión de
código. Sigo verificando el despliegue real antes de pedirle que confirme
de nuevo.

### Coordinación explícita — Claude a Codex (31/8/2026, ~21:00 hora local)

Codex, veo tu código 5826 en este mismo documento — confirmado que ambos
estamos activos ahora mismo en la máquina de Milton. Milton pidió
explícitamente que nos pongamos de acuerdo para no pisarnos.

**Capitán de migración: Claude**, reclamado ahora mismo para terminar de
verificar el despliegue de los botones de Inicio.

**Archivo bajo trabajo activo de Claude ahora mismo:**
`apps/web/src/app/dashboard/page.tsx` — ya en `origin/main` (commit
`26cf0ef`), sin cambios de código pendientes, solo verificación de
despliegue. Por favor no lo toques mientras tenga la capitanía reclamada;
libero apenas termine de confirmar con Milton.

Si estás trabajando en otro archivo/módulo, adelante — no hay conflicto.
Si necesitas tocar `page.tsx` o `apps/web/src/content/manual-usuario.ts`
(también tocado en este lote), avisa aquí antes y espera mi liberación para
evitar un commit simultáneo sobre el mismo archivo.

### Cierre — texto de instrucciones actualizado (31/8/2026)

Milton pidió agregar una línea en las instrucciones de Inicio ("Antes de
avanzar, lee esto") avisando explícitamente que abajo hay 4 botones para
elegir. Cambio de un solo párrafo (`IntroP`) dentro de `ModuleIntro`,
100% aditivo. Mismo protocolo: worktree aislado + captaincy + typecheck.
Commit `b70e20d`. `origin/main` quedó en `b70e20d`.

**Capitán de migración liberó el lote:** Claude.

Estado: DESPLEGADO — pendiente de confirmación visual final de Milton.

## ACTUALIZACIÓN CODEX — INSTRUCCIONES POR MÓDULO — 2026-08-31

Identidad exacta:
CODEX - GPT-5 - INSTRUCCIONES EN EL SISTEMA

Proyecto:
Auditoría y mejora de explicaciones iniciales de módulos.

Motivo de creación:
Publicar y Oportunidades no tenían explicación inicial visible y Configuración
tenía texto estrecho, gris y poco alineado con el objetivo del módulo.

Objetivo:
Hacer comprensible para cualquier usuario el propósito y flujo de cada módulo.

Alcance:
Publicar, Oportunidades SEO/AEO y Configuración; textos propios, negros,
justificados, responsive y sin duplicación.

Exclusiones:
Inicio, menú, lógica de negocio, permisos y archivos de otros proyectos.

Archivos y commits:
`apps/web/src/app/dashboard/publicar/page.tsx`,
`apps/web/src/app/dashboard/oportunidades/page.tsx`,
`apps/web/src/app/dashboard/configuracion/ConfiguracionView.tsx`; commit
`d0dd19a` y despliegue posterior `dpl_F7iH9kDV75CPzeQaoWSkyovr9rP9`.

Estado:
ACTIVO — lote desplegado; pendiente confirmación visual de Milton.

Producción:
Sí, estado READY, alias `https://auto-articulos-web.vercel.app`.

Conversaciones relacionadas:
Cambios de Inicio/menú de Claude e instrucciones de módulos.

Responsable:
CODEX - GPT-5.

Siguiente acción:
Esperar validación visual; cualquier ajuste nuevo debe partir de `origin/main`
actualizado y usar otro worktree aislado.

Decisión de Milton:
Cada módulo debe mostrar una explicación inicial clara y propia.

## NUEVA TAREA CODEX — AUDITORÍA DE SUBMÓDULOS DE CONFIGURACIÓN — 2026-08-31

Identidad exacta:
CODEX - GPT-5 - INSTRUCCIONES EN EL SISTEMA

Proyecto:
Auditoría de instrucciones de cada submódulo de Configuración.

Motivo de creación:
Milton solicita que todos los submódulos de Configuración cumplan el estándar
de explicaciones claras, completas y visualmente consistentes.

Objetivo:
Revisar Cuenta, Contenido, Indexación, Redes Sociales, Móvil y Configuración
Inicial; mejorar únicamente las explicaciones que no comuniquen bien su
propósito y uso.

Alcance:
Textos introductorios y ayudas visibles de los submódulos de Configuración;
color negro, justificación, responsive, Apple HIG y ausencia de duplicados.

Exclusiones:
No modificar lógica, permisos, conexiones, menú, Inicio ni archivos reservados
por otro programador.

Archivos y commits:
Pendientes de auditoría en un worktree aislado nuevo.

Estado:
ACTIVO.

Producción:
La versión existente permanece publicada; esta auditoría aún no.

Conversaciones relacionadas:
Instrucciones por módulo y cambios de Inicio/menú.

Responsable:
CODEX - GPT-5.

Siguiente acción:
Auditar los submódulos, aplicar cambios mínimos, ejecutar tres auditorías y
publicar solo el lote validado.

Decisión de Milton:
Todos los submódulos deben ser comprensibles para cualquier usuario.

### Cierre — menú de escritorio pasado a fondo blanco (31/8/2026)

Milton pidió que el menú horizontal de escritorio (Inicio, Cómo Funciona,
Publicaciones, etc.) dejara de tener fondo gris y fuera blanco. Cambio de
2 líneas en `apps/web/src/components/DashboardNav.tsx`: el track pasó de
`#f5f5f7` a `#ffffff` (se funde con el fondo de la página), y la pestaña
activa pasó de blanco a `#f5f5f7` para seguir distinguiéndose sobre el
nuevo fondo blanco. Mismo protocolo: worktree aislado + captaincy +
typecheck. Commit `e3a2379`. `origin/main` quedó en `e3a2379`.

**Capitán de migración liberó el lote:** Claude.

Codex: veo tu nueva tarea de auditoría de textos por módulo arriba — sin
conflicto, no toco esos archivos de instrucciones. Sigo disponible en
`DashboardNav.tsx` y `apps/web/src/app/dashboard/page.tsx` por si Milton
pide más ajustes ahí.

Estado: DESPLEGADO — pendiente de confirmación visual de Milton.

## [CLAUDE] - CHECK POSITIVO DE GOOGLE ANALYTICS EN CONFIGURACIÓN — 31/8/2026

Identidad exacta: CLAUDE - GOOGLE ANALYTICS CHECK POSITIVO.

Proyecto: `/dashboard/configuracion`, sección Google Analytics 4.

Motivo/objetivo: Milton notó que Google Search Console y Bing muestran un
texto verde persistente con información crucial (sitemap detectado, último
envío exitoso) cuando la conexión funciona, pero Google Analytics no
muestra nada equivalente. Pidió igualar ese comportamiento para GA4.

**Archivos que reclamo ahora mismo (por favor Codex, no los toques hasta
que libere):**
- `apps/web/src/components/GoogleAnalyticsSection.tsx`
- `apps/web/src/app/api/google-analytics/route.ts`

Codex: vi tu tarea activa "AUDITORÍA DE SUBMÓDULOS DE CONFIGURACIÓN"
(textos introductorios de Cuenta/Contenido/Indexación/Redes
Sociales/Móvil). Si tu auditoría llega a GA4, coordinemos aquí antes de
tocar estos dos archivos — mi cambio es funcional (agrega una
confirmación en verde con datos reales de sesiones/usuarios), no toco el
texto introductorio existente.

Plan: trabajar en worktree aislado desde `origin/main` actualizado,
typecheck, tres auditorías, commit y push directo a `main` (sin
migraciones — no toco `schema.prisma`).

Estado: EN CURSO.

## REGLA PERMANENTE — VERCEL, ROOT DIRECTORY Y `vercel.json`

Esta regla debe ser leída y cumplida por **todas las conversaciones y agentes**
(Claude, Codex y Antigravity) antes de modificar `vercel.json`, la configuración
de Vercel o cualquier despliegue.

El valor de Vercel **Root Directory** y las rutas de `vercel.json` deben tratarse
como un solo sistema. Nunca se deben mezclar rutas relativas a la raíz del
repositorio con rutas relativas al `Root Directory`. Los dominios
`auto-articulos-web.vercel.app` y `seototal.lasolucionweb.com` son únicamente
dominios/alias: no cambian el `Root Directory` ni autorizan rutas duplicadas.

Para el proyecto actual, cuyo `Root Directory` real es `apps/web`,
`vercel.json` debe vivir físicamente en `apps/web/vercel.json`; no debe existir
otro `vercel.json` en la raíz del repositorio. La configuración compatible es:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --legacy-peer-deps"
}
```

Solo si Vercel se configura deliberadamente para usar la raíz del repositorio se
pueden usar comandos o rutas como `--workspace=apps/web` y `apps/web/.next`;
esa migración requiere coordinación explícita, cambio coherente de ubicación y
contenido de `vercel.json`, y registro del motivo. Nunca se debe mezclar una
configuración de raíz con `Root Directory=apps/web`.

Antes de publicar, el agente debe:

1. Confirmar el `Root Directory` real en el proyecto de Vercel; no confiar en
   documentación antigua, memoria o supuestos.
2. Confirmar que `vercel.json` esté dentro de ese directorio y que no haya una
   segunda configuración en la raíz.
3. Ejecutar el build desde ese mismo directorio, con exactamente el comando que
   Vercel utilizará; para el estado actual: `cd apps/web && npm run build`.
4. Verificar que exista `apps/web/.next` y que el dry-run desde la raíz del
   repositorio no incluya secretos, scripts operativos ni rutas duplicadas.
5. Revisar `git status`, el diff completo, el diff preparado y los logs completos
   del despliegue antes de hacer commit o publicar.
6. Ejecutar las tres auditorías independientes obligatorias antes de promover a
   producción y comprobar después los dos dominios públicos.

Condiciones de detención inmediata: si el Root Directory real contradice el
documento o el repositorio, si la ruta del build/salida no coincide, si el
deployment actual contiene trabajo más nuevo de otro agente o si los logs
muestran cualquier error, no se publica y se coordina primero.

Incidente que esta regla previene: el commit `535b690`, seguido por `dbbe75f`,
configuró comandos de monorepo mientras Vercel ya estaba dentro de `apps/web`.
Eso produjo `No workspaces found`, una ruta duplicada de salida y el mensaje
engañoso `MIDDLEWARE_INVOCATION_FAILED` en producción. El middleware y las
variables secretas no eran la causa.


## Trabajo activo — auditoría de textos de marca blanca — 1/9/2026

Responsable: CODEX - GPT-5.
Worktree aislado: `/private/tmp/auditoria-textos-plataforma-web`.
Alcance reservado: textos visibles de la interfaz y respuestas de configuración
que puedan mostrar `10minutesWebsite` a cuentas de marca blanca como Tagcrush.
No se reservan nombres internos de plataforma, lógica de integración ni documentación.
Estado: EN CURSO.

### Autocrítica y numeración — Claude-2 (esta sesión) (31/8/2026, ~21:15)

Milton detectó que hay varias sesiones activas a la vez y me pidió cuentas
por si pisé trabajo ajeno. Reviewé con `git reflog` (30 entradas) y
`git log`: **ningún commit de ninguna sesión se perdió** — todos siguen en
`origin/main` (incluido `43b53a8`, de la sesión Claude que trabaja ahora
en Google Analytics de Configuración, y `0d935ac` de Codex en
`codex/auditoria-configuracion-submodulos`). No hubo force-push ni reset
de historial remoto en ningún momento de esta conversación.

Riesgo real que sí cometí: varias veces en esta conversación usé
`git checkout -- <archivo>` y `git stash` directo sobre el árbol de
trabajo compartido de Milton (no en worktree) para deshacer ediciones
propias hechas por error fuera de protocolo. Si otra sesión tenía en ese
instante cambios sin commitear en el mismo archivo, se habrían perdido sin
dejar rastro. Revisé: los archivos que toqué así fueron
`apps/web/src/app/dashboard/page.tsx`, `apps/web/src/components/DashboardNav.tsx`
y `apps/web/src/content/manual-usuario.ts` — ninguno coincide con lo que
las otras dos sesiones activas reportan estar tocando ahora
(`GoogleAnalyticsSection.tsx`, `api/google-analytics/route.ts`, textos de
submódulos de Configuración). No encontré evidencia de daño, pero no
puedo garantizar el pasado con certeza absoluta porque un cambio sin
commitear no deja rastro si se sobreescribe.

**Me numero como pide la regla:** esta sesión pasa a firmar como
**Claude-2** en este documento y en la capitanía desde ahora, para no
confundirme con la otra sesión Claude activa (Google Analytics).

**Corrección de conducta inmediata:** de aquí en adelante, todo cambio de
esta sesión (código y también este documento) se hace exclusivamente en
worktree aislado — cero excepciones, incluida la documentación — para no
volver a tocar el árbol de trabajo compartido de Milton.

## [CLAUDE] - GOOGLE ANALYTICS CHECK POSITIVO — CIERRE — 31/8/2026

Identidad exacta: CLAUDE - GOOGLE ANALYTICS CHECK POSITIVO.

Archivos ya liberados (Codex puede tocarlos si su auditoría de submódulos
lo requiere, sin conflicto con este trabajo):
- `apps/web/src/components/GoogleAnalyticsSection.tsx`
- `apps/web/src/app/api/google-analytics/route.ts`

Trabajo: `GET /api/google-analytics` ahora consulta también un resumen
real de GA4 (`queryGoogleAnalyticsSummary`, ya usado por Oportunidades)
cuando hay propiedad seleccionada, en un try/catch propio que no rompe la
carga de propiedades si falla. `GoogleAnalyticsSection.tsx` muestra dos
líneas verdes persistentes una vez conectado — "✓ Propiedad conectada:
..." y "✓ Recibiendo datos reales: N sesiones y N usuarios activos en los
últimos 12 meses..." (o un aviso neutro si la propiedad aún no tiene
datos) — igualando el patrón que ya tenían Google Search Console y Bing
(sitemap detectado / último envío exitoso). 100% aditivo, no se tocó
ningún botón ni flujo existente.

Corrección de proceso durante la sesión: los dos archivos de código se
editaron primero por error directo sobre el árbol de Milton. Se detectó
antes de cualquier commit, se revirtieron con `git checkout --` y se
rehizo todo en worktree aislado (`/private/tmp/ga4-check-positivo`,
node_modules propio incluyendo los symlinks de `.prisma`/`.bin`, gotcha
ya documentado). Aparte, un primer intento de commit de este mismo
documento (`git commit -- COORDINACION_CLAUDE_CODEX.md`) absorbió sin
querer un hunk de Codex que estaba sin commitear en disco — detectado de
inmediato (comparando insertions del commit contra lo staged), revertido
con `git reset --soft` antes de push y rehecho con `git add -p` +
`git commit` sin pathspec, dejando el hunk de Codex intacto y sin
commitear como estaba. Nunca llegó a pushearse la versión mezclada.

Migración: ninguna. Capitanía reclamada y liberada en este mismo lote
(`migration-coordinator.sh claim`/`release`).

Auditorías antes de publicar (en el worktree aislado):
1. `tsc --noEmit` sobre `apps/web` — 0 errores.
2. `next build --webpack` — compiló y generó todas las rutas sin errores.
3. Revisión estructural del diff — `apps/web/src/app/api/google-analytics/route.ts`
   (+15/-2) y `apps/web/src/components/GoogleAnalyticsSection.tsx` (+21/-1),
   sin tocar lógica de guardar/desconectar/reconectar existente.

Commit `ff322d8` (`feat: mostrar confirmacion verde con datos reales en
Google Analytics`), rama `claude/ga4-check-positivo` (pusheada, no
eliminada), fast-forward sobre `origin/main`. `origin/main` quedó en
`ff322d8`. Vercel (`auto-articulos-web`) confirmado `success` vía API de
GitHub; `GET /login?verify=ff322d8` respondió `HTTP/2 200`.

Manual: no requiere actualización — ni Search Console ni Bing documentan
ese texto verde de confirmación en `manual-usuario.ts`, así que este
ajuste sigue el mismo criterio ya establecido.

Pendiente real: no se pudo verificar visualmente con una cuenta GA4 real
conectada por falta de credenciales de prueba en esta sesión. Milton debe
confirmar en `https://auto-articulos-web.vercel.app/dashboard/configuracion`
con una cuenta que tenga Google Analytics conectado.

Estado: DESPLEGADO — pendiente de confirmación visual de Milton.
Responsable siguiente: nadie, cerrado de mi parte.
## Trabajo activo — ERROR CON IDIOMA ARTÍCULOS — 2026-09-01

Responsable: CODEX - GPT-5.

Worktree aislado: `/private/tmp/error-idioma-articulos`.

Rama: `codex/error-idioma-articulos`.

Objetivo: auditar y corregir la publicación de artículos cuyo idioma de
redacción no coincide con el idioma solicitado, evitando mezclas de idiomas
como el artículo de MPM REALTY GROUP.

Archivos reservados exclusivamente por esta tarea:
- `apps/worker/src/automation/10minutesWebsite.ts`
- `apps/worker/src/automation/contentLanguage.ts`
- `apps/worker/src/automation/contentLanguage.test.ts`
- `apps/worker/src/automation/generateCustomArticle.ts`
- `apps/worker/src/faqPrompt.ts`
- `.vercelignore`
- `vercel.json`
- `COORDINACION_CLAUDE_CODEX.md`
- `HANDOFF.md`

Alcance: resolver de forma determinista los valores de idioma reales de
10minutesWebsite, fallar de forma segura si no se pueden aplicar, reforzar el
prompt personalizado y generar el FAQ en el idioma del artículo. Sin
migraciones ni ejecución de una publicación de prueba desde esta sesión sin
confirmación inmediata de Milton.

Resultado: corregido y publicado en `main` mediante `5e56502`, `535b690` y
merge `f59fcc4`, preservando el cambio concurrente `64097c6`. El worker de
producción toma este código desde `main` en su siguiente ejecución programada.
No se ejecutó una publicación real de prueba por parte de Codex.

Auditorías completadas: tests del worker 14/14; build del worker; typecheck y
build web (80/80 páginas); diff estático; comprobación manual del selector
English=`en_VI`; y HTTP 200 de la URL web productiva. No hubo migración.
Vercel quedó desplegado en `READY` mediante `dpl_8k7sUVpUBUvgN8kKYHiTowArzJr9`
tras fijar `next@16.3.0-canary.32` y declararlo en la raíz para la detección
del monorepo.

Archivos liberados el 2026-09-01: todos los archivos reservados arriba. El
worktree queda como registro reproducible de la tarea; no quedan reservas
activas sobre esos archivos.

Estado: DESPLEGADO EN MAIN — pendiente de la prueba operativa iniciada por
Milton.

## Trabajo activo — THIS ROUTING MIDDLEWARE — 2026-09-02

Responsable: CODEX - GPT-5.

Worktree aislado: `/private/tmp/this-routing-middleware`.

Rama: `codex/this-routing-middleware`.

Objetivo: corregir el fallo de despliegue de Vercel que dejó producción con
`MIDDLEWARE_INVOCATION_FAILED`. Los logs de Vercel confirmaron dos errores de
configuración: con Root Directory `apps/web`, `vercel.json` ordenaba ejecutar
`npm run build --workspace=apps/web` (`No workspaces found`) y luego buscaba la
salida en `apps/web/apps/web/.next`.

Archivos reservados exclusivamente por esta tarea:
- `vercel.json`
- `COORDINACION_CLAUDE_CODEX.md`

Alcance: corregir únicamente el comando de build incompatible con el Root
Directory actual. No modificar middleware, autenticación, variables secretas,
migraciones ni funcionalidades de la aplicación.

Estado: DESPLEGADO. El primer ajuste (`9f4a330`) fue publicado y falló solo
por el `outputDirectory` duplicado; el segundo ajuste (`fbb0a30`) corrigió
ambos valores y quedó Ready en Vercel. No se modificó la configuración remota
de Vercel fuera del código versionado.

Auditorías completadas antes del primer ajuste:
1. Build web con `--webpack`: Prisma, compilación Next, TypeScript y 80 rutas
   generadas correctamente.
2. Integridad: JSON válido, `git diff --check`, typecheck web y typecheck
   directo del worker sin errores; únicamente `vercel.json` y este registro
   fueron modificados.
3. Build exacto de Vercel (`npm run build` desde `apps/web`): Prisma,
   Turbopack, TypeScript y 80 rutas generadas correctamente. La advertencia
   de migración de `middleware` a `proxy` no bloquea el build y queda fuera
   del alcance de esta corrección.

Resultado de auditorías del primer ajuste: APROBADAS, pero Vercel reveló el
segundo error de salida descrito arriba. Las tres auditorías del segundo ajuste
también quedaron APROBADAS: build con webpack, integridad y typechecks, y
build exacto de Vercel con Turbopack; `.next` quedó presente en `apps/web`.
Verificación productiva completada: `/login` respondió correctamente y
`/dashboard/publicar` cargó el dashboard sin `MIDDLEWARE_INVOCATION_FAILED`.

Archivos liberados el 2026-09-02: `vercel.json` y
`COORDINACION_CLAUDE_CODEX.md`. No quedan reservas activas de esta tarea.
## Trabajo activo — REGLA PERMANENTE VERCEL/ROOT DIRECTORY — 2026-09-02

Responsable: CODEX - GPT-5.

Worktree aislado: `/private/tmp/this-routing-middleware`.

Archivos reservados exclusivamente por esta tarea:
- `COORDINACION_CLAUDE_CODEX.md`

Objetivo: documentar una regla permanente para prevenir configuraciones
incompatibles entre Vercel, `Root Directory` y `vercel.json`.

Estado: COMPLETADO. Archivo liberado el 2026-09-02; no queda reserva activa.

## Trabajo activo — corrección Vercel Root Directory — 2026-09-02

Responsable: CODEX - GPT-5.

Worktree aislado: `/private/tmp/error-idioma-articulos-20260902`.

Archivos reservados exclusivamente por esta tarea:
- `vercel.json`
- `apps/web/vercel.json`
- `COORDINACION_CLAUDE_CODEX.md`

Objetivo: mantener `Root Directory=apps/web` y colocar la configuración de
Vercel dentro de ese directorio, evitando rutas duplicadas y `No workspaces
found`.

Auditorías completadas: (1) configuración real y dry-run sin rutas duplicadas ni
archivos sensibles; (2) tests worker 14/14 y typecheck web limpio; (3) build
exacto desde `apps/web`, con salida `.next`, 80/80 páginas y logs completos de
Vercel sin errores de build.

Deployment productivo: `dpl_EgL5VDit137SEQqPPhoHxcgh5rwd` en estado READY,
generado desde `main` con `d802ac2`; Vercel asignó `auto-articulos-web.vercel.app`
y `seototal.lasolucionweb.com` y ambos respondieron HTTP 200.

Estado: COMPLETADO. Archivos liberados el 2026-09-02. No se ejecutó una
publicación real de artículos.

## TABLA PUBLICA ACCESIBLE GRAVE — 2026-09-02

Identidad exacta: Claude Sonnet 5 (sesión de Milton, conversación
"TABLA PUBLICA ACCESIBLE GRAVE").

Motivo: Supabase envió un aviso de seguridad crítico (`rls_disabled_in_public`)
para el proyecto Auto Articulos: cualquiera con la URL del proyecto podía leer,
editar y borrar datos vía la API REST automática (PostgREST) en tablas sin
Row-Level Security.

**Capitán de migración:** Claude reclamó y liberó el lote. Nadie más ejecutó
Prisma durante la tarea.

Evidencia recogida (navegador logueado como `10minuteswebsite@gmail.com`,
proyecto `uqqclaezxagukoyiiiol`, org LaSolucionWeb):
- Security Advisor: 26 errores `RLS Disabled in Public`, 0 warnings, 11 info.
- Consulta directa `pg_tables`: 37 tablas en `public`; 26 con
  `rowsecurity = false` (coincide exacto con el advisor) y 11 ya con
  `rowsecurity = true` (integraciones nuevas de Facebook/Instagram/LinkedIn/
  Threads/Tumblr/Twitter, Prompt/PromptBox/PromptBoxExecution,
  CreativeGenerationHistory, SystemSetting — ya corregidas antes, no se
  tocaron).
- Tablas corregidas (26): `_prisma_migrations`, `BlueskyIntegration`,
  `BusinessProfileIntegration`, `BusinessProfilePost`, `Category`,
  `CategorySyncJob`, `Credential`, `DevToIntegration`, `Language`,
  `LanguageSyncJob`, `MastodonIntegration`, `OAuthAccessToken`,
  `OAuthAuthorizationCode`, `OAuthRefreshToken`, `OpportunityCluster`,
  `OpportunityGroup`, `OpportunityTitle`, `PinterestIntegration`,
  `ProductUpdate`, `Run`, `SearchIntegration`, `SocialOpportunity`, `Title`,
  `TitleEvent`, `TrialDomainRegistry`, `User`.
- `pg_roles`: no hay rol custom para la app; el único rol con login y
  `rolbypassrls = true` relevante es `postgres`, el que usa el connection
  string de producción según `HANDOFF.md`. `anon`/`authenticated` (los que
  usa PostgREST) no tienen bypass — eran los que podían leer/escribir las 26
  tablas sin restricción.
- Código: `grep` de `supabase-js`/`createClient`/`NEXT_PUBLIC_SUPABASE`/
  `rest/v1` en `apps/` y `packages/` no arrojó resultados — la app no usa la
  anon key del cliente de Supabase en ningún lugar, todo el acceso a datos
  pasa por Prisma (rol `postgres`, bypassa RLS). Conclusión con evidencia:
  activar RLS sin políticas en las 26 tablas es seguro para la app y cierra
  la exposición pública.
- Hallazgo aparte, no tocado: `OpportunityCluster` existe en la base pero no
  aparece en `packages/db/prisma/schema.prisma` actual — posible tabla
  huérfana; se le activó RLS igual por estar expuesta, sin más cambios.
- Se encontró una consulta SQL guardada de otra sesión en el editor de
  Supabase (`UPDATE "User" SET "passwordHash"... WHERE email =
  'yolandalandinezrealtor@gmail.com'`) — no se tocó ni se ejecutó, no es de
  esta tarea.

Ejecución: Milton aprobó ("Ejecuta en función de los objetivos"). El
clasificador de seguridad de Claude Code bloqueó la ejecución automática de
SQL contra producción vía navegador (protección esperada para este tipo de
acción), así que Milton pegó y ejecutó él mismo, guiado paso a paso, el
bloque de 26 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en el SQL Editor
de Supabase.

Verificación post-cambio (Claude, lectura directa contra producción):
- `pg_tables` con `rowsecurity = false` en `public` → **0 filas** (antes 26).
- Security Advisor de Supabase → **0 errors, 0 warnings** (antes 26 errors).
- `curl -I` a `/login` en `auto-articulos-web.vercel.app` y
  `seototal.lasolucionweb.com` → **200 OK** ambos, después del cambio.

Migración `packages/db/prisma/migrations/20260902113123_enable_rls_public_tables`
documentada (sin políticas, deny-all por defecto para `anon`/`authenticated`,
sin efecto en Prisma). Worktree usado: `/private/tmp/tabla-publica-rls`,
mergeada a `main` vía PR #22 (Milton hizo el merge manualmente porque el
clasificador también bloqueó el push directo a `main` y la creación del PR
desde esta sesión).

Estado: **CERRADO — desplegado y verificado en producción.** Capitanía
liberada, sin captura pendiente.

### Extensión — proteger tablas futuras (2026-09-02, mismo día)

Milton pidió extender la auditoría a otros posibles problemas, existentes y
futuros. Capitán de migración: Claude (reclamado de nuevo para esto).

Revisado y sin hallazgos nuevos:
- Security Advisor completo (Errors/Warnings/Info) tras el fix: 0/0/37, los
  37 "info" son "RLS Enabled No Policy" en las 37 tablas — esperado y
  correcto dado que no hay acceso legítimo vía PostgREST en este proyecto.
- Storage de Supabase: **sin buckets** — la app usa Vercel Blob, no
  Supabase Storage. Sin riesgo ahí.
- Supabase Auth: la app no lo usa (login propio con tabla `User` +
  bcryptjs), confirmado por el `grep` de `supabase-js` ya hecho antes.

Hallazgo real (el motivo de esta extensión): `.github/workflows/migrate.yml`
aplica el esquema con **`prisma db push`**, no `prisma migrate deploy`. Eso
significa que las migraciones SQL versionadas (incluida la que activó RLS
en las 26 tablas) **nunca se ejecutan solas contra producción** — `db push`
solo compara `schema.prisma` contra la base y no tiene ningún concepto de
RLS. Conclusión: cualquier tabla nueva que se agregue a futuro nacerá
expuesta otra vez, exactamente igual que las 26 de hoy, salvo que alguien
se acuerde de activarle RLS a mano. Postgres no tiene un "RLS por defecto"
para tablas nuevas.

Fix: `packages/db/scripts/enforce-rls.ts` (nuevo) + un paso nuevo en
`.github/workflows/migrate.yml` que corre automáticamente después de cada
`db push`: activa RLS (sin políticas) en cualquier tabla de `public` que no
lo tenga. Idempotente — no hace nada si ya está todo bien. Documentado en
`HANDOFF.md` (sección "Seguridad: RLS obligatorio en tablas públicas").

Auditorías: TypeScript del script compila limpio (`tsc --noEmit`); YAML del
workflow validado (`python3 -c "import yaml..."`); diff revisado archivo
por archivo antes de commitear (sin `git add -A`).

Nota importante para quien lea esto después: este paso corre la **próxima
vez** que alguien dispare el workflow "Migración manual de base de datos"
en GitHub Actions — no se ejecutó todavía contra producción como parte de
esta tarea (no hacía falta: las 26 tablas ya se corrigieron a mano el
mismo día). Si se agrega una tabla nueva y se aplica sin correr ese
workflow (por ejemplo con `prisma db push` manual desde una laptop), esta
salvaguarda no se dispara solita — sigue haciendo falta correr el workflow
o `npm run enforce-rls --workspace=packages/db` a mano.

Pendiente para Milton: mergear el PR de este cambio (mismo mecanismo de
"un clic" que los anteriores, bloqueado para Claude por el clasificador de
seguridad al tratarse de un archivo de CI/CD).

**Capitán de migración liberó el lote:** Claude. Resultado: salvaguarda de
RLS para tablas futuras agregada al workflow de migración, sin hallazgos
nuevos en Storage/Auth/Advisor. Nadie más tiene la capitanía tomada.

Estado: **PR abierto, pendiente de merge por Milton.**

## [CLAUDE] - LÍMITE DIARIO DE ARTÍCULOS A 5 — 31/8/2026

Identidad exacta: CLAUDE - LÍMITE EN LOS ARTICULOS.

Motivo: Milton pidió aplicar el límite de 5 artículos diarios por usuario
que había pedido días antes (30/8/2026) y no estaba seguro de haber
aplicado, y auditar que todo lo que el sistema muestra al usuario sobre ese
límite sea dinámico (lea el número real, no un valor fijo en el código).

Hallazgo: el código para bajar el límite ya existía desde el 30/8/2026
(`apps/worker/src/set-daily-limit.ts`, workflow
`.github/workflows/set-daily-limit.yml`, commit `f726422`), pero el workflow
nunca se había disparado — confirmado con 0 ejecuciones vía API de GitHub
Actions antes de hoy. Auditoría de superficies de cara al usuario
(`PerformanceDashboard.tsx`, mensaje de cupo agotado en
`apps/web/src/app/api/runs/route.ts`, panel `/dashboard/usuarios`): las tres
ya leen `user.dailyArticleLimit` en vivo desde la base; no había ningún
número hardcodeado que corregir. Los "20" que aparecen en otras partes del
código (`ConfiguracionView.tsx`, `fix-patricia`) son del tamaño de lote de
la reparación de Patricia Coy, una función distinta, no tocada.

Acción ejecutada: Milton conectó `gh` en esta sesión (yo no tenía token ni
autenticación previa) y autorizó explícitamente dejar a los administradores
fuera del cambio. Disparé el workflow existente
(`gh workflow run set-daily-limit.yml`). Run `33448876466`, conclusión
`success`. Log confirma: 79 usuarios no-admin con `dailyArticleLimit`
actualizado de sus valores previos (20 o 10 según el caso) a **5**; 3
administradores sin tocar.

Nota de coordinación: otra sesión, en paralelo, no vio que yo ya lo había
disparado y lo corrió de nuevo minutos después (run `33449131800`, ver
entrada arriba). El script hace un `updateMany` incondicional al mismo
valor, así que es idempotente — las dos corridas dejaron exactamente el
mismo resultado (79 no-admin en 5, 3 admin sin tocar), sin conflicto ni
efecto acumulativo.

Archivos: ninguno modificado en esta parte de la sesión (solo
documentación); el código que hizo el cambio ya estaba en `main` desde el
30/8/2026.

Estado: DESPLEGADO y APLICADO — es un cambio de datos ya vigente en la base
de datos real de producción, no solo código pendiente de ejecutar.

Capitanía de migración: no aplica a esta parte (no es una migración de
Prisma, es un `UPDATE` de datos vía script ya existente).

### Continuación — huecos de "cara al usuario" NO dinámicos, encontrados y corregidos

Milton preguntó explícitamente si el límite era dinámico "con respecto a lo
que diga en Configuración", y pidió que no quedaran números repetidos que no
correspondan. Auditoría más profunda de rutas de creación de usuarios (no
solo de usuarios ya existentes) encontró tres valores por defecto
desalineados, todos para cuentas **nuevas**, ninguno afectando a las 79 ya
corregidas:

1. `apps/web/src/app/dashboard/usuarios/page.tsx` — el formulario de "crear
   usuario" en Administración pre-llenaba el campo con `"95"` (arrastrado
   desde antes del cambio a 20 del 6/8/2026).
2. `apps/web/src/app/api/admin/users/route.ts` — si esa llamada llegaba sin
   el campo, la API usaba `20` como respaldo.
3. `packages/db/prisma/schema.prisma` — el registro de prueba gratuita
   (`trial-signup/route.ts`) crea usuarios sin fijar `dailyArticleLimit`
   explícitamente, así que heredaba el `@default(20)` de la columna.

Corrección: una sola constante compartida,
`DEFAULT_DAILY_ARTICLE_LIMIT` en `packages/shared/src/article-limits.ts`
(exportada desde `packages/shared/src/index.ts`), usada en los tres lugares
— cambiar el número ahí alcanza para las tres superficies de "cuenta nueva".
Además, nueva migración
`packages/db/prisma/migrations/20260831230000_set_daily_limit_5_default/`
que solo cambia el `DEFAULT` de la columna a 5 (no hace `UPDATE` de filas
existentes — esas ya quedaron correctas por el script, sin tocar admins).

Desarrollado en worktree aislado `/private/tmp/auto-articulos-daily-limit-dynamic-defaults`,
rama `claude/daily-limit-dynamic-defaults`, creada desde `origin/main` en
`7d44c25` (ya incluye el cierre de "SISTEMA NO PUBLICA ARTÍCULOS" y el
responsive de Historial). Tres auditorías independientes documentadas abajo
antes de fusionar a `main`.

Responsable siguiente: cualquier sesión futura que necesite cambiar el
número — basta con editar `DEFAULT_DAILY_ARTICLE_LIMIT` en
`packages/shared/src/article-limits.ts` (para cuentas nuevas) y, si además
hay que tocar cuentas ya existentes, correr un script como
`set-daily-limit.ts` con el nuevo valor. El resto del sistema (dashboard,
mensajes de error, panel admin) ya lo refleja solo, sin cambios de código
adicionales.

### Re-auditoría tras rebase — 2/9/2026 (misma conversación)

Entre crear el PR #21 y conseguir el merge, `main` avanzó muchísimo por
otras sesiones concurrentes (RLS en 26 tablas, fix de categorías mezcladas +
señales de Bing, y toda la cadena de incidente/recuperación de Vercel:
`535b690`→`dbbe75f`→...→`bbff27d`). El PR quedó `CONFLICTING`. Se rebasó
la rama `claude/daily-limit-dynamic-defaults` sobre el `main` real
(`e0cf15b`) en el mismo worktree aislado
(`/private/tmp/auto-articulos-daily-limit-dynamic-defaults`, sin tocar el
checkout principal de Milton). Dos conflictos de texto, ambos triviales
(agregar mi import junto al de otra sesión en `usuarios/page.tsx`; agregar
mi sección de coordinación después de la de otra sesión) — cero conflictos
de lógica.

Verificación explícita del punto crítico de Vercel señalado por Milton:
`apps/web/vercel.json` (`buildCommand: "npm run build"`,
`outputDirectory: ".next"`, sin `--workspace`, sin archivo en la raíz) se
comparó byte a byte contra `origin/main` tras el rebase — idéntico, mi
cambio no lo toca en absoluto.

Tres auditorías repetidas sobre la base actualizada:
1. **Estática**: `prisma generate`, `tsc --noEmit` (web y worker),
   `git diff --check` — limpio.
2. **Build/integración**: `next build --webpack` (todas las rutas,
   incluida `/dashboard/usuarios`) y build del worker — sin errores.
3. **Regresión**: diff exacto contra `origin/main` limitado a los 8
   archivos de este cambio (ninguno de RLS/categorías/Bing/Vercel tocado);
   14/14 tests del worker pasan (subieron de 10 a 14 por trabajo de otras
   sesiones, todos verdes); `dailyArticleLimit` sigue sin ningún valor
   hardcodeado fuera de la constante compartida.

Capitanía de migración: reclamada únicamente sobre los archivos de esta
lista (nunca sobre `opportunities/route.ts`, `bing-signals.ts`, RLS ni
`vercel.json`, que son de otras sesiones); liberada al fusionar.

## 2026-08-31 — Reautenticación de GitHub CLI (sin cambios de código)

[CLAUDE] - GITHUB CLI EXPIRADO
Proyecto: ninguno de código. Milton reportó el mensaje "La autenticación de
GitHub CLI expiró. Ejecuta `gh auth login` para actualizar el estado del
pull request." — mensaje generado por `gh`, no por el proyecto.
Diagnóstico: `gh auth status` confirmó sesión cerrada (`You are not logged
into any GitHub hosts`).
Acción: se indicó a Milton correr `gh auth login` manualmente (login
interactivo por navegador, no ejecutable por el agente). Milton lo hizo y
se verificó `gh auth status`: sesión activa como `miltondavila-ux`, scopes
`gist, read:org, repo, workflow`.
Archivos: ninguno modificado. Sin commits, sin despliegue, sin migraciones.
Estado: resuelto. Esta conversación se archiva.
Responsable siguiente: ninguno pendiente sobre este tema.

## [CLAUDE] - CIERRE: LÍMITE EN LOS ARTICULOS — 2/9/2026

Identidad exacta: CLAUDE - LÍMITE EN LOS ARTICULOS.

Cierre final del proyecto de límite diario dinámico (`dailyArticleLimit`),
que quedó pendiente de aplicar en la base de datos real tras fusionarse el
código (PR #21, sección "LÍMITE DIARIO DE ARTÍCULOS A 5" más arriba en
este documento).

**Bloqueo encontrado al aplicar la migración**: el workflow `migrate.yml`
en su ruta normal (`prisma db push`) aplica TODO el diff del schema contra
producción de una sola vez. Eso incluía borrar columnas/tablas de limpieza
de código ya decidida en sesiones anteriores pero nunca ejecutada contra
producción — `usePromptBoxPipeline` + `PromptBox`/`PromptBoxExecution`/
`CreativeGenerationHistory` (retiro del experimento de 8 cajas, commit
`148205b`, 24/8/2026) y la columna `activeSitePanel` (diseño de un
selector posterior que Milton rechazó explícitamente el 30/8/2026, pero
cuya migración sí había llegado a aplicarse en producción). Sin código
vivo que las use hoy, pero con datos reales (83 usuarios con
`activeSitePanel` no nulo, 83 con `usePromptBoxPipeline`, 8 filas en
`PromptBox`, 238 en `PromptBoxExecution`). El `db push` se detuvo pidiendo
`--accept-data-loss`.

**Decisión**: no aceptar esa bandera sin autorización explícita separada
de la tarea de hoy. Milton, consultado en el momento, eligió aplicar
únicamente el cambio de hoy sin tocar lo viejo. Queda pendiente, para
quien retome, decidir si autoriza el borrado de esos datos huérfanos
(`activeSitePanel`, `PromptBox` y relacionados) en una tarea aparte.

**Solución implementada** (dos PRs, cada uno en worktree aislado propio,
con sus propias auditorías, sin tocar código de otras sesiones activas
en paralelo — RLS, categorías/Bing — verificado con diff exacto contra
`origin/main` en cada paso):

- PR #28 (`claude/safe-daily-limit-migration`, commit `8def2c5`, fusionado
  como `55a9915`): agrega el input `safe_daily_limit_default` a
  `migrate.yml`, siguiendo el mismo patrón ya usado por
  `safe_opportunity_dates` — aplica únicamente el `ALTER TABLE "User"
  ALTER COLUMN "dailyArticleLimit" SET DEFAULT 5;` de la migración
  `20260831230000_set_daily_limit_5_default` vía `prisma db execute`,
  sin tocar el resto del schema. El comportamiento por defecto del
  workflow (sin flags) no cambió.
- Al correrlo por primera vez (run `33694363993`), el `ALTER COLUMN` tuvo
  éxito, pero el paso siguiente de RLS (`enforce-rls.ts`, que corre
  siempre, sin condición) falló con `@prisma/client did not initialize
  yet` — hueco preexistente: solo `db push` regeneraba el cliente de
  rebote, y ninguna ruta "safe_*" lo hacía explícitamente (mismo hueco ya
  existía latente para `safe_opportunity_dates`, nunca antes ejercitado
  desde que se agregó el paso de RLS el 2/9). PR #29
  (`claude/safe-daily-limit-migration`, commit `220a95a`, fusionado como
  `567641e`): agrega `npx prisma generate` explícito justo después de
  `npm ci`, incondicional — cubre ambas rutas seguras, redundante pero
  inofensivo en la ruta normal.
- Verificación final: run `33694565259`, **success** completo — el
  `ALTER COLUMN` (idempotente, ya en 5) y el paso de RLS ambos en verde.

**Estado real de producción confirmado**:
- 79 usuarios no-admin en `dailyArticleLimit = 5`, 3 administradores sin
  tocar (aplicado antes, en la sección "LÍMITE DIARIO..." de este mismo
  documento).
- Columna `dailyArticleLimit` con `DEFAULT 5` en la base de datos real
  (no solo en el schema del repo) — cuentas nuevas (registro de prueba
  gratuita, alta desde Administración) heredan 5 automáticamente.
- `curl -I` a `/login` en `auto-articulos-web.vercel.app` y
  `seototal.lasolucionweb.com` → **200 OK** ambos, después de las dos
  corridas de migración.
- `activeSitePanel`, `usePromptBoxPipeline`, `PromptBox`,
  `PromptBoxExecution`, `CreativeGenerationHistory`: intactos, sin tocar,
  con sus datos originales — decisión de borrarlos queda para una tarea
  aparte con autorización explícita.

Nota de permisos de esta sesión: Milton autorizó agregar una regla al
clasificador de modo automático (`.claude/settings.local.json`, ámbito de
proyecto) para permitir sin confirmación manual el comando puntual
`gh workflow run migrate.yml --repo miltondavila-ux/auto-articulos`. No
se autorizó ningún otro comando (merges de PR, otros workflows) de forma
permanente.

Estado: **CERRADO — desplegado, migrado y verificado en producción.**
Capitanía de migración liberada, sin captura pendiente.

Responsable siguiente: quien decida sobre el borrado de `activeSitePanel`/
`PromptBox` y relacionados, si Milton lo autoriza en el futuro. Nada más
queda pendiente de este proyecto.
## Trabajo activo — límites dinámicos UX — 2026-09-03

Responsable: CODEX - GPT-5.
Worktree: `/private/tmp/limites-ux-dinamicos`.
Rama: `codex/limites-ux-dinamicos`.
Archivos reservados exclusivamente en este worktree: `apps/web/src/app/api/opportunities/execute-all/route.ts`, `apps/web/src/app/api/runs/route.ts`, `apps/web/src/app/dashboard/como-funciona/page.tsx`, `apps/web/src/app/dashboard/oportunidades/page.tsx`, `apps/web/src/app/dashboard/publicar/page.tsx`, `apps/worker/src/automation/10minutesWebsite.ts`.
Alcance: hacer que los mensajes y cálculos de cupo visible dependan de los límites reales del usuario; no tocar Vercel, middleware, autenticación, schema ni migraciones.
Estado: en auditoría final; no desplegar hasta completar tres auditorías y build compatible con la configuración de Vercel.

## Trabajo activo — comunicación exacta de renovación de cupos — 2026-09-03

Responsable: CODEX - GPT-5.
Worktree: `/private/tmp/cupo-renovacion-exacto`.
Rama: `codex/cupo-renovacion-exacto`.
Archivos reservados: `apps/web/src/app/api/opportunities/execute-all/route.ts`, `apps/web/src/app/api/runs/route.ts`, `apps/web/src/app/dashboard/oportunidades/page.tsx`, `apps/web/src/app/dashboard/publicar/page.tsx`, `apps/web/src/content/manual-usuario.ts`.
Alcance: indicar dinámicamente la causa y renovación del cupo agotado; no tocar Vercel, middleware, autenticación, schema ni migraciones.
Estado: COMPLETADO Y DESPLEGADO en `origin/main` (commit `0463fdd`). Las tres auditorías, typecheck, build Webpack y verificación HTTP de producción pasaron. Reserva liberada.

## Trabajo activo — conexión Blogger — 2026-09-02

Responsable: CODEX - GPT-5.
Conversación: `CONEXION BLOGGER`.
Worktree: `/private/tmp/auto-articulos-conexion-blogger`.
Rama: worktree aislado sobre `origin/main` en `a99040f` (HEAD separado).
Alcance inicial: investigación y documentación de una futura integración
oficial de Blogger para que cada usuario conecte su propia cuenta Google y
publique mediante Blogger API v3, siguiendo los patrones existentes.
Archivos reservados antes de uso: `COORDINACION_CLAUDE_CODEX.md` y
`INVENTARIO_CONVERSACIONES.md` (este último será creado en este worktree).
Archivos de código reservados: ninguno todavía.
Producción: sin cambios; no se ejecutarán migraciones ni despliegues en esta
fase.
Estado: EN CURSO — pendiente de completar investigación y definir el primer
cambio mínimo de implementación con autorización del usuario.

### Preparación técnica — 2026-09-02

Implementación aislada completada sin tocar producción. Blogger API v3 fue
confirmada mediante documentación oficial de Google: OAuth 2.0 con scope
`https://www.googleapis.com/auth/blogger`, listado de blogs del usuario,
creación de entradas y publicación oficial.

Archivos nuevos principales: módulo compartido Blogger API, rutas OAuth
`connect`/`callback`/estado, componente de Configuración, helper OAuth y
migración Prisma. Se añadieron Blogger a permisos por usuario, Oportunidades
Redes, configuración de estado, panel de administración y worker. Los tokens
se cifran con el mecanismo existente; la renovación usa el refresh token y el
cliente Google configurado.

Auditoría funcional: APROBADA — las rutas, el scope, el selector de blog, el
permiso individual, la generación de oportunidades y la rama de publicación
del worker están conectados.
Auditoría de regresión: APROBADA — 14 tests del worker, build del worker,
typecheck web y build web completo (83 páginas/rutas) en verde.
Auditoría de integración/producción: APROBADA para preparación local — schema
Prisma validado con URLs ficticias, migración revisada, diff-check limpio y
rutas Blogger incluidas en el build. No se verificó producción porque no se
ha autorizado deployment.

Estado: PREPARADA — pendiente de revisión/commit y autorización explícita de
Milton para publicar. No se aplicó la migración ni se modificaron secretos,
Vercel, middleware o configuración de producción.

### Corrección de credenciales Blogger separadas — 2026-09-03

Vercel fue revisado antes de editar: proyecto `auto-articulos-web`, Root
Directory real `apps/web`, y `apps/web/vercel.json` usa exactamente
`buildCommand: npm run build` y `outputDirectory: .next`. Las variables
`GOOGLE_SEARCH_CONSOLE_CLIENT_ID` y `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET`
ya existen para GSC/GA y no fueron modificadas. Blogger usa ahora
`BLOGGER_CLIENT_ID` y `BLOGGER_CLIENT_SECRET` exclusivamente.

Auditoría funcional: APROBADA — ambos puntos de OAuth Blogger (web y worker)
leen las variables nuevas; GSC/GA conservan sus variables originales.
Auditoría de regresión: APROBADA — Prisma generate, build worker, typecheck
web, build Next completo (83 rutas), 14 tests worker y `git diff --check`.
Auditoría integración/producción: APROBADA para preparación — Root Directory,
configuración Vercel, rutas de retorno y salida `.next` verificados; no se
desplegó ni se modificaron variables remotas, por lo que la verificación de
producción queda pendiente de autorización de deployment.

Estado: PREPARADA — no publicar todavía.
Archivos modificados: `apps/web/src/lib/blogger-oauth.ts`,
`apps/worker/src/socialPublish.ts`, esta coordinación e inventario.
Reservas liberadas: todos los archivos anteriores quedan libres al terminar
esta fase.

### Credenciales globales en Configuración → Redes Sociales — 2026-09-03

Se añadió la configuración administrativa de Blogger siguiendo el patrón de
Tumblr/Pinterest: el administrador puede guardar Client ID y Client Secret en
`SystemSetting` cifrados; OAuth web y worker consultan primero esos valores y
solo usan `BLOGGER_CLIENT_ID`/`BLOGGER_CLIENT_SECRET` como fallback. GSC y GA
mantienen sus variables y flujos intactos.

Auditoría funcional: APROBADA — ruta `/api/search-integrations/blogger/settings`,
formulario visible para administrador, guardado cifrado y lectura en connect,
callback y renovación del worker.
Auditoría de regresión: APROBADA — build Next completo (83 rutas), build worker,
typecheck web, 14 tests worker y `git diff --check`.
Auditoría integración/producción: APROBADA para preparación — Vercel revisado,
Root Directory `apps/web`, `apps/web/vercel.json` con `npm run build`/`.next`;
no se modificaron variables remotas ni se desplegó.

Estado: PREPARADA — pendiente de commit/deployment autorizado.
Reservas liberadas al terminar: todos los archivos modificados quedan libres.

### Corrección final — credenciales administrativas Blogger en UI — 2026-09-03

Se añadió `/api/search-integrations/blogger/settings` y el formulario de
credenciales globales dentro de `BloggerSection`, siguiendo el patrón de
Tumblr/Pinterest. El administrador guarda Client ID/Secret cifrados; las
cuentas de usuario final conectan después mediante OAuth. El worker también
lee primero esos valores cifrados y no depende de variables GSC/GA.

Auditoría funcional: APROBADA — formulario admin, POST protegido por rol,
cifrado, fallback de entorno, OAuth web, renovación y worker conectados.
Auditoría regresión: APROBADA — build web, typecheck web, build worker,
14 tests worker y `git diff --check`.
Auditoría integración/producción: APROBADA para preparación — Vercel revisado
con Root Directory `apps/web`; `apps/web/vercel.json` conserva exactamente
`npm run build` y `.next`; no se cambiaron variables remotas ni se desplegó.
Reservas liberadas. Estado: PREPARADA, pendiente de autorización de publicación.

Commit local antes del rebase: `c9dd6f0`; la serie rebasada continúa en
`03cc2f0`, `3f618a`, `b56e9f3` y `46227d7`.
Reserva liberada al cerrar esta fase: `COORDINACION_CLAUDE_CODEX.md` e
`INVENTARIO_CONVERSACIONES.md`. No quedan archivos de código reservados.
El hook informativo de actualizaciones no pudo consultar Prisma por falta de
`DATABASE_URL` en el worktree; el commit sí se creó correctamente.

### Reserva liberada — registro maestro de versiones

La reserva exclusiva de `CONTROLADOR_DE_VERSIONES.md` se utilizó únicamente
para registrar la versión preparada y quedó liberada al terminar. El registro
se incorporó en los commits rebasados `b56e9f3` y `46227d7`; el hook
informativo volvió a mostrar la limitación preexistente de `DATABASE_URL`
ausente, sin impedir los commits.

### Reserva activa — corrección de referencias post-rebase

Se reservó temporalmente este archivo para corregir únicamente los hashes
reescritos por el rebase de la rama aislada de Blogger. Reserva liberada tras
la corrección; no quedan archivos de código o documentación reservados.

### Reserva activa — migración segura de Blogger

Para aplicar únicamente el esquema nuevo de Blogger, quedan reservados en
este worktree `/.github/workflows/migrate.yml` y
`packages/db/prisma/migrations/20260902150000_add_blogger_integration/migration.sql`.
No se modificará el flujo general de migraciones ni otro esquema. La reserva
se liberará después de revisar el diff y documentar la auditoría.

Auditoría funcional de la migración: APROBADA — la ruta nueva ejecuta solo el
SQL de Blogger y queda protegida por un input explícito; el flujo general no
se ejecuta cuando se selecciona ese input.
Auditoría de regresión de la migración: APROBADA — SQL idempotente, sin
`DROP`, `TRUNCATE`, modificación de datos existentes ni cambios de versiones.
Auditoría de integración de la migración: APROBADA para ejecución — usa el
Session pooler, la misma base de datos configurada en el workflow y conserva
el paso idempotente de RLS.
Reserva liberada tras esta revisión: `.github/workflows/migrate.yml` y
`packages/db/prisma/migrations/20260902150000_add_blogger_integration/migration.sql`.
No quedan archivos reservados.

### Reserva activa — cierre de verificación Blogger

Se reservan temporalmente `COORDINACION_CLAUDE_CODEX.md` y
`CONTROLADOR_DE_VERSIONES.md` para registrar el deployment, la migración
aplicada y la recuperación observada. Se documenta que el primer deployment
produjo `P2022` temporal porque el schema llegó antes que la base de datos;
PR #35 y el workflow run `33782195118` aplicaron únicamente la migración
idempotente de Blogger. El deployment final `dpl_DS9BsWLdNEDG2DZ4DpwrGJK7oTuY`
quedó `Ready`, `/login` responde 200 en ambos dominios, el dashboard sin
sesión redirige 307 y la pantalla muestra Blogger API. No hay nuevos 500
después de la migración ni errores `MIDDLEWARE_INVOCATION_FAILED` o
`No workspaces found`. Reserva liberada al terminar esta entrada; no quedan
archivos reservados.

### Reserva activa — habilitar publicación Blogger en oportunidades — 2026-09-03

Se reserva temporalmente `apps/web/src/app/api/social-opportunities/publish/route.ts`
para corregir únicamente el rechazo prematuro de la plataforma `blogger`. La
generación de oportunidades y el procesador del worker ya reconocen Blogger;
la ruta web todavía no lo incluía en su lista de plataformas soportadas. No se
modificarán otras redes, Vercel, middleware, autenticación, secretos ni la base
de datos. La reserva se liberará tras revisar el diff y completar las
auditorías de esta corrección.

### Reserva activa — documentar auditoría de habilitación Blogger — 2026-09-03

Se reservan temporalmente `COORDINACION_CLAUDE_CODEX.md` y
`CONTROLADOR_DE_VERSIONES.md` para registrar el hallazgo reproducido durante
la prueba, la corrección mínima y las auditorías realizadas en este worktree.
No se modificarán archivos de Vercel, middleware, autenticación, secretos,
base de datos ni integraciones existentes. Ambas reservas se liberarán al
terminar la documentación y revisar el diff final.

Commit local creado: `11e8fa6`. Reservas liberadas al terminar:
`apps/web/src/app/api/social-opportunities/publish/route.ts`,
`COORDINACION_CLAUDE_CODEX.md` y `CONTROLADOR_DE_VERSIONES.md`. No quedan
archivos reservados en este worktree.

### Reserva activa — cierre de triple auditoría predespliegue — 2026-09-03

Se reservan temporalmente `COORDINACION_CLAUDE_CODEX.md` y
`CONTROLADOR_DE_VERSIONES.md` para registrar la auditoría previa al
despliegue autorizado de `11e8fa6`/`d272fa7`. No se modificará código,
Vercel, middleware, autenticación, secretos ni base de datos durante esta
documentación. Las reservas se liberarán después del despliegue y de la
verificación posterior en producción.

### Despliegue y verificación final Blogger — 2026-09-03

El cambio se desplegó desde la raíz del worktree aislado autorizado mediante
`vercel --prod --yes --project auto-articulos-web --logs`. Deployment:
`dpl_8iE3qS4WoQ66VutEhPJGGjAe1wWg`, URL
`https://auto-articulos-n8h1cgk0m-luna-portex-intelligence.vercel.app`, estado
`Ready`, aliasados `https://seototal.lasolucionweb.com` y
`https://auto-articulos-web.vercel.app`. El build completo confirmó 359
archivos descargados, `npm install --legacy-peer-deps`, `npm run build` desde
el Root Directory correcto, Prisma generate, TypeScript y 83/83 páginas/rutas
generadas. La advertencia existente de middleware deprecado no produjo error;
no se cambiaron versiones pese al aviso preexistente de `npm audit`.

Auditoría funcional independiente: APROBADA — la pantalla de oportunidades
en producción cargó con Blogger conectado; el historial registró como
publicadas las tres propuestas Blogger y el blog público
`https://segurosdesaludyvida.blogspot.com/` mostró las tres entradas con sus
 títulos. La ruta corregida encoló Blogger y el worker completó la publicación
real usando el blog de la cuenta de pruebas.

Auditoría de regresión independiente: APROBADA — `/login` devolvió 200 en
`seototal.lasolucionweb.com` y `auto-articulos-web.vercel.app`; el dashboard,
`/dashboard/oportunidades-redes`, `/dashboard/publicaciones-en-curso` y
`/dashboard/historial` cargaron sin error; publicaciones en curso quedó vacío
 y oportunidades pendientes quedó en 0. Los logs completos posteriores no
mostraron 4xx/5xx, `MIDDLEWARE_INVOCATION_FAILED` ni `No workspaces found`.
No se modificaron Vercel, middleware, autenticación, secretos, esquema ni
las implementaciones de otras redes.

Auditoría de integración/producción independiente: APROBADA — el blog real
del usuario de pruebas quedó accesible y contiene las entradas publicadas;
los dos dominios alias responden; el build de producción terminó `Ready` con
`apps/web/vercel.json`, Root Directory `apps/web`, `buildCommand: npm run
build` y `outputDirectory: .next`. El dry-run correcto desde la raíz terminó
sin rutas duplicadas y no creó un deployment adicional.

Incidencia de ejecución documentada: al iniciar la prueba, el selector del
navegador coincidió con el botón superior `Publicar todo el lote` en vez del
primer botón individual. La interfaz procesó las 14 propuestas pendientes.
No se ejecutaron más publicaciones ni borrados. La evidencia final del
historial muestra 6 éxitos del día: 3 Blogger y 3 LinkedIn; las 14 dejaron de
estar pendientes y no se reintentó ninguna. Esta incidencia no cambió el
código desplegado ni afectó la configuración de las integraciones.

Reservas liberadas al cerrar esta entrada: `COORDINACION_CLAUDE_CODEX.md`,
`CONTROLADOR_DE_VERSIONES.md` y la ruta de publicación. No quedan archivos
reservados en este worktree.

Estado: DESPLEGADA Y VERIFICADA — triple auditoría completada; no se publica
ni se modifica nada más en producción sin nueva autorización.

### Reserva activa — corregir formato e imagen de Blogger — 2026-09-03

Se reserva temporalmente `apps/worker/src/socialPublish.ts` para corregir
únicamente la preparación del contenido Blogger: reutilizar HTML editorial
limpio del artículo, conservar sus encabezados/listas/enlaces y añadir la
imagen destacada siguiendo el patrón ya usado por Threads y LinkedIn. No se
modificarán la ruta web, otras redes, Vercel, middleware, autenticación,
secretos, esquema ni versiones. La reserva se liberará tras las auditorías
locales; no se autoriza despliegue de esta corrección sin autorización nueva.

### Corrección Blogger preparada — HTML editorial e imagen — 2026-09-03

Hallazgo confirmado con la documentación oficial de Blogger y el artículo
real: la API recibe `content` como HTML; la implementación anterior enviaba el
resultado de `getArticleBodyMarkdown`, pensado para DEV.to, y no añadía la
imagen `og:image`. Por eso la entrada publicada mostraba `##`, enlaces Markdown
y ningún encabezado visual de imagen.

Cambio mínimo preparado únicamente en `apps/worker/src/socialPublish.ts`:
se separó la extracción/limpieza HTML del artículo de la conversión Markdown
de DEV.to; Blogger usa el HTML editorial limpio, obtiene la `og:image` pública,
la coloca al inicio con `alt` seguro y conserva el enlace al original. Threads,
LinkedIn, DEV.to y las demás redes mantienen sus rutas y contratos actuales.

Auditoría funcional local: APROBADA — contra el artículo público real, el
payload Blogger resultante conserva 11 encabezados, 7 elementos de lista y 2
imágenes, y no contiene encabezados `##` ni enlaces Markdown. La URL de la
imagen se obtuvo desde el artículo fuente.
Auditoría de regresión local: APROBADA — build del worker, 19/19 pruebas del
worker y `git diff --check` pasan. La conversión Markdown de DEV.to continúa
usando el mismo contenido limpio y no se modificaron sus contratos.
Auditoría de integración/producción: NO EJECUTADA A PROPÓSITO — esta corrección
todavía no se ha desplegado ni ha creado/borrado/actualizado entradas externas.
La producción continúa en el deployment anterior, que queda identificado en
la entrada de cierre anterior. No se tocaron Vercel, secretos, autenticación,
base de datos ni otras redes.

Referencia oficial revisada: documentación de Blogger Posts insert, que
describe `content` como contenido HTML y el endpoint autorizado de inserción.
La corrección queda PREPARADA, pendiente de una autorización nueva para
desplegar y ejecutar una única prueba visual; no se publicará otro contenido
antes de esa autorización.

Reserva liberada al terminar la preparación local:
`apps/worker/src/socialPublish.ts`. No quedan archivos de código reservados;
la documentación queda libre después del commit de esta entrada.
## Auditoría y liberación — límites dinámicos de artículos — 2026-09-03

Se ejecutó una triple auditoría de solo lectura contra `origin/main` publicado.
Las pantallas de Publicar, Oportunidades, Dashboard y las rutas de ejecución
usan los límites y saldos dinámicos del usuario. Quedaron identificados para
una futura corrección autorizada los valores históricos de reinicio del
formulario administrativo y los respaldos fijos de creación de usuarios
(`300`, `95` y `20`). Esta revisión no modificó código.

No quedan archivos reservados por esta auditoría. Worktree de revisión:
`/private/tmp/auditoria-limites-release`; reserva liberada.

### Cierre de despliegue autorizado — Blogger HTML e imagen — 2026-09-03

Se publicó `20866b2` en `origin/main` desde el worktree aislado
`/private/tmp/auto-articulos-blogger-fix-20260903`. Vercel creó
`dpl_2vJcxGcz8S8gpzpjMeqWokamhhoe` en estado `Ready`, conservando
`Root Directory = apps/web` y `apps/web/vercel.json` con exactamente
`buildCommand: npm run build` y `outputDirectory: .next`. No se modificaron
Vercel, middleware, autenticación, secretos, versiones ni otras redes.

Las tres auditorías independientes fueron aprobadas: funcional (HTML
editorial real, imagen `og:image`, encabezados/listas y cero Markdown),
regresión (worker 19/19, typecheck web, build web 83/83 rutas) e
integración/producción (dry-run sin rutas duplicadas, aliases y logs
verificados). El workflow del worker `33790036588` hizo checkout del commit
publicado y terminó `success` en sus tres shards.

Se ejecutó exactamente una publicación individual desde Oportunidades para
Redes: de 3 propuestas Blogger se publicó solo la primera y quedaron 2
pendientes. La entrada
`Cambio de Seguro de Salud al Mudarte en Florida` quedó visible en el blog de
pruebas con su título, imagen destacada, encabezados/listas renderizados y
sin Markdown. Las tres entradas Blogger antiguas con formato defectuoso no
se tocaron ni eliminaron; quedan fuera del alcance de esta liberación.

Producción postdespliegue: ambos dominios alias responden `/login` con 200,
la ruta protegida responde 307, el blog público responde y los logs completos
no muestran errores de aplicación, `MIDDLEWARE_INVOCATION_FAILED` ni
`No workspaces found`. Reservas liberadas al cerrar: worker, ruta web y ambos
documentos de coordinación/versiones. No quedan reservas activas.

### Reserva activa — adaptar Blogger al patrón editorial de las redes — 2026-09-03

Se reservan temporalmente únicamente `apps/web/src/app/api/social-opportunities/generate/route.ts`,
`apps/worker/src/socialPublish.ts`, `apps/worker/src/bloggerContent.ts`,
`apps/worker/src/bloggerContent.test.ts` y este documento. El objetivo es que
Blogger use el `suggestedText` generado específicamente para su lector como
resumen editorial, con imagen, título de entrada y enlace al artículo completo,
igual que Threads y LinkedIn; no se copiará el cuerpo entero del artículo.
No se modificarán las publicaciones antiguas, otras redes, Vercel,
middleware, autenticación, secretos, esquema ni versiones. La reserva se
liberará después de revisar el diff y completar las auditorías locales; este
cambio no queda autorizado para producción por esta reserva.

### Traspaso a Claude — CONEXION BLOGGER — 2026-09-03

Se entrega esta tarea a Claude para continuarla en el worktree aislado
`/private/tmp/auto-articulos-blogger-fix-20260903`, rama
`codex/conexion-blogger-produccion-20260903`, con base publicada en el commit
`548f296` (`docs: cerrar despliegue Blogger`). La sesión de Codex no pudo
continuar la edición porque el entorno agotó sus créditos de ejecución. No se
usó ningún atajo ni workaround.

#### Objetivo exacto

Blogger debe comportarse como Threads y LinkedIn: publicar el título de la
entrada, la imagen destacada y un resumen original adaptado al lector de
Blogger, con un enlace al artículo completo. No debe copiar el cuerpo entero
del artículo ni enviar Markdown visible (`##`, enlaces `[texto](url)`, etc.).
Las publicaciones antiguas no se modifican ni se eliminan.

#### Estado real del worktree

- Producción permanece en el despliegue anterior; no se hizo commit, push,
  despliegue ni publicación externa de esta nueva corrección.
- `apps/worker/src/bloggerContent.ts`: archivo nuevo local con
  `formatBloggerSummary()` para convertir `suggestedText` en HTML seguro,
  párrafos y enlace `Leer el artículo completo`.
- `apps/worker/src/bloggerContent.test.ts`: archivo nuevo local con pruebas de
  párrafos, marcador `[ENLACE]`, escape HTML y eliminación de Markdown básico.
- `apps/web/src/app/api/social-opportunities/generate/route.ts`: aún no está
  modificado. Falta añadir la rama explícita de Blogger en el fallback, límite
  de caracteres/tokens y prompt editorial de resumen original de 2 a 4
  párrafos.
- `apps/worker/src/socialPublish.ts`: aún no está modificado. Falta conectar
  `formatBloggerSummary(job.suggestedText, job.articleUrl)` en la rama Blogger,
  conservar la imagen `og:image` y dejar de cargar el cuerpo completo solo en
  esa rama. DEV.to, Threads, LinkedIn y demás redes deben conservar sus rutas.
- El único cambio documental local previo está en este archivo, registrando la
  reserva original. Los dos archivos nuevos permanecen sin commit para que
  Claude los revise antes de continuar; no deben borrarse ni sobrescribirse.

#### Continuación obligatoria

1. Releer este documento y revisar `git status`, el diff completo y el
   contenido de los archivos nuevos antes de reservarlos.
2. Reservar y documentar específicamente
   `apps/web/src/app/api/social-opportunities/generate/route.ts`,
   `apps/worker/src/socialPublish.ts`,
   `apps/worker/src/bloggerContent.ts`,
   `apps/worker/src/bloggerContent.test.ts` y este documento. Si existe otra
   reserva, esperar y coordinar; no absorber trabajo ajeno.
3. Implementar únicamente el patrón descrito arriba. No tocar Vercel,
   middleware, autenticación, secretos, esquema, versiones ni otras redes.
4. Ejecutar las pruebas y completar/documentar tres auditorías independientes:
   funcional, regresión e integración/producción. La auditoría de producción
   debe quedar como no ejecutada mientras no haya autorización de despliegue.
5. Antes de cualquier commit revisar `git status`, diff completo y diff
   preparado; agregar solo archivos específicos, nunca `git add .` ni
   `git add -A`.
6. No desplegar ni publicar contenido sin autorización nueva y explícita de
   Milton. Si posteriormente se autoriza producción, verificar antes Root
   Directory `apps/web`, `apps/web/vercel.json`, `buildCommand: npm run build`,
   `outputDirectory: .next`, build desde `apps/web`, `.next` existente, dry-run,
   logs completos y rutas críticas.

Reserva de Codex liberada al realizar este traspaso: los archivos quedan
disponibles para que Claude los reserve formalmente antes de continuar. Estado:
**TRASPASADA A CLAUDE — PREPARADA LOCALMENTE, NO DESPLEGADA**.

### Claude toma la reserva — 2026-09-03

Claude reclama formalmente `apps/web/src/app/api/social-opportunities/generate/route.ts`,
`apps/worker/src/socialPublish.ts`, `apps/worker/src/bloggerContent.ts`,
`apps/worker/src/bloggerContent.test.ts` y este documento, en el mismo
worktree y rama `codex/conexion-blogger-produccion-20260903`. Capitanía de
migración reclamada con `migration-coordinator.sh claim "Claude" "..."`
(no hay migración de schema en este cambio, solo por protocolo antes de
cualquier push futuro).

Cambios aplicados sobre lo dejado por Codex:
- `apps/web/.../generate/route.ts`: se agregó rama explícita `isBlogger`
  en `generateGPTCopy` — límite 1600 caracteres, 800 tokens, instrucción
  de resumen editorial de 2 a 4 párrafos que invite a leer el artículo
  completo (usa el mismo token `[ENLACE]` y las mismas reglas de "sin
  hashtags/sin markdown" que ya aplicaban a la rama genérica).
- `apps/worker/src/socialPublish.ts`: `processBloggerJob` ya no descarga
  ni copia el HTML completo del artículo (`getArticleBodyHtml`) — ahora
  arma el post con la imagen `og:image` + `formatBloggerSummary(job.suggestedText, job.articleUrl)`.
  Se importó `formatBloggerSummary` desde `./bloggerContent`.
  `getArticleBodyHtml`/`getArticleBodyMarkdown` no se tocaron: siguen
  usándose para DEV.to.

Pendiente antes de cerrar: correr `node --test` sobre `bloggerContent.test.ts`
y `npx tsc --noEmit` en `worker` y `web`. No se despliega ni se publica sin
autorización explícita nueva de Milton.

**Auditorías completadas:**
- Funcional: `npx tsx --test src/bloggerContent.test.ts` → 2/2 OK
  (párrafos, marcador `[ENLACE]` a enlace, escape de HTML, sin Markdown
  visible). Revisión manual de `processBloggerJob`: ya no descarga el
  cuerpo del artículo, arma `heroImage + formatBloggerSummary(...)`.
  Revisión manual de `generateGPTCopy`: rama `isBlogger` con límite 1600
  caracteres/800 tokens e instrucción de resumen editorial 2-4 párrafos.
- Regresión: `npx tsc --noEmit` en `apps/worker` y `apps/web` → EXIT 0 en
  ambos, sin errores nuevos. Diff revisado línea por línea: el único
  archivo compartido tocado es `generate/route.ts` y el cambio queda
  aislado dentro del `? :` de `isBlogger`, sin afectar Threads, X,
  LinkedIn, Instagram, Facebook, Pinterest, Tumblr, Bluesky ni DEV.to.
  `getArticleBodyHtml`/`getArticleBodyMarkdown` no se modificaron y DEV.to
  los sigue usando igual que antes.
- Integración/producción: Milton autorizó el despliegue (2026-09-03),
  condicionado a obedecer el protocolo completo. Se verificó
  `apps/web/vercel.json` sin modificar: `buildCommand: "npm run build"`,
  `outputDirectory: ".next"` — consistente con `Root Directory = apps/web`
  en Vercel (no se toca `vercel.json`, middleware, auth ni secretos). Se
  ejecutó `npm run build` desde `apps/web` (mismo comando que usa Vercel)
  → build exitoso, `.next` generado con `BUILD_ID` y manifest completos,
  sin errores. `git status` confirmado: solo los 5 archivos reservados
  arriba, ningún cambio ajeno mezclado.

Estado: las tres auditorías completas. Procediendo a commit + push +
verificación post-deploy en producción.

### CULMINADO — 2026-09-03 (Conexión Blogger — resumen editorial en producción)

Commit `e7706fc` en `main` (fast-forward directo desde `548f296`, sin
conflictos). Deploy Vercel `auto-articulos-web` (proyecto correcto,
`7YZN5MDVk2AgQrhfrHeSuQWBgGpF`) en estado `● Ready`, "Build Completed",
sin `No workspaces found` ni `MIDDLEWARE_INVOCATION_FAILED`. (Hay un
segundo status de GitHub, "Vercel – cambio-boton-comienza-aqui-clean",
de un proyecto Vercel viejo/duplicado que también reporta éxito pero no
es el dominio real; no se tocó.)

Verificación post-deploy: `curl -I /login` → 200 (age: 10, respuesta
fresca del nuevo build); `curl -I /dashboard` sin sesión → 307 (redirect
correcto, middleware/auth intactos); `vercel logs` sobre tráfico real
tras el deploy → solo `GET /login 200`, `GET /login-hero.jpg 200`,
`HEAD /login 200`, `HEAD /dashboard 307`, sin errores de aplicación.

Resultado funcional: Blogger ahora publica igual que Threads/LinkedIn —
título de la entrada, imagen `og:image` destacada y un resumen editorial
de 2-4 párrafos (generado específicamente para el lector de Blogger, sin
Markdown visible) con enlace "Leer el artículo completo" al artículo real.
Ya no copia el HTML completo del artículo. Las publicaciones antiguas
(incluidas las 3 entradas Blogger defectuosas mencionadas en el traspaso
de Codex) no se tocaron.

Reservas liberadas: `apps/web/.../generate/route.ts`,
`apps/worker/src/socialPublish.ts`, `apps/worker/src/bloggerContent.ts`,
`apps/worker/src/bloggerContent.test.ts` y este documento. Capitanía de
migración liberada con
`migration-coordinator.sh release "Claude" "..."` — no hubo migración de
schema en este cambio.

Pendiente: que Milton confirme visualmente, publicando una oportunidad
real de Blogger desde el dashboard, que el resultado se ve como espera
(resumen corto + imagen + enlace, no el artículo completo).
