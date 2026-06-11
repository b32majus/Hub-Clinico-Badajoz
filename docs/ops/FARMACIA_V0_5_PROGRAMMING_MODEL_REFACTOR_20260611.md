# FARMACIA V0.5 — Programming Model Refactor

**Fecha:** 2026-06-11
**Rama:** `work/farmacia-v0-5-programming-model-refactor-20260611`
**SHA base:** `782eae8`

---

## 1. DIAGNÓSTICO — Modelo anterior (T1)

| Problema | Descripción |
|---|---|
| **Monolito** | `farmacia_validacion.js` — 1150 líneas con lógica de estado, DOM, normalización y export mezclada sin separación de capas |
| **Estado disperso** | `modoActual` como variable suelta; lecturas DOM repetidas en cada función sin cache ni centralización |
| **Normalizadores duplicados** | `isTruthyRobust`, `mapViaToSelect`, `escapeHtml` — implementados inline en múltiples sitios sin factorización |
| **Export acoplado** | Lógica TXT/CSV leía el DOM directamente con selectores hardcodeados, impidiendo testear o reusar el payload |
| **Sin arquitectura** | Ausencia total de separación modelo/vista/orquestación. El estado se reconstruía _ad-hoc_ en cada operación |

---

## 2. ESTADO FINAL — Después del refactor (T10)

### Archivos resultantes

| Archivo | Líneas | Rol |
|---|---|---|
| `scripts/farmacia_validacion_model.js` | **538** | Modelo puro: estado, normalizadores, export payload |
| `scripts/farmacia_validacion.js` | **1218** | Orquestación: eventos, autocomplete, intake, modal |
| `farmacia_validacion.html` | *(actualizado)* | Vista: DOM, formularios, carga de scripts |

### `farmacia_validacion_model.js` — API pública

```
window.FarmaciaValidationModel.createState()
window.FarmaciaValidationModel.readStateFromDom(document)
window.FarmaciaValidationModel.applyValidationStateToDom(state, document)
window.FarmaciaValidationModel.buildExportPayloadFromState(state)
```

### Normalizadores puros (en `FarmaciaValidationModel`)

- `isTruthyRobust`
- `mapViaToSelect`
- `normalizeEstadoLabel`
- `escapeHtml`

### Estado centralizado — 11 secciones

```
modo, patient, hsClinical, comorbilidades, tratamientosPrevios,
biologicosPrevios, analitica, ea, concomitantes, validacion, catalogSnapshot
```

### `farmacia_validacion.js` — consumo del modelo

```js
const M = window.FarmaciaValidationModel;
```

- `applyValidationStateToDom` como única función que escribe estado al DOM
- `precargarValidacion` mapea intake JSON → state → `applyValidationStateToDom`
- Export TXT/CSV usa `readStateFromDom` → `buildExportPayloadFromState`

### HTML

- Incluye `farmacia_validacion_model.js` **antes** de `farmacia_validacion.js`
- Cache bust: `v=20260611-model-a`

### Smoke check

**35/35 tests OK** — todas las validaciones, modos y flujos de export intactos.

---

## 3. ARQUITECTURA

```
┌────────────────────────────────────────────────────────────┐
│                    CAPA MODELO                              │
│  farmacia_validacion_model.js                               │
│  • createState()              — estado inicial por sección  │
│  • readStateFromDom()         — snapshot del DOM a objeto   │
│  • applyValidationStateToDom()— objeto al DOM               │
│  • buildExportPayloadFromState() — objeto → TXT/CSV ready   │
│  • Normalizadores puros                                     │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                   CAPA VISTA                                │
│  farmacia_validacion.html                                  │
│  • DOM estático con bloques por sección                    │
│  • Formularios, selects, inputs, bloques condicionales     │
│  • Carga <script> de model.js antes de validation.js       │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                CAPA ORQUESTACIÓN                            │
│  farmacia_validacion.js                                     │
│  • Eventos de UI (cambios, clicks, teclado)                │
│  • Autocomplete de medicamentos                             │
│  • Bandeja de intake y carga de JSON                        │
│  • Modal de fármaco local                                   │
│  • Export (TXT/CSV) via buildExportPayloadFromState         │
└─────────────────────────────────────────────────────────────┘
```

### Flujos clave

```
Intake JSON → precargarValidacion → createState → applyValidationStateToDom → DOM

Export: readStateFromDom → buildExportPayloadFromState → TXT/CSV
```

---

## 4. RESTRICCIONES RESPETADAS

- ✅ Sin `innerHTML`
- ✅ Sin `style=` inline
- ✅ Sin lógica Naranjo / WHO / Definitiva
- ✅ Sin React / Vue / Svelte
- ✅ Sin tocar `demo/`, `main/`, `frozen/`, `v0.2/`
- ✅ Rama: `work/farmacia-v0-5-programming-model-refactor-20260611`
- ✅ SHA base: `782eae8`
