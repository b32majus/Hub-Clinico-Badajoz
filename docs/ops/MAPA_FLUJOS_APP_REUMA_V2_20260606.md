# Mapa de Flujos — App Reuma v2

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Proyecto:** Hub Clínico Reuma / PROMueve Extremadura  

---

## 1. Flujo general: Excel → App → Salidas

```mermaid
flowchart TD
    A[Excel Reuma v2<br/>Hub_Clinico_Reuma_V2.xlsx] --> B[Carga en navegador<br/>SheetJS + index.html]
    B --> C[Normalización<br/>fieldNormalizer.js]
    C --> D[Base de datos en memoria<br/>appState.db en dataManager.js]
    D --> E[sessionStorage<br/>caché hasta 4 MB]
    D --> F[Formularios<br/>primera_visita / seguimiento]
    D --> G[Dashboard paciente]
    D --> H[Estadísticas]
    D --> I[Solicitud FH]
    D --> J[Eventos terapéuticos]
```

---

## 2. Entrada de datos

### 2.1 Carga de Excel

| Paso | Archivo | Descripción |
|------|---------|-------------|
| 1 | `index.html` | Usuario selecciona archivo `.xlsx` o carga demo |
| 2 | `script.js` + `dataManager.js` | SheetJS lee el libro completo |
| 3 | `dataManager.js` | Por cada hoja (`ESPA`, `APS`, `AR`, `LES`, `SJOGREN`, `Profesionales`, `Farmacos`): normaliza nombre, parsea filas |
| 4 | `fieldNormalizer.js` | Normaliza alias: `ID_Paciente` → `CIP`, compatibilidad LES/Sjögren |
| 5 | `dataManager.js` | Guarda en `appState.db` + `sessionStorage` |

**Entrada:** Archivo `.xlsx` con hojas clínicas de 497 columnas.
**Salida:** `appState.db` (objeto con arrays por patología).

### 2.2 Búsqueda de paciente

```mermaid
flowchart LR
    A[index.html] --> B[Búsqueda por CIP/nombre]
    B --> C{¿Paciente existe?}
    C -- Sí --> D[Seleccionar: visita / dashboard / estadísticas]
    C -- No --> E[Mensaje: no encontrado]
    D --> F[Redirigir a página correspondiente con ?cip=X]
```

---

## 3. Formularios (primera_visita / seguimiento)

```mermaid
flowchart TD
    A[URL con ?cip=X] --> B[script_primera_visita.js<br/>o script_seguimiento.js]
    B --> C[Cargar datos paciente desde appState.db]
    C --> D[formController.js: mostrar/ocultar<br/>secciones según patología]
    D --> E[Usuario rellena formulario]
    E --> F[scoreCalculators.js: cálculos en tiempo real]
    F --> G[Guardado: botón Guardar]
    G --> H[dataManager.js: actualiza appState.db]
    H --> I[sessionStorage: actualiza caché]
    H --> J[Opcional: exportar a Excel]
```

### Archivos implicados por patología

| Patología | FormController show/hide | Scores |
|-----------|------------------------|--------|
| AR | Sección AR visible | DAS28-VHS, DAS28-PCR, CDAI, SDAI |
| APs | Sección APs visible | DAPSA, mNAPSI, BSA, PASI |
| EspA | Sección EspA visible | BASDAI, ASDAS-CRP |
| LES | Sección LES visible | SLEDAI-2K, SLICC |
| Sjögren | Sección Sjögren visible | ESSPRI, ESSDAI |

El control de visibilidad se hace mediante `showElement()`/`hideElement()` en `formController.js`, activado por el diagnóstico primario del paciente.

---

## 4. Dashboard paciente

```mermaid
flowchart LR
    A[Dashboard paciente<br/>?cip=X] --> B[script_dashboard.js]
    B --> C[dataManager.js: datos del paciente]
    B --> D[treatmentEventsManager.js: derivar eventos]
    C --> E[Mostrar scores, badge prebiológico,<br/>última visita]
    D --> F[Chart.js: timeline eventos]
    E --> G[Botones: editar visita, estadísticas, FH]
    F --> G
```

**Eventos terapéuticos** se derivan de las visitas existentes (cambios de tratamiento, scores, etc.) — no son un registro independiente.

---

## 5. Estadísticas

```mermaid
flowchart LR
    A[Estadísticas] --> B[script_estadisticas.js]
    B --> C[dataManager.js: todas las patologías]
    C --> D[Filtrar por patología / período]
    D --> E[Calcular KPIs]
    E --> F[Chart.js: scatter, barras]
    E --> G[Tablas resumen]
```

KPIs: nº pacientes, nº visitas, scores medios, distribución por actividad, evolución temporal.

---

## 6. Solicitud FH

```mermaid
flowchart LR
    A[Botón Solicitud FH<br/>en formulario o dashboard] --> B[pharmacyRequest.js]
    B --> C[Recopilar: datos paciente,<br/>fármaco, dosis, indicación]
    C --> D[Generar texto plano estructurado]
    D --> E[Copiar a portapapeles]
    D --> F[Opcional: descargar PDF con jsPDF]
```

**No hay receptor.** La solicitud se copia a portapapeles para que el reumatólogo la pegue donde corresponda. No hay módulo de Farmacia que la reciba automáticamente.

---

## 7. Prebiológico / Vacunación

```mermaid
flowchart LR
    A[formController.js: sección prebiológico<br/>embebida en visita] --> B[prebiologicManager.js]
    B --> C[Estado: SI/NO/NA/Pendiente]
    B --> D[Fecha validación]
    C --> E[Badge en dashboard: persistente]
    C --> F[Columna Excel: Estado_Prebiologico_Final]
    C --> G[sessionStorage: fallback]
```

---

## 8. Demo sintética

```mermaid
flowchart LR
    A[generate_mock_data.py] --> B[data/Hub_Clinico_Maestro_V2_DEMO.xlsx]
    B --> C[Cargar como Excel normal<br/>desde index.html]
    D[modules/mockPatients.js] --> E[Datos demo para dashboard]
    F[modules/mockDashboardData.js] --> G[Datos demo para estadísticas]
```

---

## 9. Puntos de integración futura (Enfermería / Farmacia)

| Punto | Flujo actual | Posible integración |
|-------|-------------|---------------------|
| Carga Excel | Un solo archivo Reuma v2 | Carga multiarchivo: Reuma + Enfermería + Farmacia |
| Timeline | Solo eventos derivados de Reuma | Mezclar eventos de Reuma + Enfermería + Farmacia |
| Dashboard | Datos de Reuma | Pestañas o secciones por perfil |
| Solicitud FH | Copia a portapapeles | Módulo de Farmacia que recibe y gestiona |
| sessionStorage | Caché única Reuma | Namespace o claves separadas por módulo |
| appState.db | Un solo `db` | `db.reuma`, `db.enfermeria`, `db.farmacia` |

> **Nota:** Estos son puntos de conexión identificados, no diseños cerrados. Requieren definición con Sil/Cora antes de implementar.
