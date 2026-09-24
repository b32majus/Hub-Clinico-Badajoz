# Registro vivo de deuda — PROMueve Nexus

**Última actualización:** 2026-09-24
**Estado:** `LIVE / OPERATIVE`
**Ámbito:** deuda transversal de plataforma, Foundation, tooling, deployment y seams Nexus
**Issue origen inicial:** #389

Este documento es el inventario rápido de deuda **aceptada** de PROMueve Nexus. Resume estado, riesgo, condición de cierre y destino; la evidencia detallada permanece en los issues/PRs enlazados. No es backlog de ideas, no convierte findings informacionales en trabajo aprobado y no autoriza implementación por sí mismo.

La deuda específica de Farmacia continúa en [`FARMACIA_DEBT_REGISTER.md`](./FARMACIA_DEBT_REGISTER.md). Cuando una deuda Nexus pase a una WO concreta, se conserva aquí como `OPEN`, `TRANSFERRED` o `RESOLVED` con su referencia.

## Deuda registrada

| ID | Estado | Timing / destino | Origen / evidencia | Riesgo concreto | Criterio de cierre | WO / PR |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXUS-DEBT-001` | RESOLVED | Cerrada en TRAIN-NEXUS-FOUNDATION-02 | #389 D1; Promotion Review PR #388; cierre #394 | Los hashes de provenance del manifest se calculaban sobre bytes crudos; LF/CRLF podía cambiar el hash del mismo contenido lógico y degradar reproducibilidad entre checkouts. | Hashes de provenance calculados sobre contenido EOL-canonicalizado, con verificación plantada de invariancia LF/CRLF y de detección de drift real; phantom-dirty del blob CRLF de TOOLING_BASELINE eliminado. | #394 / PR final de TRAIN-NEXUS-FOUNDATION-02 |
| `NEXUS-DEBT-002` | RESOLVED | Cerrada en TRAIN-NEXUS-FOUNDATION-02 antes de consumo runtime F3 | #389 D2; Promotion Review PR #388; cierre #395 | Los checkers validaban módulos presentes, pero un artefacto manual podía omitir un módulo esperado y pasar la semántica previa. | Manifest demostrado completo respecto al profile y readiness respecto al manifest (ambas direcciones); negativos plantados `manifest-missing-module` / `readiness-missing-module`. | #395 / PR final de TRAIN-NEXUS-FOUNDATION-02 |
| `NEXUS-DEBT-003` | RESOLVED | Cerrada post Bootstrap 01 | #389 D3 | INDEX/WOS podían quedar stale tras merge de #388. | Estado publicado reconciliado con candidate y merge separados. | #390 / PR #391 → merge `e6309173...` |
| `NEXUS-DEBT-004` | OPEN | F2 hardening / F3 integration cuando el release map sea frontera consumida | #389 D4 | `module-releases.json` no tiene schema propio y `readiness: demonstrated` no transporta evidencia explícita; riesgo de inconsistencia al evolucionar la familia de contratos. | Decidir bajo presión real si necesita schema/evidence pointer y verificarlo; no inventar jerarquía antes de uso. | Pendiente |
| `NEXUS-DEBT-005` | OPEN / parcialmente resuelto | Distribuir por WOs futuras; no cleanup amplio | #389 D5 + reviews de #388 | Cobertura/mantenibilidad menor: baseline tooling desactualizado respecto a `ajv` (subhallazgo resuelto por #394), falta caso booleano `false` en corpus Reuma, comentario de orden incoherente, helper muerto, ROOT inconsistente, newline package, timeout/cuota VM y consola lossy. | Cada subhallazgo restante queda resuelto, transferido a WO específica o descartado con rationale; no cerrar por barrido oportunista. | Parcial: #394; resto Pendiente |
| `NEXUS-DEBT-006` | OPEN | Closeout de F3.1 / antes de que Home consuma PlatformContext | Promotion Review v1 PR #400 (nonblocking) | `PlatformContext.fromSnapshot` acepta snapshots fabricados que cumplen shape/freeze aunque el contrato afirma procedencia exclusiva de `ConfigurationRepository.load`; el test de aislamiento de input muta una copia post-load, no el input original. | Añadir procedencia verificable al snapshot (marca de origen del repository) y corregir el test para mutar el input original post-load; sin ampliar a framework/config remota. | Pendiente (correction futura de F3.1) |

## Reglas de uso

- Todo finding material aceptado de Promotion Review/RDD que deba sobrevivir al cierre de una PR entra aquí o en el registro de módulo correspondiente.
- El issue origen conserva el detalle; este registro mantiene la vista operativa y estable.
- `OPEN` no equivale a prioridad inmediata. El timing se decide por riesgo y dependencia real.
- `BEFORE_PILOT`, `BEFORE_F3` u otra condición de fase significa que no puede olvidarse antes de cruzar esa frontera.
- Una deuda solo pasa a `RESOLVED` con evidencia publicada; si se mueve a otro issue/WO se marca `TRANSFERRED` y se enlaza.
- No mezclar deudas heterogéneas en una WO solo para vaciar el registro.

## Próximo consumo

`NEXUS-DEBT-001` y `NEXUS-DEBT-002` quedaron cerradas por TRAIN-NEXUS-FOUNDATION-02 (#399), de modo que PlatformContext/Home puede consumir los contratos de deployment/readiness con completitud fail-closed demostrada. La Promotion Review v1 inicial (FAIL) se atendió con las correction WUs #398-C/#396-C; `NEXUS-DEBT-006` (nonblocking de PlatformContext), `NEXUS-DEBT-004` y los subhallazgos restantes de `NEXUS-DEBT-005` permanecen abiertos salvo que una WO futura los adopte explícitamente.
