# Validación Manual Demo v2 (Esquema Canónico 491)

## Archivo a cargar
1. Abrir `index.html` en navegador.
2. Pulsar `Cargar base de datos`.
3. Seleccionar `data/Hub_Clinico_Maestro_V2_DEMO.xlsx`.

## Estructura esperada del archivo
- Hojas clínicas: `AR`, `ESPA`, `APS`, `LES`, `SJOGREN`.
- Hojas auxiliares: `Profesionales`, `Fármacos`.
- Sin hoja `Solicitud_FH`.
- Sin hoja `Prebiologico` obligatoria.
- Cada hoja clínica con `491` columnas.

## Cohorte completa (30 pacientes, 109 visitas)

### Artritis Reumatoide (AR) — 6 pacientes
| CIP | Edad | Sexo | Visitas | DAS28 rango | Perfil |
|---|---|---|---|---|---|
| DEMO-AR-001 | — | — | 4 | 6.2→2.1 | Tx→Bio→Bio, efecto adverso, remisión |
| DEMO-AR-002 | 55 | F | 4 | 6.8→2.4 | Alta actividad, biológico con buena respuesta |
| DEMO-AR-003 | 62 | M | 3 | 5.8→4.1 | Respuesta parcial, HTA+DM, no apto prebio |
| DEMO-AR-004 | 48 | F | 4 | 6.4→2.8 | Efecto adverso Tocilizumab→Rituximab |
| DEMO-AR-005 | 70 | M | 3 | 7.1→6.0 | Persistente alta actividad, no evaluado prebio |
| DEMO-AR-006 | 45 | F | 4 | 5.5→2.2 | ECV previo, Abatacept, apto prebio |

### Espondiloartritis Axial (ESPA) — 6 pacientes
| CIP | Edad | Sexo | Visitas | BASDAI rango | Perfil |
|---|---|---|---|---|---|
| DEMO-ESPA-001 | — | — | 4 | 7.2→1.9 | Secukinumab, remisión clínica |
| DEMO-ESPA-002 | 38 | M | 3 | 2.8→2.1 | Baja actividad, AINE solo |
| DEMO-ESPA-003 | 42 | F | 4 | 3.2→6.5→3.0 | Brote intercurrente, en curso prebio |
| DEMO-ESPA-004 | 50 | M | 5 | 7.5→2.5 | Cambio Adalimumab→Ixekizumab, apto prebio |
| DEMO-ESPA-005 | 35 | F | 3 | 5.2→4.5 | Moderada persistente, no apto prebio |
| DEMO-ESPA-006 | 44 | M | 4 | 6.0→2.0 | Uveítis anterior, apto prebio |

### Artritis Psoriásica (APS) — 6 pacientes
| CIP | Edad | Sexo | Visitas | RAPID3 rango | Perfil |
|---|---|---|---|---|---|
| DEMO-APS-001 | — | — | 4 | 14→2 | FAME→Bio, mejoría |
| DEMO-APS-002 | 52 | M | 4 | 14→3 | Psoriasis PASI 18→3, apto prebio |
| DEMO-APS-003 | 40 | F | 3 | — | Entesitis LEI 8→2, en curso prebio |
| DEMO-APS-004 | 58 | M | 4 | 18→4 | Cambio FAME→Adalimumab, apto prebio |
| DEMO-APS-005 | 33 | F | 3 | 5→2 | Baja actividad estable, no evaluado |
| DEMO-APS-006 | 65 | M | 4 | 20→12 | Persistente con comorbilidades, no apto |

### Lupus Eritematoso Sistémico (LES) — 6 pacientes
| CIP | Edad | Sexo | Visitas | SLEDAI-2K rango | Perfil |
|---|---|---|---|---|---|
| DEMO-LES-001 | — | — | 4 | 16→1 | Inmunosupresores, remisión |
| DEMO-LES-002 | 35 | F | 3 | 3→1 | Baja actividad estable |
| DEMO-LES-003 | 28 | F | 4 | 14→3 | Nefritis lúpica clase IV, Micofenolato |
| DEMO-LES-004 | 42 | F | 3 | 8→3 | Cutáneo-articular, rash resuelto |
| DEMO-LES-005 | 50 | M | 4 | 10→2 | Descenso prednisona 30→5mg con MTX |
| DEMO-LES-006 | 55 | F | 3 | 6→3 | SLICC=5, daño crónico acumulado |

### Síndrome de Sjögren (SJOGREN) — 6 pacientes
| CIP | Edad | Sexo | Visitas | ESSDAI rango | Perfil |
|---|---|---|---|---|---|
| DEMO-SJOGREN-001 | — | — | 4 | 18→4 | Pilocarpina→HCQ→Rituximab |
| DEMO-SJOGREN-002 | 48 | F | 4 | 22→6 | Sistémico alto, Rituximab, apto prebio |
| DEMO-SJOGREN-003 | 55 | F | 3 | 4→3 | Sequedad predominante, Cevimelina |
| DEMO-SJOGREN-004 | 42 | M | 4 | 6→3 | Fatiga/dolor dominante, en curso prebio |
| DEMO-SJOGREN-005 | 60 | F | 3 | 12→5 | Moderado con Rituximab, apto prebio |
| DEMO-SJOGREN-006 | 38 | F | 3 | 3→2 | Baja actividad estable |

## Estados prebiológico por paciente
| Estado | Pacientes |
|---|---|
| APTO | DEMO-AR-001, DEMO-AR-002, DEMO-AR-006, DEMO-ESPA-004, DEMO-ESPA-006, DEMO-APS-001, DEMO-APS-002, DEMO-APS-004, DEMO-LES-003(v4), DEMO-LES-004, DEMO-SJOGREN-002, DEMO-SJOGREN-005 |
| EN_CURSO | DEMO-ESPA-001, DEMO-ESPA-003, DEMO-APS-003, DEMO-LES-005, DEMO-SJOGREN-004 |
| NO_APTO | DEMO-AR-003, DEMO-ESPA-005, DEMO-APS-006, DEMO-LES-001, DEMO-LES-003(v1-v3) |
| NO_EVALUADO | DEMO-AR-004, DEMO-AR-005, DEMO-ESPA-002, DEMO-APS-005, DEMO-LES-002, DEMO-LES-006, DEMO-SJOGREN-001, DEMO-SJOGREN-003, DEMO-SJOGREN-006 |

## Checklist funcional por paciente

### DEMO-AR-001
- [ ] Dashboard abre sin errores JS.
- [ ] Evolutivo principal con descenso de DAS28 (6.2→4.8→3.2→2.1).
- [ ] KPI secundarios con tendencia a mejoría (CDAI/SDAI y RAPID3).
- [ ] Eventos/timeline con cambio terapéutico y efecto adverso.
- [ ] Marcadores de tratamiento sobre gráfico (`Tx/Bio/Susp`) visibles.
- [ ] Badge prebiológico final: `APTO`.
- [ ] Solicitud FH incluye bloque prebiológico (estado, validación, analíticas, vacunación).

### DEMO-AR-002 (Alta actividad con buena respuesta)
- [ ] DAS28 descendente 6.8→5.2→3.8→2.4.
- [ ] Cambio MTX→MTX+Adalimumab en visita 2.
- [ ] Remisión (DAS28 < 2.6) alcanzada en visita 4.
- [ ] Badge prebiológico: `APTO`.

### DEMO-AR-003 (Respuesta parcial + comorbilidades)
- [ ] DAS28 5.8→4.5→4.1, sin remisión.
- [ ] Comorbilidades HTA y DM visibles.
- [ ] Badge prebiológico: `NO_APTO`.

### DEMO-AR-004 (Efecto adverso con cambio de biológico)
- [ ] Cambio Tocilizumab→Rituximab por efecto adverso.
- [ ] DAS28 mejora 6.4→5.0→3.5→2.8.
- [ ] Badge prebiológico: `NO_EVALUADO`.

### DEMO-AR-005 (Alta actividad persistente)
- [ ] DAS28 7.1→6.5→6.0, persiste alta actividad.
- [ ] Comorbilidades HTA+DLP+obesidad.
- [ ] Badge prebiológico: `NO_EVALUADO`.

### DEMO-AR-006 (Comorbilidad CV)
- [ ] ECV previo, gastritis documentados.
- [ ] Abatacept como biológico (por perfil CV).
- [ ] DAS28 5.5→2.2, buena respuesta.
- [ ] Badge prebiológico: `APTO`.

### DEMO-ESPA-001
- [ ] BASDAI/ASDAS longitudinal con mejoría (7.2→1.9).
- [ ] Inicio de biológico y continuidad reflejados.
- [ ] Badge prebiológico final: `EN_CURSO`.

### DEMO-ESPA-002 (Baja actividad estable)
- [ ] BASDAI 2.8→2.1, solo AINE.
- [ ] Sin biológico.
- [ ] Badge: `NO_EVALUADO`.

### DEMO-ESPA-003 (Brote intercurrente)
- [ ] BASDAI 3.2→2.8→6.5→3.0, brote en visita 3.
- [ ] Cambio: añade Secukinumab en brote.
- [ ] Badge: `EN_CURSO`.

### DEMO-ESPA-004 (Cambio entre biológicos)
- [ ] 5 visitas, BASDAI 7.5→2.5.
- [ ] Adalimumab→Ixekizumab en visita 4.
- [ ] Badge: `APTO`.

### DEMO-ESPA-005 (Moderada persistente)
- [ ] BASDAI 5.2→4.5, sin alcanzar baja actividad.
- [ ] Badge: `NO_APTO`.

### DEMO-ESPA-006 (Manifestación extraarticular)
- [ ] Uveítis anterior documentada.
- [ ] BASDAI 6.0→2.0, Adalimumab.
- [ ] Badge: `APTO`.

### DEMO-APS-001
- [ ] Evolución HAQ/RAPID3/LEI descendente.
- [ ] PASI/BSA con descenso.
- [ ] Cambio FAME/biológico visible.
- [ ] Badge: `APTO`.

### DEMO-APS-002 (Psoriasis cutánea significativa)
- [ ] PASI 18→3 en 4 visitas.
- [ ] BSA 25→3.
- [ ] Secukinumab como primer biológico.
- [ ] Badge: `APTO`.

### DEMO-APS-003 (Entesitis)
- [ ] LEI 8→2 en 3 visitas.
- [ ] Cambio AINE→MTX→MTX+Adalimumab.
- [ ] Badge: `EN_CURSO`.

### DEMO-APS-004 (Cambio de FAME)
- [ ] Leflunomida→Leflunomab (placeholder).
- [ ] Badge: `APTO`.

### DEMO-APS-005 (Baja actividad)
- [ ] RAPID3 5→2, LEI 2→0.
- [ ] Solo MTX, sin biológico.
- [ ] Badge: `NO_EVALUADO`.

### DEMO-APS-006 (Persistente con comorbilidades)
- [ ] RAPID3 20→12, PASI 15→10.
- [ ] MTX→Adalimumab→Ixekizumab.
- [ ] Comorbilidades: HTA+DM+DLP.
- [ ] Badge: `NO_APTO`.

### DEMO-LES-001
- [ ] SLEDAI-2K 16→1.
- [ ] SLICC_SDI y prednisona en visitas.
- [ ] HCQ+prednisona+inmunosupresor.
- [ ] Badge última visita: `APTO`.

### DEMO-LES-002 (Baja actividad)
- [ ] SLEDAI-2K 3→1, SLICC=1.
- [ ] HCQ solo, prednisona 5mg.
- [ ] Badge: `NO_EVALUADO`.

### DEMO-LES-003 (Nefritis lúpica)
- [ ] SLEDAI-2K 14→3, proteinuria 3.0→0.3.
- [ ] Micofenolato 2g, prednisona 40→5mg.
- [ ] SLICC renal 0→2.
- [ ] Badge: `NO_APTO`→`APTO` (cambio en visita 4).

### DEMO-LES-004 (Cutáneo-articular)
- [ ] Rash activo→resuelto.
- [ ] Prednisona 15→5mg.
- [ ] Badge: `APTO`.

### DEMO-LES-005 (Descenso prednisona)
- [ ] Prednisona 30→5mg con MTX como ahorrador.
- [ ] SLICC 1→2 (daño acumulado).
- [ ] Badge: `EN_CURSO`.

### DEMO-LES-006 (Daño crónico)
- [ ] SLICC=5 estable.
- [ ] LES larga evolución (diagnóstico 2018).
- [ ] Múltiples dominios SLICC afectados.
- [ ] Badge: `NO_EVALUADO`.

### DEMO-SJOGREN-001
- [ ] ESSPRI/ESSDAI descendente (18→4).
- [ ] EVAs sequedad oral/ocular/fatiga/dolor con mejoría.
- [ ] Pilocarpina→HCQ→Rituximab.
- [ ] Badge: `EN_CURSO`.

### DEMO-SJOGREN-002 (Sistémico alto)
- [ ] ESSDAI 22→6, Rituximab.
- [ ] ESSPRI 6.3→3.3.
- [ ] Badge: `APTO`.

### DEMO-SJOGREN-003 (Sequedad predominante)
- [ ] EVA sequedad oral 9→7.
- [ ] Cevimelina añadido.
- [ ] Badge: `NO_EVALUADO`.

### DEMO-SJOGREN-004 (Fatiga/dolor)
- [ ] EVA fatiga 9→5.
- [ ] HCQ añadido.
- [ ] Badge: `EN_CURSO`.

### DEMO-SJOGREN-005 (Rituximab)
- [ ] ESSDAI 12→5, HCQ→HCQ+Rituximab.
- [ ] Badge: `APTO`.

### DEMO-SJOGREN-006 (Estable bajo)
- [ ] ESSDAI 3→2, solo HCQ.
- [ ] Badge: `NO_EVALUADO`.

## Verificación técnica en consola
- [ ] No errores críticos al cargar Excel.
- [ ] `dataManager` reconoce las 5 hojas clínicas.
- [ ] Sin warnings de cabeceras críticas faltantes.
- [ ] Dashboard renderiza gráficas y timeline para todos los pacientes demo.
- [ ] Cambio entre pacientes muestra datos específicos de cada uno.

## Notas de revisión
- Solicitud FH es salida derivada (`TXT`) y no debe persistirse como columna/hoja en Excel.
- El estado prebiológico visible en dashboard/FH debe priorizar la última visita clínica persistida.
- Cambios intra-visita en el estado prebiológico (como DEMO-LES-003) reflejan la evolución real del paciente.

## Regeneración reproducible
```bash
python scripts/generate_demo_db.py
```
- El script sobrescribe `data/Hub_Clinico_Maestro_V2_DEMO.xlsx`.
- El script regenera `docs/REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md`.
