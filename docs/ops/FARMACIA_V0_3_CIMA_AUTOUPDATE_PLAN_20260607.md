# Plan de auto-actualización CIMA — Hub Clínico Badajoz

**Versión:** 0.3 (exploratorio)
**Fecha:** 2026-06-07
Status: pending_review
**Rama:** `work/farmacia-v0-3-post-demo-exploratory-20260607`
**Modelo:** deepseek-v4-flash (documentación)
**Alcance:** solo documentación. No implementa scripts, workflows ni modificaciones de catálogo.

---

## 1. Referencia: CDC-001

El documento [`docs/deuda-tecnica/cdc-001-cima-auto-update.md`](../../docs/deuda-tecnica/cdc-001-cima-auto-update.md) identifica la necesidad de automatizar la actualización del catálogo CIMA. Propone:

- Script Python (`tools/update_cima_catalog.py`) que consuma la API REST pública de CIMA (AEMPS).
- Workflow GitHub Actions programado mensualmente (`cron '0 0 1 * *'`).
- Generación de Excel con dos hojas: `CATALOGO_CIMA` y `CATALOGO_LOCAL_ESPECIAL`.
- Commit + push automático si hay cambios.
- Prioridad: alta. Estado: `pending`.

Este plan complementa CDC-001 detallando aspectos operativos, de validación y control de cambios que quedan fuera del alcance de ese resumen.

---

## 2. API CIMA / AEMPS — consideraciones

**Endpoint base:** `GET https://cima.aemps.es/cima/rest/medicamentos`

| Aspecto | Observación |
|---------|-------------|
| **REST paginado** | La API devuelve resultados paginados. El script debe iterar páginas hasta cubrir todo el catálogo activo. |
| **Filtros disponibles** | Se puede filtrar por `estado=COMERCIALIZADO` y por `via` o `formaFarmaceutica` para acotar hospitalario. |
| **Campo nregistro** | Identificador único de medicamento en CIMA. Clave primaria natural. |
| **Normalización** | Los nombres pueden incluir tildes, mayúsculas mixtas, paréntesis, dosis. Requiere limpieza para búsqueda por autocompletado. |
| **Frecuencia de actualización** | No documentada públicamente. Se asume actualización mensual como periodicidad segura. |
| **Rate limiting** | No documentado oficialmente. Se recomienda respeto con delays entre peticiones y backoff exponencial. |

⚠️ **ADVERTENCIA:** Este plan documenta el concepto. No hay implementación activa en esta WO. La estructura real de la API y los filtros disponibles deben validarse en la WO de implementación.

---

## 3. Esquema del script futuro (Python)

```
tools/update_cima_catalog.py
```

Flujo propuesto:

1. **Fetch CIMA records**
   - `GET .../medicamentos?estado=COMERCIALIZADO&pagina={n}`
   - Paginar hasta `totalPaginas`
   - Almacenar raw en JSON intermedio (opcional, para depuración)

2. **Normalizar campos**
   - Nombre comercial: limpiar espacios múltiples, unificar mayúsculas
   - Principio activo: extraer del campo `principioActivo` o de la agrupación
   - Código nacional: campo `cn` (7 dígitos)
   - Nregistro: campo `nregistro`
   - Forma farmacéutica, dosis, titular, vía, presentación

3. **Filtrar / flag hospital-use candidates**
   - Criterios heurísticos: vía parenteral, forma farmacéutica hospitalaria (viales, jeringas precargadas, perfusión), clasificación ATC hospitalaria, titular con presencia en canales hospitalarios
   - Generar columna `hospitalario: sí/no/probable` — nunca borrar registros, solo etiquetar

4. **Merge con hoja local especial**
   - Leer Excel existente en `data/catalogos/farmacia/` (hoja `CATALOGO_LOCAL_ESPECIAL`)
   - No sobrescribir ni modificar esa hoja
   - Cruzar por `nregistro` para marcar coincidencias en el catálogo CIMA
   - Conservar campos adicionales de la hoja local (posología, indicaciones, off-label)

5. **Generar outputs**
   - `data/catalogos/farmacia/<version>/catalogo_cima.json` — catálogo completo normalizado
   - `data/catalogos/farmacia/<version>/hospital_filtered.json` — solo candidatos hospitalarios
   - `data/catalogos/farmacia/<version>/metadata.json` — versión, fecha, checksum, conteos

6. **Metadata / version / checksum**
   - SHA-256 del JSON generado
   - Fecha de extracción (fuente: fecha del sistema o header `Last-Modified` de la API)
   - Número total de registros obtenidos vs. página 1 esperada
   - Versión del esquema de salida (semver)

---

## 4. Esquema del workflow futuro

```yaml
.github/workflows/update-cima-catalog.yml
```

| Aspecto | Propuesta |
|---------|-----------|
| **Trigger** | `schedule: cron '0 6 1 * *'` (día 1 de cada mes, 06:00 UTC) + `workflow_dispatch` |
| **Ejecución** | `python tools/update_cima_catalog.py` |
| **Validación** | Chequeo de integridad post-ejecución (ver sección 6) |
| **Salida** | Si hay cambios: crear rama `work/cima-update-<YYYYMMDD>` y abrir PR contra `feature/reuma-v2-prebiologico-fh-les-sjogren` |
| **Sin cambios** | No hacer nada. Log en artifact. |
| **Notificación** | Opcional: issue comment o GH check. |

⚠️ **No se actualiza `main` directamente.** Toda actualización del catálogo pasa por revisión humana antes de merge.

---

## 5. Control de cambios

Cada ejecución debe generar un reporte de diff:

| Métrica | Descripción |
|---------|-------------|
| **Total antes** | Nº registros en la versión anterior del catálogo |
| **Total después** | Nº registros en la versión nueva |
| **Añadidos** | `nregistro` que no estaban en la versión anterior |
| **Eliminados** | `nregistro` que ya no aparecen (retirados del mercado) |
| **Modificados** | `nregistro` presentes en ambas versiones con cambios en campos relevantes |
| **Fecha versión** | Timestamp ISO 8601 de la ejecución |
| **Hash anterior** | SHA-256 del JSON previo |
| **Hash nuevo** | SHA-256 del JSON generado |

El reporte se incluye como comentario del PR o artifact del workflow. La revisión humana debe aprobar o rechazar el cambio antes de mergear.

---

## 6. Validación de integridad

Validaciones que debe ejecutar el script o un paso posterior:

| Validación | Detalle |
|------------|---------|
| **Campos requeridos** | Todo registro debe tener `nregistro`, `nombre`, `principioActivo` no nulos |
| **Duplicados** | No pueden existir dos registros con el mismo `nregistro` |
| **Claves foráneas** | Si hay referencias a `nregistro` desde la hoja local, deben existir en CIMA |
| **Schema version** | El JSON debe incluir `_schemaVersion` (semver) |
| **Muestreo autocompletado** | Probar 5 búsquedas representativas contra el JSON generado y verificar resultados esperados |
| **Checksum** | El SHA-256 del archivo debe coincidir con el valor en metadata |

Si alguna validación falla, el workflow falla y se marca para revisión manual. No se genera PR.

---

## 7. Separación CIMA vs. catálogo local especial

| Fuente | Contenido | Actualización | Responsable |
|--------|-----------|---------------|-------------|
| **CIMA (API pública)** | Medicamentos comercializados en España con datos oficiales de AEMPS | Automática (script) | WO de implementación |
| **Hoja local especial** | Posología, off-label, indicaciones locales, validación por Farmacia del hospital | Manual | Farmacia del hospital |

Reglas:
- Nunca se sobreescribe la hoja local desde el script.
- El script solo **lee** la hoja local para enriquecer el cruce.
- Si un registro local no tiene correspondencia en CIMA, se conserva igual (puede ser un fármaco extranjero, ensayo clínico, etc.).
- La hoja local es responsabilidad del servicio de Farmacia del Hospital Universitario de Badajoz.

---

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Cambio en estructura de API CIMA** | Script deja de funcionar | Test de integración periódico; alerta manual si falla; documentar versión esperada del esquema |
| **Rate limiting** | Script incompleto o bloqueado | Backoff exponencial; delay configurable entre peticiones; documentar límites observados |
| **Ambigüedad en filtro hospitalario** | Falsos positivos/negativos en columna `hospitalario` | Revisión humana del flag antes de merge; criterios documentados y ajustables |
| **Posología no disponible en CIMA** | No se puede automatizar hoja local | Ya está contemplado: la hoja local sigue siendo manual |
| **Mantenimiento de hoja local especial** | Desactualización si Farmacia no la revisa | Responsabilidad del hospital, no del sistema |
| **Falsos positivos en workflow** | PRs spam sin cambios relevantes | Validación de integridad previa al PR; diff mínimo configurable |
| **Volumen de datos grande** | JSON cliente demasiado pesado | Segmentación por categoría; paginación en búsqueda cliente; compresión |

---

## 9. Estado de implementación

**Nada de lo descrito en este plan está implementado.** Este documento es exploratorio y no constituye una especificación cerrada. No hay scripts, workflows, ni procesos automatizados activos.

La implementación requiere una WO específica que:
- Valide el acceso y estructura real de la API CIMA
- Implemente el script Python
- Cree el workflow GitHub Actions
- Pruebe el ciclo completo en rama de trabajo
- Pase revisión de Sil/Cora antes de cualquier automatización programada

---

## 10. Próxima WO sugerida

**WO‑CIMA‑01:** Implementar `tools/update_cima_catalog.py` y `.github/workflows/update-cima-catalog.yml`.

Criterios de aceptación:
- El script se ejecuta correctamente contra la API real de CIMA (al menos 1 iteración paginada completa).
- Genera JSON válido con `_schemaVersion`, `nregistro` único y campos normalizados.
- La validación de integridad pasa en un catálogo de prueba.
- El workflow se dispara manualmente (`workflow_dispatch`) y completa sin errores.
- Se genera un reporte de diff aunque sea contra un catálogo vacío.
- No mergea a `main` ni a la rama base viva sin revisión humana.
- Una segunda WO (WO‑CIMA‑02) activaría la programación mensual y la apertura automática de PR.

---

*Documento exploratorio. Sujeto a revisión de Sil/Cora antes de cualquier implementación.*
