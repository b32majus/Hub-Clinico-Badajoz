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

37. `ESSPRI_Result`
38. `ESSPRI_Sequedad`
39. `ESSPRI_Fatiga`
40. `ESSPRI_Dolor`
41. `ESSDAI_Result`
42. `EVA_Sequedad_Oral`
43. `EVA_Sequedad_Ocular`
44. `EVA_Fatiga`
45. `EVA_Dolor`
46. `EVA_Global`

### Manifestaciones por dominio

47. `Sjogren_Ocular`
48. `Sjogren_Oral`
49. `Sjogren_Glandular`
50. `Sjogren_Articular`
51. `Sjogren_Cutaneo`
52. `Sjogren_Pulmonar`
53. `Sjogren_Renal`
54. `Sjogren_Neurologico`
55. `Sjogren_Hematologico`
56. `Sjogren_Linfoma_Riesgo`
57. `Sjogren_Manifestaciones_Descripcion`

### Pruebas funcionales e inmunología

58. `ANA`
59. `FR`
60. `AntiRo`
61. `AntiLa`
62. `Complemento_C3`
63. `Complemento_C4`
64. `Crioglobulinas`
65. `Proteinograma`
66. `Biopsia_Glandula_Salival`
67. `Test_Schirmer`
68. `Tincion_Ocular`
69. `Flujo_Salival`
70. `Ecografia_Glandular`
71. `PCR`
72. `VSG`
73. `Otros_Hallazgos_Analitica`

### Tratamiento Sjögren específico

74. `Trat_Secante_Ocular`
75. `Trat_Secante_Ocular_Dosis`
76. `Trat_Secante_Oral`
77. `Trat_Secante_Oral_Dosis`
78. `Trat_Antiinflamatorio`
79. `Trat_Antiinflamatorio_Dosis`
80. `Trat_Corticoides`
81. `Trat_Corticoides_Dosis`
82. `Trat_Inmunosupresor`
83. `Trat_Inmunosupresor_Dosis`
84. `Trat_Biologico`
85. `Trat_Biologico_Dosis`

---

## Reglas de codificación

- `ESSPRI_Result`: media de las 3 dimensiones (sequedad, fatiga, dolor), 0–10, o vacío.
- `ESSPRI_Sequedad`, `ESSPRI_Fatiga`, `ESSPRI_Dolor`: 0–10 cada una.
- `ESSDAI_Result`: valor numérico del índice, o vacío.
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
