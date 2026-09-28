# PROMueve — Auditoría manual de producto Sil 2026-09-28 — revisión viva

**Estado:** `IN_PROGRESS / SHAPED_FOR_NEXT_TRAINS` — no acredita implementación  
**Ámbito:** PROMueve Extremadura — Farmacia Hospitalaria, Reumatología y capacidades transversales; Dermatología queda registrada pero diferida de la ejecución inmediata  
**Autoridad de desarrollo:** `promueve/nexus-v4`  
**Base Nexus verificada al reconciliar esta fase:** `b5028ecdd4c0cb5e3385352c6028d9a48ef4b41d`  
**Issue documental:** #438  
**PR documental:** #439  

## 0. Propósito y reglas

Este documento conserva la revisión manual de producto de Sil y su shaping. No convierte por sí solo una propuesta en funcionalidad implementada. La autorización ejecutable se materializa en issues/WOs técnicos separados.

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
2. `SIL-REV-007` a `011` (Dermatología) permanecen registrados para no perder contexto, pero quedan **DEFERRED / OUT_OF_CURRENT_EXECUTION**. No forman parte de los próximos trains.
3. La automatización CIMA/GitHub Actions sigue pendiente y se tratará aparte. **No bloquea** el trabajo de consumo/autocomplete del catálogo publicado actual.
4. Se acepta como siguiente secuencia: shaping → seguridad PCR/unidades → catálogo/autocomplete Reuma → simplificación prebiológico → contrato de renovaciones → Reuma→Farmacia tras discovery → automatización CIMA.
5. No se crea documentación adicional por ritual. Cuando el significado/aceptación cabe de forma durable en un issue/WO, el issue es autoridad suficiente. OpenSpec se reserva para contratos/máquinas de estados que deban sobrevivir a un ticket.

## 2. Matriz viva de hallazgos

| ID | Tema | Naturaleza | Alcance | Decisión/timing | Estado |
|---|---|---|---|---|---|
| `SIL-REV-001` | Nomenclatura oficial de programas/procesos FH SES | DATA / INTEROPERABILITY | CORE + consumo FH | Antes de ampliar reportes | PROPOSED |
| `SIL-REV-002` | Presets de informes periódicos | FEATURE / CONFIG | CORE | Tras contrato de datos mínimo | PROPOSED |
| `SIL-REV-003` | Reporte trimestral Cosentyx | FEATURE / REPORT | MODULE FH + CORE reporting | Discovery/contrato | PROPOSED |
| `SIL-REV-004` | Simplificación prebiológico Reuma | CLINICAL FLOW / UX | MODULE Reuma | TRAIN 1 / T3 | APPROVED_FOR_EXECUTION_AUTHORITY |
| `SIL-REV-005` | Solicitud Reuma→Farmacia TXT | INTEROPERABILITY | MODULE Reuma×FH | TRAIN 3 tras discovery | DISCOVERY_FIRST |
| `SIL-REV-006` | PCR/unidades por calculadora y site | CLINICAL SAFETY / DATA | CORE + SITE + MODULE/CALCULATOR | TRAIN 1 / T1 | APPROVED_FOR_EXECUTION_AUTHORITY |
| `SIL-REV-007` | Superficie Dermatología global | FEATURE / NAVIGATION | MODULE Derma | Fuera del train actual | DEFERRED |
| `SIL-REV-008` | Formulario simple Derma→Farmacia | INTEROPERABILITY | MODULE Derma×FH | Fuera del train actual | DEFERRED |
| `SIL-REV-009` | Hub HS completo | FEATURE / DATA | MODULE Derma-HS | Fuera del train actual | DEFERRED |
| `SIL-REV-010` | Hub Psoriasis completo | FEATURE / DATA | MODULE Derma-PsO | Fuera del train actual | DEFERRED |
| `SIL-REV-011` | Contrato común Derma→FH | INTEROPERABILITY | CORE + MODULE | Fuera del train actual | DEFERRED |
| `SIL-REV-012` | Alertas de renovación | CLINICAL FLOW | CORE workflow + FH | TRAIN 2 tras N0 | SHAPING_APPROVED |
| `SIL-REV-013` | Handoff FH→Enfermería→servicio→FH | INTEROPERABILITY / DATA | CORE + MODULE×SITE | TRAIN 2 tras N0 | SHAPING_APPROVED |
| `SIL-REV-014` | Dashboard renovaciones Enfermería | UX / REPORT | MODULE Enfermería | Después del MVP | DEFERRED |
| `SIL-REV-015` | ASDAS atribuido a APs | Corrección de revisión | — | Retirado | WITHDRAWN_WRONG_ATTRIBUTION |
| `SIL-REV-016` | Catálogo/autocomplete común en Reuma | DATA / UX | CORE catalog capability + MODULE Reuma | TRAIN 1 / T2 | APPROVED_FOR_EXECUTION_AUTHORITY |
| `SIL-REV-017` | Automatización CIMA del catálogo | TOOLING / DATA SUPPLY | CORE tooling | TRAIN 4 | DEFERRED_SEPARATE_CONCERN |

## 3. `SIL-REV-001` — nomenclatura SES para procesos FH

Sil identifica un catálogo/fuente de nomenclatura de programas/procesos FH utilizado como referencia SES. Dirección propuesta:
- mantener una referencia global de identificación/nomenclatura para Farmacia;
- evitar denominaciones locales divergentes cuando exista autoridad acordada;
- reutilizarla en formularios, filtros, dashboards y reportes sólo tras ingestión/validación de la fuente;
- no asumir que una denominación FH deba propagarse automáticamente a otros servicios.

Pendiente: ingestión/normalización de la fuente y WO separada. No entra en TRAIN 1.

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

### Problema
La UI/modelo actual expone un circuito muy detallado. En código publicado existe además un estado global `NO_EVALUADO / EN_CURSO / APTO / NO_APTO`, detalle de múltiples pruebas y una inferencia de `EN_CURSO` cuando detecta actividad clínica. La evolución aprobada no debe confundir esa representación histórica con el nuevo flujo mínimo.

### Contrato funcional aprobado para shaping
Dos bloques operativos iniciales:
- **Analítica**;
- **Medicina Preventiva**.

Cada bloque expone únicamente:
- `NO_SOLICITADA`;
- `SOLICITADA_PENDIENTE`;
- `OK`.

Reglas:
- `OK` sólo por acto profesional explícito o import autorizado;
- nunca derivar `OK` automáticamente de resultados individuales;
- el nuevo flujo no borra por defecto datos históricos ya persistidos;
- separar decisión de **dejar de capturar/mostrar detalle** de decisión de **eliminar datos/modelo histórico**;
- si existe información legacy incompatible, conservarla de forma segura y no fabricar un estado nuevo.

### Evidencia técnica actual
Superficies de alta probabilidad: `modules/prebiologicManager.js`, `modules/formController.js`, `primera_visita.html`, `seguimiento.html` y contratos/persistencia asociados. El path exacto se vuelve a confirmar en el preflight del ticket.

## 6. `SIL-REV-005` — solicitud Reuma→Farmacia

Dirección aceptada, **no contrato todavía**:
- acción explícita `Solicitar tratamiento a Farmacia`;
- salida TXT/estructurada siguiendo un contrato acordado con Farmacia;
- generar/copiar una solicitud no equivale a enviarla, persistirla ni validarla.

El conjunto exacto de campos queda bloqueado hasta discovery con Farmacia. No inventar dosis, vía, pauta, presentación, inducción, switch/add-on ni resultado de validación.

## 7. `SIL-REV-006` — PCR y unidades de calculadoras

### Riesgo
PROMueve debe admitir que el laboratorio/site puede entregar PCR en unidades distintas. La fórmula no puede recibir silenciosamente un número sin saber su unidad.

### Estado del código publicado observado durante shaping
`modules/scoreCalculators.js` contiene contratos diferentes por calculadora: ASDAS-CRP y DAS28-CRP trabajan actualmente con PCR en mg/L; DAPSA recibe en la UI/captura actual un valor tratado como mg/L y lo convierte internamente a mg/dL. La UI actual muestra al menos DAPSA como `PCR (mg/L)`. Esto demuestra que el supuesto de unidad está hoy embebido en el módulo/superficie y justifica hacer explícito el contrato antes del uso multicentro.

### Contrato de diseño aprobado
`valor original + unidad original + site/configuración explícita` → conversión determinista a la unidad exigida por la calculadora → fórmula de la calculadora sin reescritura oportunista.

Reglas:
- preservar valor y unidad originales;
- cada calculadora declara su unidad esperada;
- no inferir unidad por magnitud;
- unidad desconocida/no soportada => cálculo no disponible/fallo seguro, nunca cálculo silencioso;
- conversión `mg/L ↔ mg/dL` determinista y cubierta por pruebas de equivalencia;
- cuando exista conversión, UI verificable sin sobrescribir el dato original;
- antes de modificar fórmulas, conservar/confirmar la autoridad bibliográfica ya aceptada para cada índice.

### Clasificación
- `CORE`: primitive/conversor de unidades y contrato fail-closed;
- `SITE`: unidad origen configurada explícitamente;
- `MODULE/CALCULATOR`: unidad esperada de cada índice;
- `DATA`: trazabilidad original/derivado;
- `UI`: indicación de conversión cuando aplique.

### Superficies de alta probabilidad
`modules/scoreCalculators.js`, `modules/formController.js`, `primera_visita.html`, `seguimiento.html` y tests/harness específicos. El ticket no debe expandirse a arquitectura V5.

## 8. `SIL-REV-007` a `011` — Dermatología

Se conserva el contexto previo: formulario simple Derma→FH, baseline HS, baseline PsO y objetivo futuro de un contrato común Derma→FH.

**Decisión actual:** `DEFERRED / OUT_OF_CURRENT_EXECUTION`.

No abrir implementación ni introducir el formulario de Dermatología en TRAIN 1/2/3. Esta deferencia no declara descartada la línea Dermatología; sólo evita mezclarla con el trabajo actual.

## 9. `SIL-REV-012/013` — renovaciones FH↔Enfermería↔servicios

### Problema
Farmacia necesita anticipar prescripciones próximas a caducar y coordinar la renovación con el servicio prescriptor sin confundir una comunicación operativa con una validación FH.

### Autoridad previa útil
Existe `docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`, propuesta avanzada no implementada. Conserva decisiones valiosas: la renovación pertenece a una **línea de tratamiento**, fechas confirmadas/verificadas/estimadas son distintas, switch es explícito y reglas temporales son configurables. N0 debe reconciliar esa arquitectura con el flujo operativo actualmente decidido, no crear una segunda teoría incompatible.

### Hipótesis a cerrar en N0
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

### Decisión
Consumir desde Reuma el catálogo farmacológico **publicado que funcione en el momento de ejecución**, sin esperar a la automatización CIMA futura.

Reglas clínicas:
- el catálogo identifica/selecciona medicamento;
- seleccionar nombre no escribe ni sobrescribe dosis, vía, pauta, presentación, inducción, duración, línea terapéutica o decisión clínica;
- no derivar renovación/switch/add-on desde la selección;
- fallo seguro si la fuente publicada no está disponible;
- no duplicar otra lista manual si la capacidad común ya puede reutilizarse.

### Estado técnico observado
Reuma posee actualmente lógica de selects que llama a `HubTools.data.getFarmacosPorTipo(...)` y `dataManager.js` expone esa función desde la BD cargada. El repositorio también contiene catálogo farmacológico versionado y documentación CIMA. El ticket debe identificar **qué fuente está realmente cableada y publicada** antes de cambiar UI: la existencia de un fichero de catálogo no demuestra que Reuma lo consuma.

### Superficies de alta probabilidad
`modules/formController.js`, `modules/dataManager.js`, `primera_visita.html`, `seguimiento.html`, gestión/carga de catálogo y tests. Si el preflight demuestra que ya existe un port reusable, consumirlo; si no, crear únicamente el seam mínimo necesario y documentar el contrato.

## 12. `SIL-REV-017` — automatización CIMA

Separada del consumidor Reuma.

La documentación existente propone un futuro script/Workflow de actualización y control de diff. A fecha de este shaping esa automatización no se considera implementada por el mero hecho de estar documentada.

Train futuro:
`CIMA API → normalización → validación → diff/versionado → PR/revisión humana`.

No tocarla durante TRAIN 1.

## 13. Orden de ejecución aprobado

### TRAIN 0 — shaping / autoridad — EN CURSO
- reconciliar la auditoría con `promueve/nexus-v4`;
- corregir ASDAS y diferir Dermatología;
- clasificar scope;
- comprobar seams/path collisions;
- crear parent train + tickets ejecutables;
- preparar N0 de renovaciones sin implementar el motor.

### TRAIN 1 — seguridad clínica + Reuma
Secuencial:
1. **T1 PCR/unidades**;
2. **T2 catálogo/autocomplete Reuma**;
3. **T3 prebiológico mínimo Reuma**.

La inspección actual muestra colisión probable/real en `modules/formController.js` y en las superficies `primera_visita.html` / `seguimiento.html`; por tanto **no se declara ejecución paralela**. El train reutiliza preflight común pero crea checkpoint limpio entre tickets.

### TRAIN 2 — renovaciones
1. N0 contrato/estados/identidad;
2. N1 FH: `due soon` + bandeja/export;
3. N2 adaptador Excel Enfermería;
4. N3 reconciliación de retorno y acto FH explícito;
5. N4 dashboard sólo si aporta valor después del MVP.

### TRAIN 3 — Reuma→Farmacia
`RFH-0 discovery/contrato → RFH-1 salida estructurada → RFH-2 QA E2E`.

### TRAIN 4 — CIMA automation
Implementación separada del refresco de catálogo y GitHub Actions.

## 14. Protocolo Atenea aplicable

La autoridad actual de Atenea exige el camino corto:
- shaping sólo si significado/aceptación no están resueltos;
- preflight mínimo: repo/worktree/base, autoridad, significado ejecutable, runtime cualificado y frontera de publicación;
- `atenea-writer` en host `opencode serve` fresco por ticket;
- checks deterministas;
- ciclo Gentle nativo cuando corresponda;
- checkpoint durable;
- siguiente ticket autorizado o STOP.

Los hechos train-wide se fijan una vez. No repetir manuales de routing/agentes en cada ticket. `Engram` y `Context7` permanecen OFF por defecto. No usar `gentle-orchestrator` anidado bajo el supervisor Atenea.

## 15. Matriz de colisión preliminar TRAIN 1

| Ticket | Superficies probables | Relación |
|---|---|---|
| T1 PCR/unidades | `scoreCalculators.js`, `formController.js`, primera/seguimiento, tests | toca UI/controller compartidos |
| T2 autocomplete | `formController.js`, `dataManager.js`, primera/seguimiento, fuente/adapter catálogo, tests | colisiona con UI/controller de T1/T3 |
| T3 prebiológico | `prebiologicManager.js`, `formController.js`, primera/seguimiento, persistencia/tests | colisiona con UI/controller de T1/T2 |

Conclusión: un solo train, **orden secuencial T1→T2→T3**, no tres writers paralelos. La composición se reevalúa sólo si el diff real demuestra una separación mejor.

## 16. Fuentes vivas consultadas para este shaping

- `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` de `promueve/nexus-v4`;
- `docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`;
- `docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`;
- `docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md`;
- código publicado: `modules/scoreCalculators.js`, `modules/prebiologicManager.js`, `modules/formController.js`, `modules/dataManager.js`, `primera_visita.html`, `seguimiento.html`;
- Atenea `docs/START_HERE.md`, `EXECUTION_REQUEST_AND_PREFLIGHT_V1.md`, `WORK_UNIT_COMPOSITION_POLICY_V1.md` y `OPERATOR_RUNBOOK_OPENCODE_SERVE_V1.md`.

## 17. Madurez

Nada de este shaping eleva la madurez asistencial. El estado global continúa siendo **evaluación sintética / no piloto / no producción**. Los tickets deberán acreditar por separado código publicado, interacción soportada y QA navegador cuando corresponda.
