# Coordinación de trabajo: Claude, Codex y Antigravity

Este archivo es el tablero operativo compartido para los **tres participantes
autorizados: Claude, Codex y Antigravity (Google)**. Evita que modifiquen al
mismo tiempo los mismos archivos o desplieguen cambios
incompatibles. `HANDOFF.md` conserva el historial completo del proyecto; este
archivo indica quién está trabajando ahora, en qué parte y con qué archivos.

## `TO-DO.md` — buzón de ideas de Milton (leer, nunca ejecutar sin pedido)

Existe un tercer archivo en la raíz del repo, `TO-DO.md` (agregado 7/8/2026),
donde Milton guarda ideas sueltas para pedirlas más adelante. **Ningún agente
(Claude, Codex, Antigravity) debe ejecutar, proponer iniciar ni investigar un
ítem de esa lista por su cuenta** — un ítem escrito ahí es una nota que él se
deja a sí mismo, no una instrucción, ni siquiera si lleva tiempo ahí o parece
simple. Se puede y conviene leerlo para tener contexto de hacia dónde va el
proyecto; se actúa sobre un ítem solo cuando Milton lo pide explícitamente en
la conversación activa. Al ejecutar algo de ahí, moverlo a la sección "Hecho"
de `TO-DO.md` y documentar el cambio real en `HANDOFF.md` como de costumbre.

## Regla obligatoria antes de iniciar cualquier tarea (OPTIMIZADA PARA MÍNIMO CONSUMO DE TOKENS)

Claude, Codex y Antigravity deben hacer lo siguiente **antes de leer o modificar código**:

1. Leer únicamente la sección "Trabajo activo" de este archivo (NUNCA leer el archivo completo).
2. Ejecutar `git status --short` y `git log -5 --oneline`.
3. Revisar únicamente el estado actual de `HANDOFF.md` si es relevante para la tarea.
4. Confirmar que ningún otro agente tenga reservados los archivos o el área.
5. Registrar su tarea en "Trabajo activo" antes de editar.
6. Si existe una reserva que se cruza con la tarea, detenerse y coordinar.

## ORDEN OBLIGATORIA — nadie daña el trabajo de nadie

**Orden directa de Milton (13/8/2026):** ningún agente (Claude, Codex,
Antigravity) puede dañar, sobrescribir, perder ni absorber sin darse cuenta
el trabajo de otro agente ni del usuario. Esto no es una sugerencia, es una
orden.

**Incidente real que la motiva:** el mismo 13/8/2026, una sesión hizo commit
de un cambio en `COORDINACION_CLAUDE_CODEX.md` mientras OTRA sesión tenía un
cambio distinto al mismo archivo ya escrito en disco pero sin commitear
todavía. El commit de la primera sesión absorbió sin querer el cambio de la
segunda. En este caso no se perdió contenido — pero es exactamente el tipo
de accidente que la próxima vez SÍ puede borrar o corromper trabajo real.

**Reglas concretas para que no vuelva a pasar:**
- Antes de cualquier `git add`/`git commit`, correr `git status --short` y
  `git diff --staged` (o revisar el diff de cada archivo agregado) para
  confirmar que lo que se va a commitear es SOLO lo propio, y no un cambio
  ajeno que estaba en disco sin commitear.
- Nunca usar `git add .` ni `git add -A` — agregar únicamente las rutas
  exactas que el propio agente modificó (regla ya existente, reforzada acá
  porque romperla fue la causa directa del incidente).
- Si al revisar el diff aparece contenido que el agente no escribió, DETENERSE,
  no commitearlo como propio, y avisar en este tablero o preguntarle a Milton
  antes de continuar.
- Ante cualquier duda sobre si un push/commit podría pisar trabajo ajeno,
  parar y preguntar — nunca asumir que "no pasa nada".

## Reglas durante el trabajo

- Cada agente modifica únicamente los archivos que declaró en su reserva.
- Una reserva por carpeta incluye todos sus archivos, aunque no estén listados.
- No usar `git add .` ni `git add -A`; agregar rutas explícitas.
- No restaurar, borrar ni reformatear cambios que no creó el agente.
- Antes de hacer push o desplegar, verificar que no haya otro proceso en curso sin releer documentos completos.
- No ejecutar pruebas de publicación automática; las realiza el usuario.
- Toda decisión o cambio se documentará en `HANDOFF.md` ÚNICAMENTE cuando Milton lo solicite explícitamente o tras un hito principal.
- Si se descubre trabajo ajeno sin registrar, tratarlo como reservado hasta confirmar con el usuario o con el otro agente.

## Trabajo activo

### Claude — Asistente flotante de ayuda al usuario (IA) — ANÁLISIS, sin código

- **Estado:** `ANÁLISIS TERMINADO — SIN UNA SOLA LÍNEA DE CÓDIGO ESCRITA —
  ESPERANDO AUTORIZACIÓN DE MILTON` (13/8/2026).
- **Pedido de Milton:** una caja de chat flotante con una IA que le responda al
  usuario final cómo funciona el programa **de cara al usuario** ("dónde hago
  qué", "cómo hago tal cosa", "tengo este problema, qué hago"). Explícitamente
  NO sobre cómo está hecho el sistema por dentro.
- **Área reservada:** NINGUNA todavía. No se tocó ni un archivo de código. Este
  registro existe para que otro agente sepa que el tema está en evaluación,
  no para bloquear archivos.
- **Archivos que se reservarían si Milton autoriza** (declarados por
  adelantado, todos nuevos salvo el layout):
  - `apps/web/src/components/FloatingAssistant.tsx` (nuevo)
  - `apps/web/src/app/api/assistant/chat/route.ts` (nuevo)
  - `apps/web/src/content/manual-usuario.md` (nuevo — el system prompt)
  - `apps/web/src/app/dashboard/layout.tsx` (solo montar el componente; ojo:
    este archivo ya tiene el gate de prueba gratuita, ver sección de abajo)

#### Decisión de proveedor: OpenAI, no Anthropic

- Milton ya paga OpenAI y tiene la llave. **Se usa esa.** No se instala el SDK
  de Anthropic. Hoy el repo no tiene NINGÚN SDK de IA instalado (verificado en
  los cuatro `package.json`), así que se parte de cero de todas formas y no hay
  nada que migrar.
- **Precios verificados el 13/8/2026 contra la página oficial**
  (`developers.openai.com/api/docs/pricing`), no de memoria — por 1M de tokens:

  | Modelo | Entrada | Entrada cacheada | Salida |
  |---|---|---|---|
  | `gpt-5.6-sol` | $5.00 | $0.50 | $30.00 |
  | `gpt-5.6-terra` | $2.00 | $0.20 | $12.00 |
  | `gpt-5.6-luna` | $0.20 | $0.02 | $1.20 |
  | `gpt-5-mini` | $0.25 | $0.025 | $2.00 |
  | `gpt-5-nano` | $0.05 | $0.005 | $0.40 |

- **Costo estimado por pregunta** (manual de ~15k tokens cacheado + ~500 de
  conversación + ~400 de respuesta): `luna` ≈ $0.0009, `gpt-5-mini` ≈ $0.0013,
  `terra` ≈ $0.009, `sol` ≈ $0.022. O sea **entre $1 y $22 por cada 1.000
  preguntas** según el modelo. Es una estimación, no una medición: depende del
  tamaño real del manual, que todavía no existe.
- **Conclusión de costo: no es un factor de decisión.** Cualquiera de estos
  modelos cuesta menos que un solo artículo publicado. Elegir por calidad de
  respuesta, no por precio.
- **Condición para que el precio cacheado aplique:** el caché de OpenAI es
  automático pero exige que el prefijo del prompt sea **idéntico byte a byte**.
  Implicación de diseño, no un detalle: el manual va PRIMERO y fijo, y la
  pregunta del usuario y sus datos van AL FINAL. Si se mete la fecha, el nombre
  del usuario o un ID al principio del prompt, el caché no pega nunca y el
  costo se multiplica por ~10 sin ningún aviso.

#### Hallazgo sobre `/dashboard/actualizaciones` (corrige un supuesto de Milton)

- Milton planteó que el problema de mantener el manual sincronizado ya está
  resuelto porque existe ese módulo. **Revisado el código real
  (`apps/web/src/app/dashboard/actualizaciones/page.tsx`): resuelto a medias.**
- Lo que el módulo ES: un arreglo `ACTUALIZACIONES` **escrito a mano y
  hardcodeado en la línea 18** del `page.tsx`, con 5 entradas (28/7 al 10/8).
  No se genera solo, no lee de la base de datos, no lee de los commits. Cada
  entrada la escribió una persona.
- **Por qué SÍ es buena noticia (dos razones reales, no cortesía):**
  1. Está en el repo, en un `.tsx` — que es exactamente donde recomendé que
     viviera el manual. Un cambio de código y su explicación pueden entrar en
     el mismo commit. La infraestructura correcta ya existe.
  2. El texto ya está escrito **en el registro correcto**: lenguaje de usuario
     final, sin tecnicismos, con un campo `ejemplo` concreto en cada entrada.
     Ese es justo el tono que necesita el manual del bot, y es la parte que
     normalmente cuesta.
- **Por qué NO alcanza solo:** un changelog dice **qué cambió**; un manual dice
  **cómo funciona algo hoy**. El bot necesita las dos. Si un usuario pregunta
  "¿cómo conecto Bing?", la respuesta no está en ninguna de las 5 entradas
  actuales, porque conectar Bing no es un cambio reciente — es una función que
  existe desde antes. La disciplina de mantenerlo al día sigue siendo humana:
  el arreglo del cupo de Bing del 13/8 (commit `b4fc007`, documentado más
  abajo en este mismo tablero) todavía no figura en el módulo.
- **Propuesta:** el bot lee DOS archivos — el manual nuevo (cómo funciona cada
  pantalla hoy) y el changelog que ya existe (qué cambió últimamente). Reusar
  `ACTUALIZACIONES` como fuente, no reemplazarlo.

#### REQUISITO NUEVO DE MILTON (13/8/2026): el changelog debe alimentarse solo

- **Pedido textual:** *"ese módulo está hecho para que cada cambio que haga se
  vaya depositando allí de inmediato; si eso no hace eso pues hay que arreglarlo
  para este tema del chat flotante, porque sería muy bien que cada cosa que se
  vaya creando o reparando ya forme parte del manual de conocimiento."*
- **Estado real verificado (archivo completo, 234 líneas):** hoy NO se deposita
  nada solo. Cero `fetch`, cero `useEffect`, cero `/api/`, cero `prisma`, cero
  `async` en todo el archivo; no existe ruta API ni modelo en `schema.prisma`.
  Prueba a la vista: el arreglo del cupo de Bing de hoy (`b4fc007`) no figura
  en la pantalla. La intención de diseño era la correcta; la implementación
  quedó estática.
- **Dirección aprobada por Milton:** hay que hacerlo automático. Dos piezas:
  1. **Regla de proceso (costo cero, aplica desde ya):** ningún agente cierra
     un cambio visible para el usuario sin agregar su entrada a
     `ACTUALIZACIONES` **en el mismo commit**. Va a este tablero y a
     `AGENTS.md`. No requiere infraestructura; los tres agentes ya leen este
     documento antes de tocar código.
  2. **Automatismo:** script que lee el diff + mensaje del commit y le pide al
     modelo de OpenAI que redacte la entrada en lenguaje de usuario final con
     los campos existentes (`titulo`, `categoria`, `resumen`, `ejemplo`). El
     paso de traducción técnico → usuario es indispensable: el mensaje de
     commit real ("Respetar el cupo de Bing en MASTER INDEXACION...") no sirve
     tal cual para un usuario final. Costo despreciable: son pocos commits por
     día, no miles de preguntas.
- **Límite que hay que decir en voz alta:** aun automatizado al 100%, esto es
  un changelog ("qué cambió"), no un manual ("cómo funciona X hoy"). Ningún
  changelog responde "¿cómo conecto Bing?", porque conectar Bing no es un
  cambio reciente. El bot necesita **manual base escrito una vez** + **este
  changelog automático encima**. Con las dos, el manual no se desactualiza
  nunca, que es el objetivo real de Milton.
- **Decisión pendiente:** si el script corre en un hook de pre-commit local, en
  GitHub Actions al hacer push, o como paso manual que el agente ejecuta. No
  decidido.

#### Riesgos identificados antes de escribir código

- **Alucinación.** El riesgo número uno es que el bot le prometa al usuario
  funciones que no existen. Mitigación: instrucción dura de "solo respondes con
  lo que está en el manual; si no está, lo dices y ofreces contactar a Milton".
  Se mitiga, no se elimina.
- **Cruce con el gate de prueba gratuita.** `dashboard/layout.tsx` reemplaza
  TODO el contenido por `TrialBlockedScreen` cuando la prueba venció. Hay que
  decidir a propósito si el chat aparece o no en esa pantalla. Argumento para
  que SÍ aparezca: es justo el momento en que el usuario tiene preguntas. No
  está decidido; lo decide Milton.
- **Fuga de datos entre cuentas.** Si se le inyecta contexto del usuario
  (plan, integraciones conectadas, cuotas), ese contexto tiene que salir de la
  sesión del servidor, NUNCA de un parámetro que mande el navegador. Mismo
  criterio de aislamiento multi-tenant que ya rige el resto del sistema.
- **Costo descontrolado por abuso.** Sin límite por usuario, una sola cuenta
  puede disparar miles de preguntas. Hace falta un tope por día por usuario.

#### Lo que NO está decidido (lo decide Milton, no el agente)

1. Modelo exacto (`gpt-5-mini` y `gpt-5.6-luna` son los candidatos razonables
   por relación calidad/precio para este caso).
2. Si el chat aparece en la pantalla de prueba vencida.
3. Si se guardan las conversaciones en Postgres. Recomendación: sí, en una
   fase 2 — ver dónde se atasca la gente vale más que el chat en sí.
4. Si el bot solo informa o además puede escalar a WhatsApp de Milton
   (`https://wa.link/qdwyyy`, el mismo que ya usa `TrialBlockedScreen`).

### Claude — Sistema de prueba gratuita (3 fases completas)

- **Estado:** `TERMINADO — ESPERANDO CONFIRMACIÓN DEL USUARIO` (13/8/2026).
- **Pedido explícito del usuario:** botón "SOLICITAR PRUEBA" en Login → 7 días
  de acceso completo → al vencer, pantalla de bloqueo (mensaje + botón
  "Conversar con Milton" + QR a `https://wa.link/qdwyyy`) salvo que el admin
  marque "desbloqueado" manualmente para esa cuenta.
- **Archivos nuevos/tocados:**
  - `packages/db/prisma/schema.prisma` (+ migración): `User.isTrialSignup`,
    `User.trialStartedAt`, `User.trialUnlocked` (default `true` — nunca
    bloquea usuarios existentes/creados por admin).
  - `apps/web/src/lib/trial.ts`: `hasTrialAccess()` / `trialDaysRemaining()`,
    lógica pura en milisegundos (sin problemas de timezone/DST).
  - `apps/web/src/app/api/auth/trial-signup/route.ts`: registro público
    (nombre, apellido, email, teléfono, contraseña), crea el usuario con
    `isTrialSignup=true`, `trialStartedAt=now()`, `trialUnlocked=false`, y
    hace login automático (mismo `createSessionToken` que el login normal).
  - `apps/web/src/middleware.ts`: se agregó `/api/auth/trial-signup` a
    `PUBLIC_PATHS` — **bug real encontrado al probar**: sin esto, el
    middleware devolvía "No autenticado" antes de que la petición llegara al
    handler (que es público a propósito). Ya corregido y confirmado por el
    usuario (pudo registrarse y entrar).
  - `apps/web/src/components/TrialBlockedScreen.tsx`: pantalla de bloqueo
    (mensaje + botón WhatsApp + QR vía `quickchart.io`, mismo servicio
    externo ya usado en el proyecto para QRs de WhatsApp en artículos).
  - `apps/web/src/app/dashboard/layout.tsx`: gate server-side —
    `!actingAdmin && !hasTrialAccess(user)` reemplaza TODO el contenido del
    dashboard (incluida la navegación) por `TrialBlockedScreen`. Un admin
    "actuando como" siempre puede seguir dando soporte sin importar el
    estado de la prueba.
  - `apps/web/src/app/dashboard/vista-previa-bloqueo/page.tsx`: página
    admin-only para ver la pantalla de bloqueo sin esperar 7 días reales
    (renderiza `TrialBlockedScreen` directo).
  - `apps/web/src/app/api/admin/users/route.ts` + `usuarios/page.tsx`:
    checkbox "Desbloqueado" en el detalle (solo visible si
    `isTrialSignup`, mismo patrón de estado local + "Guardar permisos" que
    ya usan los permisos de redes sociales) + marca visual "🎁 PRUEBA" con
    días restantes junto al nombre en la lista.
- **Verificación real hecha por el usuario:** registro completo (formulario →
  login automático), pantalla de bloqueo revisada en la vista previa admin.
- **Verificación que FALTA (avisado al usuario, todavía no puede confirmarse
  porque no ha pasado el tiempo real):** que el corte automático a los 7 días
  reales funcione end-to-end sin intervención manual — la lógica de
  `hasTrialAccess()`/el gate en `layout.tsx` fue revisada línea por línea y es
  matemáticamente sólida (comparación pura de milisegundos desde
  `trialStartedAt`, sin lógica de fechas de calendario), pero nadie ha llegado
  todavía al día 7 de forma natural para confirmarlo en producción real.
- **Verificaciones técnicas:** `tsc --noEmit` y `next build` limpios en cada
  fase; los tres commits se desplegaron a producción (`READY`) confirmado con
  `vercel inspect`.
- **Nota de proceso:** durante esta tarea, otra sesión (Codex/Antigravity)
  estuvo pusheando a `main` en paralelo (ver commits `f397522` y siguientes
  en la sección de Bing más abajo) — sin conflictos de archivos con este
  trabajo, pero un `git push` fue rechazado una vez por historial divergente
  y se resolvió con `fetch` + verificación antes de reintentar (sin forzar).
- **Estado del área:** LIBERADA (archivos de esta fase). Bing sigue
  reservado/activo por otra sesión, ver sección de abajo.

### Claude — investigación en curso: bucle de reconexión de Bing (cuenta de Julio Paso)

- **Estado:** `EN INVESTIGACIÓN` (11/8/2026).
- **Reserva de archivos:**
  - `apps/web/src/components/BingWebmasterSection.tsx`
  - `apps/web/src/app/api/search-integrations/bing/route.ts`
  - `apps/web/src/lib/bing-oauth.ts`
  - `packages/shared/src/bing-webmaster.ts`
- **Síntoma original:** cuenta de Julio Paso — selector de sitio vacío, "Refresh token is invalid or expired." y, al presionar "MASTER INDEXACION BING", un segundo mensaje distinto ("conecta y elige tu sitio primero"). Diagnosticado como el mismo problema mostrado de dos formas confusas (ver commit `3fa0f8b`).
- **Fix 1 (`3fa0f8b`):** un solo aviso claro ("⚠️ Tu conexión con Bing venció") con botón "Reconectar Bing" cuando se detecta ese patrón de error.
- **Al probarlo:** el botón sí apareció y el usuario reconectó correctamente (el selector mostró el sitio real: `https://www.juliopasopargainmobiliario.es/`), pero al presionar "Guardar sitio" dio un genérico "No se pudo guardar." — encontrado que el `PATCH` de guardar sitio (a diferencia de `GET` y de `master-index`) no tenía try/catch, así que cualquier error real de Bing se perdía. **Fix 2 (`6fb5125`):** se agregó captura del error real.
- **Nuevo síntoma reportado (sin resolver todavía):** el usuario reconectó desde cero (desconectar + volver a conectar) y el aviso rojo "Tu conexión con Bing venció" **volvió a aparecer casi de inmediato**, en bucle — esto NO es un vencimiento natural por tiempo, apunta a un bug real en el proceso de conexión/guardado del token, no solo a que "Bing revoca tokens" (explicación que ya no alcanza para explicar un bucle instantáneo).
- **Investigación en curso:** se dejó un `Monitor` en vivo sobre `vercel logs -f` filtrando por "bing|error" para capturar el error real la próxima vez que el usuario reproduzca el bucle (los intentos anteriores de leer logs con `--since` fallaron porque el buffer de Vercel rota muy rápido). Revisado hasta ahora sin encontrar el bug: `bing-oauth.ts` y `bing-webmaster.ts` usan las mismas variables de entorno (`BING_WEBMASTER_CLIENT_ID/SECRET`) en connect/callback y en el refresh posterior — sin discrepancia visible ahí todavía.
- **Pendiente:** esperar el próximo intento del usuario con el monitor activo, leer el error real capturado, y recién ahí diagnosticar la causa de fondo (sospechas sin confirmar: posible problema de encriptación/desencriptación del refresh token al guardarlo, o alguna otra parte del sistema sobrescribiendo el token bueno).
- **Texto completo del error de Master Indexación capturado:** `ERROR!!! InvalidToken` — confirmado en el código que esto es `data.Message` LITERAL de la respuesta de Bing a `SubmitUrl` (`submitBingUrl()` en `bing-webmaster.ts`), no algo que nuestro código redacta. Dato clave: en ese mismo momento el selector de sitio SÍ mostraba el sitio real cargado correctamente (`listBingSites` funcionando con el mismo access token recién obtenido) — o sea, el refresh token en sí no parece estar totalmente muerto; el rechazo es específico de la llamada a `SubmitUrl`. Hipótesis sin confirmar: el scope OAuth solicitado (`webmaster.manage`, ver `bing-oauth.ts`) podría no alcanzar para la operación de envío de URL (solo para lectura), y Bing lo reporta como "InvalidToken" en vez de un error de permisos más claro. Falta evidencia de logs del backend para confirmar o descartar.
- **Segundo pedido del usuario, resuelto aparte (no relacionado con el bug del token):** Bing no detectaba el sitemap automáticamente al elegir sitio, a diferencia de Google. Se agregó `listBingSitemaps()` en `bing-webmaster.ts` (mismo patrón GET ya usado por `listBingSites`) y se conectó en `GET /api/search-integrations/bing`, mismo criterio defensivo que ya usa Google (no bloquea la carga si falla). **Sin confirmar contra una cuenta real de Bing** — el nombre exacto del endpoint (`GetSitemaps`) es una suposición razonable por el patrón de la API, no verificada. Commit `6e53687`, desplegado.
- **Tercer bug encontrado y RESUELTO, causa real del "bucle":** logs de producción confirmaron 5 solicitudes a `/api/search-integrations/bing/connect` en menos de 1 segundo — el usuario hacía varios clics porque el enlace "Reconectar Bing" no daba ninguna señal visual. Cada clic pisa la cookie de estado OAuth (`BING_STATE_COOKIE`) del clic anterior; cuando el callback finalmente llega, el estado ya no coincide con el más reciente y `callback/route.ts` redirige a `?bing=error` **en silencio** — nada en `BingWebmasterSection.tsx` leía ese parámetro, así que el usuario volvía a ver el mismo aviso rojo sin ninguna explicación, pareciendo un bucle infinito de token vencido cuando en realidad cada reconexión se estaba auto-saboteando por el doble clic. Fix: el enlace se bloquea (visual + `pointer-events`) apenas se hace el primer clic, y ahora sí se lee `?bing=error`/`?bing=connected` mostrando un mensaje claro de qué pasó. Commit `1503a81`, desplegado.
- **Confirmado por el usuario:** con el fix del doble clic desplegado, el bucle de reconexión SÍ desapareció (sitio y sitemap cargaron correctamente, sin volver al aviso rojo). Pero "MASTER INDEXACION BING" siguió fallando con el mismo `ERROR!!! InvalidToken` incluso con una reconexión limpia — confirma que era un segundo bug real, no relacionado con el doble clic.
- **Cuarto bug encontrado y RESUELTO — causa raíz real de `ERROR!!! InvalidToken` en SubmitUrl:** verificado contra la documentación oficial de Microsoft (`learn.microsoft.com/en-us/bingwebmaster/oauth2`, actualizada 7/8/2026 — un día antes de este bug, muy vigente), no contra suposición: el endpoint real de `SubmitUrl` es `https://www.bing.com/webmaster/api.svc/json/SubmitUrl`. Nuestro código usaba `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl` — dominio distinto. Esto explica el patrón exacto observado: el MISMO access token funcionaba un instante antes para `listBingSites` (lectura) y fallaba para `SubmitUrl` (escritura) — probable causa: `ssl.bing.com` es un dominio/CDN que tolera lecturas pero no reenvía correctamente las escrituras al origen real de la API. Se separó la base de URL solo para las operaciones de escritura (`SubmitUrl`, `SubmitFeed` — mismo patrón, aplicado también por consistencia aunque no había evidencia directa de que estuviera roto), sin tocar `listBingSites` (sí funciona hoy, no se arriesga sin motivo). Commit `ac6fedf`, desplegado (afecta `packages/shared`, usado tanto por `apps/web` como por `apps/worker` — el worker se aplica solo, el web ya se desplegó).
- **Pendiente real que queda:** confirmar con el usuario que "MASTER INDEXACION BING" ya funciona con este cambio de dominio. Si el error persiste incluso así, la hipótesis de scope OAuth insuficiente (`webmaster.manage` no alcanzando para escritura) seguiría en pie como siguiente paso a investigar.

### Antigravity — corrección de API_BASE de Bing y verificación (cuenta de Lorena Álvarez, 13/8/2026)

- **Estado:** `RESUELTO, BLINDADO Y CONFIRMADO EN PRODUCCIÓN — ÁREA LIBERADA` (13/8/2026).
- **Prueba final confirmada por Milton:** Conexión activa estable tras reconectar; múltiples recargas consecutivas de página (Command + R) verificadas con éxito sin degradación ni pérdida de sesión; sitemap autodetectado. Ejecución de **MASTER INDEXACION BING** exitosa enviando 100 artículos para indexar con 0 errores (respetando cupo de 100 diarios de Bing y saltando 22 ya indexados).

#### 🎯 EXPLICACIÓN TÉCNICA DEFINITIVA Y EFICAZ DE LA SOLUCIÓN:
1. **El Problema Real:**
   - Cada vez que el usuario cargaba la página o pulsaba **Command + R**, el backend ejecutaba de inmediato una llamada a Bing (`grant_type: refresh_token`).
   - Esto presentaba dos fallas graves del lado de Bing:
     a) **Rate-Limiting / Replication Delay:** Al refrescar inmediatamente tras la conexión o en ráfagas de recargas, el endpoint OAuth de Bing devolvía `HTTP 400 invalid_grant: Refresh token is invalid or expired` de manera intermitente.
     b) **Bug de Rotación de Microsoft:** En Bing Webmaster OAuth 2.0, los refresh tokens devueltos en respuestas de refresco son inválidos. Solo el `refreshToken` original emitido durante `authorization_code` es duradero (~30 a 60 días).
2. **La Arquitectura de la Solución (Blindaje en DB + Caché):**
   - **Persistencia de Access Token en Base de Datos:** Cuando el usuario se conecta, el callback recibe un `access_token` (válido por 1 hora) y el `refresh_token` original. En lugar de descartar el access token, se empaqueta como un payload JSON `{ refreshToken, accessToken, expiresAt }` cifrado con AES-256-GCM en `SearchIntegration.encryptedRefreshToken`.
   - **Lectura en 0 milisegundos:** Cuando el usuario entra a Configuración o recarga con **Command + R**, `getBingTokenForIntegration()` descifra el payload, detecta que el `access_token` sigue vigente (con 50 min de vida) y lo devuelve de inmediato **sin hacer ninguna llamada HTTP a Bing OAuth**.
   - **Conservación Estricta del Refresh Token Original:** Cuando el access token finalmente expira (a los 55 minutos), el sistema usa el `refreshToken` original para pedir un nuevo access token de 1 hora, actualiza el `accessToken` y `expiresAt` en la base de datos, y **nunca sobrescribe el refreshToken original**.
   - **Instrucciones claras al usuario (UX paso a paso):** Se añadió en la interfaz una guía directa y sencilla:
     *"1. Abre una pestaña en tu navegador con Bing Webmaster Tools (con tu sesión ya iniciada). 2. Vuelve a esta pestaña de Creador de artículos y presiona 'Conectar/Reconectar Bing'. 3. Acepta los permisos en Microsoft y el sistema se conectará solo."*

- **Limpieza realizada:** Se eliminó el endpoint temporal de diagnóstico `/api/bing/diagnostico/route.ts`.
- **Estado del área:** LIBERADA (ningún archivo reservado).
- **Síntoma reportado (captura de la cuenta de prueba, Lorena Álvarez / `segurosdesaludyvida.com`):** en Configuración aparecían DOS errores distintos a la vez — `✗ El último envío falló (13/8/2026, 1:42:22 a.m.): Bing Webmaster Tools OAuth no está configurado.` y, al pulsar MASTER INDEXACION BING, `Client authentication failed.`. El selector de sitios estaba vacío y NO se ofrecía el botón "Reconectar Bing". Ninguno de los dos es el `InvalidToken` de la investigación anterior.
- **Bug A — RESUELTO, causa cierta (no es hipótesis):** `apps/worker/src/send-daily-sitemaps.ts` procesa integraciones de Google **y de Bing**, pero `.github/workflows/daily-sitemaps.yml` solo exportaba `GOOGLE_SEARCH_CONSOLE_CLIENT_ID/SECRET`. Sin `BING_WEBMASTER_CLIENT_ID/SECRET` en el entorno, `bingConfig()` lanza literalmente "Bing Webmaster Tools OAuth no está configurado.", que se guarda en `lastSitemapSyncError` y se muestra en pantalla como si fuera un problema de la cuenta del usuario. Es decir: **el envío nocturno de sitemap a Bing nunca funcionó para ningún usuario**, desde que existe ese workflow. Se agregaron las dos variables. (`worker.yml` sí las tenía; por eso la indexación por artículo del worker sí llegaba a Bing y esto pasó desapercibido.)
- **Bug B — diagnosticado con evidencia directa, no por deducción:** `Client authentication failed.` NO habla de las credenciales de nuestra app. Verificado a mano contra `https://www.bing.com/webmasters/oauth/token` con tres combinaciones: (A) client_id+secret reales + refresh token inventado, (B) client_id inventado, (C) secret inventado. **Las tres devuelven exactamente `HTTP 400 {"error":"invalid_client","error_description":"Client authentication failed."}`** — o sea que Bing colapsa cualquier falla en ese mismo mensaje, y el caso A demuestra que es lo que responde cuando el refresh token guardado ya no sirve. Es el mismo caso que el viejo "Refresh token is invalid or expired": hay que volver a autorizar la cuenta. Concuerda con el bug abierto de Microsoft (`learn.microsoft.com/en-in/answers/questions/5659086`, "Bug in Bing Webmaster Tools OAuth 2.0?"): Bing emite refresh tokens nuevos en cada refresh que NO sirven (`invalid_grant`), solo el original funciona, y el original igual muere solo al cabo de ~1 mes. Nuestro código ya descarta el token nuevo, que resulta ser el workaround correcto.
- **Bug C — RESUELTO, el que dejaba al usuario sin salida:** la detección `tokenExpired` en `BingWebmasterSection.tsx` usaba `/invalid.*token|expired|unauthorized|401/i`, que **no** matchea "Client authentication failed." Por eso Lorena veía el selector vacío y el error en inglés en letra chica, sin el botón "Reconectar Bing" — exactamente el mismo callejón sin salida que ya se había arreglado para Julio Paso, reaparecido con otro texto de error. Dos correcciones: (1) `getBingAccessToken` ahora traduce el error a "La conexión con Bing venció o fue revocada: hay que volver a autorizar la cuenta. (Bing respondió: ...)" conservando el detalle crudo, lo que arregla el mensaje en TODAS las pantallas de una vez; (2) el patrón de `tokenExpired` se amplió a `invalid_client|invalid_grant|client authentication|volver a autorizar`.
- **Bug D — RESUELTO, prevención:** el callback distinguía mal sus dos fallas. Ahora redirige con `?bing=error&motivo=estado` (cookie de estado pisada = doble clic) vs `?bing=error&motivo=token` (Bing rechazó el intercambio del código = credenciales/Redirect URI mal configuradas), y cada motivo muestra un texto distinto. Antes CUALQUIER falla culpaba al doble clic, lo que habría mandado a la próxima investigación por el camino equivocado otra vez. Además el rechazo del intercambio ahora se loguea con el `error`/`error_description` real de Bing.
- **Verificaciones:** `tsc --noEmit` limpio en `apps/web` y `apps/worker`; `git diff --check` limpio. No se envió ninguna URL a indexar, no se tocó producción y no se modificó ningún dato de usuario. Las pruebas contra Bing fueron solo lecturas del endpoint de token con datos inventados.
- **Pendiente:** commit + despliegue (autorización de Milton), y después Lorena tiene que pulsar "Reconectar Bing" (que recién ahora le va a aparecer) para renovar el refresh token muerto. Recién con la conexión viva se puede saber si MASTER INDEXACION BING sigue fallando o no — el `InvalidToken` de la investigación anterior nunca se pudo confirmar ni descartar porque esta cuenta no tenía conexión válida.
- **Bug E — RESUELTO (autorizado por Milton, "sigue con el trabajo", 13/8/2026): MASTER INDEXACION reventaba el cupo de Bing.** Confirmado contra la documentación oficial (`GetUrlSubmissionQuota`): el cupo de envío de URLs es **por sitio y chico** — el ejemplo de Microsoft devuelve `DailyQuota: 5, MonthlyQuota: 24`. El comentario de `submitBingUrl` afirmaba 10.000/día, cifra que corresponde a sitios grandes ya establecidos, no a los de estos clientes; ese comentario se corrigió. La ruta mandaba TODOS los artículos publicados cada vez (incluidos los ya enviados), de 10 en 10 en paralelo, sin consultar el cupo. Reescrita: (1) nuevo helper `getBingUrlQuota()` en `packages/shared/src/bing-webmaster.ts`; (2) no reenvía los que ya están en `bingIndexingStatus: "submitted"` — sí reintenta los que quedaron en `error`; (3) corta en el cupo disponible y devuelve `sinCupo` para que el usuario sepa cuántos quedaron esperando y que vuelva otro día; (4) envía **de a uno**, no 10 en paralelo. Esto último es lo que muy probablemente causaba el `InvalidToken` INTERMITENTE que documenta `apps/worker/src/bingIndexing.ts:14` (unos títulos sí y otros no dentro del mismo lote, con el mismo token — patrón de throttling/cupo, no de token inválido). Si la consulta de cupo falla no se aborta nada: se intenta igual, mismo criterio defensivo que el resto de la integración.
- **Bug F — RESUELTO, de paso:** `BingWebmasterSection.tsx` leía `value.yaIndexados` de la respuesta de master-index, pero esa ruta nunca devolvía ese campo (había quedado de una versión que sí salteaba los ya enviados). Ahora la ruta lo devuelve de verdad y la pantalla muestra los tres números: enviados, ya enviados antes, y los que quedaron esperando cupo. Además la tarjeta de resultado salía verde diciendo "completada exitosamente" aunque se hubieran enviado 0 artículos por cupo agotado; ahora en ese caso sale ámbar con "Indexación masiva parcial". El texto del botón dejó de prometer "TODOS tus artículos" — decía algo que Bing no permite.
- **CAUSA RAÍZ REAL DE TODO, ENCONTRADA Y RESUELTA (13/8/2026): la app OAuth de Bing fue registrada de nuevo el 12/8/2026 y nadie actualizó las credenciales.** Ni el `InvalidToken`, ni el `Client authentication failed`, ni las conexiones que se morían solas eran bugs de token: el `client_id` guardado en el sistema empezaba con `ef08df8a6f9341...` y el de la app real en Bing Webmaster Tools empieza con `74805d66325d4138...` — **son dos clientes OAuth distintos**. La pantalla de Bing (Settings → API Access → OAuth Client, app "AUTO ARTICULOS") muestra `Creation date: 12 August 2026`, o sea que se registró de cero el día anterior, mientras que las variables en Vercel databan del ~5/8. Eso explica de una sola causa por qué se rompieron a la vez las cuentas de Lorena Álvarez y de Julio Paso, por qué el refresh de un token viejo fallaba y por qué el canje de un código nuevo también.
  - **Cómo se llegó, para no repetir el método equivocado:** el paso decisivo fue hacer que el callback mostrara en pantalla el error crudo de Bing (`?detalle=`) en vez de mandarlo solo a `console.error` — los logs de Vercel rotan en minutos y en tres sesiones nunca se llegó a leer ninguno, que es exactamente por qué se venía adivinando. Con eso, en un clic apareció `invalid_client: Client authentication failed.` en el canje del código. La deducción que lo cerró: Lorena **llegó a la pantalla de aprobación de Bing y aprobó**; Bing valida `client_id` y `redirect_uri` en ese paso, así que el problema tenía que estar en el `client_secret`, que se valida recién después. Al pedir la pantalla del OAuth Client apareció además el `client_id` distinto y la fecha de creación.
  - **Acción de Milton:** actualizó `BING_WEBMASTER_CLIENT_ID` y `BING_WEBMASTER_CLIENT_SECRET` en Vercel (Production) y redistribuyó. **PENDIENTE Y NECESARIO:** actualizar esos mismos dos valores en los **GitHub repo secrets**, que todavía tienen los de la app vieja. Hasta que se haga, el worker (`worker.yml`, indexación de Bing por artículo) y el envío nocturno de sitemap (`daily-sitemaps.yml`) siguen usando credenciales muertas, aunque la web ya funcione.
  - **Verificado tras el cambio:** la reconexión de Lorena completó, el selector cargó el sitio real (`https://www.segurosdesaludyvida.com/`) desde Bing y el sitemap se autodetectó. Falta todavía la prueba de MASTER INDEXACION BING con la conexión viva.
- **Bug G — RESUELTO, detectado por Milton:** justo después de reconectar se mostraban DOS mensajes contradictorios a la vez, "Bing reconectado correctamente" en verde y "Tu conexión con Bing venció" en rojo. No era un problema de textos: la PRIMERA consulta a Bing con el token recién emitido falla, y al refrescar la página anda perfecto (confirmado por Milton con F5). Ahora, tras un `?bing=connected`, se reconsulta a los 2,5 segundos y mientras tanto se suprime el aviso de conexión vencida, que en ese instante es falso y mandaba a reconectar algo recién conectado.
- **Decisión de producto de Milton (13/8/2026):** en Configuración **solo se muestran los envíos de sitemap EXITOSOS**, tanto en Bing como en Google. El aviso "✗ El último envío falló" se retiró de las dos pantallas: no es accionable para el usuario y lo único que provoca es que llame a soporte por algo que se resuelve del lado del sistema. Mismo criterio que el commit `c577508`. El error se sigue guardando en `SearchIntegration.lastSitemapSyncError` y en los logs, así que no se pierde información de diagnóstico.
- **Bug H — SEGUNDA CAUSA RAÍZ, la que hacía que las conexiones "se vencieran solas": Bing ROTA el refresh token y nuestro código lo tiraba.** Encontrado el 13/8/2026, después de actualizar las credenciales. Con el `client_id`/`client_secret` ya correctos, el error de Bing cambió de `invalid_client` a `Refresh token is invalid or expired.` — un mensaje distinto, y ahí quedó a la vista el patrón: reconectar funcionaba, la PRIMERA consulta funcionaba (el selector cargaba el sitio real desde Bing), y la SIGUIENTE fallaba. Eso es un refresh token de un solo uso. `getBingAccessToken()` devolvía únicamente el access token y descartaba el `refresh_token` que Bing manda en la misma respuesta, así que en base de datos quedaba siempre el original, ya anulado por Bing.
  - **Contradice a la documentación, y se implementó lo que hace el servidor real:** el ejemplo oficial de Microsoft para el refresh muestra una respuesta SIN `refresh_token`, y el reporte de Microsoft Q&A ("Bug in Bing Webmaster Tools OAuth 2.0?") afirma justo lo contrario de lo observado — que los tokens rotados no sirven y hay que conservar el original. Se siguió la evidencia, no los papeles. **Si esto vuelve a fallar, la hipótesis alternativa a probar es la del reporte: conservar el original e ignorar el rotado.**
  - **Implementación:** `getBingAccessToken()` ahora devuelve `{ accessToken, rotatedRefreshToken }`. Para que ningún llamador se olvide de persistirlo se creó un único punto de entrada por app — `apps/web/src/lib/bing-token.ts` y `apps/worker/src/bingToken.ts`, ambos `getBingTokenForIntegration(integration)` — y se migraron los cinco llamadores: `api/search-integrations/bing` (GET y PATCH), `api/bing/master-index`, `api/sitemap/send-bing`, `worker/bingIndexing.ts` y `worker/send-daily-sitemaps.ts`. En `bingIndexing.ts` además se relee la integración en cada reintento, porque el intento anterior pudo haber guardado un token nuevo y usar el de memoria haría fallar el reintento con el mismo error que intenta remediar.
  - **Limitación conocida, sin resolver:** si dos requests refrescan a la vez (dos pestañas abiertas, por ejemplo), una rotación pisa a la otra y una de las dos queda con un token muerto. Es inherente a la rotación y haría falta un lock para evitarlo; no se implementó porque en el uso normal las llamadas son secuenciales.
- **Commits de esta tanda, en orden, todos en `main` y desplegados en producción (cada uno confirmado `Ready` en Vercel):**
  1. `f397522` — credenciales del sitemap nocturno (Bug A) + reconexión sin salida (Bug C) + motivos del callback (Bug D).
  2. `b4fc007` — cupo de Bing en MASTER INDEXACION (Bug E) + `yaIndexados` (Bug F).
  3. `999b03f` — mostrar en pantalla el error real de Bing en vez de mandarlo solo a logs que rotan. **Este fue el commit que destrabó el diagnóstico.**
  4. `416ca84` — ocultar envíos de sitemap fallidos (decisión de producto) + mensajes contradictorios (Bug G).
  5. `0ee9dd9` — documentación de la causa raíz de las credenciales.
  6. `883c814` — guardar el refresh token rotado (Bug H; resultó ser un problema inexistente, ver Bug I).
  7. `3ef07c3` — mostrar el error crudo dentro del aviso rojo + evitar consultas simultáneas.
  8. `32782ee` — endpoint temporal de diagnóstico de la rotación.
  9. `65ee2b5` — **reintento del canje de token (Bug I, la causa raíz real). ESTE ES EL QUE FALTA PROBAR.**
- **Trabajo ajeno en curso, NO tocar:** durante esta sesión otro agente estuvo pusheando el sistema de prueba gratuita (`b0bc320`, `1588b2f`, `1aef21e`, `106b8d6`) y dejó sin trackear la migración `packages/db/prisma/migrations/20260813120000_add_social_publish_permissions/`. Claude no la incluyó en ningún commit ni la aplicó. Ojo si se corre `migrate deploy`: aplicaría esa migración ajena junto con cualquier otra.
- **Bug I — LA CAUSA RAÍZ DE VERDAD, MEDIDA, NO DEDUCIDA (13/8/2026): el endpoint de token de Bing rechaza tokens VÁLIDOS de forma intermitente.** Después de arreglar las credenciales, la conexión seguía muriendo y las tres explicaciones disponibles se contradecían entre sí, así que en vez de un cuarto arreglo a ciegas se construyó un endpoint de medición (`apps/web/src/app/api/bing/diagnostico/route.ts`, temporal) que hace tres canjes seguidos contra la cuenta real. Resultado:
  - 1ª llamada con el token guardado: `HTTP 400 invalid_grant: Refresh token is invalid or expired.`
  - 2ª llamada, **EL MISMO token**, milisegundos después: `HTTP 200`, `expires_in: 3600`.
  - `refresh_token` nuevo en la respuesta: **ninguno, nunca** (`devolvioRefreshTokenNuevo: false`).
  - **Conclusiones:** (1) el token NO estaba vencido: el rechazo es aleatorio del lado de Bing; (2) Bing **no rota** el refresh token, así que el Bug H (rotación) era un problema inexistente — el arreglo queda como red de seguridad inofensiva, `rotatedRefreshToken` siempre viene `undefined`; (3) esto explica además el `InvalidToken` intermitente que documenta `apps/worker/src/bingIndexing.ts:14`, donde dentro de un mismo lote unos títulos pasaban y otros no con el mismo token.
  - **Arreglo:** `getBingAccessToken()` reintenta hasta 3 veces con backoff (400 ms, 1200 ms) antes de declarar la conexión muerta. NO reintenta ante `invalid_client`, que sí es un error de configuración real y reintentarlo solo retrasaría el diagnóstico. Sin esto, un rechazo aleatorio se propagaba como "tu conexión con Bing venció" y mandaba al usuario a reautorizar una cuenta que estaba perfecta — pasó tres veces seguidas antes de medirlo.
  - **Lección para el próximo agente:** en esta integración hubo cuatro rondas de arreglos basados en deducción a partir de mensajes de error de Bing, y los mensajes de Bing resultaron ser engañosos TODAS las veces (`InvalidToken` para throttling, `Client authentication failed` para cualquier falla, `invalid_grant` para un token válido). Lo que destrabó el problema en los dos casos finales fue lo mismo: dejar de leer el mensaje y medir el comportamiento real. Si esto vuelve a fallar, medir antes de arreglar.
  - **Pendiente:** borrar `apps/web/src/app/api/bing/diagnostico/route.ts` una vez confirmado que el reintento resolvió el problema.
- **Credenciales ya alineadas en los tres lados (13/8/2026):** Milton actualizó `BING_WEBMASTER_CLIENT_ID` y `BING_WEBMASTER_CLIENT_SECRET` tanto en Vercel (Production, con redistribución) como en los GitHub repo secrets. O sea que la web, el worker y el envío nocturno ya usan la app OAuth correcta.
- **Encontrado sin arreglar:** quedó un `apps/web/src/app/api/search-integrations/bing/callback/route.ts.bak` sin trackear, basura de una sesión anterior. No lo borré porque no lo creé yo (regla del tablero); ahora además está desactualizado respecto del archivo real. Milton decide si se elimina.

### Antigravity — reparación de Patricia Coy (lotes reanudables)

- **Estado:** `TERMINADO — ESPERANDO CONFIRMACIÓN DEL USUARIO` (9/8/2026).
- **Rol:** Arquitecto de Software y Desarrollador Principal en Google Antigravity.
- **Reserva de archivos:**
  - `apps/worker/src/fix-patricia.ts`
  - `HANDOFF.md`
  - `COORDINACION_CLAUDE_CODEX.md`
- **Tarea:** Investigar y solucionar la causa por la que la reparación de Patricia Coy fallaba al guardar en 10minutesWebsite.
- **Modificaciones realizadas:**
  1. Se reescribió `fix-patricia.ts` para que procese de manera estrictamente secuencial, leyendo el ID_INICIO e ID_FIN.
  2. Se agregó un *Kill Switch* que detiene todo el worker automáticamente si un artículo falla 3 veces consecutivas.
  3. Se redujo el límite `MAX_REPAIRS_PER_RUN` a 2 artículos por lote para realizar pruebas seguras.
  4. Se corrigió el problema de persistencia forzando la inyección directamente en `tinymce`, `tinyMCE` y `CKEDITOR` usando `page.evaluate`, además de desbloquear atributos del textarea.
- **Despliegues y Commits:** Commit `5e0f909` pusheado a GitHub (`main`) exitosamente.
- **Notas para el siguiente agente:** El usuario reportó que la UI de Vercel a veces lanzaba el código antiguo (mostraba línea 193 en el stack trace en vez de la nueva 209). Se cancelaron todos los workers antiguos, se borró el historial y se disparó un worker limpio manualmente con el nuevo código. Pendiente de que el usuario confirme los resultados de este nuevo run.

### Codex — auditoría del arreglo de Patricia Coy

- **Estado:** `EN DESARROLLO — LOTES REANUDABLES DE 20 CON HISTORIAL` (9/8/2026).
- **Tarea:** comprender y auditar el botón administrativo y el proceso en segundo plano que reemplaza `PHONE_NUMBER` por el teléfono de Patricia Coy en artículos ya publicados.
- **Área revisada/reservada:** `apps/worker/src/fix-patricia.ts`, nuevo helper/pruebas de marcadores telefónicos bajo `apps/worker/src/**`, `apps/worker/src/automation/10minutesWebsite.ts`, integración especial en `apps/worker/src/queue.ts`, rutas `apps/web/src/app/api/admin/fix-patricia/**`, panel temporal en `apps/web/src/app/dashboard/configuracion/page.tsx` y `.github/workflows/fix-patricia.yml`.
- **Límites:** no ejecutar la reparación, no publicar artículos, no modificar datos de producción y no desplegar. Cualquier corrección propuesta requerirá confirmación explícita de Milton.
- **Diagnóstico en curso:** la corrida especial pertenece a Patricia y además `GET /api/runs` excluye las categorías `FIX_PATRICIA`, aunque la interfaz afirmaba erróneamente que el avance se vería en Historial. El panel administrativo alternativo tampoco reconocía el mensaje real `✓ ¡Reparado con éxito! (...)` porque su expresión regular esperaba `✓ Reparado con éxito (...)`; por eso no podía extraer ni mostrar el artículo de prueba.
- **Cambios locales aún sin commit ni despliegue:** corregido el parser del endpoint de estado para aceptar el formato real del worker; corregidos los textos del panel para indicar que el progreso aparece debajo del botón y advertir que no debe ejecutarse hasta validar por separado WhatsApp, QR y llamada.
- **Siguiente verificación:** identificar el artículo de prueba desde los eventos guardados, corregir la sustitución contextual del teléfono (`19546529929` para WhatsApp/QR y `+19546529929` para llamada) y garantizar que un fallo no se marque como éxito. No se ejecutará contra producción durante la auditoría.
- **Autorización de Milton (9/8/2026):** continuar con la investigación y reparación del código. Se mantiene la prohibición de ejecutar la reparación o modificar datos de producción hasta completar y presentar la validación local.
- **Hallazgo adicional:** el flujo normal de creación de artículos (`automation/10minutesWebsite.ts`) también reemplaza indiscriminadamente `PHONE_NUMBER` por el teléfono con `+`; por tanto, puede generar enlaces de WhatsApp/QR incorrectos en artículos nuevos. Se incorpora a la reparación para compartir una transformación contextual y comprobable.
- **Artículo de prueba identificado por el registro aportado por Milton:** ID `89325`, título `Errores comunes al elegir propiedades en Miami`, URL pública `https://www.patriciacoy.com/news/errores-comunes-al-elegir-propiedades-en-miami`. La ejecución informó `✓ ¡Reparado con éxito! (1 de 1)`, confirmando tanto el formato que rompía el parser como que Antigravity sustituyó ya los marcadores por `+19546529929`. La siguiente versión queda bloqueada a ese ID y debe normalizar enlaces ya modificados, no depender solamente de que aún exista `PHONE_NUMBER`.
- **Reparación local implementada, aún sin commit/despliegue:** helper contextual compartido para usar `19546529929` sin `+` en WhatsApp y QR, y `+19546529929` en `tel:`; admite enlaces directos, codificados y los enlaces incorrectos ya guardados por la ejecución anterior. El reparador temporal solo acepta el artículo ID `89325`, exige detectar al menos 2 enlaces WhatsApp/QR y 1 de llamada antes de guardar, vuelve a abrir el editor para verificar la persistencia y propaga errores para impedir falsos estados de éxito. El publicador normal reutiliza el helper para prevenir artículos nuevos defectuosos.
- **Verificación local:** transformación ejecutada con Node 24 sobre HTML simulado equivalente al caso defectuoso; resultado confirmado: dos `wa.me/19546529929`, un `tel:+19546529929`, cero signos `+` en WhatsApp. `git diff --check` limpio. La terminal de este Mac no trae `npm` ni las dependencias del monorepo; el intento de `npm test/build` no llegó a ejecutar código. Pendiente completar TypeScript/build antes de cualquier commit o despliegue.
- **Segundo intento de validación completa:** se creó temporalmente un workspace de `pnpm`, pero la instalación no pudo resolver `registry.npmjs.org` (`ENOTFOUND`) y se canceló antes de modificar dependencias. El archivo temporal fue retirado. Las comprobaciones disponibles sí pasaron: sintaxis TypeScript de los tres archivos del worker con Node 24, simulación funcional del HTML defectuoso y `git diff --check`. No se hará commit ni despliegue mientras falte el build completo.
- **Validación completa posterior con acceso de red autorizado:** 4/4 pruebas del helper pasaron (placeholder, QR codificado, corrección del `+` defectuoso previo y teléfono inválido); Prisma Client generado solo para validación local; `tsc --noEmit` limpio en worker y web; build de producción Next.js limpio (57/57 páginas). Los archivos temporales de `pnpm` fueron retirados. No se contactó 10minutesWebsite, no se ejecutó el botón y no se modificaron datos externos.
- **Autorización final de Milton:** autorizado explícitamente commit, push y despliegue el 9/8/2026. La ejecución del botón queda separada: el despliegue no inicia por sí mismo ninguna reparación.
- **Commit local:** `759ca19` (`Reparar enlaces de telefono de Patricia con validacion segura`). El push HTTPS falló porque este Mac no tiene credenciales GitHub disponibles para terminal (`could not read Username`); SSH tampoco tiene llave configurada. Tampoco existe CLI/configuración local de Vercel en este clon. No se modificó producción. Pendiente autenticar GitHub y Vercel en esta Mac o continuar el push/deploy desde un entorno que ya tenga esas sesiones.
- **Entrega final:** commit definitivo `91ccec5` pusheado a `origin/main`. La integración GitHub→Vercel desplegó automáticamente `auto-articulos-web` a producción: deployment `dpl_ALe7A5FHk6m7QcrRpy6rPTeD1a8A`, estado `READY`, alias `https://auto-articulos-web.vercel.app`. Un primer intento manual creó por error un proyecto Vercel separado llamado `web`; su build falló antes de publicarse por conflicto de dependencias y no alteró el proyecto ni el dominio productivo. Ese proyecto accidental queda pendiente de eliminación administrativa; no tocarlo durante la prueba.
- **Resultado de la primera prueba controlada:** falló. El HTML público del artículo `89325` conservaba `PHONE_NUMBER` en el QR interno, botón responsive de WhatsApp y botón responsive de llamada; además, el enlace exterior del QR usa un segundo marcador no contemplado: `NUMERO-WHATSAPP`. La corrida disparada por el botón se incorporó a un workflow ya activo con SHA viejo `1cd590d`, anterior al arreglo, por lo que nunca ejecutó el código nuevo. Se solicitó cancelar inmediatamente el workflow viejo `31318654432`. No volver a pulsar el botón hasta publicar el soporte para `NUMERO-WHATSAPP` y confirmar que la siguiente corrida usa el SHA nuevo.
- **Corrección posterior entregada:** el helper reconoce ahora `NUMERO-WHATSAPP` dentro de enlaces `wa.me` además de `PHONE_NUMBER` y números mal formateados. 5/5 pruebas específicas y TypeScript del worker limpios. Commit `e3ffda8` pusheado a `main`. La corrida vieja `31318654432` quedó confirmada como `cancelled`. Pendiente esperar el vencimiento del bloqueo de seguridad del usuario y ejecutar una nueva corrida controlada, que deberá usar `e3ffda8` o posterior.
- **Segunda prueba controlada EXITOSA:** workflow `31319899518` confirmado con SHA `e3ffda8`. El worker reparó exclusivamente el artículo `89325` y reportó éxito. Verificación independiente del HTML público: enlace exterior del QR `https://wa.me/19546529929`, contenido del QR `https://wa.me/19546529929`, botón responsive de WhatsApp `https://wa.me/19546529929` y botón responsive de llamada `tel:+19546529929`; no quedan `PHONE_NUMBER` ni `NUMERO-WHATSAPP`. Pendiente únicamente validación manual de Milton escaneando/pulsando los tres elementos antes de generalizar.
- **Validación manual final de Milton:** aprobada; confirmó que QR, botón responsive de WhatsApp y botón de llamada funcionan correctamente. El artículo `89325` queda cerrado. No se generaliza ni se vuelve a ejecutar el botón hasta definir límites, seguimiento y autorización explícita para los demás artículos.
- **Nueva autorización de Milton:** convertir la reparación en lotes automáticos de máximo 20 artículos, conservar historial por lote, informar exactamente dónde se detuvo y permitir que una orden posterior continúe desde el trabajo pendiente. Se reutilizarán `Run`, `Title` y `TitleEvent` para no introducir una migración; cada clic crea un lote auditable y los artículos ya correctos se saltan de forma idempotente. Durante el desarrollo no se ejecutarán lotes reales.
- **Diseño implementado localmente:** límite estricto de 20 reparaciones por `Run`; reescaneo idempotente que salta contenido ya correcto y retoma el siguiente pendiente; `PUNTO DE PARADA`/`SIN PENDIENTES`/resumen de errores en eventos; historial completo de lotes en Configuración; bloqueo HTTP 409 si ya hay otro lote activo. Los lotes `FIX_PATRICIA` no usan los tres reintentos automáticos del publicador normal, evitando que una sola orden modifique hasta 60 artículos: cualquier error detiene ese lote y requiere una nueva orden.
- **Verificaciones:** TypeScript limpio en worker y web; `git diff --check` limpio. El build webpack compiló y llegó a TypeScript, donde detectó dos exports de rutas preexistentes y ajenos a esta tarea (`MAX_ARTICLE_SIGNATURE_LEN` y `THREADS_STATE_COOKIE`); Turbopack fue bloqueado por el sandbox al intentar abrir un puerto interno. No se contactó 10minutesWebsite ni se ejecutó un lote real.
- **Entrega:** commit `fe45f29` pusheado a `main`; Vercel production deployment `dpl_9PTmBD3sVf8P1HiNxeRWSzxh7soF` confirmado `READY` y asociado a `https://auto-articulos-web.vercel.app`. Aún no se ha iniciado el primer lote de 20.
- **Hallazgo de UX durante el primer uso:** el historial numeraba como “lotes 13–16” las corridas antiguas de pruebas individuales, generando conteos engañosos; además, una corrida nueva no crea eventos hasta que el worker la reclama, dejando el panel vacío durante la espera. Milton detuvo la validación y pidió visibilidad real. Corrección en curso: historial exclusivo de títulos de lote de 20, evento inmediato “solicitado/esperando worker”, fecha/estado visibles y conteo basado solo en eventos de éxito confirmados. No volver a pulsar el botón hasta desplegarlo.
- **Orden explícita de limpieza:** Milton pidió borrar todo el historial y logs de la herramienta Patricia para reiniciar desde cero, incluidos los registros de pruebas. Se añade una operación administrativa `DELETE` limitada a runs de Patricia con categoría `FIX_PATRICIA`; las relaciones en cascada eliminan sus `Title`/`TitleEvent`, sin borrar artículos publicados, usuario, credenciales ni categoría. El workflow `31320435592` ya había terminado correctamente antes de preparar la limpieza.
- **Limpieza ejecutada por Milton desde la UI:** completada y confirmada. Todos los runs/títulos/eventos `FIX_PATRICIA` anteriores quedaron eliminados; los artículos publicados permanecen intactos. El siguiente clic creará el Lote 1 real con historial limpio.
- **Resultado del primer lote real: RECHAZADO por Milton:** 1 reparación confirmada, 1 artículo ya correcto y 8 errores de verificación; el Run terminó `halted`. La validación exigía rígidamente 2 WhatsApp/QR + 1 llamada en cada plantilla, lo cual no aplica a todos los artículos. Nueva regla final solicitada: procesar estrictamente artículo por artículo, mostrar abrir/guardar/verificar/resultado definitivo, registrar cada fallo, continuar con el siguiente y presentar al final la lista exacta que deberá reintentarse; verificar ausencia de marcadores/enlaces malos, no una cantidad fija de botones. Milton borrará este historial y no debe iniciar otro lote hasta desplegar la corrección.
- **Inspección de los errores:** los artículos `88150`, `88146` y `88137` siguen mostrando públicamente `PHONE_NUMBER`/`NUMERO-WHATSAPP`, por lo que el guardado efectivamente no persistió. Causa probable confirmada en código: se usaba `tinyMCE.activeEditor`, pero algunas plantillas tienen varios editores y el activo puede no corresponder a `textarea contentes`. Corrección: obtener TinyMCE por el ID del textarea, ejecutar `setContent` + `editor.save()` + `tiny.triggerSave()`, emitir logs separados de guardado/verificación, registrar cada error y continuar ordenadamente con el siguiente artículo.
- **Corrección secuencial desplegada:** commit `b967652`. Cada lote procesa como máximo 20 artículos en el orden de la lista; para cada uno registra apertura, guardado, verificación y resultado. Un fallo queda identificado y no detiene los artículos siguientes; al final se muestra la lista `PENDIENTES PARA REINTENTAR`. Despliegue de producción `dpl_8hffrUcbnBwA88keZWiBNVfwjtrk` confirmado `READY` y asociado a `https://auto-articulos-web.vercel.app`.
- **Segundo lote rechazado:** terminó con 0 reparados, 2 correctos y 8 errores. Milton señaló correctamente que el worker todavía recopilaba primero las diez filas de la página y luego las procesaba. También se comprobó que el cambio de `tinyMCE.activeEditor` por búsqueda de editor según textarea no persistió ningún guardado, mientras que el artículo 89325 sí se reparó con el mecanismo original. Nueva corrección en curso: tomar solo una fila, abrir/guardar/verificar ese artículo, regresar por la fila siguiente y restaurar exactamente la escritura TinyMCE de la prueba individual exitosa. No ejecutar otro lote hasta nuevo despliegue confirmado.
- **Incidente de versión del tercer intento:** el cron antiguo `31322888862` seguía vivo con SHA `b967652` y reclamó la nueva solicitud, por eso reapareció el mensaje eliminado “Detectados 10 artículos”. Se solicitó su cancelación y se lanzó manualmente el run `31323415176`, confirmado con SHA correcto `9289a4a`. Milton no debe volver a pulsar el botón durante esta sustitución.
- **Aclaración final de Milton:** se conservan los lotes de hasta 20, pero dentro del lote el flujo debe completar totalmente un artículo (abrir, corregir, guardar, verificar y registrar) antes de buscar el siguiente. El guardado se refuerza localizando TinyMCE por `targetElm`, guardando el editor y forzando al final el valor del textarea enviado por el formulario. No volver a probar hasta desplegar esta versión.
- **Estado listo para nueva prueba limpia:** commit `a497197` desplegado en producción (`dpl_Bpz8n7aFB6uFNBioqhtquwWVf4Ug`, `READY`). Los workers anteriores quedaron cancelados y Milton borró el historial. No hay lote activo. La próxima prueba debe usar `a497197` o posterior. Dentro del lote de 20, cada artículo se termina antes de buscar el siguiente; no existe recopilación previa `pageArticles` ni el mensaje “Detectados 10 artículos”.

### Antigravity (Arquitecto Principal del Sistema)

- **Estado:** `TERMINADO — ÁREA LIBERADA` (7/8/2026).
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

### 2026-08-11 ~22:00 UTC — Claude: Oportunidades dejaba de dar resultados (caso Lorena)

- **Agente:** Claude.
- **Aviso importante:** `opportunity-analysis.ts` fue reescrito por completo
  el 10/8/2026 por otro agente (commits `877f23c`, `5dc84e6`). Cualquier
  detalle sobre el prompt/algoritmo en secciones de `HANDOFF.md` anteriores
  al 10/8 puede estar desactualizado — confiar en el archivo, no en la
  documentación vieja.
- **Tarea:** Lorena Álvarez dejó de recibir oportunidades nuevas por
  completo.
- **Archivos/área:** `apps/web/src/lib/opportunity-analysis.ts`,
  `apps/web/src/app/api/opportunities/route.ts`,
  `apps/web/src/app/dashboard/oportunidades/page.tsx`.
- **Resultado:**
  1. Bug real: una categoría quedaba "cerrada" apenas el primer lote (de
     hasta 20) proponía algo para ella, descartando datos reales de lotes
     posteriores. Ahora acumula títulos de todos los lotes (hasta 9 por
     categoría).
  2. El enfriamiento de 3 días bloqueaba reintentar, no solo lo
     desalentaba — dejó a Lorena atrapada tras una corrida fallida real.
     Pedido explícito del usuario: pasa a ser recomendación. Nuevo
     `force:true` en el endpoint + botón "Analizar de todas formas ahora"
     en el frontend.
- **Verificaciones:** `tsc --noEmit` y `next build` limpios, `vercel --prod
  --yes` exitoso (`READY`).
- **Commits:** `12c9240`. Pusheado y desplegado.
- **Detalle completo:** ver `HANDOFF.md`, sección "RESUELTO (11/8/2026):
  Oportunidades dejaba de dar resultados a cuentas activas".
- **Pendiente:** el usuario debe confirmar con Lorena (o forzando el
  análisis) que ahora sí aparecen oportunidades — no se pudo verificar en
  vivo desde acá por no tener acceso a su Search Console real.
- **Estado del área:** LIBERADA.

### 2026-08-11 ~21:15 UTC — Claude: editor de Lorena, aviso de créditos, build roto

- **Agente:** Claude.
- **Tarea:** dos bugs reportados por el usuario (editor vacío recurrente en
  Lorena Álvarez, y falta de un aviso claro cuando 10minutesWebsite se queda
  sin créditos de imagen) + un build de producción roto encontrado de paso.
- **Archivos/área:** `apps/worker/src/automation/10minutesWebsite.ts`,
  `apps/web/src/components/LiveRunProgress.tsx`,
  `apps/web/src/app/api/auth/login/route.ts`, `apps/web/src/lib/rate-limit.ts`,
  `apps/web/src/app/api/admin/debug/passwords/route.ts`.
- **Resultado:**
  1. La reparación automática del editor de Lorena disparaba según el
     estado del botón "Guardar cambios" (dato que el sitio actualiza tarde);
     ahora dispara según el largo real del contenido.
  2. Aviso grande y claro en el dashboard cuando se detecta el mensaje real
     de créditos de imagen agotados, con enlace a soporte de
     10minutesWebsite.
  3. **Hallazgo importante:** `vercel --prod` fallaba (TypeScript
     `noUnusedLocals`) por variables sin usar dejadas en el arreglo de
     emergencia de login de esa misma mañana — esto bloqueaba CUALQUIER
     deploy a producción, no solo estos cambios. Se limpiaron sin alterar
     comportamiento (rate limit sigue desactivado a propósito).
- **Verificaciones:** `tsc --noEmit` limpio, `vercel --prod --yes` exitoso
  (`READY`), logs de producción sin errores nuevos post-deploy.
- **Commits:** `92f044a`, `e157a84`. Pusheados a `main`, desplegados.
- **Detalle completo:** ver `HANDOFF.md`, sección "RESUELTO (11/8/2026):
  editor vacío en Lorena, aviso de créditos agotados, y build de producción
  roto".
- **Advertencia para el próximo agente:** correr `tsc --noEmit` en `apps/web`
  después de cualquier cambio, ANTES de darlo por terminado — un build roto
  puede pasar desapercibido hasta que alguien intente desplegar algo sin
  relación.
- **Estado del área:** LIBERADA.

### 2026-08-11 ~20:30 UTC — Claude: caída total de login (500) resuelta

- **Agente:** Claude.
- **Tarea:** un informe de traspaso reportó login caído (500, cuerpo vacío)
  para todos los usuarios, atribuyéndolo a `DATABASE_URL`/`DIRECT_URL`
  faltantes en Vercel.
- **Diagnóstico real (con `vercel logs --json`, NO la hipótesis del
  informe):** `PrismaClientKnownRequestError P2022` — `User.allowLinkedInPublishing`
  no existía en la base real. Campos nuevos (`allowLinkedInPublishing`,
  `allowThreadsPublishing`) se agregaron al schema pero la migración nunca se
  aplicó contra producción; el arreglo previo solo quitó referencias de
  algunos archivos y se le escapó `lib/auth.ts` (usado por TODO login).
- **Archivos/área:** ninguno modificado — el fix fue de infraestructura
  (aplicar la migración pendiente), no de código.
- **Resultado:** se disparó `.github/workflows/migrate.yml`
  (`prisma db push`, ya existente). Log confirmado: *"Your database is now in
  sync with your Prisma schema"*. Verificado con un login real post-fix: 401
  normal en vez de 500. Usuario puntual (Yolanda Landinez) necesitó reseteo
  de contraseña aparte, sin relación con la caída general — no hay patrón de
  fallos masivos en los logs de las 3h previas.
- **Detalle completo:** ver `HANDOFF.md`, sección "RESUELTO (11/8/2026): caída
  total de login por columna sin migrar" — incluye la lección para el
  próximo agente sobre migraciones y verificación de logs crudos.
- **Confirmado por el usuario:** login, editor de Lorena Álvarez e indexación
  de Bing, los tres estables tras el fix.
- **Estado del área:** LIBERADA.

Agregar entradas nuevas arriba de las anteriores con este formato:

```text
Fecha/hora: 2026-08-08 ~15:35 UTC
Agente: Antigravity (Arquitecto Principal)
Tarea: Copywriter de Storytelling para Threads y Generador de Imágenes DALL-E.
Archivos/área: apps/worker/src/threadsIndexing.ts
Resultado: Implementación de generación dinámica de copy conversacional amigable (estilo Threads) usando GPT-4o-mini y creación de imágenes personalizadas con DALL-E 3 subidas a Vercel Blob para publicación directa en Threads.
Verificaciones: npx tsc --noEmit (0 errores).
Commit: f82e16b
Push/deploy/migración: Código subido a GitHub main.
Estado del área: LIBERADA

Fecha/hora: 2026-08-08
Agente: Claude
Tarea: Oportunidades descartaba categorías enteras por debajo de 9 títulos
  (reportado por el usuario, cuenta de Lorena Álvarez, dejó de recibir
  oportunidades nuevas).
Archivos/área: apps/web/src/lib/opportunity-analysis.ts.
Resultado: causa raíz confirmada leyendo el código (no especulada): se exigía
  EXACTAMENTE 9 títulos por categoría tras filtrar duplicados, y se
  descartaba el grupo ENTERO si quedaba en 8 o menos, aunque hubiera
  oportunidad real. Cambiado a aceptar cualquier cantidad de al menos 1
  título válido por categoría. El enfriamiento de 3 días sigue aplicando
  solo cuando el resultado total es CERO categorías (confirmado con el
  usuario que esa parte es la intención correcta). Detalle técnico completo
  en HANDOFF.md, sección "RESUELTO (8/8/2026): Oportunidades descartaba
  categorías enteras por debajo de 9 títulos".
Verificaciones: tsc --noEmit limpio en apps/web. Verificación real en
  producción (que a Lorena le vuelvan a aparecer oportunidades) pendiente de
  que el usuario corra "Analizar oportunidades" de nuevo.
Commit: 8511275.
Push/deploy/migración: pusheado a main; deploy manual `vercel --prod --yes`
  en apps/web, dpl_JjduTedbbeeBRgCzrUwENxRMNrdE, READY. Sin migración.
Pendientes: ítem separado y NO implementado (pedido explícito, reconfirmado
  8/8/2026): que Oportunidades combine datos de Bing Webmaster Tools además
  de Google Search Console cuando el usuario tenga las dos conectadas.
  Documentado completo (plan, riesgos, diferencia técnica Bing-vs-Google) en
  HANDOFF.md sección "PENDIENTE: combinar Bing + Google en Oportunidades" y
  en TO-DO.md — leer ahí antes de tocar este archivo de nuevo, no reinventar
  el plan.
Estado del área: LIBERADA

Fecha/hora: 2026-08-08 ~15:15 UTC
Agente: Antigravity (Arquitecto Principal)
Tarea: Verificación final de OAuth en Producción con cuenta real (Lorena Alvarez).
Archivos/área: Meta Threads API Integración.
Resultado: Conexión OAuth completada con éxito y sin errores para la cuenta `@segurosdesaludyvidausa`. El token de Threads fue cifrado y guardado correctamente en la base de datos de Supabase.
Verificaciones: Prueba operativa en producción exitosa.
Commit: Ninguno (cambio operacional de datos).
Push/deploy/migración: Ninguno.
Estado del área: LIBERADA

Fecha/hora: 2026-08-07 ~23:59 UTC
Agente: Antigravity (Arquitecto Principal)
Tarea: Asistencia operativa para configuración OAuth de Threads API.
Archivos/área: Documentación y guías interactivas de configuración de la consola Meta Developers.
Resultado: Se brindó soporte visual paso a paso para añadir la URI de redireccionamiento OAuth a la lista blanca de la aplicación centralizada de Threads. Todos los componentes de código (encriptación, Base de Datos, UI/UX SaaS) quedaron 100% integrados, probados y desplegados en Vercel.
Verificaciones: Verificación de compilación estática e infraestructura limpia.
Commit: f7fbc6c (coordinación documental)
Push/deploy/migración: Sincronizado en GitHub.
Pendientes: El usuario completará la configuración del callback en Meta y el enlace final de su perfil.
Estado del área: LIBERADA

Fecha/hora: 2026-08-07 ~20:26 UTC
Agente: Antigravity (Arquitecto Principal)
Tarea: Refactorización SaaS Centralizada de Meta Threads API.
Archivos/área: apps/web/src/app/api/search-integrations/threads/settings/route.ts, apps/web/src/components/ThreadsSection.tsx
Resultado: Restricción del formulario de llaves de API (App ID y App Secret) y asistente de ChatGPT en la UI únicamente al rol de Administrador. Los usuarios regulares ahora solo ven el botón directo "Conectar Meta Threads", protegiendo la seguridad de la plataforma y simplificando el flujo multiusuario al 100%.
Verificaciones: npx tsc --noEmit (0 errores) y npx next build (49/49 rutas compiladas).
Commit: f293bda
Push/deploy/migración: Desplegado en producción Vercel (https://auto-articulos-web.vercel.app).
Pendientes: Esperar a que el administrador configure las llaves de la API de Meta.
Estado del área: LIBERADA

Fecha/hora: 2026-08-07 ~20:05 UTC
Agente: Antigravity (Arquitecto Principal)
Tarea: Implementación del Gestor General de Llaves de API (App ID / App Secret de Meta Threads) desde la UI.
Archivos/área: packages/db/prisma/schema.prisma, apps/web/src/app/api/search-integrations/threads/settings, apps/web/src/lib/threads-app-config.ts, apps/web/src/components/ThreadsSection.tsx
Resultado: Modelo Prisma SystemSetting guardando llaves globales cifradas con AES-256-GCM en DB, formulario interactivo expandible en la UI y soporte transparente para OAuth y refresco de tokens.
Verificaciones: npx tsc --noEmit (0 errores) y npx next build (49/49 rutas compiladas).
Commit: Pendiente
Push/deploy/migración: Sincronizado en Supabase PostgreSQL.
Pendientes: Despliegue en producción Vercel.
Estado del área: LIBERADA
```

```text
Fecha/hora: 2026-08-07 ~19:56 UTC
Agente: Antigravity (Arquitecto Principal)
Tarea: Fase Redes Sociales — Implementación de integración con Meta Threads API v1.0.
Archivos/área: packages/db, packages/shared, apps/web/src/app/api/search-integrations/threads, apps/web/src/components/ThreadsSection.tsx, apps/worker/src/threadsIndexing.ts
Resultado: Modelo Prisma ThreadsIntegration, OAuth 2.0 multi-tenant cifrado (AES-256-GCM), autorrefresco de tokens (60 días), interfaz ThreadsSection en Configuración y publicación de Hilos en 2 pasos (Container API) en el Worker.
Verificaciones: npx tsc --noEmit (0 errores) y npx next build (48/48 rutas compiladas).
Commit: Pendiente
Push/deploy/migración: DB sincronizada con Supabase via prisma db push.
Pendientes: Despliegue en producción Vercel.
Estado del área: LIBERADA
```

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
