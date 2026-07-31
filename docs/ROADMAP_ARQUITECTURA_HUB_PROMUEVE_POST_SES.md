# Roadmap de arquitectura PROMueve Nexus post-SES

| Metadato | Valor |
|---|---|
| Estado | Roadmap vivo aprobado por Sil/Cora para orientar desarrollo; pendiente de validación institucional |
| Fecha de esta reconciliación | 2026-07-31 |
| Documento original | 2026-07-10; preservado en el historial Git |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama Farmacia publicada | `recovery/farmacia-pr-replay-20260727` |
| HEAD publicado Farmacia | `accac670ba216d8c291ee849d2198742d02bb3f0` |
| Último SHA funcional Farmacia | `54f6bb2cc5cb9c46b4121e8148c00a065f1bca6c` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.2` |
| Propietaria / validadores | Silvia / Cora |
| Aprobación SES / Salud Digital / STIC | No consta |
| Datos reales | No autorizados por este documento |

> Este roadmap sustituye como orientación viva a la versión fechada el 2026-07-10. La evolución histórica permanece trazable en Git. No autoriza producción, piloto, datos reales, contratos clínicos definitivos ni integración institucional.

---

## 1. Fuentes actuales relacionadas

1. [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md) — estado realmente publicado y demostrado.
2. [`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md) — secuencia de trabajo 2026-07-31 a 2026-08-15.
3. [`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md) — arquitectura objetivo V4 detallada.
4. [`docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md`](/docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md) — separación vigente entre Reuma y Farmacia.
5. [`docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`](/docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md) — renovaciones por línea.
6. [`docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](/docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md) — captura PROM futura.
7. [`docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md`](/docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md) — arquitectura de identidad futura.

---

## 2. Contexto post-SES actualizado

PROMueve ya no puede entenderse únicamente como una aplicación de Reumatología. El proyecto está evolucionando hacia una plataforma modular que conecta:

- servicios clínicos;
- Enfermería;
- Farmacia Hospitalaria;
- datos estructurados;
- salidas para el registro corporativo;
- configuración común;
- futura interoperabilidad.

Existen dos necesidades simultáneas:

1. **Necesidad local inmediata:** los equipos de Farmacia quieren una herramienta útil ahora, aunque el soporte temporal sea Excel.
2. **Necesidad institucional:** Servicios Centrales y Salud Digital necesitan una solución gobernable, interoperable, segura y mantenible.

La respuesta no es elegir uno de los extremos. El proyecto seguirá una vía progresiva:

```text
Evaluación local sintética
→ V4 local-first backend-ready
→ servidor hospitalario / V4.5
→ integración institucional
→ V5 agnóstica cuando exista madurez suficiente
```

---

## 3. Nomenclatura provisional

| Nivel | Nombre provisional | Uso |
|---|---|---|
| Plataforma | **PROMueve Nexus** | Marco transversal, neutral para clínica, Enfermería y Farmacia |
| Módulo | **FarmaNEXus** | Farmacia Hospitalaria |
| Despliegue | **PROMueve Nexus — Cáceres** | Área de Salud de Cáceres |
| Despliegue | **PROMueve Nexus — Badajoz** | Área de Salud de Badajoz |
| Despliegue | **PROMueve Nexus — Mérida** | Área de Salud de Mérida |

La nomenclatura se considera aprobada como lenguaje interno provisional. Su aplicación visual y uso externo requieren decisión específica.

No se crearán forks funcionales por hospital. La diferenciación se resolverá mediante configuración y snapshots/despliegues trazables.

---

## 4. Filosofía de producto

> PROMueve Nexus debe capturar una vez el acto profesional, representarlo mediante un modelo canónico seguro y producir las distintas salidas mediante adaptadores intercambiables.

Consecuencias:

- una pantalla no es el modelo de datos;
- Excel es un soporte provisional, no el dominio;
- FHIR/openEHR no se construyen traduciendo celdas directamente;
- la configuración no-paciente se separa de la actividad clínica;
- el profesional no repite el alta en múltiples archivos;
- la migración a servidor no obliga a reescribir el circuito;
- la ausencia de datos nunca se rellena mediante inferencia.

---

## 5. Estado real de las líneas de producto

### 5.1 Reuma v2

- Rama canónica propia: `feature/reuma-v2-prebiologico-fh-les-sjogren`.
- Contrato Excel ancho de 497 columnas.
- Patologías: AR, EspA, APs, LES y Sjögren.
- Se mantiene separada de Farmacia por decisión post-SES.
- No debe absorber Farmacia sin discovery, contrato y WO específica.

### 5.2 Farmacia regional

- Rama publicada: `recovery/farmacia-pr-replay-20260727`.
- HEAD actual: `accac670...`.
- Último bundle funcional: `54f6bb2...`.
- Validación, Primera Visita, Seguimiento multilínea, causalidad, dashboards, CIMA y salidas provisionales demostrados.
- Evaluación con datos sintéticos: sí.
- Piloto real: no.

### 5.3 Cáceres

- Snapshot: `CÁCERES-REVIEW-0.2`.
- Fuente funcional: `54f6bb2...`.
- QA humana pública: PASS.
- Primer frente operativo V4: Dermatología y Digestivo.
- Digestivo definitivo: pendiente de formulario/consenso.

### 5.4 Badajoz y Mérida

- Existen conversaciones favorables para disponer de servidor cuando el modelo esté probado.
- Sus despliegues deberán mostrar nombre propio y mantener datos separados.
- El circuito clínico no se presume idéntico a Cáceres.
- La plataforma, contratos y arquitectura sí deben ser homogéneos.

---

## 6. Fases de producto

Las fases siguientes son hitos de producto, no releases, tags ni ramas.

| Fase | Objetivo | Estado 2026-07-31 |
|---|---|---|
| **V3** | Demo institucional comprensible con datos sintéticos | Alcanzada parcialmente; Farmacia y Cáceres demostrados |
| **V4** | App local-first, backend-ready, configurable y persistente mediante Excel Bridge | Ciclo activo |
| **V4.5** | Servidor local/API/PostgreSQL, automatización e Identity Plane invisible | Condicionada a infraestructura y gobierno |
| **V5** | Hub agnóstico configurable por organización, servicio, patología, journey, visita y variable | Diferida; no iniciar ahora |

### V4 no significa piloto real

Para considerar piloto serán necesarios, además:

- infraestructura autorizada;
- datos y contratos validados;
- autenticación/autorización;
- auditoría;
- soporte;
- continuidad y backup;
- aprobación de seguridad/DPO/STIC;
- responsabilidades asistenciales definidas;
- QA y validación con usuarios.

---

## 7. Arquitectura V4 por planos

| Plano | Responsabilidad actual/futura |
|---|---|
| Experience Plane | Formularios, bandejas, dashboards y navegación profesional |
| Canonical Event Plane | Actos versionados, IDs, líneas, visitas y procedencia |
| Data Plane | Excel Bridge por hospital; futuro PostgreSQL/API |
| Control Plane | Configuración no-paciente, inicialmente candidata a Supabase |
| Catalog Plane | CIMA oficial en GitHub + catálogo local especial |
| Automation Plane | Office Scripts; Power Automate opcional |
| Interoperability Plane | JARA TXT, Excel, API, FHIR y openEHR |
| Identity Plane | Futuro servidor local para CIP ↔ `patient_id` / `hub_patient_key` |

La descripción completa está en la arquitectura V4 de 2026-07-31.

---

## 8. Estrategia Excel a servidor

### 8.1 Excel Bridge

- un libro por hospital;
- una fila/evento por acto;
- varias filas construyen longitudinalidad;
- hojas visibles por servicio;
- tablas técnicas relacionadas comunes;
- Office Script idempotente;
- vistas `APP_*` para lectura del Hub;
- errores trazables;
- cero inferencia clínica.

### 8.2 Secuencia de migración

1. Definir evento canónico y diccionario.
2. Adaptar Export Manager.
3. Demostrar persistencia y roundtrip sintético.
4. Introducir repository layer.
5. Crear esquema PostgreSQL desde entidades.
6. Probar paridad Excel/PostgreSQL.
7. Incorporar servidor hospitalario.
8. Añadir Identity Plane invisible.
9. Mantener fallback/reversión durante la validación.
10. Retirar Excel solo cuando exista evidencia suficiente.

No se copiará ciegamente un Excel ancho a tablas SQL.

---

## 9. Modelo canónico y diccionario

V4 debe estabilizar:

- `schema_version`;
- `event_id`;
- `source_event_id`;
- `patient_id`;
- `hospital_code`;
- `service_code`;
- `pathology_code`;
- `request_id`;
- `validation_id`;
- `treatment_id`;
- `line_id`;
- `visit_id`;
- `ea_id`;
- procedencia;
- fechas;
- flags de calidad.

El diccionario de variables conectará:

```text
significado clínico
↔ formulario
↔ evento canónico
↔ Excel
↔ JARA
↔ repositorio
↔ FHIR candidato
↔ openEHR candidato
```

Los mapeos terminológicos son candidatos pendientes de validación especializada.

---

## 10. Control Plane federado

### 10.1 Decisión V4

Supabase es candidato para una primera vertical de configuración no-paciente. La tecnología permanece sustituible mediante `ConfigurationRepository`.

Puede almacenar:

- hospitales y servicios;
- profesionales y roles funcionales;
- patologías habilitadas;
- formularios JSON;
- filtros JSON;
- reglas de alerta JSON;
- widgets;
- perfiles de exportación;
- diccionario de variables;
- catálogo local especial;
- alias, favoritos, ensayos, uso compasivo y medicación extranjera;
- versiones y auditoría de configuración.

No puede almacenar en esta fase:

- identificadores de pacientes;
- solicitudes individuales;
- tratamientos;
- validaciones;
- visitas;
- respuestas;
- PROMs;
- efectos adversos;
- cohortes resultantes;
- tareas individuales.

### 10.2 Federación

```text
Código común
+ modelo común
+ diccionario común
+ paquetes de configuración
+ datos separados por hospital/área
```

No se adopta una base clínica regional central en V4.

---

## 11. Identity Plane y PROMs

### 11.1 Decisión de diferimiento

El Identity Plane físico se difiere hasta disponer de:

- servidor local o backend autorizado;
- PROM Gateway externo;
- creación/recuperación automática de identidad;
- custodia, autenticación y auditoría institucional.

No se creará un Excel adicional ni doble registro manual.

### 11.2 Preparación inmediata

V4 reserva:

- `patient_id` técnico opaco;
- separación entre ID técnico e identificador operativo;
- interfaz futura `IdentityRepository`;
- costura para `hub_patient_key`;
- reglas de duplicado y reconciliación.

La experiencia futura debe ser:

```text
CIP introducido una vez
→ identidad técnica gestionada por el sistema
→ evento clínico asociado
```

### 11.3 Trigger HTML / Power Automate

Puede ayudar a automatizar procesos, pero no resuelve por sí mismo la custodia de identidad ni autoriza endpoints públicos con datos clínicos.

---

## 12. Catálogo farmacológico

### 12.1 CIMA oficial

Permanece versionado en GitHub con:

- versión;
- fecha;
- checksum;
- esquema;
- diffs;
- revisión humana.

La actualización mensual todavía no está implementada. El plan de junio es exploratorio.

Secuencia:

```text
script manual validado
→ workflow_dispatch
→ validación de integridad
→ PR revisable
→ schedule mensual
```

No se actualiza automáticamente un snapshot estable.

### 12.2 Catálogo local especial

Se administra por hospital/control plane y contiene elementos no cubiertos por CIMA o preferencias locales. No se sobrescribe durante la actualización oficial.

### 12.3 Regla absoluta

El catálogo puede identificar y proponer información editable tras selección explícita. Nunca decide dosis, vía, pauta, inducción, duración, validación o movimientos.

---

## 13. Parsers e integración operativa

### Orden clínica

- parser determinista de etiquetas;
- preview;
- comparación actual/propuesto;
- confirmación;
- texto fuente conservado;
- sin sobrescritura silenciosa;
- justificación clínica separada de observaciones FH.

### Presalud

- formato exacto pendiente;
- no inventar orden ni delimitadores;
- parser cuando llegue evidencia;
- puede aportar fechas explícitas de validez/renovación;
- Farmacia crea Presalud si el clínico no pudo hacerlo.

### Pharmatool

Queda fuera de este frente porque no aporta la exportación necesaria. La dispensación registrada tampoco equivale automáticamente a una visita o resultado clínico.

---

## 14. Treatment Lifecycle y renovaciones

Principios vigentes:

- la renovación pertenece a la línea de tratamiento;
- múltiples líneas tienen ciclos independientes;
- fechas confirmadas, verificadas y estimadas se distinguen;
- switch y add-on requieren actos explícitos;
- ausencia de acción no significa renovación;
- JSON define reglas;
- un motor evalúa reglas;
- una tarea representa trabajo;
- una alerta es una vista;
- una notificación es un canal.

Supabase puede almacenar definiciones. El Data Plane almacena ciclos y tareas por paciente/línea.

No implementar alertas de renovación hasta disponer de campos reales de Presalud o una regla aprobada.

---

## 15. Automation Plane

### Office Scripts

Camino base del Excel Bridge:

- botón manual;
- procesamiento idempotente;
- append-only cuando corresponda;
- errores y resumen;
- sin decisiones clínicas.

### Power Automate

- opcional;
- limitado a una investigación acotada;
- no debe bloquear V4;
- puede automatizar ejecución, archivo, notificaciones administrativas y movimiento autorizado de archivos;
- no decide validación, tratamiento, renovación, dispensación o causalidad.

---

## 16. Interoperabilidad FHIR/openEHR

### 16.1 Principio

```text
Evento canónico
├── JARA TXT
├── Excel
├── PostgreSQL/API
├── FHIR Adapter
└── openEHR Adapter
```

No se construye FHIR/openEHR directamente desde la fila Excel como contrato maestro.

### 16.2 Candidatos FHIR

- `Patient` / `Patient.identifier`;
- `Condition`;
- `Encounter`;
- `MedicationRequest`;
- `MedicationStatement`;
- `MedicationDispense` solo con dispensación explícita;
- `Observation`;
- `QuestionnaireResponse`;
- `AdverseEvent`;
- `Task`;
- `Practitioner` / `PractitionerRole`;
- `Provenance`;
- `AuditEvent`.

La validación farmacéutica conserva una entidad interna propia hasta conocer perfiles institucionales.

### 16.3 Candidatos openEHR

- `COMPOSITION Validación farmacoterapéutica`;
- `COMPOSITION Primera visita FH`;
- `COMPOSITION Seguimiento FH`;
- `COMPOSITION Renovación`.

La elección de arquetipos, plantillas, CDR y terminologías queda pendiente del SES/Salud Digital.

### 16.4 Evidencia V4

V4 debe producir una prueba sintética:

```text
acto canónico
→ TXT JARA
→ Excel
→ Bundle FHIR candidato
→ COMPOSITION openEHR candidata
```

Esto acredita portabilidad conceptual, no interoperabilidad implementada.

---

## 17. Roadmap por horizontes

### Horizonte inmediato — agosto 2026

- quick wins Cáceres;
- CIP arbitrario mediante flujo normal;
- modelo canónico;
- Export Manager;
- Excel Bridge;
- roundtrip;
- Control Plane v0.1;
- parser orden clínica;
- Presalud si llega evidencia;
- matriz FHIR/openEHR.

### Horizonte V4 posterior

- completar Digestivo y otros servicios;
- consolidar diccionario y formularios;
- mejorar renovaciones;
- CIMA Action mensual;
- configuración por hospital;
- QA de evaluación prolongada;
- paquete para servidor.

### Horizonte V4.5

- PostgreSQL local;
- API;
- autenticación y permisos;
- Identity Plane;
- PROM Gateway;
- automatización institucional;
- sustitución gradual del Excel;
- integraciones corporativas iniciales.

### Horizonte V5

- motor agnóstico de organización/servicio/programa/patología/journey;
- formularios y widgets declarativos generalizados;
- paquetes de configuración reutilizables;
- administración avanzada;
- múltiples módulos clínicos compartiendo dominio.

V5 se difiere deliberadamente para no desviar los fixes y el aprendizaje V4.

---

## 18. Condiciones para pasar de V4 a piloto

1. Contratos clínicos validados.
2. Servidor/hosting autorizado.
3. Identidad y seudonimización resueltas.
4. Autenticación/autorización reales.
5. Auditoría y logs.
6. Backup y recuperación.
7. Soporte y responsables.
8. Plan de datos y privacidad.
9. QA longitudinal.
10. Prueba multiusuario/concurrencia.
11. Validación con profesionales.
12. Procedimiento ante fallos.
13. Reversión.
14. Aprobación institucional.

Sin estas condiciones, el estado sigue siendo demo/evaluación.

---

## 19. Dependencias abiertas

| Dependencia | Estado |
|---|---|
| Texto exacto Presalud | Solicitado, pendiente |
| Diccionario regional de patologías | Solicitado, pendiente |
| Formulario Digestivo | Pendiente |
| Consenso SEFH/PROs | Preparación por Silvia |
| Servidores Badajoz/Mérida | Disponibilidad comunicada; diseño pendiente |
| Servidor Cáceres | Pendiente |
| Trigger HTML Power Automate | Pendiente de PoC |
| Auth/permisos | Pendiente institucional |
| Arquitectura FHIR/openEHR SES | Pendiente institucional |
| Terminologías/perfiles | Pendiente de especialistas |
| Nomenclatura externa | Pendiente |

Estas dependencias no bloquean el aprendizaje sintético mediante Excel Bridge.

---

## 20. Deuda documental y técnica

### Documental

- `README.md` sigue centrado en Reuma y presenta Farmacia como futura.
- `ARCHITECTURE.md` no refleja recovery/Cáceres 0.2.
- `CHANGELOG.md` no resume el rescate reciente.
- `AGENTS.md` y gobernanza contienen metadata histórica.
- `opencode.jsonc` no está en recovery; verificar arnés VPS antes de editar.

### Técnica

- persistencia aún no cerrada;
- dependencia parcial de fixtures;
- Export Manager debe consumir evento canónico;
- Excel Bridge no implementado;
- Control Plane no implementado;
- CIMA Action no implementada;
- Presalud pendiente;
- interoperabilidad solo preparada;
- autenticación/servidor pendientes.

---

## 21. Reglas de desarrollo

1. No tocar `main`.
2. No mezclar Reuma y Farmacia sin WO y decisión.
3. Una WO funcional relevante cada vez.
4. Crear backup antes de mover snapshots.
5. No editar snapshots manualmente.
6. Tests verdes no sustituyen QA humana cuando hay UI.
7. No usar DOM manipulado como evidencia.
8. No introducir datos reales.
9. No mezclar refactor, estética y clínica.
10. No presentar propuestas como implementadas.
11. Actualizar documentación al cambiar estado real.
12. Commit, push, PR y merge requieren autorización en su alcance.

---

## 22. Próximas líneas de WO

El orden detallado se mantiene en el plan de vacaciones. Agrupación ejecutiva:

1. Quick wins Cáceres.
2. Paciente arbitrario por flujo normal.
3. Promoción Cáceres 0.3.
4. Evento canónico y diccionario.
5. Export Manager.
6. Excel Bridge y Office Script.
7. Roundtrip.
8. Control Plane Supabase.
9. Parser de orden clínica.
10. Presalud y renovaciones condicionados.
11. CIMA Action.
12. Power Automate opcional.
13. Mapping FHIR/openEHR.
14. Reconciliación documental del cierre.

Cada WO necesita autorización concreta, alcance, reversión, tests y QA.

---

## 23. Límites del roadmap

Este roadmap no autoriza:

- datos reales;
- piloto;
- producción;
- merge en `main`;
- integración automática JARA/Farmatool/Presalud;
- servidor FHIR;
- CDR openEHR;
- Identity Plane manual;
- PROM Gateway real;
- Supabase clínico;
- base regional clínica central;
- V5 completa;
- inferencia terapéutica.

El avance se validará por capas, con datos sintéticos y evidencia reproducible.