#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const scriptPath = path.join(ROOT, 'scripts', 'farmacia_dashboard_paciente.js');

function createElement() {
    return {
        children: [],
        className: '',
        textContent: '',
        append(...nodes) { this.children.push(...nodes); },
        appendChild(node) { this.children.push(node); },
        setAttribute() {}
    };
}

const container = createElement();
const document = {
    addEventListener() {},
    createElement,
    createTextNode(text) { return { textContent: text }; },
    getElementById(id) { return id === 'clinicalActivityContainer' ? container : null; }
};
const window = { FarmaciaDemo: { clearChildren(element) { element.children = []; } } };
const source = fs.readFileSync(scriptPath, 'utf8')
    .replace('\n})();', '\n    window.__renderClinicalActivity = renderClinicalActivity;\n})();');

vm.runInNewContext(source, { window, document, console, Date, Number, isNaN, parseFloat });

const patient = {
    actividad_clinica: [
        { tipo_indice: 'IHS4', fecha: '2026-01-01', valor: 'primer valor' },
        { tipo_indice: 'IHS4', fecha: undefined, valor: 'sin fecha' },
        { tipo_indice: 'IHS4', fecha: null, valor: 'fecha nula' },
        { tipo_indice: 'IHS4', fecha: 42, valor: 'fecha no string' },
        { tipo_indice: 'DAS28', fecha: '2026-02-01', valor: 'ultimo valor' },
        { tipo_indice: 'DAS28', fecha: '2026-01-01', valor: 'primer valor' }
    ]
};

try {
    window.__renderClinicalActivity(patient);
} catch (error) {
    console.error(`Fallo al ordenar actividad clínica: ${error.message}`);
    process.exit(1);
}

const latestValue = container.children[0]?.children[0]?.children[1]?.textContent;
if (latestValue !== 'ultimo valor') {
    console.error(`El orden de fechas válidas cambió: se esperaba "ultimo valor" y se obtuvo "${latestValue}".`);
    process.exit(1);
}

console.log('OK: actividad clínica tolera fechas ausentes/no-string y conserva el orden de fechas válidas.');
