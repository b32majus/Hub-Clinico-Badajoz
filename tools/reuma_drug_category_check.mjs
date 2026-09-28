#!/usr/bin/env node
'use strict';
/**
 * Deterministic oracle for the explicit Reuma medication category contract
 * (WO #447, corrective of T2 #444 in TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06).
 *
 * Loads the real `modules/drugCatalog.js` in a vm sandbox together with the
 * real published catalogue and the real explicit versioned category source,
 * and asserts:
 *   1. the ten supported medication fields declare their category explicitly
 *      in primera_visita.html / seguimiento.html (Sistemicos / FAMEs /
 *      Biologicos);
 *   2. the versioned category source is valid, versioned and declares exactly
 *      the three expected categories;
 *   3. every category is served (non-empty membership) and scoped search
 *      results match an INDEPENDENT recomputation of the declared membership;
 *   4. category isolation: a scoped search never returns options belonging to
 *      another category, and negative probes return nothing;
 *   5. the systemic/FAME coverage seam works: declared members missing from
 *      the hospital catalogue are available as identity-only explicit entries
 *      (no invented therapeutic data, identity-only keys);
 *   6. fail-closed behaviour: unknown category, missing classification source
 *      and malformed category sources return nothing / are rejected — never a
 *      silent fallback to the unrestricted catalogue;
 *   7. the #444 identity-only result contract is preserved for scoped search.
 *
 * Synthetic-only probes; real published files as sources. Exit 0 = PASS.
 * Usage: node tools/reuma_drug_category_check.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const MODULE_FILE = path.join(ROOT, 'modules', 'drugCatalog.js');
const CATALOG_FILE = path.join(ROOT, 'data', 'catalogos', 'farmacia', 'hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx');
const CATEGORIES_FILE = path.join(ROOT, 'data', 'catalogos', 'reuma', 'reuma_medication_categories.v1.json');
const PV_FILE = path.join(ROOT, 'primera_visita.html');
const SEG_FILE = path.join(ROOT, 'seguimiento.html');

const EXPECTED_FIELD_CATEGORIES = {
    primera_visita: [
        ['previoSistemicoSelect', 'Sistemicos'],
        ['previoFameSelect', 'FAMEs'],
        ['previoBiologicoSelect', 'Biologicos'],
        ['psoriasisSistemicoSelect', 'Sistemicos'],
        ['sistemicoSelect', 'Sistemicos'],
        ['fameSelect', 'FAMEs'],
        ['biologicoSelect', 'Biologicos'],
    ],
    seguimiento: [
        ['cambioSistemicoSelect', 'Sistemicos'],
        ['cambioFameSelect', 'FAMEs'],
        ['cambioBiologicoSelect', 'Biologicos'],
    ],
};

const results = [];
function record(name, fn) {
    try {
        fn();
        results.push(true);
        console.log(`  [OK  ] ${name}`);
    } catch (err) {
        results.push(false);
        console.log(`  [FAIL] ${name} -> ${err.message}`);
    }
}

function newSandbox() {
    const sandbox = { HubTools: { catalog: {} }, console, XLSX };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(MODULE_FILE, 'utf8'), sandbox, { filename: 'modules/drugCatalog.js' });
    return sandbox.HubTools.catalog;
}

function normalize(value) {
    return String(value === undefined || null ? '' : value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// INDEPENDENT membership recomputation (does not reuse the module internals).
function computeExpectedMembership(categoriesData, workbook) {
    const entries = [];
    for (const sheetName of ['CATALOGO_CIMA', 'CATALOGO_LOCAL_ESPECIAL']) {
        const sheet = workbook.Sheets[sheetName];
        assert.ok(sheet, `missing sheet ${sheetName}`);
        XLSX.utils.sheet_to_json(sheet, { defval: '' }).forEach((row) => {
            const name = row.nombre_comercial || row.nombre_presentacion || row.display_name || '';
            if (name) entries.push({ name: String(name).trim(), search: normalize(name) });
        });
    }
    const expected = { Sistemicos: new Set(), FAMEs: new Set(), Biologicos: new Set() };
    for (const [category, definition] of Object.entries(categoriesData.categories)) {
        const tokens = definition.catalogue_tokens.map(normalize).filter(Boolean);
        for (const entry of entries) {
            if (tokens.some((token) => entry.search.indexOf(token) === 0)) {
                expected[category].add(entry.name);
            }
        }
        for (const name of definition.explicit_entries) {
            if (String(name).trim()) expected[category].add(String(name).trim());
        }
    }
    return expected;
}

const categoriesData = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
const workbook = XLSX.read(fs.readFileSync(CATALOG_FILE), { type: 'buffer' });
const expectedMembership = computeExpectedMembership(categoriesData, workbook);

console.log('1. Every supported medication field declares its category explicitly');
for (const [pageName, fields] of Object.entries(EXPECTED_FIELD_CATEGORIES)) {
    const html = fs.readFileSync(pageName === 'primera_visita' ? PV_FILE : SEG_FILE, 'utf8');
    fields.forEach(([fieldId, category]) => {
        record(`${pageName}: #${fieldId} declara data-drug-category="${category}"`, () => {
            const selectMatch = html.match(new RegExp(`<select[^>]*id="${fieldId}"[^>]*>`));
            assert.ok(selectMatch, `select #${fieldId} no encontrado`);
            assert.ok(
                selectMatch[0].includes(`data-drug-category="${category}"`),
                `atributo esperado data-drug-category="${category}" ausente: ${selectMatch[0]}`
            );
        });
    });
}

console.log('2. The versioned category source is explicit and valid');
record('el fichero declara versión explícita', () => {
    assert.equal(typeof categoriesData.version, 'string');
    assert.ok(categoriesData.version.trim().length > 0);
});
record('declara exactamente Sistemicos / FAMEs / Biologicos', () => {
    assert.deepEqual(Object.keys(categoriesData.categories).sort(), ['Biologicos', 'FAMEs', 'Sistemicos']);
});
record('cada categoría declara claves de unión y entradas explícitas como arrays de texto', () => {
    for (const definition of Object.values(categoriesData.categories)) {
        assert.ok(Array.isArray(definition.catalogue_tokens));
        assert.ok(Array.isArray(definition.explicit_entries));
        [...definition.catalogue_tokens, ...definition.explicit_entries].forEach((value) => assert.equal(typeof value, 'string'));
    }
});
record('el módulo valida la fuente real sin rechazarla', () => {
    const isolated = newSandbox();
    const loaded = isolated.loadCategories(categoriesData);
    assert.deepEqual(Array.from(loaded.categories).sort(), ['Biologicos', 'FAMEs', 'Sistemicos']);
});

console.log('3. Every category is served from explicit versioned membership');
const catalog = newSandbox();
catalog.loadCategories(categoriesData);
const loaded = catalog.loadFromWorkbook(workbook);
record('el catálogo real carga', () => {
    assert.ok(loaded.cima > 3000, `cima=${loaded.cima}`);
    assert.ok(loaded.local >= 1, `local=${loaded.local}`);
});
record('cada categoría tiene miembros tras la unión determinista', () => {
    const state = catalog.getState();
    assert.equal(state.categoriesLoaded, true);
    for (const category of ['Sistemicos', 'FAMEs', 'Biologicos']) {
        assert.ok(state.categoryCounts[category] > 0, `${category} sin miembros`);
    }
});

console.log('4. Category isolation: scoped search never crosses categories');
function memberNames(query, category) {
    return Array.from(catalog.search(query, category)).map((hit) => hit.name);
}
record("los resultados de Sistemicos son miembros declarados (sonda 'predni', 'metilpredn', 'defla')", () => {
    ['predni', 'metilpredn', 'defla'].forEach((query) => {
        memberNames(query, 'Sistemicos').forEach((name) => {
            assert.ok(expectedMembership.Sistemicos.has(name), `'${name}' no es miembro declarado de Sistemicos`);
        });
    });
});
record("los resultados de FAMEs son miembros declarados (sonda 'metotrex', 'leflun', 'sulfasal', 'ciclospor')", () => {
    ['metotrex', 'leflun', 'sulfasal', 'ciclospor'].forEach((query) => {
        memberNames(query, 'FAMEs').forEach((name) => {
            assert.ok(expectedMembership.FAMEs.has(name), `'${name}' no es miembro declarado de FAMEs`);
        });
    });
});
record("los resultados de Biologicos son miembros declarados (sonda 'cosentyx', 'humira', 'rinvoq', 'xeljanz')", () => {
    ['cosentyx', 'humira', 'rinvoq', 'xeljanz'].forEach((query) => {
        memberNames(query, 'Biologicos').forEach((name) => {
            assert.ok(expectedMembership.Biologicos.has(name), `'${name}' no es miembro declarado de Biologicos`);
        });
    });
});
record("'metotrexato' en Biologicos no devuelve nada (no pertenece a la categoría)", () => {
    assert.equal(catalog.search('metotrexato', 'Biologicos').length, 0);
});
record("'prednisona' en FAMEs no devuelve nada", () => {
    assert.equal(catalog.search('prednisona', 'FAMEs').length, 0);
});
record("'prednisona' en Biologicos no devuelve nada", () => {
    assert.equal(catalog.search('prednisona', 'Biologicos').length, 0);
});
record("'cosentyx' en Sistemicos no devuelve nada", () => {
    assert.equal(catalog.search('cosentyx', 'Sistemicos').length, 0);
});
record("'metotrexato' en Sistemicos no devuelve nada", () => {
    assert.equal(catalog.search('metotrexato', 'Sistemicos').length, 0);
});
record('las uniones por categoría no se solapan entre sí', () => {
    const a = memberNames('a', 'Sistemicos').concat(memberNames('e', 'Sistemicos')).concat(memberNames('i', 'Sistemicos'));
    const f = memberNames('a', 'FAMEs').concat(memberNames('e', 'FAMEs')).concat(memberNames('i', 'FAMEs'));
    const b = memberNames('a', 'Biologicos').concat(memberNames('e', 'Biologicos')).concat(memberNames('i', 'Biologicos'));
    const overlapSF = a.filter((name) => f.includes(name));
    const overlapSB = a.filter((name) => b.includes(name));
    const overlapFB = f.filter((name) => b.includes(name));
    assert.deepEqual(overlapSF, [], JSON.stringify(overlapSF));
    assert.deepEqual(overlapSB, [], JSON.stringify(overlapSB));
    assert.deepEqual(overlapFB, [], JSON.stringify(overlapFB));
});

console.log('5. Coverage seam: declared members missing from the hospital catalogue stay available');
record('Sistemicos expone las entradas explícitas declaradas', () => {
    const names = memberNames('prednisona', 'Sistemicos').concat(memberNames('deflazacort', 'Sistemicos'));
    assert.ok(names.includes('Prednisona'), JSON.stringify(names));
    assert.ok(names.includes('Deflazacort'), JSON.stringify(names));
});
record('FAMEs expone Sulfasalazina y Ciclosporina A explícitas', () => {
    assert.ok(memberNames('sulfasalazina', 'FAMEs').includes('Sulfasalazina'));
    assert.ok(memberNames('ciclosporina', 'FAMEs').includes('Ciclosporina A'));
});
record('las entradas explícitas son de solo identidad (sin datos terapéuticos)', () => {
    catalog.search('prednisona', 'Sistemicos').forEach((hit) => {
        assert.deepEqual(Object.keys(hit).sort(), ['id', 'name']);
    });
});

console.log('6. Fail-closed: sin clasificación, categoría desconocida o vacía no hay catálogo completo');
record('categoría desconocida no devuelve nada', () => {
    assert.equal(catalog.search('humira', 'Glucocorticoides').length, 0);
    assert.equal(catalog.search('humira', '').length, 0);
});
record('sin fuente de clasificación cargada la búsqueda por categoría no devuelve nada', () => {
    const isolated = newSandbox();
    isolated.loadFromWorkbook(workbook);
    assert.equal(isolated.getState().categoriesLoaded, false);
    assert.equal(isolated.search('humira', 'Biologicos').length, 0);
    assert.equal(isolated.search('prednisona', 'Sistemicos').length, 0);
});
record('una fuente de clasificación vacía para una categoría deja la categoría sin miembros (sin fallback)', () => {
    const isolated = newSandbox();
    const emptyBiologicos = JSON.parse(JSON.stringify(categoriesData));
    emptyBiologicos.categories.Biologicos = { label: 'Biológicos', catalogue_tokens: [], explicit_entries: [] };
    isolated.loadCategories(emptyBiologicos);
    isolated.loadFromWorkbook(workbook);
    assert.equal(isolated.getState().categoryCounts.Biologicos, 0);
    assert.equal(isolated.search('humira', 'Biologicos').length, 0);
    assert.ok(isolated.search('prednisona', 'Sistemicos').length > 0, 'Sistemicos debe seguir servida');
});
record('una fuente de clasificación malformada se rechaza (no se tolera en silencio)', () => {
    const isolated = newSandbox();
    assert.throws(() => isolated.loadCategories({ version: '1.0.0', categories: {} }), /categorías declaradas/i);
    assert.throws(() => isolated.loadCategories({ version: '1.0.0', categories: { Sistemicos: { catalogue_tokens: 'no-array', explicit_entries: [] }, FAMEs: { catalogue_tokens: [], explicit_entries: [] }, Biologicos: { catalogue_tokens: [], explicit_entries: [] } } }), /debe ser un array/i);
    assert.throws(() => isolated.loadCategories({ version: '', categories: categoriesData.categories }), /versión/i);
    const extra = JSON.parse(JSON.stringify(categoriesData));
    extra.categories.Topicos = { label: 'Tópicos', catalogue_tokens: [], explicit_entries: [] };
    assert.throws(() => isolated.loadCategories(extra), /categorías declaradas/i);
});

console.log('7. The #444 identity-only contract holds for the scoped path');
record('los resultados por categoría exponen únicamente id/name', () => {
    ['prednisona', 'metotrexato', 'cosentyx'].forEach((query) => {
        const category = query === 'metotrexato' ? 'FAMEs' : query === 'cosentyx' ? 'Biologicos' : 'Sistemicos';
        const hits = catalog.search(query, category);
        assert.ok(hits.length > 0, `sin resultados para '${query}' en ${category}`);
        hits.forEach((hit) => assert.deepEqual(Object.keys(hit).sort(), ['id', 'name']));
    });
});

const passed = results.filter(Boolean).length;
const total = results.length;
console.log(`\nRESULTADO: ${passed} OK / ${total - passed} FALLIDO`);
if (passed !== total) {
    console.log('reuma_drug_category_check FAILED');
    process.exit(1);
}
console.log('reuma_drug_category_check PASS');
