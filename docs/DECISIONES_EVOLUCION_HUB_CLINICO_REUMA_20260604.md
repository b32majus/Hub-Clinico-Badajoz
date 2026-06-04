# Dossier de evolución — Hub Clínico Reuma / PROMueve Extremadura

**Fecha:** 2026-06-04  
**Versión:** 1.1  
**Proyecto:** Hub Clínico Reumatología — Badajoz / PROMueve Extremadura  
**Reunión objetivo:** 2026-07-08  
**Estado:** Documento vivo de decisiones, arquitectura y hoja de ruta  
**Ubicación recomendada:** `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`

---

## 0. Resumen ejecutivo

El Hub Clínico Reuma ha evolucionado desde una herramienta local-first basada en HTML/CSS/JS y Excel hacia un prototipo avanzado de coordinación clínica multiperfil entre **Reumatología, Enfermería y Farmacia Hospitalaria**.

La versión funcional avanzada está en la rama:

```text
feature/reuma-v2-prebiologico-fh-les-sjogren
```

Esa rama incorpora la base real del proyecto actual:

- Multipatología: AR, EspA, APs, LES y Sjögren.
- Contrato Excel v2 con 497 columnas por hoja clínica.
- Bloque prebiológico/vacunación embebido por visita.
- Solicitud FH como texto derivado para e-Orden / orden clínica.
- Eventos terapéuticos derivados.
- Dashboard paciente y estadísticas multipatología.
- Demo poblacional sintética.

La decisión estratégica principal es:

> **Mantener un MVP local-first funcional para pilotaje inmediato, pero diseñarlo ya como una arquitectura progresiva hacia una plataforma con backend real, roles, trazabilidad, permisos y modelo de datos normalizado.**

El MVP para la reunión del 8 de julio debe demostrar valor asistencial y viabilidad operativa, sin presentar Excel como arquitectura final.

---

## 1. Contexto del proyecto

El proyecto nació como una aplicación muy simple: una página HTML local con formulario clínico, exportación TXT para historia clínica y CSV para alimentar un Excel maestro.

La arquitectura inicial respondía a restricciones reales del entorno hospitalario:

- sin backend;
- sin instalación compleja;
- sin integración con sistemas corporativos;
- sin depender inicialmente de STIC;
- procesamiento local en navegador;
- uso de Excel como backend operativo temporal.

Con el tiempo, el Hub creció:

1. primera patología;
2. incorporación de más patologías;
3. separación de HTML/CSS/JS y módulos funcionales;
4. contrato de datos clínicos;
5. dashboard longitudinal de paciente;
6. estadísticas poblacionales;
7. prebiológico/vacunación;
8. Solicitud FH;
9. LES y Sjögren;
10. eventos terapéuticos;
11. perfiles funcionales previstos para Reumatología, Enfermería y Farmacia.

Este crecimiento ha generado deuda heredada, especialmente el contrato ancho de 497 columnas por hoja clínica. Esa deuda se acepta temporalmente para no romper la v2 antes del piloto.

---

## 2. Estado técnico actual

### 2.1. Repositorio principal

```text
b32majus/Hub-Clinico-Badajoz
```

### 2.2. Rama funcional avanzada

```text
feature/reuma-v2-prebiologico-fh-les-sjogren
```

### 2.3. PR actual

```text
PR #1 — feat(reuma): implement Hub Clinico Reuma v2 with multipathology contract
Estado: draft / abierta / no fusionada
```

### 2.4. Funcionalidad Reuma v2

| Área | Estado |
|---|---|
| AR | Implementada |
| EspA | Implementada |
| APs | Implementada, DAPSA incorporado |
| LES | Implementada como patología completa |
| Sjögren | Implementada como patología completa |
| Prebiológico/vacunación | Implementado como bloque embebido por visita |
| Solicitud FH | Implementada como texto derivado |
| Eventos terapéuticos | Implementados como derivados del historial |
| Dashboard paciente | Multipatología |
| Estadísticas | v2 multipatología |
| Demo sintética | Generada y validada |

---

## 3. Decisiones cerradas

### DEC-001 — Reuma v2 pasa a ser la base real del proyecto

**Decisión:** la rama `feature/reuma-v2-prebiologico-fh-les-sjogren` debe convertirse en la nueva base estable. `main` representa una versión legacy y no debe guiar el desarrollo futuro.

**Razonamiento:** la v2 contiene la funcionalidad real actual: multipatología, prebiológico, Solicitud FH y estructura avanzada.

---

### DEC-002 — No eliminar `main` sin trazabilidad

**Decisión:** no se elimina `main`; se etiqueta como legacy y se promueve v2 de forma controlada.

**Acciones recomendadas:**

```bash
git checkout main
git pull
git tag legacy-v1-main-antes-reuma-v2
```

Después, tras revisión:

```bash
git checkout feature/reuma-v2-prebiologico-fh-les-sjogren
git tag v2.0.0-reuma-multipatologia-premerge
```

Y posteriormente:

```bash
git checkout main
git merge feature/reuma-v2-prebiologico-fh-les-sjogren
git tag v2.0.0-reuma-multipatologia
```

---

### DEC-003 — El MVP local-first se mantiene para el 8 de julio

**Decisión:** no se refactoriza toda la app a React/Node/Electron antes de la reunión.

**Razonamiento:** la v2 ya está probada funcionalmente. Migrar ahora toda la arquitectura puede romper flujos validados y consumir tiempo crítico.

---

### DEC-004 — Perfiles funcionales sí; seguridad real no en MVP

**Decisión:** se incorporarán perfiles funcionales:

- Reumatología.
- Enfermería.
- Farmacia Hospitalaria.
- Admin/Demo.

Estos perfiles controlan interfaz, formularios y dashboards visibles, pero no sustituyen autenticación real.

**Razonamiento:** en local-first no hay backend, permisos reales ni auditoría robusta. El perfilado MVP sirve para experiencia de usuario y separación funcional, no para seguridad clínica completa.

---

### DEC-005 — Una app común, no una app por perfil

**Decisión:** no se crearán tres aplicaciones separadas. Se mantendrá una app común con vistas por rol.

```text
Una app
├── Dashboard Reuma
├── Dashboard Enfermería
├── Dashboard Farmacia
├── Formulario Reuma
├── Formulario Enfermería
├── Formulario Farmacia
└── Núcleo común de carga, normalización y exportación
```

**Razonamiento:** tres apps separadas multiplicarían mantenimiento, bugs, estilos, normalización y deuda técnica.

---

### DEC-006 — Escritura separada por rol en MVP

**Decisión:** cada perfil que escriba datos debe hacerlo en su propia fuente.

```text
Hub_Clinico_Reuma_V2.xlsx
└── Escribe Reumatología

Hub_Enfermeria_Reuma_V1.xlsx
└── Escribe Enfermería

Hub_Farmacia_Reuma_V1.xlsx
└── Escribe Farmacia Hospitalaria
```

**Razonamiento:** Excel no soporta bien escritura simultánea multirol. La separación de fuentes reduce riesgo operativo.

**Principio:** lectura cruzada sí; escritura cruzada no.

---

### DEC-007 — Enfermería integrada en visión longitudinal, pero con fuente propia

**Decisión:** Enfermería no debe escribir en la misma hoja clínica de Reumatología. Para MVP, escribirá en Excel propio.

**Razonamiento:** Enfermería actúa como nexo asistencial entre Reumatología y Farmacia, pero sus registros no son equivalentes a una visita médica de Reumatología.

**Diseño recomendado:**

```text
Excel Enfermería
├── CIP
├── Fecha_Registro
├── Patología
├── Tipo_Registro
├── Profesional_Enfermería
├── Educación terapéutica
├── Adherencia
├── Efectos adversos referidos
├── Vacunación / Medicina Preventiva
├── Incidencias
├── Requiere valoración médica
└── Observaciones
```

---

### DEC-008 — Farmacia activa con fuente propia

**Decisión:** Farmacia no escribe en el Excel clínico. Tendrá fuente propia.

**Diseño recomendado:**

```text
Excel Farmacia
├── CIP
├── Fecha_Validación
├── Farmacéutico/a
├── Fármaco validado
├── Dosis
├── Posología / frecuencia
├── Vía
├── Peso usado si aplica
├── Estado validación
├── Adherencia si se recoge
├── Efectos adversos comunicados
└── Observaciones farmacoterapéuticas
```

---

### DEC-009 — SharePoint Lists no se adopta como backend del MVP

**Decisión:** SharePoint Lists no se usará como backend directo de la app en el MVP si requiere permisos de tenant, Graph API, registro de app o intervención STIC.

**Razonamiento:** el valor del MVP es avanzar sin bloqueo corporativo. Si SharePoint requiere permisos institucionales, introduce el mismo cuello de botella que se intenta evitar.

**Uso posible futuro:** podrá reconsiderarse si el SES/IT lo habilita sin fricción o como solución institucional intermedia.

---

### DEC-010 — OCI como entorno cloud de pruebas; PostgreSQL/MySQL como base de datos candidata

**Decisión:** se creará un carril paralelo de prueba con base de datos real dentro de Oracle Cloud Infrastructure (OCI), usando exclusivamente datos sintéticos/artificiales.

**Corrección conceptual:** Oracle, en esta decisión, no significa “base de datos Oracle”. Significa **cuenta/entorno cloud OCI**. Dentro de OCI se valorará preferentemente PostgreSQL, con MySQL como alternativa si resulta más viable por disponibilidad, coste o facilidad de despliegue.

**Regla:** nada de datos reales en OCI, GitHub, GitHub Pages, entornos demo o repositorios.

**Preferencia actual:**

```text
Preferida: PostgreSQL en OCI
Alternativa: MySQL en OCI
Descartado por ahora: Oracle Database como decisión por defecto
```

---

### DEC-011 — No limpiar ahora las 497 columnas

**Decisión:** no se normalizará el contrato ancho antes del MVP del 8 de julio.

**Razonamiento:** el contrato v2 está validado y tocarlo ahora puede romper exportación, importación, dashboard y estadísticas.

**Evolución:** la limpieza se traslada a v3 con backend normalizado.

---

### DEC-012 — FHIR/HL7 como horizonte, no como requisito del MVP

**Decisión:** no se implementa FHIR en MVP. Se diseñará el modelo v3 para poder mapear a FHIR en el futuro.

**Razonamiento:** FHIR es un estándar de intercambio, no una base de datos interna. Implementarlo bien requiere modelado, perfiles, terminologías y validación institucional. En esta fase basta con preparar un modelo interno coherente.

---

### DEC-013 — No hacer paso intermedio obligatorio por Vite

**Decisión:** no se hará una fase obligatoria de migración de la app legacy a Vite + TypeScript antes de construir v3.

**Razonamiento:** Vite no es una arquitectura, sino una herramienta de desarrollo/build. Si el destino es una v3 limpia con frontend moderno, API y base de datos real, migrar primero el legacy a Vite vanilla puede duplicar trabajo.

**Uso de Vite:** Vite se usará como herramienta de build del frontend v3 si se adopta React + TypeScript. Solo se valoraría Vite + TypeScript sobre la app actual si la v2 local-first tuviera que mantenerse y evolucionar durante muchos meses como producto propio.

---

### DEC-014 — Arquitectura v3 recomendada

**Decisión:** la arquitectura v3 recomendada será:

```text
Frontend: React + TypeScript + Vite
Backend: Node.js, inicialmente Fastify para POC
Base de datos: PostgreSQL en OCI preferente; MySQL en OCI como alternativa
Modelo: normalizado por dominios clínicos
Seguridad: roles reales + auditoría
Interoperabilidad: preparada para futura capa FHIR/HL7
```

**Razonamiento:** React + TypeScript encaja con una herramienta con múltiples perfiles, formularios dinámicos, dashboards longitudinales, timeline, validaciones y componentes reutilizables. Node + Fastify permite una API ligera para POC. PostgreSQL ofrece buen equilibrio para modelo relacional clínico, integridad, consultas longitudinales y posible uso de JSON en campos complementarios.

**Cláusula de flexibilidad:** si el SES, STIC, un instituto tecnológico o un equipo externo asumen el desarrollo, la tecnología backend podrá cambiar a NestJS, .NET, Java u otra pila corporativa. La prioridad no es casarse con un framework, sino mantener un **modelo de dominio limpio y portable**.

---

## 4. Versionado propuesto

### v1 — Legacy local Reuma

**Estado:** anterior a la rama v2.  
**Uso:** referencia histórica.  
**Acción:** etiquetar, no desarrollar más.

```text
tag: legacy-v1-main-antes-reuma-v2
```

---

### v2.0 — Reuma multipatología

**Estado:** rama actual avanzada.

**Incluye:**

- AR, EspA, APs, LES, Sjögren.
- Prebiológico/vacunación.
- Solicitud FH.
- Eventos.
- Dashboard y estadísticas v2.
- Contrato Excel de 497 columnas por hoja clínica.

```text
tag: v2.0.0-reuma-multipatologia
```

---

### v2.1 — MVP interservicios para Luis Bravo

**Objetivo:** demo funcional del 8 de julio.

**Incluye:**

- Reuma v2 estable.
- Perfil funcional Reumatología.
- Perfil funcional Enfermería.
- Perfil funcional Farmacia.
- Dashboard Enfermería básico.
- Formulario Enfermería básico.
- Dashboard Farmacia básico.
- Formulario Farmacia básico.
- Fuentes separadas por rol.
- Carga batch multiarchivo.
- Timeline integrado por CIP.
- Dataset sintético demo.
- Documento de arquitectura evolutiva.

```text
release/mvp-luis-bravo-20260708
```

---

### v3.0 — Arquitectura con backend real

**Estado:** POC paralela inicialmente.

**Objetivo:** demostrar evolución desde Excel a base de datos real.

**Incluye:**

- Modelo de datos normalizado.
- API.
- Roles reales.
- Auditoría.
- Base de datos PostgreSQL/MySQL en OCI, con PostgreSQL como opción preferente.
- Datos sintéticos.
- Importador desde Excel v2.
- Dashboard paciente desde base de datos.
- Escritura real por dominio: Reuma, Enfermería, Farmacia.

---

## 5. Estrategia de ramas y repositorios

### 5.1. Principio

Mantener el repo actual para la app local-first hasta el MVP del 8 de julio. Crear repo separado solo para la POC backend/base de datos.

---

### 5.2. Estructura recomendada en repo actual

```text
main
└── Nueva base estable tras merge de Reuma v2

release/mvp-luis-bravo-20260708
└── Rama congelable para demo

feature/mvp-roles-enfermeria-farmacia
└── Desarrollo de perfiles, formularios y dashboards

feature/enfermeria-dashboard-form-v1
└── Si se quiere aislar trabajo de Enfermería

feature/farmacia-active-form-v1
└── Si se quiere aislar trabajo de Farmacia

docs/architecture-v3-roadmap
└── Documentación técnica evolutiva
```

---

### 5.3. Repositorio separado recomendado para POC backend

```text
hub-clinico-reuma-db-poc
```

Contenido recomendado:

```text
/backend
/database
/scripts
/docs
/data-synthetic
```

Objetivo:

- no contaminar la app local-first;
- probar arquitectura v3;
- trabajar solo con datos sintéticos;
- documentar modelo normalizado;
- poder enseñarlo como prueba técnica separada.

---

## 6. Arquitectura MVP v2.1

### 6.1. Principio operativo

```text
Una app local-first
Tres perfiles funcionales
Tres fuentes de escritura separadas
Una visión integrada por CIP
```

### 6.2. Fuentes de datos MVP

| Fuente | Escribe | Lee | Finalidad |
|---|---|---|---|
| Excel Reuma v2 | Reumatología | Reuma, Enfermería, Farmacia | Visitas clínicas, patología, scores, tratamientos, prebiológico |
| Excel Enfermería v1 | Enfermería | Reuma, Enfermería | Seguimiento enfermero, educación, adherencia, incidencias |
| Excel Farmacia v1 | Farmacia | Farmacia, potencialmente Reuma/Enfermería | Validación FH, posología, EA, adherencia, observaciones |
| Dataset demo | Equipo proyecto | Todos | Pruebas y reunión |

---

### 6.3. Módulos nuevos recomendados para MVP

```text
modules/roleConfig.js
modules/dataSources/clinicalExcelSource.js
modules/dataSources/nursingExcelSource.js
modules/dataSources/pharmacyExcelSource.js
modules/dataSources/mergedPatientView.js
modules/nursingManager.js
modules/pharmacyValidationManager.js
```

### 6.4. Perfil funcional recomendado

```javascript
const ROLE_CONFIG = {
  reuma: {
    label: "Reumatología",
    canRead: ["clinical", "nursing_summary", "pharmacy_summary"],
    canWrite: ["clinical"],
    dashboards: ["patient", "population", "clinical"],
    forms: ["primera_visita", "seguimiento_reuma"]
  },
  enfermeria: {
    label: "Enfermería",
    canRead: ["clinical", "nursing", "pharmacy_summary"],
    canWrite: ["nursing"],
    dashboards: ["nursing_followup", "patient_timeline"],
    forms: ["seguimiento_enfermeria"]
  },
  farmacia: {
    label: "Farmacia Hospitalaria",
    canRead: ["clinical_summary", "prebiologic", "pharmacy"],
    canWrite: ["pharmacy"],
    dashboards: ["pharmacy_validation"],
    forms: ["validacion_fh"]
  },
  demo: {
    label: "Demo / Admin funcional",
    canRead: ["clinical", "nursing", "pharmacy"],
    canWrite: [],
    dashboards: ["all"],
    forms: []
  }
};
```

---

## 7. Arquitectura v3 recomendada

### 7.1. Principio

La v3 debe dejar de ser una app local-first basada en Excel y convertirse en una plataforma web con backend real.

### 7.2. Arquitectura objetivo

```text
Frontend web React + TypeScript + Vite
        ↓
API Node.js
        ↓
Base de datos relacional en OCI
        ↓
patients
clinical_visits
nursing_followups
pharmacy_validations
prebiologic_checks
treatment_events
audit_log
users_roles
```

### 7.3. Stack recomendado

#### Frontend

```text
React + TypeScript + Vite
```

**Por qué:**

- React encaja con interfaces complejas con múltiples estados, perfiles, dashboards, formularios dinámicos y componentes reutilizables.
- TypeScript ayuda a controlar contratos de datos y reducir errores silenciosos.
- Vite aporta build moderno y sirve como herramienta de desarrollo del frontend v3, no como fase intermedia obligatoria.

#### Backend

```text
Node.js + Fastify
```

**Por qué:**

- API ligera.
- Buen encaje con JSON schema.
- Menor peso conceptual que NestJS.
- Suficiente para POC y escalable si se estructura bien.

**Alternativa:** NestJS si entra equipo técnico/institucional y se busca arquitectura más opinionada.

#### Base de datos

Opción preferente:

```text
PostgreSQL en OCI
```

**Ventajas:**

- excelente para modelo relacional clínico;
- buen ecosistema;
- buen soporte de migraciones;
- adecuado para consultas longitudinales;
- permite combinar modelo normalizado con JSON cuando convenga;
- buena portabilidad.

Opción alternativa:

```text
MySQL en OCI
```

**Ventajas:**

- conocido;
- sencillo de operar;
- suficiente para POC si PostgreSQL no está disponible o resulta más complejo.

**Decisión práctica actual:** usar OCI como entorno de pruebas y priorizar PostgreSQL. MySQL queda como alternativa pragmática. No se decide Oracle Database como base por defecto.

---

## 8. Modelo de datos v3 propuesto

```text
patients
├── id
├── cip
├── nombre
├── sexo
├── fecha_nacimiento
└── estado

clinical_visits
├── id
├── patient_id
├── pathology
├── visit_date
├── visit_type
├── clinician_id
├── treatment_current
├── treatment_decision
└── notes

clinical_scores
├── id
├── visit_id
├── score_type
├── value
├── unit
├── category
└── raw_components_json

prebiologic_checks
├── id
├── patient_id
├── visit_id
├── status
├── validation_date
├── labs_status
├── tb_screening
├── chest_xray
├── vaccination_status
├── preventive_medicine_referral
└── notes

nursing_followups
├── id
├── patient_id
├── date
├── nurse_id
├── followup_type
├── education_done
├── adherence
├── adverse_events
├── vaccines_pending
├── requires_medical_review
└── notes

pharmacy_validations
├── id
├── patient_id
├── date
├── pharmacist_id
├── medication
├── dose
├── posology
├── route
├── validation_status
├── adherence
├── adverse_events
└── notes

treatment_events
├── id
├── patient_id
├── date
├── event_type
├── source
├── description
└── metadata_json

users
├── id
├── name
├── role
├── service
└── active

audit_log
├── id
├── user_id
├── action
├── entity_type
├── entity_id
├── timestamp
├── old_value_json
└── new_value_json
```

---

## 9. FHIR/HL7 futuro

No se implementa FHIR en MVP. La prioridad es crear un modelo interno consistente que permita mapeo posterior.

Mapeos candidatos futuros:

| Dominio interno | Recurso FHIR posible |
|---|---|
| Paciente | Patient |
| Profesional | Practitioner |
| Servicio/Centro | Organization |
| Visita | Encounter |
| Diagnóstico/patología | Condition |
| Scores/analíticas | Observation |
| Cuestionarios PRO/adherencia | QuestionnaireResponse |
| Medicación | MedicationRequest / MedicationStatement |
| Vacunación | Immunization |
| Eventos / workflow | Task / Procedure / CarePlan según caso |

---

## 10. Cronograma recomendado hasta el 8 de julio

### Semana 0 — 4-6 junio

**Objetivo:** ordenar base técnica y congelar decisiones.

Tareas:

- Confirmar PR v2 avanzada.
- Etiquetar `main` legacy.
- Revisar PR v2.
- Promover v2 a base estable o crear rama estable desde ella.
- Crear documento de decisiones en GitHub.
- Crear rama de trabajo para MVP interservicios.

Entregables:

```text
tag legacy-v1-main-antes-reuma-v2
tag v2.0.0-reuma-multipatologia
branch feature/mvp-roles-enfermeria-farmacia
documento de decisiones
```

---

### Semana 1 — 7-13 junio

**Objetivo:** perfiles funcionales y estructura multi-fuente.

Tareas:

- Crear `roleConfig.js`.
- Crear selector de perfil.
- Definir navegación por perfil.
- Crear abstracción de fuentes clínica, enfermería y farmacia.
- Diseñar plantillas Excel Enfermería v1 y Farmacia v1.
- Crear carga batch multiarchivo.
- Crear merged view por CIP.

---

### Semana 2 — 14-20 junio

**Objetivo:** Enfermería funcional.

Tareas:

- Dashboard Enfermería.
- Formulario seguimiento enfermero.
- Precarga desde Reuma.
- Exportación a Excel Enfermería.
- TXT para historia si procede.
- Campos de adherencia, educación, EA, vacunación, derivación Medicina Preventiva.
- Vista longitudinal con registros enfermeros.

---

### Semana 3 — 21-27 junio

**Objetivo:** Farmacia activa funcional.

Tareas:

- Dashboard Farmacia.
- Formulario validación FH.
- Precarga desde Solicitud FH/Reuma.
- Exportación a Excel Farmacia.
- Estado validación: validado, pendiente, requiere aclaración, no validado.
- Adherencia, EA, observaciones farmacoterapéuticas.
- Vista integrada desde Farmacia.

---

### Semana 4 — 28 junio-3 julio

**Objetivo:** integración, demo y estabilización.

Tareas:

- Timeline integrado paciente.
- Dataset demo completo.
- Pruebas por rol.
- Validación navegación.
- Validación carga multiarchivo.
- Corrección bugs críticos.
- Congelar rama release.

---

### Semana 5 — 4-7 julio

**Objetivo:** preparación reunión.

Tareas:

- Guion demo.
- Presentación.
- Narrativa técnica.
- Mapa de evolución.
- Riesgos y limitaciones.
- Decisiones que se piden al SES/Luis Bravo.
- Smoke test final.

---

### 8 julio

**Objetivo:** mostrar MVP funcional y presentar hoja de ruta institucional.

Mensaje central:

> Hoy podemos pilotar con una arquitectura local-first segura y controlada. El sistema ya está preparado conceptualmente para evolucionar hacia una plataforma institucional con base de datos real, roles, trazabilidad, auditoría e interoperabilidad futura.

---

## 11. Carril paralelo OCI / DB POC

### Objetivo

Validar técnicamente que la app puede evolucionar a backend real sin datos reales.

### Timing recomendado

No bloquear MVP. Ejecutar en paralelo con baja intensidad:

```text
Semana 1: crear repo DB POC y modelo ER inicial
Semana 2: crear tablas y datos sintéticos
Semana 3: importar datos desde Excel v2 demo
Semana 4: API mínima y dashboard paciente desde DB
Semana 5: demo técnica interna si está madura
```

### Alcance mínimo

```text
patients
clinical_visits
nursing_followups
pharmacy_validations
prebiologic_checks
audit_log
```

### Fuera de alcance

- Datos reales.
- Integración SES.
- Autenticación corporativa.
- FHIR real.
- Producción.

---

## 12. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---:|---|
| Mezclar escritura multirol en un Excel | Alto | Fuentes separadas por rol |
| Migrar a React antes del 8 julio | Alto | Mantener vanilla para MVP |
| SharePoint Lists bloqueado por tenant/STIC | Alto | No usar como backend MVP |
| Contrato ancho de 497 columnas | Medio | No tocar antes de MVP; normalizar en v3 |
| Perfiles funcionales confundidos con seguridad real | Alto | Documentar limitación |
| POC DB en OCI con datos reales | Crítico | Solo datos sintéticos |
| Tres apps separadas por rol | Medio-Alto | App común con vistas por perfil |
| Falta de narrativa institucional | Alto | Dossier + roadmap + demo guiada |
| Farmacia activa contaminando fuente clínica | Alto | Excel Farmacia propio |
| Enfermería escribiendo como si fuera Reuma | Alto | Excel Enfermería propio y tipo de registro diferenciado |

---

## 13. Decisiones pendientes

| Decisión | Fecha objetivo | Responsable sugerido |
|---|---:|---|
| Promover v2 a main | Semana 0 | Equipo técnico |
| Nombre final de release MVP | Semana 0 | Sil/Cora |
| Campos mínimos de Enfermería | Semana 1 | Sil + clínicos |
| Campos mínimos de Farmacia | Semana 1 | Sil + Luis/Sara/FH |
| Si la demo usa GitHub Pages o ejecución local | Semana 2 | Sil/técnico |
| Alcance exacto de POC DB en OCI | Semana 1-2 | Sil/Cora/técnico |
| Qué se pide explícitamente a Luis Bravo | Semana 4 | Sil/Sara |
| Nivel de implicación SES/STIC tras reunión | 8 julio | Luis Bravo/SES |

---

## 14. Arquitectura recomendada: decisión final

### MVP 8 julio

```text
HTML/CSS/JS vanilla
Exceles separados por rol
Perfiles funcionales
Carga batch multiarchivo
Integración por CIP
Datos sintéticos/demo
```

**Por qué:** minimiza riesgo, aprovecha lo que ya funciona, evita bloqueo STIC y permite mostrar valor asistencial rápido.

---

### Transición v2.2 opcional

```text
Misma app
Mejor separación interna:
- roleConfig
- dataSources
- mergedPatientView
- contratos por rol
```

**Por qué:** prepara el cambio a backend sin reescribir todo si la v2 local-first debe mantenerse durante varios meses.

**Decisión actual:** no es una fase obligatoria. Si el destino v3 se activa pronto, se salta este paso y se crea una POC v3 limpia.

---

### v3

```text
React + TypeScript + Vite
Node.js + Fastify
PostgreSQL en OCI preferente
MySQL en OCI alternativa
API REST
Roles reales
Audit log
Modelo normalizado
Capa futura FHIR/HL7
```

**Por qué:** es la arquitectura más adecuada cuando el producto deje de ser MVP local-first y pase a ser plataforma institucional.

---

## 15. Orden recomendado de trabajo

1. No tocar aún la arquitectura base que funciona.
2. Promover Reuma v2 como base real.
3. Crear release MVP para Luis Bravo.
4. Añadir perfiles funcionales.
5. Separar fuentes de escritura.
6. Añadir Enfermería y Farmacia activa.
7. Congelar demo.
8. Preparar narrativa institucional.
9. Ejecutar POC DB en OCI en paralelo con datos sintéticos.
10. Diseñar v3 como producto web con backend real.

La idea clave:

> **No estamos construyendo un Excel bonito. Estamos construyendo un modelo progresivo de coordinación clínica entre Reumatología, Enfermería y Farmacia Hospitalaria. El Excel es solo el andamio del MVP.**

---

## 16. Referencias internas del proyecto

### Repositorio

```text
b32majus/Hub-Clinico-Badajoz
```

### Rama avanzada

```text
feature/reuma-v2-prebiologico-fh-les-sjogren
```

### Documentos internos relevantes

```text
docs/RESUMEN_RELEASE_REUMA_V2.md
docs/CONTRATO_DATOS_REUMA_V2.md
docs/PLAN_IMPLEMENTACION_REUMA_V2.md
docs/template_prebiologico_excel.md
docs/template_solicitud_fh.md
docs/template_les_excel.md
docs/template_sjogren_excel.md
docs/CHECKLIST_E2E_CLINICO_V2.md
docs/AUDITORIA_EXCEL_MAESTRO_V2.md
```

---

## 17. Próxima acción recomendada

Tomar este documento como base para:

1. planificación técnica;
2. preparación de prompts para KairOS/Codex/OpenCode/Claude Code;
3. documento de arquitectura para Luis Bravo;
4. actualización de Notion;
5. guion de reunión del 8 de julio.
