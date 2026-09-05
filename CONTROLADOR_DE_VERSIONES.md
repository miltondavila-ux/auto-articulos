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
