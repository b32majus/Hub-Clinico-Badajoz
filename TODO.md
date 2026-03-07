# TODO — Hub Clínico Badajoz

## Deuda técnica vigente

### 1. Normalización global de codificación y finales de línea
- **Dónde**: Repositorio completo (`.js`, `.html`, `.css`, `.md`)
- **Qué hacer**: Limpiar strings con mojibake heredado, unificar guardado en UTF-8 y revisar archivos aún corruptos.
- **Estado**: `.gitattributes` ya existe, pero siguen quedando textos dañados en documentación y algunos módulos.
- **Prioridad**: Alta.

### 2. Validación funcional real del buffer de filas pendientes
- **Dónde**: Flujo CSV → clipboard → Excel real.
- **Qué hacer**: Probar exportación, fallo de clipboard, recuperación, resolución manual y persistencia tras recarga.
- **Estado**: La lógica está implementada; falta validación operativa end-to-end.
- **Prioridad**: Alta.

### 3. Extender `fieldNormalizer` al resto de consumidores
- **Dónde**: Especialmente `scripts/script_estadisticas.js` y cualquier lectura con aliases dispersos.
- **Qué hacer**: Sustituir fallbacks manuales por acceso canónico progresivo.
- **Estado**: Ya integrado en `dataManager`, `script.js`, `script_dashboard.js`, `script_dashboard_search.js` y `script_seguimiento.js`.
- **Prioridad**: Media.

### 4. Reducir acoplamiento residual del quick view
- **Dónde**: `script.js`
- **Qué hacer**: Separar más claramente renderizado, composición de datos y navegación; reducir HTML generado si complica mantenimiento.
- **Estado**: Los estilos inline críticos ya están extraídos a CSS. La deuda restante es de estructura, no de estilos.
- **Prioridad**: Media.

### 5. Batería funcional repetible por patología
- **Dónde**: Primera visita, seguimiento, quick view, dashboard paciente, estadísticas y exportaciones.
- **Qué hacer**: Definir una batería mínima E2E/manual repetible para `ESPA`, `APS` y `AR`.
- **Estado**: Hay pruebas parciales y validación sintáctica, pero no una cobertura sistemática.
- **Prioridad**: Media-alta.

## Mejoras funcionales pendientes

### 6. Indicador persistente de BD potencialmente desactualizada
- **Dónde**: Shell principal / sidebar.
- **Qué hacer**: Hacer más visible el estado temporal de carga y el aviso de sesión larga.
- **Prioridad**: Media.

### 7. Checklist técnico pre-release
- **Dónde**: Documentación operativa o script de verificación.
- **Qué hacer**: Consolidar verificación de UTF-8, sintaxis JS y flujo de exportación antes de entrega.
- **Prioridad**: Media.

Última revisión: 2026-03-07.
