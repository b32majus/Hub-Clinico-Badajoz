# Auditoría final — Unified Clinical Intake V0 — train T8→T9→T10

> **AUDITORÍA HISTÓRICA DEL TRAIN ORIGINAL.** Las referencias de esta auditoría a `MERGE_AUTHORIZED=NO`, recovery `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` y ausencia de PR/merge describen correctamente el cierre del train en ese momento. El producto fue reparado, compuesto y publicado después; ver §11.
**Fecha:** 2026-09-06
**WO documental:** #315 — `WO-DOC-FH-UNIFIED-INTAKE-FINAL-RECONCILIATION-01`
**Repo:** `b32majus/Hub-Clinico-Badajoz`
**Producto auditado:** branch `work/hermes/fh-t8-reparse-global-20260906`, HEAD `fbaaef098e96979ecce39361eacbda18b8d3e199`
**Resultado:** `PRODUCT_TRAIN=PASS` · `UNATTENDED_E2E=PASS` · `MERGE_AUTHORIZED=NO`

## 1. Alcance y fuentes

Esta auditoría separa producto, ejecución unattended y estado publicado. No convierte un checkpoint remoto de trabajo en merge, demo publicada, piloto ni producción.

Fuentes verificadas:

- GitHub live: parent #292, tickets #293–#302, commits T8 `08703a6…` y T9 `fbaaef0…`, ramas `main`, recovery y train.
- Sesiones Pi JSONL del supervisor `uci-overnight-sup` y workers `t8-ov-worker`, `t9-ov-worker`, `t10-ov-worker`.
- Frozen oracles T8/T9/T10, con hashes verificados byte-identical.
- Reejecución independiente post-train del gate final T10 sobre el HEAD remoto durable.

No se usaron datos reales de pacientes.

## 2. Topología y routing efectivo

| Rol | Sesión | Modelo efectivo | Thinking | Observación |
|---|---|---|---|---|
| Supervisor | `uci-overnight-sup` | `commandcode/deepseek/deepseek-v4-flash` | medium | Persistente durante todo el train; no implementa producto |
| T8 | `t8-ov-worker` | `commandcode/deepseek/deepseek-v4-flash` | high | Worker fresco |
| T9 | `t9-ov-worker` | `commandcode/deepseek/deepseek-v4-flash` | high | Worker fresco |
| T10 | `t10-ov-worker` | `commandcode/deepseek/deepseek-v4-flash` | high | Worker fresco; verificación-only |

Cada sesión registra un único `model_change`; no hubo fallback ni drift de modelo. El reviewer nativo operó con lens `review-reliability` mediante transporte `pi_host_relay`; la evidencia del train no expone una identidad de modelo reviewer separada y no se infiere una.

## 3. Tiempos reales

Tiempos derivados de timestamps de sesión; UTC.

| Etapa | Prompt worker | FINAL worker | Duración worker | Cierre GitHub | Prompt→cierre |
|---|---:|---:|---:|---:|---:|
| T8 #300 | 00:28:28 | 01:11:53 | **43m 25s** | 01:12:30 | **44m 02s** |
| T9 #301 | 01:13:06 | 01:36:23 | **23m 17s** | 01:36:36 | **23m 30s** |
| T10 #302 | 01:37:10 | 01:40:33 | **3m 23s** | 01:42:10 | **4m 59s** |

Supervisor: primer prompt 00:27:05 → cierre de sesión 01:42:21 = **75m 16s**.
Suma de tiempo activo de workers = **70m 05s**. La diferencia atribuible a preflight/transiciones/reconciliación del supervisor es ≈ **5m 10s** (≈6,9% del wall-clock del supervisor).

Transición post-cierre T8→prompt T9 ≈36s; T9→prompt T10 ≈35s. No hubo espera humana entre tickets.

Como ventana de preparación medible, #313 se creó a 00:14:02 y el supervisor arrancó a 00:27:05: ≈13m de preparación independiente de oracles/branch antes del train. Desde ese primer artefacto auditable hasta el cierre #302: ≈88m.

## 4. Ledger por ticket

| Ticket | START_HEAD | FINAL_HEAD / checkpoint | Oracle / QA | RDD | Publicación | Veredicto |
|---|---|---|---|---|---|---|
| T8 #300 | `d26c2e1…` | `08703a6…` | frozen T8 7/7; lifecycle 28/28; browser 4/4; predecesores verdes | `review-6443371f4339ad20`; APPROVED → ack/burn | push normal, clean local=remote | ACCEPTED |
| T9 #301 | `08703a6…` | `fbaaef0…` | frozen T9 3/3; SES pure 49/49; T10 gate 14/14; regresiones verdes | `review-d25a5eb7fd8063a2`; APPROVED → ack/burn | push normal, clean local=remote | ACCEPTED |
| T10 #302 | `fbaaef0…` | `fbaaef0…` | frozen final gate 14/14; T1 real→intake; D12; fail-attribution | N/A: no candidato mutado | no commit artificial | ACCEPTED |

T10 fue correctamente tratado como gate, no como repair ticket.

## 5. Gentle RDD y resiliencia

T8 necesitó dos reviewer model runs para un único slot `review-reliability`:

1. primer run autorizado → payload reviewer incompleto/malformed → admission `submission-refused`; **zero authority progress** y slot reofrecido;
2. retry acotado, autorizado de nuevo → resultado válido → APPROVED → acknowledge/burn.

T9 necesitó un único reviewer model run → APPROVED → acknowledge/burn. Produjo `R3-001`, reliability WARNING informativo en `scripts/fh_intake_review_ui.js:280`, sin correction transition y sin reabrir review.

Total T8+T9: **3 reviewer model runs, 2 resultados aprobados y 1 rechazo de admisión**. La tasa de run no útil fue 1/3 (33,3%). El fallo fue recuperable por el protocolo bounded-retry y no provocó mutación no autorizada, pérdida de authority ni intervención humana.

T10 no abrió RDD porque no hubo cambio de producto/harness; crear un commit vacío habría sido ruido.

## 6. Telemetría de sesiones

Los siguientes costes son el `cost.total` metered reportado por la metadata de sesión Pi; **no equivalen necesariamente a una factura real de la suscripción/proveedor**.

| Sesión | input | output | cacheRead | reasoning | cost metered |
|---|---:|---:|---:|---:|---:|
| Supervisor | 152.349 | 33.367 | 4.850.432 | 9.637 | $0,0443 |
| T8 | 502.555 | 236.457 | 32.684.544 | 161.770 | $0,2281 |
| T9 | 233.320 | 66.056 | 53.379.712 | 12.941 | $0,2006 |
| T10 | 35.050 | 13.557 | 1.170.304 | 5.965 | $0,0120 |
| **Total** | **923.274** | **349.437** | **92.084.992** | **190.313** | **$0,4849** |

La carga se concentró en T8/T9; T10 fue muy barato porque reutilizó el gate ya congelado y no implementó nada.

## 7. Intervención externa y disciplina del train

- Intervenciones humanas durante T8→T10 tras el lanzamiento: **0**.
- Supervisor persistente + **1 worker fresco por ticket**: PASS.
- FINAL por `pi-intercom`: PASS en T8, T9 y T10.
- Cierre/rediscovery entre tickets: PASS.
- `TRAIN_STOP_AFTER_T10=YES`: PASS.
- PR / merge / force-push / recovery / main: **0 cambios**.
- `main` sigue `a25cccb8…`; recovery Farmacia sigue `9fd6888b…`; no existe PR para la rama del train.

## 8. Auditoría independiente post-train

Sobre el HEAD remoto durable `fbaaef0…` se reejecutó el frozen principal gate sin mutar nada:

- T1 checkpoint pin: PASS.
- T2 segmenter: PASS.
- T3 e-Orden parser: PASS.
- T4 PreSalud parser: PASS.
- T5 pipeline/reconciliation: PASS.
- T6 preview + identity/source gates: PASS.
- T6/D12 transient-retention: PASS.
- T7 frozen oracle + supported browser QA: PASS.
- T8 frozen oracle: PASS.
- T9 frozen oracle: PASS.
- salida real del formulario T1 → texto D17 canónico → intake soportado → apply: PASS.
- fail-attribution intencional T10: PASS.

Resultado independiente: **`T10 FINAL GATE PASS 14 mapped rows`, exit 0**.

Hashes congelados re-verificados:

- T8: `5945f18fdcb51abeafd698ba62f6af65d6b479311a9a66110a681d17ca113579`
- T9: `38d04f1f5327a25c707a25bc9f5fff7b2e6c2372caf512475fd4277b1fe71931`
- T10: `b63db081749edbe51ec187c7fabd77bae5a4893e2a9f78fa23773627613774da`

## 9. Findings

**F-01 — PRODUCT BLOCKER: ninguno.** No se detectó defecto clínico/funcional bloqueante en el alcance T8→T10.

**F-02 — Reviewer admission seam: deuda no bloqueante.** T8 sufrió un payload reviewer malformed; el bounded retry funcionó exactamente como debía. El seam ha mejorado, pero no es todavía error-free.

**F-03 — R3-001 T9: informativo.** El reviewer señaló una WARNING reliability en `fh_intake_review_ui.js:280`. El gate real demuestra el comportamiento actual con controles presentes y persistencia/restauración. No se repara dentro de esta reconciliación; cualquier hardening futuro debe ser WO separada.

**F-04 — Ergonomía Atenea: startup check no puramente event-driven.** El supervisor usó una espera breve de arranque antes de verificar el worker. No afectó al producto ni exigió intervención humana, pero debe quedar como deuda de harness, no como patrón deseado.

**F-05 — Drift documental/tracker: confirmado.** Tras el train, `docs/INDEX.md` y `WORK_ORDER_STATUS.md` seguían diciendo T6 frontier/T7–T10 bloqueados, y #293/#295/#296/#297 seguían abiertos pese a checkpoints aceptados. Esta WO existe para reconciliar esa verdad; no es fallo del producto.

## 10. Veredicto

`PRODUCT_TRAIN=PASS`
`UNATTENDED_E2E=PASS`
`CLINICAL_SAFETY_GATE=PASS`
`EXTERNAL_TOUCH_DURING_TRAIN=0`
`MERGE_AUTHORIZED=NO`
`PILOT_READY_CLAIM=NO`
`PRODUCTION_READY_CLAIM=NO`

El resultado demuestra un train multi-ticket autónomo completo sobre checkpoints remotos duraderos, con fresh-worker progression, RDD nativo, publicación normal, verificación final y STOP correcto. La promoción/merge sigue siendo una frontera humana separada.

---

## 11. Addendum post-train — Repair C, hardening, composición y publicación

Este addendum se incorpora por la WO #325 y **no reescribe** los tiempos, routing, RDD, telemetría ni findings observados durante el train original.

| Hito posterior | Estado verificado |
|---|---|
| Repair C #317 | `d6d4bac8410ddd50ae66fd36e5c1740e65e24c8e`; stale-stage authorization expira al cambiar parse run; independent oracle `14/14 PASS`; Promotion Review PASS |
| SES hardening #319 | `4ec70f54a475e0d25fd1c311feeff9ed61b97428`; SES write-set all-or-nothing/fail-closed; atomic `5/5`, pure `49/49`, frozen `3/3`, T10 `14/14`; Promotion Review PASS |
| Composición #322 | `0916989c02cf4e7e4732fe1246d3c5d76f0bfa63`; T1–T10 físicamente integrados en un único árbol; T1 `18/18` + browser `3/3`, T8 Repair C `14/14`, T9 atomic `5/5`, T10 `14/14`; review independiente PASS |
| Promoción #323 / PR #324 | candidate `b213458214a80e72a02931be0c4ee5007ff030fb`; merge recovery `bff76ff7095fb568948b1bfbc6288df551971add`; hosted Farmacia smoke #994 `success`; post-merge smoke `48/48`, Dashboard `56/56` + Chromium limpio y T10 single-tree `14/14 PASS` |

Estado posterior verificado: `PRODUCT_PUBLISHED_TO_RECOVERY=PASS`. `main` no se modificó. Uso actual: evaluación/demo con datos sintéticos; **no piloto ni producción**.

GitHub Pages sirve el recovery actualizado en la superficie genérica de Farmacia, pero la vertical `/previews/caceres-fh/` permanece en `CÁCERES-REVIEW-0.4` y no fue refrozen por #324. Por tanto, la URL Cáceres de evaluación no debe asumirse equivalente al HEAD recovery.

`POST_TRAIN_PUBLICATION=PASS`
