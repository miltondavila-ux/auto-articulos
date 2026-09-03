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
