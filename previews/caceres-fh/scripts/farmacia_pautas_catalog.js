/**
 * Catálogo común de pautas normalizadas para el módulo de farmacia.
 * Uso: carga antes de farmacia_common.js.
 */
(function () {
  "use strict";

  const PAUTAS_CATALOG = [
    { pauta_codigo: "DIARIA", pauta_label: "Diaria", pauta_intervalo_dias: 1, pauta_unidad: "dias", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_48_HORAS", pauta_label: "Cada 48 horas", pauta_intervalo_dias: 2, pauta_unidad: "dias", pauta_otro_texto: "" },
    { pauta_codigo: "SEMANAL", pauta_label: "Semanal", pauta_intervalo_dias: 7, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_2_SEMANAS", pauta_label: "Cada 2 semanas", pauta_intervalo_dias: 14, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_3_SEMANAS", pauta_label: "Cada 3 semanas", pauta_intervalo_dias: 21, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_4_SEMANAS", pauta_label: "Cada 4 semanas", pauta_intervalo_dias: 28, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "MENSUAL", pauta_label: "Mensual", pauta_intervalo_dias: 30, pauta_unidad: "meses", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_6_SEMANAS", pauta_label: "Cada 6 semanas", pauta_intervalo_dias: 42, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_8_SEMANAS", pauta_label: "Cada 8 semanas", pauta_intervalo_dias: 56, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_12_SEMANAS", pauta_label: "Cada 12 semanas", pauta_intervalo_dias: 84, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "SEMESTRAL", pauta_label: "Semestral", pauta_intervalo_dias: 180, pauta_unidad: "meses", pauta_otro_texto: "" },
    { pauta_codigo: "SEGUN_FASE", pauta_label: "Según fase / inducción-mantenimiento", pauta_intervalo_dias: 0, pauta_unidad: "variable", pauta_otro_texto: "" },
    { pauta_codigo: "OTRO", pauta_label: "Otra pauta", pauta_intervalo_dias: 0, pauta_unidad: "texto_libre", pauta_otro_texto: "" }
  ];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeText(text) {
    if (text == null) return "";
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getPautaByCodigo(codigo) {
    if (codigo == null) return undefined;
    return PAUTAS_CATALOG.find(function (p) {
      return p.pauta_codigo === String(codigo).toUpperCase();
    });
  }

  function getPautaByLabel(label) {
    if (label == null) return undefined;
    const needle = normalizeText(label);
    if (!needle) return undefined;
    return PAUTAS_CATALOG.find(function (p) {
      return normalizeText(p.pauta_label) === needle;
    });
  }

  function getPautaOptions() {
    return PAUTAS_CATALOG.map(function (p) {
      return { value: p.pauta_codigo, label: p.pauta_label };
    });
  }

  const PAUTA_REGEX_PATTERNS = [
    {
      codigo: "DIARIA",
      regex: [/\b(diaria|diario|cada\s+dia)\b/]
    },
    {
      codigo: "CADA_48_HORAS",
      regex: [/\bcada\s+48\s*(horas|h)\b/, /\b48\s*h\b/]
    },
    {
      codigo: "SEMANAL",
      regex: [/\bsemanal\b/, /\b1\s+vez\s+por\s+semana\b/]
    },
    {
      codigo: "CADA_2_SEMANAS",
      regex: [/\bcada\s+2\s+semanas\b/, /\bc\s*2\s*sem(?:anas)?\b/]
    },
    {
      codigo: "CADA_3_SEMANAS",
      regex: [/\bcada\s+3\s+semanas\b/, /\bc\s*3\s*sem(?:anas)?\b/]
    },
    {
      codigo: "CADA_4_SEMANAS",
      regex: [/\bcada\s+4\s+semanas\b/, /\bc\s*4\s*sem(?:anas)?\b/]
    },
    {
      codigo: "CADA_6_SEMANAS",
      regex: [/\bcada\s+6\s+semanas\b/, /\bc\s*6\s*sem(?:anas)?\b/]
    },
    {
      codigo: "CADA_8_SEMANAS",
      regex: [/\bcada\s+8\s+semanas\b/, /\bc\s*8\s*sem(?:anas)?\b/, /\biv\s+cada\s+8\s+semanas\b/]
    },
    {
      codigo: "CADA_12_SEMANAS",
      regex: [/\bcada\s+12\s+semanas\b/, /\bc\s*12\s*sem(?:anas)?\b/]
    },
    {
      codigo: "MENSUAL",
      regex: [/\bmensual\b/, /\bcada\s+mes\b/]
    },
    {
      codigo: "SEMESTRAL",
      regex: [/\bsemestral\b/, /\bcada\s+6\s+meses\b/]
    }
  ];

  function matchesAnyPattern(text, patternList) {
    for (let i = 0; i < patternList.length; i++) {
      if (patternList[i].test(text)) return true;
    }
    return false;
  }

  function containsMultiplePautaSeparator(text) {
    if (text == null) return false;
    return String(text).indexOf("\n") !== -1;
  }

  function isSegunFasePattern(normalized, originalText) {
    if (
      normalized.indexOf("segun fase") !== -1 ||
      normalized.indexOf("induccion") !== -1 ||
      normalized.indexOf("mantenimiento") !== -1
    ) {
      return true;
    }

    if (containsMultiplePautaSeparator(originalText)) {
      return true;
    }

    const found = [];
    for (let i = 0; i < PAUTA_REGEX_PATTERNS.length; i++) {
      const item = PAUTA_REGEX_PATTERNS[i];
      if (matchesAnyPattern(normalized, item.regex) && found.indexOf(item.codigo) === -1) {
        found.push(item.codigo);
      }
    }
    return found.length > 1;
  }

  function matchPautaByPattern(textoLibre) {
    const normalized = normalizeText(textoLibre);
    if (!normalized) return undefined;

    // SEGUN_FASE: menciones de fase, inducción-mantenimiento, múltiples pautas
    // o saltos de línea en el texto original
    if (isSegunFasePattern(normalized, textoLibre)) {
      return getPautaByCodigo("SEGUN_FASE");
    }

    for (let i = 0; i < PAUTA_REGEX_PATTERNS.length; i++) {
      const item = PAUTA_REGEX_PATTERNS[i];
      if (matchesAnyPattern(normalized, item.regex)) {
        return getPautaByCodigo(item.codigo);
      }
    }

    return undefined;
  }

  function normalizePautaLabel(textoLibre) {
    if (textoLibre == null || String(textoLibre).trim() === "") {
      return null;
    }
    const matched = getPautaByLabel(textoLibre) || matchPautaByPattern(textoLibre);
    if (matched) return clone(matched);
    const otro = clone(getPautaByCodigo("OTRO"));
    otro.pauta_otro_texto = String(textoLibre).trim();
    return otro;
  }

  function buildPautaObjectFromLabel(label) {
    return normalizePautaLabel(label);
  }

  function getLegacyPautaLabel(pautaObj) {
    if (!pautaObj || typeof pautaObj !== "object") return "";
    if (pautaObj.pauta_codigo === "OTRO" && pautaObj.pauta_otro_texto) {
      return pautaObj.pauta_otro_texto;
    }
    if (pautaObj.pauta_label) return pautaObj.pauta_label;
    if (pautaObj.pauta_codigo) {
      const catalog = getPautaByCodigo(pautaObj.pauta_codigo);
      if (catalog) return catalog.pauta_label;
    }
    return "";
  }

  window.FarmaciaPautasCatalog = {
    PAUTAS_CATALOG: clone(PAUTAS_CATALOG),
    getPautaByCodigo: getPautaByCodigo,
    getPautaByLabel: getPautaByLabel,
    getPautaOptions: getPautaOptions,
    normalizePautaLabel: normalizePautaLabel,
    buildPautaObjectFromLabel: buildPautaObjectFromLabel,
    getLegacyPautaLabel: getLegacyPautaLabel
  };
})();
