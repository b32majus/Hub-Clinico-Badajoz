# Branch Manifest — Farmacia Hub Clínico Badajoz

**Fecha:** 2026-06-14 (revisión WO3)
**Propósito:** Gobernanza de ramas del ecosistema farmacia tras WO3 validada visualmente por Sil.
**Autor:** KairOS (vía instrucción directa de Sil)

---

## Árbol de derivación

```
main (a25cccb) — demo pública inmutable
 └── 924d316 — tag congelado farmacia-demo-lunes-stable-924d316
      ├── work/farmacia-demo-lunes-plus-wo1-wo2-20260614 ← PRESERVADA (punto de retorno)
      │     ├── WO1: continuidad paciente
      │     ├── WO2: helper prebiológico base
      │     ├── WO2b: hardening contrato
      │     ├── WO2c: precedencia clínica
      │     ├── WO2d: precedencia texto libre
      │     └── WO2e: tests vacunación texto libre (T16-T17)
      └── work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614 ✅ VALIDADA — NUEVA FUENTE DE TRABAJO
            └── WO3: bandeja bloqueantes prebiológicos
```

**Linealidad:** `924d316 → f27a976 → c7ac08a → 565c7fd → 0c72168 → c729e9c → e734724 → 540f321 → 9201003 → 3c4eb0b → ef1d21b → 0c29d4b → 669244a` ✅

---

## Tabla de ramas

| Rama / Ref | SHA | Contenido | Estado | Fuente de trabajo | Siguiente acción |
|---|---|---|---|---|---|
| `farmacia-demo-lunes-stable-924d316` (tag) | `924d316` | Demo original congelada: WO5B-WO5C.3, causalidad, PROMs, Morisky, concomitantes, reordenación visual 4 bloques | ✅ Congelado (backup) | ❌ Histórico | No tocar |
| `backup/farmacia-demo-lunes-stable-924d316` | `924d316` | Ídem, respaldo local | ✅ Congelado | ❌ Histórico | No tocar |
| `work/farmacia-wo1-continuidad-paciente-20260614` | `f27a976` | WO1: unificar `getQueryContext` con `findPatientByCip`, eliminar fallback silencioso | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo2-helper-bloqueantes-prebiologicos-20260614` | `c7ac08a` | WO2: helper `FarmaciaPrebiologico.evaluatePatientPrebiologico()` base | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo1b-wo2b-hardening-prebiologico-20260614` | `c729e9c` | WO1b/WO2b: hardening contrato (5 correcciones), tests T1-T6 | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo2c-prebiologico-precedencia-clinica-20260614` | `e734724` | WO2c: precedencia clínica TB y serologías parciales, tests T7-T11 | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo2d-prebiologico-text-fallback-20260614` | `540f321` | WO2d: precedencia texto libre alert>pending>ok>unknown, tests T12-T15 | ✅ Cerrado | ❌ Auditoría | No tocar |
| `work/farmacia-wo2e-vacunacion-text-fallback-20260614` | `9201003` | WO2e: regex acotado a frase + tests T16-T17 | ✅ Cerrado | ❌ Auditoría | No tocar |
| **`work/farmacia-demo-lunes-plus-wo1-wo2-20260614`** | **`9201003`** | **Todo lo anterior consolidado: demo + WO1 + WO2 + WO2b-e** | **✅ Preservada** | **✅ PUNTO DE RETORNO** | **Preservar. No borrar. No reabrir.** |
| **`work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614`** | **`669244a`** | **WO3: pintar bloqueantes prebiológicos en bandeja de validación usando helper común (`FarmaciaPrebiologico.evaluatePatientPrebiologico`)** | **✅ VALIDADA por Sil (2026-06-14)** | **✅ FUENTE DE TRABAJO ACTUAL** | **Nueva rama fuente. Próxima mejora: WO3c/WO4 (actividad del servicio).** |
| `main` | `a25cccb` | Rama principal pública. Sin cambios tras la demo | ✅ Estable | ❌ No tocar sin autorización | No mergear sin validación explícita |
| `work/hermes/farmacia-demo-v0-2-candidate-20260606` | antecesor | Rama de trabajo original de WO5B | 🟡 Histórico | ❌ Histórico | No reabrir |
| Otras `work/` y `backup/` | varios | Ramas de preview, evaluaciones, experimentos previos | 🟡 Histórico | ❌ Histórico | No reabrir |

---

## Reglas de gobernanza

### Fuente de trabajo actual — WO3 validada
**`work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614`** (SHA **`669244a`**)
- Validada visualmente por Sil el 2026-06-14. Tests 1-10 superados.
- Contiene: demo + WO1 + WO2 + WO2b-e + WO3 (bandeja bloqueantes prebiológicos).
- Incluye microfix WO2 (`ef1d21b`): patrón seguro `na` sin match parcial.
- Incluye fix WO3b (`669244a`): saneamiento manifiesto.
- **Esta rama es la nueva fuente de trabajo para próximas mejoras.**

### Rama fuente anterior — preservada como punto de retorno
**`work/farmacia-demo-lunes-plus-wo1-wo2-20260614`** (SHA `9201003`)
- Contiene demo + WO1 + WO2 + WO2b-e (sin WO3).
- Preservada como punto de retorno si hubiera que revertir WO3.
- No borrar, no reabrir para nuevos desarrollos.

### Rama demo congelada
- `farmacia-demo-lunes-stable-924d316` (tag) → backup exclusivo.
- Preview GitHub Pages sigue apuntando a `924d316` (main).
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

## Próxima mejora registrada — WO3c / WO4

**WO3c / WO4 — Actividad del servicio: tarjeta "Validaciones pendientes" clicable/desplegable**

**Necesidad detectada durante validación visual WO3 (2026-06-14):**
En `farmacia_actividad_servicio.html`, existe una tarjeta/resumen con el dato "Validaciones pendientes". Debe poder pincharse o desplegarse para mostrar también desde esta pantalla las validaciones pendientes, reutilizando la misma lógica y fuente de datos que la bandeja de Inicio Farmacia, sin duplicar datos ni lógica clínica.

**Estado:** Pendiente de planificar. No ejecutar hasta cerrar el manifiesto de WO3.

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
| **`work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614`** | **`669244af4663c0df1efb889a7448a5c4323284ff`** |
| `main` | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` |

---

**Status:** `active`
**Validación:** ✅ WO3 validada visualmente por Sil (2026-06-14). Tests 1-10 superados.
**Fuente de trabajo activa:** `work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614` (`669244a`)
**Punto de retorno:** `work/farmacia-demo-lunes-plus-wo1-wo2-20260614` (`9201003`)
**Próxima mejora registrada:** WO3c/WO4 — actividad del servicio, tarjeta validaciones pendientes clicable.
**Actualizado:** 2026-06-14 (post-validación Sil)
