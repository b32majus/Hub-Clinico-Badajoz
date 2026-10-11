# T22-01 — Identidad editable en Seguimiento con CIP realmente no encontrado

**Bloqueos:** ninguno, salvo testigo de aceptación independiente RED congelado. **Spec:** ../TRAIN_NEXUS_REUMA_FOLLOWUP_BASELINE_22_SPEC.md.

**WHAT:** En Seguimiento con CIP explícito y resultado `not_found` del Read Port, el campo Nombre y Apellidos permite entrada manual. Conserva CIP identificado, sin suponer que el paciente existe y sin prefill de demo. En resultado `ok`, nombre conservado/protegido; en `unavailable/error`, fail-closed previo (no abrir modo `not_found`).

**WHERE:** `scripts/script_seguimiento.js::readSeguimientoBundle`, `buildPrefillPayload`, selección de estado de página; `seguimiento.html#nombrePaciente`; `modules/formController.js::prefillSeguimientoForm` solo si estrictamente necesario para mantener el contrato del paciente encontrado. Repin tokens solo de archivos modificados en consumidores reales.

**REUSE:** `reuma_seguimiento_read_browser_check.mjs` S2–S5, fixture SYN-XLSX y `reuma_seguimiento_read_migration_check.mjs`.

**CLOSED DECISIONS:** `not_found` es resultado de consulta real, distinto de `error/unavailable`; no falso paciente/copia, no convertir el bloqueo de lectura en permiso para editar pacientes existentes; no importaciones/IDs inferidos.

**NO TOCA:** tratamiento/dosis, CSV, eventos, Web Storage, Read Port API, pantallas ajenas, `main`.

**PROOF:** RED→GREEN del campo editable en `not_found` con interacción nativa (sin quitar readonly con DOM); negativos encontrado/error/unavailable; sujeto visible en 390/1280 integrado en Gate4. Test focal S2–S5, no suite completa. **HUMAN STOP** si no se puede discriminar el estado de forma fiable.

**REVERSIÓN:** `git revert` de commit propio autorizado, sin reset/clean. **OUTPUT:** commit local, rutas y witness, sin push.
