# Análisis del Algoritmo de Oportunidades - Problemas y Soluciones

## Problema Principal
El algoritmo actual está **filtrando demasiados datos** y siendo **demasiado restrictivo** en su prompt, lo que resulta en:
- Pocas oportunidades generadas
- Usuarios con datos reales no reciben sugerencias
- Desperdicio del 95% de los datos disponibles

## Datos Desperdiciados

### 1. Límite de 250 filas (DEBERÍA SER 2500+)
```javascript
// ACTUAL (opportunity-analysis.ts:183)
.slice(0, 250)

// PROPUESTO
.slice(0, 2500)  // Usar 10x más datos
```

### 2. Prompt que impide el análisis creativo
El prompt actual dice:
- "NUNCA menciones un dato específico... a menos que ese dato EXACTO aparezca literalmente"
- "Si genuinamente no hay evidencia suficiente... responde exactamente {"opportunities":[]}"

**Esto impide que la IA identifique patrones y oportunidades.**

## Soluciones Propuestas

### Solución 1: Aumentar límite de datos
```javascript
// En opportunity-analysis.ts
.slice(0, 2500)  // En vez de 250
```

### Solución 2: Agregar análisis de patrones faltantes
El algoritmo debería analizar:

1. **Consultas con alto potencial** (impresiones altas, clics bajos)
2. **Posiciones 2-10** (fáciles de mejorar con optimización)
3. **Clusters temáticos** (consultas relacionadas)
4. **Tendencias de crecimiento** (mes a mes)
5. **Páginas estrella** (las que más tráfico generan)
6. **Oportunidades de long tail** (consultas específicas)

### Solución 3: Mejorar el prompt
```javascript
const PROMPT_HEADER = `Actúa como analista senior de SEO. Tu objetivo es encontrar TODAS las oportunidades posibles, no solo las obvias.

ANÁLISIS PROFUNDO REQUERIDO:
1. Identifica consultas con alto potencial (impresiones altas, clics bajos)
2. Encuentra páginas en posiciones 2-10 (fáciles de mejorar)
3. Crea clusters temáticos de consultas relacionadas
4. Detecta tendencias de crecimiento mes a mes
5. Identifica páginas estrella y cómo replicar su éxito
6. Sugiere contenido long tail basado en patrones reales

REGLAS FLEXIBLES:
- PUEDES inferir patrones y tendencias de los datos
- PUEDES sugerir contenido relacionado aunque no aparezca literalmente
- DEBES ser creativo pero basado en evidencia real
- CADA título debe tener una justificación basada en datos...`;
```

### Solución 4: Agregar análisis de oportunidades específicas
```javascript
// Nuevas métricas a analizar
const opportunities = {
  // Consultas con impressions > 100 y clicks < 5 (alto potencial)
  highPotential: performance.filter(r => r.impressions > 100 && r.clicks < 5),
  
  // Páginas en posición 2-10 (fáciles de mejorar)
  easyWins: performance.filter(r => r.position >= 2 && r.position <= 10),
  
  // Consultas en crecimiento (tendencia positiva)
  growing: performance.filter(r => r.impressionTrend > 10),
  
  // Páginas estrella (top 10% en clics)
  starPages: performance.slice(0, Math.floor(performance.length * 0.1))
};
```

## Implementación Recomendada

### Fase 1: Aumentar datos (inmediato)
1. Cambiar `.slice(0, 250)` a `.slice(0, 2500)`
2. Probar con usuario segurosdesaludyvida
3. Verificar si genera más oportunidades

### Fase 2: Mejorar prompt (1-2 días)
1. Rediseñar el prompt para ser más productivo
2. Agregar análisis de patrones
3. Probar con múltiples usuarios

### Fase 3: Métricas avanzadas (3-5 días)
1. Implementar análisis de oportunidades específicas
2. Agregar scoring de oportunidades
3. Crear dashboard de métricas

## Próximos Pasos Inmediatos

1. **Ejecutar diagnóstico** con usuario segurosdesaludyvida
2. **Aumentar límite** de 250 a 2500
3. **Probar** si genera más oportunidades
4. **Ajustar prompt** si es necesario

## Impacto Esperado

- **Antes**: 250 filas analizadas → Pocas oportunidades
- **Después**: 2500+ filas analizadas → Muchas más oportunidades
- **Mejora esperada**: 5-10x más oportunidades generadas