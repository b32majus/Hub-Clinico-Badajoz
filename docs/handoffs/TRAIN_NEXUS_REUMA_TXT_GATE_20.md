# TRAIN-NEXUS-REUMA-TXT-GATE-20 — Gate efímero e íntegro TXT→CSV (#621)

**Status: READY_TO_LAUNCH — LOCAL ONLY** (preparado 2026-10-10; el humano ejecuta). **NO es un merge ni una aprobación hospitalaria de privacidad/piloto.**

## 1. Fuente fija, alcance y ruta
- Repo `b32majus/Hub-Clinico-Badajoz`; rama canónica `promueve/nexus-v4`, **HEAD exacto de preparación** `758a5a97dd9f863ba426cce20792d353a0ed35a7` (merge documental PR #628; último producto #624/PR #625).
- Rama aislada `work/nexus-txt-gate-621-train20-c087-complex-20261010`; worktree `/srv/kairos-lab/worktrees/promueve-nexus-txt-gate-train20-20261010`; primer commit prep hijo de la base, verificar SHA durante launch. Worktree **limpio** al iniciarse; STOP ante drift.
- Issue origen #621 actualmente `OPEN/DISCOVERY`; el texto remoto anterior dice `NO IMPLEMENTATION AUTHORITY`. **Instrucción más reciente de la operadora** acepta expresamente las seis decisiones funcionales y solicita preparar/ejecutar localmente el train. Esto **no** otorga `status:approved` remoto ni autorización de PR/merge. No mutar issues.
- **Spec aceptada por humano para trabajo local:** [TRAIN_NEXUS_REUMA_TXT_GATE_20_SPEC.md](TRAIN_NEXUS_REUMA_TXT_GATE_20_SPEC.md). Leerla **antes** de código.
- **Tickets atomizados** (grafo Matt local, no tracker publicado):
  - [T20-01 memoria + clipboard real](TRAIN_NEXUS_REUMA_TXT_GATE_20_TICKETS/01-memory-gate.md), sin bloqueador;
  - [T20-02 modal/descarga con atestación explícita](TRAIN_NEXUS_REUMA_TXT_GATE_20_TICKETS/02-manual-confirmation.md), bloqueado por T20-01;
  - [T20-03 edición/reentrada + QA integrado](TRAIN_NEXUS_REUMA_TXT_GATE_20_TICKETS/03-integrity-integration.md), bloqueado por T20-02.
- **Ruta Atenea:** `cost_policy=standard`, `risk_class=complex` por semántica temporal, seguridad/privacidad clínica y callback compartido. Coordinator `atenea-complex` (MiMo 2.6 Flash); writer `atenea-implementer-complex` (GLM 5.3 Flash high); Standards `atenea-review-standards` (GPT-6 Luna high); Spec `atenea-review-spec-complex` (GPT-6.1 Sol high); corrector `atenea-corrector-complex` fresh si procede. La configuración **real** `.opencode/agents` y `opencode.json` gobierna; comprobar, no modificar. OpenCode v2.0.26 en dispositivo verificado; externo `b32majus/Atenea/main@2eb9806a15e329efc4952b136b4de6af49d9423e` retiene C-087 y añadió cualificación Go sin cambiar default Standard. Nexus `docs/ATENEA_EXECUTION_ROUTING_V0.md` C-087 es el contrato local. No migrar arnés en esta WO.
- La indicación humana actual exige OpenCode C-087; si el `AGENTS.md` del repo conserva instrucciones de ejecución Pi/Gentle anteriores, seguir la instrucción actual + routing C-087, **sin editarlas**. Si hay conflicto funcional/seguridad real entre fuentes vigentes, HUMAN STOP.
- Matt **instalado y leído**: Atenea `.agents/skills/to-spec`, `to-tickets`, `implement-spec`, `implement`, `tdd` y `code-review`. Respeta upstream (spec/tickets aceptados primero, slices verticales, RED→GREEN, un review de dos ejes) sin activar operaciones de publicación de issues de `/to-spec`/`/to-tickets`. No crear workflows, launchers ni procesos OpenCode adicionales.

## 2. Semántica clínica — CLOSED / no redescubrir
1. **No exigir pegado comprobado en HCE/PreSalud**: no existe integración ni manera de certificarlo; servidor hospitalario probable pero no concedido ni relevante para la autorización de copia. Mensajes veraces distinguen «copiado por navegador» de «confirmado por profesional». No «guardado/validado en HCE».
2. **Permiso TXT→CSV exclusivamente en memoria**, sin CIP+fecha+tipo+diagnóstico persistidos ni hash de esa tupla en `sessionStorage`/`localStorage`. Reseteo recarga/reapertura/nueva visita; dos instancias no comparten permiso, aunque tengan mismos campos.
3. **TXT autorizado** solo si clipboard confirma éxito o el profesional atestigua explícitamente copia/descarga manual. Modal abierto, texto seleccionado, archivo descargado por click o fallo de clipboard **nunca** bastan.
4. **Edición posterior de datos exportables** invalida la autorización al revalidar CSV: avisar que debe repetir TXT y revisar HCE. La instantánea se basa en payload clínico exportable, no en el texto con timestamp «Generado el». Datos ausentes permanecen ausentes, sin inferencias terapéuticas.
5. **No borrar/importar legacy** `HubClinico_TxtExportDone_*` o `hubPendingRows`; las marcas antiguas nunca autorizan. Solo fixtures `SYN-*`, sin datos reales ni inspección en navegadores hospitalarios.
6. **CSV formal** conserva exactamente el contrato de 497 columnas y su frontera cutover; Solicitud FH y shared modal #620 preservados.
7. **Limitación no negociable:** si existe flujo soportado que inicia nueva visita en el mismo documento sin señal fiable, STOP y pedir decisión; no inferir instancia por CIP/día/tipo/diagnóstico, ni modificar readonly DOM en tests.

## 3. WHERE / REUSE / conditional safeguards
- `modules/exportManager.js`: `exportarTXT` (producer), `exportarAct497` y `exportarYCopiarCSV` (consumers), antiguos `buildVisitExportKey` / `markTxtExportDone` / `hasTxtExportDone` **dejar de consumir**, `entregarFilaProyectadaCSV` preservado.
- `modules/formController.js::mostrarModalTexto`: #620 copy-truth y stale Promise son contrato publicado. Extensión callback opt-in acotada si imprescindible para TXT; otras invocaciones de TXT/CSV/FH no se alteran.
- Los scripts `scripts/script_primera_visita.js` y `scripts/script_seguimiento.js` recopilan actualmente los datos al pulsar TXT o CSV; identificar si ya basta su contrato, **no duplicar colectores**.
- **Siete consumidores HTML de exportManager** verificados en la base: `primera_visita.html`, `seguimiento.html`, `dashboard_paciente.html`, `estadisticas.html`, `reuma_index.html`, `manage_drugs.html`, `manage_professionals.html`: actualizar token único de `exportManager.js` tras modificarlo; preservar load order, sin cambiar tokens de CSS/otros módulos. Cuatro consumidores `formController.js` si procede, verificar y justificar.
- Oráculos disponibles: `tools/reuma_act_cutover_check.mjs`, `tools/reuma_export_boundary_check.mjs`, `tools/reuma_pending_retirement_check.mjs`, los browser respectivos y `tools/reuma_shared_modal_copy_truth_browser_check.mjs`. Oráculos antiguos que fijan persistencia deben reconciliarse con nueva autoridad, **sin debilitar** igualdad 497/no recursión/no storage.
- **Conditional safeguards:** `PRODUCT_FIDELITY_GATES_V1.md` Gate 3 por shared consumer `formController` / `exportManager` y Gate 4 **narrow** por UI nueva de atestación/aviso. Prueba adversarial solo para claims concretos de invalidación/ausencia de almacenamiento/colisión; no expandir auditoría general. Cora realizará Gates 3/4 independiente **después** del candidato.
- `AGENTS.md`, `CODING_STANDARDS.md`, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md` son autoridad para leer, **no editar** como parte de la WO técnica.

## 4. PROOF / revisión / límites de ejecución
- Primero frozen acceptance del spec y un RED real sobre el legacy gate, mediante **contexto independiente** del builder; T20-01/02/03 ejecutados con RED→GREEN en slices verticales (seguir Matt `tdd` sin reimprimir su metodología).
- Writer prueba solo el seam relevante de su ticket; QA integrada recorre botones reales PV/Seguimiento, guard del modal, dos identidades iguales en instancias distintas, navegación/reload/bfcache, datos cambiados y edición/no cambio, clipboard fallida, manual/descarga con/ sin atestación, markers legacy plantados y CSV 497 literal. Browser sintético; sin inyección artificial de estados no soportados. Capturas en `/tmp` solo sintéticas, no commitear datos ni screenshots.
- En integración, `npm run verify:nexus` una vez, browser focal y mapa de siete páginas. Diferencia Node 24 vs engines 20 declarada; CI posterior autoridad de publicación. Preservar líneas CRLF/estilo. No checks amplios en cada slice.
- Un candidato fijo → **una revisión canónica** Standards + Spec, dos revisores independientes; máximo **dos** intentos de corrección fresh finding-scoped. No reviewers de más por costumbre ni bucles broad. Si se agota presupuesto o aparece decisión sustantiva nueva: HUMAN STOP y reportar.
- Scope técnico permitido: `modules/exportManager.js`; extensión puntual `modules/formController.js`; 7 HTML tokens, hasta 4 formController tokens justificados; oráculos Reuma/Solicitud FH afectados y package script si justificado. Ningún refactor general, UI decorativa, motores 497, cambio de contenido clínico, Farmacia, BRIDGE, Excel/SQL, backend, CIMA, Presalud, `main`, consola de datos clínicos (deuda de logs SEPARADA).
- **Reversión:** `git revert` de commits locales por tickets cuando proceda, nunca `reset --hard`, `git clean`, force-push, eliminación de worktrees/ramas o limpieza de Web Storage.
- **Git autorizado:** commits locales atómicos y QA. **NO autoriza:** issue/label mutation, push, PR, merge, release/deploy, borrar branches/worktrees, cerrar #621, reconciliar INDEX/WOS/ledger ni declarar piloto. Un issue `status:approved` específico será necesario antes de PR y la operadora aprobará la publicación.

## 5. OUTPUT (un único closeout de coordinador)
- Base/prep/commit de T20-01/T20-02/T20-03 y correcciones, HEAD fixed candidato; rama/worktree/status limpio, archivos exactos, constraints NO TOCA.
- Evidencia RED baseline, GREEN de tests deterministas y Chromium (conteos y testigos negativos), igualdad de 497 y texto TXT, tokens en siete HTML, pruebas de FH sin regresión, screenshots solo en `/tmp`.
- Review canónica Standards y Spec con sesiones/bindings, presupuesto de corrección restante, desviaciones del entorno.
- Estado #621 sin mutar y reservas de privacidad/infra; clasificación IMPLEMENTADO local / DEMOSTRADO local / PUBLICADO: no; GO/NO-GO hacia Cora Gates 3/4.
- **STOP:** tras closeout LOCAL ONLY. No segunda sesión OpenCode, runner, headless, push, PR, merge ni publicación no autorizada.
