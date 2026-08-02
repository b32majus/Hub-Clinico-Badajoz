# Secuencia de implementación — Export Manager v2 y fila común v2

| Metadato | Valor |
|---|---|
| Fecha | 2026-08-02 |
| Estado | `approved_functional_sequence` |
| Rama base | `recovery/farmacia-pr-replay-20260727` |
| Base Git publicada al aprobar | `2f54c4ec80ed201a4026b374b711eb7572faa367` |
| Último SHA con cambio funcional | `68b5383762f3ae747f567d49df2e80118c38fe16` |
| Contrato previo | `docs/farmacia_export_longitudinal_contract_WO8.md` v3 |
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

| Orden | Work Order | Resultado | Revisión |
|---:|---|---|---|
| 1 | `WO-FH-EXPORT-V2-CANONICAL-CORE-01` | Schemas, registro de columnas, serialización TSV reversible y validadores comunes | Se revisa sola antes de continuar |
| 2 | `WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01` | Evento y fila v2 de Validación; solicitado y validado separados | Stack WO2–WO4 |
| 3 | `WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01` | Evento y fila v2 de Primera Visita con una fecha canónica | Stack WO2–WO4 |
| 4 | `WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01` | Seguimiento `visita × línea activa`; dispensación y revisión independientes | Stack WO2–WO4 |
| 5 | `WO-FH-EXPORT-V2-CUTOVER-01` | Activación pública de fila v2, compatibilidad y retirada gobernada de v1 | Revisión independiente |
| 6 | `WO-FH-EXCEL-BRIDGE-WORKBOOK-01` | Libro por hospital con hojas operativas y técnicas | Revisión propia |
| 7 | `WO-FH-EXCEL-BRIDGE-OFFICE-SCRIPT-01` | Office Script Processor idempotente | Revisión propia + QA en Excel |
| 8 | `WO-FH-EXCEL-BRIDGE-READ-ADAPTER-ROUNDTRIP-01` | Vistas `APP_*`, lectura y roundtrip sintético | E2E independiente |
| 9 | `WO-FH-POSTGRESQL-MIGRATOR-01` | Migración Excel Bridge → PostgreSQL local | Condicionada a servidor autorizado |

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

## 4. Ejecución del stack WO2–WO4

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

## 5. Gate antes de WO5

WO5 solo puede comenzar cuando estén demostrados:

- Validación v2 con solicitado y validado separados;
- Primera Visita v2 con fecha única canónica;
- Seguimiento v2 con una fila por línea activa;
- `0`, `false` y ausencia preservados;
- bloques 1:N serializados y recuperados sin pérdida;
- ninguna inferencia desde nombres, catálogo o ausencia;
- salidas v1 todavía intactas durante WO2–WO4.

## 6. Decisiones funcionales ya cerradas

### Evento y fila

- evento canónico y fila Excel tienen versionado independiente;
- un evento puede generar `1..N` filas;
- cada fila tiene `row_id` propio y comparte `event_id`/`source_event_id`;
- los datos comunes pueden repetirse en la fila ancha, pero se deduplican al normalizar.

### Validación

- solicitado y validado son bloques separados;
- solo una confirmación profesional explícita permite `same_as_requested`;
- pendiente o denegado no crean línea activa;
- los datos terapéuticos ausentes quedan vacíos.

### Primera Visita

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

Se aprueba una acción global futura «Sin revisión específica de líneas». Mientras no exista declaración ni edición, el estado es `not_recorded`.

### Campos repetibles

Variables específicas, PROMs, tratamientos relacionados, respuestas de adherencia, sospechosos y causalidades se conservan como estructuras JSON versionadas en la fila nativa y se descomponen después. Esta solución debe superar en WO1 un roundtrip real TSV sin pérdida antes de quedar técnicamente aceptada.

### Triestado

Los campos clínicos binarios no comienzan preseleccionados. Deben distinguir:

- `yes`;
- `no`;
- `not_recorded`.

## 7. Fronteras posteriores

- WO5 no implementa Office Script.
- WO6 no decide clínica.
- WO7 no corrige ni completa campos clínicos.
- WO8 no convierte las vistas `APP_*` en fuente conceptual del dominio.
- WO9 no se inicia sin servidor local, custodia y autorización institucional.
- Ninguna fase declara piloto real por tener tests verdes.

## 8. Próxima acción

Ejecutar `WO-FH-EXPORT-V2-CANONICAL-CORE-01` desde el HEAD remoto exacto que incluya esta documentación. No usar un SHA recordado ni comenzar los adaptadores antes de revisar WO1.
