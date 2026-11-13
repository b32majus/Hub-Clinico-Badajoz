// Reuma (#938): al exportar una visita de AR sin índices calculados, el aviso nombra el índice
// como lo ve el médico (DAS28-PCR, CDAI…), no el id interno (das28CrpResult…). Solo cambia el
// texto: se exigen los mismos campos. Datos solo sintéticos.
import fs from 'node:fs';
import vm from 'node:vm';
const rd = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

const src = rd('modules/formController.js');
const m = src.match(/function validarCamposAR\([^)]*\) \{[\s\S]*?\n\}\n/);
ok(!!m, 'no se encuentra validarCamposAR');

const IDS = ['das28CrpResult', 'das28EsrResult', 'cdaiResult', 'sdaiResult', 'das28NAD', 'das28NAT'];
function run(values) {
  const sb = {
    document: {
      getElementById: (id) => (id in values ? { value: values[id] } : null),
      querySelector: () => ({ dataset: { value: 'positivo' } }),
    },
  };
  vm.createContext(sb);
  vm.runInContext(m[0] + '\nthis.__r = validarCamposAR(false);', sb);
  return sb.__r;
}

if (m) {
  const base = { evaMedico: '2', rigidezMatutinaAR: '30' };
  // A1. Todo vacío: seis avisos legibles, ninguno con id interno.
  const empty = Object.fromEntries(IDS.map((id) => [id, '']));
  const got = run({ ...base, ...empty });
  const expected = ['DAS28-PCR (revisa PCR y su unidad) (AR)', 'DAS28-VSG (revisa VSG) (AR)', 'CDAI (AR)',
    'SDAI (revisa PCR y su unidad) (AR)', 'NAD (homúnculo) (AR)', 'NAT (homúnculo) (AR)'];
  ok(JSON.stringify(got) === JSON.stringify(expected), 'A1 todo vacío: esperado ' + JSON.stringify(expected) + ', obtenido ' + JSON.stringify(got));
  ok(!got.some((e) => IDS.some((id) => e.includes(id))), 'A1 ningún aviso debe llevar el id interno');

  // A2. Solo falta DAS28-PCR (p. ej. PCR sin unidad): un único aviso, el de la PCR.
  const full = Object.fromEntries(IDS.map((id) => [id, '1']));
  const onlyCrp = run({ ...base, ...full, das28CrpResult: '' });
  ok(JSON.stringify(onlyCrp) === JSON.stringify(['DAS28-PCR (revisa PCR y su unidad) (AR)']), 'A2 solo falta DAS28-PCR: obtenido ' + JSON.stringify(onlyCrp));

  // A3. Todo relleno: sin avisos (mismo criterio que antes; 0 cuenta como valor).
  ok(run({ ...base, ...full, das28NAD: '0', das28NAT: '0' }).length === 0, 'A3 todo relleno (NAD/NAT = 0) no debe dar avisos');

  // A4. Campo inexistente en la página: sigue exigiéndose (mismo criterio que antes).
  const { cdaiResult, ...sinCdai } = full;
  ok(JSON.stringify(run({ ...base, ...sinCdai })) === JSON.stringify(['CDAI (AR)']), 'A4 sin el campo CDAI en la página debe avisar de CDAI');
}

// Caché.
for (const f of ['primera_visita.html', 'seguimiento.html', 'dashboard_paciente.html', 'estadisticas.html']) {
  ok(/modules\/formController\.js\?v=20261114a/.test(rd(f)), 'caché: ' + f + ' debe cargar formController.js?v=20261114a');
}

if (fails.length) {
  console.error('FAIL reuma_ar_avisos_check (' + fails.length + ')');
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log('OK reuma_ar_avisos_check');
