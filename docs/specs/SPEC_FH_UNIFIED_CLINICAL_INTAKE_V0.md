# SPEC — Unified Clinical Intake V0 (Farmacia)

**Estado:**

```text
SPEC_REPAIR=PASS
INDEPENDENT_SPEC_RECHECK_OMEN=PASS
INDEPENDENT_SPEC_RECHECK_MUSE=PASS
SPEC_CONTENT=CLOSED
READY_FOR_TO_TICKETS=YES
TICKET_DRAFTING=COMPLETE
TICKET_HANDOFF_AUDIT=PENDING
READY_FOR_AGENT=NO
READY_FOR_IMPLEMENTATION=NO
```

**Reparación post-auditoría:** consolidación quirúrgica de los findings
aceptados de tres auditorías independientes sobre este mismo spec (SESProgram
apply/code survival, estados inseguros SES deterministas, e-Orden sin CIP,
PreSalud multi-record V0, vía `Otra — <especificación>`, marca vs principio
activo, apply por concepto, matriz comparison/proposal, `can_preview`, contrato
textual productor↔parser). No reabre shaping ni amplía scope.
**Autoridad de shaping:** `CONTEXT.md`, `FEATURE_BRIEF_FH_UNIFIED_CLINICAL_INTAKE_V0.md`,
`docs/work-orders/IMPLEMENTATION_PLAN_FH_UNIFIED_CLINICAL_INTAKE_V0.md`.
**Publicación:** checkpoint duradero en la rama de trabajo dedicada
(`work/hermes/fh-unified-clinical-intake-brief`); candidato de ticket train
registrado; auditoría independiente TICKET/HANDOFF pendiente antes de
`ready-for-agent`.
**Nota de autoridad GitHub:**
- Rama publicada verificada en el momento de esta revisión:
  `recovery/farmacia-pr-replay-20260727`.
- `REFERENCE_PUBLISHED_HEAD_AT_SPEC_REVIEW`:
  `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb`.
- Ese SHA es una fotografía de autoridad al revisar el spec; puede avanzar por
  merges documentales/funcionales posteriores. No es un execution HEAD ni un
  expected execution HEAD.
- Cada WO atómica debe reverificar repo, rama, HEAD, worktree, issue authority
  y blockers inmediatamente antes de su ejecución.
- `097396a1d6b995a62f9fc2499879a1271259d753` permanece exclusivamente como
  evidencia histórica del shaping inicial.
- No tocar `main`.

---

## Problem Statement

La farmacéutica recibe la solicitud de tratamiento por dos canales textuales:
la e-Orden generada por el formulario estructurado "Solicitud Dermatología →
Farmacia" (que controlamos) y el export PreSalud de medicación/prescripción.
Hoy la farmacéutica debe transcribir manualmente esos datos hacia Validación
Farmacoterapéutica, con riesgo de error y de pérdida de procedencia.

El productor e-Orden actual no identifica suficientemente el medicamento:
envía únicamente el principio activo, que en biológicos y biosimilares deja un
espacio inaceptable de ambigüedad sobre cuál es el producto concreto
solicitado.

Además no existe ningún parser inverso de e-Orden ni parser de PreSalud: la
información no puede recuperarse de forma determinista, mostrarse antes de
aplicarse ni aplicarse con una barrera profesional segura.

## Solution

Permitir pegar en un único cuadro de texto —solo e-Orden, solo PreSalud, o
e-Orden + PreSalud juntos— y recuperar de forma determinista los datos
explícitos de cada fuente, mostrarlos con procedencia en un preview y ayudar a
cumplimentar Validación FH **sin convertir la importación en una decisión
clínica**.

La e-Orden pasa a identificar el medicamento por su **marca comercial
solicitada** como campo primario (texto libre), añadiendo dosis, vía, pauta e
inducción explícitas.

Internamente el flujo es una cadena pura y source-specific:

```text
raw input
-> detector/segmenter puro
-> source units
-> DermaEOrdenParser
-> PreSaludParser
-> shared semantic layer
-> reconciliation
-> preview
-> professional confirmation
-> apply
```

Ningún parser decide nada clínico: su salida es un resultado estructurado con
`can_apply = false`. Todo lo que puede escribirse en el formulario requiere
preview, confirmación profesional y superar los gates de identidad/asociación.

## User Stories

1. As a hospital pharmacist, I want to paste a full Dermatology e-Order into one textarea, so that its explicit requested-treatment data are recovered without manual transcription.
2. As a hospital pharmacist, I want to paste a PreSalud medication export into the same textarea, so that its explicit data are recovered as requested-treatment context without manual transcription.
3. As a hospital pharmacist, I want to paste e-Orden and PreSalud together in the same textarea, so that both sources of the received request are available in one intake review.
4. As a hospital pharmacist, I want the e-Orden to carry the requested commercial brand as the primary medication identity, so that biologics/biosimilars are not ambiguous.
5. As a dermatology clinician, I want the request form to require a commercial brand (not only an active ingredient), so that Farmacia receives the concrete product requested.
6. As a dermatology clinician, I want a visible instruction to enter the commercial brand rather than the active ingredient, so that the free-text field is correctly understood without an automatic pharmacological classifier.
7. As a dermatology clinician, I want export blocked when the required brand field is empty, so that no incomplete medication request leaves the form.
8. As a dermatology clinician, I want required dose, route, schedule and induction fields on the request, so that the received request carries the complete explicit therapeutic intent.
9. As a dermatology clinician, I want an explicit "No informado" declaration available for dose and route, so that a genuinely unknown value is declared rather than silently left blank or inferred.
10. As a hospital pharmacist, I want a structured preview of recognized data with provenance before anything is applied, so that I can verify the source of each value.
11. As a hospital pharmacist, I want to see which source each recovered concept came from, so that provenance is auditable in the review.
12. As a hospital pharmacist, I want unknown or unrecognized fragments preserved and visible, so that no source text is silently dropped or misclassified.
13. As a hospital pharmacist, I want each source (e-Orden, PreSalud) to pass its own identity/association gate, so that data are never applied to the wrong patient.
14. As a hospital pharmacist, I want apply blocked until a Farmacia patient is explicitly selected, so that an import can never create, change or auto-select a patient.
15. As a hospital pharmacist, I want an e-Orden CIP that exactly matches the selected patient to verify that e-Orden source explicitly, so that verified-CIP association is unambiguous.
16. As a hospital pharmacist, I want a PreSalud source (which does not export CIP) to remain unbound until I manually confirm it corresponds to the selected patient, so that patient association for PreSalud is always explicit.
17. As a hospital pharmacist, I want a valid e-Orden CIP in a mixed input NOT to auto-associate PreSalud to the same patient, so that each source is associated independently.
18. As a hospital pharmacist, I want the system to tell me when two sources provide the same value for a concept (EQUIVALENT / CORROBORATED), so that corroboration is visible without claiming clinical validation.
19. As a hospital pharmacist, I want the system to tell me when two sources provide different values for a concept (DIFFERENT / CONFLICT), so that I can decide explicitly rather than the system choosing a winner.
20. As a hospital pharmacist, I want values that are not safely comparable (NOT_COMPARABLE) to be shown as such, so that the system never equates them with a conflict.
21. As a hospital pharmacist, I want multiple individually usable but non-comparable contributions to require my selection (REQUIRES_SELECTION), so that the system never picks one automatically.
22. As a hospital pharmacist, I want a repeated label with distinct values in one unambiguous unit to be marked MULTIPLE_SOURCE_VALUES and require selection, so that neither first-wins nor last-wins is ever applied.
23. As a hospital pharmacist, I want an existing form value different from an imported one to remain protected (PROTECTED_EXISTING), so that an import never silently overwrites my current data.
24. As a hospital pharmacist, I want an imported value equal to the current form value to be reported as ALREADY_MATCHES_CURRENT without rewriting, so that no redundant or destructive write occurs.
25. As a hospital pharmacist, I want to keep editing requested-treatment fields after an apply, so that the form remains normally editable.
26. As a hospital pharmacist, I want my later manual edits not to alter source_value, provenance or the historical applied_value, so that source evidence stays intact.
27. As a hospital pharmacist, I want re-parsing the same input not to imply re-apply, so that no automatic overwrite happens after manual edits (MANUALLY_EDITED_AFTER_APPLY + PROTECTED_EXISTING).
28. As a hospital pharmacist, I want re-apply to require an explicit new action (REAPPLY_IMPORTED), so that prior authorization is never inherited.
29. As a hospital pharmacist, I want a brand-new intake review to start without inherited confirmations, so that each review is independently decided.
30. As a hospital pharmacist, I want NO_VALUE, "No informado", target NONE and unknown fragments never to clear existing controls, so that an empty or unsupported import cannot erase data.
31. As a hospital pharmacist, I want PreSalud Estado and Días preserved as raw with target NONE and pending external confirmation, so that their meaning is not invented.
32. As a hospital pharmacist, I want the PreSalud medication line parsed with the exact strict medication subgrammar, so that only a fully matching commercial brand is extracted and no partial rescue occurs.
33. As a hospital pharmacist, I want nothing (dose, route, schedule, presentation, devices, duration) extracted from the remaining medication description, so that clinical meaning is never inferred from product text.
34. As a hospital pharmacist, I want the system to avoid CIMA and any external catalogue for hydration, so that no remote or inferred clinical enrichment occurs.
35. As a hospital pharmacist, I want a segmentation ambiguity that blocks one unit or source not to block the whole import, so that damage is proportional to the ambiguity.
36. As a hospital pharmacist, I want a mixed-input partition that cannot be separated safely to block the whole import, so that no source is misattributed.
37. As a hospital pharmacist, I want an empty or completely unknown input to yield a valid empty result, so that the tool never crashes and never hydrates.
38. As a hospital pharmacist, I want parser errors to preserve the affected raw content and block only the affected unit/source without breaking the app, so that a failure is contained.
39. As a hospital pharmacist, I want transient intake data (raw, parser result, reconciliation, provenance, decisions) to remain in memory only, so that no clinical content leaks to storage, logs, analytics, telemetry, backend or external services.
40. As a hospital pharmacist, I want the requested treatment (from either source) to remain strictly separated from validated treatment, so that import never modifies validation results, causality, line, renewal, switch or add-on.
41. As a security reviewer, I want errors to log only safe codes/states, never raw clinical content, so that logs do not leak patient data.
42. As a hospital pharmacist, I want "Servicio clínico compatible" explicitly outside this feature, so that no cross-service clinical inference is introduced.
43. As a hospital pharmacist, I want the e-Orden to carry an explicit SES Program selected by the professional over the closed Dermatology V0 allowlist, so that the program is never deduced from medication, context or catalogues.
44. As a hospital pharmacist, I want the e-Orden to export both `ses_program_code` and `ses_program_label`, so that the program stays interoperable (code) and human-readable (label) as one coherent pair.
45. As a hospital pharmacist, I want the preview to show the SES Program code and label together, so that I can verify the exact pair before applying.
46. As a hospital pharmacist, I want apply to preserve both `ses_program_code` and `ses_program_label` as normal-form program data of the form, so that the code does not disappear after apply even when the visible brownfield pathology control keeps its current value.
47. As a hospital pharmacist, I want an SES program pair that is unknown, out of the allowlist, incoherent (label incompatible with code) or incomplete to block the e-Orden Program SES contribution deterministically, so that no unsafe program value can be applied.
48. As a hospital pharmacist, I want an e-Orden without CIP to remain UNBOUND until I explicitly and source-aware confirm it belongs to the selected patient, so that identifier-less association is always explicit.
49. As a hospital pharmacist, I want my confirmation of a CIP-less e-Orden to be independent from my confirmation of PreSalud, so that each identifier-less source is associated separately and none is auto-associated by the other.
50. As a hospital pharmacist, I want a PreSalud input containing more than one record to be deterministically blocked with zero proposals, so that V0 never composes a treatment from values of different records.
51. As a hospital pharmacist, I want an e-Orden route `Otra — <especificación>` to keep the full specification visible in preview/provenance without hydrating a plain `Otra`, so that explicit source text is never lost or faked.
52. As a hospital pharmacist, I want a global apply action to execute only the concepts that already have an applicable proposal and my explicit per-concept decision, so that a global action can never become bulk replace, first/last wins or blanket confirmation of unreviewed fields.

## Implementation Decisions

### D0 — Autoridad y alcance

- Rama funcional publicada de referencia: `recovery/farmacia-pr-replay-20260727`.
- El spec y el diseño de WOs pueden continuar; **#283 NO es autorización** para
  implementar WO-A/e-Orden. Antes de la implementación deberán existir
  WOs/issues atómicos aprobados conforme a la gobernanza vigente.
- No `main`. No snapshot/package dentro de A–E. El refreeze será una WO
  posterior independiente.

### D1 — Flujo e invariantes

Flujo canónico e invariante:

```text
raw input
-> detector/segmenter puro (WO-B)
-> source units
-> DermaEOrdenParser (WO-C) y PreSaludParser (WO-D)
-> shared semantic layer
-> reconciliation
-> preview
-> professional confirmation
-> apply
```

Invariantes:

- e-Orden + PreSalud = `REQUESTED_TREATMENT / SOLICITUD_RECIBIDA`. Nunca
  `VALIDATED_TREATMENT`.
- `PARSER != MOTOR_DE_INFERENCIA`. Los parsers son puros y source-specific.
- No CIMA para hydration. No inferencia clínica/farmacológica/temporal.
- No first-wins / last-wins.
- Nada borra controles salvo acción profesional explícita.
- Una sola textarea a nivel UX.

### D1a — Modelo de dominio: SESProgram

El diccionario unificado de PROGRAMAS establecido por el SES (proporcionado por
Farmacia para homogeneizar la nomenclatura de las Farmacias Hospitalarias y
compartir/integrar/analizar información con Servicios Centrales) introduce el
concepto de dominio:

```text
SESProgram
- ses_program_code:  identidad canónica interoperable SES (p. ej. SES_HS)
- ses_program_label: denominación canónica SES para lectura humana
                     (p. ej. HIDRADENITIS SUPURATIVA), exacta según catálogo
```

Contrato de dominio:

- Es un catálogo corporativo de PROGRAMAS, no un catálogo global de patologías.
- `ses_program_code` es la identidad canónica interoperable.
- `ses_program_label` es la denominación canónica SES para lectura humana y se
  conserva EXACTAMENTE según el catálogo (incluida la ausencia de tildes cuando
  el catálogo no las tiene: `DERMATITIS ATOPICA`, `VITILIGO`).
- `code` + `label` se conservan conjuntamente durante intake, reconciliation y
  confirmation/apply; el contrato no se reduce a un único string visible.
- La correspondencia entre opciones brownfield actuales y el SESProgram
  (`Dermatitis atópica` -> `SES_DA`/`DERMATITIS ATOPICA`, `Vitíligo` ->
  `SES_VITI`/`VITILIGO`) es una correspondencia EXPLÍCITA de la allowlist; no
  amplía la normalización lexical común V0 (que conserva acentos), no aplica
  fuzzy matching ni autocorrección ortográfica.

Adjudicación post-auditoría — supervivencia y representación brownfield:

1. `ses_program_code` y `ses_program_label` son valores de NORMAL FORM del
   programa SES, no provenance transitoria.
2. Ambos deben sobrevivir al apply como datos normales del formulario/estado
   clínico V0 correspondiente al programa seleccionado, siguiendo el ciclo
   `source_value -> applied_value -> current_form_value` de D11 y el contrato de
   persistencia/draft existente (D12).
3. NO es válido que después del apply quede únicamente
   `fhDermaPatologia = "<string visible>"` y se pierda `ses_program_code`.
4. `fhDermaPatologia` sigue siendo el control/ID técnico brownfield visible
   actual. NO se renombra ese ID en esta feature.
5. La correspondencia brownfield es EXPLÍCITA y cerrada:

```text
SES_HS   | HIDRADENITIS SUPURATIVA -> fhDermaPatologia = "Hidradenitis supurativa"
SES_PSOR | PSORIASIS               -> fhDermaPatologia = "Psoriasis"
SES_DA   | DERMATITIS ATOPICA      -> fhDermaPatologia = "Dermatitis atópica"
SES_VITI | VITILIGO               -> fhDermaPatologia = "Vitíligo"
SES_AA   | ALOPECIA AREATA         -> fhDermaPatologia = "Alopecia areata"
```

   Esta correspondencia es declarada; NO depende de accent normalization; NO es
   fuzzy; NO se infiere.
6. El spec NO decide aquí la mecánica DOM concreta utilizada para conservar el
   `code` (eso pertenece a la implementación de WO-E), pero el resultado
   observable/normativo queda cerrado:

```text
POST_APPLY_SES_PROGRAM_CODE_SURVIVES         = YES
POST_APPLY_SES_PROGRAM_LABEL_SURVIVES        = YES
VISIBLE_BROWNFIELD_PATHOLOGY_VALUE_SURVIVES  = YES
```

Estados inseguros del Programa SES (resultado determinista cerrado). Si el
contrato e-Orden declara Programa SES, el par code+label es obligatorio y
coherente. Para cualquiera de estos estados:

- SES code desconocido;
- SES code fuera de la allowlist Dermatología V0;
- code conocido + label incompatible con el code declarado;
- code sin label;
- label sin code;

el resultado es:

```text
SES_PROGRAM_CONTRIBUTION:
- target           = NONE
- proposal_status  = NO_PROPOSAL
- blocking         = true
- warning/error estructurado con el motivo exacto
```

La unidad e-Orden afectada puede mostrarse en preview (raw + estado + motivo),
pero NO puede aplicarse mientras su Programa SES sea inválido. Este bloqueo NO
bloquea automáticamente otras unidades/fuentes independientes del mismo paste
que WO-B haya separado con seguridad: una e-Orden inválida por Programa SES
convive con una PreSalud independiente válida sin que esta pierda su lifecycle
propio (ver D13). Queda prohibido: fuzzy, reconstrucción de code desde label,
reconstrucción de label desde code mediante catálogo silencioso, fallback, best
guess y mapping de `SES_UCE` (u otro programa fuera de allowlist) a un programa
soportado.

### D2 — Descomposición en 5 responsabilidades (futuras WOs atómicas)

El spec usa exactamente estas cinco fronteras:

- **WO-A — e-Orden producer / export contract:** corrige el formulario de
  solicitud para emitir marca comercial solicitada (primaria), dosis
  solicitada, vía solicitada, pauta, inducción solicitada y Programa SES
  explícitos. El profesional selecciona el programa sobre la allowlist cerrada
  de Dermatología; el sistema no lo deduce. Vacío bloquea export. No intenta
  detectar automáticamente si el texto es marca o principio activo. Exporta
  explícitamente `ses_program_code` + `ses_program_label` (ver D8).
- **WO-B — pure detector / segmenter:** opera sobre raw input, produce
  unidades delimitadas (e-Orden unit / PreSalud unit / unknown fragments), sin
  parsing clínico ni hydration. Solo partición estructural única; no asume
  orden de fuentes; no infiere asociación de paciente; emite
  `SEGMENTATION_BLOCKED` cuando los límites/pertenencia no son seguros.
- **WO-C — DermaEOrdenParser:** consume unidades e-Orden ya delimitadas por
  WO-B y extrae conceptos reconocidos (marca, dosis, vía, pauta, inducción,
  Programa SES code + label, patología exacta, CIP para el gate). Puede
  comprobar únicamente coherencia determinista contra la allowlist cerrada de
  Dermatología; los estados inseguros del par code+label producen el resultado
  determinista `SES_PROGRAM_CONTRIBUTION` de D1a. Sin recuperación heurística.
  Sin fuzzy mapping; sin inferencia
  desde medicamento; sin CIMA; sin catálogo farmacológico; sin mejor guess; sin
  inferencia de programa desde contexto clínico.
- **WO-D — PreSaludParser V0:** consume unidades PreSalud ya delimitadas por
  WO-B y aplica la gramática y subgramática estrictas.
- **WO-E — shared semantic reconciliation + preview + professional
  confirmation + apply:** capa compartida que reconcilia conceptos, construye
  preview, gestiona gates de identidad/asociación, aplica protección de
  valores y escribe solo tras confirmación profesional. Conserva
  `ses_program_code` + `ses_program_label` como contrato de dominio hasta
  confirmation/apply y como valores normales del formulario tras apply
  (D1a: `POST_APPLY_SES_PROGRAM_CODE_SURVIVES = YES`,
  `POST_APPLY_SES_PROGRAM_LABEL_SURVIVES = YES`). `fhDermaPatologia` puede
  conservarse como ID técnico
  brownfield si cambiarlo amplía riesgo; no renombrar IDs DOM brownfield por
  estética. La UI de Farmacia usa la terminología `Programa SES` donde se
  introduzca/presente este contrato.

**WO-C and WO-D consume already-delimited source units produced by WO-B. They
do not rediscover mixed-input boundaries.**

Flujo mantenido:

```text
raw input
→ WO-B detector/segmenter
→ source units
→ WO-C / WO-D source-specific parsers
→ WO-E shared semantic layer / reconciliation / preview / confirm / apply
```

Ningún parser queda escondido dentro de "preview".

### D3 — Contrato fail-safe del parser (WO-C, WO-D y su integración)

Cada parser **unitario** expone una función pura cuyo resultado mínimo es:

```text
raw_input
source
unit_state
concepts/contributions
warnings
errors
blocking_states
can_preview
can_apply = false
```

La **integración/pipeline agregado** (WO-E) añade sobre las salidas unitarias:

```text
raw_input
detected_sources
recognized_units
unrecognized_fragments
concepts/contributions
warnings
errors
blocking_states
can_preview
can_apply = false
```

`detected_sources`, `recognized_units` y `unrecognized_fragments` son, por tanto,
responsabilidad del agregado y NO campos obligatorios duplicados en cada parser
unitario WO-C/WO-D.

Estados de resultado por unidad/fuente:

```text
RECOGNIZED
PARTIALLY_RECOGNIZED
UNRECOGNIZED
SEGMENTATION_BLOCKED
PARSER_ERROR
```

- Parser puro: no modifica controles, no modifica estado clínico, no invoca
  CIMA, no realiza hydration, no tiene fallback clínico "best effort".
- `can_apply` es siempre `false` en la salida del parser.
- Excepción interna inesperada → capturada como `PARSER_ERROR`: conserva el raw
  de la unidad/fuente afectada, bloquea esa unidad/fuente, sin heurísticas de
  recuperación, sin romper la aplicación.
- Input vacío o completamente desconocido → resultado válido con cero
  propuestas y sin hydration.

`can_preview` (semántica cerrada; preview y apply son gates diferentes; el
parser nunca aplica y `can_apply = false` permanece SIEMPRE en su salida):

```text
RECOGNIZED           -> can_preview = true
PARTIALLY_RECOGNIZED -> can_preview = true; solo las contribuciones seguras
                        pueden continuar hacia reconciliación
UNRECOGNIZED         -> can_preview = true para mostrar raw/estado;
                        cero propuestas inseguras
SEGMENTATION_BLOCKED -> can_preview = true para mostrar raw/bloqueo siempre que
                        pueda hacerse sin asignar ownership falso;
                        unidades bloqueadas = cero apply
PARSER_ERROR         -> can_preview = true para mostrar estado de error + raw
                        local si está disponible de forma segura;
                        cero propuestas; cero apply
```

`can_preview = true` NO significa: valid, associated, proposable ni applicable.
La identidad/asociación de fuente y la reconciliación siguen teniendo gates
separados (D5, D6).

### D4 — Detector/segmenter (WO-B)

- Reconoce e-Orden only, PreSalud only y mixed input **solo por partición
  estructural única** de las gramáticas estructurales de cada fuente.
- No asume orden de fuentes (e-Orden antes o después de PreSalud es válido si
  la partición es única).
- Preserva unknown aislable como fragmento independiente con límites seguros.
- `SEGMENTATION_BLOCKED` cuando la pertenencia o los límites de una
  unidad/fragmento no sean seguros.
- No infiere asociación de paciente.

### D5 — Gate de identidad/asociación (WO-E)

El paciente de Farmacia debe estar **explícitamente seleccionado**. El texto
importado nunca crea, cambia ni auto-selecciona paciente.

Estados de asociación por fuente:

```text
VERIFIED_EXPLICIT_CIP
MANUALLY_CONFIRMED_SELECTED_PATIENT
UNBOUND
CONFLICT
```

Reglas:

1. Sin paciente seleccionado → preview permitido; apply bloqueado.
2. e-Orden con CIP: CIP exacto == paciente seleccionado →
   `VERIFIED_EXPLICIT_CIP`. CIP diferente, múltiple o ambiguo → `CONFLICT` y
   apply bloqueado. Nunca asociar por nombre, similitud, posición o contexto.
   La comparación de CIP reutiliza el contrato de identidad/identificadores ya
   soportado y publicado por el Hub (comparación exacta, con las
   transformaciones de transporte que ese contrato ya autoriza, p. ej. trim
   periférico simétrico y rechazo de componentes whitespace-only). NO se añade
   ninguna normalización de identidad nueva: no fuzzy, no name matching, no
   case-folding nuevo, no similitud, no contexto.
3. PreSalud: no exporta CIP en el contrato V0 demostrado; permanece `UNBOUND`
   hasta confirmación manual explícita para el paciente ya seleccionado,
   mediante texto conceptual equivalente a: "Confirmo que estos datos PreSalud
   corresponden al paciente seleccionado."
4. Entrada mixta: que la e-Orden tenga un CIP válido NO asocia automáticamente
   PreSalud al mismo paciente; cada fuente supera su propio gate de asociación
   antes de reconciliarse.
5. E-Orden SIN CIP (aportación opcional de CIP en e-Orden): → `UNBOUND`.
   - Si existe paciente FH seleccionado: preview permitido; apply requiere
     confirmación profesional EXPLÍCITA y SOURCE-AWARE, con wording funcional
     equivalente a: "Asociar esta e-Orden sin CIP al paciente seleccionado".
     Tras esa confirmación → `MANUALLY_CONFIRMED_SELECTED_PATIENT`.
   - Si NO existe paciente FH seleccionado: preview únicamente; apply
     bloqueado.
6. En input mixto, la confirmación manual de la e-Orden es distinta de la
   confirmación manual de PreSalud: cada fuente identifier-less requiere su
   propia asociación explícita. Nunca se permite que una e-Orden con CIP
   válido vincule automáticamente a PreSalud (ni a otra fuente identifier-less).

La asociación establece pertenencia de la fuente; no valida ni interpreta sus
datos clínicos. No equivale a validación terapéutica.

### D6 — Reconciliación

Ejes separados:

```text
comparison_status:
  EQUIVALENT | DIFFERENT | NOT_COMPARABLE | NOT_APPLICABLE

proposal_status:
  AUTO_PROPOSABLE | REQUIRES_SELECTION | NO_PROPOSAL
```

- `EQUIVALENT` entre e-Orden y PreSalud puede mostrarse como `CORROBORATED`.
- `DIFFERENT` → `CONFLICT`; nunca se elige automáticamente.
- `NOT_COMPARABLE` NO equivale a `CONFLICT`: significa que no existe
  comparación segura autorizada para ese par.
- Comparabilidad, usabilidad y posibilidad de propuesta automática son ejes
  independientes.
- Varias contribuciones individualmente utilizables pero no comparables →
  `REQUIRES_SELECTION`; nunca elegir una automáticamente.
- Solo una fuente aporta el concepto → `ONLY_EORDEN` o `ONLY_PRESALUD`,
  conservando la semántica de origen.
- Toda contribución conserva provenance.

Matriz mínima de cierre (adjudicación post-auditoría):

- **A.** Un único valor explícito utilizable de una fuente + target exacto +
  current empty + sin conflicto → `proposal_status = AUTO_PROPOSABLE`
  (sujeto siempre a confirmación profesional antes de apply).
- **B.** Dos fuentes con valores explícitamente equivalentes (tras la
  normalización autorizada del concepto) → `comparison_status = EQUIVALENT`,
  presentado como `CORROBORATED`; la propuesta puede ser `AUTO_PROPOSABLE` si
  el resto de gates lo permite.
- **C.** Dos valores comparables y diferentes → `comparison_status =
  DIFFERENT` → `CONFLICT` → `proposal_status = REQUIRES_SELECTION`; sin
  ganador.
- **D.** Conceptos estructuralmente distintos (p. ej. `principio_activo_raw`
  vs `commercial_name`, ver D10) NO se reconcilian como rivales: no se crea un
  conflicto entre ellos.
- **E.** `NOT_APPLICABLE`: se usa cuando un elemento no participa en la
  comparación clínica/hydration del concepto correspondiente;
  `proposal_status = NO_PROPOSAL` cuando no existe target aplicable.
- **F.** Valores repetidos, distintos y utilizables dentro del MISMO source
  record/concepto (unidad con límites seguros) → `REQUIRES_SELECTION`
  (`MULTIPLE_SOURCE_VALUES`); sin first/last wins. Nunca se crea una nueva
  precedencia de fuentes.

En **PreSalud V0**, F NO es un criterio ejecutable de WO-D: D9 representa un
único valor posicional por concepto en exactamente seis campos. Un séptimo
campo/duplicación rompe la gramática del registro → `UNRECOGNIZED`, raw
preservado, zero proposals. WO-D no sintetiza `MULTIPLE_SOURCE_VALUES` para una
estructura que la gramática V0 no puede expresar. F queda reservada para
fuentes/formatos futuros que definan explícitamente valores repetibles dentro
de un mismo registro.

Caso estructural marca vs principio activo (cierre sin clasificación
farmacológica): en la subgramática PreSalud, `principio_activo_raw` es un
componente estructural/provenance-only del `medicamento_raw` (D10). No es un
valor rival de `commercial_name`. Por tanto el fixture "marca vs principio
activo" produce `NOT_COMPARABLE` por ESTRUCTURA/CONCEPTOS DISTINTOS, no por
determinar farmacológicamente qué string "es principio activo" o "es marca";
nunca produce un falso `CONFLICT`.

### D7 — Allowlist de hydration

Solo se hidratan conceptos con target FH semánticamente exacto documentado.
Lo no documentado queda en preview/provenance only.

E-ORDEN:

```text
Marca comercial solicitada -> commercial_name      -> fhDermaFarmaco
Dosis solicitada           -> requested_dose       -> fhDermaDosis
Vía solicitada             -> requested_route      -> fhDermaVia
Pauta                      -> requested_schedule   -> fhDermaPauta / fhDermaPautaOtro
Inducción solicitada       -> requested_induction  -> fhDermaInduccion
Justificación clínica      -> requested_justification -> fhDermaJustificacion
Programa SES               -> ses_program           -> ses_program_code + ses_program_label
                                                     (dominio; ver nota bajo esta tabla)
Patología                  -> pathology            -> fhDermaPatologia (solo equivalencia exacta
                                                     reconocida; correspondencia explícita de
                                                     la allowlist con el SESProgram)
CIP                        -> identity gate        -> target solo según contrato explícito
```

Caso `Vía solicitada: Otra — <especificación>` (e-Orden; adjudicación
post-auditoría):

- `SC | IV | Oral | IM` → target exacto `fhDermaVia` → propuesta permitida
  según el lifecycle normal.
- `Otra — <especificación>` → raw/provenance preservado; concepto visible en
  preview; `target = NONE`; `proposal_status = NO_PROPOSAL`.
  - NO se hidrata simplemente `fhDermaVia = "Otra"`.
  - NO se pierde la especificación explícita.
  - NO se crea en esta feature un nuevo campo brownfield solo para resolverlo.
- Este caso NO bloquea automáticamente otros conceptos seguros de la misma
  e-Orden.

La allowlist de programas permitida para el flujo Dermatología V0 es
EXACTAMENTE:

```text
SES_HS   | HIDRADENITIS SUPURATIVA
SES_PSOR | PSORIASIS
SES_DA   | DERMATITIS ATOPICA
SES_VITI | VITILIGO
SES_AA   | ALOPECIA AREATA
```

`SES_UCE`, `SES_PRNO` y cualquier otro programa presente en el catálogo SES
quedan fuera: no están soportados por el runtime Dermatología V0 y añadirlos
sería expansión funcional.

Nota sobre `Programa SES` / `fhDermaPatologia`: `fhDermaPatologia` puede
conservarse como ID técnico brownfield si cambiarlo amplía riesgo, pero el
contrato de dominio conserva `ses_program_code` + `ses_program_label` hasta
confirmation/apply y NO se reduce a un único string visible: tras apply ambos
sobreviven como valores normales del formulario (D1a:
`POST_APPLY_SES_PROGRAM_CODE_SURVIVES = YES`,
`POST_APPLY_SES_PROGRAM_LABEL_SURVIVES = YES`,
`VISIBLE_BROWNFIELD_PATHOLOGY_VALUE_SURVIVES = YES`). El mecanismo técnico
brownfield concreto puede adjudicarse en WO-E. La UI de Farmacia usa la
terminología `Programa SES` donde se introduzca/presente este contrato. La
correspondencia completa de la allowlist con `fhDermaPatologia` es la tabla
explícita de D1a (declarada, sin accent normalization, sin fuzzy, sin
inferencia); la normalización lexical común V0 conserva acentos y no se amplía
para eliminarlos (no fuzzy, no autocorrección).

PRESALUD:

```text
marca_comercial_explicit -> commercial_name    -> fhDermaFarmaco
Dosis                    -> requested_dose     -> fhDermaDosis
Vía                      -> requested_route    -> fhDermaVia (solo equivalencia exacta autorizada;
                                                 no convertir automáticamente un valor
                                                 desconocido a "Otra")
Pauta                    -> requested_schedule -> WO-D parser: target NONE / NO_PROPOSAL;
                                                  WO-E: mapping profesional explícito;
                                                  opción exacta existente -> fhDermaPauta;
                                                  si no, fhDermaPauta = OTRO + texto
                                                  completo en fhDermaPautaOtro
Estado                   -> NONE
Días                     -> NONE
```

- `Estado` y `Días` mantienen `semantic_status = PENDING_EXTERNAL_CONFIRMATION`
  y `target = NONE`.
- `requested_schedule` PreSalud es explícita/provenance, pero WO-D NO decide por
  sí solo que el texto sea una representación exacta de `fhDermaPauta`: siempre
  sale del parser con `target = NONE` y `proposal_status = NO_PROPOSAL`. WO-E
  puede mapearla solo mediante decisión profesional explícita a una opción
  brownfield exacta o a `OTRO` + `fhDermaPautaOtro`; nunca AUTO_PROPOSABLE por
  la mera cadena de Pauta.
- No extraer de `medicamento_raw`: dosis, vía, pauta, presentación,
  dispositivos, duración.
- No CIMA para hydration.
- Otros datos clínicos e-Orden sin target exacto documentado →
  preview/provenance only. No se inventan mappings genéricos.

### D8 — e-Orden producer (WO-A)

**Contrato del campo de marca comercial:**

- El campo `Marca comercial del fármaco solicitado` es **obligatorio**.
- empty / whitespace-only → bloquea la exportación.
- Cualquier texto no vacío satisface únicamente el gate sintáctico V0
  (no vacío).
- V0 **no intenta determinar** si ese texto es marca comercial, principio
  activo, presentación u otra cadena farmacológica.
- NO CIMA; NO catálogo; NO regex farmacológica; NO diccionario farmacológico;
  NO inferencia.
- Por tanto, "solo principio activo" **NO puede ser un criterio
  machine-detectable de bloqueo en V0**: el sistema no tiene autorización ni
  capacidad para clasificarlo. Esto no convierte el texto en aceptación
  semántica de principio activo — simplemente V0 no lo clasifica.
- La instrucción visible al profesional sigue exigiendo introducir la marca
  comercial (no el principio activo).

**Resto de campos del producer:**

- `Programa SES`: el profesional selecciona explícitamente el programa sobre la
  allowlist cerrada de Dermatología V0 (ver D7). El sistema no lo deduce. El
  productor exporta ambos conceptos explícitamente (`ses_program_code` +
  `ses_program_label`) mediante la serialización normativa ÚNICA fijada en D17
  (no existen variantes "equivalentes" dentro del contrato parser). La forma
  normativa es:
  ```text
  PROGRAMA SES
  • Código: <SES_PROGRAM_CODE>
  • Denominación: <SES_PROGRAM_LABEL>
  ```
- `Dosis solicitada`: texto obligatorio; admite `No informado`.
- `Vía solicitada`: `SC | IV | Oral | IM | Otra | No informado`. `Otra`
  requiere especificación y se exporta como `Otra — <especificación>`.
- `Pauta`: texto libre obligatorio (no conversión automática a catálogo en el
  producer).
- `Inducción solicitada`: binaria `SÍ | NO`, pregunta explícita. No existe una
  pauta de inducción separada en V0.
- Etiquetas exportadas exactas (contrato de texto para el parser inverso).
- No deducir dosis, vía, pauta o inducción desde la marca u otro campo.

### D9 — Gramática PreSalud V0 (WO-D)

- Secuencia exacta y delimitada por `;`:

```text
Estado -> Medicamento -> Vía -> Dosis -> Pauta -> Días
```

- Cada valor termina en el siguiente `;` o en fin de segmento.
- `Estado` vacío → `NO_VALUE`, `semantic_status =
  PENDING_EXTERNAL_CONFIRMATION`, `target = NONE`.
- `Días` no obtiene target clínico en V0.
- No se extrapolan aliases, órdenes alternativas, campos omitidos ni formatos
  multilinea.
- Multi-record V0 (adjudicación post-auditoría; cierra y sustituye el marco
  previo `multi_record_support = NOT_YET_SPECIFIED` de los documentos de
  shaping): V0 NO soporta composición multirregistro PreSalud.
  `multi_record_support = NOT_SUPPORTED_V0`. Cuando el sistema detecta de
  forma determinista que el input PreSalud contiene más de un registro:

```text
PRESALUD_MULTI_RECORD_V0:
- blocking_reason        = MULTI_RECORD_UNSUPPORTED_V0
- raw preserved          = YES
- preview raw            = YES
- clinical proposals     = NONE
- apply                  = BLOCKED
```

  Si los límites entre registros son seguros, la fuente/unidad se clasifica
  como NO soportada V0 de forma estructurada (compatible con los estados parser
  existentes), con el motivo `MULTI_RECORD_UNSUPPORTED_V0`; NO se usa
  `SEGMENTATION_BLOCKED` solo por ser multi-record. Si además los límites son
  inseguros → `SEGMENTATION_BLOCKED` según D13. No se crea un motor
  multirregistro; no se intenta chronology, current-vs-history, record
  selection, cross-record composition, dedup ni first/last record wins.

  EXTRA/REPEATED FIELD RULE: PreSalud V0 NO define labels repetibles dentro de
  un registro; define exactamente seis valores posicionales. Un valor/campo
  adicional o duplicado rompe la gramática del registro → `UNRECOGNIZED`, raw
  preservado, zero proposals. `MULTIPLE_SOURCE_VALUES` NO es criterio de
  aceptación de WO-D V0. Nunca se combinan campos de registros diferentes.

### D10 — Subgramática PRESALUD_MEDICAMENTO_V0 (WO-D)

```text
PRESALUD_MEDICAMENTO_V0 :=
  principio_activo_raw WS* "(" marca_comercial_raw ")" WS* descripcion_restante_raw?
```

- `principio_activo_raw != EMPTY`; `marca_comercial_raw != EMPTY`;
  `descripcion_restante_raw` opcional; `WS` = whitespace lexical.
- Un solo grupo parentizado contractual.
- `medicamento_raw` conserva exactamente todo el valor hasta `;` o fin de
  segmento; los componentes internos pueden tener trim periférico para uso
  interno.
- Match completo → extraer `marca_comercial_explicit`; no se descompone la
  descripción restante.
- No match → `MEDICATION_SUBGRAMMAR_UNMATCHED`, raw conservado, sin propuesta
  de marca, sin rescate parcial.
- `principio_activo_raw` es un componente estructural/provenance-only del
  medicamento raw (adjudicación post-auditoría):
  - `target = NONE`;
  - no clinical hydration;
  - no proposal;
  - no comparison contra `commercial_name`;
  - no CIMA; no clasificación farmacológica; no diccionario; no regex
    farmacológica; no inferencia.
- `marca_comercial_raw` puede alimentar `commercial_name` únicamente cuando la
  subgramática contractual exacta autoriza el match.
- Por tanto `principio_activo_raw` y `commercial_name` no son dos valores
  rivales del mismo concepto y no producen un falso `CONFLICT` (ver regla D de
  D6).

### D11 — Ciclo de valores, protección y reparse (WO-E)

```text
source_value -> applied_value -> current_form_value
```

- `source_value`: lo que decía la fuente.
- `applied_value`: lo confirmado durante apply.
- `current_form_value`: valor actual editable del formulario.

Tras apply, los campos de solicitud siguen siendo editables. Editar
`current_form_value`:

- NO modifica `source_value`;
- NO modifica provenance;
- NO modifica el `applied_value` histórico de esa revisión;
- NO convierte el dato en tratamiento validado.

Reparse ≠ reapply. Cada ejecución tiene `parse_run_id` independiente dentro de
un `intake_review_id`. Si el mismo input se vuelve a interpretar y
`current_form_value` difiere del aplicado (edición manual tras apply):

```text
MANUALLY_EDITED_AFTER_APPLY + PROTECTED_EXISTING
```

- Nunca overwrite automático.
- Reaplicar requiere acción explícita `REAPPLY_IMPORTED`; la autorización
  previa no se hereda.
- Si `current_form_value` ya coincide con lo que se reaplicaría →
  `ALREADY_MATCHES_CURRENT`, sin reescritura.
- Una revisión completamente nueva empieza con estado transitorio nuevo y sin
  confirmaciones heredadas.

Estados de protección:

- Valor actual distinto → `PROTECTED_EXISTING`.
- Valor actual igual → `ALREADY_MATCHES_CURRENT`.
- `NO_VALUE`, `No informado`, `target = NONE` y unknown nunca limpian controles.

### D12 — Retención y privacidad (V0)

Durante la vida del intake review transitorio se conservan en memoria:

- `raw_input`;
- source fragments;
- parser_result;
- estructuras de reconciliación;
- provenance;
- decisiones profesionales del intake;
- `source_value` / `applied_value` mientras exista esa revisión.

NO se persisten esos artefactos de intake en: localStorage, sessionStorage,
URL, console/logs con contenido clínico, analytics, telemetry, CIMA, backend,
LLM ni servicios externos.

- Los errores pueden registrar únicamente códigos/estados seguros, nunca raw
  clínico.
- Cancel / close / restart del review / abandono → descartar el estado
  transitorio del intake.
- Tras apply, los valores hidratados pasan a ser valores normales del
  formulario y siguen únicamente el contrato de persistencia/draft existente;
  no se añaden raw/parser/provenance a la persistencia existente.
- La provenance longitudinal persistente queda OUT OF SCOPE V0 y debe
  adjudicarse antes de un futuro pilot-ready.
- Aclaración SES (post-auditoría): durante intake/reconciliation/confirmation,
  `ses_program_code` + `ses_program_label` participan del estado transitorio
  del review como provenance/review state; una vez confirmados y aplicados son
  valores NORMAL FORM del programa seleccionado (D1a), NO provenance, y siguen
  el contrato de persistencia/draft existente del formulario como cualquier
  otro valor hidratado.

### D13 — Ambigüedad y SEGMENTATION_BLOCKED proporcional

- Ambigüedad local de concepto → bloquea el concepto.
- `SEGMENTATION_BLOCKED` de una unidad/source → bloquea esa unidad/source.
- Solo bloquea TODA la importación cuando la ambigüedad impide separar de
  forma segura fuentes/unidades independientes, especialmente la partición de
  una entrada mixta.
- No se usa una regla global indiscriminada.

### D14 — Contratos multi-registro (adjudicados, futura extensión)

Conservar como FUTURE / OUT OF SCOPE V0, sin cambiar su significado:

- Source order.
- Coherencia de registro.
- Candidatos múltiples de PreSalud.
- Composición manual entre registros.
- Cross-record manual assembly.
- Composición cross-record.
- Gate acumulativo (relacionado).

V0: `multi_record_support = NOT_SUPPORTED_V0` (D9: los contratos de extensión
registro permanecen FUTURE / OUT OF SCOPE y el runtime bloquea de forma
determinista cualquier input multirregistro con `MULTI_RECORD_UNSUPPORTED_V0`).
No implementar estos contratos desde este spec. Los documentos de shaping
previos que declaraban `multi_record_support = NOT_YET_SPECIFIED` quedan
sustituidos en este punto por esta decisión cerrada.

### D15 — Ciclo completo del intake review

```text
parse -> reconcile -> preview -> professional confirmation -> apply
```

### D16 — Aplicación explícita por concepto y apply global seguro

INVARIANTE del spec (restaura y consolida la decisión ya presente en el plan de
implementación): las decisiones de aplicación son explícitas y POR CONCEPTO.

Para cada concepto:

```text
CURRENT_EMPTY + propuesta segura + confirmación profesional explícita
  -> apply autorizado

ALREADY_MATCHES_CURRENT -> no-op (sin reescritura)

PROTECTED_EXISTING      -> default keep; replace exige decisión explícita de
                           ese concepto

CONFLICT                -> sin ganador automático; resolución explícita

REQUIRES_SELECTION      -> no apply hasta selección explícita

NO_PROPOSAL             -> no write

missing / target = NONE -> no delete (nunca borra)

cancel                  -> zero mutation

validated               -> untouched
```

GLOBAL APPLY: puede existir un control tipo "Aplicar confirmados" si resulta
útil, pero SOLO puede ejecutar el subconjunto de conceptos que:

- ya tienen propuesta aplicable;
- ya han recibido la decisión/confirmación profesional exigida;
- no están `PROTECTED_EXISTING` sin replace explícito;
- no están `CONFLICT`;
- no están `REQUIRES_SELECTION`;
- no están `NO_PROPOSAL`.

Un global apply NUNCA puede convertirse en: bulk replace, first/last wins o
confirmación blanket de campos no revisados. Debe existir un fixture que
demuestre que un global apply aplica un concepto seguro y NO toca un
`PROTECTED_EXISTING` en la misma revisión.

### D17 — Contrato textual productor ↔ parser (serialización normativa)

Contrato determinista: UNA forma normativa por campo y etiquetas exactas. El
producer WO-A emite una única forma canónica (`D17_CANONICAL_PRODUCER`) con CIP
no vacío. El parser WO-C reconoce exactamente dos envelopes estructurales
explícitos: la forma canónica y `D17_CIPLESS_SOURCE`, idéntica salvo porque la
línea `• CIP:` está completamente ausente. Esta segunda forma existe solo para
el gate defensivo D5; WO-A nunca la emite. No existen otras variantes "o
equivalentes" ni recuperación fuzzy.

Etiquetas normativas e-Orden (bullet `• ` + separador `: ` obligatorios; su
presencia/ausencia queda definida, no implícita):

```text
SOLICITUD DERMATOLOGÍA → FARMACIA - <TÍTULO>
═══════════════════════════════════════════════════════
• CIP: <cip>
• Marca comercial solicitada: <valor>
• Dosis solicitada: <valor>
• Vía solicitada: <valor>            (p. ej. "Otra — <especificación>")
• Pauta: <valor>
• Inducción solicitada: SÍ           (o bien)
• Inducción solicitada: NO
• Justificación clínica: <valor>
PROGRAMA SES
• Código: <SES_PROGRAM_CODE>
• Denominación: <SES_PROGRAM_LABEL>
```

Reglas estructurales cerradas:

- `D17_CANONICAL_PRODUCER`: la línea CIP existe y `<cip>` es no vacío; WO-A
  bloquea export si falta.
- `D17_CIPLESS_SOURCE`: la línea CIP se omite por completo; WO-C puede reconocer
  el resto del envelope exacto y D5 mantiene la fuente `UNBOUND` hasta
  confirmación source-aware. Una línea CIP presente pero vacía NO equivale a
  esta variante.
- `Justificación clínica` y el bloque completo `PROGRAMA SES` son obligatorios
  en ambos envelopes. Ausencia/incompletitud → la unidad no puede terminar
  `RECOGNIZED` con propuestas clínicas.
- No se permiten líneas vacías internas entre campos/bloques.

Normalización de transporte PERMITIDA (solo transformaciones explícitas que no
cambian significado):

- CRLF y LF equivalentes;
- trim periférico del input completo;
- trailing whitespace de línea ignorado;
- Unicode NFC según la normalización común autorizada (solo comparación; el raw
  se conserva).

PROHIBIDO en el contrato parser:

- case folding de labels;
- accent folding (p. ej. `Via`/`Dias` NO reconocen `Vía`/`Días`);
- aliases de labels;
- eliminar/tolerar líneas vacías internas para fabricar una forma canónica;
- fuzzy; corrección de typos; semantic repair.

PRESALUD: se mantiene el contrato estricto V0 ya adjudicado (D9/D10):

```text
Estado → Medicamento → Vía → Dosis → Pauta → Días   (separador `;`)
```

Sin aliases de labels por defecto, sin accent-folding de `Vía`/`Días`, sin
heuristic recovery. Deben existir negative fixtures suficientes (alias de
label, falta de acento, orden alterado) para demostrar que el parser no deriva
hacia fuzzy parsing.

## Testing Decisions

### Seams

- **Seam 1 (única para la lógica pura de intake):** el pipeline de intake
  completo como función pura: `raw input -> structured intake result`, más los
  seams puros internos (detector/segmenter, DermaEOrdenParser, PreSaludParser).
  Estas funciones no tocan DOM; se prueban con fixtures sintéticos.
- **Seam 2 (integración UI):** browser QA sobre `farmacia_validacion.html`
  tras integración: pegar texto, ver preview, confirmar y aplicar.

Un buen test verifica comportamiento externo (qué conceptos se reconocen, qué
estados produce, qué se puede aplicar y qué queda bloqueado), no detalles de
implementación interna.

### Matriz determinista de tests (fixtures sintéticos)

WO-B — detector/segmenter:

- Raw PreSalud demostrado → una unidad PreSalud.
- e-Orden completa → una unidad e-Orden.
- e-Orden + PreSalud con partición estructural única → dos unidades.
- Orden inverso con partición única → dos unidades.
- Entrada mixta sin partición única → `SEGMENTATION_BLOCKED` (whole import).
- Dos e-Orden en un mismo input → `SEGMENTATION_BLOCKED` (no particionable).
- Unknown aislable junto a unidad segura → unknown fragment + unidad
  reconocida.
- Input vacío → resultado válido, cero propuestas.
- Input completamente desconocido → resultado válido, cero propuestas.

WO-C — DermaEOrdenParser:

- e-Orden completa válida (incluye Justificación clínica y todas las etiquetas
  obligatorias de `D17_CANONICAL_PRODUCER`).
- `D17_CIPLESS_SOURCE` exacta → conceptos seguros reconocibles, identidad
  `UNBOUND`; nunca inventa/selecciona paciente.
- Línea CIP presente pero vacía → NO se acepta como variante CIP-less.
- Falta `Justificación clínica` o falta el bloque `PROGRAMA SES` → la unidad NO
  termina `RECOGNIZED` con propuestas; raw preservado, fail-safe.
- Línea vacía interna entre campos/bloques → no es D17 canónica/CIP-less válida;
  no se elimina silenciosamente para reconocer.
- `PROGRAMA SES` válido: code+label coherentes con la allowlist (p. ej.
  `SES_HS` + `HIDRADENITIS SUPURATIVA`) → concepto `ses_program` completo
  (code + label juntos).
- Programa SES code desconocido → `SES_PROGRAM_CONTRIBUTION` inválida
  (target NONE, NO_PROPOSAL, blocking, motivo estructurado).
- Programa SES code fuera de allowlist (p. ej. `SES_UCE`, `SES_PRNO`) → mismo
  bloqueo determinista; sin mapping a programa soportado.
- Code conocido + label incompatible con el code declarado → mismo bloqueo.
- Par incompleto: code sin label; label sin code → mismo bloqueo.
- Unidad e-Orden con Programa SES inválido + unidad PreSalud independiente
  válida en el mismo input → e-Orden bloqueada; PreSalud conserva su lifecycle
  independiente.
- Vía `Otra — <especificación>` → raw/provenance preservados, target NONE,
  NO_PROPOSAL; la especificación NO se pierde y NO se hidrata
  `fhDermaVia = "Otra"`; el resto de conceptos seguros de la e-Orden no quedan
  bloqueados por este caso.
- Vía `Otra` sin especificación (producción bloqueada por WO-A; parser:
  fragmento no reconocido o error según contrato).
- Labels contractuales: acepta exactamente la serialización normativa de D17;
  alias de label, falta de acento o case distinto en labels NO reconocen
  (negative fixtures anti-fuzzy).
- `No informado` en dosis/vía → `NO_VALUE`.
- Inducción `SÍ` / `NO`.
- Sección clínica alterada → fragmento no reconocido con `target = NONE`.
- Texto desconocido dentro de la unidad e-Orden → preservado, sin propuesta.

WO-D — PreSaludParser:

- Raw demostrado válido → conceptos: marca (HYRIMOZ), vía, dosis, pauta, días
  raw; Estado vacío → `NO_VALUE`.
- Marca sin descripción restante → match.
- Marca sin espacios alrededor del grupo parentizado → match.
- Medicamento sin paréntesis → `MEDICATION_SUBGRAMMAR_UNMATCHED`, raw
  preservado, sin propuesta de marca.
- Marca vacía `()` → sin match.
- Segundo grupo parentizado → sin match.
- Séptimo valor/campo o duplicación posicional dentro del mismo registro →
  `UNRECOGNIZED`, raw preservado, zero proposals; WO-D V0 no fabrica
  `MULTIPLE_SOURCE_VALUES`.
- Prefijo no contractual dentro de `Medicamento`, incluso precedido por
  whitespace (p. ej. ` Medicamento: ...`) → `MEDICATION_SUBGRAMMAR_UNMATCHED`;
  ningún `trimStart()` puede convertir una etiqueta no normativa en medicamento
  válido.
- Pauta PreSalud arbitraria → `requested_schedule` preservada con `target = NONE`
  y `NO_PROPOSAL` en WO-D; el parser nunca la declara AUTO_PROPOSABLE por sí solo.
- Multi-record detectado de forma determinista → fixture explícito:
  ```text
  record 1: Vía = SC ; Dosis = 40 MG
  record 2: Vía = Oral ; Dosis = 80 MG
  ```
  Resultado V0: `MULTI_RECORD_UNSUPPORTED_V0` (raw preserved, preview raw);
  NO se presentan `SC`/`Oral` ni `40 MG`/`80 MG` como elecciones independientes
  aplicables; zero proposals; zero apply. No se compone ninguna combinación que
  no existió en la fuente.
- Negative fixtures anti-fuzzy del contrato textual (D17): alias de label,
  `Via`/`Dias` sin acento, orden de campos alterado → no reconocidos como
  gramática válida; raw conservado, cero propuestas.
- Unknown dentro de la unidad PreSalud → preservado.

WO-E — reconciliation/preview/apply:

- CIP exacto == paciente seleccionado → `VERIFIED_EXPLICIT_CIP`.
- CIP diferente/múltiple/ambiguo → `CONFLICT`, apply bloqueado.
- Sin paciente seleccionado → preview permitido, apply bloqueado (gate
  genérico, cualquier fuente).
- e-Orden SIN CIP + paciente seleccionado → `UNBOUND`; preview permitido;
  apply requiere confirmación SOURCE-AWARE explícita ("Asociar esta e-Orden
  sin CIP al paciente seleccionado") → `MANUALLY_CONFIRMED_SELECTED_PATIENT`.
- e-Orden SIN CIP + sin paciente seleccionado → preview únicamente; apply
  bloqueado.
- PreSalud sin CIP → `UNBOUND` hasta confirmación manual.
- Input mixto con e-Orden sin CIP + PreSalud → las dos confirmaciones son
  independientes: confirmar la e-Orden NO confirma PreSalud ni viceversa;
  cada fuente identifier-less requiere su propia asociación explícita.
- e-Orden válido + PreSalud → cada fuente con su propio gate; PreSalud NO
  asociado por el CIP de e-Orden.
- Programa SES válido: preview contiene `SES_HS` + `HIDRADENITIS SUPURATIVA`;
  apply escribe `Hidradenitis supurativa` en `fhDermaPatologia`; después de
  apply `ses_program_code = SES_HS` y `ses_program_label =
  HIDRADENITIS SUPURATIVA` siguen presentes como valores normales del
  formulario. El test FALLA si tras apply `SES_HS` desaparece y solo queda el
  string visible (D1a).
- Programa SES inválido (par desconocido/fuera de allowlist/incoherente/
  incompleto) → e-Orden no aplicable por ese motivo estructurado; unidades
  independientes del mismo paste no se bloquean automáticamente.
- e-Orden = PreSalud (marca HYRIMOZ) → `EQUIVALENT` / `CORROBORATED`.
- e-Orden HYRIMOZ vs PreSalud BENEPALI → `DIFFERENT` / `CONFLICT`, bloqueando
  solo `fhDermaFarmaco`.
- Marca vs principio activo → `NOT_COMPARABLE` por ESTRUCTURA (conceptos
  distintos: `principio_activo_raw` provenance-only vs `commercial_name`);
  sin clasificación farmacológica de strings; no conflicto.
- Vía `Otra — <especificación>` → visible en preview con especificación
  completa; `NO_PROPOSAL`; `fhDermaVia` NO se hidrata con "Otra"; el resto de
  conceptos seguros de la misma e-Orden sí se pueden aplicar.
- Valores no comparables múltiples → `REQUIRES_SELECTION`.
- Campo actual distinto del importado → `PROTECTED_EXISTING`.
- Campo actual igual → `ALREADY_MATCHES_CURRENT`.
- Global apply: con un concepto `AUTO_PROPOSABLE` confirmado y otro
  `PROTECTED_EXISTING` sin replace explícito en la misma revisión, el global
  apply aplica el primero y NO toca el `PROTECTED_EXISTING` (D16); nunca bulk
  replace ni confirmación blanket.
- Edición manual + reparse → `MANUALLY_EDITED_AFTER_APPLY` +
  `PROTECTED_EXISTING`.
- Reaplicar sin acción explícita → bloqueado; con `REAPPLY_IMPORTED` →
  permitido.
- Nueva revisión → sin confirmaciones heredadas.
- `No informado`, `NO_VALUE`, `target NONE`, unknown → nunca borran controles.
- Estado/Días PreSalud → `target NONE`.
- Pauta no representable → `OTRO` + texto completo en `fhDermaPautaOtro`
  (ej. `A LAS 9H - CADA 14 DIAS` conserva su significado).
- Parser error interno → `PARSER_ERROR`, raw preservado, app no rota.

Prior art en el repo: baterías `tools/farmacia_*_check.mjs`/`.js` (checks
deterministas sin DOM sobre lógica pura) y `tools/farmacia_*_browser_check.mjs`
(checks de browser sobre los HTML publicados). El pipeline nuevo seguirá ese
patrón: checks puros de fixtures + un browser check de integración en
`farmacia_validacion`.

### Browser QA requerido

- Pegar e-Orden completa → preview correcto → confirmar → aplicar a
  `fhDermaFarmaco`/`fhDermaDosis`/`fhDermaVia`/`fhDermaPauta`/`fhDermaInduccion`.
- Pegar PreSalud demostrado → preview → confirmación PreSalud → aplicar
  conceptos autorizados.
- Pegar mixto → preview con ambas fuentes → aplicar.
- Sin paciente seleccionado → apply inhabilitado.
- CIP conflictivo → apply bloqueado y aviso.
- Valor existente distinto → no sobrescritura silenciosa.
- Editar tras apply y re-pegar → no re-escritura automática.
- Recargar/abandonar → sin datos transitorios persistidos (verificar que no
  hay artefactos en localStorage/sessionStorage ni en el draft salvo los ya
  hidratados).
- SES Program caso normal → seleccionar/exportar programa de la allowlist →
  preview muestra code+label juntos → confirmar → aplicar.
- SES code persiste tras apply → tras aplicar, `ses_program_code` y
  `ses_program_label` siguen presentes como valores normales del formulario
  (no solo el string visible brownfield).
- SES par inválido → fallo seguro determinista: preview muestra raw + motivo
  estructurado; apply bloqueado; otras unidades/fuentes independientes del
  mismo paste siguen operativas.
- e-Orden sin CIP → asociación explícita source-aware; sin confirmación, sin
  apply.
- Input mixto → confirmaciones independientes por fuente (e-Orden y PreSalud
  se confirman por separado).
- PreSalud multi-record → bloqueado con `MULTI_RECORD_UNSUPPORTED_V0`; preview
  raw; cero propuestas; cero apply.
- Vía `Otra — <especificación>` → el texto de la especificación no se pierde
  en un plain "Otra"; preview conserva el valor completo; no se escribe
  `fhDermaVia`.
- Global apply con un campo protegido → el `PROTECTED_EXISTING` sobrevive
  intacto mientras el concepto seguro confirmado se aplica.

## Out of Scope

- Backend, persistencia V4, persistencia longitudinal de provenance.
- API PreSalud, integración automática con JARA.
- CIMA, inferencia clínica/farmacológica/temporal, motor de reconciliación
  inteligente, parser clínico probabilístico común.
- Soporte multi-registro PreSalud: `multi_record_support = NOT_SUPPORTED_V0`
  (D9: detección determinista → `MULTI_RECORD_UNSUPPORTED_V0`, zero proposals,
  apply bloqueado); contratos cross-record adjudicados son FUTURE / OUT OF
  SCOPE V0.
- Cronología inferida, renovación, alertas, switch, add-on.
- Tratamiento validado, resultado de validación, causalidad, línea terapéutica.
- "Servicio clínico compatible".
- V5 genérico multi-servicio.
- Refreeze de snapshot/package (WO posterior independiente).
- Detección automática de marca vs principio activo en el productor e-Orden.
- Crosswalk histórico del workbook SES (bloque `cod_centro`/`cod_programa`/
  `nom_programa`/`codigo_equivalente`/denominación equivalente): tabla de
  migración/reclasificación histórica de nomenclaturas locales. Queda
  completamente OUT OF SCOPE runtime para Unified Clinical Intake V0.
- Mappings de migración histórica como `XOLAIR -> SES_UCE`, `SATIVEX ->
  SES_EM`: NO son reglas clínicas y nunca permiten `medicamento -> programa`,
  `medicamento -> diagnóstico` ni `medicamento -> patología`. Los marcadores
  `CLASIFICAR` y `BORRAR` del workbook también quedan fuera de scope.
- `SES_UCE`, `SES_PRNO` y cualquier otro programa del catálogo SES fuera de la
  allowlist Dermatología V0.

## Further Notes

- La marca comercial pasa a ser la identidad primaria del medicamento en la
  e-Orden. El principio activo deja de ser campo de identidad del request.
- El detector/segmenter (WO-B) es una responsabilidad explícita; ningún parser
  puede quedar escondido dentro de "preview".
- WO-C y WO-D consumen unidades ya delimitadas por WO-B; no redescubren los
  límites de la entrada mixta.
- El spec no reabre decisiones cerradas de shaping; las adiciones
  post-auditoría (D1a supervivencia/estados inseguros, D5 e-Orden sin CIP,
  D6 matriz, D9 multi-record, D16 apply por concepto, D17 contrato textual)
  consolidan adjudicaciones de producto ya cerradas tras tres auditorías
  independientes.
- Antes de la implementación: WOs/issues atómicos aprobados (reconciliando
  #283 para WO-A); cada WO atómica debe reverificar repo, rama, HEAD, worktree,
  issue authority y blockers inmediatamente antes de su ejecución, partiendo de
  `recovery/farmacia-pr-replay-20260727` al SHA publicado vigente en ese
  momento (fotografía de autoridad en el spec:
  `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb`).
- Publicación pendiente: documento local listo para revisión independiente; no
  se ha creado issue ni PR. Tras el gate se podrá ejecutar `/to-tickets`.

## Artefacto fuente (SESProgram)

El diccionario unificado de PROGRAMAS SES fue proporcionado por Farmacia como
fuente interna para homogeneizar la nomenclatura de las Farmacias Hospitalarias
y permitir compartir, integrar y analizar información con Servicios Centrales.
El XLS original no se versiona automáticamente y sigue siendo fuente interna. No
se afirma ninguna fecha de vigencia distinta de la disponible en el propio
fichero. Si la implementación necesita un artefacto versionable, el futuro
artefacto DERIVADO mínimo deberá contener únicamente los programas necesarios
para el scope aprobado (o el catálogo canónico autorizado, según la WO
específica) con:

```text
ses_program_code
ses_program_label
source_name
source_version/date si es conocida
```

La anomalía del catálogo completo `SES_ XER` (espacio interno en el código) se
registra como anomalía de fuente, NO se corrige automáticamente y es irrelevante
para la allowlist Dermatología V0.
