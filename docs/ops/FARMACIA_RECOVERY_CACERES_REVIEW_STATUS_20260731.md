# Estado actual — Farmacia recovery, Cáceres 0.3 y evolución regional

> **Reconciliación post-PR #246 (2026-08-05).** El HEAD regional publicado es `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6`. PR #246 integra WO8A-2A-2 (`MERGED_AND_VERIFIED`) sobre PR #238/#242: `Cargar Excel de Farmacia` → búsqueda por `identifier_system + identifier_value` → Quick View Bridge → `Abrir dashboard Bridge` → ventana hija same-origin → READY → payload one-shot → dashboard Bridge de solo lectura. El dashboard está cableado, visible y demostrado mediante interacción soportada; recibe solo `search_context` y la proyección Quick View, no el workbook ni el read model completos. El protocolo verifica `origin`, `source`, nonce y versión, espera READY y aplica un TTL único de 45 segundos; la URL contiene solo el nonce técnico. Varias ventanas permanecen aisladas, y recarga o acceso directo fallan cerrado sin paciente demo. No hay datos Bridge en browser storage. El renderer Bridge está separado del dashboard legacy, no adapta a paciente plano, no interpreta PROMs/adherencia ni infiere causalidad, tratamiento o datos clínicos. Validación, Primera Visita, Seguimiento, exportaciones, Estadísticas y Actividad no están conectados al Bridge. Evidencia final: handoff 37, selector 82, reader 21, smoke 48 y dashboard legacy 37 PASS; Actions SUCCESS; QA navegador, padding E2E, dos ventanas, popup bloqueado, fail-closed, Farmacia legacy y Enfermería PASS; storage vacío, consola limpia, `pageerror = 0`; revisión independiente y final APTO; fingerprint `651291d5094ef402ae0f16578f6a213add6e4d4fc5372f40d9763c615dfa83fb`. El snapshot Cáceres no incorpora automáticamente PR #246.

| Metadato | Valor |
|---|---|
| Fecha de reconciliación | 2026-08-05 |
| Estado documental | `current_published_evaluation_state` |
| Repositorio | `b32majus/Hub-Clinico-Badajoz` |
| Rama regional publicada | `recovery/farmacia-pr-replay-20260727` |
| HEAD regional publicado verificado | `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6` |
| Activación funcional Export v2 demo | `fe84d83c7d3574840696c9fed70f98e581ec8916` |
| Retirada ledger runtime | `b1ee11e00affa39c4a91626bb03f493fbcdce7d9` / merge `19867ef16127548d0b596482360d8e5cbe6e54e5` |
| Workbook Excel Bridge Cáceres | `c286afab70c0e396f16378212e6e29cf56792064` / PR #233 |
| Lector raw v2 / read model | PR #238; head técnico `7da866b205e509120bb2c7abc0a4efdf7341e659`; `MERGED_AND_VERIFIED` |
| Selectores + Quick View Bridge | PR #242; commits `3da3d450890508e7ee11ea7b801ad37ba4052cf5` + `94cd44688b82aea0a10e4778e3182ab300bd6be0`; merge histórico `e2c54583ccc5876058403c34a675496cab897972`; `MERGED_AND_VERIFIED` |
| Handoff + dashboard Bridge | Issue #245; PR #246; commits `fe28f21feb7cb58d57c639a7d52d85856b247108` + `7ebc482629e1e818a6227c8e8946cddd12ee113a`; merge/HEAD `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6`; `MERGED_AND_VERIFIED` |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.3` |
| SHA funcional fuente del snapshot | `815e16f9564c82f469a95745c5c6917593a8c3f0` |
| Merge de promoción | `96a4cb0b6df775dc5b391a05e87a313adb30a23f` |
| Uso autorizado por este documento | Evaluación con datos exclusivamente sintéticos |
| Piloto real / producción | No acreditados |

> Este documento sustituye como estado vivo a `FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`, que se conserva como fotografía histórica de `CÁCERES-REVIEW-0.1`.

---

## 1. Propósito

Fijar la situación publicada del módulo de Farmacia Hospitalaria después de:

- la recuperación del núcleo regional;
- la corrección definitiva del autocomplete CIMA en la entrada manual de Validación;
- las promociones reproducibles a `CÁCERES-REVIEW-0.2` y `CÁCERES-REVIEW-0.3`;
- la fusión de los quick wins de Validación mediante PR #193;
- la incorporación y posterior realineación del ledger/workbook sintético mediante PR #199/#201/#203;
- la corrección P0 de la verdad Excel de Primera Visita mediante PR #205;
- la publicación del núcleo canónico y los adaptadores Export v2 mediante PR #211/#215/#217/#221;
- la reconciliación post-Seguimiento mediante PR #223;
- el proveedor técnico sintético cerrado mediante PR #225;
- la activación visible y paralela de Export v2 demo mediante PR #227;
- la retirada del ledger clínico del runtime soportado mediante PR #231;
- la publicación y QA manual del workbook operativo del Excel Bridge mediante PR #233.
- la integración del lector raw, la Quick View y el handoff/dashboard Bridge mediante PR #238/#242/#246.

No sustituye contratos clínicos definitivos, no autoriza datos reales y no convierte la evaluación en piloto asistencial.

---

## 2. Fuentes de verdad

| Elemento | Fuente de verdad | Estado |
|---|---|---|
| Código regional de Farmacia | `recovery/farmacia-pr-replay-20260727` | Publicado para evolución y evaluación |
| HEAD regional publicado | `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6` | Merge de PR #246; incluye PR #231/#233/#238/#242/#246 |
| Activación Export v2 demo | `fe84d83c7d3574840696c9fed70f98e581ec8916` | Salida visible en paralelo; v1 preservada |
| Retirada ledger runtime | `b1ee11e00affa39c4a91626bb03f493fbcdce7d9` | Ledger fuera de Validación, Primera Visita y Seguimiento; sin persistencia alternativa |
| Workbook operativo | `templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx` | Contenedor publicado; lector raw v2 integrado por PR #238; Office Script y lectura relacional aún pendientes |
| Snapshot Cáceres | `previews/caceres-fh/` | Salida generada y estable; no incorpora automáticamente el HEAD regional posterior |
| Manifest | `previews/caceres-fh/deployment-manifest.json` | Fuente de versión, SHA, allowlist y hashes del snapshot |
| Versión estable Cáceres | `CÁCERES-REVIEW-0.3` | Snapshot explícitamente promovido; fuente `815e16f9...` |
| Plan vivo del siguiente ciclo | `FARMACIA_PLAN_VACACIONES_20260731.md` | Prioridad y secuencia operativa |
| Secuencia vigente | `FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md` | WO6, WO8A-1, WO8A-2A-1 y WO8A-2A-2 integradas; WO7 candidate pausada; formularios y consumidores posteriores pendientes |
| Decisión de persistencia | `../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md` | Dirección vigente reconciliada |
| Índice documental | `../INDEX.md` | Navegación documental |
| Tablero de WOs | `WORK_ORDER_STATUS.md` | Trazabilidad de ejecución |

La rama histórica `preview/demo-lunes-wo4-20260614` continúa como evidencia. No es la base publicada vigente.

---

## 3. URLs operativas

### Regional

`https://b32majus.github.io/Hub-Clinico-Badajoz/farmacia_index.html`

- sigue la rama que publique GitHub Pages según su configuración efectiva;
- sirve para QA y evaluación con datos sintéticos;
- no se presume que cada merge regional esté desplegado sin comprobar la publicación;
- no es producción ni piloto real.

### Cáceres estable

`https://b32majus.github.io/Hub-Clinico-Badajoz/previews/caceres-fh/`

- entrada directa a Farmacia;
- identidad Hospital Universitario de Cáceres / Área de Salud de Cáceres;
- perfil compartido de evaluación;
- aviso permanente de datos sintéticos;
- sin gate ni navegación de Reumatología;
- solo cambia mediante regeneración y promoción explícita.

---

## 4. Trazabilidad publicada relevante

| Issue / WO | PR | Merge | Adjudicación real |
|---|---:|---|---|
| #182 — selección CIMA sin contexto | #183 | `ee1abd88cd52a298d9c1e63d93bdddd08b3e3a7e` | Restauró consumidores sin contexto y añadió regresiones |
| #184 — minifix manual solicitado | #185 | `5e70afa53a309186e54f812459d6f7521641c8d3` | Fusionada, pero no corrigió el defecto en QA humana; superseded por #187 |
| #186 — clone del autocomplete funcional | #187 | `54f6bb2cc5cb9c46b4121e8148c00a065f1bca6c` | Corrección definitiva; QA humana regional PASS |
| #188 — promoción Cáceres 0.2 | #189 | `accac670ba216d8c291ee849d2198742d02bb3f0` | Snapshot regenerado y QA humana Cáceres PASS |
| #190 — estado, plan y arquitectura V4 | #191 | `9725bf60917ea07dc53162e700e86a1743537d3d` | Documentación viva; no añadió capacidad funcional |
| #192 — quick wins Validación | #193 | `4801e9aafaea5e0b56106e9ca38d8bbb1a84b91e` | Pauta, observaciones, comorbilidades y guard de CIP |
| #194 — reconciliación quick wins | #195 | `815e16f9564c82f469a95745c5c6917593a8c3f0` | Estado regional previo a promoción 0.3 |
| #196 — promoción Cáceres 0.3 | #197 | `96a4cb0b6df775dc5b391a05e87a313adb30a23f` | Snapshot `CÁCERES-REVIEW-0.3` |
| #198 — ledger sintético | #199 | `ac93575da6c07d9bf861baa5f1aa7a566d3877fd` | Persistencia local histórica; retirada del runtime después por #231 |
| #200 — workbook técnico | #201 | `25c751657f18f5825ad92144c3140a8736d6664f` | Artefacto técnico histórico de 11 hojas; no Bridge operativo |
| #202 — realineación de flujo | #203 | `6dcedff4c1b4ac60b79d0e7d3951aaebe9f6ae5e` | Flujo normal sin cohorte ficticia visible |
| #204 — Excel Primera Visita | #205 | `68b5383762f3ae747f567d49df2e80118c38fe16` | CIP y acto visible correctos; Excel v1 preservado |
| #206 — contrato export v2 | #207 | `2f54c4ec80ed201a4026b374b711eb7572faa367` | Fila común v2 y arquitectura del Bridge documentadas |
| #208 — secuencia WO1–WO9 | #209 | `5e9b59ba36dc7760f4529deece33248922ce0b9a` | Secuencia publicada; sin cambio funcional |
| #210 — núcleo canónico v2 | #211 | `6ac041f8d5faa445140b32a7daccd3724dac3529` | Core candidate, 152 columnas y roundtrip TSV |
| #214 — adaptador Validación | #215 | `17426f60...` | Una fila; solicitado y validado separados |
| #216 — adaptador Primera Visita | #217 | `c45b7d13...` | `1..N` líneas explícitas |
| #220 — adaptador Seguimiento | #221 | `b9f27e96...` | `1..N` líneas explícitamente activas |
| #222 — reconciliación Seguimiento | #223 | `dfbbf76b...` | Estado documental post-WO4 |
| #224 — contexto técnico | #225 | `e2f2c663...` | Proveedor cerrado a FH-001/FH-004; no Identity Plane |
| #226 — activación paralela | #227 | `f86f72f8...` | Export v2 visible; v1 intacta |
| #230 — retirada ledger runtime | #231 | `19867ef16127548d0b596482360d8e5cbe6e54e5` | Ledger no cargado en las tres pantallas; sin restauración ni alternativa |
| #232 — workbook Excel Bridge | #233 | `a94a42f1d603e4259aece09c14b18ae19a74fefc` | Workbook operativo publicado; QA Microsoft Excel PASS |
| #237 — raw reader/read model | #238 | `92c00eb7f0c778e3351cf6f37e3a415a2c7da694` (merge histórico, no HEAD vigente) | Head técnico `7da866b2...`; lector raw v2 y read model; candidate SHA-256 `2b7b2eed0f4310156e701c6357505442f47d13e7492869fcfbc1e9dedf564af4`; `MERGED_AND_VERIFIED` |
| #241 — selectores y Quick View Bridge | #242 | `e2c54583ccc5876058403c34a675496cab897972` | Commits `3da3d450...` + `94cd4468...`; `MERGED_AND_VERIFIED`; Quick View dentro de `farmacia_index.html`, P1 de identidad y evidencia publicada |
| #245 — handoff y dashboard Bridge | #246 | `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6` | Commits `fe28f21f...` + `7ebc4826...`; `MERGED_AND_VERIFIED`; handoff efímero y dashboard Bridge de solo lectura |

La PR #185 permanece en la historia Git, pero no debe presentarse como la corrección vigente.

---

## 5. Estado funcional y evidencia disponible

### 5.1 Regional

| Capacidad | Existe en código/artefacto | Cableada | Visible | Interacción soportada | QA disponible |
|---|---:|---:|---:|---:|---:|
| Inicio Farmacia y búsqueda por CIP | Sí | Sí | Sí | Sí | QA previa regional |
| Validación farmacoterapéutica | Sí | Sí | Sí | Sí | QA previa regional |
| Entrada manual y autocomplete CIMA | Sí | Sí | Sí | Sí | QA humana PASS |
| Dermatología multipatología | Sí | Sí | Sí | Sí | Alcance evaluado |
| Primera Visita | Sí | Sí | Sí | Sí | QA previa regional |
| Seguimiento multilínea | Sí | Sí | Sí | Sí | QA previa regional |
| EA y causalidad por sospechoso | Sí | Sí | Sí | Sí | Alcance demo |
| Dashboard longitudinal `visit_id + line_id` | Sí | Sí | Sí | Sí | Alcance demo, no persistencia externa |
| TXT JARA | Sí | Sí | Sí | Sí | Salida provisional |
| Export v2 demo paralelo | Sí | Sí, limitado | Sí | Sí, para contextos técnicos registrados | 152 columnas; cardinalidad aprobada |
| Ledger clínico histórico | Sí, versionado | **No en runtime soportado** | No | No | PR #231 demuestra desacoplamiento |
| Workbook Excel Bridge | Sí | Conectado al botón de carga para lectura raw | No es UI web | Selección de Excel soportada | QA manual Microsoft Excel PASS |
| Lector raw v2 / read model | Sí | Sí, en memoria de página | Estado de importación Bridge | Carga raw soportada | Node 21 casos y QA navegador PASS |
| Selector Bridge por identidad explícita | Sí | Sí, dentro de `farmacia_index.html` | Sí | Sí, sistema + valor explícitos | 82 casos y QA focal PASS |
| Quick View Bridge | Sí | Sí, dentro de `farmacia_index.html` | Sí | Sí, mediante botón y búsqueda soportados | QA navegador PASS; consola limpia; `pageerror = 0` |
| Handoff efímero | Sí | Sí | Visible mediante botón | Interacción soportada | Handoff checker 37 y QA navegador PASS |
| Dashboard Bridge | Sí | Sí | Sí | Interacción soportada | Renderer de lectura separado; QA navegador PASS |
| Formularios Bridge | No | No | No | No | Validación, Primera Visita y Seguimiento pendientes |
| Office Script y tablas relacionales | Candidate, no integrado | No | No | No | Gate real pendiente |
| `APP_*`, Read Adapter y roundtrip | No | No | No | No | Pendientes |
| Persistencia longitudinal externa completa | No | No | No | No | No acreditada |

### 5.2 Export v2 y workbook publicados

- core y adaptadores usan una fila común de 152 columnas;
- Validación produce exactamente una fila;
- Primera Visita produce `1..N` por líneas explícitamente presentes;
- Seguimiento produce `1..N` por líneas explícitamente activas;
- `0`, `false`, vacíos, Unicode y JSON se preservan en el TSV canónico;
- la salida v1 de 61 columnas, CSV y JARA permanecen intactos;
- el workbook publicado contiene `01_DERMA`, `03_DIGESTIVO` y 16 shells técnicos ocultos;
- las dos tablas reciben las mismas 152 cabeceras canónicas;
- QA manual en Microsoft Excel demostró apertura sin reparación, expansión hasta seis filas sintéticas, roundtrip exacto de 5.830 bytes y neutralidad de `=`, `+`, `-` y `@`;
- las hojas técnicas permanecen vacías: no existe todavía descomposición relacional.

### 5.3 Cáceres 0.3

Demostrado mediante interacción soportada y comprobación humana en la URL pública del snapshot:

- versión `CÁCERES-REVIEW-0.3` visible;
- entrada directa y flujo Farmacia;
- búsqueda, Validación, Primera Visita y Seguimiento accesibles;
- selección CIMA manual estable y editable;
- dashboard de `CIP-DEMO-FH-004`;
- ausencia de navegación Reumatología;
- aviso de datos sintéticos;
- consola y `pageerror` sin errores en las pruebas ejecutadas.

El snapshot 0.3 no se actualiza automáticamente con PR #231, PR #233, PR #238, PR #242 o PR #246. Esas capacidades están publicadas en la rama regional y solo llegarían al snapshot mediante promoción explícita posterior.

### 5.4 Persistencia y evolución regional posterior al snapshot

- PR #231 retiró el ledger clínico del runtime soportado de Validación, Primera Visita y Seguimiento.
- No existe restauración tras recarga ni recuperación al regresar a un CIP; no se lee, escribe ni elimina la clave legacy.
- El módulo `farmacia_evaluation_ledger.js` y el workbook técnico de PR #201 permanecen versionados como historia, pero no se cargan en el flujo normal.
- El ledger `localStorage` está retirado del runtime soportado por PR #231. El Bridge raw v2 no usa `sessionStorage` ni `localStorage` y vive solo en memoria; tras recarga o navegación completa hay que volver a seleccionar el Excel.
- Imports legacy y snapshots anteriores pueden seguir usando `sessionStorage`; es deuda separada y no persistencia longitudinal resuelta.
- PR #233 publicó el workbook operativo y PR #238 conectó el botón existente al lector raw v2, pero aún no hay reconstrucción longitudinal desde `APP_*`.
- PR #246 añadió un transporte `postMessage` efímero y one-shot hacia el dashboard Bridge; no es persistencia, y recargar el dashboard obliga a volver a Inicio Farmacia.
- El handoff no guarda datos clínicos en URL ni browser storage; el fragmento contiene exclusivamente un nonce técnico.
- La profesional puede pegar una salida TSV completa en las hojas operativas; el lector raw v2 valida y construye read model, pero todavía no existe Office Script integrado que valide, deduplique y descomponga las filas en tablas.
- No existen tablas relacionales pobladas, vistas `APP_*`, Excel Read Adapter ni roundtrip.
- El proveedor técnico v2 permanece cerrado a FH-001/FH-004; CIP manual desconocido no obtiene contexto técnico v2.
- No existe cutover completo, retirada v1 ni promoción de `draft` a `2.0.0`.
- WO5 permanece `PARTIALLY_SATISFIED_BY_SMALLER_UNITS / REMAINING_SCOPE_DEFERRED`.
- Ninguno de estos cambios acredita QA integral, piloto real o producción.

---

## 6. Feedback confirmado por Farmacia el 2026-07-30

Los cuatro puntos ejecutables sin dependencia externa quedaron implementados mediante PR #193:

1. pauta **Cada 3 semanas**;
2. **Observaciones de Farmacia Hospitalaria** separadas de la justificación clínica;
3. coherencia de la denominación en interfaz y salidas;
4. comorbilidades comunes: infecciones recurrentes, riesgo cardiovascular, alteraciones neurológicas y antecedentes/riesgo de neoplasia.

Dependencias externas abiertas:

| Dependencia | Estado | Regla |
|---|---|---|
| Texto exacto copiado desde Presalud | Solicitado, pendiente | No crear parser con formato inventado |
| Diccionario regional de patologías | Solicitado, pendiente | No codificar contenido provisional como regional |
| Formularios previos de Digestivo | Pendiente de Farmacia | No implementar circuito definitivo sin recibirlos |
| Consenso SEFH y PROs | Preparación por Silvia | Incorporar tras revisión explícita |

---

## 7. Interpretación confirmada de Presalud

- Dermatología puede crear Presalud inicialmente solo para una parte de los pacientes.
- Cuando no existe, Farmacia debe crearlo al recibir la orden clínica.
- La orden clínica y Presalud son entradas complementarias.
- Presalud es especialmente relevante para fechas de validez/renovación cuando se reciben explícitamente.
- No existe parser publicado porque falta la cadena exacta del portapapeles.
- Pharmatool queda fuera de este frente: registra dispensación, pero no ofrece una exportación útil para construir este flujo.

---

## 8. Decisiones de producto vigentes

1. No existe modo ni botón `Nuevo paciente sintético`.
2. La evaluadora usa el flujo normal con un CIP y datos inventados.
3. Los fixtures se conservan para demo y regresión, pero no deben gobernar el funcionamiento final.
4. La información se genera siempre desde el Hub; la profesional no crea un paciente escribiendo una fila Excel.
5. Cada hospital tendrá un libro independiente; no existe consolidación regional automática.
6. Código, modelo, contratos y scripts serán comunes.
7. Cáceres inicia el Bridge con Dermatología y Digestivo; la definición clínica definitiva de Digestivo sigue condicionada a su formulario.
8. CIP/`identifier_value` no equivale a `patient_id`; `patient_id` es opaco y no se deriva del CIP.
9. El Identity Plane físico permanece diferido.
10. Orden técnico vigente: WO7 candidate pausado por gate real; WO8A-1 raw reader, WO8A-2A-1 Quick View y WO8A-2A-2 handoff/dashboard integrados; formularios Bridge, Estadísticas, Actividad, `APP_*`, descomposición, Read Adapter y roundtrip pendientes; identidad/CIP arbitrario y retirada legacy de `sessionStorage` posteriores.

---

## 9. Frontera demo, evaluación, piloto y producto futuro

### Apto actualmente para

- demo funcional y evaluación de formularios con datos sintéticos;
- revisión de campos y textos por profesionales;
- QA de la cardinalidad Export v2;
- generación y pegado manual del TSV en el workbook;
- validación técnica del contenedor Excel Bridge.

### No apto todavía para

- introducir datos reales;
- asistencia clínica real;
- persistencia longitudinal completa;
- uso persistente multiusuario;
- autenticación, autorización y auditoría productivas;
- integración automática con sistemas SES;
- captura externa de PROMs reales;
- piloto operativo;
- producción.

### Gate de paquete longitudinal final

El workbook operativo ya está demostrado. No preparar URL, guía o paquete longitudinal final ni retirar v1 hasta demostrar también:

- CIP arbitrario mediante flujo normal;
- Office Script;
- tablas relacionales y vistas `APP_*`;
- Excel Read Adapter;
- roundtrip Hub → Excel → Hub;
- retirada de `sessionStorage` con reemplazo.

Una evaluación de formularios de alcance inferior requiere decisión humana específica y etiquetado explícito como evaluación, no piloto.

---

## 10. Reglas de seguridad clínica

- Tratamiento solicitado no equivale a tratamiento validado.
- Tratamiento validado no equivale a tratamiento iniciado.
- Línea evaluada no equivale a dispensada.
- Tratamiento previo no equivale a iniciar uno nuevo.
- Un segundo tratamiento no demuestra switch ni add-on.
- Ausencia de acción no demuestra renovación.
- CIMA identifica y propone datos editables tras selección explícita; no decide tratamiento.
- Nunca inferir desde nombre, catálogo, etiqueta o dato ausente dosis, vía, pauta, presentación, inducción, duración, resultado de validación, inicio, switch, add-on, dispensación, renovación o causalidad.
- Los datos ausentes permanecen vacíos, desconocidos o pendientes.

---

## 11. Regla de promoción

```text
Rama work aislada
→ tests y QA
→ issue aprobado
→ PR
→ merge autorizado en recovery
→ QA humana regional
→ promoción explícita del SHA funcional
→ nueva versión Cáceres
→ QA humana Cáceres
→ reconciliación documental
```

`previews/caceres-fh/` es una salida generada. No se edita manualmente.

---

## 12. Siguiente referencia operativa

La siguiente unidad es `WO-FH-EXCEL-BRIDGE-OFFICE-SCRIPT-01`, definida por la secuencia publicada:

- [`FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md)
- [`../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md)
- [`../architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](../architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md)

WO7 deberá partir del workbook publicado, conservar la fila raw, definir y poblar las tablas relacionales, bloquear duplicados y discrepancias, registrar errores y demostrar idempotencia en Microsoft Excel. Ninguna WO futura queda autorizada automáticamente por este documento.
