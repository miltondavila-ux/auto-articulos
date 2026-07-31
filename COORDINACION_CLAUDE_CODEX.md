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

- **Estado:** ACTIVO — verificando en producción, sin editar código nuevo.
  Área todavía RESERVADA hasta confirmar el resultado del próximo cron.
- **Tarea:** resolver contención real detectada en vivo (~40 usuarios activos
  la misma noche): disparos de `workflow_dispatch` se cancelaban entre sí
  porque `worker.yml` solo permitía una corrida a la vez, dejando trabajo
  pendiente (ej. sync de categorías de Lizzammar Oropeza) esperando de más.
- **Objetivo exacto ya completado:**
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
- **Pruebas realizadas:** `npx tsc --noEmit` limpio en `apps/worker` y
  `apps/web`. Prueba aislada de concurrencia real contra la base de
  producción: 3 llamadas simultáneas a `tryReserveUser` sobre el mismo
  usuario → exactamente 1 ganó el claim, confirmado antes de desplegar.
- **Commits:** `37947bc` (debounce de disparo), `07bfaca` (5 shards + claim
  en DB). Ambos pusheados a `main`.
- **Falta antes de liberar el área:** confirmar en la PRÓXIMA corrida real
  (cron cada 5 min) que `gh run list --workflow=worker.yml` muestra 5 jobs
  paralelos, y que el `CategorySyncJob` pendiente de Lizzammar Oropeza
  (`lizzaoropezarealtor@gmail.com`) pasa de `pending` a `success`/`error`.
  No se disparó manualmente el worker (regla: el usuario prueba, no la IA) —
  se espera al cron.

### Codex

- **Estado:** PAUSADO por indicación del usuario hasta que Claude termine.
- **Tarea:** integración multiusuario con Google Search Console.
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
  la pausa; faltan las credenciales reales del cliente OAuth de Google.

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

### 2026-07-31 — Creación del tablero

- **Agente:** Codex.
- **Resultado:** se creó este documento por solicitud del usuario. No se tocó
  `HANDOFF.md` porque contiene cambios activos sin commit atribuidos a Claude.
- **Estado:** Codex permanece pausado; área del worker reservada para Claude.

## Archivos ajenos fuera de alcance

`PRD_CALCULADORA_ROGE.md` y `calculadora-roge/` pertenecen a otro proyecto. No
leerlos, modificarlos, formatearlos, eliminarlos ni incluirlos en commits de
Auto Artículos.
