# Cierre de bloque — Farmacia Hospitalaria v0.1

**Status:** `pending_review`
**Fecha:** 2026-06-06
**Rama:** `work/hermes/nightly-farmacia-v0-1-20260606`
**Base:** `feature/reuma-v2-prebiologico-fh-les-sjogren`
**Estado:** `ready_for_demo` / `pending human review`
**Propósito:** Cierre documental global del bloque de implementación de Farmacia Hospitalaria v0.1 para la demo del lunes 2026-06-08.

---

## 1. Estado ejecutivo

La rama nocturna `work/hermes/nightly-farmacia-v0-1-20260606` contiene un **prototipo funcional completo** del módulo de Farmacia Hospitalaria v0.1. Ha sido construido, auditado, endurecido y congelado para la demo del lunes 2026-06-08 con el jefe de Servicio de Farmacia Hospitalaria de Cáceres.

| Indicador | Valor |
|-----------|-------|
| Commits en rama | **18** |
| Archivos funcionales | **31** (8 HTML + 1 CSS + 6 JS + 8 CSV + 7 páginas Reuma con navegación añadida + 1 smoke check) |
| Builders | KairOS (DeepSeek Flash) → PM Codex (GPT-5.5) → Claude Code (auditoría + hardening) |
| Iteraciones | 3: implementación inicial → auditoría + corrección → hardening + visual review + freeze |
| Issues encontrados | 21 en auditoría PM → 21 resueltos → hallazgos P1/P2 abordados antes del freeze; deuda P3 asumida post-demo |
| Smoke check | **33/33 OK** |
| CI workflow | Creado (WO-033-lite) |
| Estado merge | ❌ **No mergeada.** Congelada para demo. Pending human review |

**Limitaciones explícitas:**
- Datos sintéticos exclusivamente (CIP-DEMO-FH-*).
- Sin integración real con JARA, SES o Pharmatool.
- Sin seguridad productiva (perfil `farmaceutico` hardcodeado).
- Sin backend/persistencia real (datos en memoria de sesión JS).
- Sin contratos de datos definitivos.

---

## 2. Qué se ha construido

### Módulo funcional completo

| Componente | Archivo | Estado |
|------------|---------|--------|
| Shell con perfil demo `farmaceutico` | `farmacia_index.html` | ✅ |
| Buscador CIP con Quick View + acciones contextuales | `farmacia_index.html` + `scripts/farmacia_index.js` | ✅ |
| Alta guiada con paso de contexto por URL | `farmacia_index.html` + `scripts/farmacia_index.js` | ✅ |
| Validación farmacoterapéutica (Derma/Reuma) | `farmacia_validacion.html` + `scripts/farmacia_validacion.js` | ✅ |
| Primera visita Farmacia (N1/N2/N3) | `farmacia_primera_visita.html` + `scripts/farmacia_primera_visita.js` | ✅ |
| Seguimiento con Morisky-Green, optimización, EA | `farmacia_seguimiento.html` + `scripts/farmacia_seguimiento.js` | ✅ |
| Dashboard paciente con timeline | `farmacia_dashboard_paciente.html` + `scripts/farmacia_dashboard_paciente.js` | ✅ |
| Catálogo de fármacos (6 demo) | `farmacia_farmacos.html` | ✅ |
| Listado de profesionales (4 demo) | `farmacia_profesionales.html` | ✅ |
| Estadísticas placeholder | `farmacia_estadisticas.html` | ✅ |
| Dataset espejo CSV (8 tablas) | `data/farmacia_demo/*.csv` | ✅ |
| Export TXT tipo JARA | Integrado en `farmacia_validacion.js` | ✅ |
| Export CSV básico | Integrado en `farmacia_validacion.js` | ✅ |

### Arquitectura

- HTML estático servido desde el mismo directorio que el Hub existente.
- Estilo en `farmacia_style.css` (269 líneas) siguiendo variables SES del Hub (`--ses-green: #008777`).
- JS modular en `scripts/farmacia_*.js` (6 scripts, 0 inline, 0 `innerHTML`).
- Datos demo hardcodeados en `scripts/farmacia_common.js` (objeto `patients`).
- Navegación bidireccional: Farmacia ↔ Reuma desde la sidebar.

### Pacientes demo disponibles

| CIP | Perfil | Estado | Punto de entrada recomendado |
|-----|--------|--------|------------------------------|
| `CIP-DEMO-FH-001` | HS Dermatología · Secukinumab | `followup` — en seguimiento | Quick View → Seguimiento → Dashboard |
| `CIP-DEMO-FH-002` | HS Dermatología · Ixekizumab | `pending` — pendiente validación | Quick View → Validación → Bloque HS |
| `CIP-DEMO-FH-003` | AR Reumatología · Adalimumab | `validated` — listo para primera visita | Quick View → Primera Visita |
| CIP nuevo (cualquier otro) | Alta guiada | — | Introducir CIP → panel alta guiada → seleccionar destino |

---

## 3. Flujos demo consolidados

### CIP-DEMO-FH-001 — HS/Dermatología en seguimiento
- Buscador → Quick View con badge "En seguimiento".
- Acciones: **Seguimiento** + Dashboard.
- Seguimiento precargado con datos del paciente.
- Morisky-Green funcional (4 preguntas, interpretación automática).
- Guardado muestra "Demo — memoria de sesión".

### CIP-DEMO-FH-002 — HS/Dermatología pendiente validación
- Buscador → Quick View con badge "Pendiente".
- Acciones: **Validación** + Dashboard.
- Validación con modo Dermatología → selector 5 patologías.
- Estados: Pendiente / Validado / Denegado.
- Denegado sin motivo: **bloquea** con alerta.
- Export TXT + CSV descargables.

### CIP-DEMO-FH-003 — AR/Reuma validado
- Buscador → Quick View con badge "Validado".
- Acciones: **Primera Visita** + Dashboard.
- Primera visita precargada con contexto (cip, servicio, patología).
- Estratificación: Nivel 1 / Nivel 2 / Nivel 3.
- PROMs basales sí/no.

### CIP nuevo (ej. CIP-DEMO-TEST) — Alta guiada
- Buscador → "Paciente no encontrado" → Alta guiada.
- Seleccionar: servicio origen → patología → punto de entrada.
- Redirección con contexto en URL (`?cip=X&servicio=Y&patologia=Z&entrada=N`).

---

## 4. Decisiones funcionales consolidadas

| Decisión | Descripción |
|----------|-------------|
| **Buscador CIP como entrada única** | No hay botón "Nuevo paciente" como entrada paralela. El alta se dispara desde "paciente no encontrado". |
| **Farmacia multipatología** | Capaz de recibir solicitudes de servicios origen con distinto nivel de madurez (manual/semi-estructurada para Dermatología, estructurada precargada para Reumatología). |
| **HS/Dermatología manual/semi-estructurada** | Farmacia estructura manualmente la información a partir de una orden clínica/JARA simulada. No es módulo Dermatología completo. |
| **Reuma estructurada precargada** | Datos precargados desde el Hub Reuma v2 (no se introducen manualmente). |
| **Perfiles funcionales no auth** | Perfil `farmaceutico` hardcodeado. Es filtro de interfaz, no autenticación real. |
| **Excel/CSV/datos JS como demo** | Datos en `farmacia_common.js` (objeto `patients` hardcodeado). CSVs en `data/farmacia_demo/` como espejo documental. No hay persistencia real. |
| **No Dermatología completa** | Solo entrada a Farmacia, no módulo clínico independiente. |
| **Cambio de fármaco NO es optimización** | Requiere nueva solicitud desde el servicio origen. Farmacia propone, no ejecuta. |

---

## 5. Decisiones técnicas consolidadas

| Decisión | Descripción |
|----------|-------------|
| **HTML estático vanilla** | Sin framework. Servido desde el mismo directorio que el Hub existente. |
| **CSS modular** | `farmacia_style.css` (269 líneas) con paleta SES verde `#008777`. |
| **JS 0 inline, 0 innerHTML** | 6 scripts modulares en `scripts/farmacia_*.js`. DOM puro (`createElement`/`textContent`). |
| **Namespace `F`** | `farmacia_common.js` como módulo compartido con namespace `F` (datos, utilidades, constantes). |
| **Contexto por query params** | `?cip=X&servicio=Y&patologia=Z&entrada=N` para paso de contexto entre pantallas. |
| **Datos en memoria JS** | Objeto `patients` en `farmacia_common.js`. No se lee CSV/Excel dinámicamente. |
| **Sin backend real** | Datos en memoria de sesión. TXT/CSV generados en cliente. |
| **Font Awesome 6 CDN** | Con SRI verificado. |
| **CI smoke check** | `tools/farmacia_smoke_check.mjs` con 33 checks. Workflow GitHub Actions creado en WO-033-lite. |

---

## 6. Auditorías realizadas

| Auditoría | WO | Auditor | Resultado |
|-----------|----|---------|-----------|
| **Visual Claude** | WO-028 | Claude Code / Sonnet 4.6 | 10 hallazgos (1 P1, 4 P2, 5 P3). Veredicto: `ready_with_minor_fixes` |
| **Global Claude** (código, WCAG, UX) | WO-028 | Claude Code / Sonnet 4.6 | 27 hallazgos (7 P2, 20 P3) en código, WCAG 2.1 AA, UX y estética |
| **Smoke check automatizado** | WO-032-lite | Claude Code / Sonnet 4.6 | **33/33 OK**. Verifica HTMLs, scripts, CSS, ausencia de innerHTML, datos demo, referencias |
| **CI workflow** | WO-033-lite | Claude Code / Sonnet 4.6 | Workflow `farmacia-smoke-check` creado en `.github/workflows/` |

### Documentos de auditoría generados

- `docs/ops/audits/FARMACIA_VISUAL_AUDIT_CLAUDE_20260606.md`
- `docs/ops/audits/FARMACIA_VISUAL_AUDIT_GLOBAL_CLAUDE_20260606.md`
- `docs/ops/FARMACIA_DEMO_FREEZE_20260606.md`
- `docs/ops/DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md`

---

## 7. Deuda técnica asumida post-demo

Se documenta en `docs/ops/DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md`. Elementos prioritarios:

| Prioridad | Elemento | Descripción |
|-----------|----------|-------------|
| Alta | Focus trap completo | Overlay Quick View sin focus trap WCAG 2.1 AA |
| Alta | Persistencia real | Datos en memoria JS. Se pierden al refrescar/cerrar navegador |
| Alta | Backend / repository layer | Sin abstracción de datos |
| Media | Sidebar duplicado | HTML de sidebar copiado en 8 archivos |
| Media | WCAG 2.1 AA completo | Skip links, fieldset/legend Morisky, contraste marginal |
| Media | Datos hardcoded | `patients` en `farmacia_common.js` |
| Media | Playwright tests | Sin tests automatizados de flujos demo |
| Baja | Limpieza HTML | Indentación irregular, líneas largas |
| Baja | Font Awesome beta | Versión 6.0.0-beta3 |

---

## 8. Qué NO tocar antes del lunes

| Prohibido | Motivo |
|-----------|--------|
| Nuevas funcionalidades | Rama congelada para demo |
| Persistencia real de datos | Sin backend. Requiere arquitectura |
| Backend o integración con API | Fuera de alcance MVP |
| Integración JARA / SES / Pharmatool | Explícitamente prohibido |
| Refactor del sidebar | Riesgo de regresión en 8 archivos |
| Limpieza HTML/CSS masiva | Riesgo de rotura visual |
| Cambios visuales grandes (paleta, layout, tipografía) | Pueden romper coherencia |
| Datos demo (salvo fix crítico aprobado por Sil) | Datos verificados y estables |
| Auth / security | No en MVP |
| Contratos de datos definitivos | Pendientes de Fase 1-2 del plan formativo |

**Solo se permite:** revisión visual humana, ensayo del guion de demo, y fix crítico si aparece un bug P0/P1 real aprobado por Sil.

---

## 9. Aprendizaje operativo de agentes

1. **Los agentes produjeron valor real.** La implementación inicial por KairOS (DeepSeek Flash) fue funcional, pero requirió auditoría y corrección por el PM Codex (GPT-5.5) para alcanzar calidad demo.

2. **La primera implementación necesita auditoría.** Los 21 issues encontrados por el PM tras la generación inicial confirman que el código generado por agentes requiere revisión humana o de agente senior antes de presentarse.

3. **Congelar antes de la demo es crítico.** La rama se congeló tras 3 iteraciones de mejora (implementación → auditoría → hardening → visual review → freeze). Tocar después del freeze solo bajo autorización.

4. **Las auditorías visuales requieren navegador real.** Claude Code ejecutó la auditoría visual con un servidor local (`localhost:8765`) y capturó 61 screenshots. La revisión visual sin navegador real habría pasado por alto el P1 del botón de cierre.

5. **No mezclar demo táctica con contrato definitivo.** El módulo Farmacia v0.1 es un prototipo funcional táctico para la demo del 8 de junio. No sustituye el diseño funcional completo ni los contratos definitivos que se derivarán de la Fase 1-2 del plan formativo.

6. **El pipeline multi-agente funcionó.** KairOS → PM Codex → Claude Code (auditoría) → Claude Code (hardening/freeze) fue efectivo, aunque requirió supervisión humana en cada transición.

---

## 10. Siguiente paso

1. **Revisión humana (Sil/Cora):** Revisar visualmente los flujos demo en navegador real desde la rama congelada.
2. **Demo 2026-06-08:** Presentar al jefe de Servicio de Farmacia de Cáceres siguiendo el guion documentado en `docs/ops/EXECUTIVE_SUMMARY_FARMACIA_DEMO_20260606.md`.
3. **Post-demo:** Extraer decisiones funcionales reales de Farmacia a partir del feedback. Completar el canvas de Fase 1 del plan formativo.
4. **No mergear automáticamente.** La rama queda `pending human review`. El merge a `feature/` se decidirá tras la demo y revisión de Sil/Cora.

---

*Documento generado: WO-034, 2026-06-06. Builder: OpenCode (DeepSeek v4 Pro).*
