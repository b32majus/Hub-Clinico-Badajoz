# Estado de Implementación - Hub Clínico Badajoz

Este archivo resume el estado funcional real de la aplicación para onboarding rápido de cualquier persona del equipo técnico/funcional.

## 1. Estado global
- Aplicación operativa en entorno local hospitalario.
- Patologías soportadas: ESPA, APS, AR.
- Persistencia: Excel compartido (`Hub_Clinico_Maestro.xlsx`) como backend local.

## 2. Funcionalidades implementadas
### Formularios
- Primera visita y seguimiento para ESPA, APS y AR.
- Validación diferenciada por patología.
- Cálculo de índices clínicos en tiempo real.
- Homúnculo interactivo para NAD/NAT/dactilitis.

### Seguimiento - precarga estable
- Precarga desde última visita para datos estables:
  - Identificación (ID, nombre, diagnóstico).
  - Tratamiento actual y fecha inicio.
  - Comorbilidades.
  - Manifestaciones extraarticulares.
  - Biomarcadores (HLA-B27, FR, aPCC, ANA en AR).
  - IMC/peso/talla cuando están disponibles.
- No precarga datos dinámicos de actividad/PROs.

### Exportación
- TXT para historia clínica.
- CSV de una fila para BD.
- Enrutado por patología a hoja correcta (`ESPA`, `APS`, `AR`).
- Primera visita y seguimiento comparten estructura por hoja.

### Dashboards
- Dashboard principal con tarjetas y métricas por patología.
- Quick view desde buscador + navegación a dashboard paciente.
- Dashboard paciente con evolución y métricas AR integradas.
- Estadísticas poblacionales con filtros AR y paginación.

## 3. Base de datos Excel
- Hojas clínicas activas: `ESPA`, `APS`, `AR`.
- Hojas soporte: `Fármacos`, `Profesionales`.
- Criterio longitudinal: misma hoja por patología para primera + seguimiento.

## 4. Reglas operativas cerradas
1. Tras exportar CSV, pegar en la hoja de patología correspondiente.
2. Guardar el Excel compartido.
3. Recargar BD en la app para reflejar cambios externos.

## 5. Restricciones aceptadas
- Sin sincronización automática en tiempo real con Excel compartido.
- Sin backend remoto por política del entorno.
- Carga de datos dependiente de recarga manual de sesión.

## 6. Documentos canónicos
- Contrato de datos: `docs/CONTRATO_DATOS_UNIFICADO.md`
- Plantilla AR: `docs/template_ar_excel.md`
- Manual usuario: `docs/Manual_Usuario_Hub_Clinico_Badajoz.docx`
- Arquitectura: `ARCHITECTURE.md`

## 7. Pendientes recomendados (no bloqueantes)
- Aviso persistente de “BD potencialmente desactualizada” por tiempo de sesión.
- Checklist técnico pre-release (UTF-8 + sintaxis JS + flujo exportación).
- Mejoras de usabilidad por rol (incluyendo futura vista farmacéutica).

Última actualización: 2026-03-05.
