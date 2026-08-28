# Especificación: imágenes fieles al artículo en Oportunidades Redes

**Estado:** propuesta de implementación; este documento no cambia el comportamiento de producción.

## Decisión de producto

Cada oportunidad social debe reutilizar la imagen destacada pública del artículo
de origen (`og:image`). La red social debe difundir el artículo real, no una
ilustración nueva creada a partir de un resumen. Si la plataforma necesita otra
proporción, se adapta la misma imagen mediante recorte/redimensionado, sin
generar una imagen con IA.

La vista previa debe mostrar exactamente la imagen que el worker usaría al
publicar. Nunca debe mostrar una imagen de IA que luego no corresponde a la
publicación final.

## Problema actual

El selector de oportunidades usa artículos publicados como origen, pero el
tratamiento de imagen varía por red:

| Destino | Comportamiento actual | Resultado deseado |
| --- | --- | --- |
| Threads | Genera imagen IA desde el resumen | `og:image` del artículo, adaptada si hace falta |
| X | Genera imagen IA desde el resumen | `og:image` del artículo, adaptada si hace falta |
| LinkedIn | Lee `og:image` y la adapta a 4:3 | Conservar |
| Facebook Pages | Lee `og:image` y la adapta a 4:3 | Conservar |
| Instagram Story | Lee `og:image` y la adapta a 9:16 | Conservar |
| Instagram Reel-image | Lee `og:image` y la adapta a 9:16 | Conservar |
| Instagram carrusel/infografía | Genera imágenes IA | Fuera de esta corrección; requiere una decisión de producto separada |
| Vista previa | Genera imagen IA efímera desde el título | Mostrar la imagen real del artículo |

Esto hoy produce una incoherencia: el usuario revisa una creatividad IA, pero
LinkedIn/Facebook/Stories publican otra imagen; Threads/X publican la creativa
IA. Además, se pierde la relación visual directa entre publicación, enlace y
artículo de origen.

## Principios que debe cumplir la corrección

1. **Una fuente visual:** `og:image` del artículo publicado es la fuente
   canónica para oportunidades sociales.
2. **Fidelidad de previsualización:** la UI muestra la misma fuente que usará
   el worker; no se llama a OpenAI para previsualizar.
3. **Sin inventar sustitutos silenciosos:** si no existe `og:image`, la
   oportunidad se marca como "imagen no disponible" y se permite publicar solo
   como enlace/texto únicamente cuando la red lo admita y el usuario lo acepte.
4. **Adaptación no generación:** recortar, redimensionar y normalizar son
   válidos; crear una ilustración IA distinta no lo es.
5. **Trazabilidad:** el resultado y cualquier fallo deben quedar visibles en
   el estado de la oportunidad y en el evento del artículo.

## Alcance de la futura implementación

### 1. Utilidad común de imagen de artículo

Extraer o reutilizar una única utilidad que:

- descargue la página del artículo con timeout;
- lea `meta[property="og:image"]` sin importar el orden de atributos;
- resuelva URLs relativas contra la URL final tras redirecciones;
- compruebe que la imagen es descargable;
- entregue la URL original o una versión normalizada para la proporción pedida.

La utilidad actual `getArticleOpenGraphImage` en el worker es la base. La ruta
de preview deberá usar la misma regla, no `generateSocialImageRaw`.

### 2. Worker de publicación

- Sustituir en Threads y X la generación `generateSocialImageRaw` por la
  recuperación de `og:image`.
- Mantener el flujo actual de LinkedIn, Facebook Pages, Story y Reel-image,
  centralizándolo en la misma utilidad.
- Para Threads/X, si no hay imagen, publicar texto+enlace según soporte de la
  plataforma y registrar claramente "publicado sin imagen del artículo".

### 3. Vista previa

La ruta de preview recibirá el `titleId` o la URL del artículo, no un resumen
o título para crear una imagen. Devolverá:

- `imageUrl`: URL del `og:image` o de su adaptación;
- `imageUnavailable: true` y un motivo legible si no se encuentra;
- la proporción aplicada según la plataforma.

No debe consumir créditos ni llamar a OpenAI.

### 4. Interfaz

- Etiqueta visible: "Imagen del artículo".
- Si falta: aviso claro antes de publicar, no una miniatura falsa.
- La acción "Vista previa" no debe producir activos nuevos en Vercel Blob salvo
  que la adaptación de tamaño se materialice; idealmente, la adaptación se
  hace solo en el worker de publicación.

## Criterios de aceptación

1. Una oportunidad de Threads para un artículo con `og:image` publica esa
   imagen, no una creada por IA.
2. X se comporta igual que Threads.
3. La preview de Threads/X/LinkedIn/Facebook/Story/Reel muestra la misma imagen
   fuente que el worker seleccionará.
4. La preview no realiza llamadas a OpenAI ni genera cobros de imagen.
5. Un artículo sin `og:image` muestra un estado explícito y no falla en silencio.
6. Las redes que ya usaban `og:image` mantienen su comportamiento y pruebas.
7. Los eventos del artículo indican si se publicó con imagen del artículo o sin
   imagen por indisponibilidad.

## Fuera de alcance

- Cambiar los formatos de carrusel e infografía de Instagram.
- Rediseñar los prompts de copy social.
- Corregir la repetición de oportunidades por artículo/red. Es una corrección
  relacionada, pero independiente, que merece su propia especificación y una
  restricción de unicidad/historial.
- Migraciones, despliegue o publicación de prueba.

## Archivos previsiblemente afectados al implementar

- `apps/worker/src/socialPublish.ts`
- `apps/web/src/app/api/social-opportunities/preview/route.ts`
- `apps/web/src/app/dashboard/oportunidades-redes/page.tsx`
- una utilidad compartida nueva o existente para obtener/adaptar `og:image`

No se prevé una migración de base de datos para el alcance inicial.

## Riesgos y decisiones pendientes

1. **Sin `og:image`:** recomendación inicial: permitir texto+enlace en
   Threads/X, y requerir confirmación visible del usuario. Para redes visuales
   que lo exijan, bloquear y explicar cómo corregir la imagen destacada del
   artículo.
2. **Recorte 9:16:** preservar el centro como comportamiento inicial, pero
   ofrecer una futura selección manual del encuadre si la experiencia lo exige.
3. **Imagen privada o bloqueada:** tratarla como inexistente; nunca ocultar el
   motivo tras una imagen IA alternativa.

## Verificación futura

- Pruebas unitarias de extracción de `og:image` (atributos en ambos órdenes,
  URL relativa, redirección, ausencia y URL no descargable).
- Pruebas de rutas de preview sin mock de OpenAI.
- Pruebas de selección de imagen por plataforma.
- Prueba manual controlada con un artículo que tenga imagen destacada y otro
  que no la tenga.
- Typecheck y build del worker/web antes de cualquier despliegue coordinado.
