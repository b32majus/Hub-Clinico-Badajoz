# TODO — Hub Clínico Badajoz

## Pendientes para cuando el desarrollo esté más avanzado

### 1. Refactorizar inline styles → clases CSS
- **Dónde**: `script.js` (templates HTML de quick-view del paciente, ~100 líneas) y `formController.js` (`mostrarModalTexto`)
- **Qué hacer**: Extraer todos los `style="..."` de los templates HTML generados por JavaScript y moverlos a clases CSS en `style.css`
- **Por qué**: Mejora la mantenibilidad. Actualmente si quieres cambiar un color o un padding tienes que buscarlo dentro del JS en vez de en la hoja de estilos
- **Riesgo**: Medio. Hay que verificar visualmente que el layout no se rompa tras el cambio

### 2. Eliminar doble exposición namespace + window en `dataManager.js`
- **Dónde**: `modules/dataManager.js` (líneas finales, bloque `window.xxx = xxx`)
- **Qué hacer**: Buscar todos los sitios que llaman funciones como `loadDatabase()` sin prefijo `HubTools.data.`, actualizarlos al namespace, y luego eliminar el bloque `window.xxx`
- **Por qué**: La doble exposición es un "puente" de compatibilidad temporal. Cuando todo use `HubTools.data.xxx`, el puente sobra
- **Riesgo**: Bajo-medio. Hay que buscar bien en todos los HTML y JS para no dejar ninguna llamada sin prefijo

### 3. Crear hoja AR en Excel base de datos
- **Dónde**: Archivo Excel que funciona como base de datos del proyecto
- **Qué hacer**: Crear una nueva hoja para pacientes AR con los campos necesarios (DAS28, CDAI, SDAI, HAQ, RAPID3, nódulos, erosiones, extraarticulares, etc.)
- **Por qué**: Actualmente la exportación Excel solo contempla EspA y APs. AR necesita su propia hoja
- **Riesgo**: Bajo. Es una adición, no modifica datos existentes

### 4. Integración Dashboard AR
- **Dónde**: `index.html`, `script.js`, `estadisticas.html`
- **Qué hacer**: Añadir tarjeta resumen AR en vista rápida, filtro AR en dashboard, y sección estadísticas poblacionales AR (distribución DAS28, tasas remisión)
- **Por qué**: Completar la funcionalidad AR con análisis de datos y seguimiento poblacional
- **Riesgo**: Medio. Requiere adaptación del modelo de datos y gráficos

### 5. Recopilación y validación datos AR en formController
- **Dónde**: `modules/formController.js`
- **Qué hacer**: Implementar `recopilarDatosFormularioAR()` y `validarFormularioAR()` con campos específicos AR
- **Por qué**: Necesario para guardar/exportar datos AR correctamente
- **Riesgo**: Bajo-medio
