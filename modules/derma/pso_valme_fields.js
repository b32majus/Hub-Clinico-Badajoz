// Inventario fiel a 174 campos de Valme (donante, no modelo canónico clínico).
// Cada elemento sirve a la maqueta sintética de DermaNEXus; nunca decide terapias.
export const PSO_VALME_FIELDS = [
  {
    "key": "nusha",
    "section": "01 Datos de consulta",
    "control": "Identidad acotada sin NUSHA universal",
    "kind": "contexto",
    "label": "Identificador del paciente (solo sintético)"
  },
  {
    "key": "fecha_visita",
    "section": "01 Datos de consulta",
    "control": "Fecha elegida",
    "kind": "contexto",
    "label": "Fecha de la visita"
  },
  {
    "key": "tipo_visita",
    "section": "01 Datos de consulta",
    "control": "Contexto de navegación (no segunda selección)",
    "kind": "contexto",
    "label": "Tipo de visita"
  },
  {
    "key": "procedencia",
    "section": "01 Datos de consulta",
    "control": "Desplegable",
    "kind": "contexto",
    "label": "Procedencia"
  },
  {
    "key": "tratamiento_previo_consulta",
    "section": "01 Datos de consulta",
    "control": "Solo lectura de historial documentado",
    "kind": "contexto",
    "label": "Tratamiento de visita anterior (referencia)"
  },
  {
    "key": "fecha_inicio_psoriasis",
    "section": "02 Historia de PsO",
    "control": "Fecha",
    "kind": "dato-por-visita",
    "label": "Fecha inicio psoriasis"
  },
  {
    "key": "fecha_diagnostico_psoriasis",
    "section": "02 Historia de PsO",
    "control": "Fecha",
    "kind": "dato-por-visita",
    "label": "Fecha diagnostico psoriasis"
  },
  {
    "key": "curso_evolutivo",
    "section": "02 Historia de PsO",
    "control": "Desplegable de vocabulario existente",
    "kind": "dato-por-visita",
    "label": "Curso evolutivo"
  },
  {
    "key": "fenotipo",
    "section": "02 Historia de PsO",
    "control": "Desplegable de vocabulario existente",
    "kind": "dato-por-visita",
    "label": "Fenotipo"
  },
  {
    "key": "antecedentes_familiares_psoriasis",
    "section": "02 Historia de PsO",
    "control": "Chips Sí / No / Sin consignar",
    "kind": "triestado",
    "label": "Antecedentes familiares psoriasis"
  },
  {
    "key": "desenc_infeccion",
    "section": "02 Historia de PsO",
    "control": "Chips multiselección",
    "kind": "triestado",
    "label": "Infeccion"
  },
  {
    "key": "desenc_estres",
    "section": "02 Historia de PsO",
    "control": "Chips multiselección",
    "kind": "triestado",
    "label": "Estres"
  },
  {
    "key": "desenc_farmacos",
    "section": "02 Historia de PsO",
    "control": "Chips multiselección",
    "kind": "triestado",
    "label": "Farmacos"
  },
  {
    "key": "desenc_traumatismo_friccion",
    "section": "02 Historia de PsO",
    "control": "Chips multiselección",
    "kind": "triestado",
    "label": "Traumatismo friccion"
  },
  {
    "key": "desenc_retirada_corticoides",
    "section": "02 Historia de PsO",
    "control": "Chips multiselección",
    "kind": "triestado",
    "label": "Retirada corticoides"
  },
  {
    "key": "desenc_tabaco",
    "section": "02 Historia de PsO",
    "control": "Chips multiselección",
    "kind": "triestado",
    "label": "Tabaco"
  },
  {
    "key": "desenc_alcohol",
    "section": "02 Historia de PsO",
    "control": "Chips multiselección",
    "kind": "triestado",
    "label": "Alcohol"
  },
  {
    "key": "desenc_otros",
    "section": "02 Historia de PsO",
    "control": "Campo texto Otros",
    "kind": "texto",
    "label": "Otros"
  },
  {
    "key": "tratamiento_previo",
    "section": "02 Historia de PsO",
    "control": "Chips Sí / No / Sin consignar",
    "kind": "triestado",
    "label": "Tratamiento previo"
  },
  {
    "key": "tipo_tratamiento_previo",
    "section": "02 Historia de PsO",
    "control": "Desplegable de vocabulario existente",
    "kind": "dato-por-visita",
    "label": "Tipo tratamiento previo"
  },
  {
    "key": "tratamiento_previo_detalle",
    "section": "02 Historia de PsO",
    "control": "Texto explícito",
    "kind": "dato-por-visita",
    "label": "Tratamiento previo detalle"
  },
  {
    "key": "motivo_suspension_previo",
    "section": "02 Historia de PsO",
    "control": "Texto explícito",
    "kind": "dato-por-visita",
    "label": "Motivo suspension previo"
  },
  {
    "key": "respuesta_previa",
    "section": "02 Historia de PsO",
    "control": "Texto explícito",
    "kind": "dato-por-visita",
    "label": "Respuesta previa"
  },
  {
    "key": "comorb_obesidad",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Obesidad"
  },
  {
    "key": "comorb_sobrepeso",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Sobrepeso"
  },
  {
    "key": "comorb_hta",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Hipertensión arterial"
  },
  {
    "key": "comorb_dislipemia",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Dislipemia"
  },
  {
    "key": "comorb_diabetes_prediabetes",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Diabetes / prediabetes"
  },
  {
    "key": "comorb_sindrome_metabolico",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Sindrome metabolico"
  },
  {
    "key": "comorb_esteatosis_hepatica",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Esteatosis hepatica"
  },
  {
    "key": "comorb_alteracion_transaminasas",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Alteracion transaminasas"
  },
  {
    "key": "comorb_hepatopatia_cronica",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Hepatopatia cronica"
  },
  {
    "key": "comorb_artritis_psoriasica_conocida",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Artritis psoriásica conocida"
  },
  {
    "key": "comorb_sospecha_artritis_psoriasica",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Sospecha de artritis psoriásica"
  },
  {
    "key": "comorb_eii",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Enfermedad inflamatoria intestinal"
  },
  {
    "key": "comorb_cardiopatia_isquemica",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Cardiopatia isquemica"
  },
  {
    "key": "comorb_ictus_ait",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Ictus / AIT"
  },
  {
    "key": "comorb_insuficiencia_cardiaca",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Insuficiencia cardiaca"
  },
  {
    "key": "comorb_enfermedad_vascular_periferica",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Enfermedad vascular periferica"
  },
  {
    "key": "comorb_tabaquismo",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Tabaquismo"
  },
  {
    "key": "comorb_alcohol",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Alcohol"
  },
  {
    "key": "comorb_ansiedad_depresion",
    "section": "03 Comorbilidades",
    "control": "Chips multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Ansiedad / depresión"
  },
  {
    "key": "loc_cuero_cabelludo",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Cuero cabelludo"
  },
  {
    "key": "loc_cara",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Cara"
  },
  {
    "key": "loc_tronco",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Tronco"
  },
  {
    "key": "loc_miembros_superiores",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Miembros superiores"
  },
  {
    "key": "loc_miembros_inferiores",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Miembros inferiores"
  },
  {
    "key": "loc_pliegues",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Pliegues"
  },
  {
    "key": "loc_genitales",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Genitales"
  },
  {
    "key": "loc_palmas",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Palmas"
  },
  {
    "key": "loc_plantas",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Plantas"
  },
  {
    "key": "loc_unas",
    "section": "04 Localizaciones",
    "control": "Chips anatómicos multiselección con revisión explícita",
    "kind": "triestado",
    "label": "Uñas"
  },
  {
    "key": "zona_esp_cuero_cabelludo",
    "section": "04 Localizaciones",
    "control": "Badge de zona especial ligado a selección explícita",
    "kind": "derivado-presentacion",
    "label": "Cuero cabelludo"
  },
  {
    "key": "zona_esp_unas",
    "section": "04 Localizaciones",
    "control": "Badge de zona especial ligado a selección explícita",
    "kind": "derivado-presentacion",
    "label": "Uñas (zona especial)"
  },
  {
    "key": "zona_esp_cara",
    "section": "04 Localizaciones",
    "control": "Badge de zona especial ligado a selección explícita",
    "kind": "derivado-presentacion",
    "label": "Cara"
  },
  {
    "key": "zona_esp_genitales",
    "section": "04 Localizaciones",
    "control": "Badge de zona especial ligado a selección explícita",
    "kind": "derivado-presentacion",
    "label": "Genitales"
  },
  {
    "key": "zona_esp_palmas",
    "section": "04 Localizaciones",
    "control": "Badge de zona especial ligado a selección explícita",
    "kind": "derivado-presentacion",
    "label": "Palmas"
  },
  {
    "key": "zona_esp_plantas",
    "section": "04 Localizaciones",
    "control": "Badge de zona especial ligado a selección explícita",
    "kind": "derivado-presentacion",
    "label": "Plantas"
  },
  {
    "key": "zona_esp_pliegues",
    "section": "04 Localizaciones",
    "control": "Badge de zona especial ligado a selección explícita",
    "kind": "derivado-presentacion",
    "label": "Pliegues"
  },
  {
    "key": "bsa",
    "section": "05 Exploración/PASI",
    "control": "Valor numérico",
    "kind": "dato-por-visita",
    "label": "BSA"
  },
  {
    "key": "pga",
    "section": "05 Exploración/PASI",
    "control": "Selector discreto 0–5",
    "kind": "dato-por-visita",
    "label": "PGA"
  },
  {
    "key": "pasi",
    "section": "05 Exploración/PASI",
    "control": "Total calculado no editable",
    "kind": "derivado",
    "label": "PASI"
  },
  {
    "key": "pasi_cabeza_eritema",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Cabeza · eritema"
  },
  {
    "key": "pasi_cabeza_induracion",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Cabeza · induración"
  },
  {
    "key": "pasi_cabeza_escamas",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Cabeza · descamación"
  },
  {
    "key": "pasi_cabeza_area",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–6",
    "kind": "dato-por-visita",
    "label": "Cabeza · extensión"
  },
  {
    "key": "pasi_tronco_eritema",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Tronco · eritema"
  },
  {
    "key": "pasi_tronco_induracion",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Tronco · induración"
  },
  {
    "key": "pasi_tronco_escamas",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Tronco · descamación"
  },
  {
    "key": "pasi_tronco_area",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–6",
    "kind": "dato-por-visita",
    "label": "Tronco · extensión"
  },
  {
    "key": "pasi_brazos_eritema",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Brazos · eritema"
  },
  {
    "key": "pasi_brazos_induracion",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Brazos · induración"
  },
  {
    "key": "pasi_brazos_escamas",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Brazos · descamación"
  },
  {
    "key": "pasi_brazos_area",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–6",
    "kind": "dato-por-visita",
    "label": "Brazos · extensión"
  },
  {
    "key": "pasi_piernas_eritema",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Piernas · eritema"
  },
  {
    "key": "pasi_piernas_induracion",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Piernas · induración"
  },
  {
    "key": "pasi_piernas_escamas",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–4",
    "kind": "dato-por-visita",
    "label": "Piernas · descamación"
  },
  {
    "key": "pasi_piernas_area",
    "section": "05 Exploración/PASI",
    "control": "Selector 0–6",
    "kind": "dato-por-visita",
    "label": "Piernas · extensión"
  },
  {
    "key": "afectacion_ungueal",
    "section": "05 Exploración/PASI",
    "control": "Chips Sí / No / Sin consignar",
    "kind": "triestado",
    "label": "Afectacion ungueal"
  },
  {
    "key": "observaciones_clinicas",
    "section": "05 Exploración/PASI",
    "control": "Texto libre",
    "kind": "texto",
    "label": "Observaciones clinicas"
  },
  {
    "key": "eva_prurito",
    "section": "06 Síntomas",
    "control": "Escala discreta visual 1–10 con valor visible",
    "kind": "dato-por-visita",
    "label": "EVA de prurito"
  },
  {
    "key": "eva_dolor",
    "section": "06 Síntomas",
    "control": "Escala discreta visual 1–10 con valor visible",
    "kind": "dato-por-visita",
    "label": "EVA de dolor"
  },
  {
    "key": "escozor",
    "section": "06 Síntomas",
    "control": "Chips Sí / No / Sin consignar",
    "kind": "triestado",
    "label": "Escozor"
  },
  {
    "key": "fisuracion",
    "section": "06 Síntomas",
    "control": "Chips Sí / No / Sin consignar",
    "kind": "triestado",
    "label": "Fisuracion"
  },
  {
    "key": "sangrado",
    "section": "06 Síntomas",
    "control": "Chips Sí / No / Sin consignar",
    "kind": "triestado",
    "label": "Sangrado"
  },
  {
    "key": "alteracion_funcional",
    "section": "06 Síntomas",
    "control": "Chips o desplegable de intensidad",
    "kind": "dato-por-visita",
    "label": "Alteracion funcional"
  },
  {
    "key": "alteracion_sueno",
    "section": "06 Síntomas",
    "control": "Chips o desplegable de intensidad",
    "kind": "dato-por-visita",
    "label": "Alteracion sueno"
  },
  {
    "key": "dlqi_q1",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_q2",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_q3",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_q4",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_q5",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_q6",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_q7",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_q8",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_q9",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_q10",
    "section": "07 DLQI",
    "control": "Opciones de respuesta compactas por ítem",
    "kind": "cuestionario",
    "label": "DLQI · ítem i_ (texto pendiente de licencia)"
  },
  {
    "key": "dlqi_total",
    "section": "07 DLQI",
    "control": "Total calculado solo con respuestas completas",
    "kind": "derivado",
    "label": "Total DLQI"
  },
  {
    "key": "pure4_q1",
    "section": "08 PURE-4",
    "control": "Chips Sí/No/Sin contestar por pregunta",
    "kind": "cuestionario",
    "label": "PURE-4 · pregunta 1 (texto pendiente de autorización)"
  },
  {
    "key": "pure4_q2",
    "section": "08 PURE-4",
    "control": "Chips Sí/No/Sin contestar por pregunta",
    "kind": "cuestionario",
    "label": "PURE-4 · pregunta 2 (texto pendiente de autorización)"
  },
  {
    "key": "pure4_q3",
    "section": "08 PURE-4",
    "control": "Chips Sí/No/Sin contestar por pregunta",
    "kind": "cuestionario",
    "label": "PURE-4 · pregunta 3 (texto pendiente de autorización)"
  },
  {
    "key": "pure4_q4",
    "section": "08 PURE-4",
    "control": "Chips Sí/No/Sin contestar por pregunta",
    "kind": "cuestionario",
    "label": "PURE-4 · pregunta 4 (texto pendiente de autorización)"
  },
  {
    "key": "pure4_total_positivas",
    "section": "08 PURE-4",
    "control": "Total visible si 4/4 respuestas",
    "kind": "derivado",
    "label": "Total PURE-4"
  },
  {
    "key": "derivacion_derma_reuma",
    "section": "09 Derivaciones/plan",
    "control": "Chips Sí / No / Sin consignar",
    "kind": "triestado",
    "label": "Derivación Derma–Reuma realizada (explícita)"
  },
  {
    "key": "tx_primera_topicos_farmaco_1",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · fármaco 1"
  },
  {
    "key": "tx_primera_topicos_posologia_1",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · dosis/frecuencia 1"
  },
  {
    "key": "tx_primera_topicos_farmaco_2",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · fármaco 2"
  },
  {
    "key": "tx_primera_topicos_posologia_2",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · dosis/frecuencia 2"
  },
  {
    "key": "tx_primera_topicos_farmaco_3",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · fármaco 3"
  },
  {
    "key": "tx_primera_topicos_posologia_3",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · dosis/frecuencia 3"
  },
  {
    "key": "tx_primera_topicos_otros",
    "section": "10 Tratamiento primera visita",
    "control": "Fila adicional Otros / comentario explícito",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · Otros"
  },
  {
    "key": "tx_primera_sinteticos_convencionales_farmaco_1",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · fármaco 1"
  },
  {
    "key": "tx_primera_sinteticos_convencionales_posologia_1",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · dosis/frecuencia 1"
  },
  {
    "key": "tx_primera_sinteticos_convencionales_farmaco_2",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · fármaco 2"
  },
  {
    "key": "tx_primera_sinteticos_convencionales_posologia_2",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · dosis/frecuencia 2"
  },
  {
    "key": "tx_primera_sinteticos_convencionales_farmaco_3",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · fármaco 3"
  },
  {
    "key": "tx_primera_sinteticos_convencionales_posologia_3",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · dosis/frecuencia 3"
  },
  {
    "key": "tx_primera_sinteticos_convencionales_otros",
    "section": "10 Tratamiento primera visita",
    "control": "Fila adicional Otros / comentario explícito",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · Otros"
  },
  {
    "key": "tx_primera_fototerapia_farmaco_1",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · fármaco 1"
  },
  {
    "key": "tx_primera_fototerapia_posologia_1",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · dosis/frecuencia 1"
  },
  {
    "key": "tx_primera_fototerapia_farmaco_2",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · fármaco 2"
  },
  {
    "key": "tx_primera_fototerapia_posologia_2",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · dosis/frecuencia 2"
  },
  {
    "key": "tx_primera_fototerapia_farmaco_3",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · fármaco 3"
  },
  {
    "key": "tx_primera_fototerapia_posologia_3",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · dosis/frecuencia 3"
  },
  {
    "key": "tx_primera_fototerapia_otros",
    "section": "10 Tratamiento primera visita",
    "control": "Fila adicional Otros / comentario explícito",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · Otros"
  },
  {
    "key": "tx_primera_biologicos_farmaco_1",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · fármaco 1"
  },
  {
    "key": "tx_primera_biologicos_posologia_1",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · dosis/frecuencia 1"
  },
  {
    "key": "tx_primera_biologicos_farmaco_2",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · fármaco 2"
  },
  {
    "key": "tx_primera_biologicos_posologia_2",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · dosis/frecuencia 2"
  },
  {
    "key": "tx_primera_biologicos_farmaco_3",
    "section": "10 Tratamiento primera visita",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · fármaco 3"
  },
  {
    "key": "tx_primera_biologicos_posologia_3",
    "section": "10 Tratamiento primera visita",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · dosis/frecuencia 3"
  },
  {
    "key": "tx_primera_biologicos_otros",
    "section": "10 Tratamiento primera visita",
    "control": "Fila adicional Otros / comentario explícito",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · Otros"
  },
  {
    "key": "tx_seguimiento_topicos_farmaco_1",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · fármaco 1"
  },
  {
    "key": "tx_seguimiento_topicos_posologia_1",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · dosis/frecuencia 1"
  },
  {
    "key": "tx_seguimiento_topicos_farmaco_2",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · fármaco 2"
  },
  {
    "key": "tx_seguimiento_topicos_posologia_2",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · dosis/frecuencia 2"
  },
  {
    "key": "tx_seguimiento_topicos_farmaco_3",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · fármaco 3"
  },
  {
    "key": "tx_seguimiento_topicos_posologia_3",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · dosis/frecuencia 3"
  },
  {
    "key": "tx_seguimiento_topicos_otros",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila adicional Otros / comentario explícito",
    "kind": "tratamiento-explicito",
    "label": "Tópicos · Otros"
  },
  {
    "key": "tx_seguimiento_sinteticos_convencionales_farmaco_1",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · fármaco 1"
  },
  {
    "key": "tx_seguimiento_sinteticos_convencionales_posologia_1",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · dosis/frecuencia 1"
  },
  {
    "key": "tx_seguimiento_sinteticos_convencionales_farmaco_2",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · fármaco 2"
  },
  {
    "key": "tx_seguimiento_sinteticos_convencionales_posologia_2",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · dosis/frecuencia 2"
  },
  {
    "key": "tx_seguimiento_sinteticos_convencionales_farmaco_3",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · fármaco 3"
  },
  {
    "key": "tx_seguimiento_sinteticos_convencionales_posologia_3",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · dosis/frecuencia 3"
  },
  {
    "key": "tx_seguimiento_sinteticos_convencionales_otros",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila adicional Otros / comentario explícito",
    "kind": "tratamiento-explicito",
    "label": "Sintéticos convencionales · Otros"
  },
  {
    "key": "tx_seguimiento_fototerapia_farmaco_1",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · fármaco 1"
  },
  {
    "key": "tx_seguimiento_fototerapia_posologia_1",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · dosis/frecuencia 1"
  },
  {
    "key": "tx_seguimiento_fototerapia_farmaco_2",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · fármaco 2"
  },
  {
    "key": "tx_seguimiento_fototerapia_posologia_2",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · dosis/frecuencia 2"
  },
  {
    "key": "tx_seguimiento_fototerapia_farmaco_3",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · fármaco 3"
  },
  {
    "key": "tx_seguimiento_fototerapia_posologia_3",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · dosis/frecuencia 3"
  },
  {
    "key": "tx_seguimiento_fototerapia_otros",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila adicional Otros / comentario explícito",
    "kind": "tratamiento-explicito",
    "label": "Fototerapia · Otros"
  },
  {
    "key": "tx_seguimiento_biologicos_farmaco_1",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · fármaco 1"
  },
  {
    "key": "tx_seguimiento_biologicos_posologia_1",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · dosis/frecuencia 1"
  },
  {
    "key": "tx_seguimiento_biologicos_farmaco_2",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · fármaco 2"
  },
  {
    "key": "tx_seguimiento_biologicos_posologia_2",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · dosis/frecuencia 2"
  },
  {
    "key": "tx_seguimiento_biologicos_farmaco_3",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila repetible con selector de fármaco",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · fármaco 3"
  },
  {
    "key": "tx_seguimiento_biologicos_posologia_3",
    "section": "11 Tratamiento seguimiento",
    "control": "Campo terapéutico editable, vacío por defecto",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · dosis/frecuencia 3"
  },
  {
    "key": "tx_seguimiento_biologicos_otros",
    "section": "11 Tratamiento seguimiento",
    "control": "Fila adicional Otros / comentario explícito",
    "kind": "tratamiento-explicito",
    "label": "Biológicos · Otros"
  },
  {
    "key": "seguimiento_adherencia_categoria",
    "section": "12 Seguimiento terapéutico",
    "control": "Desplegable",
    "kind": "dato-por-visita",
    "label": "Adherencia registrada"
  },
  {
    "key": "seguimiento_ajuste_terapeutico",
    "section": "12 Seguimiento terapéutico",
    "control": "Texto breve estructurable",
    "kind": "dato-por-visita",
    "label": "Ajuste terapéutico (explícito)"
  },
  {
    "key": "seguimiento_adherencia_morisky_q1",
    "section": "12 Seguimiento terapéutico",
    "control": "Chips Sí/No/Sin contestar",
    "kind": "cuestionario",
    "label": "Morisky · pregunta 1 (texto pendiente de autorización)"
  },
  {
    "key": "seguimiento_adherencia_morisky_q2",
    "section": "12 Seguimiento terapéutico",
    "control": "Chips Sí/No/Sin contestar",
    "kind": "cuestionario",
    "label": "Morisky · pregunta 2 (texto pendiente de autorización)"
  },
  {
    "key": "seguimiento_adherencia_morisky_q3",
    "section": "12 Seguimiento terapéutico",
    "control": "Chips Sí/No/Sin contestar",
    "kind": "cuestionario",
    "label": "Morisky · pregunta 3 (texto pendiente de autorización)"
  },
  {
    "key": "seguimiento_adherencia_morisky_q4",
    "section": "12 Seguimiento terapéutico",
    "control": "Chips Sí/No/Sin contestar",
    "kind": "cuestionario",
    "label": "Morisky · pregunta 4 (texto pendiente de autorización)"
  },
  {
    "key": "seguimiento_morisky_total_no_adherencia",
    "section": "12 Seguimiento terapéutico",
    "control": "Indicador derivado si 4/4 completo",
    "kind": "derivado",
    "label": "Total Morisky-Green"
  },
  {
    "key": "seguimiento_motivo_cambio",
    "section": "12 Seguimiento terapéutico",
    "control": "Texto breve estructurable",
    "kind": "dato-por-visita",
    "label": "Motivo de cambio (explícito)"
  },
  {
    "key": "seguimiento_efectos_adversos",
    "section": "12 Seguimiento terapéutico",
    "control": "Chips Sí / No / Sin consignar",
    "kind": "triestado",
    "label": "Efectos adversos"
  },
  {
    "key": "impresion_clinica",
    "section": "13 Plan",
    "control": "Texto/fecha según semántica confirmada",
    "kind": "texto",
    "label": "Impresion clinica"
  },
  {
    "key": "objetivo_terapeutico",
    "section": "13 Plan",
    "control": "Texto/fecha según semántica confirmada",
    "kind": "texto",
    "label": "Objetivo terapeutico"
  },
  {
    "key": "otras_derivaciones",
    "section": "13 Plan",
    "control": "Texto/fecha según semántica confirmada",
    "kind": "texto",
    "label": "Otras derivaciones"
  },
  {
    "key": "proxima_revision",
    "section": "13 Plan",
    "control": "Texto/fecha según semántica confirmada",
    "kind": "texto",
    "label": "Proxima revision"
  },
  {
    "key": "comentarios_finales",
    "section": "13 Plan",
    "control": "Texto/fecha según semántica confirmada",
    "kind": "texto",
    "label": "Comentarios finales"
  }
];
