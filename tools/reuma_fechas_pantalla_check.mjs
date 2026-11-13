// Reuma (13-11, tras #929): las pantallas muestran la fecha de visita con el mismo lector
// (parseVisitDate) en vez de new Date nativo. Datos solo sintéticos.
// P1 panel del paciente (formatDate de script_dashboard.js); P2 tabla de Estadísticas
// (formatDate de script_estadisticas.js); P3 gráfico de evolución (prepareChartData):
// orden por fecha real, ilegibles al final, etiqueta AAAA-MM-DD sin desfase de día.
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
const label = (v) => typeof v === 'string' ? JSON.stringify(v) : String(v);
const dm = rd('modules/dataManager.js');
const lector = ['parseVisitDate', 'compareVisitDates'].map((n) => grab(dm, n)).join('\n');
const dash = rd('scripts/script_dashboard.js');
const stats = rd('scripts/script_estadisticas.js');

try {
  // P1. Panel del paciente.
  const c1 = { console: quiet };
  vm.createContext(c1);
  vm.runInContext(lector + '\n' + grab(dash, 'formatDate'), c1);
  for (const [v, exp] of [
    [45000, '15/03/2023'],            // serie de Excel (antes 01/01/1970)
    ['05/03/2024', '05/03/2024'],     // día/mes español (antes se mostraba 03/05/2024)
    ['15/03/2024', '15/03/2024'],
    ['2024-03-15', '15/03/2024'],     // lo que escribe el formulario: igual que antes
    ['31/02/2025', '31/02/2025'],     // imposible: el texto tal cual, nunca 03/03/2025
    ['fecha-rota', 'fecha-rota'],
    ['', ''], [null, ''], [undefined, '']
  ]) {
    const got = c1.formatDate(v);
    ok(got === exp, 'P1 panel formatDate(' + label(v) + ') debe ser ' + label(exp) + '; da ' + label(got));
  }

  // P2. Tabla de Estadísticas.
  const c2 = { console: quiet };
  vm.createContext(c2);
  vm.runInContext(lector + '\n' + grab(stats, 'formatDate'), c2);
  for (const [v, exp] of [
    [45000, '15/03/2023'],
    ['05/03/2024', '05/03/2024'],
    ['2024-03-15', '15/03/2024'],
    ['31/02/2025', '31/02/2025'],
    ['fecha-rota', 'fecha-rota'],     // antes «Invalid Date»
    ['', '-'], [null, '-'], [undefined, '-']
  ]) {
    const got = c2.formatDate(v);
    ok(got === exp, 'P2 Estadísticas formatDate(' + label(v) + ') debe ser ' + label(exp) + '; da ' + label(got));
  }

  // P3. Gráfico de evolución del panel.
  const c3 = { console: quiet, COLORS: { primary: '#000', highActivity: '#f00' } };
  c3.window = c3;
  vm.createContext(c3);
  vm.runInContext(lector + '\n' + ['getVisitDate', 'getMetricLabel', 'prepareChartData'].map((n) => grab(dash, n)).join('\n') +
    '\nfunction getVisitMetric(v, m) { return v[m]; }', c3);
  c3.patientHistory = { allVisits: [
    { fechaVisita: '05/03/2024', basdai: 3 },
    { fechaVisita: 'rota', basdai: 9 },
    { fechaVisita: 45000, basdai: 1 },
    { fechaVisita: '2024-01-10', basdai: 2 },
    { fechaVisita: '20/12/2023', basdai: 4 }
  ] };
  const res = c3.prepareChartData('basdai');
  const got = Array.from(res.labels).join(' | ');
  const exp = '2023-03-15 | 2023-12-20 | 2024-01-10 | 2024-03-05 | rota';
  ok(got === exp, 'P3 etiquetas del gráfico deben ser «' + exp + '»; dan «' + got + '»');
  const vals = Array.from(res.datasets[0].data).join(',');
  ok(vals === '1,4,2,3,9', 'P3 los valores deben seguir a su fecha (1,4,2,3,9); dan ' + vals);
} catch (e) {
  fails.push('excepción: ' + (e && e.stack || e));
}

// Caché de los scripts tocados.
ok(/scripts\/script_dashboard\.js\?v=20261113b/.test(rd('dashboard_paciente.html')), 'caché: dashboard_paciente.html debe cargar script_dashboard.js?v=20261113b');
ok(/scripts\/script_estadisticas\.js\?v=20261113b/.test(rd('estadisticas.html')), 'caché: estadisticas.html debe cargar script_estadisticas.js?v=20261113b');

if (fails.length) {
  console.error('FAIL reuma_fechas_pantalla_check (' + fails.length + ')');
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log('OK reuma_fechas_pantalla_check');
