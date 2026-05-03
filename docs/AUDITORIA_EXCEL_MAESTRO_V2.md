# Auditoría Excel Maestro v2

> **Documento histórico. No usar como contrato vigente.**
> Conservado como evidencia de la auditoría inicial sobre el maestro histórico de 321 columnas.
> El contrato operativo actual es `docs/CONTRATO_DATOS_REUMA_V2.md` y `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`: 5 hojas clínicas, 491 columnas, prebiológico embebido por visita y Solicitud FH derivada no persistida.

> Fase A. Auditoría sin generación de demo y sin cambios funcionales. Esta auditoría trata el Excel maestro original como fuente principal de verdad contractual; el código se usa solo como contraste secundario.

## 1. Archivo maestro analizado
- Ruta: `C:\Users\b32ma\Documents\HUB Clinico Badajoz_v2\Hub_Clinico_Maestro.xlsx`
- Fecha/modificación: `2026-03-07T13:29:49`
- Tamaño: `144392` bytes
- Candidatos Excel localizados:
  - `C:\Users\b32ma\Documents\HUB Clinico Badajoz_v2\Hub_Clinico_Maestro.xlsx`: candidato maestro. Contiene hojas clínicas históricas con 321 columnas en AR/ESPA/APS.
  - `C:\Users\b32ma\Documents\HUB Clinico Badajoz_v2\data\Hub_Clinico_Maestro_V2_DEMO.xlsx`: demo v2 reducida existente. No debe usarse como fuente canónica porque no respeta las 321 columnas históricas.
- Hojas detectadas: `ESPA`, `APS`, `Fármacos`, `Profesionales`, `AR`

## 2. Resumen por hoja
| Hoja | Columnas | Filas | Observaciones |
|---|---:|---:|---|
| `ESPA` | 321 | 106 (105 datos) | Hoja clínica histórica con 321 columnas; Sin duplicados de cabecera; Sin columnas vacías en cabecera; Sin mojibake evidente en cabeceras |
| `APS` | 321 | 107 (106 datos) | Hoja clínica histórica con 321 columnas; Sin duplicados de cabecera; Sin columnas vacías en cabecera; Sin mojibake evidente en cabeceras |
| `Fármacos` | 3 | 52 (51 datos) | Sin duplicados de cabecera; Sin columnas vacías en cabecera; Sin mojibake evidente en cabeceras |
| `Profesionales` | 2 | 2 (1 datos) | Sin duplicados de cabecera; Sin columnas vacías en cabecera; Sin mojibake evidente en cabeceras |
| `AR` | 321 | 37 (36 datos) | Hoja clínica histórica con 321 columnas; Sin duplicados de cabecera; Sin columnas vacías en cabecera; Sin mojibake evidente en cabeceras |

## 3. Cabeceras por hoja
### ESPA
- Columnas: `321`
- Filas: `106` (`105` filas de datos)
- Columnas duplicadas: `ninguna`
- Columnas vacías: `ninguna`
- Caracteres raros/mojibake: `ninguno detectado en cabeceras`
- Cabeceras exactas en orden:

```text
1. ID_Paciente
2. Nombre_Paciente
3. Sexo
4. Fecha_Visita
5. Tipo_Visita
6. Profesional
7. Diagnostico_Primario
8. Diagnostico_Secundario
9. HLA_B27
10. FR
11. APCC
12. Inicio_Sintomas
13. Inicio_Psoriasis
14. Dolor_Axial
15. Rigidez_Matutina
16. Duracion_Rigidez
17. Irradiacion_Nalgas
18. Clinica_Axial_Presente
19. NAD_hombro_derecho
20. NAD_hombro_izquierdo
21. NAD_codo_derecho
22. NAD_codo_izquierdo
23. NAD_muneca_derecha
24. NAD_muneca_izquierda
25. NAD_rodilla_derecha
26. NAD_rodilla_izquierda
27. NAD_mcf1_derecha
28. NAD_mcf2_derecha
29. NAD_mcf3_derecha
30. NAD_mcf4_derecha
31. NAD_mcf5_derecha
32. NAD_mcf1_izquierda
33. NAD_mcf2_izquierda
34. NAD_mcf3_izquierda
35. NAD_mcf4_izquierda
36. NAD_mcf5_izquierda
37. NAD_ifp1_derecha
38. NAD_ifp2_derecha
39. NAD_ifp3_derecha
40. NAD_ifp4_derecha
41. NAD_ifp5_derecha
42. NAD_ifp1_izquierda
43. NAD_ifp2_izquierda
44. NAD_ifp3_izquierda
45. NAD_ifp4_izquierda
46. NAD_ifp5_izquierda
47. NAT_hombro_derecho
48. NAT_hombro_izquierdo
49. NAT_codo_derecho
50. NAT_codo_izquierdo
51. NAT_muneca_derecha
52. NAT_muneca_izquierda
53. NAT_rodilla_derecha
54. NAT_rodilla_izquierda
55. NAT_mcf1_derecha
56. NAT_mcf2_derecha
57. NAT_mcf3_derecha
58. NAT_mcf4_derecha
59. NAT_mcf5_derecha
60. NAT_mcf1_izquierda
61. NAT_mcf2_izquierda
62. NAT_mcf3_izquierda
63. NAT_mcf4_izquierda
64. NAT_mcf5_izquierda
65. NAT_ifp1_derecha
66. NAT_ifp2_derecha
67. NAT_ifp3_derecha
68. NAT_ifp4_derecha
69. NAT_ifp5_derecha
70. NAT_ifp1_izquierda
71. NAT_ifp2_izquierda
72. NAT_ifp3_izquierda
73. NAT_ifp4_izquierda
74. NAT_ifp5_izquierda
75. DACT_dedo1_mano_derecha
76. DACT_dedo2_mano_derecha
77. DACT_dedo3_mano_derecha
78. DACT_dedo4_mano_derecha
79. DACT_dedo5_mano_derecha
80. DACT_dedo1_mano_izquierda
81. DACT_dedo2_mano_izquierda
82. DACT_dedo3_mano_izquierda
83. DACT_dedo4_mano_izquierda
84. DACT_dedo5_mano_izquierda
85. DACT_dedo1_pie_derecho
86. DACT_dedo2_pie_derecho
87. DACT_dedo3_pie_derecho
88. DACT_dedo4_pie_derecho
89. DACT_dedo5_pie_derecho
90. DACT_dedo1_pie_izquierdo
91. DACT_dedo2_pie_izquierdo
92. DACT_dedo3_pie_izquierdo
93. DACT_dedo4_pie_izquierdo
94. DACT_dedo5_pie_izquierdo
95. NAD_Total
96. NAT_Total
97. Dactilitis_Total
98. Peso
99. Talla
100. IMC
101. TA
102. EVA_Global
103. EVA_Dolor
104. EVA_Fatiga
105. Rigidez_Matutina_Min
106. Dolor_Nocturno
107. Psoriasis_Cuero_Cabelludo
108. Psoriasis_Ungueal
109. Psoriasis_Extensora
110. Psoriasis_Pliegues
111. Psoriasis_Palmoplantar
112. ExtraArticular_Digestiva
113. ExtraArticular_Uveitis
114. ExtraArticular_Psoriasis
115. Comorbilidad_HTA
116. Comorbilidad_DM
117. Comorbilidad_DLP
118. Comorbilidad_ECV
119. Comorbilidad_Gastritis
120. Comorbilidad_Obesidad
121. Comorbilidad_Osteoporosis
122. Comorbilidad_Gota
123. AF_Psoriasis
124. AF_Artritis
125. AF_EII
126. AF_Uveitis
127. Toxico_Tabaco
128. Toxico_Tabaco_Desc
129. Toxico_Alcohol
130. Toxico_Alcohol_Desc
131. Toxico_Drogas
132. Toxico_Drogas_Desc
133. Entesitis_Aquiles_Der
134. Entesitis_Fascia_Der
135. Entesitis_Epicondilo_Lat_Der
136. Entesitis_Epicondilo_Med_Der
137. Entesitis_Trocanter_Der
138. Entesitis_Aquiles_Izq
139. Entesitis_Fascia_Izq
140. Entesitis_Epicondilo_Lat_Izq
141. Entesitis_Epicondilo_Med_Izq
142. Entesitis_Trocanter_Izq
143. Otras_Entesitis
144. PCR
145. VSG
146. Otros_Hallazgos_Analitica
147. Hallazgos_Radiografia
148. Hallazgos_RMN
149. BASDAI_P1
150. BASDAI_P2
151. BASDAI_P3
152. BASDAI_P4
153. BASDAI_P5
154. BASDAI_P6
155. BASDAI_Result
156. ASDAS_Dolor_Espalda
157. ASDAS_Duracion_Rigidez
158. ASDAS_EVA_Global
159. ASDAS_CRP_Result
160. ASDAS_ESR_Result
161. Schober
162. Rotacion_Cervical
163. Distancia_OP
164. Distancia_TP
165. Expansion_Toracica
166. Distancia_Intermaleolar
167. PASI_Score
168. BSA_Percentage
169. Psoriasis_Descripcion
170. HAQ_Vestirse
171. HAQ_Levantarse
172. HAQ_Comer
173. HAQ_Caminar
174. HAQ_Higiene
175. HAQ_Alcanzar
176. HAQ_Agarrar
177. HAQ_Actividades
178. HAQ_Total
179. LEI_Epicondilo_Lat_Izq
180. LEI_Epicondilo_Lat_Der
181. LEI_Epicondilo_Med_Izq
182. LEI_Epicondilo_Med_Der
183. LEI_Aquiles_Izq
184. LEI_Aquiles_Der
185. LEI_Score
186. MDA_NAT
187. MDA_NAD
188. MDA_PASI
189. MDA_Dolor
190. MDA_Global
191. MDA_HAQ
192. MDA_Entesitis
193. MDA_Cumple
194. RAPID3_Funcion
195. RAPID3_Dolor
196. RAPID3_Global
197. RAPID3_Score
198. Tratamiento_Actual
199. Fecha_Inicio_Tratamiento
200. Decision_Terapeutica_PV
201. Continuar_Adherencia
202. Continuar_Ajuste_Terapeutico
203. Cambio_Motivo
204. Cambio_Efectos_Adversos
205. Cambio_Descripcion_Efectos
206. Cambio_Sistemico_Farmaco
207. Cambio_Sistemico_Dosis
208. Cambio_FAME_Farmaco
209. Cambio_FAME_Dosis
210. Cambio_Biologico_Farmaco
211. Cambio_Biologico_Dosis
212. Decision_Terapeutica_SEG
213. Trat_Sistemico
214. Trat_Sistemico_Dosis
215. Trat_FAME
216. Trat_FAME_Dosis
217. Trat_Biologico
218. Trat_Biologico_Dosis
219. Fecha_Proxima_Revision
220. Comentarios_Adicionales
221. Trat_Sistemico_2
222. Trat_Sistemico_Dosis_2
223. Trat_Sistemico_3
224. Trat_Sistemico_Dosis_3
225. Trat_FAME_2
226. Trat_FAME_Dosis_2
227. Trat_FAME_3
228. Trat_FAME_Dosis_3
229. Trat_Biologico_2
230. Trat_Biologico_Dosis_2
231. Trat_Biologico_3
232. Trat_Biologico_Dosis_3
233. Cambio_Sistemico_Farmaco_2
234. Cambio_Sistemico_Dosis_2
235. Cambio_Sistemico_Farmaco_3
236. Cambio_Sistemico_Dosis_3
237. Cambio_FAME_Farmaco_2
238. Cambio_FAME_Dosis_2
239. Cambio_FAME_Farmaco_3
240. Cambio_FAME_Dosis_3
241. Cambio_Biologico_Farmaco_2
242. Cambio_Biologico_Dosis_2
243. Cambio_Biologico_Farmaco_3
244. Cambio_Biologico_Dosis_3
245. Previo_Sistemico_1
246. Previo_Sistemico_Dosis_1
247. Previo_Sistemico_2
248. Previo_Sistemico_Dosis_2
249. Previo_Sistemico_3
250. Previo_Sistemico_Dosis_3
251. Previo_FAME_1
252. Previo_FAME_Dosis_1
253. Previo_FAME_2
254. Previo_FAME_Dosis_2
255. Previo_FAME_3
256. Previo_FAME_Dosis_3
257. Previo_Biologico_1
258. Previo_Biologico_Dosis_1
259. Previo_Biologico_2
260. Previo_Biologico_Dosis_2
261. Previo_Biologico_3
262. Previo_Biologico_Dosis_3
263. Psoriasis_Sistemico_1
264. Psoriasis_Sistemico_Dosis_1
265. Psoriasis_Sistemico_2
266. Psoriasis_Sistemico_Dosis_2
267. Psoriasis_Sistemico_3
268. Psoriasis_Sistemico_Dosis_3
269. ANA
270. NAD28
271. NAT28
272. DAS28_CRP_Result
273. DAS28_ESR_Result
274. CDAI_Result
275. SDAI_Result
276. EVA_Medico
277. ACR_Articulaciones
278. ACR_Serologia
279. ACR_Reactantes
280. ACR_Duracion
281. ACR_Total
282. ACR_Resultado_Texto
283. Rigidez_Matutina_AR
284. Nodulos_Reumatoideos
285. Nodulos_Localizacion
286. Erosiones_Radiologicas
287. Erosiones_Descripcion
288. ExtraAR_Pulmonar_NIU
289. ExtraAR_Pulmonar_NINE
290. ExtraAR_Nodulos_Pulmonares
291. ExtraAR_Derrame_Pleural
292. ExtraAR_Epiescleritis
293. ExtraAR_Escleritis
294. ExtraAR_Queratitis
295. ExtraAR_Vasculitis
296. ExtraAR_Anemia
297. ExtraAR_Felty
298. ExtraAR_Neuropatia
299. ExtraAR_Compresion_Medular
300. ExtraAR_Pericarditis
301. ExtraAR_Amiloidosis
302. Sjogren_Ocular
303. Sjogren_Oral
304. MDHAQ_A
305. MDHAQ_B
306. MDHAQ_C
307. MDHAQ_D
308. MDHAQ_E
309. MDHAQ_F
310. MDHAQ_G
311. MDHAQ_H
312. MDHAQ_I
313. MDHAQ_J
314. RAPID3_Categoria
315. Maniobras_Sacroiliacas
316. Comentarios_Sacroiliacas
317. ASAS_Lumbalgia_3m
318. ASAS_Criterios_Cumplidos
319. ASAS_Resultado
320. CASPAR_Puntuacion
321. CASPAR_Resultado
```

### APS
- Columnas: `321`
- Filas: `107` (`106` filas de datos)
- Columnas duplicadas: `ninguna`
- Columnas vacías: `ninguna`
- Caracteres raros/mojibake: `ninguno detectado en cabeceras`
- Cabeceras exactas en orden:

```text
1. ID_Paciente
2. Nombre_Paciente
3. Sexo
4. Fecha_Visita
5. Tipo_Visita
6. Profesional
7. Diagnostico_Primario
8. Diagnostico_Secundario
9. HLA_B27
10. FR
11. APCC
12. Inicio_Sintomas
13. Inicio_Psoriasis
14. Dolor_Axial
15. Rigidez_Matutina
16. Duracion_Rigidez
17. Irradiacion_Nalgas
18. Clinica_Axial_Presente
19. NAD_hombro_derecho
20. NAD_hombro_izquierdo
21. NAD_codo_derecho
22. NAD_codo_izquierdo
23. NAD_muneca_derecha
24. NAD_muneca_izquierda
25. NAD_rodilla_derecha
26. NAD_rodilla_izquierda
27. NAD_mcf1_derecha
28. NAD_mcf2_derecha
29. NAD_mcf3_derecha
30. NAD_mcf4_derecha
31. NAD_mcf5_derecha
32. NAD_mcf1_izquierda
33. NAD_mcf2_izquierda
34. NAD_mcf3_izquierda
35. NAD_mcf4_izquierda
36. NAD_mcf5_izquierda
37. NAD_ifp1_derecha
38. NAD_ifp2_derecha
39. NAD_ifp3_derecha
40. NAD_ifp4_derecha
41. NAD_ifp5_derecha
42. NAD_ifp1_izquierda
43. NAD_ifp2_izquierda
44. NAD_ifp3_izquierda
45. NAD_ifp4_izquierda
46. NAD_ifp5_izquierda
47. NAT_hombro_derecho
48. NAT_hombro_izquierdo
49. NAT_codo_derecho
50. NAT_codo_izquierdo
51. NAT_muneca_derecha
52. NAT_muneca_izquierda
53. NAT_rodilla_derecha
54. NAT_rodilla_izquierda
55. NAT_mcf1_derecha
56. NAT_mcf2_derecha
57. NAT_mcf3_derecha
58. NAT_mcf4_derecha
59. NAT_mcf5_derecha
60. NAT_mcf1_izquierda
61. NAT_mcf2_izquierda
62. NAT_mcf3_izquierda
63. NAT_mcf4_izquierda
64. NAT_mcf5_izquierda
65. NAT_ifp1_derecha
66. NAT_ifp2_derecha
67. NAT_ifp3_derecha
68. NAT_ifp4_derecha
69. NAT_ifp5_derecha
70. NAT_ifp1_izquierda
71. NAT_ifp2_izquierda
72. NAT_ifp3_izquierda
73. NAT_ifp4_izquierda
74. NAT_ifp5_izquierda
75. DACT_dedo1_mano_derecha
76. DACT_dedo2_mano_derecha
77. DACT_dedo3_mano_derecha
78. DACT_dedo4_mano_derecha
79. DACT_dedo5_mano_derecha
80. DACT_dedo1_mano_izquierda
81. DACT_dedo2_mano_izquierda
82. DACT_dedo3_mano_izquierda
83. DACT_dedo4_mano_izquierda
84. DACT_dedo5_mano_izquierda
85. DACT_dedo1_pie_derecho
86. DACT_dedo2_pie_derecho
87. DACT_dedo3_pie_derecho
88. DACT_dedo4_pie_derecho
89. DACT_dedo5_pie_derecho
90. DACT_dedo1_pie_izquierdo
91. DACT_dedo2_pie_izquierdo
92. DACT_dedo3_pie_izquierdo
93. DACT_dedo4_pie_izquierdo
94. DACT_dedo5_pie_izquierdo
95. NAD_Total
96. NAT_Total
97. Dactilitis_Total
98. Peso
99. Talla
100. IMC
101. TA
102. EVA_Global
103. EVA_Dolor
104. EVA_Fatiga
105. Rigidez_Matutina_Min
106. Dolor_Nocturno
107. Psoriasis_Cuero_Cabelludo
108. Psoriasis_Ungueal
109. Psoriasis_Extensora
110. Psoriasis_Pliegues
111. Psoriasis_Palmoplantar
112. ExtraArticular_Digestiva
113. ExtraArticular_Uveitis
114. ExtraArticular_Psoriasis
115. Comorbilidad_HTA
116. Comorbilidad_DM
117. Comorbilidad_DLP
118. Comorbilidad_ECV
119. Comorbilidad_Gastritis
120. Comorbilidad_Obesidad
121. Comorbilidad_Osteoporosis
122. Comorbilidad_Gota
123. AF_Psoriasis
124. AF_Artritis
125. AF_EII
126. AF_Uveitis
127. Toxico_Tabaco
128. Toxico_Tabaco_Desc
129. Toxico_Alcohol
130. Toxico_Alcohol_Desc
131. Toxico_Drogas
132. Toxico_Drogas_Desc
133. Entesitis_Aquiles_Der
134. Entesitis_Fascia_Der
135. Entesitis_Epicondilo_Lat_Der
136. Entesitis_Epicondilo_Med_Der
137. Entesitis_Trocanter_Der
138. Entesitis_Aquiles_Izq
139. Entesitis_Fascia_Izq
140. Entesitis_Epicondilo_Lat_Izq
141. Entesitis_Epicondilo_Med_Izq
142. Entesitis_Trocanter_Izq
143. Otras_Entesitis
144. PCR
145. VSG
146. Otros_Hallazgos_Analitica
147. Hallazgos_Radiografia
148. Hallazgos_RMN
149. BASDAI_P1
150. BASDAI_P2
151. BASDAI_P3
152. BASDAI_P4
153. BASDAI_P5
154. BASDAI_P6
155. BASDAI_Result
156. ASDAS_Dolor_Espalda
157. ASDAS_Duracion_Rigidez
158. ASDAS_EVA_Global
159. ASDAS_CRP_Result
160. ASDAS_ESR_Result
161. Schober
162. Rotacion_Cervical
163. Distancia_OP
164. Distancia_TP
165. Expansion_Toracica
166. Distancia_Intermaleolar
167. PASI_Score
168. BSA_Percentage
169. Psoriasis_Descripcion
170. HAQ_Vestirse
171. HAQ_Levantarse
172. HAQ_Comer
173. HAQ_Caminar
174. HAQ_Higiene
175. HAQ_Alcanzar
176. HAQ_Agarrar
177. HAQ_Actividades
178. HAQ_Total
179. LEI_Epicondilo_Lat_Izq
180. LEI_Epicondilo_Lat_Der
181. LEI_Epicondilo_Med_Izq
182. LEI_Epicondilo_Med_Der
183. LEI_Aquiles_Izq
184. LEI_Aquiles_Der
185. LEI_Score
186. MDA_NAT
187. MDA_NAD
188. MDA_PASI
189. MDA_Dolor
190. MDA_Global
191. MDA_HAQ
192. MDA_Entesitis
193. MDA_Cumple
194. RAPID3_Funcion
195. RAPID3_Dolor
196. RAPID3_Global
197. RAPID3_Score
198. Tratamiento_Actual
199. Fecha_Inicio_Tratamiento
200. Decision_Terapeutica_PV
201. Continuar_Adherencia
202. Continuar_Ajuste_Terapeutico
203. Cambio_Motivo
204. Cambio_Efectos_Adversos
205. Cambio_Descripcion_Efectos
206. Cambio_Sistemico_Farmaco
207. Cambio_Sistemico_Dosis
208. Cambio_FAME_Farmaco
209. Cambio_FAME_Dosis
210. Cambio_Biologico_Farmaco
211. Cambio_Biologico_Dosis
212. Decision_Terapeutica_SEG
213. Trat_Sistemico
214. Trat_Sistemico_Dosis
215. Trat_FAME
216. Trat_FAME_Dosis
217. Trat_Biologico
218. Trat_Biologico_Dosis
219. Fecha_Proxima_Revision
220. Comentarios_Adicionales
221. Trat_Sistemico_2
222. Trat_Sistemico_Dosis_2
223. Trat_Sistemico_3
224. Trat_Sistemico_Dosis_3
225. Trat_FAME_2
226. Trat_FAME_Dosis_2
227. Trat_FAME_3
228. Trat_FAME_Dosis_3
229. Trat_Biologico_2
230. Trat_Biologico_Dosis_2
231. Trat_Biologico_3
232. Trat_Biologico_Dosis_3
233. Cambio_Sistemico_Farmaco_2
234. Cambio_Sistemico_Dosis_2
235. Cambio_Sistemico_Farmaco_3
236. Cambio_Sistemico_Dosis_3
237. Cambio_FAME_Farmaco_2
238. Cambio_FAME_Dosis_2
239. Cambio_FAME_Farmaco_3
240. Cambio_FAME_Dosis_3
241. Cambio_Biologico_Farmaco_2
242. Cambio_Biologico_Dosis_2
243. Cambio_Biologico_Farmaco_3
244. Cambio_Biologico_Dosis_3
245. Previo_Sistemico_1
246. Previo_Sistemico_Dosis_1
247. Previo_Sistemico_2
248. Previo_Sistemico_Dosis_2
249. Previo_Sistemico_3
250. Previo_Sistemico_Dosis_3
251. Previo_FAME_1
252. Previo_FAME_Dosis_1
253. Previo_FAME_2
254. Previo_FAME_Dosis_2
255. Previo_FAME_3
256. Previo_FAME_Dosis_3
257. Previo_Biologico_1
258. Previo_Biologico_Dosis_1
259. Previo_Biologico_2
260. Previo_Biologico_Dosis_2
261. Previo_Biologico_3
262. Previo_Biologico_Dosis_3
263. Psoriasis_Sistemico_1
264. Psoriasis_Sistemico_Dosis_1
265. Psoriasis_Sistemico_2
266. Psoriasis_Sistemico_Dosis_2
267. Psoriasis_Sistemico_3
268. Psoriasis_Sistemico_Dosis_3
269. ANA
270. NAD28
271. NAT28
272. DAS28_CRP_Result
273. DAS28_ESR_Result
274. CDAI_Result
275. SDAI_Result
276. EVA_Medico
277. ACR_Articulaciones
278. ACR_Serologia
279. ACR_Reactantes
280. ACR_Duracion
281. ACR_Total
282. ACR_Resultado_Texto
283. Rigidez_Matutina_AR
284. Nodulos_Reumatoideos
285. Nodulos_Localizacion
286. Erosiones_Radiologicas
287. Erosiones_Descripcion
288. ExtraAR_Pulmonar_NIU
289. ExtraAR_Pulmonar_NINE
290. ExtraAR_Nodulos_Pulmonares
291. ExtraAR_Derrame_Pleural
292. ExtraAR_Epiescleritis
293. ExtraAR_Escleritis
294. ExtraAR_Queratitis
295. ExtraAR_Vasculitis
296. ExtraAR_Anemia
297. ExtraAR_Felty
298. ExtraAR_Neuropatia
299. ExtraAR_Compresion_Medular
300. ExtraAR_Pericarditis
301. ExtraAR_Amiloidosis
302. Sjogren_Ocular
303. Sjogren_Oral
304. MDHAQ_A
305. MDHAQ_B
306. MDHAQ_C
307. MDHAQ_D
308. MDHAQ_E
309. MDHAQ_F
310. MDHAQ_G
311. MDHAQ_H
312. MDHAQ_I
313. MDHAQ_J
314. RAPID3_Categoria
315. Maniobras_Sacroiliacas
316. Comentarios_Sacroiliacas
317. ASAS_Lumbalgia_3m
318. ASAS_Criterios_Cumplidos
319. ASAS_Resultado
320. CASPAR_Puntuacion
321. CASPAR_Resultado
```

### Fármacos
- Columnas: `3`
- Filas: `52` (`51` filas de datos)
- Columnas duplicadas: `ninguna`
- Columnas vacías: `ninguna`
- Caracteres raros/mojibake: `ninguno detectado en cabeceras`
- Cabeceras exactas en orden:

```text
1. Sistemicos
2. FAMEs
3. Biologicos
```

### Profesionales
- Columnas: `2`
- Filas: `2` (`1` filas de datos)
- Columnas duplicadas: `ninguna`
- Columnas vacías: `ninguna`
- Caracteres raros/mojibake: `ninguno detectado en cabeceras`
- Cabeceras exactas en orden:

```text
1. Nombre
2. Cargo
```

### AR
- Columnas: `321`
- Filas: `37` (`36` filas de datos)
- Columnas duplicadas: `ninguna`
- Columnas vacías: `ninguna`
- Caracteres raros/mojibake: `ninguno detectado en cabeceras`
- Cabeceras exactas en orden:

```text
1. ID_Paciente
2. Nombre_Paciente
3. Sexo
4. Fecha_Visita
5. Tipo_Visita
6. Profesional
7. Diagnostico_Primario
8. Diagnostico_Secundario
9. HLA_B27
10. FR
11. APCC
12. Inicio_Sintomas
13. Inicio_Psoriasis
14. Dolor_Axial
15. Rigidez_Matutina
16. Duracion_Rigidez
17. Irradiacion_Nalgas
18. Clinica_Axial_Presente
19. NAD_hombro_derecho
20. NAD_hombro_izquierdo
21. NAD_codo_derecho
22. NAD_codo_izquierdo
23. NAD_muneca_derecha
24. NAD_muneca_izquierda
25. NAD_rodilla_derecha
26. NAD_rodilla_izquierda
27. NAD_mcf1_derecha
28. NAD_mcf2_derecha
29. NAD_mcf3_derecha
30. NAD_mcf4_derecha
31. NAD_mcf5_derecha
32. NAD_mcf1_izquierda
33. NAD_mcf2_izquierda
34. NAD_mcf3_izquierda
35. NAD_mcf4_izquierda
36. NAD_mcf5_izquierda
37. NAD_ifp1_derecha
38. NAD_ifp2_derecha
39. NAD_ifp3_derecha
40. NAD_ifp4_derecha
41. NAD_ifp5_derecha
42. NAD_ifp1_izquierda
43. NAD_ifp2_izquierda
44. NAD_ifp3_izquierda
45. NAD_ifp4_izquierda
46. NAD_ifp5_izquierda
47. NAT_hombro_derecho
48. NAT_hombro_izquierdo
49. NAT_codo_derecho
50. NAT_codo_izquierdo
51. NAT_muneca_derecha
52. NAT_muneca_izquierda
53. NAT_rodilla_derecha
54. NAT_rodilla_izquierda
55. NAT_mcf1_derecha
56. NAT_mcf2_derecha
57. NAT_mcf3_derecha
58. NAT_mcf4_derecha
59. NAT_mcf5_derecha
60. NAT_mcf1_izquierda
61. NAT_mcf2_izquierda
62. NAT_mcf3_izquierda
63. NAT_mcf4_izquierda
64. NAT_mcf5_izquierda
65. NAT_ifp1_derecha
66. NAT_ifp2_derecha
67. NAT_ifp3_derecha
68. NAT_ifp4_derecha
69. NAT_ifp5_derecha
70. NAT_ifp1_izquierda
71. NAT_ifp2_izquierda
72. NAT_ifp3_izquierda
73. NAT_ifp4_izquierda
74. NAT_ifp5_izquierda
75. DACT_dedo1_mano_derecha
76. DACT_dedo2_mano_derecha
77. DACT_dedo3_mano_derecha
78. DACT_dedo4_mano_derecha
79. DACT_dedo5_mano_derecha
80. DACT_dedo1_mano_izquierda
81. DACT_dedo2_mano_izquierda
82. DACT_dedo3_mano_izquierda
83. DACT_dedo4_mano_izquierda
84. DACT_dedo5_mano_izquierda
85. DACT_dedo1_pie_derecho
86. DACT_dedo2_pie_derecho
87. DACT_dedo3_pie_derecho
88. DACT_dedo4_pie_derecho
89. DACT_dedo5_pie_derecho
90. DACT_dedo1_pie_izquierdo
91. DACT_dedo2_pie_izquierdo
92. DACT_dedo3_pie_izquierdo
93. DACT_dedo4_pie_izquierdo
94. DACT_dedo5_pie_izquierdo
95. NAD_Total
96. NAT_Total
97. Dactilitis_Total
98. Peso
99. Talla
100. IMC
101. TA
102. EVA_Global
103. EVA_Dolor
104. EVA_Fatiga
105. Rigidez_Matutina_Min
106. Dolor_Nocturno
107. Psoriasis_Cuero_Cabelludo
108. Psoriasis_Ungueal
109. Psoriasis_Extensora
110. Psoriasis_Pliegues
111. Psoriasis_Palmoplantar
112. ExtraArticular_Digestiva
113. ExtraArticular_Uveitis
114. ExtraArticular_Psoriasis
115. Comorbilidad_HTA
116. Comorbilidad_DM
117. Comorbilidad_DLP
118. Comorbilidad_ECV
119. Comorbilidad_Gastritis
120. Comorbilidad_Obesidad
121. Comorbilidad_Osteoporosis
122. Comorbilidad_Gota
123. AF_Psoriasis
124. AF_Artritis
125. AF_EII
126. AF_Uveitis
127. Toxico_Tabaco
128. Toxico_Tabaco_Desc
129. Toxico_Alcohol
130. Toxico_Alcohol_Desc
131. Toxico_Drogas
132. Toxico_Drogas_Desc
133. Entesitis_Aquiles_Der
134. Entesitis_Fascia_Der
135. Entesitis_Epicondilo_Lat_Der
136. Entesitis_Epicondilo_Med_Der
137. Entesitis_Trocanter_Der
138. Entesitis_Aquiles_Izq
139. Entesitis_Fascia_Izq
140. Entesitis_Epicondilo_Lat_Izq
141. Entesitis_Epicondilo_Med_Izq
142. Entesitis_Trocanter_Izq
143. Otras_Entesitis
144. PCR
145. VSG
146. Otros_Hallazgos_Analitica
147. Hallazgos_Radiografia
148. Hallazgos_RMN
149. BASDAI_P1
150. BASDAI_P2
151. BASDAI_P3
152. BASDAI_P4
153. BASDAI_P5
154. BASDAI_P6
155. BASDAI_Result
156. ASDAS_Dolor_Espalda
157. ASDAS_Duracion_Rigidez
158. ASDAS_EVA_Global
159. ASDAS_CRP_Result
160. ASDAS_ESR_Result
161. Schober
162. Rotacion_Cervical
163. Distancia_OP
164. Distancia_TP
165. Expansion_Toracica
166. Distancia_Intermaleolar
167. PASI_Score
168. BSA_Percentage
169. Psoriasis_Descripcion
170. HAQ_Vestirse
171. HAQ_Levantarse
172. HAQ_Comer
173. HAQ_Caminar
174. HAQ_Higiene
175. HAQ_Alcanzar
176. HAQ_Agarrar
177. HAQ_Actividades
178. HAQ_Total
179. LEI_Epicondilo_Lat_Izq
180. LEI_Epicondilo_Lat_Der
181. LEI_Epicondilo_Med_Izq
182. LEI_Epicondilo_Med_Der
183. LEI_Aquiles_Izq
184. LEI_Aquiles_Der
185. LEI_Score
186. MDA_NAT
187. MDA_NAD
188. MDA_PASI
189. MDA_Dolor
190. MDA_Global
191. MDA_HAQ
192. MDA_Entesitis
193. MDA_Cumple
194. RAPID3_Funcion
195. RAPID3_Dolor
196. RAPID3_Global
197. RAPID3_Score
198. Tratamiento_Actual
199. Fecha_Inicio_Tratamiento
200. Decision_Terapeutica_PV
201. Continuar_Adherencia
202. Continuar_Ajuste_Terapeutico
203. Cambio_Motivo
204. Cambio_Efectos_Adversos
205. Cambio_Descripcion_Efectos
206. Cambio_Sistemico_Farmaco
207. Cambio_Sistemico_Dosis
208. Cambio_FAME_Farmaco
209. Cambio_FAME_Dosis
210. Cambio_Biologico_Farmaco
211. Cambio_Biologico_Dosis
212. Decision_Terapeutica_SEG
213. Trat_Sistemico
214. Trat_Sistemico_Dosis
215. Trat_FAME
216. Trat_FAME_Dosis
217. Trat_Biologico
218. Trat_Biologico_Dosis
219. Fecha_Proxima_Revision
220. Comentarios_Adicionales
221. Trat_Sistemico_2
222. Trat_Sistemico_Dosis_2
223. Trat_Sistemico_3
224. Trat_Sistemico_Dosis_3
225. Trat_FAME_2
226. Trat_FAME_Dosis_2
227. Trat_FAME_3
228. Trat_FAME_Dosis_3
229. Trat_Biologico_2
230. Trat_Biologico_Dosis_2
231. Trat_Biologico_3
232. Trat_Biologico_Dosis_3
233. Cambio_Sistemico_Farmaco_2
234. Cambio_Sistemico_Dosis_2
235. Cambio_Sistemico_Farmaco_3
236. Cambio_Sistemico_Dosis_3
237. Cambio_FAME_Farmaco_2
238. Cambio_FAME_Dosis_2
239. Cambio_FAME_Farmaco_3
240. Cambio_FAME_Dosis_3
241. Cambio_Biologico_Farmaco_2
242. Cambio_Biologico_Dosis_2
243. Cambio_Biologico_Farmaco_3
244. Cambio_Biologico_Dosis_3
245. Previo_Sistemico_1
246. Previo_Sistemico_Dosis_1
247. Previo_Sistemico_2
248. Previo_Sistemico_Dosis_2
249. Previo_Sistemico_3
250. Previo_Sistemico_Dosis_3
251. Previo_FAME_1
252. Previo_FAME_Dosis_1
253. Previo_FAME_2
254. Previo_FAME_Dosis_2
255. Previo_FAME_3
256. Previo_FAME_Dosis_3
257. Previo_Biologico_1
258. Previo_Biologico_Dosis_1
259. Previo_Biologico_2
260. Previo_Biologico_Dosis_2
261. Previo_Biologico_3
262. Previo_Biologico_Dosis_3
263. Psoriasis_Sistemico_1
264. Psoriasis_Sistemico_Dosis_1
265. Psoriasis_Sistemico_2
266. Psoriasis_Sistemico_Dosis_2
267. Psoriasis_Sistemico_3
268. Psoriasis_Sistemico_Dosis_3
269. ANA
270. NAD28
271. NAT28
272. DAS28_CRP_Result
273. DAS28_ESR_Result
274. CDAI_Result
275. SDAI_Result
276. EVA_Medico
277. ACR_Articulaciones
278. ACR_Serologia
279. ACR_Reactantes
280. ACR_Duracion
281. ACR_Total
282. ACR_Resultado_Texto
283. Rigidez_Matutina_AR
284. Nodulos_Reumatoideos
285. Nodulos_Localizacion
286. Erosiones_Radiologicas
287. Erosiones_Descripcion
288. ExtraAR_Pulmonar_NIU
289. ExtraAR_Pulmonar_NINE
290. ExtraAR_Nodulos_Pulmonares
291. ExtraAR_Derrame_Pleural
292. ExtraAR_Epiescleritis
293. ExtraAR_Escleritis
294. ExtraAR_Queratitis
295. ExtraAR_Vasculitis
296. ExtraAR_Anemia
297. ExtraAR_Felty
298. ExtraAR_Neuropatia
299. ExtraAR_Compresion_Medular
300. ExtraAR_Pericarditis
301. ExtraAR_Amiloidosis
302. Sjogren_Ocular
303. Sjogren_Oral
304. MDHAQ_A
305. MDHAQ_B
306. MDHAQ_C
307. MDHAQ_D
308. MDHAQ_E
309. MDHAQ_F
310. MDHAQ_G
311. MDHAQ_H
312. MDHAQ_I
313. MDHAQ_J
314. RAPID3_Categoria
315. Maniobras_Sacroiliacas
316. Comentarios_Sacroiliacas
317. ASAS_Lumbalgia_3m
318. ASAS_Criterios_Cumplidos
319. ASAS_Resultado
320. CASPAR_Puntuacion
321. CASPAR_Resultado
```

## 4. Comparación AR / ESPA / APS
- Columnas comunes: `321`. Las tres hojas comparten las mismas 321 cabeceras.
- Confirmación 321 columnas: AR=`True`, ESPA=`True`, APS=`True`.
- Misma longitud: AR `321`, ESPA `321`, APS `321`.
- Columnas diferentes por hoja:
  - `AR`: `ninguna`
  - `ESPA`: `ninguna`
  - `APS`: `ninguna`
- Diferencias de orden:
  - `AR` vs `ESPA`: `0` diferencias
  - `AR` vs `APS`: `0` diferencias
  - `ESPA` vs `APS`: `0` diferencias
- Resultado: AR, ESPA y APS tienen exactamente las mismas cabeceras y en el mismo orden. Esta secuencia de 321 columnas debe tratarse como bloque histórico inmutable.

## 5. Comparación con contrato v2
### Fuente canónica
- Fuente principal: `Hub_Clinico_Maestro.xlsx`, especialmente las primeras 321 columnas de AR/ESPA/APS.
- Verificación secundaria: `modules/exportManager.js`. Actualmente conserva las 321 históricas como `220` base + `101` extras históricas, y además añade columnas v2 hasta llegar a `399` columnas exportables.
- Documentación complementaria: `docs/CONTRATO_DATOS_REUMA_V2.md` y templates por patología. Sirven para intención funcional, pero no deben sobrescribir nombres históricos del maestro.

### Columnas del contrato común v2 que ya existen en el maestro histórico
`Nombre_Paciente`, `Sexo`, `Fecha_Visita`, `Tipo_Visita`, `Profesional`, `Diagnostico_Primario`, `Diagnostico_Secundario`, `Peso`, `Talla`, `IMC`, `TA`, `Comorbilidad_HTA`, `Comorbilidad_DM`, `Comorbilidad_DLP`, `Comorbilidad_ECV`, `Comorbilidad_Obesidad`, `Comorbilidad_Osteoporosis`, `Toxico_Tabaco`, `Toxico_Tabaco_Desc`, `Toxico_Alcohol`, `Toxico_Alcohol_Desc`, `Tratamiento_Actual`, `Fecha_Inicio_Tratamiento`, `Cambio_Motivo`, `Cambio_Efectos_Adversos`, `Cambio_Descripcion_Efectos`, `Cambio_Biologico_Farmaco`, `Cambio_Biologico_Dosis`, `Fecha_Proxima_Revision`, `Comentarios_Adicionales`

### Columnas nuevas o no presentes como cabecera exacta
- `Estado_Prebiologico_Ultimo`
- `Fecha_Validacion_Prebiologico_Ultima`

### Columnas conflictivas o con alias
- CIP: no existe como cabecera histórica; ID_Paciente existe y debe mantenerse como alias/campo histórico.
- Decision_Terapeutica: no existe como cabecera única; existen Decision_Terapeutica_PV y Decision_Terapeutica_SEG.
- `Diagnostico_Primario` existe en el maestro; `fieldNormalizer.js` busca también `Diagnostico_Principal`, pero ese nombre no debe introducirse como sustituto.
- `Fármacos` existe con tilde en el Excel; `dataManager.js` normaliza internamente a la clave `Frmacos`. No renombrar la hoja histórica solo para ajustarla al nombre interno.

### Contraste con exportManager.js
- `EXTRA_EXPORT_HEADERS` contiene `179` cabeceras.
- Exportación actual esperada por fila clínica: `220 + 179 = 399` columnas.
- Las posiciones `221-321` de `EXTRA_EXPORT_HEADERS` coinciden con las 101 columnas históricas finales del maestro.
- Las posiciones `322-399` son extensiones v2 propuestas/implementadas para LES y Sjögren en exportación, no presentes en el maestro original.

Columnas v2 de LES observadas en exportación:

```text
SLEDAI
SLEDAI_2K
SLICC_SDI
Dosis_Prednisona
Brote_Actual
Tipo_Brote
Actividad_Global_Medico
Actividad_Global_Paciente
LES_Cutaneo
LES_Articular
LES_Renal
LES_Neurologico
LES_Hematologico
LES_Seroso
LES_Cardiopulmonar
LES_Vascular
LES_Ocular
LES_Otros
LES_Manifestaciones_Descripcion
ANA_LES
Anti_DNA
Anti_Sm
Anti_Ro
Anti_La
C3
C4
Proteinuria_LES
Sedimento_Urinario_LES
Creatinina_LES
PCR_LES
VSG_LES
Hemograma_Alteraciones_LES
Otros_Hallazgos_Analitica_LES
EVA_Dolor_LES
EVA_Fatiga_LES
EVA_Global_LES
Calidad_Vida_Comentario_LES
Anti_Ro_Sjogren
Anti_La_Sjogren
C3_Sjogren
C4_Sjogren
```

Columnas v2 de Sjögren observadas en exportación:

```text
ESSPRI_Sequedad
ESSPRI_Fatiga
ESSPRI_Dolor
ESSPRI_Result
ESSDAI_Result
EVA_Sequedad_Oral
EVA_Sequedad_Ocular
EVA_Fatiga_Sjogren
EVA_Dolor_Sjogren
EVA_Global_Sjogren
Sjogren_Ocular_Man
Sjogren_Oral_Man
Sjogren_Glandular
Sjogren_Articular_Man
Sjogren_Cutaneo
Sjogren_Pulmonar
Sjogren_Renal
Sjogren_Neurologico
Sjogren_Hematologico
Sjogren_Linfoma_Riesgo
Sjogren_Manifestaciones_Descripcion
ANA_Sjogren
FR_Sjogren
Anti_Ro_Sjogren
Anti_La_Sjogren
C3_Sjogren
C4_Sjogren
Crioglobulinas
Proteinograma
Biopsia_Glandula_Salival
Test_Schirmer
Tincion_Ocular
Flujo_Salival
Ecografia_Glandular
PCR_Sjogren
VSG_Sjogren
Otros_Hallazgos_Analitica_Sjogren
Trat_Sintomatico_Sequedad
Trat_Sintomatico_Sequedad_Dosis
Trat_Inmunomodulador
Trat_Inmunomodulador_Dosis
```

### Nombres que no deben tocarse
- No cambiar ni reordenar ninguna de las 321 cabeceras históricas listadas en AR/ESPA/APS.
- No sustituir `ID_Paciente` por `CIP` dentro del bloque histórico; `CIP` debe manejarse como alias visible o columna nueva añadida al final si se decide persistirla explícitamente.
- No renombrar `Decision_Terapeutica_PV` / `Decision_Terapeutica_SEG` a `Decision_Terapeutica`; el nombre único puede existir como alias lógico, no como reemplazo histórico.
- No cambiar `ASDAS_*`; en AR se debe rellenar como `NA` cuando no aplique, pero la cabecera se conserva.

## 6. Propuesta de estructura para demo v2
### Hojas finales propuestas
- `ESPA`, `APS`, `AR`, `LES`, `SJOGREN`, `Prebiologico`, `Profesionales`, `Fármacos`.
- `Solicitud_FH_Log` puede quedar fuera de la demo inicial si no se persiste todavía la generación de solicitudes FH.

### Estrategia para AR/ESPA/APS
- Copiar exactamente la estructura histórica de 321 columnas del maestro como prefijo obligatorio.
- Para compatibilidad con la exportación actual, añadir únicamente al final las columnas v2 `322-399` si se decide que la demo debe recibir filas exportadas por el código actual sin pérdida de columnas.
- No insertar columnas dentro de las primeras 321 posiciones.
- En AR, mantener columnas `ASDAS_*` con valor `NA`.

### Estrategia para LES/SJOGREN
- Usar como base las mismas primeras 321 columnas históricas para preservar el contrato transversal de carga, dashboard y exportación.
- Añadir al final columnas específicas v2, preferentemente siguiendo el orden real de `exportManager.js` desde la posición 322.
- En columnas históricas no aplicables a LES/SJOGREN usar `NA`; en campos no determinados usar `ND`; en texto libre ausente usar vacío.
- Si se mantiene el export actual de 399 columnas, todas las hojas clínicas deberían compartir las mismas 399 cabeceras para que pegar una fila exportada sea seguro.

### Campos mínimos poblados por visita
- Identificación: `ID_Paciente` con valor CIP visible, `Nombre_Paciente`, `Sexo`, `Fecha_Visita`, `Tipo_Visita`, `Profesional`, `Diagnostico_Primario`.
- Longitudinalidad: varias filas por paciente, con `Primera Visita` y `Seguimiento` ordenadas por `Fecha_Visita`.
- Dashboard: scores principales por patología, PROs relevantes, `Tratamiento_Actual`, `Fecha_Inicio_Tratamiento`, `Decision_Terapeutica_PV` o `Decision_Terapeutica_SEG`, cambios/efectos adversos cuando aplique.
- Solicitud FH: comorbilidades activas (`Comorbilidad_*`), tratamiento actual/previo/cambio, peso/IMC, actividad clínica, prebiológico si existe.
- Prebiológico: hoja `Prebiologico` con una fila por evaluación y estado manual; replicar estado último en columnas clínicas solo si esas columnas se añaden al final.

### Reglas NA/ND/vacío
- `NA`: campo no aplicable por patología o tipo de visita, por ejemplo ASDAS en AR.
- `ND`: dato clínicamente aplicable pero no determinado/interrogado/recibido.
- Vacío: texto libre no informado o campo opcional sin dato.
- `SI`/`NO`: campos booleanos clínicos, comorbilidades, manifestaciones y pruebas cuando estén revisadas.

## 7. Riesgos
- Riesgo de romper carga: una demo con menos columnas o cabeceras reducidas puede cargar parcialmente, pero romper búsquedas, normalización, dashboard o exportaciones al faltar nombres esperados. Mitigación: prefijo histórico exacto de 321 columnas.
- Riesgo de romper dashboard: los gráficos buscan nombres concretos como `Fecha_Visita`, `Diagnostico_Primario`, scores y tratamientos. Mitigación: poblar campos mínimos longitudinales y mantener aliases `ID_Paciente`/CIP.
- Riesgo de romper exportación: `exportManager.js` genera actualmente 399 columnas; si el Excel demo solo tiene 321, al pegar filas v2 sobrarán columnas no encabezadas. Mitigación: decidir explícitamente si la demo v2 tendrá 399 cabeceras compartidas o si antes se ajustará exportación/documentación.
- Riesgo de nombres divergentes: templates documentales usan algunos nombres distintos a exportación real, por ejemplo `SLEDAI_2K_Result` vs `SLEDAI_2K`, `SLICC_ACR_SDI` vs `SLICC_SDI`, `AntiDNA` vs `Anti_DNA`, `Complemento_C3` vs `C3`. Mitigación: para la demo usar nombres que realmente exporta/lee el código, y documentar aliases sin renombrar históricos.
- Riesgo de prebiológico no cargado desde Excel: `dataManager.js` no incluye `Prebiologico` en la lista de hojas cargadas; badges pueden depender de sessionStorage o de columnas replicadas. Mitigación: para demo poblar columnas clínicas de estado si existen y documentar que la hoja transversal requiere soporte de carga si se quiere usar como fuente persistente.
- Riesgo de hoja `Fármacos`: el Excel usa `Fármacos`, mientras el estado interno usa `Frmacos`. Mitigación: conservar nombre Excel con tilde; el loader ya normaliza.

## 8. Próximo paso propuesto
1. Generar un script reproducible que lea `Hub_Clinico_Maestro.xlsx` y tome las 321 cabeceras históricas de `AR` como prefijo canónico.
2. Construir una lista de cabeceras clínicas v2 como `321 históricas + columnas v2 finales` según `exportManager.js`, sin insertar nada en el bloque histórico.
3. Crear un workbook demo nuevo, nunca sobrescribiendo el maestro original, con hojas `AR`, `ESPA`, `APS`, `LES`, `SJOGREN`, `Prebiologico`, `Profesionales`, `Fármacos`.
4. Poblar pacientes ficticios con 3-4 visitas por patología, manteniendo una fila por visita y `Fecha_Visita` creciente.
5. Rellenar solo campos mínimos funcionales y clínicamente relevantes; usar `NA`/`ND`/vacío según las reglas anteriores.
6. Validar con `openpyxl` que las hojas clínicas tienen el número de columnas decidido, que las primeras 321 coinciden byte a byte con el maestro y que no hay cabeceras duplicadas/vacías.
7. No generar la demo final hasta confirmar la decisión contractual clave: si la demo v2 debe tener 321 columnas históricas + 78 columnas v2 finales compartidas en todas las hojas clínicas, o si se prefiere ajustar primero `exportManager.js`/contrato.

---

Conclusión operativa: el Excel maestro original es la fuente canónica para las 321 columnas históricas. `exportManager.js` confirma esas 321 y añade extensiones v2 hasta 399, lo que debe resolverse explícitamente antes de reconstruir la demo. No inventar nombres de columna: si un campo no está en maestro ni en exportación real, debe quedar como propuesta documentada, no como cabecera silenciosa.
