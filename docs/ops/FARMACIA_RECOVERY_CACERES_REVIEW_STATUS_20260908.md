# Estado vivo — Farmacia recovery y Cáceres 0.6 — 2026-09-08

| Metadato | Valor |
| --- | --- |
| Repositorio | `b32majus/Hub-Clinico-Badajoz` |
| Rama publicada | `recovery/farmacia-pr-replay-20260727` |
| Tip Git de recovery (volátil) | Consultar GitHub live; último verificado al iniciar #349: `91e0049b2bf44b4862e7172f4e6d1cbe92a8efbd` |
| Último HEAD de producto publicado | `19d10c9abefb7b25130b4b17e3289d54a17315ee` — merge PR #346 |
| HEAD clínico funcional | `e1120ba85817a1807cea8c1e938867ad778921f4` — merge PR #341; congelado por 0.6 |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.6` |
| Candidate snapshot | `749c82409a415e800500b39018027b189fd6a131` |
| Source / last-functional snapshot | `e1120ba85817a1807cea8c1e938867ad778921f4` |
| Promoción snapshot | issue #345 / PR #346 |
| CI post-merge | Farmacia smoke #1025 `success`; Pages #219 `success` |
| Uso | Evaluación/demo con datos sintéticos |
| Piloto / producción | No acreditados |

## Convención de estado Git y producto

Este documento distingue tres referencias que no deben colapsarse en un único “HEAD”:

1. **Tip Git de `recovery`**: último commit de la rama. Es volátil y debe consultarse live en GitHub; puede cambiar por documentación o tareas administrativas sin cambio funcional.
2. **Último HEAD de producto publicado**: último commit/merge que modificó código funcional o snapshot distribuible. En este estado es `19d10c9abefb7b25130b4b17e3289d54a17315ee` (PR #346).
3. **HEAD clínico funcional congelado**: SHA que el snapshot declara como `source_sha` / `last_functional_sha`. Para Cáceres 0.6 es `e1120ba85817a1807cea8c1e938867ad778921f4`.

**Regla estable:** un merge `documentation-only` puede mover el tip Git, pero no cambia por sí mismo el HEAD de producto ni el HEAD clínico funcional. No debe abrirse una nueva reconciliación documental únicamente para actualizar el tip tras un merge documental.

## 1. Estado publicado

La línea de Farmacia conserva A + B + Train C y, desde PR #346, el snapshot estable de Cáceres ya representa ese producto funcional.

- **A — #334 / PR #335:** auto-reveal de Dermatología/patología desde e-Orden reconocida, sin preescritura clínica.
- **B — #336 / PR #337:** `D17_EXT_V1` transporta de forma versionada y fail-closed la información clínica explícita de Dermatología.
- **Train C — #338/#339/#340, promovido por #342/#341:** 39 conceptos clínicos/comorbilidades + 7 conceptos seguros de analítica/vacunación, con aplicación profesional protegida.
- **Cáceres 0.6 — #345 / PR #346:** snapshot reproducible que incorpora A+B+C y se publica en `previews/caceres-fh/`.

El tip Git de `recovery` puede ser posterior a `19d10c9...` por merges documentales/administrativos. El último HEAD que cambió producto/snapshot sigue siendo `19d10c9...`, mientras que el producto clínico que 0.6 congela sigue siendo `e1120ba...`. La diferencia es intencional y no representa desalineación funcional.

## 2. Qué está demostrado

- QA manual humana sobre recovery con la plantilla `D17_EXT_V1` correcta confirmó auto-reveal e hidratación de datos clínicos, comorbilidades y analítica/vacunación mediante el flujo soportado.
- Builder 0.6 reproducible y segunda regeneración byte-identical.
- Checker del snapshot: `16/16 PASS`; inventario fijo y hashes/manifest exactos.
- `BADAJOZ_ZERO=PASS` dentro del snapshot.
- Oracle integrado ejecutado contra el propio snapshot 0.6: productor real → preview → auto-reveal → C1/C2 → apply soportado = PASS.
- T10 sobre root temporal del snapshot: `14/14 PASS`; el fixture de test requerido por D12 se añadió solo al root temporal de QA y no forma parte del snapshot distribuible.
- PR #346 head smoke #1024 `success`; post-merge smoke #1025 `success`; Pages #219 `success`.
- El enlace estable de Cáceres responde 200 y sirve `CÁCERES-REVIEW-0.6`.

## 3. Garantías clínicas vigentes

- Tratamiento solicitado/importado ≠ tratamiento validado; pegar/importar nunca valida.
- Campo ausente o checkbox desmarcado no equivale a NO y no limpia valores existentes.
- Valores existentes requieren decisión profesional explícita para reemplazo.
- No inferir dosis, vía, pauta, presentación, inducción, duración, renovación, switch, add-on, causalidad, resultado de validación o línea terapéutica desde fármaco, CIMA, catálogo, historial o dato ausente.
- Los compuestos de psoriasis/DA/otros biológicos no se trocean por inferencia.
- `derma_viral_serologies` combinado permanece no escribible y no se reparte a VHB/VHC/VIH.
- Intake no crea/selecciona paciente ni convierte el paste en persistencia clínica.

## 4. Cáceres 0.6

El manifest publicado de `previews/caceres-fh/deployment-manifest.json` declara:

- `version`: `CÁCERES-REVIEW-0.6`;
- `source_sha`: `e1120ba85817a1807cea8c1e938867ad778921f4`;
- `last_functional_sha`: `e1120ba85817a1807cea8c1e938867ad778921f4`;
- promoción: issue #345 / PR #346;
- candidate: `749c82409a415e800500b39018027b189fd6a131`;
- merge de publicación: `19d10c9abefb7b25130b4b17e3289d54a17315ee`.

0.6 es el snapshot estable vigente para evaluación sintética en Cáceres. No es un espejo automático de futuros merges de recovery: cualquier 0.7 o cambio posterior requiere nueva promoción explícita.

## 5. Paquete externo

El evaluation package/workbooks/manifest/ZIP permanece en su freeze sintético anterior (`READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`). La promoción 0.6 no lo refreezea ni lo convierte en representación automática del snapshot 0.6.

## 6. Siguiente frontera

1. Continuar evaluación humana con `CÁCERES-REVIEW-0.6` y datos sintéticos.
2. Registrar cualquier defecto reproducible del flujo soportado como nueva WO atómica; no reabrir A/B/C por defecto.
3. Decidir por separado si se necesita refreeze del paquete externo/workbooks.
4. Cualquier piloto real o producción requiere autorización, gobernanza y validación específicas; 0.6 no los acredita.

## 7. Históricos

`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260907.md` pasa a ser histórico: describe correctamente el estado previo a la promoción 0.6, cuando Cáceres 0.5 seguía congelado. También se conservan los estados de 20260731 y freezes anteriores como trazabilidad.

Cuando exista contradicción sobre el estado vivo, prevalecen la WO/instrucción actual, GitHub publicado, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y este documento 20260908.
