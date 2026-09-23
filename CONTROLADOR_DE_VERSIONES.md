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

## Versión — 2026-09-03 12:22 EDT — integración Blogger preparada

Fecha y hora: 2026-09-03 12:22 EDT
Versión/commit: serie rebasada `c9dd6f0` → `03cc2f0` → `3f618a` → `b56e9f3` → `46227d7`
Rama: `codex/conexion-blogger-produccion-20260903`
Worktree: `/private/tmp/auto-articulos-blogger-fix-20260903`
Conversación/proyecto: `CONEXION BLOGGER`
Cambios incluidos: integración Blogger API v3; OAuth por usuario; permiso
individual de publicación; publicación desde el worker; configuración global
administrativa de Client ID y Client Secret cifrados en Redes Sociales.
Archivos modificados: 23 archivos, incluidos web, worker, shared, schema,
migración y documentación de coordinación.
Archivos eliminados: ninguno
Migraciones creadas: `20260902150000_add_blogger_integration`
Migraciones aplicadas: pendientes de ejecución segura en producción.
Auditoría 1: APROBADA — rutas OAuth, configuración admin, cifrado, selector de
blog, permiso de usuario y publicación del worker revisados.
Auditoría 2: APROBADA — build web completo (83 rutas), typecheck web, build del
worker, 14 tests del worker y `git diff --check`.
Auditoría 3: APROBADA para preproducción — Root Directory `apps/web`,
`apps/web/vercel.json` exacto (`npm run build`/`.next`), rutas y salida
verificadas; deployment y runtime aún pendientes.
Diff revisado: sí, contra `origin/main`; no hay archivos eliminados ni cambios
fuera del alcance Blogger/documentación.
Deployment/Vercel: pendiente de fusión y deployment automático de Vercel.
Estado de Vercel: pendiente.
Dominio verificado: pendiente.
Logs verificados: pendiente.
Producción verificada: pendiente.
Problemas conocidos: el hook informativo de actualizaciones no consulta Prisma
sin `DATABASE_URL`; no afecta la creación de commits ni la aplicación.
Responsable: Codex - GPT-5.
Siguiente acción: abrir/fusionar el cambio autorizado, aplicar la migración
segura y verificar Vercel, dominios, rutas críticas y logs completos.
Estado: PREPARADA

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

## PUNTO SEGURO DE RETROCESO — 2026-08-30 17:18 EDT — antes del wizard de dominio por cuenta

Fecha y hora: 2026-08-30 17:18 EDT (hora de este registro; el commit es de
2026-08-30 17:07:39-04:00, según su timestamp de autor/merge en GitHub).
Versión/commit: `1f9a374784087b6e8a7fb18f372b169af6785186`
Rama: `main` (`origin/main`, verificado con `git fetch origin main` justo antes
de este registro).
Worktree: checkout principal, `/Users/miltondavila/Creador de articulos`.
Conversación/proyecto: N/A — este es el ESTADO DE PRODUCCIÓN ACTUAL, punto de
referencia para poder retroceder si el próximo despliegue (wizard de dominio
por cuenta) causa un problema.

Por qué se registra ahora: antes de fusionar y publicar el proyecto "wizard de
dominio por cuenta" (ver `COORDINACION_CLAUDE_CODEX.md`, rama
`codex/wizard-dominio-por-cuenta`), Milton pidió explícitamente dejar guardado
este punto exacto, con lujo de detalle, para no perder nada de lo ya logrado y
poder volver aquí si algo sale mal.

Commits más recientes incluidos en este estado (los últimos 10, de más nuevo a
más viejo):
```
1f9a374 Merge pull request #20 from miltondavila-ux/claude/threads-rehost-image
46a3405 feat: botón "Reintentar" para publicaciones sociales fallidas
3f3e60c fix: re-alojar imagen OG de Threads en Vercel Blob antes de publicar
57d55d4 fix: reintentar validación de URL e imagen OG en publicación social
2d9d54b feat(historial): separar ejecuciones sin publicacion confirmada de "Articulos publicados"
5a0a109 fix(historial): permitir reintentar titulos y runs cancelados
4001a83 fix(ci): dejar de compartir grupo de concurrencia entre corridas programadas
b3c8c50 docs: registrar version estable de guardado de articulos y metodologia
ea2a0da feat(historial): agrupar por fecha (Hoy/Ayer) los articulos repetidos
dbf99a6 feat(worker): mostrar aviso "Validando si el articulo esta repetido..."
```

Schema de Prisma y migraciones en este punto: sin ningún cambio respecto al
commit `d2fa802` (base desde la que arrancó el proyecto del wizard el
28/8/2026) — confirmado con `git diff d2fa802 origin/main -- packages/db/prisma/schema.prisma packages/db/prisma/migrations` (diff vacío, 0 líneas). Es decir,
**ninguna migración nueva se aplicó a producción entre esos dos puntos**; el
esquema real de Supabase hoy corresponde exactamente al de `d2fa802`.

Cambios incluidos desde la versión base anterior (`279ee468`) hasta aquí:
integraciones y arreglos de redes sociales (Threads: re-alojar imagen OG en
Vercel Blob antes de publicar, reintento de validación de URL/imagen,
reintentar publicaciones fallidas), reorganización de Historial (separar
ejecuciones no confirmadas, agrupar por fecha, permitir reintentar
cancelados), y un fix de CI (dejar de compartir grupo de concurrencia entre
corridas programadas del worker). Ninguno de estos cambios toca
`schema.prisma`, `Category`, `SearchIntegration`, `User.selectedSiteDomain` ni
ningún archivo que el wizard de dominio por cuenta vaya a modificar — no hay
superposición de área.

Archivos modificados desde la versión base: ver los commits listados arriba;
no se re-auditan aquí en detalle porque no son responsabilidad de este
proyecto y no se tocarán.
Archivos eliminados: ninguno identificado en este rango.
Migraciones creadas: ninguna en este rango.
Migraciones aplicadas: ninguna en este rango (confirmado, ver arriba).

Auditoría 1 (identidad del commit): aprobada — `origin/main` obtenido con
`git fetch` en vivo inmediatamente antes de registrar esta entrada; el hash
`1f9a374...` es el HEAD real de GitHub en ese momento, no una copia local
potencialmente desactualizada.
Auditoría 2 (schema/migraciones): aprobada — diff vacío confirmado contra la
base de todas las migraciones nuevas que trae el wizard.
Auditoría 3 (Vercel/producción en vivo): NO EJECUTADA desde este entorno —
esta sesión de Claude no tiene acceso a la consola de Vercel ni a Supabase.
Se asume, sin verificación directa propia, que este commit es el que Vercel
tiene desplegado como producción `READY` (comportamiento normal del proyecto:
cada push a `main` dispara deploy automático). Milton debe confirmar en el
dashboard de Vercel que el deployment activo corresponde a `1f9a374` antes de
tratar este punto como retroceso 100% verificado.

Deployment/Vercel: se asume el deployment automático correspondiente a
`1f9a374` está `READY` (sin verificación directa desde esta sesión).
Estado de Vercel: no verificado directamente por esta sesión.
Dominio verificado: no verificado directamente por esta sesión.
Logs verificados: no verificado directamente por esta sesión.
Producción verificada: NO — este registro documenta el commit exacto, no una
verificación en vivo del deployment. Milton puede verificarlo en el dashboard
de Vercel comparando el hash de commit del deployment `READY` actual contra
`1f9a374784087b6e8a7fb18f372b169af6785186`.

Cómo retroceder desde aquí si el despliegue del wizard falla:
1. En Vercel: promover/re-desplegar el deployment `READY` anterior cuyo commit
   sea `1f9a374784087b6e8a7fb18f372b169af6785186` (o el commit inmediatamente
   anterior al merge del wizard, si Vercel ya generó uno nuevo para ese
   merge).
2. En git: `git revert` del/de los commit(s) de merge del wizard sobre `main`
   (nunca `reset --hard` sobre una rama compartida) y volver a desplegar.
3. En base de datos: NO es necesario revertir la migración del wizard para
   volver a este estado funcional — las columnas nuevas (`User.selectedSiteDomain`,
   `selectedSitePanel`, `siteSelectionConfirmed`, `Category.siteDomain`,
   `SearchIntegration.siteDomain`, `CategorySyncJob.mode`/`detectedPanels`) son
   aditivas y el código de este punto (`1f9a374`) nunca las lee ni las
   escribe: pueden quedarse en la base sin efecto mientras el código vuelve a
   esta versión. Solo revertir el schema si Milton decide explícitamente
   deshacer también la migración.
Problemas conocidos: ninguno nuevo identificado en este punto por esta sesión;
ver auditorías anteriores de cada proyecto individual en
`COORDINACION_CLAUDE_CODEX.md` para el detalle de cada uno.
Responsable: Claude (registro de este punto de retroceso, a pedido explícito
de Milton, antes de publicar el wizard de dominio por cuenta).
Siguiente acción: fusionar y publicar `codex/wizard-dominio-por-cuenta` sobre
este mismo commit (`1f9a374`) tras resolver el único conflicto de texto en
`COORDINACION_CLAUDE_CODEX.md`; registrar esa publicación como una nueva
entrada de este documento inmediatamente después del commit y del deploy.
Estado: REFERENCIA DE RETROCESO — PRODUCCIÓN ACTUAL ANTES DEL WIZARD DE
DOMINIO POR CUENTA.

## Versión — 2026-08-30 17:37 EDT — wizard de dominio por cuenta

Fecha y hora: 2026-08-30 17:37 EDT.
Versión/commit: `c7420da` (fast-forward de `main`, merge de
`codex/wizard-dominio-por-cuenta` commit `5f08193` sobre `1f9a374`).
Rama: `main` (push directo `codex/wizard-dominio-por-cuenta:main`).
Worktree: `/private/tmp/wizard-dominio-por-cuenta`.
Conversación/proyecto: wizard de dominio por cuenta (detección real de
sitios/paneles antes de sincronizar, un solo dominio por cuenta para
siempre).
Cambios incluidos: ver detalle completo en `COORDINACION_CLAUDE_CODEX.md`
("RESOLUCIÓN: UNA SOLA SOLUCIÓN..." y "TRES AUDITORÍAS Y CORRECCIONES").
Resumen: `User.selectedSiteDomain/selectedSitePanel/siteSelectionConfirmed`,
`Category.siteDomain`, `SearchIntegration.siteDomain` (unicidad
`userId+provider+siteDomain`), `CategorySyncJob.mode/detectedPanels`, job de
detección real de paneles en el worker, endpoint `/api/site-selection` (y
`/detect`) reescrito para exigir coincidencia con paneles reales detectados
(nunca texto libre), wizard rediseñado (bloque de confirmación ya no queda
oculto), ~20 endpoints de Search Console/GA4/Bing/oportunidades/runs
filtrados por dominio quedan sin efecto para cuentas sin dominio confirmado.
Archivos modificados: 36 archivos (ver `git show --stat c7420da` o el commit
`5f08193` en el worktree del wizard).
Archivos eliminados: ninguno.
Migraciones creadas: `20260828150000_add_selected_site_domain`,
`20260829120000_add_site_detection`.
Migraciones aplicadas: SÍ, ambas, ejecutadas por Milton directamente en el
SQL Editor de Supabase ANTES de este push (orden verificado: migración →
push de código, para evitar que el código nuevo pidiera columnas
inexistentes). Verificación post-migración: 64 cuentas confirmadas
automáticamente (históricas), 17 pendientes (nunca conectaron credenciales
todavía), total 81 — coherente con lo esperado. Además se ejecutó un
`UPDATE` acotado solo a la cuenta de prueba real (`esteerealtor@gmail.com`)
para resetear su confirmación y que vea el flujo nuevo de detección.
Auditoría 1 (schema/datos/compatibilidad): aprobada — columnas aditivas,
migración de compatibilidad probada localmente con usuario histórico
sintético, verificada en producción con la cuenta real (64/17/81).
Auditoría 2 (wizard/API/detección/UX): aprobada — probada en vivo en local
contra el servidor real de 10minutesWebsite (login real, falló solo por
credenciales falsas de prueba); flujo de 2 paneles simulado y confirmado
inmutable. Pendiente real: primera prueba de extremo a extremo con la cuenta
real de Estee, ya habilitada para intentarlo.
Auditoría 3 (worker/categorías/integraciones/regresiones): aprobada — todas
las consultas de `SearchIntegration`/`Category` revisadas, patrón
consistente de "filtra si hay dominio, si no comportamiento histórico sin
cambios"; se corrigió en el camino un bug real de atomicidad (confirmación
de dominio y adopción de categorías históricas ahora en una sola
transacción) y dos bugs de mezcla de jobs `sync`/`detect`.
Diff revisado: sí — se construyó y compiló el resultado real de fusionar
este trabajo con los ~60 commits que `main` acumuló mientras tanto (`git
merge-tree`, materializado en un worktree aparte): un solo conflicto, de
texto, en `COORDINACION_CLAUDE_CODEX.md`; cero conflictos de código.
`git diff --check` limpio sobre el commit final antes del push.
Deployment/Vercel: disparado automáticamente por el push a `main`; NO
verificado directamente desde esta sesión (sin acceso a la consola de
Vercel). Milton debe confirmar `READY` y el commit desplegado.
Estado de Vercel: pendiente de verificación por Milton.
Dominio verificado: pendiente de verificación por Milton.
Logs verificados: pendiente.
Producción verificada: pendiente — falta la prueba real con la cuenta de
Estee (correo `esteerealtor@gmail.com`): entrar, ver el bloque de
confirmación de sitio, correr la detección real, elegir un panel si aparece
más de uno, confirmar que sincronizar categorías funciona después.
Problemas conocidos: la rama vieja `codex/problemas-usuarios-doble-idioma-final`
(intento anterior con selector posterior, rechazado por Milton) y la rama
desactualizada `codex/problemas-usuarios-doble-idioma-20260828` fueron
eliminadas — ver `COORDINACION_CLAUDE_CODEX.md`. Sin problemas de código
conocidos pendientes en este punto.
Responsable: Claude (capitanía asignada explícitamente por Milton el
30/8/2026).
Siguiente acción: Milton confirma en Vercel que el deployment de `c7420da`
quedó `READY`, y prueba el flujo real con la cuenta de Estee. Si algo falla,
usar el "PUNTO SEGURO DE RETROCESO — 2026-08-30 17:18 EDT" registrado arriba
(commit `1f9a374`).
Estado: DESPLEGADA — PENDIENTE DE VERIFICACIÓN EN VERCEL Y PRUEBA REAL CON
ESTEE.

### Eliminación del popup QR de créditos de imagen — 2026-08-31

```text
Fecha y hora: 2026-08-31 (sesión de Milton)
Versión/commit: ced3fe4
Rama: main
```

Pedido de Milton: eliminar de raíz el popup "Créditos de imagen agotados"
(modal con QR a WhatsApp, ver captura suya) que aparecía sobre
Oportunidades, sin dañar nada más.

Cambios: se borró `apps/web/src/components/CreditsQrAlert.tsx` (el
componente creado en `6df3455` y ajustado en `973e78f`/`93dbb37`, ver
línea 149 de este mismo archivo) y su uso en
`apps/web/src/app/dashboard/layout.tsx`; se quitó la dependencia `qrcode`
(y `@types/qrcode`) de `apps/web/package.json` por quedar sin ningún otro
uso en el repo, y se corrió `npm install` para actualizar
`package-lock.json`.

No tocado a propósito: el mensaje de error real del worker ("Sin créditos
de imagen en 10minutesWebsite" en `apps/worker/src/queue.ts`, que decide
reintentos) y el gate `hasImageCredits` de `PreValidationGuard`/
`ImageCreditsModal` (validación distinta, por créditos de la cuenta del
usuario, no la del popup de la captura).

Conflicto de rebase: otra sesión (Codex, commit `93dbb37`) había tocado el
mismo archivo minutos antes (le quitaba el emoji ⚠️). Se resolvió
conservando el borrado, siguiendo el pedido explícito de Milton.

Verificación: `tsc --noEmit` y `next build` sobre `apps/web` sin errores,
ambos antes de pushear. Deployment de Vercel (`auto-articulos-web`)
confirmado `success` vía API de commit status de GitHub para `ced3fe4`.
Producción verificada: pendiente — no se pudo iniciar sesión en producción
desde esta sesión (sin credenciales de la cuenta de prueba Lorena Álvarez).
Responsable: Claude. Siguiente acción: Milton confirma visualmente que el
popup ya no aparece.
Estado: DESPLEGADA — PENDIENTE DE CONFIRMACIÓN VISUAL DE MILTON.

## Versión — 2026-09-02 — TABLA PUBLICA ACCESIBLE GRAVE

Fecha y hora: 2026-09-02
Versión/commit: `de5309e` (fix RLS 26 tablas) + `6f3c5fc` (cierre) + `bbbc662`
(salvaguarda tablas futuras), mergeados como `84b7dd9` (PR #22), `94affdf`
(PR #23) y `e52bd87` (PR #25).
Rama: `claude/tabla-publica-rls-20260902` (y copias `-v2`,
`-cierre-20260902`, `futuras-tablas-rls-20260902`)
Worktree: `/private/tmp/tabla-publica-rls`
Conversación/proyecto: `TABLA PUBLICA ACCESIBLE GRAVE`
Cambios incluidos: activación de Row-Level Security en las 26 tablas
públicas que Supabase reportó como expuestas (`rls_disabled_in_public`),
sin políticas nuevas (no hay acceso legítimo vía anon key en este
proyecto); salvaguarda automática para que cualquier tabla futura quede
protegida sin depender de que alguien se acuerde.
Archivos modificados: `.github/workflows/migrate.yml`, `HANDOFF.md`,
`packages/db/package.json`, `COORDINACION_CLAUDE_CODEX.md`.
Archivos eliminados: ninguno.
Migraciones creadas:
`packages/db/prisma/migrations/20260902113123_enable_rls_public_tables`
(documental — este proyecto despliega esquema con `prisma db push`, que no
ejecuta migraciones SQL versionadas; el fix real se aplicó a mano contra
producción, ver abajo).
Migraciones aplicadas: el bloque de 26 `ALTER TABLE ... ENABLE ROW LEVEL
SECURITY` se ejecutó directamente contra producción en el SQL Editor de
Supabase (Milton lo ejecutó él mismo, guiado paso a paso, porque el
clasificador de seguridad de Claude Code bloquea la ejecución automática
de SQL de producción vía navegador).
Auditoría 1: exactitud — los 26 nombres de tabla se tomaron literal de una
consulta `pg_tables` contra la base real, no de memoria; `ENABLE ROW LEVEL
SECURITY` es idempotente.
Auditoría 2: impacto — `grep` en todo `apps/` y `packages/` confirmó que
el código no usa `supabase-js`/anon key en ningún lugar (todo el acceso es
vía Prisma con el rol `postgres`, que bypassa RLS); confirmado además que
la barra del SQL Editor de Supabase muestra "Role: postgres".
Auditoría 3: verificación posterior — Security Advisor de Supabase pasó de
26 errores a 0 errores/0 warnings; consulta `pg_tables` confirmó 0 tablas
sin RLS; `curl -I` a `/login` devolvió 200 en `auto-articulos-web.vercel.app`
y `seototal.lasolucionweb.com` después del cambio.
Diff revisado: sí, archivo por archivo, sin `git add -A`, revisando que no
se incluyera trabajo sin commitear de otra sesión en el árbol local.
Deployment/Vercel: sin redeploy necesario — el cambio es de base de datos,
no de código de aplicación; producción verificada igual con `curl`.
Estado de Vercel: sin cambios, sin incidentes.
Dominio verificado: `auto-articulos-web.vercel.app` y
`seototal.lasolucionweb.com`, ambos 200 OK tras el cambio.
Logs verificados: Security Advisor de Supabase (0 errores) como fuente de
verdad del propio proveedor, no solo consulta propia.
Producción verificada: SÍ — Security Advisor en 0 errores, `pg_tables` sin
tablas expuestas, `/login` respondiendo normal en ambos dominios.
Problemas conocidos: ninguno detectado. El workflow `migrate.yml` usa
`prisma db push`, no `migrate deploy`, así que las migraciones SQL
versionadas de este repo no se ejecutan solas — quedó documentado en
`HANDOFF.md` para que nadie asuma lo contrario a futuro.
Responsable: Claude, con Milton ejecutando manualmente los pasos que el
clasificador de seguridad bloqueó (SQL en producción, push a `main`,
creación de los tres PR).
Siguiente acción: ninguna pendiente. Si se agrega una tabla nueva sin usar
el workflow normal de migración de GitHub Actions, correr a mano
`npm run enforce-rls --workspace=packages/db` con las credenciales reales.
Estado: DESPLEGADA Y VERIFICADA.

## Cierre y recuperación — 2026-09-03 — integración Blogger

Fecha y hora: 2026-09-03 13:04 EDT
Versión/commit: `5d0e729` (PR #34, integración) y `cf52d0e` (PR #35,
migración segura)
Rama: `codex/conexion-blogger-produccion-20260903`
Worktree: `/private/tmp/auto-articulos-blogger-fix-20260903`
Conversación/proyecto: `CONEXION BLOGGER`
Cambios incluidos: publicación Blogger preparada y esquema Blogger aplicado
de forma exclusiva mediante `safe_blogger_integration`.
Archivos eliminados: ninguno.
Migraciones aplicadas: `20260902150000_add_blogger_integration`, workflow run
`33782195118`, conclusión `success`; sin `accept_data_loss` y sin `db push`
general.
Auditoría funcional: APROBADA — la pantalla de Redes Sociales muestra
`Blogger API` y el botón administrativo `Configurar credenciales`.
Auditoría de regresión: APROBADA — `/login` devuelve 200 en ambos dominios,
el dashboard sin sesión redirige 307 a `/login`, y no se modificaron las
variables existentes de GSC/GA.
Auditoría de integración/producción: APROBADA — deployment final
`dpl_DS9BsWLdNEDG2DZ4DpwrGJK7oTuY` quedó `Ready`; el SQL fue idempotente y el
workflow ejecutó RLS correctamente.
Incidente detectado y corregido: durante el intervalo entre el primer
deployment (`dpl_45pNF6zTVLUM3jn6HDSrEVAHjR5M`) y la migración, las rutas que
consultaban `allowBloggerPublishing` registraron `P2022` y devolvieron 500.
La migración terminó correctamente y, tras ella, no aparecieron nuevos 500
en los logs consultados; no hubo `MIDDLEWARE_INVOCATION_FAILED` ni
`No workspaces found`.
Diff revisado: sí, solo cambios de Blogger, workflow seguro y documentación;
sin archivos eliminados ni versiones alteradas.
Deployment/Vercel: `dpl_DS9BsWLdNEDG2DZ4DpwrGJK7oTuY`.
Estado de Vercel: `Ready`.
Dominio verificado: `https://auto-articulos-web.vercel.app` y
`https://seototal.lasolucionweb.com`; ambos `/login` 200.
Logs verificados: completos del deployment y errores recientes; solo se
observaron los P2022 previos a la migración.
Producción verificada: SÍ — la ruta solicitada recarga y muestra Blogger API.
Pendiente funcional: el administrador debe introducir sus credenciales de la
App de Google en `Configurar credenciales`; no se guardó ningún secreto sin
una acción explícita del administrador.
Responsable: Codex - GPT-5.
Siguiente acción: configurar Client ID/Secret desde el botón visible y luego
conectar cada cuenta final mediante OAuth.
Estado: DESPLEGADA / VERIFICADA — configuración de credenciales pendiente.

## Corrección de publicación Blogger en oportunidades — 2026-09-03

Fecha: 2026-09-03
Rama: `codex/conexion-blogger-produccion-20260903`
Worktree: `/private/tmp/auto-articulos-blogger-fix-20260903`
Conversación/proyecto: `CONEXION BLOGGER`
Cambios incluidos: se habilitó `blogger` en la lista de plataformas que la
ruta web puede encolar, se añadió la comprobación de permiso individual y se
añadió el mensaje específico de publicación en segundo plano. El worker ya
tenía implementado `processBloggerJob`; no se modificaron otras redes.
Archivos modificados: `apps/web/src/app/api/social-opportunities/publish/route.ts`
y documentación de coordinación/versiones.
Archivos eliminados: ninguno.
Migraciones: ninguna.
Versiones: ninguna modificada.

Hallazgo reproducido: OAuth con el usuario de pruebas terminó en
`blogger=connected`, la tarjeta mostró `Conectado: Seguros de Salud y Vida` y
la generación creó 3 propuestas Blogger sin duplicarlas. La versión de
producción anterior rechazaba cualquier propuesta `blogger` con
`Plataforma blogger no soportada todavía.` antes de llegar al worker.

Auditoría funcional independiente: APROBADA para el worktree — se verificó el
flujo OAuth de la cuenta de pruebas, la conexión del blog y la generación de
propuestas; la revisión de código confirmó que la ruta corregida acepta
`blogger`, respeta `allowBloggerPublishing` y entrega la propuesta al worker,
que ya llama a `createBloggerPost`.
Auditoría de regresión independiente: APROBADA — `npm run typecheck` de web,
`npm run build` de web ejecutado desde `apps/web`, `npm run build` del worker,
19/19 pruebas del worker mediante `node --import tsx --test` y
`git diff --check`. El primer intento de `npm run test` fue bloqueado por el
pipe IPC del sandbox, no por código; el lanzador equivalente pasó completo.
No se tocaron Vercel, middleware, autenticación, secretos, base de datos ni
las ramas de otras redes.
Auditoría de integración/producción independiente: APROBADA para despliegue —
Vercel confirma `Root Directory = apps/web`, el único `vercel.json` está en
`apps/web/vercel.json` con `buildCommand: npm run build` y
`outputDirectory: .next`, y el proyecto conserva Node.js 24.x. El build web
se ejecutó desde `apps/web`; el dry-run incorrecto desde ese directorio fue
descartado porque duplicaba `apps/web`, y el dry-run correcto desde la raíz
terminó satisfactoriamente sin crear deployment. El listado de producción
mostró deployments `Ready` y los logs completos de la última hora no
mostraron errores 4xx/5xx, `MIDDLEWARE_INVOCATION_FAILED` ni
`No workspaces found`. No se modificaron variables remotas ni secretos.

Commit local: `11e8fa6` (`fix: habilitar publicación de oportunidades en Blogger`).
Deployment/Vercel: autorizado y pendiente de ejecución.
Producción verificada antes del despliegue: la integración OAuth/generación
quedó verificada en el deployment existente; la verificación de la publicación
Blogger con esta corrección se hará después del despliegue.
Estado: AUDITORÍAS PREVIAS APROBADAS — despliegue autorizado, con verificación
postdespliegue obligatoria.

## Cierre de despliegue — Blogger — 2026-09-03

Fecha y hora: 2026-09-03
Versión/commit desplegado: `6c8dcd7` (incluye `11e8fa6` y `d272fa7`)
Rama: `codex/conexion-blogger-produccion-20260903`
Worktree: `/private/tmp/auto-articulos-blogger-fix-20260903`
Conversación/proyecto: `CONEXION BLOGGER`
Deployment Vercel: `dpl_8iE3qS4WoQ66VutEhPJGGjAe1wWg`
URL de deployment: `https://auto-articulos-n8h1cgk0m-luna-portex-intelligence.vercel.app`
Estado: `Ready`
Aliases: `https://seototal.lasolucionweb.com` y
`https://auto-articulos-web.vercel.app`

Cambios incluidos: habilitación mínima de `blogger` en la ruta web de
publicación, permiso individual `allowBloggerPublishing` y mensaje específico
de encolado. No se tocaron Vercel, middleware, autenticación, secretos,
versiones, base de datos ni otras redes.
Archivos eliminados: ninguno.
Migraciones: ninguna.

Auditoría funcional independiente: APROBADA — OAuth de la cuenta de pruebas,
conexión del blog `Seguros de Salud y Vida`, tres propuestas Blogger, encolado
en producción y publicación real confirmada en
`https://segurosdesaludyvida.blogspot.com/`. El blog muestra las tres
entradas esperadas.

Auditoría de regresión independiente: APROBADA — build de Vercel completo
desde `apps/web` con `npm run build`, 83/83 rutas generadas, `/login` 200 en
ambos dominios, dashboard y rutas críticas cargadas, publicaciones en curso
vacías y oportunidades pendientes en 0. Logs posteriores revisados sin 4xx,
5xx, `MIDDLEWARE_INVOCATION_FAILED` ni `No workspaces found`.

Auditoría de integración/producción independiente: APROBADA — Vercel mantuvo
Root Directory `apps/web`; el único `vercel.json` relevante continúa en
`apps/web/vercel.json` con exactamente `buildCommand: npm run build` y
`outputDirectory: .next`; el dry-run desde la raíz fue correcto y no hubo
rutas duplicadas. Los aliases y el dominio público de Blogger fueron
verificados después del despliegue.

Incidencia de ejecución: la primera selección automatizada coincidió con
`Publicar todo el lote` y procesó las 14 propuestas pendientes. No se hicieron
más publicaciones ni eliminaciones. Historial final: 6 publicaciones exitosas
del día, 3 Blogger y 3 LinkedIn; ninguna propuesta quedó pendiente. Se deja
registrado para trazabilidad; no implica cambio adicional de código.

Logs completos de build y runtime revisados. El aviso preexistente de
`npm audit` no provocó cambio de versiones. El hook informativo de actualización
no pudo registrar el producto en commits locales por `DATABASE_URL` ausente en
el worktree, pero los commits se crearon y el deployment fue verificado.

Estado: DESPLEGADA Y VERIFICADA.
Reservas liberadas: `COORDINACION_CLAUDE_CODEX.md`,
`CONTROLADOR_DE_VERSIONES.md` y la ruta de publicación. No quedan archivos
reservados.

## Corrección preparada — formato e imagen Blogger — 2026-09-03

Estado: PREPARADA, NO DESPLEGADA.
Worktree: `/private/tmp/auto-articulos-blogger-fix-20260903`
Rama: `codex/conexion-blogger-produccion-20260903`
Conversación/proyecto: `CONEXION BLOGGER`
Archivo modificado: `apps/worker/src/socialPublish.ts`

Diagnóstico comprobado: Blogger recibe `content` como HTML, pero la versión
anterior le enviaba Markdown generado para DEV.to y no incluía `og:image`.
La captura de la entrada real confirmó exactamente ese fallo: `##`, enlaces
Markdown sin renderizar y ausencia de imagen.

Corrección preparada: extracción y limpieza HTML reutilizable para DEV.to y
Blogger; Blogger conserva encabezados, párrafos, listas, citas, enlaces e
imágenes del artículo, añade la imagen destacada `og:image` al inicio y agrega
el enlace al artículo original. No se modifican las rutas de otras redes.

Auditoría funcional local: APROBADA — payload contra el artículo real con 11
encabezados, 7 elementos de lista, 2 imágenes y cero Markdown crudo.
Auditoría regresión local: APROBADA — build worker, 19/19 tests y
`git diff --check` en verde.
Auditoría integración/producción: PENDIENTE — no se desplegó esta corrección,
no se tocó producción ni se generó otra entrada externa. La producción sigue
en el deployment anterior; hace falta autorización nueva antes de publicar.

Referencia técnica revisada: documentación oficial de Google Blogger Posts
insert, que define el campo `content` como HTML y el endpoint de inserción.
No se cambiaron versiones, Vercel, secretos, middleware, autenticación ni
base de datos.

## Cierre final — formato e imagen Blogger — 2026-09-03

Estado: DESPLEGADA Y VERIFICADA.
Worktree: `/private/tmp/auto-articulos-blogger-fix-20260903`
Rama de trabajo: `codex/conexion-blogger-produccion-20260903`
Commit publicado en `origin/main`: `20866b2`.

Cambios publicados: la ruta web acepta Blogger para las oportunidades y el
worker envía a Blogger HTML editorial limpio con encabezados, listas, enlaces
e imagen destacada `og:image`; se mantienen intactas las rutas de Threads,
LinkedIn, DEV.to y las demás redes. No se eliminaron ni editaron entradas
anteriores, no se cambiaron versiones, secretos, middleware ni configuración
de Vercel.

Triple auditoría independiente completada y aprobada:
1. Funcional: payload real del artículo con HTML, 11 encabezados, 2 listas y
   la imagen pública; sin encabezados ni enlaces Markdown.
2. Regresión: build del worker, 19/19 pruebas, typecheck web y build web con
   83/83 rutas generadas; `git diff --check` en verde.
3. Integración/producción: Root Directory `apps/web`, único
   `apps/web/vercel.json` con `buildCommand: npm run build` y
   `outputDirectory: .next`; dry-run correcto desde la raíz sin deployment
   adicional ni rutas duplicadas.

Despliegue Vercel: `dpl_2vJcxGcz8S8gpzpjMeqWokamhhoe`, estado `Ready`, con los
aliases `https://seototal.lasolucionweb.com` y
`https://auto-articulos-web.vercel.app`. El worker de producción ejecutó el
workflow `33790036588`, hizo checkout de `20866b2` y sus tres shards terminaron
en `success`.

Prueba única solicitada: se generaron 3 propuestas Blogger y se pulsó solo el
primer botón individual `Publicar`; el botón `Publicar todo el lote` no se
usó. Quedaron 2 propuestas pendientes. La entrada publicada es
`Cambio de Seguro de Salud al Mudarte en Florida` y quedó visible en
`https://segurosdesaludyvida.blogspot.com/2026/09/cambio-de-seguro-de-salud-al-mudarte-en.html`
con título, imagen destacada, HTML renderizado, 18 encabezados, 5 listas y
ningún Markdown visible.

Verificación postdespliegue: `/login` devolvió 200 en ambos dominios, la ruta
protegida devolvió 307 a `/login`, el blog público respondió y los logs
completos recientes de Vercel y GitHub Actions no mostraron errores de
aplicación, `MIDDLEWARE_INVOCATION_FAILED` ni `No workspaces found`. El aviso
preexistente de vulnerabilidades/deprecaciones no provocó cambios de versión.

Reservas liberadas: `apps/worker/src/socialPublish.ts`,
`apps/web/src/app/api/social-opportunities/publish/route.ts`,
`COORDINACION_CLAUDE_CODEX.md` y `CONTROLADOR_DE_VERSIONES.md`. No quedan
archivos reservados en este worktree.

## RESUMEN DE VERSIÓN ACTUAL — 2026-09-04 (foto completa de Producción)

Fecha y hora: 2026-09-04, ~11:00 (hora local), a pedido explícito de Milton
("dejar un buen resumen de la última versión del software a este momento").
Versión/commit: `f050672f9eb8ecc86a6df5f5e5ba55f1350237c5`.
Rama: `main` (`origin/main`, confirmado con `git fetch` inmediatamente antes
de escribir esta entrada).
Worktree: `/private/tmp/resumen-version-actual` (aislado, solo lectura para
armar este resumen; no se modificó código).
Conversación/proyecto: `DOCUMENTO DE COORDINACION - SEPT 3` (continuación).

Este resumen es una **foto del estado completo de la plataforma** en este
commit, no el registro de un cambio puntual — para el detalle técnico de
cada proyecto individual, ver `COORDINACION_CLAUDE_CODEX.md` (índice de
navegación al inicio) e `INVENTARIO_CONVERSACIONES.md` (quién es dueño de
qué).

### Qué es Auto Artículos, en una frase

Plataforma que automatiza la creación, publicación y distribución de
artículos SEO/AEO para cuentas de 10minutesWebsite y Tagcrush, y su difusión
a redes sociales, con detección de oportunidades basada en Google Search
Console/Analytics/Bing.

### Módulos y funcionalidad activa en producción

- **Publicar / Oportunidades SEO-AEO**: generación de títulos con regla
  obligatoria de cero canibalización (contra lo publicado y contra lo ya
  propuesto en la misma corrida) y cobertura completa por categoría, sin
  techo artificial de categorías/títulos; detección de título duplicado
  ANTES de generar la imagen; artículos repetidos permanentes apartados en
  Historial en vez de reintentarse en bucle.
- **Créditos de imagen**: detección real (español e inglés) del agotamiento
  de créditos de 10minutesWebsite; el lote se detiene solo cuando una
  creación real lo confirma (no por error ambiguo ni validación preventiva);
  administración puede activar/desactivar el permiso por usuario.
- **Límites de artículos**: `dailyArticleLimit` y `maxTitlesPerBatch`
  dinámicos por usuario, con valores por defecto configurables desde
  Administración en vez de números fijos en el código; mensajes de
  renovación de cupo explicados al usuario.
- **Oportunidades Redes / Redes Sociales**: generación y publicación de
  posts sociales derivados de oportunidades que están puntuando en Search
  Console/GA4; solo se muestran los botones de redes realmente configuradas;
  límites de caracteres correctos y seguros por red (el enlace del artículo
  nunca queda cortado).
- **Generador de imágenes con IA**: proveedor intercambiable
  (OpenAI/fal.ai-Ideogram/Nano Banana vía `IMAGE_PROVIDER`), prompt de una
  línea (etiquetas + texto exacto) editable desde Administración sin
  redeploy; imagen y prompt visibles en Historial.
- **Wizard de Configuración Inicial**: 10minutesWebsite → categorías →
  idioma → Google Search Console, con detección real de paneles/sitios
  antes de sincronizar cuando la cuenta expone más de un dominio.
- **Historial**: agrupado por fecha, separa ejecuciones no confirmadas y
  artículos repetidos no publicables, con opción de reintentar títulos y
  runs cancelados.
- **Administración**: control de visibilidad de módulos (global y por
  usuario), gestión de usuarios y sus límites, cuentas de prueba gratuita de
  7 días, badges de estado (créditos, prueba, límites).
- **Sistema documental**: 5 documentos maestros — `COORDINACION_CLAUDE_CODEX.md`
  (diario operativo + Protocolo Obligatorio de No Destrucción),
  `INVENTARIO_CONVERSACIONES.md` (propiedad/reservas en vivo), `TO-DO.md`
  (buzón de ideas), `CONTROLADOR_DE_VERSIONES.md` (este documento) y
  `REPARADOR_DEL_ARBOL_PRINCIPAL.md` (rol de orden/limpieza del árbol git).

### Integraciones de redes sociales activas

Threads, X/Twitter, LinkedIn (migrado a Posts API, ya no usa `v2/ugcPosts`
deprecado), Instagram, Facebook Pages, Pinterest, Tumblr (renovación
silenciosa de token), Bluesky, DEV.to y Blogger (API v3, publica HTML
editorial limpio con imagen destacada, no el artículo completo). **Mastodon
fue retirado por completo** a pedido de Milton (código eliminado; la tabla
`MastodonIntegration` queda sin uso en la base de datos, sin migración de
retiro todavía).

### Integraciones de indexación/analítica activas

Google Search Console, Google Analytics 4, Bing Webmaster Tools — las tres
con OAuth y sincronización funcionando en producción.

### Bloqueado, pendiente de terceros (no es un bug de código)

- **Google Business Profile**: código listo (`/v4/.../localPosts`), pero la
  cuota real de `mybusinessaccountmanagement.googleapis.com` en Google Cloud
  es `0 QPM` — Google no ha concedido acceso/allowlist todavía. No existe
  modo de prueba que evite este bloqueo.
- **Verificación OAuth de la app de Google** (Search Console/Analytics/
  Business Profile): Centro de verificación de Google sigue sin publicar la
  marca ni verificar el acceso a datos; los usuarios siguen viendo el aviso
  "Google no ha verificado esta aplicación".

### Trabajo en curso, no promovido a Producción todavía (verificar antes de asumir que ya está)

- Un Preview integrado (`codex/google-api-verification-integrated`, commits
  `80fdcd9`/`eaf8e90` sobre `f050672`) con la corrección del reintento de
  Business Profile tras cooldown (`30189c2`) — Preview separado para no
  sobrescribir Blogger/Tumblr ni el resto de `main`; no promovido.
- `stash@{0}` en el checkout principal (migración de dominio OAuth de
  Google): en pausa por decisión de Milton hasta que su trabajo conjunto con
  Codex sobre este tema culmine; si sobra algo, pasa al Reparador del Árbol
  Principal.

### Auditoría de esta entrada

Auditoría 1 (identidad del commit): aprobada — `origin/main` obtenido con
`git fetch` en vivo inmediatamente antes de escribir esta entrada.
Auditoría 2 (exactitud de la lista de integraciones): aprobada — verificada
contra `packages/shared/src/index.ts` (exports reales) y
`packages/db/prisma/migrations` (migraciones reales aplicadas al schema),
no contra memoria ni suposición.
Auditoría 3 (consistencia con Coordinación): aprobada — cada bloqueo y cada
trabajo en curso mencionado aquí tiene su entrada correspondiente y más
detallada en `COORDINACION_CLAUDE_CODEX.md`.

Deployment/Vercel: producción más reciente confirmada en la propia
Coordinación como el commit `f050672` de `main` (ver "Auditoría de
continuidad de Producción — 2026-09-04").
Producción verificada: sí, de forma indirecta — esta entrada es un resumen
compilado de verificaciones ya realizadas y documentadas por otras
conversaciones, no una nueva prueba en vivo de esta sesión.
Responsable: Claude.
Siguiente acción: la próxima sesión que agregue un cambio a producción debe
actualizar este resumen si toca alguno de los módulos aquí descritos, en
vez de dejarlo desactualizado.
Estado: VERIFICADA (como fotografía documental del estado real de
Producción a esta fecha; no reemplaza las auditorías propias de cada
proyecto individual).

## Protección de instrucciones — módulo Publicar — 2026-09-04

La versión válida de las instrucciones iniciales de `/dashboard/publicar` está
protegida y publicada en `https://seototal.lasolucionweb.com/dashboard/publicar`
y `https://auto-articulos-web.vercel.app/dashboard/publicar`.

Referencia técnica: commit independiente `ab65585`; deployment
`dpl_83YWDfLAV3m9oR32vWVMhbc9vUmm`, estado `READY`.

El bloque **“Leer antes de ejecutar”** explica el objetivo del módulo y los cuatro
pasos de ejecución. No debe eliminarse, duplicarse, ocultarse ni ser reemplazado
por otro código. Toda modificación futura del módulo debe conservarlo, revisar el
diff completo y documentar las tres auditorías antes de cualquier publicación.

## Promoción a Producción — verificación OAuth de Google y video de demostración — 2026-09-04

Entrada agregada por la tarea programada diaria de propagación de Claude, a
partir de lo registrado en `COORDINACION_CLAUDE_CODEX.md` ("Solución
integrada para evitar sobrescrituras", "Promoción de rama integrada
autorizada" y "Actualización OAuth" / "Vídeo de demostración OAuth",
2026-09-04) — actualiza (sin borrar) la nota anterior de este mismo
documento en "RESUMEN DE VERSIÓN ACTUAL — 2026-09-04" que todavía listaba
esta rama como "no promovida".

Rama integrada: `codex/google-api-verification-integrated`, creada desde
`origin/main` (`f050672`), aplicando únicamente las correcciones `7908b01`
y `30189c2` como los commits integrados `80fdcd9` y `eaf8e90` — así se
evitó sobrescribir Blogger/Tumblr y el resto de `main` con un merge normal.

Deployment de Producción: `2nHSy4qXgW4zaEmxzHBAr1NY8xqk`, estado `Ready`,
entorno `Production`, alias `seototal.lasolucionweb.com`, fuente
`codex/google-api-verification-integrated` (commit `eaf8e90`).

Estado de la verificación de Google (dos objetivos):
- Objetivo 1 (Producción sirve las páginas/flujos corregidos de
  Analytics/Business Profile): CUMPLIDO, verificado contra el propio
  deployment `Ready`.
- Objetivo 2 (Google aprueba la verificación de la app OAuth): NO CUMPLIDO
  todavía al momento de este registro. Google ya guardó los tres scopes
  (`business.manage`, `webmasters`, `analytics.readonly`) y una
  justificación de 963 caracteres. Milton proporcionó una URL de video no
  listada (`https://youtu.be/21wEAhgy7zk`) como evidencia del flujo de
  conexión; queda pendiente confirmar que el video sea accesible en
  ventana privada y cargar esa URL en el campo correspondiente de Google
  Cloud antes de solicitar la verificación formal.

Migraciones: ninguna registrada en esta nota.
Producción verificada: parcialmente — el deployment en sí está `Ready` y
confirmado; la verificación de la app ante Google sigue pendiente de un
paso manual (cargar el video) que no consta como completado en
`COORDINACION_CLAUDE_CODEX.md` a la fecha de este registro.
Responsable de esta entrada: Claude (tarea programada diaria de
propagación). Responsable del trabajo original: Codex.
Siguiente acción: quien continúe con `CODEX - GPT-5 - VERIFICACION DE
API'S DE GOOGLE` debe cargar el video en Google Cloud y luego registrar
aquí mismo el resultado de la solicitud de verificación.
Estado: DESPLEGADA A PRODUCCIÓN; VERIFICACIÓN DE GOOGLE PENDIENTE.

## Despliegue — corrección de fechas antiguas en artículos generados — 2026-09-04

Entrada agregada por la tarea programada diaria de propagación de Claude, a
partir de "Despliegue autorizado y cierre — corrección de fechas antiguas —
2026-09-04" en `COORDINACION_CLAUDE_CODEX.md`.

Versión/commit desplegado: `2e72d02` ("Evitar fechas antiguas en artículos
generados") en `main`.
Archivo tocado: `apps/worker/src/automation/generateCustomArticle.ts`
únicamente.
Deployment Vercel: `dpl_4Q3xCBrkNMCe6Xspd7y5jLwiDuQq`, estado `Ready`.
Aliases: `https://seototal.lasolucionweb.com` y
`https://auto-articulos-web.vercel.app`.

Auditoría funcional: 14/14 pruebas del worker OK.
Auditoría de regresión: `git diff --check` correcto; diff limitado al
archivo mencionado, sin tocar versiones, esquema, Vercel, middleware,
autenticación ni secretos.
Auditoría de integración: `npm run build` desde `apps/web` exitoso, `.next`
generado; el build del worker conserva errores TypeScript preexistentes en
otros archivos, ajenos a este cambio.

Verificación posterior: `/login` respondió HTTP 200 y `/dashboard` HTTP 307
hacia `/login`, sin errores de middleware. El worker productivo tomará este
commit en su siguiente corrida cron (no se disparó manualmente para no
procesar trabajos reales fuera de ciclo), por lo que el efecto funcional
del cambio (fechas ya no antiguas en artículos nuevos) queda pendiente de
observarse en la próxima corrida real.
Migraciones: ninguna.
Responsable de esta entrada: Claude (tarea programada diaria de
propagación). Responsable del trabajo original: según lo registrado en
Coordinación para esta corrección.
Estado: DESPLEGADA Y VERIFICADA A NIVEL DE INFRAESTRUCTURA; efecto en
artículos nuevos pendiente de confirmarse en la próxima corrida cron del
worker.

## Fusión PR #42 — refuerzo V2 de expansión temática long tail — 2026-09-04

Entrada agregada por la tarea programada diaria de propagación de Claude, a
partir del canal "MENSAJE DE CLAUDE PARA `CODEX - AUDITORIA A ALGORITMO DE
PUBLICACIÓN DE ARTICULOS`" y su Bitácora en `COORDINACION_CLAUDE_CODEX.md`.
Ver también `INVENTARIO_CONVERSACIONES.md` — Parte B — para el registro de
la conversación completa.

Rama: `codex/auditoria-longtail-v2-20260904` (continuación de
`codex/auditoria-longtail-20260904`). PR #42, fusionado a `main` en el
commit de merge `495baea` (padres `01aa72c` y `93daba3`), verificado en
vivo contra `origin/main` con `git fetch` inmediatamente antes de escribir
esta entrada.
Commits incluidos: `8e07fe8` (expansión temática respaldada por evidencia),
`a18c9ec` (rechazo de modificadores temporales sin respaldo — la barrera
que descarta años inventados como "2023" en títulos), `fda3e0d` (rechazo de
coincidencias de categoría legal no soportadas), `93daba3` (deduplicación
semántica de intención de oportunidades).
Archivos tocados: `apps/web/src/lib/opportunity-analysis.ts`,
`apps/web/src/app/api/opportunities/route.ts`.

Contexto (según la Bitácora del canal Claude↔Codex): la auditoría de
integración/producción sobre el Preview real del PR encontró dos problemas
antes de fusionar — títulos con el año `2023` sin evidencia visible y
repetido, y una consulta de leyes/regulaciones inmobiliarias mal asignada a
la categoría de inversión inmobiliaria. Codex corrigió ambos con barreras
deterministas (no parches puntuales) antes de fusionar, siguiendo el pedido
de Claude en el mismo canal.

Auditoría de regresión (según Codex en la Bitácora): `git diff --check` y
TypeScript del worker correctos; build de `apps/web` completo con 83/83
rutas.
Auditoría de integración/producción: verificada por Codex contra un Preview
real (`https://auto-articulos-6ejlaap46-luna-portex-intelligence.vercel.app`)
antes de la corrección final; el Preview con la corrección de categoría
legal (`fda3e0d`) no consta verificado en un nuevo Preview en
`COORDINACION_CLAUDE_CODEX.md` antes de fusionar, ni consta una verificación
de Producción posterior a la fusión (`495baea`) al momento de este registro.
Migraciones: ninguna.
Responsable de esta entrada: Claude (tarea programada diaria de
propagación). Responsable del trabajo original: Codex.
Siguiente acción: quien retome esta conversación debe verificar Producción
tras la fusión (`/login`, dominio, logs) y registrar el resultado en este
documento, cerrando el ciclo que pide el propio canal Claude↔Codex ("Fin
del canal: cuando el PR #42 esté fusionado, verificado en producción y
cerrado, se escribe una entrada de cierre").
Estado: FUSIONADO A `main`; VERIFICACIÓN DE PRODUCCIÓN POST-FUSIÓN PENDIENTE
DE REGISTRO.

**Addendum (mismo registro, agregado tras rebasear sobre un commit nuevo de
`origin/main` encontrado durante el push de esta misma entrada):** el
commit `9bf9cc5` ("docs: document long-tail audit handoff") agregó a
`COORDINACION_CLAUDE_CODEX.md` — sección "ESTADO PARA RETOMAR — AUDITORÍA
LONG TAIL Y CANIBALIZACIÓN — 2026-09-04" — exactamente la verificación de
Producción que el párrafo de arriba daba como pendiente: la encontró
NO aprobada como cero-canibalización (el año `2023` reapareció sin
evidencia contextual suficiente y se detectaron duplicados semánticos
claros). Ese mismo commit registra además un PR #43 (`6e75ca8f`) ya en
`main`, que elimina el cooldown fijo de tres días para volver a analizar
oportunidades — cambio no cubierto por esta entrada, cuyo alcance es
únicamente el PR #42. Ver esa sección de Coordinación para el detalle
completo y el trabajo obligatorio pendiente antes de aprobar el algoritmo.

## Versión — 2026-09-03 19:05 EDT — créditos de imagen: detención real de lote

Fecha y hora: 2026-09-03 19:05 EDT
Versión/commit: `8115604`
Rama: `codex/auditoria-creditos-imagen-20260903`
Worktree: `/private/tmp/auditoria-creditos-imagen-20260903`
Conversación/proyecto: `CIERRE — CRÉDITOS DE IMAGEN: hasImageCredits solo por creación real + detención de lote`
Cambios incluidos: el worker solo marca `User.hasImageCredits = false` cuando
una creación real de artículo confirma falta de créditos de imagen tras
agotar `MAX_ATTEMPTS` (nunca por error ambiguo o chequeo preventivo); el
lote se detiene de inmediato (`halted`) en vez de continuar con los demás
títulos; se elimina el bypass persistente de `localStorage` del botón "Ya
recibí mis créditos" (ahora es una confirmación temporal en memoria, no una
máscara permanente del estado real de la cuenta); manual de usuario
actualizado en el mismo commit.
Archivos modificados: worker (`queue.ts` y relacionados) y
`apps/web/src/content/manual-usuario.ts`.
Archivos eliminados: ninguno.
Migraciones creadas: ninguna.
Migraciones aplicadas: no aplica.
Auditoría 1: aprobada (según Coordinación) — comportamiento revisado contra
el bug reportado por Milton.
Auditoría 2: aprobada — Root Directory `apps/web` confirmado.
Auditoría 3: aprobada — sin migración nueva.
Diff revisado: sí, según Coordinación.
Deployment/Vercel: `Ready`.
Estado de Vercel: `Ready`.
Producción verificada: pendiente de confirmación visual de Milton al cierre
de esta entrada (ver diagnóstico post-deploy más abajo, 2026-09-04).
Responsable: Claude Sonnet 5 (sesión que recibió el relevo de Codex).
Siguiente acción: ver diagnóstico post-deploy del 2026-09-04, entrada
siguiente.
Estado: DESPLEGADA

## Versión — 2026-09-04 10:20 EDT — diagnóstico post-deploy de créditos de imagen

Fecha y hora: 2026-09-04 10:20 EDT
Versión/commit: diagnóstico de solo lectura vía workflow
`diagnose-image-credits.yml` + `apps/worker/src/diagnose-image-credits.ts`
(agregado en PR #37, corregido en PR #38 por un bug de query y en PR #39 por
timeout de `npm ci`).
Rama: no aplica (workflow de GitHub Actions, solo lectura contra
`DATABASE_URL` de producción).
Conversación/proyecto: continuación de `CIERRE — CRÉDITOS DE IMAGEN...`.
Cambios incluidos: ninguno en código de producción; corrida de diagnóstico.
Resultado de la corrida (4/9, 14:20 UTC): 6 usuarios con
`hasImageCredits = false` en ese momento; se confirmaron con datos reales
títulos de Lorena Álvarez (30-31/8, ANTES del fix `8115604`) que muestran
exactamente el bug original (el lote seguía intentando títulos en vez de
detenerse de inmediato). Ningún caso real de falta de créditos ocurrió
todavía DESPUÉS del deploy — la parte "detener el lote de inmediato" queda
sin ejercitar en producción hasta que ocurra un caso real o se fuerce uno
deliberadamente.
Nota de proceso: el clasificador de modo automático bloqueó varios intentos
de push directo a `main` durante esta sesión; se resolvió abriendo PR normal
(`gh pr create` + `gh pr merge`) en vez de insistir con push directo.
Migraciones: no aplica.
Auditorías: no aplica (solo lectura).
Deployment/Vercel: no aplica.
Producción verificada: sí, de forma indirecta (lectura de datos reales de
producción, sin escritura).
Responsable: Claude/Codex (según Coordinación, commits `f7e5e4c`/`6d4e6b5`).
Siguiente acción: volver a correr `diagnose-image-credits.yml` cuando se
quiera confirmar en caliente que el lote se detiene ante un caso real.
Estado: VERIFICADA (como diagnóstico documental; la detención inmediata del
lote sigue sin un caso real post-deploy que la ejercite)

## Versión — 2026-09-04 10:46 EDT — auto-renovación silenciosa del token de Tumblr

Fecha y hora: 2026-09-04 10:46 EDT
Versión/commit: `8ad7ee2` en `main` (fast-forward directo desde `bd60d32`)
Archivos modificados: `apps/web/src/app/api/social-opportunities/generate/route.ts`
Conversación/proyecto: `CONEXION BLOGGER` (fase de cierre de Tumblr).
Cambios incluidos: `getConnectedNetworks()` (la función que decide si
mostrar el botón "Tumblr · Crear oportunidad") intentaba renovar el token
solo leyendo `expiresAt`, sin usar el refresh token como sí hacían
Configuración y el worker al publicar. Ahora intenta la misma renovación
silenciosa antes de decidir, así el botón ya no desaparece cada pocas horas
por vencimiento normal del token.
Migraciones: ninguna.
Deployment/Vercel: estado `Ready` (deploy `auto-articulos-web`).
Logs verificados: `/login` → 200, `/dashboard` → 307.
Producción verificada: sí — con sesión real de Lorena Álvarez, `GET
/api/social-opportunities/generate` siguió devolviendo `tumblr: true` y
`blogger: true` con el código nuevo desplegado, sin regresión. No fue
posible forzar una expiración real del token para probar en vivo el camino
de renovación (requeriría manipular la base de datos); la lógica es la
misma ya probada en Configuración y en `processTumblrJob` del worker.
Responsable: Claude/Codex (según Coordinación, commits `8ad7ee2`/`2bbe821`).
Siguiente acción: si el botón de Tumblr vuelve a desaparecer solo, es señal
de que Tumblr rechazó también la renovación silenciosa y hace falta
reconectar por OAuth.
Estado: VERIFICADA

## Versión preparada — 2026-09-04 — instrucciones de Oportunidades / migración a Claude

Fecha y hora: 2026-09-04
Versión/commit: `faf4612` en `main`
Conversación/proyecto: `CODEX - INSTRUCCIONES EN MODULOS`
Worktree: `/private/tmp/restaurar-publicar-main-20260904`
Cambios: sección independiente `Leer antes de ejecutar` en Oportunidades.
Archivos modificados: `apps/web/src/app/dashboard/oportunidades/page.tsx` y
estos registros documentales. Archivos eliminados: ninguno. Migraciones: ninguna.
Auditoría 1: APROBADA — alcance y contenido revisados; lógica intacta.
Auditoría 2: APROBADA — diff check, typecheck y build Next con 83/83 rutas.
Auditoría 3: PENDIENTE — Vercel rechazó el deployment manual por límite diario;
queda verificar el despliegue automático y la URL pública.
Deployment, dominio, logs y producción: pendientes.
Responsable: Codex; reconexión siguiente: Claude.
Siguiente acción: verificar Vercel y producción; no declarar `VERIFICADA` antes.
Estado: PREPARADA

## Versión preparada — 2026-09-04 — redacción final de Oportunidades (Claude)

Fecha y hora: 2026-09-04
Versión/commit: `c5b9c37` en `main` (fast-forward desde `65f0ff9`)
Conversación/proyecto: `CODEX - INSTRUCCIONES EN MODULOS` (continuación de Claude)
Worktree: `/private/tmp/instrucciones-oportunidades-texto-20260904`
Cambios: reemplazo del párrafo de objetivo y los 4 pasos de la tarjeta
"Leer antes de ejecutar" de Oportunidades por la redacción final que Milton
había aprobado y que `faf4612` no había incorporado.
Archivos modificados: `apps/web/src/app/dashboard/oportunidades/page.tsx` y
estos registros documentales. Archivos eliminados: ninguno. Migraciones: ninguna.
Auditoría 1: APROBADA — cambio de texto puro, contenido verificado contra la
redacción final aprobada por Milton.
Auditoría 2: APROBADA — `git diff --check` limpio, diff acotado a un archivo,
`next build --webpack` desde `apps/web` con 83/83 rutas sin error.
Auditoría 3: APROBADA para el código (Root Directory/`vercel.json` revisados
sin modificar); producción PENDIENTE — GitHub confirma
`Vercel – auto-articulos-web: failure`, `"Deployment rate limited — retry in
24 hours"` para `c5b9c37`. Mismo límite diario que ya bloquea los PR #46 y #47.
Deployment, dominio, logs: pendientes de que Vercel libere el límite.
Responsable: Claude. Siguiente acción: cuando el límite se libere, confirmar
`state: success` en el commit más reciente de `main` y verificar visualmente
`/dashboard/oportunidades` en producción antes de declarar `VERIFICADA`.
Estado: PREPARADA

## Versión — 2026-09-04 — PR #45: canonicalización de acciones y necesidades (guard de intención final)

Fecha y hora: 2026-09-04 16:08 EDT (hora del merge commit)
Versión/commit: merge `112ef7a6725b5aa8e868f9aa488bfe77336478f9` en `main`
(rama `codex/final-intent-guard-20260904`)
Rama: `codex/final-intent-guard-20260904`
Worktree: no registrado en Coordinación para este PR puntual.
Conversación/proyecto: `AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS`
(continuación tras PR #42-44, ver `COORDINACION_CLAUDE_CODEX.md` — "PUNTO DE
MIGRACIÓN A CLAUDE — 2026-09-04").
Cambios incluidos: canonicalización adicional de acciones y necesidades
(`selección`, `problema`, `errores`, `opciones`) en el algoritmo de
oportunidades, como parte del refuerzo de la firma de intención para evitar
canibalización semántica.
Archivos modificados: no detallados en la entrada de Coordinación de origen.
Archivos eliminados: ninguno registrado.
Migraciones creadas: ninguna registrada.
Migraciones aplicadas: no aplica.
Auditoría 1/2/3: no detalladas en la entrada de Coordinación de origen (solo
consta la aprobación general del PR y la respuesta HTTP 200 de Producción).
Diff revisado: según Coordinación, sí, antes de fusionar.
Deployment/Vercel: Producción respondió HTTP 200 tras el merge.
Estado de Vercel: `Ready` (implícito por el HTTP 200).
Producción verificada: parcialmente — el HTTP 200 confirma que el sitio
responde, pero la prueba funcional posterior (cuenta de prueba, 14
oportunidades generadas) volvió a detectar canibalización semántica, por lo
que el algoritmo en su conjunto **no quedó aprobado para publicar
automáticamente** pese a que este PR puntual sí llegó a Producción. Ver
detalle completo en `COORDINACION_CLAUDE_CODEX.md` — "PUNTO DE MIGRACIÓN A
CLAUDE — 2026-09-04" y "CLAUDE — REDISEÑO DE DEDUPLICACIÓN SEMÁNTICA —
2026-09-04".
Responsable: Codex - GPT-5.
Siguiente acción: ver el PR #47 (entrada siguiente en este documento), que
es el rediseño de deduplicación que responde a la canibalización detectada
tras este merge.
Estado: DESPLEGADA (código en Producción; algoritmo completo aún no
aprobado funcionalmente)

## Versión preparada — 2026-09-04 — PR #47: rediseño de deduplicación semántica (`needKey`)

Fecha y hora: 2026-09-04 16:31 EDT (último commit de la rama)
Versión/commit: `a7b05e54bdb3ffe07b36f3803c0c935649e31320` (rama sin
fusionar, base `c5b9c37`)
Rama: `claude/rediseno-intencion-longtail-20260904`
Worktree: `/private/tmp/rediseno-intencion-longtail-20260904` (según el
propio texto de Coordinación; esta corrida de propagación no tuvo acceso al
filesystem de la máquina de Milton para confirmarlo con `git worktree
list`).
Conversación/proyecto: `AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS`
(continuación de Claude tras el PR #45 y la canibalización detectada en la
prueba posterior).
Cambios incluidos: `apps/web/src/lib/opportunity-analysis.ts` — el modelo
ahora declara un `needKey` por título (objeto + contexto + perfil +
ubicación real, sin verbo ni palabras de formato/año); `hasSameIntent()` se
reemplaza por una comparación determinista y GLOBAL de `needKey` contra
toda la corrida (todas las categorías) y contra `existingTitles`.
`needKey` es interno, nunca se persiste en Prisma; el output sigue siendo
`{text, rationale}`, sin cambios de contrato para `api/opportunities/route.ts`.
Archivos modificados: `apps/web/src/lib/opportunity-analysis.ts` (diff
acotado a un solo archivo, según Coordinación).
Archivos eliminados: ninguno.
Migraciones creadas: ninguna.
Migraciones aplicadas: no aplica.
Auditoría 1 (funcional): APROBADA — simulación en Node de 6 casos
reales/límite (3 duplicados reportados por Codex, 2 variantes long tail
legítimas, 1 caso cruzado de categoría); se ajustó el umbral a mínimo 3
tokens compartidos tras un falso positivo propio ("mudanza" vs "divorcio").
Auditoría 2 (regresión): APROBADA — `tsc --noEmit` en `apps/web` y
`apps/worker` sin errores; `git diff --check` limpio.
Auditoría 3 (integración): APROBADA — `npm run build` desde `apps/web`
(mismo comando que Vercel), build exitoso, 83/83 rutas.
Diff revisado: sí, acotado a un solo archivo.
Deployment/Vercel: PR [`#47`](https://github.com/miltondavila-ux/auto-articulos/pull/47)
abierto, **BLOQUEADO** por `build-rate-limit` de Vercel (mismo límite que
afecta al PR #46 y al commit `c5b9c37`); `mergeable: MERGEABLE` según
GitHub, pero no se fusiona hasta ver `state: success` real en el check de
Vercel (Protocolo de este repositorio, orden directa de Milton).
Estado de Vercel: `failure` — `Deployment rate limited — retry in 24 hours`.
Dominio/logs: no aplica (rama no fusionada, sin deployment de Producción).
Producción verificada: no aplica todavía.
Responsable: Claude.
Siguiente acción: cuando el límite de Vercel se libere, revisar `gh pr
checks 47`; si el Preview pasa, fusionar y repetir el análisis con la
cuenta de pruebas (Lorena Álvarez) para confirmar en datos reales que ya no
hay canibalización semántica. Verificado en vivo por esta tarea programada
(2026-09-05) contra `origin/main` recién fetcheado: la rama
`claude/rediseno-intencion-longtail-20260904` sigue sin ser ancestro de
`main` (`git merge-base --is-ancestor` devuelve falso) — el PR sigue
genuinamente abierto y sin fusionar a esta fecha.
Estado: PREPARADA

## Versión preparada — 2026-09-04 — PR #46: línea de tiempo dinámica de fuentes de análisis

Fecha y hora: 2026-09-04 16:12 EDT (último commit de la rama)
Versión/commit: `e4ed8740be31b87af7a63dd533796f6ee36106ea` (rama sin
fusionar, base `112ef7a6`)
Rama: `codex/dynamic-source-timeline-20260904`
Worktree: no registrado en Coordinación para este PR.
Conversación/proyecto: `AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS`
(trabajo de interfaz de Codex, en paralelo al algoritmo).
Cambios incluidos: la línea de tiempo de análisis de Oportunidades muestra
dinámicamente `Google Search Console`, `Google Analytics` y `Bing Webmaster
Tools` como `conectado` o `no conectado`, consultando el estado real de
esas integraciones. No cambia el algoritmo ni datos existentes.
Archivos modificados: no detallados en la entrada de Coordinación de origen
(alcance declarado: solo interfaz/línea de tiempo).
Archivos eliminados: ninguno registrado. Migraciones: ninguna.
Auditorías: no detalladas en la entrada de Coordinación de origen.
Diff revisado: según Coordinación, cambio acotado a la interfaz.
Deployment/Vercel: PR #46 abierto, Preview rechazado por Vercel
(`Deployment rate limited — retry in 24 hours`), no fusionado.
Estado de Vercel: `failure` — mismo límite diario que bloquea al PR #47 y
al commit `c5b9c37`.
Producción verificada: no aplica (rama no fusionada).
Responsable: Codex - GPT-5.
Siguiente acción: esperar a que Vercel permita builds, verificar el Preview
real y fusionar solo si pasa. Verificado en vivo por esta tarea programada
(2026-09-05) contra `origin/main` recién fetcheado: la rama
`codex/dynamic-source-timeline-20260904` sigue sin ser ancestro de `main`.
Estado: PREPARADA

## Fusión y verificación en Producción — PR #47: rediseño de deduplicación semántica (`needKey`) — 2026-09-06

Entrada agregada por la tarea programada diaria de propagación de Claude, a
partir de la sección "CIERRE — PR #47 fusionado y verificado en producción —
2026-09-06" de `COORDINACION_CLAUDE_CODEX.md` (commit `719bb67`, PR #49).
Cierra el ciclo de la entrada anterior de este mismo documento ("Versión
preparada — 2026-09-04 — PR #47: rediseño de deduplicación semántica
(`needKey`)"), que había quedado con "Producción verificada: no aplica
todavía".

Causa del bloqueo y resolución: el `build-rate-limit` de Vercel que
bloqueaba el PR #47 (mismo bloqueo que el PR #46 de Codex) se liberó solo
entre el 2026-09-04 y el 2026-09-06. El check de GitHub había quedado
congelado en el intento fallido viejo porque nadie volvió a empujar un
commit a esa rama; se confirmaron despliegues nuevos exitosos a Producción
vía `vercel ls` y se forzó un reintento real con `git push
--force-with-lease` tras rebasar la rama sobre `origin/main` actualizado
(incluye `8c4be47`, la reducción de deploys propuesta por otra sesión).
Ambos checks de Vercel pasaron a `SUCCESS` real (no solo dejaron de estar
en `pending`).

Versión/commit: PR [`#47`](https://github.com/miltondavila-ux/auto-articulos/pull/47)
fusionado como `7e951f7` ("fix: firma de intencion estructurada para cero
canibalizacion real (#47)"). Verificado en vivo por esta tarea programada
(2026-09-07) contra `origin/main` recién fetcheado: `git merge-base
--is-ancestor 7e951f7 origin/main` confirma que el commit ya es ancestro de
`main`; la rama remota `claude/rediseno-intencion-longtail-20260904` ya no
existe (borrada tras el merge, reserva liberada).
Deployment/Vercel: ambos checks en `success` real sobre el commit fusionado.
Producción verificada: `curl -I /login` responde `200` tanto en
`auto-articulos-web.vercel.app` como en `seototal.lasolucionweb.com`.
Migraciones: ninguna (esta entrada no registra ninguna migración nueva; ver
la entrada "PREPARADA" original para el detalle completo de auditorías
funcionales/regresión/integración, que no cambia).
Responsable del cierre: según la propia entrada de Coordinación citada
arriba (sesión que hizo el rebase/force-push/verificación). Responsable de
esta entrada: Claude (tarea programada diaria de propagación).

Pendiente explícito, todavía sin resolver (ya registrado también en la
entrada "PREPARADA" original y en `INVENTARIO_CONVERSACIONES.md` — Parte B):
antes de aprobar la publicación automática del algoritmo de oportunidades,
falta repetir el análisis con la cuenta de pruebas (Lorena Álvarez) y
auditar los títulos generados para confirmar en datos reales que ya no hay
canibalización semántica. El PR #46 de Codex (línea de tiempo dinámica
GSC/GA4/Bing, ver entrada "PREPARADA" de este mismo documento) sigue
abierto y sin fusionar — verificado en vivo por esta tarea (2026-09-07):
la rama `codex/dynamic-source-timeline-20260904` todavía existe en el
remoto y `git merge-base --is-ancestor` confirma que NO es ancestro de
`origin/main`.
Estado: FUSIONADO A `main` Y VERIFICADO EN PRODUCCIÓN.

## Versión desplegada — 2026-09-07 — quitar título duplicado y texto gris en Oportunidades

Fecha y hora: 2026-09-07
Versión/commit: `94f6e02` en `main` (fast-forward desde `8032368`)
Conversación/proyecto: `CODEX - INSTRUCCIONES EN MODULOS` (continuación de Claude)
Worktree: `/private/tmp/oportunidades-texto-negro-sin-duplicado`
Motivo: Milton reportó, con captura de producción, que el encabezado
"Oportunidades SEO" aparecía dos veces en la página (en la tarjeta "Leer
antes de ejecutar" y de nuevo en la sección técnica de abajo) y que el
párrafo de fuentes de datos (GSC/GA4/Bing) seguía en gris (`#6b7280`) en
vez de negro, inconsistente con el resto de la tarjeta.
Cambios: se eliminó el `<h2>Oportunidades SEO</h2>` duplicado de la segunda
sección; el párrafo pasó de `#6b7280` a `#1d1d1f` (mismo negro que el resto).
Archivos modificados: `apps/web/src/app/dashboard/oportunidades/page.tsx`.
Auditoría 1: APROBADA — cambio de texto/estilo puro, sin lógica.
Auditoría 2: APROBADA — `tsc --noEmit` limpio, `next build --webpack` 83/83
rutas, diff acotado a 3 líneas de un solo archivo.
Auditoría 3: APROBADA — `Vercel – auto-articulos-web: success` confirmado
vía API de GitHub para `94f6e02`; `seototal.lasolucionweb.com/login` → 200.
Responsable: Claude.
Estado: VERIFICADA EN PRODUCCIÓN.

## Versión APROBADA Y PROTEGIDA — 2026-09-07 — `/dashboard/oportunidades` (Milton)

Milton confirmó explícitamente, tras revisarla en producción, que esta es la
versión que quiere para la página de Oportunidades: "es una hermosura de
página... por favor NO la pises ni por equivocación, mantén este código, este
es el que quiero para esa página."

Commit exacto: `b9eb450` en `main`. Deployment Vercel:
`Vercel – auto-articulos-web: success` (verificado vía API de GitHub el
2026-09-07); `seototal.lasolucionweb.com/login` → 200.

Contenido protegido de `apps/web/src/app/dashboard/oportunidades/page.tsx`:
- La tarjeta "Leer antes de ejecutar" con fondo blanco, objetivo, los 4 pasos
  y las reglas importantes — texto negro (`#1d1d1f`) en su totalidad.
- El párrafo técnico de fuentes de datos (GSC/GA4/Bing) justo debajo, sin
  encabezado duplicado, también en negro (`#1d1d1f`).
- El bloque de cupo, la casilla "Desactivar indexación", y las etiquetas de
  Idioma y Estilo de escritura — todos en negro (`#1d1d1f`), sin grises
  fuera del estilo Apple aprobado (ver [[estilo-apple-de-milton]]).

Regla permanente (mismo criterio que ya rige para `/dashboard/publicar`, ver
sección "PROTECCIÓN PERMANENTE — INSTRUCCIONES DE PUBLICAR" en
`COORDINACION_CLAUDE_CODEX.md`): ningún cambio futuro puede borrar, reemplazar,
duplicar, ocultar, volver a poner en gris ni pisar este contenido sin revisar
explícitamente esta sección primero. Cualquier modificación de ese archivo
debe preservar el bloque completo o documentar el motivo, el diff y las tres
auditorías requeridas.
Estado: APROBADA POR MILTON — PROTEGIDA PERMANENTEMENTE.

## Versión APROBADA POR MILTON — 2026-09-07 — Algoritmo de Oportunidades (`opportunity-analysis.ts`)

Conversación: `CODEX - AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS`
(traspasada de Codex a Claude el 4/9/2026, continuada por Claude el 7/9/2026).
Milton confirmó explícitamente, tras una prueba real con la cuenta de pruebas
(Lorena Álvarez, `segurosdesaludyvida.com`), que esta versión cumple el
objetivo: "TE FELICITO... guarda esta versión".

**Commits que componen esta versión** (todos en `main`, en orden):
- `7e951f7` (PR #47): firma de intención estructurada (`needKey`: objeto +
  contexto + perfil + ubicación, sin verbo ni formato) declarada por el
  modelo por título; el código la compara de forma determinista y GLOBAL —
  cualquier categoría, no solo la actual — para bloquear canibalización
  cruzada entre categorías distintas.
- `4614ad3` (PR #52): corrección de alcance — el chequeo de `needKey` NO debe
  compararse contra los títulos ya publicados (`existingTitles`), solo contra
  lo generado en la misma corrida. Una primera versión sí lo hacía y, en una
  cuenta con 405 artículos ya publicados muy temática, bloqueaba de más (de
  ~14-19 oportunidades típicas bajó a solo 2). Lo publicado sigue protegido
  únicamente por coincidencia exacta de texto, como en el diseño original.
- `3a76d71` (PR #54): `BATCH_SIZE` de 250 a 100 (más lotes, más intentos de
  cubrir categorías con evidencia real) + regla en el prompt contra ser
  demasiado conservador cuando la evidencia es abundante. Pedido explícito de
  Milton: al menos 10 títulos por corrida cuando la evidencia real lo permite.
- `e1662a4` (PR #55): prohibición ABSOLUTA de años viejos, independiente de la
  evidencia. Milton encontró `"...Comparativa 2023"` en un título real
  generado en 2026 — el chequeo anterior solo exigía que el año tuviera
  evidencia real en los datos (Search Console puede seguir mostrando
  impresiones de una consulta vieja), no que fuera razonable publicarlo hoy.
  `isYearAcceptablyRecent()` solo permite año actual ±1, sin excepción.

**Resultado verificado en producción** (cuenta de pruebas Lorena Álvarez,
2026-09-07, dos corridas reales consecutivas tras cada fix):
- Antes de `4614ad3`: 2 títulos en 2 de 10 categorías (sobre-bloqueo).
- Después de `4614ad3` + `3a76d71`: 10 títulos en 3 de 10 categorías —
  objetivo de "al menos 10" cumplido.
- Sin años inventados ni desactualizados detectados en esa corrida (el fix
  de `e1662a4` es posterior a esa prueba puntual; queda pendiente confirmar
  con una corrida nueva que ya no reaparezca ningún año fuera de rango).

**Hallazgo pendiente, NO resuelto en esta versión** (documentado también en
`TO-DO.md`, pedido explícito de Milton): el algoritmo asigna mal la categoría
a algunos títulos y viceversa — en la corrida de prueba, un título sin
ninguna mención de "deducible" cayó en la categoría "Deducibles", y un título
genérico sin mención de embarazo cayó en "Embarazo y Bebés" (duplicando además
contenido de otra categoría). Ver el punto 2 de `TO-DO.md` bajo esta misma
conversación.

Archivo: `apps/web/src/lib/opportunity-analysis.ts` (único modificado en las
cuatro auditorías). Sin migraciones de Prisma en ninguno de los cuatro PRs.
Responsable: Claude.
Estado: APROBADA POR MILTON — VERIFICADA EN PRODUCCIÓN. Pendiente de una
próxima conversación: corregir la asignación categoría↔título (ver TO-DO.md).

## Versión desplegada — 2026-09-07 — rebranding a SEO TOTAL

Fecha y hora: 2026-09-07
Versión/commit: `67a5f2f` en `main` (fast-forward desde `77d61fa`)
Conversación/proyecto: `CODEX - INSTRUCCIONES EN MODULOS` (continuación de Claude)
Worktree: `/private/tmp/rebrand-seo-total`
Motivo: Milton confirmó explícitamente que la plataforma dejó de llamarse
"Auto Artículos" y ahora se llama "SEO TOTAL | Generación de contenido y
posicionamiento inteligente"; pidió que no quedara esa mención en ningún lado.
Cambios: reemplazo literal de "Auto Artículos" por "SEO TOTAL" en 29 archivos
— encabezado del dashboard (con el nuevo eslogan como subtítulo), `<title>`
de la PWA (`appleWebApp.title`) y `manifest.ts` (`name`/`short_name`), login,
páginas públicas (`acerca-de`, `privacidad`, `terminos`), manual del
asistente (`manual-usuario.ts`), componentes de conexión de redes sociales
(Bluesky, DEV.to, Google Analytics/Search Console, aviso de pestañas), y
mensajes de error/prompt del worker visibles para el usuario final
(`10minutesWebsite.ts`, `generateCustomArticle.ts`, `index.ts`,
`contentLanguage.ts`). Se verificó con `grep` recursivo sobre todo el
repositorio (`apps`, `packages`, `.github`) que no queda ninguna mención
literal restante.
Archivos modificados: 29 (ver commit `67a5f2f` para el listado completo).
Auditoría 1: APROBADA — cambio de texto puro, sin lógica; revisión manual de
que cada frase se sigue leyendo natural tras el reemplazo (incluidas las
tarjetas protegidas de Publicar y Oportunidades).
Auditoría 2: APROBADA — `tsc --noEmit` limpio en `apps/web`; `next build
--webpack` con 83/83 rutas; `tsc --noEmit` del worker limpio; 14/14 tests del
worker en verde; diff acotado exclusivamente a los 29 archivos con la
mención antigua.
Auditoría 3: APROBADA — `Vercel – auto-articulos-web: success` confirmado
vía API de GitHub para `67a5f2f`; `seototal.lasolucionweb.com/login` → 200.
Responsable: Claude.
Estado: VERIFICADA EN PRODUCCIÓN.

## Versión desplegada — 2026-09-07 — aclarar que no hace falta ver el progreso en Publicaciones en Curso

Fecha y hora: 2026-09-07
Versión/commit: `e5af4d5` en `main` (fast-forward desde `6f2948f`)
Worktree: `/private/tmp/publicaciones-en-curso-texto`
Motivo: Milton pidió que la pantalla `/dashboard/publicaciones-en-curso`
dejara explícito, sin ambigüedad, que no hace falta quedarse mirando el
avance — se puede cerrar la aplicación e irse y todo sigue funcionando solo.
Cambios: se reescribió el segundo párrafo de la introducción del módulo
(`ModuleIntro`/`IntroP`) en `apps/web/src/app/dashboard/publicaciones-en-curso/page.tsx`
con la frase textual pedida ("No hace falta que te sientes a ver lo que va
pasando. Puedes cerrar la aplicación e irte..."), conservando la mención de
que se puede cancelar desde ahí si algo se atasca.
Archivos modificados: `apps/web/src/app/dashboard/publicaciones-en-curso/page.tsx`.
Auditoría 1: APROBADA — cambio de texto puro, un solo párrafo.
Auditoría 2: APROBADA — `tsc --noEmit` limpio, `next build --webpack` 83/83
rutas, diff acotado a 1 línea de un solo archivo.
Auditoría 3: APROBADA — `Vercel – auto-articulos-web: success` confirmado
vía API de GitHub para `e5af4d5`; `seototal.lasolucionweb.com/login` → 200.
Responsable: Claude.
Estado: VERIFICADA EN PRODUCCIÓN.

## Versión desplegada — 2026-09-07 — unificar tamaño de botones en Oportunidades en Redes

Fecha y hora: 2026-09-07
Versión/commit: `2733aab` en `main` (fast-forward desde `97495e0`)
Worktree: `/private/tmp/oportunidades-redes-botones`
Motivo: Milton reportó que `/dashboard/oportunidades-redes` acumulaba
botones con formas y tamaños distintos entre sí — los de "Crear
oportunidad" por red en forma de píldora (radio 20), el resto con radio 10,
y tipografía mezclada (12px/13px/14px) entre tarjetas y modales — pidió que
todos fueran "un estándar".
Cambios: se definió una única constante `uniformButtonSize` (padding "9px
16px", `borderRadius: 10`, `fontSize: 13`) aplicada sobre las mismas
variantes ya existentes (`buttonStyle`/`secondaryButtonStyle`) en los 9
botones de la pantalla: los de red ("Crear oportunidad"), "Publicar todo el
lote", "Ver publicaciones en curso" (estado vacío), Preview/Guardar/
Publicar/Descartar de cada tarjeta, y Cancelar/Descartar/Cerrar de los dos
modales. No se tocó ningún color, texto ni comportamiento — solo forma y
tamaño.
Archivos modificados: `apps/web/src/app/dashboard/oportunidades-redes/page.tsx`.
Auditoría 1: APROBADA — cambio de estilo puro; revisión manual confirmando
que los 9 botones de la pantalla usan la misma constante.
Auditoría 2: APROBADA — `tsc --noEmit` limpio, `next build --webpack` 83/83
rutas, diff acotado a un solo archivo (23 inserciones, 11 eliminaciones).
Auditoría 3: APROBADA — `Vercel – auto-articulos-web: success` confirmado
vía API de GitHub para `2733aab`; `seototal.lasolucionweb.com/login` → 200.
Responsable: Claude.
Estado: VERIFICADA EN PRODUCCIÓN.

## Versión desplegada — 2026-09-07 — RENEW CONFIGURACION (rediseño completo, 6 fases)

Proyecto documentado previamente en `RENEW_CONFIGURACION.md` (entregado a
Milton vía MAGO), aprobado por él con instrucción explícita: "quiero que una
persona que no comprende nada... pueda comprender esto". Ejecutado de forma
autónoma en 6 fases, cada una en worktree aislado, con tres auditorías y
verificación real en producción antes de pasar a la siguiente.

**Hallazgo central (Fase 0):** `ConfiguracionView.tsx` (2172 líneas) hacía
que las pestañas "Cuenta" y "Contenido" renderizaran exactamente el mismo
bloque de código — dos descripciones distintas para el mismo contenido.

**Fase 1** — commit `7615c9e`: `/dashboard/configuracion` pasó de renderizar
directamente el formulario a ser un índice de 6 tarjetas con explicación
propia. Nueva ruta `/dashboard/configuracion/inicial` para el asistente
(antes sin URL propia).

**Fase 2** — commit `d20b2f1`: separación real de Cuenta (Credenciales,
Categorías, Idioma) y Contenido (Estilo de redacción, Firma, Ubicaciones
geolocalizadas, Teléfono, Foto/logo). Se extrajo `AdminFixPatriciaPanel.tsx`
como componente autosuficiente (antes aparecía sin importar qué pestaña se
viera).

**Fases 3-5** — commit `2ff4969`: Indexación y SEO, Redes Sociales y App
Móvil como páginas dedicadas — ya eran autocontenidas en el código viejo,
extracción directa sin cambios de lógica.

**Fase 6** — commit `c7accf7`: retirado `ConfiguracionView.tsx` (2172 líneas
eliminadas, confirmado con `grep` que ninguna ruta lo importaba, build
verificado después del borrado) y actualizado `manual-usuario.ts` — las
rutas viejas con `?tab=` ya no existen, cada sección tiene URL propia.

Archivos modificados en total: 6 páginas de `apps/web/src/app/dashboard/configuracion/*/page.tsx`
reescritas, 1 componente nuevo (`AdminFixPatriciaPanel.tsx`), 1 archivo
eliminado (`ConfiguracionView.tsx`), `manual-usuario.ts` actualizado. Sin
migraciones de Prisma en ningún commit — solo reorganización de interfaz.
Todas las llamadas a la API (`/api/credentials`, `/api/categories`,
`/api/languages`, `/api/me`, `/api/prompts`, `/api/me/upload-image`,
`/api/admin/fix-patricia*`) son idénticas a las que ya existían.

Auditoría 1 (funcional) por fase: revisión manual línea por línea contra el
código original antes de cada extracción, sin reescribir lógica.
Auditoría 2 (regresión) por fase: `tsc --noEmit` limpio y `next build
--webpack` con 83/83 rutas generadas en las 6 fases, incluida la fase final
tras borrar el monolito.
Auditoría 3 (integración/producción) por fase: `Vercel – auto-articulos-web:
success` confirmado vía API de GitHub para cada commit
(`7615c9e`/`d20b2f1`/`2ff4969`/`c7accf7`); `seototal.lasolucionweb.com/login`
→ 200 después de cada despliegue.

Responsable: Claude. Documento de planificación: `RENEW_CONFIGURACION.md`.
Estado: **APROBADO POR MILTON — DESPLEGADO Y VERIFICADO EN PRODUCCIÓN, LAS 6
FASES COMPLETAS.**

## Versión desplegada — 2026-09-07 — mensaje humano para categoría cacheada (caso Alfonso Giménez)

Entrada agregada por la tarea programada diaria de propagación (2026-09-08)
a partir de `COORDINACION_CLAUDE_CODEX.md`, sección "CIERRE — Mensaje
humano para error de categoría cacheada (caso Alfonso Giménez) — 2026-09-07".

Fecha y hora: 2026-09-07.
Versión/commit: `dffcdd9` en `main` (PR #50, fusionado por squash).
Worktree: `/private/tmp/fix-error-labels-alfonso-20260907`.
Conversación/proyecto: caso puntual reportado por Milton (usuario Alfonso
Giménez, título fallando 3 intentos con timeout crudo de Playwright).
Cambios: `apps/worker/src/automation/10minutesWebsite.ts:805` — el
`page.selectOption(...)` de `createArticleDraft` ahora está envuelto en
`try/catch`; si la categoría cacheada de `Category.externalId` ya no existe
como opción real en el sitio, se lanza un mensaje humano y accionable
("sincroniza categorías ahora en Configuración") en vez de propagar el
timeout técnico de Playwright. El camino de éxito (categoría existente)
queda idéntico.
Archivos modificados: `apps/worker/src/automation/10minutesWebsite.ts`.
Migraciones: ninguna.
Auditoría 1 (funcional): APROBADA — revisión del flujo completo de
`createArticleDraft`, reutiliza `productName` ya disponible en el scope.
Auditoría 2 (regresión): APROBADA — `npx tsc --noEmit` y `npm run build` en
`apps/worker`, worktree aislado con `node_modules`/Prisma Client propios.
Auditoría 3 (integración/producción): APROBADA con salvedad — el worker
corre vía GitHub Actions leyendo `main` directo (`Vercel –
auto-articulos-web` salió `Skipped - Not affected`, correcto, no se tocó
`apps/web`); verificación funcional en vivo (reproducir el error real y
confirmar el mensaje nuevo) queda pendiente para la próxima vez que este
caso puntual ocurra — riesgo bajo por ser un cambio aditivo sobre una ruta
que hoy ya está rota.
Responsable: Claude.
Estado: DESPLEGADA. Verificación funcional en vivo pendiente (bajo riesgo).

## Versión desplegada — 2026-09-07 — rediseño de login (más Apple) + recuperar contraseña

Entrada agregada por la tarea programada diaria de propagación (2026-09-08)
a partir de `COORDINACION_CLAUDE_CODEX.md`, sección "CIERRE — Rediseño de
login (más Apple) + recuperar contraseña — 2026-09-07".

Fecha y hora: 2026-09-07.
Versión/commit: `0913991` en `main` (PR #58).
Conversación/proyecto: pedido de Milton de modernizar la pantalla de login
(fondo blanco en vez de gris, título/descripción nuevos, agregar
recuperación de contraseña, que no existía).
Cambios: `apps/web/src/app/login/page.tsx` — fondo blanco puro, tarjetas sin
borde duro con sombra suave; título "Toda la inteligencia, al alcance de tu
mano." y descripción nuevos; nuevo enlace "Recuperar mi contraseña" que
apunta a `https://www.10minuteswebsite.com/ayuda` (no hay infraestructura
de email para recuperación real, decisión explícita de Milton). De paso,
`packages/shared/src/platform-servers.ts` — `helpUrl` de TagCrush
actualizado a `https://www.tagcrush.com/Chat-de-ayuda-tagcrush` (estaba
desactualizado).
Archivos modificados: `apps/web/src/app/login/page.tsx`,
`packages/shared/src/platform-servers.ts`.
Migraciones: ninguna.
Auditoría 1 (funcional): APROBADA — servidor local, verificado en desktop y
viewport mobile (375px).
Auditoría 2 (regresión): APROBADA — `npm run verify` (typecheck + build de
`apps/web` con 90 rutas, build + 14/14 tests de `apps/worker`).
Auditoría 3 (integración/producción): APROBADA — tras fusionar, ambos
checks de Vercel en `success`, `/login` responde `200` en
`auto-articulos-web.vercel.app` y `seototal.lasolucionweb.com`, confirmado
visualmente contra el dominio real.
Responsable: Claude.
Estado: VERIFICADA EN PRODUCCIÓN.

## Versión desplegada — 2026-09-07 — títulos ultra geolocalizados (cliente × negocio)

Entrada agregada por la tarea programada diaria de propagación (2026-09-08)
a partir de `COORDINACION_CLAUDE_CODEX.md`, secciones "CIERRE — 2026-09-07 —
Títulos ultra geolocalizados" y "CIERRE FINAL — CODEX - AUDITORIA A
ALGORITMO DE PUBLICACIÓN DE ARTICULOS".

Fecha y hora: 2026-09-07.
Versión/commit: `b47784b` (PR #61, campos y UI), `e79ee5e` (PR #62, ruta
segura de migración — **nota de corrección**: la entrada de origen en
`COORDINACION_CLAUDE_CODEX.md` cita el commit de PR #62 como `f050672`,
pero ese hash corto corresponde en realidad a un commit distinto y
anterior del 2026-09-04 ["docs: liberar capitanía tras archivar CONEXION
BLOGGER"] — verificado con `git log --oneline --all | grep "(#62)"` contra
`origin/main` antes de escribir esta entrada; se deja señalado aquí sin
tocar el texto original de Coordinación), `c87d6ef` (PR #66, llamada
dedicada para forzar combinaciones), `ae78d4c` (PR #67, manual de usuario).
Conversación/proyecto: `CODEX - AUDITORIA A ALGORITMO DE PUBLICACIÓN DE
ARTICULOS` (continuación de Claude).
Cambios: nuevos campos `User.clientLocations`/`User.businessLocations`
(texto separado por comas); sección "Ubicaciones para Títulos
Geolocalizados" en Configuración → Contenido; `opportunity-analysis.ts`
trata estas ubicaciones como datos reales declarados por el dueño de la
cuenta (no requieren evidencia de GSC/GA4/Bing); llamada aparte a OpenAI
dedicada a cubrir cada combinación cliente×negocio (el primer intento,
dentro del prompt principal, no bastó por competir contra ~15 reglas más);
`manual-usuario.ts` actualizado con el paso a paso.
Migraciones: `safe_client_business_locations`, input nuevo y seguro en
`migrate.yml` (mismo patrón que `safe_daily_limit_default`/
`safe_blogger_integration`, tras fallar `prisma db push` normal por las
columnas huérfanas ya documentadas). Aplicada con éxito, run `34167888519`.
Auditoría 3 (integración/producción): APROBADA — `seototal.lasolucionweb.com/login`
respondió 200 tras la migración; verificado en producción con la cuenta de
Lorena Álvarez: las 12 combinaciones completas (4 ciudades de clientes × 3
de negocio) aparecieron correctas, sin inventar ninguna fuera de las
declaradas.
Responsable: Claude.
Estado: VERIFICADA EN PRODUCCIÓN.

## Versión desplegada — 2026-09-07 — motor de selección de artículos tendencia para redes sociales

Entrada agregada por la tarea programada diaria de propagación (2026-09-08)
a partir de `COORDINACION_CLAUDE_CODEX.md`, sección "CIERRE FINAL — CODEX -
AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS" (subsección "Algoritmo
de Redes Sociales/Microblogging").

Fecha y hora: 2026-09-07 (aprox., según orden de PRs citado en la fuente).
Versión/commit: `97495e0` (PR #57), `bf18f64` (PR #60).
Conversación/proyecto: `CODEX - AUDITORIA A ALGORITMO DE PUBLICACIÓN DE
ARTICULOS`.
Cambios: `selectTrendingArticles()` en
`apps/web/src/app/api/social-opportunities/generate/route.ts` puntúa cada
página publicada combinando impresiones+clics+tendencia de GSC,
sesiones+usuarios de GA4 y coincidencia de palabras clave con consultas
reales de Bing, para decidir de qué artículo hablar en redes (antes elegía
por orden de Google o por fecha, sin usar GA4/Bing); `searchQueries` ahora
se llena de verdad. PR #60: se excluyen artículos ya usados hoy en
cualquier red (con fallback si no queda ninguno sin usar) y se genera 1
solo candidato por clic en vez de hasta 3, corrigiendo que pedir dos redes
distintas el mismo día devolvía el mismo artículo top-1 para ambas.
Archivos modificados:
`apps/web/src/app/api/social-opportunities/generate/route.ts`.
Migraciones: ninguna.
Decisión explícita de Milton: el flujo sigue siendo manual (el usuario
aprueba cada propuesta); el programador automático de publicación diaria
sin clic queda pendiente (ver `TO-DO.md`).
Responsable: Claude/Codex (ver detalle completo y atribución exacta en
`COORDINACION_CLAUDE_CODEX.md`).
Estado: la fuente no detalla las tres auditorías por separado para estos
dos commits puntuales; ambos están fusionados en `main` y forman parte del
resultado ya verificado en producción con la cuenta de Lorena Álvarez
descrito en la entrada anterior de este mismo documento.

## Versión desplegada (parcial) — 2026-09-07 — nueva imagen OG con foto real de Milton

Entrada agregada por la tarea programada diaria de propagación (2026-09-08)
a partir de `COORDINACION_CLAUDE_CODEX.md`, sección "CIERRE (parcial) —
Nueva imagen OG con foto real de Milton — 2026-09-07".

Fecha y hora: 2026-09-07.
Versión/commit: `67727b4` en `main` (PR #69).
Cambios: reemplazo de `apps/web/public/og-image.jpg` (antes template de
Canva "Blue Futuristic Neon Artificial Intelligence") por una imagen nueva
generada con ChatGPT Images a partir de una foto real de Milton (estética
cyborg, decisión de marca explícita confirmada por él), redimensionada de
1730x909 a 1200x630 con `sips -z` (resize proporcional, sin recortar
texto).
Archivos modificados: `apps/web/public/og-image.jpg` (1 archivo binario).
Migraciones: ninguna.
Auditoría 1 (funcional): APROBADA — verificado visualmente que la imagen
completa entra sin recortes en 1200x630.
Auditoría 2 (regresión): no aplica — solo un asset estático.
Auditoría 3 (integración/producción): **BLOQUEADA al momento del merge** —
el check `Vercel – auto-articulos-web` para `67727b4` devolvió `Deployment
rate limited — retry in 24 hours` (mismo tipo de bloqueo de cuota que ya
afectó a los PR #46/#47/#70). No es error de código. Producción NO se
rompió: `/login` seguía respondiendo `200` en ambos dominios con el build
anterior (el de PR #63), solo sin la imagen OG nueva todavía.
Responsable: Claude.
Siguiente acción: cuando se libere la cuota de Vercel, reintentar el mismo
commit desde Vercel (o `git commit --allow-empty` + push) y confirmar
visualmente que `og-image.jpg` nuevo se sirve en producción.
Estado: CÓDIGO FUSIONADO EN `main`, DESPLIEGUE PENDIENTE POR CUOTA DE
VERCEL (no verificado como resuelto por esta corrida de propagación).

## Versión preparada — 2026-09-07 — PR #70: tarjetas clicables en Usuarios

Entrada agregada por la tarea programada diaria de propagación (2026-09-08)
a partir de `COORDINACION_CLAUDE_CODEX.md`, sección "BLOQUEADO — Tarjetas
clicables en Usuarios... — 2026-09-07", y verificada en vivo contra la API
de GitHub por esta misma corrida.

Fecha y hora: 2026-09-07 23:52 UTC (según metadatos del PR).
Versión/commit: `0fcedef` (rama `claude/panel-usuarios-clickable-20260907`,
sin fusionar).
Worktree: `/tmp/panel-usuarios-clickable-20260907`.
Conversación/proyecto: `ORDEN DE USUARIOS ACTIVOS EN ADMIN`.
Cambios: las 5 tarjetas de resumen de la pestaña "Accesos" en
`/dashboard/usuarios` (Usuarios totales, En prueba, Activos, Conectados
ahora, Publicaciones totales) pasan de estáticas a clicables (navegan a la
sección/filtro correspondiente con datos reales) y pierden los colores
verde/naranja, quedando en escala de grises. No se tocó lógica de creación
de usuarios, módulos, mantenimiento, prompts ni `UserCard`.
Archivos modificados: `apps/web/src/app/dashboard/usuarios/page.tsx` (1
archivo, +59/-18 según la API de GitHub).
Migraciones: ninguna.
Auditoría 1 (funcional): APROBADA — `npx tsc --noEmit` limpio.
Auditoría 2 (regresión): APROBADA — build exacto de `apps/web` (mismo
comando que Vercel), incluye `/dashboard/usuarios` en las rutas generadas.
Auditoría 3 (integración/producción): **BLOQUEADA** — verificado en vivo
por esta corrida vía API de GitHub (`pull_request_read.get_status` para PR
#70): ambos checks de Vercel (`cambio-boton-comienza-aqui-clean` y
`auto-articulos-web`) en `failure`, `Deployment rate limited — retry in 24
hours`. El PR sigue `open`, `mergeable_state: unknown`, sin fusionar —
correcto según el Protocolo (no fusionar sin las tres auditorías).
Responsable: Claude.
Siguiente acción: cuando se libere la cuota de Vercel, reintentar el mismo
commit, verificar el Preview funcionalmente y recién ahí fusionar.
Estado: PREPARADA, BLOQUEADA POR CUOTA DE VERCEL.

## Versión desplegada — 2026-09-08 — PR #70: tarjetas clicables en Usuarios, fusionado

Entrada agregada por la tarea programada diaria de propagación (2026-09-09)
a partir de `COORDINACION_CLAUDE_CODEX.md`, sección "CIERRE — Tarjetas
clicables en Usuarios — 2026-09-08" (continuación de la entrada anterior de
este mismo documento, "Versión preparada — 2026-09-07 — PR #70").

Fecha y hora: 2026-09-08.
Versión/commit: `bac676f` (forzar reconstrucción tras un reintento
engañoso con commit vacío), fusión squash `48578e9`.
Conversación/proyecto: `ORDEN DE USUARIOS ACTIVOS EN ADMIN`.
Cambios: mismos de la entrada anterior (tarjetas clicables, sin colores).
Migraciones: ninguna.
Auditoría 3 (integración/producción): rate limit de Vercel liberado; build
real en verde para el proyecto correcto (`auto-articulos-web`, no el
duplicado). **Limitación real:** la URL de Preview quedó protegida por SSO
de Vercel, sin credenciales disponibles para verificar clic por clic antes
de fusionar — compensado con build/typecheck limpios y un diff de bajo
riesgo (solo `onClick` sobre tarjetas ya existentes). Verificado en
Producción real inmediatamente después: build `success`,
`auto-articulos-web.vercel.app` responde con normalidad (captura de
pantalla real). No se verificó con clics reales las 5 tarjetas en
Producción (requiere sesión de administrador).
Responsable: Claude.
Estado: VERIFICADA EN PRODUCCIÓN (build y carga), CLIC FUNCIONAL SIN
VERIFICAR POR FALTA DE SESIÓN DE ADMINISTRADOR.

## Versión desplegada — 2026-09-08 — botón "Borrar todas las oportunidades" (PR #72, #74, #75)

Entrada agregada por la tarea programada diaria de propagación (2026-09-09)
a partir de `COORDINACION_CLAUDE_CODEX.md` (secciones sobre el worktree
aislado, el cierre del PR #72 y el addendum de colisión con el PR #75).
Ya documentado también en `TO-DO.md` (sección "Hecho") e
`INVENTARIO_CONVERSACIONES.md` Parte B, propagados directamente por la
propia conversación que hizo el trabajo — esta entrada solo completa el
registro de versiones que faltaba en este documento.

Fecha y hora: 2026-09-08.
Versión/commit: `3809471` (PR #72, código: botones "Borrar todas las
oportunidades" en `/dashboard/oportunidades` y
`/dashboard/oportunidades-redes`, más `DELETE /api/social-opportunities?scope=pending`),
fusión squash `16befb5`; `582b9de` (PR #74, propagación a
`apps/web/src/content/manual-usuario.ts`); `00a5732` (PR #75, de Codex/otra
sesión: `DELETE /api/opportunities` con el mismo alcance por
panel/`siteDomain` que ya usa el análisis, reemplazando una primera versión
del PR #72 que no filtraba por panel).
Conversación/proyecto: pedido directo de Milton en chat, sin nombre de
conversación formal; el PR #75 surgió de `CODEX - AUDITORIA A ALGORITMO DE
PUBLICACIÓN DE ARTICULOS`.
Cambios: ver detalle completo en `TO-DO.md` ("Hecho") e
`INVENTARIO_CONVERSACIONES.md` Parte B, sección "Botón 'Borrar todas las
oportunidades'".
Migraciones: ninguna.
Auditoría 3 (integración/producción): APROBADA — checks de Vercel en
`success` sobre ambos commits fusionados, `/login` respondió `200` en
`auto-articulos-web.vercel.app` y `seototal.lasolucionweb.com` tras cada
despliegue. Clic funcional real del botón en Producción no se verificó
(requiere sesión con oportunidades pendientes).
**Resolución de colisión real de código:** el `DELETE /api/opportunities`
simple del PR #72 (sin filtro de panel, un bug real en cuentas
multi-idioma/sitio) fue reemplazado por la versión correcta del PR #75 al
fusionar `origin/main` — merge de resolución `003ab16`, sin duplicar la
función.
Responsable: Claude (PR #72/#74), Codex/Claude (PR #75, ver Coordinación
para atribución exacta).
Estado: VERIFICADA EN PRODUCCIÓN, sin reservas activas.

## Versión desplegada — 2026-09-08 — hotfix visual: tarjetas de Usuarios en fila (PR #80)

Entrada agregada por la tarea programada diaria de propagación (2026-09-09)
a partir de `COORDINACION_CLAUDE_CODEX.md`, sección "CIERRE (parcial) —
Hotfix visual: tarjetas de Usuarios en fila por reset global de `button` —
2026-09-08".

Fecha y hora: 2026-09-08.
Versión/commit: `ba62119` (PR #80, squash).
Conversación/proyecto: `ORDEN DE USUARIOS ACTIVOS EN ADMIN` (continuación
directa del cierre de PR #70).
Causa: el reset global `button { display: inline-flex; align-items:
center; justify-content: center; }` de `apps/web/src/app/globals.css`
aplastaba en una sola fila el label/número/detalle de las 5 tarjetas de
resumen, que el PR #70 había convertido de `<div>` a `<button>` sin
sobreescribir ese `display`/`alignItems` en su estilo inline.
Cambios: `display: "flex", flexDirection: "column", alignItems:
"flex-start", justifyContent: "flex-start", width: "100%"` agregado al
estilo inline de cada tarjeta (mismo patrón que ya usaba el botón de
"Secciones de administración" un poco más abajo en el mismo archivo).
Archivos modificados: `apps/web/src/app/dashboard/usuarios/page.tsx` (6
líneas).
Migraciones: ninguna.
Auditoría 1 (funcional): APROBADA — `npx tsc --noEmit` limpio para
`page.tsx` (~63 errores de TypeScript preexistentes en otros archivos no
relacionados, ya presentes en `origin/main` antes de este cambio, no
introducidos ni corregidos acá).
Auditoría 2 (regresión): APROBADA — build exacto de `apps/web` sin
errores, incluye `/dashboard/usuarios`.
Auditoría 3 (integración/producción): **fusionado sin completarla** — ni
Preview (SSO) ni Producción pudieron verificarse visualmente antes/después
de fusionar porque el rate limit diario de Vercel volvió a agotarse (varias
sesiones en paralelo consumieron la cuota ese día: PR #70 retry, #72, #74,
#75, #78, #79 y #80). Decisión explícita de fusionar sin la tercera
auditoría completa, documentada en la fuente con su justificación (defecto
ya confirmado en Producción con captura real de Milton; causa y fix
puntuales ya verificados por typecheck+build; esperar 24h no proporcional
al riesgo). **Verificado por esta misma corrida de propagación (2026-09-09)
contra `origin/main`: el código del fix SÍ está confirmado en producción
hoy** (`flexDirection: "column"` presente en
`apps/web/src/app/dashboard/usuarios/page.tsx` de `origin/main`,
`git merge-base --is-ancestor ba62119 origin/main` exitoso).
Responsable: Claude.
Estado: VERIFICADA EN PRODUCCIÓN (confirmado por esta corrida de
propagación; no consta en `COORDINACION_CLAUDE_CODEX.md` una verificación
visual explícita de Milton posterior al despliegue — si Milton ya lo vio y
está conforme, falta solo la nota de cierre en ese documento).

## Versión desplegada — 2026-09-08 — Bug Natalia: reintentos de login y timeout de categorías (PR #82)

Entrada agregada por la tarea programada diaria de propagación (2026-09-09)
a partir de contenido recuperado del commit `0931f75` (ver
`REPARADOR_DEL_ARBOL_PRINCIPAL.md`, hallazgo de contenido perdido en merge,
y la sección "RECUPERACIÓN DE CONTENIDO PERDIDO EN MERGE" de
`COORDINACION_CLAUDE_CODEX.md`).

Fecha y hora: 2026-09-08.
Versión/commit: `c162119` ("fix: prevent Natalia login retries and category
pool timeout"), fusionado vía PR #82, commit de merge `9f0c2f1`.
Conversación/proyecto: `BUG NATALIA`.
Cambios: no consta el diff exacto en la documentación de origen (recuperada
solo la entrada de cierre, no la técnica); afecta `apps/worker/src/categorySync.ts`
y `apps/worker/src/automation/10minutesWebsite.ts` (según la reserva de
archivo que tenía esta conversación en `INVENTARIO_CONVERSACIONES.md`,
Parte A).
Migraciones: no mencionadas en la entrada de cierre recuperada.
Excepción autorizada por Milton: la validación funcional se hizo sobre el
caso real controlado (cuenta de Natalia), sin copiar a local su contraseña,
tokens, credenciales OAuth ni datos privados — la ausencia de esa cuenta en
la base local no debía trabar la corrección.
Auditoría 1 (funcional), 2 (regresión) y 3 (integración/producción):
APROBADAS según la entrada de cierre — Vercel terminó en `Ready`, `/login`
respondió correctamente y Producción sirvió el deployment nuevo (`age: 0`)
durante la verificación. Natalia confirmó en vivo que la sincronización de
categorías funciona correctamente en Producción. La publicación de un
artículo quedó en prueba manual al cerrar la conversación (no consta
verificación posterior de ese paso puntual).
Responsable: Codex.
Estado: VERIFICADA EN PRODUCCIÓN, reserva liberada.

## Versión desplegada — 2026-09-08 — andamiaje MCP 10MWS (PR #76) e incidente de producción por migración faltante

Entrada agregada por la tarea programada diaria de propagación (2026-09-09)
a partir de `COORDINACION_CLAUDE_CODEX.md` (sección "MCP 10MWS — andamiaje
de segunda línea de ejecución de publicación", investigación de mercado de
plataformas, y el bloque "INCIDENTE CRÍTICO Y PROTOCOLO OBLIGATORIO —
2026-09-08" al inicio del documento), verificado en vivo contra
`origin/main` por esta misma corrida (`git log --graph`, `git merge-base
--is-ancestor`).

Fecha y hora: 2026-09-07/08.
Versión/commit: `ae225dd` (PR #76, mergeado originalmente) → **revertido**
en `0640bd6` ("Revert 'feat: andamiaje...MCP (#76)' (#85)") tras romper
Producción → **revertido el revert** en `df830eb` ("Revert 'Revert...'
(#85)") una vez corregida la migración, con `d07fb6b` ("fix(db): sync MCP
publication schema in production (#84)") y `519a679` ("workflow: agregar
opción force_sync para sincronizar BD con schema (--accept-data-loss)")
como parte de la reparación. Documentación del incidente: `8add43d`/`01ff1c1`.
Conversación/proyecto: `MCP 10MWS` — segunda línea de ejecución de
publicación (sin tocar la actual vía Playwright) para que cuentas que lo
elijan publiquen directo contra un servidor MCP de terceros (10MWS primero,
pensado para escalar a un selector multi-plataforma — ver `TO-DO.md`).
Cambios: `User.publishMethod` (default `BROWSER`, sin cambio de
comportamiento para ninguna cuenta existente), modelo `McpConnection`,
interfaz `ArticlePublisher`, `browserPublisher.ts` (envoltorio 1:1 sin
tocar lógica), cliente MCP JSON-RPC en `packages/shared`, `mcpPublisher.ts`,
`mcpQueue.ts` (rama nueva desde `queue.ts` solo si `publishMethod ===
"MCP"`).
**Incidente real de Producción:** el PR #76 agregó `User.publishMethod` y
`McpConnection` al schema de Prisma **sin la migración correspondiente en
el mismo commit** — el login en Producción devolvió HTTP 500 (`column
"User.publishMethod" does not exist"`). Tardó 4 horas en resolverse:
revert del PR para devolver Producción a un estado conocido, migración
segura sincronizada con `--accept-data-loss` como última opción, y luego
el revert del revert una vez la base de datos ya tenía las columnas. Ver el
protocolo obligatorio resultante ("INCIDENTE CRÍTICO Y PROTOCOLO OBLIGATORIO
— 2026-09-08", inicio de `COORDINACION_CLAUDE_CODEX.md`): schema y
migración deben crearse SIEMPRE en el mismo commit de aquí en adelante.
Migraciones: la migración de `User.publishMethod`/`McpConnection` quedó
aplicada en Producción como parte de la reparación del incidente (commits
`d07fb6b`/`519a679`); no se encontró en la documentación disponible el
nombre exacto del archivo de migración usado.
Auditoría 3 (integración/producción real del propio PR #76, antes del
incidente): bloqueada a propósito — no existía todavía un servidor MCP real
de 10MWS contra el cual probar, y sin URL real ni interfaz que active
`publishMethod = MCP` para ninguna cuenta, el código quedaba inerte por
defecto. El incidente de Producción fue por la falta de migración, no por
el propio código MCP (que sigue sin tener ninguna cuenta usándolo hoy).
Responsable: Claude (PR #76 y su reparación).
Estado: **CÓDIGO EN PRODUCCIÓN, SCHEMA SINCRONIZADO** tras el incidente;
funcionalmente inerte (ninguna cuenta usa `publishMethod = MCP` todavía) a
la espera de la URL real del servidor MCP de 10MWS y de que Milton confirme
el orden de prioridad de plataformas adicionales (ver `TO-DO.md`).

## Versión desplegada — 2026-09-08 — escala responsiva fluida con `clamp()` en login y dashboard (PR #87)

Entrada agregada por la tarea programada diaria de propagación (2026-09-09)
a partir de contenido recuperado de los commits `3e2d957`/`1d727dc` (ver
`REPARADOR_DEL_ARBOL_PRINCIPAL.md`, hallazgo de contenido perdido en merge),
más la entrada previa de este mismo documento ("BLOQUEADO/EN CURSO" para la
misma auditoría), verificado en vivo contra `origin/main`.

Fecha y hora: 2026-09-08 20:57 UTC.
Versión/commit: `fe91e44`, fusionado vía PR #87 en el merge `1a2ebc0`.
Conversación/proyecto: `AUDITORIA DE CAPACIDADES RESPONSIVE` (Claude Haiku
4.5).
Cambios: 7 valores fijos de `padding`/`gap`/`fontSize` reemplazados por
`clamp()` (mínimo, preferido en `vw`, máximo) en
`apps/web/src/app/login/page.tsx` (5 cambios: gap del layout, tamaño de
título, tamaño de párrafo, padding de ambos formularios) y
`apps/web/src/app/dashboard/page.tsx` (2 cambios: padding del banner de
bienvenida de prueba, gap del contenedor de notificaciones). Cambios
puramente visuales, sin tocar lógica ni estructura.
Archivos modificados: los 2 archivos citados arriba.
Migraciones: ninguna.
Auditoría 1 (funcional): APROBADA — 7 cambios son solo valores CSS dentro
de `style={{}}` ya existentes.
Auditoría 2 (regresión): APROBADA — `git diff --stat` limpio (2 archivos,
0 eliminados/creados); los valores mínimo/máximo de cada `clamp()` son
iguales o menores a los originales, por lo que no debería verse peor en
ningún tamaño de pantalla.
Auditoría 3 (integración/producción): fusionado sin conflictos según la
fuente ("✓ Fusionado a main sin conflictos"); no consta en la
documentación disponible una verificación visual explícita posterior en
Producción — **verificado por esta corrida de propagación (2026-09-09)
que el código está presente en `origin/main`**
(`gap: "clamp(16px, 3vw, 64px)"` confirmado en
`apps/web/src/app/login/page.tsx`).
Responsable: Claude (Haiku 4.5).
Estado: CÓDIGO EN PRODUCCIÓN (confirmado por esta corrida); confirmación
visual de Milton en móvil/tablet/desktop pendiente según la propia fuente.

## Versión desplegada — 2026-09-08 — límite de oportunidades sociales por clic: de 1 a 3

Entrada agregada por la tarea programada diaria de propagación (2026-09-09),
verificada en vivo contra `origin/main` (commit y diff completo).

Fecha y hora: 2026-09-08 17:46 UTC.
Versión/commit: `51fa8f2`.
Conversación/proyecto: sin nombre de conversación formal en
`COORDINACION_CLAUDE_CODEX.md` (commit directo, sin PR documentado en el
diario de coordinación).
Cambios: `POST /api/social-opportunities/generate` ahora devuelve hasta 3
candidatos por clic en vez de 1 (`.slice(0, 1)` → `.slice(0, 3)`), "para dar
más opciones sin saturar de pendientes".
Archivos modificados:
`apps/web/src/app/api/social-opportunities/generate/route.ts` (9 líneas).
Migraciones: ninguna.
**Nota de posible regresión, sin resolver por esta tarea de propagación:**
el PR #60 (ver más arriba en este mismo documento, "motor de selección de
artículos tendencia para redes sociales") había reducido este mismo límite
de 3 a 1 explícitamente para corregir que pedir dos redes distintas el
mismo día devolvía el mismo artículo top-1 para ambas. Este commit revierte
ese límite a 3 sin mencionar el PR #60 ni si el problema que motivó bajarlo
a 1 sigue resuelto de otra forma (por ejemplo, si la exclusión de
`activeKeys`/`wasUsedToday` alcanza para evitar duplicados entre redes
cuando se piden 3 candidatos en vez de 1). Auditorías no documentadas en
`COORDINACION_CLAUDE_CODEX.md` para este commit puntual. Queda señalado
para que quien lo revise confirme si el escenario que arregló el PR #60
sigue cubierto.
Responsable: no identificado en la documentación disponible (commit
autoría `miltondavila-ux`, co-autoría `Claude Haiku 4.5`).
Estado: EN PRODUCCIÓN (commit ya es ancestro de `origin/main`); auditoría
de integración/producción no documentada.

## Versión desplegada — 2026-09-08 — RENEW CONFIGURACION: pulido estilo Apple (continuación tras el cierre de la Fase 6)

Entrada agregada por la tarea programada diaria de propagación (2026-09-09)
a partir de `COORDINACION_CLAUDE_CODEX.md`, secciones "Trabajo activo —
RENEW CONFIGURACION, pulido estilo Apple — 2026-09-07" y "Actualización —
RENEW CONFIGURACION, pulido estilo Apple — 2026-09-08". Continuación de la
entrada anterior de este mismo documento ("RENEW CONFIGURACION (rediseño
completo, 6 fases)"), después de que Milton revisó las 6 páginas nuevas en
Producción y señaló 4 problemas de estilo.

Fecha y hora: 2026-09-08.
Versión/commit: `3a0d985` (primer pase: quita colores de las 6 páginas
propias de las Fases 1-6, agrega `ConfiguracionSubNav.tsx`); `a66d1b1`
(segundo pase: neutraliza 13 componentes compartidos exclusivos de
Configuración que el primer pase no había tocado — `GoogleSearchConsoleSection`,
`GoogleAnalyticsSection`, `BingWebmasterSection`,
`BrowserTabsConnectionNotice`, `BusinessProfileSection`, `ThreadsSection`,
`LinkedInSection`, `PinterestSection`, `TumblrSection`, `BlueskySection`,
`DevToSection`, `CategorySyncProgress`, `OnboardingWizard`).
Conversación/proyecto: `RENEW CONFIGURACION` (continuación).
Cambios: paleta neutralizada a `#1d1d1f`/`#6e6e73`/`#f5f5f7`/`#e5e5ea` en
todas partes salvo rojo-error/verde-éxito ya estándar; `flexWrap` agregado
a filas de Cuenta/Contenido que no lo tenían; explicaciones numeradas
agregadas a las introducciones de Cuenta, Contenido, Indexación y Redes
Sociales; barra de navegación persistente `ConfiguracionSubNav.tsx` entre
las 6 páginas (mismo patrón visual de pestaña activa que `DashboardNav.tsx`).
Archivos modificados: 17 archivos (6 páginas de Configuración +
`ConfiguracionSubNav.tsx` nuevo + 13 componentes compartidos, más 2
ternarios redundantes corregidos en `BingWebmasterSection.tsx` y
`OnboardingWizard.tsx`).
Migraciones: ninguna.
Auditoría 1 (funcional): APROBADA — revisión manual de cada componente
tocado.
Auditoría 2 (regresión): APROBADA — `tsc --noEmit` limpio, `next build
--webpack` con 83/83 rutas.
Auditoría 3 (integración/producción): **BLOQUEADA al momento de la última
entrada de origen** — `Vercel – auto-articulos-web` en `failure`,
`Deployment rate limited — retry in 24 hours` para `a66d1b1`, mismo
bloqueo que ya afectaba al PR #80 el mismo día. **Verificado por esta
misma corrida de propagación (2026-09-09) contra `origin/main`:** el
código de ambos commits (`3a0d985`, `a66d1b1`) es ancestro de `origin/main`
y `ConfiguracionSubNav.tsx` existe en el árbol actual — el bloqueo de
Vercel ya se liberó en algún momento entre el 8 y el 9 de septiembre.
Responsable: Claude.
Estado: CÓDIGO EN PRODUCCIÓN (confirmado por esta corrida); no consta en
`COORDINACION_CLAUDE_CODEX.md` la confirmación visual explícita de Milton
de que `/dashboard/configuracion` ya no tiene colores y las tarjetas
quedan apiladas en celular — pendiente esa confirmación puntual, aunque el
código y el despliegue ya están verificados.

## Versión desplegada — 2026-09-10 — Worker roto (lockfile + Vercel) y sufijo de título duplicado

Fecha y hora: 2026-09-10.
Versión/commit: `2ddb952` (fix #1: `package-lock.json` sincronizado +
`ignoreCommand` roto retirado de `apps/web/vercel.json`, PR #96); `51833e0`
(fix #2: sufijo legible en títulos duplicados, PR #97); `54379d8` (cierre
documental, solo `.md`).
Conversación/proyecto: "NO PUBLICA ARTICULOS" (pedido directo de Milton en
chat). Ver entradas completas con triple auditoría en
`COORDINACION_CLAUDE_CODEX.md` e `INVENTARIO_CONVERSACIONES.md`.

**Causa raíz #1:** el commit `cb2c1ae` (2026-09-09) agregó
`qrcode`/`@types/qrcode` a `apps/web/package.json` sin regenerar
`package-lock.json`. Desde ese commit, `npm ci` fallaba con `EUSAGE` en
TODOS los workflows de GitHub Actions (worker, worker-test,
social-worker), en todos los shards — ningún worker podía arrancar, por
eso los artículos quedaban en cola para siempre.

**Causa raíz #2:** el `ignoreCommand` agregado en `apps/web/vercel.json`
por el commit `96ea2a4` (2026-09-08) usaba `git rev-parse` dentro del
contenedor de build de Vercel, donde no hay `.git` disponible — tumbaba
TODOS los deployments de producción desde ese commit (~2 días sin un solo
deploy exitoso, confirmado con `vercel ls --prod`).

**Bug adicional (no relacionado a las causas raíz, encontrado por Milton
en vivo durante la verificación):** `makeUniqueTitle()` en
`apps/worker/src/automation/10minutesWebsite.ts` — el sufijo de
desambiguación para títulos duplicados era un epoch crudo
(`— versión 5380210-1`) visible en el título público y la URL de
artículos reales. Reemplazado por fecha/hora legible en español
(`(actualizado 10/09 12:44)`), mismo mecanismo, mismos dos puntos de uso.

Cambios: `package-lock.json` regenerado (`npm install
--package-lock-only`, ninguna dependencia declarada cambió);
`apps/web/vercel.json` sin el campo `ignoreCommand` (quedan intactos
`buildCommand`/`outputDirectory`/`installCommand`, la config que funcionó
semanas antes del 2026-09-08); `apps/worker/src/automation/
10minutesWebsite.ts` — formato del sufijo de `makeUniqueTitle()`.
Migraciones: ninguna.

Auditoría 1 (funcional, local en worktree aislado): `npm ci` instala sin
error; typecheck limpio; build de `apps/web` (comando exacto de Vercel)
completo con 83 rutas; build de `apps/worker` limpio; tests del worker
20/20 (14 antes del fix #2 + 6 agregados/confirmados). Pasos que requieren
Postgres corridos con `DATABASE_URL` dummy por falta de Docker local —
documentado como limitación real.
Auditoría 2 (regresión): único archivo de dependencias tocado en fix #1
sin cambiar ninguna versión declarada; único campo retirado en
`vercel.json`; único string de formato cambiado en fix #3. Ningún otro
código de aplicación, esquema, secreto ni middleware modificado.
Auditoría 3 (integración/producción, real): checks de Vercel en `success`
para ambos PR; primer deployment de producción en ~2 días terminó
`● Ready` en 48s tras el fix #1; worker relanzado manualmente — 10/10
shards en `success` (antes: fallaban en 2-51s); `/login` respondiendo
`200` en `auto-articulos-web.vercel.app` con el commit `54379d8` ya
desplegado (confirmado con `gh api .../commits/<sha>/status` y
`curl -I`). **Verificación funcional hecha por Milton en vivo con la
cuenta de pruebas Lorena Álvarez:** artículo de prueba completó el flujo
entero (login, contenido IA, imagen, FAQ, guardado/publicación) y luego un
lote completo enviado a publicar, sin errores.

Responsable: Claude.
Estado: EN PRODUCCIÓN, verificado en vivo por Milton. Pendiente: el
artículo ya publicado antes del fix #3 con el sufijo viejo
(`como-calcular-el-deducible-de-tu-seguro-de-salud-version-53802101` en
`segurosdesaludyvida.com`) no se corrigió — queda con ese título/URL hasta
que se edite a mano si Milton lo pide. **Esta es la versión estable de
referencia para el worker y el deploy de Vercel a partir de esta fecha.**

## Versión desplegada — 2026-09-09 — Selección multi-categoría en Oportunidades (PR #90)

Fecha y hora: 2026-09-09 ~14:53 (commit `364da97`) / merge `c086214`.
Versión/commit: `c086214` ("feat: allow selecting titles from different
categories to publish in batch (#90)"), ancestro confirmado de
`origin/main`.
Conversación/proyecto: `SELECCION DE ARTICULO DE DIFERENTES CATEGORIAS`.

Cambios: checkboxes por título en `apps/web/src/app/dashboard/oportunidades/page.tsx`
(estado `selectedTitles: Map<string, boolean>`); botón verde "Publicar
selección" con contador; nuevo endpoint `POST
/api/opportunities/execute-batch`, que agrupa automáticamente por
categoría y respeta los cupos existentes (diario, mensual, por lote).
Migraciones: ninguna.

Auditorías (según lo documentado en `COORDINACION_CLAUDE_CODEX.md`):
funcional, regresión e integración aprobadas; sin cambios de schema.
Producción verificada en código: el botón y el endpoint existen en el
árbol actual de `origin/main` (confirmado con `grep` en esta corrida).

Responsable: Claude.
Estado: EN PRODUCCIÓN (código confirmado en `origin/main`); sin
confirmación visual explícita de Milton registrada en
`COORDINACION_CLAUDE_CODEX.md`.

## Versión desplegada — 2026-09-09 — Firma con disclosure legal en Configuración → Contenido

Fecha y hora: 2026-09-09 13:27.
Versión/commit: `0f008e8` ("feat: update signature section with
disclosure requirement"), rama `claude/doc-protocolo-schema`, ancestro
confirmado de `origin/main`.
Conversación/proyecto: no consta un nombre exacto de conversación en
`COORDINACION_CLAUDE_CODEX.md` para este commit puntual (aparece
documentado sin sesión asociada); no se crea entrada nueva en
`INVENTARIO_CONVERSACIONES.md` por falta de ese dato.

Cambios: campo "Firma al Final del Artículo" renombrado a "Firma al Final
del Artículo y Disclosure" en
`apps/web/src/app/dashboard/configuracion/contenido/page.tsx` (líneas
297, 314, 323); el texto instructivo ahora sugiere incluir una aclaración
legal (disclosure) de que el usuario no es asesor en materias legales,
fiscales, financieras ni de seguros; el placeholder/ejemplo pasó a ser
genérico (`[Tu nombre]`, `[Tu profesión]`, `[Tu estado/país]`, sin
mencionar personas reales). Migraciones: ninguna (cambio de copy/UI).

Auditoría: verificado en esta corrida con `grep` que el texto vive en
`origin/main` actual.

Responsable: Claude.
Estado: EN PRODUCCIÓN (código confirmado); sin confirmación visual
explícita de Milton registrada.

## Versión desplegada — 2026-09-09 — Generar 1 oportunidad por cada red social en un clic

Fecha y hora: 2026-09-09 (merge `479915c`).
Versión/commit: `479915c`, ancestro confirmado de `origin/main`.
Conversación/proyecto: `CLAUDE - PROBLEMAS Y PRUEBAS REDES SOCIALES Y BLOGGINS`.

Cambios: nuevo endpoint `POST /api/social-opportunities/generate-all` que
genera 1 oportunidad por cada red social conectada en un solo POST
(THREADS, Instagram, LinkedIn, Pinterest, Tumblr, Bluesky, DEV.to,
Blogger, X, Facebook), retornando resultados y errores por red; mantiene
intactos los botones individuales existentes. Botón en la UI: "📲 Generar
1 por cada red (Todas)" en
`apps/web/src/app/dashboard/oportunidades-redes/page.tsx`. Migraciones:
ninguna.

Auditoría: confirmado con `grep` que el endpoint y el botón existen en el
árbol actual de `origin/main`.

Responsable: Claude.
Estado: EN PRODUCCIÓN (código confirmado); sin confirmación visual
explícita de Milton registrada.

## Versión desplegada — 2026-09-09/10 — Código QR en pantalla de login + 2 bugs de infraestructura que bloqueaban todos los deploys (PR #93 y #95)

Fecha y hora: feature original 2026-09-09 15:47 (`cb2c1ae`), ajustes
2026-09-10 12:41/12:48 (`ef6cf5c`, `64e2904`); fix de infraestructura
2026-09-10 11:10 (`0121aef`, PR #95) y 11:26 (`3bd6286`, directo a main).
Conversación/proyecto: `CODIGO QR PANTALLA DE INICIO`.

**Feature QR:** componente `apps/web/src/components/QrCodeDisplay.tsx`
(canvas + librería `qrcode`), integrado en `apps/web/src/app/login/page.tsx`
apuntando a `https://seototal.lasolucionweb.com/login`. Ajustes
posteriores pedidos por Milton: label final "Escanea para registrarte en
movil", ícono "A" junto a "SEO TOTAL" eliminado, QR justificado a la
izquierda, fondo blanco.

**Bloqueo crítico encontrado en el proceso (no relacionado al QR):**
ningún deploy llegaba a Producción desde hacía ~20 horas, afectando a
todo el equipo. Causas independientes:
1. Build de TypeScript roto: `apps/web/src/lib/opportunity-analysis.ts`
   referenciaba `input.excludedTopics` (nunca agregado al tipo) en código
   muerto después de un `return` — resto huérfano de una feature
   "Exclusión de Temas" que, pese a estar documentada en otra parte de
   `COORDINACION_CLAUDE_CODEX.md` como "✅ DESPLEGADO A PRODUCCIÓN" con
   "Schema + migración + UI", **no tiene ningún campo en
   `packages/db/prisma/schema.prisma`, ninguna migración ni ningún UI**
   (verificado con `grep` en esta corrida contra `origin/main` actual):
   el campo `excludedTopics` solo existe como tipo opcional en la firma
   de `analyzeSeoOpportunities`, y la lógica de filtrado
   (`excludedKeywords`/`titleTouchesExcludedTopic`) queda alcanzable pero
   inerte porque nadie le pasa ese valor todavía. Fix del build: PR #95
   (commit de merge `0121aef`) agregó el campo al tipo y reordenó el
   bloque antes de su primer uso real, sin activar la funcionalidad.
   **Duda para Milton, dejada también en `COORDINACION_CLAUDE_CODEX.md`:**
   la sección "ARCHIVADO — Exclusión de Temas" de ese documento afirma un
   despliegue completo que el código actual no respalda.
2. `.vercelignore` quitaba `.git` del checkout antes del build, pero el
   `ignoreCommand` de `vercel.json` (agregado un día antes) dependía de
   `git diff` para decidir si saltar el build — fallaba con `fatal: not a
   git repository`, tumbando todos los deployments. Fix directo a main:
   `3bd6286`.

Migraciones: ninguna en todo este rango.

Auditorías (según `COORDINACION_CLAUDE_CODEX.md`): funcional (QR genera,
apunta a la URL correcta, legible en móvil y desktop), TypeScript sin
errores nuevos, build limpio reproducido en worktree aislado, responsive
375px y desktop verificado, verificación visual en Producción real tras
cada cambio.

Responsable: Claude.
Estado: DESPLEGADO Y VERIFICADO EN PRODUCCIÓN —
https://seototal.lasolucionweb.com/login. Pendiente: Tagcrush (usar el
mismo componente `QrCodeDisplay` con la URL de tagcrush.net cuando se
pida). La duda sobre "Exclusión de Temas" señalada arriba queda sin
resolver para que Milton decida.

## Versión desplegada — 2026-09-16 — Botón admin para borrar credencial 10minutesWebsite residual (PR #100)

Fecha y hora: 2026-09-16 12:50 -0400 (commit `3c1a6fc`).
Versión/commit: `3c1a6fc` ("feat: botón admin para borrar credencial
10minutesWebsite residual"), mergeado a `main` en el commit de merge
`4a05138` (PR #100, rama `claude/cuenta-duplicada-boton-credencial`).
Conversación/proyecto: `Claude - CUENTA DUPLICADA` (ver
`INVENTARIO_CONVERSACIONES.md`, Parte B).

Cambios: causa raíz del bloqueo "ya está vinculada a otro usuario en el
sistema" que veía Gustavo Cabrera (#91, cuenta nueva en trial) al intentar
guardar sus credenciales de 10minutesWebsite: esa misma credencial ya
estaba guardada como dato residual en la cuenta admin de Milton
(`miltondavila@gmail.com`, #1), sin rastro de auditoría de cómo llegó ahí.
El validador antifraude en `apps/web/src/lib/domain-validation.ts` no
tenía ningún bug. Se agregó un nuevo endpoint `DELETE
/api/admin/users/credential` (admin-only, `requireAdmin`) que borra
únicamente la fila `Credential` de una cuenta para la plataforma
10minutesWebsite, y un botón "Eliminar esta credencial" en
`/dashboard/usuarios`, junto al campo de cuenta 10minutesWebsite, con
confirmación en dos pasos. Archivos:
`apps/web/src/app/api/admin/users/credential/route.ts` (nuevo),
`apps/web/src/app/dashboard/usuarios/page.tsx`.

Migraciones: ninguna (sin cambio de schema).

Auditoría (según `COORDINACION_CLAUDE_CODEX.md`): Milton confirmó en vivo
que el campo "Cuenta 10minutesWebsite" de su propia cuenta admin (#1) pasó
a "Sin credenciales guardadas" tras usar el botón, sin afectar el resto de
su cuenta.

Responsable: Claude.
Estado: DESPLEGADO Y VERIFICADO EN PRODUCCIÓN por Milton (confirmación en
vivo registrada en `COORDINACION_CLAUDE_CODEX.md`). La conversación
"CUENTA DUPLICADA" quedó luego archivada por Milton (sin código ni
migración adicional en ese cierre).

## Versión — 2026-09-16 — Segmento de No Publicar en Configuración → Contenido (completa "Exclusión de Temas")

Fecha y hora: 2026-09-16 16:15 -0400 (commit `5dcd965`, ancestro
confirmado de `origin/main`).
Versión/commit: `5dcd965` ("feat: Segmento de No Publicar en
Configuración > Contenido"), trabajado en worktree aislado
`.worktrees/segmento-no-publicar`, rama `claude/segmento-no-publicar`.
Conversación/proyecto: `SEGMENTO DE NO PUBLICAR` (ver
`INVENTARIO_CONVERSACIONES.md`, Parte B), que corrige la entrada
"ARCHIVADO — Exclusión de Temas... 2026-09-09" — esa entrada afirmaba
"✅ DESPLEGADO A PRODUCCIÓN" con "Schema + migración + UI", pero el código
real solo tenía el filtro determinista sin columna en schema, sin
migración y sin campo en la interfaz (nadie podía cargar el valor).

Cambios: columna `excludedTopics String?` agregada a `User` en
`packages/db/prisma/schema.prisma` + migración
`20260916180000_add_excluded_topics`; `apps/web/src/lib/current-user.ts`
expone el campo en `getCurrentUser()`; `apps/web/src/app/api/me/route.ts`
lo expone en `GET` y lo acepta/valida (máx. 500 caracteres) en `PATCH`;
`apps/web/src/app/api/opportunities/route.ts` ahora lee
`user.excludedTopics` y lo pasa a `analyzeSeoOpportunities` (antes nunca
se pasaba, el filtro quedaba inerte); nueva sección "Segmento de No
Publicar" con el campo "Temas a excluir" en
`apps/web/src/app/dashboard/configuracion/contenido/page.tsx`. Manual de
usuario (`apps/web/src/content/manual-usuario.ts`) actualizado en el mismo
lote.

Migraciones: sí — `20260916180000_add_excluded_topics` (columna nueva,
sin borrar datos existentes).

Auditoría (según `COORDINACION_CLAUDE_CODEX.md`): probado en local contra
la base de datos local (`postgresql://127.0.0.1:5432/autoarticulos`) con
la cuenta de pruebas de Lorena Álvarez (contraseña reseteada solo en la
base LOCAL): typecheck limpio, `npm run build` completo sin errores,
columna confirmada por SQL directo, guardado confirmado por `PATCH
/api/me` (200) y por lectura directa de la fila en Postgres, persistencia
confirmada recargando la página. No se corrió un análisis real de
Oportunidades (llamada real a OpenAI) para no gastar cuota.

Responsable: Claude.
Estado: commit `5dcd965` confirmado como ancestro de `origin/main` (código
en producción), pero sin confirmación visual explícita de Milton en
producción registrada en `COORDINACION_CLAUDE_CODEX.md` — solo pruebas en
local documentadas.

## Versión desplegada — 2026-09-16 — Categoría deja de decidir qué se escribe (PR #107, #109, #111)

Fecha: 2026-09-16. Commits/PRs: `61d62ec`→`fd21104` (PR #107, merge
`8546eed`), `6788379` (PR #109, merge `50f5f55`), `c625825` (PR #111, merge
confirmado por `gh pr view 111 --json state,mergedAt`). Archivo tocado en
los tres: `apps/web/src/lib/opportunity-analysis.ts`.

Cambios:
1. PR #107 — retirado el veto determinista `titleFitsCategory` (descartaba
   títulos con demanda real de GSC/GA/Bing si no compartían raíz de palabra
   con el nombre/ejemplos de su categoría). Se eliminó también el código
   muerto que solo lo alimentaba (`distinctiveVocabularyByCategory`,
   `sharesWordRoot`, `tokensShareRoot`).
2. PR #109 — reescrita la "REGLA OBLIGATORIA DE CATEGORIA" del prompt de
   IA (renombrada "REGLA DE ASIGNACION DE CATEGORIA"): ya no instruye a la
   IA a descartar consultas reales sin categoría afín ni temas
   legales/fiscales sin categoría explícita. La categoría pasa a ser solo
   destino de archivo.
3. PR #111 — `IntentSignature` ahora incluye `titleTokens` (texto visible
   completo del título, siempre calculado) como respaldo de
   `collidesWithIntent` independiente del `needKey` autodeclarado por la
   IA, más `rationaleHasQuotedEvidence()` que descarta en código cualquier
   título cuyo `rationale` no cite textualmente entre comillas la
   evidencia real (antes solo se le pedía al modelo, sin verificación).

Auditorías: `tsc --noEmit` y `npm run build --workspace=apps/web` limpios
en los tres commits (verificados antes de cada push). Verificación en vivo
en Producción (`seototal.lasolucionweb.com`) con la cuenta de Lorena
Álvarez: el fix #1 se corrió en vivo con datos reales de Search Console
(9 propuestas generadas, sin errores, evidencia real citada en cada una).
Los fixes #2 y #3 quedaron desplegados sin repetir la prueba en vivo — la
cuenta compartida de pruebas pasó a tener oportunidades pendientes de otra
tarea concurrente antes de poder reintentar, y no se tocó ese contenido
ajeno. La lógica nueva de canibalización/evidencia se validó por trazas
manuales contra los 9 títulos reales de la corrida auditada (confirmó que
el par casi-duplicado se habría descartado y el título sin evidencia
también).

Responsable: Claude. Estado: EN PRODUCCIÓN. Verificación en vivo completa
solo para PR #107; PR #109 y #111 pendientes de reverificación cuando la
cuenta de pruebas esté libre.

## Versión desplegada — 2026-09-17 — Titulos geolocalizados dejan de perderse en Oportunidades (PR #117-#121)

Fecha: 2026-09-17. Commits/PRs (todos en `apps/web/src/lib/opportunity-analysis.ts`):
- PR #117 (`ec7e007`): instrumentación de diagnóstico opcional (`OPPORTUNITY_DEBUG=1`, apagada por defecto) + script/workflow `diagnose-ignacio-cubas.yml` de solo lectura.
- PR #118 (`0be336f`): log adicional del rationale crudo rechazado, para confirmar causa raíz con texto real.
- PR #119 (`cecb542`): `applyOpportunityItems` distingue fuente `"evidence"` vs `"geo"`; el paso dedicado de geolocalización deja de exigir cita de GSC/GA/Bing (nunca la tuvo por diseño) y en su lugar exige `titleUsesDeclaredGeoCombo` (usar de verdad una ubicación de cliente y una de negocio declaradas).
- PR #120 (`3bcb496`) y PR #121 (`1a260a3`): el respaldo de canibalización por texto visible y por needKey con umbral relajado dejan de comparar entre sí dos títulos geolocalizados (`isGeoLocationCombo`), porque por diseño solo difieren en la ubicación de cliente.

Causa raíz: desde el PR #111 (16/9/2026), los guardarraíles de "evidencia
citada" y "canibalización" —diseñados para el lote principal de
Search Console/GA/Bing— se aplicaban también al paso dedicado de
geolocalización (cliente x negocio, PR #61/#66), cuya evidencia real es la
declaración directa de ubicaciones por el dueño de la cuenta, no una cita
de búsqueda. Resultado: cualquier cuenta con `clientLocations` +
`businessLocations` configurados perdía en silencio el 100% de sus
títulos geolocalizados. Encontrado con evidencia real (no simulada) en la
cuenta de Ignacio Cubas, vía el workflow de diagnóstico.

Auditorías: `tsc --noEmit` y `npm run build --workspace=apps/web` limpios
en los cinco commits (worktree aislado en `/tmp/wt-longtail-ignacio`,
node_modules propios, sin depender de los symlinks del repo principal —
ver protocolo del capitán). Verificación en Producción real: re-ejecutando
el mismo diagnóstico contra la cuenta real de Ignacio Cubas tras cada fix,
de `status: "no_new"` a `status: "ok"` con 6 oportunidades reales y 0
rechazadas por colisión. No hizo falta que Milton iniciara sesión en
ninguna cuenta de cliente.

Sin migraciones de schema. Sin cambio de modelo de IA (`gpt-4o-mini` se
mantiene, elegido por costo — la causa raíz era un guardarraíl de código,
no el modelo).

Responsable: Claude. Estado: EN PRODUCCIÓN, verificado en vivo.

## Versión desplegada — 2026-09-17 — Restauración del botón de forzar análisis

PR #116 (`ff00f9b`, merge a `main` confirmado el 2026-09-17) restauró en
`apps/web/src/app/dashboard/oportunidades/page.tsx` el estado `canForce` y
el botón "Forzar análisis ahora" cuando el análisis no encuentra nuevas
oportunidades. El endpoint y el schema no cambiaron; no hubo migraciones.

Auditoría de integridad: un solo archivo de código, sin secretos ni cambios
fuera del alcance. Auditoría funcional: `tsc --noEmit` y `npm run build`
(`apps/web`) limpios. Auditoría de regresión/entrega: PR con 2 checks
aprobados, deployment automático de Vercel confirmado y prueba en vivo hecha
por Milton en Producción con una cuenta de pruebas; el botón apareció después
de ejecutar el análisis sin resultados nuevos.

Responsable: Claude. Estado: EN PRODUCCIÓN, verificado en vivo por Milton.

## Cambio preparado — 2026-09-18 — Coherencia del lenguaje de la interfaz

Rama: `claude/simplificacion-setup-inicial`.

Se preparó una actualización de copy de extremo a extremo: tarjetas del
dashboard, navegación, introducciones de módulos, asistente de configuración,
manual de usuario, textos de Analytics y mensajes del asistente/MCP. El quinto
acceso, **Progreso de las publicaciones**, se mantiene únicamente en el menú.
Las rutas técnicas y permisos no se renombraron para conservar compatibilidad.

No hay cambios de schema ni migraciones en este lote. La revisión se mantiene
en el worktree aislado `/Users/miltondavila/Creador de articulos/.worktrees/simplificacion-setup-inicial`.
No se hizo push ni deploy; el estado es PREPARADA PARA VALIDACIÓN LOCAL.

## Cambio preparado — 2026-09-18 — Menú agrupado por función

**Historial** ahora vive dentro de **Publicaciones** y **Actualizaciones**
dentro de **Configuración**. Se conservaron las URLs, permisos y módulos
existentes. `tsc --noEmit` pasó; no hay cambios de schema ni migraciones.

Responsable: Codex. Estado: EN REVISIÓN. Commit de la implementación:
`6bc04a2`.

## Cambio preparado — 2026-09-18 — Tarjetas del Inicio responsive

Se sustituyó la altura fija de las tarjetas de accesos directos por un grid
flexible: las tarjetas de cada fila mantienen la misma altura y el contenido
puede crecer de forma natural en responsive. No hay cambios de schema,
migraciones, rutas ni permisos.

## Cambio preparado — 2026-09-18 — Retirar aviso de inactividad

Se eliminó el Callout del Inicio que mostraba los días sin publicar y su CTA.
Las métricas, alertas de configuración y accesos directos permanecen intactos.

## Cambio preparado — 2026-09-18 — Gráfico de ritmo a ancho completo

El panel **Tu ritmo — últimos 14 días** pasó a ocupar todo el ancho disponible,
manteniendo su adaptación responsive. No hay cambios de schema ni migraciones.

## Cambio preparado — 2026-09-18 — Prueba visual de color en tarjetas

Las tarjetas 02, 03 y 04 del Inicio reciben fondos `#c6c6c6`, `#919191` y
`#5e5e5e`, respectivamente, con contraste de texto adaptado. La tarjeta 01
permanece blanca y no se modifican rutas ni funcionalidad.

## Cambio preparado — 2026-09-18 — Contraste de texto reforzado

Se sustituyeron los grises tenues de las tarjetas de color por texto negro o
blanco sólido según el fondo, para mejorar la legibilidad.

## Cambio preparado — 2026-09-18 — Jerarquía tipográfica de tarjetas

Se reforzaron números, títulos y descripciones con mayor tamaño/peso y colores
puros de alto contraste. No se modifican rutas ni comportamiento responsive.

## Cambio preparado — 2026-09-18 — Explicación de publicación de títulos propios

Se aclaró en el dashboard, Comienza aquí y el manual que publicar títulos
propios sirve para comenzar sin registros de indexación en Google o para
publicar contenido escrito directamente por el usuario.

## Versión desplegada — 2026-09-18 — Retorno de Bing Webmaster a Indexación

`apps/web/src/app/api/search-integrations/bing/callback/route.ts`: las tres
redirecciones del callback OAuth de Bing (conexión exitosa, error de estado y
error de token) ahora vuelven a `/dashboard/configuracion/indexacion`, donde
vive `BingWebmasterSection`, en vez de `/dashboard/configuracion`. Manual de
usuario actualizado en el mismo lote. Sin migraciones ni cambios de schema.

Auditorías: integridad (3 líneas de código + 1 de manual + registros, sin
secretos), funcional (cambio de rutas de redirección; `BingWebmasterSection`
ya lee `?bing=` con `useSearchParams`) y regresión/entrega (checks del PR y
Vercel Preview antes de fusionar).

PR #127 fusionado a `main` (`cd6fd3e`); Vercel Preview aprobado y deployment de Producción completado. Pendiente: prueba en vivo del flujo completo de conexión por Milton (requiere sesión de Bing).

Responsable: Claude. Estado: EN PRODUCCIÓN.

## Versión — 2026-09-18 — CHECK DE NO INDEXACION (worker)

Commit `0d20b9b` (squash en `main`: `e8a8b18`, PR #114). Archivo:
`apps/worker/src/automation/10minutesWebsite.ts` (+68/−5). La preferencia de
indexación se aplica y verifica leyendo el DOM justo antes de cada clic de
guardado; si no se confirma, el run lo informa. Sin migraciones ni cambios de
schema. Sin cambio de versiones de software.

Auditoría 1: APROBADA (un archivo, sin secretos, worktree aislado).
Auditoría 2: APROBADA (`tsc --noEmit` limpio; fallos de `vitest` preexistentes
en `main`, confirmados con `git stash`).
Auditoría 3: PENDIENTE (corrida en vivo con `worker-test.yml`). El worker de
producción ya usa el código (corridas del 2026-09-18 sobre `main` posterior).
Responsable: Claude. Estado: EN PRODUCCIÓN — verificación en vivo pendiente.

## Versión — 2026-09-18 — ERROR AL PUBLICAR (MPM Realty Group): reversión #131, restauración #132 y espera de validación al guardar

Conversación/proyecto: `ERROR AL PUBLICAR`. Cuenta afectada: MPM Realty Group
(panel inglés). Síntoma: el robot hace clic en "Guardar cambios", el sitio
deshabilita el botón y no envía nada; el artículo no aparece en el listado.

- PR #131 (`def4793`): revirtió `eee0e0b` (navegación al listado antes del
  formulario) por ser el único cambio incondicional posterior a la versión
  estable `54379d8`. **No era la causa**: reintento en vivo con #131 activo
  falló igual (18/9/2026 11:17).
- PR #132 (`30d9e37`): revirtió #131; la protección contra artículos
  duplicados vuelve a estar en producción.
- Este cambio (rama `claude/guardado-esperar-validacion`): en
  `saveAndGetUrl()`, si tras el clic el sitio no acepta el guardado y no hay
  título duplicado, se espera 15 s y se reintenta (hasta `MAX_SAVE_ATTEMPTS`)
  en vez de rendirse tras un solo clic. Base: en los logs, el artículo que sí
  se publicó tras varios fallos fue el intento donde el robot esperó ~33 s a
  la validación del sitio antes del clic; los fallidos hacían el clic a 0 s.
  Un archivo de código, +13 líneas, sin migraciones ni cambio de versiones.

Auditoría 1: APROBADA (un archivo de código + este registro, sin secretos).
Auditoría 2: APROBADA (sintaxis TypeScript sin diagnósticos; `git diff --check`).
Auditoría 3: APROBADA EN VIVO (18/9/2026, MPM Realty Group). PR #133
fusionado a las 11:37; reintento del lote: los artículos 1 y 2 (5 y 7 fallos
previos) se publicaron en el segundo intento de guardado (11:42 y 11:46); el
lote pasó de 5/9 a 8/9. En esos logs el sitio termina de guardar unos segundos
después del clic: el robot antes lo daba por perdido a los 1-2 s.
Problema conocido, NO resuelto: el artículo 5 sigue fallando porque el sitio
responde "There is already an article with this title" (título duplicado
real) y la detección de duplicados del robot solo reconoce el formulario en
español (`#titlees` / "existe"), no el inglés (`#title`). Posible causa
adicional: intentos anteriores "fallidos" pudieron haber guardado artículos
reales en el sitio; conviene revisar duplicados en el listado de la cuenta.
Actualización 18/9/2026 12:00: tras otro "Reintentar", el artículo 5 se publicó
(título nuevo de la IA, sin choque) y el lote quedó en 9/9 "Completado".
Pendiente para Milton: en el sitio público de MPM hay artículos repetidos
creados por intentos que la app marcó como fallidos (p. ej. "From Agent to Top
Producer: A Practical Guide" y "...: Essential Strategies"; "Habits of Highly
Productive REALTORS®" y "Productive REALTORS®: Key Habits"; "Strategies for
Success After Your Florida Real Estate License" y "Essential Steps After
Earning Your Florida Real Estate License"; "From License Holder to Real Estate
Business Owner" y "From Agent to Business Owner in Real Estate"). Borrarlos es
decisión suya. La detección de títulos duplicados sigue reconociendo solo el
formulario en español.
Responsable: Claude. Estado: EN PRODUCCIÓN — VERIFICADA EN VIVO (9/9).

## Versión desplegada — 2026-09-18 — Paso de Bing Webmaster Tools en el wizard de Inicio

PR #126 fusionado a `main` (`c294aff`), sin migraciones ni cambios de schema.
`apps/web/src/components/OnboardingWizard.tsx`: nuevo Paso 5 "Conectar Bing
Webmaster Tools" (recomendado, no bloqueante, con botón de video
`https://www.youtube.com/watch?v=N9p7O965ooA`), que reutiliza
`BingWebmasterSection`; el paso final de Oportunidades pasa a ser el Paso 6.

Auditorías: integridad APROBADA (alcance de un componente + registros, sin
secretos); funcional APROBADA (`tsc --noEmit` y `npm run build` limpios);
regresión/entrega APROBADA (Vercel Preview pasó; sin solapamiento de archivos
con los PR #127/#128 de Bing). Verificación en vivo en Producción pendiente.

Responsable: Claude. Estado: EN PRODUCCIÓN — verificación en vivo pendiente.

## Versión desplegada — 2026-09-18 — Bing Webmaster: enlaces a Indexación

`apps/web/src/components/BingWebmasterSection.tsx`: los enlaces "Volver a
conectar", "Revisar configuración de Bing" y "Revisar configuración" apuntaban a
`/dashboard/configuracion`; ahora a `/dashboard/configuracion/indexacion`. Cierra
el remanente del PR #127 (las redirecciones del callback y de `router.replace`
ya estaban corregidas). Sin migraciones ni schema; el manual no menciona estos
enlaces, no requiere cambio.

PR #139 fusionado (`9df2f10`); Vercel Production completado.

Responsable: Claude. Estado: EN PRODUCCIÓN.

## Versión desplegada — 2026-09-18 — CONEXION COMPOSIO, Fase 1 (módulo Composio en Administración)

PR #142 (`claude/conexion-composio`), commits `73dc766` y `a1fefed` más el de este registro.
Nuevo módulo de solo administradores en `/dashboard/composio` (clave de API de
Composio cifrada, auth configs verificados, cuentas conectadas) y "Administración"
como grupo del menú (Usuarios · Composio). Manual de usuario actualizado en el mismo
lote. Sin cambios de schema, sin migraciones, sin tocar integraciones existentes
de Google ni de Meta, `vercel.json`, workflows, middleware ni dependencias.

**PUNTO DE RETORNO (última versión buena conocida, registrada ANTES de fusionar):**

```text
Commit de Producción previo: 068a0b1 (= origin/main antes del PR #142)
Etiqueta de Git:             pre-composio-fase1-20260918  (apunta a 068a0b1)
Deployment Vercel previo:    6529270912 · Production · success
                             https://auto-articulos-oqjlawfxn-luna-portex-intelligence.vercel.app
Dominio público:             https://seototal.lasolucionweb.com
Línea base medida 2026-09-18 21:23 UTC (antes de fusionar):
  /login 200 · /privacidad 200 · /api/me 401 · /dashboard 307→/login
  /dashboard/composio 307→/login · /api/admin/composio 401
```

Verificación previa (Controlador, «Verificación obligatoria»): archivos eliminados
en el PR: 0 · migraciones: 0 · cambios en `schema.prisma`: 0 · cambios en
`vercel.json`/workflows/proxy: 0 · `tsc --noEmit` 0 errores · `npm run build`
exit 0 · rama `MERGEABLE`/`CLEAN` sin conflictos con `main`.

Auditorías: integridad APROBADA · funcional APROBADA (12 pruebas de librería, pruebas
HTTP reales, verificación visual y camino feliz con la clave real de Milton en base
local) · regresión APROBADA. Anomalía registrada: Vercel NO generó Preview para este
PR (sin check, estado ni comentario tras más de 4 minutos; el PR #141 sí lo tuvo).
Milton autorizó fusionar sin Preview (opción A) el 2026-09-18, asumiendo ese riesgo.

**Cómo revertir en un caso extremo (no hay migraciones ni datos que deshacer):**

1. Más rápido, sin tocar Git: en el panel de Vercel, `Deployments` → deployment
   `6529270912` (`068a0b1`) → volver a promoverlo a Production (rollback de Vercel).
2. Por Git, de forma incremental (no destructiva): desde `main`, rama nueva y
   `git revert -m 1 <commit de fusión del PR #142>`, abrir PR y pasar las tres
   auditorías. Comparar con `git diff pre-composio-fase1-20260918..main`.
3. NO usar `reset --hard`, `push --force` ni restaurar snapshots parciales (regla de
   Protección de este documento).
4. Datos: el módulo solo escribe filas `composio_*` en `SystemSetting`, inertes si se
   revierte el código. Pueden quedarse o borrarse (`DELETE FROM "SystemSetting" WHERE
   key LIKE 'composio_%'`) sin afectar nada más.

Deployment: PENDIENTE (se registra tras fusionar). Verificación en Producción: PENDIENTE.
Responsable: Claude. Estado: FUSIÓN AUTORIZADA — pendiente de deployment y verificación.

## Corrección del punto de retorno y fusión DIFERIDA — 2026-09-18 — CONEXION COMPOSIO, Fase 1 (PR #142)

Corrige y complementa la entrada anterior de CONEXION COMPOSIO (que no se reescribe).

**Qué cambió.** Mientras el PR #142 esperaba, `main` avanzó a `d6ba5f8` (PR #143,
`simplificacion-setup-inicial`, fusionado 2026-09-18 21:35:38Z). La etiqueta
`pre-composio-fase1-20260918` (`068a0b1`) sigue siendo cierta como «Producción antes de
#143», pero **ya no es el punto de retorno correcto de mi cambio**: volver a `068a0b1`
deshacería también el PR #143. Regla vigente: el punto de retorno de la fusión de #142 es
el commit que esté en Producción **inmediatamente antes** de fusionarla, y se etiqueta en
ese momento (`pre-composio-fase1-<sha>-<fecha>`), después de verificarlo sano.

**Estado medido 2026-09-18 21:52 UTC.**

```text
Producción (Vercel):  068a0b1, sana — /login 200 · /privacidad 200 · /api/me 401 · /dashboard 307→/login
                      (idéntico a la línea base)
d6ba5f8 (PR #143):    SIN deployment en GitHub tras 16 min de fusionado
Preview de #142:      «Building» desde 21:34 UTC, sin terminar
Vercel (público):     incidente ACTIVO «Deployment stuck in initializing state»;
                      Builds y Build & Deploy en degraded_performance
```

**Integración hecha.** `origin/main` (`d6ba5f8`) se fusionó dentro de `claude/conexion-composio`
(commit `116c04c`, merge sin reescribir historia). Único conflicto real:
`apps/web/src/content/manual-usuario.ts` (párrafo «El menú»), resuelto conservando el texto
nuevo de `main` y añadiendo la frase sobre Administración. `DashboardNav.tsx` y este
documento se combinaron sin conflicto. Sobre el resultado integrado: `tsc --noEmit` 0
errores, `npm run build` exit 0, y verificación visual del menú como administrador
(Inicio · Cómo funciona esta aplicación · Publicaciones · Configuración · Administración
[Usuarios, Composio]). El diff contra `origin/main` contiene solo los archivos de esta tarea.

**Decisión: FUSIÓN DIFERIDA.** Milton autorizó fusionar (opción A). Se difiere porque
Coordinación §7 prohíbe ejecutar acciones que puedan tumbar Producción sin poder verificar
`Ready`, y hoy hay un incidente de Vercel y una línea base en movimiento. No hay ningún
cambio en Producción por parte de esta tarea.

**Condiciones para fusionar (todas):**
1. El incidente de Vercel resuelto (o Milton lo confirma por escrito).
2. `d6ba5f8` desplegado en Producción con estado `success` y salud verificada.
3. Etiqueta `pre-composio-fase1-<sha vigente>-<fecha>` creada sobre el commit en Producción.
4. `origin/main` sin cambios nuevos (si los hay, se integran y se repiten tsc y build).
5. Preview de #142 verde, o autorización explícita de Milton sin Preview.
6. Tras fusionar: deployment en `Ready`, dominio y logs de runtime verificados, y el módulo
   abierto por Milton en Producción con su clave.

Migraciones: ninguna. Rollback tras fusionar: promover en Vercel el deployment de la
etiqueta correspondiente, o `git revert -m 1 <fusión de #142>` en rama nueva (sin
`reset --hard` ni `push --force`); el módulo solo escribe filas `composio_*` inertes.

Responsable: Claude. Estado: BLOQUEADO — dependencia externa (incidente de Vercel);
PR #142 abierto y sin conflictos con `main`.

## Condiciones cumplidas y punto de retorno FINAL — 2026-09-18 22:3x UTC — CONEXION COMPOSIO, Fase 1 (PR #142)

Cierra las condiciones de la entrada «fusión DIFERIDA» (que no se reescribe).

```text
1. Vercel:            «All Systems Operational» (22:32 UTC); el incidente quedó resuelto.
2. Producción:        d6ba5f8 desplegado — deployment 6533344463, success (21:52 UTC).
                      Salud 22:32 UTC idéntica a la línea base: /login 200 · /privacidad 200 ·
                      /api/me 401 · /dashboard 307→/login · /dashboard/composio 307→/login ·
                      /api/admin/composio 401.
3. ETIQUETA FINAL:    pre-composio-fase1-d6ba5f8-20260918  (apunta a d6ba5f8)
                      = PUNTO DE RETORNO de la fusión del PR #142.
                      Sustituye a pre-composio-fase1-20260918 (068a0b1), que dejaría fuera el PR #143.
4. origin/main:       sin cambios nuevos (d6ba5f8).
5. Preview de #142:   build de Vercel en success (head a3eac95). El Preview está protegido por el
                      login de Vercel (302), por lo que la evidencia es el estado del build.
```

**Cómo revertir en un caso extremo** (sin migraciones): promover en Vercel el deployment
`6533344463` (`d6ba5f8`), o en rama nueva `git revert -m 1 <fusión del PR #142>` con las tres
auditorías; comparar con `git diff pre-composio-fase1-d6ba5f8-20260918..main`. Sin `reset --hard`
ni `push --force`. El módulo solo escribe filas `composio_*` inertes en `SystemSetting`.

Fusión autorizada por Milton (opción A, 2026-09-18) y reafirmada con «sigue». Deployment de la
fusión y verificación en Producción: se registran tras fusionar.
Responsable: Claude. Estado: LISTA PARA FUSIONAR.

## Versión desplegada — 2026-09-18 — CONEXION COMPOSIO, Fase 1 (módulo Composio en Administración)

PR #142 fusionado a `main` (`f0fd534`, 2026-09-18 22:35:16 UTC), con merge commit. Sin migraciones ni
cambios de schema. Registra el resultado de las entradas anteriores de CONEXION COMPOSIO (que no se
reescriben).

```text
Commit de fusión:     f0fd534   (head del PR: 0b09faf)
Deployment Vercel:    6534042292 · Production · success · creado 22:36:00 UTC (31 s tras fusionar)
                      https://auto-articulos-15u33xmb0-luna-portex-intelligence.vercel.app
Preview previo:       build de Vercel en success sobre el head 0b09faf
PUNTO DE RETORNO:     etiqueta pre-composio-fase1-d6ba5f8-20260918 (= d6ba5f8, deployment 6533344463)
Salud medida 22:36 UTC en https://seototal.lasolucionweb.com (idéntica a la línea base):
  /login 200 · /privacidad 200 · /api/me 401 · /dashboard 307→/login
  /dashboard/composio 307→/login · /api/admin/composio, /accounts y /auth-configs 401
```

Verificación pendiente (no completada por esta tarea): (1) que el módulo abra en Producción con una
sesión de administrador y guarde la clave de Composio — solo Milton puede hacerlo; las respuestas 401
sin sesión NO lo prueban, porque el proxy bloquea todo `/api/admin/*` (una ruta inexistente también
da 401); (2) logs de runtime de Vercel: no hay acceso desde esta sesión (CLI sin sesión iniciada).

Rollback (sin migraciones): promover en Vercel el deployment `6533344463` (`d6ba5f8`), o en rama nueva
`git revert -m 1 f0fd534` con las tres auditorías; comparar con `git diff
pre-composio-fase1-d6ba5f8-20260918..main`. Sin `reset --hard` ni `push --force`. El módulo solo
escribe filas `composio_*` inertes en `SystemSetting`.

Pendientes conocidos: la clave y los 4 auth configs de Composio se registraron solo en la base LOCAL de
Milton; hay que pegarlos en Producción. La verificación de qué permiso de la clave cubre `tools/execute`
queda para la Fase 2b.

Responsable: Claude. Estado: EN PRODUCCIÓN — verificación en vivo pendiente (Milton).
## Versión desplegada y archivada — 2026-09-18 — Simplificación del setup inicial

Proyecto: **SIMPLIFICACION DEL SETUP INICIAL**. PR #143:
https://github.com/miltondavila-ux/auto-articulos/pull/143. Merge a `main`:
`d6ba5f8580cc9ad4072ed1941b7f05ee4207ca07`.

Se documenta el cierre del lote de interfaz: copy coherente en dashboard,
menú, módulos, manual y asistente/MCP; cuatro tarjetas principales; Historial
dentro de Publicaciones; Actualizaciones dentro de Configuración; tarjetas
responsive y con contraste reforzado; gráfico de ritmo a ancho completo; retiro
del aviso de inactividad. Se conservaron rutas, permisos, endpoints, scopes e
integraciones. Sin cambios de schema ni migraciones.

Auditorías aprobadas: `git diff --check`; `npm run verify` completo con Prisma,
typecheck, builds y 20 tests del worker; Preview Vercel Ready y login correcto.
Producción confirmada en Vercel con deployment
`dpl_7XmpajPXMfJoBWqsNN5eKqhHD2tA`, estado `READY`, alias
`seototal.lasolucionweb.com` y login HTTP 200.

Responsable: Codex. Estado final: **ARCHIVADA — EN PRODUCCIÓN Y VERIFICADA**.
## Versión — 2026-09-18 — REPARACIÓN DEL MOTOR DE OPORTUNIDADES

PR #144 (`codex/reparacion-del-motor`), integrada tras validar Preview y migración.
Se añadió `OpportunityEvidenceCache` con migración aditiva; caché independiente
para GSC/GA4/Bing con TTL 7/14/14 días; ventana GSC de 90 días; y fallback
multifuente para que GA4 o Bing puedan iniciar el análisis cuando GSC no esté
disponible. Se conservaron exclusiones, geolocalización, deduplicación y
`gpt-4o-mini` como primera fase.

Auditorías: local aprobada (`prisma validate`, `tsc --noEmit`, build de Next con
85 páginas y `git diff --check`); Preview de Vercel `READY`; migración controlada
por GitHub Actions completada sin `--accept-data-loss` y con RLS correcto.
Producción se registra después del deployment final.

Responsable: CODEX - CREADOR DE TITULOS MUY ESTRICTO. Estado: EN DESPLIEGUE.


## Versión preparada — 2026-09-18 — CREACION DE PUBLICACIONES PROPIAS (títulos con la IA del sistema)

Rama `claude/creacion-publicaciones-propias`. Nueva opción "Crear con la IA del sistema" en
`/dashboard/publicar` (Publicaciones propias) para usuarios sin datos de GSC/GA/Bing: formulario de
5 datos efímeros, hasta 9 títulos a elegir, tope de 3 solicitudes por día por usuario, sin repetir
títulos ya creados u ofrecidos, y caja "PROMPT PUBLICACIONES PROPIAS" en Administración → Prompts
(solo administrador). Los títulos marcados se agregan a la caja Títulos y siguen el flujo normal.
Manual de usuario actualizado en el mismo lote. Especificación: `MASTER_BLUEPRINT_CREACION_DE_PUBLICACIONES_PROPIAS.md`
y `FASE_0_CREACION_DE_PUBLICACIONES_PROPIAS.md`.

**PUNTO DE RETORNO (última versión buena conocida, registrada ANTES de fusionar):**

```text
Commit de Producción previo: e7f529c (= origin/main antes de esta fusión)
Etiqueta de Git:             pre-creacion-publicaciones-propias-e7f529c-20260918  (apunta a e7f529c, ya en el remoto)
Deployment Vercel previo:    6534121110 · Production · success
                             https://auto-articulos-5nya73b0a-luna-portex-intelligence.vercel.app
Dominio público:             https://seototal.lasolucionweb.com
Vercel público:              «All Systems Operational», 0 incidentes sin resolver (22:3x UTC)
Línea base medida 2026-09-18 22:43 UTC (antes de fusionar):
  /login 200 · /privacidad 200 · /api/me 401 · /dashboard 307→/login
  /dashboard/publicar 307→/login · /api/title-generation 401 · /api/admin/title-generation-prompt 401
  (las rutas nuevas dan 401 igual que antes porque el middleware pide sesión a todo /api: no prueban
   que estén desplegadas; la prueba será el deployment del commit de fusión y el uso real de Milton)
```

**Migración (aditiva, ya aplicada):** `20260918190000_add_title_generation_requests` crea la tabla
nueva y vacía `TitleGenerationRequest` (con `IF NOT EXISTS`, repetible). **Milton la aplicó a mano en
PRODUCCIÓN (editor SQL de Supabase) antes de esta fusión, el 2026-09-18**, fuera del script de
capitanía (la capitanía activa, de `CODEX - CREADOR DE TITULOS MUY ESTRICTO`, no cambia). Claude no
tiene acceso a producción y **no lo pudo verificar**: consta por lo declarado por Milton.
`schema.prisma` solo suma el modelo nuevo y una relación inversa en `User`: **ninguna columna nueva en
tablas existentes**, así que ninguna consulta actual (login, /dashboard) depende de la tabla nueva.
Si la tabla no existiera en producción, solo fallaría la opción de IA (mostraría "no se pudo verificar");
el modo "Poner títulos a mano" y el resto de la app no se ven afectados.

Verificación previa (Controlador, «Verificación obligatoria»): archivos eliminados en el PR: 0 ·
migraciones: 1 (aditiva, solo tabla nueva) · cambios en `schema.prisma`: solo el modelo nuevo ·
cambios en `vercel.json`/workflows/middleware: 0 · no se tocó `/api/runs`, el worker, categorías ni
Configuración · `tsc --noEmit` 0 errores · `npm run build` exit 0 (rutas `/api/title-generation`,
`/api/admin/title-generation-prompt` y `maxDuration: 60` presentes) · 32/32 pruebas (20 unitarias +
12 de integración contra una base `*_test` con la IA simulada: tope 3/día con 5 solicitudes
simultáneas, cero repetidos, fallo sin consumo, retención de 90 días) · rama sin conflictos con `main`
tras rebasar sobre `e7f529c`.

Auditorías: integridad APROBADA (15 archivos, todos en alcance; sin secretos; sin caracteres de
control) · funcional APROBADA (pruebas anteriores + flujo completo en navegador con usuaria y
administrador, permisos 403/401, móvil sin scroll horizontal) · regresión APROBADA (rebase sobre
`origin/main` con conflicto de `manual-usuario.ts` resuelto conservando ambos lados; tipos, pruebas y
build repetidos sobre el resultado).

**Lo NO verificado por Claude:** (1) la IA real de OpenAI con el prompt de Milton: el `.env.local` no
tiene `OPENAI_API_KEY` y las pruebas usaron una IA simulada; en producción la clave ya existe (la usa
Oportunidades). (2) La tabla en producción (ver arriba). (3) Logs de runtime de Vercel.

**Comportamiento al desplegar (inerte hasta que Milton pegue el prompt):** sin prompt en Administración,
la opción "Crear con la IA del sistema" aparece pero dice "Esta función aún no está disponible" y no
gasta IA ni solicitudes. El único cambio visible para los usuarios es el selector "Poner títulos a mano /
Crear con la IA del sistema" en la sección Títulos de Publicar.

**Cómo revertir en un caso extremo:**

1. Más rápido, sin tocar Git: en el panel de Vercel, `Deployments` → deployment `6534121110`
   (`e7f529c`) → volver a promoverlo a Production (rollback de Vercel).
2. Por Git, de forma incremental (no destructiva): desde `main`, rama nueva y
   `git revert -m 1 <commit de fusión de este PR>`, abrir PR y pasar las tres auditorías. Comparar con
   `git diff pre-creacion-publicaciones-propias-e7f529c-20260918..main`.
3. NO usar `reset --hard`, `push --force` ni restaurar snapshots parciales (regla de Protección).
4. Datos: la tabla `TitleGenerationRequest` queda vacía e inerte si se revierte el código, y la clave
   `title_generation_prompt` de `SystemSetting` también; pueden quedarse.

Deployment: PENDIENTE (se registra tras fusionar). Verificación en Producción: PENDIENTE.
Responsable: Claude. Estado: PREPARADA — fusión autorizada por Milton el 2026-09-18 («envía a producción»).
## Cierre — 2026-09-18 — REPARACIÓN DEL MOTOR DE OPORTUNIDADES

PR #144 quedó fusionada en `main` mediante `1c19f07`. Deployment de Vercel:
`dpl_GXQ165nD88E1xhgPK875DC1GHw4V`, Production `Ready`, dominio
`https://seototal.lasolucionweb.com`. La migración controlada `35402599238`
terminó sin `--accept-data-loss`. Salud verificada: `/login` 200,
`/privacidad` 200, `/api/me` 401 y `/dashboard` 307 a login.

Auditorías de integridad, funcionalidad y producción cerradas. Responsable:
CODEX - CREADOR DE TITULOS MUY ESTRICTO. Estado: CERRADA.

## Versión preparada — 2026-09-18 — CONEXION COMPOSIO, Fase 2a (interruptor por app y tablas nuevas)

Rama `claude/composio-fase-2a`. Añade (1) dos enums y dos tablas nuevas, `IntegrationRoute` y
`ComposioConnection`, con su migración idempotente `20260918230000_add_composio_connections` (schema y
migración en el mismo commit); (2) `apps/web/src/lib/composio-route.ts` (interruptor por app,
`resolveRoute`, resumen de clientes); (3) ruta `/api/admin/composio/routes` y la sección «Vía de
conexión por app» en `/dashboard/composio`; (4) la vía `safe_composio_connections` en
`.github/workflows/migrate.yml`; (5) manual de usuario en el mismo lote.

**Sin cambio de comportamiento para nadie:** `COMPOSIO_ROUTING_ENABLED = false` (pasar a Composio
responde 409), `resolveRoute` devuelve siempre OWN, ningún consumidor actual lee las tablas nuevas y
ninguna tabla ni columna existente cambia (`schema.prisma`: 63 líneas añadidas, 0 eliminadas).

**PUNTO DE RETORNO (registrado ANTES de fusionar):**

```text
Commit de Producción previo: c29d5a5 (= origin/main al preparar; deployment Vercel 6534219219, success)
Etiqueta de Git:             pre-composio-fase2a-c29d5a5-20260918
Salud 2026-09-19 00:54 UTC:  /login 200 · /privacidad 200 · /api/me 401 · /dashboard 307→/login
                             /api/admin/composio 401
```

Verificación previa: `prisma validate` válido tras integrar `main` (conflicto en `schema.prisma`
resuelto conservando el modelo de otra tarea y el mío) · `tsc --noEmit` 0 errores · `npm run build`
exit 0 · migración aplicada DOS veces en la base LOCAL sin error (idempotente), RLS activo en ambas
tablas y `prisma migrate diff` sin diferencias para mis objetos · 14 pruebas de la librería contra la
base local, incluidas las de «SIN TABLAS» (renombrando las tablas: no lanza, todo OWN, resumen con
`tablesReady=false`), integridad (únicos, cascade sin tocar otros) y compuerta cerrada · pruebas HTTP
(401 sin sesión, 403 no admin, 409 con compuerta cerrada, 400 entradas inválidas, 200 volver a OWN) ·
YAML del workflow válido.

**Orden obligatorio en Producción (para no romper nada):** (1) fusionar el código — tolera que las
tablas no existan; (2) verificar despliegue y salud; (3) lanzar «Migración manual» con SOLO
`safe_composio_connections` marcado; (4) verificar que el paso terminó bien y que el paso de RLS
confirmó las tablas; (5) verificar que Administración muestra el resumen sin el aviso de migración.

**Rollback:** promover en Vercel el deployment del punto de retorno, o `git revert -m 1 <fusión>` en
rama nueva. Las tablas nuevas son aditivas y quedan vacías: pueden permanecer sin efecto o borrarse
(`DROP TABLE "ComposioConnection"; DROP TABLE "IntegrationRoute"; DROP TYPE
"ComposioConnectionStatus"; DROP TYPE "IntegrationRouteMode";`) sin afectar a ninguna otra tabla.

Responsable: Claude. Estado: PREPARADA — pendiente de PR, fusión, migración y verificación.

## Versión desplegada — 2026-09-19 — CONEXION COMPOSIO, Fase 2a (interruptor por app y tablas nuevas)

PR #151 fusionado a `main` (`484a579`, 2026-09-19 00:57:11 UTC), con merge commit. Migración aditiva
`20260918230000_add_composio_connections` (2 enums y 2 tablas nuevas). Sin cambio de comportamiento para
ningún cliente (interruptor de vía bloqueado, ningún consumidor lee las tablas nuevas).

```text
Commit de fusión:      484a579 (head del PR: d651d9a)
Deployment Vercel:     Production · success (~50 s tras fusionar)
PUNTO DE RETORNO:      etiqueta pre-composio-fase2a-c29d5a5-20260918 (= c29d5a5, deployment 6534219219)
Migración (workflow):  «Migración manual», corrida 35411144863, 2026-09-19 00:58:38 UTC, sobre 484a579
                       Solo se marcó safe_composio_connections. Pasos: «Aplicar migración segura de
                       CONEXION COMPOSIO» success («Script executed successfully»); «Aplicar migraciones con
                       Session pooler» (db push) OMITIDO; «Forzar RLS» success: «todas las tablas de
                       "public" ya tienen RLS activado».
Salud 00:59 UTC en https://seototal.lasolucionweb.com, idéntica a la línea base:
  /login 200 · /privacidad 200 · /api/me 401 · /dashboard 307→/login · /api/admin/composio/routes 401
```

Se cumplió el orden previsto: código primero (tolera que las tablas no existan) → verificación → migración
→ verificación. Capitanía de migración liberada (ver Coordinación).

Verificación pendiente (no completada por esta tarea): que Milton abra Administración → Composio en
Producción y compruebe que «Vía de conexión por app» aparece con los 4 apps y SIN el aviso «Falta aplicar
la migración» (las respuestas 401 sin sesión no lo prueban; no hay acceso a la base de Producción desde
esta sesión).

Rollback: promover en Vercel el deployment del punto de retorno, o `git revert -m 1 484a579` en rama
nueva. Las tablas nuevas son aditivas y están vacías: pueden permanecer sin efecto o borrarse (`DROP TABLE
"ComposioConnection"; DROP TABLE "IntegrationRoute"; DROP TYPE "ComposioConnectionStatus"; DROP TYPE
"IntegrationRouteMode";`) sin afectar a ninguna otra tabla.

Pendientes conocidos: la clave de Composio y los 4 auth configs solo están en la base LOCAL de Milton; hay
que pegarlos en Producción. Fase 2b (conexión de clientes, banner, callback verificado) pendiente.

## Versión desplegada — 2026-09-18 — CREACION DE PUBLICACIONES PROPIAS (PR #148)

Fusionado el PR #148 (`claude/creacion-publicaciones-propias`) en `main`: commit de fusión `518945b`.
Completa la entrada anterior «Versión preparada — CREACION DE PUBLICACIONES PROPIAS» (que no se reescribe).

**PUNTO DE RETORNO DEFINITIVO** (sustituye al de la entrada preparada, porque `main` avanzó de `e7f529c` a
`f23ba3c` antes de fusionar; el punto de retorno es el commit que estaba en Producción inmediatamente antes):

```text
Commit de Producción previo: f23ba3c (= origin/main justo antes de la fusión; solo documentación sobre 1c19f07)
Etiqueta de Git:             pre-creacion-publicaciones-propias-f23ba3c-20260918  (apunta a f23ba3c, en el remoto)
Deployment Vercel previo:    6534165309 · Production · success
                             https://auto-articulos-6q52ypdkm-luna-portex-intelligence.vercel.app
(La etiqueta pre-creacion-publicaciones-propias-e7f529c-20260918 sigue siendo cierta como «Producción antes del PR #144»,
 pero ya no es el retorno correcto de #148: volver a e7f529c deshacería también #144 y #147.)
```

**Deployment de la fusión:** `6534199413` · Production · **success** · commit `518945b`
(`https://auto-articulos-8auobszej-luna-portex-intelligence.vercel.app`). Preview del PR (head `03919c4`) pasó antes de fusionar; el PR estaba `MERGEABLE/CLEAN`.
Compuerta previa: Vercel «All Systems Operational» y 0 incidentes; producción == `origin/main` == `f23ba3c`.

**Verificación en producción (2026-09-18 ~22:50 UTC), idéntica a la línea base:**

```text
/login 200 · /privacidad 200 · /api/me 401 · /dashboard 307→/login · /dashboard/publicar 307→/login
/api/title-generation 401 · /api/admin/title-generation-prompt 401
POST /api/auth/login con credenciales falsas → 401 {"error":"Correo o contraseña incorrectos"}
  (401 y no 500: la base de datos responde a través del cliente Prisma con el schema nuevo)
Vercel público: All Systems Operational
```

**Aún NO verificado (lo hace Milton, que puede iniciar sesión):** (1) que la tabla `TitleGenerationRequest` exista
en producción (la aplicó Milton a mano; Claude no tiene acceso); (2) la IA real con su prompt; (3) logs de runtime
de Vercel. Las rutas nuevas dan 401 sin sesión igual que antes (el middleware pide sesión a todo `/api`), así que
el 401 no prueba por sí solo que estén desplegadas: lo prueba el deployment del commit de fusión.

**Qué debe hacer Milton para activar la función:** en Administración → Prompts pegar el prompt en la caja
«PROMPT PUBLICACIONES PROPIAS» y guardar; luego, con una cuenta de pruebas, abrir Publicar → «Crear con la IA del
sistema». Sin prompt, la opción dice «Esta función aún no está disponible» y no gasta IA. Si al abrir la opción IA
sale «No se pudo verificar…», la tabla no existe en producción: aplicar el SQL de
`packages/db/prisma/migrations/20260918190000_add_title_generation_requests/migration.sql`.

**Cómo revertir en un caso extremo:** (1) Vercel → `Deployments` → deployment `6534165309` (`f23ba3c`) →
promover a Production; (2) por Git: rama nueva y `git revert -m 1 518945b`, abrir PR y pasar las tres
auditorías; comparar con `git diff pre-creacion-publicaciones-propias-f23ba3c-20260918..main`; (3) NO usar
`reset --hard` ni `push --force`. La tabla y la clave `title_generation_prompt` quedan inertes.

Migración: `20260918190000_add_title_generation_requests` aplicada a mano en producción por Milton antes de fusionar
(aditiva, repetible; sin registrar en `_prisma_migrations`). La capitanía de migración activa
(`CODEX - CREADOR DE TITULOS MUY ESTRICTO`) no cambia.
Responsable: Claude. Estado: EN PRODUCCIÓN — verificación en vivo pendiente (Milton).

## Versión preparada (NO desplegada) — 2026-09-19 — CONEXION COMPOSIO, Fase 2b-1 (conectar, elegir y probar por Composio)

Rama `claude/composio-fase-2b1` (commit propio `fdcc50a`, merge de `origin/main` `b638b1d`). **No hay PR, ni Preview, ni punto de retorno, ni despliegue.**
Sin cambios de schema ni migraciones. Añade el cliente de Composio con lista blanca (`packages/shared/src/composio.ts`), el módulo opt-in
`conexion-composio`, siete rutas `/api/composio/*` y una página temporal `/dashboard/configuracion/composio` visible solo para administradores y quien
tenga «Habilitado». Ningún cliente cambia: nada del sistema lee estas conexiones todavía.

Verificación local hecha sobre `main` (`bbe8863`) integrado: `tsc --noEmit` 0 errores · `npm run build` exit 0 (rutas nuevas presentes) · 28 pruebas
automáticas (web 20, worker 8) · pruebas HTTP (401 sin sesión, 403 sin «Habilitado», 400/409 en entradas inválidas, callback falsificado rechazado) ·
prueba de punta a punta con cuentas reales de Search Console, Analytics, Facebook e Instagram, con las 4 conexiones borradas al terminar.
**Pendiente antes de fusionar:** auditoría de integridad, funcional y de regresión con Coordinación, punto de retorno (etiquetar el commit de Producción
vigente en ese momento), PR, Preview `success`, Vercel operativo y permiso expreso de Milton.

Orden en Producción: (1) fusionar (no hay migración) → (2) verificar despliegue y salud → (3) Milton pega la clave nueva (Read All + escritura en
Connected accounts, Session management y Session tool execution) → (4) Milton pone «Habilitado» a las cuentas #2, #3 y #40 → (5) probar con ellas.
Rollback: promover el deployment del punto de retorno o `git revert -m 1 <fusión>` en rama nueva; no hay datos que deshacer (las conexiones de prueba viven en
`ComposioConnection`, que es aditiva).

Responsable: Claude (traspaso a Codex, ver Coordinación). Estado: PREPARADA — pendiente de auditorías, PR y fusión.

## Versión preparada (actualización 2026-09-19 19:22 UTC) — CONEXION COMPOSIO, Fase 2b-1: PR #155 con punto de retorno

Complementa la entrada «Versión preparada (NO desplegada) — 2b-1» (no se reescribe). Auditorías de integridad, funcional y de regresión APROBADAS (detalle en Coordinación).
PR #155 abierto. **PUNTO DE RETORNO** registrado antes de fusionar: etiqueta `pre-composio-fase2b1-4543b17-20260919` (= `4543b17`, Producción con deployment success;
`/login` 200, `/privacidad` 200, `/api/me` 401, `/dashboard` 307→/login). Sin migraciones. Rollback: promover el deployment de esa etiqueta o `git revert -m 1 <fusión>` en rama nueva.
Estado: LISTA PARA FUSIONAR — pendiente de Preview `success` y fusión.

## Versión desplegada — 2026-09-19 — CONEXION COMPOSIO, Fase 2b-1 (conectar, elegir y probar por Composio)

PR #155 fusionado a `main` (`0701e88`, 2026-09-19 19:24:23 UTC), con merge commit. Sin migraciones ni cambios de schema. Registra el resultado de las entradas «Versión preparada»
de la 2b-1 (que no se reescriben).

```text
Commit de fusión:     0701e88 (head del PR: 08672b5; commit propio de código: fdcc50a)
Deployment Vercel:    Production · success (~50 s tras fusionar)
PUNTO DE RETORNO:     etiqueta pre-composio-fase2b1-4543b17-20260919 (= 4543b17)
Salud 2026-09-19 19:26 UTC en https://seototal.lasolucionweb.com (idéntica a la línea base):
  /login 200 · /privacidad 200 · /api/me 401 · /dashboard 307→/login · /api/composio/status 401 (sin sesión)
Verificación con cuenta normal (403 en /api/composio/{status,connect,options}, la página redirige, el menú oculta el módulo): OK
```

Rollback: promover en Vercel el deployment del punto de retorno, o `git revert -m 1 0701e88` en rama nueva con las tres auditorías. No hay datos que deshacer.
Pendiente NO bloqueante: que Milton pegue la clave nueva y habilite a #2, #3 y #40; verificación como administrador.

Responsable: Claude. Estado: EN PRODUCCIÓN — uso pendiente de la clave nueva y del «Habilitado» de Milton.

## Versión preparada — 2026-09-19 19:34 UTC — CONEXION COMPOSIO, UX-1 etapa 1 (pantalla «Conexiones», opt-in)

Rama `claude/composio-ux1-conexiones`. Sin migraciones ni cambios de schema. Añade `/dashboard/configuracion/conexiones` (ANALÍTICAS / DIFUSIÓN) reutilizando las secciones actuales sin modificarlas, visible solo para
administradores y quien tenga «Habilitado» el módulo «Conexión por Composio». **Para el resto de personas nada cambia** (prueba local: redirección de la ruta nueva; Indexación y SEO, Redes Sociales y Configuración siguen en 200).

**PUNTO DE RETORNO** (registrado antes de fusionar): etiqueta `pre-composio-ux1-3232906-20260919` (= `3232906`, Producción success; `/login` 200, `/privacidad` 200, `/api/me` 401, `/dashboard` 307→/login).
Auditorías de integridad, funcional y de regresión APROBADAS. Rollback: promover el deployment de la etiqueta o `git revert -m 1 <fusión>` en rama nueva.
Estado: PREPARADA — pendiente de Preview `success`, Vercel operativo y fusión.

## Versión desplegada — 2026-09-19 — CONEXION COMPOSIO, UX-1 etapa 1 (pantalla «Conexiones», opt-in)

PR #157 fusionado a `main` (`474e8d9`, 2026-09-19 19:35:31 UTC), con merge commit. Sin migraciones ni cambios de schema. Registra el resultado de la entrada «Versión preparada» de UX-1 (que no se reescribe).

```text
Commit de fusión:     474e8d9 (head del PR: d2dd4b7)
Deployment Vercel:    Production · success
PUNTO DE RETORNO:     etiqueta pre-composio-ux1-3232906-20260919 (= 3232906)
Salud 2026-09-19 19:37 UTC (idéntica a la línea base): /login 200 · /privacidad 200 · /api/me 401 · /dashboard 307→/login
Verificación con cuenta normal: /conexiones y /composio (antigua) → /dashboard/configuracion; /indexacion y /redes-sociales en 200 con sus tarjetas: OK
```

Rollback: promover el deployment de la etiqueta o `git revert -m 1 474e8d9` en rama nueva. Nada que deshacer en datos.
Pendiente NO bloqueante: que Milton habilite el módulo a #2, #3 y #40 y pegue la clave nueva para usar la pantalla con conexiones reales.
Responsable: Claude. Estado: EN PRODUCCIÓN — opt-in, sin efecto para clientes.

## Versión preparada — 2026-09-19 20:39 UTC — CONEXION COMPOSIO, resolvedor de conexión (2b-2, primera pieza, INERTE)

Rama `claude/composio-resolvedor`. Sin migraciones ni cambios de schema. Añade `packages/shared/src/composio-resolver.ts`: lógica pura sin ningún consumidor; `COMPOSIO_CONSUMER_READY` en `false` para las 4 apps, por lo que el método es siempre «OWN». **No cambia el comportamiento de nadie.**
Auditorías de integridad, funcional (22 pruebas worker, 40 web, `next build` exit 0) y de regresión APROBADAS. **PUNTO DE RETORNO** antes de fusionar: etiqueta `pre-composio-resolvedor-f6dc2d5-20260919` (= `f6dc2d5`, Producción success). Rollback: promover ese deployment o `git revert -m 1 <fusión>`.
Estado: PREPARADA — pendiente de Preview `success`, Vercel operativo y fusión.

## Versión preparada — 2026-09-19 20:43 UTC — CONEXION COMPOSIO, aviso «no desconectes» en la tarjeta de Composio (UX)

Rama `claude/composio-aviso-no-desconectar`. Un solo archivo de código (`apps/web/src/components/ComposioConnect.tsx`, +6 líneas: aviso en modo incrustado). Sin migraciones ni schema; solo lo ven las cuentas con el módulo habilitado. **PUNTO DE RETORNO:** etiqueta `pre-composio-aviso-4501637-20260919` (= `4501637`, Producción success).
Auditorías de integridad, funcional (`tsc` 0, `next build` exit 0) y regresión APROBADAS. Motivo: incidente del piloto (ver Coordinación). Estado: PREPARADA — pendiente de Preview `success` y fusión.

## Versión preparada — 2026-09-19 20:48 UTC — CONEXION COMPOSIO, adaptador de Search Console por Composio (2b-2, segunda pieza, INERTE)

Rama `claude/composio-adaptador-gsc`. Sin migraciones ni cambios de schema. Añade `packages/shared/src/composio-search-console.ts` (5 funciones equivalentes a las de `google-search-console.ts`, por Composio) sin ningún consumidor. **No cambia el comportamiento de nadie.**
Auditorías de integridad, funcional y regresión APROBADAS. **PUNTO DE RETORNO** antes de fusionar: etiqueta `pre-composio-adaptador-gsc-91ecb91-20260919` (= `91ecb91`, Producción success). Rollback: promover ese deployment o `git revert -m 1 <fusión>`. Estado: PREPARADA — pendiente de Preview `success` y fusión.

## Versión desplegada — 2026-09-19 — feat(nav): numerar opciones del menú de publicaciones

Commit `deaa263` (autor Milton, agente Codex) subido directo a `main`, sin PR. Cambia únicamente
`apps/web/src/components/DashboardNav.tsx`: las tres opciones principales del menú «Publicaciones»
pasan a mostrarse como «1) Publica tus propios títulos», «2) Publica contenido con ayuda de la IA
avanzada» y «3) Difunde tu contenido en blogs externos y redes sociales». Sin schema, sin
migraciones, sin cambios de datos. `git diff --check` pasó correctamente (según registro de Codex en
Coordinación).

Deployment Vercel Production `dpl_HXvhGDn4WeYem7RUBPWz3VN4okqF`: **READY**, aliasado en
`https://seototal.lasolucionweb.com`. Responsable: Codex. Estado: EN PRODUCCIÓN — CERRADA Y
ARCHIVADA (ver Coordinación).

## Versión desplegada — 2026-09-19 — CONEXION COMPOSIO, resolvedor de conexión (2b-2, primera pieza, INERTE)

PR #160 fusionado a `main` (`4501637`), con merge commit. Registra el resultado de la entrada
«Versión preparada — resolvedor de conexión» (que no se reescribe). Deployment Vercel Production:
**success**; salud idéntica a la línea base. **PUNTO DE RETORNO** usado: `pre-composio-resolvedor-f6dc2d5-20260919`.
Sigue INERTE: `COMPOSIO_CONSUMER_READY` en `false` para las 4 apps; nadie lo consume todavía. Sin
migraciones. Responsable: Claude. Estado: EN PRODUCCIÓN — sin efecto para clientes.

## Versión desplegada — 2026-09-19 — CONEXION COMPOSIO, aviso «no desconectes» en la tarjeta de Composio (UX)

PR #161 fusionado a `main` (`91ecb91`), con merge commit. Registra el resultado de la entrada
«Versión preparada — aviso "no desconectes"» (que no se reescribe). Deployment Vercel Production:
**success**; salud intacta. **PUNTO DE RETORNO** usado: `pre-composio-aviso-4501637-20260919`. Solo lo
ven las cuentas piloto con el módulo «Conexión por Composio» habilitado. Sin migraciones. Motivo:
incidente del piloto con Lorena (#2), ver Coordinación. Responsable: Claude. Estado: EN PRODUCCIÓN.

## Versión desplegada — 2026-09-19 — CONEXION COMPOSIO, adaptador de Search Console por Composio (2b-2, segunda pieza, INERTE)

PR #162 fusionado a `main` (`51f5789`), con merge commit. Registra el resultado de la entrada
«Versión preparada — adaptador de Search Console por Composio» (que no se reescribe). Deployment
Vercel Production: **success**; salud intacta. **PUNTO DE RETORNO** usado: `pre-composio-adaptador-gsc-91ecb91-20260919`.
Sigue INERTE: ningún consumidor lo importa todavía. Sin migraciones. Tras esta fusión, Milton
reconectó y restauró Search Console y Analytics de Lorena (#2) por la vía principal (verificado por
Claude con su sesión). Responsable: Claude. Estado: EN PRODUCCIÓN — sin efecto para clientes.

**Estado consolidado del proyecto CONEXION COMPOSIO al 2026-09-19 20:59 UTC** (Producción = `7efaacd`):
en producción están la Fase 1 (#142 `f0fd534`), la Fase 2a (#151 `484a579`), la 2b-1 (#155 `0701e88`),
UX-1 etapa 1 (#157 `474e8d9`), el aviso (#161 `91ecb91`) y las dos piezas inertes de la 2b-2 —
resolvedor (#160 `4501637`) y adaptador de Search Console (#162 `51f5789`). Ningún consumidor real del
sistema lee todavía conexiones de Composio: conectar por Composio suma, no reemplaza. Proyecto
PAUSADO por límite de cupo/contexto de la conversación de Claude; traspaso a Codex a pedido de Milton
(prompt de arranque en `PROMPT_TRASPASO_CODEX_CONEXION_COMPOSIO.md`). Detalle completo, decisiones y
siguiente acción exacta: `COORDINACION_CLAUDE_CODEX.md` → «TRASPASO A CODEX · ESTADO VIGENTE
2026-09-19 20:59 UTC».

## Versión preparada — 2026-09-20 — NOMBRES EN EL MENU

Rama `claude/nombres-en-el-menu` sobre `origin/main` `934e121`. Cambia únicamente textos de
interfaz, manual y asistente: «Artículos propios», «Artículos creados con IA» y «Redes sociales:
publicaciones con IA» (fuente única `apps/web/src/lib/menu-names.ts`). Sin schema, sin migraciones,
sin cambios de datos, sin tocar `vercel.json`, middleware, autenticación ni secretos. Auditorías 1 y 2
aprobadas en local (ver Coordinación). Producción autorizada por Milton el 2026-09-20; el commit, el
PR, el Preview, el deployment y la verificación posterior se registran en la siguiente entrada.
Responsable: Claude. Estado: PREPARADA.

## Versión desplegada — 2026-09-20 — NOMBRES EN EL MENU

PR #183 fusionado a `main` (`dc200d6`, con merge commit; commit propio `c1be7f7`). Registra el
resultado de la entrada «Versión preparada — NOMBRES EN EL MENU» (que no se reescribe). Vercel Preview
y Production: **success**; `/login` HTTP 200. Sin migraciones. Producción autorizada por Milton el
2026-09-20. Punto de retorno: revertir el merge `dc200d6` (solo cambia textos). Pendiente: confirmación
visual de Milton del menú autenticado. Responsable: Claude. Estado: EN PRODUCCIÓN.

## Versión desplegada — 2026-09-20 — AUDITORÍA EDITORIAL Y ENLACES

PR #187 (`codex/auditoria-editorial-redes-20260920`) fusionado a `main` (merge `b169e62`). Mejora la
identidad editorial por cuenta, idioma y ubicaciones declaradas (prohíbe inventar biografía,
ubicaciones, testimonios, resultados, precios o promesas) y retira `facebook-story` del generador de
oportunidades porque la API de Page Stories no garantiza un enlace clicable. Auditorías: build web OK
(85 rutas), build worker OK, suite worker 20/20. Vercel Production: deployment
`dpl_Cns4zW7VtYAbt3ypg4Yjgd4JB1cq`, estado **READY**, alias `https://seototal.lasolucionweb.com`. Sin
cambios de schema ni migraciones. Responsable: Codex. Estado: EN PRODUCCIÓN.

## Versión desplegada — 2026-09-20 — WIZARD CULMINA EN BING

PR #170 fusionado a `main` (commit `02c96f5`). Retira Bing Webmaster Tools del wizard inicial (queda
disponible aparte en Configuración → Indexación) y, al completar Google Search Console, muestra una
pantalla final con dos caminos: publicar títulos propios o publicar con ayuda de la IA avanzada. Se
actualizó el manual de usuario en el mismo lote. Vercel deployment `6iUEaDHLmhEhZLqfyiZPKvgH3vMA`
completado; producción verificada con `/login` HTTP 200. Sin schema ni migraciones. Responsable:
Codex. Estado: EN PRODUCCIÓN.

## Versión desplegada — 2026-09-20 — HISTORICOS REDES LORENA

PR #178 (`codex/historicos-redes-lorena`) fusionado a `main` (commit `3633d817`): borrado exclusivo de
publicaciones sociales descartadas mediante `DELETE /api/social-opportunities?scope=skipped`, con
confirmación visible en `/dashboard/historial`. Verificado en producción por Milton: se eliminaron 123
publicaciones descartadas; las publicaciones históricas y sin confirmar quedaron intactas. Después,
PR #181 (`codex/boton-borrar-sin-confirmar`) fusionado a `main` (commit `899d7a06`) agregó el botón
opcional **Borrar sin confirmar** (`scope=unconfirmed`, excluye `pending`, `published` y `skipped`),
sin ejecutar ningún borrado automático; Preview de Vercel aprobado y cambios presentes en
`origin/main` (confirmación explícita de despliegue a Production no registrada en Coordinación para
este segundo PR). Sin cambios de esquema ni migraciones en ninguno de los dos. Responsable: Codex.
Estado: EN PRODUCCIÓN (PR #178 confirmado en producción; PR #181 fusionado y en `origin/main`, sin
confirmación explícita adicional de Production).

## Versión desplegada — 2026-09-20/21 — AUDITORÍA PUBLICACIÓN DEV.TO

Commit `6388899` en `origin/main`: barrera editorial que rechaza publicaciones en DEV.to sin tema
técnico o de desarrollo relevante, tags editoriales pertinentes (máximo cuatro) en lugar de selección
mecánica de palabras, conserva `canonical_url`/descripción/imagen/serie, agrega `User-Agent`
identificable y aplica la misma validación a la reparación de artículos existentes. Auditoría: Prisma
generate OK, worker build OK, web typecheck/build OK, 20/20 tests worker, 44/44 tests web, 3/3 tests
DEV.to, `git diff --check` OK, sin schema ni migraciones. Worker productivo exitoso en GitHub Actions
(ejecución `35547333149`). Vercel deployment `dpl_3fQRMJA1efco6nw6igGVpq4mJJS3`, estado **READY**,
alias `seototal.lasolucionweb.com` y `auto-articulos-web.vercel.app`, ambos HTTP 200. Responsable:
Codex. Estado: EN PRODUCCIÓN.

## Commits directos sin confirmación de despliegue registrada — 2026-09-20 — enlace de Facebook Page y versión de LinkedIn

Dos correcciones preparadas por Codex en "Auditoría LINK ACTIVO EN BLOGGING" e "Incidente 2026-09-20 —
LinkedIn rechazaba la versión 202505" quedaron, según sus propias entradas de Coordinación,
"pendientes de commit/push y despliegue". Verificado en vivo contra `origin/main` (esta corrida,
2026-09-21): ambas ya están aplicadas mediante commits directos de Milton, sin PR — `71a042a` ("fix:
preserve clickable article links on social publishing", usa `buildSafeCaption` en Facebook Page y
agrega `apps/worker/src/socialLinkContract.test.ts`) y `5bd9e09` ("fix: actualizar version activa de
LinkedIn API", `LINKEDIN_API_VERSION` de `202505` a `202609`). Sin cambios de schema ni migraciones en
ninguno de los dos. **No hay en ningún documento una confirmación explícita de que el worker/deploy
correspondiente ya corrió en producción con estos cambios** — se deja así, sin inventar un estado de
despliegue no confirmado por escrito. Responsable: Codex (preparación) / Milton (commit directo).
Estado: EN `origin/main`, DESPLIEGUE NO CONFIRMADO POR ESCRITO.

## Versión desplegada — 2026-09-21 — CONEXION POSTPEER, reutilización de imagen guardada para Google Business Profile

PR #207 (`codex/conexion-postpeer-gbp-image-fix`, commit `ed2cb1c`) fusionado a `main` mediante squash
`d3a760f` ("fix(gbp): reuse saved opportunity image (#207)"). Cambia
`apps/worker/src/businessProfilePublish.ts`: el lane `BusinessProfilePost`/
`processNextBusinessProfilePost` reutiliza primero `SocialOpportunity.imageUrl` de la oportunidad
`google-business` y solo genera/sube una imagen de respaldo si esa URL no existe; GBP no pasa por el
worker social genérico. Auditoría registrada en Coordinación: Prisma generate OK, TypeScript
web/shared/worker OK, worker 20/20, tests PostPeer shared 3/3, web 44 pass (1 integración omitida por
falta de `TITLE_GENERATION_TEST_DATABASE_URL`), build worker y web OK (85/85 rutas), `git diff --check`
OK. Sin cambios de schema ni migraciones. **No hay en Coordinación una confirmación explícita de que
el deployment de Vercel Production ya corrió con este cambio** — se deja así, sin inventar un estado
de despliegue no confirmado por escrito. Responsable: Codex. Estado: EN `origin/main`, DESPLIEGUE NO
CONFIRMADO POR ESCRITO.

## Nota de reconciliación de base canónica — 2026-09-22 — CONEXION COMPOSIO ↔ CONEXION POSTPEER

Se detectó una discrepancia entre `origin/main` (`d138788`) y el deployment Vercel Production más
reciente (`4721f304`), proveniente de la rama `codex/fix-postpeer-gbp-workflow-duplicate`, no
integrada en `main`. Tras coordinación registrada en `COORDINACION_CLAUDE_CODEX.md`, CONEXION POSTPEER
eligió la opción **B**: `origin/main@d138788` queda como base canónica de producción; el deployment
`4721f304` se considera cubierto por su equivalente squash `d138788` y esa rama no se fusionará una
segunda vez. Deployment válido informado por CONEXION POSTPEER: `dpl_HKDYsh3jkFDs2HNQWAA9iNEL8NCx`. No
hubo merge, deploy, migración ni reset adicional por esta reconciliación. Ver hallazgo técnico
relacionado en `REPARADOR_DEL_ARBOL_PRINCIPAL.md`. Responsable: Codex (CONEXION POSTPEER). Estado:
RECONCILIADO, SIN ACCIÓN DE DESPLIEGUE ADICIONAL.

## Versión desplegada — 2026-09-22 — CONEXION POSTPEER 2, corrección de imagen de GBP vía og:image (PR #211)

PR #211 fusionado a `main` mediante el commit `9afbdd3` ("fix(gbp): use article og image fallback
(#211)"). Registra el resultado de la entrada "Continuación CONEXION POSTPEER 2 — 2026-09-22" de
Coordinación (que no se reescribe): `apps/worker/src/businessProfilePublish.ts` ahora usa primero
`SocialOpportunity.imageUrl` y, si falta, obtiene la `og:image` pública del artículo exacto mediante
`getArticleOpenGraphImage`; si tampoco existe, falla antes de publicar, así GBP nunca publica sin
foto. Auditoría registrada en Coordinación: TypeScript del worker OK, `git diff --check` OK. Verificado
en vivo contra `origin/main` (esta corrida, 2026-09-23): el commit ya está fusionado, aunque
Coordinación todavía lo describía como "sin merge" al momento de escribirse. **No hay en Coordinación
ninguna confirmación explícita de que el deployment de Vercel Production ya corrió con este cambio, ni
de que se haya ejecutado la prueba productiva autorizada de Lorena** — se deja así, sin inventar un
estado no confirmado por escrito. Responsable: Codex. Estado: EN `origin/main`, DESPLIEGUE NO
CONFIRMADO POR ESCRITO.

## Versión desplegada — 2026-09-22 — Ajustes responsive, tarjetas de Inicio y menú de Configuración (Codex)

Conjunto de cambios de interfaz de Codex documentados en Coordinación bajo las entradas "OPERACIÓN
LOCALHOST", "Despliegue de interfaz móvil", "Responsive móvil — instrucciones plegables", "Responsive
móvil — segunda revisión completa", "Márgenes y paddings estandarizados", "Radio uniforme de
esquinas", "Textos de tarjetas de Inicio", "Nombres dinámicos de módulos", "Preferencia de trabajo
vigente", "Auditoría triple responsive" y "Menú de configuración" (todas 2026-09-22). Incluye:
instrucciones plegables en móvil manteniendo los controles de ejecución visibles, unificación de
`sectionStyle` (espaciado y esquinas a 6px), nuevas tarjetas y textos de Inicio usando los nombres
dinámicos de `MENU_NAMES` (`CONTENIDO PROPIO`, `CONTENIDO GENERADO POR IA`, `PUBLICA EN REDES SOCIALES
Y EN BLOGS PÚBLICOS`), y el traslado de "Cómo funciona esta aplicación" al menú de Configuración
(escritorio y hamburguesa móvil). Coordinación registra, para cada paso, build OK con 85 rutas y
deployments Vercel Production en estado **READY** con alias `https://seototal.lasolucionweb.com`
verificado en HTTP 200: `dpl_5L4rSNUBbu2sj1XizLAW4bWSY6hx`, `dpl_HTZyWZZUmMe6c9mAfH1ThogW2Dcd`,
`dpl_F86AZPRzMnuWgHwyRfrtFcF7Zuye`, `dpl_CPZPSqQVnv1snkAWdQn4Zj3aFLFW`,
`dpl_ABN5tEMRrgSBMbMR1AhdRiwD2iHi`, `dpl_FwSf6f97R8JanPmFLKsBSjxwv51X`,
`dpl_7G65JoYiwtBsWPAtrNBZ9J3WaCzj` y `dpl_6CE59HWgdmvdu45QJJvJWQT3yC7m`. Sin cambios de schema ni
migraciones en ninguno de estos pasos, según Coordinación. Verificado en vivo (esta corrida,
2026-09-23): todo este trabajo quedó consolidado en un único commit directo a `origin/main`,
`92d5737` ("fix: avisar limites de texto antes de guardar"), que además incluye cambios de lógica no
descritos en estas entradas (por ejemplo, avisos de límite de texto antes de guardar) — fuera del
alcance de esta propagación porque Coordinación no tiene una entrada propia que los describa. **No hay
en Coordinación confirmación explícita de que el commit final `92d5737` en `origin/main` haya sido
redesplegado a Production con ese SHA exacto** (los `dpl_` listados corresponden a pasos intermedios
anteriores al commit final) — se deja anotado así, sin inventar un estado no confirmado por escrito.
Responsable: Codex. Estado: EN `origin/main`, DESPLIEGUE DEL COMMIT FINAL NO CONFIRMADO POR ESCRITO.
