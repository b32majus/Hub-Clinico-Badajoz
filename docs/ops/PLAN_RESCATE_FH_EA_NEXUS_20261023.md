# PROMueve Nexus · Farmacia Hospitalaria — Plan de rescate de EA 0..N

**Fecha:** 2026-10-23
**Estado:** PLAN DOCUMENTAL DE RESCATE PROPUESTO Y VERSIONADO EN RAMA DE PR; NO EJECUCIÓN TÉCNICA APROBADA, NO INTEGRACIÓN G2, NO PILOTO.
**WO documental:** #815. **Rama base:** promueve/nexus-v4, ancla de preflight 9dac9d3c0d5a28ed6d3464f81419d71ffd8128c7 (consultar GitHub live antes de cada nueva unidad).
**Evidencia local preservada:** work/fh-ea-g2-patient-authority-20261022@33c39e8; candidato corregido 707efef; G2 BLOCKED + HUMAN STOP (Standards FAIL y Spec FAIL, 2/2 agotado). No publicación de G2.

> **Adenda de estado · 2026-10-25 (sin sustituir el plan original del 23-10).** La WO documental inicial se integró mediante [PR #816](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/816), el núcleo R1 mediante [PR #818](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/818). **FH-EA-02B** — identidad y reconciliación de sospechosos — quedó MERGED [PR #823](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/823), `a4e56e3620ecb8f0d047641547d2611866584144`. **FH-EA-03** — causalidad G0 por EA × sospechoso × método en memoria, guardias de exportación y enmienda R1 C11 — quedó MERGED [PR #824](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/824), `5ca22dcc7c947aa9c203c73ef850c4dc53892052`. [Nexus CI](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/40151019895) y [Pages](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/40151019415) postmerge **SUCCESS** en ese HEAD. QA automatizada Chromium sintética en escritorio/móvil; **no hubo QA clínica humana sobre Pages ni autorización de piloto**.
>
> **Alcances no equivalentes:** FH-EA-03 es el editor de causalidad G0; **R2 de este plan es otro trabajo**: cableado de EA 0..N a un acto F4.4 desde fuente clínica autorizada y sin fingir guardado. **R2 continúa pendiente**, como R3–R5: representación de destino Excel/otros, entrega verificable, lectura longitudinal, actualización de un EA anterior, recurrencia, vistas y exportación íntegra. Los controles «Actualizar EA anterior» y «Registrar recurrencia» siguen deshabilitados. G2 permanece BLOCKED/HUMAN STOP: no se integraron IndexedDB ni paciente paralelo. Próxima fase R2: diagnóstico read-only de flujo y fuentes, sin permisos nuevos para ejecutar Metis. [Issue #819](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/819) sigue DRAFT sin `status:approved`; las issues #821 y #822 permanecen OPEN pese a que sus PRs sí están MERGED.

> **Adenda 2026-10-25 posterior a #828 — G0 P1 UI corregida, NO cierre total de G0.** [WO #827](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/827) y [PR #828](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/828) publicaron sobre `promueve/nexus-v4` el merge `e25fa6966107b8b6a2cb921bffe6bff0c56acebc`. Se ha deshabilitado, ocultado y neutralizado a «No evaluada» el selector heredado de causalidad final en el editor provisional G0, evitando mostrar la calificación de A al seleccionar B. No constituye evaluación clínica formal, ni persistencia/exportación de causalidad. Metis con oráculo RED BASE, 3/3 GREEN referencia y 13/13 candidato, más QA sintética y navegador escritorio/móvil. [Nexus CI](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/40186484543) y [Pages](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/40186484228) **SUCCESS postmerge**. La suite PR57D tiene un fallo preexistente idéntico en BASE; las regresiones EA/T01/PR57C/export fueron ejecutadas separadamente y no las cubre `verify:nexus` por sí solo. **Secuencia operativa humana posterior:** terminar paridad/seguridad G0 acotada antes de reabrir F4.4; **R2–R5 se mantienen pendientes y no autorizados por numeración**. F4.4 contrato puro está publicado, pero su cutover UI y F4.5 adapter/mapping permanecen aplazados como frontera transversal, no tarea inmediata específica de EA. G2 no integrado. Ni piloto ni QA clínica profesional.

## 1. Decisión de dirección y alcance

**Rescate selectivo, no cherry-pick ni integración en bloque de G2; conservar T01 publicada.** La captura de EA 0..N del Seguimiento (T01, PR #798) ya funciona como **edición en memoria** y dispone de guardias visibles contra exportaciones incapaces de representar los datos. No guarda ni reabre clínicamente EA longitudinales. No reconstruir tarjetas, campos ni la composición G0 v0.4 por el hecho de iniciar el rescate.

G2 añadió un registro puro EA, un almacenamiento IndexedDB, acreditación del fixture FH por SHA256 y una selección/autoridad EA paralela. El prototipo produjo pruebas sintéticas útiles, pero no superó revisiones ni equivale a un adapter institucional. **No integrar IndexedDB, ni el sistema alternativo de selección, ni el SHA fijo del fixture.** Retener sólo invariantes y testigos útiles, adaptados al contrato publicado.

**Circuito objetivo:** identificación/selección del paciente por los flujos existentes de FH → Seguimiento/T01 → acto técnico FH conforme (ADR-005, F4.4) → proyección y adapter de entrega según capacidades F4.5/ADR-006 → lectura desde ese MISMO destino cualificado mediante Read Port/fachada → vistas derivadas. El cambio de paciente purga o sustituye contexto temporal, tras el guard de cambios pendientes; nunca borra registros ya persistidos ni los presenta bajo otro paciente.

El objetivo de persistencia local-first es **Excel como adapter soportado**, no Excel como modelo clínico interno; en otros hospitales podrán existir API/SQL o cloud autorizados, cada uno con garantías acreditadas. La copia manual/descarga constituye prepared_for_transfer y **no** persisted; no prometer roundtrip, registro SES ni backend que todavía no existe. sessionStorage del contexto actual y la deuda FH-DEBT-001 no se convierten en persistencia longitudinal ni forman parte de un nuevo almacén EA.

## 2. Fuentes y límites de verdad

1. Instrucción de rescate y WO #815; código/publicaciones verificadas de promueve/nexus-v4.
2. docs/INDEX.md, docs/ops/WORK_ORDER_STATUS.md y docs/ops/FARMACIA_ESTADO_Y_BACKLOG_20261011.md.
3. docs/contracts/FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md; G0 v0.4 publicado; docs/ops/PLAN_FH_EA_0N_MULTISURFACE_DESTINATIONS_20261017.md.
4. docs/architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md, ADR-005, ADR-006; docs/architecture/PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md.
5. Contratos F4.4/Pharmacy Act, F4.5 DeliveryResult fase 1 y Read Port FH. El registro del candidato G2 está **solo** en una rama/worktree locales: no presentarlo como publicado ni su QA como acreditación de producto.

Los acuerdos de G0 sobre UX no implican ratificación clínica institucional. Ninguna unidad infiere dosis, vía, pauta, tratamiento activo, sospechoso, causalidad, fechas clínicas, recurrencia, resolución, seriedad o validación desde catálogos, datos ausentes, tratamientos previos o valores iniciales.

## 3. Inventario de rescate

| Pieza / origen | Dictamen | Reutilización admisible |
| --- | --- | --- |
| T01 canónica (scripts/farmacia_seguimiento.js y HTML/CSS) | CONSERVAR | Captura 0..N, distinción Sí/No/No consta, borradores, controles actuales, protección de salidas singulares. No rehacer la UX. |
| G0 v0.4 + Spec v0.5 | CONSERVAR COMO AUTORIDAD | Composición aceptada y semántica de episodio/observación/sospechosos/causalidad. Lo aún no ratificado clínicamente permanece pendiente. |
| modules/farmacia_ea_v1_demo_record.js, 313 líneas, rama G2 | RESCATE PARCIAL | Validadores puros de estados, entradas, identidad de episodio y observación, revisión/motivo/historial y ausencia. Separar schema demo, procedencia fh_synthetic_fixture, SHA y patient_ref propio; cotejar con estructura T01 y F4.4. **No copiar archivo íntegro.** |
| tools/farmacia_ea_v1_a_check.mjs, 3511 líneas, rama G2 | RESCATE DE ORÁCULOS | Elegir pruebas negativas de 0/1/2/5, No/No consta, revisiones, historial, conflictos, aislación A→B, datos ausentes y error seguro. Reescribirlas de forma focal sobre interfaces reales; no heredar suites del almacenamiento G2 como gate. |
| scripts/farmacia_ea_v1_demo_store.js, 526 líneas | NO INTEGRAR | IndexedDB es experimento local; documentar, cuando proceda, CAS, idempotencia y estado incierto como semántica exigible a un DESTINO acreditado, sin trasplantar el store. |
| scripts/farmacia_ea_v1_demo_provenance.js, 248 líneas | NO INTEGRAR COMO AUTORIDAD | Conservar criterios de no contaminación y procedencia; descartar la acreditación por SHA específico, selector paralelo y credenciales de demo como semántica general. |
| Cambios G2 a farmacia_common.js, farmacia_patient_flow_runtime.js, farmacia_index.js, farmacia_seguimiento.js, farmacia_index.html | NO CHERRY-PICK | El paciente activo ya tiene sus circuitos y guardias. La corrección del mapeo sintético es un hallazgo independiente sujeto a demostración en canónica y WO separada. |
| purgeResidue / claves de importación | INVESTIGAR POR SEPARADO | El candidato apunta a posible pérdida de continuidad de importación al cambiar de paciente; **no declarar defecto publicado** hasta reproducirlo en navegación real canónica. Relacionar, sin confundir, con FH-DEBT-001. |

Los resultados 492/492 del prototipo son exclusivamente de su candidato y pruebas. **No** acreditan integración T01, guardado EA visible, recuperación longitudinal o piloto.

## 4. Secuencia mínima de recuperación y criterios de aceptación

### R0 — Reconciliar documentación y cerrar la desviación (WO documental #815)

Registrar G2 como bloqueado/no integrable en bloque y preservar sus commits; enlazar este plan desde INDEX y WORK_ORDER_STATUS y añadir nota de prioridad en el plan EA publicado del 17-10. No reabrir auditorías concluyentes ni sustituir íntegramente el plan anterior. **R0 documenta; no ejecuta una WO técnica, ni aprueba R1..R5.**

**Gate:** solo documentación, cinco rutas exactas, enlaces correctos, sin estado clínico inventado; canónica sin cambios hasta merge autorizado y PR documental revisable.

### R1 — Recuperar invariantes EA dentro del dominio existente (EA-02; WO técnica propia)

Definir compatibilidad exacta con T01 y Pharmacy Act v1. Reutilizar del módulo puro G2 exclusivamente reglas independientes del almacén; identidad paciente/acto/episodio/observación estable con ámbito, versiones y motivo explícito. Mantener las revisiones como actos/datos coherentes sin inventar timestamps ni autoría. No tocar UI, importador, canal de paciente ni adaptación Excel.

**Rutas candidatas sujetas a shaping:** modules/farmacia_act_contract.js, modules/farmacia_act_payloads.js y/o un módulo mínimo de validación si lo exige el contrato, junto a tests focales. No introducir esquema universal EA paralelo.

**Gate:** 0/1/2/5 EA, Sí/No/No consta, borrador no finalizado, observaciones sin duplicar episodio, revisión anterior recuperable, datos ausentes y sospechoso/causalidad no inferidos. Revisiones Standards/Spec del mismo SHA.

### R2 — Cablear T01 al acto de Seguimiento (EA-03 acotada; WO propia)

La colección editable T01 de EA 0..N debe producir un dato de dominio conforme dentro de UN acto de Seguimiento, con fecha única explícita y líneas terapéuticas exclusivamente declaradas; ningún EA crea una visita nueva. Los EA incorporados no se reducen al primero para alimentar exportadores singulares. Conservar guardias de no entrega ante formato incompatible. **Construir el acto no es persistirlo.**

**Rutas candidatas:** scripts/farmacia_seguimiento.js y el constructor existente de Followup Act; HTML/CSS solo ante delta visible aprobado, sin reabrir G0 por estética.

**Gate:** identidad e integridad de 0..N, navegador real y estados vacíos, cambios pendientes, compatibilidad con G0, y pruebas de no-exportación parcial; sin UI nueva de almacenamiento o simulación de guardado.

### R3 — Determinar contrato de destino Excel y cobertura 0..N (EA-10/F4.5; documental separado)

Antes de implementar guardado longitudinal, decidir **cómo** llevar episodio, observación, relación, revisión y 0..N a una modalidad Excel capaz de representarlos íntegramente. Contrastar modelo F4.4, exportación V2 (152 columnas), Bridge y garantías L0/L1/L2. La actual salida manual solo acredita prepared_for_transfer. No seleccionar automáticamente JSON en celda, duplicar EA en cada línea ni inventar un codec completo.

**Bloqueos vigentes verificados:** contrato F4.5 fase 1 publicado solo para export_v2_tabular + manual_copy; el mapping F4.4→V2 sin aprobación completa; issue #721 OPEN sin status:approved; Excel Bridge tiene contenedor, no Processor+APP_*+roundtrip implementados. Issue #671 no es licencia para #721 ni para ampliar su alcance.

**Gate:** matriz campo a campo, ausente vs desconocido, cardinalidades, esquema/versiones/revisión y pérdida cero en la representación aprobada. Si falta capacidad, REJECTED/NOT_REPRESENTABLE; ninguna falsa persistencia. Elegir vía de escritura supone decisión y WO propias.

### R4 — Entrega duradera y lectura de retorno por UNA modalidad cualificada (varias WOs atómicas)

Después de R3: separar (a) proyección/validación y entrega, (b) escritura duradera según capacidad del adapter, (c) reimport/Read Port/roundtrip y resolución de conflictos. Elegir File System Access verificable o Bridge+Office Script cualificado si sus prerequisitos están demostrados; no imponer una opción ahora. API/SQL institucional futura condicionada a autorización independiente. Si la modalidad es solo manual, mostrar exclusivamente prepared_for_transfer y **no prometer Guardar/Reabrir**.

**Gate real y transversal:** paciente A con dos EA → escritura confirmada en origen autorizado → cambio a B y contexto limpio → regreso a A tras recarga → recuperar dos EA, IDs/campos/acto iguales → corrección con motivo y anterior conservada → conflicto/error sin sobreescritura ni contaminación. Excel sintético, navegador con interacción soportada y QA real del destino; tests Node aislados no bastan.

### R5 — Lectura longitudinal y vistas derivadas (EA-04/05/06/07/19, por unidades)

Cuando exista lectura del origen demostrado, reutilizar Read Port/Fachada FH y alimentar el «Actualizar EA anterior» de Seguimiento, Quick View, Dashboard del paciente y Estadísticas desde los mismos episodios/observaciones; **sin** otra fuente ni almacén por pantalla. Separar KPIs de pacientes, episodios y observaciones; no duplicar EA por líneas terapéuticas.

**Gate:** mismas identidades y estado longitudinal en todas las pantallas, ausencia de cruces A/B, no inferencia de causalidad/sospechosos/recurrencia/resolución, navegación, recarga, consola y QA manual visible. CSV longitudinal EA/PROM 0..N sigue pendiente de decisión G3 y WO propia. MedDRA/CTCAE y FEDRA/ICSR no forman parte del rescate inmediato.

### Incidencia transversal separada — purgeResidue y retención de importaciones

Reproducir primero en **canónica**, a través de Inicio → Seguimiento y A→B→A, si purgeResidue invalida innecesariamente el Excel activo o su recuperabilidad; diferenciar borradores del paciente anterior de dataset de origen. Si hay defecto material, preparar WO independiente de continuidad y regressions. **FH-DEBT-001** (sessionStorage de Excel importado, P1 antes de piloto) tiene gobernanza de seguridad y retención propia: no resolver borrándolo a ciegas ni mezclándolo con R1/R2.

## 5. Priorización, dependencias y reglas de STOP

Secuencia propuesta **R0 → R1 → R2 → R3 → R4 → R5**, con incidencia de purgeResidue comprobada antes de declarar R4 funcional. La numeración es de gestión de rescate, NO tickets adicionales. Hacer uso de EA-02..EA-19 del plan anterior solo tras aprobación individual y reconciliación de estado; no reutilizar issues de alcance diferente.

**STOP de arquitectura:** si para EA se intenta crear paciente activo, sesión, identidad, almacenamiento o port duplicados en lugar de los ya publicados. **STOP clínico:** si cambia una regla aún no ratificada o se deducen terapias, fechas, causalidad o resultados. **STOP de destino:** si no hay representación completa ni escritura/lectura verificadas, no afirmar persisted. **STOP operativo:** dos correcciones fallidas por WO no autorizan otra ni merge automático.

No tocar main, Reumatología, Dermatología, G0 por estética, Excel Enfermería, importador raw salvo WO independiente, T01 ya publicada fuera de integración focal, FEDRA, sistemas SES, licencias, secretos, datos reales, despliegue ni backlog ajeno. No desplazar prematuramente trabajo de demo hacia V5 o backend.

## 6. Criterios globales de éxito del rescate

1. T01 y G0 se conservan, sin rehacer la UX.
2. EA 0..N reutiliza validaciones correctas, sin IndexedDB ni SHA del fixture ni sesión alternativa.
3. Episodio, observación, sospecha, evaluación y revisión mantienen identidad y temporalidad explícitas; un acto no se multiplica por varios EA.
4. Ninguna pantalla afirma persistencia que el adapter no pueda acreditar.
5. A→B→A conserva datos persistidos de A, no arrastra borradores de A a B y recupera la misma historia desde la fuente autorizada.
6. Pruebas deterministas, Chromium real, QA manual y validación del destino se informan **separadamente**; no piloto hasta gobernanza y garantías adicionales.
7. G2 permanece archivado como evidencia local no aceptada; ninguna futura unidad parte de su HEAD mediante cherry-pick ciego.

## 7. Gobernanza y siguiente paso

Este documento **NO** concede autorización para R1..R5, #721, ampliación de F4.5, publicación de código, PR técnica, despliegue o piloto. Cada WO técnica: base/HEAD GitHub en vivo, worktree/branch aislados, preflight, rutas y NO TOCA, QA soportada, revisores independientes, reversión y aprobación explícita de push/PR/merge. No mover main. Cada cierre publicado exige reconciliar INDEX, WORK_ORDER_STATUS y documento vivo afectado.

**Corte histórico 23-10 (R1) y propuesta anterior de 25-10 (R2):** R1 se publicó por PR #818, sin cherry-pick de G2. La propuesta anterior de iniciar R2 se **pospone por decisión de producto posterior**: mantener F4.4 contrato puro y cutover/F4.5 como integración transversal aplazada; antes, cerrar únicamente defectos G0 demostrados y paridad funcional en el ámbito actual. La WO #827 ya corrigió el P1 UI por PR #828. **R2–R5 no quedan aprobados ni arrancados por este plan**; requieren WO/GO separados. No confundir R2 con FH-EA-03 de causalidad G0 integrada.
