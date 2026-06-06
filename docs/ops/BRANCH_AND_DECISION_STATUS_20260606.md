# Estado de Ramas y Decisiones — Hub Clínico Badajoz

**Fecha:** 2026-06-05  
**Propósito:** Foto operativa para evitar confusión entre agentes

---

## 1. Rama viva actual

```
feature/reuma-v2-prebiologico-fh-les-sjogren
```

Es la rama base del proyecto. Todo el trabajo documental y funcional del MVP parte de aquí.

---

## 2. Merges incorporados

| Merge | Fecha | Descripción |
|-------|-------|-------------|
| PR #2 (WO-001) | 2026-06-05 | Gobernanza ejecutable: `AGENTS.md`, `WORK_ORDER_TEMPLATE.md`, `HERMES_EXECUTION_REPORT_TEMPLATE.md` |
| WO-001b | 2026-06-05 | Refinamiento plantilla reporte (incluido en PR #2) |

La gobernanza ejecutable está disponible en la rama base y puede usarse por agentes.

---

## 3. WO-002 — Contratos mínimos

| Aspecto | Valor |
|---------|-------|
| Rama | `work/hermes/wo-002-contratos-minimos` |
| Estado | ⏸️ **Pausada** |
| Commits | `fa59106` — docs: add minimum interservice data contracts |
| Contenido | `docs/contratos/CONTRATO_EVENTO_LONGITUDINAL_COMUN_V1.md`, `CONTRATO_ENFERMERIA_REUMA_V1.md`, `CONTRATO_FARMACIA_REUMA_V1.md` |
| Acción | 🔴 **No mergear. Borrador exploratorio prematuro.** |
| Motivo | Pendiente de diseñar formularios con Sil/Cora antes de validar contratos |

> **Decisión clave**: Los formularios de Enfermería y Farmacia deben diseñarse con Sil/Cora antes de que los contratos se consideren definitivos. WO-002 es un borrador exploratory que NO debe usarse como base de implementación.

---

## 4. Ramas activas actuales

| Rama | Propietario | Estado | Acción |
|------|-------------|--------|--------|
| `feature/reuma-v2-prebiologico-fh-les-sjogren` | Proyecto | ✅ Viva | Rama base |
| `work/hermes/wo-002-contratos-minimos` | Hermes | ⏸️ Pausada | No mergear |
| `work/hermes/nightly-green-docs-20260606` | Hermes | 🟢 En ejecución | Lote nocturno documental |
| `main` | Proyecto | 🏷️ Legacy | No tocar por agentes |
| `release/*` | Proyecto | 🔒 Protegida | No tocar por agentes |

---

## 5. Decisiones clave vigentes

| Decisión | Estado | Referencia |
|----------|--------|-----------|
| Reuma v2 es la base real del proyecto | ✅ Cerrada | DEC-001 |
| MVP local-first hasta 8 de julio | ✅ Cerrada | DEC-003 |
| Perfiles funcionales sí; seguridad real no en MVP | ✅ Cerrada | DEC-004 |
| Una app común, no una por perfil | ✅ Cerrada | DEC-005 |
| Escritura separada por rol (Excel propio cada uno) | ✅ Cerrada | DEC-006 |
| Formularios Enfermería/Farmacia deben diseñarse con humanos | 🔴 Pendiente | — |
| Contratos mínimos en pausa hasta diseño funcional | 🔴 Pendiente | — |

---

## 6. Próximas tareas permitidas (sin decisión humana)

- ✅ Documentación técnica
- ✅ Inventarios y mapas de flujo
- ✅ Smoke tests (checklist)
- ✅ Índice documental
- ✅ Auditoría técnica sin modificar código
- ✅ Preparación de diseño funcional

## 7. Tareas bloqueadas hasta decisión humana

- ❌ Contratos definitivos de datos
- ❌ Formularios de Enfermería
- ❌ Formularios de Farmacia
- ❌ Dashboards de Enfermería/Farmacia
- ❌ Carga multiarchivo
- ❌ Implementación de perfiles/roles
- ❌ Cualquier cambio en ramas protegidas

---

## 8. Ramas NO permitidas para agentes

```
main
release/*
feature/reuma-v2-prebiologico-fh-les-sjogren (como escritura directa)
```

Los agentes pueden crear ramas `work/hermes/*`, nunca escribir directamente sobre las protegidas.

---

## 9. Siguiente paso recomendado para Sil/Cora

1. Revisar y cerrar WO-002 (validar, corregir o descartar contratos).
2. Definir flujos de Enfermería y Farmacia con el equipo clínico.
3. Priorizar siguientes work orders documentales vs funcionales.
4. Decidir fecha de merge de avances documentales a rama base.
