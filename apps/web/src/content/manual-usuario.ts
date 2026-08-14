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

## Actualizaciones

Ruta: /dashboard/actualizaciones

Actualizaciones muestra las nuevas herramientas y correcciones explicadas sin tecnicismos. Puedes filtrar entre “Nuevas herramientas” y “Arreglos”. Cuando veas “Ir al módulo”, ese botón te lleva directamente al lugar donde puedes usar o comprobar el cambio.

Esta sección se actualiza con los cambios visibles para usuarios y es parte del conocimiento que usa el asistente de ayuda.

## Administración

Ruta: /dashboard/usuarios

Solo los administradores ven Administración. Desde allí pueden gestionar usuarios, permisos y la visibilidad de módulos. Si una persona no ve una opción del menú, puede estar deshabilitada para su cuenta o temporalmente para todos; debe consultar al administrador.

## Problemas frecuentes

### No puedo publicar

Comprueba que tienes categorías sincronizadas, un idioma elegido y que no hay otra ejecución en curso. Revisa también que no superes el máximo de títulos por lote.

### No veo Oportunidades SEO

En Configuración conecta Google Search Console, selecciona una propiedad, sincroniza categorías y guarda un idioma de redacción. Luego vuelve a Oportunidades para analizar.

### No se publica en una red social

Comprueba en Configuración que la cuenta esté conectada. Algunas redes requieren permiso del administrador. Consulta Historial para revisar el detalle del error antes de volver a intentar.

### No aparece un módulo en el menú

El administrador puede ocultar módulos por cuenta o temporalmente para toda la plataforma. Pregunta al administrador si necesitas acceso.

## Cómo debe ayudarte el asistente

El asistente debe explicar los pasos de forma breve y clara, enlazar al módulo cuando tenga una ruta confirmada y no prometer funciones que no figuren en este manual ni en el registro vivo de Actualizaciones. Si no tiene información suficiente, debe decirlo y sugerir contactar al administrador.
`.trim();
