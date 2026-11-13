// Tramo 5 (Reuma, #913): errores silenciosos. Datos solo sintéticos.
// A. parseVisitDate no inventa "hoy"; aviso al cargar si hay fechas ilegibles.
// B. Línea temporal: «No» = sin tratamiento explícito; celda vacía = no consta (regla de Farmacia).
// C. Estadísticas: «No consta» para el tratamiento ausente.
// D. prebiologicManager.setStatus sin fecha no inventa la fecha de validación.
import fs from 'node:fs';
import vm from 'node:vm';
const rd = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const quiet = { log() {}, warn() {}, error() {}, info() {} };

// ── A. Fechas ────────────────────────────────────────────────────────
const dm = rd('modules/dataManager.js');
function grab(src, name) {
  const m = src.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n'));
  ok(!!m, 'no se encuentra la función ' + name);
  return m ? m[0] : '';
}
const ctxA = { console: quiet };
vm.createContext(ctxA);
try {
  vm.runInContext(grab(dm, 'parseVisitDate') + '\n' + grab(dm, 'countUnreadableVisitDates'), ctxA);
  const today = new Date().toDateString();
  for (const bad of ['', null, undefined, 'fecha-rota', 'ilegible', '32/13/x']) {
    const d = ctxA.parseVisitDate(bad);
    ok(d instanceof Date || (d && typeof d.getTime === 'function'), 'A1 parseVisitDate(' + JSON.stringify(bad) + ') debe devolver un Date');
    ok(d && Number.isNaN(d.getTime()), 'A1 parseVisitDate(' + JSON.stringify(bad) + ') no debe ser una fecha válida (¿hoy? ' + (d && d.toDateString() === today) + ')');
  }
  const okIso = ctxA.parseVisitDate('2026-03-15');
  ok(okIso && okIso.getFullYear() === 2026 && okIso.getMonth() === 2 && okIso.getDate() === 15, 'A2 ISO válida se conserva');
  const okEs = ctxA.parseVisitDate('15/03/2026');
  ok(okEs && okEs.getFullYear() === 2026 && okEs.getMonth() === 2 && okEs.getDate() === 15, 'A2 DD/MM/YYYY válida se conserva');

  const db = {
    AR: [{ ID_Paciente: 'SYN-1', Fecha_Visita: '2026-01-10' }, { ID_Paciente: 'SYN-2', Fecha_Visita: 'rota' }],
    ESPA: [{ ID_Paciente: 'SYN-3', Fecha_Visita: '' }, { ID_Paciente: 'SYN-4', fechaVisita: '10/02/2026' }],
    APS: [], LES: [{ ID_Paciente: 'SYN-5' }], SJOGREN: [{ ID_Paciente: 'SYN-6', Fecha_Visita: '2026-02-01' }],
    Profesionales: [{ Nombre_Completo: 'SYN prof' }],
  };
  ok(ctxA.countUnreadableVisitDates(db) === 3, 'A3 countUnreadableVisitDates debe contar 3 (rota, vacía, sin columna) en las hojas clínicas; da ' + ctxA.countUnreadableVisitDates(db));
  ok(ctxA.countUnreadableVisitDates({}) === 0, 'A3 BD vacía → 0');
} catch (e) { fails.push('A no ejecutable: ' + e.message); }
const loadBody = (dm.match(/async function loadDatabase\([^)]*\) \{[\s\S]*?\n\}\n/) || [''])[0];
ok(/countUnreadableVisitDates\(/.test(loadBody), 'A4 loadDatabase debe llamar a countUnreadableVisitDates');
ok(/mostrarNotificacion\([\s\S]{0,200}visitas con fecha ilegible en el Excel/.test(loadBody), 'A4 loadDatabase debe avisar «N visitas con fecha ilegible en el Excel» con mostrarNotificacion');

// ── B. Eventos de tratamiento ────────────────────────────────────────
const sb = { console: quiet, setTimeout, clearTimeout };
sb.window = sb;
sb.document = { readyState: 'complete', addEventListener() {}, getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] } };
sb.addEventListener = () => {};
vm.createContext(sb);
let ev = null;
try {
  // En la página, dataManager.js (lector de fechas común) se carga antes que treatmentEventsManager.js (#933).
  vm.runInContext(grab(dm, 'parseVisitDate') + '\n' + grab(dm, 'compareVisitDates'), sb, { filename: 'lector-dataManager' });
  for (const f of ['modules/hubTools.js', 'modules/treatmentEventsManager.js']) vm.runInContext(rd(f), sb, { filename: f });
  ev = sb.HubTools.events.extractTreatmentEvents;
} catch (e) { fails.push('B no se carga treatmentEventsManager: ' + e.message); }
const visit = (fecha, ta, extra = {}) => ({ ID_Paciente: 'SYN-EV', Fecha_Visita: fecha, Tipo_Visita: 'Primera', Diagnostico_Primario: 'espa', ...(ta === undefined ? {} : { Tratamiento_Actual: ta }), ...extra });
const types = (visits) => ev({ allVisits: visits, pathology: 'espa' }).map((e) => e.type).filter((t) => /^treatment_/.test(t));
if (ev) {
  const T1 = '2026-01-10', T2 = '2026-03-10';
  const cases = [
    ['B1 primera visita con «No» → sin evento', [visit(T1, 'No')], []],
    ['B2 «No» → fármaco = inicio', [visit(T1, 'No'), visit(T2, 'ACT-B')], ['treatment_start']],
    ['B3 fármaco → «No» = suspensión', [visit(T1, 'ACT-B'), visit(T2, 'No')], ['treatment_start', 'treatment_suspend']],
    ['B4 fármaco → vacío = no consta, sin evento', [visit(T1, 'ACT-B'), visit(T2, '')], ['treatment_start']],
    ['B5 vacío → fármaco = no consta, sin inicio', [visit(T1, ''), visit(T2, 'ACT-B')], []],
    ['B6 «No» → «No» = sin evento', [visit(T1, 'NO'), visit(T2, ' no ')], []],
    ['B7 fármaco → otro fármaco = cambio', [visit(T1, 'ACT-A'), visit(T2, 'ACT-B')], ['treatment_start', 'treatment_change']],
    ['B8 Decision_Terapeutica suspender sigue siendo suspensión', [visit(T1, 'ACT-B'), visit(T2, 'ACT-B', { Decision_Terapeutica: 'suspender' })], ['treatment_start', 'treatment_suspend']],
    ['B9 fármaco → columna ausente = no consta, sin evento', [visit(T1, 'ACT-B'), visit(T2, undefined)], ['treatment_start']],
  ];
  for (const [name, visits, expected] of cases) {
    try {
      const got = types(structuredClone(visits));
      ok(JSON.stringify(got) === JSON.stringify(expected), name + ': esperado ' + JSON.stringify(expected) + ', obtenido ' + JSON.stringify(got));
    } catch (e) { fails.push(name + ': excepción ' + e.message); }
  }
  try {
    const all = ev({ allVisits: [visit(T1, 'No'), visit(T2, 'ACT-B')], pathology: 'espa' });
    ok(!all.some((e) => /: no$/i.test(String(e.description || ''))), 'B10 ninguna descripción trata «no» como fármaco');
  } catch (e) { fails.push('B10: ' + e.message); }
}

// ── C. Estadísticas ──────────────────────────────────────────────────
const est = rd('scripts/script_estadisticas.js');
for (const [f, src] of [['modules/dataManager.js', dm], ['scripts/script_estadisticas.js', est]]) {
  ok(!/'Sin tratamiento'/.test(src), 'C1 ' + f + ' no debe usar «Sin tratamiento» como valor por defecto del dato ausente');
}
ok(/Tratamiento_Actual \|\| 'No consta'/.test(dm), 'C2 dataManager (gráfico de tratamientos) usa «No consta»');
ok(/_tratamiento: canonicalVisit\?\.tratamientoActual \|\| visit\.Tratamiento_Actual \|\| ''/.test(dm), 'C3 dataManager _tratamiento queda vacío si falta el dato');
ok(/patient\.Tratamiento_Actual \|\| 'No consta'/.test(est), 'C4 script_estadisticas usa «No consta»');

// ── D. Prebiológico ──────────────────────────────────────────────────
const store = new Map();
const sd = { console: quiet, sessionStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), key: (i) => [...store.keys()][i] ?? null, get length() { return store.size; } } };
sd.window = sd;
vm.createContext(sd);
try {
  vm.runInContext(rd('modules/prebiologicManager.js'), sd);
  const p = sd.HubTools.prebiologic;
  ok(p.setStatus('SYN-PB-1', 'APTO') === true, 'D1 setStatus guarda');
  const r1 = p.getStatus('SYN-PB-1');
  ok(r1 && r1.fechaValidacion === '', 'D1 sin fecha → fechaValidacion vacía (obtenido ' + JSON.stringify(r1 && r1.fechaValidacion) + ')');
  p.setStatus('SYN-PB-2', 'APTO', '2026-02-01');
  const r2 = p.getStatus('SYN-PB-2');
  ok(r2 && r2.fechaValidacion === '2026-02-01', 'D2 fecha explícita se conserva');
} catch (e) { fails.push('D no ejecutable: ' + e.message); }

if (fails.length) { console.error('FALLA:\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('reuma_errores_silenciosos_check OK');
