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
