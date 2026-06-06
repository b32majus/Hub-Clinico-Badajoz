# Changelog

## v2.0.0 — Reuma multipatología + prebiológico + FH + estadísticas

**Fecha:** 2026-05-03  
**Rama:** `feature/reuma-v2-prebiologico-fh-les-sjogren`  
**Commits:** 39 commits por delante de `main`

---

### Identificación CIP
- CIP como identificador visible y canónico en toda la UI.
- Alias de compatibilidad para `ID_Paciente`, `NHC`, `NHS` en `fieldNormalizer.js`.
- Labels visibles cambiados a "CIP" sin modificar atributos `id`/`name` funcionales.

### Retirada de ASDAS en AR
- ASDAS ocultado en formularios de primera visita y seguimiento cuando patología = AR.
- Exportación TXT/CSV marca ASDAS como "NA" para AR.
- Dashboard y estadísticas no muestran ASDAS para AR.
- Conservado íntegro para EspA/APs.

### LES como patología completa
- Selector LES en primera visita, seguimiento y estadísticas.
- 37 campos clínicos: manifestaciones, inmunología, órgano diana, tratamiento.
- Exportación CSV (37 columnas LES) + TXT con bloque LES.
- Dashboard: KPIs SLEDAI-2K y SLICC/ACR SDI.

### Sjögren como patología completa
- Selector Sjögren en primera visita, seguimiento y estadísticas.
- ESSPRI calculado automáticamente (media de sequedad, dolor, fatiga).
- ESSDAI con 12 dominios ponderados (selectores 0-3).
- EVA sequedad oral/ocular, fatiga, dolor.
- Exportación CSV (41 columnas Sjögren) + TXT con bloque Sjögren.
- Dashboard: KPIs ESSPRI y ESSDAI.

### Calculadoras clínicas
- **SLEDAI-2K:** checklist de 24 ítems ponderados (pesos 8/4/2/1).
- **SLICC/ACR SDI:** entrada estructurada por 12 dominios con suma automática.
- **ESSPRI:** PROM calculado desde 3 escalas 0-10.
- **ESSDAI:** calculadora por 12 dominios con ponderación.
- Todas con validación de rangos y actualización en tiempo real.

### Prebiológico / vacunación
- Módulo `prebiologicManager.js` con namespace `HubTools.prebiologic`.
- 4 estados: APTO, EN_CURSO, NO_APTO, NO_EVALUADO.
- Persistencia principal: bloque prebiológico/vacunación embebido en cada hoja de patología/visita (exportable/importable desde Excel).
- `sessionStorage` como fallback temporal y compatibilidad.
- Badge visual en dashboard y seguimiento con color por estado.
- Fecha de validación manual visible.

### Solicitud FH (Farmacia Hospitalaria)
- Módulo `pharmacyRequest.js` con namespace `HubTools.pharmacy`.
- Texto plano generado por patología (AR/EspA/APs/LES/Sjögren).
- Bloque común + bloque específico + bloque prebiológico/vacunación.
- Comorbilidades activas incluidas.
- Botón en dashboard, seguimiento y primera visita.
- Copia automática al portapapeles con fallback modal.

### Eventos terapéuticos
- Módulo `treatmentEventsManager.js` con namespace `HubTools.events`.
- Eventos derivados automáticamente del historial de visitas:
  - Inicio/cambio/suspensión de tratamiento.
  - Inicio/cambio de biológico.
  - Efectos adversos.
  - Flare/remisión por patología (umbrales específicos).
  - Validación prebiológica.
- Timeline visual en dashboard con máximo 5 eventos + "ver más".
- Anotaciones Chart.js (líneas verticales punteadas) sobre gráficos de actividad y PROs.
- Marcadores de fármaco tipo "Tx: Metotrexato", "Bio: Adalimumab".

### Dashboard paciente
- KPIs adaptativos por patología (DAS28/CDAI para AR, BASDAI/ASDAS para EspA, SLEDAI-2K/SLICC para LES, ESSPRI/ESSDAI para Sjögren).
- Selectores de métricas ampliados (DAS28, CDAI, SDAI, SLEDAI-2K, ESSPRI, ESSDAI).
- Historial de tratamientos separado de eventos clínicos.
- Timeline de eventos con filtrado anti-duplicación.

### Estadísticas v2 multipatología
- Soporte completo para 5 patologías en KPIs poblacionales.
- Donut de actividad con umbrales específicos por patología.
- Scatter con nuevas métricas seleccionables.
- Tabla de cohortes con métrica principal adaptativa.
- Filtros por patología con selectores de índice adaptativos.

### Demo poblacional
- Script `generate_demo_db.py` reproducible.
- 50 pacientes ficticios (10 × 5 patologías).
- 200 visitas longitudinales (4 por paciente: 1 primera + 3 seguimientos).
- Perfiles clínicos variados: remisión, alta actividad, efectos adversos, comorbilidades.
- Estados prebiológicos distribuidos.
- DAPSA poblado longitudinalmente en APs y contrato Excel ampliado a 497 columnas.
- Validaciones automáticas del script.

### Documentación y validación E2E
- `docs/PLAN_IMPLEMENTACION_REUMA_V2.md` — plan de 12 fases ejecutado.
- `docs/CONTRATO_DATOS_REUMA_V2.md` — contrato de datos unificado.
- `docs/CHECKLIST_E2E_CLINICO_V2.md` — 110+ checks, 5 flujos E2E.
- `docs/VALIDACION_MANUAL_DEMO_V2.md` — guía de validación manual.
- `docs/REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md` — diferencias Excel demo vs maestro.

---

### Archivos principales modificados
- `modules/dataManager.js`
- `modules/exportManager.js`
- `modules/formController.js`
- `modules/scoreCalculators.js`
- `modules/fieldNormalizer.js`
- `modules/pharmacyRequest.js` *(nuevo)*
- `modules/prebiologicManager.js` *(nuevo)*
- `modules/treatmentEventsManager.js` *(nuevo)*
- `scripts/script_dashboard.js`
- `scripts/script_estadisticas.js`
- `scripts/script_primera_visita.js`
- `scripts/script_seguimiento.js`
- `scripts/generate_demo_db.py` *(nuevo)*
- `index.html`, `primera_visita.html`, `seguimiento.html`, `estadisticas.html`, `dashboard_paciente.html`
- `style_dashboard.css`, `style_seguimiento.css`
- `data/Hub_Clinico_Maestro_V2_DEMO.xlsx` *(nuevo)*

---

### Pendientes no bloqueantes
- Exportación de estadísticas a CSV: no implementada en esta versión.
- Checklist SLICC completo: la implementación actual es entrada estructurada por dominios, no checklist ítem por ítem.

### AUDIT-FIX-2 ejecutado — DAPSA incorporado al contrato APs
- Motivo: APs necesitaba DAPSA como métrica principal persistida en Excel.
- Contrato v2 actualizado de 491 a 497 columnas por hoja clínica.
- Columnas añadidas: `DAPSA_Result`, `DAPSA_NAD68`, `DAPSA_NAT66`, `DAPSA_EVA_Dolor_Paciente`, `DAPSA_EVA_Global_Paciente`, `DAPSA_PCR`.
- Impacto cubierto: formulario, `formController`, `exportManager`, demo, `dataManager`, dashboard, estadísticas, eventos terapéuticos y Solicitud FH.
- `DAPSA_PCR` se almacena en mg/L; la calculadora convierte a mg/dL para el total.

### Riesgos conocidos
- `Tratamiento_Actual` es texto libre; la detección de cambios de tratamiento depende de comparación por string.
- Los eventos terapéuticos se derivan de visitas, no se persisten como tabla propia.
- `sessionStorage` es fallback temporal; el dato persistente es la hoja Excel embebida en la visita.
