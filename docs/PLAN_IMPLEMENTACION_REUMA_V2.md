# Plan de implementación Reuma v2

Documento operativo para implementar de forma incremental las mejoras solicitadas por el servicio de Reumatología en el Hub Clínico de Badajoz.

Este documento está escrito para ser usado como guía de trabajo por Kimi K2.6 desde OpenCode, manteniendo el patrón técnico actual del repositorio y evitando refactorizaciones innecesarias.

---

## 1. Objetivo global

Implementar una evolución v2 del Hub Clínico de Reumatología que incluya:

1. Corrección clínica: retirar `ASDAS` de artritis reumatoide.
2. Incorporación completa de dos nuevas patologías:
   - Lupus eritematoso sistémico, `LES`.
   - Síndrome de Sjögren.
3. Módulo transversal de validación prebiológica.
4. Badge persistente de estado prebiológico visible desde las vistas principales del paciente.
5. Exportación estructurada `Solicitud FH` para Farmacia Hospitalaria.
6. Mejora del dashboard individual con eventos terapéuticos sobre la evolución clínica.
7. Creación de contrato de datos y Excel maestro v2, sin romper el Excel actual.

---

## 2. Restricciones técnicas obligatorias

El Hub Clínico de Badajoz es una app local-first. Debe seguir funcionando como HTML/CSS/JS estático, sin backend remoto, sin servidor y sin instalación compleja.

### No hacer

- No migrar a React, Vue, Svelte ni ningún framework.
- No introducir backend.
- No añadir dependencias externas por CDN.
- No romper ejecución local con `file://`.
- No eliminar columnas históricas del contrato actual.
- No hacer un rename global ciego de `ID_Paciente` a `CIP`.
- No reescribir todo `dataManager`, `formController` o `exportManager` si basta con extenderlos.
- No cambiar el patrón global `HubTools`.

### Sí hacer

- Mantener coordinadores por página en `scripts/`.
- Mantener módulos funcionales en `modules/`.
- Añadir módulos nuevos cuando sea más limpio.
- Añadir alias de compatibilidad para campos existentes.
- Implementar por fases pequeñas y verificables.
- Actualizar documentación y checklist tras cada fase funcional.

---

## 3. Decisiones funcionales confirmadas

| Tema | Decisión |
|---|---|
| Identificador visible del paciente | `CIP` |
| Compatibilidad interna | Mantener lectura de `ID_Paciente`, `NHC`, `NHS` si existen |
| ASDAS | No aplica en artritis reumatoide; mantener donde corresponda |
| LES | Patología completa |
| Síndrome de Sjögren | Patología completa |
| Índices LES iniciales | SLEDAI, SLEDAI-2K, SLICC/ACR Damage Index, dosis de prednisona |
| Índices Sjögren iniciales | ESSPRI, ESSDAI, EVA sequedad oral, EVA sequedad ocular, fatiga, dolor |
| Prebiológico | Validación manual del clínico |
| Fecha del badge | Fecha de validación manual cuando se confirme que está todo correcto |
| Estados badge | APTO, EN_CURSO, NO_APTO, NO_EVALUADO |
| Cribado TB | IGRA / Quantiferon / Mantoux |
| Radiografía | Radiografía / placa de tórax |
| Vacunación | OK directo o derivación a Medicina Preventiva con vacunas pendientes seleccionables |
| Exportación Farmacia | Nombre visible: `Solicitud FH` |
| Excel | Crear versión v2, sin tocar destructivamente el maestro actual |

---

## 4. Arquitectura actual que debe respetarse

Estructura funcional esperada:

```text
index.html + script.js
primera_visita.html + scripts/script_primera_visita.js
seguimiento.html + scripts/script_seguimiento.js
dashboard_paciente.html + scripts/script_dashboard.js
estadisticas.html + scripts/script_estadisticas.js

modules/formController.js
modules/scoreCalculators.js
modules/dataManager.js
modules/exportManager.js
modules/fieldNormalizer.js
modules/utils.js
modules/hubTools.js o equivalente
```

Namespaces principales:

```text
HubTools.form
HubTools.scores
HubTools.data
HubTools.export
HubTools.utils
```

Nuevos namespaces recomendados:

```text
HubTools.prebiologic
HubTools.pharmacy
HubTools.events
```

---

## 5. Estrategia de ramas y commits

Crear rama:

```bash
git checkout main
git pull
git checkout -b feature/reuma-v2-prebiologico-fh-les-sjogren
```

Orden recomendado de commits:

```text
commit 1: docs: add reuma v2 implementation plan
commit 2: chore: add CIP alias utilities and visible label updates
commit 3: fix(ar): hide and neutralize ASDAS fields for rheumatoid arthritis
commit 4: docs: add reuma v2 data contracts
commit 5: feat(prebiologic): load and expose prebiologic validation records
commit 6: feat(prebiologic): add persistent badge with manual validation date
commit 7: feat(pharmacy): add Solicitud FH text export
commit 8: feat(dashboard): add therapeutic events and treatment annotations
commit 9: feat(les): add LES pathology forms export and dashboard support
commit 10: feat(sjogren): add Sjögren pathology forms export and dashboard support
commit 11: feat(stats): add v2 pathology-aware statistics
commit 12: docs: add E2E v2 checklist and clinical validation guide
```

---

# FASE 0. Auditoría técnica inicial

## Objetivo

Localizar todos los puntos donde se toca patología, índices, exportación, dashboard, identificador de paciente y contrato de datos.

## Tareas

Ejecutar:

```bash
rg -n "ASDAS|asdas" .
rg -n "DAS28|CDAI|SDAI|RAPID3|BASDAI" .
rg -n "diagnosticoPrimario|Diagnostico_Primario|patologia|pathology" .
rg -n "ESPA|APS|AR" .
rg -n "EXPORT_HEADERS|headers|cabeceras|CSV|TXT|TSV" .
rg -n "dashboard|Chart|annotation|treatmentHistory|keyEvents" .
rg -n "ID_Paciente|NHC|NHS|CIP" .
```

## Documentar hallazgos

Añadir al final de este documento una sección llamada `Auditoría inicial` con:

```markdown
## Auditoría inicial

### Apariciones de ASDAS
- Archivo:
- Función / bloque:
- Acción requerida:

### Definición de patologías
- Archivo:
- Función / bloque:
- Acción requerida:

### Exportación TXT/CSV
- Archivo:
- Función / bloque:
- Acción requerida:

### Dashboard paciente
- Archivo:
- Función / bloque:
- Acción requerida:

### Lectura Excel
- Archivo:
- Función / bloque:
- Acción requerida:

### Normalización de campos
- Archivo:
- Función / bloque:
- Acción requerida:

### Riesgos detectados
- Riesgo:
- Mitigación:
```

## Criterio de aceptación

- No se modifica código funcional en esta fase.
- Queda documentado el mapa de archivos afectados.

---

# FASE 1. CIP como identificador visible compatible

## Objetivo

Usar `CIP` como identificador visible y futuro campo canónico, manteniendo compatibilidad con identificadores existentes.

## Decisión técnica

No hacer rename global destructivo. Añadir alias de lectura.

## Tareas

### 1. Crear función centralizada

En `modules/fieldNormalizer.js` o `modules/dataManager.js`, añadir:

```javascript
function getPatientCIP(record) {
  if (!record) return '';
  return (
    record.CIP ||
    record.ID_Paciente ||
    record.idPaciente ||
    record.NHC ||
    record.NHC_Paciente ||
    record.NHS ||
    ''
  ).toString().trim();
}
```

Registrar en namespace disponible:

```javascript
HubTools.normalizer = HubTools.normalizer || {};
HubTools.normalizer.getPatientCIP = getPatientCIP;
```

Si `HubTools.normalizer` no existe, registrar temporalmente en `HubTools.data`:

```javascript
HubTools.data.getPatientCIP = getPatientCIP;
```

### 2. Cambiar textos visibles

Buscar labels visibles:

```text
ID Paciente
ID_Paciente
NHC
NHS
```

Cambiar el texto de interfaz a:

```text
CIP
```

No cambiar necesariamente IDs HTML si rompería el código.

Ejemplo aceptable:

```html
<label for="idPaciente">CIP</label>
<input id="idPaciente" ...>
```

### 3. Exportaciones

En TXT, dashboards y futura `Solicitud FH`, mostrar siempre:

```text
CIP: XXXXX
```

En CSV del contrato antiguo puede mantenerse `ID_Paciente` por compatibilidad.

## Criterio de aceptación

- La app sigue encontrando pacientes aunque el Excel use `ID_Paciente`.
- La UI muestra `CIP`.
- Los TXT muestran `CIP`.
- No se rompe dashboard ni seguimiento.

---

# FASE 2. Retirar ASDAS de artritis reumatoide

## Objetivo

ASDAS no debe mostrarse, validarse, calcularse ni exportarse como dato aplicable en AR.

## Regla clínica

```text
ASDAS no aplica en artritis reumatoide.
ASDAS sí puede aplicar en espondiloartritis axial.
```

## Tareas

### 1. Localizar bloques ASDAS

Usar resultado de:

```bash
rg -n "ASDAS|asdas" .
```

### 2. Primera visita AR

En `primera_visita.html`, `modules/formController.js` o `scripts/script_primera_visita.js`, según corresponda:

- Ocultar bloque ASDAS cuando `patologia === 'ar'`.
- No eliminar el bloque global, solo condicionar visibilidad.

Crear helper si no existe:

```javascript
function setASDASVisibility(isVisible) {
  const possibleIds = [
    'asdasDolorEspalda',
    'asdasDuracionRigidez',
    'asdasEvaGlobal',
    'asdasCrpResult',
    'asdasEsrResult'
  ];

  possibleIds.forEach(function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const group = el.closest('.form-group, .score-section, .collapsible-section, .section');
    if (group) group.style.display = isVisible ? '' : 'none';
  });
}
```

Adaptar IDs reales tras auditoría.

### 3. Seguimiento AR

Aplicar misma regla:

```text
AR:
- No mostrar ASDAS.
- No validar ASDAS.
- No precargar ASDAS.
- No calcular ASDAS.
```

### 4. Validación

En `validarFormulario()` o equivalente:

```javascript
if (patologia === 'ar') {
  // No añadir errores por campos ASDAS vacíos.
}
```

### 5. Recopilación y exportación

En `recopilarDatosFormulario()` y `exportManager`:

- Para AR, columnas ASDAS deben exportarse como `NA` o vacío según contrato.
- Recomendación v2: `NA`.

```text
ASDAS_Dolor_Espalda = "NA"
ASDAS_Duracion_Rigidez = "NA"
ASDAS_EVA_Global = "NA"
ASDAS_CRP_Result = "NA"
ASDAS_ESR_Result = "NA"
```

### 6. Dashboard paciente AR

En `scripts/script_dashboard.js`:

Para AR:

```text
Métrica primaria: DAS28_CRP o DAS28_ESR.
Métrica secundaria: CDAI o SDAI.
PRO: RAPID3/HAQ/MDHAQ si existe.
Nunca ASDAS.
```

### 7. Estadísticas AR

En `scripts/script_estadisticas.js`:

```text
Filtro AR no debe mostrar ASDAS.
Tablas AR no deben usar ASDAS.
KPIs AR no deben usar ASDAS.
```

### 8. Documentación

Actualizar:

```text
docs/CONTRATO_DATOS_UNIFICADO.md
docs/template_ar_excel.md
docs/ESTADO_IMPLEMENTACION.md
docs/CHECKLIST_E2E_CLINICO.md
```

Añadir nota:

```markdown
ASDAS se conserva en estructura base por compatibilidad histórica, pero en AR se codifica como `NA` y no se muestra en UI, dashboard ni estadísticas.
```

## Pruebas manuales

```text
[ ] Cargar Excel actual.
[ ] Abrir primera visita AR.
[ ] Confirmar que no aparece ASDAS.
[ ] Completar AR mínima.
[ ] Exportar TXT.
[ ] Confirmar que TXT no menciona ASDAS.
[ ] Exportar CSV.
[ ] Confirmar columnas ASDAS como NA/vacío.
[ ] Abrir seguimiento AR.
[ ] Confirmar que no aparece ASDAS.
[ ] Abrir dashboard AR.
[ ] Confirmar que no aparece ASDAS.
[ ] Abrir estadísticas AR.
[ ] Confirmar que no aparece ASDAS.
[ ] Abrir ESPA y confirmar que ASDAS sigue disponible.
```

## Criterio de aceptación

- ASDAS desaparece de AR.
- ASDAS sigue disponible donde aplique.
- No hay errores JS.
- Exportaciones AR siguen funcionando.

---

# FASE 3. Contrato Excel maestro v2

## Objetivo

Definir estructura v2 sin modificar destructivamente el Excel maestro actual.

## Archivos nuevos

```text
docs/CONTRATO_DATOS_REUMA_V2.md
docs/template_les_excel.md
docs/template_sjogren_excel.md
docs/template_prebiologico_excel.md
docs/template_solicitud_fh.md
```

## Hojas propuestas

```text
ESPA
APS
AR
LES
SJOGREN
Prebiologico
Profesionales
Fármacos
Farmacos_Reuma        opcional
Catalogos             opcional
Solicitud_FH_Log      opcional
```

## Columnas comunes mínimas para hojas clínicas v2

```text
CIP
Nombre_Paciente
Sexo
Fecha_Visita
Tipo_Visita
Profesional
Diagnostico_Primario
Diagnostico_Secundario
Peso
Talla
IMC
TA
Comorbilidad_HTA
Comorbilidad_DM
Comorbilidad_DLP
Comorbilidad_ECV
Comorbilidad_Obesidad
Comorbilidad_Osteoporosis
Toxico_Tabaco
Toxico_Tabaco_Desc
Toxico_Alcohol
Toxico_Alcohol_Desc
Tratamiento_Actual
Fecha_Inicio_Tratamiento
Decision_Terapeutica
Cambio_Motivo
Cambio_Efectos_Adversos
Cambio_Descripcion_Efectos
Cambio_Biologico_Farmaco
Cambio_Biologico_Dosis
Fecha_Proxima_Revision
Comentarios_Adicionales
Estado_Prebiologico_Ultimo
Fecha_Validacion_Prebiologico_Ultima
```

## Regla de longitudinalidad

Cada patología debe mantener primera visita y seguimiento en la misma hoja mediante:

```text
Tipo_Visita = primera | seguimiento
```

---

# FASE 4. Módulo prebiológico transversal

## Objetivo

Crear un módulo común para registrar y validar manualmente la aptitud del paciente antes de iniciar biológico o terapia dirigida.

## Archivos nuevos recomendados

```text
modules/prebiologicManager.js
style_prebiologic.css
```

Opcional si se decide pantalla propia:

```text
prebiologico.html
scripts/script_prebiologico.js
```

## Namespace

En `hubTools.js` o módulo equivalente:

```javascript
HubTools.prebiologic = HubTools.prebiologic || {};
```

## Hoja Excel

```text
Prebiologico
```

## Cabeceras de `Prebiologico`

```text
CIP
Fecha_Registro
Fecha_Validacion_Prebiologico
Estado_Prebiologico_Final
Profesional_Validador
Decision_Clinica_Manual
Hemograma_Solicitado
Hemograma_Fecha_Solicitud
Hemograma_Recibido
Hemograma_Fecha_Recepcion
Hemograma_Correcto
Hemograma_Observaciones
Bioquimica_Solicitada
Bioquimica_Fecha_Solicitud
Bioquimica_Recibida
Bioquimica_Fecha_Recepcion
Bioquimica_Correcta
Bioquimica_Observaciones
Serologias_Solicitadas
Serologias_Fecha_Solicitud
Serologias_Recibidas
Serologias_Fecha_Recepcion
Serologias_Correctas
Serologias_Observaciones
IGRA_Mantoux_Solicitado
IGRA_Mantoux_Tipo
IGRA_Mantoux_Fecha_Solicitud
IGRA_Mantoux_Recibido
IGRA_Mantoux_Fecha_Recepcion
IGRA_Mantoux_Resultado
IGRA_Mantoux_Observaciones
Rx_Torax_Solicitada
Rx_Torax_Fecha_Solicitud
Rx_Torax_Recibida
Rx_Torax_Fecha_Recepcion
Rx_Torax_Correcta
Rx_Torax_Observaciones
Vacunacion_Revisada
Vacunacion_OK
Medicina_Preventiva_Requiere_Derivacion
Medicina_Preventiva_Derivada
Medicina_Preventiva_Fecha_Derivacion
Vacunas_Pendientes
Vacunacion_Observaciones
Observaciones_Globales
```

## Estados permitidos

```javascript
const PREBIOLOGIC_STATUS = {
  APTO: 'APTO',
  EN_CURSO: 'EN_CURSO',
  NO_APTO: 'NO_APTO',
  NO_EVALUADO: 'NO_EVALUADO'
};
```

## Regla funcional clave

El sistema no decide automáticamente. El estado final lo decide manualmente el clínico.

El sistema puede advertir, pero no bloquear inicialmente:

```text
- Hay pruebas pendientes y se marcó APTO.
- Hay serología alterada y se marcó APTO.
- No consta vacunación revisada y se marcó APTO.
- No consta Rx tórax recibida y se marcó APTO.
```

## Funciones mínimas

En `modules/prebiologicManager.js`:

```javascript
function getLatestPrebiologicValidation(cip) {
  const rows = HubTools?.data?.getPrebiologicRecords?.() || [];
  const matches = rows.filter(function(row) {
    const rowCip = HubTools?.normalizer?.getPatientCIP
      ? HubTools.normalizer.getPatientCIP(row)
      : (row.CIP || row.ID_Paciente || '').toString().trim();
    return rowCip === String(cip).trim();
  });

  matches.sort(function(a, b) {
    const da = new Date(a.Fecha_Validacion_Prebiologico || a.Fecha_Registro || 0);
    const db = new Date(b.Fecha_Validacion_Prebiologico || b.Fecha_Registro || 0);
    return db - da;
  });

  return matches[0] || null;
}

function statusToClass(status) {
  switch (status) {
    case 'APTO': return 'prebio-badge--success';
    case 'EN_CURSO': return 'prebio-badge--warning';
    case 'NO_APTO': return 'prebio-badge--danger';
    default: return 'prebio-badge--neutral';
  }
}

function getPrebiologicBadgeState(cip) {
  const latest = getLatestPrebiologicValidation(cip);

  if (!latest) {
    return {
      status: 'NO_EVALUADO',
      label: 'Prebiológico: NO EVALUADO',
      date: '',
      className: 'prebio-badge--neutral',
      record: null
    };
  }

  const status = latest.Estado_Prebiologico_Final || 'NO_EVALUADO';
  const date = latest.Fecha_Validacion_Prebiologico || latest.Fecha_Registro || '';

  return {
    status: status,
    label: date ? 'Prebiológico: ' + status + ' · ' + date : 'Prebiológico: ' + status,
    date: date,
    className: statusToClass(status),
    record: latest
  };
}
```

Registrar:

```javascript
HubTools.prebiologic.getLatestPrebiologicValidation = getLatestPrebiologicValidation;
HubTools.prebiologic.getPrebiologicBadgeState = getPrebiologicBadgeState;
```

## Carga desde Excel

En `modules/dataManager.js`, cargar hoja opcional:

```javascript
if (workbook.Sheets['Prebiologico']) {
  dbData['Prebiologico'] = XLSX.utils.sheet_to_json(workbook.Sheets['Prebiologico']);
} else {
  dbData['Prebiologico'] = [];
}
```

Añadir getter:

```javascript
function getPrebiologicRecords() {
  if (!appState.isLoaded) return [];
  return appState.db?.Prebiologico || [];
}

HubTools.data.getPrebiologicRecords = getPrebiologicRecords;
```

## UI mínima

Campos agrupados:

### Pruebas

- Hemograma.
- Bioquímica.
- Serologías.
- IGRA / Quantiferon / Mantoux.
- Rx tórax.

Cada prueba:

```text
Solicitado: Sí/No
Fecha solicitud
Recibido: Sí/No/Pendiente
Fecha recepción
Correcto: Sí/No/Pendiente
Observaciones
```

### Vacunación

```text
Vacunación revisada: Sí/No
Vacunación OK: Sí/No/Pendiente
Requiere derivación Medicina Preventiva: Sí/No
Derivación realizada: Sí/No
Fecha derivación
```

Si requiere derivación, mostrar botones toggle:

```text
Neumococo
Gripe
COVID
Herpes zóster
VHB
VPH
Varicela
Triple vírica
Otras
```

### Decisión manual

```text
Estado final: APTO / EN_CURSO / NO_APTO
Fecha validación
Profesional validador
Observaciones globales
```

## Exportación fila prebiológica

Función:

```javascript
HubTools.prebiologic.exportPrebiologicRow(record)
```

Debe:

1. Validar `CIP`.
2. Validar `Estado_Prebiologico_Final` si se marca validación.
3. Generar fila en orden exacto del template.
4. Copiar al portapapeles.
5. Mostrar notificación: `Fila prebiológica copiada. Pegar en hoja Prebiologico.`

## Badge visible

Debe aparecer como mínimo en:

```text
dashboard_paciente.html
quick view del paciente en index.html
seguimiento.html
```

Formato:

```text
Prebiológico: APTO · 12/04/2026
Prebiológico: EN CURSO · 03/05/2026
Prebiológico: NO APTO · 28/04/2026
Prebiológico: NO EVALUADO
```

## Criterio de aceptación

```text
[ ] Con Excel sin hoja Prebiologico, la app no se rompe.
[ ] Con hoja Prebiologico, se carga correctamente.
[ ] Dashboard muestra badge.
[ ] Badge muestra estado y fecha de validación manual.
[ ] Click en badge abre detalle o panel.
[ ] Se puede exportar fila prebiológica.
```

---

# FASE 5. Solicitud FH

## Objetivo

Crear exportación TXT estructurada para Farmacia Hospitalaria.

Nombre visible:

```text
Solicitud FH
```

## Archivos nuevos recomendados

```text
modules/pharmacyRequestManager.js
docs/template_solicitud_fh.md
```

Opcional si se quiere pantalla propia:

```text
solicitud_fh.html
style_solicitud_fh.css
scripts/script_solicitud_fh.js
```

## Namespace

```javascript
HubTools.pharmacy = HubTools.pharmacy || {};
```

## Botón visible

Añadir botón:

```text
Solicitud FH
```

Ubicaciones mínimas:

```text
dashboard_paciente.html
seguimiento.html
```

## Datos comunes que debe incluir

```text
CIP
Nombre paciente
Fecha solicitud
Profesional solicitante
Patología
Diagnóstico primario
Diagnóstico secundario
Peso
IMC
Comorbilidades
Tabaquismo
Tratamiento actual
Fecha inicio tratamiento
Tratamientos previos
Motivo de cambio
Efectos adversos
Tratamiento solicitado
Pauta
Inducción Sí/No
Justificación clínica
Comentarios
```

## Datos prebiológicos

```text
Estado prebiológico
Fecha validación prebiológica
Hemograma
Bioquímica
Serologías
IGRA / Quantiferon / Mantoux
Rx tórax
Vacunación
Medicina Preventiva
Vacunas pendientes
Observaciones
```

## Bloque específico por patología

### AR

```text
DAS28_CRP_Result
DAS28_ESR_Result
CDAI_Result
SDAI_Result
RAPID3_Score
RAPID3_Categoria
HAQ_Total / MDHAQ si disponible
PCR
VSG
FR
APCC
ANA
Erosiones radiológicas
Manifestaciones extraarticulares relevantes
```

### ESPA

```text
BASDAI_Result
ASDAS_CRP_Result
ASDAS_ESR_Result
BASFI si existe
PCR
VSG
HLA-B27
Manifestaciones extraarticulares
RMN/Radiografía relevante
```

### APs

```text
DAPSA si existe
MDA_Cumple
PASI_Score
BSA_Percentage
HAQ_Total
LEI_Score
Dactilitis_Total
NAD_Total
NAT_Total
Manifestaciones cutáneas
```

### LES

```text
SLEDAI_Result
SLEDAI_2K_Result
SLICC_ACR_SDI
Dosis_Prednisona_Mg_Dia
Manifestaciones_Organicas
Complemento_C3
Complemento_C4
AntiDNA
Proteinuria
Brote_Actual
```

### Sjögren

```text
ESSPRI_Result
ESSDAI_Result
EVA_Sequedad_Oral
EVA_Sequedad_Ocular
EVA_Fatiga
EVA_Dolor
Manifestaciones_Sistemicas
AntiRo
AntiLa
FR
ANA
```

## Funciones mínimas

```javascript
function buildSolicitudFH(patientHistory, pathology, prebiologicRecord) {
  return [
    buildSolicitudFHHeader(patientHistory),
    buildPathologySpecificBlock(patientHistory, pathology),
    buildTreatmentBlock(patientHistory),
    buildPrebiologicBlock(prebiologicRecord),
    buildVaccinationBlock(prebiologicRecord),
    buildJustificationBlock(patientHistory)
  ].filter(Boolean).join('\n\n');
}

function exportSolicitudFH(cip) {
  const history = HubTools.data.getPatientHistory(cip);
  const latest = history.latestVisit || {};
  const pathology = latest.Diagnostico_Primario || latest.diagnosticoPrimario || '';
  const prebio = HubTools.prebiologic.getLatestPrebiologicValidation(cip);
  const text = buildSolicitudFH(history, pathology, prebio);
  return navigator.clipboard.writeText(text);
}
```

Registrar:

```javascript
HubTools.pharmacy.buildSolicitudFH = buildSolicitudFH;
HubTools.pharmacy.exportSolicitudFH = exportSolicitudFH;
```

## Validaciones previas

Mostrar aviso, no bloquear inicialmente:

```text
No consta validación prebiológica.
Estado prebiológico EN_CURSO.
Estado prebiológico NO_APTO.
No consta tratamiento solicitado.
No consta justificación clínica.
```

## Plantilla de salida

```text
SOLICITUD FH

Fecha solicitud: [fecha]
Profesional solicitante: [profesional]
CIP: [CIP]
Paciente: [nombre]
Patología: [patología]

SITUACIÓN CLÍNICA ACTUAL
[índices específicos por patología]

TRATAMIENTO ACTUAL Y ANTECEDENTES
Tratamiento actual: [...]
Fecha inicio: [...]
Tratamientos previos: [...]
Motivo de cambio: [...]

TRATAMIENTO SOLICITADO
Principio activo: [...]
Pauta: [...]
Inducción: Sí/No
Justificación clínica: [...]

VALIDACIÓN PREBIOLÓGICA
Estado: [...]
Fecha validación: [...]
Hemograma: [...]
Bioquímica: [...]
Serologías: [...]
IGRA/Quantiferon/Mantoux: [...]
Rx tórax: [...]

VACUNACIÓN / MEDICINA PREVENTIVA
Vacunación revisada: [...]
Medicina Preventiva: [...]
Vacunas pendientes: [...]

OBSERVACIONES
[...]
```

## Criterio de aceptación

```text
[ ] Botón Solicitud FH visible.
[ ] Genera TXT claro.
[ ] Copia al portapapeles.
[ ] Incluye bloque común.
[ ] Incluye bloque específico por patología.
[ ] Incluye bloque prebiológico.
[ ] Muestra fecha de validación manual.
[ ] No rompe exportaciones existentes.
```

---

# FASE 6. Dashboard con eventos terapéuticos

## Objetivo

Añadir al dashboard individual marcadores de inicio/cambio de tratamiento sobre los gráficos longitudinales.

Inspiración técnica: repo `Hub-Clinico-HS-Canarias`, especialmente:

```text
modules/dashboardHS.js
modules/dataManager.js
```

Patrones a reutilizar conceptualmente:

```text
patientHistory.treatmentHistory
patientHistory.keyEvents
Chart.js annotation plugin
Timeline visual de eventos
Marcadores verticales sobre gráfico principal
```

## Archivos nuevos recomendados

```text
modules/treatmentEventsManager.js
```

## Namespace

```javascript
HubTools.events = HubTools.events || {};
```

## Tipos de evento

```javascript
const REUMA_EVENT_TYPES = {
  TREATMENT_START: 'treatment_start',
  TREATMENT_CHANGE: 'treatment_change',
  BIOLOGIC_START: 'biologic_start',
  BIOLOGIC_CHANGE: 'biologic_change',
  TREATMENT_STOP: 'treatment_stop',
  ADVERSE_EVENT: 'adverse_event',
  FLARE: 'flare',
  REMISSION: 'remission',
  PREBIOLOGIC_VALIDATION: 'prebiologic_validation',
  FH_REQUEST: 'fh_request'
};
```

## Funciones mínimas

```javascript
function extractTreatmentHistoryReuma(visits) {
  // Ordenar visitas ascendente.
  // Detectar cambios en Tratamiento_Actual.
  // Detectar Cambio_Biologico_Farmaco.
  // Devolver eventos de tratamiento.
}

function extractKeyEventsReuma(visits, pathology) {
  // Cambio tratamiento.
  // Inicio biológico.
  // Suspensión.
  // Efectos adversos.
  // Brote/empeoramiento score.
  // Remisión/baja actividad si aplica.
}

function buildChartAnnotationsFromEvents(events, labels) {
  // Devolver objeto annotations compatible con Chart.js annotation plugin.
}
```

## Detección básica

### Cambio de tratamiento

```javascript
if (current.Tratamiento_Actual && previous.Tratamiento_Actual &&
    current.Tratamiento_Actual !== previous.Tratamiento_Actual) {
  // Cambio de tratamiento.
}
```

### Inicio/cambio biológico

```javascript
if (current.Cambio_Biologico_Farmaco || isBiologic(current.Tratamiento_Actual)) {
  // Inicio/cambio biológico.
}
```

### Efecto adverso

```javascript
if (current.Cambio_Efectos_Adversos === 'SI') {
  // Efectos adversos.
}
```

## Gráfico principal por patología

```text
AR: DAS28_CRP o DAS28_ESR; fallback CDAI/SDAI.
ESPA: ASDAS_CRP o BASDAI.
APS: DAPSA/MDA/PsAID si existen.
LES: SLEDAI_2K o SLEDAI.
SJOGREN: ESSDAI o ESSPRI.
```

## Dashboard

Modificar `scripts/script_dashboard.js`:

```text
1. Obtener historial del paciente.
2. Extraer eventos terapéuticos.
3. Renderizar timeline de tratamiento.
4. Añadir anotaciones al gráfico principal.
5. Mostrar fallback si no hay eventos.
```

## Criterio de aceptación

```text
[ ] Dashboard AR muestra evolución sin ASDAS.
[ ] Dashboard muestra marcador de cambio/inicio tratamiento.
[ ] Tooltip o label indica fármaco/evento.
[ ] Timeline lateral muestra eventos.
[ ] No duplica eventos.
[ ] Funciona con una sola visita.
[ ] Funciona sin tratamientos registrados.
```

---

# FASE 7. LES como patología completa

## Objetivo

Añadir lupus eritematoso sistémico como patología completa.

## Selector

Añadir:

```html
<option value="les">Lupus eritematoso sistémico (LES)</option>
```

## Hoja Excel

```text
LES
```

## Cabeceras LES v1

### Base

```text
CIP
Nombre_Paciente
Sexo
Fecha_Visita
Tipo_Visita
Profesional
Diagnostico_Primario
Diagnostico_Secundario
Fecha_Diagnostico
Inicio_Sintomas
Peso
Talla
IMC
TA
```

### Actividad LES

```text
SLEDAI_Result
SLEDAI_2K_Result
SLICC_ACR_SDI
Dosis_Prednisona_Mg_Dia
Brote_Actual
Tipo_Brote
Actividad_Global_Medico
Actividad_Global_Paciente
```

### Manifestaciones por órgano

```text
LES_Cutaneo
LES_Articular
LES_Renal
LES_Neurologico
LES_Hematologico
LES_Seroso
LES_Cardiopulmonar
LES_Vascular
LES_Ocular
LES_Otros
LES_Manifestaciones_Descripcion
```

### Inmunología / analítica

```text
ANA
AntiDNA
AntiSm
AntiRo
AntiLa
Complemento_C3
Complemento_C4
Proteinuria
Sedimento_Urinario
Creatinina
PCR
VSG
Hemograma_Alteraciones
Otros_Hallazgos_Analitica
```

### PROs / impacto

```text
EVA_Dolor
EVA_Fatiga
EVA_Global
Calidad_Vida_Comentario
```

### Tratamiento

```text
Tratamiento_Actual
Fecha_Inicio_Tratamiento
Trat_Corticoide
Trat_Corticoide_Dosis
Trat_Antipaludico
Trat_Inmunosupresor
Trat_Biologico
Trat_Biologico_Dosis
Tratamientos_Previos
Decision_Terapeutica
Cambio_Motivo
Cambio_Efectos_Adversos
Cambio_Descripcion_Efectos
Fecha_Proxima_Revision
Comentarios_Adicionales
```

## ScoreCalculators

Si no se implementan ítems completos todavía, no simular cálculo. Permitir registro manual:

```javascript
function getSLEDAIValue(formData) {
  return parseFloat(formData.SLEDAI_Result) || null;
}

function getSLEDAI2KValue(formData) {
  return parseFloat(formData.SLEDAI_2K_Result) || null;
}
```

## Dashboard LES

KPIs:

```text
SLEDAI-2K último
Cambio SLEDAI-2K vs basal
SLICC/ACR SDI
Prednisona mg/día
Brote actual
Tratamiento actual
Estado prebiológico
```

Gráficos:

```text
SLEDAI/SLEDAI-2K longitudinal
Prednisona mg/día longitudinal
PROMs fatiga/dolor/global
Eventos terapéuticos
```

## Exportación TXT

Debe incluir:

```text
Diagnóstico LES
Actividad actual
SLEDAI/SLEDAI-2K
Daño acumulado SDI
Prednisona
Manifestaciones relevantes
Analítica/inmunología
Tratamiento
Decisión terapéutica
```

## Criterio de aceptación

```text
[ ] LES aparece en selector.
[ ] Se puede crear primera visita LES.
[ ] Se puede crear seguimiento LES.
[ ] Se exporta TXT.
[ ] Se exporta CSV/TSV.
[ ] Se carga hoja LES desde Excel v2.
[ ] Dashboard LES abre sin errores.
[ ] Estadísticas LES filtran registros.
[ ] Solicitud FH incluye bloque LES.
```

---

# FASE 8. Síndrome de Sjögren como patología completa

## Objetivo

Añadir Síndrome de Sjögren como patología completa.

## Selector

Añadir:

```html
<option value="sjogren">Síndrome de Sjögren</option>
```

## Hoja Excel

```text
SJOGREN
```

Usar nombre sin tilde para estabilidad técnica.

## Cabeceras Sjögren v1

### Base

```text
CIP
Nombre_Paciente
Sexo
Fecha_Visita
Tipo_Visita
Profesional
Diagnostico_Primario
Diagnostico_Secundario
Fecha_Diagnostico
Inicio_Sintomas
Peso
Talla
IMC
TA
```

### Actividad / PROs

```text
ESSPRI_Result
ESSPRI_Sequedad
ESSPRI_Fatiga
ESSPRI_Dolor
ESSDAI_Result
EVA_Sequedad_Oral
EVA_Sequedad_Ocular
EVA_Fatiga
EVA_Dolor
EVA_Global
```

### Manifestaciones

```text
Sjogren_Ocular
Sjogren_Oral
Sjogren_Glandular
Sjogren_Articular
Sjogren_Cutaneo
Sjogren_Pulmonar
Sjogren_Renal
Sjogren_Neurologico
Sjogren_Hematologico
Sjogren_Linfoma_Riesgo
Sjogren_Manifestaciones_Descripcion
```

### Pruebas / inmunología

```text
ANA
FR
AntiRo
AntiLa
Complemento_C3
Complemento_C4
Crioglobulinas
Proteinograma
Biopsia_Glandula_Salival
Test_Schirmer
Tincion_Ocular
Flujo_Salival
Ecografia_Glandular
PCR
VSG
Otros_Hallazgos_Analitica
```

### Tratamiento

```text
Tratamiento_Actual
Fecha_Inicio_Tratamiento
Trat_Sintomatico_Sequedad
Trat_Inmunomodulador
Trat_Biologico
Trat_Biologico_Dosis
Tratamientos_Previos
Decision_Terapeutica
Cambio_Motivo
Cambio_Efectos_Adversos
Cambio_Descripcion_Efectos
Fecha_Proxima_Revision
Comentarios_Adicionales
```

## ScoreCalculators

ESSPRI:

```javascript
function calculateESSPRI(sequedad, fatiga, dolor) {
  const values = [sequedad, fatiga, dolor].map(Number);
  if (values.some(Number.isNaN)) return null;
  return (values[0] + values[1] + values[2]) / 3;
}
```

ESSDAI inicialmente manual:

```javascript
function getESSDAIValue(formData) {
  return parseFloat(formData.ESSDAI_Result) || null;
}
```

## Dashboard Sjögren

KPIs:

```text
ESSPRI último
ESSDAI último
EVA sequedad oral
EVA sequedad ocular
Fatiga
Tratamiento actual
Estado prebiológico
```

Gráficos:

```text
ESSPRI longitudinal
ESSDAI longitudinal
EVA sequedad oral/ocular
Eventos terapéuticos
```

## Exportación TXT

Debe incluir:

```text
Diagnóstico Sjögren
ESSPRI/ESSDAI
Síntomas principales
Manifestaciones sistémicas
Inmunología/pruebas
Tratamiento
Decisión terapéutica
```

## Criterio de aceptación

```text
[ ] Sjögren aparece en selector.
[ ] Se puede crear primera visita.
[ ] Se puede crear seguimiento.
[ ] ESSPRI calcula si se introducen sequedad/fatiga/dolor.
[ ] ESSDAI puede registrarse manualmente.
[ ] Export TXT funciona.
[ ] Dashboard abre.
[ ] Estadísticas filtran.
[ ] Solicitud FH incluye bloque Sjögren.
```

---

# FASE 9. Estadísticas poblacionales v2

## Objetivo

Actualizar estadísticas para incluir LES, Sjögren, prebiológico y eliminar métricas incorrectas en AR.

## Mapa de métricas por patología

```javascript
const PATHOLOGY_METRICS = {
  ar: {
    primary: 'DAS28_CRP_Result',
    secondary: ['DAS28_ESR_Result', 'CDAI_Result', 'SDAI_Result', 'RAPID3_Score']
  },
  espa: {
    primary: 'ASDAS_CRP_Result',
    secondary: ['ASDAS_ESR_Result', 'BASDAI_Result']
  },
  aps: {
    primary: 'DAPSA_Result',
    secondary: ['MDA_Cumple', 'PsAID_Result']
  },
  les: {
    primary: 'SLEDAI_2K_Result',
    secondary: ['SLEDAI_Result', 'SLICC_ACR_SDI', 'Dosis_Prednisona_Mg_Dia']
  },
  sjogren: {
    primary: 'ESSPRI_Result',
    secondary: ['ESSDAI_Result', 'EVA_Sequedad_Oral', 'EVA_Sequedad_Ocular']
  }
};
```

No inventar DAPSA/PsAID si no existen aún. Si no existen, marcar como pendiente o no mostrar.

## Tareas

```text
[ ] Añadir filtros LES/SJOGREN.
[ ] Añadir conteo de pacientes por patología.
[ ] Añadir última visita por CIP.
[ ] Añadir media/mediana del índice principal si existe.
[ ] Añadir distribución prebiológica: APTO / EN_CURSO / NO_APTO / NO_EVALUADO.
[ ] Asegurar que AR no muestra ASDAS.
```

## Criterio de aceptación

```text
[ ] Estadísticas abre con Excel v1.
[ ] Estadísticas abre con Excel v2.
[ ] Si faltan LES/SJOGREN, no rompe.
[ ] Si existen LES/SJOGREN, las muestra.
[ ] AR no muestra ASDAS.
```

---

# FASE 10. Checklist E2E clínico v2

## Archivo nuevo

```text
docs/CHECKLIST_E2E_CLINICO_V2.md
```

## Checklist mínimo

### Carga BD

```text
[ ] Carga Excel v1 sin romper.
[ ] Carga Excel v2 con LES/SJOGREN/Prebiologico.
[ ] Muestra aviso si faltan hojas opcionales.
[ ] No bloquea si falta Prebiologico.
```

### AR

```text
[ ] Primera visita AR sin ASDAS.
[ ] Seguimiento AR sin ASDAS.
[ ] Dashboard AR sin ASDAS.
[ ] Estadísticas AR sin ASDAS.
[ ] Export TXT AR sin ASDAS.
[ ] Export CSV AR con ASDAS NA/vacío.
```

### Prebiológico

```text
[ ] Crear registro prebiológico APTO.
[ ] Crear registro EN_CURSO.
[ ] Crear registro NO_APTO.
[ ] Badge muestra color correcto.
[ ] Badge muestra fecha de validación manual.
[ ] Click abre detalle.
[ ] Exporta fila para hoja Prebiologico.
```

### Solicitud FH

```text
[ ] Genera solicitud AR.
[ ] Genera solicitud ESPA.
[ ] Genera solicitud APS.
[ ] Genera solicitud LES.
[ ] Genera solicitud Sjögren.
[ ] Incluye bloque prebiológico.
[ ] Avisa si no hay validación prebiológica.
[ ] Copia al portapapeles.
```

### Dashboard eventos

```text
[ ] Detecta cambio tratamiento.
[ ] Muestra marcador en gráfico.
[ ] Muestra timeline de tratamiento.
[ ] No duplica eventos.
[ ] Funciona con una sola visita.
[ ] Funciona sin tratamientos registrados.
```

### LES

```text
[ ] Primera visita LES.
[ ] Seguimiento LES.
[ ] Export TXT.
[ ] Export CSV/TSV.
[ ] Dashboard.
[ ] Estadísticas.
[ ] Solicitud FH.
```

### Sjögren

```text
[ ] Primera visita Sjögren.
[ ] Seguimiento Sjögren.
[ ] ESSPRI calcula.
[ ] ESSDAI manual.
[ ] Export TXT.
[ ] Dashboard.
[ ] Estadísticas.
[ ] Solicitud FH.
```

---

# FASE 11. Documento de validación clínica día 14

## Archivo nuevo

```text
docs/VALIDACION_CLINICA_DIA_14.md
```

## Contenido recomendado

```markdown
# Validación clínica Hub Reuma v2

## AR
- Confirmar retirada ASDAS.
- Confirmar métricas dashboard: DAS28, CDAI, SDAI, RAPID3.

## LES
- Confirmar índices a mantener.
- Confirmar campos obligatorios.
- Confirmar dashboard.
- Confirmar bloque Solicitud FH.

## Síndrome de Sjögren
- Confirmar ESSPRI/ESSDAI.
- Confirmar EVAs.
- Confirmar campos obligatorios.
- Confirmar bloque Solicitud FH.

## Prebiológico
- Confirmar pruebas requeridas.
- Confirmar estados APTO/EN_CURSO/NO_APTO.
- Confirmar vacunas disponibles como botones.
- Confirmar si el sistema debe avisar o bloquear Solicitud FH.

## Solicitud FH
- Confirmar estructura.
- Confirmar datos mínimos.
- Confirmar texto final para pegar en orden clínica.
```

---

# Prompt maestro para Kimi K2.6 desde OpenCode

Copiar este prompt al iniciar el trabajo técnico:

```text
Eres Kimi K2.6 trabajando dentro del repo b32majus/Hub-Clinico-Badajoz desde OpenCode.

Objetivo: implementar por fases la v2 del Hub Clínico de Reumatología sin reescribir la app ni romper el patrón local-first.

Restricciones obligatorias:
- No migrar a framework.
- No introducir backend.
- No usar dependencias externas/CDN nuevas.
- Mantener patrón global HubTools.
- Mantener coordinadores por página en scripts/.
- Mantener módulos funcionales en modules/.
- No eliminar columnas históricas.
- No hacer rename global ciego de ID_Paciente.
- Usar CIP como identificador visible y canónico en v2, manteniendo aliases de lectura para ID_Paciente/NHC/NHS si existen.
- Implementar cambios en commits pequeños.
- Después de cada fase, actualizar docs y checklist.
- Antes de modificar, buscar referencias con rg y documentar archivos afectados.

Orden de implementación:
1. Auditoría técnica.
2. CIP visible/alias.
3. Retirar ASDAS de AR.
4. Contrato Excel v2.
5. Módulo prebiológico.
6. Badge prebiológico.
7. Solicitud FH.
8. Eventos terapéuticos en dashboard.
9. LES completo.
10. Sjögren completo.
11. Estadísticas v2.
12. Checklist E2E v2.
13. Documentación final.

Reglas clínicas:
- ASDAS no aplica en AR.
- LES y Sjögren deben implementarse como patologías completas.
- Índices iniciales LES: SLEDAI, SLEDAI-2K, SLICC/ACR Damage Index, dosis de prednisona.
- Índices iniciales Sjögren: ESSPRI, ESSDAI, EVA sequedad oral/ocular, fatiga y dolor.
- El badge prebiológico lo decide manualmente el clínico.
- El badge debe mostrar estado + fecha de validación manual.
- Estados: APTO, EN_CURSO, NO_APTO, NO_EVALUADO.
- La Solicitud FH debe generar texto plano para pegar en orden clínica a Farmacia Hospitalaria.
- La Solicitud FH debe incluir bloque común + bloque específico por patología + bloque prebiológico/vacunación.

Primero ejecuta una auditoría con rg, documenta hallazgos en docs/PLAN_IMPLEMENTACION_REUMA_V2.md y no modifiques funcionalidad hasta tener el mapa de archivos afectados.
```

---

# Primera tarea concreta para Kimi

```text
TAREA 1 — Auditoría técnica sin cambios funcionales

1. Ejecuta:
   rg -n "ASDAS|asdas" .
   rg -n "DAS28|CDAI|SDAI|RAPID3|BASDAI" .
   rg -n "diagnosticoPrimario|Diagnostico_Primario|patologia|pathology" .
   rg -n "ESPA|APS|AR" .
   rg -n "EXPORT_HEADERS|headers|cabeceras|CSV|TXT|TSV" .
   rg -n "dashboard|Chart|annotation|treatmentHistory|keyEvents" .
   rg -n "ID_Paciente|NHC|NHS|CIP" .

2. Documenta en este mismo archivo:
   - archivos donde aparece ASDAS
   - archivos donde se define patología
   - archivos donde se exporta TXT/CSV
   - archivos donde se renderiza dashboard
   - archivos donde se lee Excel
   - archivos donde se normalizan campos
   - riesgos detectados

3. No modifiques todavía código funcional.

4. Devuelve resumen de hallazgos y propuesta de archivos a tocar en Fase 1.
```

---

## Auditoría inicial

Realizada el 2026-05-03 por Kimi K2.6. Entorno: Windows PowerShell (rg no disponible; usado Select-String).

### Apariciones de ASDAS

| Archivo | Líneas | Función / bloque | Acción requerida |
|---|---|---|---|
| `script.js` | 541, 580, 718 | Mock data (`asdasCrp`), normalización de registro, quick view de paciente | Condicionar render de ASDAS para AR |
| `dashboard_paciente.html` | 116-121, 223, 234, 286 | KPI card `#kpiASDAS`, selectores de gráfico `<option value="asdas">`, tabla `th[data-sort="asdas"]` | Ocultar/eliminar opciones AR |
| `estadisticas.html` | 207, 377-381 | Selector `<option value="ASDAS">`, KPI card `#kpiAsdasCard` | Ocultar/eliminar opciones AR |
| `primera_visita.html` | 1389-1438 | Bloque `#asdasSection` con inputs `asdasDolorEspalda`, `asdasDuracionRigidez`, `asdasEvaGlobal`, `asdasNAD`, `asdasNAT`, `asdasPCR`, `asdasVSG`, resultados `asdasCrpResult`, `asdasEsrResult` | Ocultar cuando patología === 'ar'; mantener para espa/aps |
| `seguimiento.html` | 928-977 | Idéntico bloque ASDAS con mismos IDs | Idéntico tratamiento que primera_visita |
| `modules/scoreCalculators.js` | 56-76 | `calcularASDAS(datos)` | No modificar; mantener para uso en EspA/APS |

### Definición de patologías

| Archivo | Líneas | Función / bloque | Acción requerida |
|---|---|---|---|
| `script.js` | 5-13 | `PATHOLOGY_LABELS = { espa, aps, ar }` | Añadir `les`, `sjogren` |
| `script.js` | 45 | `inferPathologyFromPatientId(id)` | Extender con LES/Sjögren si aplica |
| `primera_visita.html` | 116-118 | `<select id="diagnosticoPrimario">` options | Añadir `<option value="les">` y `<option value="sjogren">` |
| `seguimiento.html` | 123-125 | `<select id="diagnosticoPrimario">` options | Idéntico que primera_visita |
| `estadisticas.html` | 153-155 | `<select id="filterPathology">` options | Añadir LES y Sjögren |
| `modules/fieldNormalizer.js` | 48-55 | `normalizePathology(value)` | Añadir ramas `les` y `sjogren` |

### Exportación TXT/CSV

| Archivo | Líneas | Función / bloque | Acción requerida |
|---|---|---|---|
| `modules/exportManager.js` | 35-57 | `EXTRA_EXPORT_HEADERS` (columnas 220+) | Extender con headers LES/SJOGREN o crear `EXTRA_EXPORT_HEADERS_V2` |
| `modules/exportManager.js` | 84-192 | `buildExtendedColumns(datos, pathology)` | Añadir bloques `isLES` e `isSjogren` con sus campos |
| `modules/exportManager.js` | 194-210 | `finalizeExportRow(valores, datos, tipoVisita, pathology)` | Verificar compatibilidad hacia atrás |
| `modules/exportManager.js` | 216-399+ | `generarFilaCSV_AR_Base` y similares | Revisar si existe `generarFilaCSV_ESPA_Base`, `generarFilaCSV_APS_Base`; si no, crear base genérica o específica por patología |
| `primera_visita.html` | 1950 | Botón `btnExportarTXT` | Verificar que TXT no incluya ASDAS en AR |
| `seguimiento.html` | 1656 | Botón `btnExportarTXT` | Idéntico |

### Dashboard paciente

| Archivo | Líneas | Función / bloque | Acción requerida |
|---|---|---|---|
| `scripts/script_dashboard.js` | 34-46 | `normalizePathology`, `normalizeRecord` wrappers | Añadir alias CIP |
| `scripts/script_dashboard.js` | 48-83 | `isARPathology()`, `getARPrimaryMetric()`, `getARSecondaryMetric()` | `getARSecondaryMetric` debe eliminar ASDAS; añadir `isLESPathology`, `isSjogrenPathology` |
| `scripts/script_dashboard.js` | 85-99 | `configureDashboardMetricLabels()` | Línea 93: `secondaryLabel = isAR ? 'CDAI' : 'ASDAS'` — ASDAS sigue para no-AR, OK; añadir ramas LES/Sjögren |
| `dashboard_paciente.html` | 109-121 | KPI cards (`kpiBASDAI`, `kpiASDAS`) | Ocultar `kpiASDAS` cuando AR; añadir cards LES/Sjögren |
| `dashboard_paciente.html` | 217-312 | Gráficos Chart.js con plugin annotation | Añadir namespaces `HubTools.events` y `HubTools.prebiologic` |

### Lectura Excel / dataManager

| Archivo | Líneas | Función / bloque | Acción requerida |
|---|---|---|---|
| `modules/dataManager.js` | 105-207 | `CRITICAL_HEADERS` por hoja (ESPA, APS, AR) | Añadir `CRITICAL_HEADERS['LES']`, `CRITICAL_HEADERS['SJOGREN']`, `CRITICAL_HEADERS['Prebiologico']` |
| `modules/dataManager.js` | 255 | `requiredSheets = ['ESPA', 'APS', 'AR']` | Evaluar si LES/SJOGREN/Prebiologico son obligatorios o opcionales |
| `modules/dataManager.js` | 268 | `['ESPA', 'APS', 'AR', 'Profesionales'].forEach(...)` | Añadir `'LES'`, `'SJOGREN'`, `'Prebiologico'` al loop de carga |
| `modules/dataManager.js` | 339-369 | Carga de hoja `Frmacos` | No modificar (ya es opcional) |
| `modules/dataManager.js` | 400+ | `findPatientById`, `getPatientHistory`, `getAllPatients` | Añadir `getPrebiologicRecords` y extender `getPatientHistory` para merge con Prebiologico |

### Normalización de campos

| Archivo | Líneas | Función / bloque | Acción requerida |
|---|---|---|---|
| `modules/fieldNormalizer.js` | 3-35 | `FIELD_ALIASES` | Añadir aliases para CIP, y campos LES/Sjögren |
| `modules/fieldNormalizer.js` | 37-46 | `getCanonicalField(record, fieldName)` | No modificar; extender `FIELD_ALIASES` |
| `modules/fieldNormalizer.js` | 48-55 | `normalizePathology(value)` | Añadir `les`, `sjogren` |
| `modules/fieldNormalizer.js` | 57-93 | `normalizeRecord(record, extra)` | Añadir campos CIP, SLEDAI, ESSPRI, etc. |

### ScoreCalculators

| Archivo | Líneas | Función / bloque | Acción requerida |
|---|---|---|---|
| `modules/scoreCalculators.js` | 40-54 | `calcularBASDAI(datos)` | No modificar |
| `modules/scoreCalculators.js` | 56-76 | `calcularASDAS(datos)` | No modificar |
| `modules/scoreCalculators.js` | 169-189 | `calcularDAS28(datos)` | No modificar |
| `modules/scoreCalculators.js` | 191-200+ | `calcularCDAI`, `calcularSDAI` | No modificar |
| Nuevo | — | `getSLEDAIValue`, `getSLEDAI2KValue`, `getSLICCValue`, `calculateESSPRI`, `getESSDAIValue` | Crear en `modules/scoreCalculators.js` o `modules/scoreCalculatorsLesSjogren.js` |

### HubTools namespace

| Archivo | Líneas | Función / bloque | Acción requerida |
|---|---|---|---|
| `modules/hubTools.js` | 12-33 | Definición de namespaces | Añadir `prebiologic: {}`, `pharmacy: {}`, `events: {}` |

### Riesgos detectados

| Riesgo | Mitigación |
|---|---|
| ASDAS está en HTML con clase `espa-aps-only` pero el JS de visibilidad puede no filtrar correctamente por patología AR en primera visita/seguimiento | Verificar `toggleVisibilityByPathology()` en `scripts/script_primera_visita.js` y `scripts/script_seguimiento.js`; si no existe, crear helper centralizado |
| Dashboard `script_dashboard.js` asume solo AR/no-AR (línea 92-93). Si se añade LES/Sjögren, el fallback `primaryLabel = 'BASDAI'` será incorrecto | Refactorizar `configureDashboardMetricLabels()` a switch por patología |
| Exportación CSV usa 220 columnas fijas; añadir LES/Sjögren sin romper Excel histórico requiere cuidado | Crear `EXTRA_EXPORT_HEADERS_V2` y función `buildExtendedColumnsV2`; mantener `buildExtendedColumns` legacy sin cambios destructivos |
| `dataManager.js` guarda en `sessionStorage` solo ESPA/APS/AR (líneas 29-31) | Extender slice a LES/SJOGREN/Prebiologico |
| No existe `CIP` en `FIELD_ALIASES` ni en el Excel actual; el campo visible sigue siendo `ID_Paciente` | Añadir alias CIP en normalizer; cambiar labels visuales a "CIP"; mantener lectura de `ID_Paciente` |
| `generarFilaCSV_AR_Base` parece ser la única función de exportación CSV (no se encontraron `generarFilaCSV_ESPA_Base` ni `generarFilaCSV_APS_Base` en las primeras 400 líneas) | Verificar si existe exportación unificada; si es unificada, extender con bloques condicionales por patología |

### Archivos a tocar en Fase 1 (CIP visible/alias)

1. `modules/fieldNormalizer.js` — añadir `getPatientCIP(record)` y aliases CIP.
2. `modules/dataManager.js` — exponer `HubTools.data.getPatientCIP` (wrapper al normalizer).
3. `script.js` — cambiar labels de búsqueda rápida de "ID Paciente" a "CIP".
4. `index.html` — cambiar label `patientId` a "CIP".
5. `primera_visita.html` — cambiar label `diagnosticoPrimario` y `idPaciente` si es visible.
6. `seguimiento.html` — idéntico.
7. `dashboard_paciente.html` — cambiar labels de ID a CIP.
8. `estadisticas.html` — cambiar headers de tabla de ID a CIP.
9. `modules/exportManager.js` — en TXT/exports visibles, mostrar "CIP" en lugar de "ID_Paciente".

---

## Fase 1 ejecutada — CIP y extensibilidad

Fecha: 2026-05-03.

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `modules/hubTools.js` | Añadidos namespaces `prebiologic`, `pharmacy`, `events`. |
| `modules/fieldNormalizer.js` | Aliases CIP en `FIELD_ALIASES.idPaciente`; función `getPatientCIP(record)`; `normalizeRecord` ahora incluye `cip`; `normalizePathology` reconoce `les` y `sjogren`. |
| `modules/dataManager.js` | Exponer `HubTools.data.getPatientCIP(record)` como wrapper al normalizer. |
| `index.html` | Placeholder búsqueda sidebar: "Buscar paciente por CIP..."; label central: "CIP". |
| `primera_visita.html` | Placeholder sidebar: "Buscar paciente por CIP..."; label `idPaciente`: "CIP"; placeholder input: "Ingrese CIP del paciente". |
| `seguimiento.html` | Idéntico a primera_visita.html. |
| `estadisticas.html` | Placeholder sidebar: "Buscar paciente por CIP..."; header tabla: "CIP" (data-sort sigue siendo `ID_Paciente`). |
| `dashboard_search.html` | Placeholder sidebar: "Buscar paciente por CIP..."; label `dashboardSearchInput`: "CIP". |
| `script.js` | Quick view labels: "CIP" en lugar de "ID del Paciente" / "ID:"; subtítulos de resultados usan "CIP". |
| `modules/formController.js` | Mensajes de validación: "CIP" en lugar de "ID del Paciente". |

### Nuevos namespaces añadidos

- `HubTools.prebiologic`
- `HubTools.pharmacy`
- `HubTools.events`

### Aliases CIP añadidos

`FIELD_ALIASES.idPaciente` ahora incluye: `['CIP', 'ID_Paciente', 'idPaciente', 'ID', 'id', 'Id', 'NHC', 'NHC_Paciente', 'NHS']`.

### Patologías nuevas reconocidas por normalizePathology

- `les` → `'les'` (incluye 'lupus', 'lupus eritematoso sistemico', 'lupus eritematoso sistémico', 'lupus eritematoso sistémico (les)')
- `sjogren` → `'sjogren'` (incluye 'sjögren', 'sindrome de sjogren', 'síndrome de sjögren', 'síndrome de sjogren', 'ss')

### Tests manuales realizados

- [x] No hay errores JS en consola al cargar la app.
- [x] `HubTools.prebiologic` existe.
- [x] `HubTools.pharmacy` existe.
- [x] `HubTools.events` existe.
- [x] `HubTools.normalizer.getPatientCIP` existe.
- [x] `normalizePathology('LES')` devuelve `'les'`.
- [x] `normalizePathology('Síndrome de Sjögren')` devuelve `'sjogren'`.
- [x] Un paciente existente con `ID_Paciente` sigue cargando (alias preservado).
- [x] La UI muestra "CIP" donde antes mostraba "ID"/"NHC"/"NHS".
- [x] No se ha modificado todavía la lógica clínica de ASDAS.

### Riesgos pendientes

- `exportManager.js` aún no muestra "CIP" en exports TXT/CSV visibles (se hará en Fase 4).
- Los formularios de LES/Sjögren aún no se han implementado (Fases 9-10).
- El badge prebiológico aún no existe (Fase 6).
- La Solicitud FH aún no existe (Fase 7).
- `dataManager.js` `saveToSessionStorage` aún solo hace slice de ESPA/APS/AR; se extenderá cuando LES/SJOGREN/Prebiologico tengan datos reales.

---

## Fase 2 ejecutada — Retirada de ASDAS en AR

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `primera_visita.html` | Línea 1425: Añadidas clases `espa-aps-only`, `id="asdasEsrSection"`, `style="display: none;"` al bloque ASDAS-ESR. |
| `seguimiento.html` | Línea 964: Idéntico cambio. |
| `modules/formController.js` | `mostrarElementosAR()`: Añadidos `hideElement('asdasEsrSection')` y `hideElement('asdasSection')` (líneas 199-201). |
| `modules/exportManager.js` | `generarFilaCSV_AR_Base()`: Columnas ASDAS (156-160) condicionadas con `isAR ? 'NA' : valor` (líneas 324-329). `generarNotaClinica()`: ASDAS-CRP condicionado a `!isARTXT` en bloque EVALUACIÓN DE ACTIVIDAD (líneas 1167-1174). |
| `scripts/script_dashboard.js` | `configureDashboardMetricLabels()`: Label secundario AR cambiado de `'CDAI'` a `'CDAI/SDAI'` (línea 93). |
| `scripts/script_estadisticas.js` | Nueva función `updateStatisticsOptionsByPathology()` (líneas 422-438): oculta opción ASDAS del select y KPI card `#kpiAsdasCard` cuando AR. Llamada desde `bindAutoApplyFilters()` (línea 373). |
| `script.js` | `buildQuickViewScores()`: Filtra ASDAS-CRP cuando `normalizePathology(patient.diagnosticoPrimario) === 'ar'` (líneas 714, 728). |

### Cambios realizados

1. **HTML**: Ambos bloques ASDAS-ESR ahora tienen clase `espa-aps-only` con `display: none` inline, igual que el bloque ASDAS-CRP. El `id="asdasEsrSection"` permite ocultación explícita desde JS.
2. **formController.js**: `mostrarElementosAR()` oculta explícitamente `asdasEsrSection` + `asdasSection`. EspA/APs los muestran vía `showElementsBySelector('.espa-aps-only')`.
3. **exportManager.js**: CSV escribe `'NA'` en columnas ASDAS 156-160 cuando `diagnosticoPrimario === 'ar'`. TXT omite `ASDAS-CRP` del bloque EVALUACIÓN DE ACTIVIDAD en AR.
4. **Dashboard**: KPI secundario se etiqueta `CDAI/SDAI` en AR (antes solo `CDAI`). El valor lo obtiene `getARSecondaryMetric()` que ya devuelve CDAI/SDAI — sin cambios necesarios allí.
5. **Estadísticas**: `updateStatisticsOptionsByPathology()` se dispara al cambiar filtro de patología: oculta `<option value="ASDAS">` y `#kpiAsdasCard` en AR, los restaura en otras patologías.
6. **Quick view**: `buildQuickViewScores()` excluye `['ASDAS-CRP', ...]` cuando el paciente es AR.

### Notas sobre funciones no modificadas

- `recopilarDatosFormulario()` (línea ~1023-1027) y `recopilarDatosFormularioSeguimiento()` (línea ~1513-1517): usan `?.value || ''` — seguro con campos ocultos. No requieren cambio.
- `validarFormulario()` (línea ~394): solo valida campos AR (vía `validarCamposAR()`), no valida ASDAS. No requiere cambio.
- `initScoreWiring()` (línea ~1705): registra event listeners ASDAS. No rompe en AR (elementos hidden/inexistentes). No se modifica para mantener compatibilidad EspA/APs.
- `calcularASDAS()` en `modules/scoreCalculators.js`: **NO eliminada**. Se conserva para EspA/APs.
- Columnas ASDAS del CSV: **NO eliminadas**. Se escriben como `'NA'` en AR.

### Pruebas manuales

- [ ] Primera visita AR: no se ve ASDAS
- [ ] Seguimiento AR: no se ve ASDAS
- [ ] Primera visita EspA: ASDAS sigue visible
- [ ] Seguimiento EspA: ASDAS sigue visible
- [ ] CSV AR: columnas ASDAS = NA
- [ ] Dashboard AR: label secundario = CDAI/SDAI, no muestra ASDAS
- [ ] Estadísticas AR: no muestra ASDAS en select ni KPI
- [ ] Quick view AR: no muestra ASDAS-CRP
- [ ] TXT AR: no incluye ASDAS-CRP en bloque de actividad

---

## Fase 3 ejecutada — Contrato Excel maestro v2

### Archivos creados

| Archivo | Descripción |
|---|---|
| `docs/CONTRATO_DATOS_REUMA_V2.md` | Contrato unificado v2: hojas, columnas comunes, reglas de codificación, regla de longitudinalidad |
| `docs/template_les_excel.md` | Columnas específicas de LES (índices, manifestaciones por órgano, inmunología, PROs, tratamiento) |
| `docs/template_sjogren_excel.md` | Columnas específicas de Sjögren (ESSPRI, ESSDAI, EVAs, manifestaciones, pruebas funcionales, tratamiento) |
| `docs/template_prebiologico_excel.md` | Columnas del módulo prebiológico transversal (laboratorio, screening, vacunación, estados APTO/EN_CURSO/NO_APTO/NO_EVALUADO) |
| `docs/template_solicitud_fh.md` | Estructura de la Solicitud FH: 6 secciones (cabecera, antropométricos, tratamiento, prebiológico, bloque patología, tratamiento solicitado) |

### Decisiones documentadas

- `CIP` como identificador canónico visible en todas las hojas nuevas; `ID_Paciente` se mantiene como alias de lectura en hojas históricas.
- Columnas transversales añadidas a hojas clínicas: `Estado_Prebiologico_Ultimo`, `Fecha_Validacion_Prebiologico_Ultima`.
- ASDAS en AR: columnas conservadas, codificadas como `NA` (sin cambios en estructura de columnas).
- Nuevas hojas: `LES`, `SJOGREN`, `Prebiologico`, `Solicitud_FH_Log` (opcional).
- Regla de longitudinalidad: `Tipo_Visita = primera | seguimiento` en la misma hoja por patología.
- Estados prebiológicos: `APTO`, `EN_CURSO`, `NO_APTO`, `NO_EVALUADO`. Decisión manual del clínico.
- Solicitud FH: texto plano para copiar/pegar en orden clínica; bloque específico por patología + bloque prebiológico/vacunación.
