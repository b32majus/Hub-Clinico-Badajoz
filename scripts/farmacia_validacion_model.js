(function() {
  'use strict';

  function createEmptyValidationState() {
    return {
      source: { service: "", pathology: "" },
      patient: { cip: "", displayId: "" },
      request: {
        farmaco: "", principioActivo: "", dosis: "", via: "", pauta: "",
        induccion: "", peso: "", fechaSolicitud: "", justificacion: "", observaciones: ""
      },
      prebiologic: {
        analyticsRecent: "", hemograma: false, bioquimica: false,
        tb: "", vhb: "", vhc: "", vih: "", vaccination: "", observaciones: ""
      },
      adverseEvent: {
        notificado: "No consta", tipo: "No consta", gravedad: "No consta",
        accion: "No aplica", causalidad: "No evaluada",
        criterios: { temporal:false, dechallenge:false, rechallenge:false, alternativa:false, descrito:false, dosis:false, insuficiente:false }
      },
      concomitantTreatments: [],
      validation: { estado: "", motivoDenegacion: "", citaFarmacia: "", observaciones: "" }
    };
  }

  function normalizeIntakeRecord(record) {
    if (record === null || record === undefined) {
      return createEmptyValidationState();
    }
    const r = record || {};
    return {
      source: {
        service: r.service || "",
        pathology: r.pathology || ""
      },
      patient: {
        cip: r.patient_id || r.patientId || r.cip || "",
        displayId: r.display_id || r.displayId || ""
      },
      request: {
        farmaco: r.proposed_biologic?.name || r.proposedBiologic?.name || r.farmaco || "",
        principioActivo: r.proposed_biologic?.principio_activo || r.proposed_biologic?.active_principle || r.proposedBiologic?.principioActivo || r.principioActivo || "",
        dosis: r.proposed_biologic?.dose || r.proposedBiologic?.dosis || r.dosis || "",
        via: r.proposed_biologic?.route || r.proposedBiologic?.via || r.via || "",
        pauta: r.proposed_biologic?.schedule || r.proposedBiologic?.pauta || r.pauta || "",
        induccion: r.induccion || r.induction || "",
        peso: r.peso || r.weight || "",
        fechaSolicitud: r.fecha_solicitud || r.fechaSolicitud || r.requestDate || "",
        justificacion: r.justificacion || r.justification || "",
        observaciones: r.nursing_observations || r.nursingObservations || r.observaciones || ""
      },
      prebiologic: normalizePrebiologicStatus(r.prebiologic_status || r.prebiologicStatus),
      adverseEvent: normalizeAdverseEvent(r.adverse_event || r.adverseEvent),
      concomitantTreatments: normalizeConcomitantTreatmentsArray(r.other_biologics || r.concomitantTreatments || r.otherBiologics || []),
      validation: {
        estado: r.ready_for_pharmacy_validation ? "Pendiente" : "",
        motivoDenegacion: r.motivo_denegacion || r.motivoDenegacion || "",
        citaFarmacia: r.cita_farmacia || r.citaFarmacia || "",
        observaciones: r.validation_observations || r.validationObservations || ""
      }
    };
  }

  function normalizePrebiologicStatus(prebio) {
    if (prebio === null || prebio === undefined) {
      return {
        analyticsRecent: "", hemograma: false, bioquimica: false,
        tb: "", vhb: "", vhc: "", vih: "", vaccination: "", observaciones: ""
      };
    }
    const p = prebio || {};
    const result = {
      analyticsRecent: "", hemograma: false, bioquimica: false,
      tb: "", vhb: "", vhc: "", vih: "", vaccination: "", observaciones: ""
    };

    const analyticsStatus = String(p.analytics_status || p.analyticsStatus || "").trim();
    if (analyticsStatus === "OK" || analyticsStatus === "ok") {
      result.analyticsRecent = "si";
      result.hemograma = true;
      result.bioquimica = true;
    } else if (analyticsStatus.toUpperCase().indexOf("ALTERADA") !== -1) {
      result.analyticsRecent = "no";
      result.hemograma = false;
      result.bioquimica = false;
    }

    const tbStatus = String(p.tb_screening_status || p.tbScreeningStatus || "").trim().toUpperCase();
    if (tbStatus === "NEGATIVO") {
      result.tb = "Negativo";
    } else if (tbStatus === "POSITIVO") {
      const tbRaw = String(p.tb_screening_status || p.tbScreeningStatus || "").trim();
      if (tbRaw.toUpperCase().indexOf("TRATADO") !== -1) {
        result.tb = "Positivo - tratado";
      } else {
        result.tb = "Pendiente";
      }
    } else if (tbStatus === "PENDIENTE") {
      result.tb = "Pendiente";
    } else if (tbStatus === "NO PRECISA") {
      result.tb = "";
    }

    const seroStatus = String(p.serologies_status || p.serologiesStatus || "").trim().toUpperCase();
    if (seroStatus === "OK") {
      result.vhb = "Negativo";
      result.vhc = "Negativo";
      result.vih = "Negativo";
    } else if (seroStatus === "PENDIENTE") {
      result.vhb = "Pendiente";
      result.vhc = "Pendiente";
      result.vih = "Pendiente";
    } else if (seroStatus === "ALTERADA") {
      result.vhb = "";
      result.vhc = "";
      result.vih = "";
      result.observaciones = (result.observaciones ? result.observaciones + " " : "") + "Serologías alteradas";
    }

    const vacStatus = String(p.vaccination_status || p.vaccinationStatus || "").trim().toUpperCase();
    if (vacStatus === "OK") {
      result.vaccination = "si";
    } else if (vacStatus === "PENDIENTE") {
      result.vaccination = "pendiente";
    } else if (vacStatus === "NO PRECISA") {
      result.vaccination = "no";
    }

    if (p.missing_items && Array.isArray(p.missing_items) && p.missing_items.length > 0) {
      const missing = p.missing_items.join(", ");
      result.observaciones = (result.observaciones ? result.observaciones + " " : "") + "Pendiente: " + missing;
    }

    return result;
  }

  function normalizeAdverseEvent(ae) {
    if (ae === null || ae === undefined) {
      return {
        notificado: "No consta", tipo: "No consta", gravedad: "No consta",
        accion: "No aplica", causalidad: "No evaluada",
        criterios: { temporal:false, dechallenge:false, rechallenge:false, alternativa:false, descrito:false, dosis:false, insuficiente:false }
      };
    }
    const e = ae || {};
    const criterios = e.criterios || e.criteria || {};
    return {
      notificado: e.notificado || e.reported || "No consta",
      tipo: e.tipo || e.type || "No consta",
      gravedad: e.gravedad || e.severity || "No consta",
      accion: e.accion || e.action || "No aplica",
      causalidad: e.causalidad || e.causality || "No evaluada",
      criterios: {
        temporal: !!criterios.temporal,
        dechallenge: !!criterios.dechallenge,
        rechallenge: !!criterios.rechallenge,
        alternativa: !!criterios.alternativa,
        descrito: !!criterios.descrito,
        dosis: !!criterios.dosis,
        insuficiente: !!criterios.insuficiente
      }
    };
  }

  function normalizeConcomitantTreatment(t) {
    if (t === null || t === undefined) {
      return { nombre: "", principio_activo: "", dosis: "", via: "", pauta: "", motivo: "" };
    }
    const item = t || {};
    return {
      nombre: item.name || item.drugName || item.nombre || "",
      principio_activo: item.principio_activo || item.active_principle || item.principioActivo || "",
      dosis: item.dose || item.dosis || "",
      via: item.route || item.via || "",
      pauta: item.schedule || item.pauta || "",
      motivo: item.reason || item.motivo || ""
    };
  }

  function normalizeConcomitantTreatmentsArray(arr) {
    if (!Array.isArray(arr)) {
      return [];
    }
    return arr.map(normalizeConcomitantTreatment);
  }

  function buildValidationStateFromIntake(record) {
    const normalized = normalizeIntakeRecord(record);

    const serviceMap = {
      "Derma": "derma",
      "Reuma": "reuma"
    };
    if (normalized.source && normalized.source.service) {
      const mapped = serviceMap[normalized.source.service];
      if (mapped) {
        normalized.source.service = mapped;
      }
    }

    return normalized;
  }

  function buildExportPayloadFromState(state) {
    if (state === null || state === undefined) {
      return {};
    }
    const s = state || {};
    return {
      source_service: s.source?.service || "",
      source_pathology: s.source?.pathology || "",
      patient_cip: s.patient?.cip || "",
      patient_displayId: s.patient?.displayId || "",
      request_farmaco: s.request?.farmaco || "",
      request_principioActivo: s.request?.principioActivo || "",
      request_dosis: s.request?.dosis || "",
      request_via: s.request?.via || "",
      request_pauta: s.request?.pauta || "",
      request_induccion: s.request?.induccion || "",
      request_peso: s.request?.peso || "",
      request_fechaSolicitud: s.request?.fechaSolicitud || "",
      request_justificacion: s.request?.justificacion || "",
      request_observaciones: s.request?.observaciones || "",
      prebiologic_analyticsRecent: s.prebiologic?.analyticsRecent || "",
      prebiologic_hemograma: s.prebiologic?.hemograma || false,
      prebiologic_bioquimica: s.prebiologic?.bioquimica || false,
      prebiologic_tb: s.prebiologic?.tb || "",
      prebiologic_vhb: s.prebiologic?.vhb || "",
      prebiologic_vhc: s.prebiologic?.vhc || "",
      prebiologic_vih: s.prebiologic?.vih || "",
      prebiologic_vaccination: s.prebiologic?.vaccination || "",
      prebiologic_observaciones: s.prebiologic?.observaciones || "",
      adverseEvent_notificado: s.adverseEvent?.notificado || "No consta",
      adverseEvent_tipo: s.adverseEvent?.tipo || "No consta",
      adverseEvent_gravedad: s.adverseEvent?.gravedad || "No consta",
      adverseEvent_accion: s.adverseEvent?.accion || "No aplica",
      adverseEvent_causalidad: s.adverseEvent?.causalidad || "No evaluada",
      adverseEvent_criterios_temporal: s.adverseEvent?.criterios?.temporal || false,
      adverseEvent_criterios_dechallenge: s.adverseEvent?.criterios?.dechallenge || false,
      adverseEvent_criterios_rechallenge: s.adverseEvent?.criterios?.rechallenge || false,
      adverseEvent_criterios_alternativa: s.adverseEvent?.criterios?.alternativa || false,
      adverseEvent_criterios_descrito: s.adverseEvent?.criterios?.descrito || false,
      adverseEvent_criterios_dosis: s.adverseEvent?.criterios?.dosis || false,
      adverseEvent_criterios_insuficiente: s.adverseEvent?.criterios?.insuficiente || false,
      concomitantTreatments: s.concomitantTreatments || [],
      validation_estado: s.validation?.estado || "",
      validation_motivoDenegacion: s.validation?.motivoDenegacion || "",
      validation_citaFarmacia: s.validation?.citaFarmacia || "",
      validation_observaciones: s.validation?.observaciones || ""
    };
  }

  window.FarmaciaValidationModel = {
    createEmptyValidationState: createEmptyValidationState,
    normalizeIntakeRecord: normalizeIntakeRecord,
    normalizePrebiologicStatus: normalizePrebiologicStatus,
    normalizeAdverseEvent: normalizeAdverseEvent,
    normalizeConcomitantTreatment: normalizeConcomitantTreatment,
    buildValidationStateFromIntake: buildValidationStateFromIntake,
    buildExportPayloadFromState: buildExportPayloadFromState
  };

})();
