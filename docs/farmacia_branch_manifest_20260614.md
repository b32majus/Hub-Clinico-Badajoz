# Branch Manifest — Farmacia Hub Clínico Badajoz

**Fecha:** 2026-06-14
**Propósito:** Gobernanza de ramas del ecosistema farmacia tras WO2e (helper prebiológico completo).
**Autor:** KairOS (vía instrucción directa de Sil)

---

## Árbol de derivación

```
main (a25cccb) — demo pública inmutable
 └── 924d316 — tag congelado farmacia-demo-lunes-stable-924d316
      ├── work/farmacia-demo-lunes-plus-wo1-wo2-20260614 ← PRESERVADA (rama fuente WO3)
      │     ├── WO1: continuidad paciente
      │     ├── WO2: helper prebiológico base
      │     ├── WO2b: hardening contrato
      │     ├── WO2c: precedencia clínica
      │     ├── WO2d: precedencia texto libre
      │     └── WO2e: tests vacunación texto libre (T16-T17)
      └── work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614 ← FUENTE DE TRABAJO ACTUAL (post-revisión)
            └── WO3: bandeja bloqueantes prebiológicos
```

**Linealidad:** `924d316 → f27a976 → c7ac08a → 565c7fd → 0c72168 → c729e9c → e734724 → 540f321 → 9201003` ✅

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
|| **`work/farmacia-demo-lunes-plus-wo1-wo2-20260614`** | **`9201003`** | **Todo lo anterior consolidado: demo + WO1 + WO2 + WO2b-e** | **✅ Activa** | **✅ PRESERVADA** | **Rama fuente de WO3. No borrar.** |
|| `work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614` | `ef882d9` | WO3: pintar bloqueantes prebiológicos en bandeja de validación usando helper común | **✅ Activa** | **✅ FUENTE DE TRABAJO ACTUAL** | **Tras revisión de Sil, esta rama es la nueva fuente de trabajo.** |
|| `main` | `a25cccb` | Rama principal pública. Sin cambios tras la demo | ✅ Estable | ❌ No tocar sin autorización | No mergear sin validación explícita |
| `work/hermes/farmacia-demo-v0-2-candidate-20260606` | antecesor | Rama de trabajo original de WO5B | 🟡 Histórico | ❌ Histórico | No reabrir |
| Otras `work/` y `backup/` | varios | Ramas de preview, evaluaciones, experimentos previos | 🟡 Histórico | ❌ Histórico | No reabrir |

---

## Reglas de gobernanza

**Fuente de trabajo actual**
**`work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614`** (SHA `ef882d9`)
- Rama WO3 nacida desde `work/farmacia-demo-lunes-plus-wo1-wo2-20260614`.
- Tras revisión de Sil, esta rama es la nueva fuente de trabajo.
- La rama fuente anterior (`work/farmacia-demo-lunes-plus-wo1-wo2-20260614`) queda preservada.

### Rama fuente preservada
**`work/farmacia-demo-lunes-plus-wo1-wo2-20260614`** (SHA `9201003`)
- Rama que contiene demo + WO1 + WO2 + WO2b-e.
- No borrar. Se mantiene como punto de retorno si WO3 necesita revisión.

### Rama demo congelada
- `farmacia-demo-lunes-stable-924d316` (tag) → backup exclusivo.
- Preview GitHub Pages sigue apuntando a `924d316`.
- No mover, no mergear, no eliminar.

### main
- `main` en `a25cccb` — solo se actualiza cuando Sil autorice explícitamente.
- WO3 no mergea a main ni modifica Pages.

### Ramas WO cerradas
- Las ramas `work/farmacia-wo1-*`, `work/farmacia-wo2-*`, `work/farmacia-wo1b-*`, `work/farmacia-wo2b-*`, `work/farmacia-wo2c-*`, `work/farmacia-wo2d-*`, `work/farmacia-wo2e-*` son histórico de auditoría.
- No usar como base para nuevos desarrollos.
- Si se necesita revisar cambios puntuales de una WO concreta, leer el diff contra su ancestro — no reabrir la rama.

### Prohibiciones generales
- ❌ No merge a main sin validación explícita de Sil.
- ❌ No tocar Pages settings (siguen apuntando a `924d316`).
- ❌ No tocar preview congelada.
- ❌ No tocar datos demo.
- ❌ No tocar mapping/importación CIMA fuente.
- ❌ No borrar ramas sin autorización.

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
|| **`work/farmacia-demo-lunes-plus-wo1-wo2-20260614`** | **`92010036b65512f5057fc4071be2fbb40f1b4a18`** |
|| `work/farmacia-wo3-bandeja-bloqueantes-prebiologicos-20260614` | `ef882d944aff79d592d218c6c607d3b4455a8647` |
|| `main` | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` |

---

**Status:** `active`
**Revisión:** Pendiente de Sil.
**Actualizado:** 2026-06-14 (post-WO3)
