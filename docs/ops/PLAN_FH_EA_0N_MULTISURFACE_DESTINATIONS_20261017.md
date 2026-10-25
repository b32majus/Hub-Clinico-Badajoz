# PROMueve FH · EA estructurados 0..N — Plan de ejecución y adaptación de destinos

**Corte de planificación:** 17-10-2026. **WO documental:** [#791](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/791). **Estado:** PROPUESTA DE PLAN, NO APROBACIÓN DE TODOS LOS TICKETS, NO CÓDIGO PUBLICADO, NO PILOTO. El contrato de captura v0.3 es acuerdo de producto, NO validación clínica completa. **Publicación documental autorizada por WO #791:** este plan se versiona como PROPUESTA trazable, sin aprobar automáticamente ninguna de las 20 WOs candidatas. Su integración efectiva exige PR y CI verdes; comprobar estado GitHub antes de afirmar MERGED.

> **ADENDA DOCUMENTAL DE RESCATE · 2026-10-23 / WO #815 · EN RAMA DE PR, PENDIENTE DE MERGE.** Ante el cierre local `G2 BLOCKED/HUMAN STOP` (candidato técnico `707efef`, rama local `work/fh-ea-g2-patient-authority-20261022@33c39e8`, 2/2 correcciones consumidas), se propone rescate **selectivo** de reglas/pruebas y conservar T01 publicada; **NO integrar el almacén IndexedDB ni la selección paralela ni la rama completa**. Documento complementario: [PLAN_RESCATE_FH_EA_NEXUS_20261023.md](PLAN_RESCATE_FH_EA_NEXUS_20261023.md). Secuencia de recuperación propuesta R0 documental → R1 invariantes EA → R2 acto Seguimiento/F4.4 → R3 contrato Excel/F4.5 → R4 entrega y relectura verificadas → R5 superficies, con `purgeResidue` en diagnóstico separado. **R1–R5 NO aprobados; no sustituye tickets EA-00..EA-19 ni reabre G0/PR #778, #721, ni autoriza pilotaje.** Las indicaciones de secuencia de este plan del 17-10 siguen como hipótesis de ejecución y se reconcilian por unidad futura; esta adenda no presenta R0/G2 como merged en canónica.

## Adenda operativa de dirección · 25-10-2026 — cierre rápido EA 0..N (SECUENCIA ACEPTADA; B01 PUBLICADA; RESTO NO APROBADO)

Esta adenda **actualiza la priorización**, no elimina los 20 candidatos EA-00..EA-19, el corte histórico del 17-10 ni modifica la [Spec v0.5](../contracts/FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md). Fuente del corte original: `promueve/nexus-v4@0f5edaf3bf68bff32b02884deeb2cfef6281ea26`; HEAD publicado tras B01: `promueve/nexus-v4@b3c563419f6d92d05eb311f652473ac9a07119f2`, índice/estado vivos y [rescate del 23-10](PLAN_RESCATE_FH_EA_NEXUS_20261023.md). El objetivo de dirección es **completar con rapidez la experiencia longitudinal y sus vistas**, separando el cierre demo del cierre con escritura/lectura verificables; **no autoriza nuevas WOs técnicas ni publicaciones adicionales, ni supone aptitud de piloto, más allá de B01 ya autorizada/publicada**.

### Tres hechos que gobiernan el orden

1. **Ya fusionado en canónica, con QA sintética y sin piloto:** T01 0..N [#798](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/798), invariantes R1 [#818](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/818), sospechosos explícitos [#823](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/823), causalidad G0 provisional [#824](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/824) y reparación P1 selector final heredado [#828](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/828); B01 ([WO #831](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/831)/[PR #832](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/832)) ya corrige identidad nueva **solo en el módulo puro**. No «fusionar todo G2» ni rehacer esas piezas.
2. **G2 no integrable:** `work/fh-ea-g2-patient-authority-20261022` / candidato `707efef`, BLOCKED/HUMAN STOP. No incorporar IndexedDB, selección de paciente, SHA de fixture o historial paralelo. Reutilizar únicamente *reglas y pruebas puras* tras revisión independiente.
3. **Recurrencia y guardado NO han sido descartados.** Siguen siendo requisitos V1/V2 de Spec v0.5. F4.4 existe como contrato puro publicado y F4.5 como DTO mínimo de manual copy/export v2, pero el cutover y los adaptadores/exportaciones generales se mantienen **aplazados**. Para afirmar «guardar y volver a abrir EA» sí deberá acordarse y acreditarse **una sola modalidad de escritura + relectura**, por separado y sin simular `persisted` con copia, sesión o datos DEMO.

### Camino crítico mínimo y dependencias reales

| Orden | Entregable y fronteras | Evidencia requerida para aceptar | Dependencia |
| --- | --- | --- | --- |
| **A · checkpoint G0 acotado** | Contrastar ambas capturas G0 con Pages a HEAD vigente; *solo* diferencias materiales no resueltas por #823/#824/#828. No rediseñar Naranjo/Karch por diferencia de altura ni repetir auditoría clínica cerrada. | Matriz de defectos existentes vs T02+ pendiente; si no hay nuevo defecto soportado, cerrar sin WO de producto. | Ninguna. |
| **B · dominio longitudinal puro** | Completar el modelo ya existente de episodio estable, observación por acto, resolución/recurrencia **solo explícitas**, revisión/anulación con motivo, reevaluación por pareja/método/acto y preservación histórica. Sin almacén, paciente/port alternativo, integración F4.4 ni nueva UI. | Oráculos RED BASE / GREEN 3× referencia, no inferencia, identidad, cambios de paciente, ausencia vs negativo y correcciones versionadas; pruebas de 0/1/2/5 EA. | R1; no depende de exportadores. |
| **C · decisión y garantía de UNA modalidad V4** | Shaping documental aislado de salida/lectura mínima en fuente única reutilizable (p. ej. archivo local verificable o Bridge/Office Script **solo tras acreditar capacidades**). Especificar esquema/IDs, versionado, no pérdida de 0..N, error seguro, escritura/acuse verdadero, recuperación y conflictos. No aprobar F4.5 completo ni XLSX/CSV por inercia. | Gate de decisión y contrato de origen autorizado; si solo copia manual, declarar `prepared_for_transfer` y STOP para «Guardar/Reabrir». | Antes de ejecución técnica que prometa persistencia. |
| **D1 · Seguimiento T02/T03** | Cablear «Actualizar EA anterior», documentación de resolución y «Registrar recurrencia» a **lectura del origen acreditado** y a observaciones/actos nuevos. No habilitar botones con episodios ficticios. | A→B→A, recarga real, dos actos/mismo episodio, recurrencia como segundo episodio relacionado, continuidad por silencio prohibida, revisiones preservadas. | B y capacidad probada de C. |
| **D2 · lectura y vistas EA-04/05/06/07** | Reutilizar Read Port/fachada y proyecciones únicas para Quick View, Dashboard paciente + longitudinal y Estadísticas. Separar consumidores en WOs; proyecciones puras/fixtures **pueden prepararse durante C** sin fingir lectura persistida. | Q15 navegación real; mismo episodio/observaciones, sospechas/causalidades expresas y tres denominadores pacientes/episodios/observaciones; sin contaminación A/B. | B; integración UI real tras C. |
| **E · QA cierre del alcance** | Recorrido integrado captura→recuperación→continuidad/recurrencia→vistas; portabilidad/sesión fallan seguro, regresiones CSV/Export V2 **sin cambiar formatos**. | Tests focales, Chromium desktop/móvil, confirmación del destino seleccionado, screenshot/console y revisión de límites clínicos; NO PILOTO hasta validación FH e institucional. | D1+D2. |

**Dos cortes de aceptación:** (i) **demo G0 + vistas con fixtures sintéticos explícitos**, sin etiquetar guardado longitudinal ni completitud de V1/V2; (ii) **EA longitudinal completo**, que requiere **C con escritura/relectura realmente acreditadas**, D1/D2 y E. No confundir «visualmente integrado» con «guardado real» ni «publicado» con «pilotable».

### Qué dejamos fuera del tren rápido

**Aplazado, no cancelado:** adaptación de Export V2, XLSX/manual copy, nuevo CSV longitudinal EA/PROM 0..N, Bridge Processor/APP_* y API/BD institucional, F4.4 cutover/F4.5 general, MedDRA/CTCAE licenciado y FEDRA. El formato CSV 0..N y KPI G3 (ventanas/denominadores) siguen necesitando decisiones; no inventar un formato ni una tasa. **No romper las salidas actuales** ni silenciar su incapacidad de representar toda la colección.

### Ejecución bajo KairOS Protocol

**Elección de dirección 25-10-2026: DIA para micro-WOs bien entendidas y atendidas; Metis pilot-9.4 para persistencia, transiciones entre actos de mayor riesgo y QA transversal.** KairOS Protocol `main@6f42bbba2447ed99f45e7a06f2d7037283c9cf6c` distingue DIA (Diseñar: Cora; Implementar: Pi + Gentle-AI/ODD corregido y autorizado expresamente por dirección; Auditar: agente independiente) y Metis (oráculos RED BASE / GREEN 3/3 en referencia). **No mezclar protocolos dentro de una WO.** DIA exige ejecución Pi en TUI atendida y visible, rama/worktree aislados, tests primero, informe de estado y auditor distinto del implementador. No lanzar runners ocultos ni intervenir en TUI ajenas. Metis: `prep + run` en una unidad o train largo solo ante dependencias justificadas. **Esta WO documental no necesita arnés.** Antes de toda WO verificar HEAD GitHub, índice, estado, Spec, agentes y permisos, documentar NO TOCA, reversión, tests y Git; issue/push/PR/merge requieren GO propio, issue `status:approved` antes del PR. La selección del protocolo no autoriza WOs futuras.

**B01 PUBLICADA (DIA, solo dominio puro; NO PILOTO):** [WO #831](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/831) / [PR #832](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/832) MERGED `b3c563419f6d92d05eb311f652473ac9a07119f2`. El validador rechaza dos episodios nuevos del mismo acto con `episode_id` duplicado, incluidas recurrencias expresas, mediante `DUPLICATE_NEW_EPISODE_ID`, preservando continuidad/resolución y los rechazos previos. Auditoría independiente Cora OK; test RED BASE, test GREEN candidato, suites R1/T01 y seis oráculos EA PASS. [Nexus CI 40191171006](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/40191171006) SUCCESS y [Pages 40191170274](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/40191170274) SUCCESS postmerge. **Sin consumidores UI demostrados, persistencia ni relectura.** Ticket DIA conservado fuera del repo; siguiente paso B residual y decisión documental C sobre modalidad única, sin adaptadores.

**Gobernanza de deuda histórica:** [#819](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/819) DRAFT necesita reconciliar alcance; [PR #778](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/778) OPEN con conflictos y decisiones G0 anteriores; [#721](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/721) no aprobado para adapter. No fusionarlos como atajo ni reutilizar issues de diferente alcance. Los historiales/planes previos permanecen accesibles, pero **la prioridad actual es A→B + C documental→D1/D2→E**.

---

## Autoridades consultadas

1. Repo `b32majus/Hub-Clinico-Badajoz`, rama canónica `promueve/nexus-v4`, verificada por lecturas GitHub y merge PR #790 (`f37405b5a8d19456a6a976bb7e3a08e754e61387`). Comprobar **nuevo HEAD remoto real** al lanzar cualquier unidad, nunca fijar un SHA recordado.
2. `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md`; alineamiento de EA estructurados `docs/architecture/FARMACIA_EA_ESTRUCTURADOS_FEDRA_READINESS_20261014.md` (publicado); contrato longitudinal `docs/contracts/FARMACIA_ANALYTICAL_LONGITUDINAL_EXPORT_V1.md` (aprobado funcionalmente, sin implementar).
3. `docs/architecture/PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md`, ADR-006, `docs/architecture/reviews/FARMACIA_F44_EXPORT_V2_BRIDGE_EQUIVALENCE_20261012.md`, `docs/contracts/FARMACIA_EXPORT_V2_TECHNICAL_CONTEXT_CONTRACT.md`.
4. Contrato local `PROMueve_FH_Contrato_Captura_EA_0N_Seguimiento_V0_3_ACUERDO_PRODUCTO_20261017.md` y maqueta integrada local. Registro G0 `docs/ops/FARMACIA_EA_DECISION_REGISTER_20261017.md` en PR #778 OPEN al verificar; NO se trata de autoridad publicada ni se mergea por este plan.
5. Atenea C-087 PR #156 vigente en Nexus: `docs/C087_THIN_WRITER_REVIEW_AND_EVIDENCE_RECOVERY_20261017.md` y `docs/CORA_TICKET_TRAIN_PREPARATION_PROMPT_C087.md`; no tocar TUI/Herdr de Trains activos.

## Decisión ejecutiva propuesta

- **Una fuente clínica estructurada de EA**: Paciente → Acto FH (fecha única) → Episodio EA estable → Observación por acto (0..N) → Relaciones explícitas con medicamentos sospechosos (0..N por EA) → Evaluaciones Naranjo/Karch independientes por pareja y método, con estados `no_evaluado`, `borrador`, `completado`. No inferencias de catálogo/terapia previa, fechas, grado, gravedad, causalidad o seriedad regulatoria.
- **Proyecciones de lectura** (no nuevas copias clínicas): Quick View (detección resumida), Dashboard paciente (episodios + observaciones), Estadísticas servicio (pacientes únicos, episodios únicos, observaciones, estados/denominadores), export analítico longitudinal (acto × línea *evaluada*), Excel manual, Bridge relacional y API/DB autorizada.
- **Demo desechable**: regenerar fixtures sintéticos en 0..N, sin migración 1→N ni convertidor de históricos; sí versionado del nuevo formato, restauración y tests. Nada de datos reales ni de destrucción de trabajo ajeno.
- **No equivocar dominios:** documento de farmacovigilancia es futuro G4, no catálogo; grado CTCAE ≠ seriedad regulatoria; sospecha ≠ causalidad demostrada; copia ≠ persistencia institucional.

## Datos que deben quedar representables (propuesta, no DTO final)

| Entidad lógica | Claves/propiedades conceptuales | Reglas |
| --- | --- | --- |
| Acto FH | `actId`, `patientRef`, `actDate`, source/author declarado | Fecha común una vez, sin fabricar inicio EA. |
| Episodio EA | `episodeId`, `patientRef`, `relatedEpisodeId?`, estado clínico *registrado* | Identidad longitudinal. Recurrencia y continuidad **solo** seleccionadas, no deducidas. |
| Observación EA | `observationId`, `episodeId`, `actId`, texto original, evolución, gravedad, inicio/fin si conocidos | Un episodio puede tener observaciones en actos distintos; 0..N por acto. |
| Término codificado | código, LLT/PT u otro, vocabulario, versión, idioma, verificación | Opcional/pendiente sin licencia; texto original no desaparece. |
| Vínculo sospechoso | `suspectRelationId`, EA, medicamento/linea explícitamente señalado | No infiere exposición ni crea línea terapéutica. |
| Causalidad | `assessmentId`, relación, método, estado, respuestas/resultado si completado, acto autor | No confundir `0` inicial con evaluación completada, conservar correcciones/anulaciones. |
| Fuente/proyección | IDs originales, versión de schema, sello de registro, modalidad/garantía del destino | Distinguir `prepared_for_transfer`, recibido, persistido y acuse institucional. |

**Decisión abierta de modelado:** si el vínculo y evaluación son propiedad del episodio con observaciones versionadas o de cada observación; debe fijarse sin perder autoría/fechas de evaluaciones posteriores. `episodeId` y `observationId` nunca se intercambian para deduplicar.

## Tres pantallas: semántica a congelar

- **Quick View:** 0..N episodios, estado explícito (en seguimiento/resuelto/no registrado), últimas observaciones y enlace al Dashboard; no cuestionarios ni supuestos de actividad.
- **Dashboard del paciente:** 1 ficha/episodio con línea de tiempo de observaciones, sospechosos explícitos, evaluaciones independientes y acceso al Seguimiento; no crear nuevos episodios por visita.
- **Estadísticas del servicio:** KPI `pacientes_con_EA` (pacientes únicos en cohorte), `episodios_EA` (IDs únicos) y `observaciones_EA` (observaciones por acto), con ventanas y denominadores definidos. Filtros de gravedad solo si valor explícito del mismo EA; no inferir incidencias ni tasas farmacológicas. Actual resumen vigente “EA presentes” cuenta pacientes, no número de EA.

## Arquitectura de salida: tres destinos ≠ tres historias clínicas

| Destino/flujo | Estado previo verificado | Ajuste EA propuesto y gate |
| --- | --- | --- |
| CSV Estadísticas de 37 columnas | Publicado, población y filtros; NO CSV longitudinal completo | No romper el actual. Implementación longitudinal separada con regla ya aprobada de pacientes filtrados → todos sus actos, 1 fila acto×línea evaluada (o 1 sin línea). **Representación 0..N de EA/PROM pendiente de decisión de producto; no aprobar automáticamente JSON en celda, filas extra ni columnas dinámicas.** |
| Export V2, 152 columnas, Excel manual | Demo publicada, copia/TSV 1..N por líneas pero EA común singular; no portador F4.4 completo | Matriz de cobertura y decisión explícita de versión/formato o acompañamiento normalizado para EA 0..N. Copia/descarga es `prepared_for_transfer`, no prueba `persisted`. La farmacéutica selecciona libro/hoja; no deducir por medicamento/patología. |
| Excel Bridge relacional + Office Script | Workbook contenedor publicado; Processor histórico NO fusionado/validado; APP_* y lectura de vuelta incompletos | Schema de episodio/observación/vínculo/evaluación, Processor de filas raw sin inventar clínica, tablas/vistas APP_*, roundtrip con QA Excel real sintético. Depende de capacidades F4.5 adicionales al DTO fase 1, mapping aprobado y política de lotes/errores. |
| API/back-end/BD (SQL Server/PostgreSQL) | Dirección ADR-006, NO adapter FH institucional implementado | Mantener el mismo contrato semántico, API autorizada con transacciones/idempotencia/versionado si realmente soportadas. No SQL desde navegador, ni secretos, ni piloto sin autorización. Se prepara spec; implementación condicionada a entorno autorizado. |
| FEDRA/ICSR | Solo alineamiento, no acceso institucional autorizado | G4 diferido; acuse real ≠ HTTP 200; no bloquear captura ni análisis. |

**Dependencias F4.5 verificadas en GitHub (2026-10-17):** el [contrato DeliveryResult v1 fase 1](../contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md) **YA ESTÁ PUBLICADO** por [PR #747](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/747), limitado a `export_v2_tabular` + `manual_copy`; NO es runtime, mapeo Act→V2 ni garantía de persistencia. [Issue #671](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/671) sigue OPEN con `status:approved` solo para trabajo documental de su alcance. El [inventario de mapeo F4.4→V2](../architecture/reviews/FARMACIA_F44_EXPORT_V2_MAPPING_CANDIDATE_20261013.md) está publicado **solo como evidencia candidata, NO aprobado/implementado**. [Issue #721](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/721) sigue OPEN **sin** `status:approved`: el adaptador Excel no está autorizado. No duplicar esos issues. L0 (filas), L1 (acto reconstruido) y L2 (F4.4 íntegro) tienen garantías distintas.

## Puertas no cerradas — decisiones humanas y clínicas

1. **G0 FH:** confirmar descripción mínima y obligatoriedad adicional, definición continuado/resuelto/recurrencia, fecha inicio/fin propia, seriedad si aplica, corrección clínica. Puede avanzarse con comportamiento demo conservador si esas decisiones se etiquetan `PENDIENTE_FH` y no se proclama piloto.
2. **G0 visual:** maqueta local integrada no está congelada en repo con PNG/HTML SHA256 para Visual/UX Fidelity; debe actualizarse la sección de causalidad a dos selectores y el comportamiento sin pérdida antes del freeze.
3. **G1 terminología:** licencia MedDRA, nivel/idioma, catálogo CTCAE específico y versionado/mapeo; texto verbatim con codificación pendiente es fallback propuesto.
4. **G2:** definición exacta de ciclo de vida del episodio/observación y estado de assessment, semántica de guardado/recarga local-first y Read Port; tratamiento de borrador vs completado, correcciones y estado global sin contradicción.
5. **G3:** representación concreta 0..N en CSV longitudinal, frontera de EA en Export V2/copia manual, fidelidad L0/L1/L2, extensiones F4.5 todavía no cerradas y roundtrip Excel.
6. **G4:** autorizaciones/licencias/institución para API/DB/FEDRA, no requisito para demo sintética de captura.

## Orden de Trains / dependencias

- **Train T0 — Autoridad y freeze (documentación/visual):** EA-00 → EA-01, detenerse si FH debe ratificar obligaciones clínicas no autorizadas.
- **Train T1 — Modelo y Seguimiento:** EA-02 → (EA-03, EA-04; dependencias según contrato). QA real local-first, actos, episodios, observaciones y relaciones.
- **Train T2 — Vistas:** EA-05 Quick View; EA-06 Dashboard; EA-07 Estadísticas. Son unidades separadas y **no** un único rediseño de las tres pantallas.
- **Train T3 — Analítica y Excel:** EA-08 contrato CSV → EA-09 CSV; EA-10 mapping Excel manual (puede generar WO técnica propia); EA-11 schema Bridge → EA-12 Processor → EA-13 Read Adapter; EA-18 adaptación manual si mapping aprobado; F4.5 fase 1 ya publicada (#747); mapping y ejecución del adaptador Excel #721 siguen bloqueados/no aprobados; no duplicar issues.
- **Train T4 — Futuros destinos condicionados:** EA-14 contrato API/BD; EA-15 solo si entorno aprobado; EA-16 terminología licenciada; EA-17 FEDRA institucional diferida. **No se proponen como bloqueadores de T1/T2 demo.**

La secuencia es una **propuesta de orden**, no 20 issues aprobados ni autorización de ejecución. Cada WO es una unidad atómica: un implementador en sesión coherente; múltiples unidades Matt legítimas no justifican `Writer Phase 1/2` artificiales. Standards y Spec examinan MISMO SHA, Visual solo si hay UI impact profile pertinente; consolidar findings antes de una corrección. Reutilizar pruebas/capturas focales y respetar máximo dos intentos frescos por unidad. Ante retorno vacío `INCOMPLETE_WRITER_RESULT`: inspección read-only, como máximo una continuación en misma sesión identificada, después HUMAN STOP. Prompt de lanzamiento pointer-first: ruta handoff + unidad exacta + STOP. No inventar fallback de modelo ni iniciar Train sin autorización.

## Qué podemos ejecutar primero y qué NO

**Primero** EA-00 (reconciliar autoridad y registrar decisión) y EA-01 (freeze visual actualizado). En paralelo, preparar preguntas FH breves sin bloquear diseño estructural que no haga supuestos clínicos. Luego EA-02/03/04.

**No implementar de inmediato:** integración FEDRA, diccionarios licenciados, adaptador API institucional, Processor histórico sin QA Excel real, esquema longitudinal CSV sin decisión de representación, ni adaptador F4.5 #721 hasta aprobación propia, mapping y restantes gates de entrega (DTO mínimo fase 1 publicado).

## Política de publicación de este paquete

Propuesta de rutas en GitHub (NO publicadas por este archivo):
- `docs/ops/PLAN_FH_EA_0N_MULTISURFACE_DESTINATIONS_20261017.md` (este plan)
- `docs/handoffs/EA_00_...md`, ... `EA_17_...md` **solo cuando la WO pase de borrador a aprobada y esté acotada**.
- `docs/INDEX.md` (enlace a plan cuando se publique), `docs/ops/WORK_ORDER_STATUS.md` (solo hito real publicado, no declarar implementado), y el registro EA pendiente de PR #778, evitando conflictos con su rama abierta.

No hacer push, issue, PR ni merge del plan sin aprobación explícita del alcance Git. Si se publica como WO documental, preflight de HEAD, rama/worktree aislados, tests de enlaces/Markdown, política de reversión y reconciliación al cerrar. Las unidades técnicas requerirán autorización posterior propia y sus issues `status:approved` antes de abrir PR.

## Índice de WOs candidatas (no issues)

- **EA-00** · Conciliar decisiones EA y contrato funcional v0.4 · *READY_FOR_SHAPING* · T0 — Contrato/autoridad
- **EA-01** · Congelar referencia visual integrada de EA y causalidad · *NEEDS_PRODUCT_REVIEW* · T0 — Contrato/autoridad
- **EA-02** · Contrato de identidad/observaciones/causalidad y fixtures EA · *BLOCKED_PARTIAL_G0* · T1 — Dominio y captura
- **EA-03** · Seguimiento FH EA 0..N y sección existente de causalidad · *BLOCKED_BY_EA-01_EA-02* · T1 — Dominio y captura
- **EA-04** · Read Port y proyecciones EA canónicas para consumidores · *BLOCKED_BY_EA-02* · T1 — Dominio y captura
- **EA-05** · Quick View FH: resumen de EA con estados veraces · *BLOCKED_BY_EA-04* · T2 — Superficies de lectura
- **EA-06** · Dashboard FH: evolución longitudinal de episodios EA · *BLOCKED_BY_EA-04* · T2 — Superficies de lectura
- **EA-07** · Estadísticas FH: pacientes, episodios y observaciones EA · *BLOCKED_BY_EA-04* · T2 — Superficies de lectura
- **EA-08** · Elegir representación de EA/PROM 0..N en CSV longitudinal único · *NEEDS_EXPLICIT_PRODUCT_DECISION* · T3 — Analítica y destinos
- **EA-09** · Implementar descarga CSV longitudinal EA completa · *BLOCKED_BY_EA-08* · T3 — Analítica y destinos
- **EA-10** · Contrato de entrega Excel manual y Export V2 con EA 0..N · *NEEDS_EA_FORMAT_MAPPING_AND_RUNTIME_GATE* · T3 — Analítica y destinos
- **EA-11** · Esquema relacional Excel Bridge para episodios y observaciones EA · *BLOCKED_BY_EA-02_AND_BRIDGE_CAPABILITIES* · T3 — Analítica y destinos
- **EA-12** · Processor Office Script: poblar Excel Bridge relacional y reportar resultado · *BLOCKED_BY_EA-11* · T3 — Analítica y destinos
- **EA-13** · Read Adapter APP_* y roundtrip Excel Bridge de EA · *BLOCKED_BY_EA-12* · T3 — Analítica y destinos
- **EA-14** · Contrato API/base de datos para EA y capacidades de persistencia · *BLOCKED_BY_EXTENDED_DELIVERY_CAPABILITIES_AND_INFRA_CHOICE* · T4 — Backend-ready y gates futuros
- **EA-15** · Implementar adaptador API/BD autorizado o demo segregada · *DEFERRED_UNTIL_AUTHORIZED_ENVIRONMENT* · T4 — Backend-ready y gates futuros
- **EA-16** · Terminología MedDRA/CTCAE real: licencia, configuración y codificación · *DEFERRED_G1_LICENSE* · T4 — Backend-ready y gates futuros
- **EA-17** · Adaptador FEDRA/ICSR institucional · *DEFERRED_G4_INSTITUTION* · T4 — Backend-ready y gates futuros
- **EA-18** · Adaptar la salida manual Excel a EA 0..N según formato aprobado · *BLOCKED_BY_EA-10_AND_DELIVERY_GATE* · T3 — Analítica y destinos
- **EA-19** · QA transversal de cohorte y destinos EA con fixtures sintéticos · *AFTER_IMPLEMENTED_SCOPE* · T4 — Backend-ready y gates futuros

## Nota de alcance

Esta planificación no crea automáticamente capacidades ni bloquea G2 de demo por G4/FEDRA. No reutilizar issues #671/#721 para otro alcance; resolver sus contratos de forma independiente.