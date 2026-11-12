// Tramo 2 (seguridad Reuma): HTML escapado en vista rápida y dashboard; sin console.log con datos clínicos.
// Datos solo sintéticos.
import fs from 'node:fs';
import vm from 'node:vm';
const rd = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const PAYLOAD = '<img src=x onerror=alert(1)>';

// 1) script.js: funciones de vista rápida con payload sintético.
const src = rd('script.js');
function grab(name) {
  const m = src.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n'));
  ok(!!m, 'no se encuentra ' + name);
  return m ? m[0] : '';
}
const code = ['escapeQuickViewHtml', 'renderQuickViewMetric', 'renderQuickViewEmptyState', 'renderQuickViewNewPatient', 'renderQuickViewLayout']
  .map((n) => grab(n)).join('\n');
const ctx = { formatDisplayValue: (v) => (v == null ? '---' : String(v)) };
vm.createContext(ctx);
try {
  vm.runInContext(code, ctx);
  const outs = [
    ctx.renderQuickViewMetric(PAYLOAD, PAYLOAD),
    ctx.renderQuickViewEmptyState(PAYLOAD),
    ctx.renderQuickViewNewPatient(PAYLOAD),
    ctx.renderQuickViewLayout({ patientName: PAYLOAD, id: PAYLOAD, pathologyLabel: PAYLOAD, lastVisit: PAYLOAD, treatment: PAYLOAD, treatmentStart: PAYLOAD, pathologyCode: 'ar', scoresHTML: '' }),
  ];
  outs.forEach((o, i) => ok(!o.includes('<img'), 'quick view #' + i + ' deja HTML sin escapar'));
} catch (e) { fails.push('vista rápida no ejecutable: ' + e.message); }

// 2) script_dashboard.js: sin interpolación cruda en los sitios conocidos.
const dash = rd('scripts/script_dashboard.js');
ok(!/`<li>\$\{s\.trim\(\)\}<\/li>`/.test(dash), 'dashboard: comorbilidades sin escapar');
ok(!/`<li>\$\{item\}<\/li>`/.test(dash), 'dashboard: manifestaciones sin escapar');
ok(!/<td>\$\{visit\.tratamiento\}<\/td>/.test(dash), 'dashboard: tratamiento sin escapar');
ok(!/timeline-description">' \+ event\.description \+/.test(dash), 'dashboard: descripción de evento sin escapar');

// 3) console.log con datos clínicos.
const bad = [
  ['modules/dataManager.js', /console\.log\([^;]*appState\.db\)/],
  ['modules/dataManager.js', /console\.log\(`(findPatientById|getPatientHistory): Paciente \$\{patientId\}/],
  ['modules/dataManager.js', /console\.log\('[^']*(Columnas del primer paciente|de m\S*tricas del primer paciente)/],
  ['modules/prebiologicManager.js', /console\.log\([^;]*cip/],
  ['scripts/script_dashboard.js', /console\.log\([^;]*patientId\)/],
  ['scripts/script_seguimiento.js', /console\.log\([^;]*\$\{patientId\}/],
];
for (const [f, re] of bad) ok(!re.test(rd(f)), f + ': console.log con datos clínicos (' + re + ')');

if (fails.length) { console.error('FALLA:\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('reuma_html_escape_logs_check OK');
