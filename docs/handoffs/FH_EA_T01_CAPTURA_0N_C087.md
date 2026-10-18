# T01 · Handoff de preparación C-087 — registrar y recuperar EA 0..N

**Estado:** `CANDIDATE_HANDOFF_FOR_DOC_PUBLICATION_793`, **NO** `READY_TO_LAUNCH`. Sin issue T01 `status:approved`, con autoridad visual G0 en el paquete documental pendiente de **merge verificado**, sin worktree técnico preparado ni GO de ejecución. No ejecutar OpenCode ni publicar PR/merge desde este documento.

## WHAT — comportamiento demostrable

En Seguimiento FH, una farmacéutica puede indicar Sí y registrar 1, 2 o 5 EA distintos en el mismo acto con identidad y descripción original, guardar, abandonar la vista y restaurar el contenido mediante la **navegación realmente soportada**. También distingue No de No consta, y una contradicción entre No y EA en el mismo acto se detiene sin destruir datos. No precisa sospechosos ni evaluación de causalidad para finalizar el EA. Demo sintética y local-first, sin migración de datos históricos desechables.

## WHERE — seams iniciales conocidos

- `farmacia_seguimiento.html`, `scripts/farmacia_seguimiento.js`: UI y controlador; verificar dinámica realmente cableada, con `currentFollowupVisit.adverse_event` singular en la línea publicada anterior.
- `modules/farmacia_act_contract.js`, `modules/farmacia_act_payloads.js` (F4.4): contrato publicado, NO presumir serialización de Followup operativa en la UI.
- Estados/lectores locales de Farmacia, `scripts/farmacia_patient_read_contract_v2.js` y normalización `scripts/farmacia_statistics_cohort.js`: consumidores **directos potenciales** de forma singular. Cambiar solo lo mínimo para no romper lectura existente; si ello exige tocar otra superficie no autorizada, REPORT/HUMAN STOP en vez de reparar toda la app en T01.
- Perfil/harness: el repositorio remoto utiliza `opencode.json` (no asumir `opencode.jsonc`), `.opencode/agents`, `docs/ATENEA_EXECUTION_ROUTING_V0.md`, `docs/CORA_TICKET_TRAIN_PREPARATION_PROMPT_C087.md`.
- **Autoridad visual:** paquete G0 incorporado a la publicación documental WO #793: `docs/product/fh-ea/g0-v0.4/` (HTML + PNG + hashes). **Comprobar merge y bytes en GitHub canónico** antes de lanzar T01, sin presumirlo por esta ruta de handoff.
- La referencia G0 es la **composición objetivo de T01–T04**, no un mandato para implementar T02–T04 en T01: en este primer ticket solo es vinculante la zona y flujo de nueva captura/estado/guardado; conservar las zonas existentes no modificadas y dejar el resto para sus tickets.
- **Autoridad funcional futura:** publicar/reconciliar spec v0.5 y decisiones aprobadas, enlazar el ticket T01 y mantener el plan EA como propuesta de roadmap, no como código existente.

## REUSE / CLOSED DECISIONS

- Reutilizar fecha única del acto, flujo actual de Seguimiento, validaciones existentes y estándares visuales; adaptar esquema demo con 0..N observaciones sin inventar fármacos.
- Solo descripción original identificativa al **finalizar EA nuevo**. Otros campos opcionales hasta ratificación FH.
- `Sí` = observación nueva o revisada; `No` = no identificados en el acto, sin resolver previos; `No consta` = información insuficiente; `No` nunca equivale a información faltante.
- No crear fechas de inicio, gravedad, actividad de medicamento ni causalidad desde catálogos, anteriores o campos vacíos.
- La antigua demo singular es **desechable**; no escribir migrador ni destruir otros cambios ajenos.

## NO TOCA

No introducir T02 (episodios previos/recurrencias), T03 (sospechosos), T04 (Naranjo/Karch), T05 (Quick View), T06 (Dashboard), T07 (Estadísticas), Export V2/CSV, Bridge/Office Script, API/BD, MEDDRA/CTCAE reales, FEDRA, Farmatool, otros módulos clínicos, refactor global, `main`, otros worktrees o sesiones OpenCode/Herdr en marcha.

## PROOF — evidencias mínimas falsables, no suite general en writer

1. UI auténtica con 0, 1, 2 y 5 EA: mismo ID de acto, diferentes IDs de observación, sin techo arbitrario ni duplicación de filas del acto.
2. Guardar, navegar a otra vista, volver/reabrir acto por la ruta soportada y recuperar misma cantidad, identidades, textos y ausencia de datos. Hacer comprobar la persistencia/restauración real de demo, no `page.set_content` del mockup.
3. Seleccionar No tras registrar EA del mismo acto: diálogo/bloqueo; no borrar ni convertir a No consta; ausencia en acto distinto no modifica estado longitudinal previo.
4. Descripción vacía permitida en borrador pero no completada; sin introducir fechas de inicio/fin ni sospechosos por defecto; mostrar error de guardado/fallo seguro.
5. Una captura real de la aplicación modificada, estado poblado comparable a referencia aceptada, con viewport fijado (1440x900) y sus recortes de zonas EA/causalidad cuando corresponda. No pedir una batería rutinaria de snapshots.
6. Tests focales con **comandos existentes verificados en el HEAD técnico de arranque**, no inventar comandos. QA de navegador real es independiente de tests verdes; producto no piloto.

## VISUAL / RISK / REVIEW — propuesta, NO selección automática

- `Risk class`: **complex** recomendado por cambio de semántica 1→N más persistencia y UI compartida (reconfirmar tras preflight). `Implementation focus`: **mixed**. `UI impact`: **fidelity** cuando el master esté publicado y su hash verificado; antes: `INCOMPLETE_VISUAL_AUTHORITY` / HUMAN STOP.
- `Cost policy`: NO SELECCIONADA; decidir perfil autorizado en la frontera limpia antes de ejecutar. No activar OpenAI ni fallback por defecto. Verificar agentes y permisos efectivos y usar TUI persistente.
- Un implementador por unidad coherente, SHA candidato fijo. Reviews Matt Standards + Spec; Visual/UX solo si corresponde al perfil autorizado, sobre el mismo SHA; consolidar hallazgos antes de corregir, hasta dos intentos existentes; evidencias focales, no segunda ronda general. Respuesta vacía del writer: recuperación read-only en la misma sesión, no reemplazar writer.
- Si se cambia una capa compartida y afecta a Quick View/estadísticas/otros consumidores que no pueden mantener contrato sin expansión, o hay un conflicto clínico/visual irresuelto: **HUMAN STOP**.

## PREFLIGHT / REVERSIÓN / GIT / OUTPUT

- Antes de escribir, verificar GitHub vivo: repo, rama `promueve/nexus-v4`, HEAD exacto, PR #778 y posibles PR/works activos; leer INDEX/WO STATUS/contratos EA y C-087. No reutilizar SHA de 2026-10-17 como HEAD técnico futuro.
- Rama y worktree aislados; registrar HEAD padre y árbol limpio; backup si se mueve alguna referencia demo. No borrar/limpiar/restaurar cambios de terceros.
- Un commit focal por unidad cuando se complete; revert individual solo autorizado. Issue propio `status:approved` para PR. Push, PR y merge sujetos a aprobación específica; un commit local NO es publicación.
- Reconciliar docs vivos cuando cambie el estado real, en WO documental separada si la técnica no lo permite.
- Reportar SHA/parent, archivos, pruebas y QA sintética real, revisiones de ejes, estado Git, pendientes clínicos y publicación. **STOP al entregar el handoff; NO EJECUTAR**.

## Límite del repositorio local (18-10-2026)

Este documento es **candidato y no aprobado**. El HTML/acta/spec y los dos PNG originales están presentes en el worktree documental (SHA-256 3/3 PASS), pero su publicación canónica y la autorización `status:approved` del issue T01 deben verificarse en el repositorio publicado antes de cualquier `Read @docs/handoffs/FH_EA_T01_CAPTURA_0N_C087.md` ejecutable. El comando de arranque **NO se emite en esta WO**. Hacer preflight de HEAD, rutas visuales, SHA-256, sesión persistente y cost_policy con autorización humana, sin iniciar procesos nuevos.
