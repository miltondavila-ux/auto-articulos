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

- **(7/8/2026)** Que Oportunidades use la data de Bing Webmaster Tools
  además de la de Google Search Console, cuando el usuario tenga las dos
  conectadas (hoy `POST /api/opportunities` solo usa Google, y de hecho
  bloquea el análisis si Google no está conectado, aunque haya Bing). Plan
  ya conversado con Claude ese día: Google deja de ser obligatorio (basta
  con tener uno de los dos); si hay Bing conectado, se traen sus consultas
  con más impresiones/clics (`GetQueryStats` de la API de Bing Webmaster
  Tools) y se le pasan a la IA como evidencia aparte, claramente etiquetada
  como "Bing" (Bing solo da consulta, no consulta+página como Google); si
  hay ambos, se combinan. Sin probar contra una cuenta real de Bing todavía.
  Reconfirmado por el usuario el 8/8/2026 (mismo pedido, sin cambios de
  diseño); ver detalle técnico completo en `HANDOFF.md`, sección
  "PENDIENTE: combinar Bing + Google en Oportunidades".
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
- **(13/8/2026)** Terminar la investigación de Bing que quedó a mitad de
  camino (cuenta de Julio Paso): verificar en el portal de Bing Webmaster
  Tools (Configuración → API Access) si el Client ID/Secret ahí coincide con
  lo guardado en `BING_WEBMASTER_CLIENT_ID`/`BING_WEBMASTER_CLIENT_SECRET` de
  Vercel — sospecha de que el secret guardado ya no es válido, causando el
  bucle de "reconectar" → "vuelve a decir que venció" casi inmediato. Ver
  `COORDINACION_CLAUDE_CODEX.md`, sección "Claude — investigación en curso"
  para el detalle completo de lo ya descartado.
- **(13/8/2026)** Validar que el idioma por defecto del usuario
  (`User.contentLanguage`) esté configurado correctamente ANTES de publicar
  artículos — relacionado con los bugs reales de idioma vacío/mal
  sincronizado ya resueltos el 7-11/8/2026 con Gustavo Torres, Svetlana y
  Mariana Romero (ver `HANDOFF.md`); esto pide una validación preventiva
  explícita, no solo los parches puntuales que ya se aplicaron caso por caso.
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
- **(13/8/2026)** Módulo de control de módulos para el administrador
  principal: poder ocultar/deshabilitar secciones completas del sistema
  (ejemplo dado: "Oportunidades de redes") para que un usuario específico no
  las vea en absoluto en su menú/UI — no solo permisos de acción dentro de un
  módulo (eso ya existe por red social, ver ítem del 9/8/2026), sino esconder
  el módulo entero. Debe poder aplicarse por usuario individual Y de forma
  global (para todos a la vez) — pedido explícito: hoy hay partes en
  reparación que no deberían verse mientras se arreglan.
- **(13/8/2026)** Crear un tercer tipo de usuario, "PRUEBAS": acceso a todo
  igual que un usuario normal, pero SIN restricciones de uso (límites
  mensuales/diarios, etc.). Nota para quien lo ejecute: revisar si esto se
  solapa con el sistema de "Solicitar prueba" (registro público de 7 días)
  que se implementó este mismo día — puede que sean el mismo concepto
  formalizado como rol, o puede que Milton quiera dos cosas distintas
  (cuentas internas de prueba de Milton vs. registros públicos de clientes
  potenciales); confirmar con él antes de asumir cuál es.
- **(13/8/2026)** Mejorar el wizard de inicio (`OnboardingSteps` en
  `dashboard/page.tsx`) para que sea más sencillo de usar. Debe explicar que,
  si el usuario no sabe su contraseña de 10minutesWebsite, puede cambiarla en
  `https://10minuteswebsite.net/dashboard/forgot-password.php`, y sugerirle
  que después de cambiarla vuelva y use esa MISMA contraseña (la que el
  sistema le generó, o la que él mismo puso) también en Auto Artículos, para
  que las credenciales guardadas coincidan con las reales.

## Hecho

- **(9/8/2026)** Bug del menú en iPad resuelto: se cambió el breakpoint de
  700px a 1024px en DashboardNav.tsx y dashboard/layout.tsx, y se agregó
  `width=device-width, initial-scale=1` al viewport. Ahora iPad portrait
  (768px) y landscape (1024px) muestran el dropdown, que era el
  comportamiento esperado. Ver cambios en:
  - `apps/web/src/app/layout.tsx`
  - `apps/web/src/components/DashboardNav.tsx`
  - `apps/web/src/app/dashboard/layout.tsx`
