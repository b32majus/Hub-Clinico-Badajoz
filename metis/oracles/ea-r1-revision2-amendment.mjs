// Oráculo Metis FH-EA-03 · C11 (unidad c11-r1-amendment-guard).
//
// `HubTools.farmaciaEaInvariants.composeFollowup(envelope, payload, context)`
// debe rechazar una observación EA incorporada corregida con `revision > 1`
// y `amendment` ausente, devolviendo `{ok:false,error:{code,message}}` sin
// construir acto parcial. No debe confundir la revisión del acto F4.4
// (`envelope.revision`) con la corrección de una observación EA. La salida de
// éxito de una revisión 1 sin corrección se mantiene y una corrección válida
// `revision:2` con `{previousRevision, reason}` y vínculo verificable en
// `context.revisions` sigue admitida.
//
// Ejecución pura en VM: sin DOM, página, paciente activo, reloj, catálogo,
// red ni almacenamiento. En BASE 6c9b541 las peticiones negativas devuelven
// ok:true (defecto reproducido): este oráculo es RED allí.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const ctx = vm.createContext({ window: { HubTools: {} }, console: { log() {}, error() {} } });
for (const name of ['contract', 'payloads']) {
    vm.runInContext(fs.readFileSync(`modules/farmacia_act_${name}.js`, 'utf8'), ctx);
}
let builderCalls = 0;
const builder = ctx.window.HubTools.farmaciaActPayloads.createFollowupAct;
ctx.window.HubTools.farmaciaActPayloads = {
    createFollowupAct(...args) {
        builderCalls += 1;
        return builder(...args);
    }
};
vm.runInContext(fs.readFileSync('modules/farmacia_ea_invariants.js', 'utf8'), ctx);
const compose = ctx.window.HubTools.farmaciaEaInvariants.composeFollowup;
assert.equal(typeof compose, 'function', 'composeFollowup debe existir');

// Convierte sólo prototipos de reino, preservando undefined y claves propias.
function local(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return Array.from(value, local);
    return Object.fromEntries(Object.keys(value).map(key => [key, local(value[key])]));
}

const envelope = (revision = 1) => ({
    actId: 'A',
    patientRef: 'P',
    revision,
    siteId: 'S',
    occurredAt: '2026-10-23T10:00:00Z',
    authoredAt: '2026-10-23T11:00:00Z',
    authorRef: 'U',
    attributionAssurance: 'explicit',
    provenance: { source: 'synthetic' }
});
const observation = extra => ({
    episode_id: 'E0',
    observation_id: 'O0',
    status: 'incorporated',
    description: 'texto original explícito',
    ...extra
});
const fixture = (event, envelopeRevision = 1) => [
    envelope(envelopeRevision),
    { followup: { adverse_events: [event] }, lines: [{ id: 'L1' }] },
    { present: 'si', history: [], selections: [], revisions: [] }
];

function run(args, expectedOk, label) {
    const before = structuredClone(args);
    const start = builderCalls;
    const output = local(compose(...args));
    assert.deepEqual(args, before, `${label}: la entrada permanece intacta`);
    assert.equal(output.ok, expectedOk, `${label}: ${JSON.stringify(output)}`);
    if (expectedOk) {
        assert.equal(builderCalls, start + 1, `${label}: exactamente una llamada al constructor F4.4`);
        assert.equal(output.act.kind, 'pharmacy_followup', `${label}: acto F4.4 construido`);
    } else {
        assert.deepEqual(Object.keys(output).sort(), ['error', 'ok'], `${label}: fallo atómico sin acto ni representación parcial`);
        assert.equal(typeof output.error.code, 'string', `${label}: error.code explícito`);
        assert.equal(typeof output.error.message, 'string', `${label}: error.message explícito`);
        assert.equal(builderCalls, start, `${label}: rechazo sin crear acto parcial`);
    }
    return output;
}

// 1. Defecto C11: observación EA incorporada corregida con revision: 2 y
//    amendment ausente → rechazo (también con envelope.revision: 2).
run(fixture(observation({ revision: 2 })), false, 'ficha revision:2 sin amendment, envelope revision 1');
run(fixture(observation({ revision: 2 }), 2), false, 'ficha revision:2 sin amendment, envelope revision 2');
run(fixture(observation({ revision: 3 })), false, 'ficha revision:3 sin amendment (revisión mayor que 1)');

// 2. Revisión 1 sin corrección se mantiene.
run(fixture(observation({})), true, 'ficha sin revision declarada');
run(fixture(observation({ revision: 1 })), true, 'ficha revision:1 sin corrección');

// 3. Revisión del acto F4.4 > 1 sin corrección de observación EA NO se
//    rechaza por la nueva regla.
run(fixture(observation({}), 2), true, 'envelope revision:2 sin corrección EA');
run(fixture(observation({ revision: 1 }), 2), true, 'envelope revision:2 con ficha revision:1');
run(fixture(observation({}), 3), true, 'envelope revision:3 sin corrección EA');

// 4. Corrección válida revision:2 con amendment explícito y vínculo
//    verificable en context.revisions sigue admitida.
const previous = observation({ patientRef: 'P', actId: 'A', revision: 1 });
const next = {
    ...previous,
    revision: 2,
    description: 'descripción corregida expresamente',
    amendment: { previousRevision: 1, reason: 'error de transcripción de la descripción' }
};
const valid = fixture(next);
valid[2].revisions = [{ operation: 'correction', previous, next }];
const corrected = run(valid, true, 'corrección válida revision:2 con amendment y vínculo');
assert.equal(corrected.revisions.length, 1, 'la revisión válida se conserva en la salida');
assert.equal(corrected.revisions[0].operation, 'correction');
assert.deepEqual(corrected.revisions[0].previous, previous);
assert.deepEqual(corrected.revisions[0].next, next);
assert.deepEqual(local(compose(...valid)), corrected, 'determinismo en repetición');

// 5. Regresión del vínculo: correction revision:2 con amendment pero sin la
//    revisión explícita en context.revisions sigue rechazada.
const unlinked = structuredClone(valid);
unlinked[2].revisions = [];
run(unlinked, false, 'corrección revision:2 sin vínculo en context.revisions');

// 6. Consumidores: la suite focal R1 existente (y su cadena de regresión
//    states/identity/clinical/revisions/F4.4/T01) sigue pasando.
for (const path of ['tools/farmacia_ea_r1_followup_check.mjs']) {
    assert.ok(fs.existsSync(path), `falta el testigo de regresión ${path}`);
    const result = spawnSync(process.execPath, [path], { encoding: 'utf8', timeout: 180000 });
    assert.equal(result.status, 0, `${path}\n${result.stdout}${result.stderr}`);
}

console.log('PASS C11: corrección revision>1 sin amendment rechazada / revisión 1 y corrección válida admitidas / revisión de acto F4.4 no confundida / sin acto parcial / regresión followup');
console.log('LÍMITES: sin UI, controlador, persistencia, red ni verify:nexus dentro de este oráculo.');