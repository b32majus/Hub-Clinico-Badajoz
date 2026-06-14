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

  function matchPautaByPattern(textoLibre) {
    const normalized = normalizeText(textoLibre);
    if (!normalized) return undefined;

    // SEGUN_FASE: menciones de fase, inducción-mantenimiento o combinación semanal+semestral
    if (
      normalized.indexOf("segun fase") !== -1 ||
      normalized.indexOf("induccion mantenimiento") !== -1 ||
      normalized.indexOf("semanal") !== -1 && normalized.indexOf("semestral") !== -1
    ) {
      return getPautaByCodigo("SEGUN_FASE");
    }

    // CADA_4_SEMANAS
    if (
      normalized.indexOf("cada 4 semanas") !== -1 ||
      normalized.indexOf("c 4 sem") !== -1 ||
      /\b4\s+sem\b/.test(normalized)
    ) {
      return getPautaByCodigo("CADA_4_SEMANAS");
    }

    // CADA_2_SEMANAS
    if (
      normalized.indexOf("cada 2 semanas") !== -1 ||
      normalized.indexOf("c 2 sem") !== -1 ||
      /\b2\s+sem\b/.test(normalized)
    ) {
      return getPautaByCodigo("CADA_2_SEMANAS");
    }

    // SEMESTRAL
    if (
      normalized.indexOf("semestral") !== -1 ||
      normalized.indexOf("cada 6 meses") !== -1 ||
      /\b6\s+meses?\b/.test(normalized)
    ) {
      return getPautaByCodigo("SEMESTRAL");
    }

    // MENSUAL
    if (
      normalized.indexOf("mensual") !== -1 ||
      normalized.indexOf("cada mes") !== -1 ||
      /\bmes\b/.test(normalized)
    ) {
      return getPautaByCodigo("MENSUAL");
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
