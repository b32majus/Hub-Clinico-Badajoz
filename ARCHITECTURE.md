# Hub Clínico Badajoz — Arquitectura e Implementación

**Documento de memoria técnica** para entender cómo está codificada la app, qué módulos existen, cómo fluye la información y cómo se ha versionado el proyecto.

> **Estado post-SES (2026-07-10)**
> Este documento es una **referencia técnica**, no una hoja de ruta. La fuente de verdad sobre estado, fases propuestas y decisiones pendientes es `docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`.
> Lo descrito aquí como **implementado** se refiere únicamente a evidencia funcional en la rama de preview `preview/demo-lunes-wo4-20260614` (`7486243` y posteriores descendientes). **No implica aprobación de producción, autorización institucional, integración real con JARA ni permiso para usar datos reales.** El estado actual del proyecto **no es producción**.

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
- Enfermería sigue en diseño funcional consolidado pendiente.
- Farmacia tiene una **preview funcional de demo** en `preview/demo-lunes-wo4-20260614`, no consolidada como producto institucional. Ver sección 8 y el roadmap post-SES.

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

## 2. Líneas de producto (estado resumido post-SES)

| Línea | Estado en este documento | Nota |
|---|---|---|
| **Reuma v2** | Implementado / canónico funcional | Base real del proyecto. Multipatología, scores, prebiológico, Solicitud FH, dashboard y estadísticas. |
| **Farmacia preview** | Preview implementado para demo / no productivo | Evidencia funcional en `preview/demo-lunes-wo4-20260614`: validación farmacoterapéutica, primera visita FH, seguimiento FH, dashboard paciente, importación Enfermería/Farmacia, catálogo CIMA/local, TXT JARA provisional y fila Excel FH provisional. |
| **Enfermería** | Parcial / diseño funcional consolidado pendiente | Existe plantilla Excel sintética de inicio de biológico, adaptador de importación y flujo hacia validación de Farmacia; el diseño funcional consolidado continúa pendiente. |
| **Hub general** | Propuesto / arquitectura transversal | Capa intermedia entre piloto local y arquitectura corporativa futura; no es un producto institucional aprobado. |

Esta tabla resume capacidades observables; no confiere estado de producción ni aprobación institucional. Para precisiones, ver `docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`.

---

## 3. Distinción demo / piloto / producción

Es obligatorio no confundir los tres niveles:

| Nivel | Definición | Estado del proyecto |
|---|---|---|
| **Demo** | Presentación controlada con datos sintéticos para validar comprensión y flujo. | Sí: preview funcional disponible. |
| **Piloto** | Uso controlado bajo condiciones, responsabilidades, soporte y límites definidos. | Propuesto; no activado como operación real. |
| **Producción** | Operación institucional con datos reales, seguridad, gobierno, soporte, auditoría, continuidad, DPO/STIC y aprobación formal. | **No alcanzado.** |

**El estado actual del proyecto no es producción.** Cualquier referencia a "implementado" en este documento describe capacidad técnica de demo/preview, no autorización productiva.

---

## 4. Restricciones de diseño (v2.0 actual)

- App **local-first**, sin backend remoto.
- Sin instalación obligatoria (estáticos HTML/CSS/JS).
- Persistencia operativa provisional en **Excel compartido** (`Hub_Clinico_Maestro.xlsx`) y, en Farmacia preview, en **sessionStorage** con datos sintéticos/importados.
- Compatibilidad con flujos **STIC** (sin dependencias de infraestructura compleja).
- **Sin autenticación ni seguridad real.** Los perfiles funcionales futuros controlan interfaz, no sustituyen autenticación/autorización.
- **Excel como fuente provisional.** No es la solución definitiva, es el mecanismo de persistencia del piloto.

---

## 5. Arquitectura de ejecución (v2.0)

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

## 6. Estructura funcional de pantallas (v2.0)

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

## 7. Flujo de datos real (v2.0)

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

## 8. Implementación por patología (v2.0)

| Patología | Hoja Excel | Scores | Dashboard |
|-----------|-----------|--------|-----------|
| AR | `AR` | DAS28-VHS, DAS28-PCR, CDAI, SDAI, RAPID3 | Sí |
| EspA | `ESPA` | BASDAI, ASDAS-CRP | Sí |
| APs | `APS` | DAPSA, mNAPSI, BSA, PASI | Sí |
| LES | `LES` | SLEDAI-2K, SLICC | Sí |
| Sjögren | `SJOGREN` | ESSPRI, ESSDAI | Sí |

Cada patología tiene secciones específicas dentro de los HTML, controladas por `formController.js` mediante show/hide dinámico.

---

## 9. Datos y persistencia

### Regla operativa

La sesión trabaja con una copia cargada de la BD. Si otro profesional añade filas al Excel compartido, no se reflejan automáticamente. Requiere recarga manual de BD en la app.

### Lectura y escritura

- **Lectura cruzada:** cada módulo futuro podrá leer datos de otros módulos.
- **Escritura cruzada: NO.** Cada perfil escribe en su propia fuente física.
- En MVP, una app común con tres fuentes separadas (Reuma, Enfermería, Farmacia).
- Visión longitudinal integrada por CIP con eventos de múltiples orígenes.

---

## 10. Módulos actuales y futuros (v2.1 en adelante)

| Módulo | Estado | Fuente propia |
|--------|--------|---------------|
| Reumatología | ✅ Implementado v2.0 | `Hub_Clinico_Reuma_V2.xlsx` |
| Enfermería | 🟡 Parcial — diseño funcional consolidado pendiente | `Hub_Enfermeria_Reuma_V1.xlsx` (planificado) |
| Farmacia Hospitalaria | 🟢 Preview funcional de demo implementado (no productivo) | `Hub_Farmacia_Reuma_V1.xlsx` (planificado); datos demo en sessionStorage/Excel operativo FH provisional |

La preview funcional de Farmacia vive en la rama `preview/demo-lunes-wo4-20260614` e incluye validación farmacoterapéutica, primera visita FH, seguimiento FH, dashboard paciente, importación de Excel de Enfermería y Farmacia, catálogo CIMA/local, copia TXT para JARA y copia de fila Excel FH. Esto demuestra **capacidad de demo**, no producción, integración real con JARA ni autorización institucional.

Los perfiles funcionales controlan interfaz, formularios y dashboards visibles. **No sustituyen autenticación real ni permisos robustos.**

---

## 11. Estado actual de la arquitectura de datos

| Aspecto | Estado actual |
|---|---|
| Backend corporativo | No implementado. |
| Persistencia operativa | Excel compartido y archivos estructurados provisionales; sessionStorage en Farmacia preview cuando aplica. |
| Datos | Exclusivamente sintéticos/demo; ningún dato real de pacientes. |
| Salida TXT JARA | Provisional: copia al portapapeles para facilitar documentación manual; no es integración ni escritura automática en JARA. |
| Salida Excel FH | Fila estructurada provisional para persistencia manual; no es backend corporativo. |
| Catálogo farmacológico | CIMA/local como asistente de selección/normalización; no decide datos terapéuticos. |

Ninguno de estos mecanismos es backend definitivo ni integración corporativa. La transición a backend real requiere modelo validado, soporte institucional y plan de datos aprobado.

---

## 12. Seguridad clínica y regla de no inferencia

- **Nunca inferir dosis, vía, pauta, presentación o inducción a partir del nombre del fármaco.**
- El catálogo asiste la selección y normalización, pero no decide datos terapéuticos.
- Si existe ausencia o ambigüedad, debe quedar visible y pendiente de confirmación profesional.
- Los gaps clínicos permanecen explícitos; no se completan automáticamente por el sistema.

---

## 13. Transición arquitectónica planificada

```text
v2.0 (actual)              v2.1 (interservicios)        v2.2 (hardening)          v3.0 (backend real)
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐       ┌──────────────────────┐
│ HTML/CSS/JS      │  →    │ HTML/CSS/JS      │   →    │ HTML/CSS/JS      │  →    │ React + TypeScript   │
│ Excel como BD    │       │ 3 fuentes Excel  │        │ Excel +          │       │ Base datos real      │
│ Sin roles        │       │ Perfiles funcion.│        │ repository layer │       │ Seguridad real       │
│ Sin tests        │       │ Visión integrada │        │ Validación       │       │ API REST             │
│ CDN dependencias │       │ Demo multiperfil │        │ Separación demo  │       │ Tests automatizados  │
└──────────────────┘       └──────────────────┘        └──────────────────┘       └──────────────────────┘
```

Todas las fases posteriores a v2.0 son propuestas sujetas a validación humana y condiciones institucionales. El roadmap post-SES es la fuente de verdad para fases propuestas.

---

## 14. Riesgos y deuda técnica conocida (v2.0)

1. **Acoplamiento Excel-UI:** nombres de hoja y columna exactos. Cambios rompen en silencio.
2. **HTML masivos:** `primera_visita.html` (205 KB), `seguimiento.html` (183 KB).
3. **formController.js (127 KB):** crecimiento orgánico sin separación por patología.
4. **Sin tests automatizados:** riesgo alto de regresión.
5. **sessionStorage como BD:** límite 5-10 MB, volátil.
6. **Dependencias CDN:** no funciona sin conexión.
7. **Riesgo de desalineación por edición manual de Excel.**
8. **Dependencia de nomenclatura homogénea de fármacos/profesionales.**

---

## 15. Objetivo de arquitectura futura (propuesto, no implementado)

La repository layer propuesta desacoplaría dominio y presentación del soporte físico. Sus interfaces conceptuales serían:

| Repositorio | Responsabilidad |
|---|---|
| `PatientRepository` | Identidad operativa y localización del paciente. |
| `VisitRepository` | Visitas y actos longitudinales. |
| `TreatmentRepository` | Líneas, estados y movimientos terapéuticos. |
| `PharmacyValidationRepository` | Solicitudes y validaciones FH. |
| `NursingRepository` | Solicitudes, seguimientos y eventos de Enfermería. |
| `PromRepository` | PROMs con fecha, instrumento, valor y procedencia. |
| `CatalogRepository` | Catálogo oficial/local, alias y snapshots de selección. |
| `AuditRepository` | Trazas técnicas y de cambios cuando el contexto lo permita. |

Implementaciones previstas, intercambiables y **no aprobadas** por esta propuesta:

- `ExcelRepository`: adaptador de la persistencia provisional.
- `SharePointRepository`: adaptador condicional a disponibilidad institucional; cualquier reconsideración de SharePoint/Lists requiere revisión de DEC-009.
- `PostgresRepository`: candidato para laboratorio/backend futuro.
- `ApiRepository`: cliente de una API institucional o de laboratorio.

Estos repositorios y adaptadores son **propuesta del roadmap**; no están implementados salvo componentes parciales. La interfaz no debe ocultar errores de esquema ni convertir ausencias en datos clínicos inferidos.

---

## 16. Diccionario de variables (requisito futuro)

El proyecto requiere, en una fase posterior, un diccionario de variables que actúe como puente entre formularios, Excel, salida JARA, dashboard, repository layer, futuro backend y mapeos terminológicos opcionales (FHIR/SNOMED/LOINC). Este documento **no crea el diccionario**; solo registra la necesidad. Ver `docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md` para los 19 metadatos mínimos propuestos.

---

## 17. Backend e integraciones institucionales

| Opción | Estado |
|---|---|
| **SharePoint / Microsoft Lists** | Opción condicional institucional; no reemplaza DEC-009 sin revisión explícita. No es backend del MVP. |
| **OCI / PostgreSQL** | Candidato canónico previo, **no implementado**. |
| **Supabase** | Exploratorio, no seleccionado. |
| **Salud Digital / STIC** | Interlocución pendiente; sin acuerdo de identidad, hosting, seguridad, interoperabilidad ni soporte. |
| **FHIR / HL7** | Horizonte / **FHIR-ready**, no implementado. Mapeos a SNOMED CT, LOINC o ATC son candidatos futuros sujetos a validación especializada. |

JARA debe seguir siendo el registro clínico/legal institucional mientras no exista decisión distinta de la organización. El TXT copiado al portapapeles es una salida provisional para facilitar documentación; no es integración, escritura automática ni sustitución de JARA.

---

## 18. Checklist de cambios futuros

Cuando se modifique una funcionalidad clínica:
1. Captura/validación (`formController`).
2. Exportación (`exportManager`).
3. Lectura/normalización (`dataManager`).
4. Visualización (`script_dashboard`, `script_estadisticas`, quick view).
5. Documentación (`README`, ARCHITECTURE, contrato, estado de implementación).
6. Contrato de datos (`docs/CONTRATO_DATOS_REUMA_V2.md`).
7. Plantillas/cabeceras Excel.

---

*Última actualización: 2026-07-10.*
