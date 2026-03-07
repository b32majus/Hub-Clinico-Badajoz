# Changelog

## 2026-03-07

### Implementado
- Cierre operativo de la fase principal de deuda técnica, con memoria del proyecto ya alineada al estado real.
- Validación Playwright real en WSL de carga de `Hub_Clinico_Maestro.xlsx`, sesión profesional y smoke AR con catálogos de tratamiento cargados.
- Enriquecimiento de KPIs del dashboard paciente con línea de umbrales clínicos para métricas numéricas.
- Alta de `favicon.svg` y enlace explícito en las pantallas principales para evitar el `404` implícito de `favicon.ico`.
- Extensión del uso de `fieldNormalizer` a `script_dashboard.js`, `script_dashboard_search.js` y `script_seguimiento.js`.
- Corrección de navegación en búsqueda de dashboard para construir correctamente la query string hacia `dashboard_paciente.html`.
- Sincronización de la memoria operativa (`TODO.md` y estado de implementación) con la deuda técnica real restante.
- Extracción segura de inline styles presentacionales en `primera_visita.html` y `seguimiento.html`.
- Corrección de detección de la hoja `Fármacos` para poblar selects de tratamiento desde el Excel maestro.
- Extensión de la normalización canónica a la cohorte y tabla de `script_estadisticas.js`.
- Limpieza inicial de mojibake y mensajes operativos en `dataManager.js`.
- Limpieza de mojibake en `docs/ESTADO_IMPLEMENTACION.md`, `docs/CHANGELOG.md` y `docs/MEJORAS_PROPUESTAS.md`.
- Alta de `docs/CHECKLIST_E2E_CLINICO.md` como batería manual base por patología y flujos transversales.
- Endurecimiento del indicador de estado de BD en sidebar con aviso persistente de sesión envejecida/caché limitada.
- Corrección del orden de persistencia en `dataManager.js` para que `databaseLoaded` no se dispare antes de guardar la caché.
- Alta de `scripts/check_pre_release.js` para verificación técnica rápida de sintaxis JS, mojibake y finales de línea.
- Normalización de finales de línea residuales en módulos, scripts, estilos y documentación viva.
- Refactor parcial del quick view en `script.js` para separar resolución de paciente, modelo de vista y composición de métricas.

## 2026-03-06

### Implementado
- Corrección de bloqueo funcional en formularios por conflicto entre `formController` y `homunculus`.
- Corrección del enlace `Registrar Seguimiento` en dashboard extendido del paciente.
- Alineación de validación de cabeceras críticas con el Excel maestro real para `ESPA` y `APS`.
- Corrección de falso positivo en validación: ya no usa `Object.keys` de la primera fila de datos, sino la fila real de cabeceras del worksheet.
- Avisos `warning` más legibles, visibles durante más tiempo y cerrables con clic.
- Incremento de versión de recursos estáticos (`cache-busting`) para forzar recarga de módulos corregidos.

### Documentado
- Se deja registrado que el aviso amarillo de carga de BD indica desalineación real de cabeceras o compatibilidad heredada, no fallo de lectura del archivo por sí mismo.

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
