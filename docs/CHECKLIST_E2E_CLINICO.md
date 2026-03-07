# Checklist E2E Clínico

Última actualización: 2026-03-07.

## Última ejecución registrada
- Fecha: 2026-03-07
- Medio: Playwright MCP en WSL
- Resultado:
  - `OK` carga del Excel maestro desde `index.html`
  - `OK` selector de profesional tras carga de BD
  - `OK` estado visible `BD cargada`
  - `OK` primera visita AR con catálogos de tratamiento poblados
  - `OK` seguimiento AR con selects de tratamiento poblados
  - `KO`: ninguno en la smoke base ejecutada

## Objetivo
Definir una batería manual mínima, repetible y orientada a entrega clínica para validar los flujos principales del Hub Clínico antes de una release o después de cambios con riesgo funcional.

## Preparación común
- Usar una copia controlada de `Hub_Clinico_Maestro.xlsx`.
- Hacer recarga completa del navegador antes de empezar (`hard refresh`).
- Confirmar que la BD carga sin errores visibles y que las hojas `ESPA`, `APS`, `AR`, `Fármacos` y `Profesionales` están disponibles.
- Validar que los desplegables de fármacos muestran catálogo y no el mensaje de fallback.
- Preparar un paciente identificable por cada patología para pruebas de seguimiento.

## Salida esperada
- Cada bloque debe quedar marcado como `OK`, `KO` o `NA`.
- Si hay `KO`, registrar:
  - pantalla
  - patología
  - pasos exactos
  - resultado observado
  - resultado esperado

## 1. Carga de base de datos
- Cargar el Excel maestro desde `index.html`.
- Verificar que no aparece aviso amarillo persistente por cabeceras incompatibles.
- Verificar que el estado de sesión indica BD cargada.
- Confirmar acceso normal a primera visita, seguimiento y estadísticas.

## 2. Primera visita ESPA
- Abrir primera visita para `ESPA`.
- Completar identificación mínima y campos obligatorios.
- Introducir valores clínicos básicos y biomarcadores.
- Añadir tratamiento actual con un fármaco real del catálogo.
- Exportar.
- Verificar:
  - no hay errores JS visibles
  - se genera TXT/CSV
  - la fila exportada contiene ID, fecha, patología y tratamiento

## 3. Seguimiento ESPA
- Abrir seguimiento para un paciente ESPA existente.
- Confirmar precarga de datos previos.
- Modificar score principal y tratamiento.
- Exportar.
- Verificar:
  - el paciente correcto queda seleccionado
  - la visita previa se detecta
  - el cambio queda reflejado en la exportación

## 4. Primera visita APS
- Abrir primera visita para `APS`.
- Completar identificación, actividad clínica y tratamiento.
- Registrar un valor que active cálculo relevante de score.
- Exportar.
- Verificar:
  - no falla la lógica de cálculo
  - el CSV/TXT sale con columnas esperadas
  - el tratamiento exportado coincide con el seleccionado

## 5. Seguimiento APS
- Abrir seguimiento para un paciente APS existente.
- Confirmar precarga y actualización de datos.
- Cambiar score, decisión terapéutica y tratamiento.
- Exportar.
- Verificar:
  - no se rompe la navegación por paciente
  - los campos precargados son coherentes
  - la visita nueva se exporta completa

## 6. Primera visita AR
- Abrir primera visita para `AR`.
- Validar render de extraarticulares, Sjögren, HAQ y RAPID3.
- Seleccionar fármacos de los desplegables.
- Exportar.
- Verificar:
  - los desplegables de fármacos cargan catálogo
  - las ayudas visuales siguen alineadas
  - no hay regresiones tras la limpieza de estilos

## 7. Seguimiento AR
- Abrir seguimiento para un paciente AR existente.
- Confirmar que el paso inicial, la precarga y los índices funcionan.
- Modificar DAS28/CDAI/SDAI o RAPID3 según disponibilidad.
- Exportar.
- Verificar:
  - el encabezado y paneles renderizan correctamente
  - los scores se recalculan sin errores
  - la exportación refleja la nueva visita

## 8. Quick View y dashboard paciente
- Buscar un paciente desde el dashboard/buscador.
- Abrir quick view.
- Navegar a `dashboard_paciente.html`.
- Verificar:
  - la búsqueda resuelve el paciente correcto
  - la URL se construye bien
  - el quick view muestra datos clave sin bloques vacíos inesperados
  - el dashboard muestra KPIs y accesos de navegación válidos

## 9. Estadísticas
- Abrir `estadisticas.html`.
- Filtrar por patología.
- Buscar por ID o nombre.
- Ordenar por ID, nombre, fecha y métrica.
- Verificar:
  - la tabla responde a filtros y búsqueda
  - la ordenación no rompe paginación
  - la métrica visible es coherente con la patología

## 10. Exportación y buffer de pendientes
- Exportar una visita.
- Simular incidencia de pegado o pérdida de clipboard.
- Recuperar la fila desde el buffer de pendientes.
- Marcar la fila como resuelta.
- Recargar la página.
- Verificar:
  - la fila pendiente sigue disponible hasta resolverse
  - al resolverla desaparece del estado pendiente
  - no se pierde la capacidad de exportar una segunda visita

## 11. Cierre mínimo de validación
- Repetir comprobación rápida de carga de BD.
- Confirmar que no hay mensajes engañosos de “cargue la base de datos” con la sesión activa.
- Registrar fecha, versión probada y resultado global.

## Criterio de salida
- Aceptable para entrega clínica interna:
  - sin `KO` en carga de BD, exportación, seguimiento AR y catálogo de fármacos
  - como máximo `KO` menores visuales documentados y sin impacto en exportación ni navegación
