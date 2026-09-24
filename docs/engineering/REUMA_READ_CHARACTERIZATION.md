# PROMueve Nexus — Reuma Read Characterization Baseline (F1.3A)

**Estado:** `ACCEPTED_ENGINEERING_BASELINE`
**Issue / WO:** #386 — `WO-NEXUS-F1.3A`
**Base de shaping:** `promueve/nexus-v4` @ `d160f9669dbcbbfd355aa56009b527586b1eaa4e`
**Norma documental:** [`PRODUCT_DOCUMENTATION_STANDARD.md`](./PRODUCT_DOCUMENTATION_STANDARD.md)
**Código caracterizado:** `modules/dataManager.js` (+ `modules/hubTools.js`, `modules/fieldNormalizer.js`) — **sin modificación funcional** en esta WO.

Este documento caracteriza la superficie de lectura legacy de Reuma para el futuro Read Port (F5.1) por strangler. Separa de forma explícita lo que queda **congelado como acceptance** de lo que se observa y clasifica como **`KNOWN_LEGACY / NON_GOLDEN`**: ningún defecto conocido se convierte en requisito positivo ni bloquea una corrección semántica futura.

## 1. Cómo se caracteriza

| Elemento | Valor |
| --- | --- |
| Corpus | `tools/fixtures/reuma_read/corpus_v1.json` — 100% sintético, 5 patologías (ESPA/APS/AR/LES/SJOGREN), multi-visita, valores 0/false/vacío/`NA`/`ND` deliberados |
| Harness | `node` harness `tools/reuma_read_harness.mjs` — carga el legacy **sin modificar** en un sandbox `vm` con shims de entorno browser |
| Harness check | `node tools/reuma_read_harness_check.mjs` — 10 casos deterministas |
| Acceptance oracle | `node tools/reuma_read_acceptance_check.mjs` — invariantes golden + 5 casos de falsificación plantados |
| Datos reales | prohibidos; el corpus usa exclusivamente IDs `SYN-*` y el oracle lo verifica (A7) |

El harness captura la salida de consola del legacy para caracterizar exposición, sin convertirla en golden.

## 2. Invariantes congeladas como ACCEPTANCE (golden)

Solo comportamientos soportados por autoridad actual. Definidas en `tools/reuma_read_acceptance_check.mjs` (clases A1–A7):

- **A1** — reconocimiento de las cinco hojas/patologías soportadas (`ESPA`, `APS`, `AR`, `LES`, `SJOGREN`).
- **A2** — localización de paciente/historia a través de las hojas soportadas, resolviendo cada ID a su patología.
- **A3** — la historia de un ID sintético nunca devuelve registros de otro paciente ni mezcla patologías.
- **A4** — conservación distinguible de `0`, tokens explícitos `NA`/`ND` y cadena vacía donde la autoridad actual los distingue (casos concretos: `FR`, `APCC`, `PCR`, `Dactilitis_Total`, `Decision_Terapeutica_SEG`).
- **A5** — orden/agrupación de historia basado en las fechas sintéticas esperadas, sin inventar registros (ESPA y AR multi-visita).
- **A6** — un ID sintético desconocido devuelve `null`, sin fallback a registros inventados.
- **A7** — cero identificadores no sintéticos en corpus, fixtures y salida leída.

Falsificación demostrada (el oracle falla como se espera): F1 mezcla de patologías; F2 pérdida de visita válida; F3 colapso de `0` a ausencia; F4 identidad cruzada entre pacientes; F5 identificador no sintético.

## 3. Comportamientos observados clasificados `KNOWN_LEGACY / NON_GOLDEN`

Ninguno de estos comportamientos es requisito positivo. Quedan medidos/documentados para el strangler y su corrección es WO separada.

| # | Comportamiento observado | Evidencia | Riesgo |
| --- | --- | --- | --- |
| K1 | Fallback de guardado en `sessionStorage` que puede **limitar a 100/30 visitas por patología** y descartar visitas al recargar | `saveToSessionStorage` (cascada `[100, 30]`) | pérdida de visitas históricas en sesión |
| K2 | **Warn-and-continue** ante hojas faltantes o cabeceras críticas ausentes: el proceso sigue y notifica en lugar de fallar cerrado | `loadDatabase` + `validateSheetHeaders` | datos parciales presentados como válidos |
| K3 | Fallback de fechas: `parseVisitDate` devuelve **la fecha actual** ante fecha ausente/ilegible; el orden de historia puede basarse en "hoy" | `parseVisitDate` | orden de historia no adjudicado clínicamente |
| K4 | `getCanonicalField` colapsa `null`/`undefined`/`''` al fallback; ausencia y vacío explícito pueden confluir en campos canónicos (los valores crudos permanecen en el registro por spread) | `fieldNormalizer.js` | ausencia vs vacío no distinguible en campo canónico |
| K5 | **Logs que exponen datos**: `console.log` de la base completa tras cargar, columnas del primer paciente, columnas disponibles, IDs de paciente en warnings | `loadDatabase`, dashboards, `findPatientById` | exposición clínica en consola; deuda F6.2 |
| K6 | Clave `Frmacos` (con mojibake) se crea vacía aunque la hoja de Fármacos no exista; catálogo vacío con warn | `loadDatabase` | catálogo silenciosamente vacío |
| K7 | `getAllPatients` devuelve filas crudas sin etiqueta de patología; el consumidor debe inferirla | `getAllPatients` | semántica ambigua para la shell |
| K8 | Fallback a `window.MockPatients` para IDs no encontrados cuando el mock global existe (no activo en el harness); puede convertir "paciente inexistente" en "paciente demo" | `findPatientById`/`getPatientHistory` | ausencia enmascarada como datos |

## 4. Límites de esta caracterización

- No valida corrección clínica: caracterizar no es aceptar; la aceptación clínica es WO separada.
- No cubre exportación 497 (`exportManager.js`): F1.3B.
- No implementa Read Port (F5.1) ni toca persistencia/sesión (F6.1).
- No modifica `modules/dataManager.js` ni ningún runtime.
- El corpus es sintético y no acredita piloto ni producción.
