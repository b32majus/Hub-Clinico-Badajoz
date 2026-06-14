# Branch Manifest — Farmacia Hub Clínico Badajoz

**Fecha:** 2026-06-14 (WO5 ejecutada)
**Propósito:** Gobernanza de ramas del ecosistema farmacia tras WO3 validada visualmente por Sil.
**Autor:** KairOS (vía instrucción directa de Sil)

---

## Árbol de derivación

```
main (a25cccb) — demo pública inmutable
 └── 924d316 — tag congelado farmacia-demo-lunes-stable-924d316  ← BACKUP ORIGINAL
      ├── work/farmacia-demo-lunes-plus-wo1-wo2-20260614 ← PRESERVADA (punto de retorno)
      │     ├── WO1: continuidad paciente
      │     ├── WO2: helper prebiológico base
      │     ├── WO2b: hardening contrato
      │     ├── WO2c: precedencia clínica
      │     ├── WO2d: precedencia texto libre
      │     └── WO2e: tests vacunación texto libre (T16-T17)
      ├── work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614 ✅ VALIDADA — FUENTE DE TRABAJO ANTERIOR
      │     └── WO3: bandeja bloqueantes prebiológicos
      ├── work/farmacia-wo4-actividad-validaciones-pendientes-20260614 ✅ VALIDADA por Sil — FUENTE DE TRABAJO ANTERIOR
      │     └── WO4: actividad servicio validaciones pendientes desplegables
      └── work/farmacia-wo5-prebiologico-single-source-20260614 ✅ VALIDADA por Sil — NUEVA FUENTE DE TRABAJO
            └── WO5: unificar fuente de verdad prebiológica (adaptador + eliminación legacy)
```

**Linealidad:** `924d316 → f27a976 → c7ac08a → 565c7fd → 0c72168 → c729e9c → e734724 → 540f321 → 9201003 → 3c4eb0b → ef1d21b → 0c29d4b → 669244a` ✅

---

## Tabla de ramas

| Rama / Ref | SHA | Contenido | Estado | Fuente de trabajo | Siguiente acción |
|---|---|---|---|---|---|
| `farmacia-demo-lunes-stable-924d316` (tag) | `924d316` | Demo original congelada: WO5B-WO5C.3, causalidad, PROMs, Morisky, concomitantes, reordenación visual 4 bloques | ✅ Congelado (backup) | ❌ Histórico | No tocar |
| **`farmacia-demo-lunes-final-wo3-20260614`** (tag) | **`fecdc52`** | **Demo final post-WO3: demo + WO1 + WO2 + WO2b-e + WO3** | **✅ Congelado (demo lunes)** | **❌ Demo final** | **No tocar. Preview Pages apunta a `preview/demo-lunes-wo4-20260614`** |
| `backup/farmacia-demo-lunes-stable-924d316` | `924d316` | Ídem, respaldo local | ✅ Congelado | ❌ Histórico | No tocar |
| `work/farmacia-wo1-continuidad-paciente-20260614` | `f27a976` | WO1: unificar `getQueryContext` con `findPatientByCip`, eliminar fallback silencioso | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo2-helper-bloqueantes-prebiologicos-20260614` | `c7ac08a` | WO2: helper `FarmaciaPrebiologico.evaluatePatientPrebiologico()` base | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo1b-wo2b-hardening-prebiologico-20260614` | `c729e9c` | WO1b/WO2b: hardening contrato (5 correcciones), tests T1-T6 | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo2c-prebiologico-precedencia-clinica-20260614` | `e734724` | WO2c: precedencia clínica TB y serologías parciales, tests T7-T11 | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo2d-prebiologico-text-fallback-20260614` | `540f321` | WO2d: precedencia texto libre alert>pending>ok>unknown, tests T12-T15 | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo2e-vacunacion-text-fallback-20260614` | `9201003` | WO2e: regex acotado a frase + tests T16-T17 | ✅ Cerrado | ❌ Auditoría | No tocar |
| **`work/farmacia-demo-lunes-plus-wo1-wo2-20260614`** | **`9201003`** | **Todo lo anterior consolidado: demo + WO1 + WO2 + WO2b-e** | **✅ Preservada** | **✅ PUNTO DE RETORNO** | **Preservar. No borrar. No reabrir.** |
| **`work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614`** | **`fecdc52`** | **WO3: pintar bloqueantes prebiológicos en bandeja de validación** | **✅ VALIDADA por Sil (2026-06-14)** | **✅ FUENTE ANTERIOR** | **Preservar como histórico validado** |
| **`work/farmacia-wo4-actividad-validaciones-pendientes-20260614`** | **`90f79ec`** | **WO4: tarjeta validaciones pendientes clicable/desplegable en Actividad del Servicio** | **✅ VALIDADA por Sil** | **✅ FUENTE ANTERIOR** | **Preservar como histórico validado** |
| **`work/farmacia-wo5-prebiologico-single-source-20260614`** | **`12356ce`** | **WO5: adaptador getPrebiologicoStatus + eliminación lógica clínica legacy** | **✅ VALIDADA por Sil** | **✅ NUEVA FUENTE DE TRABAJO** | **Activa para próximas mejoras** |
| `main` | `a25cccb` | Rama principal pública. Sin cambios tras la demo | ✅ Estable | ❌ No tocar sin autorización | No mergear sin validación explícita |
| `work/hermes/farmacia-demo-v0-2-candidate-20260606` | antecesor | Rama de trabajo original de WO5B | 🟡 Histórico | ❌ Histórico | No reabrir |
| `preview/demo-lunes-wo3-20260614` | `fecdc52` | Rama de preview Pages para demo lunes post-WO3 | 🟡 Preview | ❌ Pages | Sirve demo final WO3 |
| Otras `work/` y `backup/` | varios | Ramas de preview, evaluaciones, experimentos previos | 🟡 Histórico | ❌ Histórico | No reabrir |

---

## Reglas de gobernanza

### Fuente de trabajo actual — WO5 validada por Sil
**`work/farmacia-wo5-prebiologico-single-source-20260614`** (SHA **`12356ce`**)
- Validada por Sil (2026-06-14) tras mini-validacion funcional.
- WO5 ejecutada: adaptador getPrebiologicoStatus + eliminacion logica clinica legacy.
- Fuente unica de verdad prebiologica: FarmaciaPrebiologico.evaluatePatientPrebiologico().
- Tests: 8/8 syntax, 38/38 smoke, 72/72 helper, 29/29 single source.
- Sin cambios UI, sin nuevas dependencias, sin refactor global.

### Fuente de trabajo anterior — WO4 validada
**`work/farmacia-wo4-actividad-validaciones-pendientes-20260614`** (SHA **`90f79ec`**)
- Validada visualmente por Sil (2026-06-14).
- Contiene: tarjeta Validaciones pendientes clicable/desplegable en Actividad del Servicio.
- Preservada como historico validado.

### Fuente de trabajo anterior — WO3 validada
**`work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614`** (SHA **`fecdc52`**)
- Validada visualmente por Sil el 2026-06-14. Tests 1-10 superados.
- Contiene: demo + WO1 + WO2 + WO2b-e + WO3 (bandeja bloqueantes prebiológicos).
- Preservada como histórico validado.

### Rama fuente anterior — preservada como punto de retorno
**`work/farmacia-demo-lunes-plus-wo1-wo2-20260614`** (SHA `9201003`)
- Contiene demo + WO1 + WO2 + WO2b-e (sin WO3).
- Preservada como punto de retorno si hubiera que revertir WO3.
- No borrar, no reabrir para nuevos desarrollos.

### Rama demo congelada
- `farmacia-demo-lunes-stable-924d316` (tag) → backup exclusivo.
- Preview GitHub Pages sirve `preview/demo-lunes-wo4-20260614` (`90f79ec`).
- No mover, no mergear, no eliminar.

### main
- `main` en `a25cccb` — solo se actualiza cuando Sil autorice explícitamente.
- WO3 no mergea a main ni modifica Pages.

### Ramas WO cerradas
- Las ramas `work/farmacia-wo1-*`, `work/farmacia-wo2-*`, `work/farmacia-wo1b-*`, `work/farmacia-wo2b-*`, `work/farmacia-wo2c-*`, `work/farmacia-wo2d-*`, `work/farmacia-wo2e-*` son histórico de auditoría.
- No usar como base para nuevos desarrollos.

### Prohibiciones generales
- ❌ No merge a main sin validación explícita de Sil.
- ❌ No tocar Pages settings.
- ❌ No tocar preview congelada.
- ❌ No tocar datos demo.
- ❌ No tocar mapping/importación CIMA fuente.
- ❌ No borrar ramas sin autorización.

---

## WO4 ejecutada — Actividad del servicio: validaciones pendientes desplegables

**WO4 — Actividad del servicio: tarjeta "Validaciones pendientes" clicable/desplegable**

**Estado:** ✅ **VALIDADA por Sil** (2026-06-14)

**Qué se hizo:**
En `farmacia_actividad_servicio.html`, la tarjeta "Validaciones pendientes" se convirtió en un botón accesible que despliega un panel con la lista de pacientes pendientes.
- Fuente única: `FarmaciaDemo.getPendingValidationPatients()`
- Helper prebiológico: `FarmaciaPrebiologico.evaluatePatientPrebiologico()` si disponible
- No innerHTML, no duplicación de datos, no reimplementación de lógica clínica

**Tests:** 8/8 syntax OK, 38/38 smoke, 72/72 helper
**Validación:** ✅ Validada visualmente por Sil (2026-06-14)

---

## WO5 ejecutada — Unificar fuente de verdad prebiológica

**WO5 — Adaptador getPrebiologicoStatus + eliminación lógica clínica legacy**

**Estado:** ✅ **VALIDADA por Sil** (2026-06-14)

**Qué se hizo:**
- `getPrebiologicoStatus` en `farmacia_common.js` convertido a adaptador que delega en `FarmaciaPrebiologico.evaluatePatientPrebiologico`
- Eliminadas 6 funciones evaluadoras legacy con lógica clínica duplicada:
  - `evaluateAnaliticaStatus`, `evaluateSerologiasStatus`, `evaluateMantouxIgraStatus`, `evaluateVacunacionStatus`, `evaluateMedicinaPreventivaStatus`, `buildPrebiologicoItem`
- Eliminados helpers duplicados: `normalizeCheckString`, `hasMeaningfulValue`, `evaluateBooleanLikeCheck`
- Creado test `tools/farmacia_prebiologico_single_source_check.mjs` (29 aserciones)
- Sin cambios UI, sin nuevas dependencias, sin refactor global

**Adaptador mantiene compatibilidad con contrato antiguo:**
- `overallStatus: complete` → `overall: ok` | `blocked` → `alerta/pendiente` | `incomplete` → `pendiente/no_informado`
- `canValidate` → `blocking: !canValidate`
- `checks[]` → `items{ category: { status, label } }`
- Categoría `tuberculosis` mapeada a `mantouxIgra`
- Helper no disponible → fallback seguro con `blocking: true`

**Tests:**
- Nuevo test: 29/29 PASS (single source check)
- Helper check: 72/72 PASS (21 tests)
- Smoke check: 38/38 PASS
- Syntax: 8/8 OK
- innerHTML nuevo: 0

**La fuente de trabajo actual pasa a WO5.** WO4 preservada como historico validado.
La demo final del lunes sigue siendo `farmacia-demo-lunes-final-wo4-20260614`.

---

## WO6 — Pendiente de ejecucion

**WO6 — Calidad de dato: sessionStorage + pautas normalizadas**
**Estado:** 🟡 **pending_review** (WO6b ejecutada, a la espera de validacion de Sil)
**Siguiente accion:** Validar cambios de WO6b y decidir promocion a fuente de trabajo

---

## WO6b ejecutada — Correccion tecnica

**WO6b — Tests, cache-busting y manifiesto**

**Estado:** 🟡 **pending_review** (2026-06-14)

**HEAD final de la rama:** `9073af3` (`9073af34ca2deda498371574b38d572a559d9575`)

**Correcciones tecnicas aplicadas:**
- `scripts/farmacia_pautas_catalog.js`: unidades corregidas (MENSUAL/SEMESTRAL → "meses", SEGUN_FASE → "variable", OTRO → "texto_libre"); normalizePautaLabel ampliado para reconocer patrones en texto libre.
- `scripts/farmacia_validacion.js`, `scripts/farmacia_primera_visita.js`, `scripts/farmacia_seguimiento.js`: eliminado innerHTML en selects de pauta (F.clearChildren + createElement), añadido fail-safe si FarmaciaPautasCatalog no carga, CSV ampliado con PautaCodigo/PautaLabel/PautaIntervaloDias/PautaUnidad/PautaOtroTexto sin quitar columna legacy Pauta.
- `tools/farmacia_storage_policy_check.mjs`: ruta absoluta reemplazada por calculo relativo con `import.meta.url` y `fileURLToPath`.
- `tools/farmacia_pautas_catalog_check.mjs`: casos de prueba funcionales ampliados (vacío, SC cada 4/2 semanas, según fase, semanal+semestral, cada 6 meses, mensual, c/4 sem, texto libre y unidades).
- Cache-busting: parametro `v=` actualizado a `20260614-wo6-b` en los 23 script tags que cargan `farmacia_common.js`, `farmacia_pautas_catalog.js`, `farmacia_validacion.js`, `farmacia_primera_visita.js` o `farmacia_seguimiento.js` en todos los HTMLs de farmacia.

**Tests:**
- Syntax: 5/5 OK (scripts modificados de WO6)
- Storage policy check: PASSED
- Pautas catalog check: PASSED
- Helper check: 72/72 PASS (21 tests)
- Single source check: 29/29 PASS
- Smoke check: 38/38 PASS
- innerHTML nuevo (`innerHTML = '<option`) en `scripts/farmacia_*.js`: 0

**Nota:** La fuente de trabajo activa sigue siendo `work/farmacia-wo5-prebiologico-single-source-20260614` (`12356ce`) hasta que Sil valide WO6.

---

## SHA verificados

| Ref | SHA completo |
|---|---|
| `farmacia-demo-lunes-stable-924d316` (tag) | `924d316a2f38b2a13cd84ff2cfde41738ec6ac8c` |
| `backup/farmacia-demo-lunes-stable-924d316` | `924d316a2f38b2a13cd84ff2cfde41738ec6ac8c` |
| `work/farmacia-wo1-continuidad-paciente-20260614` | `f27a97628c9e331bc83711d2890c365cbb15a73c` |
| `work/farmacia-wo2-helper-bloqueantes-prebiologicos-20260614` | `c7ac08ad8f15e0e642b4c310fa96150253f7f36d` |
| `work/farmacia-wo1b-wo2b-hardening-prebiologico-20260614` | `c729e9c1f9f68483d107b720b65721b92a5c7c7f` |
| `work/farmacia-wo2c-prebiologico-precedencia-clinica-20260614` | `e7347242ca6a5309e032692b13cffd5629585e0c` |
| `work/farmacia-wo2d-prebiologico-text-fallback-20260614` | `540f3217d4a1579e8443eb44e0d9bfe9d0676e5d` |
| `work/farmacia-wo2e-vacunacion-text-fallback-20260614` | `92010036b65512f5057fc4071be2fbb40f1b4a18` |
| `work/farmacia-demo-lunes-plus-wo1-wo2-20260614` | `92010036b65512f5057fc4071be2fbb40f1b4a18` |
| **`farmacia-demo-lunes-final-wo3-20260614`** (tag) | **`fecdc5203c22167d1bf6a17a19e11bb3345a06d0`** |
| **`work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614`** | **`fecdc5203c22167d1bf6a17a19e11bb3345a06d0`** |
| **`work/farmacia-wo4-actividad-validaciones-pendientes-20260614`** | **`90f79ecb07419895660463eb84de1be72bcf92d2`** ✅ validada por Sil |
| **`work/farmacia-wo5-prebiologico-single-source-20260614`** | **`12356ce05165c81faa1f94d66b1f99402ef249a0`** ✅ VALIDADA por Sil — NUEVA FUENTE DE TRABAJO |
| `preview/demo-lunes-wo3-20260614` | `fecdc5203c22167d1bf6a17a19e11bb3345a06d0` |
| `main` | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` |

---

**Status:** `active` (WO5 `validated_by_Sil`)
**Validacion:** WO5 validada por Sil (2026-06-14). Tests: 8/8 syntax, 38/38 smoke, 72/72 helper, 29/29 single source.
**Fuente de trabajo activa:** `work/farmacia-wo5-prebiologico-single-source-20260614` (`12356ce`)
**Fuente de trabajo anterior:** `work/farmacia-wo4-actividad-validaciones-pendientes-20260614` (`90f79ec`)
**Punto de retorno:** `work/farmacia-demo-lunes-plus-wo1-wo2-20260614` (`9201003`)
**Demo lunes pre-WO4:** `farmacia-demo-lunes-final-wo3-20260614` (tag, `fecdc52`)
**Demo lunes post-WO4:** `farmacia-demo-lunes-final-wo4-20260614` (tag, `90f79ec`)
**Preview Pages:** `preview/demo-lunes-wo4-20260614` (`90f79ec`)
**Backup original:** `farmacia-demo-lunes-stable-924d316` (tag, `924d316`)
**WO5 validada:** 2026-06-14
**WO6 pendiente:** sessionStorage + pautas normalizadas
**Actualizado:** 2026-06-14 (post-WO5 promocionada)
