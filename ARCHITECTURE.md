# HUB Clínico Badajoz - Arquitectura e Implementación

Documento de memoria técnica para entender cómo está codificada la app, qué módulos existen y cómo fluye la información en el entorno hospitalario actual.

## 1) Restricciones de diseño
- App local-first, sin backend remoto.
- Sin instalación obligatoria.
- Ejecución como estáticos HTML/CSS/JS.
- Persistencia operativa en Excel compartido (`Hub_Clinico_Maestro.xlsx`).
- Compatibilidad con flujos STIC (sin dependencias de infraestructura compleja).

## 2) Arquitectura de ejecución
- Patrón global por namespace `HubTools` (sin imports ES modules en runtime).
- Coordinadores por página en `scripts/`.
- Módulos funcionales en `modules/`.

Namespaces principales:
- `HubTools.form` -> validación, adaptación por patología, recopilación/prellenado.
- `HubTools.scores` -> cálculos clínicos.
- `HubTools.homunculus` -> homúnculo interactivo NAD/NAT/dactilitis.
- `HubTools.data` -> carga Excel, normalización y consultas.
- `HubTools.export` -> TXT/CSV.
- `HubTools.utils` -> utilidades transversales.

## 3) Estructura funcional de pantallas
- `index.html` + `script.js`: dashboard principal y quick view.
- `primera_visita.html` + `scripts/script_primera_visita.js`.
- `seguimiento.html` + `scripts/script_seguimiento.js`.
- `dashboard_paciente.html` + `scripts/script_dashboard.js`.
- `estadisticas.html` + `scripts/script_estadisticas.js`.

## 4) Flujo de datos real
1. Usuario carga `Hub_Clinico_Maestro.xlsx`.
2. `dataManager.loadDatabase()` parsea hojas (`ESPA`, `APS`, `AR`, `Fármacos`, `Profesionales`).
3. Se guarda estado en memoria y cache local (`localStorage`) para navegación entre páginas.
4. Formularios generan:
   - TXT para historia clínica.
   - CSV de una fila para pegar en hoja de patología.
5. Dashboards consumen estado cargado, no el archivo en tiempo real.

## 5) Regla operativa de actualización
La sesión trabaja con una copia cargada de la BD.
- Si otro profesional añade filas al Excel compartido, no se reflejan automáticamente.
- Requiere recarga manual de BD en la app para actualizar buscador/dashboards/estadísticas.

## 6) Implementación por patología
### ESPA y APS
- Soporte completo de primera/seguimiento.
- Precarga en seguimiento de datos estables.
- Métricas y dashboard poblacional operativos.

### AR
- Integración completa primera/seguimiento en la misma hoja `AR`.
- Exportación AR alineada a estructura extendida.
- Dashboard principal, dashboard paciente y estadísticas con AR.
- Filtros/índices AR (DAS28_CRP, DAS28_ESR, CDAI, SDAI, RAPID3).

## 7) Precarga en seguimiento (estado actual)
Entrada: `scripts/script_seguimiento.js` -> `buildPrefillPayload()`.
Aplicación al DOM: `modules/formController.js` -> `prefillSeguimientoForm()`.

Se precargan datos estables:
- ID, nombre, diagnóstico.
- Tratamiento actual y fecha de inicio.
- Comorbilidades.
- Manifestaciones extraarticulares (mapas SI/NO).
- Biomarcadores (HLA-B27, FR, aPCC y ANA para AR).
- Peso/talla/IMC cuando existen en última visita.

No se precargan datos dinámicos:
- Índices de actividad, PROs, anamnesis dinámica y recuentos clínicos de visita actual.

## 8) Contrato de datos y codificación
Referencia canónica:
- `docs/CONTRATO_DATOS_UNIFICADO.md`
- `docs/template_ar_excel.md`

Convenciones de valor:
- `SI`, `NO`, `ND`, `NA`, vacío (`""`) según campo y aplicabilidad.

## 9) Riesgos y deuda técnica conocida
- Riesgo de desalineación por edición manual de Excel.
- Dependencia de nomenclatura homogénea de fármacos/profesionales.
- Necesidad de disciplina de recarga de BD en sesiones largas.
- Mantener vigilancia de codificación UTF-8 para evitar mojibake en UI.

## 10) Checklist de cambios futuros
Cuando se modifique una funcionalidad clínica:
1. Captura/validación (`formController`).
2. Exportación (`exportManager`).
3. Lectura/normalización (`dataManager`).
4. Visualización (`script_dashboard`, `script_estadisticas`, quick view).
5. Documentación (`README`, contrato y estado de implementación).

Última actualización: 2026-03-05.
