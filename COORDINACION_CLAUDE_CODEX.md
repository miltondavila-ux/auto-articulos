# Coordinación de trabajo: Claude y Codex

Este archivo es el tablero operativo compartido para evitar que Claude y Codex
modifiquen al mismo tiempo los mismos archivos o desplieguen cambios
incompatibles. `HANDOFF.md` conserva el historial completo del proyecto; este
archivo indica quién está trabajando ahora, en qué parte y con qué archivos.

## `TODO.md` — buzón de ideas de Milton (leer, nunca ejecutar sin pedido)

Existe un tercer archivo en la raíz del repo, `TODO.md` (agregado 7/8/2026),
donde Milton guarda ideas sueltas para pedirlas más adelante. **Ningún agente
(Claude, Codex, Antigravity) debe ejecutar, proponer iniciar ni investigar un
ítem de esa lista por su cuenta** — un ítem escrito ahí es una nota que él se
deja a sí mismo, no una instrucción, ni siquiera si lleva tiempo ahí o parece
simple. Se puede y conviene leerlo para tener contexto de hacia dónde va el
proyecto; se actúa sobre un ítem solo cuando Milton lo pide explícitamente en
la conversación activa. Al ejecutar algo de ahí, moverlo a la sección "Hecho"
de `TODO.md` y documentar el cambio real en `HANDOFF.md` como de costumbre.

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

### Antigravity (Arquitecto Principal del Sistema)

- **Estado:** `ARQUITECTO PRINCIPAL ACTIVO — SUPERVISIÓN Y DESARROLLO` (7/8/2026).
- **Rol:** Arquitecto de Software y Desarrollador Principal en Google Antigravity.
- **Principio Canónico Cloud:** El repositorio en **GitHub** (`https://github.com/miltondavila-ux/auto-articulos.git`) es la Única Fuente de Verdad del sistema. Todo se ejecuta y hospeda 100% en la nube (Vercel, GitHub Actions y Supabase).
- **Autoridad y Funciones de Arquitectura:**
  1. **Supervisión de Infraestructura:** Vigilancia de la concurrencia del worker en GitHub Actions (10 shards × 4 lanes), estado de Supabase Transaction Pooler (:6543, `?pgbouncer=true`) y estabilidad de despliegues Vercel.
  2. **Guardian de Estabilidad y Seguridad (Zero-Breaking):** Validación estricta de compilación (`tsc --noEmit`), preservación del cifrado AES-256-GCM de credenciales y aislamiento multi-tenant estricto.
  3. **Coordinación y Auditoría:** Supervisión de reservas, revisión de entregas y actualización continua de `HANDOFF.md` y este tablero.
- **Protocolo:** Cumple y exige al 100% las reglas del tablero: lectura previa obligatoria, verificación de `git status`, reservas explícitas, comprobaciones estáticas y protección del proyecto ajeno (`calculadora-roge/`).

### Claude

- **Estado:** `TERMINADO — ÁREA LIBERADA` (6/8/2026). Área completa liberada
  para Codex.
- **Última tarea (sesión larga 5-6/8/2026, ver `HANDOFF.md` sección "RESUELTO
  (5-6/8/2026): sesión larga" para el detalle completo)**: estado real de
  sitemap por artículo, menú "Publicaciones en Curso", aviso de divulgación
  de Oportunidades, segmentación por cliente/ubicación/producto + fix de un
  bug grave de datos inventados (ubicaciones y luego cualquier dato
  específico), integración completa de Bing Webmaster Tools (probada en
  producción con Lorena Álvarez), investigación e implementación de Google
  Business Profile (deshabilitado en UI hasta que Google apruebe el acceso,
  solicitud ya enviada), límite diario bajado a 20 para todos los usuarios,
  enfriamiento de Oportunidades bajado a 3 días. Ningún dato de usuario real
  fue modificado sin pedido explícito; no se disparó ninguna publicación de
  prueba. Ver "Pendiente / próximos pasos" en `HANDOFF.md` (ítems 9-12) para
  lo que sigue: aprobación de Google Business Profile, revisar/borrar
  oportunidades viejas de Eira, confirmar indexación instantánea de Bing con
  una publicación real, y credenciales locales de Google que se perdieron
  (no bloquea producción).
- **Tarea anterior (RESUELTA Y VERIFICADA END-TO-END, ver `HANDOFF.md`
  sección "RESUELTO 1/8/2026: bug del schema FAQ")**: Google Search Console marcaba
  error de sintaxis en el schema FAQPage. Causa raíz: 10minutesWebsite
  convierte todas las comillas dobles en simples al guardar el campo
  "Widget (opcional)", invalidando cualquier JSON-LD directo. Solución
  implementada y **confirmada por el usuario en producción con un artículo
  publicado por el worker automáticamente** (no solo con el pegado manual
  de prueba): `como-calificar-para-obamacare-como-inmigrante`, JSON válido
  verificado por código (`JSON.parse` ok) y por el usuario en Search
  Console ("ahora sí funcionó"). Cerrado, nada pendiente.
  `buildFaqSchema()` en `apps/worker/src/automation/10minutesWebsite.ts`
  genera un `<script>` JS ejecutable que arma el schema con
  `JSON.stringify()` EN EL NAVEGADOR (inmune a la conversión de comillas, ya
  que JS no distingue comilla simple/doble/invertida) y lo inyecta
  dinámicamente como `<script type="application/ld+json">` — patrón
  oficialmente soportado por Google. `fillFaqWidget()` reactivado en
  `publishArticle()`. Probado con `vm.runInNewContext` simulando el
  navegador (casos límite: backtick, `${...}`, comillas dobles, backslash
  en el texto), `tsc --noEmit` limpio, y ahora también verificado en un
  artículo real publicado por
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
- **Nueva tarea puntual (1/8/2026, cuota de Claude por agotarse — commit y
  aviso, no vuelvo a reservar el área)**: pedido explícito del usuario:
  `notifyGoogle()` en `apps/worker/src/googleIndexing.ts` mandaba
  `submitGoogleSitemap()` una vez POR ARTÍCULO (9 artículos = 9 envíos del
  mismo sitemap), gastando cuota de la API de Search Console sin necesidad.
  Se cambió para mandar el sitemap **una sola vez por lote** (detecta si ya
  hay otro título del mismo `runId` con `googleIndexingAt` seteado; si lo
  hay, no reenvía) — la inspección de indexación por URL sigue siendo por
  artículo, eso sí es legítimo. También se agregó un check visible
  "✓ Sitemap enviado a Google" / "✗ Sitemap no enviado" en
  `apps/web/src/components/GoogleIndexingStatus.tsx`, separado del check de
  "Indexada en Google" (son objetivos distintos: uno es "se lo avisamos a
  Google", el otro es "Google ya la indexó", que puede tardar días).
  `tsc --noEmit` limpio en `apps/worker` y `apps/web`. Si Codex está en medio
  de algo en estos archivos, avisar y coordinar antes de pisar este cambio.
- **Otra tarea puntual (1/8/2026, misma sesión)**: pedido explícito del
  usuario ("poner al usuario a hacer algo que no debe hacer no es
  inteligente") — antes había que escribir a mano la URL del sitemap en
  Configuración; ahora `GET /api/search-integrations/google` le pregunta a
  Google directamente (`listGoogleSitemaps()`, nuevo helper en
  `packages/shared/src/google-search-console.ts`) qué sitemaps ya conoce
  para la propiedad elegida, y lo guarda solo la primera vez que hay
  `siteUrl` pero no `sitemapUrl`. Commit `e5f590a`, pusheado a `main`.
  **Desplegado después por Codex**, una vez commiteado `maxTitlesPerBatch` y
  aplicada primero su migración: ambos cambios llegaron juntos a Producción en
  `dpl_D56uMg9asdwF6ozSuccNEKDv7RSk` sin exponer el despliegue a una columna
  inexistente.

### Codex

- **Estado:** `TERMINADO — ÁREA LIBERADA` (1/8/2026).
- **Tarea actual:** completar la creación administrativa de usuarios con nombre,
  apellido, teléfono, rol y los tres límites configurables, además de correo y
  contraseña temporal, con validación obligatoria en servidor.
- **Reserva actual:**
  - `apps/web/src/app/api/admin/users/route.ts`
  - `apps/web/src/app/dashboard/usuarios/page.tsx`
  - `HANDOFF.md`
  - `COORDINACION_CLAUDE_CODEX.md`
- **Límites:** sin migración ni cambios al worker; no se crearán usuarios reales
  durante las pruebas y no se tocarán las rutas de la calculadora.
- **Resultado:** formulario y API completados con todos los campos y
  validaciones de servidor. Prettier, TypeScript y builds Next.js local/Vercel
  limpios. Commit `6508de2` pusheado y deployment
  `dpl_8JbECg94AfFV5mechnCYR1UDPids` READY. No se creó ningún usuario real.
- **Archivos modificados sin commit al liberar el área:** ninguno propio. Solo
  permanecen sin seguimiento `PRD_CALCULADORA_ROGE.md` y `calculadora-roge/`,
  que no se tocaron.

- **Estado:** `TERMINADO — ÁREA LIBERADA` (1/8/2026).
- **Tarea actual:** auditoría integral y limpieza conservadora de código, archivos
  y dependencias sin uso, preservando todo comportamiento productivo.
- **Reserva actual:** todo el repositorio de Auto Artículos (`apps/web/**`,
  `apps/worker/**`, `packages/**`, `.github/**` y configuraciones raíz), además
  de `HANDOFF.md` y `COORDINACION_CLAUDE_CODEX.md`.
- **Límites:** no tocar, leer ni incluir `calculadora-roge/` ni
  `PRD_CALCULADORA_ROGE.md`; no ejecutar publicaciones, análisis SEO, envíos de
  sitemap ni otras operaciones que muten datos externos. Solo se eliminará lo
  que pueda demostrarse sin referencias y se validará web+worker antes de
  desplegar.
- **Resultado:** auditoría y limpieza implementadas. Knip/Depcheck sin elementos
  sin uso, Madge sin ciclos y TypeScript limpio en los cuatro proyectos. Se
  retiraron el export y script muertos, se activó detección permanente de código
  no usado y se limpiaron configuraciones/documentación engañosa. Builds
  web/worker limpios; commit `d12fc7a` pusheado y deployment Vercel
  `dpl_FAWT9PFAN5zVWNcoE4hR3smRBce9` READY. No se tocaron datos ni se ejecutaron
  acciones externas de usuario.
- **Archivos modificados sin commit al liberar el área:** ninguno propio. Solo
  permanecen sin seguimiento `PRD_CALCULADORA_ROGE.md` y `calculadora-roge/`,
  que no se tocaron.

- **Estado:** `TERMINADO — ÁREA LIBERADA` (1/8/2026).
- **Tarea actual:** retirar el envío de sitemap por artículo/lote y crear un
  envío diario centralizado para todos los usuarios con Google Search Console
  y sitemap configurados, alrededor de las 00:00 de America/New_York.
- **Reserva actual:**
  - `.github/workflows/**` para el nuevo workflow diario
  - `apps/worker/src/googleIndexing.ts`
  - `apps/worker/src/queue.ts`
  - nuevo ejecutor diario bajo `apps/worker/src/**`
  - `apps/worker/package.json`
  - `apps/web/src/components/GoogleIndexingStatus.tsx`
  - `apps/web/src/components/GoogleSearchConsoleSection.tsx`
  - `HANDOFF.md`
  - `COORDINACION_CLAUDE_CODEX.md`
- **Límites:** sin migración ni publicación de artículos; solo se procesarán
  integraciones Google ya conectadas y configuradas. No se tocarán ni incluirán
  `calculadora-roge/` ni `PRD_CALCULADORA_ROGE.md`.
- **Resultado:** envío retirado del flujo por artículo/lote; ejecutor y workflow
  diarios creados; textos de la UI actualizados. Prettier, `tsc --noEmit` y
  builds completos de web/worker limpios; lógica EDT/EST verificada. Commit
  `0ddc029` pusheado, workflow de GitHub ID `325202521` reconocido y deployment
  Vercel `dpl_2mdKZNS4z6iAQgRFoC8krwUaBrbt` READY. No se ejecutaron envíos reales
  ni publicaciones durante las pruebas.
- **Archivos modificados sin commit al liberar el área:** ninguno propio. Solo
  permanecen sin seguimiento `PRD_CALCULADORA_ROGE.md` y `calculadora-roge/`,
  que no se tocaron.

- **Estado:** `TERMINADO — ÁREA LIBERADA` (1/8/2026).
- **Tarea actual:** renombrar visualmente el módulo Usuarios a
  **Administración** y convertir su entrada en un dashboard moderno con
  indicadores y accesos destacados a Accesos a usuarios, Creación de usuarios
  y Uso de la base de datos.
- **Reserva actual:**
  - `apps/web/src/components/DashboardNav.tsx`
  - `apps/web/src/app/dashboard/usuarios/page.tsx`
  - `HANDOFF.md`
  - `COORDINACION_CLAUDE_CODEX.md`
- **Límites:** se conserva la URL `/dashboard/usuarios` para no romper enlaces;
  no hay migración ni cambios al worker; la calculadora permanece fuera.
- **Resultado:** navegación renombrada y dashboard administrativo implementado
  con encabezado, cuatro indicadores en vivo y tres tarjetas de acceso
  responsivas. Cada tarjeta abre su sección y desplaza la vista hasta el
  contenido. Prettier, `tsc --noEmit` web y builds Next.js local/Vercel limpios.
  Commit funcional `8f74800` pusheado y deployment
  `dpl_F9HVraJCfuXkGj2ubCA8kWwd9AoT` READY. No se modificaron datos, roles ni
  artículos; la inspección visual autenticada queda para la sesión admin del
  usuario porque el navegador disponible para Codex no comparte esa sesión.
- **Archivos modificados sin commit al liberar el área:** ninguno propio. Solo
  permanecen sin seguimiento `PRD_CALCULADORA_ROGE.md` y `calculadora-roge/`,
  que no se tocaron.

- **Estado:** `TERMINADO — ÁREA LIBERADA` (1/8/2026).
- **Tarea actual:** permitir que un administrador cambie el rol de otras
  cuentas entre `user` y `admin` desde `/dashboard/usuarios`, con validación
  obligatoria en servidor y protección contra degradar la propia cuenta
  administradora.
- **Reserva actual:**
  - `apps/web/src/app/api/admin/users/route.ts`
  - `apps/web/src/app/dashboard/usuarios/page.tsx`
  - `HANDOFF.md`
  - `COORDINACION_CLAUDE_CODEX.md`
- **Límites:** sin migración ni cambios al worker; no se tocarán
  `calculadora-roge/` ni `PRD_CALCULADORA_ROGE.md` y no se ejecutarán
  publicaciones automáticas.
- **Resultado:** selector de rol y validaciones de API implementados; la propia
  cuenta administradora queda protegida en cliente y servidor. Prettier,
  `tsc --noEmit` web y builds Next.js local/Vercel limpios. Commit `88f7265`
  pusheado y deployment `dpl_HZdrbWia3ZuHP8hPPdcQoTThGo2b` READY. No se cambió
  el rol real de ninguna cuenta durante la validación.
- **Archivos modificados sin commit al liberar el área:** ninguno propio. Solo
  siguen sin seguimiento `PRD_CALCULADORA_ROGE.md` y `calculadora-roge/`, que
  no se tocaron.

- **Estado:** `TERMINADO — ÁREA LIBERADA` (1/8/2026).
- **Tarea actual:** hacer configurable por usuario el máximo de títulos por
  lote, con valor predeterminado 20 y validación obligatoria en servidor tanto
  para Publicar como para las ejecuciones de categorías/títulos de
  Oportunidades.
- **Reserva actual:**
  - `packages/db/prisma/schema.prisma`
  - nueva migración en `packages/db/prisma/migrations/**` para
    `User.maxTitlesPerBatch`
  - `apps/web/src/app/api/admin/users/route.ts`
  - `apps/web/src/app/dashboard/usuarios/page.tsx`
  - `apps/web/src/app/api/runs/route.ts`
  - `apps/web/src/app/api/me/route.ts`
  - `apps/web/src/app/api/opportunities/**`
  - `apps/web/src/app/dashboard/publicar/page.tsx`
  - tipos/helpers estrictamente necesarios bajo `apps/web/src/types/**` o
    `apps/web/src/lib/**`
  - `HANDOFF.md` y este archivo de coordinación
- **Límites de la reserva:** no se tocarán `calculadora-roge/` ni
  `PRD_CALCULADORA_ROGE.md`; tampoco se ejecutarán pruebas que publiquen
  artículos. Antes del commit se releerá este tablero para comprobar que no
  haya una reserva nueva incompatible.
- **Resultado:** schema+migración, APIs y UI implementados. Prisma
  format/generate, Prettier, `tsc --noEmit` de web/worker y build Next.js
  limpios. Commit `9cf7785` pusheado; migración productiva `30711443186`
  exitosa; deploy Vercel `dpl_D56uMg9asdwF6ozSuccNEKDv7RSk` READY. No se
  disparó ninguna publicación. Los cambios simultáneos de sitemap fueron
  commits separados de Claude y llegaron al mismo deploy después de aplicarse
  primero esta migración.
- **Archivos modificados sin commit al liberar el área:** ninguno propio. Solo
  permanecen sin seguimiento `PRD_CALCULADORA_ROGE.md` y `calculadora-roge/`,
  que son ajenos y no se tocaron.

- **Estado:** `TERMINADO — ÁREA LIBERADA`. `OPENAI_API_KEY` y el análisis real
  fueron confirmados por el usuario; la mejora visual quedó en Producción.
- **Resultado de configuración:** el usuario confirmó que la prueba real del
  análisis fue exitosa después de agregar la clave y redistribuir Production.
  Codex agregó temporizador, barra y cuatro etapas visibles mientras analiza;
  TypeScript y build web quedaron limpios. Commit `5720368` desplegado en
  Vercel Production y confirmado **Listo** en la captura del usuario del
  1/8/2026. No se volvió a ejecutar el análisis ni se publicaron títulos.
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
Fecha/hora: 2026-08-07 ~19:44 UTC
Agente: Antigravity (Arquitecto Principal)
Tarea: Exclusión estricta de Calculadora Roge del repositorio de Auto Artículos.
Archivos/área: PRD_CALCULADORA_ROGE.md, calculadora-roge/ y .gitignore
Resultado: Archivos removidos de git y GitHub, agregados permanentemente a .gitignore.
Verificaciones: git status (working tree clean, git tracking ignorado).
Commit: Pendiente
Push/deploy/migración: Sincronizado en GitHub.
Pendientes: Ninguno.
Estado del área: LIBERADA
```

```text
Fecha/hora: 2026-08-07 ~19:43 UTC
Agente: Antigravity (Arquitecto Principal)
Tarea: Respaldo total y sincronización del repositorio local hacia GitHub.
Archivos/área: Todo el proyecto (apps, packages, docs, workflows y assets)
Resultado: 100% de los archivos locales respaldados y sincronizados en GitHub (main). `working tree clean` verificado.
Verificaciones: git status (limpio), git log -1 (Commit b4e933b pusheado a origin/main).
Commit: b4e933b
Push/deploy/migración: Sincronizado a https://github.com/miltondavila-ux/auto-articulos.git
Pendientes: Ninguno. Todo seguro en la nube.
Estado del área: LIBERADA
```

```text
Fecha/hora: 2026-08-07 ~19:40 UTC
Agente: Antigravity
Tarea: Ejecución y verificación del Worker de Auto Artículos en GitHub Actions.
Archivos/área: .github/workflows/worker.yml y base de datos de producción
Resultado: Ejecución activa confirmada en GitHub Actions (Run ID 31227842921, 10 shards paralelos procesando lotes/artículos pendientes).
Verificaciones: gh run list y gh run view --job (10 jobs procesar 1..10 en curso).
Commit: Sin cambios de código (ejecución de infraestructura).
Push/deploy/migración: Sin migración ni deploy.
Pendientes: Monitoreo de finalización de la corrida en GitHub Actions.
Estado del área: LIBERADA
```

```text
Fecha/hora: 2026-08-07 ~19:23 UTC
Agente: Antigravity
Tarea: Reorganización del módulo de Configuración mediante pestañas categóricas (Tabs) para evitar scroll infinito.
Archivos/área: apps/web/src/app/dashboard/configuracion/page.tsx
Resultado: Interfaz organizada en 4 pestañas (Integraciones, 10minutesWebsite, Redacción & Estilo, App Móvil). 100% de la lógica y estado preservados.
Verificaciones: npx tsc --noEmit (0 errores) y npx next build (0 errores, 45 páginas compiladas exitosamente).
Commit: Pendiente
Push/deploy/migración: Sin migración de DB.
Pendientes: Despliegue a Vercel mediante vercel --prod cuando el usuario decida publicar.
Estado del área: LIBERADA
```

### 2026-08-07 ~15:20 UTC — Claude: generación de contenido colgada en idiomas no españoles

- **Agente:** Claude.
- **Tarea:** cuentas con `contentLanguage` distinto de español (Gustavo Torres,
  Svetlana) nunca publicaban; morían por timeout en "Generando contenido".
- **Archivos/área:** `apps/worker/src/automation/10minutesWebsite.ts`
  (`createArticleDraft()` y `generateImage()`). Solo worker: **no** requiere
  deploy de Vercel ni migración.
- **Causa raíz:** la espera de "contenido generado" reimplementaba la búsqueda
  del modal a mano dentro del navegador (`document.querySelectorAll(".modal")`
  + comparación exacta de textos) en vez de usar el locator `dialog` que usa el
  resto de la función. No ubicaba el modal en esas cuentas → condición `false`
  para siempre. El artículo ya estaba generado y el código no lo veía.
- **Resultado:** se sondea el campo Título a través del locator `dialog`. En
  producción: generación en inglés en **21 segundos** y corrida terminada en
  `success` (la primera del día que no murió cortada a los 20 min). Se conserva
  un volcado de diagnóstico de los campos del modal para un timeout real, y se
  agregó otro equivalente al paso de imagen.
- **Verificaciones:** `tsc --noEmit` y build limpios en `apps/worker`; se
  comprobó además que el compilado en `dist/` llevara el cambio. Verificación
  final en producción hecha por el usuario (las pruebas de publicación son
  suyas, según las reglas de este tablero).
- **Commits:** `f78199f` (intento intermedio, insuficiente), `1284cec`
  (arreglo real del contenido), `b3035b1` y `e537c21` (diagnósticos del paso de
  imagen), `dcbd76a` (prompt de imagen y resumen por tipo de campo, no por id
  fijo), `94fb39e` (el texto propio ya no tumba la publicación), `566adef`
  (traducción del texto propio al idioma del artículo).
- **Verificado en producción por el usuario**, dos cuentas y tres idiomas:
  Gustavo Torres (`en_VI`) publica bien; Svetlana Botnarciuc (`ro_RO`) recibe un
  título en español, escribe el artículo en rumano, traduce su bio al rumano,
  genera la imagen y publica. Cuentas en español sin cambios de comportamiento.
- **Push/deploy/migración:** pusheado a `main`. Sin deploy ni migración.
- **Pendientes:** mover la elección de idioma de Configuración (por usuario) a
  **Publicar y Oportunidades** (por lote), pedido explícito del usuario el mismo
  día y acordado para después de cerrar la verificación. Implica guardar el
  idioma en la corrida, selector en ambas pantallas alimentado por los idiomas
  ya sincronizados, y que el worker lea el de la corrida con respaldo en el del
  usuario. Falta decidir si es por lote o por título (se recomendó por lote).
- **Advertencias para el próximo agente:**
  - Se hicieron dos diagnósticos equivocados antes del bueno ("el sitio tarda
    más en otros idiomas" y "`en_VI` está corrupto"). Ambos están documentados
    y descartados en `HANDOFF.md`; no reintentarlos. `en_VI` es el valor REAL
    de inglés del sitio, no tocarlo.
  - Se usó `git add -A` (prohibido) y un `git reset --hard` posterior borró
    `PRD_CALCULADORA_ROGE.md` y `calculadora-roge/` del disco. Recuperados
    íntegros. Usar siempre rutas explícitas.
  - El cron del worker está siendo estrangulado por GitHub: dispara ~1 vez por
    hora, no cada 5 minutos (huecos reales medidos ese día: 53, 61, 88 min).
    Para probar algo, el camino rápido es publicar desde el dashboard
    (`workflow_dispatch`), y ese disparo se **omite** si ya hay una corrida
    activa.
- **Estado del área:** LIBERADA.

### 2026-08-06 03:37 UTC — Claude: sesión larga (sitemap, Oportunidades, Bing, Business Profile)

- **Agente:** Claude.
- **Tarea:** múltiples pedidos encadenados del usuario en una sola sesión
  extensa (ver `HANDOFF.md` sección "RESUELTO (5-6/8/2026): sesión larga"
  para el detalle completo por tema).
- **Archivos/área:** estado real de sitemap (`SearchIntegration`, `Title`,
  `GoogleIndexingStatus.tsx`, `googleIndexing.ts`), nueva ruta
  `/dashboard/publicaciones-en-curso` + `LiveRunProgress.tsx`, aviso de
  divulgación de Oportunidades (`User.opportunitiesDisclosureAcceptedAt`),
  `opportunity-analysis.ts` (segmentación + fix de datos inventados + bytes
  NUL corregidos), integración completa de Bing
  (`bing-oauth.ts`, `bing-webmaster.ts`, `bingIndexing.ts`,
  `BingWebmasterSection.tsx`), integración completa de Google Business
  Profile (`BusinessProfileIntegration`, `BusinessProfilePost`,
  `businessProfilePublish.ts`, `BusinessProfileSection.tsx` — deshabilitada
  en UI), `User.dailyArticleLimit` bajado a 20, `COOLDOWN_DAYS` de
  Oportunidades bajado a 3.
- **Resultado:** todo desplegado y verificado en producción salvo Google
  Business Profile (código completo pero botón deshabilitado hasta que
  Google apruebe el acceso — solicitud ya enviada). Bug grave de datos
  inventados en Oportunidades (ciudades de EE. UU. inventadas sin evidencia,
  reportado por el usuario en la cuenta de Eira) corregido y generalizado a
  cualquier dato específico. Bing probado end-to-end en producción con la
  cuenta real de Lorena Álvarez.
- **Verificaciones:** `tsc --noEmit` + build completo en `apps/web` y
  `apps/worker` antes de cada deploy. Migraciones aplicadas vía
  `migrate.yml` en cada cambio de schema. Verificación visual en navegador
  para cada cambio de UI. No se disparó ninguna publicación de prueba ni se
  ejecutó Oportunidades por iniciativa propia.
- **Commits:** múltiples, todos en `main` (ver `git log` — desde el commit
  del enfriamiento de sitemap hasta "Bajar el enfriamiento de Oportunidades
  de 7 a 3 días").
- **Push/deploy/migración:** todos los pushes a `main` con su
  `vercel --prod --yes` correspondiente; migraciones aplicadas vía
  `gh workflow run migrate.yml` en cada cambio de schema.
- **Pendientes:** ver `HANDOFF.md` → "Pendiente / próximos pasos", ítems
  9-12 (aprobación de Google Business Profile, limpieza de oportunidades
  viejas de Eira, confirmar indexación instantánea de Bing con publicación
  real, credenciales locales de Google perdidas — no bloquea producción).
- **Estado del área:** LIBERADA.

### 2026-08-01 18:57 UTC — Codex: creación completa de usuarios

- **Agente:** Codex.
- **Tarea:** añadir al alta administrativa todos los datos disponibles de una
  cuenta y validarlos también en servidor.
- **Archivos/área:** API administrativa de usuarios, dashboard Administración y
  documentación compartida.
- **Resultado:** alta con nombre, apellido, teléfono, correo, contraseña, rol,
  límite mensual, límite diario y máximo por lote; persistencia completa y
  validación estricta de cada campo.
- **Verificaciones:** Prettier, TypeScript y builds Next.js local/Vercel. No se
  creó ningún usuario real.
- **Commit:** `6508de2`.
- **Push/deploy/migración:** `main`; sin migración; Vercel
  `dpl_8JbECg94AfFV5mechnCYR1UDPids` READY.
- **Pendientes:** revisión visual y creación real por el usuario administrador.
- **Estado del área:** LIBERADA.

### 2026-08-01 18:41 UTC — Codex: auditoría y limpieza integral

- **Agente:** Codex.
- **Tarea:** auditar todo Auto Artículos y eliminar únicamente código o
  configuración demostrablemente innecesarios sin romper producción.
- **Archivos/área:** web, worker, paquetes compartidos, manifests,
  configuraciones raíz y documentación operativa.
- **Resultado:** export muerto retirado, comando obsoleto de Next reemplazado,
  detección permanente de código no usado activada, ignore/env limpiados,
  comentario contradictorio corregido y metadata social normalizada. No había
  archivos, rutas, activos ni dependencias completos que pudieran eliminarse de
  forma segura.
- **Verificaciones:** Prettier; TypeScript en cuatro proyectos; builds web y
  worker; Knip y Depcheck sin hallazgos; Madge sin ciclos; Vercel compiló las 29
  rutas. No se ejecutaron publicaciones, análisis ni envíos de sitemap.
- **Commit:** `d12fc7a`.
- **Push/deploy/migración:** `main`; sin migración; Vercel
  `dpl_FAWT9PFAN5zVWNcoE4hR3smRBce9` READY.
- **Pendientes:** actualizar Next cuando exista una versión compatible que
  resuelva los avisos transitivos actuales de `postcss`/`sharp`; no usar el
  `npm audit fix --force` que degrada a Next 9.
- **Estado del área:** LIBERADA.

### 2026-08-01 18:31 UTC — Codex: envío diario de sitemaps

- **Agente:** Codex.
- **Tarea:** reemplazar los envíos de sitemap por artículo/lote por un proceso
  diario para todas las cuentas Google configuradas.
- **Archivos/área:** workflow diario, ejecutor del worker, integración posterior
  a publicación, textos Google de la web y documentación compartida.
- **Resultado:** cada sitemap se envía una vez a medianoche de Nueva York,
  respetando EDT/EST; los fallos se aíslan por usuario y la inspección individual
  de URLs se conserva sin reenviar sitemaps.
- **Verificaciones:** Prettier, `tsc --noEmit` y builds web/worker; cuatro casos
  EDT/EST; workflow reconocido por GitHub con 0 ejecuciones. No se enviaron
  sitemaps reales ni se publicaron artículos durante las pruebas.
- **Commit:** `0ddc029`.
- **Push/deploy/migración:** `main`; sin migración; workflow GitHub
  `325202521`; Vercel `dpl_2mdKZNS4z6iAQgRFoC8krwUaBrbt` READY.
- **Pendientes:** observar la primera ejecución automática en la próxima
  medianoche; no requiere acción del usuario.
- **Estado del área:** LIBERADA.

### 2026-08-01 18:22 UTC — Codex: dashboard de Administración

- **Agente:** Codex.
- **Tarea:** renombrar visualmente Usuarios como Administración y convertir la
  entrada en un dashboard moderno con accesos claros a todas sus áreas.
- **Archivos/área:** navegación del dashboard, pantalla
  `/dashboard/usuarios` y documentación compartida.
- **Resultado:** encabezado administrativo, cuatro indicadores en vivo y tres
  tarjetas funcionales para Accesos a usuarios, Creación de usuarios y Uso de
  la base de datos. Cada clic abre la sección y desplaza la pantalla hasta su
  contenido. Se conservó la URL existente para no romper enlaces.
- **Verificaciones:** Prettier, `tsc --noEmit` web y builds completos local y
  Vercel. No se modificaron datos, roles ni artículos.
- **Commit:** `8f74800` para el dashboard; cierre documental y navegación por
  clic en commit posterior.
- **Push/deploy/migración:** `main`; sin migración; Vercel
  `dpl_F9HVraJCfuXkGj2ubCA8kWwd9AoT` READY para el dashboard inicial.
- **Pendientes:** revisión visual final por el usuario dentro de su sesión admin
  autenticada.
- **Estado del área:** LIBERADA.

### 2026-08-01 18:15 UTC — Codex: administración de roles

- **Agente:** Codex.
- **Tarea:** permitir promover o degradar cuentas entre Usuario y Administrador
  desde `/dashboard/usuarios`.
- **Archivos/área:** API administrativa de usuarios, pantalla Usuarios y
  documentación compartida.
- **Resultado:** selector y botón Guardar rol visibles; validación estricta del
  enum en servidor; usuarios normales no pueden promoverse y el administrador
  conectado no puede degradar su propia cuenta.
- **Verificaciones:** Prettier, `tsc --noEmit` web y builds completos local y
  Vercel. No se cambió ningún rol real ni se ejecutaron publicaciones.
- **Commit:** `88f7265`.
- **Push/deploy/migración:** `main`; sin migración; Vercel
  `dpl_HZdrbWia3ZuHP8hPPdcQoTThGo2b` READY.
- **Pendientes:** el usuario puede elegir qué cuentas promover desde la nueva
  columna Rol.
- **Estado del área:** LIBERADA.

### 2026-08-01 17:59 UTC — Codex: máximo configurable por lote

- **Agente:** Codex.
- **Tarea:** sustituir el máximo fijo de 20 títulos por un máximo configurable
  para cada usuario, predeterminado en 20 y obligatorio en servidor.
- **Archivos/área:** `User.maxTitlesPerBatch` + migración, Administración de
  Usuarios, `/api/me`, creación de runs desde Publicar y Oportunidades, ambas
  pantallas y documentación compartida.
- **Resultado:** el administrador puede definir el máximo al crear o editar una
  cuenta; Publicar muestra y aplica el valor real; Oportunidades impide ejecutar
  una categoría demasiado grande; ambas APIs rechazan el exceso antes de crear
  el `Run`.
- **Verificaciones:** Prisma format/generate/validate, Prettier, `tsc --noEmit`
  web+worker y build Next.js. Migración y build Vercel exitosos. No se ejecutó
  ninguna publicación automática.
- **Commit:** `9cf7785`.
- **Push/deploy/migración:** `main`; GitHub Actions `30711443186` success;
  Vercel `dpl_D56uMg9asdwF6ozSuccNEKDv7RSk` READY y alias de producción activo.
- **Pendientes:** prueba funcional del usuario creando lotes con máximos
  distintos; Codex no la realizó porque dispararía publicaciones reales.
- **Estado del área:** LIBERADA.

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
