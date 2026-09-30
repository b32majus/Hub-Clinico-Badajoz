# PROMueve — Auditoría manual de producto Sil 2026-09-28 — revisión viva

**Estado:** `IN_PROGRESS / PARTIALLY_PUBLISHED` — TRAIN 1 (#442) publicado por PR #449; la frontera Foundation Reuma F5.2/F5.3 fue publicada después por TRAIN 07 (#454 / PR #459) y F5.4 por TRAIN 08 (#461 / PR #467), y la frontera Foundation Farmacia F4.3 por TRAIN 09 (#470 / PR #474) + TRAIN 09.1 (#475 / PR #478), en todos los casos sin reinterpretar los hallazgos de producto no relacionados; el checkpoint post-F4.3 (#480) registró un `PRODUCT_DEFECT_BLOCKING` (PV-001, follow-up aprobado #482); el resto de hallazgos conserva su estado explícito
**Ámbito:** PROMueve Extremadura — Farmacia Hospitalaria, Reumatología y capacidades transversales; Dermatología queda registrada pero diferida de la ejecución inmediata
**Autoridad de desarrollo:** `promueve/nexus-v4`
**Último HEAD de producto Nexus verificado para esta reconciliación:** `91262d8007642aef1d3cbe21e24d20ff369ee19b` — merge PR #478 (TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1 #475); los merges documentales posteriores pueden mover el tip Git sin cambiar este HEAD de producto
**Issue documental de origen:** #438
**PR documental de origen:** #439 — supersedida para publicación; no mergear su base histórica
**Closeout documental vigente:** #451, sobre rama fresca de `promueve/nexus-v4`

## 0. Propósito y reglas

Este documento conserva la revisión manual de producto de Sil, su shaping y la adjudicación de lo que ya se ha publicado. No convierte por sí solo una propuesta en funcionalidad implementada: cada cambio ejecutado conserva su issue/WO, candidate, PR y evidencia.

Reglas transversales:
- distinguir `ya implementado`, `wired`, `visible`, `demostrado`, `defecto`, `mejora`, `discovery`, `futuro`, `piloto` y `producción`;
- tratamiento solicitado ≠ tratamiento validado;
- tratamiento previo ≠ nuevo inicio;
- no inferir dosis, vía, pauta, presentación, inducción, duración, renovación, switch, add-on, causalidad, resultado de validación o línea terapéutica desde nombre de fármaco, CIMA/catálogo, historial, etiqueta o ausencia;
- datos ausentes permanecen vacíos/desconocidos/pendientes;
- usar datos sintéticos durante desarrollo/QA;
- el catálogo identifica/ayuda a seleccionar; nunca decide valores terapéuticos.

## 1. Correcciones y decisiones de autoridad humana — 2026-09-28

1. La referencia previa a **ASDAS en artritis psoriásica** fue una atribución de patología equivocada durante la revisión. Se retira como requisito/hallazgo ejecutable. No se abre discovery ni WO a partir de esa asociación.
2. `SIL-REV-007` a `011` (Dermatología) permanecen registrados para no perder contexto, pero quedan **DEFERRED / OUT_OF_CURRENT_EXECUTION**.
3. La automatización CIMA/GitHub Actions sigue pendiente y se tratará aparte. **No bloqueó** el consumo/autocomplete del catálogo publicado actual por Reuma.
4. TRAIN 1 se ejecutó y publicó: PCR/unidades (#443) → catálogo/autocomplete (#444) → prebiológico (#445), con correctiva categorial #447 antes de promoción; PR #449 quedó mergeada.
5. La siguiente secuencia de producto permanece: contrato de renovaciones → Reuma→Farmacia tras discovery → automatización CIMA, salvo nueva adjudicación humana.
6. No se crea documentación adicional por ritual. Cuando el significado/aceptación cabe de forma durable en un issue/WO, el issue es autoridad suficiente.
7. TRAIN-NEXUS-REUMA-FOUNDATION-07 (#454 / PR #459) publicó la frontera Foundation Reuma **F5.2** (migración de lectura de Seguimiento #455 y Estadísticas #456) y **F5.3** (frontera de compatibilidad fail-closed del writer 497, #457) sobre el merge `3c929f8a...`. Después, TRAIN-NEXUS-REUMA-ACT-CONTRACT-08 (#461 / PR #467, merge `e64b65db...`) publicó **F5.4** (acto de escritura Reuma: contrato Visit Act v1 #462, adapter act→legacy 497 #463 y cutover soportado de Primera Visita y Seguimiento #464), dejando F5.1–F5.4 en estado PUBLISHED. Ambas publicaciones son trabajo Foundation de lectura/encapsulación/acto de escritura y **no cierran, alteran ni interpretan** `SIL-REV-001/002/003`, #446 (renovaciones), Reuma→Farmacia, Dermatología ni CIMA.
8. TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 (#470 / PR #474, merge `bf0cb3d...`) y TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1 (#475 / PR #478, merge `91262d8007642aef1d3cbe21e24d20ff369ee19b`; CI post-merge run `36744075965` success) publicaron la frontera Foundation Farmacia **F4.3** (migración completa de lecturas de paciente detrás del facade/contrato V2 y seams sync; stale init-read race resuelta por `f82bd24`; cinco checkers de #477 en `HARNESS_DRIFT_FIXED`), sin tocar esta auditoría de producto.
9. El checkpoint visual post-F4.3 (#480, TRAIN #479 T1) registró sobre `91262d8` 17 observaciones `PASS` y **1 `PRODUCT_DEFECT_BLOCKING` (PV-001)**: defecto funcional-clínico **preexistente** del camino legacy coexistence, descubierto mediante ruta soportada — Primera Visita presentó el tratamiento **solicitado** de un paciente demo pendiente como «Relación terapéutica: validado» e hidrató la captura con él; no fue introducido por F4.3 y permanece **ABIERTO**. Estado T1 `HUMAN_STOP_BLOCKER`; **no hay salida limpia hacia F4.4**. Follow-up técnico aprobado: **#482** (WO-NEXUS-FARMACIA-PV-001), no ejecutado dentro del TRAIN #479. Detalle: [`PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md`](PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md). Esta secuencia de producto no cambia: **#446 renovaciones → Reuma→Farmacia discovery → CIMA** salvo nueva adjudicación humana.

## 2. Matriz viva de hallazgos

| ID | Tema | Naturaleza | Alcance | Decisión/timing | Estado |
|---|---|---|---|---|---|
| `SIL-REV-001` | Nomenclatura oficial de programas/procesos FH SES | DATA / INTEROPERABILITY | CORE + consumo FH | Antes de ampliar reportes | PROPOSED |
| `SIL-REV-002` | Presets de informes periódicos | FEATURE / CONFIG | CORE | Tras contrato de datos mínimo | PROPOSED |
| `SIL-REV-003` | Reporte trimestral Cosentyx | FEATURE / REPORT | MODULE FH + CORE reporting | Discovery/contrato | PROPOSED |
| `SIL-REV-004` | Simplificación prebiológico Reuma | CLINICAL FLOW / UX | MODULE Reuma | #445 → PR #449 | **PUBLISHED / SYNTHETIC_QA** |
| `SIL-REV-005` | Solicitud Reuma→Farmacia TXT | INTEROPERABILITY | MODULE Reuma×FH | Discovery primero | DISCOVERY_FIRST |
| `SIL-REV-006` | PCR/unidades por calculadora | CLINICAL SAFETY / DATA | CORE + MODULE/CALCULATOR; site queda explícito sólo cuando proceda | #443 → PR #449 | **PUBLISHED / SYNTHETIC_QA** |
| `SIL-REV-007` | Superficie Dermatología global | FEATURE / NAVIGATION | MODULE Derma | Fuera de ejecución actual | DEFERRED |
| `SIL-REV-008` | Formulario simple Derma→Farmacia | INTEROPERABILITY | MODULE Derma×FH | Fuera de ejecución actual | DEFERRED |
| `SIL-REV-009` | Hub HS completo | FEATURE / DATA | MODULE Derma-HS | Fuera de ejecución actual | DEFERRED |
| `SIL-REV-010` | Hub Psoriasis completo | FEATURE / DATA | MODULE Derma-PsO | Fuera de ejecución actual | DEFERRED |
| `SIL-REV-011` | Contrato común Derma→FH | INTEROPERABILITY | CORE + MODULE | Fuera de ejecución actual | DEFERRED |
| `SIL-REV-012` | Alertas de renovación | CLINICAL FLOW | CORE workflow + FH | N0/contrato antes de implementación | SHAPING_APPROVED |
| `SIL-REV-013` | Handoff FH→Enfermería→servicio→FH | INTEROPERABILITY / DATA | CORE + MODULE×SITE | Tras contrato de renovaciones | SHAPING_APPROVED |
| `SIL-REV-014` | Dashboard renovaciones Enfermería | UX / REPORT | MODULE Enfermería | Después del MVP | DEFERRED |
| `SIL-REV-015` | ASDAS atribuido a APs | Corrección de revisión | — | Retirado | WITHDRAWN_WRONG_ATTRIBUTION |
| `SIL-REV-016` | Catálogo/autocomplete común en Reuma | DATA / UX | CORE catalog capability + MODULE Reuma | #444 + correctiva #447 → PR #449 | **PUBLISHED / SYNTHETIC_QA** |
| `SIL-REV-017` | Automatización CIMA del catálogo | TOOLING / DATA SUPPLY | CORE tooling | Train posterior separado | DEFERRED_SEPARATE_CONCERN |

## 3. `SIL-REV-001` — nomenclatura SES para procesos FH

Sil identifica un catálogo/fuente de nomenclatura de programas/procesos FH utilizado como referencia SES. Dirección propuesta:
- mantener una referencia global de identificación/nomenclatura para Farmacia;
- evitar denominaciones locales divergentes cuando exista autoridad acordada;
- reutilizarla en formularios, filtros, dashboards y reportes sólo tras ingestión/validación de la fuente;
- no asumir que una denominación FH deba propagarse automáticamente a otros servicios.

Pendiente: ingestión/normalización de la fuente y WO separada.

## 4. `SIL-REV-002/003` — presets de reporting y reporte trimestral Cosentyx

Dirección:
- presets versionados que describan ventana, población, indicación, evento/tratamiento explícito y salida;
- los presets no infieren eventos clínicos;
- el dashboard no se convierte en fuente de verdad clínica.

Primer caso propuesto, trimestral:
- psoriasis: nuevos inicios explícitos de Cosentyx dentro del trimestre;
- artritis psoriásica: nuevos inicios explícitos de Cosentyx dentro del trimestre;
- HS: inicio explícito de administración q2w durante el trimestre, distinguiendo cuando conste inicio directo q2w de intensificación explícita q4w→q2w.

No es un reporte de unidades dispensadas. No inferir intensificación desde el nombre del fármaco, tratamiento actual o ausencia de datos.

## 5. `SIL-REV-004` — simplificación del circuito prebiológico Reuma

### Problema de partida
La UI/modelo exponía un circuito muy detallado y un estado global legacy `NO_EVALUADO / EN_CURSO / APTO / NO_APTO`, incluyendo inferencia de `EN_CURSO` desde actividad de detalle.

### Contrato publicado
Dos bloques operativos independientes:
- **Analítica**;
- **Medicina Preventiva**.

Cada bloque admite exactamente:
- `NO_SOLICITADA`;
- `SOLICITADA_PENDIENTE`;
- `OK`.

Reglas publicadas:
- `OK` sólo por selección profesional explícita o importación autorizada;
- resultados, fechas, vacunación, derivación u otro detalle no generan automáticamente `OK` ni otro estado;
- no se sintetiza un estado global `APTO` por tener ambos bloques en `OK`;
- estado ausente/desconocido permanece vacío/fail-safe;
- el detalle y estado global legacy ya persistidos no se destruyen ni se migran heurísticamente, aunque dejan de capturarse en el flujo principal.

### Evidencia de publicación
WO #445, commit `4eeaf1ffdef8dae94d8a903f8d32619e9a31c041`, incluida en PR #449. Oracle determinista prebiológico `16/0`; QA Chromium soportada `33/0`, con `console.error=0` y `pageerror=0`. Evaluación sintética; no piloto/producción.

## 6. `SIL-REV-005` — solicitud Reuma→Farmacia

Dirección aceptada, **no contrato todavía**:
- acción explícita `Solicitar tratamiento a Farmacia`;
- salida TXT/estructurada siguiendo un contrato acordado con Farmacia;
- generar/copiar una solicitud no equivale a enviarla, persistirla ni validarla.

El conjunto exacto de campos queda bloqueado hasta discovery con Farmacia. No inventar dosis, vía, pauta, presentación, inducción, switch/add-on ni resultado de validación.

## 7. `SIL-REV-006` — PCR y unidades de calculadoras

### Riesgo de partida
Un mismo valor numérico de PCR no puede entrar silenciosamente en una fórmula si se desconoce o no coincide la unidad de origen.

### Contrato publicado
- el valor y unidad de origen se capturan explícitamente; no se infiere unidad por magnitud;
- conversión determinista `1 mg/dL = 10 mg/L` en ambos sentidos;
- ASDAS-CRP y DAS28-CRP declaran unidad esperada `mg/L`;
- DAPSA y SDAI declaran unidad esperada `mg/dL`;
- unidad ausente/desconocida produce fallo seguro del componente dependiente de PCR, no score silencioso;
- valor derivado y conversión quedan trazables y no sobrescriben el dato fuente;
- la UI muestra la conversión cuando realmente ocurre.

La implementación no introduce por sí sola una configuración de unidad por hospital: el contrato de `site` sólo aplica cuando una fuente/site explícito lo requiera; el dato de unidad usado por estas superficies es explícito en la captura/registro.

### Evidencia de publicación
WO #443, commit `636f838844d9304a8b2b2acb3e57394a680aeec7`, incluida en PR #449. Oracle determinista PCR `27/0`; QA Chromium soportada `32/0`, con consola limpia. Las fórmulas clínicas existentes permanecieron fuera del alcance salvo la conversión de unidad. Evaluación sintética; no piloto/producción.

## 8. `SIL-REV-007` a `011` — Dermatología

Se conserva el contexto previo: formulario simple Derma→FH, baseline HS, baseline PsO y objetivo futuro de un contrato común Derma→FH.

**Decisión actual:** `DEFERRED / OUT_OF_CURRENT_EXECUTION`.

No introducir esta línea en los siguientes tickets salvo nueva autorización. La deferencia no equivale a descarte.

## 9. `SIL-REV-012/013` — renovaciones FH↔Enfermería↔servicios

### Problema
Farmacia necesita anticipar prescripciones próximas a caducar y coordinar la renovación con el servicio prescriptor sin confundir una comunicación operativa con una validación FH.

### Autoridad previa útil
Existe `docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`, propuesta avanzada no implementada. Conserva decisiones valiosas: la renovación pertenece a una **línea de tratamiento**, fechas confirmadas/verificadas/estimadas son distintas, switch es explícito y reglas temporales son configurables. El contrato siguiente debe reconciliar esa arquitectura con el flujo operativo actual.

### Hipótesis a cerrar antes de implementación
- fecha de referencia que inicia el cómputo;
- significado de caducidad;
- duración/default configurable;
- `warningWindowDays` (60 días es hipótesis inicial, no constante universal);
- identidad estable de línea/ciclo/renovación;
- estados y autoridad de transición;
- contrato de ida y vuelta con Excel Enfermería;
- idempotencia, duplicados, reimportaciones y filas rechazadas;
- versionado del contrato.

Invariante: **`RENEWED_REPORTED ≠ FH_UPDATED`**. Un check/import desde Enfermería nunca prolonga por sí solo la validación farmacoterapéutica.

Dashboard Enfermería queda fuera del MVP hasta que identidad/estados/reconciliación estén demostrados.

## 10. `SIL-REV-015` — corrección ASDAS

La asociación previa de ASDAS con APs fue un error de atribución durante la conversación de revisión. Queda **retirada**.

No se mantiene como deuda, requisito, discovery ni ticket. Cuando Sil señale la pantalla/patología realmente afectada, se auditará ese caso concreto desde la autoridad publicada.

## 11. `SIL-REV-016` — catálogo/autocomplete farmacológico Reuma

### Decisión publicada
Reuma consume una capacidad común de catálogo para los diez controles farmacológicos soportados, preservando las tres categorías funcionales **Sistémicos / FAMEs / Biológicos**.

### Fuente y categorización
El catálogo hospitalario publicado `data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx` no contiene una columna de categoría y tiene cobertura insuficiente para todos los miembros declarados de Reuma. La correctiva #447 añadió `data/catalogos/reuma/reuma_medication_categories.v1.json` como fuente central, explícita y versionada de pertenencia categorial.

- la pertenencia no se infiere en runtime desde nombre, dosis, vía, presentación, contexto o historial;
- `search(query, category)` sólo devuelve miembros explícitos de la categoría y falla cerrado ante categoría/fuente ausente o vacía;
- los miembros declarados no cubiertos por el workbook pueden existir como `explicit_entries` identity-only, sin datos terapéuticos;
- seleccionar un medicamento sólo identifica/escribe el nombre en el control; no escribe ni sobrescribe dosis, vía, pauta, presentación, inducción, duración, línea, switch/add-on, renovación ni validación;
- la automatización CIMA/GitHub Actions futura sigue desacoplada y pendiente.

### Evidencia de publicación
T2 #444 commit `fc598166396e747d4b87e78219a47436694f2395`; correctiva T2b #447 commit `6b8582a158bdcd6f8e7e425e0e83bc6eb27ca952`; ambas publicadas por PR #449. Evidencia final: oracle #444 `15/0`, categoría `33/0`, QA Chromium catálogo/categorías `46/0`, `npm run verify:nexus` PASS y CI post-merge verde.

### Deuda no bloqueante preservada
- #448: el medicamento ya preseleccionado/restaurado puede no hidratar el input visible del autocomplete hasta el primer `blur`; no se ha demostrado pérdida del valor subyacente.
- #450: la ruta legacy no categorizada `search(query)` puede devolver `explicit_entries` que no son filas del workbook. Ningún control farmacológico soportado de Reuma usa esa ruta.

## 12. `SIL-REV-017` — automatización CIMA

Separada del consumidor Reuma y **no implementada** por TRAIN 1.

La dirección futura sigue siendo:
`CIMA API → normalización → validación → diff/versionado → PR/revisión humana`.

La fuente categorial versionada de #447 no se debe presentar como sustituto definitivo de esa automatización.

## 13. Orden de ejecución — estado reconciliado

### TRAIN 0 — shaping / autoridad — SUPERSEDED POR AUTORIDAD PUBLICADA
El shaping original vive en #438/#439. Su contenido se incorpora y reconcilia aquí; #439 no debe mergearse sobre su base histórica.

### TRAIN 1 — seguridad clínica + Reuma — **PUBLICADO**
Secuencia ejecutada:
1. T1 #443 — PCR/unidades;
2. T2 #444 — catálogo/autocomplete Reuma;
3. T3 #445 — prebiológico mínimo Reuma;
4. T2b #447 — correctiva categorial previa a promoción.

Parent #442 y children #443/#444/#445/#447 están cerrados/completed. PR #449 fue mergeada a `promueve/nexus-v4`: candidate final `6b8582a158bdcd6f8e7e425e0e83bc6eb27ca952` → merge de producto `25e57b250ec3d7cc0fc80a501fa308a40620f902`; candidate y merge comparten tree `f8faba3ad0b485f21d27cd14244b37522cc40054`. GitHub Actions post-merge `Nexus deterministic gates` run `36483698667` terminó `success`.

### TRAIN 2 — renovaciones — SIGUIENTE SHAPING, NO IMPLEMENTADO
Contrato/estados/identidad antes de abrir implementación. #446 conserva el shaping preparado; verificar GitHub live antes de ejecutar.

### TRAIN FOUNDATION 07/08 — Reuma Foundation F5.2–F5.4 — PUBLICADO (separado de esta auditoría)
TRAIN-NEXUS-REUMA-FOUNDATION-07 (#454) publicó por PR #459 la migración de lectura de Seguimiento/Estadísticas (F5.2, #455/#456) y la frontera de compatibilidad del writer 497 (F5.3, #457); candidate `52cca14a...` → merge de producto `3c929f8a...`, tree `cc1d5e99...` idéntico. TRAIN-NEXUS-REUMA-ACT-CONTRACT-08 (#461) publicó después por PR #467 el acto de escritura Reuma (F5.4: contrato Visit Act v1 #462, adapter act→legacy 497 #463 y cutover soportado de Primera Visita y Seguimiento #464); candidate `773ee936...` → merge de producto `e64b65db29e6536c01e4f41e182fb157ac19ce2a`, tree `ec42a55b...` idéntico. Quedan registrados aquí como estado de la rama canónica, **no** como cierre de los hallazgos de producto de esta auditoría: #446/renovaciones conserva su estado y su hold `AWAIT_FEEDBACK`, Reuma→Farmacia sigue `DISCOVERY_FIRST`, Dermatología y CIMA siguen diferidas/separadas.

### TRAIN 3 — Reuma→Farmacia — DISCOVERY_FIRST
`RFH-0 discovery/contrato → RFH-1 salida estructurada → RFH-2 QA E2E`.

### TRAIN 4 — CIMA automation — DEFERRED_SEPARATE_CONCERN
Implementación separada del consumidor de catálogo.

## 14. Protocolo de ejecución — adjudicación real de TRAIN 1

La sección operativa de la PR draft #439 quedó superada antes de ejecutar. La autoridad efectiva del train fue #442 con Atenea C-077:
- supervisor Pi limpio con `pi --no-extensions` + Herdr;
- exactamente un worker Pi de implementación por ticket;
- perfiles de #442: #443 complex/GLM, #444 production-volume/DeepSeek, #445 complex/GLM; #447 se ejecutó como correctiva shaped sobre el candidate compuesto;
- checks deterministas y QA navegador soportada por ticket;
- native Gentle review con OpenCode V1 como transporte, siguiendo las transiciones provider-issued hasta terminal/burn cuando correspondió;
- checkpoints limpios y publicación separada tras decisión humana.

No usar el antiguo texto de #439 (`opencode serve` / `atenea-writer`) como autoridad del train ejecutado.

## 15. Matriz de colisión TRAIN 1 — adjudicada

| Ticket | Superficies principales | Resultado de composición |
|---|---|---|
| T1 #443 PCR/unidades | `scoreCalculators.js`, `formController.js`, primera/seguimiento, tests | secuencial |
| T2 #444 autocomplete | `formController.js`, primera/seguimiento, nuevos módulos catálogo/autocomplete, tests | secuencial |
| T3 #445 prebiológico | `prebiologicManager.js`, `formController.js`, primera/seguimiento, export/prefill, tests | secuencial |
| T2b #447 categorías | fuente categorial Reuma, catálogo/autocomplete, formulario y oráculos | correctiva post-train antes de promoción |

La decisión de no usar tres writers paralelos quedó validada por la colisión real de superficies compartidas.

## 16. Fuentes vivas para esta reconciliación

- GitHub live `promueve/nexus-v4` y PR #449;
- issues #442, #443, #444, #445 y #447 cerrados/completed;
- deudas abiertas #448 y #450;
- `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` de la base canónica;
- PR draft #439 como fuente de la auditoría/shaping original, no como rama a mergear;
- `docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`;
- `docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`;
- `docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md`;
- código/evidencia publicada por #449 en `scoreCalculators.js`, `drugCatalog.js`, `drugAutocomplete.js`, `prebiologicManager.js`, `formController.js`, primera/seguimiento y oráculos asociados.

## 17. Madurez

TRAIN 1 está **implementado, cableado, visible en sus superficies soportadas, probado mediante interacción soportada en Chromium y publicado en `promueve/nexus-v4`**. La evidencia usa datos/fixtures sintéticos.

Eso **no acredita piloto ni producción**. Tampoco acredita por extensión los hallazgos aún `PROPOSED`, `DISCOVERY_FIRST`, `SHAPING_APPROVED` o `DEFERRED` de esta auditoría.
