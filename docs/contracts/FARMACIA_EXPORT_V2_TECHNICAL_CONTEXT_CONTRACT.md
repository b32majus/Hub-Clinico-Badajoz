# Farmacia Export v2 — contrato de contexto técnico sintético

## Estado y alcance

Contrato interno `1.0.0-draft.1`. No activa salida pública v2, no cambia core, schemas ni adapters, y no introduce lógica clínica. Core y schemas permanecen en `2.0.0-draft.1`; los tres adapters permanecen en `1.0.0-draft.1`.

## API exacta

`scripts/farmacia_export_v2_context.js` instala `window.FarmaciaExportV2TechnicalContext` con exactamente:

- `PROVIDER_VERSION`: `"1.0.0-draft.1"`.
- `getContext(contextType, identifierValue)`: consulta síncrona. `contextType` solo admite `validation`, `firstVisit` o `followup`. Devuelve una copia independiente del contexto predeclarado o `null`.

No se expone el registro. `identifierValue` únicamente localiza una entrada explícita; nunca se transforma en `patientId` ni en IDs de acto. El proveedor no consulta DOM, catálogo, ledger, historial, posición, storage, red o reloj, y no genera ningún campo.

## Registro cerrado

Etiquetas sintéticas autorizadas:

| Tipo | Etiqueta CIP sintética | Contenido |
|---|---|---|
| Validation | `CIP-DEMO-FH-001` | Un evento/validación y un `rowKey` explícitos. |
| First Visit | `CIP-DEMO-FH-001` | Un evento/primera visita y un `lineContext` explícito completo. |
| Follow-up | `CIP-DEMO-FH-001` | Un evento/visita y una línea activa explícita. |
| Follow-up | `CIP-DEMO-FH-004` | Un evento/visita y dos líneas activas explícitas en orden L2, L3. |

Todos contienen IDs y fechas literales estables y `demoFlag: true`. Los `patientId` son identificadores sintéticos separados y predeclarados (`patient-syn-v2-alpha`, `patient-syn-v2-delta`), no CIPs. Cualquier CIP manual/desconocido o combinación de tipo/CIP no registrada devuelve `null`.

La identidad respeta su ámbito: `patientId` es estable entre actos del mismo paciente; `treatmentId` y `lineId` son estables entre eventos de la misma línea de tratamiento; `rowKey` y los IDs de acto (`validationId`, `firstVisitId`, `visitId`, además de `eventId` y `sourceEventId`) son específicos de cada evento. En FH-001, First Visit y Follow-up comparten exactamente `treatment-syn-v2-fh001-l1` y `BIO-FH-001-L1`, sin compartir sus IDs o claves de acto.

## Integración de página

Las firmas previas de los bridges se conservan. Se añaden:

- Validation: `getValidationV2TechnicalContext()` y `buildValidationV2ProjectionFromCurrentContext()`.
- First Visit: `getFirstVisitV2TechnicalContext()` y `buildFirstVisitV2ProjectionFromCurrentContext()`.
- Follow-up: `getFollowupV2TechnicalContext()` y `buildFollowupV2ProjectionFromCurrentContext()`.

Cada getter consulta el proveedor con el CIP visible, verifica que el bloque técnico esté completo y devuelve la copia sin completar ni generar campos. Validation y First Visit rechazan antes de la consulta un CIP visible distinto del paciente enlazado/activo. El modo manual de Validation sin paciente enlazado solo continúa si el CIP visible tiene una entrada sintética registrada. Cada builder delega esa misma copia al bridge preexistente, que invoca el adapter correspondiente. No hay botón, descarga ni clipboard v2.

Los errores de contexto son tipados. Los códigos nuevos son `V2_CONTEXT_PROVIDER_UNAVAILABLE`, `V2_CONTEXT_UNAVAILABLE`, `V2_CONTEXT_INCOMPLETE`, `V2_CONTEXT_STALE` y `V2_ADAPTER_UNAVAILABLE`. `V2_ADAPTER_UNAVAILABLE` pertenece a los builders nuevos desde contexto actual. El bridge directo preexistente de Follow-up conserva `BRIDGE_ADAPTER_UNAVAILABLE`; también conserva `BRIDGE_CIP_MISMATCH`, `BRIDGE_LINE_NOT_VISIBLE` y `BRIDGE_AMBIGUOUS_LINE` para CIP stale y correspondencia técnica ausente/ambigua.

## Verificación y reversión

```bash
node tools/farmacia_export_v2_context_check.mjs
npx --yes --package=playwright node tools/farmacia_export_v2_context_browser_check.mjs
```

La unidad se revierte eliminando el proveedor, los dos checks, este contrato y los wrappers, y retirando el único `<script>` añadido en cada una de las tres páginas. Además se restauran las dos líneas preexistentes de invocación/guard de adapter: en Validation, `if (!adapter) throw new Error("FarmaciaExportV2ValidationAdapter no disponible");`; en First Visit, la invocación directa `return window.FarmaciaExportV2FirstVisitAdapter.buildFirstVisitProjection(...)`. Así se recuperan exactamente los bridges, adapters, core y salidas v1 anteriores, incluido `BRIDGE_ADAPTER_UNAVAILABLE` de Follow-up.
