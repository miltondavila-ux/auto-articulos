# PROMPT DE TRASPASO A CODEX — CONEXION COMPOSIO

*(Milton: pega lo que está dentro del bloque de abajo, tal cual, como primer mensaje de la conversación nueva con Codex.)*

```text
Eres Codex y vas a CONTINUAR un proyecto que dejó a medias Claude, en /Users/miltondavila/Creador de articulos (Auto Artículos / SEO TOTAL, Next.js + Prisma + worker en GitHub Actions, desplegado en Vercel).

COORDINACIÓN. Nombre de esta conversación: «Codex - CONEXION COMPOSIO». Antes de tocar nada:
1. Lee COMPLETO el documento de coordinación COORDINACION_CLAUDE_CODEX.md (en origin/main; haz git fetch). Ve directo al FINAL: el bloque «Claude — CONEXION COMPOSIO — TRASPASO A CODEX · ESTADO VIGENTE» PREVALECE sobre todo lo anterior de este proyecto. Tiene el estado exacto, el mapa del código, las decisiones de Milton, las reglas, la rutina de fusión, las trampas conocidas, las verificaciones abiertas y la SIGUIENTE ACCIÓN EXACTA.
2. Lee también CONTROLADOR_DE_VERSIONES.md (últimas entradas de CONEXION COMPOSIO), INVENTARIO_CONVERSACIONES.md, y estos tres documentos de proyecto: MASTER_BLUEPRINT_CONEXION_COMPOSIO.md, FASE_0_ARQUITECTURA_CONEXION_COMPOSIO.md y ESPECIFICACION_CONEXIONES_UNIFICADAS.md (esta última es la UX acordada, la más reciente).
3. Registra esta conversación en INVENTARIO_CONVERSACIONES.md con el nombre exacto y trabaja en rama y worktree PROPIOS (codex/…), nunca sobre main. Reserva los archivos antes de editarlos.

QUÉ ES EL PROYECTO. Un camino PARALELO para que los clientes conecten Google Search Console, Google Analytics, Facebook e Instagram a través de Composio, mientras Google y Meta aprueban las apps OAuth propias (que están en modo de prueba). Para el cliente el método debe ser invisible: una sola pantalla «Conexiones» (ANALÍTICAS / DIFUSIÓN); el administrador decide por persona (módulo opt-in «Conexión por Composio», Habilitado) y por red (interruptor).

ESTADO (verificado, producción = main = 7efaacd). Ya en producción y verificado: Fase 1 y 2a (clave de Composio cifrada, 4 auth configs, tablas IntegrationRoute/ComposioConnection, interruptor BLOQUEADO), 2b-1 (conectar/elegir/probar por Composio, módulo opt-in), UX-1 etapa 1 (pantalla Conexiones opt-in), y dos piezas INERTES de la 2b-2 (resolvedor y adaptador de Search Console). Módulo habilitado SOLO a las cuentas piloto #2 Lorena Alvarez, #3 Mario Davila y #40 Zulmad Antolinez. HOY NINGÚN CONSUMIDOR DEL SISTEMA LEE CONEXIONES DE COMPOSIO: conectar por Composio SUMA, no reemplaza. Lorena ya está restaurada por la API principal.

TU PRIMERA TAREA (2b-2, Search Console por Composio) está detallada paso a paso en la sección «Siguiente acción exacta» del documento de coordinación. En corto: cargador de estado (¿tiene conexión propia? ¿conexión Composio activa con selección?), adaptar UN consumidor (empieza por apps/worker/src/send-daily-sitemaps.ts) para que consulte al resolvedor y use el adaptador solo si corresponde, después la alerta del HOME (solo Search Console), y activar COMPOSIO_CONSUMER_READY.google_search_console SOLO tras probar con las cuentas piloto con Milton presente. Hasta esa activación no debe cambiar NADA para ningún cliente.

REGLAS INNEGOCIABLES.
- Obedece el documento de coordinación completo: punto de retorno (etiqueta Git sobre el commit de producción) ANTES de fusionar, tres auditorías (integridad, funcional, regresión), verificación DESPUÉS, esquema y migración en el mismo commit, commits con archivos explícitos, nunca git add . ni trabajar sobre main. Registra CADA avance en COORDINACION_CLAUDE_CODEX.md (entrada corta al final, sin reescribir las anteriores).
- Producción: fusionar a main despliega. NO fusiones sin permiso EXPRESO de Milton en el chat (el que dio a Claude era de Claude). Antes de fusionar comprueba: Vercel «All Systems Operational», main sin cambios, Preview success, PR MERGEABLE/CLEAN; después verifica /login 200, /privacidad 200, /api/me 401, /dashboard 307 en https://seototal.lasolucionweb.com.
- Con Milton: habla en español, corto y concreto, y GUÍALO PASO A PASO, UNO A LA VEZ. Él usa el panel lateral del navegador. Nunca le pidas ni recibas contraseñas ni claves de API por el chat: las escribe o pega él, tú solo preparas la pantalla. No cierres ni abras sesiones por él.
- No toques vercel.json, middleware, autenticación ni las integraciones propias existentes sin autorización. Nunca ejecutes curl … | sh de Composio. No uses prisma format (reformatea todo el schema).
- Si algo contradice el documento o parece arriesgado para producción, DETENTE y explícaselo a Milton antes de seguir.

ENTORNO. Worktree existente: /Users/miltondavila/Creador de articulos/.worktrees/conexion-composio (limpio). Pruebas: en apps/web `npx tsc --noEmit`, `npx tsx --test src/lib/*.test.ts`, `npm run build`; en apps/worker `npx tsx --test src/*.test.ts` y `npx tsc --noEmit`. Para probar en local copia /Users/miltondavila/Creador de articulos/.env.local a apps/web/.env.local (ignorado por git; bórralo al terminar), corre `npx prisma generate --schema=packages/db/prisma/schema.prisma`, usa localhost (no 127.0.0.1) y una sesión firmada con createSessionToken (apps/web/src/lib/session.ts). Las trampas conocidas están en el documento de coordinación.

Empieza confirmando que leíste el bloque «ESTADO VIGENTE», resume en 5 líneas dónde estamos y cuál es tu primer paso, y pregúntale a Milton si autoriza empezar.
```
