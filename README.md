# Hub Clínico Reumatología - Badajoz

Aplicación web local-first para captura estructurada de datos clínicos en Reumatología, sin instalación y sin backend remoto.

## Estado actual
- Entorno objetivo: Hospital de Badajoz (restricciones STIC).
- Patologías activas: `ESPA`, `APS`, `AR`.
- Base de datos local compartida: `Hub_Clinico_Maestro.xlsx`.
- Flujo de persistencia: exportar CSV (1 fila) y pegar manualmente en Excel.

## Qué hace actualmente
1. Registro de primera visita y seguimiento.
2. Cálculo automático de índices clínicos (incluyendo AR: DAS28/CDAI/SDAI/RAPID3).
3. Búsqueda de pacientes con vista rápida (quick view) y navegación al dashboard de paciente.
4. Dashboard de paciente con métricas por patología y evolución longitudinal.
5. Dashboard de estadísticas poblacionales con filtros por cohorte.
6. Exportación dual:
   - `TXT` para historia clínica.
   - `CSV` estructurado para base de datos (Excel).

## Reglas críticas de operación
- Primera visita y seguimiento de una misma patología se guardan en la misma hoja (`ESPA`, `APS`, `AR`) para permitir evolución.
- La app no sincroniza automáticamente con el Excel compartido en tiempo real.
- Para ver nuevas filas añadidas por otros usuarios, hay que recargar la base de datos en la app.

## Estructura de datos (alto nivel)
Archivo maestro:
- `Hub_Clinico_Maestro.xlsx`

Hojas clínicas:
- `ESPA`
- `APS`
- `AR`

Hojas de soporte:
- `Fármacos`
- `Profesionales`

## Documentación de referencia
- Arquitectura e implementación: `ARCHITECTURE.md`
- Contrato de datos: `docs/CONTRATO_DATOS_UNIFICADO.md`
- Plantilla operativa AR: `docs/template_ar_excel.md`
- Estado funcional implementado: `docs/ESTADO_IMPLEMENTACION.md`
- Manual usuario (clínico): `docs/Manual_Usuario_Hub_Clinico_Badajoz.docx`
- Manual usuario (PDF): `docs/Manual_Usuario_Hub_Clinico_Badajoz.pdf`
- Manual rápido técnico: `docs/manual_usuario.md`

## Limitaciones conocidas (diseño intencional)
- Sin backend remoto ni auto-sync por restricciones del entorno.
- Escritura en BD por pegado manual de CSV.
- Dependencia de disciplina operativa para recarga de BD y calidad de nomenclatura.

## Mantenimiento
Cuando se cambie formulario, exportación o lectura de BD, actualizar siempre:
1. Código (`formController`, `exportManager`, `dataManager`, scripts de página).
2. Contrato de datos (`docs/CONTRATO_DATOS_UNIFICADO.md`).
3. Plantillas/cabeceras Excel.
4. Estado funcional (`docs/ESTADO_IMPLEMENTACION.md`).
