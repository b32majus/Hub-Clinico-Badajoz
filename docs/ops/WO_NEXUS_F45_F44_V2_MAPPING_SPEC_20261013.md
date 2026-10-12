# WO-DOC-NEXUS-F45-F44-V2-MAPPING-SPEC — 2026-10-13

**Estado de entrega:** WO documental [#750](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/750), `status:approved` **exclusivamente para publicar un inventario candidato**. Publicación no significa `MAPPING_APPROVED`, `IMPLEMENTED` ni `PILOT_READY`.

## Objetivo y contexto

Versionar el diagnóstico de correspondencias entre el acto F4.4 (bloques opacos y líneas explícitas 0/1/N) y las 152 columnas de Export V2, con entradas documentadas de los tres adaptadores, 34 campos no emitidos, 81 correspondencias clínicas no autorizadas, control de identidad/ausencia/fechas y los casos negativos M01–M20/M06b.

Los 18 oráculos del contrato F4.5 publicado se preservan sin edición. El objetivo es **publicar el candidato y los gaps verificables**, no aprobar las correspondencias clínicas restantes ni activar un adapter. `PROJECTION_NOT_AUTHORIZED` sigue siendo la respuesta conceptual segura si no existe subcontrato clínico aprobado.

## Base, HEAD y preflight

- Repo `b32majus/Hub-Clinico-Badajoz`, base canónica verificada `promueve/nexus-v4@cd5e698de09b0ef8b099aefb4890c4d0d94c7a20`; PR de reconciliación anterior [#749](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/749) fusionada.
- Rama documental aislada `docs/f45-f44-v2-mapping-candidate-750-20261013`; antes de cualquier PR/merge volver a verificar base, HEAD y que el diff contiene las cuatro rutas exactas.
- [#671](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/671): OPEN; DTO mínimo F4.5 publicado por PR #747. [#721](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/721): OPEN, **sin `status:approved`**, bloqueado para implementación.
- Leídos `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, código `modules/farmacia_act_contract.js`, `modules/farmacia_act_payloads.js`, core y esquema V2, adapters Validación/Primera Visita/Seguimiento, contratos y matriz previa PR #744. El dossier enlazado procede de revisión estática del código publicado.
- El archivo original de análisis se incorpora como texto Markdown, preservando su tabla 152 y añadiendo una nota de publicación **preparatoria**, sin datos identificativos reales.

## RUTAS / alcance

1. `docs/architecture/reviews/FARMACIA_F44_EXPORT_V2_MAPPING_CANDIDATE_20261013.md`: nueva evidencia candidata, no contrato clínico normativo.
2. `docs/ops/WO_NEXUS_F45_F44_V2_MAPPING_SPEC_20261013.md`: esta WO y gates.
3. `docs/INDEX.md`: enlace al dossier, marcado candidato.
4. `docs/ops/WORK_ORDER_STATUS.md`: referencia con distinción publicado/documentado versus no aprobado/no implementado.

**NO TOCA:** `main`, cualquier otro worktree, código F4.4, Export V2 core/adapters, browser/UI, Excel/Office Script/Bridge, Farmatool/SQL/API, casos de pacientes, datos de prueba actuales, L2, routing #577, `#671`, `#721`, decisiones terapéuticas, cambios de etiquetas o acciones de ejecución clínica.

## Seguridad y gates restantes

- Los campos internos F4.4 son **opacos**: el nombre de un atributo propuesto no constituye equivalencia aprobada. Sin diccionario validado C1–C5 no hay proyección positiva autorizada.
- Cada identidad técnica, estado, fecha, cardinalidad y rol de línea debe proceder de fuente **explícita**. Nada se copia por semejanza (`actId`≠`eventId`, `patientRef`≠`patient_id`, `authoredAt`≠`recorded_at`).
- No completar dosis, presentación, vía, pauta, inducción, dispensación, validación, cambio o causalidad a partir de nombre, catálogo, tratamiento previo o dato faltante.
- Primera Visita precisa gate propio de coherencia de rol/primaria. Seguimiento V2 actual no emite 33 columnas clínicas específicas; esos hechos materiales no pueden declararse fielmente proyectados.
- Ninguna regla de destino físico, persistencia, idempotencia o autenticación institucional se deriva de esta especificación. `prepared_for_transfer` no prueba pegado ni escritura.

## Tests, QA y criterios de aceptación

- **Comprobación documental ejecutable:** comparar los **152** nombres y orden 1–152 con `schemas/farmacia_export_row_v2.schema.json#/x-column-order`; clasificar sin afirmar mapeo clínico aprobado.
- Preservar casos M01–M20 y M06b, con 0/1/N y fallos seguros; Q1–Q4 y 18 oráculos de F4.5 intactos.
- Exactamente cuatro Markdown; diff sin whitespace no deseado, enlaces internos válidos, sin datos reales, commits de base y destino verificados; CI PR en verde.
- **No se ha hecho** QA funcional de navegador ni ejecución real Excel/Office Script, porque el cambio es documental.
- Aceptación documental: dossier disponible y límites C1–C5 visibles. **No aceptación clínica ni implementación.**

## Reversión, autorización Git y output

- Reversión futura mediante revert focal autorizado del merge de esta WO; nunca reset/force-push, borrado de ramas o sustitución de cambios ajenos.
- La usuaria autorizó expresamente esta **publicación documental**. Crear issue #750 `status:approved`, PR y fusionar **solo si** base/head/diff y checks pasan; no reutilizar la aprobación de #671/#721 para ejecutar código.
- OUTPUT: issue/PR/SHA canónico, cuatro rutas exactas, recuento 152, resultado CI, límites clínicos pendientes y estado #721. Al cerrar esta WO, no declarar resuelto el diccionario C1–C5 ni iniciar una implementación posterior.
