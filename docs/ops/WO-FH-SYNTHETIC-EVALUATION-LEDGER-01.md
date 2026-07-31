# WO-FH-SYNTHETIC-EVALUATION-LEDGER-01

**Título:** Registro local persistente para evaluación con pacientes ficticios
**Fecha:** 2026-08-01
**Riesgo:** 🟡 Amarillo
**Base:** `recovery/farmacia-pr-replay-20260727`
**HEAD esperado:** `96a4cb0b6df775dc5b391a05e87a313adb30a23f`
**Rama:** `work/fh-synthetic-evaluation-ledger-01-20260801`

## Objetivo y contexto

Permitir que Farmacia cree, conserve, reabra y elimine actos exclusivamente ficticios de Validación, Primera Visita y Seguimiento en el mismo navegador durante la evaluación de verano. La capacidad es local y versionada; no constituye persistencia clínica, multiusuario ni piloto real.

## Preflight

- Verificar rama base y HEAD remoto exactos.
- Trabajar en worktree aislado y limpio.
- Leer `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, el plan vivo y la arquitectura V4.
- No usar ni modificar el repositorio principal sucio.

## Reversión

Revertir exclusivamente el commit de esta WO. El registro local utiliza una clave nueva y aislada; la reversión de código no borra datos locales del navegador. La usuaria puede eliminarlos desde la interfaz antes o después de revertir.

## Alcance

- módulo `FarmaciaEvaluationLedger` con almacenamiento local versionado y fallback en memoria;
- confirmación explícita de datos ficticios antes de guardar;
- un acto persistido por Validación, Primera Visita o Seguimiento;
- actualización idempotente del mismo acto mediante `source_event_id`;
- captura restaurable de controles y contexto funcional disponible;
- listado local de pacientes y actos en Inicio Farmacia;
- reapertura de un acto mediante interacción soportada;
- eliminación por paciente y vaciado total controlado;
- mensajes claros sobre alcance local, sintético y no clínico;
- pruebas unitarias, DOM y navegador.

## NO TOCA

- servidor, Supabase, SharePoint, Excel Bridge o sincronización;
- Export Manager y libro Excel acumulado, que corresponden a la WO siguiente;
- TXT JARA, CSV o proyección legacy de 61 columnas;
- CIMA, Presalud, parser de Dermatología o Digestivo;
- fuentes regionales de tratamiento y reglas clínicas;
- snapshot `previews/caceres-fh/` ni promoción Cáceres;
- documentación viva general;
- `main`;
- datos reales.

## Rutas permitidas

- `docs/ops/WO-FH-SYNTHETIC-EVALUATION-LEDGER-01.md`
- `scripts/farmacia_evaluation_ledger.js`
- `scripts/farmacia_seguimiento.js`
- `farmacia_index.html`
- `farmacia_validacion.html`
- `farmacia_primera_visita.html`
- `farmacia_seguimiento.html`
- `farmacia_style.css`
- `tools/farmacia_evaluation_ledger_check.mjs`
- `tools/farmacia_evaluation_ledger_browser_check.mjs`

## Criterios de aceptación

- [ ] Un CIP ficticio no vacío genera un `patient_id` local estable.
- [ ] Guardar dos veces el mismo acto lo actualiza y no lo duplica.
- [ ] Validación, Primera Visita y Seguimiento persisten actos distintos.
- [ ] Los actos sobreviven a recarga y reapertura del navegador.
- [ ] Un acto se reabre y restaura mediante URL soportada.
- [ ] Seguimiento restaura también visita, líneas, tratamientos relacionados, efecto adverso y causalidad capturados.
- [ ] Si `localStorage` está bloqueado o falla al escribir, el guardado temporal en memoria sigue disponible con advertencia explícita.
- [ ] Se preservan valores vacíos, `0`, `false`, radios y checkboxes.
- [ ] Inicio Farmacia muestra pacientes, tipos de acto y fecha de última actualización.
- [ ] El usuario puede eliminar un paciente ficticio o vaciar todo el registro.
- [ ] La interfaz exige confirmar que no se introducen datos reales.
- [ ] No se modifica la salida Excel/JARA/CSV actual.
- [ ] Consola y `pageerror` permanecen sin errores en QA.

## Tests y QA

- `node --check` del módulo y scripts afectados por carga.
- check unitario del ledger.
- check DOM de scripts, controles y avisos.
- smoke Farmacia y storage policy.
- Playwright: guardar, recargar, listar, reabrir, restaurar, eliminar y vaciar.
- `git diff --check`.

## Política de commit, push, PR y merge

- Commit local solo tras tests verdes.
- Mensaje: `feat(farmacia): add synthetic evaluation ledger`.
- Esta autorización inicia la implementación local.
- Push, issue, PR y merge requieren autorización explícita posterior.

## Reporte final

- rama y HEAD;
- rutas modificadas;
- comportamiento implementado;
- tests y QA;
- limitaciones;
- estado de commit/publicación.
