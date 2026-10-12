# WO-DOC-NEXUS-F45-Q1-Q4-DECISION-RECONCILIATION-20261012

**Estado:** DOCUMENTACIÓN LOCAL EN PREPARACIÓN — sin push, sin PR, sin merge.
**Objetivo:** conservar de forma inequívoca las cuatro decisiones funcionales ratificadas por la responsable el 12-10-2026 y corregir las contradicciones que conservaba el borrador F4.5 DeliveryResult #671 tras su revisión F2. Es una **WO documental atómica de reconciliación de contrato y enlaces**, no una WO de implementación.
**Relación:** issue [#671](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/671) (contrato aún `CONTRACT_PENDING`), evidencia [#743](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/743) / [PR #744](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/744) (pendiente de merge), implementación [#721](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/721) (bloqueada y sin aprobación).

## 1. Base, HEAD y preflight

- Repo: `b32majus/Hub-Clinico-Badajoz`. Rama canónica `promueve/nexus-v4@41406b155f840cb1c8520fa455f1e03934a4fd7b` verificada en GitHub el 12-10-2026.
- PR #744: OPEN, no MERGED, `docs/fh-f44-v2-bridge-equivalence-20261012@3edf6885c86d2d273e6566c4342f764507516e29`. **La presente rama es derivada local de ese commit**; sus nuevos documentos/enlaces no equivalen a publicación canónica.
- Borrador original #671: worktree local limpio `work/issue671-f45-delivery-spec-complex-20261012@370cdccdbbab9697c7d63332a19da76efdfb8c01`; no publicado. Se trasladó su texto a la nueva rama para reconciliar sin modificar el worktree del agente.
- Rama/worktree aislado: `docs/nexus-f45-q1q4-reconciliation-20261012`, `/srv/kairos-lab/worktrees/promueve-nexus-f45-q1q4-doc-reconciliation-20261012`. Preflight de limpieza verificado sobre los dos worktrees preexistentes antes de abrir el nuevo.
- Autoridades consultadas: `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, ADR-005/006, alineamiento agnóstico PR #742, matriz #744, contrato F2 original y estado GitHub de #671/#721. El HEAD se revalidará antes de cualquier publicación futura.

## 2. Decisiones ratificadas

1. **Q-1:** una frontera F4.5, representación tabular Export V2 y portador F4.4 íntegro como capacidades diferentes; un mismo `prepared_for_transfer` requiere modalidad, garantía y evidencia explícitas. La proyección V2 no promete preservación íntegra de F4.4. No fijar codec, hojas adicionales, SQL ni almacenamiento paralelo.
2. **Q-2:** `attemptId` creado por capa llamadora antes de adapter; reintento técnico de la misma operación conserva ID; nueva operación genera otro. El ID no implica deduplicación/idempotencia; `outcome_unknown` no permite una escritura automática ciega.
3. **Q-3:** destino lógico explícito separado de localización física. En Excel manual, libro/hoja elegidos por la profesional; no inferencia por fármaco/patología. Bridge/API dependen de configuración autorizada; sin resolución inequívoca, fail-closed.
4. **Q-4:** acto F4.4 estructuralmente conforme y autoría declarada suficientes solo para evaluación sintética; no demuestran identidad autenticada, firma, prescripción ni registro institucional. Piloto/escritura reales sujetos a garantías SES.

**Cierre funcional ≠ cierre técnico:** firma, campos/tokens definitivos del DTO, validadores, mapping Act→V2, codec lossless, políticas reales por adaptador y permisos/autenticación de piloto quedan pendientes de revisión y autorización.

## 3. RUTAS exactas

- `docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md`: texto F2 reconciliado, oráculos de aceptación reforzados y pendientes técnicos precisos.
- `docs/architecture/reviews/FARMACIA_F44_EXPORT_V2_BRIDGE_EQUIVALENCE_20261012.md`: estado posterior de Q-1..Q-4 sin falsear la matriz histórica.
- `docs/architecture/PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md`: nota de ratificación posterior y enlace.
- `docs/INDEX.md`: ruta de entrada documental visible desde arquitectura y contratos.
- `docs/ops/WORK_ORDER_STATUS.md`: estado local, autoridad de publicación y gate de #671/#721.
- `docs/ops/WO_NEXUS_F45_Q1_Q4_DECISION_RECONCILIATION_20261012.md`: esta WO, preflight y política.

## 4. NO TOCA

- `main`; PR #744, su rama/worktree, ni el worktree original #671; no rebase/reset/force-push/limpieza ajena.
- F4.4, Export V2, JSX/HTML/JS, schemas, workbook, Office Script, Bridge, Power Automate, backend o deploy.
- ADR-005/006, estados de los issues, permisos, interfaz clínica, datos de pacientes reales, CIMA u otra inferencia farmacoterapéutica.
- No aprobar ni iniciar #721, no publicar `CONTRACT_ACCEPTED` sin revisión del DTO.

## 5. QA / criterio de aceptación

- Diff solo en las **seis rutas Markdown** anteriores; sin cambios runtime.
- Decisiones Q-1..Q-4 inequívocas y trazables; `prepared_for_transfer` no confunde modalidad ni representa persistencia.
- Conservar los oráculos F2 (`payload.lines`, acto íntegro autocontenido, `undefined` own ≠ ausencia) y añadir oráculos negativos de proyección, reintento, routing y atribución.
- Identificar correctamente tres madureces: Export V2 demo publicada; #671 solo contrato candidato local; #721 no aprobado.
- Enlaces relativos existentes, `git diff --check` y revisión documental de coherencia. Sin alegar pruebas de navegador, Excel real o tests runtime no ejecutados.
- Sin cambios en otros worktrees. Si el PR #744 cambia o se fusiona, comprobar base y reconciliar antes de futura publicación.

## 6. Reversión y política de publicación

- Reversión, si se autoriza: revert documental focal sobre el commit local de esta rama, sin sobrescribir trabajos ajenos ni reescribir historia.
- La petición de documentar autoriza aquí **preparación local y commit documental**. **No se presume autorización expresa de push, PR, issue nuevo ni merge.** El #671 aprobó localmente solo su contrato y #743 autorizó su propia PR; ninguna autorización se extiende a esta WO.
- Para publicar: confirmar alcance, issue documental con `status:approved` y aprobación humana explícita de push/PR; revalidar rama canónica, #744 y HEAD. Merge requerirá autorización aparte.

## 7. OUTPUT

**Esperado:** rama/worktree aislados, commit local con diff acotado, evidencia de `git diff --check`, enlaces verificados, reporte de cambios/pendientes. **Estado canónico:** sin cambios hasta push/PR/merge autorizados y realizados; contrato y #721 seguirán pendientes.
