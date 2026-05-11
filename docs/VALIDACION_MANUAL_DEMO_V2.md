# Validación Manual Demo v2 (Esquema Canónico 497)

## Archivo a cargar
1. Abrir `index.html` en navegador.
2. Pulsar `Cargar base de datos`.
3. Seleccionar `data/Hub_Clinico_Maestro_V2_DEMO.xlsx`.

## Contrato y estructura esperada
- Contrato Excel v2: `497` columnas por hoja clínica.
- Hojas clínicas: `AR`, `ESPA`, `APS`, `LES`, `SJOGREN`.
- Hojas auxiliares: `Profesionales`, `Fármacos`.
- Sin hoja `Prebiologico`.
- Sin hoja `Solicitud_FH` persistida.
- DAPSA (492-497):
  - APs: poblado longitudinalmente.
  - No APs: `NA`.

## Cohorte demo vigente (cliente)
- `50` pacientes totales.
- `200` visitas totales.
- `10` pacientes por patología.
- `4` visitas por paciente (`1 primera + 3 seguimientos`).

> Nota: estos conteos son del dataset demo y no representan límites funcionales de producción.

## Nomenclatura de pacientes
- AR/ESPA/APS: IDs tomados del `Hub_Clinico_Maestro.xlsx` (primeros 10 ordenados por hoja).
- LES: `LES-2026-001` ... `LES-2026-010`.
- SJOGREN: `SJOGREN-2026-001` ... `SJOGREN-2026-010`.

## Verificaciones rápidas en UI
- [ ] Búsqueda por CIP funciona con ejemplo AR (`AR-2024-001`).
- [ ] Búsqueda por CIP funciona con ejemplo ESPA (`ESP-2024-002`).
- [ ] Búsqueda por CIP funciona con ejemplo APS (`APS-2024-002`).
- [ ] Búsqueda por CIP funciona con ejemplo LES (`LES-2026-001`).
- [ ] Búsqueda por CIP funciona con ejemplo SJOGREN (`SJOGREN-2026-001`).
- [ ] Dashboard paciente muestra evolución longitudinal (4 puntos por paciente).
- [ ] Estadísticas muestran 50 pacientes en filtro global.
- [ ] Estadísticas muestran 10 pacientes por patología en cada filtro.

## Verificaciones clínicas mínimas
- [ ] AR: DAS28/CDAI/SDAI visibles y con evolución.
- [ ] ESPA: BASDAI/ASDAS visibles y con evolución.
- [ ] APS: DAPSA visible y poblado en las 4 visitas por paciente.
- [ ] LES: SLEDAI-2K/SLICC visibles y con evolución.
- [ ] SJOGREN: ESSPRI/ESSDAI visibles y con evolución.

## Auxiliares
- [ ] Hoja `Fármacos` coincide con `Hub_Clinico_Maestro.xlsx`.
- [ ] Hoja `Profesionales` replica maestro y añade `Raúl Veroz | Reumatólogo`.
- [ ] `Raúl Veroz` no aparece duplicado.

## Regeneración reproducible
```bash
python scripts/generate_demo_db.py
```
- [ ] Script termina sin errores.
- [ ] Regenera `data/Hub_Clinico_Maestro_V2_DEMO.xlsx`.
- [ ] Regenera `docs/REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md`.
- [ ] Validaciones automáticas reportan 50 pacientes / 200 visitas / 10 por patología.

## Notas de vigencia
- Solicitud FH es salida derivada de texto (no persistida en Excel).
- Prebiológico/vacunación va embebido por visita en hojas clínicas.
- PCR canónica en Hub: `mg/L`.
