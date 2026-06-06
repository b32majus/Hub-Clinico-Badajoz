# Farmacia Hospitalaria v0.1 — Congelación demo
**Fecha:** 2026-06-06  
**Estado:** `ready_for_demo`  
**Rama congelada:** `work/hermes/nightly-farmacia-v0-1-20260606`

---

## 1. Acceso

**GitHub Pages:** pendiente de activar (repo privado — activar en Settings > Pages si se necesita URL pública para la demo).  
**Local / staging:** abrir `farmacia_index.html` directamente en navegador desde la rama congelada.

---

## 2. Pacientes demo disponibles

| CIP | Perfil | Estado | Punto de entrada recomendado |
|-----|--------|--------|------------------------------|
| `CIP-DEMO-FH-001` | HS Dermatología · Secukinumab | `followup` — en seguimiento | Quick View → Seguimiento → Dashboard |
| `CIP-DEMO-FH-002` | HS Dermatología · Ixekizumab | `pending` — pendiente validación | Quick View → Validación → Bloque HS |
| `CIP-DEMO-FH-003` | AR Reumatología · Adalimumab | `validated` — listo para primera visita | Quick View → Primera Visita |
| CIP nuevo (cualquier otro) | Alta guiada | — | Introducir CIP → panel alta guiada → seleccionar destino |

---

## 3. Qué está permitido antes del lunes

- Revisión visual humana de todos los flujos.
- Ensayo del guion de demo.
- Fix crítico si aparece un bug P0/P1 real (funcionalidad completamente rota o dato incorrecto visible en demo).

---

## 4. Qué NO está permitido antes del lunes

- Nuevas funcionalidades.
- Persistencia real de datos.
- Lectura/escritura CSV desde el servidor.
- Backend o integración con API.
- Integración JARA / SES / Pharmatool.
- Refactor del sidebar.
- Limpieza HTML/CSS masiva.
- Cambios visuales grandes (paleta, layout, tipografía).

---

## 5. Verificación de integridad

```bash
node tools/farmacia_smoke_check.mjs
```

Resultado esperado: **33/33 OK**.

---

## 6. Guion mínimo de revisión pre-demo

### Flujo 1 — FH-001 seguimiento activo
1. Abrir `farmacia_index.html`.
2. Buscar `CIP-DEMO-FH-001` → Quick View se abre con datos del paciente.
3. Pulsar "Seguimiento" → `farmacia_seguimiento.html` carga con datos precargados.
4. Navegar a Dashboard → `farmacia_dashboard_paciente.html` muestra timeline.

### Flujo 2 — FH-002 validación HS
1. Buscar `CIP-DEMO-FH-002` → Quick View → "Validación".
2. Seleccionar modo "Dermatología" → formulario HS visible.
3. Rellenar IHS4, Hurley, DLQI → exportar TXT.

### Flujo 3 — FH-003 primera visita Reuma
1. Buscar `CIP-DEMO-FH-003` → Quick View → "Primera Visita".
2. Confirmar que campos de Reumatología aparecen precargados.
3. Guardar → banner de confirmación demo.

### Flujo 4 — Alta guiada (CIP nuevo)
1. Introducir CIP desconocido (p.ej. `CIP-NUEVO-001`).
2. Panel de alta guiada aparece.
3. Seleccionar servicio, patología y punto de entrada → navegación correcta.

### Flujo 5 — Enlace desde Reuma
1. Abrir módulo Reuma (`index.html`).
2. Confirmar que enlace a Farmacia está visible y funciona.

---

## 7. Deuda técnica post-demo

Ver: [`DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md`](DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md)

Elementos prioritarios post-demo:
- Focus trap completo en overlay (WCAG 2.1 AA).
- Tests Playwright para flujos críticos.
- CI integrado en GitHub Actions (workflow creado en WO-033-lite, se ejecutará en futuros pushes).
- Decisión sobre visibilidad y persistencia real (Fase 1).

---

*Documento generado: WO-033-lite, 2026-06-06. Builder: Claude Code / Sonnet 4.6.*
