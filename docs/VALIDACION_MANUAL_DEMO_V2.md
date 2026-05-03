# Validacion Manual - Base Demo v2

## Cargar la base
1. Abrir `index.html` en navegador.
2. Usar "Cargar base de datos".
3. Seleccionar `data/Hub_Clinico_Maestro_V2_DEMO.xlsx`.

## Pacientes disponibles
- DEMO-AR-001 (Artritis Reumatoide)
- DEMO-ESPA-001 (Espondiloartritis Axial)
- DEMO-APS-001 (Artritis Psoriasica)
- DEMO-LES-001 (Lupus Eritematoso Sistemico)
- DEMO-SJOGREN-001 (Sindrome de Sjogren)

## Checklist de validacion por paciente

### DEMO-AR-001
- [ ] Dashboard carga sin errores
- [ ] Grafico de actividad muestra DAS28/CDAI/SDAI/RAPID3
- [ ] Marcadores Tx: Metotrexato en visita 1
- [ ] Marcadores Bio: Adalimumab en visita 2
- [ ] Marcadores Bio: Baricitinib en visita 3
- [ ] Evento clinico: efecto adverso visible (reaccion local anti-TNF)
- [ ] Evento clinico: remision (DAS28=2.1 en visita 4)
- [ ] Historial de Tratamientos muestra 3 farmacos con fechas
- [ ] Badge prebiologico: APTO (verde)
- [ ] Solicitud FH incluye comorbilidades (HTA, Dislipemia, Obesidad)

### DEMO-ESPA-001
- [ ] Grafico muestra BASDAI/ASDAS
- [ ] Marcador Bio: Secukinumab
- [ ] Timeline de tratamientos correcto
- [ ] Badge prebiologico: EN_CURSO (naranja)
- [ ] Remision clinica: BASDAI 1.8 en visita 4

### DEMO-APS-001
- [ ] Grafico muestra DAS28/RAPID3
- [ ] Marcador Bio: Adalimumab en visita 2
- [ ] HAQ mejora 1.8 -> 0.3
- [ ] Badge prebiologico: APTO (verde)
- [ ] Reduccion Metotrexato 15mg -> 10mg en visita 4

### DEMO-LES-001
- [ ] Grafico muestra SLEDAI-2K
- [ ] Marcadores de tratamiento sobre grafico
- [ ] Badge prebiologico: NO_APTO (rojo)
- [ ] Eventos clinicos: brote moderado (SLEDAI-2K=16) y remision (SLEDAI-2K=1)
- [ ] Tratamiento: HCQ + Prednisona -> + Micofenolato en visita 2
- [ ] Dosis prednisona decrece: 30mg -> 20mg -> 10mg -> 5mg

### DEMO-SJOGREN-001
- [ ] Grafico muestra ESSPRI/ESSDAI
- [ ] Marcadores de tratamiento sobre grafico
- [ ] PROs: EVA sequedad oral/ocular/fatiga/dolor
- [ ] Badge prebiologico: NO_EVALUADO (gris o sin badge)
- [ ] Tratamiento: Pilocarpina -> + HCQ -> + Rituximab
- [ ] ESSDAI mejora 18 -> 4

## Incidencias conocidas
- `highlightChartEvent()` es placeholder (sin resaltado visual real en grafico).
- `fh_request` no es trazable (no aparece en eventos clinicos del timeline).
- El loader no carga la hoja `Prebiologico`; los badges dependen de sessionStorage.
- La hoja `Farmacos` usa formato 3-columnas legacy (Sistemicos | FAMEs | Biologicos) para compatibilidad con el loader actual.

## Regenerar la base
```bash
python scripts/generate_demo_db.py
```
El script es idempotente: sobrescribe `data/Hub_Clinico_Maestro_V2_DEMO.xlsx`.
