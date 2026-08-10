#!/usr/bin/env node

/**
 * Script de diagnóstico para la cuenta de Lorena Álvarez
 * Ejecutar: node diagnose-lorena.js
 * 
 * Requiere: DATABASE_URL en .env.local o variables de entorno
 */

const { PrismaClient } = require('@prisma/client');

async function diagnoseLorena() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== DIAGNÓSTICO: Lorena Álvarez ===\n');
    
    // 1. Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: 'lorenalvarez30@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        lastOpportunityAnalysisAt: true,
        opportunitiesDisclosureAcceptedAt: true,
        monthlyArticleLimit: true,
        dailyArticleLimit: true,
        maxTitlesPerBatch: true,
        contentLanguage: true,
      }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.name || 'No especificado'}`);
    console.log(`   Último análisis: ${user.lastOpportunityAnalysisAt || 'Nunca'}`);
    console.log(`   Disclosure aceptado: ${user.opportunitiesDisclosureAcceptedAt || 'No'}`);
    console.log(`   Límite mensual: ${user.monthlyArticleLimit}`);
    console.log(`   Límite diario: ${user.dailyArticleLimit}`);
    console.log(`   Máximo por lote: ${user.maxTitlesPerBatch}`);
    console.log(`   Idioma contenido: ${user.contentLanguage}\n`);
    
    // 2. Verificar integración Google Search Console
    const googleIntegration = await prisma.searchIntegration.findUnique({
      where: { 
        userId_provider: { 
          userId: user.id, 
          provider: 'google' 
        } 
      },
      select: {
        id: true,
        siteUrl: true,
        sitemapUrl: true,
        permissionLevel: true,
        lastSitemapSyncAt: true,
        lastSitemapSyncStatus: true,
        lastSitemapSyncError: true,
      }
    });
    
    console.log('=== GOOGLE SEARCH CONSOLE ===');
    if (!googleIntegration) {
      console.log('❌ No tiene Google Search Console conectado');
      console.log('   → Esto bloquea completamente la generación de oportunidades');
      return;
    }
    
    console.log('✅ Google Search Console conectado:');
    console.log(`   Site URL: ${googleIntegration.siteUrl || 'No configurado'}`);
    console.log(`   Sitemap URL: ${googleIntegration.sitemapUrl || 'No configurado'}`);
    console.log(`   Nivel permiso: ${googleIntegration.permissionLevel || 'No especificado'}`);
    console.log(`   Último sync sitemap: ${googleIntegration.lastSitemapSyncAt || 'Nunca'}`);
    console.log(`   Estado sync: ${googleIntegration.lastSitemapSyncStatus || 'No disponible'}`);
    if (googleIntegration.lastSitemapSyncError) {
      console.log(`   Error sync: ${googleIntegration.lastSitemapSyncError}`);
    }
    console.log('');
    
    // 3. Verificar categorías
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, externalId: true }
    });
    
    console.log('=== CATEGORÍAS ===');
    if (categories.length === 0) {
      console.log('❌ No tiene categorías sincronizadas');
      console.log('   → Esto bloquea la generación de oportunidades');
      return;
    }
    
    console.log(`✅ ${categories.length} categorías encontradas:`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat.externalId})`);
    });
    console.log('');
    
    // 4. Verificar oportunidades existentes
    const opportunityGroups = await prisma.opportunityGroup.findMany({
      where: { userId: user.id },
      include: { 
        category: true,
        titles: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('=== OPORTUNIDADES EXISTENTES ===');
    if (opportunityGroups.length === 0) {
      console.log('⚠️  No tiene grupos de oportunidades guardados');
      console.log('   Esto puede significar:');
      console.log('   1. Nunca ha ejecutado el análisis');
      console.log('   2. El análisis no encontró oportunidades');
      console.log('   3. Las oportunidades fueron eliminadas');
    } else {
      console.log(`✅ ${opportunityGroups.length} grupos de oportunidades:`);
      opportunityGroups.forEach(group => {
        console.log(`   - ${group.category.name}: ${group.titles.length} títulos`);
        console.log(`     Impresiones: ${group.impressions}, Clics: ${group.clicks}`);
        console.log(`     Creado: ${group.createdAt}`);
      });
    }
    console.log('');
    
    // 5. Verificar artículos publicados
    const publishedTitles = await prisma.title.findMany({
      where: {
        run: { userId: user.id },
        status: 'success',
        articleUrl: { not: null }
      },
      select: { text: true, finalTitle: true, articleUrl: true },
      orderBy: { processedAt: 'desc' },
      take: 10
    });
    
    console.log('=== ARTÍCULOS PUBLICADOS (últimos 10) ===');
    if (publishedTitles.length === 0) {
      console.log('⚠️  No tiene artículos publicados con éxito');
    } else {
      console.log(`✅ ${publishedTitles.length} artículos publicados (mostrando últimos 10):`);
      publishedTitles.forEach((title, i) => {
        console.log(`   ${i+1}. ${title.finalTitle || title.text}`);
        if (title.articleUrl) {
          console.log(`      URL: ${title.articleUrl}`);
        }
      });
    }
    console.log('');
    
    // 6. Verificar corridas recientes
    const recentRuns = await prisma.run.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        titles: {
          select: { status: true }
        }
      }
    });
    
    console.log('=== CORRIDAS RECIENTES (últimas 5) ===');
    if (recentRuns.length === 0) {
      console.log('⚠️  No tiene corridas registradas');
    } else {
      recentRuns.forEach((run, i) => {
        const successCount = run.titles.filter(t => t.status === 'success').length;
        const errorCount = run.titles.filter(t => t.status === 'error').length;
        const pendingCount = run.titles.filter(t => t.status === 'pending').length;
        
        console.log(`   ${i+1}. ${run.createdAt} - ${run.status}`);
        console.log(`      Títulos: ${run.titles.length} total (${successCount} éxito, ${errorCount} error, ${pendingCount} pendiente)`);
      });
    }
    console.log('');
    
    // 7. Análisis del problema
    console.log('=== ANÁLISIS DEL PROBLEMA ===');
    
    const issues = [];
    
    if (!googleIntegration?.siteUrl) {
      issues.push('CRÍTICO: No tiene Google Search Console configurado correctamente');
    }
    
    if (categories.length === 0) {
      issues.push('CRÍTICO: No tiene categorías de 10minutesWebsite sincronizadas');
    }
    
    if (!user.lastOpportunityAnalysisAt) {
      issues.push('INFORMACIÓN: Nunca ha ejecutado el análisis de oportunidades');
    } else {
      const daysSinceLastAnalysis = Math.floor(
        (Date.now() - user.lastOpportunityAnalysisAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastAnalysis < 3) {
        issues.push(`INFORMACIÓN: Último análisis hace ${daysSinceLastAnalysis} días (enfriamiento de 3 días activo)`);
      }
    }
    
    if (opportunityGroups.length === 0 && publishedTitles.length > 0) {
      issues.push('INFORMACIÓN: Tiene artículos publicados pero no oportunidades guardadas');
    }
    
    if (issues.length === 0) {
      console.log('✅ No se detectaron problemas obvios en la configuración');
      console.log('   El problema podría estar en:');
      console.log('   1. Datos insuficientes en Google Search Console');
      console.log('   2. Algoritmo muy restrictivo para su perfil de tráfico');
      console.log('   3. Ausencia de integración con Bing Webmaster Tools');
    } else {
      issues.forEach(issue => {
        console.log(`⚠️  ${issue}`);
      });
    }
    
  } catch (error) {
    console.error('Error durante el diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  diagnoseLorena()
    .then(() => {
      console.log('\n=== FIN DEL DIAGNÓSTICO ===');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { diagnoseLorena };