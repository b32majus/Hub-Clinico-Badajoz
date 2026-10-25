# C1 · Contrato candidato de transporte raw Bridge para EA 0..N en Farmacia

**Fecha:** 25-10-2026.

> **Estado reconciliado al 25-10-2026 (WO-DOC #847):** C1 ratificado como contrato de trabajo; el **núcleo puro C2a** quedó publicado por [PR #846](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/846), SHA `2862cd26a7cac69b840eaaf163c7fcc19f8416be`, [issue #845](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/845) cerrada y CI/Pages postmerge SUCCESS. Este documento recoge también la **adenda técnica de cardinalidad aprobada**; las referencias siguientes a esquema “pendiente de implementación” describen el momento original C1 antes de C2a. **Solo implementación pura: no botón, no relectura del libro Excel ni piloto.**

### Adenda técnica ratificada C1-R1 · manifiesto y codecs (25-10-2026)

La representación física mantiene **166 columnas** y el **prefijo V2 de 152 sin cambios**. Como parte de las 14 columnas nuevas, `ea_payload_codec` y `ea_payload_json` tienen contratos **dependientes del rol**:

- **`followup_act`:** `ea_payload_codec = fh-ea-bridge-manifest/1`; `ea_payload_json` contiene **solo** el manifiesto técnico canónico con recuentos no negativos `evaluations`, `lines`, `observations`, `suspicions`. No son datos terapéuticos. Detecta borrados o inserciones de filas, incluso con `row_count`/`row_index` renumerados, mientras el manifiesto original se conserve.
- **`ea_observation`:** `ea_payload_codec = fh-ea-typed-json/2`; un único registro clínico en `value`, sus `undefinedPaths` y el objeto técnico `associations` con cardinalidad `count` por array explícito `suspicions`/`evaluations`. Solo los arrays se separan en filas; campo ausente, propia `undefined`, `null` y otros valores originales conservan su forma con codec tipado. No confundir marcador técnico de recuento con el array clínico.
- **`ea_suspicion` y `ea_evaluation`:** `ea_payload_codec = fh-ea-typed-json/1`, una sola entidad por fila, nunca un conjunto de EA. `row_id` incluye `S0..Sn-1` / `E0..En-1` para reconstruir en orden **lógico** aunque cambie el orden físico de transporte `row_index`. No interpreta cronología ni causalidad.
- **`followup_line`:** sin payload EA; debe acreditar `active_at_event === true` y `line_status_at_event === 'active'`, identidad explícita, rol y primaria coherentes, máximo una primaria, tratamiento identificable y sin placeholders prohibidos. **Cero líneas activas permitido** si el acto lo declara, a diferencia del adaptador V2 legacy.

**Límites de garantía:** la cardinalidad detecta incoherencia estructural, **no autentica** un Excel editable frente a reescritura coordinada de datos y manifiesto. Ausencias propias / `undefined` / `null` se preservan dentro de las entidades EA por el codec. Borradores y evaluaciones provisionales no se exportan como hechos clínicos incorporados; mostrar el alcance al conectar la salida en C2b. El Reader 166/Read Port y la continuidad/basis con historia permanecen en C3a; guardar, cerrar, reabrir y validar Excel Windows corresponde a C3b antes de cualquier sustitución de WO8.

**Trazabilidad:** schema `schemas/farmacia_bridge_raw_ea_v21.schema.json`; codec `scripts/farmacia_bridge_ea_typed_codec.js`; núcleo `scripts/farmacia_bridge_raw_ea_v21_core.js`; oráculos `tools/farmacia_bridge_raw_ea_v21_core_check.mjs` (56/56 PASS). El contrato V2 de 152 columnas permanece intacto.
**Estado:** **CONTRATO DE TRABAJO C1 RATIFICADO POR DIRECCIÓN (25-10-2026)**: 152 columnas V2 como prefijo + 14 nuevas (166), filas tipadas y transferencia manual única. **ESPECIFICACIÓN DOCUMENTAL SOLO LOCAL; no schema ni implementación publicada, no piloto, no ejecución C2 autorizada.**
**Autoridad de producto previa:** acuerdo de dirección del 25-10-2026: futura operación manual desde un **único libro Excel Bridge raw**, con procesamiento relacional posterior y WO8 conservado hasta superar ida/vuelta real. Registro local en `docs/architecture/FH_BRIDGE_RAW_MANUAL_FIRST_DECISION_20261025.md` (commit documental local `788d943`, NO publicado).
**Repo verificado:** `b32majus/Hub-Clinico-Badajoz`, `promueve/nexus-v4@b392e89927fed2e213a9cd6bbd639cb8326d5104`.
**Propósito:** decidir un **formato candidato preciso** que pueda exportarse y recuperarse sin duplicar EA por línea y sin depender de Office Script. No implementa, modifica o autoriza el cambio de formato.

## 1. Hallazgos de código y bloqueo

- **WO8 actual**: 62 columnas; copia manual en Seguimiento con una fila por línea **dispensada explícita**, EA 0..N expresados como fragmentos identificados en campos de seguridad. No es una fuente de paciente acreditada para el Data Port. [PR #841](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/841).
- **V2 `2.0.0-draft.1` actual**: `schemas/farmacia_export_row_v2.schema.json` y `scripts/farmacia_export_v2_core.js` fijan **152 columnas**, `row_role` de `validation | first_visit_line | followup_line` y, para Seguimiento, una fila por **línea activa explícita**. `validateRowSet` exige `line_id` para toda fila no-validación y mismos campos de evento por conjunto. `adverse_event_id` es común singular, NO una colección de observaciones.
- **Adaptador V2 de Seguimiento**: `scripts/farmacia_export_v2_followup_active_lines_adapter.js` acepta únicamente `technical/context/visit/activeLines`; carece de bloque EA, por lo que el botón en `scripts/farmacia_seguimiento.js` bloquea una copia V2 con presencia o EA incorporados (`eaV2CopyBlockReason`). Es una **guardia clínica correcta**, no una función a desbloquear sin representar los datos.
- **Reader raw publicado**: `scripts/farmacia_bridge_v2_reader.js`, `scripts/farmacia_raw_excel_data_source.js`, `scripts/farmacia_bridge_v2_patient_selectors.js` y `scripts/farmacia_common.js` leen el workbook de **152 columnas** y construyen Data Port en memoria. Comprueban encabezados/versión, filas y grupos de `source_event_id`, pero no reconstruyen registros EA 0..N.
- **Dominio EA**: `modules/farmacia_ea_invariants.js` exige IDs explícitos `patientRef/actId/episode_id/observation_id`, `status:'incorporated'` y descripción para observación documentada; sospechosos con `medicationRef` explícita y evaluaciones con `evaluation_id`, paciente, episodio, método y acto. Borrador no es dato incorporado. `modules/farmacia_ea_patient_projection.js` publicada por [PR #844](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/844) es pura, **NO cableada** a la lectura del archivo.
- **Barrera de origen:** `buildEaActBlockSnapshot()` no entrega por sí misma un acto F4.4 completo ni todos los metadatos de autoría, procedencia, vínculos/evaluaciones que requiere un roundtrip longitudinal. No se inventarán `actId`, `patientRef` ni fechas a partir de `visit_id`, fármaco o ahora.
- **Bridge relacional**: la plantilla `templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx` posee dos hojas raw y 16 técnicas ocultas vacías; Office Script histórico, tablas `APP_*` y lector relacional no están publicados como circuito funcional.

**Conclusión C1 ratificada por dirección:** mantener las 152 columnas sin cambios y activar el botón no es aceptable; empaquetar toda la colección EA del acto en una sola celda común tampoco se selecciona. La solución mínima escogida para especificación es **filas raw tipadas, una sola transferencia manual, esquema versionado y lector compatible explícito**.

## 2. Alternativas comparadas y selección

| Alternativa | Resultado C1 | Motivo |
| --- | --- | --- |
| A · No cambiar 152 columnas ni cardinalidad | **DESCARTADA para EA 0..N** | No existen `episode_id` ni `observation_id` recuperables como entidades y el `row_role` solo modela líneas; desbloquear V2 perdería datos. |
| B · Una gran celda JSON con todos los EA del acto | **No seleccionada** | Copia una colección variable por todas las líneas, límite 32.767 caracteres/celda, difícil validación de duplicados parciales y descomposición posterior. No hay decisión previa que autorice JSON masivo por defecto. |
| C · Varias pestañas normalizadas rellenadas manualmente | **No seleccionada para etapa raw** | Complica al profesional con varias operaciones y acopla C1 al Processor antes de que funcione. |
| **D · Filas raw tipadas en la misma hoja** | **SELECCIONADA COMO CANDIDATO C1** | Una única copia/pegado por acto; identidades/relaciones y cardinalidad verificables; ningún EA se multiplica por líneas; procesador posterior puede normalizar esas filas sin obligar a modificar el flujo manual. |

## 3. Contrato físico candidato exacto

**Identificador de trabajo ratificado:** `fh-bridge-raw-ea/1` (**NUEVO**, no hacer pasar por V2 actual).
**Versión de trabajo para C2:** `2.1.0-draft.1`, todavía NO publicada. Versionado de evento y fila debe ser explícito, validado y consistente; el naming semver queda condicionado a compatibilidad de contratos antes de C2.
**Columnas ratificadas para el contrato de trabajo:** mantener **exactamente las 152 columnas V2 existentes en su orden actual** como prefijo y **añadir 14 al final**, total **166**, pendiente de implementación/pruebas. No reutilizar nombres antiguos con un significado clínico diferente.

| Posición | Columna nueva | Titular y significado |
| --- | --- | --- |
| 153 | `fh_act_id` | Identidad explícita del acto FH; no se infiere de `event_id`, `visit_id` ni timestamp. Dato común de todas las filas del acto. |
| 154 | `fh_patient_ref` | Identidad paciente del contrato EA/F4.4, declarada; no inferirla desde CIP o `patient_id`. Común al acto. |
| 155 | `ea_present` | `si` / `no` / `no_consta`, solo en la fila `followup_act`; nunca se deduce de la ausencia de otras filas. |
| 156 | `ea_episode_id` | Episodio explícito, en observaciones/sospechas/evaluaciones según aplique. |
| 157 | `ea_observation_id` | Observación explícita; enlaza también las sospechas/evaluaciones transportadas en su ficha. |
| 158 | `ea_related_episode_id` | Relación de recurrencia **solo si origen la declara**, nunca deducida de `basis`. |
| 159 | `ea_basis_observation_id` | Referencia de conveniencia; `basis` completo está en payload y debe validarse, no fabricarse. |
| 160 | `ea_medication_ref` | `medicationRef` literal seleccionado como sospechoso, sin derivarlo de líneas/catálogo/tratamiento previo. |
| 161 | `ea_evaluation_id` | Identidad de evaluación independiente, si existe. |
| 162 | `ea_evaluation_method` | Método declarado (Naranjo/Karch u otro realmente aprobado), no calculado. |
| 163 | `ea_record_status` | `incorporated` para observaciones de la copia; borradores **no** se exportan como incorporados. |
| 164 | `ea_evaluation_status` | Estado de evaluación **solo cuando explícitamente documentado**; un resultado provisional o valor cero por defecto no prueba completitud. |
| 165 | `ea_payload_codec` | Literal `fh-ea-typed-json/1` para fila EA con payload; vacío para fila de acto/línea. |
| 166 | `ea_payload_json` | **Una entidad EA por fila**: observación, sospecha o evaluación completa, conservando propiedades explícitas y sus ausencias con codec tipado. Nunca el array entero del acto. |

**Importante:** 166 es el **contrato físico de trabajo ratificado**, **no se reescribe aún** el esquema V2 del repo ni se declara que sus versiones 2.0/2.1 sean interoperables. La evolución exige modificar core, schema, adaptadores, plantilla, reader, Data Port y pruebas de forma gobernada mediante WOs acotadas. El indexador físico se apoya en las 14 columnas, pero la verdad clínica de cada registro es el payload validado; **si columna y payload discrepan, se rechaza TODO el acto sin elegir una versión**.

### Tipos de fila (`row_role` en contrato nuevo)

| `row_role` | Cantidad por Seguimiento | Contenido |
| --- | --- | --- |
| `followup_act` | **Exactamente 1** | Identidad, contexto clínico y `ea_present` explícito, incluso si no hubo líneas activas ni EA. Evita la imposibilidad actual de representar actos sin líneas. |
| `followup_line` | **0..N** | Una por cada línea activa y explícita de la visita; conserva diferencia dispensación/revisión. Nunca una por sospechoso o por EA. |
| `ea_observation` | **0..N** | Una por observación `incorporated` del acto. `ea_episode_id` y `ea_observation_id` obligatorios, `ea_payload_json` conserva la ficha. |
| `ea_suspicion` | **0..N por observación** | Una por elemento del array explícito `suspicions` de esa observación, enlazado a observación/episodio y `medicationRef` de origen. No activa tratamientos ni presupone administración. |
| `ea_evaluation` | **0..N por observación** | Una por evaluación expresamente incorporada a la ficha, con `evaluation_id`, método, pareja paciente–episodio–medicamento y `actId`. Borradores de editor G0 fuera de copia formal. |

Para Validación y Primera Visita, se preservan conceptualmente `validation` y `first_visit_line` de V2 (nueva versión de encabezado no implica nuevo comportamiento clínico). En Seguimiento, `followup_act` sustituye la suposición anterior de que un conjunto siempre consta solo de líneas. **La semántica de un Seguimiento con 0 líneas necesita validarse en C2 contra el contrato del acto, no inferirse por esta especificación.**

### Identidad, integridad y codec

- Todas las filas del acto comparten las **mismas** `source_event_id`, `event_id`, `fh_act_id`, `fh_patient_ref`, `patient_id`, contexto y metadatos de origen **explícitos**. No declarar que `actId === event_id`. La correspondencia se establecerá exclusivamente con mapping autorizado.
- `row_id` técnico único por fila. `row_index` es secuencia de **transporte**, `row_count` incluye **todas** las filas del conjunto, no solo líneas; no se interpreta como cronología clínica.
- `line_id` se exige únicamente en `followup_line`; para otras filas debe quedar vacío. `ea_observation_id` se exige en `ea_observation` y en filas de sospecha/evaluación que remiten a ella. La referencia clínica explícita al paciente/episodio/acto debe coincidir con la fila de observación.
- La unicidad de observación se comprueba entre actos del mismo paciente, no solo dentro de uno; dos actos no pueden declarar *nuevo* el mismo `episode_id` sin continuidad explícita. Reutilizar `episode_id` sí es válido cuando una observación posterior trae `basis` histórica correcta. Recurrencia exige nuevo episodio relacionado expresamente. Reutilizar el mismo `evaluation_id` en la misma observación falla; preservar reglas B02 y no introducir unicidad global de evaluaciones sin contrato.
- Un `ea_payload_json` contiene **una entidad** con envoltorio `{ "value": <árbol explícito>, "undefinedPaths": <array RFC6901> }`: `value` conserva claves, arrays, textos/valores y `null` y usa centinela JSON `null` en las posiciones cuyo valor original propio era `undefined`; `undefinedPaths` identifica inequívocamente esas posiciones. Clave ausente ≠ propia `undefined` ≠ `null`. La decodificación restaura propiedades **propias de datos** sin invocar getters. Si el tipo/camino no es soportado, falla la copia completa, sin eliminar información ni normalizar silenciosamente. Sin objetos cíclicos, prototipos ejecutables, getters, funciones, símbolos ni arrays dispersos; ningún dato fuera de la subestructura EA aprobada se presenta como portador F4.4 íntegro.
- La columna `ea_payload_json` mantiene el alcance por **registro** (a diferencia del JSON agregado por acto). Los demás campos clínicos de cada entidad que no estén indexados entre 153..165 permanecen explícitos dentro del payload; no los infiere el procesador. La especificación definitiva del codec y su prueba de paridad son una condición C2, no una librería hoy existente.
- En columnas de texto solo se admiten valores según el codec TSV seguro del core (sin fórmulas), sin CR/LF/tabulaciones físicos. Se deben medir **todas** las celdas finales contra el límite Excel de **32.767 caracteres**; sobrelongitud bloquea TODO el acto y no copia nada. Si un registro individual excede ese límite, no truncar, dividir ni crear filas extra de contenido sin nuevo contrato. El número de EA no se topa artificialmente en 4.

### Serialización/reconstrucción sin pérdida permitida

1. **Export:** captura clínica explícita → normalización/validación R1 por acto → mapping autorizado de identidad/autoría → filas tipadas → `validateRowSet` → TSV exacto de una sola transferencia. Excluir borradores como registros formales, nunca convertir provisionales en evaluaciones completadas.
2. **Pegado:** la profesional elige manualmente el libro y la hoja operativa permitidos. Copia completa en un único bloque append-only; ningún significado de `persisted` por éxito de portapapeles.
3. **Reimport:** el lector detecta **versión del encabezado**, analiza celdas como texto canónico, agrupa por `source_event_id` y valida `row_count/index/row_role`, homogeneidad de contexto, unicidad, vínculos, payload/índices y versiones. Un lote parcial, grupo repetido, colisión de paciente o payload contradictorio se rechaza con error tipado sin aceptar datos parciales del acto.
4. **Read Port:** compone eventos/actos y observaciones R1 solo desde datos recuperados del archivo realmente cargado y validado; reutiliza el proyector de paciente para obtener pacientes/episodios/observaciones (sin inventar fechas, estado activo, «última», causalidad ni sospecha). El histórico se reconstruye desde actos acreditados con sus referencias `basis` y no se fabrica por apariencia de filas.
5. **Límites de garantía:** copia preparada = `prepared_for_transfer`. Releer el archivo guardado confirma la copia observada, **no** atomicidad de escritura, concurrencia, registro institucional, origen autenticado ni L2 F4.4 sin pérdidas. Fallar seguro antes que declarar recuperación completa.

## 4. Casos C1 para aceptación del contrato antes de implementación

| Caso | Registro → transporte → reconstrucción esperada |
| --- | --- |
| 0 EA, `no_consta` | Una fila `followup_act`, ninguna `ea_observation`, presencia desconocida conservada; no se convierte en «No». |
| 0 EA, `no` | Acto con `no` explícito, sin EA; no resuelve episodios históricos. |
| `si` y 0 EA incorporados | **STOP**: contradicción de R1; no copiar. |
| 1/2/5 EA | 1/2/5 filas de observación y cardinalidad de línea independiente; ninguna multiplicación por fármacos ni sospechosos. |
| 2 líneas, 3 EA | 1 `followup_act` + 2 `followup_line` + 3 `ea_observation` + S sospechas + E evaluaciones; **un solo pegado**; sospechosos L-A, L-B y externo solo cuando se declararon. |
| Mismo episodio E1 en actos A/B | Dos observaciones O1/O2; **un** episodio, ninguna reescritura de O1, `basis` de B acreditada. |
| Recurrencia explícita E2 | E2 nuevo con relación declarada a E1; dos episodios, sin deducir por igualdad de texto. |
| Borrador y G0 provisional | No se exportan como evaluación clínica registrada; no se convierten en `completado` por valor inicial/categoría mostrada. |
| Ausente / `null` / propia `undefined` | Paridad **exacta** dentro de la entidad EA a través del codec; fallar sin copia si no se puede preservar. |
| Cambio paciente A → B → A | La recarga del archivo y selección soportada recuperan exactamente A sin contaminación B. |
| Libro antiguo V2 152 o WO8 62 | Detección clara; vía de lectura legacy solo con garantías existentes, nunca reinterpretar como esquema nuevo ni afirmar EA 0..N completos. |
| Copia repetida / lote incompleto / header alterado / fórmula Excel / celda >32.767 | STOP con error explícito y sin incorporación parcial de acto ni historia. |

**Prueba decisiva C3 (no realizada en C1):** usar dos medicamentos activos y tres EA con sospechosos distintos/externo en datos sintéticos; pegar, guardar físicamente en Excel Windows, cerrar, reabrir el mismo libro, cargarlo desde Inicio, seleccionar A/B/A y acreditar igualdad de identidades, observaciones y relaciones; repetir cero EA, recurrencia y errores. Un `PASS` de tests Node o Chromium aislados no sustituye QA Excel real.

## 5. Puertas de autorización y WOs posteriores

- **C1 (este documento): RATIFICADO por dirección el 25-10-2026** como contrato de trabajo: 166 columnas, filas/roles y codec tipado propuesto con versionado diferenciado. **NO** equivale a autorización para editar código/plantilla ni prueba que el codec funciona. Desviaciones clínicas o garantías nuevas requieren revisión específica.
- **C2a · Schema + core de filas tipadas:** actualización versionada del schema, core, tests de fila/grupo y codec; preservar versión anterior en modo legacy. Base/HEAD nuevo, test RED/GREEN 0/1/2/5 y casos negativos. Sin UI.
- **C2b · Salida Seguimiento a Bridge raw:** cablear solo tras identidad/metadatos explícitos F4.4 aprobados. No habilitar copia V2 con EA si fuente incompleta. Guardas de portapapeles/Excel. No modificar CSV legado ni TXT JARA, sin retirada WO8.
- **C3a · Reader raw y Data Port:** lectura del nuevo formato y reconstrucción real R1, protección colisiones/versiones A/B; pruebas sintéticas en memoria.
- **C3b · QA navegador+Excel real:** prueba de copia, pegado y reimportación de un mismo libro en Excel Windows con datos sintéticos; solo después decidir cambio de botón principal.
- **C4 · cambio de uso habitual:** decisión humana de adopción, documentación/guion, WO específica de retirada/ocultación WO8, nunca eliminación anticipada.
- **C5 · Processor relacional / APP_*:** fuera de alcance, sin dar por hecho implementación ni duplicar la fuente.
- **No reutilizar issue #721 (F4.5 general) para imponer este formato**: permanece OPEN sin `status:approved`; contrato de mapeo F4.4→V2 previo no autoriza este nuevo diseño. Mantener #842 de reconciliación manual intacta y documentar después el contrato en INDEX/estado/plan mediante WO separada.

**POLÍTICA Git:** solo ruta Markdown en worktree aislado, sin cambios en `main`, root, Excel, schema ni tests. No issue, push, PR, merge sin autorización específica. El HEAD remoto se verifica de nuevo antes de modificar o publicar. No migración/destrucción de datos reales. La dirección **ha ratificado** la alternativa D/166 columnas como base de C2a. La ejecución y publicación requieren GO e issue aprobada cuando corresponda.
