# MASTER BLUEPRINT — CONEXION COMPOSIO

**Proyecto:** Auto Artículos (LA Solución AI) · **Dueño del producto:** Milton
**Conversación:** `Claude - CONEXION COMPOSIO` · **Rama:** `claude/conexion-composio`
**Fecha del documento:** 2026-09-18 · **Estado:** ESPECIFICACIÓN — sin código aprobado

---

## 1. Propósito del documento

Este documento es la fuente de verdad para construir un **camino paralelo de conexión a las APIs de Google y Meta a través de Composio**. Nace de una entrevista con Milton (12 decisiones, §6) y debe ser leído completo por Claude Code antes de actuar.

## 2. Rol que debe asumir Claude Code

Actuar como **arquitecto y programador senior** del módulo, bajo las reglas de `COORDINACION_CLAUDE_CODEX.md` (rama y worktree aislados, reserva de archivos, commit exclusivo, tres auditorías, nada a Producción sin autorización explícita de Milton). Ante una contradicción entre este documento y la realidad del código, **detenerse y reportarla**; no resolverla por suposición.

## 3. Problema y objetivo

**Problema.** Las apps OAuth propias de Auto Artículos para Google están en modo prueba (Google no las ha aprobado) y las de Meta están en revisión. Eso limita cuántos clientes pueden conectarse y bajo qué condiciones. Construir y aprobar esas apps por cuenta propia ha resultado inviable a corto plazo.

**Objetivo.** Que los clientes puedan conectar sus cuentas usando las **apps OAuth administradas por Composio**, que ya están aprobadas, **sin tocar ni romper** las conexiones propias que existen hoy. Milton decide desde Administración, app por app, por cuál vía se conectan los clientes. Para el cliente, el cambio es transparente.

## 4. Principios del producto (reglas críticas)

1. **Camino paralelo, no reemplazo.** La vía propia sigue existiendo y funcionando. Nada de lo que funciona hoy debe cambiar ni romperse.
2. **Milton controla la vía; el cliente no la ve.** El cliente siempre ve el mismo botón "Conectar".
3. **Lista blanca estricta de acciones** (§12). Todo lo que no esté permitido queda bloqueado en el código.
4. **Cero cortes sin aviso.** La transición nunca desconecta a un cliente antes de que reconecte (§9).
5. **Secretos nunca en chat ni en el repositorio.** La clave de API de Composio la pega Milton en el formulario del módulo; se guarda cifrada.
6. **Esquema y migración SQL juntos en el mismo commit** (regla suprema de Coordinación).

## 5. Alcance

| # | Conexión | ¿En este proyecto? | Vía |
|---|---|---|---|
| 1 | Google Search Console | Sí | Composio (toolkit `google_search_console`) |
| 2 | Google Analytics | Sí | Composio (toolkit `google_analytics`) |
| 7 | Facebook Pages | Sí | Composio (toolkit `facebook`) |
| 8 | Instagram (Business/Creator) | Sí | Composio (toolkit `instagram`) |
| 3 | Google Business Profile | **No** | Sigue por la API propia; esperar aprobación de Google. Composio **no tiene** toolkit. |
| 9 | Threads | **No** | Sigue por la API propia de Meta en revisión. Composio **no tiene** toolkit. |

Verificado el 2026-09-18 contra el catálogo oficial de Composio (1.552 toolkits): existen `facebook`, `google_analytics`, `google_search_console` e `instagram`, los cuatro con OAuth2 administrado por Composio. No existen toolkits de Business Profile ni de Threads. **La Fase 4 (§17) investiga alternativas de terceros sin compromiso.**

Limitaciones conocidas de Composio: Facebook solo soporta Páginas, no perfiles personales; Instagram solo cuentas Business o Creator, y los permisos de comentarios podrían no estar aprobados en la app administrada.

## 6. Decisiones de Milton (entrevista)

| # | Decisión |
|---|---|
| P1 | Camino **paralelo** al actual, motivado por las apps de prueba sin aprobar. |
| P2 | Primera fase: Search Console, Analytics, Business Profile, Facebook, Instagram, Threads (Business Profile y Threads quedan fuera por no existir en Composio). |
| P3 | Business Profile y Threads siguen por la API propia. Se añade una fase de investigación de terceros. |
| P4 | Un **interruptor por app en Administración** elige la vía. Transparente para el cliente. |
| P5 | Al cambiar el interruptor, **todos deben reconectar** por la vía nueva. |
| P6 | Con **transición**: la conexión vieja sigue activa hasta que el cliente reconecta. |
| P7 | **Lista blanca estricta** de acciones. |
| P8 | Aviso de reconexión: **mensaje en Inicio**, sin correos. |
| P9 | Administración muestra **interruptor + estado + resumen por app**. |
| P10 | La conexión vieja se conserva **14 días desactivada** tras reconectar, luego se revoca sola. |
| P11 | Se **declara** al cliente que Composio gestiona la conexión; tarea aparte para la política de privacidad. |
| P12 | Entrega por fases en el orden de §17. |

## 7. Tipo de producto y usuarios

- **Producto:** módulo dentro de una plataforma SaaS multiusuario existente (Next.js + Prisma + worker), no una aplicación nueva.
- **Administrador (Milton):** configura la clave de Composio, elige la vía por app, ve el resumen.
- **Cliente final:** conecta sus cuentas desde Configuración; ve banners de reconexión en Inicio.

## 8. Arquitectura funcional

**Decisión de integración: API REST de Composio con clave de proyecto.** Se descartaron el CLI (se instala con `curl | sh` en una máquina local y no corre en funciones serverless de Vercel) y el MCP público `connect.composio.dev/mcp` (exige login OAuth interactivo por agente). Ambos se muestran en el módulo solo como **referencia informativa**; la plataforma no los ejecuta.

- **Base:** `https://backend.composio.dev/api/v3.1` · **Autenticación:** cabecera `x-api-key`.
- **Endpoints comprobados** (responden 401 sin clave, es decir, existen): `GET /toolkits`, `GET /connected_accounts` (con guion bajo; `connected-accounts` da 404), `GET /tools`, `POST /tools/execute/{tool_slug}`, `GET /auth_configs`.
- **Formato de error:** `{"error":{"message","code","slug","status","request_id"}}`.
- **No verificado y obligatorio verificar en Fase 0:** el endpoint exacto para generar el **enlace de conexión** de un cliente (Connect Link) y su respuesta; el formato de la ejecución de herramientas; los límites de la cuenta de Composio y su costo por uso.

**Identidad.** Cada cliente de Auto Artículos se asocia a un `user_id` de Composio (Fase 0 decide el mapeo; recomendación: el id interno del usuario). Una sola clave central sirve a todos.

**Dónde corre cada cosa.** Fase 0 debe decidir qué llamadas se hacen desde `apps/web` (conexión, estado) y cuáles desde `apps/worker` (métricas y publicaciones programadas), y cómo el worker accede a la clave de forma segura.

## 9. Interruptor por app y regla de transición

**Interruptor.** Por cada app de §5 con Composio (Search Console, Analytics, Facebook, Instagram): valor `PROPIA` (por defecto) o `COMPOSIO`. Es **global por app**, no por cliente.

**Regla de transición (P5 + P6 + P10), obligatoria:**

1. Milton cambia una app a `COMPOSIO`. **Nada se corta.**
2. Cada cliente con esa app conectada por la vía propia queda marcado **"reconexión pendiente"**. Su conexión vieja **sigue funcionando**.
3. En **Inicio** aparece un mensaje: p. ej. "Reconecta tu cuenta de Search Console". Sin correo.
4. Al reconectar por Composio, la conexión vieja pasa a **desactivada** (no se borra) y se programa su **revocación a los 14 días**.
5. Dentro de esos 14 días, Milton puede volver atrás sin pedirle nada al cliente. Pasado el plazo, la conexión vieja se revoca sola.
6. Al completar la reconexión, el banner **desaparece solo**.
7. Los clientes nuevos, con el interruptor en `COMPOSIO`, se conectan directamente por Composio.

**Reversa.** Devolver el interruptor a `PROPIA` aplica la misma lógica en sentido inverso; Fase 0 debe definir su detalle y sus casos límite (cliente con las dos conexiones activas, revocación fallida, etc.).

## 10. Módulo de Administración

Ubicación: nueva página `/dashboard/composio`, enlazada desde un grupo "Administración" en la navegación. No modificar `usuarios/page.tsx` (archivo caliente de otro agente).

Debe mostrar:
1. **Conexión con Composio:** campo de clave de API (tipo password, nunca se muestra completa), verificación contra Composio antes de guardar, botones Probar conexión / Eliminar clave.
2. **Interruptor por app** (§9).
3. **Resumen por app:** clientes conectados por la vía propia, por Composio y con reconexión pendiente.
4. **Referencia:** URL del MCP y comando del CLI, solo para copiar.

Fuera de alcance (decidido en P9): lista por cliente e historial de cambios de interruptor. Se registra cada cambio en el `auditLog` existente de todos modos, sin interfaz.

## 11. Modelo de datos conceptual

A refinar y aprobar en Fase 0. Ningún cambio de schema sin su migración SQL en el mismo commit.

- **Clave de Composio:** `SystemSetting` (`composio_api_key`, cifrada con `encryptSecret`). No requiere migración.
- **Interruptor por app:** valor de configuración global por app (`SystemSetting` o modelo propio; decidir en Fase 0).
- **Conexión de cliente:** por cliente y app, registrar: vía (`PROPIA` | `COMPOSIO`), identificador de cuenta conectada en Composio, estado (activa / reconexión pendiente / desactivada), fechas de conexión y de revocación programada. Fase 0 debe auditar los modelos existentes (`SearchIntegration`, `FacebookPageIntegration`, `InstagramIntegration`, `BusinessProfileIntegration`, `ThreadsIntegration`) y decidir si se extienden o se crea un modelo aparte **sin alterar su comportamiento actual**.
- **Los tokens OAuth de las conexiones Composio no se almacenan** en Auto Artículos; viven en Composio.

## 12. Seguridad

- **Lista blanca estricta (P7):** solo las acciones que Auto Artículos usa hoy.
  - Search Console: leer sitios y métricas, listar y enviar sitemaps. **Bloqueadas** al menos `Add Site`, `Delete Site`.
  - Analytics: solo lectura (informes, propiedades). **Bloqueadas** crear, actualizar, archivar y enviar eventos.
  - Facebook / Instagram: publicar y leer lo necesario. Todo lo demás bloqueado.
  - La lista se define en código y se revisa en Fase 0 contra el uso real. Ampliarla requiere cambio de código y revisión.
- **Permisos de la clave de Composio:** los permisos **no se pueden cambiar tras crearla**. La clave necesita lectura general más escritura en **Connected accounts** y en **Session tool execution**. Una clave creada solo con lectura no sirve para conectar clientes: hay que crear otra y borrar la primera.
- La clave se valida con Composio antes de guardarse, se cifra y solo se devuelve enmascarada (`••••1234`).
- Rutas `/api/admin/composio/*` protegidas con `requireAdmin`; acciones registradas con `auditLog`.
- Rate limit y timeouts en llamadas salientes (10 s en el borrador actual).
- Vercel: antes de tocar `vercel.json`, middleware, autenticación o secretos, verificar `Root Directory` y logs de build (sección 7 de Coordinación).

## 13. Privacidad (P11)

Composio guarda los permisos OAuth de los clientes en sus servidores; es un tercero que procesa esos accesos.
- En la pantalla de conexión: texto breve visible, p. ej. "La conexión la gestiona Composio, nuestro proveedor de integraciones."
- **Tarea aparte** (fuera de este PR): actualizar la política de privacidad y términos.
- Definir en Fase 0 qué ocurre con los datos en Composio al revocar una conexión o eliminar una cuenta de cliente.

## 14. Historial y recuperación

- Recuperación por **conservación de la conexión vieja 14 días** (§9).
- Registro de cambios de interruptor y de la clave mediante `auditLog`.
- Tareas de revocación programada: Fase 0 decide el mecanismo (worker o cron) y cómo se garantiza que no queden conexiones desactivadas para siempre.

## 15. Experiencia de usuario

- Cliente: mismo botón "Conectar" de hoy. Aviso de reconexión como mensaje en **Inicio**, que desaparece al completar. Texto de privacidad en la pantalla de conexión.
- Administrador: módulo de §10, con el mismo lenguaje visual del sistema (`dashboard-ui`).
- Toda documentación de usuario va al manual correspondiente en el mismo lote del cambio (regla permanente del proyecto).

## 16. Fase 0 obligatoria antes de programar

Antes de escribir una sola línea de código, Claude Code debe entregar para aprobación:

- Arquitectura completa.
- Stack tecnológico (se espera reutilizar el existente: Next.js, Prisma, worker).
- Modelo de datos.
- Flujos de usuario.
- Mapa de navegación.
- Estructura de carpetas.
- Roadmap por fases.
- Riesgos técnicos.
- Propuestas de mejora.

Además, la Fase 0 debe **resolver y evidenciar**: (a) endpoint de enlace de conexión de Composio; (b) mapeo cliente ↔ `user_id`; (c) dónde corre cada llamada y cómo llega la clave al worker; (d) límites y costo de Composio; (e) auditoría de las integraciones existentes para no alterarlas; (f) lista blanca exacta por toolkit; (g) mecanismo de revocación a 14 días.

**No deberá escribirse una sola línea de código hasta que esta fase haya sido revisada y aprobada por Milton.**

## 17. Roadmap por fases

Cada fase pasa por: prueba local → tres auditorías → Preview si aporta valor → Producción **solo con autorización de Milton** y verificación posterior.

| Fase | Contenido | Riesgo |
|---|---|---|
| **1. Base** | Módulo de Administración: clave cifrada, verificación, estado, listar cuentas conectadas, grupo "Administración" en la navegación. | Bajo |
| **2. Google de solo lectura** | Search Console y Analytics por Composio, interruptor, regla de transición, banner en Inicio, resumen por app, aviso de privacidad. | Medio |
| **3. Meta con publicación** | Facebook Pages e Instagram por Composio. Publica en cuentas de clientes. | Alto |
| **4. Investigación** | Business Profile y Threads con toolkits de terceros (p. ej. Zernio MCP, no verificado). Sin compromiso de construcción. Entrega: informe y recomendación. | Bajo |

## 18. Estado del trabajo existente

En la rama `claude/conexion-composio` (worktree `.worktrees/conexion-composio`, base `origin/main` `068a0b1`) hay un **borrador de la Fase 1 sin commit**, no auditado:

- `apps/web/src/lib/composio.ts`: cliente de la API, cifrado de la clave.
- `apps/web/src/app/api/admin/composio/route.ts` y `.../accounts/route.ts`.
- `apps/web/src/app/dashboard/composio/page.tsx` y `ComposioPanel.tsx`.
- `apps/web/src/components/DashboardNav.tsx`: "Administración" pasa de enlace a grupo (Usuarios, Composio).

Verificación de tipos incompleta: `tsc` muestra errores `TS7006` en archivos ajenos (p. ej. `lib/mcp/tools.ts`) que parecen deberse a que el cliente de Prisma no está generado en el worktree; no se comprobó. Claude Code debe **reevaluar el borrador en Fase 0** y decidir si se conserva, se ajusta o se descarta.

## 19. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Clave de Composio creada con permisos insuficientes | Verificar permisos en Fase 0; crear otra clave si hace falta. |
| Cambio de interruptor corta a clientes | Regla de transición (§9): la conexión vieja no se toca hasta reconectar. |
| Acción destructiva ejecutada por error | Lista blanca estricta en código (§12). |
| Permisos de Instagram no aprobados en la app de Composio | Verificar en Fase 0; documentar el límite; plan B: OAuth propio de Meta para esa función. |
| Dependencia de un tercero (Composio) | Vía propia intacta y conservación de 14 días para volver atrás. |
| Costo o límites de Composio | Investigar en Fase 0 antes de Fase 2. |
| Colisión con trabajo de otros agentes | Reserva de archivos, worktree propio, no tocar `usuarios/page.tsx` ni el árbol principal. |
| Fuga de la clave | Cifrado, enmascarado, nunca en chat ni repositorio; rotación posible creando otra clave. |
| Migración separada del schema | Regla suprema: schema y SQL en el mismo commit. |

## 20. Criterios de aceptación

**Fase 1**
- Solo un administrador accede al módulo y a sus rutas.
- Una clave inválida se rechaza con un mensaje claro y **no se guarda**.
- Una clave válida se guarda cifrada y solo se muestra enmascarada.
- "Probar conexión" y "Ver cuentas conectadas" funcionan contra Composio real.
- Sin clave, el módulo lo indica y no rompe.

**Fase 2**
- Con el interruptor en `PROPIA`, el comportamiento actual es **idéntico** al de antes (prueba de regresión).
- Al pasar a `COMPOSIO`, ningún cliente pierde su conexión hasta reconectar.
- El banner aparece a quien corresponde y desaparece al reconectar.
- Tras reconectar, la conexión vieja queda desactivada y se revoca a los 14 días.
- Las acciones bloqueadas por la lista blanca fallan de forma controlada.
- El resumen por app coincide con los datos reales.

**Fase 3**
- Publicar en Facebook e Instagram por Composio con una cuenta de prueba, con evidencia.
- Ninguna publicación se duplica ni se pierde durante la transición.

**Todas:** tres auditorías aprobadas, commit exclusivo, Producción solo con autorización y verificación posterior.

## 21. Instrucciones finales antes de escribir código

1. Leer `COORDINACION_CLAUDE_CODEX.md` completo y registrar la conversación en `INVENTARIO_CONVERSACIONES.md` (nombre exacto: `Claude - CONEXION COMPOSIO`).
2. Trabajar solo en la rama `claude/conexion-composio` y su worktree; reservar cada archivo antes de editarlo.
3. Entregar la **Fase 0** (§16) y esperar la aprobación explícita de Milton.
4. **No ejecutar** `curl -fsSL https://composio.dev/install | sh` ni instalar el CLI de Composio. **No pedir ni recibir** la clave de API por chat: la pega Milton en el formulario del módulo.
5. No tocar Producción, `vercel.json`, autenticación ni las integraciones propias existentes sin autorización.
6. Al cerrar, entregar el formato de cierre completo de Coordinación.

## Anexo — Observación para Coordinación (no corregida aquí)

La entrada "MCP 10MWS — Auditoría y reparación" de `COORDINACION_CLAUDE_CODEX.md` dice que la migración de `PublishMethod` y `McpConnection` estaba separada y sin aplicar. En `origin/main` existe la migración `20260908162000_add_mcp_publish_method` que crea ambos. Según la sección 10 de Coordinación, el dato original no se reescribe: la corrección debe registrarse por el responsable de esa tarea.
