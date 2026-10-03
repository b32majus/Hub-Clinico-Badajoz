# Work Order Status — Hub Clínico Badajoz / PROMueve Nexus

**Última actualización:** 2026-10-03
**Propósito:** tablero de estado y trazabilidad de work orders ejecutadas
**Mantenedor:** Cora / Hermes PM; actualizar al cambiar el estado real de una WO

---

## Estado publicado actual de PROMueve Nexus

| Elemento | Valor |
| --- | --- |
| Autoridad canónica activa | `promueve/nexus-v4`; activa desde merge PR #381 (2026-09-24) |
| Último HEAD de producto Nexus verificado | `3bf45760a27630823b61b0d19da8b64aeb060693` — merge PR #490 / TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11 (#487; F4.4 Pharmacy Act v1; candidate `535c65567bc8ca0aef7358f97f99d97520b0ff20`); HEAD de producto anterior `a04a0ace25012e5f0ac397844165921dccaebcc3` (PR #484); el tip Git puede avanzar por documentación/administración sin cambiar este HEAD de producto |
| Última entrega clínica/contractual | TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11 (#487): T1 #488 `98c7aa76b9457f31c17912090e299f0fb62e4c84` (contrato común Pharmacy Act v1 independiente de transporte; oracle 243/0) + T2 #489 `b73e1e7e8a219794be8b778d1ae9c4b6d1a5f7bb` (payloads independientes Validación / Primera Visita / Seguimiento; oracle 145/0), correction candidate `535c65567bc8ca0aef7358f97f99d97520b0ff20` (own-property authority, custom prototypes fail-closed, deep detachment), publicados por PR #490 (merge `3bf45760...`); aseguramiento compuesto C-080 review `review-707b45b6c20d35ee` APPROVED + acknowledged + burned. **F4.4 queda COMPLETADA/PUBLICADA.** Anteriores: WO-NEXUS-FARMACIA-PV-001 (#482): corrección del `PRODUCT_DEFECT_BLOCKING` PV-001 publicada por PR #484 (candidate `75063f25...` → merge `a04a0ace...`); `RESOLVED/PUBLISHED`. TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 (#470): F4.3A #471 + F4.3B #472 + F4.3C #473 publicados por PR #474 (merge `bf0cb3d...`); TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1 (#475): F4.3D #476 + F4.3E #477 y corrección de stale init-read race `f82bd24` publicados por PR #478 (merge `91262d8...`). F4.3 queda **COMPLETADA/PUBLICADA** |
| Reconciliación de producto viva | **#501 — PRE-BADAJOZ**: [`audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](./audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md). Recoge revisión manual Farmacia + reunión Farmacia/Dermatología + entrada de Dermatología como módulo candidato Nexus + siguiente paso Reuma. Estado humano de prioridad: `UNDER_READJUDICATION / PRE-BADAJOZ`; cerrar/publicar el documento no implementa sus decisiones. |
| Verificación post-merge clínica | PR #490 head `535c65567bc8ca0aef7358f97f99d97520b0ff20` → merge `3bf45760a27630823b61b0d19da8b64aeb060693`; CI post-merge `Nexus deterministic gates` run `36880209718` `success`. Anterior: PR #484 head `75063f25b5cf3de008ab882392b9387f5fdea9c1` → merge `a04a0ace25012e5f0ac397844165921dccaebcc3`; CI post-merge run `36771991874` `success`. Checkpoint visual post-F4.3 (#480, TRAIN #479 T1): QA navegador real con 17 observaciones `PASS` y **1 `PRODUCT_DEFECT_BLOCKING` (PV-001)** que en ese momento terminó `HUMAN_STOP_BLOCKER` con follow-up técnico aprobado #482; PV-001 quedó posteriormente `RESOLVED/PUBLISHED` por #482 / PR #484 |
| Home sintética | F3.2 publicada; F3.3 browser-qualified; F3.4 release sintético reproducible y browser-qualified; D012/D013 hardening publicado |
| Madurez | Evaluación sintética; **no piloto / no producción** |
| Deuda Nexus abierta | D004; subhallazgos restantes D005; #448 (hidratación visual del medicamento preseleccionado) y #450 (semántica de búsqueda legacy no categorizada) abiertas/no bloqueantes. D007 RESOLVED/PUBLISHED por #434 / PR #435. |
| Siguiente frontera del plan | **Foundation:** tras F4.4 publicada (TRAIN #487 / PR #490), la siguiente frontera pendiente del plan es **F4.5 DeliveryResult / adapter semantics** (F4.6 depende de ella); queda técnicamente disponible, sin ser prioridad humana automática ni autorización de ejecución. **Producto vivo:** la secuencia previa #446 renovaciones → Reuma→Farmacia discovery → CIMA queda `UNDER_READJUDICATION / PRE-BADAJOZ` por #501, sin cancelarse. **Siguiente acción humana/producto:** reconstruir ledger Reuma contra Nexus → checklist/Q&A manual focalizado → cruzar Reuma+Farmacia → adjudicar WOs pre-8. |
| Último train clínico publicado | TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11 (#487): PR #490 `MERGED`, candidate final `535c655...` → merge de producto `3bf45760...`; F4.4 Pharmacy Act v1 (contrato común + payloads independientes; oracles 243/0 y 145/0; C-080 `review-707b45b6c20d35ee` APPROVED + acknowledged + burned); #487/#488/#489 `CLOSED/completed`; CI post-merge run `36880209718` `success`. Anterior: WO-NEXUS-FARMACIA-PV-001 (#482): PR #484 `MERGED`, candidate `75063f25...` → merge de producto `a04a0ace...`; corrección PV-001 `RESOLVED/PUBLISHED`. |

### WO-DOC-NEXUS-PRODUCT-RECONCILIATION-20261003 (#501) — reconciliación documental pre-Badajoz

**Alcance:** documentación/product shaping exclusivamente; cero runtime clínico.

**Base verificada al iniciar:** `promueve/nexus-v4` @ `50b48b41d61d94752f5b10edb04b2e5fb1898f08`.

**Rutas:** `docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`.

**Decisiones reconciliadas principales:**

- Farmacia Inicio se orienta a paciente + trabajo pendiente; `Actividad del servicio` evoluciona conceptualmente a `Pendientes`.
- `PENDIENTE_RECOGIDA` no equivale a adherencia y sólo se resuelve mediante dispensación registrada; ventana/frecuencia siguen abiertas.
- entrada manual vs estructurada no tiene valor clínico visible salvo dependencia técnica demostrada.
- Export V2 permanece visible como explicación de interoperabilidad futura, no como persistencia automática.
- Primera Visita puede ser punto inicial de incorporación al Hub; `inducción solicitada ≠ inducción validada`.
- tratamiento preexistente se incorpora como baseline sin fabricar START/SWITCH/ADD_ON retrospectivos.
- caso add-on con nueva dispensación queda `PENDIENTE_EQUIPO` para resolver su circuito operacional.
- en FH, selección explícita de medicamento/presentación CIMA + contexto/indicación explícitos puede proponer datos de ficha técnica aplicables y editables; no sobrescribir ajustes profesionales.
- en solicitud clínica de moléculas con biosimilar, se pide principio activo/molécula; Farmacia selecciona después marca/presentación concreta.
- Dermatología pasa a módulo real candidato de Nexus; primera profundidad solicitudes a Farmacia; HS/PsO primeras verticales longitudinales previstas.
- HBV separa `pauta vacunal completa` de `condición suficiente para iniciar`; la segunda dosis puede ser condición suficiente en el circuito acordado sin falsear pauta completa.
- eccema de manos queda `AWAIT_TEAM_INPUT` y no se diseña por analogía.
- Badajoz/Mérida deben evolucionar como módulo común + diferencias explícitas por deployment; no forks.
- no se aprueban ahora form-builder universal, rule engine genérico, Control Plane mutable ni V5 hiperconfigurable.
- Reumatología requiere ledger `RESUELTO / PENDIENTE / SUPERSEDIDO / REVALIDAR` contra Nexus antes de pedir nueva revisión manual completa.

**NO TOCA:** runtime HTML/JS/CSS; CIMA tooling; Excel/bridge/adapters; F4.5/F4.6; #446/hold; #448/#450; ADRs/Architecture Freeze; `main`; recovery; snapshots; Pages/deploy; datos reales; implementation backlog de eccema de manos; qualification Atenea.

**Estado de publicación:** rama documental `docs/product-reconciliation-501-20261003`; issue #501 `status:approved`; PR/merge se consultan live. La operadora autorizó commit/push/PR y merge si diff/checks permanecen correctos.

### TRAIN-NEXUS-CLINICAL-STRANGLER-05 (#426) — publicado por PR #430

| Ticket | Alcance | Commits publicados | Evidencia principal |
| --- | --- | --- | --- |
| T1 #427 | F4.1 contrato read DTO V2 de Farmacia | `a0dad4a` | contrato V2 22/22 y verificador independiente sobre el commit exacto |
| T2 #428 | F4.2 facade async + vertical Inicio/Quick View | `06fcba2`, `6ce61fa`, `f572ca7`, `36bfcaa` | selectores 92, facade 18, commit explícito 10, cutover 17, session 17, data port 11, QA Chromium de ambos verticales, verificadores independientes |
| T3 #429 | F5.1 Read Port async de Reuma + vertical búsqueda/historia | `a469ad1`, `966db97`, `ea34105` | puerto Reuma 13/13 con batería de mutaciones, harness Reuma 10/0, acceptance 7/0, QA Chromium del vertical, verificadores independientes |

Publicación: PR #430, candidate `988c2089d1dfa34d5bd1d74b606b410e6e79903c` → merge `10422f4e5b7578dbbb17af17e3b953b5501eb4b2`; merge tree `c0615cb301471808e8505e8bd04a078303bb420b` idéntico al candidate. Madurez: `wired` + `visible` + `demostrado` en `promueve/nexus-v4`; evaluación sintética, no `demo` acreditada por este train, no piloto ni producción. `gentle_review assess` devolvió `risk=unassessable` (#4791) en todas las unidades y se obedeció la ruta fail-closed sin fabricar revisión nativa. Rollover: T1→T2 ratio real 0,2419 (objetivo <0,25 cumplido); T2→T3 ratio 0,2520 (objetivo económico no cumplido), sin promover configuración de routing.

### TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06 (#442) — publicado por PR #449

| Ticket | Alcance | Commit publicado | Evidencia principal |
| --- | --- | --- | --- |
| T1 #443 | PCR/unidades explícitas y conversión fail-closed por calculadora | `636f838844d9304a8b2b2acb3e57394a680aeec7` | oracle PCR 27/0; Chromium 32/0; dato/unidad fuente preservados; sin inferencia por magnitud |
| T2 #444 | Autocomplete Reuma sobre catálogo farmacológico publicado | `fc598166396e747d4b87e78219a47436694f2395` | oracle catálogo congelado 15/0; selección identity-only, sin escritura terapéutica lateral |
| T3 #445 | Prebiológico reducido a Analítica / Medicina Preventiva | `4eeaf1ffdef8dae94d8a903f8d32619e9a31c041` | oracle 16/0; Chromium 33/0; tres estados explícitos por bloque, sin APTO global inferido |
| T2b #447 | Preservar `Sistémicos / FAMEs / Biológicos` con clasificación explícita/versionada | `6b8582a158bdcd6f8e7e425e0e83bc6eb27ca952` | categoría 33/0; Chromium catálogo/categorías 46/0; ausencia/categoría inválida fail-closed |

Publicación: PR #449, candidate final `6b8582a158bdcd6f8e7e425e0e83bc6eb27ca952` → merge de producto `25e57b250ec3d7cc0fc80a501fa308a40620f902`; candidate y merge comparten tree `f8faba3ad0b485f21d27cd14244b37522cc40054`. `npm run verify:nexus` PASS; CI pre-merge `36482893829` success y post-merge `36483698667` success. #442/#443/#444/#445/#447 quedaron CLOSED/completed. Deuda no bloqueante preservada: #448 y #450. Madurez: implementado/cableado/visible y demostrado en navegador con fixtures sintéticos; **no piloto ni producción**. Auditoría/shaping histórico: [`audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](./audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md). La reconciliación viva posterior es [`audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](./audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md).

### TRAIN-NEXUS-REUMA-FOUNDATION-07 (#454) — publicado por PR #459

| Ticket | Alcance | Commit publicado | Evidencia principal |
| --- | --- | --- | --- |
| T1 #455 | F5.2 — migrar lecturas de paciente/historia de Seguimiento detrás del Reuma Read Port | `a5d62953a6c41a5fbd05a749dc498cb4f8d33908` | checks de migración y browser de Seguimiento publicados con el commit (`tools/reuma_seguimiento_read_*`) |
| T2 #456 | F5.2 — migrar lecturas de población de Estadísticas detrás de un seam de lectura Reuma explícito | `07d6caee7d337a1c0fe12019c64821b1c51cbcb1` | seam `scripts/reuma_population_read_port.js` + checks de seam y browser de Estadísticas (`tools/reuma_estadisticas_read_*`) |
| T3 #457 | F5.3 — encapsular el writer legacy de 497 columnas tras una frontera de compatibilidad fail-closed | `52cca14a66e1a848b491b8d584d1197d96f3d0c2` | frontera `modules/reuma_export_boundary.js` + checks de boundary y browser (`tools/reuma_export_boundary_*`); salida exacta protegida, `KNOWN_LEGACY` preservado sin corrección semántica |

Publicación: PR #459, candidate final `52cca14a66e1a848b491b8d584d1197d96f3d0c2` → merge de producto `3c929f8a95c588fdf9db13c593e1f8462bc561a1`; candidate y merge comparten tree `cc1d5e99aa568024cef17768732e7d2507e3abf8`. `npm run verify:nexus` y `git diff --check` PASS en la publicación (#458); CI post-merge `Nexus deterministic gates` run `36625029994` success. #454/#455/#456/#457/#458 quedaron CLOSED/completed. La desviación de routing de T3 quedó aceptada por la operadora como no bloqueante; provenance del lifecycle Atenea del train: C-078/C-079 (CURRENT para operaciones nuevas: C-080). Tras el merge, el tip Git avanzó a `f49ad6ec...` por dos commits administrativos (alta/baja de un `__noop__`) sin cambio neto de árbol. **F5.4 fue publicada después por TRAIN-NEXUS-REUMA-ACT-CONTRACT-08 (#461 / PR #467); ver bloque siguiente.** Madurez: evaluación con datos sintéticos; **no piloto ni producción**.

### TRAIN-NEXUS-REUMA-ACT-CONTRACT-08 (#461) — publicado por PR #467

| Ticket | Alcance | Commits publicados | Evidencia principal |
| --- | --- | --- | --- |
| T1 #462 | F5.4A — contrato Reuma Visit Act v1, independiente del legacy 497 | implementación `c2858cf5554261d1bb7e003f1d26287775bbc487`; oráculo congelado `39d276491752df0de2f507c60a7fa571be5a8ee1` | oráculo de aceptación principal 106/0 |
| T2 #463 | F5.4B — adapter Reuma Visit Act v1 → legacy 497 a través de la frontera F5.3 | implementación `283074453515092ea800258d5362958b153c307f`; oráculo congelado `20940f08b4480ad299cc09695e0d2d8853f5f763` | oráculo 51/0; 10 journeys byte-equivalentes |
| T3 #464 | F5.4C — cutover soportado de los journeys de exportación de Primera Visita y Seguimiento al Visit Act v1 | implementación `773ee93694f64626dfb1007a069da018a7023a96`; oráculo congelado `212bc32a16991fb3a2f0b025e74a1645ac3cfb54` | oráculo 58/0 + QA browser 23/23 |

Publicación: PR #467, candidate final `773ee93694f64626dfb1007a069da018a7023a96` → merge de producto `e64b65db29e6536c01e4f41e182fb157ac19ce2a` (padres `9f1f7179e7927a7d219fef51aeabceec7c92c135` + `773ee936...`); candidate y merge comparten tree `ec42a55b9c374b3987c7a44bf5ca80da9167d67d`. CI del candidate `Nexus deterministic gates` run `36645555852` `success`; run post-merge `36645661418` `success`. Evidencia preservada: frontera F5.3 32/0; export harness 9/0; acceptance 15/0; 3 `CHAR` / 1 `DRIFT` report-only sin corrección semántica; `KNOWN_LEGACY` y deuda `pendingRows`/`createdAt` no corregidas se conservan sin cambio. Gentle C-080: 3/3 reviews nativas terminales approved + burned, 0 fallos de reviewer. #461/#462/#463/#464 quedaron CLOSED/completed. Con esta publicación **F5.1–F5.4 = PUBLISHED**; **F6/F7 permanecen PENDIENTES** según el Foundation Plan. Madurez: evaluación con datos sintéticos; **no piloto ni producción**. Esta publicación no cierra #446/renovaciones, Reuma→Farmacia (`DISCOVERY_FIRST`) ni CIMA; su prioridad relativa posterior queda sometida a #501.

### TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 (#470) — publicado por PR #474

| Ticket | Alcance | Evidencia principal |
| --- | --- | --- |
| T1 #471 | F4.3A — migrar lecturas de Dashboard Paciente/Longitudinal detrás del facade V2 | oráculo de migración + QA browser soportada (demo, CIP explícito, not-found fail-closed) |
| T2 #472 | F4.3B — migrar lecturas de Validación y Primera Visita detrás del facade V2 | oráculo de migración + QA browser soportada (requested ≠ validated, búsqueda con guard) |
| T3 #473 | F4.3C — migrar lecturas de Seguimiento y Estadísticas detrás del facade/seam V2 | oráculo de migración + QA browser soportada (cohort detrás del seam publicado) |

Publicación: PR #474 `MERGED` → merge `bf0cb3dde91965168effb00d6f119624e43bd764` en `promueve/nexus-v4`. Madurez: evaluación sintética; no piloto ni producción.

### TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1 (#475) — publicado por PR #478

| Ticket | Alcance | Evidencia principal |
| --- | --- | --- |
| T1 #476 | F4.3D — migrar consumidores residuales (Inicio, Actividad del servicio, review de intake) detrás de seams sync publicados | checkers deterministas + browser por superficie; stale init-read race resuelta por `f82bd24` (init tardío nunca reemplaza la búsqueda soportada del usuario) — RESOLVED, sin advisory abierto |
| T2 #477 | F4.3E — cualificar cinco checkers previos en rojo reparando sólo drift de harness | los cinco checkers quedan `HARNESS_DRIFT_FIXED`; no se reescribe su historia como defectos runtime |

Publicación: PR #478 `MERGED` → merge de producto `91262d8007642eaf1d3cbe21e24d20ff369ee19b` (padres `bf0cb3d...` + `f82bd24...`) en `promueve/nexus-v4`. CI post-merge `Nexus deterministic gates` run `36744075965` `success`. Con esta publicación **F4.3 = COMPLETADA/PUBLICADA / PUBLISHED** en la rama canónica. **Checkpoint visual post-F4.3 (#480, TRAIN-NEXUS-F4.3-POSTMERGE-CHECKPOINT-10 #479 / T1):** QA de navegador real con interacciones soportadas sobre `91262d8`; 17 observaciones `PASS` y **1 `PRODUCT_DEFECT_BLOCKING` (PV-001)**: Primera Visita presenta el tratamiento solicitado de un paciente demo pendiente como «validado» e hidrata la captura con él — semántica preexistente del camino legacy coexistence, no introducida por F4.3; estado T1 `HUMAN_STOP_BLOCKER`, follow-up técnico aprobado **#482** (NO ejecutado dentro del train). PV-001 fue posteriormente corregido y publicado por #482 / PR #484 (candidate `75063f25...` → merge `a04a0ace...`, CI post-merge run `36771991874` success); estado actual = `RESOLVED/PUBLISHED`, F4.4 quedó técnicamente desbloqueada y fue publicada después por TRAIN #487 / PR #490 (ver bloque siguiente). Detalle: [`audits/PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md`](./audits/PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md). R3-001 (#448) sigue `CONTRACT_COMPLIANT_DEMO_DEBT`. Madurez: evaluación con datos sintéticos; no piloto ni producción.

### WO-NEXUS-FARMACIA-PV-001 (#482) — publicado por PR #484

Corrección del `PRODUCT_DEFECT_BLOCKING` PV-001 registrado por el checkpoint visual post-F4.3 (#480, TRAIN #479 T1): `resolvePrimaryRelation` ya no infiere `validado` desde la mera existencia de registro; sólo la evidencia explícita ya soportada (raw `tratamientoValidado`; legacy `estado='validated'`) produce relación validada. `followup` por sí solo y requested-only fallan cerrado y no prehidratan la captura.

Publicación: PR #484 `MERGED` → merge de producto `a04a0ace25012e5f0ac397844165921dccaebcc3` (candidate final `75063f25b5cf3de008ab882392b9387f5fdea9c1`); CI post-merge `Nexus deterministic gates` run `36771991874` `success`. Evidencia: oracle `check:fh:pv001` **40/40**, browser QA final **35/0** con `console.error=0` y `pageerror=0`; `npm run verify:nexus` PASS. #482 quedó CLOSED/completed. Madurez: evaluación con datos sintéticos; no piloto ni producción.

### TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11 (#487) — publicado por PR #490

F4.4 Pharmacy Act contract como freeze de contrato puro, sin cutover, UI, captura, delivery, persistencia, Pages, deploy ni cambio en `main`.

| Ticket | Alcance | Commit publicado | Evidencia principal |
| --- | --- | --- | --- |
| T1 #488 | F4.4A — contrato común Pharmacy Act v1 independiente de transporte | `98c7aa76b9457f31c17912090e299f0fb62e4c84` | `HubTools.farmaciaActContract.createAct`, `contractVersion = pharmacy-act/v1`; envelope explícito común para Validación/Primera Visita/Seguimiento; fail-closed sin metadata autogenerada ni inferencia clínica; sin dependencia de Excel/TSV/ROW_COLUMNS/SharePoint/SQL ni `commit(event)` público; deep detachment / sin referencias compartidas del caller; oracle de invariantes 243/0 |
| T2 #489 | F4.4B — payloads independientes Validación / Primera Visita / Seguimiento | `b73e1e7e8a219794be8b778d1ae9c4b6d1a5f7bb` | `createValidationAct` `{ request, validation?, transversal?, lines[] }`, `createFirstVisitAct` `{ firstVisit, transversal?, lines[] }`, `createFollowupAct` `{ followup, lines[] }`; solicitado ≠ validado; previo ≠ nuevo; `followup` ≠ validación; cardinalidad/orden de `lines[]` explícitas 0/1/2+ preservada; ausencia preservada sin defaults; oracle de cardinalidad/ausencia/seguridad clínica 145/0 |

Correction candidate `535c65567bc8ca0aef7358f97f99d97520b0ff20`: endureció la trust boundary descubierta en auditoría pre-merge — semántica own-property (`hasOwnProperty`) para metadata requerida/opcional, bloques y `lines` (la cadena de prototipos no otorga autoridad), prototypes custom del caller fail-closed, deep clone sin preservar prototipo controlado por el caller y entradas normales/null-prototype igualmente desacopladas; sólo cambió los dos módulos de contrato y sus oráculos dedicados.

Aseguramiento compuesto Gentle C-080 sobre el delta compuesto `98c7aa76..535c655`: lineage `review-707b45b6c20d35ee`, verdict **APPROVED** (2 WARNING informativos, sin corrección requerida), `review.acknowledge-approved` ejecutado y autoridad **burned**; transporte primario `atenea-review-host`. El recibo histórico fallido `review-c9f7a22a0bb669d7` se conserva como evidencia de incidente y no se usa como autoridad.

Publicación: PR #490 `MERGED` → merge de producto `3bf45760a27630823b61b0d19da8b64aeb060693` (padre base `7e30f5d8...`) en `promueve/nexus-v4`; candidate y merge comparten tree `bc8bc378...`. CI del candidate `Nexus deterministic gates` run `36879118233` y post-merge run `36880209718` `success`. Evidencia final: oracles T1 243/0 y T2 145/0; `npm run verify:nexus` PASS; `git diff --check` PASS; checks Export v2 ejecutados solo como caracterización/paridad read-only; diff limitado a las 5 rutas autorizadas por el train; cero HTML/UI/runtime wiring; cero F4.5/F4.6; #446 y su `TEMPORARY EXECUTION HOLD` intactos. #487/#488/#489 quedaron CLOSED/completed. Con esta publicación **F4.4 = COMPLETADA/PUBLICADA**; **F4.5 (DeliveryResult / adapter semantics) es la siguiente frontera Foundation técnicamente disponible, sin ser prioridad humana automática ni autorización de ejecución**; F4.6, F6 y F7 permanecen pendientes. Madurez: evaluación con datos sintéticos; no piloto ni producción. Esta publicación no cierra #446 (renovaciones, con su `TEMPORARY EXECUTION HOLD` intacto), no altera Reuma→Farmacia (`DISCOVERY_FIRST`) ni la automatización CIMA (separada/diferida); su orden humano queda sujeto a la readjudicación #501.

## Estado publicado actual de Farmacia

| Elemento | Valor |
| --- | --- |
| Línea Farmacia de procedencia | `recovery/farmacia-pr-replay-20260727`; **HISTORICAL** para nuevo desarrollo desde PR #381; conserva trazabilidad Farmacia/snapshots |
| Autoridad canónica de desarrollo F0.2 | `promueve/nexus-v4` **ACTIVE** desde merge PR #381; recovery **HISTORICAL** |
| Tip Git de recovery (volátil) | Consultar GitHub live; verificado 2026-09-24 tras PR #374: `771fb80c5081aa974b86d6a0119ab30059970a25` |
| Último HEAD de producto publicado | `771fb80c5081aa974b86d6a0119ab30059970a25` — merge PR #374 / robustez de resolución de hojas Enfermería v6 |
| HEAD clínico funcional | `e1120ba85817a1807cea8c1e938867ad778921f4` — merge PR #341; source/last-functional de 0.6 |
| Candidate Train C | `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` |
| CI del último HEAD de producto | Farmacia smoke run `35936756453` `success`; Pages build/deployment run `35936755598` `success` sobre `771fb80c5081aa974b86d6a0119ab30059970a25` |
| `origin/main` | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68`; fuera de esta línea |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.6`; issue #345 / PR #346; sigue congelado en source `e1120ba...` y no incorpora automáticamente #363/#370/#374 |
| Source/last-functional snapshot 0.6 | `e1120ba85817a1807cea8c1e938867ad778921f4` según `deployment-manifest.json` |
| Paquete externo | `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`; no refrozen por 0.6 (#345/#346) |
| Estado asistencial | Evaluación con datos sintéticos; no piloto ni producción |
| Documento vivo | [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](./FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) |
| WO documental vigente | Consultar GitHub live; no se fija una WO “actual” estática en este tablero |

## Architecture Decision Freeze / Foundation — 2026-09-24

| Elemento | Estado |
| --- | --- |
| Issue | #378 — `WO-DOC-PROMUEVE-ARCHITECTURE-DECISION-FREEZE-20260924` |
| Base verificada al iniciar | `recovery/farmacia-pr-replay-20260727` @ `ea8b03a0e6895495dff1ec0b9abb2e368c259443` |
| Alcance | Documentación/arquitectura únicamente; cero runtime |
| Entregables | baseline + review Round 1 + alignment Round 2 + final completeness review + master freeze + ADR-001…008 + Foundation plan |
| Autoridad Git | **sin cambio**; recovery sigue siendo rama publicada hasta WO de transición separada |
| `main` / Cáceres 0.6 | intactos / fuera de alcance |
| Delivery boundary de #378 | rama + commit + push + PR contra recovery; **MERGE NO autorizado** |
| Estado asistencial | sin cambio: sintético/evaluación, no piloto/producción |

El freeze define la dirección de ingeniería futura, no declara implementados los seams ni crea una nueva línea canónica. El cambio efectivo de autoridad Git se ejecutará, si se aprueba, mediante una WO posterior con SHA live, equivalencia inicial y activación explícita.

## Git Canonical Transition F0.2 — 2026-09-24

| Elemento | Estado |
| --- | --- |
| Issue | #380 — `WO-NEXUS-F0.2-GIT-CANONICAL-TRANSITION` (`status:approved`) |
| Base verificada al iniciar | `recovery/farmacia-pr-replay-20260727` @ `a8cec03522017a1f4b68e18b92c944601659c84f` (merge PR #379) |
| Alcance | Transición Git y documentación únicamente; cero runtime/clínica |
| Rama canónica creada | `promueve/nexus-v4` @ `a8cec03522017a1f4b68e18b92c944601659c84f`; nació como **CANDIDATE** y quedó **ACTIVE** al mergearse PR #381 |
| Equivalencia inicial | mismo commit y tree `82e019bbcfb4959c0e31d6a6575edc88363587e3`; diff vacío; 0 commits de diferencia; cero cherry-pick/rewrite |
| Semántica | pre-merge: recovery **ACTIVE** / nexus-v4 **CANDIDATE**; post-merge autorizado: nexus-v4 **ACTIVE** / recovery **HISTORICAL** |
| Entregables | documento de transición + reconciliación INDEX/WOS/ADR-001/train plan/README + estado vivo Farmacia/recovery-Cáceres |
| Autoridad Git | PR #381 `MERGED`: `promueve/nexus-v4` **ACTIVE** / recovery **HISTORICAL** para nuevo desarrollo |
| `main` / Cáceres 0.6 / asistencial | intactos / fuera de alcance |
| Delivery boundary de #380 | rama + commit + push + PR contra `promueve/nexus-v4`; **MERGE NO autorizado** |
| Detalle | [`PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md`](./PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md) |

## TRAIN-NEXUS-V4-ROLLOVER-CANARY-04 — publicación / closeout 2026-09-26

| Elemento | Estado |
| --- | --- |
| Parent / tickets | #419; T1 #420 (`NEXUS-DEBT-012`), T2 #421 (`NEXUS-DEBT-013`) |
| Base del train | `0b78840fc56be92f0366972bbf6787026a8fff91` |
| Candidate final | `133c978a951c6f73a8daf09f0beeab67fa070d53` |
| Publicación | PR #422 `MERGED` → `f46290cd3a368e00427dbe2fb4e5fde00270d6ac` en `promueve/nexus-v4` |
| D012 | RESOLVED/PUBLISHED: evidence pointers browser del release manifest separados por scope y validados fail-closed |
| D013 | RESOLVED/PUBLISHED: `items` array rechazado por el gate antes de emitir validator; hardening 19/0 |
| Verificación candidate | Home 11/0; release 15/0; validator 19/0; `verify:nexus` PASS; doble rebuild byte-idéntico; independent verifier O1–O8 PASS |
| Verificación post-merge | Fast gates + Deterministic suite GitHub Actions `success` sobre `f46290c...` |
| Canary rollover | Continuación automática T1→T2 en la misma sesión: éxito operacional. Target económico `<25% of tokensBefore`: **NO DEMOSTRADO** (estimación 21,54%; first-prompt context `null`; primer contexto fiable end-of-turn 26,77%). |
| Disposición de routing | Evidencia positiva de V4 parent+writer, pero **no** cualifica `native-v4-heavy` canónico ni lo promueve a default |
| Estado asistencial | sin cambio: sintético/evaluación, no piloto/producción |

## Convención operativa de SHAs

- **Tip Git de `recovery`**: se obtiene live de GitHub. Incluye commits de producto, documentación y administración; por tanto puede moverse sin que cambie el producto.
- **Último HEAD de producto publicado**: último commit/merge que cambia producto funcional o snapshot distribuible. Esta es la referencia estable para afirmar qué entrega está publicada.
- **HEAD clínico funcional congelado**: SHA que un snapshot fija en `source_sha` / `last_functional_sha`.
- Un merge `documentation-only` **no** obliga a reconciliar de nuevo los HEADs funcionales. Solo se actualizan si el diff publicado cambia producto/snapshot o si cambia el manifest funcional.
- Incidencia administrativa al iniciar #349: creación accidental de `__noop__` y eliminación inmediata mediante commit normal. Compare `a7428b...→91e0049...` = 2 commits, `files: []`; cero cambio neto de árbol. Detalle completo en #349.

## Última evolución — Unified Clinical Intake A/B/Train C

| Frontera | Autoridad / entrega | Estado real |
| --- | --- | --- |
| Baseline T1–T10 + hardening | #323 / PR #324 → `bff76ff7095fb568948b1bfbc6288df551971add` | Histórico publicado y preservado en la cadena actual |
| Cáceres review 0.5 | #331 / PR #333 → `2ee9c54f310ac8e32d8928b756f007efa0d56b0d` | Snapshot 0.5 publicado desde source `456454172b67a00ea5ba9583f14999a4be5ff0c2`; no espejo automático del recovery posterior |
| A — auto-reveal | #334 / PR #335 → candidate `ad4088c3689b761d695799c86295207653fcab0f`, merge `7b99eda50e9f7b92cf921d0d6e1bd2090ca917f7` | MERGED_AND_VERIFIED; presentación Dermatología/patología, sin prewrite clínico |
| B — D17_EXT_V1 | #336 / PR #337 → candidate `773f66f85081c6d9476599797a289a466adbfed7`, merge `775a8c08c00d3b678838d71b958775bba726009b` | MERGED_AND_VERIFIED; producer→segmenter→parser clínico extendido, backward-compatible y fail-closed |
| Train C parent | #338 | CLOSED/completed; final verifier PASS |
| C1 | #339 → `bbf898bc789840c0b4bc7635636b81d740afe60e` | CLOSED/completed; 39 conceptos clínicos/comorbilidades con proposals/aplicación protegida |
| C2 | #340 → `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` | CLOSED/completed; superficie compartida analítica/vacunación + 7 conceptos seguros |
| Promoción Train C | #342 / PR #341 → `e1120ba85817a1807cea8c1e938867ad778921f4` | MERGED_AND_VERIFIED; #342 CLOSED/completed; smoke post-merge #1019 success |
| Reconciliación documental post Train C | #343 / PR #344 → `79c9fd37f2a631a4316439013e4b0632268cf90a` | MERGED_AND_VERIFIED; #343 CLOSED/completed; smoke #1022 success; documentation-only |
| Promoción Cáceres 0.6 | #345 / PR #346 → candidate `749c82409a415e800500b39018027b189fd6a131`, merge `19d10c9abefb7b25130b4b17e3289d54a17315ee` | MERGED_AND_VERIFIED; #345 CLOSED/completed; smoke #1025 success; Pages #219 success |
| Reconciliación documental post 0.6 | #347 / PR #348 → `a7428b0195435477bfa86e779b63ea95955ed723` | MERGED_AND_VERIFIED; #347 CLOSED/completed; smoke #1028 success; documentation-only |
| Convención HEAD/tip Git | #349 / PR #350 → merge `5150eab2e02ac029aff0cec021b35722725ff318` | MERGED_AND_VERIFIED; #349 CLOSED/completed; taxonomía estable publicada |
| Acceso estratificación SEFH | #362 / PR #363 → merge `6c36ce5d1126b3032937e8e3627b045e1e2ea081` | MERGED_AND_VERIFIED; link SEFH en Primera Visita/Seguimiento; smoke post-merge success |
| Train Enfermería v6 | #364; N1 #365 `6f0cbae`; N2 #366 `7a61421`; N3 #367 `79a1385`; N4 `731211e`; N5 #368 source `4a68006` | COMPLETED_AND_PUBLISHED vía promoción limpia #369 / PR #370 |
| Promoción Enfermería v6 | #369 / PR #370 → candidate `a4b49ca62c90307529a935cbcadcf740af49d345`, merge `e058f0d25a1856ace4a8bec63dfca53584e8a9cb` | MERGED_AND_VERIFIED; smoke #1050 + Pages success; `main`/Cáceres intactos |
| Reconciliación documental + deuda | #371 / PR #372 → merge `92c378b...` | MERGED; registro vivo de deuda creado |
| Reconciliación runtime nativo PROMueve | PR #373 → merge `3aa34825...` | MERGED; AGENTS/CODING_STANDARDS/README/TODO y skills locales alineados con Pi + Gentle nativo |
| Identidad Engram PROMueve | PR #375 → merge `b09bbf72...` | MERGED; identidad canónica de proyecto fijada sin cambiar producto clínico |
| FH-DEBT-002/003 | PR #374 → merge `771fb80c...` | MERGED_AND_VERIFIED; 718/718 deterministas, native review APPROVED/burned, smoke + Pages success |

### Garantías clínicas publicadas

- `REQUESTED_TREATMENT` sigue separado de `VALIDATED_TREATMENT`; pegar/importar nunca valida.
- Ausencia/desmarcado no se convierte en NO y nunca limpia un valor existente.
- Valores existentes requieren reemplazo profesional explícito; reparse/stale-stage conservan sus guards.
- C1 aplica únicamente los 39 mappings cerrados; composites no se trocean.
- C2 aplica únicamente 7 conceptos seguros; `derma_viral_serologies` combinado sigue `NONE/NO_PROPOSAL` y no se reparte a VHB/VHC/VIH.
- No inferencia desde nombre genérico de fármaco, historial o dato ausente. La reconciliación #501 permite **propuestas editables de ficha técnica** en Farmacia sólo tras selección explícita de medicamento/presentación CIMA y contexto explícito cuando proceda; no equivale a validación ni autoriza sobrescritura de ajustes profesionales.
- Intake no crea/selecciona paciente ni escribe tratamiento validado.
- Enfermería v6: matching exclusivamente por `solicitud_id`; `OK FARMACIA` no valida; `validado`/`denegado` terminales solo desde acto FH explícito; misma CIP con IDs distintos no se colapsa.

### Evidencia vigente

- Train C final verifier: oracle final PASS + T10 `14/14 PASS` una sola vez, árbol limpio, cero mutación del verifier.
- Auditoría independiente pre-PR #341 sobre candidate exacto: C1 `147/147`, C2 `134/134`, C2 browser oracle `5/5`, final oracle PASS, IDs DOM duplicados `0`, `git diff --check` PASS.
- PR #341 head smoke #1018 `success`; post-merge recovery smoke #1019 `success`.
- QA manual humana sobre recovery con plantilla D17_EXT_V1 correcta confirmó auto-reveal + hidratación C1/C2.
- Promoción 0.6: builder reproducible, checker 16/16, `BADAJOZ_ZERO`, oracle integrado sobre snapshot PASS, T10 snapshot 14/14, PR #346 head smoke #1024 `success`, post-merge smoke #1025 `success` y Pages #219 `success`.
- PR #370: persistence 57/0, handoff browser 22/0, reconciliación 75/0 + browser 70/0, smoke 49/0; post-merge smoke #1050 success y Pages success; fixtures sintéticos, sin datos reales.
- PR #374: oracle 65/0 + v6 111/0 + Enfermería 95/0 + Validación 109/0 + reconciliación 75/0 + transporte 79/0 + persistencia 57/0 + common 127/0 = 718/718; review `review-bf84091b8c28d96d` APPROVED/burned; post-merge smoke y Pages success; sin cambio UI ni snapshot.
- Todo lo anterior usa fixtures/datos sintéticos; no acredita piloto ni producción.

### Snapshot y paquete

`CÁCERES-REVIEW-0.6` es el snapshot estable vigente y fue promovido explícitamente por #345/#346 desde el HEAD clínico funcional `e1120ba85817a1807cea8c1e938867ad778921f4`. Su publicación no convierte el entorno en piloto/producción. El paquete externo/workbooks permanece en su freeze sintético anterior y no se refreezea por 0.6.

---

## Leyenda

| Símbolo | Estado |
| --- | --- |
| ✅ Merged | Incorporada a la rama base |
| ✅ MERGED_AND_VERIFIED | Fusionada en la rama indicada y verificada en el alcance de su WO; la visibilidad vigente se consulta en el estado publicado superior |
| 📋 Ready for review | Publicada en rama de trabajo y pendiente de revisión/merge |
| 🔄 Superseded | Sustituida funcional o documentalmente por otra WO |
| 🟢 Validated | Validada en una candidata histórica no integrada |
| ✅ Completada | Trabajo finalizado sin merge aplicable |
| 📋 Draft | Borrador no apto para merge |
| ⏸️ Pausada | Detenida hasta decisión humana |
| 🔴 Bloqueada | No puede continuar sin resolver una incidencia |
| ❌ Descartada | No se ejecutará |

> Un merge técnico no demuestra por sí solo corrección funcional. Cuando la QA humana contradice los tests, el tablero refleja la adjudicación funcional real.

---

## Work orders

| WO | Título | Estado | Rama | Merge/Commit | Notas |
| --- | --- | --- | --- | --- | --- |
| **WO-DOC-NEXUS-PRODUCT-RECONCILIATION-20261003 (#501)** | Reconciliar revisión manual FH + reunión FH/Derma + nueva dirección Nexus pre-Badajoz | 📋 Ready for review / publicación consultar GitHub live | `docs/product-reconciliation-501-20261003` | documento vivo + INDEX + WOS; PR/merge consultar live | Sólo documentación. `status:approved`; base `50b48b41...`; prioridad de producto `UNDER_READJUDICATION`; siguiente acción ledger Reuma → checklist/Q&A Nexus → adjudicación pre-8. Cero runtime, #446/F4.5/F4.6/ADRs intactos. |
| **TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11 (#487)** | F4.4 Pharmacy Act v1: contrato común independiente de transporte + payloads independientes Validación/Primera Visita/Seguimiento (sin cutover/UI/delivery/persistencia) | ✅ MERGED_AND_VERIFIED · PR #490 (CI post-merge run `36880209718` success) | `work/nexus-f44-act-contract-487-20260930` | T1 #488 `98c7aa76` (oracle 243/0); T2 #489 `b73e1e7e` (oracle 145/0); correction candidate `535c65567bc8ca0aef7358f97f99d97520b0ff20` (own-property/prototype hardening) → merge de producto `3bf45760a27630823b61b0d19da8b64aeb060693` | Contrato puro: C-080 `review-707b45b6c20d35ee` APPROVED + acknowledged + burned; tree merge = tree candidate `bc8bc378...`; #487/#488/#489 CLOSED/completed; F4.4 COMPLETADA/PUBLICADA; F4.5/F4.6 no ejecutadas; #446 y su hold intactos; evaluación sintética, no piloto/producción. |
| **TRAIN-NEXUS-F4.3-POSTMERGE-CHECKPOINT-10 (#479)** | Checkpoint visual post-F4.3 + reconciliación documental en modo registro honesto del blocker | ✅ T1/T2 COMPLETED · PR #483 (estado Git: consultar live) | `work/nexus-f43-postmerge-checkpoint10-479-20260930` | T1 #480 `eb0e524` (checkpoint `HUMAN_STOP_BLOCKER` por PV-001, follow-up aprobado #482); T2 #481 `835dda2`; PR #483 | Sólo documentación/evidencia: checkpoint #480 + INDEX/WOS/Foundation Plan/auditoría Sil. Cero runtime. Verificación: `verify:nexus` PASS, `git diff --check` PASS. Estado de merge: consultar GitHub live. PV-001 = `RESOLVED/PUBLISHED` por #482 / PR #484. |
| **TRAIN-NEXUS-FOUNDATION-02 (#399)** | Hardening F1.2A/F2.3, PlatformContext F3.1, oracle export Reuma F1.3B, CI F1.2B + correcciones post-Promotion-FAIL | ✅ MERGED_AND_VERIFIED | `work/nexus-foundation-02-399-20260924` | candidate final `bcb94f1b35e693d59a5ba0c305bb0ba03e4fd9f3` → merge `f1bc9ce7f4b3c10508ef9f9d5e13366f3192fe4f` (PR #400); WUs #394 `87de0c0`, #395 `c9b154e`, #398-A `e9e322d`, #398-B `13108b2`, #396-A `0ca2868`, #396-B `cd2451b`, #397 `aa52b60`; corrections #398-C `109b28d`, #396-C `80fdd08`, F3.1-D `4bebeeb`, F3.1-E `4ee94c2` | Promotion Review round 1 FAIL sobre `9e670bf` y round 2 FAIL sobre `858681f`, ambas atendidas; Promotion Review v1 final sobre `bcb94f1` **PASS** (Spec/clinical, Standards/maintainability, Adversarial/safety; 0 blockers). Tree del merge = tree del candidate revisado `5e873df0...`; `npm run verify:nexus` post-merge PASS. `NEXUS-DEBT-006` RESOLVED; findings no bloqueantes preservados como `NEXUS-DEBT-007/008`. Sin browser QA ni declaración de piloto/producción. |
| **WO-NEXUS-F3.2 (#403)** | PROMueve Nexus Home + native-v4-heavy field canary (retry) | ✅ MERGED / estado histórico F3.2; D011 resuelta posteriormente | `work/nexus-home-f3-2-403-v4retry-20260925` | WU-A `172fb2b` (review `review-16e988d40fb1d7a6` APPROVED + burned); WU-B `17f9db6` (review `review-98506c59b732ce1d` APPROVED + burned); candidate `61e6e9c` → merge `e9096e9` (PR #404), tree `c346893...` idéntico | Pre-merge Home 11/11 + nav 11/11 + `verify:nexus` PASS. El fresh checkout post-#404 expuso D011 EOL; D009/D010 quedaron en #405. Todo D009/D010/D011 fue resuelto posteriormente por TRAIN #409 / PR #415. Esta fila conserva la evidencia histórica de F3.2; no acredita por sí sola F3.3/F3.4 ni piloto/producción. Ficha: [`NEXUS_HOME_F3.2.md`](../engineering/NEXUS_HOME_F3.2.md). |
| **WO-NEXUS-HOME-QUALIFICATION-03 (#409)** | Train de cualificación Home: F3.3 browser + F3.4 release sintético + cierre D008/D009/D010/D011 | ✅ MERGED_AND_VERIFIED | `work/nexus-home-qualification-03-409-20260925` | Q1 #410 `74f9963`; Q2 #411 `49deb61`; Q3 #412 `b32ab74`; Q4 #413 `7c73f37`; Q5a #414 `2407532`; Q5b #414 `612bc03`; candidate `9004b443619bc2eb8002165de6261176e27db8e9` → merge `6e6413c4e9cb163f11ee193c24c8f287c9ebdc36` (PR #415), tree `1d6834f59c38bd90e883174a773579cd20c474ee` idéntico | Fresh worktree post-merge: `npm ci` + `npm run verify:nexus` PASS; Home 11/11; nav 11/11; validator hardening 14/0; release 13/0; browser F3.3 8/0 y artefacto F3.4 5/0 en Chromium `151.0.7922.34`; candidate CI run `36150041100` success. Native reviews Q2/Q4/Q5a/Q5b APPROVED+burned; Q3 `review_due=false`. Promotion Review independiente final: PASS, 0 blockers; reviewer real elegido por la operadora `nan/deepseek-v4-flash` high con manifest heredado aún nombrando `openai-codex/gpt-5.6-sol` (desviación de metadata aceptada explícitamente, review no repetida). N2 documental cerrado por #416; N1/N3 preservados como `NEXUS-DEBT-012/013`. Evidencia sintética/determinista/browser-qualified publicada; **no piloto/producción**; Cáceres/legacy intactos. Ficha: [`NEXUS_HOME_F3.4.md`](../engineering/NEXUS_HOME_F3.4.md). |
| **TRAIN-NEXUS-V4-ROLLOVER-CANARY-04 (#419)** | D012/D013 hardening + canary one-touch T1→T2 | ✅ MERGED_AND_VERIFIED (producto) / canary económico no demostrado | `work/nexus-v4-rollover-canary-04-419-20260926` | T1 #420 `9c2b9d6`; T2 #421 `8bad5f9`; docs `133c978`; candidate `133c978a...` → merge `f46290cd...` (PR #422) | D012/D013 publicados; post-merge Fast gates + Deterministic suite success. Rollover automático funcionó en misma sesión; estimación post-compact 21,54%, first-prompt metric no disponible y primer contexto fiable 26,77%; no promover profile/canary. |
| **WO-DOC-NEXUS-POST-419-RECONCILIATION (#423)** | Reconciliar publicación #422, autoridad Nexus y progreso F0–F7 | ✅ MERGED / reconciled | `docs/nexus-postmerge-reconciliation-419-20260926` | candidate `4944373...` → merge `b57d6a48...` (PR #424) | Solo documentación: INDEX/WOS/Foundation plan/debt register + WO. Closeout administrativo bajo el mismo #423; GitHub live resuelve el estado final del issue. No runtime/clínica/main/recovery/snapshots. |
| **TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06 (#442)** | PCR/unidades → autocomplete farmacológico → prebiológico mínimo + correctiva de categorías | ✅ MERGED_AND_VERIFIED | `work/nexus-reuma-train06-20260928` | #443 `636f838...`; #444 `fc598166...`; #445 `4eeaf1f...`; #447 `6b8582a...`; candidate `6b8582a158bdcd6f8e7e425e0e83bc6eb27ca952` → merge `25e57b250ec3d7cc0fc80a501fa308a40620f902` (PR #449) | Oráculos PCR 27/0, catálogo 15/0, categorías 33/0, prebiológico 16/0; Chromium 32/0 + 46/0 + 33/0; `verify:nexus` PASS; CI post-merge success; #448/#450 abiertas no bloqueantes; evaluación sintética, no piloto/producción. |
