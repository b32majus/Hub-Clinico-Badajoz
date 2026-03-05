# Informe de Mejoras — Hub Clínico Badajoz

## Contexto

Este informe recoge propuestas concretas en cuatro ejes de mejora: técnico, funcional/UX, estético/visual, y adaptación para farmacia hospitalaria. Las propuestas están fundamentadas en el análisis del código fuente, la documentación del proyecto y el conocimiento del entorno hospitalario.

Última actualización: 2026-03-05.

---

## EJE 1 — Mejora Técnica y de Código

### Objetivo
Aumentar la robustez y estabilidad de la herramienta, eliminando bugs silenciosos y mejorando el manejo de errores en los puntos críticos.

### Bugs confirmados (alta prioridad)

**1. Sintaxis rota en `calcularMDA()` — `modules/scoreCalculators.js` ~línea 173**
```javascript
// ACTUAL (roto — faltan los ?)
psoriasis: pasi > 0  `PASI: ${pasi.toFixed(1)}` : bsa > 0  `BSA: ${bsa}%` : '-',

// CORRECTO
psoriasis: pasi > 0 ? `PASI: ${pasi.toFixed(1)}` : bsa > 0 ? `BSA: ${bsa}%` : '-',
```
Impacto: `calcularMDA()` no funciona en APs. Afecta a todos los pacientes con Artritis Psoriásica.

**2. Acceso con sintaxis incorrecta en `categorizeScore()` — `modules/scoreCalculators.js` ~línea 313**
```javascript
// ACTUAL (roto — punto extra antes del corchete)
const cutoffs = HubTools.dashboard.activityCutoffs.[scoreType];

// CORRECTO
const cutoffs = HubTools?.dashboard?.activityCutoffs?.[scoreType];
if (!cutoffs) return { categoria: 'unknown', color: '#6c757d', label: 'N/A' };
```

**3. Doble declaración de variable `acrEularInitialized` — `modules/formController.js`**
- Declarada como `let` en línea ~70 y redeclarada como `var` en ~188.
- Causa confusión de scope. Eliminar la segunda declaración.

---

### Mejoras de robustez (media prioridad)

**4. Validación de inputs numéricos antes de cálculos — `scoreCalculators.js`**
- Crear función de validación reutilizable:
```javascript
function validarInput(value, min, max) {
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) return null;
    return num;
}
```
- Aplicar en todos los cálculos (BASDAI, ASDAS, DAS28, etc.) para evitar NaN propagado.

**5. Manejo mejorado de localStorage lleno — `modules/dataManager.js`**
- Añadir fallback en cascada: 4MB → 100 visitas → 30 visitas → aviso al usuario.
- Capturar `QuotaExceededError` específicamente con mensaje claro.

**6. Validación del Excel al cargar — `modules/dataManager.js` en `loadDatabase()`**
- Verificar que las hojas esperadas (ESPA, APS, AR) existen antes de procesarlas.
- Si hoja Fármacos está vacía, usar estructura vacía y avisar en consola.
- Si fecha es inválida en `parseVisitDate()`, retornar fecha actual con warning.

**7. Fallback de Clipboard API — `modules/exportManager.js`**
- Si `navigator.clipboard.writeText()` falla, mostrar modal con el CSV para copia manual.
- Añadir BOM UTF-8 (`\uFEFF`) al inicio del CSV para evitar mojibake.

**8. Inicialización segura en scripts coordinadores**
- `scripts/script_primera_visita.js` y `scripts/script_seguimiento.js`:
  - Verificar que `HubTools.*` está disponible antes de cada llamada.
  - Añadir try/catch global alrededor del bloque de inicialización.

**9. schemaVersion + validación de columnas al cargar Excel**
- Añadir campo `schemaVersion` en una celda reservada o en los metadatos del Excel.
- Al cargar con `loadDatabase()`, verificar que las cabeceras de cada hoja coinciden con el contrato de datos esperado.
- Si faltan columnas o están desordenadas: aviso claro al usuario ("El Excel no coincide con la versión esperada. Columnas faltantes: X, Y").
- Previene fallos silenciosos cuando alguien edita manualmente el Excel y mueve/elimina columnas.

**10. Buffer de "filas pendientes" (safety net para exportación)**
- Tras exportar CSV, guardar la fila en `localStorage` con clave `pendingRows` + timestamp.
- Mostrar badge en sidebar: "1 fila pendiente de pegar en Excel".
- El usuario puede marcar como "pegada" o recuperar la fila si la perdió del portapapeles.
- Auto-limpiar filas pendientes con más de 24h.
- Red de seguridad contra pérdida de datos por olvido de pegar en Excel.

**11. Normalizador central de campos**
- Crear módulo `fieldNormalizer.js` con mapa canónico de nombres de columna.
- Mapear variantes (`DAS28_CRP_Result`, `das28Crp`, `DAS28-CRP`, `DAS28 CRP`) a una clave canónica (`DAS28_CRP`).
- Usar en `dataManager.js` al leer Excel y en `exportManager.js` al escribir CSV.
- Elimina la lógica duplicada de normalización repartida entre módulos.

---

### Deuda técnica del TODO.md a resolver

**12. Eliminar doble exposición namespace — `modules/dataManager.js` (líneas finales)**
- Identificar todas las llamadas a funciones sin prefijo `HubTools.data.xxx`
- Actualizarlas al namespace
- Eliminar el bloque `window.xxx = xxx` redundante

**13. Refactorizar inline styles → clases CSS**
- `script.js`: templates HTML de quick-view del paciente (~100 líneas)
- `modules/formController.js`: función `mostrarModalTexto()`
- Mover todos los `style="..."` embebidos en JS a `style.css`

---

### Archivos afectados
- `modules/scoreCalculators.js` (bugs críticos)
- `modules/dataManager.js` (robustez, deuda técnica, schemaVersion)
- `modules/formController.js` (variable duplicada, robustez)
- `modules/exportManager.js` (UTF-8, clipboard fallback, buffer filas pendientes)
- `modules/fieldNormalizer.js` (nuevo — normalizador central de campos)
- `scripts/script_primera_visita.js` (inicialización)
- `scripts/script_seguimiento.js` (inicialización)
- `script.js` (inline styles)
- `style.css` (clases extraídas)

---

## EJE 2 — Mejora Funcional y de Usabilidad

### Objetivo
Simplificar los flujos de uso para que sean más rápidos e intuitivos en el contexto de una consulta reumatológica real (~15-20 min por paciente).

### Problemas identificados y propuestas

**1. Flujo de entrada confuso en `index.html`**

*Problema:* El usuario debe elegir entre "Nueva Visita" o "Seguimiento" ANTES de ver los datos del paciente. Hay dos búsquedas redundantes en la misma página.

*Propuesta:* Rediseñar el flujo en dos pasos:
```
PASO 1: Buscar paciente (un único campo de búsqueda en el main)
PASO 2: Ver resumen del paciente → sistema sugiere "Primera visita"
        (si no tiene visitas) o "Nuevo seguimiento" (si ya tiene historial)
```

**2. Formulario de primera visita excesivamente largo**

*Problema:* El formulario actual tiene todo en una sola página. Es inabarcable en consulta.

*Propuesta — Dividir en pasos (wizard secuencial):*
```
Paso 1/4: Datos básicos (ID, nombre, sexo, fecha, diagnóstico, biomarcadores)
Paso 2/4: Anamnesis (síntomas, comorbilidades, tóxicos, antecedentes, tratamientos previos)
Paso 3/4: Exploración física (constantes vitales + homúnculo + scores)
Paso 4/4: Revisión y exportación
```
- Mostrar barra de progreso visual ("Paso 2 de 4")
- Validación por sección, no solo al final
- Secciones colapsables se conservan para usuarios avanzados que prefieran vista completa

**3. Acceso a seguimiento requiere parámetro URL**

*Problema:* `seguimiento.html` requiere `?id=XXX` en la URL. Si el usuario accede directamente, el formulario aparece vacío sin explicación.

*Propuesta:* Añadir un paso 0 de búsqueda dentro de `seguimiento.html`:
- Si no hay `?id=` en URL, mostrar búsqueda de paciente antes del formulario.
- Aplicar pre-relleno una vez seleccionado el paciente.

**4. Campos redundantes en anamnesis**

*Problema:* En APs existe "Dolor Axial" (select: inflamatorio/mecánico/mixto) Y "Clínica Axial Presente" (toggle). Miden lo mismo.

*Propuesta:* Unificar en un único campo condicional:
```
¿Presenta clínica axial? [Sí / No]
  └─ Si Sí: Tipo → [Inflamatorio / Mecánico / Mixto]
```

**5. Homúnculo sin instrucciones de uso**

*Problema:* Usuario nuevo no sabe que hay 3 modos (NAD, NAT, Dactilitis) ni cómo activarlos.

*Propuesta:*
- Tooltip/popover de ayuda contextual al primer hover
- Texto instructivo breve encima del homúnculo: "Selecciona el modo (NAD/NAT/Dactilitis) y haz clic sobre las articulaciones"
- Indicador visual del modo activo más prominente

**6. KPIs del dashboard paciente sin contexto clínico**

*Problema:* Los valores numéricos (BASDAI 5.2, ASDAS 2.8) no incluyen escala ni categoría.

*Propuesta:* Cada KPI muestra:
- Valor numérico grande
- Badge de categoría coloreado (Remisión / Baja / Moderada / Alta)
- Mini referencia: "Escala 0-10 | Remisión < 4"

**7. Sin confirmación post-exportación**

*Problema:* Tras exportar CSV/TXT el usuario no recibe feedback claro de qué hacer a continuación.

*Propuesta:*
- Toast de confirmación con checklist de pasos siguientes:
  ```
  ✅ CSV copiado al portapapeles
  → 1. Pega en hoja ESPA/APS/AR del Excel
  → 2. Guarda el archivo Excel
  → 3. Recarga la BD en la app si otros han añadido datos
  ```

**8. Sin indicador de estado de la base de datos**

*Problema:* No hay ningún indicador de si la BD está cargada, desactualizada o vacía.

*Propuesta:* Badge persistente en el sidebar:
- Verde: "BD cargada — hace 5 min"
- Naranja: "BD desactualizada — hace 2h"
- Rojo: "BD no cargada"
- Click en el badge → acción directa de recarga

**9. Precarga visible y confirmable en seguimiento**

*Problema:* Los datos precargados de la visita anterior (comorbilidades, biomarcadores, tratamiento) aparecen como campos readonly sin contexto. El usuario no puede distinguir qué viene heredado y qué debe rellenar.

*Propuesta:* Panel "Datos heredados de visita previa" con cada campo mostrando:
- Valor actual precargado con badge "Última visita: DD/MM/YYYY"
- Botón "Mantener" (default) / "Modificar" por campo
- Si elige "Modificar", el campo se desbloquea para edición
- Visual claro: fondo diferenciado para datos heredados vs datos nuevos de esta visita

**10. Validación por sección con "ir al campo"**

*Problema:* Los errores de validación se muestran como lista plana al final. En un formulario largo, el usuario no sabe dónde está el campo que falta.

*Propuesta:*
- Errores agrupados por sección (Datos básicos, Anamnesis, Exploración, etc.)
- Cada error incluye link "Ir al campo" que hace scroll + focus al input correspondiente
- Sección con errores muestra badge rojo con conteo
- En modo wizard: impedir avanzar al siguiente paso si la sección actual tiene errores

**11. Comparativa rápida vs visita previa (mini-delta)**

*Problema:* En seguimiento, el reumatólogo no ve de un vistazo cómo han cambiado los scores respecto a la última visita. Debe recordar los valores anteriores o buscarlos en el dashboard.

*Propuesta:* Tras calcular los scores de la visita actual, mostrar mini-panel de comparativa:
```
Índice        Anterior    Actual     Delta
BASDAI        5.2         3.8        ▼ 1.4 (mejora)
ASDAS-CRP     2.9         2.1        ▼ 0.8 (mejora)
PCR           45          12         ▼ 33  (mejora)
EVA Dolor     65          40         ▼ 25  (mejora)
```
- Colores semánticos: verde si mejora, rojo si empeora, gris si sin cambio
- Visible antes de exportar para facilitar decisión clínica

---

### Archivos afectados
- `index.html` + `script.js` (flujo de entrada)
- `primera_visita.html` + `scripts/script_primera_visita.js` (wizard, validación por sección)
- `seguimiento.html` + `scripts/script_seguimiento.js` (paso 0 búsqueda, precarga confirmable, mini-delta)
- `modules/formController.js` (campos redundantes, homúnculo, validación con "ir al campo")
- `dashboard_paciente.html` + `scripts/script_dashboard.js` (KPIs)
- `style.css`, `style_primera_visita.css` (estilos de wizard, badges, panel heredados, mini-delta)

---

## EJE 3 — Mejora Estética y Visual

### Objetivo
Dar identidad visual propia al Hub Clínico de Badajoz, diferenciándolo del hospital anterior y alineándolo con el entorno del Servicio Extremeño de Salud.

### Estado actual
La app mezcla dos épocas de diseño:
- **Paleta antigua:** `#34495e`, `#155e75`, `#43a047`, gradientes `#667eea → #764ba2`
- **Paleta moderna:** Variables CSS con Tailwind (azules `#3B82F6`, verdes `#10B981`, status colors)
- **Tipografías mixtas:** Inter (dashboard) + Roboto (formularios) — inconsistente

### Propuesta: Paleta SES-Inspired

El SES utiliza una identidad verde que evoca el paisaje extremeño y los valores de salud. Se propone una paleta profesional coherente inspirada en esta identidad, con variantes suficientes para todos los estados clínicos:

```css
/* Paleta Principal SES-Inspired */
--ses-green:        #00843D;   /* Verde SES principal */
--ses-green-dark:   #005C2B;   /* Verde oscuro (hover, sidebar) */
--ses-green-light:  #E8F5EE;   /* Verde claro (fondos de tarjeta) */
--ses-teal:         #009688;   /* Verde-azulado (acento secundario) */
--ses-blue:         #1565C0;   /* Azul institucional (acciones) */
--ses-blue-light:   #E3F2FD;   /* Azul muy claro (fondos info) */

/* Colores de Estado Clínico (no cambian — son semánticos) */
--status-remission:  #10B981;  /* Verde remisión */
--status-low:        #3B82F6;  /* Azul baja actividad */
--status-moderate:   #F59E0B;  /* Ámbar actividad moderada */
--status-high:       #EF4444;  /* Rojo alta actividad */

/* Neutrales */
--neutral-900:   #111827;      /* Texto principal */
--neutral-600:   #4B5563;      /* Texto secundario */
--neutral-200:   #E5E7EB;      /* Bordes */
--neutral-50:    #F9FAFB;      /* Fondo general */
--white:         #FFFFFF;

/* Tipografía unificada */
font-family: 'Inter', sans-serif;  /* Una sola fuente en toda la app */
```

### Cambios visuales clave

**1. Sidebar:**
- Cambiar de `#0f172a → #1f2937` (gris) a `#005C2B → #00843D` (verde SES)
- O mantener sidebar oscuro pero con el acento verde en los elementos activos (nav links, logo)
- Logo del servicio con fondo verde SES

**2. Botones de acción primaria:**
- Cambiar de azul `#3498db` a verde `#00843D`
- Botones secundarios en `#1565C0` (azul institucional)

**3. Tipografía:**
- Unificar a Inter en toda la app (actualmente Inter + Roboto)
- Importar solo los pesos necesarios: 400, 500, 600, 700

**4. Cards y formularios:**
- Conservar el diseño moderno de cards con radius `18-26px`
- Ajustar sombras a tono más suave: `rgba(0, 92, 43, 0.08)` (sombra verdosa suave)

**5. Elementos de identidad:**
- Añadir referencia sutil al escudo de Extremadura o colores de Extremadura en el header
- Pie de página con "HUB Clínico Reumatológico — Área de Salud de Badajoz — SES"

**6. Limpieza de colores legacy:**
- Eliminar: `#34495e`, `#155e75`, `#43a047`, gradiente `#667eea → #764ba2`
- Reemplazar por los colores SES o los neutrales del nuevo sistema

### Archivos afectados
- `style.css` (variables root, sidebar, botones, tipografía)
- `style_primera_visita.css` (alinear con nuevo sistema)
- `style_seguimiento.css`
- `style_dashboard.css`
- `style_estadisticas.css`
- Todos los HTML (actualizar imports de Google Fonts si se cambia tipografía)

---

## EJE 4 — Adaptación para Farmacéutico Hospitalario

### Objetivo
Crear una capa de acceso farmacéutico a los datos existentes, sin interferir en el flujo clínico de reumatólogos y enfermería, y aprovechando la misma base de datos Excel.

### Información farmacéutica ya capturada (aprovechable)
El sistema ya registra:
- Fármacos activos (Sistémicos, FAMEs, Biológicos) con dosis — hasta 3 líneas por tipo
- Cambios de tratamiento (motivo, efectos adversos, descripción)
- Tratamientos previos con dosis
- Fechas de inicio de tratamiento
- Decisiones terapéuticas (continuar, ajuste)
- Adherencia (booleano)
- Biomarcadores: PCR, VSG, FR, ANA, aPCC
- Scores de actividad (DAS28, CDAI, SDAI, HAQ, RAPID3)

### Información farmacéutica que falta (añadir)
Para uso farmacéutico real, sería útil añadir:
- Intervalo/frecuencia de administración (ej: "cada 8 semanas", "semanal")
- Ruta de administración (oral / SC / IV)
- Parámetros de monitoreo analítico: ALT, AST, creatinina, hemograma (con fechas)
- Efectos adversos con gravedad (leve/moderado/grave) y fecha
- Adherencia cuantitativa (% estimado) + motivo de no-adherencia
- Motivo de cambio más detallado: falla primaria / falla secundaria / intolerancia
- Nivel sérico de fármaco (para biológicos) si disponible

### Modelos de integración — 3 opciones

---

#### OPCIÓN A: Vista de Solo Lectura Farmacéutica (recomendada)

**Descripción:** Nueva página HTML (`farmacia.html`) que lee el mismo Excel con las mismas hojas (ESPA, APS, AR) pero muestra solo los campos relevantes para farmacia. El farmacéutico no puede editar datos clínicos.

**Flujo:**
```
Farmacéutico abre farmacia.html
→ Carga el mismo Hub_Clinico_Maestro.xlsx
→ Ve listado de pacientes con:
   - Fármaco activo + dosis + fecha inicio
   - Próxima revisión programada
   - Alertas: cambios de tratamiento recientes, efectos adversos registrados
   - Historial de líneas terapéuticas
   - Scores de actividad (referencia de eficacia)
→ Puede buscar paciente por ID o por fármaco
→ Puede exportar informe farmacéutico en TXT
→ NO puede modificar ningún dato clínico
```

**Ventajas:**
- Sin cambios en el flujo reumatológico
- Usa la misma BD sin duplicidad
- Baja complejidad técnica (reutiliza `dataManager.js` y `exportManager.js`)
- Implementable en 2-3 semanas

**Nueva página:** `farmacia.html` + `scripts/script_farmacia.js` + `style_farmacia.css`
**Módulos reutilizados:** `dataManager.js`, `utils.js`, `scoreCalculators.js`

---

#### OPCIÓN B: Hoja Excel Farmacéutica Adicional

**Descripción:** Añadir una nueva hoja `FARMACIA` al Excel maestro con columnas de seguimiento farmacológico exclusivo. El farmacéutico introduce sus datos en esta hoja.

**Flujo:**
```
Farmacéutico abre farmacia.html
→ Lee hoja FARMACIA del Excel (monitoreo analítico, adherencia, notas)
→ Lee hojas ESPA/APS/AR para datos clínicos de referencia
→ Puede añadir/editar entradas en hoja FARMACIA (nivel sérico, analítica, notas)
→ Exporta informe farmacéutico
```

**Ventajas:**
- Permite al farmacéutico añadir sus propios datos sin tocar los datos clínicos
- Separación clara de roles
- Datos farmacéuticos versionados junto con los clínicos

**Desventajas:**
- Requiere modificar la estructura del Excel maestro
- Más complejidad de implementación
- Conflictos potenciales si el Excel se edita simultáneamente

---

#### OPCIÓN C: Módulo de Alertas Integrado (complementario a A o B)

**Descripción:** Sistema de alertas automáticas basadas en los datos existentes, visible desde el dashboard principal o desde `farmacia.html`.

**Alertas propuestas:**
```
⚠ Paciente ID-001 — Adalimumab — Sin revisión desde hace >6 meses
⚠ Paciente ID-042 — Methotrexate — PCR > 20 mg/L en última visita
⚠ Paciente ID-103 — Cambio de biológico registrado — Revisar continuidad
✅ Paciente ID-207 — DAS28 en remisión desde última visita
```

**Implementación:** Función en `dataManager.js` que recorre las visitas recientes y genera alertas según reglas configurables (umbrales en `hubTools.js`).

---

### Recomendación

Implementar **Opción A** como base (rápida, sin riesgo para datos existentes), y complementar con **Opción C** (alertas) como segunda fase.

### Campos farmacéuticos adicionales a añadir en los formularios
Para enriquecer los datos disponibles sin complicar demasiado los formularios existentes:
- En "Plan Terapéutico": añadir campo "Frecuencia de administración" junto a cada fármaco
- En "Cambio de Tratamiento": añadir select "Tipo de falla" (primaria/secundaria/intolerancia)
- En sección analítica: añadir campos ALT, AST, creatinina (con fecha de extracción)

---

## Priorización Propuesta

| # | Eje | Acción | Esfuerzo | Impacto |
|---|-----|--------|----------|---------|
| 1 | Técnico | Corregir bugs críticos en scoreCalculators.js | Muy bajo | Crítico |
| 2 | Técnico | Robustez localStorage + validación Excel | Bajo | Alto |
| 3 | Técnico | schemaVersion + validación de columnas al cargar Excel | Bajo | Alto |
| 4 | UX | Indicador de estado de BD en sidebar | Bajo | Alto |
| 5 | UX | Confirmación post-exportación con checklist | Bajo | Alto |
| 6 | Técnico | Buffer de "filas pendientes" (safety net exportación) | Bajo | Alto |
| 7 | Visual | Unificar tipografía (Inter) | Bajo | Medio |
| 8 | Visual | Paleta SES-inspired (actualizar variables CSS) | Medio | Alto |
| 9 | UX | Paso 0 en seguimiento (búsqueda sin ?id=) | Medio | Alto |
| 10 | UX | Validación por sección con "ir al campo" | Medio | Alto |
| 11 | UX | KPIs con contexto clínico en dashboard paciente | Medio | Alto |
| 12 | UX | Precarga visible y confirmable en seguimiento | Medio | Alto |
| 13 | Farmacia | Vista de solo lectura farmacéutica (Opción A) | Medio | Alto |
| 14 | Técnico | Normalizador central de campos | Medio | Medio |
| 15 | Técnico | Deuda técnica (inline styles, namespace) | Medio | Bajo |
| 16 | UX | Comparativa rápida vs visita previa (mini-delta) | Medio | Alto |
| 17 | UX | Wizard en primera visita (pasos) | Alto | Muy alto |
| 18 | Farmacia | Campos farmacéuticos adicionales en formularios | Alto | Medio |

---

## Archivos Críticos de Referencia

- `ARCHITECTURE.md` — Checklist de cambios futuros (seguir siempre)
- `docs/CONTRATO_DATOS_UNIFICADO.md` — Canon ESPA/APS
- `docs/template_ar_excel.md` — Canon AR
- `docs/ESTADO_IMPLEMENTACION.md` — Estado actual
