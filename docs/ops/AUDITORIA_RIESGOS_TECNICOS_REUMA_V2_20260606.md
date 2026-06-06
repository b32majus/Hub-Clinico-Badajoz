# Auditoría de Riesgos Técnicos — Reuma v2

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Proyecto:** Hub Clínico Reuma / PROMueve Extremadura  
**Propósito:** Identificar riesgos y puntos frágiles de la app actual sin modificar código

---

## 1. Acoplamiento Excel-UI

**Riesgo:** 🟡 **ALTO**

La app depende de que el Excel tenga nombres de hoja exactos (`ESPA`, `APS`, `AR`, `LES`, `SJOGREN`, `Profesionales`, `Farmacos`) y 497 columnas con nombres específicos. Cualquier cambio en el Excel (rename de columna, reordenación, cambio de nombre de hoja) rompe la app en silencio.

**Impacto:** Desde carga incorrecta hasta pérdida de datos.

**Mitigación sugerida:** Crear una capa de mapeo columna→campo que aisle la UI del naming del Excel.

---

## 2. Dependencia de nombres de columna

**Riesgo:** 🟡 **ALTO**

`fieldNormalizer.js` y `dataManager.js` normalizan alias de columnas, pero la lógica de formularios (`formController.js`) accede directamente a propiedades con nombre fijo. No hay validación de esquema contra el Excel cargado.

**Ejemplo:** Si una columna se llama `Fecha_Visita` en el Excel pero el código espera `FechaVisita`, el dato no se carga.

**Impacto:** Datos que desaparecen sin error visible.

**Mitigación sugerida:** Validación de esquema al cargar Excel con reporte de columnas esperadas vs. encontradas.

---

## 3. Duplicación de lógica por patología

**Riesgo:** 🟡 **MEDIO**

`formController.js` (127 KB) contiene bloques condicionales para cada patología. Añadir una patología nueva implica:
- Nuevos bloques en `formController.js`.
- Nuevas secciones HTML en `primera_visita.html` y `seguimiento.html`.
- Nuevas columnas en el Excel.
- Nuevos scores en `scoreCalculators.js`.

**Impacto:** Cada nueva patología multiplica la complejidad y el riesgo de efectos secundarios.

**Mitigación sugerida:** Extraer configuración de patologías a un archivo de configuración (patología → campos → scores → visibilidad) para que el controlador sea genérico.

---

## 4. HTML masivos

**Riesgo:** 🟢 **MEDIO**

| Archivo | Tamaño |
|---------|--------|
| `primera_visita.html` | 205 KB |
| `seguimiento.html` | 183 KB |
| `formController.js` | 127 KB |

**Riesgo:** Dificultad de mantenimiento, merge conflicts frecuentes, alta probabilidad de errores al editar.

**Mitigación sugerida:** Refactorización v3 con generación dinámica de formularios desde configuración (React + TypeScript).

---

## 5. Ausencia de tests automatizados

**Riesgo:** 🟡 **ALTO**

No hay suite de tests. Cualquier cambio se valida manualmente o no se valida. El riesgo de regression es alto, especialmente en `formController.js` y `dataManager.js`.

**Impacto:** Cambios que rompen funcionalidad existente sin detección temprana.

**Mitigación sugerida:** Smoke test manual (WO-005) como mínimo. Tests automatizados con Cypress o Playwright para flujos críticos.

---

## 6. SessionStorage como base de datos

**Riesgo:** 🟡 **MEDIO**

- Límite: ~5-10 MB por origen.
- Se borra al cerrar el navegador (pestaña).
- No hay persistencia entre sesiones si no se exporta.
- `dataManager.js` ya implementa truncamiento para evitar `QuotaExceededError`.

**Impacto:** Pacientes con muchas visitas pueden perder datos en sesiones largas. La demo de 50 pacientes con 200 visitas está cerca del límite.

**Mitigación sugerida:** Migrar a IndexedDB para MVP. Evaluar SQLite vía OPFS para escritorio.

---

## 7. Dependencias CDN

**Riesgo:** 🟡 **MEDIO**

La app carga SheetJS, Chart.js y jsPDF desde CDN. Sin conexión a internet o en intranet hospitalaria sin acceso a CDN, la app no funciona.

**Impacto:** Bloqueante para despliegue en entorno clínico real.

**Mitigación sugerida:** Bundlear dependencias en un solo JS para distribución offline, o usar importmap local.

---

## 8. Solicitud FH como salida derivada sin receptor

**Riesgo:** 🟢 **BAJO**

La Solicitud FH es texto plano a portapapeles. No hay módulo que la reciba, valide, archive o gestione. En MVP puede ser suficiente, pero para Farmacia real se necesita un circuito cerrado.

**Impacto:** La solicitud se pierde si el reumatólogo no la pega en el destino correcto.

**Mitigación sugerida:** Crear módulo de Farmacia que reciba y gestione solicitudes (post-MVP).

---

## 9. Riesgos al añadir perfiles

**Riesgo:** 🟡 **ALTO**

Añadir perfiles (Enfermería, Farmacia) implica:

| Cambio | Riesgo |
|--------|--------|
| Nuevo Excel por perfil | DataManager debe soportar múltiples fuentes |
| Nuevos formularios | formController + HTML deben escalar |
| Timeline multi-fuente | treatmentEventsManager debe mezclar orígenes |
| sessionStorage compartido | Riesgo de colisión de claves o cuota excedida |
| Control de acceso por perfil | Sin autenticación real en MVP, solo UI hiding |

**Mitigación sugerida:** Separar `appState.db` en `db.reuma`, `db.enfermeria`, `db.farmacia` con namespaces en sessionStorage. FormController debe ser genérico o instanciable por perfil.

---

## 10. Riesgos de carga multiarchivo

**Riesgo:** 🟡 **ALTO**

Actualmente se carga un solo Excel. Cargar N archivos implica:

- Coordinar lecturas asíncronas.
- Validar que cada Excel corresponde al perfil correcto.
- Evitar conflictos de nombres de paciente entre fuentes.
- Mantener trazabilidad: qué dato viene de qué fuente.

**Impacto:** Si no se diseña bien, datos mezclados, duplicados o perdidos.

**Mitigación sugerida:** Preparar estructura de datos multi-fuente antes de implementar la carga multiarchivo.

---

## 11. Riesgos de datos sintéticos vs reales

**Riesgo:** 🟢 **BAJO** (mientras se cumpla la política)

Actualmente todo es sintético. El riesgo es que alguien cargue un Excel con datos reales en el VPS o en GitHub. La política de `AGENTS.md` y `CONTRATO_DATOS_REUMA_V2.md` lo prohíbe explícitamente.

**Mitigación sugerida:** Validación automática pre-commit que detecte patrones de datos reales (DNI, NHC, teléfonos, emails) y bloquee el commit.

---

## 12. Riesgos de rendimiento

**Riesgo:** 🟢 **BAJO** (para MVP)

- `formController.js` manipula el DOM intensivamente en formularios grandes.
- `dataManager.js` parsea 497 columnas × N filas en cada carga.
- Chart.js con muchos datos puede ralentizar el dashboard.

**Impacto:** Perceptible en máquinas lentas o con Excel de miles de filas.

**Mitigación sugerida:** Virtual scrolling para tablas grandes, carga diferida de gráficos.

---

## 13. Riesgos de testing insuficiente

**Riesgo:** 🟡 **ALTO**

Sin tests automatizados ni integración continua, cualquier cambio es una caja negra. El checklist de smoke test (WO-005) es un primer paso, pero no escala.

**Mitigación sugerida:** GitHub Actions para validación básica (lint, smoke test automatizado con Playwright).

---

## Resumen de prioridades

| Prioridad | Riesgo | Acción recomendada | Nivel |
|-----------|--------|-------------------|-------|
| 1 | Acoplamiento Excel-UI | Capa de mapeo columna→campo | 🟡 Amarillo |
| 2 | Sin tests | Smoke test manual + automatizado | 🟡 Amarillo |
| 3 | Carga multiarchivo | Preparar estructura datos multi-fuente | 🟡 Amarillo |
| 4 | Perfiles nuevos | Separar appState.db por módulo | 🟡 Amarillo |
| 5 | HTML masivos | Refactor v3 (React + TypeScript) | 🔴 Rojo |
| 6 | SessionStorage | Migrar a IndexedDB | 🟡 Amarillo |
| 7 | CDN offline | Bundlear dependencias | 🟢 Verde |
| 8 | Datos reales | Validación pre-commit | 🟢 Verde |
| 9 | Rendimiento | Virtual scrolling, carga diferida | 🟢 Verde |

---

> **Nota:** Esta auditoría es documental. No implementar ninguna recomendación sin work order específica y aprobación de Sil/Cora.
