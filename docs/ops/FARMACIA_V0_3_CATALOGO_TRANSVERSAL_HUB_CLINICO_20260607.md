# Catálogo farmacológico transversal — Hub Clínico Badajoz

**Versión:** 0.3 (exploratorio)
**Fecha:** 2026-06-07
Status: pending_review
**Rama:** `work/farmacia-v0-3-post-demo-exploratory-20260607`
**Modelo:** deepseek-v4-flash (documentación)

---

## 1. Problema actual

- Farmacia ya dispone de autocompletado CIMA/local en los flujos implementados durante v0.1–v0.2, con lógica concentrada en `scripts/farmacia_common.js` y varios formularios del módulo.
- Reuma, por su parte, gestiona principios activos y medicamentos mediante campos propios y listas independientes sin conexión con la fuente CIMA que ya usa Farmacia.
- Esta dualidad introduce riesgo de duplicación de catálogos, criterios de búsqueda inconsistentes entre módulos y pérdida de trazabilidad sobre qué fármacos están disponibles y bajo qué identificadores (nombre comercial, principio activo, código nacional, nregistro).

---

## 2. Objetivo

- Definir una fuente farmacológica común y transversal al Hub Clínico.
- Implementar un mecanismo de autocompletado uniforme que cualquier módulo (Farmacia, Reuma, Dermatología, futuros) pueda consumir.
- Garantizar trazabilidad por nombre comercial, principio activo, código nacional y nregistro.
- Mantener la hoja de medicación especial (posología, off-label, indicaciones) como un módulo separado que consume del catálogo común, no como parte del mismo.

---

## 3. Arquitectura propuesta

- Crear un módulo compartido (nombre tentativo: `FarmaciaCatalog` o neutro tipo `HubCatalog`) ubicado fuera de los módulos de especialidad.
- El catálogo se sirve como un fichero JSON estático generado a partir de CIMA, actualizable mediante proceso programado (no tiempo real).
- El módulo expone una interfaz de búsqueda/autocompletado consumible por cualquier vista del Hub.
- Cada módulo consumidor (Farmacia, Reuma, Dermatología, etc.) integra el componente de búsqueda sin duplicar lógica de catálogo.
- La adopción es progresiva: ningún módulo se ve obligado a migrar de inmediato.

```
HubCatalog (static JSON + search API)
  ├── Farmacia (autocompletado ya existente, migrar progresivamente)
  ├── Reuma (sustituir campos propios sin tocar funcionalidad existente)
  ├── Dermatología (futuro)
  └── ...
```

---

## 4. Plan de migración

El plan asume que **Reuma no sufre cambios funcionales en esta WO**. La migración se divide en fases independientes y reversibles.

| Fase | Acción | Impacto |
|------|--------|---------|
| **Fase 1** | Documentar el catálogo actual de Farmacia y el estado de los campos de medicamento en Reuma. Sin modificar código. | Ninguno |
| **Fase 2** | Identificar y etiquetar todos los campos de principio activo / medicamento en formularios y vistas de Reuma. | Solo documentación |
| **Fase 3** | Sustituir los campos identificados por el componente de autocompletado transversal en una rama específica. | Reuma (solo UI de campos de fármaco) |
| **Fase 4** | Validar que no hay regresión en los flujos de Reuma ni de Farmacia (pruebas funcionales y comparativa de datos). | QA |
| **Fase 5** | Integrar con un proceso de actualización periódica del catálogo desde CIMA (manual o semiautomatizado). | DevOps / datos |

Las fases 1 y 2 son puramente documentales y pueden ejecutarse sin rama de código. Las fases 3–5 requieren rama de trabajo y validación.

---

## 5. Riesgos

- **Compatibilidad:** el catálogo común debe ser compatible con los campos existentes en Reuma y Farmacia; puede requerir mapeos.
- **Nombres comerciales y biosimilares:** un mismo principio activo puede tener múltiples presentaciones; la búsqueda debe priorizar sin desorientar.
- **Indicaciones:** el catálogo CIMA no siempre refleja las indicaciones aprobadas; el módulo de indicaciones debe ser un complemento, no una fusión.
- **Posología:** no está disponible de forma estructurada en CIMA; la hoja de medicación especial sigue siendo responsabilidad del módulo clínico.
- **Usos off-label:** CIMA no los cubre; deben gestionarse aparte.
- **Carga del catálogo:** el JSON no debe superar un tamaño que degrade la experiencia de búsqueda en cliente; valorar paginación o búsqueda server-side si es necesario.
- **Dependencias compartidas:** cualquier cambio en el catálogo puede afectar a todos los consumidores; establecer un contrato de versionado.

---

## 6. Decisiones pendientes y próxima WO

| Decisión | Opciones | Propuesta |
|----------|----------|-----------|
| Nombre del módulo común | `FarmaciaCatalog` vs `HubCatalog` | `HubCatalog` (neutro, transversal) |
| Formato de carga | JSON estático embebido vs API server | JSON estático generado desde CIMA (fase inicial) |
| Actualización del catálogo | Manual (script) vs programada (cron) | Script manual documentado en Fase 5 |
| Ámbito de la Fase 3 | Solo Reuma vs Reuma + migración de Farmacia | Solo Reuma; Farmacia migra en WO aparte |

**Próxima WO propuesta:** ejecutar Fase 1 (documentación de campos de medicamento en Reuma) y Fase 2 (identificación y etiquetado). No requiere rama de código.

---

*Documento exploratorio. No constituye especificación cerrada ni compromiso de implementación. Sujeto a revisión de Sil/Cora antes de cualquier migración.*
