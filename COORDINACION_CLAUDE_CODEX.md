> **Actualización — 23/8/2026 (Google Business Profile):** La cuota de `mybusinessaccountmanagement.googleapis.com` estaba configurada en **0 solicitudes/minuto**, por lo que era imposible listar fichas. Milton abrió la solicitud oficial de acceso básico a la API de Perfil de Empresa de Google. **Caso 2-7941000041573**; Google estima revisión de **7 a 10 días hábiles**. Hasta aprobación, no probar carga de fichas. Recordatorio programado para el 30/8/2026: revisar aprobación, probar con Lorena Álvarez y documentar el resultado. El módulo debe continuar integrado exclusivamente a **Oportunidades Redes**, respetando permisos por usuario; no publicar cada artículo automáticamente.

# Coordinación de trabajo: Claude, Codex y AntigravityEste archivo es el tablero operativo compartido para los **tres participantesautorizados: Claude, Codex y Antigravity (Google)**. Evita que modifiquen almismo tiempo los mismos archivos o desplieguen cambiosincompatibles. `HANDOFF.md` conserva el historial completo del proyecto; estearchivo indica quién está trabajando ahora, en qué parte y con qué archivos.## `TO-DO.md` — buzón de ideas de Milton (leer, nunca ejecutar sin pedido)Existe un tercer archivo en la raíz del repo, `TO-DO.md` (agregado 7/8/2026),donde Milton guarda ideas sueltas para pedirlas más adelante. **Ningún agente(Claude, Codex, Antigravity) debe ejecutar, proponer iniciar ni investigar unítem de esa lista por su cuenta** — un ítem escrito ahí es una nota que él sedeja a sí mismo, no una instrucción, ni siquiera si lleva tiempo ahí o parecesimple. Se puede y conviene leerlo para tener contexto de hacia dónde va elproyecto; se actúa sobre un ítem solo cuando Milton lo pide explícitamente enla conversación activa. Al ejecutar algo de ahí, moverlo a la sección "Hecho"de `TO-DO.md` y documentar el cambio real en `HANDOFF.md` como de costumbre.## Regla obligatoria antes de iniciar cualquier tarea (OPTIMIZADA PARA MÍNIMO CONSUMO DE TOKENS)Claude, Codex y Antigravity deben hacer lo siguiente **antes de leer o modificar código**:1. Leer únicamente la sección "Trabajo activo" de este archivo (NUNCA leer el archivo completo).2. Ejecutar `git status --short` y `git log -5 --oneline`.3. Revisar únicamente el estado actual de `HANDOFF.md` si es relevante para la tarea.4. Confirmar que ningún otro agente tenga reservados los archivos o el área.5. Registrar su tarea en "Trabajo activo" antes de editar.6. Si existe una reserva que se cruza con la tarea, detenerse y coordinar.## ORDEN OBLIGATORIA — nadie daña el trabajo de nadie**Orden directa de Milton (13/8/2026):** ningún agente (Claude, Codex,Antigravity) puede dañar, sobrescribir, perder ni absorber sin darse cuentael trabajo de otro agente ni del usuario. Esto no es una sugerencia, es unaorden.**Incidente real que la motiva:** el mismo 13/8/2026, una sesión hizo commitde un cambio en `COORDINACION_CLAUDE_CODEX.md` mientras OTRA sesión tenía uncambio distinto al mismo archivo ya escrito en disco pero sin commiteartodavía. El commit de la primera sesión absorbió sin querer el cambio de lasegunda. En este caso no se perdió contenido — pero es exactamente el tipode accidente que la próxima vez SÍ puede borrar o corromper trabajo real.**Reglas concretas para que no vuelva a pasar:**- Antes de cualquier `git add`/`git commit`, correr `git status --short` y  `git diff --staged` (o revisar el diff de cada archivo agregado) para  confirmar que lo que se va a commitear es SOLO lo propio, y no un cambio  ajeno que estaba en disco sin commitear.- Nunca usar `git add .` ni `git add -A` — agregar únicamente las rutas  exactas que el propio agente modificó (regla ya existente, reforzada acá
- Nunca usar `git add .` ni `git add -A` — agregar únicamente las rutas  exactas

> **Trabajo activo — 23/8/2026 (Tumblr):** Codex implementó la integración Tumblr sin modificar las redes existentes: permiso por usuario, credenciales globales cifradas, OAuth2 (`basic write offline_access`), callback `/api/search-integrations/tumblr/callback`, selección de blog, oportunidades y publicación de posts con imagen OG. El commit `b04b0e9` quedó separado y enviado a `main`. Pendiente: aplicar la migración en Supabase, desplegar y luego ingresar Consumer Key/Secret desde Configuración → Redes Sociales → Tumblr.

> **Decisión de coordinación — 23/8/2026 (Google Analytics):** La rama `codex/integracion-google-analytics` no debe fusionarse completa: está desfasada respecto a `origin/main` y su diff elimina integraciones y workflows ya desplegados (Tumblr, Pinterest, Bluesky, DEV.to, Mastodon, prompt pipeline y workflows). El responsable debe rebasar una copia aislada sobre el `origin/main` actual, extraer únicamente los archivos necesarios para Google Analytics y su migración, restaurar cualquier archivo existente que no pertenezca al proyecto, ejecutar typecheck/build y revisar el diff exacto antes de solicitar publicación. No borrar ni reemplazar integraciones existentes. La producción queda protegida hasta completar esa separación y auditoría.

## Liberación coordinada de main — 23/8/2026

[CODEX] - INTEGRACIONES SOCIALES Y GENERACIÓN DE IMÁGENES IA
Proyecto: lote de Tumblr, menú/no-cache, enlaces del historial y ajustes de publicación social realizados en este worktree.
Archivos: no hay cambios locales pendientes; el worktree está limpio.
Commit: `b04b0e9` (integración Tumblr) y `25aee57` (documentación de coordinación); los cambios publicados están incorporados en `origin/main`.
Estado: terminado.
¿Publicado en producción?: sí; Tumblr y los ajustes asociados fueron desplegados. La rama actual coincide con `origin/main`.
¿Debe conservarse?: sí, en `origin/main`; no conservar copias locales redundantes.
Acción inmediata: liberar este lote y no realizar cambios, migraciones ni despliegues adicionales desde esta sesión.
Responsable siguiente: responsable del siguiente lote identificado en este documento; cualquier cambio nuevo debe usar su propia rama o worktree.
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
