# Estado vivo — Farmacia recovery y Cáceres tras Train C — 2026-09-07

| Metadato | Valor |
| --- | --- |
| Repositorio | `b32majus/Hub-Clinico-Badajoz` |
| Rama funcional | `recovery/farmacia-pr-replay-20260727` |
| HEAD funcional publicado | `e1120ba85817a1807cea8c1e938867ad778921f4` — merge PR #341 |
| Candidate Train C | `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` |
| Post-merge smoke | Farmacia smoke #1019 `success` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.5` |
| Source snapshot | `456454172b67a00ea5ba9583f14999a4be5ff0c2` según manifest |
| Uso | Evaluación/demo con datos sintéticos |
| Piloto / producción | No acreditados |

## 1. Estado funcional publicado

La línea publicada de Farmacia incorpora la cadena previa de patient-flow y Unified Clinical Intake V0 y, sobre ella, las tres fronteras recientes:

1. **A — #334 / PR #335**: contexto de presentación Dermatología + patología desde una e-Orden reconocida. No preescribe `fhDermaPatologia`; D16/T9 mantienen la autoridad de escritura. Candidate `ad4088c3689b761d695799c86295207653fcab0f`; merge `7b99eda50e9f7b92cf921d0d6e1bd2090ca917f7`.
2. **B — #336 / PR #337**: `D17_EXT_V1` recupera y transporta datos explícitos de patología, tratamientos previos, analítica/vacunación y comorbilidades con gramática versionada, backward-compatible y fail-closed. Candidate `773f66f85081c6d9476599797a289a466adbfed7`; merge `775a8c08c00d3b678838d71b958775bba726009b`.
3. **Train C — #338**: C1 #339 (`bbf898bc789840c0b4bc7635636b81d740afe60e`) y C2 #340 (`e5e52e2bc8f94805b4771ec40aa19820bb6be02f`) completaron hidratación protegida y superficie compartida. La promoción #342 / PR #341 dejó recovery en `e1120ba85817a1807cea8c1e938867ad778921f4`.

## 2. Qué está demostrado

- C1 habilita **39 conceptos** explícitos de patología/comorbilidades con destinos exactos y adaptadores cerrados.
- C2 habilita **7 conceptos seguros** de analítica/vacunación y una única superficie `formAnaliticaVacunacion` compartida entre flujo manual y contexto e-Orden reconocido.
- Los gates de patología y parent/child bloquean escrituras incoherentes.
- Los valores existentes permanecen protegidos; ausencia nunca limpia/desmarca.
- Compuestos de psoriasis/DA/otros biológicos no se trocean.
- `derma_viral_serologies` combinado permanece `NONE/NO_PROPOSAL`; no se copia a VHB, VHC y VIH.
- Tratamiento solicitado/importado permanece separado del tratamiento validado.
- Intake no crea ni selecciona paciente, no crea `patient_id` y no convierte el paste en persistencia clínica.

Evidencia final del Train: final oracle PASS, T10 `14/14 PASS` ejecutado exactamente una vez por el verifier final, árbol limpio y verifier sin mutación. Auditoría post-Train independiente: C1 `147/147`, C2 `134/134`, C2 browser oracle `5/5`, final integration oracle PASS, cero IDs DOM duplicados y `git diff --check` PASS. El head de PR #341 tuvo smoke #1018 `success`; el merge `e1120ba...` tuvo smoke #1019 `success`.

## 3. Límites clínicos y de seguridad

- Requested treatment ≠ validated treatment.
- No inferir dosis, vía, pauta, presentación, inducción, duración, renovación, switch, add-on, causalidad, resultado de validación o línea terapéutica desde fármaco/CIMA/catálogo/historial/datos ausentes.
- Checkbox desmarcado o campo ausente permanece ausente; no se transforma en NO.
- No se usan datos reales de pacientes en QA/repositorio; evidencia exclusivamente sintética.
- Estado actual apto para evaluación/demo sintética; **no demuestra piloto real ni producción**.

## 4. Cáceres 0.5 no es el recovery actual

El manifest real de `previews/caceres-fh/deployment-manifest.json` declara:

- version: `CÁCERES-REVIEW-0.5`;
- source/last functional SHA: `456454172b67a00ea5ba9583f14999a4be5ff0c2`;
- promoción: issue #331 / PR #333;
- candidate `59d7b7e3159b3d6627ac1bbcc418c2338315e55b`;
- merge `2ee9c54f310ac8e32d8928b756f007efa0d56b0d`.

Por tanto, Cáceres 0.5 es un snapshot estable y reproducible, no un espejo automático de `recovery @ e1120ba...`. Las farmacéuticas pueden seguir usando 0.5 para la evaluación para la que fue promovido, pero sus resultados no demuestran automáticamente A/B/Train C posteriores. PR #341 no refreezeó el snapshot.

## 5. Paquete externo

El evaluation package/workbooks/manifest/ZIP permanecen en su freeze sintético anterior (`READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`). Ni PR #333, #335, #337 ni #341 los refreezean. No presentar el paquete como representación automática del HEAD regional actual.

## 6. Siguiente frontera

1. QA humana/regional sobre `recovery @ e1120ba...` usando datos sintéticos y flujo soportado.
2. Si la QA es satisfactoria y se desea que el enlace estable de Cáceres represente este producto, crear una WO separada de promoción/refreeze a una futura `CÁCERES-REVIEW-0.6`.
3. No promover 0.6, piloto o producción por inferencia documental.

## 7. Documentos históricos

`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md` y estados anteriores se conservan como trazabilidad histórica. Cuando contradigan este documento o GitHub sobre el estado vivo, prevalecen GitHub, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y este estado 20260907.
