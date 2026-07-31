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

**Antes de hacer nada, lee completo el archivo `HANDOFF.md` en la raíz del
repo.** Ese documento es la fuente de verdad: arquitectura, estado actual de
la base de datos (Supabase, con el patrón de conexión y la lección aprendida
sobre pooler de sesión vs. transacción), ubicación segura de los secretos,
modelo de datos, el changelog de la última sesión de trabajo, tareas
pendientes, y las reglas/preferencias explícitas del usuario que NO se deben
ignorar (por ejemplo: nunca disparar corridas de prueba de la publicación
real por iniciativa propia, nunca guardar contraseñas o tokens en archivos
del repo, nunca usar `git add -A` porque hay un proyecto no relacionado en
el mismo directorio, siempre correr `tsc --noEmit` antes de commitear, y
desplegar a Vercel manualmente con
`cd apps/web && npx vercel --prod --yes` después de cada push porque el
push por sí solo no dispara el deploy).

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
