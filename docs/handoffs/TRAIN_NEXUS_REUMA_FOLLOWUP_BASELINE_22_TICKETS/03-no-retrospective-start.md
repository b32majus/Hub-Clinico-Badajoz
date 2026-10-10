# T22-03 — Timeline no inventa inicio en primer Seguimiento histórico

**Bloqueado por:** T22-02 GREEN. **Spec:** ../TRAIN_NEXUS_REUMA_FOLLOWUP_BASELINE_22_SPEC.md.

**WHAT:** Un primer registro observado en el Hub con `Tipo_Visita=seguimiento` y `Tratamiento_Actual` explícito preexistente no produce automáticamente `treatment_start`, `treatment_change` o add-on retrospectivos en Dashboard. La primera visita formal `Tipo_Visita=primera` y los eventos de solicitud/validación explícita mantienen su conducta vigente. Ninguna fecha de inicio se infiere desde la fecha de visita.

**WHERE:** `modules/treatmentEventsManager.js::detectTreatmentStart`, `extractTreatmentEvents`; consumidor real `scripts/script_dashboard.js` (Timeline) y `dashboard_paciente.html` solo para bump del script si modificado. El dato de tipo visita está en la fila histórica 497 como `Tipo_Visita=seguimiento` derivado de `createVisitAct(kind=seguimiento)`.

**REUSE:** formato de visita de `reuma_legacy_export_adapter`; funciones `HubTools.events` publicadas. No hay oracle dedicado existente: congelar un pequeño oracle independiente RED con 3 casos sintéticos: primera fila `seguimiento` con tratamiento, primera `primera` con tratamiento (no false regression) y cambio/inicio realmente sustentado por decisión explícita. Ampliarlo solo si aparece gap material concreto.

**CLOSED DECISIONS:** Baseline no es `START`; el tipo de visita debe ser explícito. No cambiar eventos de alteraciones, biologics o validación que no están en alcance, salvo STOP por un hallazgo material demostrable.

**NO TOCA:** contratos CSV y fechas, cálculos/scores, rediseño Dashboard, export/validación Farmacia, flags de almacenamiento o nuevas tablas.

**PROOF:** test independiente RED→GREEN de `extractTreatmentEvents`; smoke de timeline soportado si cambia visualización, negativas y positiva de control, preservación del CSV. Una revisión Standards + Spec en candidato integrado fijo; evidencia correctora enfocada solo en findings y hasta dos intentos frescos. **HUMAN STOP** si falta discriminador fiable o el cambio altera eventos clínicos soportados fuera de `seguimiento` sin autorización.

**REVERSIÓN/OUTPUT:** `git revert` autorizado; commit local y pruebas, cierre local de integración, no publicación.
