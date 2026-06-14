#!/usr/bin/env node
// tools/farmacia_pautas_catalog_check.mjs
// Verificacion determinista del catalogo y funciones de normalizacion de pautas

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(TARGET_DIR, 'scripts', 'farmacia_pautas_catalog.js');

function main() {
  let exitCode = 0;
  const errors = [];

  if (!fs.existsSync(CATALOG_PATH)) {
    console.log('ERROR: No existe scripts/farmacia_pautas_catalog.js');
    process.exit(1);
  }

  const source = fs.readFileSync(CATALOG_PATH, 'utf-8');

  let catalog;
  try {
    global.window = {};
    eval(source);
    catalog = window.FarmaciaPautasCatalog;
    if (!catalog) {
      errors.push('ERROR: window.FarmaciaPautasCatalog no definido tras evaluar el script');
      exitCode = 1;
    }
  } catch (e) {
    errors.push('ERROR: Error al evaluar farmacia_pautas_catalog.js: ' + e.message);
    exitCode = 1;
  }

  if (!catalog) {
    errors.forEach(function (e) { console.log(e); });
    process.exit(1);
  }

  const pautas = catalog.PAUTAS_CATALOG;

  // 1. Verificar que PAUTAS_CATALOG tiene exactamente 12 elementos
  if (!Array.isArray(pautas) || pautas.length !== 12) {
    errors.push('ERROR: PAUTAS_CATALOG debe tener 12 elementos, tiene ' + (Array.isArray(pautas) ? pautas.length : 'no es array'));
    exitCode = 1;
  }

  // 2. Verificar propiedades obligatorias en cada pauta
  const requiredProps = ['pauta_codigo', 'pauta_label', 'pauta_intervalo_dias', 'pauta_unidad', 'pauta_otro_texto'];
  if (Array.isArray(pautas)) {
    pautas.forEach(function (p, i) {
      requiredProps.forEach(function (prop) {
        if (!(prop in p)) {
          errors.push('ERROR: PAUTAS_CATALOG[' + i + '] no tiene la propiedad "' + prop + '"');
          exitCode = 1;
        }
      });
      if (p.pauta_intervalo_dias !== undefined && typeof p.pauta_intervalo_dias !== 'number') {
        errors.push('ERROR: PAUTAS_CATALOG[' + i + '].pauta_intervalo_dias debe ser number');
        exitCode = 1;
      }
    });
  }

  // 3. Verificar que los codigos son unicos
  if (Array.isArray(pautas)) {
    var codes = pautas.map(function (p) { return p.pauta_codigo; });
    var uniqueCodes = {};
    codes.forEach(function (code) {
      if (uniqueCodes[code]) {
        errors.push('ERROR: Codigo duplicado "' + code + '"');
        exitCode = 1;
      }
      uniqueCodes[code] = true;
    });
  }

  // 4. Verificar que las 6 funciones existen en window.FarmaciaPautasCatalog
  var requiredFunctions = [
    'getPautaByCodigo',
    'getPautaByLabel',
    'getPautaOptions',
    'normalizePautaLabel',
    'buildPautaObjectFromLabel',
    'getLegacyPautaLabel'
  ];
  requiredFunctions.forEach(function (fnName) {
    if (typeof catalog[fnName] !== 'function') {
      errors.push('ERROR: FarmaciaPautasCatalog.' + fnName + ' no es una funcion');
      exitCode = 1;
    }
  });

  // 5. Casos de prueba funcionales
  if (exitCode === 0) {
    var testCases = [
      {
        label: 'getPautaByCodigo("CADA_4_SEMANAS").pauta_label === "Cada 4 semanas"',
        test: function () {
          var result = catalog.getPautaByCodigo('CADA_4_SEMANAS');
          return result && result.pauta_label === 'Cada 4 semanas';
        }
      },
      {
        label: 'getPautaByLabel("Cada 2 semanas").pauta_codigo === "CADA_2_SEMANAS"',
        test: function () {
          var result = catalog.getPautaByLabel('Cada 2 semanas');
          return result && result.pauta_codigo === 'CADA_2_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("Cada 4 semanas").pauta_codigo === "CADA_4_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('Cada 4 semanas');
          return result && result.pauta_codigo === 'CADA_4_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("Texto inventado") es OTRO con pauta_otro_texto "Texto inventado"',
        test: function () {
          var result = catalog.normalizePautaLabel('Texto inventado');
          return result
            && result.pauta_codigo === 'OTRO'
            && result.pauta_otro_texto === 'Texto inventado';
        }
      },
      {
        label: 'getLegacyPautaLabel({pauta_codigo:"OTRO",pauta_otro_texto:"Personal"}) === "Personal"',
        test: function () {
          return catalog.getLegacyPautaLabel({ pauta_codigo: 'OTRO', pauta_otro_texto: 'Personal' }) === 'Personal';
        }
      },
      {
        label: 'getLegacyPautaLabel({pauta_codigo:"SEMANAL"}) === "Semanal"',
        test: function () {
          return catalog.getLegacyPautaLabel({ pauta_codigo: 'SEMANAL' }) === 'Semanal';
        }
      },
      {
        label: 'getPautaOptions().length === 12',
        test: function () {
          var options = catalog.getPautaOptions();
          return Array.isArray(options) && options.length === 12;
        }
      },
      {
        label: 'normalizePautaLabel("") devuelve null (no inventa pauta vacia)',
        test: function () {
          var result = catalog.normalizePautaLabel('');
          return result === null;
        }
      },
      {
        label: 'normalizePautaLabel("SC / cada 4 semanas").pauta_codigo === "CADA_4_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('SC / cada 4 semanas');
          return result && result.pauta_codigo === 'CADA_4_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("SC / cada 2 semanas").pauta_codigo === "CADA_2_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('SC / cada 2 semanas');
          return result && result.pauta_codigo === 'CADA_2_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("SC / semanal segun fase").pauta_codigo === "SEGUN_FASE"',
        test: function () {
          var result = catalog.normalizePautaLabel('SC / semanal según fase');
          return result && result.pauta_codigo === 'SEGUN_FASE';
        }
      },
      {
        label: 'normalizePautaLabel("L2 semanal + L3 semestral").pauta_codigo === "SEGUN_FASE"',
        test: function () {
          var result = catalog.normalizePautaLabel('L2 semanal + L3 semestral');
          return result && result.pauta_codigo === 'SEGUN_FASE';
        }
      },
      {
        label: 'normalizePautaLabel("Dias 1 y 15 cada 6 meses").pauta_codigo === "SEMESTRAL"',
        test: function () {
          var result = catalog.normalizePautaLabel('Dias 1 y 15 cada 6 meses');
          return result && result.pauta_codigo === 'SEMESTRAL';
        }
      },
      {
        label: 'normalizePautaLabel("mensual").pauta_codigo === "MENSUAL"',
        test: function () {
          var result = catalog.normalizePautaLabel('mensual');
          return result && result.pauta_codigo === 'MENSUAL';
        }
      },
      {
        label: 'normalizePautaLabel("cada mes").pauta_codigo === "MENSUAL"',
        test: function () {
          var result = catalog.normalizePautaLabel('cada mes');
          return result && result.pauta_codigo === 'MENSUAL';
        }
      },
      {
        label: 'normalizePautaLabel("c/4 sem").pauta_codigo === "CADA_4_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('c/4 sem');
          return result && result.pauta_codigo === 'CADA_4_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("SC / diaria").pauta_codigo === "DIARIA"',
        test: function () {
          var result = catalog.normalizePautaLabel('SC / diaria');
          return result && result.pauta_codigo === 'DIARIA';
        }
      },
      {
        label: 'normalizePautaLabel("cada 48 horas").pauta_codigo === "CADA_48_HORAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('cada 48 horas');
          return result && result.pauta_codigo === 'CADA_48_HORAS';
        }
      },
      {
        label: 'normalizePautaLabel("cada 48h").pauta_codigo === "CADA_48_HORAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('cada 48h');
          return result && result.pauta_codigo === 'CADA_48_HORAS';
        }
      },
      {
        label: 'normalizePautaLabel("SC / semanal").pauta_codigo === "SEMANAL"',
        test: function () {
          var result = catalog.normalizePautaLabel('SC / semanal');
          return result && result.pauta_codigo === 'SEMANAL';
        }
      },
      {
        label: 'normalizePautaLabel("1 vez por semana").pauta_codigo === "SEMANAL"',
        test: function () {
          var result = catalog.normalizePautaLabel('1 vez por semana');
          return result && result.pauta_codigo === 'SEMANAL';
        }
      },
      {
        label: 'normalizePautaLabel("c/2 sem").pauta_codigo === "CADA_2_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('c/2 sem');
          return result && result.pauta_codigo === 'CADA_2_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("SC / cada 6 semanas").pauta_codigo === "CADA_6_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('SC / cada 6 semanas');
          return result && result.pauta_codigo === 'CADA_6_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("c/6 sem").pauta_codigo === "CADA_6_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('c/6 sem');
          return result && result.pauta_codigo === 'CADA_6_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("SC / cada 8 semanas").pauta_codigo === "CADA_8_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('SC / cada 8 semanas');
          return result && result.pauta_codigo === 'CADA_8_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("IV cada 8 semanas").pauta_codigo === "CADA_8_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('IV cada 8 semanas');
          return result && result.pauta_codigo === 'CADA_8_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("c/8 sem").pauta_codigo === "CADA_8_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('c/8 sem');
          return result && result.pauta_codigo === 'CADA_8_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("SC / cada 12 semanas").pauta_codigo === "CADA_12_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('SC / cada 12 semanas');
          return result && result.pauta_codigo === 'CADA_12_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("c/12 sem").pauta_codigo === "CADA_12_SEMANAS"',
        test: function () {
          var result = catalog.normalizePautaLabel('c/12 sem');
          return result && result.pauta_codigo === 'CADA_12_SEMANAS';
        }
      },
      {
        label: 'normalizePautaLabel("cada 6 meses").pauta_codigo === "SEMESTRAL"',
        test: function () {
          var result = catalog.normalizePautaLabel('cada 6 meses');
          return result && result.pauta_codigo === 'SEMESTRAL';
        }
      },
      {
        label: 'normalizePautaLabel("segun fase").pauta_codigo === "SEGUN_FASE"',
        test: function () {
          var result = catalog.normalizePautaLabel('segun fase');
          return result && result.pauta_codigo === 'SEGUN_FASE';
        }
      },
      {
        label: 'normalizePautaLabel("induccion mantenimiento").pauta_codigo === "SEGUN_FASE"',
        test: function () {
          var result = catalog.normalizePautaLabel('induccion mantenimiento');
          return result && result.pauta_codigo === 'SEGUN_FASE';
        }
      },
      {
        label: 'Unidades correctas para todos los codigos del catalogo',
        test: function () {
          var expected = {
            DIARIA: 'dias',
            CADA_48_HORAS: 'dias',
            SEMANAL: 'semanas',
            CADA_2_SEMANAS: 'semanas',
            CADA_4_SEMANAS: 'semanas',
            CADA_6_SEMANAS: 'semanas',
            CADA_8_SEMANAS: 'semanas',
            CADA_12_SEMANAS: 'semanas',
            MENSUAL: 'meses',
            SEMESTRAL: 'meses',
            SEGUN_FASE: 'variable',
            OTRO: 'texto_libre'
          };
          for (var code in expected) {
            var p = catalog.getPautaByCodigo(code);
            if (!p || p.pauta_unidad !== expected[code]) return false;
          }
          return true;
        }
      }
    ];

    testCases.forEach(function (tc) {
      var passed;
      try {
        passed = tc.test();
      } catch (e) {
        passed = false;
      }
      if (!passed) {
        errors.push('FAIL: ' + tc.label);
        exitCode = 1;
      }
    });
  }

  if (errors.length === 0) {
    console.log('pautas_catalog_check: PASSED');
  } else {
    errors.forEach(function (e) { console.log(e); });
  }
  process.exit(exitCode);
}

main();
