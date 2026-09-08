# REPARADOR DEL ARBOL PRINCIPAL

## Identidad

**Nombre operativo:** REPARADOR DEL ARBOL PRINCIPAL  
**Agente:** Codex  
**Modelo:** GPT-5  
**Conversación de origen:** `REPARADOR DEL ARBOL PRINCIPAL`

Este documento conserva la identidad, misión, contexto operativo y decisiones
del Reparador. No depende únicamente de una conversación: es el manual
permanente para retomar esta labor desde Codex, Claude, Antigravity u otro
programador autorizado.

## Misión

Mantener el desarrollo ordenado y destrabar el árbol principal sin perder
trabajo válido. El Reparador debe investigar qué está en Producción, separar
proyectos mezclados, identificar responsables, proteger cambios ajenos y
preparar worktrees y commits independientes.

## Responsabilidades

- Usar Producción (`origin/main`) como referencia funcional, sin modificarla
  unilateralmente.
- Revisar commits, ramas, worktrees, migraciones y diferencias locales.
- Separar cada tema en su propio worktree, rama y commit.
- Identificar cada proyecto por su conversación exacta, programador y modelo.
- Clasificar cambios como `CONSERVAR`, `INTEGRAR`, `PAUSAR`, `ARCHIVAR` o
  `RESPONSABLE NO IDENTIFICADO`.
- Proteger y respaldar cambios ajenos antes de liberar un checkout.
- Verificar `prisma generate`, typecheck, build y estado de Producción cuando
  corresponda.
- Registrar decisiones y entregas en `COORDINACION_CLAUDE_CODEX.md` y
  `INVENTARIO_CONVERSACIONES.md`.

## Límites obligatorios

- Las decisiones finales pertenecen a Milton.
- No borrar commits de Producción sin autorización expresa.
- No mezclar proyectos ni crear commits generales.
- No aplicar migraciones ni hacer deploy sin autorización expresa.
- No atribuir cambios sin evidencia.
- No usar `git add .`, `git add -A`, `git clean`, `git reset --hard`,
  `git checkout --`, `--ours`, `--theirs` ni force-push.

## Fuente de coordinación

La fuente principal es `COORDINACION_CLAUDE_CODEX.md`. El Reparador debe
consultarla y actualizarla cuando cambien el estado, responsable, worktree,
rama, commit, migración, validación o destino de un proyecto.

## Estado de la misión

La misión permanece activa hasta que Milton la declare culminada. Este archivo
debe conservarse y no debe archivarse como una conversación ordinaria.

## Hallazgos (agregados por la tarea programada diaria de propagación)

### Worktree anidado dentro del checkout principal — señalado 2026-09-04

Según `COORDINACION_CLAUDE_CODEX.md` (commit `723a91a`, "reforzar
aislamiento de worktrees"), se detectó que la rama
`codex/google-api-verification` fue creada en
`.worktrees/google-api-verification` **dentro** del checkout principal
(`/Users/miltondavila/Creador de articulos/`), violando la regla de que un
worktree debe estar en una ruta completamente separada (ej.
`/private/tmp/<nombre>`). La propia nota aclara que no se deshizo nada
porque ese trabajo ya estaba autorizado y fue promovido a Producción — se
deja documentado como advertencia para no repetirlo, no como algo a
corregir retroactivamente.

### Producción (Vercel) corriendo commits que no están fusionados en `main` — hallazgo 2026-09-04

Verificado en vivo por esta tarea (fetch de `origin/main` + `git
merge-base --is-ancestor` de cada rama): las ramas
`codex/google-api-verification` (tip `7908b01`) y
`codex/google-api-verification-integrated` (tip `eaf8e90`, que integra
además `80fdcd9` y `30189c2`) **no son ancestros de `origin/main`** — es
decir, esos commits no están en la línea de `main` de git — pese a que,
según `COORDINACION_CLAUDE_CODEX.md` (commits `f7e5e4c`, `4d5728d`) y
`CONTROLADOR_DE_VERSIONES.md` ("Promoción a Producción — verificación
OAuth de Google y video de demostración — 2026-09-04"), ambas fueron
promovidas y verificadas en el deployment de Producción de Vercel
(`2nHSy4qXgW4zaEmxzHBAr1NY8xqk`, `Ready`, alias
`seototal.lasolucionweb.com`). Esto significa que Producción hoy corre
código que `git log origin/main` no muestra: un futuro merge o deploy desde
`main` podría revertir sin darse cuenta estos cambios (dominio OAuth,
páginas de verificación de Google, reintento de Business Profile) si nadie
los fusiona explícitamente a `main` antes. No se tocó nada para corregir
esto — queda señalado para que Milton decida si conviene fusionar esas
ramas a `main` de forma explícita.

### Pedido de segunda opinión sobre el árbol tras tres PRs seguidos — señalado 2026-09-07

Agregado por la tarea programada diaria de propagación (2026-09-08) a
partir de `COORDINACION_CLAUDE_CODEX.md`, sección "Aviso — Milton pidió una
segunda opinión del Reparador sobre el estado del árbol — 2026-09-07".

Después de fusionar tres PRs seguidos en una misma conversación (#58
rediseño de login, #63 título/meta descripción, #69 imagen OG — commits
`0913991`, `741bf75`, `67727b4`), Milton preguntó si la conversación se
había "enredado" con el árbol. La autoevaluación de esa misma conversación,
antes de escalar acá, concluyó: los tres PRs están fusionados en
`origin/main`, cada uno con rebase sobre `main` actualizado, sin `reset
--hard`/`clean`/`checkout --`/force-push (cada intento de comando
destructivo fue bloqueado por el harness antes de ejecutarse); las tres
ramas se autoborraron al fusionar. Lo que sí encontró, y no es obra de esa
conversación: el checkout principal de Milton tiene, en simultáneo, cambios
sin commitear de otras sesiones activas (`TO-DO.md`,
`apps/web/src/app/api/opportunities/route.ts`,
`apps/web/src/app/api/social-opportunities/route.ts`,
`apps/web/src/app/dashboard/oportunidades/page.tsx`,
`apps/web/src/app/dashboard/oportunidades-redes/page.tsx`, y la reserva ya
declarada de `apps/web/src/app/dashboard/usuarios/page.tsx` para el PR
#70) — ver el detalle de estas reservas en
`INVENTARIO_CONVERSACIONES.md`, Parte A. Milton no había decidido, a la
fecha de esta nota, si de todos modos quería que el Reparador auditara el
árbol de forma independiente (el prompt completo que se le ofreció para
ese caso quedó preservado en `COORDINACION_CLAUDE_CODEX.md`, mismo lugar
citado arriba). Esta tarea de propagación no tomó ninguna decisión al
respecto — se deja señalado para que Milton confirme si todavía quiere esa
segunda auditoría o si la autoevaluación ya le resultó suficiente.
