# Contrato de Datos Unificado ESPA / APS

> Revisión 2024-10-31. Estructura única por patología con columna `Tipo_Visita` para distinguir primera visita y seguimiento. Todas las filas comparten la misma cabecera; los campos que no apliquen se rellenan con cadena vacía (`""`) o `NO`.

## 1. Cabeceras globales (orden definitivo)

1. `ID_Paciente`
2. `Nombre_Paciente`
3. `Sexo`
4. `Fecha_Visita`
5. `Tipo_Visita` (`primera`, `seguimiento`)
6. `Profesional`
7. `Diagnostico_Primario`
8. `Diagnostico_Secundario`
9. `HLA-B27`
10. `FR`
11. `aPCC`
12. `Inicio_Sintomas`
13. `Inicio_Psoriasis`
14. `Dolor_Axial`
15. `Rigidez_Matutina`
16. `Duracion_Rigidez`
17. `Irradiacion_Nalgas`
18. `Clinica_Axial_Presente`
19. `NAD_Total`
20. `NAT_Total`
21. `Dactilitis_Total`

## 2. Homúnculo – articulaciones (dos columnas por articulación)

Para cada articulación se registran dos columnas (`NAD_*`, `NAT_*`) con valores `SI`/`NO` según dolor o tumefacción.

| Articulación (`data-region-id`) | Columnas registradas |
| --- | --- |
| `hombro-derecho` / `hombro-izquierdo` | `NAD_Hombro_Derecho`, `NAT_Hombro_Derecho`, `NAD_Hombro_Izquierdo`, `NAT_Hombro_Izquierdo` |
| `codo-derecho` / `codo-izquierdo` | `NAD_Codo_Derecho`, `NAT_Codo_Derecho`, `NAD_Codo_Izquierdo`, `NAT_Codo_Izquierdo` |
| `muneca-derecha` / `muneca-izquierda` | `NAD_Muneca_Derecha`, `NAT_Muneca_Derecha`, `NAD_Muneca_Izquierda`, `NAT_Muneca_Izquierda` |
| `mcf1-5-derecha` / `mcf1-5-izquierda` | `NAD_MCF1_Derecha` … `NAD_MCF5_Izquierda`, `NAT_*` equivalente |
| `ifp1-5-derecha` / `ifp1-5-izquierda` | `NAD_IFP1_Derecha` … `NAD_IFP5_Izquierda`, `NAT_*` equivalente |
| `rodilla-derecha` / `rodilla-izquierda` | `NAD_Rodilla_Derecha`, `NAT_Rodilla_Derecha`, `NAD_Rodilla_Izquierda`, `NAT_Rodilla_Izquierda` |

> Nota: el número exacto de columnas resulta en 56 columnas dedicadas (28 articulaciones × 2).

## 3. Homúnculo – dactilitis

Diez columnas (`SI`/`NO`) por extremidad y dedo:

`Dactilitis_Dedo1_Mano_Derecha`, `Dactilitis_Dedo2_Mano_Derecha`, `…`, `Dactilitis_Dedo5_Mano_Izquierda`, `Dactilitis_Dedo1_Pie_Derecho`, `…`, `Dactilitis_Dedo5_Pie_Izquierdo`.

## 4. Variables clínicas y antecedentes (orden existente conservado)

22. `Peso`
23. `Talla`
24. `IMC`
25. `TA`
26. `Psoriasis_Cuero_Cabelludo`
27. `Psoriasis_Ungueal`
28. `Psoriasis_Extensora`
29. `Psoriasis_Pliegues`
30. `Psoriasis_Palmoplantar`
31. `ExtraArticular_Digestiva`
32. `ExtraArticular_Uveitis`
33. `ExtraArticular_Psoriasis`
34. `Comorbilidad_HTA`
35. `Comorbilidad_DM`
36. `Comorbilidad_DLP`
37. `Comorbilidad_ECV`
38. `Comorbilidad_Gastritis`
39. `Comorbilidad_Obesidad`
40. `Comorbilidad_Osteoporosis`
41. `Comorbilidad_Gota`
42. `AF_Psoriasis`
43. `AF_Artritis`
44. `AF_EII`
45. `AF_Uveitis`
46. `Toxico_Tabaco`
47. `Toxico_Tabaco_Desc`
48. `Toxico_Alcohol`
49. `Toxico_Alcohol_Desc`
50. `Toxico_Drogas`
51. `Toxico_Drogas_Desc`
52. `Entesitis_Aquiles_Der`
53. `Entesitis_Fascia_Der`
54. `Entesitis_Epicondilo_Lat_Der`
55. `Entesitis_Epicondilo_Med_Der`
56. `Entesitis_Trocanter_Der`
57. `Entesitis_Aquiles_Izq`
58. `Entesitis_Fascia_Izq`
59. `Entesitis_Epicondilo_Lat_Izq`
60. `Entesitis_Epicondilo_Med_Izq`
61. `Entesitis_Trocanter_Izq`
62. `Otras_Entesitis`
63. `Trat_Sistemico`
64. `Trat_Sistemico_Dosis`
65. `Trat_FAME`
66. `Trat_FAME_Dosis`
67. `Trat_Biologico`
68. `Trat_Biologico_Dosis`
69. `Tratamiento_Actual`
70. `Fecha_Inicio_Tratamiento`
71. `EVA_Global`
72. `EVA_Dolor`
73. `EVA_Fatiga`
74. `Rigidez_Matutina_Min`
75. `Dolor_Nocturno`
76. `PCR`
77. `VSG`
78. `Otros_Hallazgos_Analitica`
79. `Hallazgos_Radiografia`
80. `Hallazgos_RMN`

## 5. Índices de actividad y metrología

81. `BASDAI_P1`
82. `BASDAI_P2`
83. `BASDAI_P3`
84. `BASDAI_P4`
85. `BASDAI_P5`
86. `BASDAI_P6`
87. `BASDAI_Result`
88. `ASDAS_Dolor_Espalda`
89. `ASDAS_Duracion_Rigidez`
90. `ASDAS_EVA_Global`
91. `ASDAS_CRP_Result`
92. `ASDAS_ESR_Result`
93. `Schober`
94. `Rotacion_Cervical`
95. `Distancia_OP`
96. `Distancia_TP`
97. `Expansion_Toracica`
98. `Distancia_Intermaleolar`

> Cuando se incorporen índices específicos de APs (HAQ, LEI, RAPID3) se añadirán detrás de las métricas BASDAI/ASDAS conservando este bloque.

## 6. Decisión terapéutica y cierre

99. `Decision_Terapeutica`
100. `Continuar_Adherencia`
101. `Continuar_Ajuste_Terapeutico`
102. `Cambio_Motivo`
103. `Cambio_Efectos_Adversos`
104. `Cambio_Descripcion_Efectos`
105. `Cambio_Sistemico_Farmaco`
106. `Cambio_Sistemico_Dosis`
107. `Cambio_FAME_Farmaco`
108. `Cambio_FAME_Dosis`
109. `Cambio_Biologico_Farmaco`
110. `Cambio_Biologico_Dosis`
111. `Fecha_Proxima_Revision`
112. `Comentarios_Adicionales`

## 7. Consideraciones de carga

- Valores sin información → cadena vacía (`""`) salvo campos booleanos (`SI`/`NO`) donde se usará `NO`.
- Las exportaciones de primera visita poblarán columnas de seguimiento con `""`/`NO`.
- Las funciones `HubTools.data.*` utilizarán `Tipo_Visita` para ordenar correctamente el historial.
- El homúnculo se almacena de forma granular gracias a la exposición de `HubTools.homunculus.getHomunculusData()`.

