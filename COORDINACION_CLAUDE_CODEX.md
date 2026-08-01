# Coordinación de trabajo: Claude y Codex

Este archivo es el tablero operativo compartido para evitar que Claude y Codex
modifiquen al mismo tiempo los mismos archivos o desplieguen cambios
incompatibles. `HANDOFF.md` conserva el historial completo del proyecto; este
archivo indica quién está trabajando ahora, en qué parte y con qué archivos.

## Regla obligatoria antes de iniciar cualquier tarea

Claude y Codex deben hacer lo siguiente **antes de leer o modificar código**:

1. Leer este archivo completo.
2. Ejecutar `git status --short` y `git log -5 --oneline`.
3. Revisar `HANDOFF.md` y los cambios sin commit relacionados con su tarea.
4. Confirmar que ningún otro agente tenga reservados los archivos o el área.
5. Registrar su tarea en "Trabajo activo" antes de editar.
6. Si existe una reserva que se cruza con la tarea, detenerse y coordinar; no
   editar, restaurar, formatear, agregar al staging ni desplegar esos archivos.

## Reglas durante el trabajo

- Cada agente modifica únicamente los archivos que declaró en su reserva.
- Una reserva por carpeta incluye todos sus archivos, aunque no estén listados.
- No usar `git add .` ni `git add -A`; agregar rutas explícitas.
- No restaurar, borrar ni reformatear cambios que no creó el agente.
- Antes de hacer push o desplegar, releer este archivo y comprobar que el otro
  agente no esté desplegando o migrando simultáneamente.
- No ejecutar pruebas de publicación automática; las realiza el usuario.
- Toda decisión, cambio, commit, migración, despliegue y pendiente debe quedar
  documentado en `HANDOFF.md` al cerrar la tarea.
- Si se descubre trabajo ajeno sin registrar, tratarlo como reservado hasta
  confirmar con el usuario o con el otro agente.

## Trabajo activo

### Claude

- **Estado:** `TERMINADO — ÁREA LIBERADA` (1/8/2026). Codex puede tocar
  `apps/worker/**` (incluido `10minutesWebsite.ts`) libremente.
- **Última tarea (RESUELTA, ver `HANDOFF.md` sección "RESUELTO 1/8/2026:
  bug del schema FAQ")**: Google Search Console marcaba error de sintaxis
  en el schema FAQPage. Causa raíz: 10minutesWebsite convierte todas las
  comillas dobles en simples al guardar el campo "Widget (opcional)",
  invalidando cualquier JSON-LD directo. Solución implementada y
  **confirmada por el usuario en producción** ("esto funcionó
  perfectamente"): `buildFaqSchema()` en
  `apps/worker/src/automation/10minutesWebsite.ts` ahora genera un
  `<script>` JS ejecutable que arma el schema con `JSON.stringify()` EN EL
  NAVEGADOR (inmune a la conversión de comillas, ya que JS no distingue
  comilla simple/doble/invertida) y lo inyecta dinámicamente como
  `<script type="application/ld+json">` — patrón oficialmente soportado por
  Google. `fillFaqWidget()` reactivado en `publishArticle()`. Probado con
  `vm.runInNewContext` simulando el navegador (casos límite: backtick,
  `${...}`, comillas dobles, backslash en el texto) y `tsc --noEmit` limpio.
  **Pendiente**: verificar en 1-2 artículos NUEVOS reales (publicados por
  el worker, no pegados a mano) que Search Console los valida igual de
  bien.
- **Tarea previa completada (histórico, ver más abajo en "Registro de
  entregas")**: resolver contención real detectada en vivo (~40 usuarios
  activos la misma noche): disparos de `workflow_dispatch` se cancelaban
  entre sí porque `worker.yml` solo permitía una corrida a la vez, dejando
  trabajo pendiente (ej. sync de categorías de Lizzammar Oropeza) esperando
  de más.
- **Objetivo completado:**
  1. `apps/web/src/lib/trigger-worker.ts`: `triggerWorkerNow()` ahora chequea
     si ya hay una corrida `in_progress`/`queued` antes de disparar otra
     (`isWorkerAlreadyActive`) — evita la "guerra de disparos".
  2. `packages/db/prisma/schema.prisma` +
     `packages/db/prisma/migrations/20260731220000_add_user_worker_lock/`:
     nuevo campo `User.workerBusyUntil` (aplicado en producción, cliente
     regenerado).
  3. `apps/worker/src/reservation.ts`: reescrito de reserva en memoria a
     claim atómico en base de datos (`UPDATE` condicional con vencimiento de
     5 min), para que funcione entre procesos separados, no solo entre
     "lanes" del mismo proceso.
  4. `apps/worker/src/queue.ts` y `apps/worker/src/categorySync.ts`:
     adaptados a que `tryReserveUser`/`releaseUser` ahora son `async`.
  5. `apps/worker/src/run-once.ts`: agregado `SYNC_LANE_CONCURRENCY = 2`
     (categorías son más rápidas que publicar, pedido explícito de que no
     hagan esperar tanto).
  6. `.github/workflows/worker.yml`: agregado `strategy.matrix: shard:
[1,2,3,4,5]` en el job `procesar` — 5 shards paralelos por corrida,
     manteniendo el `concurrency: group: auto-articulos-worker` existente
     (evita que dos TANDAS de 5 se superpongan, no bloquea los 5 shards
     entre sí dentro de la misma tanda).
  7. `apps/worker/src/automation/10minutesWebsite.ts` + `queue.ts`: nuevo
     `DailyLimitReachedError` — cuando el sitio confirma el mensaje real de
     "límite diario de creación de artículos", se detiene TODO el lote de
     inmediato (mismo tratamiento que credenciales faltantes) en vez de
     reintentar título por título contra el mismo límite.
- **Pruebas realizadas:** `npx tsc --noEmit` limpio en `apps/worker` y
  `apps/web` en cada paso. Prueba aislada de concurrencia real contra la
  base de producción: 3 llamadas simultáneas a `tryReserveUser` sobre el
  mismo usuario → exactamente 1 ganó el claim. **Verificación en vivo en
  producción (31/7/2026 ~21:47 UTC)**: `gh run view` confirmó 5 jobs
  `procesar (1..5)` corriendo en paralelo en la misma corrida; el lote de
  `miltondavila@gmail.com` (9 títulos) pasó de 0 progreso en 11 minutos
  (con el código viejo, 2 lanes) a 8/9 publicados en pocos minutos con el
  código nuevo; el lote de Lizzammar Oropeza (20 títulos, antes bloqueado
  por el límite diario real del sitio) terminó 20/20 en éxito tras
  quitarle esa restricción desde 10minutesWebsite. Sin errores en ningún
  shard.
- **Commits:** `37947bc` (debounce de disparo), `07bfaca` (5 shards + claim
  en DB), `63029dd` (detener lote ante límite diario real). Todos
  pusheados a `main`. `HANDOFF.md` actualizado con el detalle completo
  (ítems 18-21 del changelog).
- **Archivos modificados sin commit al liberar el área:** ninguno — todo
  quedó commiteado y pusheado.

### Codex

- **Estado:** `TERMINADO — ÁREA LIBERADA`. Módulo **Oportunidades** entregado
  en producción; Codex ya no reserva sus archivos.
- **Tarea:** analizar el rendimiento multiusuario de Google Search Console,
  generar hasta 10 categorías con 9 títulos long tail por categoría evitando
  duplicación/canibalismo, y permitir eliminar o enviar categorías/títulos al
  flujo existente de Publicar e Histórico. No se impondrá en este módulo
  ningún límite interno derivado de 10MinutesWebsite.
- **Reserva actual:** modelos/migración de Oportunidades en `packages/db`,
  helpers de Search Console/análisis en `packages/shared` o `apps/web/src/lib`,
  rutas `apps/web/src/app/api/opportunities/**`, página
  `apps/web/src/app/dashboard/oportunidades/**`, navegación/tipos necesarios y
  documentación compartida. Si resulta imprescindible tocar el worker se
  registrará aquí antes; inicialmente se reutilizará `Run`/`Title` y
  `triggerWorkerNow()` sin modificar `apps/worker/**`.
- **Avance:** implementación completa local: modelos+migración, consulta de
  Search Analytics comparativa, analista OpenAI con validación antirrepetición,
  API multiusuario y UI con eliminar/ejecutar por grupo o título. `tsc` y build
  web limpios. Pendiente commit, migración productiva y deploy. Se detectó un
  cambio ajeno simultáneo en `apps/worker/src/automation/10minutesWebsite.ts`;
  Codex no lo tocó ni lo incluirá en staging/commit.
- **Reserva ampliada:** `.github/workflows/migrate.yml` únicamente para hacer
  que Prisma Migrate use el Session pooler `:5432`; el primer intento en el
  Transaction pooler `:6543` falló con `prepared statement s0 does not exist`
  y el segundo quedó esperando el advisory lock. El runtime web/worker seguirá
  usando `:6543`; no se toca `worker.yml`.
- **Entrega:** commits `05d8d6b` (módulo completo) y `2f33164` (migraciones por
  Session pooler), push a `main`, migración productiva exitosa
  `30707560663` y deploy Vercel `dpl_21hmZQbA7FZzF6kCtmJdsxTWn4mU`. Página y
  GET de API verificados con sesión real, sin pulsar Analizar/Ejecutar ni crear
  publicaciones. El cambio ajeno de FAQ en el worker continúa fuera de los
  commits de Codex.
- **Área reservada cuando se reanude:** OAuth/API/UI de Google y migración
  `20260731210000_add_google_search_console`.
- **Archivos previstos:**
  - `apps/web/src/app/api/search-integrations/google/**`
  - `apps/web/src/components/GoogleSearchConsoleSection.tsx`
  - `apps/web/src/lib/google-oauth.ts`
  - `apps/worker/src/googleIndexing.ts` (NO tocar mientras Claude reserve worker)
  - `packages/shared/src/google-search-console.ts`
  - `packages/db/prisma/migrations/20260731210000_add_google_search_console/**`
  - `.github/workflows/migrate.yml`
- **Últimos commits propios:** `c74f45f` (integración Google) y `f59dadb`
  (workflow temporal de migración).
- **Estado externo:** web desplegada; migración de producción iniciada antes de
  la pausa. Cliente OAuth externo creado y publicado en Google Cloud; alcance
  `webmasters`, origen y callback configurados. El ID/secreto nuevos se cargaron
  de forma cifrada en Vercel Production y GitHub Actions desde el JSON local,
  sin copiarlos al repo ni mostrarlos en terminal. Web redesplegada con esos
  secretos: `dpl_H3bRf2vBJETpmUX2pz192PwYzdu7`.
- **Validación real:** `lorenalvarez30@gmail.com` completó correctamente el
  consentimiento desde producción. Esto confirma OAuth, callback, cifrado y
  persistencia multiusuario, y confirma que la migración Google ya está
  aplicada en la base de producción. No se publicó ningún artículo de prueba.
- **Reserva actual:** rutas/componentes Google en `apps/web`, helper de Search
  Console en `packages/shared` y `apps/worker/src/googleIndexing.ts`. Se agregó
  consulta automática con URL Inspection API y UI para actualizar el estado y
  abrir la solicitud manual en Search Console. No se disparó publicación.
- **Entrega Google:** commit `4641960`, deploy
  `dpl_3T67yEFLhWoPAMBb1GUTCbEK4uLC` listo en producción.
- **Diagnóstico de escalabilidad:** el esquema actual solo ofrece 10 lanes de
  artículos (5 shards × 2) y los lanes ociosos terminan después de 1.5 s. Si
  llegan usuarios mientras sigue una corrida, `triggerWorkerNow()` no abre
  otra y la capacidad que se apagó no vuelve hasta otro workflow. Además,
  `queue.ts` solo examina los primeros 20 runs. Cambio reservado: 10 runners ×
  4 lanes = 40 usuarios, espera ociosa durante la ventana y 100 candidatos.
- **Entrega de escalabilidad:** commit `90b0b16`, push a `main` y deploy Vercel
  `dpl_WZah6vUN2eB4JpQLBF2B15ApuNjT`. La primera corrida automática con esa
  versión fue `30670137653` (schedule, 31/7/2026 22:29:59 UTC): GitHub levantó
  los 10 jobs `procesar (1)` a `procesar (10)` y se comprobó que los diez
  llegaron simultáneamente al paso `Procesar trabajo pendiente`. El usuario
  recibió luz verde para crear/probar un artículo; Codex no disparó el worker
  ni creó una publicación de prueba.

## Zona compartida: requiere coordinación explícita

Estos archivos pueden ser necesarios para ambos y nadie debe asumir control
exclusivo sin anotarlo:

- `HANDOFF.md`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/**`
- `.github/workflows/**`
- cualquier archivo dentro de `apps/worker/**`

Si ambos necesitan uno de estos archivos, termina y confirma primero un agente;
el segundo relee Git, integra sobre la nueva versión y vuelve a validar.

## Protocolo para cerrar y liberar una tarea

El agente que termina debe:

1. Formatear y ejecutar las verificaciones correspondientes.
2. Actualizar `HANDOFF.md` con lo realmente realizado.
3. Escribir aquí el commit, despliegue/migración y resultado.
4. Cambiar su estado a `TERMINADO — ÁREA LIBERADA`.
5. Enumerar cualquier archivo modificado que haya quedado sin commit.
6. Informar al usuario que el otro agente ya puede releer y continuar.

## Registro de entregas

Agregar entradas nuevas arriba de las anteriores con este formato:

```text
Fecha/hora:
Agente:
Tarea:
Archivos/área:
Resultado:
Verificaciones:
Commit:
Push/deploy/migración:
Pendientes:
Estado del área: LIBERADA o RESERVADA
```

### 2026-08-01 ~16:08 UTC — Codex: módulo Oportunidades

- **Agente:** Codex.
- **Tarea:** analista SEO bajo demanda con Google Search Console y generación
  long tail sin duplicación/canibalismo.
- **Archivos/área:** modelos+migración `Opportunity*`, helper Search Analytics,
  API/UI `/opportunities`, navegación y workflow de migración.
- **Resultado:** máximo 10 categorías seleccionadas por rendimiento, 9 títulos
  por grupo, eliminar/ejecutar por grupo o título y transferencia al flujo
  normal `Run`/`Title`. Multiusuario estricto y sin límite interno nuevo de 10
  artículos derivado de 10MinutesWebsite.
- **Verificaciones:** Prisma format/generate, Prettier, `tsc --noEmit`, build
  Next.js y carga autenticada de página/API. No se ejecutó el análisis real ni
  una publicación.
- **Commit:** `05d8d6b`, `2f33164`.
- **Push/deploy/migración:** `main`; migración `30707560663` exitosa; Vercel
  `dpl_21hmZQbA7FZzF6kCtmJdsxTWn4mU` READY.
- **Pendientes:** el usuario puede pulsar **Analizar oportunidades** para la
  primera validación con sus datos reales de Search Console.
- **Estado del área:** LIBERADA.

### 2026-07-31 ~21:53 UTC — Claude: 5 shards + fix de límite diario

- **Agente:** Claude.
- **Tarea:** contención real del worker con ~40 usuarios activos (guerra de
  disparos de `workflow_dispatch`, lotes esperando sin capacidad libre).
- **Archivos/área:** `apps/worker/**`, `.github/workflows/worker.yml`,
  `packages/db/prisma/schema.prisma` + migración `workerBusyUntil`,
  `apps/web/src/lib/trigger-worker.ts`.
- **Resultado:** `worker.yml` corre 5 shards en paralelo
  (`strategy.matrix`); bloqueo por usuario movido de memoria a un claim
  atómico en `User.workerBusyUntil`; `triggerWorkerNow()` ya no dispara si
  hay una corrida activa; nuevo `DailyLimitReachedError` detiene todo el
  lote de inmediato cuando el sitio confirma su límite diario real de
  artículos.
- **Verificaciones:** `tsc --noEmit` limpio en cada paso. Claim atómico
  probado con 3 intentos simultáneos reales (1 ganador). En producción:
  `gh run view` confirmó 5 jobs paralelos; lote de
  `miltondavila@gmail.com` pasó de 0 progreso en 11 min a 8/9 publicados;
  lote de Lizzammar Oropeza (20 títulos) terminó 20/20 tras quitarle el
  límite diario desde 10minutesWebsite. Sin errores en ningún shard.
- **Commit:** `37947bc`, `07bfaca`, `63029dd`.
- **Push/deploy/migración:** pusheado a `main`; migración
  `20260731220000_add_user_worker_lock` aplicada en producción (Supabase);
  no requiere deploy de Vercel (solo `apps/worker`).
- **Pendientes:** ninguno propio; queda pendiente la integración de Google
  Search Console de Codex (sin relación con esta entrega).
- **Estado del área:** LIBERADA.

### 2026-07-31 — Diagnóstico de Mario

- **Agente:** Codex.
- **Tarea:** determinar por qué `mariodavila@gmail.com` aparecía bloqueado.
- **Resultado:** consulta de solo lectura contra la base real del worker:
  `workerBusyUntil = null`, credencial y categorías presentes, límites internos
  disponibles. La causa es el límite externo explícito de 10 artículos/día de
  10minutesWebsite; la corrida se detuvo para proteger el resto del lote.
- **Verificaciones:** workflow temporal `30669052921`, exitoso. No se modificó
  la cuenta ni se disparó el worker.
- **Pendiente:** esperar al día siguiente o pedir a soporte de
  10minutesWebsite que retire el límite para esa cuenta.
- **Estado del área:** workflow diagnóstico eliminado; área LIBERADA.

### 2026-07-31 — Creación del tablero

- **Agente:** Codex.
- **Resultado:** se creó este documento por solicitud del usuario. No se tocó
  `HANDOFF.md` porque contiene cambios activos sin commit atribuidos a Claude.
- **Estado:** Codex permanece pausado; área del worker reservada para Claude.

### 2026-07-31 — Credenciales OAuth Google activadas

- **Agente:** Codex.
- **Tarea:** configuración externa de Google Search Console OAuth.
- **Resultado:** app externa en producción, cliente web correcto y secretos
  cifrados instalados en Vercel/GitHub. Deploy web
  `dpl_H3bRf2vBJETpmUX2pz192PwYzdu7` listo y asociado al dominio de producción.
- **Pendiente:** elegir la propiedad de Lorena, guardar su sitemap y confirmar
  que la UI reporte la configuración completa.
- **Estado del área:** RESERVADA por Codex. Worker continúa reservado por Claude.

## Archivos ajenos fuera de alcance

`PRD_CALCULADORA_ROGE.md` y `calculadora-roge/` pertenecen a otro proyecto. No
leerlos, modificarlos, formatearlos, eliminarlos ni incluirlos en commits de
Auto Artículos.
