# PROMueve Nexus V4 · Matriz de equivalencia F4.4 ↔ Export V2 ↔ Excel Bridge y alineamiento F4.5

**Fecha:** 12 de octubre de 2026

**Tipo:** evidencia técnica de revisión en lectura y alineamiento funcional **ratificado**. Incorporación documental bajo [WO #743](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/743); comprobar estado de la PR y merge antes de considerarla publicada en la rama canónica.

**Repo:** `b32majus/Hub-Clinico-Badajoz`. Rama canónica verificada: `promueve/nexus-v4@41406b155f840cb1c8520fa455f1e03934a4fd7b` (PR documental #742 fusionada).

**Borrador F4.5 estudiado:** `docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md`, worktree local de #671, commit `370cdccdbbab9697c7d63332a19da76efdfb8c01`; **no publicado, no congelado**.

**Processor histórico estudiado:** commit `95565e1698dc4b8333daec0b4d342e298d5d9cfa`, `office-scripts/farmacia_excel_bridge_processor.ts` y `schemas/farmacia_excel_bridge_relational_v1.json`; **no fusionado ni verificado en Excel real**.

**Autoridad:** las decisiones publicadas (ADR-005/006 y Architecture Decision Freeze) prevalecen sobre este documento. Se complementa el [alineamiento de salida agnóstica del 12/10/2026](../PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md), que sí está publicado mediante PR #742. Esta evidencia **no modifica el contrato #671, no aprueba #721 ni extiende aptitud a piloto**.

## 1. Resultado ejecutivo y nueva decisión funcional

**Alineamiento ratificado en conversación:** PROMueve debe aprovechar **una frontera de entrega común**, pero distinguir explícitamente modalidades de salida y garantías de fidelidad. Concretamente:

- **Proyección tabular Export V2, 152 columnas:** útil para copia manual y procesamiento posterior del Excel Bridge. Su garantía se limita al esquema/tablas y filas que efectivamente representa; **no equivale a portar íntegro el Pharmacy Act v1**.
- **Portador de Pharmacy Act completo:** capacidad distinta que debe conservar el acto original, con identidad, revisión, procedencia, estructura clínica explícita y centinelas. Su mecanismo/formato **no está decidido**; no se impone hoy un almacén paralelo en Excel, columnas extra, JSON ordinario, SQL ni un segundo motor clínico.
- **Frontera común:** podrá seleccionar o informar de la modalidad/capacidad, devolver evidencias y garantías honestas y permanecer separada de la UI y del dominio clínico. **No implica que el mismo estado de entrega o DTO pueda utilizarse indiferenciadamente sin distinguir las garantías.** La firma, discriminantes y estados concretos pertenecen a la resolución y publicación de #671, no a esta nota.

**Advertencia contractual crítica:** el borrador local #671 exige actualmente artefacto F4.4 íntegro para poder emitir `prepared_for_transfer`. Bajo esa redacción, **una copia de filas Export V2 por sí sola no satisface esa garantía**. Hay que reconciliar el contrato con las dos modalidades antes de implementar o aprobar #721; no se reinterpretan estados de ADR-005 ni se presenta copia como persistencia.

## 2. Estado de cada pieza: no confundir publicación con funcionamiento

| Pieza | Estado comprobado y límite |
|---|---|
| F4.4 `farmacia_act_contract.js`, `farmacia_act_payloads.js` | Contratos y constructores publicados (PR #490). Sin conexión demostrada a la ejecución de los tres formularios. |
| Export V2 (core, schema y adaptadores) | 152 columnas, copia demo visible/cableada en Validación, Primera Visita y Seguimiento; no entrega duradera ni portador íntegro F4.4. |
| Workbook Bridge Cáceres `templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx` | Dos hojas operativas `01_DERMA` y `03_DIGESTIVO`, cabeceras 152 columnas, dieciséis hojas técnicas ocultas **sin tablas pobladas**. Es contenedor, no Processor operativo. |
| Processor Office Script del commit histórico `95565e1` | Código candidato de **ingesta, validación y descomposición**. No integrado en canónica, sin ejecución/QA real en Office Script; no crea las vistas `APP_*`. |
| Reader existente / Data Port | Existe lectura de Excel raw hacia el flujo de paciente; **no equivale a leer las tablas relacionales futuras `APP_*` ni al roundtrip completo**. |
| Contrato #671 | `CONTRACT_PENDING`, propuesto y revisado localmente; cuatro preguntas abiertas, sin PR canónica ni cambio de runtime. |
| Issue #721 | Abierto, no `status:approved`, bloqueado por #671. |

## 3. Matriz de los 152 campos por bloque

La clasificación indica **capacidad representacional**, no igualdad ya autorizada de nombres/semánticas.

| Bloque Export V2 | Campos | Relación F4.4 | Evaluación |
|---|---:|---|---|
| Bridge/evento/control | 17 | `kind`, fechas y metadatos parciales; añade IDs y control propios de Export | Parcial, no lossless |
| Paciente/site/profesional | 10 | `patientRef`, `siteId`, `authorRef` y otros datos | Relación plausible; sin correspondencia aprobada |
| Referencias de solicitud/visita/línea | 7 | IDs internos potenciales de bloques opacos/`lines` | Parcial; no autogenerables |
| Solicitud | 20 | `payload.request` | Proyección representable, mapping clínico no definido |
| Validación | 22 | `payload.validation` opcional | Proyección representable, mapping no definido |
| Transversal | 20 | `payload.transversal` opcional según caso | Proyección representable, mapping no definido |
| Snapshot de línea | 16 | `payload.lines[]` | Cardinalidad/semántica de línea parcialmente distinta |
| Primera Visita | 6 | `payload.firstVisit` | Mapping no definido |
| Seguimiento | 34 | `payload.followup` y datos por línea | Mapping no definido; posibles pérdidas |
| **Total** | **152** | | |

F4.4 congela **bloques opacos**, no un diccionario de campos hoja. No puede demostrarse una correspondencia clínica hoja por hoja desde F4.4 sin especificar una traducción explícita con autoridad de dominio; **no rellenar faltantes ni deducir tratamiento**.

### Identificadores, metadatos y ausencias

| F4.4 | Export V2 | Evidencia / límite |
|---|---|---|
| `kind` | `event_type` | Los tres tokens coinciden exactamente. |
| `actId` | `event_id`, `source_event_id` | **No existe mapeo aprobado**; igualdad de nombres de finalidad no justifica igualdad de identidad. |
| `revision`, `amendment` | Sin campos homólogos | No reconstructibles desde 152 columnas. |
| `contractVersion: pharmacy-act/v1` | `event_schema_version`, `row_schema_version` | Versiones y autoridades diferentes. |
| `siteId`, `patientRef` | `hospital_code`, `patient_id` | No equivalentes sin regla de identidad/entorno aprobada. |
| `authorRef`, `attributionAssurance` | `professional_ref`, `professional_display` | Autoría declarada ≠ autenticación, `attributionAssurance` no se conserva. |
| `occurredAt`, `authoredAt` | `occurred_at`, `recorded_at` | Primera correspondencia plausible, segunda semánticamente no idéntica por defecto. |
| `provenance` opaco | Contexto y referencias particulares | No conserva el objeto íntegro. |
| Bloques opacos y `payload.lines` | Campos clínicos y filas normalizadas | Hay proyección útil, no inversa integral demostrada. |
| missing / own `undefined` / `null` / `''` / `0` / `false` | Celda ausente representada por `null`, JSON canonizado | Semántica de ausencia parcialmente colapsada. No lossless F4.4. |

**Datos requeridos por Export V2 que F4.4 no garantiza:** `event_id`, `source_event_id`, `recorded_at`, `demo_flag`, `patient_id`, `rowKey`, y otros identificadores de contexto y línea. El futuro adaptador necesitará un proveedor explícito y autorizado de esos datos, no generación silenciosa ni equiparación implícita.

`row_id` resulta de `source_event_id`, `row_role` y `rowKey`. `rowKey` no es una columna autónoma de las 152; la presencia de `row_id` no convierte al Excel en copia literal del acto original. `event_id`/`source_event_id` y `row_count` son útiles para reunir las filas del **mismo evento de exportación**; no constituyen por sí solos una política de equivalencia de IDs F4.4.

## 4. Matriz por caso de uso y cardinalidad

| Situación | F4.4 | Export V2 (adaptadores publicados) | Dictamen |
|---|---|---|---|
| Validación con `payload.lines: []` | Acepta | Una fila de validación con datos de solicitud/decisión; no exige línea creada | Compatible conceptualmente; mapping no aprobado. |
| Validación con varias `payload.lines` explícitas | Acepta | El adaptador proyecta **una** fila de validación | No garantiza conservar todas las líneas originales. |
| Primera Visita con 0 líneas | Acepta | `EMPTY_LINES` / core exige al menos una fila | **No representable** por el adaptador actual. |
| Primera Visita con 1 o N líneas explícitas | Acepta | 1..N filas, IDs de línea explícitos; el adaptador exige exactamente una principal y líneas activas | Representable solo si satisface reglas adicionales, sin inferir líneas. |
| Seguimiento con 0 líneas | Acepta | `EMPTY_ACTIVE_LINES` / core exige al menos una fila | **No representable** por el adaptador actual. |
| Seguimiento con 2 líneas activas | Acepta | Dos filas con `source_event_id`, `row_count`, IDs de línea y orden | Representación tabular coherente; no roundtrip F4.4. |
| Seguimiento con líneas no activas | F4.4 las preserva si son explícitas | Adaptador de líneas activas exige `activeAtEvent=true` y estado activo | Diferencia de cobertura. |

**Reproducción sintética in-memory realizada (Node, sin tocar repo):**

- F4.4 devolvió `ok: true` con `lines: []` para los tres builders.
- F4.4 conservó dos líneas y propiedad propia con valor `undefined` en `provenance` y dentro del bloque `followup`.
- Core Export V2 proyectó 2 filas con el mismo `source_event_id`, `row_count=2`, secuencia 1/2, identidades separadas y `validateRowSet` válido.
- `serializeRowsToTsv` seguido de `parseTsvRows` recuperó esas **dos filas v2**.
- Core V2 rechazó set vacío (`EMPTY_ROW_PAYLOADS`) y propio `undefined` en serialización JSON (`NON_JSON_VALUE`).

**Alcance de la evidencia:** caracterización de módulos JS puros; no demuestra traducción Act→V2, pegado real en Excel, ejecución de Office Script, lectura relacional, persistencia ni QA de navegador.

## 5. Recuperación en tres niveles

| Nivel | Definición precisa | Estado |
|---|---|---|
| L0 — filas | Recuperar las 152 celdas y sus valores tipados bajo contrato V2, incluidas las filas de un mismo evento | Roundtrip de núcleo TSV verificado sintéticamente; **pegado real Excel no verificado**. |
| L1 — acto lógico desde Bridge | Reconstruir una visita/validación con sus líneas y relaciones desde entidades normalizadas | Diseño de agrupación/descomposición en Processor histórico; faltan integración, vistas APP, adaptador relacional, QA Excel y roundtrip. |
| L2 — Pharmacy Act íntegro | Reconstrucción sin pérdida de *todo* F4.4 (identidad, revisión, autoría/procedencia, opacidad, ausencias/centinelas) | **No posible desde las 152 columnas actuales en general**. No existe mecanismo de portador íntegro aprobado. |

La coexistencia de Excel manual, Excel Bridge y API/base de datos **es una elección de despliegue por hospital**, no tres etapas obligatorias de migración. Office Script no tiene que recibir directamente F4.4 ni reinterpretar ninguna decisión clínica.

## 6. Qué hace realmente el Office Script histórico: **ingesta**, no recuperación de la visita

**Secuencia funcional:**

1. PROMueve produce 1..N filas Export V2 explícitas y se copian/pegan manualmente en la hoja operativa del servicio que selecciona la profesional.
2. **Processor Office Script (entrada al Bridge):** lee filas `PENDIENTE`, valida encabezados, celdas, identificadores, tipo, `row_count`, secuencia, datos comunes y duplicados; agrupa por `source_event_id`; descompone hacia `PATIENTS`, `REQUESTS`, `VALIDATIONS`, `TREATMENTS`, `TREATMENT_LINES`, `VISITS`, `VISIT_LINES`, `OBSERVATIONS`, `PROMS`, etc.; marca resultado y audita. **No prescribe, interpreta ni completa hechos clínicos.**
3. **Lector relacional futuro (salida desde Bridge hacia PROMueve):** consultaría entidades/vistas de lectura (`APP_*` previstas), compondría de nuevo la **visita clínica lógica L1** y la expondría a la UI mediante el Read Port. **No está implementado**. El reader raw actual es distinto de ese lector relacional futuro.

Por tanto, la frase «procesador de recuperación» sería incorrecta para el `office-scripts/farmacia_excel_bridge_processor.ts` histórico: es **processor de importación y normalización**.

### Caso `INCOMPLETE_ROW_SET` comprobado en el candidato histórico

Si las filas del mismo `source_event_id` declaran `row_count=2` y al invocarse el Processor solo existe **una** fila `PENDIENTE`:

1. `readCandidates` recoge esa fila.
2. `main` agrupa por `source_event_id`.
3. `validateGroup` detecta `rows.length !== expectedCount` y lanza `INCOMPLETE_ROW_SET`.
4. `main` llama a `rejectRows`: marca la fila encontrada como `ERROR` y registra incidente/auditoría, con raw preservado.
5. En una ejecución posterior, `readCandidates` **solo selecciona `PENDIENTE`**. La primera fila, ya `ERROR`, **no se incorpora automáticamente** al grupo al pegar la segunda; por tanto no hay recuperación automática del conjunto.

**Interpretación:**

- Para el procedimiento **manual controlado** (pegar todas las filas y después lanzar Processor), validar un conjunto completo es correcto y el fallo seguro si faltan filas tiene sentido.
- Si se pretende **ejecución automática o por lotes parciales**, el comportamiento anterior se vuelve insuficiente. Hay que decidir explícitamente si un grupo todavía incompleto permanece pendiente de forma recuperable, cuándo se considera inválido, y cómo se corrige/reintenta sin duplicar entidades ni perder auditoría.
- **No cambiar el Processor histórico automáticamente** ni simplemente reetiquetar `ERROR` como `PENDIENTE`: primero definir la política de integridad/espera/reintento y probarla con datos sintéticos. Esta decisión es para un WO propio de Bridge (#236 / discovery relacionada #577), **no pertenece a la implementación nuclear #721**.
- El script histórico **no está publicado** y su política no constituye hoy un defecto demostrado del producto en ejecución.

### `APP_*` y estado físico

El workbook publicado incluye dos hojas operativas y dieciséis hojas técnicas ocultas **vacías**; no contiene vistas `APP_*` ni tablas técnicas relacionales operativas. El Processor histórico define las dieciséis entidades, **no las vistas `APP_*`**. El diseño de vuelta hacia la UI requiere un adaptador de lectura/roundtrip independiente y sus correspondientes QA. No confundir «plan de descomposición» con «readback completo».

## 7. Reconciliación mínima de Q-1..Q-4, todavía sin congelar

| Pregunta | Alineamiento o evidencia disponible | Decisión contractual/implementación pendiente |
|---|---|---|
| Q-1 · Artefacto | **Decisión funcional:** frontera compartida con **proyección V2** y **acto íntegro** como capacidades con garantías distintas | Definir discriminantes, evidencias y resultados sin atribuir `prepared_for_transfer` completo a una mera fila; decidir portador sin pérdida separado cuando proceda. No imponer columnas o almacén paralelo hoy. |
| Q-2 · `attemptId` | Conceptualmente independiente de `actId`/`revision` | Autoridad del generador, vida del intento, reintentos y formato (capa llamadora vs adaptador). |
| Q-3 · `destination` | Excel manual sin persistencia acreditable; elección humana de libro/hoja | Descriptor mínimo agnóstico; no resolver routing físico #577 dentro de #671. |
| Q-4 · origen/autoría | F4.4 verifica estructura, no autenticidad institucional; `professional_ref/display` son declarados | Límite de procedencia de demo sintética y política por despliegue futuro; no exigir firma JARA al complemento en esta fase. |

**Vocabulario de estados:** mantener ADR-005/006; copia manual ≠ `persisted`; entrega/tablas no implican validación farmacéutica ni dispensación. Si se crea un discriminante de proyección, debe describir explícitamente qué garantía se ha cumplido, y el DTO aún no puede dar por aprobado ese nuevo esquema.

## 8. Trazabilidad de documentación viva — WO #743 (publicación condicionada al merge)

WO documental #743 autorizada por la responsable para consolidar evidencia y punteros. La creación del issue y la apertura de PR no implican integración canónica hasta verificar el merge:

- **Archivo de evidencia:** `docs/architecture/reviews/FARMACIA_F44_EXPORT_V2_BRIDGE_EQUIVALENCE_20261012.md` (esta evidencia técnica, no una nueva ADR).
- **Índice:** `docs/INDEX.md` → enlace desde Arquitectura y Farmacia, bajo el alineamiento ya publicado.
- **Alineamiento:** `docs/architecture/PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md` → enlace de evidencia y nota de que Q-1 se ha **alineado funcionalmente**, pero el contrato sigue pendiente.
- **Estado:** `docs/ops/WORK_ORDER_STATUS.md` → referencia y límite de publicación, sin declarar #671 cerrado ni #721 aprobado.
- **NO TOCA:** runtime, schemas, workbook, Office Script, acuerdos ADR, contratos #671, issues #721/#236/#577, `main`, commits ajenos, despliegue y pacientes reales.
- **Tests/QA documental previstos:** enlaces y estados, `git diff --check`, diff limitado, correspondencia contra SHA canónico actualizado, comprobación de que no se presenta QA Excel/browser inexistente; sin suite runtime requerida para documentación.
- **Reversión/política:** revert documental acotado previa autorización; rama/worktree aislado y sin reescritura. Issue, rama publicada y apertura de PR están autorizados bajo #743. **El merge NO está autorizado.**

## 9. Fuentes comprobadas

**Fuentes canónicas:** `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, `docs/architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`, `docs/architecture/adr/ADR-005-clinical-write-contracts.md`, `docs/architecture/adr/ADR-006-persistence-adapters-and-excel.md`, `docs/farmacia_export_longitudinal_contract_WO8.md`, `docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`, `docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`, `modules/farmacia_act_contract.js`, `modules/farmacia_act_payloads.js`, `scripts/farmacia_export_v2_core.js`, los tres `scripts/farmacia_export_v2_*_adapter.js`, `schemas/farmacia_export_row_v2.schema.json`, `schemas/farmacia_export_event_v2.schema.json`, `scripts/farmacia_bridge_v2_reader.js`, `templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx`.

**Fuente no publicada de evaluación:** `git show 95565e1698dc4b8333daec0b4d342e298d5d9cfa:office-scripts/farmacia_excel_bridge_processor.ts`; y el schema relacional del mismo commit. Mantener su etiqueta de **candidato histórico**, no atribuirle estado canónico.

**Borrador no publicado #671:** `docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md` del worktree local `370cdccdbbab9697c7d63332a19da76efdfb8c01`; Q-1..Q-4 continúan `CONTRACT_PENDING` hasta actualización contractual autorizada y publicada.

**Checkpoint para próximas sesiones:** primero leer el alineamiento arquitectónico ya publicado (PR #742) y esta matriz, **verificando en GitHub si la PR documental de #743 está fusionada** antes de atribuirle autoridad canónica; después resolver Q-1 (modalidades y garantías), Q-2/Q-3/Q-4 y #671. No iniciar #721 ni Processor/roundtrip como consecuencia automática de esta revisión.
