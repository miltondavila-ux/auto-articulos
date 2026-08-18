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

1. **Paso 1 (Cuenta de 10minutesWebsite):** Guarda tu usuario y contraseña de 10minutesWebsite. Si no recuerdas esa clave, puedes restablecerla o crear una nueva en segundos desde el enlace directo de recuperación de 10minutesWebsite incluido en el asistente.
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
- Desde el menú superior tienes acceso a: Publicar, Publicaciones en Curso, Oportunidades, Oportunidades Redes, Historial, Configuración y Actualizaciones.

## Configuración

Ruta: /dashboard/configuracion

Aquí preparas tu cuenta y personalizas el contenido.

### 🚀 Configuración Inicial (Asistente Paso a Paso)

Pestaña destacada en Configuración que te permite repasar o completar el asistente de 4 pasos en cualquier momento. Cuenta con un banner superior para abrirlo directamente.

### Cuenta de 10minutesWebsite

Guarda el usuario y contraseña de tu cuenta de 10minutesWebsite. La plataforma los usa para publicar artículos en tu sitio. Si no recuerdas esa contraseña, usa el enlace de recuperación de 10minutesWebsite; no uses aquí la contraseña de Auto Artículos.

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

Oportunidades analiza datos de Google Search Console para sugerir temas y títulos relacionados con lo que busca tu audiencia.

Antes de usarlo debes conectar Google Search Console, elegir una propiedad, sincronizar categorías y configurar un idioma de redacción. Ejecuta el análisis y espera a que termine sin cerrar la página. El sistema agrupa sugerencias por categoría y muestra una explicación de cada oportunidad, impresiones y clics cuando están disponibles.

Puedes ejecutar una categoría completa o un título individual. También puedes eliminar sugerencias que no quieras usar. Respeta el máximo de títulos por lote: si una categoría lo supera, publícala en partes o elimina títulos antes de ejecutar.

Las sugerencias ayudan a decidir, pero tú decides qué publicar. Revisa que cada título sea adecuado para tu negocio y audiencia.

## Oportunidades Redes

Ruta: /dashboard/oportunidades-redes

Aquí puedes revisar propuestas de contenido para redes sociales. Las propuestas pendientes se pueden aprobar, editar o descartar explicando el motivo. Si algo falla, abre el detalle del error para ver qué ocurrió antes de intentarlo otra vez.

Consejo: edita el texto si necesitas adaptar el tono a tu marca antes de aprobarlo.

## Historial

Ruta: /dashboard/historial

Historial conserva las ejecuciones anteriores y el estado de los títulos. Puedes revisar cuáles se publicaron, cuáles tuvieron error y los mensajes asociados. También muestra información disponible sobre publicaciones en redes e intentos de indexación.

Si un artículo muestra un error, lee el mensaje antes de repetir la acción. Si el problema indica una conexión, revisa primero Configuración.

## Cómo Funciona

Ruta: /dashboard/como-funciona

Muestra una explicación visual e infografía interactiva de la automatización del sistema. Te enseña cómo Auto Artículos captura consultas reales en Google Search Console y Bing para luego alimentar dos flujos paralelos: la generación automática y secuencial de artículos en tu blog web, y la creación de propuestas borradores de contenido para tus redes sociales (LinkedIn, X, Threads, etc.).

## Actualizaciones

Ruta: /dashboard/actualizaciones

Actualizaciones muestra las nuevas herramientas y correcciones explicadas sin tecnicismos. Puedes filtrar entre “Nuevas herramientas” y “Arreglos”. Cuando veas “Ir al módulo”, ese botón te lleva directamente al lugar donde puedes usar o comprobar el cambio.

Esta sección se actualiza con los cambios visibles para usuarios y es parte del conocimiento que usa el asistente de ayuda.

## Guía detallada de Configuración

Ruta: /dashboard/configuracion

Configuración está organizada por pestañas. Si una opción no aparece, puede estar deshabilitada para tu cuenta por el administrador.

### Configuración inicial

Ruta: /dashboard/configuracion?tab=wizard

Puedes repetir el asistente de cuatro pasos cuando quieras: cuenta de 10minutesWebsite, categorías, idioma y Google Search Console. Es la forma más rápida de preparar una cuenta nueva.

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

Guarda las credenciales de 10minutesWebsite, sincroniza categorías e idiomas y elige el idioma habitual. También puedes definir la firma de los artículos, teléfono de contacto, foto de perfil, logo y las instrucciones de estilo para imágenes e infografías. Estos últimos campos son opcionales y se aplican a los contenidos nuevos; no modifican artículos ya publicados.

### Estado de configuración

Inicio muestra una lista de progreso con lo obligatorio y opcional. Para publicar necesitas credenciales de 10minutesWebsite, categorías sincronizadas e idioma. Google, Bing y redes sociales amplían lo que puedes hacer, pero no impiden publicar artículos.

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
- Si falta algún requisito previo (credenciales de 10minutesWebsite, categorías sincronizadas, idioma de redacción o Search Console), la plataforma te muestra una tarjeta clara con un checklist interactivo indicando exactamente qué falta y un botón directo para resolverlo.
- **Créditos de imagen:** Si tu cuenta de 10minutesWebsite no cuenta con créditos para generar imágenes de portada e infografías, la plataforma te avisa de inmediato mediante un aviso informativo para que puedas recargarlos.

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

Si aparece el aviso de créditos de imagen, significa que tu cuenta de 10minutesWebsite necesita saldo para ilustrar artículos. Puedes adquirir créditos en 10minutesWebsite o consultar a soporte.

### No veo Oportunidades SEO

En Configuración conecta Google Search Console, selecciona una propiedad, sincroniza categorías y guarda un idioma de redacción. Luego vuelve a Oportunidades para analizar.

### No se publica en una red social

Comprueba en Configuración que la cuenta esté conectada. Algunas redes requieren permiso del administrador. Consulta Historial para revisar el detalle del error antes de volver a intentar.

### No aparece un módulo en el menú

El administrador puede ocultar módulos por cuenta o temporalmente para toda la plataforma. Pregunta al administrador si necesitas acceso.

## Cómo debe ayudarte el asistente

El asistente debe explicar los pasos de forma breve y clara, enlazar al módulo cuando tenga una ruta confirmada y no prometer funciones que no figuren en este manual ni en el registro vivo de Actualizaciones. Debe priorizar el registro vivo cuando una novedad cambie una instrucción del manual base. Si no tiene información suficiente, debe decirlo y sugerir contactar al administrador.
`.trim();
