# Inventario de conversaciones

## `CONEXION BLOGGER`

### Corrección de aislamiento de credenciales — 2026-09-03

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

## `[CLAUDE] - DOCUMENTO DE COORDINACION - SEPT 3`

Identidad exacta de la conversación (dada literalmente por Milton):
`DOCUMENTO DE COORDINACION - SEPT 3`.

Proyecto: ordenar `COORDINACION_CLAUDE_CODEX.md` a pedido de Milton, sin
borrar ni reescribir historial y sin mover ninguna entrada de lugar.

Motivo: Milton reportó que el documento principal de coordinación "puede
estar bastante sucio" y pidió organizarlo, dejando explícito que no se debía
borrar nada, ni juzgar qué funciona o no, ni tomar decisiones por falta de
contexto.

Hallazgo previo relevante: el checkout local
(`/Users/miltondavila/Creador de articulos`) estaba 68 commits detrás de
`origin/main` y tenía cambios sin commitear en los 4 documentos maestros que
contradecían la versión real. Milton autorizó explícitamente trabajar sobre
la versión de `origin/main` (fuente de verdad), dejando los cambios locales
sin commitear intactos y sin tocar.

Alcance ejecutado (worktree aislado `/private/tmp/doc-coordinacion-sept3`,
rama `claude/doc-coordinacion-sept3`, creada desde `origin/main` en
`4b1e5c9`), únicamente sobre `COORDINACION_CLAUDE_CODEX.md`:
1. Se agregó un índice de navegación al inicio del archivo (enlaces a cada
   encabezado existente, en el mismo orden, mismo texto). 100% aditivo.
2. Se reparó una corrupción real de texto (línea 424 original): varios
   encabezados y párrafos habían quedado pegados en una sola línea gigante
   sin saltos de línea, con palabras fusionadas (ej. "participantesautorizados").
   Se reinsertaron únicamente los saltos de línea y espacios obviamente
   faltantes; verificado con comparación byte a byte sin espacios que ningún
   carácter de contenido cambió.
3. Se señaló (sin fusionar ni borrar) la entrada duplicada
   "Retiro de las 8 cajas de prompts — 24/8/2026" (dos encabezados idénticos
   consecutivos), dejando una nota en el índice para quien lo revise.
4. No se movió, reordenó ni resumió ninguna entrada existente. No se tocó
   `INVENTARIO_CONVERSACIONES.md` salvo agregar esta misma entrada, ni
   `TO-DO.md`, ni `CONTROLADOR_DE_VERSIONES.md`.

Archivos modificados: `COORDINACION_CLAUDE_CODEX.md`,
`INVENTARIO_CONVERSACIONES.md` (esta entrada).
Migraciones: ninguna. Capitanía de migración: no aplica (cambio documental).
Commit: pendiente de confirmación de Milton antes de push (ver reporte en la
conversación).
Estado: EN PROGRESO — pendiente de que Milton revise el resultado y defina el
protocolo prioritario que quiere establecer para futuras conversaciones que
lean este documento de coordinación.
Responsable: Claude.
Siguiente acción: Milton revisa el diff, autoriza el push/merge, y luego
entrega el patrón de protocolo a fijar.
