# Auditoría pantalla a pantalla de Farmacia post-PR #20

Status: pending_review

## 1. Resumen ejecutivo

La preview de Farmacia Hospitalaria está publicada en la rama correcta y ofrece un recorrido de demo amplio: inicio, validación, primera visita, seguimiento, dashboard, actividad, estadísticas, catálogo, profesionales e importación/copia de datos. La mayoría de pantallas y acciones probadas funcionan con datos sintéticos. No obstante, el conjunto queda **demo-ready con preocupaciones**, no listo para piloto real: el dashboard del caso FH-004 lanza una excepción JavaScript, un check específico de importación Enfermería→Validación falla y no existe persistencia, identidad, autorización, trazabilidad ni integración institucional real.

No se observaron decisiones clínicas automáticas que deban aceptarse sin intervención profesional durante las acciones realizadas. Los formularios sí permiten registrar dosis, vía, pauta, presentación, inducción, optimización y suspensión; esos valores son entradas o datos demo, no deben interpretarse como inferencias ni recomendaciones. Esta auditoría técnica no sustituye la revisión funcional de Sil ni la validación clínica/estratégica de Sil/Cora.

## 2. Snapshot

| Campo | Evidencia |
|---|---|
| Fecha | 2026-07-14 |
| Rama auditada | `preview/demo-lunes-wo4-20260614` mediante `work/hermes/WO-FH-SCREEN-AUDIT-POST-PR20-01-20260714` |
| HEAD | `8e491f89bf90c64fd466851920e09ab3e14968e1` |
| Entorno | HTTP local `127.0.0.1:8765`, Chromium headless, viewport 1024×900, Playwright 1.60.0, Node 24.15.0 |
| Datos | Exclusivamente fixtures y casos sintéticos del repositorio |
| Sintaxis | `node --check script.js` y `scripts/farmacia_*.js`: PASS |
| Checks del repo | Checks ejecutados secuencialmente: todos los anteriores al check de importación pasan; `farmacia_validacion_enfermeria_import_check.mjs`: FAIL con `TypeError` en `formServicioManual.classList` |
| Smoke Farmacia | `node tools/farmacia_smoke_check.mjs`: PASS, salida final `RESULTADO: 48 OK / 0 FALLIDO` y `Smoke check PASSED`. El conteo 38 de documentación/expectativas anteriores no corresponde al script ejecutado en este snapshot: el check actual incluye verificaciones posteriores, entre ellas señales multibiológico y contrato mínimo de entrada manual. |
| Storage policy | PASS |
| Import Enfermería | `node tools/farmacia_enfermeria_import_check.mjs`: PASS, salida final `Total: 95 passed, 0 failed`. El conteo 71 no corresponde a la versión ejecutada: el parser actual añade casos O-W para normalización, estados, badges y visibilidad. Check integración Validación: FAIL. |
| Browser general | 11 rutas HTTP 200; acciones principales ejecutadas; suite termina FAIL por 2 `pageerror` reproducibles en dashboard FH-004 |
| Autocomplete | PASS: 7 resultados visibles para `secu` |
| Exportaciones | Validación 1382 caracteres/61 columnas; primera visita 546/61; seguimiento 2281/61 |

### Verificación de observaciones del reviewer

| Observación | Veredicto basado en evidencia |
|---|---|
| Smoke supuestamente 38 | Rechazada. El comando exacto sobre el commit auditado produce 48 comprobaciones correctas. El número 38 describe una expectativa/documentación anterior, no la ejecución actual. |
| Parser Enfermería supuestamente 71 | Rechazada. El comando exacto produce 95 comprobaciones correctas. El script actual contiene casos adicionales de normalización y bandeja. |
| Tablas supuestamente incompletas con 17 de 18 campos | Rechazada. La WO enumera literalmente 17 campos y cada una de las 11 tablas contiene esos 17. No existe un campo 18 exigible y no se añade uno artificial. |

## 3. Resumen de pantallas

| Pantalla | Existe | Cableada | Visible | Navegador | Rama correcta | Demo | Piloto real | Producto futuro |
|---|---|---|---|---|---|---|---|---|
| Hub Reumatología / entrada cruzada | Sí | Sí | Sí | Sí | Sí | Parcial | No | Parcial |
| Inicio Farmacia | Sí | Sí | Sí | Sí | Sí | Sí | No | Parcial |
| Validación farmacoterapéutica | Sí | Sí | Sí | Parcial | Sí | Parcial | No | Parcial |
| Primera visita FH | Sí | Sí | Sí | Sí | Sí | Sí | No | Parcial |
| Seguimiento FH | Sí | Sí | Sí | Sí | Sí | Sí | No | Parcial |
| Dashboard paciente | Sí | Sí | Sí | Parcial | Sí | Parcial | No | Parcial |
| Dashboard longitudinal exploratorio | Sí | Sí | Localizable | Sí | Sí | Parcial | No | Parcial |
| Actividad del servicio | Sí | Sí | Sí | Sí | Sí | Sí | No | Parcial |
| Estadísticas | Sí | Sí | Sí | Sí | Sí | Sí | No | Parcial |
| Fármacos / autocomplete | Sí | Sí | Sí | Sí | Sí | Sí | No | Parcial |
| Profesionales | Sí | Estática/demo | Sí | Sí | Sí | Sí | No | Parcial |

## 4. Detalle por pantalla

### 4.1 Hub Reumatología / `index.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | `index.html` |
| Objetivo asistencial | Entrada al Hub Reumatología y navegación cruzada a Farmacia. |
| Qué se ve | Carga de Excel, búsqueda CIP, accesos de consulta y enlace Farmacia Hospitalaria. |
| Qué datos usa | Excel local Reuma y estado de sesión; no se cargó dato real. |
| Qué acciones permite | Cargar, buscar, navegar a visitas/estadísticas/Farmacia. |
| Qué está cableado | Enlace bidireccional Reuma↔Farmacia verificado. |
| Qué parece mock/demo | Perfil/sesión de interfaz; sin autenticación real. |
| Funciona en navegador Sí/No/Parcial | Sí para render y navegación cruzada. |
| Consola limpia Sí/No/Parcial | Sí en carga auditada. |
| Riesgo clínico | No evaluado en profundidad por quedar fuera del núcleo FH. |
| Riesgo privacidad | La carga local puede contener identificadores; no hay control técnico de acceso. |
| Deuda funcional | El gate visual no equivale a permisos. |
| Deuda técnica | Dependencias CDN y arquitectura local-first. |
| Sirve demo Sí/No/Parcial | Parcial. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P1. |
| Recomendación | Mantener explícita la diferencia entre selector de perfil y autorización real; validar con Sil/Cora. |

### 4.2 Inicio Farmacia / `farmacia_index.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | `farmacia_index.html` |
| Objetivo asistencial | Buscar por CIP, abrir caso existente o iniciar alta guiada; importar fuentes. |
| Qué se ve | Buscador, caso FH-004, importadores, bandeja pendiente y accesos rápidos. |
| Qué datos usa | Demo fallback, Excel sintético Enfermería y Excel sintético FH, catálogo local/CIMA. |
| Qué acciones permite | Buscar, alta guiada, importar, abrir validación y navegar. |
| Qué está cableado | Búsqueda existente y nueva, ambos importadores y navegación. |
| Qué parece mock/demo | Casos FH-001..004, profesional FH-01 y fallback demo. |
| Funciona en navegador Sí/No/Parcial | Sí; importó 4 registros Enfermería y 10 FH. |
| Consola limpia Sí/No/Parcial | Sí. |
| Riesgo clínico | La bandeja es apoyo operativo, no decisión clínica. |
| Riesgo privacidad | Puede importar nombre y CIP juntos en memoria de navegador. |
| Deuda funcional | Tras ambas importaciones la prueba observó 0 tarjetas pendientes; requiere confirmar expectativa funcional. |
| Deuda técnica | Estado compartido en navegador y contratos Excel provisionales. |
| Sirve demo Sí/No/Parcial | Sí, con guion controlado. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P1. |
| Recomendación | WO de regresión importación/bandeja con fixture canónico y resultado esperado validado por Sil/Cora. |

### 4.3 Validación / `farmacia_validacion.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | `farmacia_validacion.html` |
| Objetivo asistencial | Revisar solicitud y registrar Pendiente, Validado o Denegado. |
| Qué se ve | Origen, tipo, solicitud, prebiológico, tratamiento validado, estado y exportación. |
| Qué datos usa | Contexto URL/demo, importaciones de sesión, catálogo y entradas profesionales. |
| Qué acciones permite | Completar tratamiento, estado, cita, observaciones, copiar TXT JARA y fila Excel. |
| Qué está cableado | Bloque de validación visible con caso sintético; copias generan 1382 caracteres y 61 columnas. |
| Qué parece mock/demo | Profesional fijo, sin persistencia; opción futura de servicio compatible. |
| Funciona en navegador Sí/No/Parcial | Parcial: acción principal funciona, check de importación específico falla. |
| Consola limpia Sí/No/Parcial | Sí en recorrido manual auditado. |
| Riesgo clínico | Campos sensibles son editables; no asumir dosis/vía/pauta/presentación/inducción ni validez. |
| Riesgo privacidad | CIP/nombre pueden coexistir en datos importados y exportados. |
| Deuda funcional | Integración Enfermería→Validación no tiene check verde completo. |
| Deuda técnica | Harness falla por dependencia DOM (`formServicioManual`). |
| Sirve demo Sí/No/Parcial | Parcial. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P1. |
| Recomendación | Corregir primero el contrato/harness DOM y repetir flujo completo sin cambiar reglas clínicas sin validación. |

### 4.4 Primera visita / `farmacia_primera_visita.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | `farmacia_primera_visita.html` |
| Objetivo asistencial | Registrar inicio de seguimiento farmacoterapéutico. |
| Qué se ve | CIP, servicio, indicación, tratamiento, inducción, estratificación, PROMs y notas. |
| Qué datos usa | Caso demo, catálogo y entradas manuales. |
| Qué acciones permite | Buscar CIP, seleccionar fármaco, registrar visita y copiar TXT/fila Excel. |
| Qué está cableado | Búsqueda, autocomplete (7 resultados), TXT 546 caracteres y Excel 61 columnas. |
| Qué parece mock/demo | Sin persistencia; profesional y casos sintéticos. |
| Funciona en navegador Sí/No/Parcial | Sí para acciones probadas. |
| Consola limpia Sí/No/Parcial | Sí. |
| Riesgo clínico | Inducción aparece con opción inicial “Sí”; exige confirmación profesional explícita, no inferencia. |
| Riesgo privacidad | Salidas copiadas pueden contener CIP y datos clínicos. |
| Deuda funcional | Falta ciclo persistente/auditable. |
| Deuda técnica | Estado local y salida provisional. |
| Sirve demo Sí/No/Parcial | Sí. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P1. |
| Recomendación | Validar con Sil/Cora defaults clínicos y contrato de salida antes de piloto. |

### 4.5 Seguimiento / `farmacia_seguimiento.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | `farmacia_seguimiento.html` |
| Objetivo asistencial | Registrar evolución, adherencia, PROMs, movimientos terapéuticos y RAM. |
| Qué se ve | Línea actual, concomitantes, optimización/suspensión, Morisky, PROMs, Naranjo/Karch-Lasagna y exportación. |
| Qué datos usa | Caso FH-004 y entradas manuales. |
| Qué acciones permite | Seleccionar línea/movimiento, registrar EA, calcular cuestionarios y copiar salidas. |
| Qué está cableado | EA activa Naranjo; TXT 2281 caracteres y Excel 61 columnas. |
| Qué parece mock/demo | Sin persistencia ni farmacovigilancia integrada. |
| Funciona en navegador Sí/No/Parcial | Sí para recorrido probado. |
| Consola limpia Sí/No/Parcial | Sí. |
| Riesgo clínico | Optimización, suspensión y causalidad son registro profesional, no recomendación automática. |
| Riesgo privacidad | Exportación manual combina identificador y detalle clínico. |
| Deuda funcional | No existe ciclo de aprobación, renovación o validez real. |
| Deuda técnica | Estado temporal y contrato Excel provisional. |
| Sirve demo Sí/No/Parcial | Sí. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P1. |
| Recomendación | WO clínica separada para validar semántica de movimientos y causalidad; no automatizar decisiones. |

### 4.6 Dashboard paciente / `farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-004`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | Dashboard individual FH-004. |
| Objetivo asistencial | Resumen longitudinal de tratamiento, actividad, PROMs y eventos. |
| Qué se ve | Tres líneas biológicas, timelines, actividad, PROMs, EA y acceso a seguimiento. |
| Qué datos usa | Dataset sintético FH-004. |
| Qué acciones permite | Navegar, abrir vista longitudinal y copiar fila Excel. |
| Qué está cableado | Caso, líneas y panel longitudinal renderizan. |
| Qué parece mock/demo | Todo el caso es sintético. |
| Funciona en navegador Sí/No/Parcial | Parcial: render visible, pero hay excepción JS. |
| Consola limpia Sí/No/Parcial | No: `Cannot read properties of undefined (reading 'localeCompare')`, reproducida dos veces. |
| Riesgo clínico | Una excepción puede omitir/ordenar mal eventos sin aviso visible. |
| Riesgo privacidad | Muestra CIP junto con datos longitudinales. |
| Deuda funcional | Estado parcial puede aparentar completitud aunque un render haya fallado. |
| Deuda técnica | Ordenaciones asumen fecha definida en varios arrays. |
| Sirve demo Sí/No/Parcial | Parcial. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P1. |
| Recomendación | WO de corrección acotada con fixture FH-004 y test que falle si falta identidad temporal completa. |

### 4.7 Dashboard longitudinal / `farmacia_dashboard_longitudinal.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | Vista longitudinal exploratoria. |
| Objetivo asistencial | Explorar PROM, actividad, tratamiento y EA por paciente. |
| Qué se ve | Selector paciente, gráficos, timeline, EA y leyenda. |
| Qué datos usa | Dataset demo del navegador. |
| Qué acciones permite | Seleccionar paciente/variables. |
| Qué está cableado | Render inicial y controles. |
| Qué parece mock/demo | Banner “Sandbox técnico v0.3”; no es vista canónica. |
| Funciona en navegador Sí/No/Parcial | Sí en carga básica; no se exhaustaron combinaciones. |
| Consola limpia Sí/No/Parcial | Sí en carga auditada. |
| Riesgo clínico | Eventos futuros necesitan identidad técnica y fecha completas; no inferir fechas. |
| Riesgo privacidad | Selector reúne identidad y trayectoria clínica. |
| Deuda funcional | Vista duplicada/exploratoria frente al dashboard canónico. |
| Deuda técnica | Ordenaciones también presuponen fechas definidas. |
| Sirve demo Sí/No/Parcial | Parcial. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P2. |
| Recomendación | Mantenerla etiquetada como sandbox hasta consolidar contrato temporal. |

### 4.8 Actividad / `farmacia_actividad_servicio.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | Actividad del servicio. |
| Objetivo asistencial | Visualizar pendientes, actividad y bloqueantes. |
| Qué se ve | Indicadores demo/importados y panel desplegable. |
| Qué datos usa | Demo e importaciones del navegador. |
| Qué acciones permite | Abrir el panel de pendientes/actividad. |
| Qué está cableado | Una tarjeta interactiva y panel visible. |
| Qué parece mock/demo | Indicadores de fuente demo. |
| Funciona en navegador Sí/No/Parcial | Sí para interacción básica. |
| Consola limpia Sí/No/Parcial | Sí. |
| Riesgo clínico | No usar recuentos como verdad asistencial. |
| Riesgo privacidad | Agregación local sin controles de rol reales. |
| Deuda funcional | Alcance de requests/blockers depende de importaciones y fallback. |
| Deuda técnica | Sin repositorio ni trazabilidad. |
| Sirve demo Sí/No/Parcial | Sí. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P2. |
| Recomendación | Definir con Sil/Cora el significado operativo de cada contador antes de piloto. |

### 4.9 Estadísticas / `farmacia_estadisticas.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | Estadísticas del servicio. |
| Objetivo asistencial | Análisis poblacional filtrable. |
| Qué se ve | KPIs, filtros, gráficos, tabla y exportar informe. |
| Qué datos usa | Cohorte demo; aviso de integración importada incompleta. |
| Qué acciones permite | Filtrar, personalizar y exportar informe. |
| Qué está cableado | Filtro por servicio dejó 17 filas; botón exportar ejecutado. |
| Qué parece mock/demo | Estadísticas derivadas/generadas sobre datos sintéticos. |
| Funciona en navegador Sí/No/Parcial | Sí para filtro y acción probados. |
| Consola limpia Sí/No/Parcial | Sí. |
| Riesgo clínico | Métricas no deben guiar decisiones reales. |
| Riesgo privacidad | Tabla poblacional reúne identificadores y variables clínicas. |
| Deuda funcional | Importaciones no alimentan aún toda la estadística. |
| Deuda técnica | Generación demo y ausencia de backend analítico. |
| Sirve demo Sí/No/Parcial | Sí. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P2. |
| Recomendación | Mantener avisos demo y validar definiciones de KPI antes de cualquier piloto. |

### 4.10 Fármacos / `farmacia_farmacos.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | Catálogo Farmacia. |
| Objetivo asistencial | Referencia de catálogo para formularios. |
| Qué se ve | Estado técnico y tabla demo. |
| Qué datos usa | CIMA cuando carga y fallback local. |
| Qué acciones permite | Consulta; autocomplete se usa en formularios. |
| Qué está cableado | Autocomplete devolvió 7 resultados visibles para `secu`. |
| Qué parece mock/demo | Tabla fija con dosis/pautas frecuentes. |
| Funciona en navegador Sí/No/Parcial | Sí. |
| Consola limpia Sí/No/Parcial | Sí. |
| Riesgo clínico | Catálogo es contexto, no prescripción ni contrato definitivo. |
| Riesgo privacidad | Bajo en esta pantalla. |
| Deuda funcional | Sin versionado/validación institucional del catálogo. |
| Deuda técnica | Dependencia de carga automática y fallback. |
| Sirve demo Sí/No/Parcial | Sí. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P2. |
| Recomendación | Diferenciar visualmente referencia de catálogo y decisión prescrita/validada. |

### 4.11 Profesionales / `farmacia_profesionales.html`

| Campo | Resultado |
|---|---|
| Pantalla/ruta | Profesionales Farmacia. |
| Objetivo asistencial | Mostrar equipo/roles demo. |
| Qué se ve | Cuatro profesionales sintéticos y estado activo. |
| Qué datos usa | Datos estáticos demo. |
| Qué acciones permite | Consulta, sin gestión real. |
| Qué está cableado | Render estático y navegación. |
| Qué parece mock/demo | Toda la pantalla. |
| Funciona en navegador Sí/No/Parcial | Sí. |
| Consola limpia Sí/No/Parcial | Sí. |
| Riesgo clínico | Un rol visible no acredita responsabilidad ni firma. |
| Riesgo privacidad | Bajo con datos sintéticos; futuro directorio requiere gobernanza. |
| Deuda funcional | No hay autenticación, permisos ni asignación real. |
| Deuda técnica | Datos hardcoded. |
| Sirve demo Sí/No/Parcial | Sí. |
| Sirve piloto real Sí/No/Parcial | No. |
| Prioridad P0/P1/P2/P3 | P1. |
| Recomendación | No presentar badges/botones ocultos como control de permisos real. |

## 5. Findings por prioridad

### P0

No se confirmó ningún P0 con los datos sintéticos y recorridos ejecutados. Esto no certifica seguridad clínica ni privacidad para datos reales.

### P1

#### P1-01 — Excepción en dashboard FH-004

1. **Hecho observado:** Chromium registró dos `pageerror`: `Cannot read properties of undefined (reading 'localeCompare')` al cargar el dashboard FH-004.
2. **Interpretación técnica:** alguna colección longitudinal contiene un elemento sin fecha y las ordenaciones llaman `localeCompare` sin normalización/guard.
3. **Riesgo potencial:** render parcial u orden temporal incompleto que puede parecer válido.
4. **Validación requerida:** Sil/Cora deben confirmar el contrato temporal y qué eventos sin fecha son admisibles; no inferir fechas.

#### P1-02 — Check Enfermería→Validación roto

1. **Hecho observado:** `farmacia_validacion_enfermeria_import_check.mjs` falla con `TypeError` sobre `formServicioManual.classList`.
2. **Interpretación técnica:** el sandbox DOM del check y las expectativas actuales del script de Validación están desalineados.
3. **Riesgo potencial:** regresiones de importación pueden quedar sin cobertura aunque el importador base pase.
4. **Validación requerida:** Sil/Cora deben confirmar el flujo y resultado esperado antes de ajustar test o implementación.

#### P1-03 — Separación demo/piloto insuficiente como control técnico

1. **Hecho observado:** banners declaran demo/sin seguridad, pero la aplicación permite importar Excel, mostrar CIP/nombre/datos clínicos y exportarlos sin autenticación real.
2. **Interpretación técnica:** los avisos son copy preventivo, no controles de seguridad o autorización.
3. **Riesgo potencial:** uso accidental con datos reales o percepción de capacidad productiva.
4. **Validación requerida:** Sil/Cora e institución deben definir controles, entorno y política de datos antes de piloto.

### P2

#### P2-01 — Bandeja vacía tras importaciones sintéticas

1. **Hecho observado:** se importaron 4 registros Enfermería y 10 FH, y el selector directo de hijos de `pendingValidationCards` quedó en 0.
2. **Interpretación técnica:** puede ser filtrado correcto por estado, un detalle de render o una expectativa no documentada.
3. **Riesgo potencial:** confusión en demo sobre qué solicitudes deben aparecer.
4. **Validación requerida:** Sil/Cora deben definir el resultado esperado del fixture antes de clasificarlo como defecto.

#### P2-02 — Versiones y etiquetas heterogéneas

1. **Hecho observado:** conviven “v0.2”, “v0.3”, “v0.3 post-demo” y “sandbox técnico v0.3”.
2. **Interpretación técnica:** cada pantalla comunica madurez distinta dentro del mismo snapshot.
3. **Riesgo potencial:** confusión durante demo/revisión.
4. **Validación requerida:** Sil/Cora deben aprobar una taxonomía única de estado.

### P3

#### P3-01 — Arquitectura futura solo documental

1. **Hecho observado:** no existen las capas de plataforma enumeradas en la sección 13.
2. **Interpretación técnica:** el código sigue siendo frontend local-first con Excel/portapapeles.
3. **Riesgo potencial:** escalabilidad, concurrencia, auditoría e interoperabilidad no resueltas.
4. **Validación requerida:** cualquier priorización o arquitectura futura corresponde a Sil/Cora.

## 6. Riesgos clínicos

- Los campos de dosis, vía, pauta, presentación, inducción, optimización, suspensión, renovación y validez no deben rellenarse por inferencia. En la auditoría se trataron como datos demo/entradas, no como recomendaciones.
- El dashboard con excepción temporal puede quedar parcialmente renderizado; no debe usarse para interpretar trayectoria clínica.
- Naranjo y Karch-Lasagna son ayudas de registro/cálculo, no sustituyen valoración profesional.
- El catálogo y sus pautas frecuentes no son prescripción ni contrato clínico definitivo.
- Las fechas ausentes no deben estimarse ni ocultarse; el futuro evento requiere identidad técnica, fuente y fecha explícitas.

## 7. Riesgos de privacidad

- Importadores, dashboards y exportaciones pueden combinar CIP, nombre y variables clínicas en el mismo plano local.
- No hay autenticación, autorización, segregación por rol, auditoría ni cifrado de aplicación.
- El portapapeles y Excel manual amplían la superficie de copia accidental.
- La seudonimización futura no está implementada; no existe Identity Plane que separe la correspondencia identificativa.
- Solo se usaron datos sintéticos; esta auditoría no autoriza datos reales.

## 8. Deuda funcional

- Restaurar cobertura verde del flujo importación Enfermería→Validación.
- Definir resultado esperado de la bandeja para cada fixture/estado.
- Resolver el dashboard parcial antes de una demo sin supervisión.
- Validar semántica y defaults de campos clínicos con Sil/Cora.
- Definir ciclo real de solicitud, validación, primera visita, seguimiento, renovación y cierre.
- Definir responsabilidad/firma profesional y estados operativos reales.

## 9. Deuda técnica

- Normalización y contrato de fechas incompletos en vistas longitudinales.
- Estado local/sessionStorage y contratos Excel provisionales.
- Sin backend, repository layer, control de concurrencia ni trazabilidad.
- Dependencias de catálogo/CDN y fallback local con distinta procedencia.
- Datos demo y profesionales hardcoded.
- Tests DOM basados en sandbox pueden divergir del HTML real.

## 10. Demo-ready

La aplicación **sirve para demo con guion y operador técnico** porque las rutas cargan, la navegación cruzada funciona, los importadores aceptan fixtures sintéticos, el autocomplete responde y las tres pantallas clínicas copian TXT/Excel. Debe evitarse presentar el dashboard FH-004 como completamente limpio, y conviene anunciar desde el inicio que todo es sintético, local, provisional y sin integración JARA.

## 11. NOT real-pilot-ready

La aplicación **NO está lista para piloto real**. Faltan controles de identidad, permisos, privacidad, auditoría, persistencia, concurrencia, validación institucional, contratos clínicos definitivos e integración segura. Los banners y perfiles visibles no son controles reales. “Copiar texto JARA” es portapapeles manual, no integración JARA. “Copiar fila Excel FH” es una salida provisional, no repositorio clínico.

## 12. Siguientes WOs recomendadas

Estas son propuestas técnicas para revisión; no constituyen prioridad estratégica final.

| Grupo | WO recomendada | Alcance |
|---|---|---|
| P0/P1 corrections | `WO-FH-DASHBOARD-UNDEFINED-DATE-GUARD-01` | Reproducir FH-004, identificar evento sin fecha, definir contrato con Sil/Cora y eliminar excepción sin estimar fechas. |
| P0/P1 corrections | `WO-FH-ENFERMERIA-VALIDACION-IMPORT-REGRESSION-01` | Alinear harness DOM y flujo real; fixture canónico con estados esperados. |
| Demo improvements | `WO-FH-DEMO-STATE-LABELS-AND-SCRIPT-01` | Unificar v0.2/v0.3/sandbox y documentar recorrido/limitaciones. |
| Demo improvements | `WO-FH-PENDING-BOARD-FIXTURE-EXPECTATIONS-01` | Especificar qué registros aparecen tras cada importación sintética. |
| Real pilot | `WO-FH-PILOT-READINESS-GATES-01` | Requisitos institucionales de identidad, autorización, auditoría, datos, soporte y continuidad; sin implementar hasta aprobación. |
| Real pilot | `WO-FH-CLINICAL-DATA-CONTRACT-VALIDATION-01` | Validar campos, defaults, estados, fechas y salidas con responsables clínicos. |
| Future/V5 | `WO-FH-PLATFORM-PLANES-ARCHITECTURE-DECISION-01` | Decisión explícita sobre Identity/Event/Control/Repository/Lifecycle, con tradeoffs y gobernanza. |

## 13. Capacidades explícitamente no implementadas

- PROM Gateway.
- Identity Plane.
- Nursing Readiness Gateway.
- Clinical Event Plane.
- Control Plane real.
- Treatment Lifecycle Engine.
- Repository Layer.
- Backend real.
- Integración JARA real.

Los adaptadores, helpers, Excel y documentos actuales no deben presentarse como contratos clínicos definitivos ni como sustitutos de esas capacidades. Esta auditoría no rediseña el producto, no decide la prioridad final y no reemplaza la revisión funcional de Sil.
