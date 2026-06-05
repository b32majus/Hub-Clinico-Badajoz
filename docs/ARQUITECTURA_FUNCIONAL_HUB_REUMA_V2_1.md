# Arquitectura Funcional — Hub Clínico Reuma v2.1 (MVP Interservicios)

**Fecha:** 2026-06-05  
**Versión:** 1.0  
**Proyecto:** Hub Clínico Reumatología — Badajoz / PROMueve Extremadura  
**Propósito:** Documentar la arquitectura funcional actual y planificada del Hub como sistema multiperfil, orientando a Sil, Hermes, Claude Code e informática/SES.

---

## 1. Propósito del documento

Este documento describe **qué hace** el Hub desde el punto de vista funcional, **cómo se organizan** sus módulos y **hacia dónde evoluciona**. No sustituye a `ARCHITECTURE.md` (detalle técnico) ni a `AGENTS.md` (reglas operativas). Está pensado para:

- **Sil/Cora:** visión global de capacidades y roadmap.
- **Hermes/agentes:** contexto para saber qué tocar y qué no.
- **Informática/SES:** entender el sistema sin leer código.

---

## 2. Situación actual

El Hub es una aplicación **local-first** (HTML/CSS/JS) que funciona en el navegador sin instalación. Su estado actual (junio 2026) es:

- **5 patologías** implementadas: AR, EspA, APs, LES, Sjögren.
- **1 fuente de datos:** Excel compartido (`Hub_Clinico_Maestro.xlsx`).
- **1 perfil funcional:** Reumatología.
- **Sin backend, sin autenticación, sin seguridad real.**
- **Demo sintética** poblacional integrada.
- **Gobernanza de agentes** operativa (Hermes → OpenCode).

---

## 3. Mapa de capas funcionales

```text
┌──────────────────────────────────────────────────────────────┐
│                   CAPA DE PRESENTACIÓN                       │
│  index.html | primera_visita | seguimiento | dashboard...    │
│  (HTML/CSS/JS vanilla, sin framework)                        │
├──────────────────────────────────────────────────────────────┤
│                   CAPA DE NEGOCIO                            │
│  formController.js | scoreCalculators.js | exportManager.js  │
│  prebiologicManager.js | pharmacyRequest.js                  │
│  treatmentEventsManager.js                                   │
├──────────────────────────────────────────────────────────────┤
│                   CAPA DE DATOS                              │
│  dataManager.js | fieldNormalizer.js                         │
│  sessionStorage (caché) | SheetJS (lectura Excel)            │
├──────────────────────────────────────────────────────────────┤
│                   FUENTE DE PERSISTENCIA                     │
│  Hub_Clinico_Maestro.xlsx (Excel compartido)                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Módulos actuales (v2.0 — Reuma)

| Módulo | Descripción | Archivos clave |
|--------|-------------|----------------|
| **Formulario clínico** | Captura de primera visita y seguimiento multipatología | `primera_visita.html`, `seguimiento.html`, `formController.js` |
| **Cálculo de scores** | Índices clínicos específicos por patología | `scoreCalculators.js` |
| **Solicitud FH** | Generación de texto estructurado para Farmacia Hospitalaria | `pharmacyRequest.js` |
| **Prebiológico/Vacunación** | Bloque por visita: estado y validación | `prebiologicManager.js` |
| **Eventos terapéuticos** | Derivación de eventos del historial | `treatmentEventsManager.js` |
| **Dashboard paciente** | Visión individual con timeline y métricas | `dashboard_paciente.html`, `script_dashboard.js` |
| **Estadísticas** | KPIs poblacionales multipatología | `estadisticas.html`, `script_estadisticas.js` |
| **Gestión catálogos** | Fármacos y profesionales | `manage_drugs.html`, `manage_professionals.html` |
| **Exportación** | TXT (historia clínica) + CSV (Excel) | `exportManager.js` |
| **Demo sintética** | Población demo para validación y presentación | `mockPatients.js`, `mockDashboardData.js`, `generate_demo_db.py` |

---

## 5. Módulos futuros (v2.1 — Interservicios)

### 5.1 Enfermería Reuma

| Aspecto | Descripción |
|---------|-------------|
| Estado | 🟡 Diseño funcional — no implementado |
| Qué hará | Registro de contactos, educación terapéutica, adherencia, vacunación, detección de efectos adversos |
| Fuente propia | `Hub_Enfermeria_Reuma_V1.xlsx` (planificado) |
| Precarga desde Reuma | Datos del paciente, diagnóstico, tratamiento actual, scores recientes |
| Visibilidad en timeline | Eventos de Enfermería visibles para todos los perfiles |
| Referencia | `docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md` |

### 5.2 Farmacia Hospitalaria

| Aspecto | Descripción |
|---------|-------------|
| Estado | 🟡 Diseño funcional — no implementado |
| Qué hará | Validación farmacoterapéutica, pauta, adherencia, efectos adversos, recepción de Solicitud FH |
| Fuente propia | `Hub_Farmacia_Reuma_V1.xlsx` (planificado) |
| Entrada desde Reuma | Solicitud FH (actualmente texto plano a portapapeles) |
| Visibilidad en timeline | Validaciones y efectos adversos visibles para todos los perfiles |
| Referencia | `docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md` |

### 5.3 Perfiles funcionales

Los perfiles (Reumatología, Enfermería, Farmacia, Admin/Demo) controlarán interfaz, formularios y dashboards visibles.

⚠️ **Importante:** Los perfiles funcionales **no equivalen a autenticación real ni autorización**. Son filtros de interfaz. La seguridad real (roles, permisos, trazabilidad, auditoría) llegará en v3.0.

---

## 6. Límites del MVP (v2.1)

| Qué SÍ es el MVP | Qué NO es el MVP |
|------------------|-------------------|
| Demostración funcional del flujo Reuma-Enfermería-Farmacia | Un sistema productivo con garantías clínicas |
| Visión longitudinal integrada con datos sintéticos | Un sistema con datos reales de pacientes |
| Tres fuentes separadas con lectura cruzada | Un backend con base de datos normalizada |
| Perfiles funcionales para navegación | Autenticación real con roles y permisos |
| Excel como mecanismo de persistencia del piloto | Excel como arquitectura definitiva |
| Demostración de viabilidad operativa | Un sistema desplegado en producción hospitalaria |

---

## 7. Arquitectura progresiva

### Principio: Excel → Backend-ready → BD/API

El Hub no se queda en Excel. Está diseñado para evolucionar por fases sin romper lo que funciona:

```text
Fase actual (v2.0)          Próxima (v2.2)              Futuro (v3.0)
┌─────────────────┐        ┌─────────────────┐         ┌──────────────────────┐
│ Excel como BD    │   →    │ Excel +          │   →    │ Base de datos real   │
│ HTML/CSS/JS      │        │ repository layer │        │ React + TypeScript   │
│ Sin aislamiento  │        │ diccionario      │        │ API REST + roles     │
│ de persistencia  │        │ validación       │        │ Tests automatizados  │
│                   │        │ separación demo  │        │ FHIR/HL7 ready       │
└─────────────────┘        └─────────────────┘         └──────────────────────┘
```

---

## 8. Transición Excel → Backend-ready → BD/API

### 8.1 Fase Excel (v2.0-v2.1) — actual

- Persistencia en Excel compartido.
- Sin capa de abstracción de datos.
- Válido para pilotaje inmediato.
- Riesgo: acoplamiento fuerte a estructura de columnas.

### 8.2 Fase Backend-ready (v2.2) — planificada

- Diccionario clínico que desacople nombres de columna del código.
- Repository layer que aisle la lógica de negocio del mecanismo de persistencia.
- Validación fuerte de plantillas Excel al cargar.
- Configuración declarativa de patologías (campos, scores, visibilidad).
- Separación clara entre datos demo y datos de piloto real.
- Preparación de estructura para importar datos desde los tres Excel.

### 8.3 Fase BD/API (v3.0) — futura

- Migración a base de datos relacional (PostgreSQL/MySQL en OCI).
- Frontend React + TypeScript + Vite.
- Backend Node.js + Fastify.
- API REST.
- Autenticación real, roles, permisos y auditoría.
- Tests automatizados.
- Preparación para interoperabilidad FHIR/HL7.

---

## 9. Qué está decidido

| Decisión | Referencia |
|----------|------------|
| Reuma v2 es la base real del proyecto | DEC-001 |
| main se etiqueta como legacy, no se elimina | DEC-002 |
| El MVP local-first se mantiene para el 8 de julio | DEC-003 |
| Perfiles funcionales sí; seguridad real no en MVP | DEC-004 |
| Una app común, no una por perfil | DEC-005 |
| Escritura separada por rol (lectura cruzada sí, escritura no) | DEC-006 |
| Enfermería con fuente propia | DEC-007 |
| Farmacia con fuente propia | DEC-008 |
| SharePoint Lists NO como backend MVP | DEC-009 |
| OCI como cloud de pruebas; PostgreSQL base candidata | DEC-010 |
| No limpiar ahora las 497 columnas | DEC-011 |
| FHIR/HL7 como horizonte, no requisito MVP | DEC-012 |
| No hacer paso obligatorio por Vite antes de v3 | DEC-013 |
| Arquitectura v3 recomendada: React + TypeScript + Vite + Fastify + PostgreSQL | DEC-014 |
| Sistema modular conectable (independiente/conectado/ecosistema) | DEC-015 |
| Demo sintética se amplía, no se crea desde cero | DEC-016 |
| Vista longitudinal adaptada a multiarchivo por CIP | DEC-017 |

Ver `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md` para detalle.

---

## 10. Qué está pendiente

| Tema | Estado | Depende de |
|------|--------|------------|
| Diseño formularios Enfermería | ⏸️ Pendiente de Sil/Cora | Canvas completado (WO-010) |
| Diseño formularios Farmacia | ⏸️ Pendiente de Sil/Cora | Canvas completado (WO-010) |
| Contratos mínimos interservicios | ⏸️ Pausada (WO-002) | Diseño de formularios → validación Sil/Cora |
| Diccionario clínico | 📋 Planificado (v2.2) | — |
| Repository layer | 📋 Planificado (v2.2) | — |
| Validación plantillas Excel | 📋 Planificado (v2.2) | — |
| Separación demo/piloto | 📋 Planificado (v2.2) | — |
| Migración a React/TS/Vite | 📋 Planificado (v3.0) | Validación del piloto |
| Backend + API | 📋 Planificado (v3.0) | Validación del piloto |
| Seguridad real (auth, roles, auditoría) | 📋 Planificado (v3.0) | — |
| Tests automatizados | 📋 Planificado (v2.2/v3.0) | — |
| FHIR/HL7 | 📋 Horizonte | Post-v3 |

---

## 11. Riesgos

| Riesgo | Nivel | Descripción |
|--------|-------|-------------|
| Acoplamiento Excel-UI | 🟡 Alto | Cambios en nombres de columna/hoja rompen la app en silencio |
| Crecimiento orgánico del código | 🟡 Alto | formController.js (127 KB) difícil de mantener |
| Ausencia de tests | 🟡 Alto | Cualquier cambio tiene alto riesgo de regresión |
| sessionStorage como BD | 🟡 Medio | Límite de capacidad, volátil |
| Dependencias CDN | 🟡 Medio | No funciona sin conexión |
| Excel como bottleneck | 🟡 Medio | Escritura manual, sin concurrencia |
| Calendario 8 de julio | 🟡 Medio | Fecha crítica para demo con Luis Bravo |

---

## 12. Criterios para avanzar a contratos/formularios

Para pasar de la fase actual de diseño funcional a contratos definitivos, deben cumplirse:

1. ⏸️ **Canvas creado (WO-010), pendiente de completar por Sil/Cora.**
2. ⏸️ **Decisiones clínicas pendientes de documentar**: datos por perfil, obligatoriedad, cálculos, visibilidad, alertas y timeline.
3. ⏸️ **Validación con el equipo clínico** (Reumatología, Enfermería, Farmacia).
4. ⏸️ **Definición de contratos de datos** por perfil (basados en el canvas, no en el Excel actual).
5. ⏸️ **Aprobación de Sil/Cora** para pasar de borrador exploratorio a contrato definitivo.

> ⚠️ **Importante:** WO-010 creó el canvas de trabajo; no equivale a formulario validado ni a contrato funcional. Los contratos definitivos solo pueden derivarse del canvas completado y validado por Sil/Cora.

Mientras estos criterios no se cumplan, los documentos en `docs/contratos/` tienen estado ⏸️ **Pausada/exploratorio** y no deben usarse como base de implementación.

---

## 13. Glosario

| Término | Significado |
|---------|-------------|
| CIP | Código de Identificación del Paciente |
| FH | Farmacia Hospitalaria |
| MVP | Producto Mínimo Viable (piloto funcional) |
| STIC | Servicio de Tecnologías de la Información y Comunicaciones (hospital) |
| OCI | Oracle Cloud Infrastructure |
| SES | Servicio Extremeño de Salud |
| PROMs | Patient-Reported Outcome Measures |
| FHIR | Fast Healthcare Interoperability Resources (estándar HL7) |
| WO | Work Order |

---

*Última actualización: 2026-06-05.*
