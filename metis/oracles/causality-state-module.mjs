// Oráculo Metis FH-EA-03 · unidad 2/5 causality-state-module.
//
// El módulo scripts/farmacia_seguimiento_ea_causality_state.js, cargado
// expresamente desde farmacia_seguimiento.html, debe conservar borradores de
// respuestas de causalidad G0 separados por (paciente en edición, visita de
// edición actual, episodio EA, referencia de medicamento sospechoso, método
// naranjo/karch_lasagna) en el seam público
// window.FarmaciaSeguimientoEaCausalityState:
//   · estado sin interacción 'No evaluado'; solo se registran respuestas
//     tocadas/ratificadas expresamente; parciales = 'Borrador en edición';
//     nunca un estado «completado», puntuación o categoría (sin escalas);
//   · alternar EA A/X, A/Y, B/X y Naranjo frente a Karch conserva las
//     respuestas exactas de cada contexto sin compartir estado entre
//     candidatos comunes a dos EA;
//   · desmarcar un sospechoso deja de ser evaluación activa y queda como
//     historial en memoria distinguible; volver a marcar no restaura ni
//     imputa causalidad ni sobreescribe el historial;
//   · el cambio de paciente destruye el contexto en memoria sin recrearlo ni
//     simular relectura; sin sessionStorage/localStorage/IndexedDB, reloj,
//     aleatoriedad ni metadatos de acto (actId, evaluation_id, authorRef,
//     authoredAt, attributionAssurance, provenance).
//
// Ejecución pura en VM más escaneo de fuente y regresión de los testigos
// existentes. En BASE 6c9b541 el módulo no existe: este oráculo es RED allí
// por capacidad ausente (aserción, no excepción de import).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const MODULE_PATH = 'scripts/farmacia_seguimiento_ea_causality_state.js';
const HTML_PATH = 'farmacia_seguimiento.html';
const NARANJO = 'naranjo';
const KARCH = 'karch_lasagna';

// ─── 1. Capacidad ausente en BASE y carga pura en VM ────────────────────────

assert.ok(fs.existsSync(MODULE_PATH), 'Falta el módulo de estado de causalidad G0 en memoria (capacidad ausente en BASE)');
const source = fs.readFileSync(MODULE_PATH, 'utf8');

const sandbox = { window: {}, console: { log() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: MODULE_PATH });
const S = sandbox.window.FarmaciaSeguimientoEaCausalityState;
assert.ok(S && typeof S === 'object', 'El módulo expone el seam público window.FarmaciaSeguimientoEaCausalityState');
for (const name of ['setEditingPatient', 'setEditingVisit', 'setSuspectMarked', 'isSuspectMarked', 'recordAnswer', 'getState', 'getInactiveHistory']) {
    assert.equal(typeof S[name], 'function', `El seam expone ${name}()`);
}

const html = fs.readFileSync(HTML_PATH, 'utf8');
assert.ok(/<script[^>]*src="scripts\/farmacia_seguimiento_ea_causality_state\.js[^"]*"/.test(html), 'El módulo se carga expresamente desde farmacia_seguimiento.html');

// Identidades explícitas sintéticas; el módulo no deduce identidad.
function fresh(patient, visit) {
    S.setEditingPatient(patient);
    S.setEditingVisit(visit);
}
function state(episode, ref, method) {
    return JSON.parse(JSON.stringify(S.getState(episode, ref, method)));
}
// Convierte solo prototipos de reino, preservando undefined y claves propias.
function local(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return Array.from(value, local);
    return Object.fromEntries(Object.keys(value).map((key) => [key, local(value[key])]));
}
function historyFor(episode, ref, method) {
    return local(S.getInactiveHistory()).filter(function (entry) {
        return entry.episodeId === episode && entry.suspectRef === ref && entry.method === method;
    });
}

// ─── 2. Estado sin interacción = No evaluado; sin defaults prefijados ───────

fresh('CIP-ORACLE-A', '2026-10-23');
const untouched = state('E-A', 'REF-X', NARANJO);
assert.deepEqual(Object.keys(untouched).sort(), ['answers', 'status'], 'El estado tiene exactamente {status, answers} (sin puntuación, categoría ni metadatos)');
assert.equal(untouched.status, 'no_evaluado', 'Sin interacción el estado es No evaluado');
assert.deepEqual(untouched.answers, {}, 'Los valores por defecto desconocido/no_se_sabe NO acreditan preguntas contestadas: answers vacío');
assert.equal(state('E-A', 'REF-X', KARCH).status, 'no_evaluado', 'Karch sin interacción también No evaluado');
assert.deepEqual(state('E-A', 'REF-X', KARCH).answers, {}, 'Sin preguntas prefijadas por defecto en Karch');

// ─── 3. Registro fail-closed y marca expresa ────────────────────────────────

assert.equal(S.recordAnswer('E-A', 'REF-X', NARANJO, 'naranjoQ1', 'si'), false, 'Sin sospechoso marcado expresamente la respuesta se ignora (fail-closed)');
assert.equal(state('E-A', 'REF-X', NARANJO).status, 'no_evaluado', 'Ignorar no activa evaluación');
S.setSuspectMarked('E-A', 'REF-X', true);
assert.equal(S.isSuspectMarked('E-A', 'REF-X'), true, 'Marca expresa registrada');
assert.equal(S.recordAnswer('E-A', 'REF-X', NARANJO, 'naranjoQ1', 'si'), true, 'Con marca expresa la respuesta tocada se registra');

// ─── 4. Separación A/X, A/Y, B/X (referencia común) y Naranjo vs Karch ──────

S.setSuspectMarked('E-A', 'REF-Y', true);
S.setSuspectMarked('E-B', 'REF-X', true); // la MISMA referencia marcada en otro EA
S.recordAnswer('E-A', 'REF-Y', NARANJO, 'naranjoQ1', 'no');
S.recordAnswer('E-B', 'REF-X', NARANJO, 'naranjoQ1', 'desconocido'); // selección expresa del valor por defecto: SÍ se registra
S.recordAnswer('E-B', 'REF-X', KARCH, 'klTemporal', 'no_aplica');

let ax = state('E-A', 'REF-X', NARANJO);
assert.equal(ax.status, 'borrador_en_edicion', 'Respuesta explícita (incluso parcial) = Borrador en edición');
assert.deepEqual(ax.answers, { naranjoQ1: 'si' }, 'A/X conserva su respuesta exacta');
assert.deepEqual(state('E-A', 'REF-Y', NARANJO).answers, { naranjoQ1: 'no' }, 'A/Y no comparte estado con A/X');
assert.deepEqual(state('E-B', 'REF-X', NARANJO).answers, { naranjoQ1: 'desconocido' }, 'B/X con la misma referencia NO comparte estado con A/X; desconocido explícito registrado');
assert.deepEqual(state('E-B', 'REF-X', KARCH).answers, { klTemporal: 'no_aplica' }, 'Karch separado de Naranjo dentro de la misma pareja');
assert.deepEqual(state('E-A', 'REF-X', KARCH).answers, {}, 'Karch de A/X sin respuestas propias');

// Alternar y volver: las respuestas exactas de cada contexto se conservan y
// registrar en uno jamás sobreescribe otro.
S.recordAnswer('E-A', 'REF-X', NARANJO, 'naranjoQ2', 'no');
ax = state('E-A', 'REF-X', NARANJO);
assert.deepEqual(ax.answers, { naranjoQ1: 'si', naranjoQ2: 'no' }, 'Volver al primer contexto devuelve sus respuestas exactas');
assert.deepEqual(state('E-A', 'REF-Y', NARANJO).answers, { naranjoQ1: 'no' }, 'Alternar no sobreescribe A/Y');
assert.deepEqual(state('E-B', 'REF-X', NARANJO).answers, { naranjoQ1: 'desconocido' }, 'Alternar no sobreescribe B/X naranjo');
assert.deepEqual(state('E-B', 'REF-X', KARCH).answers, { klTemporal: 'no_aplica' }, 'Alternar no sobreescribe B/X karch');

// ─── 5. Nunca «completado»: naranjo 10/10 explícito vs karch sin respuestas ─

for (let q = 2; q <= 10; q += 1) {
    S.recordAnswer('E-A', 'REF-Y', NARANJO, `naranjoQ${q}`, q % 2 === 0 ? 'si' : 'no');
}
let ayNaranjo = state('E-A', 'REF-Y', NARANJO);
assert.equal(ayNaranjo.status, 'borrador_en_edicion', 'Método con las 10 respuestas explícitas sigue siendo borrador: el módulo NO adjudica completitud ni causalidad');
assert.deepEqual(Object.keys(ayNaranjo.answers).sort(), ['naranjoQ1', 'naranjoQ10', 'naranjoQ2', 'naranjoQ3', 'naranjoQ4', 'naranjoQ5', 'naranjoQ6', 'naranjoQ7', 'naranjoQ8', 'naranjoQ9'], 'Las 10 respuestas explícitas registradas');
assert.equal(state('E-A', 'REF-Y', KARCH).status, 'no_evaluado', 'Naranjo contestado NO convierte a Karch en evaluado');
S.recordAnswer('E-A', 'REF-Y', NARANJO, 'naranjoQ1', 'no');
assert.equal(state('E-A', 'REF-Y', NARANJO).answers.naranjoQ1, 'no', 'La última respuesta explícita de una pregunta sustituye a la anterior en el mismo borrador');

// ─── 6. Snapshot discipline: mutar lo devuelto no toca la memoria ───────────

const mutated = S.getState('E-A', 'REF-Y', NARANJO);
mutated.answers.naranjoQ1 = 'MUTADO';
mutated.status = 'completado';
assert.equal(S.getState('E-A', 'REF-Y', NARANJO).answers.naranjoQ1, 'no', 'getState devuelve copia: mutarla no altera la memoria');
assert.equal(S.getState('E-A', 'REF-Y', NARANJO).status, 'borrador_en_edicion', 'El estado interno no se corrompe por mutación externa');

// ─── 7. Desmarcado: deja de ser evaluación activa y queda historial ─────────

S.setSuspectMarked('E-C', 'REF-Z', true);
S.recordAnswer('E-C', 'REF-Z', NARANJO, 'naranjoQ3', 'si');
S.recordAnswer('E-C', 'REF-Z', KARCH, 'klConocido', 'si');
S.setSuspectMarked('E-C', 'REF-Z', false);
assert.equal(S.isSuspectMarked('E-C', 'REF-Z'), false, 'Desmarcado deja de ser evaluación activa');
assert.equal(state('E-C', 'REF-Z', NARANJO).status, 'no_evaluado', 'Naranjo vuelve a No evaluado tras desmarcar');
assert.deepEqual(state('E-C', 'REF-Z', NARANJO).answers, {}, 'El borrador activo no sigue expuesto como vigente');
assert.equal(state('E-C', 'REF-Z', KARCH).status, 'no_evaluado', 'Karch también desactivado');
const naranjoHistory = historyFor('E-C', 'REF-Z', NARANJO);
const karchHistory = historyFor('E-C', 'REF-Z', KARCH);
assert.equal(naranjoHistory.length, 1, 'El borrador naranjo queda identificable como historial en memoria');
assert.equal(karchHistory.length, 1, 'El borrador karch queda identificable como historial en memoria');
assert.deepEqual(naranjoHistory[0].answers, { naranjoQ3: 'si' }, 'El historial conserva las respuestas del borrador desmarcado');
assert.deepEqual(karchHistory[0].answers, { klConocido: 'si' }, 'Historial karch distinguible del naranjo');
for (const entry of [...naranjoHistory, ...karchHistory]) {
    assert.deepEqual(Object.keys(entry).sort(), ['answers', 'episodeId', 'method', 'suspectRef'], 'Entrada de historial sin metadatos de acto/autoría/tiempo');
}
const historyCopy = S.getInactiveHistory();
historyCopy[0].answers.naranjoQ3 = 'MUTADO';
assert.equal(historyFor('E-C', 'REF-Z', NARANJO)[0].answers.naranjoQ3, 'si', 'Las entradas de historial son copias: mutarlas no toca el módulo');

// Mientras sigue desmarcado, registrar sigue ignorándose y el historial no crece.
assert.equal(S.recordAnswer('E-C', 'REF-Z', NARANJO, 'naranjoQ4', 'si'), false, 'Desmarcado: no se registra respuesta (no hay evaluación activa)');
assert.equal(historyFor('E-C', 'REF-Z', NARANJO).length, 1, 'Ignorar no añade historial');

// ─── 8. Re-marcar la misma referencia: sin restauración ni sobreescritura ───

S.setSuspectMarked('E-C', 'REF-Z', true);
assert.equal(state('E-C', 'REF-Z', NARANJO).status, 'no_evaluado', 'Volver a marcar NO restaura automáticamente la causalidad histórica ni la imputa');
assert.deepEqual(state('E-C', 'REF-Z', NARANJO).answers, {}, 'Ningún borrador ajeno presentado como vigente');
S.recordAnswer('E-C', 'REF-Z', NARANJO, 'naranjoQ3', 'no');
S.setSuspectMarked('E-C', 'REF-Z', false);
const afterRemark = historyFor('E-C', 'REF-Z', NARANJO);
assert.equal(afterRemark.length, 2, 'Dos borradores históricos distinguibles para el mismo contexto');
assert.deepEqual(afterRemark[0].answers, { naranjoQ3: 'si' }, 'El primer borrador histórico permanece íntegro (no sobreescrito)');
assert.deepEqual(afterRemark[1].answers, { naranjoQ3: 'no' }, 'El segundo borrador histórico es distinto del primero');
assert.equal(historyFor('E-C', 'REF-Z', KARCH).length, 1, 'El historial karch no se duplica ni se toca');

// ─── 9. Cambio de paciente: destruye todo, sin recrear ni simular relectura ─

assert.equal(state('E-B', 'REF-X', NARANJO).status, 'borrador_en_edicion', 'Antes del cambio hay borradores vivos (destrucción real, no vacua)');
assert.ok(S.getInactiveHistory().length >= 3, 'Antes del cambio hay historial en memoria');
S.setEditingPatient('CIP-ORACLE-B');
assert.equal(state('E-B', 'REF-X', NARANJO).status, 'no_evaluado', 'El contexto del paciente anterior no reaparece en B');
assert.deepEqual(state('E-B', 'REF-X', NARANJO).answers, {}, 'Sin borradores de A en B');
assert.deepEqual(local(S.getInactiveHistory()), [], 'El historial en memoria se destruye con el cambio de paciente');
assert.equal(S.isSuspectMarked('E-A', 'REF-X'), false, 'Las marcas también se destruyen');
S.setEditingPatient('CIP-ORACLE-A'); // volver a A
assert.equal(state('E-B', 'REF-X', NARANJO).status, 'no_evaluado', 'A→B→A sin almacenamiento autorizado NO simula relectura de A');
assert.deepEqual(local(S.getInactiveHistory()), [], 'Sin historial resucitado al volver a A');
assert.equal(S.recordAnswer('E-A', 'REF-X', NARANJO, 'naranjoQ1', 'si'), false, 'La marca destruida exige marcar de nuevo: fail-closed');
// Volver a fijar la MISMA identidad no destruye nada.
S.setSuspectMarked('E-A', 'REF-X', true);
S.recordAnswer('E-A', 'REF-X', NARANJO, 'naranjoQ1', 'si');
S.setEditingPatient('CIP-ORACLE-A');
assert.equal(state('E-A', 'REF-X', NARANJO).answers.naranjoQ1, 'si', 'Re-fijar la misma identidad de paciente conserva el estado');
S.setEditingPatient('CIP-ORACLE-B'); // cambio real de nuevo
assert.equal(state('E-A', 'REF-X', NARANJO).status, 'no_evaluado', 'El cambio de paciente vuelve a destruir el contexto');

// ─── 10. Visita de edición actual: sin fuga entre visitas ───────────────────

S.setEditingVisit('2026-10-24');
S.setSuspectMarked('E-V', 'REF-V', true);
S.recordAnswer('E-V', 'REF-V', NARANJO, 'naranjoQ5', 'si');
assert.equal(state('E-V', 'REF-V', NARANJO).answers.naranjoQ5, 'si', 'Borrador bajo su visita de edición');
S.setEditingVisit('2026-10-25');
assert.equal(state('E-V', 'REF-V', NARANJO).status, 'no_evaluado', 'Otra visita de edición no ve los borradores de la anterior');
assert.deepEqual(state('E-V', 'REF-V', NARANJO).answers, {}, 'Sin respuestas filtradas entre visitas');
assert.deepEqual(local(S.getInactiveHistory()), [], 'Sin historial filtrado entre visitas');
S.setEditingVisit('2026-10-24');
assert.deepEqual(state('E-V', 'REF-V', NARANJO).answers, { naranjoQ5: 'si' }, 'Los borradores se conservan bajo la visita con la que se registraron (memoria de edición)');
S.setSuspectMarked('E-V', 'REF-V', false);
assert.equal(historyFor('E-V', 'REF-V', NARANJO).length, 1, 'El desmarcado en esta visita deja historial en su visita');

// ─── 11. Cardinalidad 0/1/2/5 EA con referencia común aislada por episodio ──

S.setEditingVisit('2026-10-26');
S.setSuspectMarked('E-0', 'REF-COM', false); // desmarcado de referencia nunca marcada: sin efecto
for (let i = 1; i <= 5; i += 1) S.setSuspectMarked(`E-${i}`, 'REF-COM', true);
S.recordAnswer('E-1', 'REF-COM', NARANJO, 'naranjoQ1', 'si');
S.recordAnswer('E-2', 'REF-COM', NARANJO, 'naranjoQ1', 'no');
assert.deepEqual(state('E-1', 'REF-COM', NARANJO).answers, { naranjoQ1: 'si' }, 'EA 1 aísla su borrador con referencia común');
assert.deepEqual(state('E-2', 'REF-COM', NARANJO).answers, { naranjoQ1: 'no' }, 'EA 2 aísla su borrador con referencia común');
for (let i = 3; i <= 5; i += 1) {
    assert.equal(state(`E-${i}`, 'REF-COM', NARANJO).status, 'no_evaluado', `EA ${i} marcado sin respuestas sigue No evaluado`);
}
assert.equal(state('E-0', 'REF-COM', NARANJO).status, 'no_evaluado', 'EA sin sospechoso marcado: sin evaluación');

// ─── 12. Frontera: sin storage, reloj, aleatoriedad ni metadatos de acto ────

for (const token of ['sessionStorage', 'localStorage', 'indexedDB', 'setItem', 'getItem', 'Date', 'Math.random', 'crypto', 'actId', 'evaluation_id', 'authorRef', 'authoredAt', 'attributionAssurance', 'provenance', 'createAct']) {
    assert.ok(!source.includes(token), `El módulo de estado no contiene ${token} (memoria de edición pura, sin persistencia ni metadatos)`);
}

// ─── 13. Regresión: testigo T01 lógico sigue pasando sin modificación ───────
// (Los testigos browser T01/02B re-capturan PNG versionados al ejecutarse:
// quedan como suite focal previa del writer, no dentro de este oráculo, que
// debe ser sin efectos sobre el árbol.)

const t01 = spawnSync(process.execPath, ['tools/farmacia_ea_t01_check.mjs'], { encoding: 'utf8', timeout: 120000 });
assert.equal(t01.status, 0, `tools/farmacia_ea_t01_check.mjs\n${t01.stdout}${t01.stderr}`);

console.log('PASS causality-state-module: borradores separados por paciente×visita×episodio×referencia×método / No evaluado sin interacción / solo respuestas explícitas / Borrador en edición parcial / nunca completado / desmarcado con historial en memoria sin restauración / cambio de paciente destruye / sin storage ni metadatos / regresión T01 verde');
console.log('LÍMITES: sin UI, controlador, escalas, exportaciones, persistencia ni verify:nexus dentro de este oráculo; los testigos browser re-capturan PNG versionados y quedan fuera de él.');