# CONTROLADOR DE VERSIONES

## Regla obligatoria

Antes de modificar código, cambiar de rama, crear un commit, ejecutar una migración o desplegar, se debe leer este documento y `COORDINACION_CLAUDE_CODEX.md` completos.

## Fuente de verdad

- La versión funcional completa restaurada parte del estado de `main` anterior al desliz de versión: commit `eec36697`.
- No se debe restaurar un snapshot parcial ni reemplazar `main` sin comparar primero el árbol completo.
- Los cambios locales sin commit pertenecen al usuario y no se deben sobrescribir ni publicar sin autorización.
- Toda publicación debe usar un commit identificable y verificarse en Vercel.

## Verificación obligatoria

1. Comparar la rama/commit propuesto contra producción.
2. Revisar archivos eliminados y migraciones.
3. Ejecutar typecheck/build disponibles.
4. Confirmar Vercel en estado `Ready`.
5. Confirmar el dominio público y los logs de runtime.
6. Registrar commit, despliegue, resultado y pendientes en la coordinación.

## Protección

No usar restauraciones destructivas ni desplegar una versión anterior solo para corregir un error. Si hay conflicto, conservar primero las funcionalidades existentes y resolver de forma incremental.

## Registro cronológico de versiones y deployments

Este archivo es también el historial maestro de versiones. Toda entrada debe
añadirse al final, sin borrar ni reescribir entradas anteriores. Una versión no
se considera publicada ni estable solo porque exista un commit: debe tener
deployment identificable y verificación posterior.

### Versión base registrada

```text
Fecha y hora: no registrada en la fuente disponible
Versión/commit: eec36697
Rama: main (referencia histórica)
Worktree: no registrado
Cambios incluidos: versión funcional completa restaurada antes del desliz de versión
Migraciones: no registrado
Auditorías: no registrado
Deployment: no registrado
Estado de Vercel: no registrado
Producción verificada: no registrada
Problemas conocidos: no registrados
Responsable: no registrado
Siguiente acción: verificar esta referencia contra producción antes de usarla
Estado: REFERENCIA HISTÓRICA — NO DECLARAR COMO PRODUCCIÓN ACTUAL SIN VERIFICACIÓN
```

### Plantilla obligatoria para cada nueva versión

```text
## Versión — [FECHA Y HORA]

Fecha y hora:
Versión/commit:
Rama:
Worktree:
Conversación/proyecto:
Cambios incluidos:
Archivos modificados:
Archivos eliminados:
Migraciones creadas:
Migraciones aplicadas:
Auditoría 1:
Auditoría 2:
Auditoría 3:
Diff revisado:
Deployment/Vercel:
Estado de Vercel:
Dominio verificado:
Logs verificados:
Producción verificada:
Problemas conocidos:
Responsable:
Siguiente acción:
Estado: PREPARADA / DESPLEGADA / VERIFICADA / REEMPLAZADA
```

### Reglas de actualización

- Actualizar antes de preparar un commit o deployment, dejando el estado como
  `PREPARADA`.
- Actualizar inmediatamente después del commit con su hash exacto.
- Actualizar inmediatamente después del deployment con su identificador.
- Actualizar después de verificar Vercel, dominio y logs.
- Marcar `VERIFICADA` solo cuando producción haya sido comprobada.
- Si falla una prueba o verificación, conservar el registro y marcar el
  estado real; nunca sustituirlo por `DESPLEGADA` o `VERIFICADA`.

## Versión preparada — 2026-08-28 — lotes atascados

Fecha y hora: 2026-08-28
Versión/commit: `cf6fb0c` + `7c70b3b` (head remoto del PR: `8393bec`)
Rama: `codex/auditoria-worker-lotes-20260828`
Worktree: `/private/tmp/auto-articulos-worker-lotes`
Conversación/proyecto: lotes grandes bloqueados y oportunidades no publicadas
Cambios incluidos: concurrencia manual aislada por `github.run_id`; devolución
de títulos no publicados a Oportunidades con nota de reintento.
Archivos modificados: `.github/workflows/worker.yml`,
`apps/worker/src/queue.ts`
Archivos eliminados: ninguno
Migraciones creadas: ninguna
Migraciones aplicadas: ninguna
Auditoría 1: aprobada — alcance limitado y `git diff --check`.
Auditoría 2: aprobada — compilación del worker.
Auditoría 3: aprobada — build completo de Next; warnings preexistentes.
Diff revisado: sí, dos archivos, sin cambios de schema/UI/redes.
Deployment/Vercel: pendiente; PR #7 abierto.
Estado de Vercel: no aplica todavía.
Dominio verificado: pendiente.
Logs verificados: diagnóstico previo confirmó ausencia de worker para el lote.
Producción verificada: pendiente de fusión y prueba.
Problemas conocidos: la fusión a `main` está protegida por control de seguridad.
Responsable: Codex - GPT-5.
Siguiente acción: fusionar PR #7 solo tras autorización explícita y verificar
un lote pequeño.
Estado: PREPARADA

### Actualización de auditoría — 2026-08-28

El PR #7 fue ampliado con el fraccionamiento seguro de lotes grandes y el
aviso visible del estado del worker. La verificación cruzada confirmó que los
9 archivos del PR remoto coinciden byte a byte con el worktree aislado. Las
tres auditorías finales pasaron: alcance, compilación del worker y build web
completo (78 rutas). El PR continúa `ABIERTO / NO FUSIONADO`; no existe
deployment nuevo ni verificación de producción.

### Cierre y verificación — 2026-08-28

La versión fue fusionada en `main` como `279ee468` y desplegada en Vercel como
`dpl_BnMGNtgcmELUVmVHE6XtKxFtQiW6`. Vercel quedó `READY` en producción, el
alias oficial respondió correctamente y `/login` devolvió HTTP 200. La
auditoría cruzada de los 9 archivos no encontró truncamientos ni diferencias.
Estado: DESPLEGADA / VERIFICADA.

## Versión — 2026-08-30 09:55 — línea de guardado de artículos restaurada y verificada

Fecha y hora: 2026-08-30, 09:55 (hora local)
Versión/commit: `ea2a0da` (cadena completa desde `144de95` hasta este commit)
Rama: `main`
Worktree: `/private/tmp/fix-credit-detector`
Conversación/proyecto: TRANSFERIDO DE CODEX - SISTEMA NO PUBLICA ARTÍCULOS
Cambios incluidos:
- `144de95`: detectar "Insufficient credits" también en inglés; no bloquear el lote por créditos.
- `6df3455`: popup con QR de WhatsApp cuando se agotan los créditos generales de imagen.
- `e6bceb6`: reparar diagnóstico de campos roto por `__name`/esbuild (tsx en runtime real).
- `cbd8b09`: **causa raíz real encontrada y corregida** — el commit `a00c636` (28/8, 22:02) había
  agregado `validator.resetForm()` dentro de `revalidateTitleAndForm()`, que internamente ejecuta
  el `reset()` nativo del `<form>` y borraba título/resumen/tipo justo antes de guardar. Reemplazado
  por `validator.hideErrors()`.
- `9d60269`: eliminada una doble invalidación redundante del chequeo de título duplicado.
- `e89ea97`: retirado el "desbloqueo forzado" del botón de guardar (parche de crisis escrito la
  misma noche del bug real, ya innecesario).
- `99ea137`: mensaje claro "No se publicó porque ya existe un artículo con este título", con
  enlaces reales a los artículos existentes en 10minutesWebsite.
- `1840734`: los duplicados permanentes ya no vuelven a Oportunidades (ciclo sin salida); sección
  propia "Artículos repetidos que no se publicarán" en Historial.
- `d83507d`: el chequeo de título duplicado se corre ANTES de generar la imagen, no al guardar
  (ahorra tiempo y créditos de imagen en artículos que de todos modos iban a chocar).
- `dbf99a6`: aviso visible "Validando si el artículo está repetido..." aunque no encuentre choque.
- `ea2a0da`: la sección de duplicados se agrupa por fecha ("Hoy"/"Ayer"/fecha) igual que el resto
  de Historial.
Archivos modificados: `apps/worker/src/queue.ts`, `apps/worker/src/automation/10minutesWebsite.ts`,
`apps/web/src/components/CreditsQrAlert.tsx`, `apps/web/src/app/dashboard/layout.tsx`,
`apps/web/src/app/dashboard/historial/page.tsx`, `apps/web/package.json`
Archivos eliminados: ninguno
Migraciones creadas: ninguna
Migraciones aplicadas: ninguna
Auditoría 1: aprobada en cada commit — alcance del diff revisado, `git diff --check` limpio.
Auditoría 2: aprobada en cada commit — typecheck/build del worker (`tsc`), verificado además con
`esbuild --keep-names` que ningún `page.evaluate` quedó con `__name` filtrado (bug real que rompió
un diagnóstico intermedio y se corrigió en `e6bceb6`).
Auditoría 3: aprobada en cada commit — build completo de Next (78 rutas) y los 10 tests del worker.
Diff revisado: sí, en cada commit individual antes de fusionar a `main`.
Deployment/Vercel: `auto-articulos-web` — success en cada commit que tocó `apps/web`.
Estado de Vercel: READY.
Dominio verificado: sí, `auto-articulos-web.vercel.app` respondiendo con `age: 0`.
Logs verificados: sí — prueba en vivo con Nélida, categoría completa de 4 artículos, 3/4 publicados
directamente (el 4to no se probó por decisión de continuar), incluido un artículo con título
duplicado real que se detectó ANTES de la imagen, se mutó, y se publicó con éxito en el primer
intento.
Producción verificada: SÍ — confirmado en vivo por Milton, lote completo funcionando de punta a
punta (worker reclama el trabajo, contenido, imagen, título duplicado detectado temprano, guardado,
verificación y publicación real con enlace).
Problemas conocidos: ninguno pendiente de esta línea de trabajo. El único caso no cubierto es un
título verdaderamente duplicado sin que 10minutesWebsite lo reconozca como tal (no se ha visto).
Responsable: Claude.
Siguiente acción: ninguna pendiente de este lote. Si el sistema vuelve a fallar en el futuro en
guardado/duplicados/créditos de imagen, **la metodología de esta sesión es la referencia**: no
apilar parches nuevos sobre síntomas — usar `git log -S` para encontrar el commit exacto que
introdujo el comportamiento roto, comparar contra la versión anterior que funcionaba, diagnosticar
con evidencia capturada en vivo (no suposiciones), y preferir retirar un parche de crisis mal
dirigido antes que agregar uno nuevo encima. Ver los commits `cbd8b09` y `e89ea97` como ejemplo
directo de esto.
Estado: DESPLEGADA / VERIFICADA
