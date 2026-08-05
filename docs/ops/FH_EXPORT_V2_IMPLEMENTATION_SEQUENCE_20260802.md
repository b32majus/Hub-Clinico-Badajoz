# Secuencia de implementación — Export Manager v2 y fila común v2

| Metadato | Valor |
|---|---|
| Fecha | 2026-08-02 |
| Estado | `approved_functional_sequence` |
| Rama base | `recovery/farmacia-pr-replay-20260727` |
| Base Git publicada al aprobar | `2f54c4ec80ed201a4026b374b711eb7572faa367` |
| HEAD regional publicado | `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6` |
| Contrato previo | `docs/farmacia_export_longitudinal_contract_WO8.md` v3 |
| Reconciliación documental | 2026-08-03 — adaptadores; 2026-08-04 — Seguimiento; 2026-08-05 — raw reader, Quick View y handoff/dashboard Bridge |
| Datos | Exclusivamente sintéticos |
| Piloto real | No |

## 1. Propósito

Dividir la evolución del Export Manager y del Excel Bridge en piezas secuenciales, revisables y reversibles. El objetivo es evitar un megacambio que mezcle contrato, tres actos clínicos, cutover, Excel, Office Script y servidor.

La secuencia diferencia:

1. núcleo canónico sin UI;
2. adaptadores clínicos sin activación pública;
3. cutover de salidas;
4. Excel Bridge y procesamiento relacional;
5. roundtrip;
6. migración futura al servidor local.

## 2. Secuencia aprobada

> Información histórica (2026-08-02), conservada como aprobación original y superada como estado actual por la sección 2bis.

| Orden | Work Order | Resultado | Revisión |
|---:|---|---|---|
| 1 | `WO-FH-EXPORT-V2-CANONICAL-CORE-01` | Schemas, registro de columnas, serialización TSV reversible y validadores comunes | Se revisa sola antes de continuar |
| 2 | `WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01` | Validación: exactamente una fila; solicitado y validado separados | Stack WO2–WO4 |
| 3 | `WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01` | Primera Visita: `1..N` filas por líneas explícitas y una fecha canónica | Stack WO2–WO4 |
| 4 | `WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01` | Seguimiento `visita × línea activa`; dispensación y revisión independientes | Stack WO2–WO4 |
| 5 | `WO-FH-EXPORT-V2-CUTOVER-01` | Activación pública de fila v2, compatibilidad y retirada gobernada de v1 | Revisión independiente |
| 6 | `WO-FH-EXCEL-BRIDGE-WORKBOOK-01` | Libro por hospital con hojas operativas y técnicas | Revisión propia |
| 7 | `WO-FH-EXCEL-BRIDGE-OFFICE-SCRIPT-01` | Office Script Processor idempotente | Revisión propia + QA en Excel |
| 8 | `WO-FH-EXCEL-BRIDGE-READ-ADAPTER-ROUNDTRIP-01` | Vistas `APP_*`, lectura y roundtrip sintético | E2E independiente |
| 9 | `WO-FH-POSTGRESQL-MIGRATOR-01` | Migración Excel Bridge → PostgreSQL local | Condicionada a servidor autorizado |

## 2bis. Estado publicado — 2026-08-05

| Orden | Work Order | Estado | Trazabilidad |
|---:|---|---|---|
| 1 | `WO-FH-EXPORT-V2-CANONICAL-CORE-01` | Integrada en recovery | PR #211, commit `7109b5f1...`, merge `6ac041f8...` |
| 2 | `WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01` | `MERGED_AND_VERIFIED` | PR #215, commit `1fcd9e4a...`, merge `17426f60...` |
| 3 | `WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01` | `MERGED_AND_VERIFIED` | PR #217, commit `c42eecef...`, merge `c45b7d13...` |
| 4 | `WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01` | `MERGED_AND_VERIFIED` | PR #221, commit `8b7372ac...`, merge `b9f27e96...` |
| WO5A retrospectiva | `WO-FH-EXPORT-V2-TECHNICAL-CONTEXT-01` | Integrada; fixtures técnicos con identidades explícitas y predeclaradas, sin generación ni derivación desde CIP y sin salida pública propia | Issue #224; PR #225; commit `00e5c8a6...`; merge `e2f2c663...` |
| WO5B retrospectiva | `WO-FH-EXPORT-V2-PARALLEL-ACTIVATION-01` | Integrada; Export v2 visible en paralelo, 152 columnas, varias filas soportadas y v1 preservada | Issue #226; PR #227; commit `fe84d83c...`; merge `f86f72f8...` |
| Alineación previa a WO6 | `WO-FH-EVALUATION-LEDGER-RUNTIME-RETIREMENT-01` | Integrada; ledger `localStorage` retirado del runtime soportado sin persistencia alternativa; `sessionStorage` queda pendiente | Issue #230; PR #231; commit `b1ee11e0...`; merge `19867ef1...` |
| 6 | `WO-FH-EXCEL-BRIDGE-WORKBOOK-01` | `MERGED_AND_VERIFIED` | Issue #232; PR #233; commit `c286afab...`; QA manual Microsoft Excel PASS |
| 7 | `WO-FH-EXCEL-BRIDGE-OFFICE-SCRIPT-01` | **Candidate pausado** | Rama `work/fh-excel-bridge-office-script-01-20260805`, commit `95565e1698dc4b8333daec0b4d342e298d5d9cfa`, QA PASS/APTO; gate Microsoft Office Scripts real diferido; sin PR/merge |
| 8A-1 | `WO-FH-EXCEL-BRIDGE-RAW-READ-MODEL-01` | `MERGED_AND_VERIFIED` | Issue #237; PR #238; head técnico `7da866b2...`; merge histórico `92c00eb7...`; lector raw v2 y read model integrados independientemente; no es el HEAD vigente |
| 8A-2A-1 | `WO-FH-BRIDGE-V2-PATIENT-SELECTORS-QUICK-VIEW-01` | `MERGED_AND_VERIFIED` | Issue #241; PR #242; commits `3da3d450...` + `94cd4468...`; merge histórico `e2c54583...`; Quick View dentro de `farmacia_index.html` |
| 8A-2A-2 | `WO-FH-BRIDGE-V2-RUNTIME-HANDOFF-DASHBOARD-01` | `MERGED_AND_VERIFIED` | Issue #245; PR #246; commits `fe28f21f...` + `7ebc4826...`; merge/HEAD `ee749658...`; handoff efímero + dashboard Bridge de solo lectura |
| 8A-2B | Hidratación segura de formularios | **PENDIENTE** | No alimentar formularios desde Bridge |
| 8A-3 | Estadísticas/población | **PENDIENTE** | No consumir todavía el read model para estadísticas |
| Actividad del servicio | Actividad del servicio | **DIFERIDA** | Fuera de la integración actual |
| 9 | `WO-FH-POSTGRESQL-MIGRATOR-01` | Condicionada | No iniciar sin servidor local, custodia y autorización institucional |

PR #223 reconcilió documentalmente Seguimiento v2. PR #225 cerró el proveedor técnico sintético a FH-001/FH-004 y PR #227 activó Export v2 demo visible en paralelo con un TSV común de 152 columnas: Validación genera una fila y Primera Visita/Seguimiento soportan `1..N` según líneas explícitas. `unknown/stale` solo bloquea v2; JARA, CSV y Excel v1 de 61 columnas permanecen intactos.

PR #231 retiró el ledger clínico basado en `localStorage` de las tres pantallas soportadas. PR #238 integra un Bridge raw v2, PR #242 añade su consumidor UI Quick View y PR #246 conecta un dashboard Bridge de solo lectura mediante handoff efímero. No usan `localStorage` ni `sessionStorage`: `postMessage` transporta una sola vez `search_context` y la proyección Quick View después de READY, con `origin`, `source`, nonce y versión verificados y TTL único de 45 segundos. Imports legacy y snapshots anteriores pueden seguir usando `sessionStorage` como deuda separada.

PR #233 publicó el workbook operativo de Cáceres como contenedor del TSV: `01_DERMA` y `03_DIGESTIVO`, 152 columnas canónicas y 16 hojas técnicas ocultas y vacías. PR #238 añadió el lector raw v2/read model, PR #242 los selectores y la Quick View, y PR #246 el handoff y dashboard Bridge. El dashboard recibe una proyección mínima, usa renderer separado del legacy, no adapta a paciente plano ni infiere datos clínicos; recarga/acceso directo fallan cerrado y la URL solo contiene un nonce. Esto no implementa formularios Bridge, Office Script, tablas relacionales pobladas, `APP_*`, Read Adapter ni roundtrip del Hub.

WO5A aporta `patient_id`, IDs de acto, `treatment_id` y `line_id` explícitos, estables y predeclarados. El proveedor no los genera, no deriva ni transforma el CIP en identidad técnica y cualquier contexto no registrado falla cerrado. Es un proveedor de fixtures técnicos, no un `IdentityRepository`.

El alcance original de WO5 incluía activación pública, compatibilidad y retirada gobernada de v1. Su adjudicación es `PARTIALLY_SATISFIED_BY_SMALLER_UNITS / REMAINING_SCOPE_DEFERRED`: `WO5A` y `WO5B` son nombres retrospectivos de reconciliación, no títulos oficiales originales. WO5 no se reabre como megadesarrollo ni se declara completamente cerrada. No existe WO5C ejecutada y no podrá crearse, cerrarse ni declararse ejecutada sin issue, manifest, PR y evidencia publicada. La retirada v1 y la promoción de versiones `draft` quedan aplazadas.

## 3. Frontera de WO1

WO1 construye infraestructura pura y no modifica:

- formularios;
- botones;
- scripts de Validación, Primera Visita o Seguimiento;
- el exportador de 61 columnas;
- CSV o TXT JARA;
- HTML o Pages;
- la plantilla Excel.

WO1 debe demostrar que el contrato es técnicamente viable antes de mapear datos clínicos reales del runtime.

## 4. Ejecución del stack WO2–WO4 — superada

> Información histórica: describe el plan aprobado (2026-08-02) antes de su ejecución y queda **superada como instrucción vigente**. La instrucción «no se hace push, issue ni PR durante la ejecución» correspondía a la fase candidate del stack y ya no es instrucción vigente: WO2 y WO3 se publicaron posteriormente mediante las PR #215 y #217.

Tras fusionar y revisar WO1:

```text
rama/worktree de adaptadores
├── commit 1 — WO2 Validación
├── commit 2 — WO3 Primera Visita
└── commit 3 — WO4 Seguimiento
```

Reglas:

- mismo worktree de integración;
- tres WOs materializadas;
- tres commits locales atómicos;
- cada WO comienza solo si la anterior deja tests verdes y worktree limpio;
- no se hace push, issue ni PR durante la ejecución;
- una WO no puede modificar silenciosamente el núcleo de WO1;
- si un adaptador descubre un defecto común, el stack se detiene y se propone una WO correctiva del core;
- la revisión final examina el conjunto y cada commit por separado;
- la estrategia de issue/PR se fijará antes de publicar el stack y deberá cubrir exactamente las tres WOs aprobadas.

## 5. Gate original antes de WO5

WO5 solo puede comenzar cuando estén demostrados:

- Validación v2 con exactamente una fila y solicitado/validado separados;
- Primera Visita v2 con fecha única canónica y `1..N` filas por líneas explícitas;
- Seguimiento v2 con una fila por línea activa;
- `0`, `false` y ausencia preservados;
- bloques 1:N serializados y recuperados sin pérdida;
- ninguna inferencia desde nombres, catálogo o ausencia;
- salidas v1 todavía intactas durante WO2–WO4.

WO2–WO4 están integradas y verificadas individualmente. Las unidades menores PR #225/#227 no declaran cerrado el gate de cutover completo: solo activan una salida v2 demo paralela y preservan v1. Cualquier trabajo restante exige una WO atómica específica; no se recupera el alcance original como megadesarrollo.

## 6. Decisiones funcionales ya cerradas

### Evento y fila

- evento canónico y fila Excel tienen versionado independiente;
- la cardinalidad depende del acto: Validación `1`; Primera Visita `1..N`; Seguimiento `1..N`;
- cada fila tiene `row_id` propio y comparte `event_id`/`source_event_id`;
- los datos comunes pueden repetirse en la fila ancha, pero se deduplican al normalizar.

### Validación

- exactamente una fila por acto con solo bloques aplicables; lo demás queda vacío;
- solicitado y validado son bloques separados;
- solo una confirmación profesional explícita permite `same_as_requested`;
- pendiente o denegado no crean línea activa;
- los datos terapéuticos ausentes quedan vacíos.

### Primera Visita

Produce `1..N` filas por líneas terapéuticas explícitamente presentes. Todas comparten `event_id`, `source_event_id`, `first_visit_id`, `patient_id`, fecha, contexto y PROMs comunes; cada una conserva `row_id`, `row_key`, `treatment_id`, `line_id`, rol y snapshot. El adaptador conserva soporte `1..N` aunque la UI actual pueda mostrar una sola línea. No se crea otra línea desde tratamiento previo, catálogo, solicitud, nombre o ausencia.

Una única `first_visit_date` representa, en el circuito actual:

- fecha de Primera Visita;
- fecha de inicio;
- fecha de primera dispensación;
- fecha de primera administración.

La inducción sigue siendo un estado separado y no se infiere de la fecha.

### Seguimiento

```text
visita × cada línea activa en esa fecha = una fila por línea activa
```

Son independientes:

- `active_at_event`;
- `dispensation_status`;
- `specific_review_status`.

Todas las filas comparten `event_id`, `source_event_id`, `visit_id`, `patient_id` y contexto común; cada fila conserva `row_id`, `treatment_id`, `line_id`, snapshot y estados explícitos.

Se aprueba una acción global futura «Sin revisión específica de líneas». Mientras no exista declaración ni edición, el estado es `not_recorded`.

### Descomposición relacional

- Primera Visita: N filas → un registro lógico de Primera Visita + N líneas asociadas + PROMs comunes deduplicados por acto/instrumento.
- Seguimiento: N filas → un `VISITS` + N `VISIT_LINES`; PROMs, adherencia y EA comunes se deduplican por identidad/ámbito y sospechosos/causalidades mantienen cardinalidad explícita.
- Datos comunes discrepantes producen error; el Office Script no selecciona, corrige ni infiere valores.

### Campos repetibles

Variables específicas, PROMs, tratamientos relacionados, respuestas de adherencia, sospechosos y causalidades se conservan como estructuras JSON versionadas en la fila nativa y se descomponen después. Esta solución debe mantener el roundtrip TSV ya demostrado por el core y el workbook; WO7 no puede reinterpretar ni completar clínicamente esos bloques.

### Triestado

Los campos clínicos binarios no comienzan preseleccionados. Deben distinguir:

- `yes`;
- `no`;
- `not_recorded`.

## 7. Fronteras posteriores

- La activación paralela de PR #227 no implementa Office Script ni retira v1.
- PR #231 no introduce persistencia alternativa y no retira todavía `sessionStorage`.
- WO6 no decide clínica y ya está cerrada como contenedor del Bridge.
- WO7 no corrige, completa ni infiere campos clínicos; conserva la fila nativa, valida y descompone.
- WO8 no convierte las vistas `APP_*` en fuente conceptual del dominio.
- WO9 no se inicia sin servidor local, custodia y autorización institucional.
- Ninguna fase declara piloto real por tener tests verdes.

## 8. Estado actual y próximas unidades

WO7 Office Script es un candidate publicado y pausado: debe superar el gate real de Microsoft Office Scripts antes de considerarse integrada. La lectura raw v2 está integrada por WO8A-1, la Quick View por WO8A-2A-1 y el handoff/dashboard Bridge por WO8A-2A-2.

La Quick View, el handoff efímero y el dashboard Bridge de solo lectura están integrados. Quedan pendientes WO8A-2B (hidratación segura de Validación, Primera Visita y Seguimiento), WO8A-3 (Estadísticas/población), Actividad del servicio, exportaciones desde Bridge, Office Script, tablas relacionales, `APP_*`, persistencia longitudinal, Excel Read Adapter y roundtrip Hub → Excel → Hub. Mantener el gate del paquete longitudinal final: no preparar URL, guía o paquete final ni retirar v1 hasta demostrar CIP arbitrario, Office Script, `APP_*`, Read Adapter y roundtrip completo.
