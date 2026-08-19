/**
 * Manual base de uso. Se revisa cuando cambia una función estable del sistema.
 * Las novedades y arreglos recientes se agregan en tiempo real desde
 * ProductUpdate mediante getUserManualKnowledge().
 */
export const BASE_USER_MANUAL = `
# Manual de uso de Auto Artículos

Este manual explica cómo usar la plataforma desde la perspectiva de una persona usuaria. No describe contraseñas internas, programación ni configuración técnica del sistema.

## Antes de empezar (Asistente de Configuración Inicial)

Cuando ingresas a tu cuenta por primera vez o aún no tienes artículos publicados, Inicio te muestra el **Asistente de Configuración Inicial Paso a Paso**. Este asistente te guía de forma secuencial por los 4 pasos esenciales:

1. **Paso 1 (Cuenta de la plataforma):** Guarda tu usuario y contraseña de la plataforma. Si no recuerdas esa clave, puedes restablecerla o crear una nueva en segundos desde el enlace directo de recuperación de la plataforma incluido en el asistente. Al guardar, el paso queda en **"Pendiente de verificar"** (ámbar): tus datos se guardan cifrados, pero todavía no se ha comprobado que sirvan para entrar. Se vuelve verde solo cuando la sincronización del Paso 2 logra entrar de verdad a tu cuenta — esa es la única prueba real de que el usuario y la contraseña son correctos. Si el Paso 2 falla diciendo que no pudo iniciar sesión, revisa esas credenciales entrando a mano a tu plataforma y vuelve a guardarlas aquí.
2. **Paso 2 (Sincronizar categorías):** Descarga en vivo las categorías reales de tu web para clasificar tus artículos.
3. **Paso 3 (Idioma de redacción):** Confirma el idioma principal en el que la Inteligencia Artificial redactará tus contenidos.
4. **Paso 4 (Google Search Console):** Abre Search Console en una pestaña contigua de tu navegador para comprobar que esté activo con la cuenta de Google dueña de tu web, y luego conéctalo mediante Google OAuth seleccionando tu sitio.
5. **Meta final:** Al completar los 4 pasos, se desbloquea el acceso para publicar tu primer artículo o explorar Oportunidades SEO.

También puedes volver a abrir el Asistente en cualquier momento desde **Configuración** (/dashboard/configuracion?tab=wizard).

## Inicio

Ruta: /dashboard

Inicio es tu centro de operaciones:
- **Para cuentas nuevas (sin artículos aún):** Muestra de forma prioritaria el Asistente de Configuración Inicial para que completes tu puesta a punto sin distracciones.
- **Para cuentas con artículos publicados:** Muestra el panel de métricas de rendimiento (artículos publicados hoy, en el mes, límites y gráfico de actividad).
- Desde el menú superior tienes acceso a: Cómo Funciona, Publicaciones, Historial, Actualizaciones y Configuración.

## Cada módulo se explica solo

Al principio de cada pantalla hay un recuadro que empieza con "Antes de avanzar, lee esto". Ahí se explica en pocas líneas qué sucede en ese módulo, para qué sirve y qué se espera de ti, en lenguaje llano y sin dar por supuesto ningún conocimiento previo.

Dentro de esas explicaciones, el nombre de cualquier módulo aparece en MAYÚSCULAS y en negrita, y además es un enlace: al pulsarlo vas directo a esa pantalla. Así, si un texto te manda a otro módulo, no tienes que buscarlo en el menú.

## El menú

El menú superior tiene, en este orden: **Inicio**, **Cómo Funciona**, **Publicaciones**, **Historial**, **Actualizaciones** y **Configuración**. Los administradores ven además **Administración**.

**Publicaciones** no es una pantalla: es un grupo que se despliega. Dentro están las cuatro pantallas relacionadas con publicar:

- **Publicaciones propias** (/dashboard/publicar): tus propios títulos.
- **Oportunidades SEO/AEO** (/dashboard/oportunidades): las que propone el sistema a partir de Google Search Console.
- **Oportunidades para Redes Sociales** (/dashboard/oportunidades-redes): llevar artículos ya publicados a tus redes.
- **Publicaciones en Curso** (/dashboard/publicaciones-en-curso): lo que se está publicando ahora mismo.

En computadora, Publicaciones se abre al pulsarlo y se cierra al elegir una opción, al pulsar fuera o con la tecla Escape. En teléfono y tableta no se despliega: las cuatro opciones aparecen listadas debajo del título Publicaciones.

Si el administrador te oculta algún módulo, simplemente no aparece en el menú. Si te oculta los cuatro, el grupo Publicaciones desaparece entero.

## Configuración

Ruta: /dashboard/configuracion

Aquí preparas tu cuenta y personalizas el contenido.

### Configuración Inicial (Asistente Paso a Paso)

Pestaña destacada en Configuración que te permite repasar o completar el asistente de 4 pasos en cualquier momento. Cuenta con un banner superior para abrirlo directamente.

### Cuenta de la plataforma de publicación

Guarda el usuario y contraseña de tu cuenta de la plataforma. El sistema los usa para publicar artículos en tu sitio. Si no recuerdas esa contraseña, usa el enlace de recuperación de la plataforma; no uses aquí la contraseña de Auto Artículos.

### Categorías e idiomas

Usa “Sincronizar categorías ahora” para traer las secciones disponibles de tu sitio. Esas categorías aparecen después al publicar y en Oportunidades. Sincroniza también los idiomas de redacción para poder elegir el idioma de cada lote.

### Buscadores

Puedes conectar Google Search Console y Bing Webmaster. Selecciona la propiedad o sitio correcto después de conectar la cuenta. Estas conexiones permiten analizar oportunidades y, cuando la indexación está activada, enviar artículos a buscadores según la configuración disponible.

### Redes sociales

Desde Configuración puedes vincular los servicios disponibles, como Google Business Profile, Threads, X, LinkedIn e Instagram. Algunas redes pueden requerir que el administrador habilite tu permiso de publicación. Conectar una red no obliga a publicar en ella: sirve para que puedas utilizarla cuando corresponda.

### Personalización del contenido

Puedes elegir tu idioma habitual de redacción, agregar una firma al final de los artículos y guardar teléfono de contacto para los botones de llamada o WhatsApp dentro de tus artículos. También puedes subir tu foto y logo para piezas de redes sociales y definir instrucciones para el estilo de imágenes e infografías.

Consejo: escribe instrucciones de imagen sencillas y concretas; por ejemplo, el estilo visual, colores o tipo de público. Si las dejas vacías, se usa el estilo predeterminado.

## Publicar artículos

Ruta: /dashboard/publicar

Usa Publicar cuando ya tienes los títulos que quieres convertir en artículos.

1. Elige una categoría. Es la sección de tu sitio donde se publicarán los artículos.
2. Elige el idioma del lote. Solo afecta ese lote; no modifica tu configuración general.
3. Escribe un título por línea.
4. Revisa el contador. No puedes superar el máximo de títulos permitido para tu cuenta en un solo lote; divide la lista si es necesario.
5. Deja activada la indexación si quieres que los artículos se consideren para buscadores. Márcala como desactivada solo si no quieres indexar ese lote.
6. Pulsa “Iniciar”.

Solo puede haber una ejecución activa a la vez. Si ya hay una, abre Publicaciones en Curso y espera a que termine antes de iniciar otra.

## Publicaciones en Curso

Ruta: /dashboard/publicaciones-en-curso

Esta pantalla muestra el avance de la ejecución actual. Úsala para saber si los artículos continúan procesándose. Si no hay una ejecución activa, puedes volver a Publicar para iniciar una nueva.

## Oportunidades SEO

Ruta: /dashboard/oportunidades

En este módulo el sistema te propone títulos de artículos. No se los inventa: los deduce de lo que Google ya te está mostrando. Google Search Console guarda lo que escribió la gente en el buscador antes de llegar a tu página, y de ahí salen las propuestas: de búsquedas reales, hechas por personas reales que ya llegaron a tu sitio.

Con eso se arman títulos de cola larga. Es más sencillo de lo que suena: en vez de pelear por una palabra corta y muy disputada como "seguros", donde compites contra empresas enormes, se apunta a la búsqueda larga y concreta de alguien con una duda real, del estilo "cuánto cuesta un seguro dental para mayores de 60 en Miami". Esas búsquedas las hace menos gente, pero casi nadie escribe sobre ellas, así que es mucho más fácil salir de primero, y quien busca así llega más decidido. Cada artículo que se posiciona atrae visitas nuevas, y esas visitas le dan más señales a Google sobre tu sitio. Es un efecto bola de nieve: empieza pequeño y va creciendo solo.

La pantalla está separada en tres pasos.

Paso 1, pide el análisis. Si tienes más de un sitio, eliges para cuál generar oportunidades y pulsas Analizar. Tarda unos minutos y no debes cerrar la página. Si te falta conectar Google Search Console, elegir la propiedad, sincronizar categorías o configurar el idioma, la propia pantalla te lo dice con un enlace directo a donde se arregla.

Paso 2, elige cómo se escribirán. Seleccionas el idioma de los artículos y el estilo de escritura. También puedes desactivar la indexación en buscadores, aunque por defecto queda activada, que es lo normal si quieres que Google los encuentre. Estas opciones solo afectan a lo que publiques desde esta pantalla; no cambian tu configuración general.

Paso 3, revisa y publica. Aparecen las propuestas agrupadas por categoría, con su explicación, impresiones y clics. Puedes eliminar los títulos que no te convenzan, publicar un título suelto, una categoría completa o todas de una vez. Respeta el máximo de títulos por lote: si una categoría lo supera, publícala en partes o elimina títulos antes.

Nada se publica sin que tú lo mandes. Las sugerencias ayudan a decidir, pero la decisión es tuya: revisa que cada título sea adecuado para tu negocio y tu audiencia.

## Oportunidades Redes

**Este módulo está en prueba.** Todavía no está disponible para todas las cuentas: se está activando poco a poco. Si no aparece en tu menú, no es que te falte algo por configurar.

Ruta: /dashboard/oportunidades-redes

Aquí puedes revisar propuestas de contenido para redes sociales. Las propuestas pendientes se pueden aprobar, editar o descartar explicando el motivo. Si algo falla, abre el detalle del error para ver qué ocurrió antes de intentarlo otra vez.

Consejo: edita el texto si necesitas adaptar el tono a tu marca antes de aprobarlo.

## Historial

Ruta: /dashboard/historial

Historial conserva las ejecuciones anteriores y el estado de los títulos. Puedes revisar cuáles se publicaron, cuáles tuvieron error y los mensajes asociados. También muestra información disponible sobre publicaciones en redes e intentos de indexación.

Si un artículo muestra un error, lee el mensaje antes de repetir la acción. Si el problema indica una conexión, revisa primero Configuración.

## Cómo Funciona

Ruta: /dashboard/como-funciona

Explica en texto, sin gráficas, para qué sirve la plataforma y en qué orden ocurre todo.

El objetivo es que te encuentren: en Google, en Bing y dentro de la inteligencia artificial, en tiempo récord.

Explica por qué ya no basta con salir en Google: hoy mucha gente le pregunta directamente a una inteligencia artificial y se queda con esa respuesta, que se construye con lo que la IA encontró indexado. Si tu sitio no está ahí, no aparece en la conversación.

También explica por qué las redes sociales cuentan para el posicionamiento: quien busca en Google es la misma persona que luego abre Instagram o LinkedIn. Por eso el sistema lleva a tus redes los temas que esa gente ya está buscando, y cada visita que vuelve desde ahí refuerza tu posición en el buscador.

Lo explica en tres pasos:

1. **Configura tu cuenta.** Es lo primero y lo único que no se puede saltar. Si no estás seguro de haberlo dejado todo listo, entra en Configuración y revísalo. Si algo no queda claro, la burbuja de ayuda está en la esquina de todas las pantallas.
2. **Publica tus artículos.** Hay dos caminos y puedes usar los dos: publicar tus propios títulos, hasta diez a la vez, o dejar que el sistema decida por ti desde Oportunidades, donde consulta Google Search Console y Bing. Cuando la inteligencia artificial haya decidido, publicas de uno en uno o por lotes.
3. **Lleva lo publicado a las redes.** Desde Oportunidades para Redes Sociales, los artículos más relevantes pasan a tus redes de forma repartida y equilibrada, sin parecer spam.

Cierra explicando para qué sirve todo esto: posicionarte con autoridad en internet. Aparecer en los resultados de la inteligencia artificial, de Google y de Bing es lo más importante que le puede pasar a tu negocio en internet.

## Actualizaciones

Ruta: /dashboard/actualizaciones

Actualizaciones muestra las nuevas herramientas y correcciones explicadas sin tecnicismos. Puedes filtrar entre “Nuevas herramientas” y “Arreglos”. Cuando veas “Ir al módulo”, ese botón te lleva directamente al lugar donde puedes usar o comprobar el cambio.

Esta sección se actualiza con los cambios visibles para usuarios y es parte del conocimiento que usa el asistente de ayuda.

## Guía detallada de Configuración

Ruta: /dashboard/configuracion

Configuración está organizada por pestañas. Si una opción no aparece, puede estar deshabilitada para tu cuenta por el administrador.

### Configuración inicial

Ruta: /dashboard/configuracion?tab=wizard

Puedes repetir el asistente de cuatro pasos cuando quieras: cuenta de la plataforma, categorías, idioma y Google Search Console. Es la forma más rápida de preparar una cuenta nueva.

### Google Search Console

Ruta: /dashboard/configuracion?tab=integrations

1. Pulsa **Conectar Google Search Console** e inicia sesión con la cuenta de Google que tiene acceso a tu sitio.
2. Cuando vuelvas a la plataforma, elige la propiedad verificada correcta en la lista y pulsa **Guardar propiedad**.
3. El sitemap se detecta automáticamente cuando es posible. Si no se encuentra, escribe su URL y guarda la configuración.
4. Puedes pulsar **Enviar sitemap ahora** para un envío inmediato. Después, Auto Artículos lo envía automáticamente cada noche.

Google Search Console permite usar Oportunidades SEO, consultar el estado de indexación y enviar el sitemap. Si no ves tu sitio en la lista, revisa que la misma cuenta de Google sea propietaria o usuaria autorizada de esa propiedad.

### Bing Webmaster Tools

Ruta: /dashboard/configuracion?tab=integrations

Abre Bing Webmaster Tools con tu sesión iniciada, vuelve a Auto Artículos y pulsa **Conectar Bing Webmaster Tools**. Acepta los permisos y elige o guarda el sitio correcto. Si la conexión venció, usa **Reconectar Bing** una sola vez y espera la redirección. Desde esta sección también puedes enviar el sitemap y enviar a Bing los artículos publicados que todavía estén pendientes de indexación.

### Redes sociales

Ruta: /dashboard/configuracion?tab=social

Aquí conectas Google Business Profile, Threads, Instagram, X y LinkedIn. Las redes son opcionales: solo conéctalas si quieres publicar allí. Instagram necesita una cuenta profesional vinculada a una página de Facebook. Algunas redes requieren que el administrador active tu permiso; si ves un aviso de que no está disponible, pide acceso al administrador. Puedes desconectar una red desde el mismo lugar.

### Cuenta y contenido

Ruta: /dashboard/configuracion?tab=platform

Guarda las credenciales de la plataforma, sincroniza categorías e idiomas y elige el idioma habitual. También puedes definir la firma de los artículos, teléfono de contacto, foto de perfil, logo y las instrucciones de estilo para imágenes e infografías. Estos últimos campos son opcionales y se aplican a los contenidos nuevos; no modifican artículos ya publicados.

### Estado de configuración

Inicio muestra una lista de progreso con lo obligatorio y opcional. Para publicar necesitas credenciales de la plataforma, categorías sincronizadas e idioma. Google, Bing y redes sociales amplían lo que puedes hacer, pero no impiden publicar artículos.

## Publicaciones, progreso e historial

### Mientras se publica

Ruta: /dashboard/publicaciones-en-curso

Aquí ves cada lote activo y el estado de cada título. Puedes cancelar el lote completo si ya no deseas continuarlo. Cuando un título muestra un error, usa **Reintentar** solo después de leer el mensaje y corregir la causa, por ejemplo una conexión vencida o una configuración incompleta.

### Historial

Ruta: /dashboard/historial

Historial agrupa las ejecuciones por categoría y conserva los resultados de publicación, errores, reintentos, indexación y redes cuando están disponibles. Puedes borrar el historial terminado si ya no lo necesitas; esa acción no se puede deshacer y no cancela un lote que esté en curso.

## Oportunidades de redes sociales

Ruta: /dashboard/oportunidades-redes

Este módulo propone textos para publicar en las redes que tengas conectadas. Puede usar datos de Google Search Console cuando está conectado; si no, trabaja con artículos recientes. Revisa cada propuesta, edítala si quieres, guarda los cambios y luego apruébala o descártala explicando el motivo. Antes de publicar, puedes revisar una vista previa cuando esté disponible.

## Interfaz y Diseño Estilo Apple

La plataforma cuenta con un diseño minimalista y limpio en blanco impecable, siguiendo los estándares de Apple Human Interface Guidelines (HIG):
- **Tipografía y Legibilidad:** Textos de alto contraste con tipografía nativa San Francisco para una lectura cómoda.
- **Navegación Fluida:** Menú superior tipo cápsula *Segmented Control* en computadoras y selector táctil optimizado en celulares y tabletas.
- **Full Responsivo:** Todas las tablas, formularios y tarjetas se adaptan automáticamente a cualquier tamaño de pantalla sin desbordes.

## Pre-Validación Inteligente antes de Publicar

Tanto en **Publicar** (/dashboard/publicar) como en **Oportunidades SEO** (/dashboard/oportunidades), el sistema cuenta con un panel de protección preventiva (**PreValidationGuard**):
- Si falta algún requisito previo (credenciales de la plataforma, categorías sincronizadas, idioma de redacción o Search Console), la plataforma te muestra una tarjeta clara con un checklist interactivo indicando exactamente qué falta y un botón directo para resolverlo.
- **Créditos de imagen:** Si tu cuenta de la plataforma no cuenta con créditos para generar imágenes de portada e infografías, la plataforma te avisa de inmediato mediante un aviso informativo para que puedas recargarlos.

## Administración

Ruta: /dashboard/usuarios

Solo los administradores tienen acceso a este módulo:
- **Orden alfabético A-Z:** La lista de usuarios se organiza de forma clara y ordenada alfabéticamente por nombre.
- **Filtros por Tipo de Cuenta:** Permite filtrar instantáneamente entre *Todos los tipos*, *Usuarios comunes*, *Administradores* y usuarios en periodo de *Free Trial (Prueba Gratuita)*, combinándose con la barra de búsqueda en tiempo real.
- **Visibilidad de Módulos:** Permite ocultar o activar módulos específicos de forma individual por usuario o de manera global para mantenimiento.

## Problemas frecuentes

### No puedo publicar

Comprueba que tienes categorías sincronizadas, un idioma elegido y que no hay otra ejecución en curso. Revisa también que no superes el máximo de títulos por lote. El panel de pre-validación te indicará qué requisito falta.

### Aviso de falta de créditos de imagen

Si aparece el aviso de créditos de imagen, significa que tu cuenta necesita saldo para ilustrar artículos. Puedes adquirir créditos en la plataforma o consultar a soporte.

### No veo Oportunidades SEO

En Configuración conecta Google Search Console, selecciona una propiedad, sincroniza categorías y guarda un idioma de redacción. Luego vuelve a Oportunidades para analizar.

### No se publica en una red social

Comprueba en Configuración que la cuenta esté conectada. Algunas redes requieren permiso del administrador. Consulta Historial para revisar el detalle del error antes de volver a intentar.

### No aparece un módulo en el menú

El administrador puede ocultar módulos por cuenta o temporalmente para toda la plataforma. Pregunta al administrador si necesitas acceso.

## Cómo debe ayudarte el asistente

El asistente debe explicar los pasos de forma breve y clara, enlazar al módulo cuando tenga una ruta confirmada y no prometer funciones que no figuren en este manual ni en el registro vivo de Actualizaciones. Debe priorizar el registro vivo cuando una novedad cambie una instrucción del manual base. Si no tiene información suficiente, debe decirlo y sugerir contactar al administrador.
`.trim();
