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

## WO6 — Ejecutada, pendiente de validación

**WO6 — Calidad de dato: sessionStorage + pautas normalizadas**
**Estado:** 🟡 **pending_review** (WO6e ejecutada, a la espera de validación visual de Sil)
**Siguiente acción:** Validar WO6e visualmente y decidir promoción a fuente de trabajo

**Nota de deuda explícita:** Campos de pauta que siguen fuera de WO6: otros fármacos/biológicos en validación; fármacos concomitantes/adicionales en seguimiento. Motivo: evitar reabrir lógica de separación clínica ya validada.

**La fuente de trabajo activa sigue siendo WO5.** WO6 no está validada ni es fuente activa.

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

## WO6d ejecutada — Contrato de datos de pautas normalizadas (documental)

**WO6d — Documentación: contratos de datos de pautas normalizadas**

**Estado:** 🟡 **pending_review** (2026-06-14, WO6d ejecutada, luego validated_in_remote_for_data_contracts)
**HEAD final de la rama:** `dcb33df` (`dcb33df49258bb25b5894eec747e9300c8e26fc3`)

**Qué se hizo:**
- `docs/farmacia_data_contracts.md` creado con:
  - Propósito y principios generales del contrato de datos
  - Catálogo oficial de 12 códigos de pauta (objeto canónico, propiedades, tabla completa)
  - Reglas de normalización (algoritmo, tabla de 30 casos de prueba, patrones regex por código)
  - Compatibilidad legacy y función `getLegacyPautaLabel`
  - Contrato de importación Excel (`buildImportedPatientCandidate`, campos planos generados)
  - Contrato de exportación CSV/Excel (columnas Pauta, PautaCodigo, PautaLabel, PautaIntervaloDias, PautaUnidad, PautaOtroTexto)
  - Política de storage (sessionStorage, no localStorage, fallback en memoria)
  - Deuda explícita (pautas de otros fármacos, concomitantes, combinaciones complejas)
  - Tests asociados (catalog check, common check, storage policy check, syntax check)
  - Reglas para futuras WOs (7 reglas)
- `docs/farmacia_branch_manifest_20260614.md` actualizado (esta entrada)

**Solo documentación.** No se modificó código funcional, HTML, CSS, JS, tests, Pages ni main.

**Tests verificados:**
- Syntax: `node --check scripts/farmacia_pautas_catalog.js` → OK
- Catalog check: `node tools/farmacia_pautas_catalog_check.mjs` → PASSED
- Common check: `node tools/farmacia_common_check.mjs` → PASSED
- Storage policy check: `node tools/farmacia_storage_policy_check.mjs` → PASSED

**Nota:** WO6 sigue en pending_review. La fuente de trabajo activa sigue siendo WO5.

---

## WO6e ejecutada — Microfixes visuales bloqueantes

**WO6e — Corrección de bloqueantes visuales detectados por Sil en validación manual de WO6**

**Estado:** 🟡 **pending_review** (2026-06-14, WO6e ejecutada)
**HEAD final de la rama:** `44724a3` (`44724a36f3995c7f6a95a3686053d76df0865a81`)

**Fix 1 — Seguimiento: nueva pauta preseleccionada y editable**
- `scripts/farmacia_seguimiento.js`:
  - En `searchCIP()`: al cargar paciente, se normaliza su pauta actual y se preselecciona en `fhSegNuevaPauta`
  - En `applyContext()`: mismo comportamiento cuando el paciente viene por contexto URL
  - El select sigue siendo editable: el usuario puede cambiar la pauta libremente

**Fix 2 — Primera visita: eliminar datos fantasma sin paciente**
- `scripts/farmacia_primera_visita.js`:
  - La limpieza del catálogo (`C.clearSnapshot()`) ahora se ejecuta siempre que no haya paciente (`!ctx.patient`), no solo cuando hay CIP sin paciente
  - Esto evita que un snapshot persistente de otra página rellene el grid "Tratamiento validado" con datos fantasma

**Fix 3 — Primera visita: autocomplete de fármaco siempre disponible**
- `scripts/farmacia_primera_visita.js`:
  - El bloque de autocomplete (`fhPvAutocompleteBlock`) ahora se muestra **siempre**, tanto si hay paciente precargado como si no
  - Comportamiento coherente con la pantalla de validación

**Auditoría — Pauta y dosis en concomitantes (sin corregir, reportado)**
- `scripts/farmacia_seguimiento.js`:
  - **Dosis auto-rellenada desde catálogo** al seleccionar un fármaco en concomitantes (antes solo rellenaba farmaco + principioActivo). Cambio trivial, incluido en WO6e.
  - **Pauta en concomitantes** sigue siendo input texto libre. La conversión a desplegable no es trivial (cambia patrón de renderizado en `renderFollowupOtherDrugRow`). Se reporta como deuda para WO7.
  - **Diferencias de contrato de dosis entre pantallas**: en validación la dosis se asigna desde `drug.dosis`; en PV y seguimiento se permite `drug.dosis || drug.nombre_presentacion` (más tolerante). Inconsistencia menor, no bloqueante.

**Tests verificados (WO6e):**
| Test | Resultado |
|---|---|
| `node --check scripts/farmacia_primera_visita.js` | OK |
| `node --check scripts/farmacia_seguimiento.js` | OK |
| `node --check scripts/farmacia_common.js` | OK |
| `node --check scripts/farmacia_pautas_catalog.js` | OK |
| `node tools/farmacia_pautas_catalog_check.mjs` | PASSED |
| `node tools/farmacia_common_check.mjs` | 13/13 passed |
| `node tools/farmacia_storage_policy_check.mjs` | PASSED |
| `node tools/farmacia_prebiologico_helper_check.mjs` | PASSED |
| `node tools/farmacia_prebiologico_single_source_check.mjs` | 29 passed |
| `node tools/farmacia_smoke_check.mjs` | PASSED |
| `grep -R "innerHTML" farmacia_*.html scripts/farmacia_*.js` | 0 nuevos |

**No se tocó:** main, Pages, datos demo estáticos, lógica de separación clínica, filtro inducción, modelo Excel FH, fármacos especiales.

**WO6 sigue en pending_review.** Fuente activa: WO5.

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

---

## WO7A — Auditoría visual y contrato común de tratamiento farmacológico

**Estado:** completada y subida a remoto  
**Commit:** `6dd4218`  
**Archivo principal:** `reports/wo7a-auditoria-visual-contrato-tratamiento.md`

**Resumen:**  
WO7A confirma que WO6 resolvió pauta/storage, pero detecta una causa raíz estructural: validación, primera visita, seguimiento y dashboard no comparten un contrato común de tratamiento farmacológico.

**Conclusión:**  
WO6 no debe promocionarse todavía. Se mantiene en `pending_review`.

---

## WO7B — Contrato común de tratamiento farmacológico

**Estado:** completada y subida a remoto  
**Commit:** `e245500`  
**Archivo principal:** `docs/farmacia_treatment_data_contract.md`

**Resumen:**  
WO7B define el contrato documental común para representar tratamiento farmacológico entre pantallas, incluyendo fármaco, principio activo, dosis, vía, pauta, relación terapéutica, estado de línea, movimiento, fase, fuente y campos de catálogo.

**Regla activa:**  
No implementar nuevos autocompletes terapéuticos ni nuevos campos de dosis/vía/pauta sin mapearlos al contrato común.

---

## Estado consolidado tras WO7B

- WO6 sigue `pending_review`.
- Fuente activa funcional sigue siendo `work/farmacia-wo5-prebiologico-single-source-20260614`.
- Rama de trabajo actual: `work/farmacia-wo6-storage-pautas-normalizadas-20260614`.
- Último HEAD documental: `e245500`.
- No se ha tocado `main`.
- No se ha tocado GitHub Pages.
- No se ha tocado código funcional.
- WO7C todavía no está ejecutada.

**Siguiente paso recomendado:**  
`WO7C — Crear helper común farmacia_tratamiento_common.js`, todavía sin rediseñar formularios completos.

---

## WO7C — Helper común de tratamiento farmacológico

**Estado:** completada técnicamente, pendiente de revisión Cora/Sil  
**Archivos nuevos:**
- `scripts/farmacia_tratamiento_common.js`
- `tools/farmacia_tratamiento_common_check.mjs`

**Alcance:**
WO7C crea un helper común no invasivo para normalizar y construir objetos de tratamiento farmacológico conforme a `docs/farmacia_treatment_data_contract.md`.

**Importante:**
WO7C no cablea todavía las pantallas clínicas. Validación, primera visita, seguimiento y dashboard siguen usando sus flujos previos hasta WO7D/WO7E/WO7F/WO7G.

**Estado de gobierno:**
- WO6 sigue `pending_review`.
- Fuente activa funcional sigue WO5.
- No se ha tocado `main`.
- No se ha tocado GitHub Pages.
- No se ha modificado ninguna pantalla clínica.

---

## WO7C.1 — Protocolo estándar de ejecución Farmacia

**Estado:** completada, pendiente de revisión Cora/Sil  
**Archivo nuevo:** `docs/farmacia_wo_execution_protocol.md`

**Objetivo:**
Reducir consumo de tokens y mejorar consistencia operativa en futuras WOs mediante un protocolo reutilizable de preflight, alcance, diff, tests, commit, push y reporte final.

**Regla activa:**
A partir de WO7D, los prompts deben referenciar este protocolo y evitar repetir todo el contexto histórico salvo que sea necesario.

---

## WO7C.2 — Correcciones del helper común de tratamiento

**Estado:** completada técnicamente, pendiente de revisión Cora/Sil  
**Archivos actualizados:**
- `scripts/farmacia_tratamiento_common.js`
- `tools/farmacia_tratamiento_common_check.mjs`

**Objetivo:**
Corregir la selección por defecto del tratamiento principal y endurecer la normalización de `tipo_relacion` antes de reutilizar el helper en WO7D.

**Correcciones aplicadas:**
- `buildTreatmentFromPatient()` ya no devuelve ciegamente `lines[0]`; prioriza línea principal explícita y conserva `paciente_cip` en shape vacío.
- `normalizeTipoRelacion()` deja de convertir `sin_cambios` y `base` en `principal`.
- Se amplía la cobertura del check con casos de multibiológico desordenado, snapshot real, summary y mapeo de vía.

---

## WO7D — Primera visita alineada con contrato común de tratamiento

**Estado:** completada técnicamente, pendiente de revisión Cora/Sil  
**Alcance:**
Primera visita deja de tener captura duplicada del tratamiento principal y pasa a apoyarse en `FarmaciaTratamiento` como normalizador común.

**Importante:**
WO7D no modifica validación, seguimiento ni dashboard.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.  
No se toca `main` ni GitHub Pages.

---

## WO7D.1 — Pulido visual de Primera visita tras contrato de tratamiento

**Estado:** 🟡 **pending_review** (ejecutada por KairOS, pendiente de revisión visual Sil/Cora)
**HEAD de rama:** `7086718` (tras WO7D.1)
**Alcance:**
- Eliminado código legacy duplicado (dos pares `applyContext`/`applyTratamientoValidado` legacy que sobrescribían la lógica nueva de WO7D)
- Eliminada tarjeta azul informativa redundante
- Eliminado subbloque redundante "Buscar fármaco en catálogo"
- Autocomplete fusionado en el campo `fhPvFarmaco` como campo principal de captura
- Corregida visibilidad del dropdown autocomplete (z-index: 1000, overflow: visible)
- Tests ampliados con 6 validaciones específicas de WO7D.1 (24 total, 0 failed)

**Archivos modificados:**
- `farmacia_primera_visita.html` — HTML reestructurado
- `scripts/farmacia_primera_visita.js` — código legacy eliminado, autocomplete integrado
- `tools/farmacia_primera_visita_check.mjs` — 6 nuevos tests
- `docs/farmacia_branch_manifest_20260614.md` — esta entrada

**Deuda explícita:**
Analítica/vacunación de primera visita no alineada con lógica estructurada de validación/prebiológico. Pendiente WO posterior.

**No se tocó:** main, GitHub Pages, validación, seguimiento, dashboard, `FarmaciaTratamiento`, `farmacia_common.js`, pautas catalog, datos demo.

**WO6 sigue `pending_review`.** Fuente activa funcional sigue WO5.

---

## WO7D.2 — Desplegables clínicos básicos en Primera visita

**Estado:** 🟡 **pending_review** (ejecutada por KairOS, pendiente de revisión visual Sil/Cora)
**HEAD de rama:** `1e65ec3` (tras WO7D.2)

**Alcance:**
- `Servicio origen` convertido a `<select>` con 7 opciones (Dermatología, Reumatología, Digestivo, Alergología, Farmacia Hospitalaria, Oncología, Otro)
- `Patología / indicación` convertido a `<select>` con filtrado por servicio (dependencia: Dermatología→HS/psoriasis, Reumatología→AR/EspA/APs/LES/Sjögren, Digestivo→Crohn/colitis, Alergología→UCE, etc.)
- Ambos campos mantienen opción de texto libre (Otro/Otra) para casos no contemplados
- Se reutiliza `FarmaciaDemo.patologiaPorServicio` de `farmacia_common.js` donde aplica
- No se modifica el bloque de tratamiento validado por Farmacia

**Archivos modificados:**
- `farmacia_primera_visita.html` — inputs convertidos a selects + campos Otro
- `scripts/farmacia_primera_visita.js` — lógica de dependencia servicio→patología, populate dinámico
- `tools/farmacia_primera_visita_check.mjs` — 7 nuevos tests (31 total, 0 failed)
- `docs/farmacia_branch_manifest_20260614.md` — esta entrada

**Deuda explícita:**
Analítica/vacunación de primera visita no alineada con lógica estructurada de validación/prebiológico. Pendiente WO posterior.

**No se tocó:** main, GitHub Pages, validación, seguimiento, dashboard, tratamiento, `FarmaciaTratamiento`, `farmacia_common.js`, pautas catalog, datos demo.

**WO6 sigue `pending_review`.** Fuente activa funcional sigue WO5.

---

## WO7E — Seguimiento alineado con contrato común de tratamiento principal

**Estado:** 🟡 **pending_review** (ejecutada por KairOS, pendiente de revisión visual Sil/Cora)
**HEAD de rama:** `818ed45` (tras WO7E)

**Alcance:**
- Se alinea el bloque de tratamiento actual de seguimiento con `FarmaciaTratamiento`
- `getPatientBiologicLines()` usa `buildTreatmentFromPatient()` del helper como primera opción, con fallback legacy
- `syncBiologicControls()` normaliza líneas con el contrato, renderiza resumen vía `renderSegTreatmentSummary()`
- `applySelectedBiologicLine()` normaliza con `normalizeTreatmentInput()` y muestra grid de resumen
- `biologicStateLabel()` ampliado a estados del contrato: activo, suspendido, finalizado, histórico, validado, no_aplica
- Selector de movimiento ampliado con `optimizacion` y `suspension`
- Nueva cuadrícula `fhSegTratamientoGrid` para resumen visual del tratamiento actual
- Script tag `farmacia_tratamiento_common.js` añadido al HTML

**Importante:**
WO7E no modifica concomitantes, adicionales, históricos, dashboard ni exports.  
No se modifica `FarmaciaTratamiento`.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.

**Pendiente:**
WO7F deberá alinear fármacos concomitantes/adicionales/históricos/sospechosos de EA.  
WO7G deberá adaptar dashboard como proyección del contrato común.

---

## WO7E.1 — Pulido de Seguimiento: origen, indicación y tarjeta prebiológica

**Estado:** 🟡 **pending_review** (ejecutada por KairOS, pendiente de revisión visual Sil/Cora)
**HEAD de rama:** `29f9206` (tras WO7E.1)

**Alcance:**
- Origen / Servicio origen convertido a `<select>` guiado con 7 opciones (Dermatología, Reumatología, Digestivo, Alergología, Farmacia Hospitalaria, Medicina Interna, Otro) con campo libre para "Otro"
- Indicación / Patología convertido a `<select>` guiado con filtrado por servicio (dependencia: Dermatología→HS/psoriasis, Reumatología→AR/EspA/APs/LES/Sjögren, etc.)
- Ambos campos mantienen opción de texto libre (Otra) para casos no contemplados
- Tarjeta "Estudio prebiológico" eliminada: no aportaba información prebiológica real en seguimiento
- Nav link a `#modPrebiologico` eliminado
- Función `updatePrebiologicoSummary()` y todas sus llamadas eliminadas
- `clearCipFields()` actualizado para limpiar inputs "Otro" de servicio y patología
- `searchCIP()` actualizado para disparar eventos change tras cargar paciente y sincronizar desplegables
- `applyContext()` actualizado para guardar patología pendiente y restaurarla tras init
- Tratamiento principal no modificado: `syncBiologicControls()`, `fhSegLineaPrincipal`, `fhSegTratamientoGrid` intactos
- Concomitantes/adicionales no modificados

**Archivos modificados:**
- `farmacia_seguimiento.html` — inputs convertidos a selects + eliminar tarjeta prebiológico
- `scripts/farmacia_seguimiento.js` — nueva función `initSegServicioPatologiaSync()`, eliminado `updatePrebiologicoSummary`, actualizados `clearCipFields`, `searchCIP`, `applyContext`, DOMContentLoaded
- `tools/farmacia_seguimiento_check.mjs` — 16 nuevos tests WO7E.1 (37 total, 0 failed)
- `docs/farmacia_branch_manifest_20260614.md` — esta entrada

**Tests verificados:**
| Test | Resultado |
|---|---|
| `node --check scripts/farmacia_seguimiento.js` | OK |
| `node tools/farmacia_seguimiento_check.mjs` | 37/37 PASS |
| `node tools/farmacia_tratamiento_common_check.mjs` | 43/43 PASS |
| `node tools/farmacia_smoke_check.mjs` | 38/38 OK |
| `grep -R "innerHTML" farmacia_seguimiento.html scripts/farmacia_seguimiento.js tools/farmacia_seguimiento_check.mjs` | 0 nuevos |

**Importante:**
No se modifica el bloque de concomitantes/adicionales/históricos.  
No se modifica dashboard.  
No se modifica `FarmaciaTratamiento`.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.

**Pendiente WO7F:**
Alinear fármacos concomitantes/adicionales/históricos/sospechosos de EA con el contrato común y completar autocompletado de principio activo, dosis, vía y pauta.

---

## WO7F — Seguimiento: alinear concomitantes/adicionales/históricos/EA con contrato común

**Estado:** 🟡 **pending_review** (ejecutada por KairOS, pendiente de revisión visual Sil/Cora)
**HEAD inicial de rama:** `592557bd7721d82dd77d1a17692f6a7359316740`
**HEAD inicial de rama:** `592557b` (`592557bd7721d82dd77d1a17692f6a7359316740`)
**HEAD final de rama:** `53b06d8` (`53b06d8d05aa509cb95dbfad042120e3c392664e`)
**SHA commit funcional:** `2e480e3` (`2e480e31337aa8ace7130545e6e3e4aa2072c921`)

**Alcance:**
- Concomitantes con autocomplete completo del catálogo: fármaco/marca, principio activo, dosis, presentación, vía (select normalizado), pauta (select normalizado con catálogo WO6), código nacional, nº registro y origen catálogo.
- Pauta concomitante usa `FarmaciaPautasCatalog.getPautaOptions()`; si se selecciona `OTRO`, aparece input de texto libre `pautaOtro` y se guarda en el objeto del fármaco.
- Fármacos con relación "Concomitante" usan internamente `tipo_relacion: "concomitante"`, `estado_linea: "activo"`, `tipo_movimiento: "no_aplica"`. No se convierten en línea principal ni validada silenciosa.
- "Biológico activo adicional" usa `tipo_relacion: "adicional"`, `tipo_movimiento: "tratamiento_anadido"`. No se convierte en switch formal.
- "Biológico previo/histórico" usa `tipo_relacion: "historico"`; "Exposición" usa `tipo_relacion: "exposicion"`. No se reactivan como línea actual.
- "Sospechoso de EA" = "Sí" marca internamente `tipo_relacion: "sospechoso_ea"` como flag adicional, sin mezclar con principal/concomitante.
- UI estable: no rediseño del seguimiento, no datos fantasma, sin `innerHTML`, uso de `createElement` y `textContent`.
- Tratamiento principal intacto: `syncBiologicControls`, `fhSegLineaPrincipal`, `fhSegTratamientoGrid` y resumen normalizado se conservan.

**Archivos modificados:**
- `scripts/farmacia_seguimiento.js`
- `tools/farmacia_seguimiento_check.mjs`
- `docs/farmacia_branch_manifest_20260614.md`
- `farmacia_seguimiento.html` (sin cambios funcionales en WO7F)

**Tests verificados:**
| Test | Resultado |
|---|---|
| `node --check scripts/farmacia_seguimiento.js` | OK |
| `node tools/farmacia_seguimiento_check.mjs` | 66/66 PASS |
| `node --check scripts/farmacia_tratamiento_common.js` | OK |
| `node tools/farmacia_tratamiento_common_check.mjs` | 43/43 PASS |
| `node tools/farmacia_smoke_check.mjs` | 38/38 OK |
| `grep -R "innerHTML" farmacia_seguimiento.html scripts/farmacia_seguimiento.js tools/farmacia_seguimiento_check.mjs` | 0 uso real (solo comentarios/asserts del test) |

**innerHTML:** 0 uso real
**Push:** OK (`work/farmacia-wo6-storage-pautas-normalizadas-20260614` → remoto)
**Working tree:** limpio tras commit

**Deuda explícita:**
- Exportación CSV de concomitantes no ampliada con columnas normalizadas de pauta/vía en WO7F; se mantiene la estructura actual de seguimiento.
- Los otros fármacos siguen siendo una lista en memoria de la página; no hay persistencia real (consistente con demo actual).

**Importante:**
No se modifica `FarmaciaTratamiento`.  
No se modifica dashboard.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.  
No se toca `main` ni GitHub Pages.

---

## WO7F.1 — Cierre fino de Seguimiento farmacológico

**Estado:** 🟡 **pending_review** (ejecutada por KairOS como operador local, pendiente de revisión visual Sil/Cora)
**HEAD de rama:** `d27b6d8` (tras WO7F.1)

**Alcance:**
- Selector de fármaco sospechoso de EA ampliado: incluye tratamiento principal/líneas activas, fármacos concomitantes, adicionales, históricos y exposiciones con deduplicación por `seenIds`. Históricos/exposiciones se muestran como «Biológico previo/histórico» en lugar de excluirse.
- Pauta del tratamiento actual convertida a desplegable normalizado con catálogo WO6 (`fhSegPautaActual` como `<select>` + input «Otro»). Se normaliza automáticamente al cargar paciente o seleccionar línea. No crea nueva línea terapéutica al cambiar valor.
- `setSegPautaActualNormalized()` creada: normaliza el texto de pauta mediante `FarmaciaPautasCatalog.normalizePautaLabel()`, setea el `<select>` con el código y muestra/oculta input «Otro».
- `getRelevantDrugCandidates()` reforzada con `seenIds` para evitar duplicados y categorización explícita de históricos.
- Vía de concomitante verificada: se autocompleta desde el catálogo al seleccionar fármaco.

**Archivos modificados:**
- `farmacia_seguimiento.html` — pauta actual convertida a `<select>` + input Otro
- `scripts/farmacia_seguimiento.js` — `setSegPautaActualNormalized()`, llamada en 3 puntos, `getRelevantDrugCandidates` reforzado, pauta actual poblada en DOMContentLoaded, clearCipFields actualizado
- `tools/farmacia_seguimiento_check.mjs` — 9 nuevos tests WO7F.1 (81 total, 0 failed)
- `docs/farmacia_branch_manifest_20260614.md` — esta entrada

**Tests verificados:**
| Test | Resultado |
|---|---|
| `node --check scripts/farmacia_seguimiento.js` | OK |
| `node tools/farmacia_seguimiento_check.mjs` | 81/81 PASS |
| `node tools/farmacia_tratamiento_common_check.mjs` | 43/43 PASS |
| `node tools/farmacia_smoke_check.mjs` | 38/38 OK |
| `grep -R "innerHTML" ...` | 0 nuevos |

**Importante:**
No se modifica dashboard.  
No se modifica export CSV.  
No se modifica primera visita ni validación.  
No se modifica `FarmaciaTratamiento` ni `FarmaciaPautasCatalog`.  
No se modifica `kairos-os-lab` ni el panel de control.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.

**Pendiente:**
WO7G deberá adaptar dashboard como proyección del contrato común.  
WO8/WO posterior deberá revisar export/persistencia, incluyendo CSV.

---

## WO7F.2 — Bugfix desplegable sospechoso EA en Seguimiento

**Estado:** 🟡 **pending_review** (ejecutada por KairOS como operador local, pendiente de revisión visual Sil/Cora)
**HEAD de rama:** `646c1b1` (tras WO7F.2)

**Causa raíz diagnosticada:**
`getRelevantDrugCandidates()` dependía exclusivamente de `currentBiologicLines` (poblado por `syncBiologicControls`). Si el paciente se cargaba antes de que las líneas estuvieran disponibles, o si el desplegable se actualizaba en un momento donde `currentBiologicLines` estaba vacío, los candidatos del tratamiento principal no llegaban al DOM y el selector solo mostraba los fármacos de `followupOtherDrugs`.

**Corrección aplicada:**
- `getRelevantDrugCandidates()` ahora tiene un **fallback DOM** que lee `fhSegFarmaco` y `fhSegPrincipioActivo` directamente del formulario si `currentBiologicLines` está vacío, garantizando que el tratamiento principal siempre aparezca como candidato.
- El fallback DOM genera un candidato con id `dom:current-treatment` y label `"NombreFármaco — Tratamiento principal"`.
- Se añadió deduplicación con `seenIds` para evitar duplicados entre el fallback DOM y `getCurrentSelectedLine()`.
- Las etiquetas de candidatos cambiaron de formato `[Categoría] Nombre` a `Nombre — Categoría` (más legible en desplegable).
- Se verificó que `updateSuspectDrugSelector()` es la única función que escribe en `fhSeguimientoEaFarmacoSospechoso` (no hay rutas legacy que sobrescriban).

**Tests específicos añadidos:**
- Fallback DOM presente en `getRelevantDrugCandidates`
- Labels en formato `Nombre — Categoría` sin corchetes
- `mapOtherDrugToContract` no asigna `relation = 'principal'` a otros fármacos
- No hay otra función que sobrescriba el desplegable sospechoso EA

**Archivos modificados:**
- `scripts/farmacia_seguimiento.js` — `getRelevantDrugCandidates()` con fallback DOM + labels limpias
- `tools/farmacia_seguimiento_check.mjs` — 11 nuevos tests WO7F.2 (92 total, 0 failed)
- `docs/farmacia_branch_manifest_20260614.md` — esta entrada

**Tests verificados:**
| Test | Resultado |
|---|---|
| `node --check scripts/farmacia_seguimiento.js` | OK |
| `node tools/farmacia_seguimiento_check.mjs` | 92/92 PASS |
| `node tools/farmacia_tratamiento_common_check.mjs` | 43/43 PASS |
| `node tools/farmacia_smoke_check.mjs` | 38/38 OK |
| `grep -R "innerHTML" ...` | 0 nuevos |

**Importante:**
No se modifica dashboard.  
No se modifica export CSV.  
No se modifica primera visita ni validación.  
No se modifica `FarmaciaTratamiento` ni `FarmaciaPautasCatalog`.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.

---

## WO7G.1 — Dashboard: tratamiento principal y líneas biológicas desde contrato común

**Estado:** 🟡 **pending_review** (ejecutada por KairOS como operador local, pendiente de revisión visual Sil/Cora)
**HEAD de rama:** `1bba1dc` (tras WO7G.1)

**Alcance:**
- Se adapta el resumen terapéutico (`renderDashboard()`) para separar tratamiento principal de otras líneas activas en lugar de colapsarlo en cadena única `join(' + ')`.
- Se actualiza `getPatientBiologicLines()` para usar `FarmaciaTratamiento.buildTreatmentFromPatient()` como primera opción, con fallback a lógica legacy.
- Se actualiza `renderBiologicLines()` para mostrar dosis, vía, pauta, fechas de inicio/fin por línea y usar etiquetas de estado y relación del contrato.
- Se carga `scripts/farmacia_tratamiento_common.js` en el HTML del dashboard.

**Archivos modificados:**
- `farmacia_dashboard_paciente.html` — script tag para `farmacia_tratamiento_common.js`
- `scripts/farmacia_dashboard_paciente.js` — `getPatientBiologicLines()` con helper, `renderDashboard()` sin colapso, `renderBiologicLines()` con contrato
- `tools/farmacia_dashboard_paciente_check.mjs` — 25 tests (creado)
- `docs/farmacia_branch_manifest_20260614.md` — esta entrada

**Tests verificados:**
| Test | Resultado |
|---|---|
| `node --check scripts/farmacia_dashboard_paciente.js` | OK |
| `node tools/farmacia_dashboard_paciente_check.mjs` | 25/25 PASS |
| `node tools/farmacia_tratamiento_common_check.mjs` | 43/43 PASS |
| `node tools/farmacia_smoke_check.mjs` | 38/38 OK |
| `grep -R "innerHTML" ...` | 0 nuevos |

**Importante:**
No se modifica timeline terapéutico.  
No se modifica longitudinal, PROMs, EA ni comorbilidades.  
No se modifica seguimiento, primera visita ni validación.  
No se modifica export CSV.  
No se modifica `FarmaciaTratamiento` ni `FarmaciaPautasCatalog`.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.

**Pendiente:**
WO7G.2 podrá revisar timeline terapéutico o secundarios si aporta valor visual real.  
WO8/WO posterior revisará export/persistencia, incluyendo CSV.

---

## WO7H.1 — Consistencia visual de línea terapéutica entre Dashboard y Seguimiento

**Estado:** 🟡 **pending_review** (ejecutada por KairOS como operador local, pendiente de revisión visual Sil/Cora)
**HEAD de rama:** `f3efec7` (tras WO7H.1)

**Alcance:**
- Corregidas las cadenas de fallback de nombre de línea terapéutica en Dashboard y Seguimiento para priorizar `farmaco_nombre` sobre `nombre_comercial` cuando `nombre_linea` no está disponible (porque el helper `FarmaciaTratamiento` normaliza `nombre_linea` → `farmaco_nombre`).
- En Dashboard: `renderDashboard()` primaryName y otherNames, `renderBiologicLines()` value.
- En Seguimiento: `applySelectedBiologicLine()` setSegValue('fhSegFarmaco') ahora usa `farmaco_nombre` antes que `nombre_comercial`.
- Añadida sincronización de tarjeta CIMA contextual: si el snapshot del catálogo no corresponde al principio activo de la línea seleccionada, se limpia la tarjeta CIMA y el snapshot, evitando que muestre principios activos de otros pacientes (ej. Secukinumab de FH-001).

**Archivos modificados:**
- `scripts/farmacia_dashboard_paciente.js` — fallback chains en 3 ubicaciones
- `scripts/farmacia_seguimiento.js` — fallback en applySelectedBiologicLine + sincronización CIMA
- `tools/farmacia_dashboard_paciente_check.mjs` — 3 nuevos tests WO7H.1 (28 total, 0 failed)
- `tools/farmacia_seguimiento_check.mjs` — 5 nuevos tests WO7H.1 (99 total, 0 failed)

**Tests verificados:**
| Test | Resultado |
|---|---|
| `node --check scripts/farmacia_dashboard_paciente.js` | OK |
| `node tools/farmacia_dashboard_paciente_check.mjs` | 28/28 PASS |
| `node --check scripts/farmacia_seguimiento.js` | OK |
| `node tools/farmacia_seguimiento_check.mjs` | 99/99 PASS |
| `node tools/farmacia_tratamiento_common_check.mjs` | 43/43 PASS |
| `node tools/farmacia_smoke_check.mjs` | 38/38 OK |
| `grep -R "innerHTML" ...` | 0 nuevos |

**Resultado esperado para FH-004:**
| Pantalla | Campo | Valor |
|---|---|---|
| Dashboard | Tratamiento principal | Belimumab |
| Dashboard | Otras líneas activas | Rituximab |
| Seguimiento | Línea/biológico principal | Belimumab |
| Seguimiento | Fármaco / marca | Belimumab |
| Seguimiento | Tarjeta CIMA | — (limpia si snapshot no coincide) |

**Importante:**
No se modifica `FarmaciaTratamiento`.  
No se modifica timeline, longitudinal, PROMs, EA, concomitantes ni export CSV.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.

**Pendiente:**
WO7G.2 podrá revisar timeline terapéutico o secundarios del dashboard si aporta valor visual real.  
WO8/WO posterior revisará export/persistencia, incluyendo CSV.

## WO7H.2 — Bugfix Seguimiento: línea seleccionada y campos visibles coherentes

**Estado:** completada técnicamente, pendiente de revisión visual Sil/Cora  
**HEAD de rama:** `e9dfba6` (tras WO7H.2)

**Causa raíz:** `getCurrentSelectedLine()` solo comparaba `linea_id` contra `select.value`. Las líneas normalizadas vía `buildTreatmentFromPatient()` tienen `tratamiento_id` (no `linea_id`), por lo que el match fallaba y la función retornaba `currentBiologicLines[0]` (Abatacept/Orencia para FH-004) aunque el selector mostrara Belimumab.

**Corrección:** `getCurrentSelectedLine()` ahora usa `matchVal = linea_id || tratamiento_id` para la comparación, alineando el matching con cómo se genera `opt.value` en `syncBiologicControls()` (que ya usaba `linea_id || tratamiento_id`).

**Archivos modificados:**
- `scripts/farmacia_seguimiento.js` — patch de 3 líneas en `getCurrentSelectedLine()`
- `tools/farmacia_seguimiento_check.mjs` — 6 nuevos tests WO7H.2 (105 total, 0 failed)

**Tests:**
- `node tools/farmacia_seguimiento_check.mjs` — 105/105 PASS
- `node tools/farmacia_dashboard_paciente_check.mjs` — 28/28 PASS
- `node tools/farmacia_tratamiento_common_check.mjs` — 43/43 PASS
- `node tools/farmacia_smoke_check.mjs` — 38/38 OK
- `grep -c innerHTML` — 0

**Resultado esperado para FH-004:**
- Selector Belimumab → campos tratamiento actual: Belimumab/Benlysta (no Abatacept/Orencia)
- Abatacept/Orencia conservado como histórico/suspendido en longitudinal
- Tarjeta CIMA/contextual limpia si snapshot no corresponde a línea seleccionada

**Importante:**
No se modifica `FarmaciaTratamiento`.  
No se modifica Dashboard.  
No se modifica timeline, concomitantes, sospechoso EA ni export CSV.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.

**Pendiente:**
WO7G.2 podrá revisar timeline terapéutico o secundarios del dashboard si aporta valor visual real.  
WO8/WO posterior revisará export/persistencia, incluyendo CSV.

## WO7H.3 — Bugfix Seguimiento: candidatos de sospechoso EA

**Estado:** completada técnicamente, pendiente de revisión visual Sil/Cora  
**HEAD de rama:** `070e818` (tras WO7H.3)

**Causa raíz:** `getRelevantDrugCandidates()` usaba `'line:' + line.linea_id` como clave de deduplicación. Las líneas normalizadas vía `buildTreatmentFromPatient()` tienen `tratamiento_id` pero no `linea_id`, por lo que todas las líneas generaban la misma clave `'line:undefined'`. Solo la primera línea del array (Abatacept, al ser la más antigua en `patient.biologicos`) pasaba la dedup, ocultando Belimumab, Rituximab y el resto de candidatos.

**Corrección:**
1. Clave de dedup ahora usa `line.linea_id || line.tratamiento_id || line.id || 'bio-' + index`
2. Nombre visible de línea incluye `farmaco_nombre` como fallback
3. Se añade campo `prioridad` y ordenación: principal (1) → activo (2) → concomitante (3) → adicional (4) → histórico/suspendido (5)
4. Fallback DOM y dedup de línea seleccionada también corregidos

**Archivos modificados:**
- `scripts/farmacia_seguimiento.js` — 17 líneas modificadas en `getRelevantDrugCandidates()`
- `tools/farmacia_seguimiento_check.mjs` — 11 nuevos tests WO7H.3 (116 total, 0 failed)

**Tests:**
- `node tools/farmacia_seguimiento_check.mjs` — 116/116 PASS
- `node tools/farmacia_dashboard_paciente_check.mjs` — 28/28 PASS
- `node tools/farmacia_tratamiento_common_check.mjs` — 43/43 PASS
- `node tools/farmacia_smoke_check.mjs` — 38/38 OK
- `grep -c innerHTML` — 0

**Resultado esperado para FH-004:**
- Selector sospechoso EA incluye: Belimumab (tratamiento principal), Rituximab (línea activa), Abatacept (histórico/suspendido)
- Belimumab aparece primero en la lista
- Abatacept no es la única opción

**Importante:**
Se mantiene WO7H.2: línea seleccionada Belimumab → campos visibles Belimumab.  
No se modifica Dashboard.  
No se modifica `FarmaciaTratamiento`.  
No se modifica timeline, export CSV ni datos demo.  
WO6 sigue `pending_review`.  
Fuente activa funcional sigue WO5.

**Pendiente:**
WO7G.2 podrá revisar timeline terapéutico o secundarios del dashboard si aporta valor visual real.  
WO8/WO posterior revisará export/persistencia, incluyendo CSV.

## WO7G.2 — Dashboard: consistencia visual del timeline terapéutico

**Estado:** completada técnicamente, pendiente de revisión visual Sil/Cora  
**Rama:** `work/farmacia-post-demo-wo7g2-dashboard-timeline-20260614`  
**HEAD de rama:** (pendiente de commit)

**Alcance:**
Se ajusta `renderTimelineTratamiento()` del Dashboard Paciente para priorizar `nombre_linea`/`farmaco_nombre`/`principio_activo` frente a `nombre_comercial`, y se añade indicación visual simple de estado (Activo/Histórico) mediante badge y descripción textual.

**Cambios:**
1. Nuevo fallback de nombre: `t.nombre_linea || t.farmaco_nombre || t.principio_activo || t.nombre_comercial || 'Tratamiento'`
2. Indicación de estado: badge `activo` + texto " — Activo" para líneas activas; " — Histórico" para eventos de fin
3. `badgeLabels` extendido con `activo: 'Activo'`

**Resultado esperado FH-004:**
- Abatacept (no Orencia) como nombre principal del evento histórico
- Belimumab (no Benlysta) como nombre principal del evento activo
- Rituximab (no Rixathon) como nombre principal del evento añadido
- Badge "Activo" + descripción " — Activo" en inicios de Belimumab y Rituximab
- Badge "Fin" + descripción " — Histórico" en fin de Abatacept

**Archivos modificados:**
- `scripts/farmacia_dashboard_paciente.js` — 8 líneas en `renderTimelineTratamiento()`
- `tools/farmacia_dashboard_paciente_check.mjs` — 8 nuevos tests WO7G.2 (37 total, 0 failed)

**Tests:**
- `node tools/farmacia_dashboard_paciente_check.mjs` — 37/37 PASS
- `node tools/farmacia_seguimiento_check.mjs` — 116/116 PASS
- `node tools/farmacia_tratamiento_common_check.mjs` — 43/43 PASS
- `node tools/farmacia_smoke_check.mjs` — 38/38 OK
- `grep -c innerHTML` — 0

**Importante:**
No se modifica la rama demo.  
No se modifica `main`.  
No se modifica seguimiento, primera visita ni validación.  
No se modifica `FarmaciaTratamiento`.  
No se modifica longitudinal demo JSON.  
No se modifica export CSV.  
No se implementa WO8.

**Pendiente:**
Revisión visual de Sil.  
WO8 queda pendiente para export/persistencia.
