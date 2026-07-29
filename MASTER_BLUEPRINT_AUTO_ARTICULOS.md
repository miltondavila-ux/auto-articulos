# Auto Artículos

## Documento maestro del proyecto

Este documento es la fuente de verdad del proyecto **Auto Artículos**. Debe guiar todas las decisiones de diseño, arquitectura y desarrollo. Cualquier cambio de alcance debe reflejarse aquí antes de continuar programando.

## Propósito del documento

Definir con claridad qué es Auto Artículos, para quién es, cómo funciona, qué reglas de negocio y seguridad debe respetar, y qué pasos arquitectónicos deben resolverse antes de escribir una sola línea de código.

## Rol que debe asumir Claude Code

Claude Code debe actuar como **arquitecto de software y CTO** del proyecto, no como un simple generador de código. Su primera responsabilidad es diseñar la arquitectura completa, identificar riesgos técnicos (especialmente los relacionados con automatización de navegador y credenciales de terceros) y proponer mejoras, antes de construir nada.

## Filosofía del producto

Eliminar el trabajo manual y repetitivo de operar una plataforma externa (10minutesWebsite) botón por botón para publicar artículos. El usuario solo debe aportar una lista de títulos; el sistema se encarga de todo lo demás, de forma desatendida, segura y confiable.

## Visión

Que cualquier persona, sin conocimientos técnicos, pueda pegar una lista de títulos de artículos y ver cómo se publican automáticamente en su página web, uno a uno, sin tener que operar manualmente ninguna herramienta.

## Misión

Automatizar el flujo completo entre "tengo una lista de títulos" y "los artículos están publicados en mi web", usando la plataforma de generación de contenido 10minutesWebsite como motor de creación y publicación.

## Objetivo principal

Construir una aplicación web en la nube, accesible desde cualquier navegador, que:
1. Reciba una lista de títulos pegados por el usuario (un título por línea).
2. Procese los títulos **uno a la vez** (no en paralelo).
3. Para cada título, automatice la interacción con 10minutesWebsite (login + creación + publicación) usando las credenciales del usuario.
4. Publique el artículo resultante automáticamente, **sin revisión humana previa**.
5. Registre el resultado de cada título en un historial.

## Principios del producto

- Un título entra a un proceso de creación único e irrepetible: nunca se debe reprocesar el mismo título dos veces dentro de la misma ejecución.
- Procesamiento estrictamente secuencial: un título a la vez, nunca en paralelo.
- Resiliencia controlada: reintentar automáticamente ante fallos, pero con un límite claro (3 intentos) y luego detenerse.
- Las credenciales de terceros (10minutesWebsite) son datos sensibles y deben tratarse como tales: cifradas, nunca expuestas, nunca en texto plano.
- Diseño multi-tenant desde el inicio, aunque la Fase 0 se use de forma interna: los datos de un usuario nunca deben ser visibles ni accesibles por otro.
- No se promete revisión ni control de calidad editorial: la automatización asume que el usuario acepta publicar sin revisión.

## Tipo de producto

Aplicación web SaaS, multi-tenant, en la nube, accesible desde cualquier navegador de cualquier persona (no una extensión de navegador ni una app de escritorio).

- **Fase 0 / MVP**: uso interno, un solo usuario (el creador del proyecto y su equipo).
- **Fase 1 en adelante**: apertura a múltiples usuarios externos, cada uno con su propia cuenta, sus propias credenciales de 10minutesWebsite y sus propios datos, completamente aislados entre sí.

## Usuarios y permisos

- **Fase 0**: un único usuario administrador (el creador), sin necesidad de sistema de roles complejo.
- **Fase 1+ (multiusuario)**:
  - Cada usuario tiene su propia cuenta (login).
  - Cada usuario conecta y guarda **sus propias** credenciales de 10minutesWebsite.
  - Cada usuario ve únicamente su propia caja de títulos, su propio historial y sus propios errores.
  - No existe (por ahora) un rol de "supervisor" que vea artículos o credenciales de otros usuarios.

## Flujo general

1. El usuario inicia sesión en la aplicación web.
2. El usuario configura (una sola vez, o cuando cambien) sus credenciales de acceso a 10minutesWebsite.
3. El usuario pega en una caja de texto la lista de títulos de artículos que quiere generar (un título por línea — un "volcado" masivo).
4. El usuario presiona el botón **Iniciar**.
5. El sistema toma el primer título de la lista y, mediante automatización de navegador controlada por el servidor, inicia sesión en 10minutesWebsite con las credenciales del usuario, ingresa el título y ejecuta el proceso de creación y publicación del artículo.
6. Si el proceso falla (error de conexión, error de la plataforma, etc.), el sistema **reintenta desde el inicio el mismo título**, hasta un máximo de **3 intentos**.
7. Si al tercer intento sigue fallando, el sistema **detiene por completo la ejecución** de toda la lista y muestra un mensaje de error claro en la misma interfaz de configuración/ejecución.
8. Si el título se procesa con éxito, el sistema registra en el historial: título, fecha/hora, estado (éxito) y, si está disponible, el enlace al artículo publicado. Luego continúa automáticamente con el siguiente título.
9. El proceso se repite hasta agotar todos los títulos de la lista, o hasta detenerse por un error tras 3 intentos.

## Fase 0 obligatoria antes de programar

Antes de escribir una sola línea de código, Claude Code debe entregar para aprobación:

- Arquitectura completa (frontend, backend, orquestador de cola, motor de automatización).
- Stack tecnológico propuesto y justificado.
- Modelo de datos (usuarios, credenciales cifradas, historial, estado de ejecución).
- Flujos de usuario detallados (incluyendo casos de error).
- Mapa de navegación de la interfaz.
- Estructura de carpetas del proyecto.
- Roadmap por fases.
- Riesgos técnicos, en especial:
  - Investigación de si **10minutesWebsite tiene una API o MCP oficial** utilizable en lugar de automatización de navegador (más robusto y menos frágil que simular clics).
  - Riesgos legales/de términos de servicio de automatizar una plataforma de terceros con credenciales de usuario.
  - Estrategia de cifrado y gestión segura de credenciales de terceros.
- Propuestas de mejora sobre este blueprint si Claude Code identifica huecos.

**No deberá escribirse una sola línea de código hasta que esta fase haya sido revisada y aprobada.**

## Arquitectura funcional

- **Frontend (dashboard web)**: pantalla de login, formulario de credenciales de 10minutesWebsite, caja de texto para pegar títulos, botón "Iniciar", vista de estado en vivo del procesamiento, historial de artículos procesados, mensajes de error.
- **Backend / orquestador**: cola de procesamiento secuencial (un título a la vez), lógica de reintentos (3 intentos, luego detener), gestor de credenciales cifradas por usuario, registro de historial por usuario.
- **Motor de automatización**: componente encargado de operar 10minutesWebsite en nombre del usuario (idealmente vía API/MCP oficial si existe; si no, vía automatización de navegador server-side tipo Playwright/Puppeteer).
- **Nota para Claude Code**: se deja abierta la decisión de stack exacto (lenguaje, framework, base de datos), pero la aplicación debe ser 100% web, accesible desde cualquier navegador, sin depender de una extensión instalada en el navegador del usuario final.

## Módulos principales

1. **Autenticación y cuentas de usuario** (multi-tenant desde el diseño).
2. **Gestión de credenciales de 10minutesWebsite**: guardado cifrado, por usuario, con posibilidad de actualizarlas.
3. **Ingesta de títulos**: caja de texto de volcado masivo, parseo línea por línea.
4. **Motor de automatización de 10minutesWebsite**: login + creación + publicación del artículo por título.
5. **Orquestador de cola**: procesamiento secuencial, control de reintentos, detención ante fallo persistente.
6. **Historial y logs**: por usuario, con título, fecha, estado y enlace si aplica.
7. **Notificaciones de error**: visibles directamente en la interfaz de configuración/ejecución (no email, no WhatsApp, no Slack).

## Integraciones

- **10minutesWebsite**: plataforma externa de generación y publicación de artículos, protegida por autenticación. Se sospecha que expone un MCP; **debe confirmarse en Fase 0** si existe una API/MCP oficial utilizable, en vez de depender de automatización de navegador (más frágil ante cambios de interfaz).
- No hay integración con Google Drive ni Google Sheets (descartada explícitamente durante el diseño: se reemplazó por una caja de texto de pegado directo).

## Motor de IA o automatización

El propio Auto Artículos **no genera el contenido del artículo**. La generación de texto y su publicación es responsabilidad exclusiva de 10minutesWebsite (plataforma externa con su propio motor de IA). Auto Artículos solo automatiza la orquestación: toma cada título y se lo entrega a 10minutesWebsite, esperando y verificando el resultado.

## Reglas de negocio

- Publicación automática, sin revisión humana previa, en todos los casos.
- Procesamiento estrictamente secuencial: un título a la vez.
- Cada título se procesa una única vez por ejecución (no hay reprocesamiento de duplicados dentro de la misma corrida).
- Ante fallo de un título: reintentar automáticamente hasta 3 veces (desde el inicio del proceso de ese título).
- Al tercer fallo consecutivo: detener toda la ejecución restante y notificar con un mensaje de error visible en la interfaz.
- Aislamiento total de datos, credenciales e historial entre usuarios distintos (multi-tenant).

## Seguridad y privacidad

- Las credenciales de 10minutesWebsite deben almacenarse **cifradas en reposo**, nunca en texto plano, ni en logs.
- Toda la aplicación debe operar sobre HTTPS.
- Ningún usuario debe poder ver, listar ni inferir datos, títulos, historial o credenciales de otro usuario.
- Debe evaluarse en Fase 0 si automatizar 10minutesWebsite mediante control de navegador con credenciales de terceros respeta sus términos de servicio.
- Debe existir un plan claro de qué hacer si las credenciales guardadas dejan de ser válidas (por ejemplo, detener la ejecución y notificar, igual que un fallo técnico).

## Historial, logs y recuperación

- Por usuario, debe quedar un historial con: título procesado, fecha/hora, estado (éxito o error) y enlace al artículo publicado si está disponible.
- Si la ejecución se detiene por error tras 3 intentos, el historial debe dejar claro qué títulos ya se procesaron con éxito y cuál fue el título que falló, para que el usuario pueda decidir cómo continuar (por ejemplo, reiniciar la ejecución desde el título siguiente).

## Dashboard o interfaz

Una sola interfaz de configuración y ejecución, con:
- Formulario para guardar/actualizar credenciales de 10minutesWebsite.
- Caja de texto para pegar la lista de títulos.
- Botón **Iniciar**.
- Vista de estado en vivo del título que se está procesando actualmente.
- Historial de títulos procesados (título, fecha, estado, enlace).
- Mensajes de error visibles en la misma pantalla cuando el proceso se detiene.

## Roadmap sugerido

- **Fase 0 — Arquitectura y validación técnica**: confirmar si 10minutesWebsite tiene API/MCP oficial o si se requiere automatización de navegador; diseñar modelo de datos, seguridad de credenciales y estructura del proyecto.
- **Fase 1 — MVP interno (un solo usuario)**: flujo completo funcionando de principio a fin para el creador del proyecto: pegar títulos → procesar uno a uno → publicar en 10minutesWebsite → ver historial y errores.
- **Fase 2 — Multi-tenant**: sistema de cuentas, login, aislamiento de credenciales e historial por usuario, apertura a usuarios externos.
- **Fase 3 — Mejoras**: a definir según uso real (por ejemplo, métricas de uso, reintentos configurables, mejoras de UX del historial).

## Riesgos y mitigaciones

- **Riesgo**: 10minutesWebsite no tenga una API estable y se dependa de automatización de navegador, frágil ante cualquier cambio de su interfaz. **Mitigación**: investigar y priorizar en Fase 0 el uso de una API/MCP oficial si existe.
- **Riesgo**: publicar automáticamente sin ningún tipo de revisión puede generar contenido no deseado de forma pública e irreversible. **Mitigación**: el usuario asume esta decisión conscientemente; queda documentado que no hay paso de revisión por diseño explícito.
- **Riesgo**: los términos de servicio de 10minutesWebsite podrían prohibir la automatización por terceros de su plataforma. **Mitigación**: validar esto antes de construir el motor de automatización.
- **Riesgo**: almacenar credenciales de una plataforma externa es sensible; una brecha de seguridad expondría las cuentas de 10minutesWebsite de todos los usuarios. **Mitigación**: cifrado fuerte en reposo, buenas prácticas de gestión de secretos, nunca loguear credenciales.

## Criterios de aceptación

- El usuario puede pegar una lista de títulos y presionar "Iniciar" sin ninguna otra acción manual.
- El sistema procesa los títulos uno a uno, de forma secuencial y automática.
- Cada título resulta en un artículo generado y publicado en la web del usuario a través de 10minutesWebsite, sin revisión previa.
- Ante un fallo, el sistema reintenta automáticamente hasta 3 veces antes de detener la ejecución y mostrar un error claro en la interfaz.
- El historial muestra correctamente los títulos ya procesados, su estado y el enlace al artículo cuando esté disponible.
- (Fase 2) Cada usuario opera de forma aislada: sus propias credenciales, su propia lista de títulos y su propio historial, sin acceso a los de otros usuarios.

## Instrucciones finales antes de escribir código

Claude Code debe presentar primero la Fase 0 completa (arquitectura, stack, modelo de datos, riesgos, estructura de carpetas y roadmap) para revisión y aprobación explícita del usuario. **No deberá escribirse una sola línea de código hasta que esta fase haya sido revisada y aprobada.**
