# Prompt para continuar este proyecto desde Codex

Copia y pega este mensaje completo como primer mensaje a Codex (u otra IA)
cuando Claude Code no esté disponible para seguir trabajando en este
proyecto.

---

Estás retomando el desarrollo de **"Auto Artículos"**, un sistema
multi-tenant en producción que automatiza la publicación de artículos en
10minutesWebsite usando Playwright. El repo está en
`https://github.com/miltondavila-ux/auto-articulos` (rama `main`), y ya
está desplegado en Vercel (`https://auto-articulos-web.vercel.app`) con un
worker corriendo en GitHub Actions.

**Trabaja siempre con contexto mínimo.** Revisa únicamente la sección 'Trabajo activo' de `COORDINACION_CLAUDE_CODEX.md` y lee los archivos de código directamente relacionados con la tarea que te pida el usuario. NO leas documentos completos ni historiales largos para ahorrar consumo de tokens.

No asumas nada sobre el estado del código, la base de datos o las
credenciales que no esté confirmado en `HANDOFF.md` — si algo ahí parece
desactualizado o no coincide con lo que ves en el código/la base de datos
real, confía en lo que observás ahora y avisale al usuario de la
discrepancia en vez de asumir que el handoff sigue siendo exacto.

Al final de esta sesión de trabajo, actualizá `HANDOFF.md` con lo que
cambió, siguiendo el mismo formato y nivel de detalle que ya tiene (sección
de "Cambios importantes" con fecha, y actualizar "Pendiente / próximos
pasos" y cualquier dato que haya quedado obsoleto). Es una instrucción
permanente del usuario: mantener este documento vivo y preciso para que
cualquier IA pueda retomar el proyecto solo con leerlo.

Preguntale al usuario cuál es la tarea concreta que quiere que hagas ahora,
si no te la dio ya en el mismo mensaje donde te pasó este prompt.
