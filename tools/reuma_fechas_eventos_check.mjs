// Reuma (13-11, tras #929/#931): los eventos de tratamiento del panel leen la fecha de visita
// con el mismo lector (parseVisitDate/compareVisitDates de dataManager.js), que en la página
// se carga antes que treatmentEventsManager.js. Decisión de Sil (13-11, opción b): una visita
// con fecha ilegible no se usa para deducir eventos (ni genera eventos ni hace de visita
// anterior). Datos solo sintéticos.
import fs from 'node:fs';
import vm from 'node:vm';
const rd = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const quiet = { log() {}, warn() {}, error() {}, info() {} };
function grab(src, name) {
  const m = src.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n'));
  ok(!!m, 'no se encuentra la función ' + name);
  return m ? m[0] : '';
}
const dm = rd('modules/dataManager.js');
const lector = ['parseVisitDate', 'compareVisitDates'].map((n) => grab(dm, n)).join('\n');

const sb = { console: quiet, setTimeout, clearTimeout };
sb.window = sb;
sb.document = { readyState: 'complete', addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } };
sb.addEventListener = () => {};
vm.createContext(sb);
let api = null;
try {
  vm.runInContext(lector, sb, { filename: 'lector-dataManager' });
  for (const f of ['modules/hubTools.js', 'modules/treatmentEventsManager.js']) vm.runInContext(rd(f), sb, { filename: f });
  api = sb.HubTools.events;
} catch (e) { fails.push('no se carga treatmentEventsManager: ' + e.message); }

const visit = (fecha, ta) => ({ ID_Paciente: 'SYN-FE', Fecha_Visita: fecha, Tipo_Visita: 'Primera', Diagnostico_Primario: 'espa', Tratamiento_Actual: ta });
const tx = (visits) => api.extractTreatmentEvents({ allVisits: structuredClone(visits), pathology: 'espa' })
  .filter((e) => /^treatment_/.test(e.type)).map((e) => e.type + '@' + (e.date || 'sin-fecha'));

if (api) {
  const cases = [
    // E1. El panel entrega las visitas de la más reciente a la más antigua; un día > 12
    // ya no deja la lista sin ordenar (antes: inicio y suspensión al revés).
    ['E1 «20/04/2024 ACT-B» y «05/03/2024 No» (en orden del panel) = inicio el 20/04',
      [visit('20/04/2024', 'ACT-B'), visit('05/03/2024', 'No')],
      ['treatment_start@2024-04-20']],
    // E2. Formatos mezclados: serie de Excel, ISO y día/mes español, desordenados.
    ['E2 serie 45000, ISO y «05/03/2024» se ordenan por su fecha real y el evento lleva fecha',
      [visit('05/03/2024', 'ACT-B'), visit(45000, 'ACT-A'), visit('2024-01-10', 'ACT-A')],
      ['treatment_start@2023-03-15', 'treatment_change@2024-03-05']],
    // E3. Una visita ilegible no genera eventos (antes, suspensión o inicio inventados).
    ['E3 visita «rota» con «No» entre dos con ACT-B: solo el inicio',
      [visit('2024-03-10', 'ACT-B'), visit('rota', 'No'), visit('2024-01-10', 'ACT-B')],
      ['treatment_start@2024-01-10']],
    // E4. Una visita ilegible tampoco hace de visita anterior.
    ['E4 «No» → (rota ACT-A) → ACT-B: inicio el 10/03, nada de la visita rota',
      [visit('2024-01-10', 'No'), visit('rota', 'ACT-A'), visit('2024-03-10', 'ACT-B')],
      ['treatment_start@2024-03-10']],
    // E5. Fecha imposible: ilegible, nunca 03/03/2025.
    ['E5 «31/02/2025» es ilegible: sin cambio fechado el 03/03/2025',
      [visit('2025-01-10', 'ACT-A'), visit('31/02/2025', 'ACT-B')],
      ['treatment_start@2025-01-10']],
    // E6. Lo que escribe el formulario (ISO) da lo mismo que antes.
    ['E6 ISO: inicio y cambio como siempre',
      [visit('2026-01-10', 'ACT-A'), visit('2026-03-10', 'ACT-B')],
      ['treatment_start@2026-01-10', 'treatment_change@2026-03-10']],
    // E7. Si todas las fechas son ilegibles, no se deduce nada.
    ['E7 todas ilegibles → ningún evento de tratamiento',
      [visit('rota', 'ACT-A'), visit('', 'ACT-B')],
      []],
    // E10 (revisor ciego). Mismo día con hora: se ordena por fecha y hora, como antes.
    ['E10 mismo día: 08:00 «No» y 18:00 ACT-B (en orden del panel) = solo inicio',
      [visit('2026-03-10T18:00:00', 'ACT-B'), visit('2026-03-10T08:00:00', 'No')],
      ['treatment_start@2026-03-10']],
  ];
  for (const [name, visits, expected] of cases) {
    try {
      const got = tx(visits);
      ok(JSON.stringify(got) === JSON.stringify(expected), name + ': esperado ' + JSON.stringify(expected) + ', obtenido ' + JSON.stringify(got));
    } catch (e) { fails.push(name + ': excepción ' + e.message); }
  }

  // E11 (revisor ciego). Un Date inválido también es ilegible: nada de «NaN-NaN-NaN».
  try {
    const got = api.extractTreatmentEvents({ allVisits: [visit('2026-01-10', 'ACT-A'), visit(vm.runInContext('new Date(NaN)', sb), 'No')], pathology: 'espa' })
      .filter((e) => /^treatment_/.test(e.type)).map((e) => e.type + '@' + (e.date || 'sin-fecha'));
    ok(JSON.stringify(got) === JSON.stringify(['treatment_start@2026-01-10']), 'E11 visita con Date inválido no genera eventos: obtenido ' + JSON.stringify(got));
  } catch (e) { fails.push('E11: excepción ' + e.message); }

  // E8. El lector propio del módulo (_parseDate) es ya el común.
  const iso = (d) => d && typeof d.getTime === 'function' && !isNaN(d.getTime())
    ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : null;
  for (const [v, exp] of [[45000, '2023-03-15'], ['05/03/2024', '2024-03-05'], ['2024-03-15', '2024-03-15'], ['31/02/2025', null], ['fecha-rota', null], ['', null], [null, null]]) {
    let got;
    try { got = iso(api._parseDate(v)); } catch (e) { got = 'excepción ' + e.message; }
    ok(got === exp, 'E8 _parseDate(' + JSON.stringify(v) + ') debe dar ' + JSON.stringify(exp) + '; da ' + JSON.stringify(got));
  }
}

// Un solo lector: el módulo no ordena ni lee fechas con new Date nativo sobre la visita.
const tem = rd('modules/treatmentEventsManager.js');
ok(!/new Date\(\s*(?:a|b)\.(?:Fecha_Visita|fechaVisita|Fecha)\b/.test(tem), 'E9 extractTreatmentEvents no debe ordenar visitas con new Date nativo');
ok(/parseVisitDate\(/.test(tem), 'E9 treatmentEventsManager.js debe usar parseVisitDate');

// Caché.
ok(/modules\/treatmentEventsManager\.js\?v=20261113a/.test(rd('dashboard_paciente.html')), 'caché: dashboard_paciente.html debe cargar treatmentEventsManager.js?v=20261113a');

if (fails.length) {
  console.error('FAIL reuma_fechas_eventos_check (' + fails.length + ')');
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log('OK reuma_fechas_eventos_check');
