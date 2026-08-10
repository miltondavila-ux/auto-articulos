#!/usr/bin/env node

/**
 * Diagnóstico específico para segurosdesaludyvida.com (Lorena Álvarez)
 * Enfocado en identificar por qué no se generan oportunidades
 */

const { PrismaClient } = require('@prisma/client');

async function diagnoseSegurosDeSaludYVida() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== DIAGNÓSTICO: segurosdesaludyvida.com (Lorena Álvarez) ===\n');
    
    // 1. Buscar usuario por email o por dominio
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'lorenalvarez30@gmail.com' },
          { searchIntegrations: { some: { siteUrl: { contains: 'segurosdesaludyvida' } } } }
        ]
      },
      include: {
        searchIntegrations: true,
        categories: true,
        opportunityGroups: {
          include: { titles: true }
        },
        runs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { titles: true }
        }
      }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado con email lorenalvarez30@gmail.com');
      console.log('   Buscando por dominio segurosdesaludyvida...');
      
      // Buscar por integración
      const integration = await prisma.searchIntegration.findFirst({
        where: { siteUrl: { contains: 'segurosdesaludyvida' } },
        include: { user: true }
      });
      
      if (!integration) {
        console.log('❌ No se encontró integración para segurosdesaludyvida.com');
        return;
      }
      
      console.log(`✅ Encontrado usuario: ${integration.user.email}`);
      return diagnoseUser(integration.user.id);
    }
    
    return diagnoseUser(user.id);
    
  } catch (error) {
    console.error('Error durante el diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function diagnoseUser(userId) {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== DIAGNÓSTICO DETALLADO ===\n');
    
    // 1. Estado de Google Search Console
    const googleIntegration = await prisma.searchIntegration.findUnique({
      where: { 
        userId_provider: { 
          userId: userId, 
          provider: 'google' 
        } 
      }
    });
    
    console.log('1. GOOGLE SEARCH CONSOLE:');
    if (!googleIntegration) {
      console.log('   ❌ NO CONECTADO - Esto bloquea oportunidades');
      return;
    }
    
    console.log(`   ✅ Conectado`);
    console.log(`   Site URL: ${googleIntegration.siteUrl}`);
    console.log(`   Último sync sitemap: ${googleIntegration.lastSitemapSyncAt || 'Nunca'}`);
    console.log(`   Estado sync: ${googleIntegration.lastSitemapSyncStatus || 'No disponible'}`);
    
    // 2. Categorías
    const categories = await prisma.category.findMany({
      where: { userId: userId }
    });
    
    console.log('\n2. CATEGORÍAS:');
    if (categories.length === 0) {
      console.log('   ❌ NO TIENE CATEGORÍAS - Esto bloquea oportunidades');
      return;
    }
    
    console.log(`   ✅ ${categories.length} categorías:`);
    categories.forEach(cat => {
      console.log(`      - ${cat.name} (ID: ${cat.externalId})`);
    });
    
    // 3. Último análisis
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastOpportunityAnalysisAt: true }
    });
    
    console.log('\n3. ÚLTIMO ANÁLISIS:');
    if (!user.lastOpportunityAnalysisAt) {
      console.log('   ⚠️  NUNCA ha ejecutado el análisis');
    } else {
      const daysSince = Math.floor(
        (Date.now() - user.lastOpportunityAnalysisAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`   Último análisis: ${user.lastOpportunityAnalysisAt}`);
      console.log(`   Días transcurridos: ${daysSince}`);
      
      if (daysSince < 3) {
        console.log('   ⚠️  ENFRIAMIENTO ACTIVO (3 días)');
      } else {
        console.log('   ✅ Puede ejecutar análisis');
      }
    }
    
    // 4. Oportunidades existentes
    const opportunityGroups = await prisma.opportunityGroup.findMany({
      where: { userId: userId },
      include: { titles: true }
    });
    
    console.log('\n4. OPORTUNIDADES EXISTENTES:');
    if (opportunityGroups.length === 0) {
      console.log('   ⚠️  NO TIENE OPORTUNIDADES GUARDADAS');
      console.log('   Posibles causas:');
      console.log('   - Nunca ejecutó el análisis');
      console.log('   - El análisis no encontró oportunidades');
      console.log('   - Las oportunidades fueron eliminadas');
    } else {
      console.log(`   ✅ ${opportunityGroups.length} grupos:`);
      opportunityGroups.forEach(group => {
        console.log(`      - ${group.category?.name || 'Sin categoría'}: ${group.titles.length} títulos`);
      });
    }
    
    // 5. Artículos publicados
    const publishedTitles = await prisma.title.findMany({
      where: {
        run: { userId: userId },
        status: 'success',
        articleUrl: { not: null }
      },
      select: { text: true, finalTitle: true, articleUrl: true },
      orderBy: { processedAt: 'desc' },
      take: 10
    });
    
    console.log('\n5. ARTÍCULOS PUBLICADOS (últimos 10):');
    if (publishedTitles.length === 0) {
      console.log('   ⚠️  NO TIENE ARTÍCULOS PUBLICADOS');
    } else {
      console.log(`   ✅ ${publishedTitles.length} artículos:`);
      publishedTitles.forEach((title, i) => {
        console.log(`      ${i+1}. ${title.finalTitle || title.text}`);
      });
    }
    
    // 6. Análisis del problema
    console.log('\n=== ANÁLISIS DEL PROBLEMA ===\n');
    
    const issues = [];
    
    if (!googleIntegration) {
      issues.push('CRÍTICO: Google Search Console no conectado');
    } else if (!googleIntegration.siteUrl) {
      issues.push('CRÍTICO: Google Search Console sin site URL configurado');
    }
    
    if (categories.length === 0) {
      issues.push('CRÍTICO: No tiene categorías sincronizadas');
    }
    
    if (!user.lastOpportunityAnalysisAt) {
      issues.push('INFORMACIÓN: Nunca ha ejecutado el análisis de oportunidades');
    } else if (opportunityGroups.length === 0) {
      issues.push('PROBLEMA: El análisis no encontró oportunidades (revisar algoritmo)');
    }
    
    if (issues.length === 0) {
      console.log('✅ No se detectaron problemas obvios');
      console.log('   El problema está en el ALGORITMO, no en la configuración');
      console.log('   → Revisar opportunity-analysis.ts');
    } else {
      issues.forEach(issue => {
        console.log(`⚠️  ${issue}`);
      });
    }
    
    // 7. Recomendaciones específicas
    console.log('\n=== RECOMENDACIONES ESPECÍFICAS ===\n');
    
    if (opportunityGroups.length === 0 && googleIntegration?.siteUrl) {
      console.log('1. EL ALGORITMO NECESITA MEJORAS:');
      console.log('   - Aumentar límite de 250 a 2500 filas');
      console.log('   - Mejorar prompt para ser más productivo');
      console.log('   - Agregar análisis de patrones');
      console.log('');
      console.log('2. PARA PROBAR AHORA:');
      console.log('   - Ejecutar diagnóstico de Google Search Console');
      console.log('   - Verificar cuántos datos tiene realmente');
      console.log('   - Ajustar algoritmo y reintentar');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
if (require.main === module) {
  diagnoseSegurosDeSaludYVida()
    .then(() => {
      console.log('\n=== FIN DEL DIAGNÓSTICO ===');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { diagnoseSegurosDeSaludYVida };