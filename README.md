# Hub Clínico Reumatología - Badajoz

Aplicación web `local-first` para captura estructurada de datos clínicos en Reumatología, sin instalación y sin backend remoto.

## Estado del proyecto
- Entorno: adaptación operativa para Hospital de Badajoz.
- Patologías activas: `ESPA`, `APS`, `AR`.
- Base de datos local compartida: `Hub_Clinico_Maestro.xlsx`.

## Objetivo
Estandarizar primera visita y seguimiento en una estructura única por patología, exportando filas CSV para análisis clínico y explotación en dashboards.

## Arquitectura funcional
- La app funciona en navegador (HTML/CSS/JS).
- No envía datos a servidores externos.
- El “backend” es un Excel maestro compartido en red del servicio.
- Cada visita genera una fila CSV para pegar en la hoja de la patología correspondiente.

## Flujo de trabajo real
1. Abrir la app (`index.html` o despliegue interno).
2. Cargar `Hub_Clinico_Maestro.xlsx` desde el botón de carga de BD.
3. Completar formulario (primera visita o seguimiento).
4. Exportar:
   - `TXT` para historia clínica.
   - `CSV` (1 fila) para base de datos.
5. Pegar la fila CSV en la última fila libre de la hoja correcta (`ESPA`, `APS`, `AR`).
6. Guardar Excel.

## Importante: actualización de datos en sesión
La app carga una copia de la BD al inicio de sesión y trabaja con esa copia en memoria/cache local.

- Si otro profesional pega nuevas filas en el Excel compartido, tu sesión no lo verá automáticamente.
- Para ver datos actualizados en buscador, dashboard paciente y estadísticas, hay que volver a cargar el Excel en la app.

## Estructura de base de datos
Archivo maestro:
- `Hub_Clinico_Maestro.xlsx`

Hojas clínicas:
- `ESPA`
- `APS`
- `AR`

Hojas de soporte:
- `Fármacos`
- `Profesionales`

## Módulos principales
- `modules/dataManager.js`: carga Excel, estado de datos, consultas de pacientes/cohorte.
- `modules/formController.js`: validación y recopilación de formularios.
- `modules/exportManager.js`: generación de TXT/CSV.
- `scripts/script_dashboard.js`: dashboard de paciente (extendido).
- `scripts/script_estadisticas.js`: estadísticas poblacionales.

## Documentación funcional
- Contrato de datos unificado: `docs/CONTRATO_DATOS_UNIFICADO.md`
- Plantilla AR (cabeceras): `docs/template_ar_excel.md`
- Manual de usuario (clnico, DOCX): `docs/Manual_Usuario_Hub_Clinico_Badajoz.docx`
- Manual tcnico/rpido (Markdown): `docs/manual_usuario.md`

## Recomendaciones operativas para el servicio
- Definir responsable por turno para consolidación del Excel.
- Evitar edición simultánea de la misma fila en Excel.
- Realizar copias de seguridad periódicas del archivo maestro.
- Homogeneizar nomenclatura de profesionales y tratamientos para mejorar análisis.

## Limitaciones conocidas (diseño intencional)
- Sin sincronización automática en tiempo real con el Excel compartido.
- Requiere recarga manual de BD para reflejar cambios externos.
- Escritura en BD mediante pegado de filas CSV.

## Soporte interno
Para cambios de formulario, columnas o reglas clínicas, actualizar siempre:
1. Código de captura/validación/exportación.
2. Contrato de datos (`docs/CONTRATO_DATOS_UNIFICADO.md`).
3. Plantillas de hoja en Excel.
