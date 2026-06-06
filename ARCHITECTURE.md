# Hub Clínico Badajoz — Arquitectura e Implementación

**Documento de memoria técnica** para entender cómo está codificada la app, qué módulos existen, cómo fluye la información y cómo se ha versionado el proyecto.

---

## 1. Versionado del proyecto

### v1 — Legacy local Reuma (main)

Versión previa a Reuma v2. Patologías: ESPA, APS, AR. Sin LES, Sjögren, prebiológico ni FH.

- Rama: `main` (etiquetada como `legacy-v1-main-antes-reuma-v2`)
- README y ARCHITECTURE originales reflejan este estado.

### v2.0 — Reuma multipatología (base actual)

Rama viva actual. Incluye AR, EspA, APs, LES, Sjögren, prebiológico/vacunación, Solicitud FH, eventos, dashboard y estadísticas v2.

- Rama: `feature/reuma-v2-prebiologico-fh-les-sjogren`
- Contrato Excel v2 con 497 columnas por hoja clínica.
- Demo sintética poblacional.

### v2.1 — MVP interservicios (planificada)

Objetivo: demo funcional del 8 de julio. Incluye perfiles Reumatología, Enfermería, Farmacia; fuentes separadas; carga multiarchivo; visión longitudinal integrada.

- Rama: `release/mvp-luis-bravo-20260708`
- Enfermería y Farmacia aún en diseño funcional (no implementadas).

### v2.2 — Backend-ready / hardening (planificada)

Mejoras sobre la app actual sin romper el piloto: diccionario clínico, repository layer, validación de plantillas, configuración declarativa, separación demo/piloto.

### v3.0 — POC con backend real (futuro)

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Fastify (candidato)
- Base de datos: PostgreSQL/MySQL en OCI
- Modelo normalizado por dominios clínicos
- Seguridad real con roles y auditoría
- Preparado para capa FHIR/HL7 futura

---

## 2. Restricciones de diseño (v2.0 actual)

- App **local-first**, sin backend remoto.
- Sin instalación obligatoria (estáticos HTML/CSS/JS).
- Persistencia operativa en **Excel compartido** (`Hub_Clinico_Maestro.xlsx`).
- Compatibilidad con flujos **STIC** (sin dependencias de infraestructura compleja).
- **Sin autenticación ni seguridad real.** Los perfiles funcionales futuros controlan interfaz, no sustituyen autenticación/autorización.
- **Excel como fuente MVP.** No es la solución definitiva, es el mecanismo de persistencia del piloto.

---

## 3. Arquitectura de ejecución (v2.0)

- Patrón global por namespace `HubTools` (sin imports ES modules en runtime).
- Coordinadores por página en `scripts/`.
- Módulos funcionales en `modules/`.
- 3 dependencias CDN: SheetJS, Chart.js, jsPDF.

Namespaces principales:

| Namespace | Archivo | Propósito |
|-----------|---------|-----------|
| `HubTools.form` | `modules/formController.js` | Validación, adaptación por patología, recopilación/prellenado |
| `HubTools.scores` | `modules/scoreCalculators.js` | Cálculos clínicos |
| `HubTools.homunculus` | `modules/homunculus.js` | Homúnculo interactivo NAD/NAT/dactilitis |
| `HubTools.data` | `modules/dataManager.js` | Carga Excel, normalización y consultas |
| `HubTools.export` | `modules/exportManager.js` | TXT/CSV |
| `HubTools.utils` | `modules/utils.js` | Utilidades transversales |
| `HubTools.prebiologic` | `modules/prebiologicManager.js` | Bloque prebiológico v2 |
| `HubTools.pharmacyRequest` | `modules/pharmacyRequest.js` | Solicitud FH v2 |
| `HubTools.treatmentEvents` | `modules/treatmentEventsManager.js` | Eventos terapéuticos v2 |

---

## 4. Estructura funcional de pantallas (v2.0)

| Pantalla | Archivo HTML | Script asociado |
|----------|-------------|-----------------|
| Dashboard principal + búsqueda | `index.html` | `script.js` |
| Primera visita | `primera_visita.html` | `scripts/script_primera_visita.js` |
| Seguimiento | `seguimiento.html` | `scripts/script_seguimiento.js` |
| Dashboard paciente | `dashboard_paciente.html` | `scripts/script_dashboard.js` |
| Estadísticas | `estadisticas.html` | `scripts/script_estadisticas.js` |
| Búsqueda avanzada | `dashboard_search.html` | `scripts/script_dashboard_search.js` |
| Gestión fármacos | `manage_drugs.html` | `scripts/script_manage_drugs.js` |
| Gestión profesionales | `manage_professionals.html` | `scripts/script_manage_professionals.js` |

---

## 5. Flujo de datos real (v2.0)

1. Usuario carga `Hub_Clinico_Maestro.xlsx`.
2. `dataManager.loadDatabase()` parsea hojas: `AR`, `ESPA`, `APS`, `LES`, `SJOGREN`, `Fármacos`, `Profesionales`.
3. Se guarda estado en memoria y `sessionStorage` (caché ~4 MB; truncamiento si se excede).
4. Formularios generan:
   - TXT para historia clínica.
   - CSV de una fila para pegar en hoja de patología.
5. Dashboards consumen estado cargado, no el archivo en tiempo real.
6. Eventos terapéuticos se derivan de las visitas existentes.
7. Solicitud FH se genera como texto plano (no se persiste en Excel).

---

## 6. Implementación por patología (v2.0)

| Patología | Hoja Excel | Scores | Dashboard |
|-----------|-----------|--------|-----------|
| AR | `AR` | DAS28-VHS, DAS28-PCR, CDAI, SDAI, RAPID3 | Sí |
| EspA | `ESPA` | BASDAI, ASDAS-CRP | Sí |
| APs | `APS` | DAPSA, mNAPSI, BSA, PASI | Sí |
| LES | `LES` | SLEDAI-2K, SLICC | Sí |
| Sjögren | `SJOGREN` | ESSPRI, ESSDAI | Sí |

Cada patología tiene secciones específicas dentro de los HTML, controladas por `formController.js` mediante show/hide dinámico.

---

## 7. Datos y persistencia

### Regla operativa

La sesión trabaja con una copia cargada de la BD. Si otro profesional añade filas al Excel compartido, no se reflejan automáticamente. Requiere recarga manual de BD en la app.

### Lectura y escritura

- **Lectura cruzada:** cada módulo futuro podrá leer datos de otros módulos.
- **Escritura cruzada: NO.** Cada perfil escribe en su propia fuente física.
- En MVP, una app común con tres fuentes separadas (Reuma, Enfermería, Farmacia).
- Visión longitudinal integrada por CIP con eventos de múltiples orígenes.

---

## 8. Módulos futuros (v2.1 en adelante)

| Módulo | Estado | Fuente propia |
|--------|--------|---------------|
| Reumatología | ✅ Implementado v2.0 | `Hub_Clinico_Reuma_V2.xlsx` |
| Enfermería | 🟡 Diseño funcional — no implementado | `Hub_Enfermeria_Reuma_V1.xlsx` (planificado) |
| Farmacia Hospitalaria | 🟡 Diseño funcional — no implementado | `Hub_Farmacia_Reuma_V1.xlsx` (planificado) |

Los perfiles funcionales controlan interfaz, formularios y dashboards visibles. **No sustituyen autenticación real ni permisos robustos.**

---

## 9. Transición arquitectónica planificada

```text
v2.0 (actual)              v2.1 (interservicios)        v2.2 (hardening)          v3.0 (backend real)
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐       ┌──────────────────────┐
│ HTML/CSS/JS      │  →    │ HTML/CSS/JS      │   →    │ HTML/CSS/JS      │  →    │ React + TypeScript   │
│ Excel como BD    │       │ 3 fuentes Excel   │        │ Excel +          │       │ Base datos real      │
│ Sin roles        │       │ Perfiles funcion. │        │ repository layer │       │ Seguridad real       │
│ Sin tests        │       │ Visión integrada  │        │ Validación       │       │ API REST             │
│ CDN dependencias │       │ Demo multiperfil  │        │ Separación demo  │       │ Tests automatizados  │
└──────────────────┘       └──────────────────┘        └──────────────────┘       └──────────────────────┘
```

---

## 10. Riesgos y deuda técnica conocida (v2.0)

1. **Acoplamiento Excel-UI:** nombres de hoja y columna exactos. Cambios rompen en silencio.
2. **HTML masivos:** `primera_visita.html` (205 KB), `seguimiento.html` (183 KB).
3. **formController.js (127 KB):** crecimiento orgánico sin separación por patología.
4. **Sin tests automatizados:** riesgo alto de regresión.
5. **sessionStorage como BD:** límite 5-10 MB, volátil.
6. **Dependencias CDN:** no funciona sin conexión.
7. **Riesgo de desalineación por edición manual de Excel.**
8. **Dependencia de nomenclatura homogénea de fármacos/profesionales.**

---

## 11. Checklist de cambios futuros

Cuando se modifique una funcionalidad clínica:
1. Captura/validación (`formController`).
2. Exportación (`exportManager`).
3. Lectura/normalización (`dataManager`).
4. Visualización (`script_dashboard`, `script_estadisticas`, quick view).
5. Documentación (`README`, ARCHITECTURE, contrato, estado de implementación).
6. Contrato de datos (`docs/CONTRATO_DATOS_REUMA_V2.md`).
7. Plantillas/cabeceras Excel.

---

*Última actualización: 2026-06-05.*
