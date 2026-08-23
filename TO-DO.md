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
- **(13/8/2026)** Crear un tercer tipo de usuario, "PRUEBAS": acceso a todo
  igual que un usuario normal, pero SIN restricciones de uso (límites
  mensuales/diarios, etc.). Nota para quien lo ejecute: revisar si esto se
  solapa con el sistema de "Solicitar prueba" (registro público de 7 días)
  que se implementó este mismo día — puede que sean el mismo concepto
  formalizado como rol, o puede que Milton quiera dos cosas distintas
  (cuentas internas de prueba de Milton vs. registros públicos de clientes
  potenciales); confirmar con él antes de asumir cuál es.
- **(16/8/2026)** Bug en responsive/teléfono: las pantallas no se mantienen
  estáticas — al moverlas con el dedo (scroll/touch) cambian de tamaño y de
  comportamiento en vez de quedarse fijas.
- **(16/8/2026)** En el listado de "Usuarios activos" (Administración), el
  orden debe mostrar primero los usuarios que están activos ahora mismo, y
  luego los que han estado activos más recientemente.
- **(16/8/2026)** Queja: la transformación de todas las pantallas al estilo
  Apple quedó a medias, se ve mal y feo. Falta terminarla bien en todas las
  pantallas.
- **(16/8/2026, ampliado 17/8/2026)** Máquina secundaria de creación de
  artículos (alternativa al botón de ChatGPT de 10minutesWebsite/TagCrush):
  - Primero, un análisis de ingeniería inversa de cómo se crean los
    artículos actualmente (el flujo de 10minutesWebsite), para poder
    ofrecer en Auto Artículos la opción de elegir entre dos máquinas de
    creación: 1) la máquina actual de 10minutesWebsite (como hoy), o 2) una
    máquina secundaria más abierta, con su propio prompt dentro de la misma
    Auto Artículos.
  - Esa máquina secundaria escribiría/copiaría el contenido directamente
    sobre el artículo y NO usaría el botón de generación de ChatGPT nativo
    del sitio. Lo único que seguiría usando del flujo actual es el botón de
    imágenes; todo lo demás (edición, publicación, maquetación) queda igual.
  - El prompt de esa máquina secundaria tiene que ser más inteligente,
    mostrar gráficas y números, y el resultado debe ser fácil de leer para
    personas, no solo para máquinas.
  - **Panel de Administración**: crear un menú interactivo con cajas de
    texto y botón "Crear prompt". Los prompts creados se listan en pantalla
    con opción de edición directa.
  - **Selección de los usuarios**: los prompts personalizados quedan
    disponibles para todos los usuarios al momento de crear una nueva
    publicación o ejecutar una oportunidad SEO, permitiéndoles elegir entre
    el prompt por defecto del sistema o cualquiera de los personalizados
    (ej: Prompt 1, 2, 3, etc.).
  - La máquina de creación alternativa usa el prompt seleccionado desde
    Administración para generar el contenido del artículo e
    inyectar/escribir el texto directamente en el editor de la plataforma,
    evitando pulsar el botón de ChatGPT nativo.

- **(23/8/2026)** Módulo de Mejoramiento Continuo: el sistema debe poder
  detectar, por ejemplo, artículos que están siendo mostrados más de lo
  común (impresiones altas) para optimizarlos, detectar cómo optimizarlos, e
  incluso tener un prompt más agresivo que permita crear más botones o que
  haga que el artículo esté mejor escrito con más "call to actions" (CTAs).
  Este módulo debe funcionar en conjunto con una integración futura con
  Google Analytics, tomando en cuenta que Google Search Console ve lo que
  Google propone (impresiones/posición) y Analytics ve lo que la gente
  dispone (comportamiento real de los usuarios) — buscando así hacer mucho
  más efectivo el contenido y escribir sobre lo que la gente está buscando.

- **(23/8/2026)** El sistema debe tener un sitio/pantalla donde el usuario
  pueda re-editar un artículo ya publicado.
- **(23/8/2026)** Módulo de Inconsistencias: un prompt que le pregunte a
  OpenAI si hay inconsistencias (entre artículos existentes), y que le vaya
  comentando al usuario qué artículo debe cambiar y cómo cambiarlo. Debe
  dejar un histórico de los cambios realizados.

- **(23/8/2026)** Integración con el API de Google Analytics (alimenta el
  "Módulo de Mejoramiento Continuo" agregado este mismo día: Search Console
  ve lo que Google propone, Analytics ve lo que la gente realmente hace).
  Dividido en acciones pequeñas para poder ejecutarlo por partes:
  1. Conectar la cuenta de Google Analytics del usuario (OAuth), similar al
     flujo ya existente de conexión con Google Search Console.
  2. Traer por artículo el comportamiento real de los visitantes: páginas
     vistas, tiempo en página, tasa de rebote, clics en botones/CTAs.
  3. Cruzar esos datos de Analytics con los de Search Console (impresiones,
     posición) para ubicar artículos con mucho tráfico potencial pero bajo
     rendimiento real.
  4. Usar ese cruce como fuente de datos del Módulo de Mejoramiento
     Continuo, para que sepa qué artículos priorizar y por qué.

- **(23/8/2026)** Integración con Microsoft Clarity. Dividido en acciones
  pequeñas:
  1. Conectar la cuenta/proyecto de Microsoft Clarity del usuario.
  2. Traer los datos de mapas de calor y grabaciones de sesión relevantes
     por artículo (dónde hace clic la gente, dónde abandona).
  3. Sumar esos datos como otra fuente de información del Módulo de
     Mejoramiento Continuo, junto con Analytics y Search Console.

- **(23/8/2026)** Culminar las integraciones pendientes con otras redes
  sociales y plataformas de microblogging (esto completa/detalla el ítem
  del 9/8/2026 "Redes sociales a conectar para envío automático", que ya
  lista las mismas redes — al ejecutar, revisar ambos ítems juntos). Ir
  red por red como acciones independientes y pequeñas, sin necesidad de
  completarlas todas de una vez:
  1. Threads
  2. X
  3. LinkedIn
  4. Instagram (dos acciones separadas: publicaciones normales y carruseles)
  5. Facebook (tres acciones separadas: Página, Grupos y Perfil personal)
  6. Bluesky
  7. Mastodon
  8. Pinterest
  9. Tumblr
  10. Reddit (fase eventual, no prioritaria)

## Hecho

- **(16/8/2026)** Asistente Flotante Arrastrable (Drag-and-Drop) en `FloatingAssistant`:
  - Se agregó la funcionalidad de arrastrar (drag-and-drop) con soporte completo para ratón y gestos táctiles (touch) en móviles.
  - La posición del asistente flotante se calcula mediante offsets con respecto a los bordes derecho e inferior (`right` y `bottom`), lo cual garantiza que al abrir o cerrar el panel, el botón lanzador permanezca en su lugar y el panel crezca hacia arriba de manera limpia.
  - En responsive móvil (ancho <= 560px), el arrastre horizontal se inhabilita para respetar los márgenes del layout, permitiendo el arrastre vertical de forma fluida para evitar tapar otros elementos.
  - Se implementó un umbral de movimiento de 5 píxeles para evitar que los clics normales para abrir o cerrar el asistente se malinterpreten como arrastres.
  - La posición se guarda y persiste en `localStorage` mediante `STORAGE_KEY`, y se adapta en vivo ante redimensionamientos de ventana (`resize`).
  - Ver cambios en: [`FloatingAssistant.tsx`](file:///Users/miltondavila/Creador%20de%20articulos/apps/web/src/components/FloatingAssistant.tsx).

- **(14/8/2026)** Guía y Redirección Activa a Configuración Requerida (`PreValidationGuard`):
  - Se eliminaron los avisos pasivos y pantallas bloqueadas a medias en `/dashboard/publicar` y `/dashboard/oportunidades`.
  - Se implementó el componente de protección y guía activa `PreValidationGuard.tsx`, el cual oculta el formulario inoperable si faltan pasos de configuración y muestra un checklist visual estructurado con badges de estado (10minutesWebsite, Categorías, Idioma, Google Search Console, Créditos de Imagen).
  - Incluye botón CTA prominente y directo: **"🚀 Ir al Asistente de Configuración (Paso X: [Paso pendiente])"** que lleva al usuario al Wizard (`/dashboard/configuracion?tab=wizard`) o a la acción requerida, y desbloquea el formulario de forma 100% limpia tan pronto todo está listo.
  - Ver cambios en: `apps/web/src/components/PreValidationGuard.tsx`, `apps/web/src/app/dashboard/publicar/page.tsx`, `apps/web/src/app/dashboard/oportunidades/page.tsx`.

- **(13/8/2026)** Pre-validación inteligente y Modal Pop-up de Créditos de Imagen:
  - Verificación unificada en segundo plano antes de publicar (`/dashboard/publicar`) y ejecutar oportunidades SEO (`/dashboard/oportunidades`), revisando:
    1. **10minutesWebsite conectado**: Validación de credenciales con enlace directo a la pestaña y ancla `/dashboard/configuracion?tab=platform#credentials`.
    2. **Categorías sincronizadas**: Detección de categorías con enlace directo a `/dashboard/configuracion?tab=platform#categories`.
    3. **Idioma de redacción**: Verificación de idioma configurado con enlace directo a `/dashboard/configuracion?tab=platform#language`.
    4. **Google Search Console**: Verificación de conexión y sitio web seleccionado con enlace directo a `/dashboard/configuracion?tab=integrations#google`.
    5. **Créditos de imagen disponibles**: Nuevo campo `hasImageCredits` en `User` y comprobación preventiva. Si los créditos están agotados, se muestra el Pop-Up interactivo (`ImageCreditsModal.tsx`) bloqueando la acción y ofreciendo un botón directo a `https://www.10minuteswebsite.com/ayuda` para solicitar créditos gratuitos.
  - Endpoint dedicado `GET /api/pre-validation` que centraliza la evaluación de los 4 pilares operativos.
  - Salvaguardas en backend (`POST /api/runs`, `POST /api/opportunities/execute`, `POST /api/opportunities/execute-all`) rechazando con código `NO_IMAGE_CREDITS` si no hay saldo.
  - Detección en worker (`apps/worker/src/queue.ts`) marcando automáticamente `hasImageCredits: false` cuando 10minutesWebsite reporta agotamiento de tokens/créditos de imagen.
  - Panel de Administración (`/dashboard/usuarios`): control y toggle de `hasImageCredits` por usuario en `UserCard` y badge visual de advertencia `⚠️ SIN CRÉDITOS IMAGEN`.
  - Ver cambios en:
    - `packages/db/prisma/schema.prisma` y migración `20260813210000_add_user_has_image_credits`
    - `apps/web/src/components/ImageCreditsModal.tsx`
    - `apps/web/src/app/api/pre-validation/route.ts`
    - `apps/web/src/app/api/runs/route.ts`
    - `apps/web/src/app/api/opportunities/execute/route.ts`
    - `apps/web/src/app/api/opportunities/execute-all/route.ts`
    - `apps/web/src/app/api/me/route.ts`
    - `apps/web/src/app/api/admin/users/route.ts`
    - `apps/web/src/app/api/configuration-status/route.ts`
    - `apps/web/src/app/dashboard/configuracion/page.tsx`
    - `apps/web/src/app/dashboard/publicar/page.tsx`
    - `apps/web/src/app/dashboard/oportunidades/page.tsx`
    - `apps/web/src/app/dashboard/usuarios/page.tsx`
    - `apps/worker/src/queue.ts`

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
