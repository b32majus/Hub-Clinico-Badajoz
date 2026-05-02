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

37. `SLEDAI_Result`
38. `SLEDAI_2K_Result`
39. `SLICC_ACR_SDI`
40. `Dosis_Prednisona_Mg_Dia`
41. `Brote_Actual`
42. `Tipo_Brote`
43. `Actividad_Global_Medico`
44. `Actividad_Global_Paciente`

### Manifestaciones por órgano / dominio

45. `LES_Cutaneo`
46. `LES_Articular`
47. `LES_Renal`
48. `LES_Neurologico`
49. `LES_Hematologico`
50. `LES_Seroso`
51. `LES_Cardiopulmonar`
52. `LES_Vascular`
53. `LES_Ocular`
54. `LES_Otros`
55. `LES_Manifestaciones_Descripcion`

### Inmunología y analítica

56. `ANA`
57. `AntiDNA`
58. `AntiSm`
59. `AntiRo`
60. `AntiLa`
61. `Complemento_C3`
62. `Complemento_C4`
63. `Proteinuria`
64. `Sedimento_Urinario`
65. `Creatinina`
66. `PCR`
67. `VSG`
68. `Hemograma_Alteraciones`
69. `Otros_Hallazgos_Analitica`

### PROs e impacto

70. `EVA_Dolor`
71. `EVA_Fatiga`
72. `EVA_Global`
73. `Calidad_Vida_Comentario`

### Tratamiento LES específico

74. `Trat_Inmunosupresor`
75. `Trat_Inmunosupresor_Dosis`
76. `Trat_Antimalarico`
77. `Trat_Antimalarico_Dosis`
78. `Trat_Corticoides`
79. `Trat_Corticoides_Dosis`
80. `Trat_Biologico`
81. `Trat_Biologico_Dosis`

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
