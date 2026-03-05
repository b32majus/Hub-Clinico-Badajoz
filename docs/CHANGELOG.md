# Changelog

## 2026-03-05

### Modificación posterior al archivo original
Registro añadido después de la documentación inicial para dejar trazabilidad de hallazgos y ajustes detectados durante la fase de robustez.

### Implementado
- Endurecimiento de calculadoras clínicas para evitar `NaN` visibles.
- Fallback de exportación CSV/TXT con copia manual si falla clipboard.
- BOM UTF-8 en CSV para mejorar compatibilidad con Excel.
- Buffer local de `filas pendientes` con recuperación y resolución manual.
- Inicialización defensiva en primera visita y seguimiento.
- Normalizador central de campos con `fieldNormalizer.js`.
- Reducción de exposición redundante de funciones globales en `dataManager`.
- Modal de texto unificado y externalización parcial de estilos críticos.

### Hallazgos añadidos al backlog
- Normalización global de codificación y finales de línea del repositorio.
- Validación funcional real del buffer de filas pendientes en navegador/Excel.
- Extensión del normalizador canónico al resto de consumidores.
- Limpieza completa de deuda restante en quick view.
- Batería de pruebas E2E por patología y tipo de visita.
