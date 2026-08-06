# Decisión Farmacia V4 — persistencia y flujo de evaluación

> **Reconciliación vigente 2026-08-06.** El HEAD regional publicado es `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f` e incorpora PR #250/#251 y PR #252/#253. El flujo soportado es normal: Excel raw → reader/selectors → Data Port → sesión del paciente actual → Inicio/Quick View → dashboards → Validación → Primera Visita → Seguimiento. No existe un modo Bridge visible soportado. La sesión temporal usa solo el envelope versionado del paciente actual; Estadísticas conserva el dashboard diseñado y espera el cutover de fuente raw/CSV; Actividad permanece demo y diferida. Esta nota prevalece sobre formulaciones anteriores del documento.

| Metadato | Valor |
|---|---|
| Fecha | 2026-08-04 |
| Última reconciliación | 2026-08-06 |
| Estado | `current_product_and_architecture_decision` |
| Rama publicada verificada | `recovery/farmacia-pr-replay-20260727` |
| Rama documental de reconciliación | `work/doc-fh-post-patient-flow-reconciliation-01-20260806` |
| HEAD publicado verificado | `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f` |
| Datos autorizados | Exclusivamente inventados/sintéticos |
| Piloto / producción | No acreditados |

> Esta decisión conserva la historia de PR #199/#201/#203 y PR #238/#242/#246. El estado publicado posterior de PR #250/#251 y PR #252/#253 prevalece para el flujo normal y la sesión del paciente actual. No autoriza datos reales, piloto, producción o promoción de Cáceres.

## 0. Reconciliación post patient-flow

1. **Estado publicado:** PR #250/#251 integran el Data Port, `RawExcelDataSource` y `CurrentPatientSession`; PR #252/#253 publican el flujo normal sin modo Bridge visible. El recovery base es `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f`.
2. **Flujo soportado:** `Excel raw → reader/selectors → Data Port → sesión del paciente actual → Inicio/Quick View → dashboards → Validación → Primera Visita → Seguimiento`.
3. **Sesión temporal:** `sessionStorage` solo guarda el envelope versionado del paciente actual: `version`, `identifier`, `patient_id`, `generation`, `patient_projection`, `explicit_data`, `provenance`, `drafts` y `dirty`. No guarda workbook, bytes, read model completo, población, cohorte ni otros pacientes. Al cambiar de CIP se purga el contexto anterior; no es persistencia longitudinal definitiva.
4. **Precedencia raw:** Farmacia raw tiene precedencia. Excel Enfermería solo puede enriquecer huecos explícitos y no sustituye valores Farmacia.
5. **Estadísticas:** el dashboard ya diseñado necesita la siguiente WO para sustituir la carga demo por la fuente raw y habilitar el CSV completo de la cohorte filtrada; no se rediseña en ese cutover.
6. **Actividad:** sigue siendo demo, con contenido funcional no decidido, y queda fuera de la siguiente WO técnica.
7. **Secuencia inmediata:** `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01` → `WO-FH-RAW-STATISTICS-CUTOVER-01` → `WO-FH-EVALUATION-PACKAGE-01` → `APP_*`, `RelationalExcelDataSource`, `Processor` y roundtrip → PostgreSQL/servidor local mediante el mismo Data Port.

## 1. Estado publicado que motiva la decisión

- PR #223 reconcilió documentalmente la publicación de Seguimiento v2.
- PR #225 cerró el proveedor técnico sintético con registro limitado a `CIP-DEMO-FH-001` y `CIP-DEMO-FH-004`.
- PR #227 activó Export v2 demo de forma visible y paralela en Validación, Primera Visita y Seguimiento.
- Export v2 demo usa un esquema TSV común de 152 columnas: Validación produce exactamente una fila; Primera Visita y Seguimiento soportan `1..N` filas según sus líneas explícitas.
- Un contexto `unknown/stale` bloquea exclusivamente Export v2.
- PR #231 retiró de las tres pantallas soportadas la carga del ledger clínico basado en `localStorage`, sin introducir persistencia alternativa.
- PR #233 publicó el workbook operativo de Cáceres como contenedor del TSV y superó QA automatizada y manual en Microsoft Excel.
- PR #238 integró el lector raw v2 y read model con checker Node PASS (21 casos), checker workbook/openpyxl PASS, QA navegador PASS, Farmacia legacy PASS, Enfermería PASS y smoke CI PASS.
- PR #246 integró el handoff y dashboard Bridge con handoff checker 37, selector 82, reader 21, smoke 48 y dashboard legacy 37 PASS; Actions SUCCESS; QA navegador, padding E2E, aislamiento, popup bloqueado y fail-closed PASS; storage vacío, consola limpia, `pageerror = 0` y revisiones APTO.
- JARA, CSV y Excel v1 permanecen intactos; Excel v1 conserva 61 columnas.
- Las versiones continúan en `draft`. No existe promoción a `2.0.0`.

Esto no demuestra cutover completo, retirada de v1, CIP arbitrario, procesamiento relacional, lectura longitudinal, roundtrip Hub → Excel → Hub ni aptitud para piloto.

## 2. Flujo normal con datos inventados

La evaluación no crea una clase especial de paciente:

```text
CIP ficticio arbitrario
→ flujo normal
→ Validación / Primera Visita / Seguimiento
→ evento canónico
→ Export v2
→ Excel Bridge
→ Office Script
→ vistas APP_*
→ Excel Read Adapter
→ lectura y roundtrip
```

Estado real por tramos:

- flujo normal y formularios: implementados para la evaluación actual;
- Export v2 demo: visible en paralelo para los contextos técnicos registrados;
- workbook del Excel Bridge: implementado y publicado como contenedor del TSV;
- lector raw v2/read model: integrado independientemente; dos hojas raw, 152 columnas, `1..N`, errores seguros y solo memoria de página;
- selectores y Quick View Bridge: integrados por PR #242 dentro de `farmacia_index.html`; consumidor UI de lectura visible mediante interacción soportada;
- handoff efímero y dashboard Bridge: integrados por PR #246; consumidor UI de lectura conectado, visible y demostrado mediante interacción soportada;
- formularios Bridge, Office Script, tablas relacionales, `APP_*`, Read Adapter y roundtrip: pendientes;
- CIP arbitrario sin browser storage clínico: pendiente.

Decisiones cerradas:

- no existe modo `Nuevo paciente sintético`;
- no existe botón, alta especial ni formulario reducido;
- la profesional introduce un CIP inventado;
- utiliza los mismos formularios e interacciones normales;
- la diferencia se limita a los datos inventados y al aviso del entorno;
- los fixtures se conservan para demo y regresión, pero no deben ser requisito del funcionamiento.

El proveedor técnico publicado por PR #225 sigue cerrado a FH-001/FH-004. El handoff integrado no amplía esa identidad: no constituye un Identity Plane productivo ni permite CIP arbitrario. El mecanismo técnico final requiere una WO atómica posterior, basada en la evidencia real del Bridge y su lectura. No se declara demostrado el roundtrip.

## 3. Persistencia provisional V4

### 3.1 Cardinalidad por acto

**Validación:** exactamente una fila por acto. Contiene solo los campos aplicables de contexto, solicitud, decisión, tratamiento validado, prebiológico, comorbilidades y observaciones; lo no aplicable queda vacío. Solicitado no equivale a validado y una decisión pendiente o denegada no crea línea terapéutica.

**Primera Visita:** produce `1..N` filas, una por cada línea terapéutica explícitamente presente. Este soporte contractual conserva los escenarios comunicados por Farmacia en los que un paciente puede iniciar más de una línea biológica desde la Primera Visita, aunque la UI actual pueda mostrar una única línea. Todas las filas comparten `event_id`, `source_event_id`, `first_visit_id`, `patient_id`, fecha, contexto y PROMs comunes; cada fila conserva `row_id`, `row_key`, `treatment_id`, `line_id`, rol y snapshot explícito de línea. No se crea otra línea desde tratamiento previo, catálogo, solicitud, nombre de medicamento o ausencia.

**Seguimiento:** produce `1..N` filas, una por cada línea terapéutica explícitamente activa en la visita. Todas comparten `event_id`, `source_event_id`, `visit_id`, `patient_id` y contexto/datos comunes; cada fila conserva `row_id`, `treatment_id`, `line_id`, snapshot y estados explícitos de línea. Actividad, dispensación y revisión específica son dimensiones independientes.

### 3.2 Flujo y descomposición

El **Excel Bridge por hospital** es el contenedor/objetivo de persistencia provisional V4; el raw reader, la Quick View y el dashboard Bridge integrados solo construyen/consumen memoria de ejecución y no resuelven persistencia longitudinal:

```text
Hub genera el TSV de 1..N filas según la cardinalidad del acto
→ la profesional pega la salida una vez en la hoja operativa del servicio
→ cada fila nativa queda íntegra y append-only
→ Office Script valida, agrupa y descompone
→ vistas APP_* exponen lectura
→ Excel Read Adapter reconstruye el Hub
```

La hoja operativa corresponde al servicio de procedencia. El workbook publicado para Cáceres comienza con `01_DERMA` y `03_DIGESTIVO`; otros servicios solo se añadirán mediante alcance explícito. Cada fila conserva CIP/identificador operativo, servicio, patología, tipo de acto, evento e IDs técnicos aplicables. El Hub genera la información; la profesional no da de alta al paciente escribiendo manualmente una fila Excel.

Reglas:

- un libro independiente por hospital;
- contrato, scripts y código comunes;
- sin consolidación regional automática;
- el Office Script valida versiones, IDs y cardinalidad, conserva la entrada original, agrupa filas del mismo acto, bloquea duplicados, registra errores, descompone en tablas relacionales y genera `APP_*`;
- las vistas `APP_*` son proyecciones de lectura, no la fuente conceptual del dominio;
- el Excel Read Adapter reconstruye el estado desde esas vistas;
- el futuro PostgreSQL Migrator migra entidades relacionales validadas, sin copiar ciegamente las 152 columnas a una tabla SQL.

En Primera Visita, N filas nativas del mismo acto producen un registro lógico de Primera Visita, N registros de líneas asociadas y PROMs comunes deduplicados por identidad de acto/instrumento. En Seguimiento, N filas producen un `VISITS`, N `VISIT_LINES`, PROMs/adherencia/EA comunes deduplicados según identidad y ámbito, y sospechosos/causalidades con cardinalidad explícita. Si los datos comunes discrepan entre filas del mismo acto, se registra error: el Office Script no selecciona, corrige ni infiere un valor.

### 3.3 Estado publicado del workbook

PR #233 implementó y publicó:

- `templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx`;
- dos hojas operativas visibles: `01_DERMA` y `03_DIGESTIVO`;
- dos tablas de entrada con 152 cabeceras canónicas;
- 16 hojas técnicas ocultas y vacías, reservadas para la siguiente fase;
- generador reproducible con `openpyxl` como dependencia de tooling/build;
- checker de estructura y roundtrip TSV;
- QA manual en Microsoft Excel con seis filas sintéticas en ambas hojas, sin reparación, coerción ni ejecución de fórmulas.

Esto demuestra el **contenedor del Bridge**, no el procesamiento longitudinal. Las hojas técnicas todavía no tienen tablas ni datos; Office Script, `APP_*`, Read Adapter y roundtrip siguen pendientes. El workbook técnico de PR #201 se conserva como artefacto histórico/de cobertura y no equivale al workbook operativo publicado por PR #233.

## 4. Browser storage

### 4.1 Estado técnico publicado

- PR #231 retiró de Validación, Primera Visita y Seguimiento la carga de `scripts/farmacia_evaluation_ledger.js`.
- El runtime soportado no expone la API del ledger ni la acción del workbook sintético histórico.
- No existe restauración del formulario tras recarga ni recuperación al cambiar de CIP y volver al anterior.
- La clave legacy de `localStorage` permanece opaca: no se lee, escribe ni elimina.
- El módulo del ledger y el workbook técnico histórico permanecen versionados por trazabilidad, pero desacoplados del runtime normal.
- El flujo publicado posterior usa `sessionStorage` únicamente para el envelope versionado del paciente actual; no es el almacenamiento del workbook ni del read model completo.
- El envelope contiene `version`, identificador explícito, `patient_id`, `generation`, proyección del paciente, datos explícitos, provenance, borradores y `dirty`.
- El envelope rechaza claves de workbook, read model, población, bytes, secretos y credenciales; el cambio de CIP purga el contexto anterior.
- `localStorage`, IndexedDB, `window.name` y `BroadcastChannel` no son almacenamiento clínico soportado.
- El handoff/dashboard Bridge de PR #246 queda como trazabilidad histórica; no define un modo Bridge visible del flujo soportado actual.

### 4.2 Decisión vigente

- `localStorage` no es la arquitectura objetivo ni la fuente de verdad clínica;
- `sessionStorage` solo soporta el envelope temporal del paciente actual, con alcance y claves cerradas;
- no se guardarán workbook, bytes, read model completo, población, cohorte ni otros pacientes;
- no se sustituirá este alcance por otro mecanismo oculto en el navegador;
- la retirada del ledger `localStorage` del runtime soportado está implementada;
- el raw reader y el Data Port construyen la proyección desde el Excel raw, mientras la sesión conserva solo el paciente actual y sus borradores;
- recarga permite continuar o reiniciar el paciente actual; cambio de CIP purga el contexto anterior;
- la sesión temporal no equivale a persistencia longitudinal ni a fuente de verdad poblacional;
- no se presenta la sesión actual como persistencia longitudinal resuelta.

Los documentos y PR históricos #199/#201/#203 se conservan por trazabilidad; describen decisiones y capacidades de su momento, no la dirección vigente ni el runtime soportado actual.

## 5. Identidad

- CIP/`identifier_value` es el identificador operativo introducido por la profesional; no equivale a `patient_id`.
- `patient_id` es técnico, estable dentro de su ámbito y opaco.
- `patient_id` no se deriva del CIP mediante hash, transformación o concatenación.
- El Identity Plane físico permanece diferido.
- Durante este ciclo no se añade Excel de correspondencia, tabla manual ni alta técnica separada.
- La capacidad futura deberá crear o recuperar identidad de forma automática e invisible cuando exista servidor o gateway autorizado.

No se decide todavía el mecanismo productivo de creación, correspondencia, custodia, retención o recuperación de identidad. La resolución de CIP arbitrario se abordará después de validar WO7 y WO8, no mediante una identidad inventada en memoria o browser storage.

El guard P1 de identidad normalizada rechaza `IDENTIFIER_COMPONENT_EMPTY`, `IDENTIFIER_COMPONENT_TYPE`, `NORMALIZED_IDENTIFIER_COLLISION`, `IDENTIFIER_NOT_INDEXED` e `IDENTIFIER_INDEX_PATIENT_MISMATCH`; exige coherencia bidireccional pacientes ↔ índice, usa lookup directo sobre tabla privada `Object.create(null)`, conserva mayúsculas, permite pacientes sin identificador pero no buscables operativamente y no muta el read model. La evidencia publicada es selector checker 82 casos, reader checker 21, smoke 48, Actions SUCCESS, QA navegador/focal PASS, consola limpia, `pageerror = 0` y revisión independiente APTO.

## 6. Adjudicación de WO5 y secuencia vigente

El alcance original de `WO-FH-EXPORT-V2-CUTOVER-01` incluía activación pública, compatibilidad y retirada gobernada de v1. PR #225 y PR #227 satisfacen una parte mediante unidades menores: proveedor técnico sintético y activación paralela visible de Export v2 demo.

`WO5A` y `WO5B` son nombres retrospectivos usados solo para reconciliar el alcance; no son los títulos oficiales originales:

- **WO5A:** `WO-FH-EXPORT-V2-TECHNICAL-CONTEXT-01`, issue #224 y PR #225; contexto técnico sintético cerrado, sin generación de identidad y sin salida pública en esa unidad.
- **WO5B:** `WO-FH-EXPORT-V2-PARALLEL-ACTIVATION-01`, issue #226 y PR #227; salida v2 visible en paralelo, 152 columnas, soporte de varias filas según acto y v1 preservada.

No existe WO5C ejecutada. No podrá crearse, cerrarse ni declararse ejecutada una WO5C sin issue, manifest, PR y evidencia publicada.

Adjudicación descriptiva:

`PARTIALLY_SATISFIED_BY_SMALLER_UNITS / REMAINING_SCOPE_DEFERRED`

Significa:

- WO5 no se reabre como megadesarrollo;
- WO5 tampoco se declara completamente cerrada;
- la retirada de v1 queda aplazada;
- la promoción de versiones `draft` queda aplazada;
- el workbook operativo está implementado y verificado por PR #233;
- la Quick View, el handoff efímero y el dashboard Bridge de solo lectura están integrados por PR #242/#246;
- Office Script, tablas relacionales pobladas, vistas `APP_*`, Excel Read Adapter y roundtrip siguen pendientes;
- cualquier alcance restante se ejecutará, si se autoriza, en WOs atómicas.

Secuencia inmediata post patient-flow:

1. `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01`;
2. `WO-FH-RAW-STATISTICS-CUTOVER-01`;
3. `WO-FH-EVALUATION-PACKAGE-01`;
4. `APP_*`, `RelationalExcelDataSource`, `Processor` y roundtrip;
5. PostgreSQL/servidor local mediante el mismo Data Port.

Office Script, `APP_*`, Read Adapter, PostgreSQL, Identity Plane y refactor general no se anteponen a esa secuencia. Actividad queda diferida.

## 7. Límites de evaluación y gate de paquete

| Estado | Alcance actual |
|---|---|
| Demo | Fixtures y contextos técnicos cerrados para mostrar capacidades y regresión |
| Evaluación | Formularios e interacciones normales con datos inventados; Export v2 demo paralelo y workbook probado con TSV sintético |
| Piloto | No acreditado; exigiría gobierno, seguridad, persistencia, lectura longitudinal y QA adicionales |
| Producción | No autorizada |

No preparar como versión longitudinal final:

- URL definitiva;
- guía final;
- paquete final;
- retirada de v1.

Estado del gate:

- workbook operativo: **demostrado por PR #233**;
- CIP arbitrario mediante flujo normal: pendiente;
- Office Script: pendiente;
- tablas relacionales y vistas `APP_*`: pendientes;
- Excel Read Adapter: pendiente;
- roundtrip Hub → Excel → Hub: pendiente.

Puede autorizarse una evaluación de formularios con alcance inferior solo mediante decisión humana específica y con etiqueta/comunicación explícita que no la presente como versión longitudinal final, piloto o producción.

## 8. Clasificación reconciliada

| Clasificación | Estado |
|---|---|
| Implementado y publicado | Core/adaptadores v2, proveedor técnico cerrado, Export v2 demo paralelo, v1 preservada, retirada del ledger, workbook operativo, lector raw/read model, Data Port y sesión temporal del paciente actual |
| Visible mediante interacción soportada | Export v2 demo y flujo normal de búsqueda/Quick View; no existe modo Bridge visible soportado |
| Verificado fuera del navegador | Workbook Cáceres abierto, pegado y guardado en Microsoft Excel con roundtrip exacto del TSV sintético |
| Limitado a demo/evaluación | Datos inventados, FH-001/FH-004 para proveedor v2, sin aptitud para piloto |
| Pendiente | Estadísticas desde raw y CSV de cohorte filtrada, paquete de evaluación, `APP_*`, `RelationalExcelDataSource`, `Processor`, roundtrip, PostgreSQL/servidor local y persistencia longitudinal definitiva |
| Superseded como dirección | Browser storage como persistencia, cohorte sintética especial y WO5 como megadesarrollo único |
| Histórico conservado | Ledger y workbook técnico de PR #199/#201/#203, todavía versionados pero fuera del runtime soportado |
