// Reuma, A6 (13-11): huecos que quedan en la lectura de fechas de visita. Datos solo sintéticos.
// Casos validados por Sil el 13-11:
// F1 número de serie de Excel → su fecha; F2 fuera de 1900-2100 → ilegible;
// F3 número escrito como texto → ilegible; F4 fecha imposible → ilegible (no se corrige sola);
// F5 lo que ya funcionaba sigue igual; F6 quien lee la fecha de la fila no la convierte antes a texto;
// F7 al ordenar, las fechas ilegibles van siempre al final.
import fs from 'node:fs';
import vm from 'node:vm';
const rd = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const quiet = { log() {}, warn() {}, error() {}, info() {} };

const dm = rd('modules/dataManager.js');
function grab(src, name) {
  const m = src.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n'));
  ok(!!m, 'no se encuentra la función ' + name);
  return m ? m[0] : '';
}
const ctx = { console: quiet };
vm.createContext(ctx);
const isBad = (d) => !!d && typeof d.getTime === 'function' && Number.isNaN(d.getTime());
const ymd = (d) => (d && !Number.isNaN(d.getTime())) ? [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-') : 'ilegible';
const label = (v) => typeof v === 'string' ? JSON.stringify(v) : String(v);

try {
  vm.runInContext(['parseVisitDate', 'compareVisitDates', 'getFieldValue', 'parseFilterDate', 'getVisitDateValue']
    .map((n) => grab(dm, n)).join('\n'), ctx);
  const p = ctx.parseVisitDate;

  // F1. Número de serie de Excel (celda con formato fecha): se lee su fecha; la hora se ignora.
  for (const [n, exp] of [[45000, '2023-3-15'], [45000.75, '2023-3-15'], [18264, '1950-1-1'], [73415, '2100-12-31']]) {
    ok(ymd(p(n)) === exp, 'F1 parseVisitDate(' + n + ') debe ser ' + exp + '; da ' + ymd(p(n)));
  }
  // F2. Número fuera de 1900-2100, no finito o no positivo → ilegible.
  for (const n of [0, -5, 73416, 80000, NaN, Infinity]) {
    ok(isBad(p(n)), 'F2 parseVisitDate(' + n + ') debe ser ilegible; da ' + ymd(p(n)));
  }
  // F3. Solo cifras escritas como texto: no es una fecha (ni año 45000 ni «1 de enero»).
  for (const s of ['45000', '2024', ' 45000 ']) {
    ok(isBad(p(s)), 'F3 parseVisitDate(' + label(s) + ') debe ser ilegible; da ' + ymd(p(s)));
  }
  // F4. Fechas imposibles: ilegibles, nunca se desbordan al mes siguiente.
  for (const s of ['31/02/2025', '00/05/2024', '15/13/2024', '29/02/2023', '15/00/2024', '2025-02-31', '2024-13-01', '2024-00-10', '2025-02-29T10:00:00']) {
    ok(isBad(p(s)), 'F4 parseVisitDate(' + label(s) + ') debe ser ilegible; da ' + ymd(p(s)));
  }
  // F5. Lo que ya funcionaba no cambia.
  ok(ymd(p('15/03/2024')) === '2024-3-15', 'F5 15/03/2024 se conserva');
  ok(ymd(p('5/3/2024')) === '2024-3-5', 'F5 5/3/2024 se conserva');
  ok(ymd(p('29/02/2024')) === '2024-2-29', 'F5 29/02/2024 (bisiesto) se conserva');
  for (const s of ['2024-03-15', '2024-02-29', '2024-03-15T10:30:00']) {
    const d = p(s);
    ok(d && d.getTime() === new Date(s).getTime(), 'F5 ' + s + ' debe dar exactamente lo mismo que antes (new Date nativo)');
  }
  for (const v of ['', null, undefined, 'abc', 'fecha-rota', '32/13/x']) {
    ok(isBad(p(v)), 'F5 parseVisitDate(' + label(v) + ') sigue siendo ilegible');
  }
  const real = vm.runInContext('new Date(2024, 2, 15)', ctx);
  ok(p(real) === real, 'F5 un Date válido se devuelve tal cual');
  ok(isBad(p(vm.runInContext('new Date(NaN)', ctx))), 'F5 un Date inválido sigue siendo ilegible');

  // F6. Quien lee la fecha de la fila no la convierte antes a texto.
  ok(ymd(ctx.getVisitDateValue({ Fecha_Visita: 45000 })) === '2023-3-15', 'F6 getVisitDateValue con número de serie debe dar 2023-3-15; da ' + ymd(ctx.getVisitDateValue({ Fecha_Visita: 45000 })));
  ok(ctx.getVisitDateValue({ Fecha_Visita: '31/02/2025' }) === null, 'F6 getVisitDateValue con fecha imposible → null');
  ok(ymd(ctx.getVisitDateValue({ fechaVisita: '15/03/2024' })) === '2024-3-15', 'F6 getVisitDateValue con texto válido se conserva');
  ok(ymd(ctx.parseFilterDate(45000)) === '2023-3-15', 'F6 parseFilterDate con número de serie debe dar 2023-3-15');
  ok(ctx.parseFilterDate('') === null, 'F6 parseFilterDate vacío → null');
  const ageBody = grab(dm, 'getAgeValue');
  ok(!/parseVisitDate\(\s*birthDate\.toString\(\)\s*\)/.test(ageBody), 'F6 getAgeValue no debe convertir Fecha_Nacimiento a texto antes de parseVisitDate');

  // F7. Comparador común: ilegibles siempre al final, en los dos sentidos.
  const c = ctx.compareVisitDates;
  ok(typeof c === 'function', 'F7 debe existir compareVisitDates(dateA, dateB, order)');
  if (typeof c === 'function') {
    const mk = () => [new Date(2024, 0, 1), new Date(NaN), new Date(2025, 5, 1), new Date(NaN), new Date(2023, 6, 1)];
    const desc = mk().sort((a, b) => c(a, b, 'desc')).map(ymd).join(' | ');
    const asc = mk().sort((a, b) => c(a, b, 'asc')).map(ymd).join(' | ');
    ok(desc === '2025-6-1 | 2024-1-1 | 2023-7-1 | ilegible | ilegible', 'F7 desc: más reciente primero, ilegibles al final; da ' + desc);
    ok(asc === '2023-7-1 | 2024-1-1 | 2025-6-1 | ilegible | ilegible', 'F7 asc: más antigua primero, ilegibles al final; da ' + asc);
    ok(c(new Date(NaN), new Date(NaN), 'desc') === 0, 'F7 dos ilegibles empatan (0)');
    ok(c(new Date(2024, 0, 1), new Date(2024, 0, 1), 'asc') === 0, 'F7 misma fecha empata (0)');
  }
} catch (e) { fails.push('F no ejecutable: ' + e.message); }

// ── Revisión ciega (13-11): huecos que el primer contrato no cubría ──
try {
  const p = ctx.parseVisitDate;
  // R4. Excel cuenta un 29/02/1900 que no existió: los seriales < 61 no son fiables → ilegibles.
  for (const n of [1, 2, 59, 60]) ok(isBad(p(n)), 'R4 serial ' + n + ' (antes del 01/03/1900) debe ser ilegible; da ' + ymd(p(n)));
  ok(ymd(p(61)) === '1900-3-1', 'R4 serial 61 debe ser 1900-3-1; da ' + ymd(p(61)));
  // R5. Variantes ISO que escapaban a la regex estricta: también se valida que el día exista.
  for (const s of ['2025-2-31', '2025-02-31Z', '2025-02-31+01:00', '2025-2-29T08:00:00', '2024-4-31']) {
    ok(isBad(p(s)), 'R5 parseVisitDate(' + label(s) + ') debe ser ilegible; da ' + ymd(p(s)));
  }
  for (const s of ['2024-3-5', '2024-03-15Z', '2024-03-15T10:30:00+01:00']) {
    const d = p(s);
    ok(d && d.getTime() === new Date(s).getTime(), 'R5 ' + s + ' (día existente) debe dar lo mismo que new Date nativo');
  }
  // R6. Cualquier número escrito como texto (signo, decimales) → ilegible.
  for (const s of ['+2024', '-2024', '2024.5', '45000.0', ' 2024.0 ']) {
    ok(isBad(p(s)), 'R6 parseVisitDate(' + label(s) + ') debe ser ilegible; da ' + ymd(p(s)));
  }
} catch (e) { fails.push('R no ejecutable: ' + e.message); }

// R1. La última visita por paciente: una visita con fecha legible siempre gana a una ilegible.
try {
  const ctxL = { console: quiet };
  vm.createContext(ctxL);
  vm.runInContext(['parseVisitDate', 'compareVisitDates', 'selectLatestVisitPerPatient'].map((n) => grab(dm, n)).join('\n')
    + '\nfunction getPatientIdentityKey(r) { return r.ID_Paciente; }', ctxL);
  const pick = (rows) => ctxL.selectLatestVisitPerPatient(rows).map((r) => r.ID_Paciente + ':' + r.Fecha_Visita).join(' | ');
  ok(pick([{ ID_Paciente: 'SYN-L1', Fecha_Visita: '31/02/2025' }, { ID_Paciente: 'SYN-L1', Fecha_Visita: '15/03/2025' }]) === 'SYN-L1:15/03/2025',
    'R1 ilegible y luego legible → gana la legible; da ' + pick([{ ID_Paciente: 'SYN-L1', Fecha_Visita: '31/02/2025' }, { ID_Paciente: 'SYN-L1', Fecha_Visita: '15/03/2025' }]));
  ok(pick([{ ID_Paciente: 'SYN-L2', Fecha_Visita: '15/03/2025' }, { ID_Paciente: 'SYN-L2', Fecha_Visita: 'rota' }]) === 'SYN-L2:15/03/2025',
    'R1 legible y luego ilegible → sigue la legible');
  ok(pick([{ ID_Paciente: 'SYN-L3', Fecha_Visita: '01/01/2024' }, { ID_Paciente: 'SYN-L3', Fecha_Visita: '01/06/2024' }, { ID_Paciente: 'SYN-L3', Fecha_Visita: '01/03/2024' }]) === 'SYN-L3:01/06/2024',
    'R1 entre legibles gana la más reciente (como antes)');
  const many = pick([{ ID_Paciente: 'SYN-A', Fecha_Visita: 'rota' }, { ID_Paciente: 'SYN-B', Fecha_Visita: '01/01/2023' }, { ID_Paciente: 'SYN-C', Fecha_Visita: '01/01/2025' }]);
  ok(many === 'SYN-C:01/01/2025 | SYN-B:01/01/2023 | SYN-A:rota', 'R1 el listado final pone a los pacientes con fecha ilegible al final; da ' + many);
} catch (e) { fails.push('R1 no ejecutable: ' + e.message); }

// R3. Ordenar desde la cabecera del historial del panel: ilegibles al final en los dos sentidos.
try {
  const sd = rd('scripts/script_dashboard.js');
  const sortSrc = grab(sd, 'sortVisitsData');
  const ctxD = { console: quiet };
  vm.createContext(ctxD);
  vm.runInContext(grab(dm, 'parseVisitDate') + '\n' + grab(dm, 'compareVisitDates') + '\n' + sortSrc
    + '\nfunction parseStrictNumber(v) { var n = Number(v); return v === "" || v == null || isNaN(n) ? null : n; }'
    + '\nvar visitsTableState = { data: [] };', ctxD);
  const run = (dir) => {
    vm.runInContext('visitsTableState.data = [{fecha:"01/01/2024"},{fecha:"rota"},{fecha:"2025-06-01"},{fecha:""},{fecha:"15/07/2023"}];', ctxD);
    ctxD.sortVisitsData('fecha', dir);
    return vm.runInContext('visitsTableState.data.map(function (r) { return r.fecha; }).join(" | ")', ctxD);
  };
  const d = run('desc'); const a = run('asc');
  // Las dos ilegibles («rota» y vacía) empatan y conservan su orden de origen.
  ok(d === '2025-06-01 | 01/01/2024 | 15/07/2023 | rota | ', 'R3 panel desc: reciente primero, ilegibles al final; da ' + d);
  ok(a === '15/07/2023 | 01/01/2024 | 2025-06-01 | rota | ', 'R3 panel asc: antigua primero, ilegibles al final; da ' + a);
  vm.runInContext('visitsTableState.data = [{basdai:"5"},{basdai:"2"},{basdai:"7"}];', ctxD);
  ctxD.sortVisitsData('basdai', 'asc');
  ok(vm.runInContext('visitsTableState.data.map(function (r) { return r.basdai; }).join(",")', ctxD) === '2,5,7', 'R3 las columnas numéricas siguen ordenándose igual');
} catch (e) { fails.push('R3 no ejecutable: ' + e.message); }
const dashHtml = rd('dashboard_paciente.html').match(/scripts\/script_dashboard\.js\?v=(\d{8}[a-z]?)/);
ok(dashHtml && dashHtml[1] >= '20261113a', 'Caché: dashboard_paciente.html debe pedir script_dashboard.js?v=20261113a o posterior');

// F7. Los tres sitios que ordenan visitas o eventos por fecha usan el comparador común.
const histBody = (dm.match(/function getPatientHistory\([^)]*\) \{[\s\S]*?\n\}\n/) || [''])[0];
ok(/visits\.sort\(\(a, b\) => [\s\S]{0,300}compareVisitDates\([^)]*'desc'\)/.test(histBody), "F7 getPatientHistory debe ordenar las visitas con compareVisitDates(..., 'desc')");
const keyEvBody = (dm.match(/\/\/ Ordenar eventos por fecha \(ascendente\)\n\s*events\.sort\(\(a, b\) => \{[\s\S]*?\}\);/) || [''])[0];
ok(/compareVisitDates\(parseVisitDate\(a\.date\), parseVisitDate\(b\.date\), 'asc'\)/.test(keyEvBody), "F7 la ordenación de eventos (ascendente) debe usar compareVisitDates(parseVisitDate(a.date), parseVisitDate(b.date), 'asc')");
const est = rd('scripts/script_estadisticas.js');
const estSort = (est.match(/filteredCohort\.sort\(\(a, b\) => \{[\s\S]*?\n {4}\}\);/) || [''])[0];
ok(/column === 'Fecha_Visita'[\s\S]{0,400}compareVisitDates\(/.test(estSort), 'F7 Estadísticas debe ordenar la columna Fecha_Visita con compareVisitDates');
ok(!/new Date\(valA\)\.getTime\(\)/.test(estSort), 'F7 Estadísticas ya no debe usar new Date(valA).getTime() para Fecha_Visita');

// Caché: las páginas que cargan los ficheros tocados piden una versión nueva.
for (const html of ['primera_visita.html', 'seguimiento.html', 'dashboard_paciente.html', 'estadisticas.html', 'dashboard_search.html', 'reuma_index.html', 'manage_professionals.html']) {
  const h = rd(html);
  const m = h.match(/modules\/dataManager\.js\?v=(\d{8}[a-z]?)/);
  ok(!!m, 'Caché: ' + html + ' debe cargar modules/dataManager.js con ?v=');
  if (m) ok(m[1] >= '20261113a', 'Caché: ' + html + ' debe pedir dataManager.js?v=20261113a o posterior; pide ' + m[1]);
}
const em = rd('estadisticas.html').match(/scripts\/script_estadisticas\.js\?v=(\d{8}[a-z]?)/);
ok(em && em[1] >= '20261113a', 'Caché: estadisticas.html debe pedir script_estadisticas.js?v=20261113a o posterior');

if (fails.length) { console.error('FAIL reuma_fechas_visita_check (' + fails.length + ')\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('OK reuma_fechas_visita_check');
