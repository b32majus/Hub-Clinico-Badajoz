# Farmacia v0.5 — Pure Model Refactor

Status: pending_review
Date: 2026-06-11
Branch: work/farmacia-v0-5-pure-model-refactor-20260611
Base SHA: 782eae8

## Objetivo

Separación pura del modelo de datos de validación farmacoterapéutica:
- `scripts/farmacia_validacion_model.js` = SOLO datos/normalización/estado (0 DOM)
- `scripts/farmacia_validacion.js` = DOM/eventos/render

## Arquitectura

### Capa modelo (farmacia_validacion_model.js)

`window.FarmaciaValidationModel` expone:

| Función | Responsabilidad |
|---------|----------------|
| `createEmptyValidationState()` | Estado canónico vacío |
| `normalizeIntakeRecord(record)` | Normaliza intake JSON (tolera null) |
| `normalizePrebiologicStatus(prebio)` | Mapea analytics/TB/serologías/vacunación |
| `normalizeAdverseEvent(ae)` | Normaliza EA con defaults seguros |
| `normalizeConcomitantTreatment(t)` | Normaliza concomitante (tolera aliases) |
| `buildValidationStateFromIntake(record)` | Combina todo en estado completo |
| `buildExportPayloadFromState(state)` | Objeto plano para export |
| `readValidationStateFromDom()` | Lee DOM → estado (añadido en validacion.js) |

### Capa DOM (farmacia_validacion.js)

- `applyValidationStateToDom(state)` — aplica estado al DOM
- `precargarValidacion(data)` — llama modelo + applyValidationStateToDom
- `readValidationStateFromDom()` — lectura DOM para export
- Resto de funcionalidad: autocomplete, modal fármaco local, bandeja intake, export TXT/CSV

## Mapeos prebiológicos

| Campo Excel | Campo modelo | Valores |
|-------------|-------------|---------|
| analytics_status OK | analyticsRecent:"si", hemograma:true, bioquimica:true | |
| analytics_status ALTERADA | analyticsRecent:"no" | |
| tb_screening_status NEGATIVO | tb:"Negativo" | |
| tb_screening_status POSITIVO+TRATADO | tb:"Positivo - tratado" | |
| tb_screening_status POSITIVO | tb:"Pendiente" | |
| tb_screening_status PENDIENTE | tb:"Pendiente" | |
| tb_screening_status NO PRECISA | tb:"" | |
| serologies_status OK | vhb/vhc/vih:"Negativo" | |
| serologies_status PENDIENTE | vhb/vhc/vih:"Pendiente" | |
| vaccination_status OK | vaccination:"si" | |
| vaccination_status PENDIENTE | vaccination:"pendiente" | |
| vaccination_status NO PRECISA | vaccination:"no" | |

## Selects EA alineados

| Select | Opciones |
|--------|----------|
| fhEaNotificado | No consta, No, Sí |
| fhEaGravedad | Leve, Moderado, Grave (sin Fatal) |
| fhEaAccion | Continuar, Modificar dosis, Suspender, Observar, No aplica |
| fhEaCausalidad | No evaluada, Improbable, Posible, Probable, Muy probable, No clasificable |

## Validaciones

```bash
node --check scripts/farmacia_validacion_model.js  → SYNTAX OK
node --check scripts/farmacia_validacion.js         → SYNTAX OK
node tools/farmacia_smoke_check.mjs                 → 33/33 OK
grep DOM en model.js                                → 0
grep Naranjo/WHO/Definitiva/Fatal                   → 0
grep innerHTML en scripts/farmacia_*.js             → 0
```

## Cache bust

- `farmacia_validacion_model.js?v=20260611-pure-model-a`
- `farmacia_validacion.js?v=20260611-pure-model-a`

## Restricciones respetadas

- No PR, no merge, no main
- No React/Vue/Svelte, no build step, no CDN nuevo
- No datos reales, no backend
- No tocar demo v0.2 ni frozen v0.1
