# Changelog

## 2026-03-06

### Implementado
- Correcci?n de bloqueo funcional en formularios por conflicto entre `formController` y `homunculus`.
- Correcci?n del enlace `Registrar Seguimiento` en dashboard extendido del paciente.
- Alineaci?n de validaci?n de cabeceras cr?ticas con el Excel maestro real para `ESPA` y `APS`.
- Correcci?n de falso positivo en validaci?n: ya no usa `Object.keys` de la primera fila de datos, sino la fila real de cabeceras del worksheet.
- Avisos `warning` m?s legibles, visibles durante m?s tiempo y cerrables con clic.
- Incremento de versi?n de recursos est?ticos (`cache-busting`) para forzar recarga de m?dulos corregidos.

### Documentado
- Se deja registrado que el aviso amarillo de carga de BD indica desalineaci?n real de cabeceras o compatibilidad heredada, no fallo de lectura del archivo por s? mismo.

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
