// Reuma (#940, hallazgos del revisor ciego): casos límite del paciente actual que el check de
// navegador no puede provocar (fallo de sessionStorage, ?id= vacío, página restaurada desde
// bfcache, prebiológico de otro paciente). Carga los módulos reales en un sandbox vm.
// Solo datos sintéticos.
import fs from 'node:fs';
import vm from 'node:vm';
const rd = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const A = 'SYN-AR-001';
const B = 'SYN-ESPA-001';

function makeStorage() {
  const data = new Map();
  const s = {
    failSet: false,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { if (s.failSet) throw new Error('QuotaExceeded'); data.set(String(k), String(v)); },
    removeItem: (k) => { data.delete(k); },
    key: (i) => Array.from(data.keys())[i] ?? null,
    get length() { return data.size; },
    _data: data,
  };
  return new Proxy(s, { ownKeys: () => Array.from(data.keys()), getOwnPropertyDescriptor: (t, k) => (data.has(k) ? { enumerable: true, configurable: true, value: data.get(k) } : Reflect.getOwnPropertyDescriptor(t, k)) });
}

function env({ search = '', navType = 'navigate', stored = null } = {}) {
  const storage = makeStorage();
  if (stored) storage.setItem('HubClinico_PacienteActual', JSON.stringify(stored));
  const listeners = {};
  const calls = { replaceState: [], replace: [] };
  const location = {
    pathname: '/dashboard_paciente.html', search, hash: '', href: 'http://x/dashboard_paciente.html' + search,
    replace: (u) => calls.replace.push(u),
  };
  const sb = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    sessionStorage: storage, location, URLSearchParams,
    history: { replaceState: (_s, _t, u) => { calls.replaceState.push(u); location.search = u.includes('?') ? u.slice(u.indexOf('?')) : ''; } },
    performance: { getEntriesByType: () => [{ type: navType }] },
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(rd('modules/reumaCurrentPatient.js'), sb, { filename: 'reumaCurrentPatient.js' });
  return { sb, storage, calls, listeners, cp: sb.HubTools.currentPatient };
}

// U1. Si no se puede guardar el paciente nuevo, nunca se abre el anterior.
{
  const e = env({ stored: { id: A, patologia: 'ar' } });
  e.storage.failSet = true;
  e.cp.goTo('dashboard_paciente.html', B, 'espa');
  ok(e.cp.get() === null, 'U1 fallo al guardar B: no debe quedar A como paciente actual (queda ' + JSON.stringify(e.cp.get()) + ')');
  ok(e.sb.location.href === 'dashboard_paciente.html', 'U1 navega a la página sin parámetros');
}

// U2. ?id= vacío o con espacios: se olvida el paciente y se limpia la dirección.
for (const search of ['?id=', '?id=%20%20', '?id=%20%20&patologia=ar']) {
  const e = env({ search, stored: { id: A, patologia: 'ar' } });
  const got = e.cp.resolveOnLoad();
  ok(got === null, 'U2 ' + search + ': debe resolver «sin paciente», no ' + JSON.stringify(got));
  ok(e.cp.get() === null, 'U2 ' + search + ': no debe quedar A guardado');
  ok(e.calls.replaceState.length === 1 && !/[?&](id|patologia)=/.test(e.calls.replaceState[0]), 'U2 ' + search + ': la dirección se limpia (' + JSON.stringify(e.calls.replaceState) + ')');
}

// U2b. ?id= con espacios alrededor de un CIP válido: se acepta recortado.
{
  const e = env({ search: '?id=%20' + B + '%20&patologia=espa' });
  const got = e.cp.resolveOnLoad();
  ok(got && got.id === B && got.patologia === 'espa', 'U2b ?id= con espacios y CIP: se acepta recortado (' + JSON.stringify(got) + ')');
}

// U3. Página restaurada desde bfcache («Atrás») tras cambiar de paciente: se vuelve a abrir con el actual.
{
  const e = env({ stored: { id: A, patologia: 'ar' } });
  ok(e.cp.resolveOnLoad().id === A, 'U3 la página se abrió con A');
  e.storage.setItem('HubClinico_PacienteActual', JSON.stringify({ id: B, patologia: 'espa' }));
  for (const fn of e.listeners.pageshow || []) fn({ persisted: true });
  ok(e.calls.replace.length === 1 && e.calls.replace[0] === '/dashboard_paciente.html', 'U3 restaurada con otro paciente actual: debe reabrir la página (' + JSON.stringify(e.calls.replace) + ')');
}
{
  const e = env({ stored: { id: A, patologia: 'ar' } });
  e.cp.resolveOnLoad();
  for (const fn of e.listeners.pageshow || []) fn({ persisted: true });
  for (const fn of e.listeners.pageshow || []) fn({ persisted: false });
  ok(e.calls.replace.length === 0, 'U3 restaurada con el mismo paciente, o carga normal: no se reabre');
}
{
  const e = env({ stored: null });
  e.cp.resolveOnLoad();
  e.storage.setItem('HubClinico_PacienteActual', JSON.stringify({ id: B, patologia: 'espa' }));
  for (const fn of e.listeners.pageshow || []) fn({ persisted: true });
  ok(e.calls.replace.length === 1, 'U3 página vacía restaurada cuando ya hay paciente actual: se reabre');
}

// U4. El prebiológico solo se guarda para el paciente actual.
{
  const e = env({ stored: { id: B, patologia: 'espa' } });
  vm.runInContext(rd('modules/prebiologicManager.js'), e.sb, { filename: 'prebiologicManager.js' });
  const pb = e.sb.HubTools.prebiologic;
  ok(pb.setStatus(A, 'APTO', '') === false, 'U4 setStatus de un CIP que no es el paciente actual debe rechazarse');
  ok(pb.getAllStatuses().length === 0, 'U4 no debe quedar guardado el prebiológico de A');
  ok(pb.setStatus(B, 'APTO', '') === true && pb.getStatus(B).estado === 'APTO', 'U4 setStatus del paciente actual sí guarda');
}

// U5. La vista rápida fija al paciente que muestra (así un enlace abierto en otra pestaña no hereda otro).
{
  const src = rd('script.js');
  const m = src.match(/function showPatientResults\([^)]*\) \{[\s\S]*?\n\}\n/);
  ok(!!m && /HubTools\.currentPatient\.set\(\s*id\s*,/.test(m[0]), 'U5 showPatientResults debe fijar HubTools.currentPatient.set(id, …) al mostrar al paciente');
}

if (fails.length) {
  console.error('FAIL reuma_current_patient_check (' + fails.length + ')');
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log('OK reuma_current_patient_check');
