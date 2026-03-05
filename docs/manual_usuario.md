# Manual de Usuario - Hub Clínico Reumatología (Badajoz)

## 1. ¿Qué es esta herramienta
Es una aplicación local para registrar visitas de Reumatología y generar:
- Texto clínico (`TXT`) para historia.
- Fila estructurada (`CSV`) para pegar en el Excel maestro del servicio.

No necesita instalación ni servidor externo.

## 2. Antes de empezar
Necesitas:
- Acceso al archivo compartido `Hub_Clinico_Maestro.xlsx`.
- Navegador actualizado (Edge/Chrome recomendado).

## 3. Inicio de sesión de trabajo
1. Abrir la app.
2. Pulsar **Cargar Base de Datos**.
3. Seleccionar `Hub_Clinico_Maestro.xlsx`.
4. Confirmar que la carga fue correcta.

## 4. Registrar una Primera Visita
1. Ir a **Nueva Visita**.
2. Completar datos obligatorios.
3. Revisar índices calculados automáticamente.
4. Exportar:
   - **TXT** para historia clínica.
   - **CSV** para base de datos.
5. Abrir Excel y pegar la fila en la hoja correcta (`ESPA`, `APS` o `AR`).

## 5. Registrar un Seguimiento
1. Buscar paciente (buscador/quick view/dashboard).
2. Entrar a **Visita de Seguimiento**.
3. Completar cambios clínicos y terapéuticos.
4. Exportar CSV y pegar en la misma hoja de patología del paciente.

Importante:
- Primera visita y seguimiento van en la misma hoja por patología.
- Esto permite ver evolución longitudinal en dashboards.

## 6. Dashboards
### 6.1 Dashboard rápido (buscador)
Muestra resumen inicial y acceso al dashboard extendido.

### 6.2 Dashboard de paciente
Muestra evolución temporal de índices y tratamiento del paciente.

### 6.3 Estadísticas del servicio
Permite filtrar cohorte y analizar actividad, biomarcadores y tratamientos.

## 7. Regla crítica de actualización de datos
La app NO se sincroniza sola con el Excel compartido.

Esto significa:
- Si alguien añade filas nuevas en Excel, tu sesión no las ve automáticamente.
- Debes **recargar la base de datos** en la app para ver información actualizada.

Recomendación práctica:
- Recargar BD periódicamente (por ejemplo cada 15-30 minutos) o antes de revisar dashboards.

## 8. Buenas prácticas de calidad de datos
- Pegar cada fila en la hoja correcta (`ESPA`, `APS`, `AR`).
- No modificar el orden de columnas del Excel maestro.
- Usar nomenclatura consistente en fármacos y profesionales.
- Diferenciar `NO` de `ND` (No Determinado) según protocolo del servicio.

## 9. Errores frecuentes
- “No encuentro un paciente”: recargar BD y repetir búsqueda.
- “No salen cambios en estadísticas”: probablemente la sesión no tiene la última versión del Excel.
- “Fila mal pegada”: revisar que se pegó en la hoja correcta y en una fila nueva.

## 10. Archivos de referencia
- Contrato de datos: `docs/CONTRATO_DATOS_UNIFICADO.md`
- Plantilla AR: `docs/template_ar_excel.md`
- Base de datos maestra: `Hub_Clinico_Maestro.xlsx`
