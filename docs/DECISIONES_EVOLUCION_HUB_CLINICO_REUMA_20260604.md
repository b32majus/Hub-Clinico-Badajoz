# Dossier de evolución — Hub Clínico Reuma / PROMueve Extremadura

**Fecha:** 2026-06-04  
**Versión:** 1.2  
**Proyecto:** Hub Clínico Reumatología — Badajoz / PROMueve Extremadura  
**Reunión objetivo:** 2026-07-08  
**Estado:** Documento vivo de decisiones, arquitectura, roadmap y gobernanza técnica  
**Ubicación:** `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`

---

## 0. Resumen ejecutivo

El Hub Clínico Reuma ha evolucionado desde una herramienta local-first basada en HTML/CSS/JS y Excel hacia un prototipo avanzado de coordinación clínica multiperfil entre **Reumatología, Enfermería y Farmacia Hospitalaria**.

La versión funcional avanzada está en la rama:

```text
feature/reuma-v2-prebiologico-fh-les-sjogren
```

Esta rama incorpora la base real del proyecto actual:

- Multipatología: AR, EspA, APs, LES y Sjögren.
- Contrato Excel v2 con 497 columnas por hoja clínica.
- Bloque prebiológico/vacunación embebido por visita.
- Solicitud FH como texto derivado para e-Orden / orden clínica.
- Eventos terapéuticos derivados.
- Dashboard paciente y estadísticas multipatología.
- Demo poblacional sintética.

La decisión estratégica principal es:

> **Mantener un MVP local-first funcional para pilotaje inmediato, pero diseñarlo ya como arquitectura progresiva hacia una plataforma con backend real, roles, trazabilidad, permisos y modelo de datos normalizado.**

El MVP para el 8 de julio debe demostrar valor asistencial y viabilidad operativa, sin presentar Excel como arquitectura final.

---

## 1. Marco estratégico

El proyecto ya no debe interpretarse como “una app clínica”. Debe formularse como:

> **Piloto de innovación asistencial para seguimiento estructurado y coordinación interservicios en enfermedades reumatológicas crónicas, apoyado en una herramienta digital modular.**

El soporte digital no es el proyecto en sí. El proyecto es el rediseño del proceso asistencial:

- captura estructurada;
- visión longitudinal;
- coordinación Reumatología-Enfermería-Farmacia;
- mejora de seguridad terapéutica;
- generación de información útil para historia clínica/e-Orden;
- explotación futura de indicadores;
- preparación para PROMs y seguimiento remoto.

La conversación previa de evolución del Hub ya estableció una idea crítica: **primero piloto sólido, luego expansión**. No se debe intentar construir “el sistema total” antes de validar el flujo profesional básico.

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

La rama `feature/reuma-v2-prebiologico-fh-les-sjogren` debe convertirse en la base estable. `main` representa una versión legacy y no debe guiar el desarrollo futuro.

---

### DEC-002 — No eliminar `main` sin trazabilidad

No se elimina `main`; se etiqueta como legacy y se promueve v2 de forma controlada.

Acciones recomendadas:

```bash
git checkout main
git pull
git tag legacy-v1-main-antes-reuma-v2
```

Tras revisión:

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

No se refactoriza toda la app a React/Node/Electron antes de la reunión. La v2 ya está probada funcionalmente y una migración completa ahora puede romper flujos validados.

---

### DEC-004 — Perfiles funcionales sí; seguridad real no en MVP

Se incorporarán perfiles funcionales:

- Reumatología.
- Enfermería.
- Farmacia Hospitalaria.
- Admin/Demo.

Estos perfiles controlan interfaz, formularios y dashboards visibles. No sustituyen autenticación real ni permisos robustos.

---

### DEC-005 — Una app común, no una app por perfil

No se crearán tres aplicaciones separadas. Se mantendrá una app común con módulos/vistas por rol.

```text
Una app
├── Módulo Reuma
├── Módulo Enfermería
├── Módulo Farmacia
└── Núcleo común de carga, normalización, exportación y visión integrada
```

---

### DEC-006 — Escritura separada por rol en MVP

Cada perfil que escriba datos debe hacerlo en su propia fuente física.

```text
Hub_Clinico_Reuma_V2.xlsx
└── Escribe Reumatología

Hub_Enfermeria_Reuma_V1.xlsx
└── Escribe Enfermería

Hub_Farmacia_Reuma_V1.xlsx
└── Escribe Farmacia Hospitalaria
```

Principio operativo:

> **Lectura cruzada sí; escritura cruzada no.**

---

### DEC-007 — Enfermería integrada en visión longitudinal, pero con fuente propia

Enfermería no debe escribir en la misma hoja clínica de Reumatología. Para el MVP escribirá en Excel propio.

Motivo: Enfermería es nexo asistencial y registra eventos longitudinales relevantes, pero sus registros no son equivalentes a una visita médica de Reumatología.

---

### DEC-008 — Farmacia activa con fuente propia

Farmacia no escribe en el Excel clínico. Tendrá fuente propia para validación farmacoterapéutica, pauta, adherencia, efectos adversos y observaciones.

Conceptualmente, sus datos forman parte del modelo longitudinal. Físicamente, en MVP, se separan para evitar caos operativo.

---

### DEC-009 — SharePoint Lists no se adopta como backend del MVP

SharePoint Lists no se usará como backend directo de la app si requiere permisos de tenant, Graph API, registro de app o intervención STIC.

Podrá reconsiderarse como solución institucional intermedia si el SES/IT lo habilita sin fricción.

---

### DEC-010 — OCI como entorno cloud de pruebas; PostgreSQL/MySQL como base candidata

Oracle, en esta decisión, significa **Oracle Cloud Infrastructure (OCI)**, no base de datos Oracle.

Dentro de OCI se valorará:

```text
Preferida: PostgreSQL en OCI
Alternativa: MySQL en OCI
No decidido por defecto: Oracle Database
```

Regla absoluta: solo datos sintéticos/artificiales en OCI, GitHub, GitHub Pages, demos o repositorios.

---

### DEC-011 — No limpiar ahora las 497 columnas

No se normalizará el contrato ancho antes del MVP. La limpieza se traslada a una fase backend-ready/v3.

---

### DEC-012 — FHIR/HL7 como horizonte, no requisito MVP

No se implementa FHIR en MVP. Se diseñará el modelo para permitir mapeo futuro.

---

### DEC-013 — No hacer paso intermedio obligatorio por Vite

No se hará una fase obligatoria de migración legacy a Vite + TypeScript antes de v3. Vite será herramienta de build del frontend v3 si se adopta React + TypeScript.

---

### DEC-014 — Arquitectura v3 recomendada

```text
Frontend: React + TypeScript + Vite
Backend: Node.js, inicialmente Fastify para POC
Base de datos: PostgreSQL en OCI preferente; MySQL en OCI alternativa
Modelo: normalizado por dominios clínicos
Seguridad: roles reales + auditoría
Interoperabilidad: preparada para futura capa FHIR/HL7
```

La tecnología backend podrá cambiar si SES/STIC/instituto tecnológico asume desarrollo. Lo importante es mantener un modelo de dominio limpio y portable.

---

### DEC-015 — El Hub debe diseñarse como sistema modular conectable

Reuma, Enfermería y Farmacia deben poder funcionar en tres modos:

1. **Independiente:** cada módulo funciona con su formulario, dashboard y fuente propia.
2. **Conectado:** un módulo lee información de otro y aporta eventos longitudinales.
3. **Ecosistema completo:** todos los módulos se integran por CIP/patient_id en una visión paciente.

Esta decisión evita crear una app monolítica rígida y prepara el futuro Hub Clínico Framework.

---

### DEC-016 — La demo sintética se amplía, no se crea desde cero

Existe ya base sintética/demo en GitHub. La tarea no es crearla desde cero, sino ampliarla con registros coherentes de Enfermería y Farmacia.

Objetivo de demo:

```text
Paciente sintético completo
├── evento Reuma
├── evento Enfermería
├── evento Farmacia
└── visión longitudinal integrada
```

---

### DEC-017 — La vista longitudinal se adapta a multiarchivo por CIP

No se parte de cero. La v2 ya piensa longitudinalmente. La tarea es adaptar/perfeccionar la vista para integrar eventos procedentes de varias fuentes:

- Excel Reuma.
- Excel Enfermería.
- Excel Farmacia.
- PROMs en fase futura.

Clave común inicial:

```text
CIP + fecha_evento + origen_evento + tipo_evento
```

---

### DEC-018 — Capa temporal de entrada multipatología en Farmacia

**Fecha:** 2026-06-05

**Decisión:** El módulo de Farmacia incorpora una capa temporal de entrada multipatología para la demo del 2026-06-08.

**Motivo:** La reunión con el jefe de Servicio de Farmacia de Cáceres requiere mostrar el circuito de Farmacia con HS/Dermatología como caso prioritario, pero Dermatología no tiene módulo completo en el Hub. En lugar de construir Dermatología completa de forma precipitada, se crea una capa de entrada que permite dos modos.

**Alcance:**
- HS/Dermatología: entrada manual/semi-estructurada desde orden clínica/JARA simulada.
- Reumatología: entrada estructurada desde el Hub Reuma v2 (flujo end-to-end).
- Farmacia multipatología: capaz de recibir solicitudes con distinto nivel de estructuración.

**Fuera de alcance:**
- No se construye Dermatología completa.
- No hay integración real con JARA.
- No hay cambio en el roadmap general.
- No hay uso de datos reales.
- No se duplica el repo.

**Impacto en demo:** Permite mostrar presente (entrada manual) y futuro (entrada estructurada) en una misma demo, validando el módulo de Farmacia sin esperar a que todos los servicios tengan módulo Hub.

**Relación con v2.1:** Es una capa táctica dentro del diseño de Farmacia. No modifica la arquitectura progresiva ni las fases del plan formativo. Ver `docs/ops/DECISION_CAPA_ENTRADA_FARMACIA_MULTIPATOLOGIA_20260605.md`.

---

### DEC-019 — Congelación de Farmacia Hospitalaria v0.1 como demo funcional multipatología

**Fecha:** 2026-06-06

**Decisión:** La rama nocturna `work/hermes/nightly-farmacia-v0-1-20260606` que contiene el prototipo funcional completo del módulo de Farmacia Hospitalaria v0.1 se congela para la demo del lunes 2026-06-08 con el jefe de Servicio de Farmacia Hospitalaria de Cáceres.

**Propósito de la demo:** Presentar un prototipo funcional del circuito de Farmacia Hospitalaria con datos sintéticos que demuestre la viabilidad del modelo multipatología y la entrada por buscador CIP, permitiendo al interlocutor clínico visualizar el flujo completo y dar feedback para el diseño funcional definitivo.

**Alcance de la demo congelada:**
- Módulo completo de Farmacia: buscador CIP, Quick View, alta guiada, validación farmacoterapéutica, primera visita, seguimiento con Morisky-Green, dashboard paciente, catálogos de fármacos y profesionales, estadísticas placeholder.
- 3 pacientes demo sintéticos (CIP-DEMO-FH-001/002/003) + alta guiada para CIP nuevos.
- Export TXT + CSV descargables.
- Estilo coherente con paleta SES del Hub.
- Smoke check automatizado 33/33 OK + CI workflow.

**Límites explícitos de la demo congelada:**
- **No merge automático.** La rama no se mergea a `feature/` sin revisión humana post-demo.
- **No datos reales.** Todos los datos son sintéticos (CIP-DEMO-FH-*).
- **No integración real** con JARA, SES o Pharmatool.
- **No seguridad productiva.** Perfil `farmaceutico` hardcodeado como filtro de interfaz.
- **No contratos definitivos.** El diseño funcional completo de Farmacia queda pendiente de la Fase 1-2 del plan formativo.
- **No persistencia real.** Datos en memoria de sesión JS. Se pierden al cerrar/refrescar navegador.
- **No backend ni API.**

**Qué se permite antes del lunes:**
- Revisión visual humana de todos los flujos.
- Ensayo del guion de demo.
- Fix crítico si aparece bug P0/P1 real aprobado por Sil.

**Qué NO se permite antes del lunes:**
- Nuevas funcionalidades.
- Persistencia real, backend, integración externa.
- Refactor de sidebar, limpieza HTML/CSS masiva, cambios visuales grandes.
- Cambios en datos demo salvo fix crítico aprobado.

**Impacto en roadmap:** Esta demo es un hito táctico. No cierra la Fase 1 del plan formativo ni sustituye el diseño funcional completo de Farmacia. Las decisiones funcionales reales se extraerán del feedback post-demo y se incorporarán al canvas de Fase 1.

**Referencias:**
- `docs/ops/CIERRE_BLOQUE_FARMACIA_V0_1_20260606.md`
- `docs/ops/FARMACIA_DEMO_FREEZE_20260606.md`
- `docs/ops/EXECUTIVE_SUMMARY_FARMACIA_DEMO_20260606.md`
- `docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md`

---

## 4. Versionado propuesto

### v1 — Legacy local Reuma

Versión previa a Reuma v2.

```text
tag: legacy-v1-main-antes-reuma-v2
```

---

### v2.0 — Reuma multipatología

Incluye AR, EspA, APs, LES, Sjögren, prebiológico/vacunación, Solicitud FH, eventos, dashboard y estadísticas v2.

```text
tag: v2.0.0-reuma-multipatologia
```

---

### v2.1 — MVP interservicios para Luis Bravo

Objetivo: demo funcional del 8 de julio.

Incluye:

- Reuma v2 estable.
- Perfil Reumatología.
- Perfil Enfermería.
- Perfil Farmacia.
- Formularios y dashboards por módulo.
- Fuentes separadas por rol.
- Carga multiarchivo.
- Visión longitudinal integrada por CIP.
- Dataset sintético ampliado.
- Narrativa institucional.

```text
release/mvp-luis-bravo-20260708
```

---

### v2.2 — Backend-ready hardening local-first

Objetivo: mejorar la app actual sin romper el piloto.

Incluye:

- diccionario clínico;
- modelo lógico;
- repository layer;
- validación fuerte de plantillas Excel;
- configuración declarativa;
- separación exportación/persistencia;
- auditoría mínima;
- importador PROMs futuro;
- separación demo/piloto.

Esta fase puede empezar antes del 8 de julio en tareas que no comprometan la demo.

---

### v3.0 — POC con backend real

Objetivo: demostrar evolución desde Excel a base de datos real con datos sintéticos.

```text
Frontend: React + TypeScript + Vite
Backend: Node.js + Fastify
DB: PostgreSQL/MySQL en OCI
```

---

### v4.0 — Hub Clínico Framework agnóstico

Objetivo: convertir el Hub en motor configurable para distintos servicios/patologías.

No es otra app. Es el motor del que Reuma sería una instancia.

---

## 5. Estrategia de ramas y repositorios

### 5.1. Repo actual

Mantener el repo actual para app local-first y MVP interservicios.

```text
main
└── Nueva base estable tras merge de Reuma v2

release/mvp-luis-bravo-20260708
└── Rama congelable para demo

feature/mvp-roles-enfermeria-farmacia
└── Desarrollo perfiles, formularios, dashboards y carga multiarchivo

feature/backend-ready-hardening-v2
└── Diccionario, repository layer, validación y configuración declarativa
```

---

### 5.2. Repo separado recomendado para POC backend

```text
hub-clinico-reuma-v3-poc
```

Contenido:

```text
/frontend
/backend
/database
/scripts
/docs
/data-synthetic
```

Objetivo:

- no contaminar la app local-first;
- trabajar solo con datos sintéticos;
- probar modelo normalizado;
- poder enseñar dirección técnica futura.

---

## 6. Arquitectura MVP v2.1

### 6.1. Principio operativo

```text
Una app local-first
Tres módulos funcionales
Tres fuentes de escritura separadas
Una visión integrada por CIP
```

---

### 6.2. Fuentes de datos MVP

| Fuente | Escribe | Lee | Finalidad |
|---|---|---|---|
| Excel Reuma v2 | Reumatología | Reuma, Enfermería, Farmacia | Visitas clínicas, scores, tratamientos, prebiológico |
| Excel Enfermería v1 | Enfermería | Enfermería, Reuma | Seguimiento, educación, adherencia, incidencias |
| Excel Farmacia v1 | Farmacia | Farmacia, Reuma/Enfermería si procede | Validación FH, pauta, EA, adherencia, observaciones |
| Dataset demo ampliado | Equipo proyecto | Todos | Demo multiperfil |

---

### 6.3. Contrato común de evento longitudinal

Para conectar módulos sin acoplarlos, cada evento debe poder transformarse a un mínimo común:

```text
patient_id_sintetico / CIP
fecha_evento
origen_evento: REUMA / ENFERMERIA / FARMACIA / PROM
modulo
patologia
tipo_evento
profesional_rol
resumen_evento
estado
observaciones
referencia_origen
```

La app puede mostrar este modelo común en una línea temporal aunque cada módulo guarde datos propios más ricos.

---

### 6.4. Módulos MVP

```text
Reuma
├── formulario clínico actual
├── Solicitud FH
├── dashboard paciente
└── estadísticas

Enfermería
├── formulario seguimiento
├── educación terapéutica
├── adherencia
├── vacunación / Medicina Preventiva
├── efectos adversos
└── dashboard seguimiento

Farmacia
├── formulario validación
├── fármaco / pauta / dosis
├── estado validación
├── adherencia si procede
├── efectos adversos si procede
└── dashboard validación
```

---

## 7. Mejoras backend-ready que pueden empezar ya

Estas tareas pueden avanzar antes del 8 de julio si no bloquean la demo.

### 7.1. Diccionario clínico de variables

Estructura recomendada:

```text
variable_id
nombre_columna_excel
nombre_clinico
modulo
patologia
tipo_registro
tipo_dato
unidad
rango_valido
obligatorio
fuente
quien_recoge
destino
descripcion
notas_migracion
posible_mapeo_fhir_snomed_loinc
```

Objetivo: dejar de depender de memoria/código para entender qué significa cada campo.

---

### 7.2. Modelo lógico común

Aunque físicamente sigamos con Exceles, conceptualmente el modelo debe empezar a verse así:

```text
patients
clinical_events
clinical_visits
nursing_followups
pharmacy_validations
treatments
prebiologic_checks
vaccination_status
scores
proms
exports
audit_log
```

---

### 7.3. Repository layer

La app no debería depender directamente de “leo Excel / escribo Excel”. Debe tender a:

```text
clinicalRepository.getPatient()
clinicalRepository.getVisits()
nursingRepository.saveFollowup()
pharmacyRepository.saveValidation()
timelineRepository.getEventsByPatient()
```

Hoy el repositorio puede usar Excel. Mañana API/base de datos.

---

### 7.4. Separación exportación / persistencia

Regla:

```text
TXT / JARA / e-Orden = salida clínica documental
Excel / DB = persistencia y explotación
Dashboard = visualización
```

No mezclar responsabilidades. La Solicitud FH debe seguir siendo una salida derivada.

---

### 7.5. Configuración clínica declarativa

Empezar a pasar de lógica quemada en código a configuración:

```text
pathologies.config.js
roles.config.js
forms.config.js
exports.config.js
fields.config.js
```

Esto es la semilla del Hub Clínico Framework.

---

### 7.6. Validación fuerte de plantillas Excel

La app debe poder detectar:

```text
plantilla correcta
faltan hojas
faltan columnas
sobran columnas críticas
versión incompatible
formato de fecha incorrecto
hoja no encontrada
```

Esta mejora aporta seguridad inmediata al MVP.

---

## 8. PROMs y capa paciente futura

No se implementa antes del 8 de julio salvo como narrativa o diseño.

Roadmap:

```text
Fase 1 — Hub clínico profesional
Fase 2 — PROMs remotos
Fase 3 — Extensión funcional del paciente
Fase 4 — Alternativas inclusivas desde Atención Primaria
```

Principio importante:

> PROMs domiciliarios para quien pueda; PROMs asistidos desde Atención Primaria para quien lo necesite.

Esto reduce sesgo digital y mejora equidad territorial.

---

## 9. Diseño recomendado para PROMs con Forms, si se permite

No hacer un Form por cuestionario salvo necesidad metodológica fuerte.

Preferible:

```text
PROMs_AR_Seguimiento
PROMs_ESPA_Seguimiento
PROMs_APS_Seguimiento
PROMs_LES_Seguimiento
PROMs_SJOGREN_Seguimiento
```

No preferible:

```text
BASDAI_Form
ASDAS_Form
HAQ_Form
RAPID3_Form
Fatiga_Form
CalidadVida_Form
```

Si Power Automate está permitido:

```text
Paciente completa Form
↓
Trigger respuesta nueva
↓
Get response details
↓
Añadir fila a PROMs_Master.xlsx
```

Si no está permitido:

```text
Forms → Excel propio por Form → exportación manual controlada → importador Hub
```

---

## 10. Arquitectura v3 recomendada

### 10.1. Arquitectura objetivo

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

---

### 10.2. Base de datos

Preferente:

```text
PostgreSQL en OCI
```

Alternativa:

```text
MySQL en OCI
```

La decisión se tomará por viabilidad, coste, facilidad de despliegue y portabilidad. El modelo debe ser independiente del motor elegido.

---

## 11. Modelo v4 agnóstico futuro

El núcleo conceptual del Hub Clínico Framework debería ser:

```text
Organization
└── Hospital / Área
    └── Service
        └── Clinical Program
            └── Pathology / Condition
                └── Journey
                    └── Visit Type
                        └── Form Sections
                            └── Fields / Scores / PROMs
```

Ejemplo Reuma:

```text
Hospital Badajoz
└── Reumatología
    └── PROMueve Reuma
        ├── AR
        ├── APs
        ├── EspA
        ├── LES
        └── Sjögren
```

Ejemplo Urticaria:

```text
Hospital X
└── Dermatología / Alergología
    └── Hub Urticaria
        ├── Urticaria crónica espontánea
        ├── Angioedema
        └── Urticaria inducible
```

La app debe ocultar la complejidad. El clínico no debe ver `OBSERVATIONS`; debe ver “Seguimiento AR”, “Validación FH” o “Consulta Enfermería”.

---

## 12. Hoja de ruta operativa — junio 2026

### Bloque 0 — Documentación viva y gobierno técnico

1. Actualizar dossier v1.2 con integración histórica y decisiones actuales.
2. Documentar módulos independientes/conectables.
3. Documentar que timeline = visión longitudinal por CIP.
4. Documentar que demo sintética se amplía, no se crea desde cero.
5. Mantener este documento en GitHub para Codex, Claude Code, KairOS/Hermes y futuros agentes.

---

### Bloque 1 — Ordenar base técnica actual

1. Promover/ordenar rama Reuma v2.
2. Crear rama MVP interservicios.
3. Congelar/taggear `main` legacy.
4. Confirmar dataset sintético actual.
5. Identificar qué módulos actuales ya sirven para Reuma.

---

### Bloque 2 — Contratos mínimos

Definir:

```text
Contrato módulo Reuma
Contrato módulo Enfermería
Contrato módulo Farmacia
Contrato común de paciente
Contrato común de evento longitudinal
```

---

### Bloque 3 — Perfiles y navegación

1. Selector de perfil.
2. Vista Reumatología.
3. Vista Enfermería.
4. Vista Farmacia.
5. Vista Demo/Admin.
6. Reglas de lectura/escritura funcionales.

---

### Bloque 4 — Formularios y dashboards por módulo

1. Mantener Reuma v2.
2. Crear formulario Enfermería.
3. Crear dashboard Enfermería.
4. Crear formulario Farmacia.
5. Crear dashboard Farmacia.
6. Mantener Solicitud FH como salida derivada.

---

### Bloque 5 — Visión longitudinal integrada

Adaptar/perfeccionar la vista existente para aceptar eventos de varias fuentes, ordenados por fecha y agrupados por CIP.

---

### Bloque 6 — Demo sintética ampliada

Ampliar la base sintética existente con casos de Enfermería y Farmacia.

Casos demo recomendados:

```text
Paciente estable
Paciente con prebiológico incompleto
Paciente con vacunación pendiente
Paciente con EA comunicado a Enfermería
Paciente con validación FH pendiente
Paciente con cambio terapéutico
Paciente con seguimiento longitudinal completo
```

---

### Bloque 7 — Mejoras backend-ready en paralelo

Empezar sin bloquear demo:

```text
diccionario clínico
modelo lógico
repository layer
validación de plantillas
configuración declarativa
separación exportación/persistencia
auditoría mínima
```

---

### Bloque 8 — Narrativa institucional

Preparar:

```text
piloto asistencial
modularidad
seguridad operativa
limitaciones conscientes del MVP
evolución a backend real
independencia de Excel como arquitectura final
```

---

## 13. Antes del 8 de julio

Entregables esperados:

```text
Demo Reuma v2
Demo Enfermería
Demo Farmacia
Vista longitudinal integrada por CIP
Dataset sintético ampliado
Guion demo
Mapa de evolución
Riesgos y limitaciones
Qué se pide a Luis Bravo / SES
```

---

## 14. Después del 8 de julio

Según respuesta institucional:

```text
1. Decidir si el piloto sigue local-first o entra en circuito institucional.
2. Iniciar v2.2 backend-ready hardening.
3. Crear diccionario clínico completo.
4. Crear repository layer progresivo.
5. Separar configuración clínica declarativa.
6. Empezar POC v3 en OCI/PostgreSQL con datos sintéticos.
7. Evaluar PROMs y alternativa Atención Primaria.
```

---

## 15. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---:|---|
| Mezclar escritura multirol en un Excel | Alto | Fuentes separadas por rol |
| Migrar a React antes del 8 julio | Alto | Mantener vanilla para MVP |
| SharePoint Lists bloqueado por tenant/STIC | Alto | No usar como backend MVP |
| Contrato ancho de 497 columnas | Medio | No tocar antes del MVP; normalizar después |
| Perfiles funcionales confundidos con seguridad real | Alto | Documentar limitación |
| POC DB con datos reales | Crítico | Solo datos sintéticos |
| Tres apps separadas por rol | Medio-Alto | App común modular |
| Falta de narrativa institucional | Alto | Dossier + roadmap + demo guiada |
| Farmacia contaminando fuente clínica | Alto | Fuente Farmacia propia |
| Enfermería escribiendo como Reuma | Alto | Fuente Enfermería propia y tipo de evento diferenciado |
| Sobreexpandir PROMs/paciente antes del piloto | Alto | Primero profesional; luego paciente |

---

## 16. Decisiones pendientes

| Decisión | Fecha objetivo | Responsable sugerido |
|---|---:|---|
| Promover v2 a main | Semana 0 | Equipo técnico |
| Nombre final release MVP | Semana 0 | Sil/Cora |
| Campos mínimos Enfermería | Semana 1 | Sil + clínicos |
| Campos mínimos Farmacia | Semana 1 | Sil + Sara/Luis/FH |
| Alcance de visión longitudinal v2.1 | Semana 1 | Equipo técnico |
| Alcance de dataset sintético ampliado | Semana 1 | Equipo técnico |
| Si demo usa GitHub Pages o ejecución local | Semana 2 | Sil/técnico |
| Alcance exacto POC DB en OCI | Semana 2 | Sil/Cora/técnico |
| Qué se pide a Luis Bravo | Semana 4 | Sil/Sara |
| Nivel de implicación SES/STIC | 8 julio | Luis Bravo/SES |

---

## 17. Referencias internas

Repositorio:

```text
b32majus/Hub-Clinico-Badajoz
```

Rama avanzada:

```text
feature/reuma-v2-prebiologico-fh-les-sjogren
```

Documentos relevantes:

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

## 18. Principio final

> **El Hub debe avanzar como piloto asistencial local-first, pero pensar como plataforma clínica interoperable desde el primer día.**

> **No estamos construyendo un Excel bonito. Estamos construyendo un modelo progresivo de coordinación clínica entre Reumatología, Enfermería y Farmacia Hospitalaria. El Excel es solo el andamio del MVP.**
