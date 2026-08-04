# Decisión Farmacia V4 — persistencia y flujo de evaluación

| Metadato | Valor |
|---|---|
| Fecha | 2026-08-04 |
| Estado | `current_product_and_architecture_decision` |
| Rama publicada verificada | `recovery/farmacia-pr-replay-20260727` |
| HEAD publicado verificado | `f86f72f8e09e29708ebd0b977c2451300002e989` |
| Datos autorizados | Exclusivamente inventados/sintéticos |
| Piloto / producción | No acreditados |

> Esta decisión prevalece como dirección vigente sobre propuestas incompatibles, pero no borra la historia de PR #199, #201 o #203 ni afirma que el código ya cumpla la dirección de almacenamiento. No autoriza implementación, datos reales, piloto, producción o promoción de Cáceres.

## 1. Estado publicado que motiva la decisión

- PR #223 reconcilió documentalmente la publicación de Seguimiento v2.
- PR #225 cerró el proveedor técnico sintético con registro limitado a `CIP-DEMO-FH-001` y `CIP-DEMO-FH-004`.
- PR #227 activó Export v2 demo de forma visible y paralela en Validación, Primera Visita y Seguimiento.
- Export v2 demo usa un esquema TSV común de 152 columnas: Validación produce exactamente una fila; Primera Visita y Seguimiento soportan `1..N` filas según sus líneas explícitas.
- Un contexto `unknown/stale` bloquea exclusivamente Export v2.
- JARA, CSV y Excel v1 permanecen intactos; Excel v1 conserva 61 columnas.
- Las versiones continúan en `draft`. No existe promoción a `2.0.0`.

Esto no demuestra cutover completo, retirada de v1, aptitud para piloto, Excel Bridge operativo ni roundtrip Hub → Excel → Hub.

## 2. Flujo normal con datos inventados

La evaluación no crea una clase especial de paciente:

```text
CIP ficticio arbitrario
→ flujo normal
→ Validación / Primera Visita / Seguimiento
→ evento canónico
→ Export v2
→ Excel Bridge
→ lectura y roundtrip
```

Solo los primeros pasos y la salida v2 demo limitada están implementados parcialmente hoy. Excel Bridge, lectura y roundtrip permanecen pendientes.

Decisiones cerradas:

- no existe modo `Nuevo paciente sintético`;
- no existe botón, alta especial ni formulario reducido;
- la profesional introduce un CIP inventado;
- utiliza los mismos formularios e interacciones normales;
- la diferencia se limita a los datos inventados y al aviso del entorno;
- los fixtures se conservan para demo y regresión, pero no deben ser requisito del funcionamiento.

El proveedor técnico publicado por PR #225 sigue cerrado a FH-001/FH-004. El mecanismo técnico final que permitirá un CIP arbitrario sin almacenamiento clínico en navegador requiere una WO atómica posterior. No se declara demostrado el roundtrip.

## 3. Persistencia provisional V4

### 3.1 Cardinalidad por acto

**Validación:** exactamente una fila por acto. Contiene solo los campos aplicables de contexto, solicitud, decisión, tratamiento validado, prebiológico, comorbilidades y observaciones; lo no aplicable queda vacío. Solicitado no equivale a validado y una decisión pendiente o denegada no crea línea terapéutica.

**Primera Visita:** produce `1..N` filas, una por cada línea terapéutica explícitamente presente. Este soporte contractual conserva los escenarios comunicados por Farmacia en los que un paciente puede iniciar más de una línea biológica desde la Primera Visita, aunque la UI actual pueda mostrar una única línea. Todas las filas comparten `event_id`, `source_event_id`, `first_visit_id`, `patient_id`, fecha, contexto y PROMs comunes; cada fila conserva `row_id`, `row_key`, `treatment_id`, `line_id`, rol y snapshot explícito de línea. No se crea otra línea desde tratamiento previo, catálogo, solicitud, nombre de medicamento o ausencia.

**Seguimiento:** produce `1..N` filas, una por cada línea terapéutica explícitamente activa en la visita. Todas comparten `event_id`, `source_event_id`, `visit_id`, `patient_id` y contexto/datos comunes; cada fila conserva `row_id`, `treatment_id`, `line_id`, snapshot y estados explícitos de línea. Actividad, dispensación y revisión específica son dimensiones independientes.

### 3.2 Flujo y descomposición

El **Excel Bridge por hospital** es la persistencia provisional V4:

```text
Hub genera el TSV de 1..N filas según la cardinalidad del acto
→ la profesional pega la salida una vez en la hoja operativa del servicio
→ cada fila nativa queda íntegra y append-only
→ Office Script valida, agrupa y descompone
→ vistas APP_* exponen lectura
→ Excel Read Adapter reconstruye el Hub
```

La hoja operativa corresponde al servicio de procedencia: Dermatología, Reumatología, Digestivo, Oncología u otros servicios aprobados en el futuro. Cada fila conserva CIP/identificador operativo, servicio, patología, tipo de acto, evento e IDs técnicos aplicables. El Hub genera la información; la profesional no da de alta al paciente escribiendo manualmente una fila Excel.

Reglas:

- un libro independiente por hospital;
- contrato, scripts y código comunes;
- sin consolidación regional automática;
- el Office Script valida versiones, IDs y cardinalidad, conserva la entrada original, agrupa filas del mismo acto, bloquea duplicados, registra errores, descompone en tablas relacionales y genera `APP_*`;
- las vistas `APP_*` son proyecciones de lectura, no la fuente conceptual del dominio;
- el Excel Read Adapter reconstruye el estado desde esas vistas;
- el futuro PostgreSQL Migrator migra entidades relacionales validadas, sin copiar ciegamente las 152 columnas a una tabla SQL.

En Primera Visita, N filas nativas del mismo acto producen un registro lógico de Primera Visita, N registros de líneas asociadas y PROMs comunes deduplicados por identidad de acto/instrumento. En Seguimiento, N filas producen un `VISITS`, N `VISIT_LINES`, PROMs/adherencia/EA comunes deduplicados según identidad y ámbito, y sospechosos/causalidades con cardinalidad explícita. Si los datos comunes discrepan entre filas del mismo acto, se registra error: el Office Script no selecciona, corrige ni infiere un valor.

Estado actual: workbook operativo del Bridge, Office Script, vistas `APP_*`, Excel Read Adapter y roundtrip no están implementados. El workbook técnico de PR #201 se conserva como artefacto histórico/de cobertura y no equivale al Excel Bridge operativo.

## 4. Browser storage

Estado técnico publicado:

- el ledger clínico introducido por PR #199 y realineado por PR #203 existe en código y persiste actos en `localStorage`;
- imports y snapshots ligados al contexto utilizan actualmente `sessionStorage`;
- PR #201 conserva un workbook técnico alimentado por el ledger, desacoplado de la interfaz normal tras PR #203.

Decisión vigente:

- `localStorage` y `sessionStorage` no son la arquitectura objetivo ni la fuente de verdad clínica;
- no se conservarán datos clínicos, datos de paciente o datos de acto en `localStorage` ni `sessionStorage`;
- no se ampliará ni reutilizará ese almacenamiento;
- tampoco se sustituirá por otro mecanismo oculto en el navegador;
- la retirada técnica todavía no está implementada;
- no se afirma que el código actual cumpla esta decisión.

La retirada requiere una WO técnica atómica que preserve el flujo soportado y quede alineada con el Excel Bridge. Los documentos y PR históricos #199/#201/#203 se conservan por trazabilidad; describen decisiones y capacidades de su momento, no la dirección vigente.

## 5. Identidad

- CIP/`identifier_value` es el identificador operativo introducido por la profesional; no equivale a `patient_id`.
- `patient_id` es técnico, estable dentro de su ámbito y opaco.
- `patient_id` no se deriva del CIP mediante hash, transformación o concatenación.
- El Identity Plane físico permanece diferido.
- Durante este ciclo no se añade Excel de correspondencia, tabla manual ni alta técnica separada.
- La capacidad futura deberá crear o recuperar identidad de forma automática e invisible cuando exista servidor o gateway autorizado.

No se decide todavía el mecanismo productivo de creación, correspondencia, custodia, retención o recuperación de identidad.

## 6. Adjudicación de WO5

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
- Office Script, workbook operativo, vistas `APP_*`, Excel Read Adapter y roundtrip no están implementados;
- cualquier alcance restante se ejecutará, si se autoriza, en WOs atómicas.

La etiqueta es una explicación de adjudicación y no añade un símbolo nuevo al tablero.

## 7. Límites de evaluación y gate de paquete

| Estado | Alcance actual |
|---|---|
| Demo | Fixtures y contextos técnicos cerrados para mostrar capacidades y regresión |
| Evaluación | Formularios e interacciones normales con datos inventados; Export v2 demo paralelo limitado |
| Piloto | No acreditado; exigiría gobierno, seguridad, persistencia y QA adicionales |
| Producción | No autorizada |

No preparar como versión longitudinal final:

- URL definitiva;
- guía final;
- paquete final;
- retirada de v1.

El gate exige demostrar conjuntamente:

- CIP arbitrario mediante flujo normal;
- workbook operativo;
- Office Script;
- vistas `APP_*`;
- Excel Read Adapter;
- roundtrip Hub → Excel → Hub.

Puede autorizarse una evaluación de formularios con alcance inferior solo mediante decisión humana específica y con etiqueta/comunicación explícita que no la presente como versión longitudinal final, piloto o producción.

## 8. Clasificación reconciliada

| Clasificación | Estado |
|---|---|
| Implementado y publicado | Core/adaptadores v2, proveedor técnico cerrado, Export v2 demo paralelo, v1 preservada, ledger/browser storage técnico existente |
| Visible mediante interacción soportada | Botón/salida Export v2 demo en los tres actos para contextos técnicos admitidos; varias filas en Seguimiento |
| Limitado a demo/evaluación | Datos inventados, FH-001/FH-004 para proveedor v2, sin aptitud para piloto |
| Pendiente | CIP arbitrario sin browser storage, Excel Bridge operativo, Office Script, `APP_*`, Read Adapter, roundtrip y retirada técnica del storage |
| Superseded como dirección | Browser storage como persistencia, cohorte sintética especial y WO5 como megadesarrollo único |
| Histórico conservado | PR y documentos #199/#201/#203 y fases previas sin salida v2 visible |
