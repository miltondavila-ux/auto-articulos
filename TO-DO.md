# TODO — Ideas pendientes del usuario (Auto Artículos)

Este documento es un buzón de ideas de Milton, no un plan de trabajo ni una
cola de tareas automática.

## Regla obligatoria para cualquier agente (Claude, Codex, Antigravity)

**Este archivo SOLO GUARDA. Ningún agente ejecuta, propone iniciar ni empieza
a investigar un ítem de esta lista por su cuenta**, sin importar cuánto
tiempo lleve aquí, lo simple que parezca o lo relacionado que esté con la
tarea actual. Un ítem escrito aquí no es una instrucción — es una nota que
Milton se deja a sí mismo para pedirla más adelante, cuando él decida.

Está permitido y es útil leer este archivo para tener contexto de hacia
dónde va el proyecto. Lo que no está permitido es actuar sobre él sin que
Milton lo pida explícitamente en la conversación activa, exactamente igual
que con cualquier otra instrucción no autorizada.

## Cómo agregar un ítem

Cuando Milton pida guardar una idea aquí: agregarla tal cual la describió,
con la fecha, en "Pendientes". No expandirla, no diseñarla, no dividirla en
pasos — eso se hace recién cuando él pida ejecutarla.

## Cómo cerrar un ítem

Cuando Milton pida ejecutar algo de esta lista: al terminar, moverlo a
"Hecho" con la fecha y el commit/PR correspondiente, y documentar el cambio
real en `HANDOFF.md` como de costumbre (este archivo no reemplaza al
HANDOFF, solo alimenta ideas hacia él).

## Pendientes

- **(8/8/2026)** Motor de Distribución Inteligente SEO para Redes Sociales:
  Crear un programador automático que publique un máximo de 2 posts por semana
  por red social activa (X, LinkedIn, Threads, Instagram, Facebook Pages y
  múltiples Facebook Groups). Los temas y artículos a publicar se seleccionarán
  automáticamente en base a cuáles están puntuando/creciendo mejor en impresiones
  y clics dentro de Google Search Console, para darles un empuje de tráfico social
  estratégico. Evita el spam y el shadowban.
- **(9/8/2026)** Reacondicionar y rediseñar el módulo de Configuración de
  cada usuario: hoy luce muy desorganizado. Agregar botones/etiquetas que
  permitan entender qué es cada cosa, con explicaciones cortas de qué hace
  cada sección/campo (no solo un placeholder o un párrafo largo).
- **(9/8/2026)** Generador de infografías para redes sociales, basado en las
  consultas/temas que están puntuando mejor en Google Search Console. Es
  contenido ADICIONAL e independiente de los artículos normales de
  10minutesWebsite — no una infografía derivada de un artículo ya publicado,
  sino una pieza nueva (imagen + texto tipo post) creada específicamente para
  redes sociales, descargable para publicarla ahí. Requiere en Configuración
  un espacio nuevo donde el usuario suba: (1) su logo, y (2) una foto suya —
  ambos para que el generador sepa qué logo y qué imagen de la persona usar
  al armar cada infografía.
- **(9/8/2026)** Bug reportado: Antonio Aguirre tiene DOS cuentas separadas
  de Auto Artículos (dos logins/emails distintos, cada una con sus propias
  credenciales guardadas de 10minutesWebsite) — una para su contenido en
  español y otra para su contenido en inglés. El sistema debería sincronizar
  categorías y publicar de forma independiente en cada cuenta según cuál esté
  en uso, pero en la práctica solo revisa/sincroniza las categorías de la
  cuenta en español y termina publicando ahí, ignorando la cuenta en inglés.
  Causa raíz sin diagnosticar todavía — investigar con evidencia real (logs
  de sincronización de categorías y de publicación de ambas cuentas) antes de
  asumir dónde está el problema.
- **(9/8/2026)** Agregar dos botones de llamada a la acción en la pantalla de
  Login, dirigidos a quienes todavía no tienen acceso al Programa de
  Posicionamiento. Deben verse claramente dentro del Login y mantener el
  mismo estilo visual del resto del sistema.
  - **Botón 1** — Texto: "Accede al Programa de Posicionamiento – Pago Único
    $799". Enlace: `https://buy.stripe.com/cN202DaQY4QS8dq28N`.
  - **Botón 2** — Texto: "Suscripción Mensual – $250/mes". Todavía no tiene
    enlace asignado; el botón debe mostrarse igual desde ya (sin link activo
    o deshabilitado, a definir al ejecutar). Cuando el enlace esté listo,
    solo hay que reemplazar la URL, sin tocar diseño ni funcionalidad.
- **(9/8/2026)** Bug reportado: las estadísticas de artículos parecen
  contabilizarse desde el momento en que se solicitan/comienzan a generarse,
  en vez de contarse solo cuando terminan bien. Corregir para que un
  artículo sume a las estadísticas ÚNICAMENTE después de que el sistema
  confirme que quedó guardado con éxito en la plataforma — los que fallen,
  queden incompletos, se cancelen o nunca lleguen a guardarse no deben sumar.
- **(9/8/2026)** Redes sociales a conectar para envío automático, hasta 3
  veces por semana cada una (relacionado con el ítem del 8/8/2026 "Motor de
  Distribución Inteligente SEO para Redes Sociales", que hablaba de 2 veces
  por semana — revisar y unificar el número al ejecutar):
  - Threads
  - X
  - LinkedIn
  - Instagram — publicaciones normales y carruseles (dos formatos distintos)
  - Facebook — Página, Grupos y Perfil personal (tres superficies distintas)
  - Bluesky
  - Mastodon
  - Pinterest
  - Tumblr
  - Reddit (fase eventual, no prioritaria)

  **Importante:** el administrador principal debe tener, desde su propio
  panel, un control para otorgarle o quitarle a cada usuario el acceso a
  cada red social individualmente (no todo o nada — por red, por usuario).
- **(9/8/2026)** "Reparador de artículos" — herramienta nueva para detectar y
  corregir canibalización entre artículos YA PUBLICADOS (distinto de
  Oportunidades, que genera títulos NUEVOS; esto repara los existentes):
  - Usar los datos reales de Google Search Console (mismo análisis que ya
    usa el sistema) para detectar cuándo dos o más artículos de un mismo
    usuario están canibalizándose entre sí (compitiendo por la misma
    intención de búsqueda).
  - Al corregir: NO tocar los títulos de esos artículos — sí acceder y
    modificar su CONTENIDO, para diferenciarlos entre sí y que dejen de
    competir.
  - El objetivo es liberar "oportunidades de descanibalización" y que todos
    los artículos existentes (no solo los nuevos) aporten de verdad a la
    indexación y el posicionamiento, en vez de restarse entre ellos.
- **(13/8/2026)** Pre-validación inteligente antes de publicar un artículo o
  correr Oportunidades: revisar que el usuario tenga (a) 10minutesWebsite
  conectado, (b) categorías sincronizadas, (c) Google Search Console
  conectado, (d) créditos de imagen disponibles en su cuenta de
  10minutesWebsite. Si algo falla, llevar al usuario DIRECTO al lugar exacto
  donde debe resolverlo (con ancla/link directo a esa sección específica, no
  solo a Configuración en general), con un mensaje claro de qué falta. La
  validación se hace una vez de forma visible al entrar, y después en segundo
  plano cada vez que se intenta publicar/analizar — si algo falla en ese
  momento, lleva al usuario a resolver ese punto exacto antes de continuar.
- **(13/8/2026)** Crear un tercer tipo de usuario, "PRUEBAS": acceso a todo
  igual que un usuario normal, pero SIN restricciones de uso (límites
  mensuales/diarios, etc.). Nota para quien lo ejecute: revisar si esto se
  solapa con el sistema de "Solicitar prueba" (registro público de 7 días)
  que se implementó este mismo día — puede que sean el mismo concepto
  formalizado como rol, o puede que Milton quiera dos cosas distintas
  (cuentas internas de prueba de Milton vs. registros públicos de clientes
  potenciales); confirmar con él antes de asumir cuál es.
## Hecho

- **(13/8/2026)** Wizard de Inicio y Configuración Inicial interactivo paso a paso:
  - Flujo vertical estructurado en 4 pasos obligatorios secuenciales + paso final con sombreado/dessombreado dinámico (paso activo iluminado con foco azul y sombra; pasos completados en verde con check; pasos futuros atenuados/muted).
  - **Paso 1 (10minutesWebsite)**: Explica las credenciales, incluye enlace directo de reseteo de contraseña (`https://10minuteswebsite.net/dashboard/forgot-password.php`), sugerencia de sincronizar contraseñas, y formulario/edición rápida.
  - **Paso 2 (Categorías)**: Explicación y botón para sincronizar/descargar categorías de 10minutesWebsite en vivo con badge de estado y etiquetas.
  - **Paso 3 (Idioma de redacción)**: Selector de idioma principal con guardado directo y botón de recarga de lista de idiomas.
  - **Paso 4 (Google Search Console)**: Instrucción explícita de abrir GSC en una pestaña contigua para verificar activación antes de conectar, flujo OAuth y selector de sitio web.
  - **Paso 5 (Meta final)**: Felicitación y acceso directo a publicar el primer artículo o explorar Oportunidades SEO.
  - Disponible tanto en la página de Inicio (`/dashboard`) como en la nueva pestaña **"🚀 Configuración Inicial"** (`/dashboard/configuracion?tab=wizard`).
  - Ver cambios en:
    - `apps/web/src/components/OnboardingWizard.tsx`
    - `apps/web/src/app/dashboard/page.tsx`
    - `apps/web/src/app/dashboard/configuracion/page.tsx`

- **(13/8/2026)** Validación preventiva de idioma (`User.contentLanguage`) antes de permitir publicar o ejecutar oportunidades:
  - Verificación estricta en endpoints (`POST /api/runs`, `POST /api/opportunities/execute`, `POST /api/opportunities/execute-all`) rechazando con `400` y mensaje explicativo si `contentLanguage` del lote o del perfil está vacío.
  - Avisos visuales preventivos en `/dashboard/publicar` y `/dashboard/oportunidades` con enlace directo a Configuración.
  - Deshabilitación preventiva de botones de publicación y ejecución ("Iniciar", "Publicar todas", "Ejecutar categoría", "Ejecutar título") cuando falta idioma.
  - Salvaguarda en worker (`apps/worker/src/queue.ts`) deteniendo limpiamente el lote con estado `halted` y mensaje claro si un lote entrara sin idioma configurado.
  - Ver cambios en:
    - `apps/web/src/app/api/runs/route.ts`
    - `apps/web/src/app/api/opportunities/execute/route.ts`
    - `apps/web/src/app/api/opportunities/execute-all/route.ts`
    - `apps/web/src/app/dashboard/publicar/page.tsx`
    - `apps/web/src/app/dashboard/oportunidades/page.tsx`
    - `apps/worker/src/queue.ts`

- **(13/8/2026)** Control de visibilidad de módulos para el Administrador
  (global y por usuario) implementado y verificado:
  - Permite al Administrador ocultar módulos enteros del sistema (ej. *Oportunidades Redes*,
    *Actualizaciones*, *Publicaciones en Curso*, etc.) tanto de forma **global** (mantenimiento/desarrollo)
    como de forma **individual por usuario**.
  - Los administradores siempre conservan acceso para probar y desarrollar, con indicador visual en el menú.
  - Ocultamiento en navegación (`DashboardNav`) y protección directa contra acceso por URL mediante `ModuleGuard` (pantalla defensiva de mantenimiento).
  - Pestaña de gestión global en el Centro de Control de Administración (`/dashboard/usuarios`) y sección por usuario en cada `UserCard`.
  - Ver cambios en:
    - `packages/db/prisma/schema.prisma` y migración `20260813180000_add_user_disabled_modules`
    - `apps/web/src/lib/modules.ts`
    - `apps/web/src/app/api/me/route.ts`
    - `apps/web/src/app/api/admin/modules/route.ts`
    - `apps/web/src/app/api/admin/users/route.ts`
    - `apps/web/src/lib/current-user.ts`
    - `apps/web/src/components/DashboardNav.tsx`
    - `apps/web/src/components/ModuleGuard.tsx`
    - `apps/web/src/app/dashboard/layout.tsx`
    - `apps/web/src/app/dashboard/usuarios/page.tsx`

- **(13/8/2026)** Sistema de Prueba Gratuita (Free Trial de 7 días):
  - **Fase 1**: Botón y formulario "SOLICITAR PRUEBA" en el Login (`/api/auth/trial-signup`) que crea una cuenta pública con 7 días de acceso completo (`trialEndsAt`, `isTrialUser`), login inmediato y banner de bienvenida.
  - **Fase 2**: Pantalla de bloqueo y expiración al cumplirse los 7 días con mensaje explicativo, invitación a contactar a Milton y redirección segura.
  - **Fase 3**: Panel de administración para extender o finalizar la prueba de cualquier usuario en un clic, y badge visual de cuenta en prueba en el dashboard.
  - Commits: `eef51e8`, `b0bc320`, `1588b2f`, `1aef21e`, `6b6c0ce`, `106b8d6`.

- **(13/8/2026)** Integración y alcance completo de Bing Webmaster Tools culminado al 100% y verificado en producción (cuenta de Julio Paso):
  - Conexión OAuth y estabilidad completas: credenciales actualizadas (app registrada el 12/8/2026), unificación a `www.bing.com`, reintentos exponenciales automáticos, almacenamiento cifrado de `access_token` en BD (con caché de 50 min) y refresh tokens persistidos.
  - Indexación y envíos: detección y envío automático de sitemaps (`SubmitFeed`), control estricto de cupo diario en MASTER INDEXACION y aviso visual simplificado.
  - Cierre definitivo de todo el alcance de Bing en el sistema.
  - Commits: `6e53687`, `1503a81`, `ac6fedf`, `c47b5ba`, `f397522`, `b4fc007`,
    `0ee9dd9`, `7c4bad7`, `670e38d`, `940db86`, `52792c5`, `3dc9586`, `c546349`.
- **(9/8/2026)** Bug del menú en iPad resuelto: se cambió el breakpoint de
  700px a 1024px en DashboardNav.tsx y dashboard/layout.tsx, y se agregó
  `width=device-width, initial-scale=1` al viewport. Ahora iPad portrait
  (768px) y landscape (1024px) muestran el dropdown, que era el
  comportamiento esperado. Ver cambios en:
  - `apps/web/src/app/layout.tsx`
  - `apps/web/src/components/DashboardNav.tsx`
  - `apps/web/src/app/dashboard/layout.tsx`
