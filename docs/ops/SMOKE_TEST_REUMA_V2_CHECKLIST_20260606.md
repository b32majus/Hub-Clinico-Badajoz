# Smoke Test Checklist — Reuma v2

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Proyecto:** Hub Clínico Reuma / PROMueve Extremadura  
**Propósito:** Verificar que la app no se rompe antes/después de cambios

---

## Instrucciones

1. Usar Excel demo (`data/Hub_Clinico_Maestro_V2_DEMO.xlsx`) o Excel real.
2. Marcar cada ítem como ✅ PAS, ❌ FALLO, ⏭️ NO APLICA.
3. Capturar evidencias: captura de pantalla, consola del navegador (F12).
4. Si falla, documentar error, consola y estado antes del cambio.

---

## 1. Carga de Excel

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 1.1 | Cargar Excel demo desde `index.html` | ⬜ | |
| 1.2 | Cargar Excel Reuma v2 real (si disponible) | ⬜ | |
| 1.3 | Verificar que aparecen pacientes en la lista | ⬜ | |
| 1.4 | Verificar que se ven las 5 patologías en la UI | ⬜ | |
| 1.5 | Abrir consola F12: sin errores en rojo | ⬜ | |
| 1.6 | sessionStorage tiene clave `hubClinicoDB` | ⬜ | |

## 2. Visualización de paciente

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 2.1 | Buscar paciente por CIP | ⬜ | |
| 2.2 | Buscar paciente por nombre | ⬜ | |
| 2.3 | Hacer clic en paciente → ir a dashboard | ⬜ | |
| 2.4 | Hacer clic en paciente → ir a primera visita | ⬜ | |
| 2.5 | Hacer clic en paciente → ir a seguimiento | ⬜ | |

## 3. Artritis Reumatoide (AR)

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 3.1 | Abrir primera visita de paciente AR | ⬜ | |
| 3.2 | Verificar que se calcula DAS28-VHS | ⬜ | |
| 3.3 | Verificar que se calcula DAS28-PCR | ⬜ | |
| 3.4 | Verificar que se calcula CDAI | ⬜ | |
| 3.5 | Guardar cambios | ⬜ | |
| 3.6 | Comprobar que NO aparece ASDAS (corrección v2) | ⬜ | |

## 4. Artritis Psoriásica (APs)

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 4.1 | Abrir primera visita de paciente APs | ⬜ | |
| 4.2 | Verificar DAPSA | ⬜ | |
| 4.3 | Verificar mNAPSI si aplica | ⬜ | |
| 4.4 | Verificar BSA/PASI si aplica | ⬜ | |
| 4.5 | Guardar cambios | ⬜ | |

## 5. Espondilitis Axial (EspA)

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 5.1 | Abrir primera visita de paciente EspA | ⬜ | |
| 5.2 | Verificar BASDAI | ⬜ | |
| 5.3 | Verificar ASDAS-CRP | ⬜ | |
| 5.4 | Guardar cambios | ⬜ | |

## 6. Lupus Eritematoso Sistémico (LES)

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 6.1 | Abrir primera visita de paciente LES | ⬜ | |
| 6.2 | Verificar SLEDAI-2K | ⬜ | |
| 6.3 | Verificar SLICC | ⬜ | |
| 6.4 | Comprobar secciones específicas LES visibles | ⬜ | |
| 6.5 | Guardar cambios | ⬜ | |

## 7. Síndrome de Sjögren

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 7.1 | Abrir primera visita de paciente Sjögren | ⬜ | |
| 7.2 | Verificar ESSPRI | ⬜ | |
| 7.3 | Verificar ESSDAI | ⬜ | |
| 7.4 | Comprobar secciones específicas Sjögren visibles | ⬜ | |
| 7.5 | Guardar cambios | ⬜ | |

## 8. Bloque prebiológico

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 8.1 | En formulario, ver sección prebiológico visible | ⬜ | |
| 8.2 | Cambiar estado prebiológico y guardar | ⬜ | |
| 8.3 | Abrir dashboard: badge prebiológico visible | ⬜ | |
| 8.4 | Badge muestra el estado correcto | ⬜ | |

## 9. Vacunación / Medicina Preventiva

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 9.1 | Ver sección vacunación en formulario | ⬜ | |
| 9.2 | Registrar vacuna y guardar | ⬜ | |

## 10. Solicitud FH

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 10.1 | Botón Solicitud FH visible en formulario | ⬜ | |
| 10.2 | Botón Solicitud FH visible en dashboard | ⬜ | |
| 10.3 | Al pulsar, se genera texto estructurado | ⬜ | |
| 10.4 | Copia a portapapeles funciona | ⬜ | |

## 11. Eventos terapéuticos

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 11.1 | Dashboard paciente muestra timeline | ⬜ | |
| 11.2 | Timeline muestra eventos del paciente | ⬜ | |
| 11.3 | Los eventos reflejan cambios de tratamiento | ⬜ | |

## 12. Dashboard paciente

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 12.1 | Dashboard carga sin errores | ⬜ | |
| 12.2 | Scores visibles y correctos | ⬜ | |
| 12.3 | Badge prebiológico visible | ⬜ | |
| 12.4 | Timeline visible | ⬜ | |
| 12.5 | Botones de acción funcionan | ⬜ | |

## 13. Estadísticas

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 13.1 | Estadísticas carga sin errores | ⬜ | |
| 13.2 | Selector de patología funciona | ⬜ | |
| 13.3 | KPIs se muestran correctamente | ⬜ | |
| 13.4 | Gráficos se renderizan | ⬜ | |
| 13.5 | Cambiar de patología no produce errores | ⬜ | |

## 14. Validaciones básicas

| # | Prueba | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 14.1 | Sin datos cargados: mensaje informativo | ⬜ | |
| 14.2 | Paciente sin visitas: formularios vacíos | ⬜ | |
| 14.3 | Campos obligatorios: validación visual | ⬜ | |
| 14.4 | Sesión expirada (recargar): datos en sessionStorage | ⬜ | |

---

## Criterios de aprobado/fallido

| Resultado | Criterio |
|-----------|----------|
| ✅ **APROBADO** | Todos los tests 1-14 pasan sin errores |
| ⚠️ **APROBADO CON OBSERVACIONES** | Fallos menores en tests no críticos (documentar) |
| ❌ **FALLIDO** | Cualquier error en carga, visualización de paciente, AR, dashboard o estadísticas |
| 🚫 **NO PROCEDE** | Falta Excel de prueba o entorno no disponible |

---

## Evidencias requeridas

- Captura de pantalla del dashboard de paciente.
- Captura de consola F12 (pestaña Console).
- Captura de `sessionStorage` (Application > Storage > Session Storage).
- Para fallos: mensaje de error, línea, stack trace.
