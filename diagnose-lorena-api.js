#!/usr/bin/env node

/**
 * Script de diagnóstico para Lorena Álvarez usando APIs existentes
 * Ejecutar: node diagnose-lorena-api.js
 * 
 * Este script usa las APIs del sistema para diagnosticar el problema
 */

const fetch = require('node-fetch');

async function diagnoseLorenaAPI() {
  console.log('=== DIAGNÓSTICO API: Lorena Álvarez ===\n');
  
  // NOTA: Este script necesitaría un token de sesión válido para funcionar
  // En su lugar,提供 instrucciones manuales para el diagnóstico
  
  console.log('⚠️  IMPORTANTE: Este script requiere acceso a la base de datos');
  console.log('   Para un diagnóstico completo, ejecuta el script SQL directamente\n');
  
  console.log('=== SCRIPT SQL PARA DIAGNÓSTICO ===\n');
  
  const sqlScript = `
-- Diagnóstico completo para Lorena Álvarez (lorenalvarez30@gmail.com)
-- Ejecutar en Supabase SQL Editor

-- 1. Información básica del usuario
SELECT 
  id,
  email,
  name,
  "lastOpportunityAnalysisAt",
  "opportunitiesDisclosureAcceptedAt",
  "monthlyArticleLimit",
  "dailyArticleLimit",
  "maxTitlesPerBatch",
  "contentLanguage"
FROM "User" 
WHERE email = 'lorenalvarez30@gmail.com';

-- 2. Integración de Google Search Console
SELECT 
  si.*,
  u.email
FROM "SearchIntegration" si
JOIN "User" u ON si."userId" = u.id
WHERE u.email = 'lorenalvarez30@gmail.com' 
  AND si.provider = 'google';

-- 3. Categorías del usuario
SELECT 
  c.*,
  u.email
FROM "Category" c
JOIN "User" u ON c."userId" = u.id
WHERE u.email = 'lorenalvarez30@gmail.com'
ORDER BY c.name;

-- 4. Grupos de oportunidades existentes
SELECT 
  og.*,
  c.name as category_name,
  u.email,
  COUNT(ot.id) as titles_count
FROM "OpportunityGroup" og
JOIN "Category" c ON og."categoryId" = c.id
JOIN "User" u ON og."userId" = u.id
LEFT JOIN "OpportunityTitle" ot ON og.id = ot."groupId"
WHERE u.email = 'lorenalvarez30@gmail.com'
GROUP BY og.id, c.name, u.email
ORDER BY og."createdAt" DESC;

-- 5. Artículos publicados recientemente
SELECT 
  t.text,
  t."finalTitle",
  t."articleUrl",
  t.status,
  t."processedAt",
  r.status as run_status,
  u.email
FROM "Title" t
JOIN "Run" r ON t."runId" = r.id
JOIN "User" u ON r."userId" = u.id
WHERE u.email = 'lorenalvarez30@gmail.com'
  AND t.status = 'success'
  AND t."articleUrl" IS NOT NULL
ORDER BY t."processedAt" DESC
LIMIT 10;

-- 6. Corridas recientes
SELECT 
  r.*,
  u.email,
  COUNT(t.id) as total_titles,
  COUNT(CASE WHEN t.status = 'success' THEN 1 END) as success_titles,
  COUNT(CASE WHEN t.status = 'error' THEN 1 END) as error_titles,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_titles
FROM "Run" r
JOIN "User" u ON r."userId" = u.id
LEFT JOIN "Title" t ON r.id = t."runId"
WHERE u.email = 'lorenalvarez30@gmail.com'
GROUP BY r.id, u.email
ORDER BY r."createdAt" DESC
LIMIT 5;

-- 7. Verificar si hay datos en Google Search Console (si tenemos access token)
-- Esto requeriría ejecutarse desde la API, no SQL
`;

  console.log(sqlScript);
  
  console.log('\n=== ANÁLISIS MANUAL REQUERIDO ===\n');
  
  console.log('Después de ejecutar el SQL anterior, verifica:\n');
  
  console.log('1. GOOGLE SEARCH CONSOLE CONECTADO:');
  console.log('   - ¿Tiene el usuario una fila en SearchIntegration con provider="google"?');
  console.log('   - ¿El siteUrl está configurado?');
  console.log('   - ¿El sitemapUrl está configurado?\n');
  
  console.log('2. CATEGORÍAS:');
  console.log('   - ¿Tiene al menos una categoría sincronizada?');
  console.log('   - Si no tiene, necesita sincronizar categorías desde 10minutesWebsite\n');
  
  console.log('3. ÚLTIMO ANÁLISIS:');
  console.log('   - ¿Cuándo fue el último análisis (lastOpportunityAnalysisAt)?');
  console.log('   - Si fue hace menos de 3 días, el enfriamiento está activo\n');
  
  console.log('4. OPORTUNIDADES EXISTENTES:');
  console.log('   - ¿Tiene grupos de oportunidades guardados?');
  console.log('   - Si no tiene, el análisis no ha encontrado oportunidades\n');
  
  console.log('5. ARTÍCULOS PUBLICADOS:');
  console.log('   - ¿Tiene artículos publicados con éxito?');
  console.log('   - Esto indica que la plataforma funciona, pero puede no tener datos suficientes\n');
  
  console.log('=== POSIBLES CAUSAS DEL PROBLEMA ===\n');
  
  console.log('A. Google Search Console no conectado o sin datos:');
  console.log('   - Solución: Conectar Google y esperar a que acumule datos\n');
  
  console.log('B. Datos insuficientes en Search Console:');
  console.log('   - El sitio puede no tener suficiente tráfico orgánico');
  console.log('   - Solución: Integrar Bing Webmaster Tools como fuente adicional\n');
  
  console.log('C. Algoritmo demasiado restrictivo:');
  console.log('   - Las reglas anti-involución pueden estar filtrando demasiado');
  console.log('   - Solución: Revisar y ajustar el prompt de análisis\n');
  
  console.log('D. Enfriamiento activo:');
  console.log('   - Si el último análisis fue hace menos de 3 días, no puede reintentar');
  console.log('   - Solución: Esperar o ajustar el período de enfriamiento\n');
  
  console.log('=== PRÓXIMOS PASOS RECOMENDADOS ===\n');
  
  console.log('1. Ejecutar el script SQL anterior en Supabase');
  console.log('2. Verificar si Google Search Console está conectado correctamente');
  console.log('3. Si no está conectado, ayudar a Lorena a reconnectarlo');
  console.log('4. Si está conectado pero no hay datos, considerar:');
  console.log('   a. Integrar Bing Webmaster Tools (proyecto pendiente)');
  console.log('   b. Ajustar el algoritmo para ser menos restrictivo');
  console.log('   c. Reducir el período de enfriamiento de 3 a 1 día');
  console.log('5. Probar el análisis manualmente con los datos de Lorena');
}

// Ejecutar
diagnoseLorenaAPI()
  .then(() => {
    console.log('\n=== FIN DEL DIAGNÓSTICO ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });