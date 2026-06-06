# Inventario Técnico — App Reuma v2

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Proyecto:** Hub Clínico Reuma / PROMueve Extremadura  
**Propósito:** Documentar la estructura técnica actual de la app para orientar futuras integraciones (Enfermería, Farmacia)

---

## 1. Estructura de archivos

```
/
├── index.html                 # Pantalla de inicio / búsqueda de pacientes
├── primera_visita.html        # Formulario de primera visita (205 KB — el más pesado)
├── seguimiento.html           # Formulario de seguimiento (183 KB)
├── dashboard_paciente.html    # Dashboard individual con timeline (23 KB)
├── dashboard_search.html      # Búsqueda avanzada (5 KB)
├── estadisticas.html          # Estadísticas multipatología (31 KB)
├── manage_drugs.html          # Gestión de catálogo de fármacos (9 KB)
├── manage_professionals.html  # Gestión de catálogo de profesionales (9 KB)
│
├── script.js                  # Lógica global /共通 (51 KB)
│
├── style.css                  # Estilos base (48 KB)
├── style_dashboard.css        # Estilos dashboard (27 KB)
├── style_estadisticas.css     # Estilos estadísticas (30 KB)
├── style_manage.css           # Estilos gestión (7 KB)
├── style_primera_visita.css   # Estilos formulario primera visita (49 KB)
├── style_seguimiento.css      # Estilos formulario seguimiento (26 KB)
│
├── modules/
│   ├── hubTools.js            # Namespace global HubTools (6 KB)
│   ├── dataManager.js         # Carga/caché/normalización de datos Excel (91 KB)
│   ├── formController.js      # Controlador de formularios (127 KB — el más pesado)
│   ├── fieldNormalizer.js     # Normalización canónica de campos
│   ├── exportManager.js       # Exportación CSV/TXT
│   ├── scoreCalculators.js    # Calculadoras de scores clínicos
│   ├── prebiologicManager.js  # Módulo prebiológico v2
│   ├── pharmacyRequest.js     # Solicitud FH v2
│   ├── treatmentEventsManager.js  # Eventos terapéuticos v2
│   ├── customSelect.js        # Selectores personalizados UI
│   ├── homunculus.js          # Homúnculo interactivo
│   ├── mockDashboardData.js   # Datos demo para dashboard
│   ├── mockPatients.js        # Pacientes demo
│   └── utils.js               # Utilidades varias
│
├── scripts/
│   ├── script_dashboard.js    # Lógica dashboard paciente
│   ├── script_estadisticas.js # Lógica estadísticas
│   ├── script_primera_visita.js  # Lógica primera visita
│   ├── script_seguimiento.js  # Lógica seguimiento
│   ├── script_dashboard_search.js  # Búsqueda
│   ├── script_manage_drugs.js # Gestión fármacos
│   ├── script_manage_professionals.js  # Gestión profesionales
│   ├── check_pre_release.js   # Validación pre-release
│   └── generate_demo_db.py    # Generador BD demo (Python)
│
├── create_excel.py            # Generador Excel maestro (Python)
├── generate_mock_data.py      # Generador datos mock (Python, 33 KB)
│
├── data/
│   └── Hub_Clinico_Maestro_V2_DEMO.xlsx  # Excel demo
│
├── Hub_Clinico_Maestro.xlsx   # Excel maestro (144 KB)
│
└── docs/                      # Documentación
```

---

## 2. Dependencias y librerías

La app **no usa npm, bundlers ni build system**. Es HTML/CSS/JS vanilla cargado directamente desde archivos. Sin embargo, sí depende de tres librerías externas cargadas desde CDN en las cabeceras HTML:

| Recurso | Propósito |
|---------|-----------|
| `SheetJS (xlsx.js)` — CDN | Lectura de archivos Excel en el navegador |
| `Chart.js` — CDN | Gráficos en dashboard y estadísticas |
| `jsPDF` — CDN | Generación de PDF (Solicitud FH) |

Todas las dependencias se cargan desde CDN en las cabeceras HTML. La app **no funciona offline** sin carga previa de estas librerías.

---

## 3. Carga de datos Excel

Flujo:

1. Usuario selecciona archivo `.xlsx` o `.xls` desde `index.html`.
2. `SheetJS` lee el libro completo en el navegador.
3. `dataManager.js` procesa cada hoja por nombre canónico (`ESPA`, `APS`, `AR`, `LES`, `SJOGREN`, `Profesionales`, `Farmacos`).
4. Los datos se cachean en `sessionStorage` (con límite de ~4 MB; si se excede, guarda versión truncada).
5. `appState.db` contiene objetos por hoja, cada uno un array de filas con columnas como keys.
6. `fieldNormalizer.js` normaliza alias: `ID_Paciente` → `CIP`, etc.

Archivos implicados: `index.html`, `modules/dataManager.js`, `modules/fieldNormalizer.js`, `script.js`.

---

## 4. Procesamiento por patología

| Patología | Hoja Excel | Formulario | Scores | Dashboard |
|-----------|-----------|------------|--------|-----------|
| AR (Artritis Reumatoide) | `AR` | `primera_visita.html` + `seguimiento.html` | DAS28-VHS, DAS28-PCR, CDAI, SDAI | Sí |
| APs (Artritis Psoriásica) | `APS` | `primera_visita.html` + `seguimiento.html` | DAPSA, mNAPSI, BSA, PASI | Sí |
| EspA (Espondilitis Axial) | `ESPA` | `primera_visita.html` + `seguimiento.html` | BASDAI, ASDAS-CRP | Sí |
| LES (Lupus) | `LES` | `primera_visita.html` + `seguimiento.html` | SLEDAI-2K, SLICC | Sí |
| Sjögren | `SJOGREN` | `primera_visita.html` + `seguimiento.html` | ESSPRI, ESSDAI | Sí |

Cada patología tiene secciones específicas dentro de los HTML grandes, controladas por `formController.js` mediante show/hide dinámico.

---

## 5. Bloque prebiológico / vacunación

- Embebido por visita como columnas v2 (desde columna 322 del Excel).
- Gestionado por `modules/prebiologicManager.js`.
- Almacena estado: `SI`, `NO`, `NA`, `Pendiente`.
- Badge visible en dashboard paciente.
- Persistencia principal en Excel (columna `Estado_Prebiologico_Final`, `Fecha_Validacion_Prebiologico`).
- Fallback en `sessionStorage`.

---

## 6. Solicitud FH (Farmacia Hospitalaria)

- Generada desde `modules/pharmacyRequest.js`.
- Salida de texto plano estructurado.
- Botón "Solicitud FH" en `primera_visita.html` y `seguimiento.html`.
- Copia a portapapeles como formato principal de salida.
- NO se persiste como hoja Excel (es derivada, no fuente).
- No existe un módulo de Farmacia que reciba y procese la solicitud.

---

## 7. Dashboard paciente

- Archivo: `dashboard_paciente.html`.
- Script: `scripts/script_dashboard.js`.
- Muestra: scores, timeline de eventos terapéuticos, badge prebiológico.
- Eventos terapéuticos: `modules/treatmentEventsManager.js` + Chart.js.

## 8. Estadísticas

- Archivo: `estadisticas.html`.
- Script: `scripts/script_estadisticas.js`.
- KPIs adaptativos por patología.
- Scatter plots y distribuciones.

---

## 9. Funciones/módulos críticos

| Módulo | Tamaño | Riesgo de modificación |
|--------|--------|----------------------|
| `modules/dataManager.js` | 91 KB | Alto — corazón de carga/normalización |
| `modules/formController.js` | 127 KB | Alto — show/hide masivo por patología |
| `modules/exportManager.js` | — | Medio — exportación |
| `modules/scoreCalculators.js` | — | Bajo — cálculos aislados |
| `modules/prebiologicManager.js` | — | Medio — bloque prebiológico |
| `modules/pharmacyRequest.js` | — | Bajo — texto plano |
| `modules/treatmentEventsManager.js` | — | Medio — eventos |

---

## 10. Puntos de impacto para Enfermería/Farmacia

### Enfermería
- **Nuevo HTML necesario** o integración en dashboard existente para registro de contactos.
- **Nuevo script** para lógica de enfermería (seguimiento, educación, vacunación).
- **Nuevo dataManager** o extensión del actual para cargar Excel de Enfermería.
- Timeline del dashboard paciente debe poder mezclar eventos de Reuma + Enfermería.
- Impacto en `treatmentEventsManager.js` para soportar múltiples orígenes.

### Farmacia
- **Receptor de Solicitud FH**: actualmente es texto plano a portapapeles. Habría que crear un módulo que la reciba y gestione.
- **Nuevo módulo de validación FH** con estados (validado, pendiente, etc.).
- **Nuevo dataManager** para cargar Excel de Farmacia.
- Timeline debe integrar validaciones y efectos adversos de Farmacia.

---

## 11. Deuda técnica visible

1. **HTML masivos**: `primera_visita.html` (205 KB) y `seguimiento.html` (183 KB) contienen lógica + markup + estilos embebidos. Difíciles de mantener.
2. **formController.js (127 KB)**: crecimiento orgánico sin separación por patología.
3. **Datos demo embebidos**: `modules/mockPatients.js` y `modules/mockDashboardData.js` mezclan lógica de demo con estructura de datos.
4. **Sin tests**: no hay suite de tests automatizados.
5. **SessionStorage como base de datos**: frágil, con límite de 5-10 MB.
6. **Dependencias CDN**: la app no funciona offline ni en intranet sin acceso a CDN.
7. **Mezcla de responsabilidades**: los HTML contienen lógica JS inline además de los scripts externos.

---

## 12. Próximos pasos técnicos sugeridos

1. Documentar flujos actuales (WO-004).
2. Crear checklist de smoke test (WO-005).
3. Separar datos demo de lógica real.
4. Preparar estructura para carga multiarchivo (Reuma + Enfermería + Farmacia).
5. Definir contrato de evento longitudinal común.
6. Evaluar migración de sessionStorage a IndexedDB para mayor capacidad.
