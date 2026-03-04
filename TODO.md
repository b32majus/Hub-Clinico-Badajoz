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
