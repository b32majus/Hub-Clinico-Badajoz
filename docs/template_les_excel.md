# Template Excel — LES (Lupus eritematoso sistémico)

> Hoja: `LES`. Revisión 2026-05-03.

---

## Columnas base (comunes a todas las hojas clínicas)

Ver `docs/CONTRATO_DATOS_REUMA_V2.md` sección 2.

---

## Columnas específicas LES

### Identificación y contexto

35. `Fecha_Diagnostico`
36. `Inicio_Sintomas`

### Actividad e índices

37. `SLEDAI_Result` (deprecated, conservado por compatibilidad; usar `SLEDAI_2K_Result`)
38. `SLEDAI_2K_Result` (calculado desde los 24 ítems ponderados)
39. `SLICC_ACR_SDI` (calculado desde los 12 dominios/subtotales)
40. `Dosis_Prednisona_Mg_Dia`
41. `Brote_Actual`
42. `Tipo_Brote`
43. `Actividad_Global_Medico`
44. `Actividad_Global_Paciente`

#### Ítems SLEDAI-2K (checklist, 24 ítems ponderados)

Cada ítem se exporta como `SI`/`NO`/`NA`.

45. `sledaiSeizure` — Convulsiones (peso 8)
46. `sledaiPsychosis` — Psicosis (peso 8)
47. `sledaiOrganicBrainSyndrome` — Síndrome orgánico cerebral (peso 8)
48. `sledaiVisualDisturbance` — Alteración visual (peso 8)
49. `sledaiCranialNerveDisorder` — Alteración de pares craneales (peso 8)
50. `sledaiLupusHeadache` — Cefalea lúpica (peso 8)
51. `sledaiCVA` — Accidente cerebrovascular (peso 8)
52. `sledaiVasculitis` — Vasculitis (peso 8)
53. `sledaiArthritis` — Artritis (peso 4)
54. `sledaiMyositis` — Miositis (peso 4)
55. `sledaiUrinaryCasts` — Cilindros urinarios (peso 4)
56. `sledaiHematuria` — Hematuria (peso 4)
57. `sledaiProteinuria` — Proteinuria (peso 4)
58. `sledaiPyuria` — Piuria (peso 4)
59. `sledaiRash` — Rash / exantema (peso 2)
60. `sledaiAlopecia` — Alopecia (peso 2)
61. `sledaiMucosalUlcers` — Úlceras mucosas (peso 2)
62. `sledaiPleurisy` — Pleuritis (peso 2)
63. `sledaiPericarditis` — Pericarditis (peso 2)
64. `sledaiLowComplement` — Complemento bajo (peso 2)
65. `sledaiIncreasedDNABinding` — Anti-DNA elevado (peso 2)
66. `sledaiFever` — Fiebre (peso 1)
67. `sledaiThrombocytopenia` — Trombocitopenia (peso 1)
68. `sledaiLeukopenia` — Leucopenia (peso 1)

#### Dominios SLICC/ACR SDI (subtotales, 12 dominios)

69. `sliccOcular` — Ocular (rango 0–2)
70. `sliccNeuropsychiatric` — Neuropsiquiátrico (rango 0–6)
71. `sliccRenal` — Renal (rango 0–3)
72. `sliccPulmonary` — Pulmonar (rango 0–5)
73. `sliccCardiovascular` — Cardiovascular (rango 0–6)
74. `sliccPeripheralVascular` — Vascular Periférico (rango 0–5)
75. `sliccGastrointestinal` — Gastrointestinal (rango 0–6)
76. `sliccMusculoskeletal` — Musculoesquelético (rango 0–7)
77. `sliccSkin` — Piel (rango 0–3)
78. `sliccEndocrineDiabetes` — Endocrino/Diabetes (rango 0–1)
79. `sliccGonadal` — Gonadal (rango 0–1)
80. `sliccMalignancy` — Malignidad (rango 0–2)

### Manifestaciones por órgano / dominio

81. `LES_Cutaneo`
82. `LES_Articular`
83. `LES_Renal`
84. `LES_Neurologico`
85. `LES_Hematologico`
86. `LES_Seroso`
87. `LES_Cardiopulmonar`
88. `LES_Vascular`
89. `LES_Ocular`
90. `LES_Otros`
91. `LES_Manifestaciones_Descripcion`

### Inmunología y analítica

92. `ANA`
93. `AntiDNA`
94. `AntiSm`
95. `AntiRo`
96. `AntiLa`
97. `Complemento_C3`
98. `Complemento_C4`
99. `Proteinuria`
100. `Sedimento_Urinario`
101. `Creatinina`
102. `PCR`
103. `VSG`
104. `Hemograma_Alteraciones`
105. `Otros_Hallazgos_Analitica`

### PROs e impacto

106. `EVA_Dolor`
107. `EVA_Fatiga`
108. `EVA_Global`
109. `Calidad_Vida_Comentario`

### Tratamiento LES específico

110. `Trat_Inmunosupresor`
111. `Trat_Inmunosupresor_Dosis`
112. `Trat_Antimalarico`
113. `Trat_Antimalarico_Dosis`
114. `Trat_Corticoides`
115. `Trat_Corticoides_Dosis`
116. `Trat_Biologico`
117. `Trat_Biologico_Dosis`

---

## Reglas de codificación

- Índices numéricos (`SLEDAI_Result`, `SLICC_ACR_SDI`, `Dosis_Prednisona_Mg_Dia`): valor numérico o vacío.
- Manifestaciones por órgano: `SI` / `NO` / `ND`.
- `Brote_Actual`: `SI` / `NO`.
- `Tipo_Brote`: texto libre cuando `Brote_Actual = SI`.
- `Actividad_Global_Medico` / `Actividad_Global_Paciente`: escala 0–10 o vacío.
- Inmunología: `positivo` / `negativo` / `ND` para serologías; valor numérico o vacío para complementos, creatinina, PCR, VSG.
- `Proteinuria`: valor numérico (mg/24h o g/24h) o vacío.

---

## Notas de implementación

- El selector de patología usará `value="les"`.
- `normalizePathology('LES')` devuelve `'les'`.
- No se requiere homúnculo articular completo para LES en v1; se pueden añadir NAD/NAT simples si el servicio lo solicita posteriormente.
