# Arquitectura objetivo V4 — PROMueve Nexus / FarmaNEXus

| Metadato | Valor |
|---|---|
| Fecha | 2026-07-31 |
| Estado | Arquitectura objetivo aprobada por Sil/Cora para orientar desarrollo gobernado |
| Aprobación institucional | No |
| Implementación completa | No |
| Base publicada | `recovery/farmacia-pr-replay-20260727` @ `accac670ba216d8c291ee849d2198742d02bb3f0` |
| Ámbito inicial | Farmacia Hospitalaria, comenzando por Cáceres |
| Datos reales | No autorizados por este documento |
| Relación | Roadmap post-SES, control plane federado, Treatment Lifecycle, PROM Gateway e Identity Plane |

> Este documento fija la dirección técnica y funcional de V4. No autoriza un backend productivo, uso asistencial, integración institucional, migraciones con datos reales ni la V5 agnóstica completa.

---

## 1. Decisión resumida

**PROMueve Nexus V4** será una aplicación hospitalaria local-first, backend-ready y configurable. **FarmaNEXus** será su módulo de Farmacia Hospitalaria.

La arquitectura debe permitir avanzar ahora con Excel y datos sintéticos sin convertir Excel en el modelo de dominio ni cerrar la puerta a:

- PostgreSQL o API hospitalaria;
- configuración no-paciente en Supabase;
- automatización Microsoft 365;
- captura futura de PROMs;
- mapeos FHIR;
- plantillas/arquetipos openEHR;
- despliegues separados de Cáceres, Badajoz y Mérida.

Principio central:

```text
El Hub captura un acto profesional una sola vez
→ crea un evento canónico versionado
→ los adaptadores generan cada salida necesaria
```

La profesional no debe volver a dar de alta al mismo paciente en varios Excels o aplicaciones.

---

## 2. Nomenclatura provisional

| Nivel | Nombre | Uso |
|---|---|---|
| Plataforma | **PROMueve Nexus** | Marco transversal para módulos clínicos y asistenciales |
| Módulo | **FarmaNEXus** | Farmacia Hospitalaria |
| Despliegue | **PROMueve Nexus — Cáceres** | Configuración del Área de Salud de Cáceres |
| Despliegue | **PROMueve Nexus — Badajoz** | Configuración del Área de Salud de Badajoz |
| Despliegue | **PROMueve Nexus — Mérida** | Configuración del Área de Salud de Mérida |

La nomenclatura es una decisión interna de producto pendiente de aplicación visual y validación externa. No debe mezclarse con los quick wins clínicos urgentes.

---

## 3. Objetivos de V4

V4 debe conseguir:

1. Formularios clínico-operativos seguros y utilizables.
2. Pacientes arbitrarios introducidos mediante el flujo normal, sin depender de fixtures hardcodeados.
3. Persistencia provisional por hospital mediante Excel Bridge.
4. Modelo canónico y diccionario de variables versionados.
5. Repository layer que desacople pantallas y almacenamiento.
6. Configuración no-paciente fuera del código mediante un Control Plane.
7. Catálogo CIMA oficial regenerable y catálogo local especial separado.
8. Parsers deterministas para reducir doble registro.
9. Treatment Lifecycle y renovaciones por línea cuando existan datos explícitos.
10. Adaptadores documentales y estructurados desacoplados.
11. Preparación realista para FHIR y openEHR.
12. Ruta de migración a servidor hospitalario sin rehacer el producto.

V4 no pretende construir todavía un motor universal para cualquier servicio, patología y hospital. Esa generalización corresponde a V5.

---

## 4. Principios no negociables

1. Seguridad clínica antes que automatización.
2. Una solicitud no es una validación.
3. Una validación positiva no es un inicio.
4. Una línea evaluada no es una dispensación.
5. Un tratamiento adicional no demuestra switch.
6. La ausencia de acción no demuestra renovación.
7. Los datos ausentes permanecen vacíos, desconocidos o pendientes.
8. El catálogo ayuda a identificar y seleccionar; no decide terapia.
9. La selección explícita de una presentación puede proponer datos editables, pero nunca pauta, inducción, duración o movimientos.
10. Una pantalla no es el modelo de datos.
11. Excel no es el contrato de dominio.
12. FHIR y openEHR no se generan desde una hoja como fuente conceptual.
13. Ninguna arquitectura futura añadirá varios pasos manuales de alta del paciente.
14. Toda automatización debe ser idempotente, trazable y con fallo seguro.
15. Demo, evaluación, piloto y producción son estados diferentes.

---

## 5. Arquitectura por planos

```text
PROMueve Nexus
│
├── Experience Plane
│   └── pantallas y journeys de FarmaNEXus
│
├── Domain / Canonical Event Plane
│   └── actos, líneas, visitas, observaciones y eventos versionados
│
├── Data Plane por hospital
│   ├── V4 inicial: Excel Bridge
│   └── futuro: PostgreSQL / API / repositorio institucional
│
├── Control Plane no-paciente
│   └── Supabase o repositorio equivalente de configuración
│
├── Catalog Plane
│   ├── CIMA oficial versionado en GitHub
│   └── catálogo local especial por hospital
│
├── Automation Plane
│   └── Office Scripts y Power Automate opcional
│
├── Interoperability Plane
│   └── JARA TXT, Excel, API, FHIR y openEHR
│
└── Identity Plane futuro
    └── CIP ↔ patient_id / hub_patient_key en servidor local autorizado
```

Los planos son responsabilidades. No obligan a desplegar una base diferente para cada uno desde el primer día.

---

## 6. Experience Plane

Incluye las superficies profesionales:

- Inicio y bandejas;
- Validación;
- Primera Visita;
- Seguimiento;
- dashboard de paciente;
- dashboard longitudinal;
- actividad y estadísticas;
- profesionales;
- catálogo local;
- futura bandeja de renovaciones.

### Reglas

- La profesional usa el flujo normal incluso en evaluación sintética.
- No existe modo ni botón `Nuevo paciente sintético`.
- El entorno avisa de que solo admite datos sintéticos.
- Un CIP inventado puede iniciar el recorrido normal.
- Los fixtures demo se conservan para regresión, pero no son requisito del funcionamiento.
- Las pantallas consumen casos de uso/repositorios, no hojas Excel directamente cuando se complete la transición.

---

## 7. Modelo canónico y eventos

### 7.1 Unidad de persistencia

Una fila o evento representa **un acto concreto**, no toda la vida del paciente.

```text
Paciente X
├── evento 1: solicitud / validación
├── evento 2: Primera Visita
├── evento 3: Seguimiento
├── evento 4: Seguimiento con varias líneas
└── evento 5: renovación confirmada
```

La historia longitudinal se reconstruye mediante identificadores y fechas estables.

### 7.2 Envelope común

Todo acto canónico debe incluir, como mínimo:

```json
{
  "schema_version": "1.0.0",
  "event_id": "EVT-...",
  "event_type": "pharmacy_validation",
  "occurred_at": "2026-08-04T10:30:00+02:00",
  "recorded_at": "2026-08-04T10:32:10+02:00",
  "hospital_code": "CAC",
  "service_code": "DERMA",
  "pathology_code": "HS",
  "patient_id": "PAT-...",
  "source_event_id": "SRC-...",
  "professional_ref": "PRO-...",
  "payload": {},
  "provenance": {},
  "quality_flags": []
}
```

### 7.3 Identificadores

| Identificador | Significado |
|---|---|
| `patient_id` | Identificador técnico opaco del Hub |
| `event_id` | Identidad del acto persistido |
| `source_event_id` | Clave idempotente del origen/exportación |
| `request_id` | Solicitud clínica |
| `validation_id` | Acto de validación FH |
| `treatment_id` | Identidad conceptual de tratamiento |
| `line_id` | Identidad estable de línea terapéutica |
| `visit_id` | Identidad de visita |
| `ea_id` | Efecto adverso común a la visita |
| `suspect_id` | Sospechoso explícito para causalidad |
| `renewal_cycle_id` | Ciclo de renovación por línea |

No se inventan identidades por posición, nombre del fármaco, primera coincidencia o índice de array.

### 7.4 Entidades V4

- `PatientReference`
- `ClinicalRequest`
- `PharmacyValidation`
- `TreatmentLine`
- `TreatmentMovement`
- `PharmacyVisit`
- `VisitLine`
- `Observation`
- `Score`
- `QuestionnaireResponseRef`
- `AdverseEvent`
- `CausalityAssessment`
- `RenewalCycle`
- `RenewalTask`
- `ProfessionalReference`
- `Provenance`
- `AuditEvent`

---

## 8. Identidad: decisión de diferimiento

### 8.1 Lo que no se implementa ahora

Durante el ciclo de vacaciones no se creará:

- un Excel adicional de correspondencia;
- una tabla manual que la profesional tenga que alimentar;
- una pantalla de alta técnica separada;
- una copia repetida de CIP en varios archivos;
- un Identity Plane cloud;
- un circuito PROM real.

### 8.2 Lo que sí se prepara

- `patient_id` técnico estable y opaco;
- separación conceptual entre `patient_id` e identificador operativo local;
- `identifier_system` e `identifier_value` en la capa de adaptación;
- interfaz futura `IdentityRepository`;
- política de no duplicado y recuperación de identidad;
- costura para `hub_patient_key`.

En evaluación sintética, el Hub puede generar automáticamente `patient_id` a partir del acto, sin pedir trabajo adicional al usuario.

### 8.3 Gate de activación

El Identity Plane físico se implementará cuando exista al menos una de estas condiciones:

1. Servidor local o backend hospitalario autorizado.
2. PROM Gateway externo que necesite seudonimización.
3. Envío de eventos seudonimizados fuera del Hub profesional.
4. Mecanismo automático y autorizado de creación/recuperación de identidad.
5. Autenticación, auditoría y custodia institucional definidas.

El trigger HTML de Power Automate puede facilitar automatización, pero no resuelve la custodia de la correspondencia de identidad.

### 8.4 Experiencia objetivo futura

```text
La profesional introduce CIP una vez
→ el Hub consulta IdentityRepository
→ recupera o crea patient_id/hub_patient_key
→ guarda la correspondencia local
→ continúa el acto
```

La identidad será una capacidad invisible, no una nueva tarea administrativa.

---

## 9. Data Plane V4: Excel Bridge por hospital

### 9.1 Despliegue

- un libro para Cáceres;
- un libro para Badajoz;
- un libro para Mérida;
- sin consolidación regional automática;
- mismo contrato, scripts y esquema;
- configuración y branding propios.

Primer libro:

`PROMueve_FH_Caceres_Bridge_DEMO.xlsx`

### 9.2 Hojas visibles/nativas Cáceres

- `01_DERMA`
- `03_DIGESTIVO`

Cada fila nativa conserva exactamente el evento exportado por el Hub.

### 9.3 Hojas técnicas

- `PATIENTS`
- `REQUESTS`
- `VALIDATIONS`
- `TREATMENTS`
- `TREATMENT_LINES`
- `TREATMENT_MOVEMENTS`
- `VISITS`
- `VISIT_LINES`
- `OBSERVATIONS`
- `PROMS`
- `ADVERSE_EVENTS`
- `CAUSALITY`
- `RENEWAL_CYCLES`
- `RENEWAL_TASKS`
- `AUDIT_EVENTS`
- `IMPORT_ERRORS`
- `APP_PATIENTS_SNAPSHOT`
- `APP_LONGITUDINAL`

La lista puede ajustarse al contrato real; no debe convertirse en proliferación de hojas sin relación clara.

### 9.4 Flujo profesional

```text
Hub
→ Copiar fila del acto
→ Pegar una vez en la hoja del servicio
→ Procesar pendientes
```

### 9.5 Office Script

Responsabilidades:

1. Detectar filas `PENDIENTE`.
2. Validar `schema_version`.
3. Validar `source_event_id`.
4. Rechazar duplicados de forma idempotente.
5. Conservar la fila nativa.
6. Descomponer en tablas relacionadas.
7. No corregir ni inferir clínica.
8. Marcar `PROCESADA` o `ERROR`.
9. Registrar el error sin destruir la entrada.
10. Generar vistas `APP_*` para lectura del Hub.

### 9.6 Roundtrip

```text
Hub crea actos
→ Excel Bridge los persiste
→ el Hub carga las vistas APP
→ reconstruye al paciente
→ continúa su recorrido
```

El roundtrip se demostrará con datos sintéticos antes de solicitar servidor.

---

## 10. Repository layer

Interfaces objetivo:

- `PatientRepository`
- `RequestRepository`
- `PharmacyValidationRepository`
- `TreatmentRepository`
- `VisitRepository`
- `ObservationRepository`
- `PromRepository`
- `RenewalRepository`
- `CatalogRepository`
- `ConfigurationRepository`
- `IdentityRepository` futuro
- `AuditRepository`

Implementaciones progresivas:

- `DemoRepository`
- `ExcelBridgeRepository`
- `SupabaseConfigRepository`
- `PostgresRepository` futuro
- `InstitutionalApiRepository` futuro

### Contrato mínimo

Cada repositorio debe:

- validar esquema;
- fallar de forma explícita;
- no convertir ausencia en dato;
- preservar `0`, `false` y cadena vacía según contrato;
- soportar versionado y migraciones controladas;
- ofrecer idempotencia donde proceda;
- devolver procedencia y errores útiles;
- evitar lógica clínica específica del soporte físico.

---

## 11. Control Plane no-paciente

### 11.1 Objetivo

Extraer del código la configuración administrativa y funcional sin almacenar datos de pacientes.

Supabase es el candidato inicial de laboratorio/configuración; no es una obligación tecnológica irreversible.

### 11.2 Puede contener

- hospitales/tenants;
- servicios;
- programas y patologías habilitadas;
- profesionales sintéticos o profesionales autorizados según entorno;
- roles y permisos funcionales;
- formularios declarativos JSON;
- filtros guardados JSON;
- reglas de alerta JSON;
- widgets de dashboard;
- perfiles de exportación;
- diccionario de variables;
- catálogo local especial;
- alias y favoritos;
- ensayos clínicos;
- uso compasivo;
- medicación extranjera;
- versiones de configuración;
- auditoría de cambios de configuración.

### 11.3 No puede contener en esta fase

- CIP, NHC, nombre u otros identificadores de pacientes;
- solicitudes clínicas individuales;
- validaciones;
- tratamientos o líneas;
- visitas;
- respuestas de formularios;
- PROMs;
- efectos adversos;
- resultados de cohortes;
- alertas o tareas individuales de pacientes.

### 11.4 Semántica

- Un filtro guarda criterios, no resultados.
- Un formulario guarda estructura, no respuestas.
- Una regla guarda condiciones, no decisiones clínicas.
- Un widget guarda configuración, no métricas persistidas.
- Una plantilla de exportación no altera la verdad del acto.

### 11.5 Vertical Control Plane v0.1

Debe demostrar, con datos sintéticos:

- tenant Cáceres;
- servicios Dermatología y Digestivo;
- profesionales sintéticos;
- patologías habilitadas;
- catálogo local especial;
- una definición de formulario;
- un filtro;
- una regla de alerta;
- un perfil de exportación;
- versionado y auditoría.

El Hub debe consumir al menos la configuración de Cáceres sin incrustarla de nuevo en código.

---

## 12. Catalog Plane

### 12.1 CIMA oficial

CIMA continuará versionado en GitHub porque es:

- oficial/regenerable;
- común;
- revisable por diff;
- reproducible;
- independiente de pacientes;
- distribuible con snapshots.

Artefactos objetivo:

- catálogo normalizado JSON;
- catálogo hospitalario filtrado;
- metadata;
- fecha de extracción;
- versión de esquema;
- checksum;
- informe de cambios.

### 12.2 Estado real de la actualización mensual

La actualización mensual está documentada, pero no está implementada.

Secuencia requerida:

```text
extracción manual validada
→ script reproducible
→ workflow_dispatch
→ validación de integridad
→ informe de diff
→ PR revisable
→ programación mensual
```

La Action nunca actualizará `main` o un snapshot hospitalario de forma silenciosa.

### 12.3 Catálogo local

Vive en el Control Plane o repositorio local equivalente:

- medicación extranjera;
- ensayos;
- uso compasivo;
- precomercialización;
- protocolos y alias locales;
- favoritos y visibilidad por servicio.

No se sobrescribe al actualizar CIMA.

---

## 13. Automation Plane

### 13.1 Office Scripts

Camino obligatorio para el Excel Bridge:

- ejecución manual mediante botón;
- append-only/idempotencia;
- informe de filas procesadas y rechazadas;
- sin decisiones clínicas.

### 13.2 Power Automate

Mejora opcional:

- el flujo y conexión al libro/script han sido demostrados parcialmente;
- la ejecución completa está pendiente por incompatibilidad técnica del script;
- no se detectó bloqueo corporativo previo;
- se limita la investigación a un día;
- si aparecen permisos, conectores o gobernanza, se detiene y documenta.

Posibles usos futuros:

- detectar un archivo o evento de entrada;
- ejecutar el Office Script;
- archivar/versionar;
- generar notificaciones administrativas;
- mover información no clínica entre ubicaciones autorizadas.

No puede decidir tratamiento, validación, renovación, causalidad o dispensación.

### 13.3 Trigger HTML

Se evaluará si un HTML externo autorizado puede activar un flujo sin exponer secretos ni datos clínicos. Hasta demostrarlo, no condiciona el diseño del Hub, Identity Plane o PROM Gateway.

---

## 14. Parsers de entrada

### 14.1 Orden clínica de Dermatología

Fuente: texto estructurado generado por la plantilla acordada.

Flujo:

```text
Pegar texto
→ reconocer secciones y etiquetas
→ normalizar sin inferir
→ mostrar valor actual y propuesto
→ confirmar
→ aplicar campos seleccionados
```

Reglas:

- parser determinista, no IA;
- conservar texto fuente;
- no sobrescribir silenciosamente;
- campos ausentes permanecen vacíos;
- justificación clínica de Dermatología es diferente de Observaciones FH;
- tratamiento solicitado no se convierte en validado.

### 14.2 Presalud

- parser condicionado al texto exacto del portapapeles;
- delimitador y orden se validarán contra evidencia real;
- preview antes de aplicar;
- origen y correspondencia visibles;
- no inventar fixtures productivos si falta el formato;
- fechas explícitas pueden alimentar renovaciones;
- Presalud puede no existir al comenzar la validación, pero Farmacia termina creándolo.

---

## 15. Treatment Lifecycle y renovaciones

La renovación pertenece a una línea de tratamiento.

### Fuente preferente

1. `prescription_valid_until` explícita.
2. Fecha de emisión más duración confirmada.
3. Periodo restante verificado por Farmacia.
4. Estimación manual visible y pendiente.

### Estados provisionales de bandeja

- vigente;
- próxima;
- vencida;
- fecha ausente;
- pendiente de revisión.

### Separación de responsabilidades

- JSON de regla: definición.
- Rules Engine: evaluación.
- tarea: trabajo persistente.
- alerta: representación visual.
- notificación: canal.

Supabase puede guardar la definición de la regla. El Data Plane guarda ciclos y tareas individuales.

No marcar renovado automáticamente. La renovación requiere confirmación explícita de Farmacia o del rol institucional que se defina.

---

## 16. Interoperability Plane

### 16.1 Principio

```text
Formulario
→ evento canónico
    ├── adaptador JARA TXT
    ├── adaptador Excel
    ├── adaptador PostgreSQL/API
    ├── adaptador FHIR
    └── adaptador openEHR
```

Excel no será la fuente conceptual de FHIR u openEHR.

### 16.2 FHIR-ready

Candidatos iniciales, sujetos a perfiles del SES:

| PROMueve | FHIR candidato |
|---|---|
| PatientReference | `Patient` / `Patient.identifier` |
| Patología | `Condition` |
| Acto o visita | `Encounter` |
| Solicitud clínica | `MedicationRequest` |
| Tratamiento declarado previo | `MedicationStatement` |
| Dispensación explícita | `MedicationDispense` |
| Observación/score | `Observation` |
| PROM | `QuestionnaireResponse` y/o `Observation` |
| Efecto adverso | `AdverseEvent` |
| Tarea de renovación | `Task` |
| Profesional | `Practitioner` / `PractitionerRole` |
| Procedencia | `Provenance` |
| Auditoría | `AuditEvent` |

La validación farmacéutica no se forzará prematuramente a un único recurso. Se mantendrá una entidad interna clara hasta conocer perfiles y guías institucionales.

### 16.3 openEHR-ready

Los actos pueden proyectarse como composiciones:

- `COMPOSITION Validación farmacoterapéutica`;
- `COMPOSITION Primera visita FH`;
- `COMPOSITION Seguimiento FH`;
- `COMPOSITION Renovación de línea`.

Cada composición podría incluir arquetipos/entradas para contexto, tratamiento, observaciones, PROMs, efectos adversos y resultado profesional. Los arquetipos, plantillas, terminologías y CDR no se deciden en esta fase.

### 16.4 Entregables de preparación

- JSON Schema del envelope y actos principales;
- diccionario de variables;
- matriz de mapeo Excel/JARA/FHIR/openEHR;
- un ejemplo sintético de Validación proyectado a:
  - fila Excel;
  - TXT JARA;
  - Bundle FHIR candidato;
  - COMPOSITION openEHR candidata.

La prueba demuestra portabilidad conceptual, no interoperabilidad institucional.

---

## 17. Diccionario de variables

Campos mínimos:

- `variable_id`;
- `label_clinico`;
- definición;
- servicio;
- patología;
- rol de captura/revisión;
- tipo de acto;
- sección;
- tipo de dato;
- unidad;
- rango;
- obligatoriedad;
- fuente;
- procedencia;
- destino;
- mapeo Excel;
- mapeo JARA;
- mapeo FHIR candidato;
- mapeo openEHR candidato;
- terminología candidata;
- versión;
- estado;
- fecha y responsable de validación.

Ningún mapeo terminológico se presenta como aprobado sin revisión especializada.

---

## 18. Despliegues por hospital

Código funcional común más configuración:

```text
deployments/
├── caceres.json
├── badajoz.json
└── merida.json
```

Configuración prevista:

- nombre visible;
- código de hospital/área;
- servicios habilitados;
- patologías habilitadas;
- módulos;
- perfil de evaluación;
- libro Excel asociado;
- perfil de exportación;
- endpoints/configuración futura;
- versión de despliegue.

No se crearán tres forks funcionales independientes.

---

## 19. V4, V4.5 y V5

### V4

- aplicación local-first;
- Excel Bridge;
- modelo canónico;
- repository layer;
- Control Plane no-paciente;
- parsers deterministas;
- adaptadores desacoplados;
- backend-ready.

### V4.5

- servidor PostgreSQL local;
- API progresiva;
- automatización institucional;
- captura PROM autorizada;
- Identity Plane físico invisible;
- sustitución gradual del Excel;
- integración inicial con sistemas corporativos.

### V5

Hub agnóstico configurable por:

- organización;
- hospital;
- servicio;
- programa;
- patología;
- journey;
- tipo de visita;
- formulario;
- variable;
- score;
- widget;
- regla.

V5 no se implementa durante el ciclo de vacaciones. V4 reserva claves y contratos que evitan bloquearla.

---

## 20. Migración Excel → servidor

1. Estabilizar eventos y diccionario.
2. Cerrar roundtrip sintético en Excel.
3. Implementar repositorios y tests de contrato.
4. Diseñar esquema PostgreSQL desde entidades, no desde columnas anchas.
5. Crear migración con trazabilidad a fila/celda original.
6. Probar paridad con datos sintéticos.
7. Incorporar servidor local e Identity Plane.
8. Activar PROMs externos solo con seguridad y gobierno aprobados.
9. Mantener fallback/exportación mientras se valida la migración.
10. Retirar Excel solo tras evidencia y plan de reversión.

---

## 21. Seguridad, privacidad y operación

- datos sintéticos en GitHub, Pages, Supabase de laboratorio y M7;
- ningún identificador real en repositorio;
- secretos fuera del frontend y del repo;
- control de acceso real en backend, no por ocultar botones;
- RLS o controles equivalentes en cualquier backend sensible;
- logs minimizados;
- exportaciones controladas;
- versionado y backup;
- auditoría de cambios relevantes;
- separación por hospital/tenant;
- validación STIC/DPO antes de datos reales;
- no se considera seudonimizado como anónimo.

---

## 22. Criterios de éxito de la arquitectura V4

La arquitectura estará demostrada en laboratorio cuando:

1. Un CIP sintético arbitrario pueda completar el flujo normal.
2. El Hub cree `patient_id`, eventos e IDs sin trabajo manual adicional.
3. Validación, Primera Visita y Seguimiento generen eventos canónicos.
4. El Excel Bridge procese e identifique duplicados.
5. El Hub reconstruya la historia desde el Bridge.
6. Las pantallas no dependan exclusivamente de fixtures.
7. El Control Plane configure Cáceres sin datos de pacientes.
8. CIMA oficial y catálogo local estén separados.
9. El parser de orden clínica tenga preview y confirmación.
10. Presalud se procese solo desde evidencia real.
11. Las renovaciones se calculen por línea y fuente explícita.
12. Un acto pueda proyectarse a Excel/JARA/FHIR/openEHR candidato.
13. Tests y QA navegador sean verdes.
14. La documentación distinga implementado, demostrado, pendiente y no apto para piloto.

---

## 23. Decisiones pendientes

- contenido final de Digestivo;
- diccionario regional de patologías;
- formato exacto Presalud;
- definición SEFH/PROs;
- disponibilidad y características del servidor;
- posibilidad real del trigger HTML de Power Automate;
- arquitectura FHIR/openEHR del SES;
- perfiles y terminologías institucionales;
- autenticación y autorización;
- custodia de identidad;
- retención y auditoría;
- nomenclatura externa definitiva.

---

## 24. Límites

Este documento no autoriza:

- implementación automática de todas las piezas;
- datos reales;
- despliegue productivo;
- servidor FHIR;
- CDR openEHR;
- Identity Plane manual;
- PROM Gateway real;
- multi-tenant clínico central;
- merge en `main`;
- mezcla con Reuma v2;
- V5 completa.

Cada bloque requiere su WO atómica, tests, QA y autorización concreta.