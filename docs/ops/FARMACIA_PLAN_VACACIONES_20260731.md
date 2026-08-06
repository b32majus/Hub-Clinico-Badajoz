# Plan maestro de trabajo — FarmaNEXus / PROMueve Nexus V4

> **Reconciliación del estado real 2026-08-06.** El HEAD regional publicado es `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f` e incorpora PR #250/#251 y PR #252/#253. El flujo soportado es normal: Excel raw → reader/selectors → Data Port → sesión del paciente actual → Inicio/Quick View → dashboards → Validación → Primera Visita → Seguimiento. No existe un modo Bridge visible soportado. La sesión usa `sessionStorage` solo para el envelope temporal del paciente actual; Farmacia raw tiene precedencia, Estadísticas espera cutover raw/CSV y Actividad permanece demo/diferida.

| Metadato | Valor |
|---|---|
| Ventana | 2026-07-31 a 2026-08-15 |
| Duración | 16 días |
| Estado | Plan operativo aprobado por Sil/Cora para ejecución gobernada |
| Aprobación institucional | No |
| Rama publicada de partida | `recovery/farmacia-pr-replay-20260727` |
| HEAD inicial | `accac670ba216d8c291ee849d2198742d02bb3f0` |
| Snapshot estable inicial | `CÁCERES-REVIEW-0.2` |
| HEAD publicado al reconciliar | `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f` |
| Snapshot estable actual | `CÁCERES-REVIEW-0.3` |
| Disponibilidad humana | 3–4 horas diarias |
| Trabajo asíncrono | Una WO atómica puede ejecutarse mientras Silvia no está delante |
| Datos | Exclusivamente sintéticos |
| Documento arquitectónico | `../architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md` |

> Este plan ordena trabajo. No autoriza automáticamente sus WOs, merges, datos reales, piloto, backend institucional ni integraciones.

> El plan original y su cola histórica se conservan como contexto. El estado post patient-flow prevalece: Data Port y sesión temporal del paciente actual publicados; no existe modo Bridge visible; Estadísticas raw/CSV y el paquete de evaluación son las siguientes unidades. La decisión vigente se concentra en [`../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md).

## 0. Estado vigente post patient-flow

### Cadena funcional

```text
Excel raw
→ reader/selectors
→ Data Port
→ sesión del paciente actual
→ Inicio/Quick View
→ dashboards
→ Validación
→ Primera Visita
→ Seguimiento
```

- PR #250/#251 integran el Data Port, `RawExcelDataSource` y `CurrentPatientSession`; PR #252/#253 publican el flujo normal sin modo Bridge visible.
- `sessionStorage` solo contiene el envelope versionado del paciente actual: `version`, identificador, `patient_id`, `generation`, proyección, datos explícitos, provenance, borradores y `dirty`.
- No contiene workbook, bytes, read model completo, población, cohorte ni otros pacientes. Cambiar de CIP purga el contexto anterior; no es persistencia longitudinal definitiva.
- Farmacia raw tiene precedencia. Excel Enfermería solo enriquece huecos explícitos.
- Estadísticas conserva el dashboard diseñado; la siguiente WO sustituye la carga JSON/demo por fuente raw y habilita el CSV completo de la cohorte filtrada.
- Actividad permanece demo, con contenido funcional no decidido, y está fuera de la siguiente WO técnica.

### Secuencia inmediata

1. `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01`;
2. `WO-FH-RAW-STATISTICS-CUTOVER-01`;
3. `WO-FH-EVALUATION-PACKAGE-01`;
4. `APP_*`, `RelationalExcelDataSource`, `Processor` y roundtrip;
5. PostgreSQL/servidor local mediante el mismo Data Port.

Office Script, Identity Plane, Supabase, Actividad y refactor general no se anteponen a esta secuencia.

---

## 1. Misión del ciclo

Llegar al 2026-08-15 con una primera implementación V4 coherente, no con una colección de parches:

1. Incorporar el feedback inmediato de Farmacia Cáceres.
2. Permitir que la farmacéutica simule pacientes arbitrarios mediante el flujo normal.
3. Dejar de depender exclusivamente de pacientes hardcodeados.
4. Estabilizar un modelo canónico versionado.
5. Construir un Excel Bridge por hospital.
6. Demostrar el roundtrip Hub → Excel → Hub.
7. Extraer configuración no-paciente hacia un Control Plane.
8. Mantener CIMA oficial versionado y preparar su actualización revisable.
9. Reducir doble registro mediante parsers deterministas.
10. Preparar renovaciones por línea desde datos explícitos de Presalud.
11. Dejar el sistema listo para migrar a servidor.
12. Demostrar que el modelo puede proyectarse a FHIR/openEHR sin depender de la fila Excel.

---

## 2. Resultado mínimo de éxito

Al terminar las vacaciones deben estar demostrados:

```text
Quick wins clínicos de Cáceres
+
uso normal de CIP sintéticos arbitrarios
+
evento canónico versionado
+
Export Manager común
+
Excel Bridge Cáceres
+
roundtrip Hub → Excel → Hub
+
Control Plane Supabase v0.1 sin pacientes
+
CIMA oficial separado de catálogo local
+
parser de orden clínica
+
matriz FHIR/openEHR v0.1
```

Presalud y renovaciones son parte del objetivo si llega el texto exacto a tiempo. No se fabricará un formato especulativo.

---

## 3. Decisiones cerradas

### 3.1 Pacientes de evaluación

- No existe un botón `Nuevo paciente sintético`.
- La profesional introduce un CIP inventado y trabaja como si fuera un paciente normal.
- Los formularios exigen los campos aprobados para cada acto; no existe un alta sintética reducida.
- Los fixtures existentes permanecen para demo y regresión.
- El funcionamiento debe dejar de depender exclusivamente de ellos.

### 3.2 Persistencia y Excel

- El Hub siempre genera la información.
- La profesional no crea el paciente escribiendo una fila Excel.
- Un único esquema de fila común cubre Validación, Primera Visita y Seguimiento.
- Validación genera exactamente una fila por acto.
- Primera Visita genera `1..N` filas por líneas terapéuticas explícitamente presentes; el adaptador conserva esa capacidad aunque la UI actual pueda mostrar una sola línea.
- En Seguimiento v2 se genera una fila por cada línea activa en la fecha de visita.
- Dispensación y revisión específica son estados independientes.
- Varias filas del mismo paciente construyen longitudinalidad mediante identificadores estables.
- Los bloques que no aplican permanecen vacíos.
- Un libro independiente por hospital.
- Sin consolidación regional automática.

El Excel Bridge por hospital es el contenedor/objetivo de persistencia provisional V4; el raw reader integrado aún solo construye memoria de ejecución y no resuelve persistencia longitudinal. El Hub genera el TSV y la profesional pega la salida completa una sola vez en la hoja operativa del servicio de procedencia: Dermatología, Reumatología, Digestivo, Oncología u otros servicios aprobados. Cada fila queda íntegra y append-only. El Office Script valida versiones, IDs y cardinalidad, conserva y agrupa el acto, bloquea duplicados, registra errores, descompone y genera `APP_*`; el Read Adapter reconstruye el Hub. El futuro PostgreSQL Migrator migra entidades validadas, no copia ciegamente 152 columnas. Estas piezas siguen pendientes.

### 3.2.1 Browser storage reconciliado

- El ledger clínico fue retirado del runtime soportado por PR #231; no se presenta como activo.
- La sesión actual usa `sessionStorage` solo para el envelope versionado del paciente actual.
- El envelope contiene identificador, `patient_id`, generación, proyección, datos explícitos, provenance, borradores y `dirty`.
- No contiene workbook, bytes, read model completo, población, cohorte ni otros pacientes; al cambiar de CIP se purga el contexto anterior.
- Se conserva la historia de PR #199/#201/#203, pero browser storage no es fuente de verdad poblacional ni persistencia longitudinal definitiva.
- La retirada del ledger `localStorage` está implementada; `localStorage` e IndexedDB no son almacenamiento clínico soportado.

### 3.2.2 Brecha publicada que debe resolver v2

- Excel v1 usa 61 columnas y permanece publicado sin cambios.
- Export v2 demo paralelo usa 152 columnas por fila; en Seguimiento puede producir varias filas por líneas activas.
- En Seguimiento, Excel y CSV v1 generan una fila por cada línea dispensada y repiten el contexto común.
- Las líneas evaluadas no dispensadas no generan fila Excel/CSV.
- El objetivo aprobado es una fila por línea activa, se dispense o no y se revise específicamente o no.
- La activación paralela de PR #227 no equivale a cutover, retirada v1 ni cierre de compatibilidad.

### 3.3 Hospitales y branding

- Despliegues: Cáceres, Badajoz y Mérida.
- Código y contratos comunes.
- Configuración, nombre visible y servicios habilitados por hospital.
- Nombre paraguas provisional interno: `PROMueve Nexus`.
- Módulo Farmacia: `FarmaNEXus`.
- Primer Excel Bridge: Cáceres, Dermatología y Digestivo.

### 3.4 Identidad

- No se implementa un Identity Plane físico durante este ciclo.
- No se crea otro Excel ni una doble alta manual.
- Sí se reserva `patient_id` opaco y la interfaz futura `IdentityRepository`.
- El Identity Plane se activa cuando exista servidor/PROM Gateway y pueda funcionar de forma invisible.
- CIP/`identifier_value` no equivale a `patient_id`; no se derivará mediante hash, transformación o concatenación.
- No se decide todavía el mecanismo productivo de creación o custodia.

### 3.4.1 Dynamic Patient

```text
CIP ficticio arbitrario
→ flujo normal
→ Validación / Primera Visita / Seguimiento
→ evento canónico
→ Export v2
→ Excel Bridge
→ lectura y roundtrip
```

No es una clase especial de paciente ni se resuelve mediante el ledger del navegador. El proveedor técnico actual sigue cerrado a FH-001/FH-004; el mecanismo final para CIP arbitrario sin browser storage está pendiente de WO y el roundtrip no está demostrado.

### 3.5 CIMA

- CIMA oficial sigue versionado en GitHub.
- La actualización mensual todavía no está implementada.
- La Action futura abrirá PR revisable; no actualizará snapshots silenciosamente.
- Catálogo local especial y CIMA oficial permanecen separados.

### 3.6 Control Plane

Supabase puede almacenar configuración no-paciente:

- hospitales;
- servicios;
- profesionales;
- roles funcionales;
- patologías;
- formularios;
- filtros;
- reglas;
- widgets;
- perfiles de exportación;
- catálogo local especial;
- diccionario de variables.

No almacenará datos de pacientes durante este ciclo.

### 3.7 Interoperabilidad

- El evento canónico es la fuente conceptual.
- Excel, JARA, FHIR y openEHR son adaptadores/proyecciones.
- No se convierte directamente la fila Excel a FHIR como arquitectura definitiva.
- FHIR/openEHR se documentan y prueban con datos sintéticos; no se implementa integración institucional.

---

## 4. Prioridades

### P0

- No romper el entorno Cáceres que ya funciona.
- Mantener seguridad clínica y no inferencia.
- Incorporar los quick wins solicitados.
- Habilitar trabajo normal con CIP arbitrario.
- Estabilizar persistencia y roundtrip.

### P1

- Modelo canónico.
- Export Manager y Excel Bridge.
- Diccionario de variables.
- Control Plane no-paciente.
- Parser de orden clínica.

### P2

- Presalud y renovaciones, condicionados a evidencia.
- CIMA Action mensual.
- Power Automate.
- mapeo FHIR/openEHR.

### No toca durante el ciclo

- V5 agnóstica completa;
- refactor general del frontend;
- producción;
- datos reales;
- autenticación productiva;
- Identity Plane manual;
- servidor FHIR;
- CDR openEHR;
- integración automática JARA/Farmatool;
- consolidación regional;
- mezcla con Reuma v2 o `main`.

---

## 5. Entrega rápida del lunes 2026-08-03

### Objetivo

Entregar a la farmacéutica una versión estable que incorpore su feedback y le permita explorar un caso propio inventado mediante el flujo normal.

### Incluye

1. `Cada 3 semanas` en el catálogo común.
2. Normalización, labels y exportación coherentes.
3. `Observaciones de Farmacia Hospitalaria` en:
   - pantalla;
   - TXT JARA;
   - Excel/exportación;
   - tests.
4. Comorbilidades comunes:
   - infecciones recurrentes;
   - riesgo/antecedentes cardiovasculares;
   - alteraciones neurológicas;
   - antecedentes/riesgo de neoplasia.
5. CIP arbitrario mediante flujo normal.
6. Validación completa con datos inventados.
7. Exportación del acto.
8. Conservación de fixtures demo.
9. QA navegador y regresiones.
10. Promoción separada a `CÁCERES-REVIEW-0.3`, completada mediante PR #197; los cambios regionales posteriores no se promocionan automáticamente.

### No promete para el lunes

- Excel Bridge relacional completo;
- roundtrip longitudinal;
- Supabase;
- Presalud;
- Power Automate;
- Digestivo definitivo;
- FHIR/openEHR.

---

## 6. Cronograma de 16 días

## Días 1–3 — 31 de julio a 2 de agosto

### Bloque A — Reconciliación documental

- estado regional y Cáceres 0.3;
- plan de vacaciones;
- arquitectura objetivo V4;
- índice y tablero de WOs;
- addendum del roadmap.

### Bloque B — Quick wins Cáceres

- pauta cada 3 semanas;
- observaciones FH;
- cuatro comorbilidades;
- coherencia JARA/Excel;
- tests y QA;
- paciente arbitrario en Validación.

### Criterio de salida

- versión regional demostrada;
- cero regresiones conocidas;
- paquete preparado para la farmacéutica;
- promoción Cáceres separada y gobernada.

---

## Días 4–5 — 3 y 4 de agosto

### Modelo canónico v0.1

Definir:

- envelope de evento;
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
- procedencia y flags de calidad.

### Entregables

- JSON Schema base;
- ejemplos sintéticos de Validación, Primera Visita y Seguimiento;
- diccionario de variables v0.1;
- política de compatibilidad y versionado;
- mapa de compatibilidad desde las 61 columnas actuales hacia la fila común v2;
- definición explícita de acto, filas nativas y grano `visit_id × line_id`.

### Criterio de salida

- un mismo acto produce una representación canónica estable;
- no se pierde `0`, `false` o ausencia;
- solicitado, validado, iniciado y dispensado permanecen separados.

---

## Días 6–7 — 5 y 6 de agosto

### Export Manager v2

- construir salidas desde evento canónico;
- mantener TXT JARA;
- mantener Excel compatible;
- incluir `schema_version` y `source_event_id`;
- soportar Validación con una fila, Primera Visita `1..N` y Seguimiento `1..N` según líneas explícitas;
- soportar Seguimiento con una fila por línea activa;
- registrar dispensación y revisión específica de forma independiente;
- mantener solicitado, validado, iniciado y dispensado separados;
- tests de paridad y migración desde las 61 columnas existentes.

### Criterio de salida

```text
Evento canónico
├── TXT JARA
└── TSV común de 152 columnas: 1 fila en Validación; 1..N en Primera Visita/Seguimiento
```

con misma identidad y verdad clínica.

---

## Días 8–10 — 7 a 9 de agosto

### Excel Bridge Cáceres

Crear el libro con:

- `01_DERMA`;
- `03_DIGESTIVO`;
- tablas técnicas relacionadas;
- estados de procesamiento;
- errores;
- vistas `APP_*`.

### Office Script

- procesa pendientes;
- valida esquema;
- comprueba duplicados;
- conserva entrada nativa;
- fragmenta;
- registra errores;
- genera vistas;
- es idempotente.

### Criterio de salida

- cada `row_id` se procesa una sola vez;
- Primera Visita: N filas generan un acto lógico, N líneas y PROMs comunes deduplicados;
- Seguimiento: N filas generan un `VISITS`, N `VISIT_LINES` y datos comunes deduplicados por identidad/ámbito;
- sospechosos y causalidades conservan cardinalidad explícita;
- datos comunes discrepantes producen error sin selección, corrección o inferencia;
- reejecutar no duplica;
- un error o discrepancia no destruye la fila;
- no existe inferencia clínica.

---

## Días 11–12 — 10 y 11 de agosto

### Roundtrip

Demostrar:

```text
CIP inventado
→ Validación
→ Primera Visita
→ Seguimiento
→ exportaciones
→ Excel Bridge
→ recarga en Hub
→ dashboard longitudinal
```

### Cobertura

- un paciente con una línea;
- un paciente con dos líneas activas explícitas;
- `0` y `false` preservados;
- campos ausentes preservados;
- EA común y causalidad por sospechoso;
- no duplicados;
- cambio de CIP seguro;
- recarga de página.

### Criterio de salida

La herramienta deja de depender funcionalmente de los fixtures para reconstruir una historia.

---

## Días 13–14 — 12 y 13 de agosto

### Control Plane Supabase v0.1

Definir e implementar con datos sintéticos:

- tenant Cáceres;
- servicios Dermatología/Digestivo;
- profesionales;
- roles funcionales;
- patologías habilitadas;
- catálogo local especial;
- formulario JSON;
- filtro JSON;
- regla de alerta JSON;
- perfil de exportación;
- versión y auditoría.

### Consumo desde el Hub

El Hub debe leer, como mínimo:

- identidad/configuración Cáceres;
- profesionales;
- servicios y patologías habilitadas;
- catálogo local.

### Barreras

- cero datos de pacientes;
- RLS o controles equivalentes en laboratorio;
- sin service key en frontend;
- fallo seguro si no carga configuración;
- fallback demo versionado y explícito, no silencioso.

### Criterio de salida

La configuración deja de estar obligatoriamente incrustada en código.

---

## Día 15 — 14 de agosto

### Parser de orden clínica

- usar la plantilla de Dermatología;
- reconocer etiquetas constantes;
- preview actual/propuesto;
- confirmación profesional;
- no sobrescribir silenciosamente;
- conservar texto fuente;
- separar justificación clínica y observaciones FH.

### Presalud

Si ha llegado el texto exacto:

- fixture sintético fiel;
- parser delimitado;
- preview;
- mapeo canónico;
- detección de fecha explícita;
- tests de variantes reales.

Si no ha llegado:

- contrato de entrada pendiente;
- campos abiertos documentados;
- parser no implementado;
- renovaciones bloqueadas por evidencia.

---

## Día 16 — 15 de agosto

### Integración y cierre

- regresión general;
- QA navegador visible;
- revisión de consola y errores;
- comprobación de datos sintéticos;
- documentación de estado;
- paquete de migración a servidor;
- backlog siguiente;
- matriz de interoperabilidad.

### FHIR/openEHR v0.1

Producir con un acto sintético:

- evento canónico;
- fila Excel;
- TXT JARA;
- Bundle FHIR candidato;
- COMPOSITION openEHR candidata;
- matriz de gaps.

### Criterio de salida

Demostrar que el modelo no está encerrado en Excel, sin presentar interoperabilidad como implementada.

---

## 7. Trabajo transversal

### CIMA

Dos WOs separadas:

1. extracción y JSON versionado manualmente;
2. workflow mensual que abre PR.

Solo se ejecutan si no ponen en riesgo los hitos principales.

### Power Automate

- máximo un día;
- Office Script manual sigue siendo suficiente;
- investigar compatibilidad del runtime;
- evaluar trigger HTML sin datos clínicos ni secretos;
- detener ante permisos o gobernanza.

### Digestivo

- Silvia prepara/recibe el consenso;
- no implementar campos definitivos sin evidencia;
- el Excel Bridge reserva `03_DIGESTIVO` y `service_code`.

### Diccionario regional de patologías

- importar y versionar cuando llegue;
- no reemplazar códigos existentes sin tabla de correspondencia;
- registrar procedencia, versión y fecha.

---

## 8. Secuencia de WOs

### Estado publicado post patient-flow

1. PR #250/#251: Data Port, `RawExcelDataSource` y `CurrentPatientSession` integrados.
2. PR #252/#253: flujo normal publicado sin modo Bridge visible.
3. Estadísticas: dashboard diseñado; fuente raw y CSV de cohorte filtrada pendientes.
4. Actividad del servicio: demo y diferida.
5. `APP_*`, `RelationalExcelDataSource`, `Processor`, roundtrip y PostgreSQL/servidor local: pendientes.

Secuencia inmediata, que sustituye la cola histórica como prioridad:

1. `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01`;
2. `WO-FH-RAW-STATISTICS-CUTOVER-01`;
3. `WO-FH-EVALUATION-PACKAGE-01`;
4. `APP_*`, `RelationalExcelDataSource`, `Processor` y roundtrip;
5. PostgreSQL/servidor local mediante el mismo Data Port.

La tabla siguiente es backlog histórico orientativo. Cada unidad necesita autorización concreta y no se antepone a la secuencia inmediata.

| Orden | WO | Objetivo | Condición |
|---:|---|---|---|
| 1 | `WO-FH-CACERES-FEEDBACK-QUICK-WINS-01` | Pauta, observaciones y comorbilidades | Inmediata |
| 2 | `WO-FH-DYNAMIC-PATIENT-NORMAL-FLOW-01` | CIP arbitrario por flujo normal | Inmediata |
| 3 | `WO-FH-CACERES-REVIEW-03-PROMOTION-01` | Promover SHA demostrado | Tras QA humana regional |
| 4 | `WO-DATA-FH-CANONICAL-EVENT-CONTRACT-01` | Envelope e IDs | Tras quick wins |
| 5 | `WO-DATA-DICTIONARY-FH-V0-1-01` | Diccionario | Con contrato canónico |
| 6 | `WO-FH-EXPORT-MANAGER-CANONICAL-EVENT-01` | Adaptadores JARA/Excel | Con schemas |
| 7 | `WO-FH-EXCEL-BRIDGE-CACERES-CONTRACT-01` | Estructura del libro | Con export contract |
| 8 | `WO-FH-EXCEL-BRIDGE-CACERES-OFFICE-SCRIPT-01` | Procesamiento idempotente | Con libro |
| 9 | `WO-FH-EXCEL-BRIDGE-ROUNDTRIP-01` | Recuperación longitudinal | Con Bridge estable |
| 10 | `WO-FH-CONTROL-PLANE-SUPABASE-V0-1-01` | Configuración no-paciente | Sin clínica |
| 11 | `WO-FH-DERMA-CLINICAL-ORDER-PARSER-01` | Parser orden clínica | Plantilla vigente |
| 12 | `WO-FH-PRESALUD-CLIPBOARD-PARSER-01` | Parser Presalud | Condicionado al texto |
| 13 | `WO-FH-TREATMENT-RENEWAL-ALERTS-01` | Renovaciones por línea | Condicionado a fechas |
| 14 | `WO-FH-CIMA-VERSIONED-JSON-UPDATE-01` | Extracción reproducible | No bloqueante |
| 15 | `WO-FH-CIMA-MONTHLY-PR-WORKFLOW-01` | Action mensual con PR | Tras extracción validada |
| 16 | `WO-FH-POWER-AUTOMATE-COMPATIBILITY-01` | Compatibilidad/trigger | Opcional, máximo un día |
| 17 | `WO-DOC-FH-INTEROPERABILITY-MAPPING-V0-1-01` | Matriz FHIR/openEHR | Con modelo canónico |
| 18 | `WO-DOC-HUB-CANONICAL-ALIGNMENT-POST-FH-PLAN-01` | README/Architecture/Changelog/Agents | Tras cierre del ciclo |

No encadenar varias WOs clínicas sin revisión humana intermedia.

---

## 9. Cadencia diaria

Para cada jornada de 3–4 horas:

1. **30–45 min:** revisar reporte y diff del trabajo asíncrono.
2. **60–90 min:** QA manual y decisión funcional.
3. **60 min:** preparar/corregir la siguiente WO.
4. **30–45 min:** documentación, commit, PR o reconciliación.

Trabajo asíncrono permitido:

- implementación de una WO atómica;
- tests;
- inventarios read-only;
- generación de fixtures sintéticos;
- documentación acotada.

Trabajo asíncrono no permitido sin revisión:

- varias WOs clínicas encadenadas;
- merges;
- cambios de arquitectura;
- migraciones;
- datos;
- seguridad;
- refactors amplios.

---

## 10. Dependencias externas

| Dependencia | Estado 2026-07-31 | Impacto | Respuesta |
|---|---|---|---|
| Texto Presalud | Solicitado | Parser/renovaciones | Esperar evidencia; no inventar |
| Diccionario de patologías | Solicitado | Configuración regional | Preparar importador, no contenido |
| Formulario Digestivo | Pendiente | Campos clínicos | No cerrar circuito definitivo |
| Consenso SEFH/PROs | Preparación por Silvia | Variables | Incorporar tras revisión |
| Servidor Badajoz | Disponibilidad comunicada | Migración futura | Llegar con contrato y roundtrip |
| Servidor Mérida | Apoyo gerencial comunicado | Migración futura | Mismo paquete técnico |
| Servidor Cáceres | No cerrado | Persistencia futura | No bloquea evaluación |
| Trigger HTML Power Automate | Pendiente | Automatización/PROs | PoC sin datos clínicos |
| FHIR/openEHR SES | Pendiente institucional | Interoperabilidad | Preparar mapping, no integración |
| Auth/permisos | Pendiente | Piloto real | No introducir datos reales |

---

## 11. QA obligatoria

Según alcance:

- `node --check`;
- checks focales;
- smoke Farmacia;
- common y tratamiento común;
- Validación;
- Primera Visita;
- Seguimiento;
- Enfermería/importaciones;
- Export Manager;
- Excel Bridge e idempotencia;
- schema validation;
- QA navegador con controles visibles;
- consola y `pageerror`;
- recarga directa;
- estados vacíos;
- duplicados;
- fallo de carga;
- datos sintéticos;
- `git diff --check`;
- revisión independiente cuando el riesgo lo justifique.

No se considerará corregida una UI solo por tests de VM/DOM si la interacción de navegador es relevante.

---

## 12. Criterios clínicos de aceptación

- solicitado, validado, iniciado y dispensado separados;
- línea identificada explícitamente;
- ausencia preservada;
- cambios profesionales preservados;
- no inferencia desde CIMA;
- no switch/add-on por aparición de fármaco;
- causalidad solo por sospechoso explícito;
- renovación solo por confirmación/fuente válida;
- fechas confirmadas y estimadas visibles como categorías distintas;
- JARA y Excel consumen la misma verdad canónica.

---

## 13. Señales de parada

Detener y escalar si:

- el alcance exige datos reales;
- aparece un contrato clínico no validado;
- el Excel obliga a doble alta manual;
- un parser necesita adivinar el formato;
- un cambio mezcla quick win y refactor amplio;
- Supabase empieza a recibir datos clínicos;
- el trigger HTML expone secretos o payload clínico;
- FHIR/openEHR requiere decisiones institucionales no disponibles;
- el diff toca rutas fuera de WO;
- falla dos veces la misma corrección conceptual;
- la QA humana contradice los tests.

---

## 14. Stretch goals

Solo después del roundtrip completo:

- `DemoRepository` / `ExcelRepository` / `PostgresRepository` con tests de contrato;
- PostgreSQL local en M7 con datos sintéticos;
- API local mínima;
- migrador Excel → PostgreSQL;
- paquete de configuración exportable/importable;
- comparación Supabase/PostgreSQL para configuración;
- PoC del trigger HTML;
- formulario declarativo adicional.

No iniciar una V5 agnóstica completa.

---

## 15. Entregables del cierre

1. Versión Cáceres posterior al feedback, si supera QA.
2. Estado publicado reconciliado.
3. Evento canónico y schemas.
4. Diccionario v0.1.
5. Export Manager v2.
6. Excel Bridge Cáceres.
7. Office Script.
8. Roundtrip demostrado.
9. Control Plane v0.1.
10. Parser orden clínica.
11. Presalud/renovaciones o bloqueo documentado.
12. CIMA Action implementada o plan técnico listo, según tiempo.
13. Matriz FHIR/openEHR.
14. Paquete para solicitar/usar servidor.
15. Backlog del ciclo siguiente.

### Gate del paquete longitudinal final

No preparar URL definitiva, guía final, paquete final ni retirada v1 hasta demostrar CIP arbitrario en flujo normal, workbook operativo, Office Script, vistas `APP_*`, Excel Read Adapter y roundtrip Hub → Excel → Hub. Puede existir una evaluación de formularios con alcance inferior solo tras decisión humana específica y comunicación explícita de que no es la versión longitudinal final ni un piloto.

---

## 16. Frontera final

Al terminar este plan, el objetivo es disponer de una **V4 demostrada en laboratorio y evaluación sintética**, preparada para servidor.

No se declarará:

- piloto real;
- producción;
- integración SES;
- autenticación real;
- Identity Plane operativo;
- captura PROM real;
- cumplimiento institucional completo;
- interoperabilidad FHIR/openEHR implementada.

Cada salto posterior requiere decisión, WO, seguridad, QA y gobierno específicos.
