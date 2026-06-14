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
    { pauta_codigo: "MENSUAL", pauta_label: "Mensual", pauta_intervalo_dias: 30, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_6_SEMANAS", pauta_label: "Cada 6 semanas", pauta_intervalo_dias: 42, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_8_SEMANAS", pauta_label: "Cada 8 semanas", pauta_intervalo_dias: 56, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "CADA_12_SEMANAS", pauta_label: "Cada 12 semanas", pauta_intervalo_dias: 84, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "SEMESTRAL", pauta_label: "Semestral", pauta_intervalo_dias: 180, pauta_unidad: "semanas", pauta_otro_texto: "" },
    { pauta_codigo: "SEGUN_FASE", pauta_label: "Según fase / inducción-mantenimiento", pauta_intervalo_dias: 0, pauta_unidad: "", pauta_otro_texto: "" },
    { pauta_codigo: "OTRO", pauta_label: "Otra pauta", pauta_intervalo_dias: 0, pauta_unidad: "", pauta_otro_texto: "" }
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

  function normalizePautaLabel(textoLibre) {
    if (textoLibre == null || String(textoLibre).trim() === "") {
      return clone(getPautaByCodigo("OTRO"));
    }
    const matched = getPautaByLabel(textoLibre);
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
