# Informe de Mejoras  Hub Clnico Badajoz

## Contexto

Este informe recoge propuestas concretas en cuatro ejes de mejora: tcnico, funcional/UX, esttico/visual, y adaptacin para farmacia hospitalaria. Las propuestas estn fundamentadas en el anlisis del cdigo fuente, la documentacin del proyecto y el conocimiento del entorno hospitalario.

ltima actualizacin: 2026-03-05.

---

## EJE 1  Mejora Tcnica y de Cdigo

### Objetivo
Aumentar la robustez y estabilidad de la herramienta, eliminando bugs silenciosos y mejorando el manejo de errores en los puntos crticos.

### Bugs confirmados (alta prioridad)

**1. Sintaxis rota en `calcularMDA()`  `modules/scoreCalculators.js` ~lnea 173**
```javascript
// ACTUAL (roto  faltan los ?)
psoriasis: pasi > 0  `PASI: ${pasi.toFixed(1)}` : bsa > 0  `BSA: ${bsa}%` : '-',

// CORRECTO
psoriasis: pasi > 0 ? `PASI: ${pasi.toFixed(1)}` : bsa > 0 ? `BSA: ${bsa}%` : '-',
```
Impacto: `calcularMDA()` no funciona en APs. Afecta a todos los pacientes con Artritis Psorisica.

**2. Acceso con sintaxis incorrecta en `categorizeScore()`  `modules/scoreCalculators.js` ~lnea 313**
```javascript
// ACTUAL (roto  punto extra antes del corchete)
const cutoffs = HubTools.dashboard.activityCutoffs.[scoreType];

// CORRECTO
const cutoffs = HubTools?.dashboard?.activityCutoffs?.[scoreType];
if (!cutoffs) return { categoria: 'unknown', color: '#6c757d', label: 'N/A' };
```

**3. Doble declaracin de variable `acrEularInitialized`  `modules/formController.js`**
- Declarada como `let` en lnea ~70 y redeclarada como `var` en ~188.
- Causa confusin de scope. Eliminar la segunda declaracin.

---

### Mejoras de robustez (media prioridad)

**4. Validacin de inputs numricos antes de clculos  `scoreCalculators.js`**
- Crear funcin de validacin reutilizable:
```javascript
function validarInput(value, min, max) {
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) return null;
    return num;
}
```
- Aplicar en todos los clculos (BASDAI, ASDAS, DAS28, etc.) para evitar NaN propagado.

**5. Manejo mejorado de localStorage lleno  `modules/dataManager.js`**
- Aadir fallback en cascada: 4MB  100 visitas  30 visitas  aviso al usuario.
- Capturar `QuotaExceededError` especficamente con mensaje claro.

**6. Validacin del Excel al cargar  `modules/dataManager.js` en `loadDatabase()`**
- Verificar que las hojas esperadas (ESPA, APS, AR) existen antes de procesarlas.
- Si hoja Frmacos est vaca, usar estructura vaca y avisar en consola.
- Si fecha es invlida en `parseVisitDate()`, retornar fecha actual con warning.

**7. Fallback de Clipboard API  `modules/exportManager.js`**
- Si `navigator.clipboard.writeText()` falla, mostrar modal con el CSV para copia manual.
- Aadir BOM UTF-8 (`\uFEFF`) al inicio del CSV para evitar mojibake.

**8. Inicializacin segura en scripts coordinadores**
- `scripts/script_primera_visita.js` y `scripts/script_seguimiento.js`:
  - Verificar que `HubTools.*` est disponible antes de cada llamada.
  - Aadir try/catch global alrededor del bloque de inicializacin.

**9. schemaVersion + validacin de columnas al cargar Excel**
- Aadir campo `schemaVersion` en una celda reservada o en los metadatos del Excel.
- Al cargar con `loadDatabase()`, verificar que las cabeceras de cada hoja coinciden con el contrato de datos esperado.
- Si faltan columnas o estn desordenadas: aviso claro al usuario ("El Excel no coincide con la versin esperada. Columnas faltantes: X, Y").
- Previene fallos silenciosos cuando alguien edita manualmente el Excel y mueve/elimina columnas.

**10. Buffer de "filas pendientes" (safety net para exportacin)**
- Tras exportar CSV, guardar la fila en `localStorage` con clave `pendingRows` + timestamp.
- Mostrar badge en sidebar: "1 fila pendiente de pegar en Excel".
- El usuario puede marcar como "pegada" o recuperar la fila si la perdi del portapapeles.
- Auto-limpiar filas pendientes con ms de 24h.
- Red de seguridad contra prdida de datos por olvido de pegar en Excel.

**11. Normalizador central de campos**
- Crear mdulo `fieldNormalizer.js` con mapa cannico de nombres de columna.
- Mapear variantes (`DAS28_CRP_Result`, `das28Crp`, `DAS28-CRP`, `DAS28 CRP`) a una clave cannica (`DAS28_CRP`).
- Usar en `dataManager.js` al leer Excel y en `exportManager.js` al escribir CSV.
- Elimina la lgica duplicada de normalizacin repartida entre mdulos.

---

### Deuda tcnica del TODO.md a resolver

**12. Eliminar doble exposicin namespace  `modules/dataManager.js` (lneas finales)**
- Identificar todas las llamadas a funciones sin prefijo `HubTools.data.xxx`
- Actualizarlas al namespace
- Eliminar el bloque `window.xxx = xxx` redundante

**13. Refactorizar inline styles  clases CSS**
- `script.js`: templates HTML de quick-view del paciente (~100 lneas)
- `modules/formController.js`: funcin `mostrarModalTexto()`
- Mover todos los `style="..."` embebidos en JS a `style.css`

---

### Archivos afectados
- `modules/scoreCalculators.js` (bugs crticos)
- `modules/dataManager.js` (robustez, deuda tcnica, schemaVersion)
- `modules/formController.js` (variable duplicada, robustez)
- `modules/exportManager.js` (UTF-8, clipboard fallback, buffer filas pendientes)
- `modules/fieldNormalizer.js` (nuevo  normalizador central de campos)
- `scripts/script_primera_visita.js` (inicializacin)
- `scripts/script_seguimiento.js` (inicializacin)
- `script.js` (inline styles)
- `style.css` (clases extradas)

---

## EJE 2  Mejora Funcional y de Usabilidad

### Objetivo
Simplificar los flujos de uso para que sean ms rpidos e intuitivos en el contexto de una consulta reumatolgica real (~15-20 min por paciente).

### Problemas identificados y propuestas

**1. Flujo de entrada confuso en `index.html`**

*Problema:* El usuario debe elegir entre "Nueva Visita" o "Seguimiento" ANTES de ver los datos del paciente. Hay dos bsquedas redundantes en la misma pgina.

*Propuesta:* Redisear el flujo en dos pasos:
```
PASO 1: Buscar paciente (un nico campo de bsqueda en el main)
PASO 2: Ver resumen del paciente  sistema sugiere "Primera visita"
        (si no tiene visitas) o "Nuevo seguimiento" (si ya tiene historial)
```

**2. Formulario de primera visita excesivamente largo**

*Problema:* El formulario actual tiene todo en una sola pgina. Es inabarcable en consulta.

*Propuesta  Dividir en pasos (wizard secuencial):*
```
Paso 1/4: Datos bsicos (ID, nombre, sexo, fecha, diagnstico, biomarcadores)
Paso 2/4: Anamnesis (sntomas, comorbilidades, txicos, antecedentes, tratamientos previos)
Paso 3/4: Exploracin fsica (constantes vitales + homnculo + scores)
Paso 4/4: Revisin y exportacin
```
- Mostrar barra de progreso visual ("Paso 2 de 4")
- Validacin por seccin, no solo al final
- Secciones colapsables se conservan para usuarios avanzados que prefieran vista completa

**3. Acceso a seguimiento requiere parmetro URL**

*Problema:* `seguimiento.html` requiere `?id=XXX` en la URL. Si el usuario accede directamente, el formulario aparece vaco sin explicacin.

*Propuesta:* Aadir un paso 0 de bsqueda dentro de `seguimiento.html`:
- Si no hay `?id=` en URL, mostrar bsqueda de paciente antes del formulario.
- Aplicar pre-relleno una vez seleccionado el paciente.

**4. Campos redundantes en anamnesis**

*Problema:* En APs existe "Dolor Axial" (select: inflamatorio/mecnico/mixto) Y "Clnica Axial Presente" (toggle). Miden lo mismo.

*Propuesta:* Unificar en un nico campo condicional:
```
Presenta clnica axial? [S / No]
   Si S: Tipo  [Inflamatorio / Mecnico / Mixto]
```

**5. Homnculo sin instrucciones de uso**

*Problema:* Usuario nuevo no sabe que hay 3 modos (NAD, NAT, Dactilitis) ni cmo activarlos.

*Propuesta:*
- Tooltip/popover de ayuda contextual al primer hover
- Texto instructivo breve encima del homnculo: "Selecciona el modo (NAD/NAT/Dactilitis) y haz clic sobre las articulaciones"
- Indicador visual del modo activo ms prominente

**6. KPIs del dashboard paciente sin contexto clnico**

*Problema:* Los valores numricos (BASDAI 5.2, ASDAS 2.8) no incluyen escala ni categora.

*Propuesta:* Cada KPI muestra:
- Valor numrico grande
- Badge de categora coloreado (Remisin / Baja / Moderada / Alta)
- Mini referencia: "Escala 0-10 | Remisin < 4"

**7. Sin confirmacin post-exportacin**

*Problema:* Tras exportar CSV/TXT el usuario no recibe feedback claro de qu hacer a continuacin.

*Propuesta:*
- Toast de confirmacin con checklist de pasos siguientes:
  ```
   CSV copiado al portapapeles
   1. Pega en hoja ESPA/APS/AR del Excel
   2. Guarda el archivo Excel
   3. Recarga la BD en la app si otros han aadido datos
  ```

**8. Sin indicador de estado de la base de datos**

*Problema:* No hay ningn indicador de si la BD est cargada, desactualizada o vaca.

*Propuesta:* Badge persistente en el sidebar:
- Verde: "BD cargada  hace 5 min"
- Naranja: "BD desactualizada  hace 2h"
- Rojo: "BD no cargada"
- Click en el badge  accin directa de recarga

**9. Precarga visible y confirmable en seguimiento**

*Problema:* Los datos precargados de la visita anterior (comorbilidades, biomarcadores, tratamiento) aparecen como campos readonly sin contexto. El usuario no puede distinguir qu viene heredado y qu debe rellenar.

*Propuesta:* Panel "Datos heredados de visita previa" con cada campo mostrando:
- Valor actual precargado con badge "ltima visita: DD/MM/YYYY"
- Botn "Mantener" (default) / "Modificar" por campo
- Si elige "Modificar", el campo se desbloquea para edicin
- Visual claro: fondo diferenciado para datos heredados vs datos nuevos de esta visita

**10. Validacin por seccin con "ir al campo"**

*Problema:* Los errores de validacin se muestran como lista plana al final. En un formulario largo, el usuario no sabe dnde est el campo que falta.

*Propuesta:*
- Errores agrupados por seccin (Datos bsicos, Anamnesis, Exploracin, etc.)
- Cada error incluye link "Ir al campo" que hace scroll + focus al input correspondiente
- Seccin con errores muestra badge rojo con conteo
- En modo wizard: impedir avanzar al siguiente paso si la seccin actual tiene errores

**11. Comparativa rpida vs visita previa (mini-delta)**

*Problema:* En seguimiento, el reumatlogo no ve de un vistazo cmo han cambiado los scores respecto a la ltima visita. Debe recordar los valores anteriores o buscarlos en el dashboard.

*Propuesta:* Tras calcular los scores de la visita actual, mostrar mini-panel de comparativa:
```
ndice        Anterior    Actual     Delta
BASDAI        5.2         3.8         1.4 (mejora)
ASDAS-CRP     2.9         2.1         0.8 (mejora)
PCR           45          12          33  (mejora)
EVA Dolor     65          40          25  (mejora)
```
- Colores semnticos: verde si mejora, rojo si empeora, gris si sin cambio
- Visible antes de exportar para facilitar decisin clnica

---

### Archivos afectados
- `index.html` + `script.js` (flujo de entrada)
- `primera_visita.html` + `scripts/script_primera_visita.js` (wizard, validacin por seccin)
- `seguimiento.html` + `scripts/script_seguimiento.js` (paso 0 bsqueda, precarga confirmable, mini-delta)
- `modules/formController.js` (campos redundantes, homnculo, validacin con "ir al campo")
- `dashboard_paciente.html` + `scripts/script_dashboard.js` (KPIs)
- `style.css`, `style_primera_visita.css` (estilos de wizard, badges, panel heredados, mini-delta)

---

## EJE 3  Mejora Esttica y Visual

### Objetivo
Dar identidad visual propia al Hub Clnico de Badajoz, diferencindolo del hospital anterior y alinendolo con el entorno del Servicio Extremeo de Salud.

### Estado actual
La app mezcla dos pocas de diseo:
- **Paleta antigua:** `#34495e`, `#155e75`, `#43a047`, gradientes `#667eea  #764ba2`
- **Paleta moderna:** Variables CSS con Tailwind (azules `#3B82F6`, verdes `#10B981`, status colors)
- **Tipografas mixtas:** Inter (dashboard) + Roboto (formularios)  inconsistente

### Propuesta: Paleta SES-Inspired

El SES utiliza una identidad verde que evoca el paisaje extremeo y los valores de salud. Se propone una paleta profesional coherente inspirada en esta identidad, con variantes suficientes para todos los estados clnicos:

```css
/* Paleta Principal SES-Inspired */
--ses-green:        #00843D;   /* Verde SES principal */
--ses-green-dark:   #005C2B;   /* Verde oscuro (hover, sidebar) */
--ses-green-light:  #E8F5EE;   /* Verde claro (fondos de tarjeta) */
--ses-teal:         #009688;   /* Verde-azulado (acento secundario) */
--ses-blue:         #1565C0;   /* Azul institucional (acciones) */
--ses-blue-light:   #E3F2FD;   /* Azul muy claro (fondos info) */

/* Colores de Estado Clnico (no cambian  son semnticos) */
--status-remission:  #10B981;  /* Verde remisin */
--status-low:        #3B82F6;  /* Azul baja actividad */
--status-moderate:   #F59E0B;  /* mbar actividad moderada */
--status-high:       #EF4444;  /* Rojo alta actividad */

/* Neutrales */
--neutral-900:   #111827;      /* Texto principal */
--neutral-600:   #4B5563;      /* Texto secundario */
--neutral-200:   #E5E7EB;      /* Bordes */
--neutral-50:    #F9FAFB;      /* Fondo general */
--white:         #FFFFFF;

/* Tipografa unificada */
font-family: 'Inter', sans-serif;  /* Una sola fuente en toda la app */
```

### Cambios visuales clave

**1. Sidebar:**
- Cambiar de `#0f172a  #1f2937` (gris) a `#005C2B  #00843D` (verde SES)
- O mantener sidebar oscuro pero con el acento verde en los elementos activos (nav links, logo)
- Logo del servicio con fondo verde SES

**2. Botones de accin primaria:**
- Cambiar de azul `#3498db` a verde `#00843D`
- Botones secundarios en `#1565C0` (azul institucional)

**3. Tipografa:**
- Unificar a Inter en toda la app (actualmente Inter + Roboto)
- Importar solo los pesos necesarios: 400, 500, 600, 700

**4. Cards y formularios:**
- Conservar el diseo moderno de cards con radius `18-26px`
- Ajustar sombras a tono ms suave: `rgba(0, 92, 43, 0.08)` (sombra verdosa suave)

**5. Elementos de identidad:**
- Aadir referencia sutil al escudo de Extremadura o colores de Extremadura en el header
- Pie de pgina con "HUB Clnico Reumatolgico  rea de Salud de Badajoz  SES"

**6. Limpieza de colores legacy:**
- Eliminar: `#34495e`, `#155e75`, `#43a047`, gradiente `#667eea  #764ba2`
- Reemplazar por los colores SES o los neutrales del nuevo sistema

### Archivos afectados
- `style.css` (variables root, sidebar, botones, tipografa)
- `style_primera_visita.css` (alinear con nuevo sistema)
- `style_seguimiento.css`
- `style_dashboard.css`
- `style_estadisticas.css`
- Todos los HTML (actualizar imports de Google Fonts si se cambia tipografa)

---

## EJE 4  Adaptacin para Farmacutico Hospitalario

### Objetivo
Crear una capa de acceso farmacutico a los datos existentes, sin interferir en el flujo clnico de reumatlogos y enfermera, y aprovechando la misma base de datos Excel.

### Informacin farmacutica ya capturada (aprovechable)
El sistema ya registra:
- Frmacos activos (Sistmicos, FAMEs, Biolgicos) con dosis  hasta 3 lneas por tipo
- Cambios de tratamiento (motivo, efectos adversos, descripcin)
- Tratamientos previos con dosis
- Fechas de inicio de tratamiento
- Decisiones teraputicas (continuar, ajuste)
- Adherencia (booleano)
- Biomarcadores: PCR, VSG, FR, ANA, aPCC
- Scores de actividad (DAS28, CDAI, SDAI, HAQ, RAPID3)

### Informacin farmacutica que falta (aadir)
Para uso farmacutico real, sera til aadir:
- Intervalo/frecuencia de administracin (ej: "cada 8 semanas", "semanal")
- Ruta de administracin (oral / SC / IV)
- Parmetros de monitoreo analtico: ALT, AST, creatinina, hemograma (con fechas)
- Efectos adversos con gravedad (leve/moderado/grave) y fecha
- Adherencia cuantitativa (% estimado) + motivo de no-adherencia
- Motivo de cambio ms detallado: falla primaria / falla secundaria / intolerancia
- Nivel srico de frmaco (para biolgicos) si disponible

### Modelos de integracin  3 opciones

---

#### OPCIN A: Vista de Solo Lectura Farmacutica (recomendada)

**Descripcin:** Nueva pgina HTML (`farmacia.html`) que lee el mismo Excel con las mismas hojas (ESPA, APS, AR) pero muestra solo los campos relevantes para farmacia. El farmacutico no puede editar datos clnicos.

**Flujo:**
```
Farmacutico abre farmacia.html
 Carga el mismo Hub_Clinico_Maestro.xlsx
 Ve listado de pacientes con:
   - Frmaco activo + dosis + fecha inicio
   - Prxima revisin programada
   - Alertas: cambios de tratamiento recientes, efectos adversos registrados
   - Historial de lneas teraputicas
   - Scores de actividad (referencia de eficacia)
 Puede buscar paciente por ID o por frmaco
 Puede exportar informe farmacutico en TXT
 NO puede modificar ningn dato clnico
```

**Ventajas:**
- Sin cambios en el flujo reumatolgico
- Usa la misma BD sin duplicidad
- Baja complejidad tcnica (reutiliza `dataManager.js` y `exportManager.js`)
- Implementable en 2-3 semanas

**Nueva pgina:** `farmacia.html` + `scripts/script_farmacia.js` + `style_farmacia.css`
**Mdulos reutilizados:** `dataManager.js`, `utils.js`, `scoreCalculators.js`

---

#### OPCIN B: Hoja Excel Farmacutica Adicional

**Descripcin:** Aadir una nueva hoja `FARMACIA` al Excel maestro con columnas de seguimiento farmacolgico exclusivo. El farmacutico introduce sus datos en esta hoja.

**Flujo:**
```
Farmacutico abre farmacia.html
 Lee hoja FARMACIA del Excel (monitoreo analtico, adherencia, notas)
 Lee hojas ESPA/APS/AR para datos clnicos de referencia
 Puede aadir/editar entradas en hoja FARMACIA (nivel srico, analtica, notas)
 Exporta informe farmacutico
```

**Ventajas:**
- Permite al farmacutico aadir sus propios datos sin tocar los datos clnicos
- Separacin clara de roles
- Datos farmacuticos versionados junto con los clnicos

**Desventajas:**
- Requiere modificar la estructura del Excel maestro
- Ms complejidad de implementacin
- Conflictos potenciales si el Excel se edita simultneamente

---

#### OPCIN C: Mdulo de Alertas Integrado (complementario a A o B)

**Descripcin:** Sistema de alertas automticas basadas en los datos existentes, visible desde el dashboard principal o desde `farmacia.html`.

**Alertas propuestas:**
```
 Paciente ID-001  Adalimumab  Sin revisin desde hace >6 meses
 Paciente ID-042  Methotrexate  PCR > 20 mg/L en ltima visita
 Paciente ID-103  Cambio de biolgico registrado  Revisar continuidad
 Paciente ID-207  DAS28 en remisin desde ltima visita
```

**Implementacin:** Funcin en `dataManager.js` que recorre las visitas recientes y genera alertas segn reglas configurables (umbrales en `hubTools.js`).

---

### Recomendacin

Implementar **Opcin A** como base (rpida, sin riesgo para datos existentes), y complementar con **Opcin C** (alertas) como segunda fase.

### Campos farmacuticos adicionales a aadir en los formularios
Para enriquecer los datos disponibles sin complicar demasiado los formularios existentes:
- En "Plan Teraputico": aadir campo "Frecuencia de administracin" junto a cada frmaco
- En "Cambio de Tratamiento": aadir select "Tipo de falla" (primaria/secundaria/intolerancia)
- En seccin analtica: aadir campos ALT, AST, creatinina (con fecha de extraccin)

---

## Priorizacin Propuesta

| # | Eje | Accin | Esfuerzo | Impacto |
|---|-----|--------|----------|---------|
| 1 | Tcnico | Corregir bugs crticos en scoreCalculators.js | Muy bajo | Crtico |
| 2 | Tcnico | Robustez localStorage + validacin Excel | Bajo | Alto |
| 3 | Tcnico | schemaVersion + validacin de columnas al cargar Excel | Bajo | Alto |
| 4 | UX | Indicador de estado de BD en sidebar | Bajo | Alto |
| 5 | UX | Confirmacin post-exportacin con checklist | Bajo | Alto |
| 6 | Tcnico | Buffer de "filas pendientes" (safety net exportacin) | Bajo | Alto |
| 7 | Visual | Unificar tipografa (Inter) | Bajo | Medio |
| 8 | Visual | Paleta SES-inspired (actualizar variables CSS) | Medio | Alto |
| 9 | UX | Paso 0 en seguimiento (bsqueda sin ?id=) | Medio | Alto |
| 10 | UX | Validacin por seccin con "ir al campo" | Medio | Alto |
| 11 | UX | KPIs con contexto clnico en dashboard paciente | Medio | Alto |
| 12 | UX | Precarga visible y confirmable en seguimiento | Medio | Alto |
| 13 | Farmacia | Vista de solo lectura farmacutica (Opcin A) | Medio | Alto |
| 14 | Tcnico | Normalizador central de campos | Medio | Medio |
| 15 | Tcnico | Deuda tcnica (inline styles, namespace) | Medio | Bajo |
| 16 | UX | Comparativa rpida vs visita previa (mini-delta) | Medio | Alto |
| 17 | UX | Wizard en primera visita (pasos) | Alto | Muy alto |
| 18 | Farmacia | Campos farmacuticos adicionales en formularios | Alto | Medio |

---

## Archivos Crticos de Referencia

- `ARCHITECTURE.md`  Checklist de cambios futuros (seguir siempre)
- `docs/CONTRATO_DATOS_UNIFICADO.md`  Canon ESPA/APS
- `docs/template_ar_excel.md`  Canon AR
- `docs/ESTADO_IMPLEMENTACION.md`  Estado actual
## MODIFICACIN POSTERIOR AL ARCHIVO ORIGINAL

Fecha de incorporacin: 2026-03-05.

Este bloque se aade despus del informe original para registrar hallazgos detectados durante la implementacin de las mejoras de robustez y la revisin transversal del cdigo.

### Hallazgo adicional 1: normalizacin global de codificacin y finales de lnea

Durante la implementacin se detect mojibake en varios archivos del repositorio, con patrones como:
- `Mdulo`
- `pgina`
- `Frmacos`
- textos visibles o comentarios con caracteres corruptos

**Impacto:**
- No siempre rompe la lgica, pero s dificulta mantenimiento, bsquedas, edicin automtica y control de versiones.
- Puede volver a introducir smbolos extraos en textos visibles si no se corrige de forma global.
- Tambin aade ruido por mezcla de finales de lnea (`LF/CRLF`) en un entorno Windows.

**Mejora a aadir al backlog:**
- Normalizar todo el repositorio a una nica codificacin (`UTF-8`).
- Revisar y limpiar strings corruptos en JS, HTML, CSS y documentacin.
- Aadir `.gitattributes` para fijar poltica de finales de lnea y reducir ruido en diffs.
- Definir una convencin nica de guardado para evitar nuevas corrupciones.

**Prioridad recomendada:** Alta.

### Hallazgo adicional 2: validacin funcional real del buffer de filas pendientes

La lgica de seguridad para exportacin qued implementada, pero debe validarse en entorno real de uso:
- exportar CSV
- simular fallo de clipboard
- recuperar la fila pendiente
- marcarla como resuelta
- verificar persistencia tras recarga

**Mejora a aadir al backlog:**
- Ejecutar prueba manual completa del buffer de pendientes en navegador real con Excel como destino operativo.

**Prioridad recomendada:** Alta.

### Hallazgo adicional 3: deuda restante en quick view del buscador

Aunque la robustez qued reforzada, el quick view sigue manteniendo una cantidad relevante de HTML generado desde JS con estilos inline y estructura acoplada.

**Mejora a aadir al backlog:**
- Extraer completamente los estilos inline restantes del quick view a clases CSS.
- Separar mejor renderizado, datos y presentacin en `script.js`.

**Prioridad recomendada:** Media.

### Hallazgo adicional 4: extender el normalizador cannico al resto de consumidores

Se cre un normalizador central de campos y ya se integr en lectura/historial y puntos crticos, pero todava quedan consumidores con lgica de fallback local.

**Mejora a aadir al backlog:**
- Extender `fieldNormalizer.js` al resto de dashboards, estadsticas y formularios donde an haya aliases duplicados.
- Reducir progresivamente los accesos directos a nombres de columna dispersos por el cdigo.

**Prioridad recomendada:** Media.

### Hallazgo adicional 5: batera de pruebas funcionales end-to-end por patologa

Actualmente existe validacin sintctica y pruebas parciales, pero no una batera funcional sistemtica repetible para:
- ESPA primera visita
- ESPA seguimiento
- APS primera visita
- APS seguimiento
- AR primera visita
- AR seguimiento
- quick view
- dashboard paciente
- estadsticas
- exportacin TXT/CSV
- recarga manual de base de datos

**Mejora a aadir al backlog:**
- Crear checklist E2E operativa por patologa y tipo de visita.
- Registrar criterios de aceptacin mnimos antes de cada entrega clnica.

**Prioridad recomendada:** Alta.
