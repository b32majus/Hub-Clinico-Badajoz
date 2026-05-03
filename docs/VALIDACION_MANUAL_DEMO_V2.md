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

## CIPs demo
- `DEMO-AR-001`
- `DEMO-ESPA-001`
- `DEMO-APS-001`
- `DEMO-LES-001`
- `DEMO-SJOGREN-001`

## Checklist funcional por paciente

### DEMO-AR-001
- [ ] Dashboard abre sin errores JS.
- [ ] Evolutivo principal con descenso de DAS28 (6.2 -> 4.8 -> 3.2 -> 2.1).
- [ ] KPI secundarios con tendencia a mejoría (CDAI/SDAI y RAPID3).
- [ ] Eventos/timeline con cambio terapéutico y efecto adverso.
- [ ] Marcadores de tratamiento sobre gráfico (`Tx/Bio/Susp`) visibles.
- [ ] Badge prebiológico final: `APTO`.
- [ ] Solicitud FH incluye bloque prebiológico (estado, validación, analíticas, vacunación).

### DEMO-ESPA-001
- [ ] BASDAI/ASDAS longitudinal con mejoría (BASDAI 7.2 -> 1.9).
- [ ] Inicio de biológico y continuidad reflejados en timeline/marcadores.
- [ ] Badge prebiológico final: `EN_CURSO`.
- [ ] Solicitud FH muestra datos prebiológicos/vacunales desde última visita.

### DEMO-APS-001
- [ ] Evolución HAQ/RAPID3/LEI con tendencia descendente.
- [ ] PASI/BSA con descenso en visitas sucesivas.
- [ ] Cambio FAME/biológico visible en historial/timeline.
- [ ] Badge prebiológico final: `APTO`.
- [ ] Solicitud FH incluye motivo de cambio y comorbilidades activas.

### DEMO-LES-001
- [ ] Evolutivo LES con tendencia de actividad descendente (`SLEDAI_2K` de 16 a 1 en datos fuente).
- [ ] `SLICC_SDI` y dosis de prednisona presentes en datos de visitas.
- [ ] Línea terapéutica con HCQ + prednisona + inmunosupresor reflejada en historial.
- [ ] Badge prebiológico final (última visita): `APTO`.
- [ ] Solicitud FH incluye estado prebiológico, analíticas y observaciones relevantes.

### DEMO-SJOGREN-001
- [ ] Evolutivo ESSPRI/ESSDAI descendente (ESSDAI 18 -> 4).
- [ ] EVAs de sequedad oral/ocular/fatiga/dolor con mejoría progresiva.
- [ ] Tratamiento sintomático + inmunomodulador visible en historial/timeline.
- [ ] Badge prebiológico final: `EN_CURSO`.
- [ ] Solicitud FH incluye bloque prebiológico completo desde última visita.

## Verificación técnica en consola
- [ ] No errores críticos al cargar Excel.
- [ ] `dataManager` reconoce las 5 hojas clínicas.
- [ ] Sin warnings de cabeceras críticas faltantes.
- [ ] Dashboard renderiza gráficas y timeline para los 5 pacientes demo.

## Notas de revisión
- Solicitud FH es salida derivada (`TXT`) y no debe persistirse como columna/hoja en Excel.
- El estado prebiológico visible en dashboard/FH debe priorizar la última visita clínica persistida.

## Regeneración reproducible
```bash
python scripts/generate_demo_db.py
```
- El script sobrescribe `data/Hub_Clinico_Maestro_V2_DEMO.xlsx`.
- El script regenera `docs/REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md`.
