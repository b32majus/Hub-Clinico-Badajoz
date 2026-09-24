# Estado vivo de producto — Farmacia recovery y Cáceres 0.6 — actualizado 2026-09-24

**Ámbito de autoridad:** este documento mantiene el estado funcional publicado de Farmacia/recovery y la trazabilidad del snapshot `CÁCERES-REVIEW-0.6`; no decide por sí solo la autoridad canónica de nuevo desarrollo Nexus. Durante F0.2, esa autoridad se resuelve por PR #381: sin merge → recovery ACTIVE / Nexus CANDIDATE; desde merge autorizado → Nexus ACTIVE / recovery HISTORICAL para nuevo desarrollo. El snapshot conserva su autoridad de artefacto propia.

| Metadato | Valor |
| --- | --- |
| Repositorio | `b32majus/Hub-Clinico-Badajoz` |
| Línea Farmacia documentada | `recovery/farmacia-pr-replay-20260727`; conserva la historia funcional publicada y pasa de ACTIVE a HISTORICAL para nuevo desarrollo únicamente cuando PR #381 se mergee de forma autorizada |
| Tip Git de recovery (volátil) | Consultar GitHub live; verificado 2026-09-24 tras PR #374: `771fb80c5081aa974b86d6a0119ab30059970a25` |
| Último HEAD de producto publicado | `771fb80c5081aa974b86d6a0119ab30059970a25` — merge PR #374 |
| HEAD clínico funcional | `e1120ba85817a1807cea8c1e938867ad778921f4` — merge PR #341; congelado por 0.6 |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.6` |
| Candidate snapshot | `749c82409a415e800500b39018027b189fd6a131` |
| Source / last-functional snapshot | `e1120ba85817a1807cea8c1e938867ad778921f4` |
| Promoción snapshot | issue #345 / PR #346 |
| CI post-merge | Farmacia smoke run `35936756453` `success`; Pages build/deployment run `35936755598` `success` sobre `771fb80c...` |
| Uso | Evaluación/demo con datos sintéticos |
| Piloto / producción | No acreditados |

## Convención de estado Git y producto

Este documento distingue tres referencias que no deben colapsarse en un único “HEAD”:

1. **Tip Git de `recovery`**: último commit de la rama. Es volátil y debe consultarse live en GitHub; puede cambiar por documentación o tareas administrativas sin cambio funcional.
2. **Último HEAD de producto publicado**: último commit/merge que modificó código funcional o snapshot distribuible. En este estado es `771fb80c5081aa974b86d6a0119ab30059970a25` (PR #374).
3. **HEAD clínico funcional congelado**: SHA que el snapshot declara como `source_sha` / `last_functional_sha`. Para Cáceres 0.6 es `e1120ba85817a1807cea8c1e938867ad778921f4`.

**Regla estable:** un merge `documentation-only` puede mover el tip Git, pero no cambia por sí mismo el HEAD de producto ni el HEAD clínico funcional. No debe abrirse una nueva reconciliación documental únicamente para actualizar el tip tras un merge documental.

## 1. Estado publicado

La línea regional de Farmacia conserva A + B + Train C y ha avanzado además con acceso SEFH y con Enfermería v6/reconciliación por `solicitud_id`. `CÁCERES-REVIEW-0.6` sigue congelado en el producto anterior y ya no representa automáticamente el HEAD regional actual.

- **A — #334 / PR #335:** auto-reveal de Dermatología/patología desde e-Orden reconocida, sin preescritura clínica.
- **B — #336 / PR #337:** `D17_EXT_V1` transporta de forma versionada y fail-closed la información clínica explícita de Dermatología.
- **Train C — #338/#339/#340, promovido por #342/#341:** 39 conceptos clínicos/comorbilidades + 7 conceptos seguros de analítica/vacunación, con aplicación profesional protegida.
- **Cáceres 0.6 — #345 / PR #346:** snapshot reproducible que incorpora A+B+C y se publica en `previews/caceres-fh/`.
- **SEFH — #362 / PR #363:** acceso externo a herramienta de estratificación desde Primera Visita y Seguimiento; merge `6c36ce5...`.
- **Enfermería v6 — #364–#370:** importación multihoja, `solicitud_id`, transporte a Validación/Excel FH, reconciliación exacta, handoff Inicio→Validación y persistencia fail-closed; merge PR #370 `e058f0d...`.
- **Robustez hojas v6 — PR #374:** resolución única de nombres físicos/canónicos, política cerrada de aliases y rechazo fail-closed de duplicados ambiguos; merge `771fb80c...`.

El último HEAD de producto regional es `771fb80c...`. El producto clínico que 0.6 congela sigue siendo `e1120ba...`; esta diferencia es ahora una **desalineación deliberada de artefactos**, no un error: recovery avanza y Cáceres solo cambia mediante promoción/refreeze explícito.

## 2. Qué está demostrado

- QA manual humana sobre recovery con la plantilla `D17_EXT_V1` correcta confirmó auto-reveal e hidratación de datos clínicos, comorbilidades y analítica/vacunación mediante el flujo soportado.
- Builder 0.6 reproducible y segunda regeneración byte-identical.
- Checker del snapshot: `16/16 PASS`; inventario fijo y hashes/manifest exactos.
- `BADAJOZ_ZERO=PASS` dentro del snapshot.
- Oracle integrado ejecutado contra el propio snapshot 0.6: productor real → preview → auto-reveal → C1/C2 → apply soportado = PASS.
- T10 sobre root temporal del snapshot: `14/14 PASS`; el fixture de test requerido por D12 se añadió solo al root temporal de QA y no forma parte del snapshot distribuible.
- PR #346 head smoke #1024 `success`; post-merge smoke #1025 `success`; Pages #219 `success`.
- PR #370 candidate: persistence 57/0, handoff browser 22/0, reconciliación 75/0 + browser 70/0, smoke 49/0, console/page errors 0; post-merge smoke #1050 y Pages build/deployment `success`.
- PR #374: oracle 65/0 + regresiones v6 111/0, Enfermería 95/0, Validación 109/0, reconciliación 75/0, transporte 79/0, persistencia 57/0 y common 127/0 = 718/718; native review `review-bf84091b8c28d96d` APPROVED y `authority=burned`; smoke y Pages post-merge `success`.
- Pages genérica post-merge respondió HTTP 200 y sirve código con `ENFERMERIA_V6_CLINICAL_SHEETS` y `RECONCILIATION_CONFLICT`.
- El enlace estable de Cáceres responde 200 y sirve `CÁCERES-REVIEW-0.6`.

## 3. Garantías clínicas vigentes

- Tratamiento solicitado/importado ≠ tratamiento validado; pegar/importar nunca valida.
- Campo ausente o checkbox desmarcado no equivale a NO y no limpia valores existentes.
- Valores existentes requieren decisión profesional explícita para reemplazo.
- No inferir dosis, vía, pauta, presentación, inducción, duración, renovación, switch, add-on, causalidad, resultado de validación o línea terapéutica desde fármaco, CIMA, catálogo, historial o dato ausente.
- Los compuestos de psoriasis/DA/otros biológicos no se trocean por inferencia.
- `derma_viral_serologies` combinado permanece no escribible y no se reparte a VHB/VHC/VIH.
- Intake no crea/selecciona paciente ni convierte el paste en persistencia clínica.
- Enfermería v6: `OK FARMACIA` no equivale a validado; matching exclusivamente por `solicitud_id`; un mismo CIP con IDs distintos permanece independiente; ausencia de identidad nunca se sustituye por heurística.

## 4. Cáceres 0.6

El manifest publicado de `previews/caceres-fh/deployment-manifest.json` declara:

- `version`: `CÁCERES-REVIEW-0.6`;
- `source_sha`: `e1120ba85817a1807cea8c1e938867ad778921f4`;
- `last_functional_sha`: `e1120ba85817a1807cea8c1e938867ad778921f4`;
- promoción: issue #345 / PR #346;
- candidate: `749c82409a415e800500b39018027b189fd6a131`;
- merge de publicación: `19d10c9abefb7b25130b4b17e3289d54a17315ee`.

0.6 es el snapshot estable vigente para evaluación sintética en Cáceres. No es un espejo automático de recovery y **no contiene** por defecto SEFH #363, Enfermería v6 #370 ni la robustez de hojas v6 #374; cualquier 0.7 o cambio posterior requiere nueva promoción explícita.

## 5. Paquete externo

El evaluation package/workbooks/manifest/ZIP permanece en su freeze sintético anterior (`READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`). La promoción 0.6 no lo refreezea ni lo convierte en representación automática del snapshot 0.6.

## 6. Siguiente frontera

1. Continuar evaluación humana con `CÁCERES-REVIEW-0.6` y datos sintéticos, sabiendo que permanece congelado respecto a recovery.
2. Usar [`FARMACIA_DEBT_REGISTER.md`](./FARMACIA_DEBT_REGISTER.md) como registro vivo de deuda aceptada; FH-DEBT-002/003 están resueltos por PR #374 y FH-DEBT-001 debe resolverse antes de piloto real.
3. Registrar cualquier nuevo defecto reproducible del flujo soportado como WO atómica y, si se acepta como deuda, añadirlo al registro vivo.
4. Decidir por separado si se necesita refreeze de Cáceres o del paquete externo/workbooks.
5. Cualquier piloto real o producción requiere autorización, gobernanza y validación específicas; recovery actual no los acredita.

## 7. Históricos

`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260907.md` pasa a ser histórico: describe correctamente el estado previo a la promoción 0.6, cuando Cáceres 0.5 seguía congelado. También se conservan los estados de 20260731 y freezes anteriores como trazabilidad.

Cuando exista contradicción sobre autoridad canónica de desarrollo, prevalecen la WO/instrucción vigente, GitHub live, `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md`. Este documento sigue siendo autoridad de estado funcional Farmacia/recovery y del snapshot Cáceres dentro de ese ámbito, no de la línea canónica Nexus tras la activación de #381.
