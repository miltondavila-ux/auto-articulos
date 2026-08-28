-- Semilla de las 8 cajas del pipeline (placeholders — Milton perfecciona
-- cada prompt desde el panel de administración, no se editan aquí).
-- No es parte de migration.sql a propósito: Prisma re-ejecutaría esto en
-- cada "migrate deploy" si estuviera ahí. Se corre UNA sola vez, a mano.
INSERT INTO "PromptBox" ("id", "slug", "name", "description", "systemPrompt", "executionOrder", "isActive", "inputSchema", "outputSchema", "createdAt", "updatedAt") VALUES
('pb_content_analyst', 'content-analyst', 'Analista de Contenido',
 'Recibe la información original de la publicación y determina la idea principal, público, necesidad, beneficio, emoción y gancho. Crea varias alternativas de texto corto para la imagen (pregunta, beneficio, curiosidad, aspiración, problema, solución, frase editorial).',
 '[Placeholder — pendiente de escribir. Caja 1 de 8, especificación de Milton del 20/8/2026.]',
 1, true,
 'Título del artículo, contenido, descripción, red social, formato, información adicional.',
 'JSON: { "idea_principal", "publico", "emocion", "beneficio", "gancho", "textos_posibles": [] }',
 now(), now()),

('pb_creative_director', 'creative-director', 'Director Creativo',
 'Toma el análisis de la Caja 1 y decide el modelo conceptual (premiumeditorial, magazinecover, minimalimpact, questionhook, benefitstack, cinematicstory, luxurylifestyle, boldstatement, splitstory, dataimpact, newseditorial, brandposter), el tratamiento visual y la dirección general — evitando repetir el estilo de publicaciones recientes.',
 '[Placeholder — pendiente de escribir. Caja 2 de 8, especificación de Milton del 20/8/2026.]',
 2, true,
 'Salida de Caja 1, imagen OG, logo del usuario, información de marca, red social, formato.',
 'JSON: { "modelo_conceptual", "tratamiento": [], "sensacion", "uso_fotografia", "nivel_texto" }',
 now(), now()),

('pb_composition_designer', 'composition-designer', 'Diseñador de Composición',
 'Decide dónde y cómo se coloca cada elemento visual: posición del texto y del logo, tamaño relativo de la fotografía, espacio negativo, jerarquía, cantidad de texto, máximo de líneas, márgenes de seguridad.',
 '[Placeholder — pendiente de escribir. Caja 3 de 8, especificación de Milton del 20/8/2026.]',
 3, true,
 'Salida de Caja 1, salida de Caja 2, dimensiones de la red social, imagen OG, logo.',
 'JSON: { "composicion", "headline_position", "logo_position", "safe_margin", "max_headline_lines", "photo_usage", "negative_space" }',
 now(), now()),

('pb_visual_text_editor', 'visual-text-editor', 'Editor de Texto Visual',
 'Selecciona o perfecciona el texto exacto (titular, subtítulo, microtexto) que aparecerá dentro de la imagen: corto, coherente, natural, sin frases genéricas ni titulares gigantes.',
 '[Placeholder — pendiente de escribir. Caja 4 de 8, especificación de Milton del 20/8/2026.]',
 4, true,
 'Alternativas de texto de Caja 1, concepto de Caja 2, composición de Caja 3.',
 'JSON: { "headline", "subheadline", "headline_lines", "text_density" }',
 now(), now()),

('pb_visual_prompt_builder', 'visual-prompt-builder', 'Constructor del Prompt Visual',
 'Combina todas las decisiones anteriores (formato, modelo conceptual, tratamiento, composición, texto exacto, posición, logo, márgenes) en una única instrucción final, clara y completa, para el generador de imágenes — incluyendo las reglas inviolables (logo real obligatorio, texto nunca cortado, sin titulares gigantes).',
 '[Placeholder — pendiente de escribir. Caja 5 de 8, especificación de Milton del 20/8/2026.]',
 5, true,
 'Salidas de las Cajas 1 a 4, imagen OG, logo, formato, dimensiones.',
 'Un único prompt final en texto, listo para enviarse al generador de imagen.',
 now(), now()),

('pb_image_generator', 'image-generator', 'Generador de Imagen',
 'Envía el prompt final de la Caja 5 al modelo de generación de imágenes y guarda el resultado. No vuelve a razonar sobre el contenido, solo ejecuta — la arquitectura debe permitir cambiar de proveedor (OpenAI, Gemini, Flux, Ideogram, etc.) sin tocar las cajas anteriores.',
 '[Placeholder — pendiente de escribir/conectar. Caja 6 de 8, especificación de Milton del 20/8/2026.]',
 6, true,
 'Prompt final de Caja 5, imagen OG, logo.',
 'Imagen generada, prompt utilizado, fecha, modelo utilizado, identificador de generación.',
 now(), now()),

('pb_quality_inspector', 'quality-inspector', 'Inspector de Calidad',
 'Analiza la imagen final y determina si cumple las reglas: texto completo/legible/no gigante, logo presente/completo/sin texto encima, composición balanceada y profesional, impacto visual suficiente.',
 '[Placeholder — pendiente de escribir. Caja 7 de 8, especificación de Milton del 20/8/2026.]',
 7, true,
 'Imagen generada, texto esperado, logo esperado, composición esperada, reglas visuales.',
 'JSON: { "status": "approved"|"rejected", "score": 0-100, "problems": [], "corrections": [] }',
 now(), now()),

('pb_auto_corrector', 'auto-corrector', 'Corrector Automático',
 'Si la Caja 7 rechaza la imagen, usa sus observaciones para construir una nueva instrucción que modifica solo lo necesario (tamaño de titular, posición, salto de línea, contraste, espacio del logo) y la reenvía a la Caja 6. Límite configurable de reintentos (MAX_RETRIES = 2 por ahora) para evitar loops infinitos.',
 '[Placeholder — pendiente de escribir. Caja 8 de 8, especificación de Milton del 20/8/2026.]',
 8, true,
 'Prompt anterior, imagen rechazada, problemas encontrados, correcciones propuestas (salida de Caja 7).',
 'Nuevo prompt corregido que vuelve a enviarse a la Caja 6.',
 now(), now());
