# Template Excel — Sjögren

> Hoja: `SJOGREN`. Revisión 2026-05-03.

---

## Columnas base (comunes a todas las hojas clínicas)

Ver `docs/CONTRATO_DATOS_REUMA_V2.md` sección 2.

---

## Columnas específicas Sjögren

### Identificación y contexto

35. `Fecha_Diagnostico`
36. `Inicio_Sintomas`

### Actividad y PROs

37. `ESSPRI_Result` (calculado como media de las 3 dimensiones)
38. `ESSPRI_Sequedad` (0-10)
39. `ESSPRI_Fatiga` (0-10)
40. `ESSPRI_Dolor` (0-10)
41. `ESSDAI_Result` (calculado desde los 12 dominios ponderados)
42. `EVA_Sequedad_Oral`
43. `EVA_Sequedad_Ocular`
44. `EVA_Fatiga`
45. `EVA_Dolor`
46. `EVA_Global`

#### Dominios ESSDAI (12 selectores 0-3)

Cada dominio se exporta con su nivel (0-3).

47. `essdaiConstitutional` — Constitucional (peso 3)
48. `essdaiLymphadenopathy` — Linfadenopatía (peso 4)
49. `essdaiGlandular` — Glandular (peso 2)
50. `essdaiArticular` — Articular (peso 2)
51. `essdaiCutaneous` — Cutáneo (peso 3)
52. `essdaiPulmonary` — Pulmonar (peso 5)
53. `essdaiRenal` — Renal (peso 5)
54. `essdaiMuscular` — Muscular (peso 6)
55. `essdaiPeripheralNervousSystem` — SN Periférico (peso 5)
56. `essdaiCentralNervousSystem` — SN Central (peso 5)
57. `essdaiHematological` — Hematológico (peso 2)
58. `essdaiBiological` — Biológico (peso 1)

#### EVAs específicos Sjögren

59. `esspriSequedad` — ESSPRI Sequedad (0-10, alias de `ESSPRI_Sequedad`)
60. `esspriDolor` — ESSPRI Dolor (0-10, alias de `ESSPRI_Dolor`)
61. `esspriFatiga` — ESSPRI Fatiga (0-10, alias de `ESSPRI_Fatiga`) 

### Manifestaciones por dominio

62. `Sjogren_Ocular`
63. `Sjogren_Oral`
64. `Sjogren_Glandular`
65. `Sjogren_Articular`
66. `Sjogren_Cutaneo`
67. `Sjogren_Pulmonar`
68. `Sjogren_Renal`
69. `Sjogren_Neurologico`
70. `Sjogren_Hematologico`
71. `Sjogren_Linfoma_Riesgo`
72. `Sjogren_Manifestaciones_Descripcion`

### Pruebas funcionales e inmunología

73. `ANA`
74. `FR`
75. `AntiRo`
76. `AntiLa`
77. `Complemento_C3`
78. `Complemento_C4`
79. `Crioglobulinas`
80. `Proteinograma`
81. `Biopsia_Glandula_Salival`
82. `Test_Schirmer`
83. `Tincion_Ocular`
84. `Flujo_Salival`
85. `Ecografia_Glandular`
86. `PCR`
87. `VSG`
88. `Otros_Hallazgos_Analitica`

### Tratamiento Sjögren específico

89. `Trat_Secante_Ocular`
90. `Trat_Secante_Ocular_Dosis`
91. `Trat_Secante_Oral`
92. `Trat_Secante_Oral_Dosis`
93. `Trat_Antiinflamatorio`
94. `Trat_Antiinflamatorio_Dosis`
95. `Trat_Corticoides`
96. `Trat_Corticoides_Dosis`
97. `Trat_Inmunosupresor`
98. `Trat_Inmunosupresor_Dosis`
99. `Trat_Biologico`
100. `Trat_Biologico_Dosis`

---

## Reglas de codificación

- `ESSPRI_Result`: media de las 3 dimensiones (sequedad, fatiga, dolor), 0–10, formateado a 2 decimales, o vacío.
- `ESSPRI_Sequedad`, `ESSPRI_Fatiga`, `ESSPRI_Dolor`: 0–10 cada una. Los campos `esspriSequedad`, `esspriFatiga`, `esspriDolor` son alias (IDs HTML).
- `ESSDAI_Result`: suma ponderada de los 12 dominios, calculado automáticamente, o vacío.
- Dominios ESSDAI (`essdai*`): nivel 0-3 (0=Sin actividad, 1=Baja, 2=Moderada, 3=Alta).
- `EVA_*`: 0–10 o vacío.
- Manifestaciones por dominio: `SI` / `NO` / `ND`.
- `Sjogren_Linfoma_Riesgo`: `SI` / `NO` / `ND` / `NA`.
- Inmunología: `positivo` / `negativo` / `ND` para serologías; valor numérico o vacío para complementos, PCR, VSG.
- Pruebas funcionales: resultado textual o vacío (ej. `Test_Schirmer = "3 mm/5 min"`).
- `Biopsia_Glandula_Salival`: `positiva` / `negativa` / `ND` / vacío.

---

## Notas de implementación

- El selector de patología usará `value="sjogren"`.
- `normalizePathology('Sjögren')` devuelve `'sjogren'`.
- No se requiere homúnculo articular completo para Sjögren en v1.
- `ESSPRI` y `ESSDAI` son los índices iniciales obligatorios; otros índices (SSI, DFI) pueden añadirse en revisiones posteriores.
