# Farmacia Hospitalaria v0.2 — Freeze demo

## Estado

Demo principal congelada para revisión/demo del lunes.

## Rama demo

`work/hermes/farmacia-demo-v0-2-candidate-20260606`

## SHA de código validado

`9f54f025c34c4ea28b1353e37736bef8e1a4bb70`

## Fecha

2026-06-07

## Fallback operativo

| Rol | Rama | SHA |
|-----|------|-----|
| Demo principal | `work/hermes/farmacia-demo-v0-2-candidate-20260606` | `9f54f02` |
| Fallback v0.1 | `work/hermes/nightly-farmacia-v0-1-20260606` | `95003a2` |

## Alcance funcional congelado

La demo Farmacia v0.2 incluye:

- Inicio Farmacia con entrada única por CIP.
- Quick View de paciente.
- Alta guiada si el CIP no existe.
- Validación farmacoterapéutica.
- Catálogo farmacológico demo CIMA/local (4.032 registros).
- Autocomplete farmacológico por marca, principio activo, presentación y código.
- Carga global de catálogo en sidebar.
- Snapshots farmacológicos entre pantallas.
- Solicitud local especial demo si no se encuentra fármaco.
- Primera visita de Farmacia con tratamiento validado/snapshot.
- Búsqueda CIP funcional con Enter y lupa.
- Autocomplete farmacológico en modo manual (PV y Seguimiento).
- Visita de seguimiento con optimización de dosis/pauta.
- Morisky-Green (4 preguntas, adherencia alta/media/baja).
- PROMs DLQI literal + EVA dolor/prurito.
- Serologías separadas (VHB/VHC/VIH).
- Chips visuales para Mantoux/IGRA, serologías y vacunación.
- Checks visuales de analítica/vacunación en dashboard.
- Export TXT tipo JARA.
- Export CSV básico/demo.
- Dashboard paciente con resumen, actividad clínica, PROMs, timeline.
- Dashboard estadísticas con indicadores demo.
- Roadmap post-demo v0.3 documentado.

## Correcciones aplicadas en pre-demo

- Cabeceras homogéneas en todas las pantallas Farmacia.
- Botón "Crear nueva solicitud" eliminado de Seguimiento.
- "Cuestionario basal" y "Resultado basal" eliminados.
- DLQI corregido a preguntas literales completas con "Sin relación".
- Selector PROMs simplificado en Seguimiento (No / Sí DLQI+EVA).
- CIP falso limpia datos previos en PV y Seguimiento.
- Morisky con prefijo "Resultado Morisky-Green:".
- Dashboard cabecera reorganizada sin redundancias.
- Estadísticas cabecera homogénea.
- Política de auditoría PM actualizada (audit always, scale depth by risk).

## Reglas de congelación

1. **No tocar esta rama antes de la demo** salvo P0/P1 real autorizado explícitamente por Sil.
2. **No implementar en esta rama:**
   - Gráficos longitudinales nuevos.
   - Filtros avanzados.
   - Modelo multi-servicio/multi-tratamiento.
   - Catálogo transversal con Reuma.
   - Backend o persistencia real.
   - Integración JARA/SES/Farmatool real.
   - Workflows nuevos.
   - Cambios en Reuma.
3. **Solo se admiten commits documentales** (documentación, freeze, readme) sin tocar HTML/CSS/JS.
4. **Cualquier cambio funcional requiere nueva rama post-demo.**

## Estado de validación

- Revisión manual Sil: apta.
- Auditoría Cora: apta.
- Smoke check (KairOS): 33/33.
- Último commit código funcional: `9f54f02 — fix(farmacia): polish dashboard layout and document post-demo roadmap`.
- Fallback v0.1 disponible y verificado.

## Observaciones

- El código demo queda congelado en `9f54f02`.
- Este documento es un commit documental. No modifica código funcional.
- La evolución post-demo deberá hacerse en una rama nueva desde este estado estable.
- El roadmap post-demo v0.3 está documentado en `docs/ops/farmacia-roadmap-post-demo-v0-3-20260607.md`.

## Historial de SHA relevantes

| Evento | SHA |
|--------|-----|
| Cabeceras, Enter, chips, lupa, autocomplete, dashboard | `549ed55` |
| Fixes pre-demo (serologías, CIP, DLQI, PROMs, etc.) | `ce468db` |
| WO Maestra (catálogo, snapshot, inducción, Morisky) | `07800c8` |
| CDC-001 (deuda CIMA auto-update) | `11fb1e4` |
| Persistencia snapshot + nregistro | `ae68b81` |
| Cache bump v0.2 | `57c378b` |
| Drug snapshot module | `ae7be97` |
| v0.2 candidate registered | `ab326cc` |
