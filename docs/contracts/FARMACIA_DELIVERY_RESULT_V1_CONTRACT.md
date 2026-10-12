# F4.5 — Farmacia DeliveryResult v1 · contrato documental reconciliado

**Fecha de ratificación funcional:** 2026-10-12, Q-1/Q-2/Q-3/Q-4 acordadas por la responsable.
**Estado:** `DECISIONES_FUNCIONALES_ACORDADAS`; `DTO_FIRMA_CODEC_PENDING`. La redacción aquí es **candidata contractual para revisión de #671**, no un contrato congelado ni publicado en la rama canónica.
**Procedencia:** borrador local de #671 revisado tras F2 (`370cdccdbbab9697c7d63332a19da76efdfb8c01`); matriz F4.4 ↔ Export V2 ↔ Bridge de WO #743 / PR #744 (OPEN al preflight); ADR-005/006 y alineamiento canónico PR #742.
**Ejecución:** solo especificación; ningún cambio de runtime, UI, datos, workbook, Processor o backend; #721 permanece abierto sin `status:approved`.
**Trazabilidad de WO:** [WO de reconciliación documental](../ops/WO_NEXUS_F45_Q1_Q4_DECISION_RECONCILIATION_20261012.md).

**Regla de lectura:** las cuatro decisiones funcionales de esta revisión sustituyen las secciones «PREGUNTAS ABIERTAS» del borrador F2, **pero no autorizan por sí mismas la firma, los tokens, el codec, un nuevo adaptador ni la persistencia**.

## Frontera del contrato y decisiones cerradas

Un caso de uso de Farmacia produce un Pharmacy Act v1 conforme a F4.4. F4.5 es una **frontera de entrega compartida**, independiente del acto y del destino físico; expresa qué representación se preparó, con qué garantía, para qué operación y con qué evidencia. No propone `commit(event)` público.

| Decisión | Acordado funcionalmente | No queda decidido |
|---|---|---|
| **Q-1 · Representación** | Dos modalidades distinguibles: proyección tabular Export V2 (garantía V2 **sin** integridad F4.4) y portador autocontenido e íntegro del Pharmacy Act (garantía lossless F4.4). Comparten frontera y vocabulario operativo con garantías diferentes. | Tokens, DTO definitivo, mapeo Act→V2, serializador/codec reversible L2, almacenamiento físico |
| **Q-2 · Intentos** | La capa de aplicación genera `attemptId` antes de invocar el adaptador. Reintento técnico **de la misma operación** conserva el ID; una nueva operación independiente crea ID nuevo. Idempotencia solo si el destino la demuestra. | Formato definitivo (UUID v4 es opción, no obligación), persistencia de intentos y capacidad concreta por adaptador |
| **Q-3 · Destino** | Separar destino **lógico explícito** de localización **física** resuelta por configuración/adaptador autorizado. Manual: la profesional decide libro/hoja, y F4.5 no conoce el lugar de pegado. Sin routing inferido desde terapia, patología o datos ausentes. | Descriptor técnico exacto, configuración y routing físico del issue #577 |
| **Q-4 · Procedencia** | Conformidad estructural ≠ autoría declarada ≠ identidad autenticada. Demo/evaluación **sintética** admite autoría declarada, no firma ni autenticación inventadas. Piloto/escritura institucional precisan garantías del entorno. | Política de autenticación/autorización SES, mecanismo de acreditación del origen si se exige |

Anclas: `modules/farmacia_act_contract.js` y `modules/farmacia_act_payloads.js`, [ADR-005](../architecture/adr/ADR-005-clinical-write-contracts.md), [ADR-006](../architecture/adr/ADR-006-persistence-adapters-and-excel.md), [matriz de equivalencia](../architecture/reviews/FARMACIA_F44_EXPORT_V2_BRIDGE_EQUIVALENCE_20261012.md). Ninguna fila tabular, catálogo, historial o nombre de fármaco permite inferir dosis, vía, pauta, duración, validación, renovación, cambio ni dispensación.

**Madurez independiente:** F4.4 publicado como contrato puro; copia demo Export V2 de 152 columnas publicada y visible en Validación, Primera Visita y Seguimiento; **no está demostrado el wiring Act F4.4→F4.5→Export V2**. El Processor de Bridge conocido es un candidato histórico de ingesta, sin QA Excel real, y no un lector de vuelta L1. L2 no está resuelto. Ningún resultado de este documento acredita piloto o registro en JARA.

## DTO y firmas candidatos — no congelados

La siguiente es una **forma ilustrativa revisada** del borrador #671. Los nombres de discriminantes y enums son candidatos y requieren revisión/autorización contractual; no son una API ya publicada:

```text
prepareManualExcelTransfer(request) -> DeliveryResult   [FIRMA PROPUESTA]

request:
  contractVersion   : 'pharmacy-delivery-result/v1' [token propuesto]
  act               : Pharmacy Act v1 completo, F4.4, ok:true
  representationKind: 'export_v2_tabular' | 'pharmacy_act_full' [tokens propuestos]
  transferMode      : 'manual_copy' | 'manual_download' [canal, ortogonal a representación]
  attemptId         : identificador explícito de la operación lógica (creado upstream)
  destination       : referencia de destino lógico, explícita y compatible

DeliveryResult de preparación manual válida:
  ok                      : true
  contractVersion         : versión propia de F4.5
  deliveryStatus          : 'prepared_for_transfer'
  actId, revision, kind   : referencias verbatim al acto, NO fuente alternativa
  attemptId               : verbatim, nunca generado por el adaptador
  representationKind      : modalidad efectivamente producida
  representationGuarantee : 'export_v2_projection_valid' | 'pharmacy_act_lossless'
                            [etiquetas candidatas, garantías NO intercambiables]
  transferMode            : canal efectivamente utilizado
  destination             : destino lógico, persistence:'none', físico no acreditado
  evidence                : prueba local de la REPRESENTACIÓN preparada, external:null
  artifact                : descriptor + contenido realmente transferible y conforme

Fallo previo a entrega:
  ok:false, error:{code,message,details?}, attemptId si válido
  SIN deliveryStatus positivo, SIN artifact parcial
```

**Q-1 — condición de aceptación diferenciada:**

- **`export_v2_tabular`:** el artefacto debe cumplir esquema, filas, cardinalidad y reglas de Export V2. **No** exige ni declara roundtrip del Pharmacy Act íntegro. El posible origen F4.4 no autoriza inventar un mapeo de sus bloques opacos a columnas, ni equiparar `actId` con `event_id`/`source_event_id`. Si el adaptador no dispone de una proyección autorizada para ese acto, **fallo seguro**. La copia V2 actualmente visible no se renombra retroactivamente como F4.5.
- **`pharmacy_act_full`:** el artefacto ha de transportar por sí solo el acto completo —identidad, revisión, autor/procedencia, bloques opacos, cardinalidad y orden 0/1/N, distinción propiedad ausente / own `undefined` / `null` / `''` / `0` / `false`— y poder reconstituirlo sin datos del entorno ni del `DeliveryResult`. **Sin codec reversible aprobado y verificado, esta modalidad NO puede devolver éxito**. No se elige aquí JSON convencional, columnas adicionales, hoja ni repositorio paralelo.
- `transferMode` es **canal de entrega**, no modalidad de representación. `manual_copy`/`manual_download` pueden preparar artefactos válidos según sus capacidades reales; la compatibilidad cruzada no se presupone.
- El conjunto de claves cerrado, la validación mínima, los tokens exactos y los nombres de códigos de error siguen sujetos a cierre de DTO. Un modo no soportado, estructura imposible, destino lógico incompatible o representación no producible falla cerrado; no existe «éxito parcial» clínicamente aceptable.

**Precondición F4.4 y límite de origen (Q-4):** el caso de uso llamador es responsable de construir el acto con F4.4 y transportar su salida válida. El adaptador puede comprobar versión, `ok:true`, `kind`, identidad y presencia de `payload.lines`, pero **un objeto que parece F4.4 no demuestra por sí mismo haber sido construido allí**. `authorRef` y `attributionAssurance` preservan una atribución **declarada**, sin convertirla en profesional autenticado. No añadir firma, token de autoridad, marca de origen verificable ni autorización implícita para paciente real.

**Errores tipados del borrador F2:** `INVALID_REQUEST`, `INVALID_ACT_CONTRACT_VERSION`, `INVALID_ACT_KIND`, `INVALID_CONTRACT_VERSION`, `INVALID_ACT_INPUT`, `INVALID_TRANSFER_MODE`, `INVALID_ATTEMPT_ID`, `ARTIFACT_PREPARATION_FAILED` y `UNSUPPORTED_STRUCTURE`. Las condiciones nuevas (representación no soportada, proyección no definida, carrier íntegro indisponible, destino no resoluble) **deben recibir códigos cerrados en el cierre técnico del DTO**; no se afirman aquí enums definitivos ni runtime implementado. El fallo no equivale al estado `rejected` de una autoridad de destino.

## Garantía de contenido e identidad según modalidad

El `DeliveryResult` identifica la **operación de entrega**; ni sus referencias ni las filas de Export V2 sustituyen al origen clínico.

- En el modo **íntegro**, el portador debe conservar literalmente todas las propiedades y valores representables por F4.4: `ok`, `contractVersion`, `actId`, `revision`, `kind`, `siteId`, `patientRef`, `occurredAt`, `authoredAt`, `authorRef`, `attributionAssurance`, `provenance`, `payload` completo con `payload.lines` explícitas y `amendment` cuando exista. La semántica own-property distingue ausente de presente-`undefined`; no se permite colapso silencioso mediante JSON/TSV estándar. Una transformación de pérdida obliga a fallar, no a prometer integridad.
- En el modo **tabular**, se conserva **solo lo que el contrato Export V2 representa y valida**. Sus identificadores de filas/evento no son automáticamente los identificadores F4.4. Una Validación V2 utiliza una fila y no garantiza todas las líneas F4.4; Primera Visita/Seguimiento V2 requieren líneas explícitas (1..N) y no representan generalmente `lines:[]`. Un acto F4.4 con 0 líneas no se «arregla» inventando una. Se declara la cobertura real y se rechazan estructuras no representables.
- Ni una proyección V2 ni una reconstrucción lógica L1 desde Bridge equivalen por ello al portador íntegro L2. Nunca se reconstituyen campos faltantes desde catálogo, tratamientos previos, otra visita o el nombre del medicamento.
- `actId`/`revision` conservan identidad/revisión del acto; `attemptId` identifica la operación, no una fila. Las revisiones explícitas preservan `amendment` en modalidad íntegra; si la proyección no permite representarlo, no declara preservación.

## Estados del resultado y autoridad por estado

Vocabulario conceptual de ADR-005. **Cada adapter soporta exclusivamente resultados para los que posee garantías acreditadas**; ningún adapter emite un estado cuyas garantías no pueda acreditar.

| Estado | Significado conceptual (ADR-005) | Autoridad que exige | ¿Alcanzable en modo manual copy/download? |
|---|---|---|---|
| `prepared_for_transfer` | Artefacto válido preparado para transferencia humana | Validez local del artefacto en el punto de entrega al usuario; cero side effects institucionales | **SÍ — único éxito acreditable** |
| `persisted` | El acto quedó persistido en un destino duradero | Destino concreto + garantía declarada + evidencia verificable (p. ej. close + relectura/validación, confirmación de guardado duradero) | NO |
| `already_recorded` | El destino ya contiene el mismo acto (`actId`/`revision`) | Autoridad de deduplicación del destino con evidencia verificable | NO |
| `conflict` | El estado del destino contradice el acto (concurrencia, reversión) | Observación verificable del estado del destino | NO |
| `rejected` | Una autoridad del destino evaluó y rechazó el acto | Autoridad institucional con resultado observable | NO |
| `outcome_unknown` | Se inició una entrega cuyo resultado no pudo verificarse | Intento de entrega iniciado hacia un destino con side effects | NO (nunca se sintetiza como comodín) |

`persisted` exige destino + garantía + evidencia verificable y **NO se implementa en este issue**: File System Access, Bridge/API hospitalaria y cualquier otro destino con persistencia son decisiones futuras independientes (#721). `persisted in Bridge` ≠ `registrado oficialmente en SES` (ADR-006).

## Modo manual copy/download y evidencia honesta

El modo manual acredita **únicamente preparación local de la representación concreta**, no transferencia completada a un destino externo ni persistencia:

1. El llamador proporciona acto F4.4 explícito, `attemptId` y destino lógico; F4.5 aplica sus barreras estructurales y de capacidad sin reinterpretar hechos clínicos.
2. El adaptador elegido demuestra que produce y valida el **artefacto de la modalidad requerida**. Si no hay mapping aprobado Act→Export V2, o falta un codec íntegro lossless, no entrega un resultado positivo de esa modalidad.
3. Solo cuando el artefacto está realmente disponible devuelve `prepared_for_transfer`, modalidad, garantía proporcional y evidencia local (`external:null`). De lo contrario, error tipado y ningún artefacto parcial.

Abrir Excel, copiar TSV, descargar, pegar, reimportar o acabar un Office Script **no demuestra persistencia del acto**, duplicación evitada ni registro clínico SES/JARA. En Bridge, `persisted` exige incorporación del **acto completo** y evidencia verificable de escritura duradera, no solo normalizar filas L0/L1. El eventual backend establece sus propias garantías y capacidades. `prepared_for_transfer` no se escala retrospectivamente a `persisted`.

Correcciones de un acto exigen una nueva revisión explícita; ninguna modalidad ejecuta una edición clínica silenciosa, promoción solicitado→validado ni inferencia de dispensación.

## Estados que el modo manual NO puede producir

| Estado | Por qué el modo manual no puede producirlo |
|---|---|
| `persisted` | No hay destino duradero con garantía declarada ni evidencia verificable; portapapeles y fichero descargado no acreditan persistencia (ADR-006). |
| `already_recorded` | No hay autoridad de deduplicación que observe el destino; repetir la preparación manual no demuestra nada sobre el destino (ver O-08). |
| `conflict` | No se observa ningún estado de destino; no hay concurrencia ni reversión observable. |
| `rejected` | No interviene ninguna autoridad institucional que evalúe y rechace el acto. |
| `outcome_unknown` | El modo manual no inicia ninguna entrega institucional; no existe intento cuyo resultado pueda quedar sin verificar. El estado jamás se usa como comodín para "no sé qué pasó". |

Un fallo seguro del modo manual (entrada inválida, preparación fallida) tampoco es un estado de entrega: es `ok: false` con error tipado.

## Q-2 — Identidad del intento, reintento e idempotencia

**Acordado:** `attemptId` lo genera el **caso de uso / capa de aplicación** antes de invocar F4.5. El adaptador nunca lo deriva de `actId`, `revision`, fármaco, hora ni datos clínicos; lo recibe y lo devuelve verbatim. El formato técnico exacto **no está congelado** (UUID v4 aleatorio seguro es una opción, no una decisión).

- **Nueva orden lógica de entrega:** nuevo `attemptId`, incluso para el mismo `actId`/`revision`. No significa un nuevo acto clínico.
- **Reintento técnico de la misma orden** tras fallo transitorio verificable: reutiliza `attemptId`, identidad/revisión/representación/destino lógico. Solo se ejecuta automáticamente si el destino ofrece garantías adecuadas; no se presume idempotencia por el mero ID.
- **`outcome_unknown` en un destino con efectos:** no se convierte en «fallido», ni se repite a ciegas una escritura. Requiere reconciliación/consulta al destino o intervención humana según capability antes de una nueva operación potencialmente duplicada.
- **Manual:** la app no sabe si hubo pegado externo ni dispone de deduplicación institucional. Repetir voluntariamente la copia es una **nueva operación**, con ID nuevo; reintentar una preparación técnica interrumpida, **si sigue siendo la misma orden lógica**, puede usar el ID anterior. Nada de ello permite `already_recorded`.
- **Cambio clínico:** nueva `revision` y `amendment` explícitos desde el dominio, no fabricados en F4.5; entrega posterior con nuevo `attemptId`.

No se exige almacenamiento duradero de intentos ni recuperación al reiniciar la app dentro de esta especificación. Si el destino necesita persistir claves de idempotencia, forma parte de su diseño/cualificación posterior.

## Q-1 / Q-3 / Q-4 — límites y decisiones pendientes de ingeniería

**Q-1 · Export V2 no es el Pharmacy Act íntegro.** El core publicado de 152 columnas y sus adaptadores son proyecciones por caso de uso. El flujo público posee botones demo paralelos para Validación, Primera Visita y Seguimiento; la afirmación antigua del borrador de que el export público solo tenía 61 columnas y v2 no estaba cableado **era histórica y ha quedado superada**. Sí permanece el gap de integración **F4.4→F4.5→V2** y no hay mapping clínico completo Act→fila aprobado. `event_id`/`source_event_id` y `row_count` describen filas de exportación, no equivalencia automática con `actId`. El portador lossless L2, su codec y su almacenamiento/formato son **pendientes**, no una solución que impongamos a Excel manual.

**Q-3 · `destination` lógico frente a físico.** En manual, describir la capacidad de exportación y su carácter `persistence:none` sin fingir conocer fichero/hoja de pegado; los elige la profesional. En un Bridge automatizado, la configuración autorizada del despliegue/adaptador resolverá destino físico; si falta o es ambiguo, **fail-closed**. No usar nombre de patología/fármaco o ausencia para decidir ruta. El contrato no resuelve el discovery #577 ni impone hojas adicionales. `destination.kind` y otros campos exactos continúan pendientes de DTO.

**Q-4 · Autoría declarada y procedencia.** Se conserva `authorRef`, `attributionAssurance` y `provenance` que aporta F4.4. Conformidad F4.4 no prueba origen criptográfico del objeto, autoría real ni habilitación del profesional. Para demo/evaluación sintética basta atribución **declarada y rotulada**; no utilizar `SIGNED`, `AUTHENTICATED` o equivalentes sin evidencia externa. Para piloto o escritura hospitalaria se exigen los controles/autorizaciones SES que correspondan; si el destino los requiere y no existen, la operación falla segura. PROMueve complementa JARA; no registra por sí una prescripción legal o un acto firmado.

**Pendientes técnicos explícitos, que NO reabren Q-1..Q-4 funcionales:**

1. Firma y tokens definitivos de DTO, discriminantes de modalidad/garantía, esquema de `destination` y códigos de error nuevos.
2. Proyector autorizado desde Pharmacy Act a Export V2 cuando se necesite, con casos de cardinalidad cero/uno/múltiples y mapping clínico explícito; **no** tocar ahora los botones V2 existentes.
3. Portador F4.4 íntegro y codec reversibles con evidencia de centinelas y prototipos admitidos; **no** imponer JSON/SQL/hoja paralela.
4. Política de capacidad por adaptador, retry/idempotencia y observación duradera de `persisted` antes de futuros destinos.
5. Identidad/autenticación institucional, control de acceso y trazabilidad para piloto real; sin datos reales en pruebas.

La coexistencia por centro entre Excel manual, Bridge, Power Automate y API/SQL no exige migración lineal ni almacenamiento paralelo universal.

## Oráculos DOCUMENTALES de aceptación

Todos los datos son sintéticos/demo: identificadores inventados, etiquetas clínicamente neutras, sin pacientes reales, credenciales ni endpoints hospitalarios. Los bloques del payload son opacos; el contenido hoja mostrado es puramente demostrativo y no define taxonomía clínica. Solicitado ≠ validado; la ausencia permanece ausencia. Estos oráculos son criterios de revisión documental, **no tests ejecutados**. Los positivos de O-01..O-03 se entienden condicionados a que exista el artefacto válido de la modalidad solicitada: no se presume un codec lossless ni un Act→V2 mapper inexistentes. El DTO/tokens están pendientes de freeze.

### O-01 — Acto de Validación (ausencia preservada, una línea)

```json
{
  "ok": true,
  "contractVersion": "pharmacy-act/v1",
  "actId": "DEMO-ACT-VAL-0001",
  "revision": 1,
  "kind": "pharmacy_validation",
  "siteId": "DEMO-SITE-01",
  "patientRef": "DEMO-PAC-0001",
  "occurredAt": "2026-10-12T09:30:00Z",
  "authoredAt": "2026-10-12T09:45:00Z",
  "authorRef": "DEMO-FARM-001",
  "attributionAssurance": "DEMO-ATTRIBUTION-DECLARED",
  "provenance": { "source": "demo-capture-form" },
  "payload": {
    "request": { "requestedDrugName": "DEMO-FAB-L", "requestedDoseText": "" },
    "lines": [ { "lineRef": "DEMO-LINE-0001", "demoNote": null } ]
  }
}
```

Oráculo: el bloque `validation` está AUSENTE (no se infiere validación desde la solicitud ni desde el nombre del fármaco demo). `requestedDoseText` es `''` (string vacío presente), `demoNote` es `null` (null explícito) y la clave de justificación simplemente no existe: **En modalidad íntegra**, los tres centinelas deben llegar al artefacto sin colapsar; **en V2 tabular no se promete conservarlos si no están representados**, sino únicamente validar la proyección autorizada. Resultado admisible **solo con representación realmente válida**: `prepared_for_transfer`, referencias verbatim, modalidad, garantía local proporcional y `evidence.external:null`. Si no existe adaptador/codec apropiado, fallo seguro; la solicitud no se convierte en validación.

### O-02 — Acto de Primera Visita (bloque obligatorio, opcional ausente, una línea)

```json
{
  "ok": true,
  "contractVersion": "pharmacy-act/v1",
  "actId": "DEMO-ACT-PV-0002",
  "revision": 1,
  "kind": "pharmacy_first_visit",
  "siteId": "DEMO-SITE-01",
  "patientRef": "DEMO-PAC-0002",
  "occurredAt": "2026-10-12T10:15:00Z",
  "authoredAt": "2026-10-12T10:40:00Z",
  "authorRef": "DEMO-FARM-002",
  "attributionAssurance": "DEMO-ATTRIBUTION-DECLARED",
  "provenance": { "source": "demo-capture-form" },
  "payload": {
    "firstVisit": { "demoStratification": "DEMO-LEVEL-A" },
    "lines": [ { "lineRef": "DEMO-LINE-0002" } ]
  }
}
```

Oráculo: `firstVisit` presente, `transversal` ausente (clave inexistente, nunca placeholder); la línea no se promueve desde solicitud ni tratamiento previo. Para modalidad íntegra, la ausencia de `transversal` se conserva; si no hay portador lossless, no hay éxito. Para tabular, solo se acredita la proyección V2 válida y no la preservación de esa ausencia.

### O-03 — Acto de Seguimiento (multi-línea, revision/amendment)

```json
{
  "ok": true,
  "contractVersion": "pharmacy-act/v1",
  "actId": "DEMO-ACT-FU-0003",
  "revision": 2,
  "kind": "pharmacy_followup",
  "siteId": "DEMO-SITE-01",
  "patientRef": "DEMO-PAC-0003",
  "occurredAt": "2026-10-12T11:00:00Z",
  "authoredAt": "2026-10-12T11:20:00Z",
  "authorRef": "DEMO-FARM-001",
  "attributionAssurance": "DEMO-ATTRIBUTION-DECLARED",
  "provenance": { "source": "demo-capture-form" },
  "amendment": { "previousRevision": 1, "reason": "DEMO- corrección documental de la revisión 1" },
  "payload": {
    "followup": { "demoVisitNote": "DEMO-nota-sintética" },
    "lines": [
      { "lineRef": "DEMO-LINE-0003A", "demoDispensationStatus": "DEMO-DISPENSED" },
      { "lineRef": "DEMO-LINE-0003B", "demoDispensationStatus": "DEMO-NOT-DISPENSED", "demoReview": null }
    ]
  }
}
```

Oráculo: 2 líneas explícitas llegan como 2 (orden y cardinalidad verbatim); `revision: 2` con `amendment` íntegro se transporta sin sobreescritura silenciosa de la revisión 1; la línea B conserva `demoReview: null` distinto de ausente. En modo íntegro debe conservar ambas líneas y el `amendment`; en tabular la garantía se limita a las filas V2 explícitas admitidas por el adaptador. Cualquier éxito es condicional a artefacto válido; no se altera la revisión previa.

### O-04 — Versión de contrato desconocida

Acto artesanal con `contractVersion: "pharmacy-act/v2"`: la entrega falla cerrada con `INVALID_ACT_CONTRACT_VERSION`, sin artefacto y sin estado. Nunca se normaliza la versión ni se "asume v1".

### O-05 — kind desconocido

Acto con `kind: "pharmacy_annual_review"`: la entrega falla cerrada con `INVALID_ACT_KIND`, sin alias, sin normalización y sin encadenamiento hacia los tres casos de uso soportados.

### O-06 — Entrada que no alcanza la barrera mínima de identidad

Cualquier entrada que no alcance la barrera mínima de identidad contractual visible descrita en "Precondición del llamador" (p. ej. el resultado `{ ok: false, error }` de un builder, una envelope cruda, `payload` suelto o un objeto sin `contractVersion: 'pharmacy-act/v1'` con `ok: true` y `kind` conocido): falla cerrada con `INVALID_ACT_INPUT`. La entrega nunca ensambla actos parciales.

Límite documentado: este oráculo NO acredita que el acto proceda realmente de `createAct` (contrato #488). `createAct` devuelve un objeto ordinario mutable sin marcador verificable de origen; un objeto artesanal que imite la forma externa de un acto alcanzaría la barrera mínima. La autenticidad estructural del acto es precondición del llamador y responsabilidad del productor F4.4 upstream, no capacidad de verificación de este adaptador (ver PREGUNTA ABIERTA Q-4).

### O-07 — Modo de transferencia desconocido

`transferMode: "auto_bridge"`: falla cerrada con `INVALID_TRANSFER_MODE`. Bridge y File System Access no existen en esta versión del contrato.

### O-08 — Repetición de preparación manual

El mismo acto (O-01) se prepara dos veces con `attemptId: "DEMO-ATT-001"` y `"DEMO-ATT-002"`: dos resultados `prepared_for_transfer` independientes, misma identidad `actId`/`revision`, `attemptId` distintos. **Ninguno es ni implica `already_recorded`**; no hay deduplicación posible sin autoridad de destino.

### O-09 — Interrupción de preparación

La preparación falla a mitad (p. ej. estructura no soportada): `ok:false` con error tipado, sin artefacto parcial ni estado de entrega. **Un reintento técnico de la misma operación lógica conserva `attemptId`**; una orden nueva genera ID nuevo. Ningún side effect institucional se infiere.

### O-10 — Intento de conversión a persistencia

Cualquier camino que pretenda interpretar la evidencia externa posterior (Excel abierto, portapapeles observado, fichero descargado presente, reimportación exitosa) como `persisted` es una **violación de contrato**: el modo manual no dispone de ninguna operación que emita `persisted`, `already_recorded`, `conflict`, `rejected` ni `outcome_unknown` (tabla de estados no producibles).

### O-11 — Preservación de propiedad presente con `undefined`

Considerar dos actos F4.4 sintéticos, equivalentes excepto por una propiedad propia dentro de un bloque opaco de `payload`:

- Caso A: la propiedad no existe.
- Caso B: la propiedad existe como propiedad propia con valor `undefined`.

Ambos casos son distintos para F4.4. **El artefacto de modalidad íntegra** deberá conservar esa diferencia de forma verificable, además de distinguir `null`, `''`, `0` y `false`. La modalidad tabular V2 no adquiere esa garantía por proyectar filas.

Si el mecanismo de la **modalidad íntegra** elimina silenciosamente la propiedad del caso B y lo convierte en el caso A, no es fiel a F4.4 y la preparación íntegra debe fallar sin estado positivo. Esto no convierte en inválida una proyección V2 que declare honestamente su garantía limitada.

Este es un oráculo documental pendiente de un mecanismo aprobado en Q-1. No se implementa ni se selecciona ahora una codificación.

### O-12 — Proyección V2 legítima ≠ acto íntegro

Dadas filas Export V2 válidas y una proyección autorizada, `prepared_for_transfer` puede reflejar **solo** `export_v2_projection_valid`. No declara preservar `revision`, `provenance`, `amendment` ni centinelas opacos que la tabla no representa. Si falta mapping Act→V2 requerido, fallo seguro.

### O-13 — Cardinalidad y ausencia no representable

Un Pharmacy Act de Primera Visita o Seguimiento con `payload.lines:[]` es conforme a F4.4, pero los adaptadores V2 actuales no admiten ese caso. La modalidad tabular rechaza la proyección; **no** inventa línea, tratamiento ni dispensación. La modalidad íntegra debe preservarlo cuando disponga de codec reversible.

### O-14 — Intento técnico frente a nueva orden

`actId:DEMO-ACT-01`, `revision:1`, `attemptId:DEMO-ATT-01`: dos invocaciones por retry técnico **de la misma orden** conservan ese ID. Una nueva orden humana sobre el mismo acto usa `DEMO-ATT-02`. No se emite `already_recorded` sin capacidad verificable del destino.

### O-15 — Resultado incierto y duplicación

Si un adaptador con escritura informa `outcome_unknown`, está prohibido repetir automáticamente una escritura no idempotente, cambiar `attemptId` para disimular la incertidumbre o afirmar `persisted`. Requiere consulta/reconciliación según capability.

### O-16 — Destino manual y destino automatizado

Exportación manual: `destination` no contiene libro/hoja inventados y la profesional realiza el pegado bajo su responsabilidad. Destino automático sin routing explícito autorizado: error tipado sin escritura, nunca selección por medicamento, patología o `patientRef`.

### O-17 — Autoría declarada ≠ identidad autenticada

Un `authorRef` sintético con `attributionAssurance` declarada puede viajar en demo. No implica firma, acceso autorizado a datos reales ni registro SES/JARA. Un destino que exija credencial institucional y no pueda validarla falla seguro.

### O-18 — Garantías de persistencia no intercambiables

Copiar TSV, descargar fichero, reimportar filas o terminar el Processor no acredita por sí solo `persisted`. Para Bridge se exigiría además persistencia verificable del acto completo; si solo existen filas L0/L1, no prometer L2. `prepared_for_transfer` mantiene su semántica limitada.

## Separación de WOs y límite de ejecución

- **Esta WO documental:** consolidar decisiones Q-1..Q-4 y reconciliar el borrador F2 de #671, con accesos desde índice, status y matriz, **sin alterar runtime**.
- **#671 — contrato:** revisión final del DTO/firma/oráculos; solo se considerará aceptado/congelado tras autoridad y publicación específica. No hereda autorización de push/PR/merge de #743.
- **#721 — implementación:** bloqueada por #671 y sin `status:approved`. Antes de ejecutar, subdividir si mezcla caso de uso, proyector V2, adapter manual, portador L2 o persistencia.
- **Bridge / #236 y routing / #577:** decisiones y WOs separadas. Processor histórico no sustituye lector relacional de retorno ni resuelve persistencia L2.
- **Pilotaje:** autenticación y autorizaciones institucionales, ensayo Excel real y QA de navegador explícito fuera de este trabajo.

## Verificación documental y criterio de cierre

El borrador inicial #671 tuvo revisión Cora F2 positiva sobre las correcciones `payload.lines`/autocontención/centinelas; **esa revisión no cubre automáticamente esta reconciliación**. Verificar enlace y coherencia con ADR-005/006, matriz #744, código F4.4 y adaptadores v2. QA documental focal: `git diff --check`, 18 oráculos y contradicciones (Q-1..Q-4), enlaces internos, acotación de rutas, flags correctos; no tests runtime obligatorios al no cambiar runtime. **No se declara QA de navegador ni Office Script real.**

Hasta una aprobación y publicación de #671, esto sigue siendo `CONTRACT_PENDING`, con **las cuatro decisiones funcionales acordadas**. No supone aceptación del DTO, de los tokens del ejemplo, del codec, de ninguna persistencia o del issue #721.
