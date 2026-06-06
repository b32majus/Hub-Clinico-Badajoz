# Especificación funcional — Farmacia Hospitalaria v0.1

**Fecha:** 2026-06-06
**Versión:** 0.1 (demo)
**Proyecto:** Hub Clínico Reumatología — Badajoz / PROMueve Extremadura
**Propósito:** Especificación funcional del módulo de Farmacia Hospitalaria para la demo del 2026-06-08 con el jefe de Servicio de Farmacia Hospitalaria de Cáceres
**Estado:** 📋 Pendiente de revisión por Sil/Cora antes de implementación
**Ubicación:** `docs/ops/ESPECIFICACION_FUNCIONAL_FARMACIA_HOSPITALARIA_V0_1_20260606.md`

---

## 1. Propósito

Este documento define el módulo de **Farmacia Hospitalaria v0.1** para la demo del lunes 2026-06-08. **No es un contrato de datos definitivo ni una especificación de implementación productiva.**

Límites explícitos de esta especificación:

- La demo usa **exclusivamente datos sintéticos**.
- **No hay integración real con JARA** — los datos de orden clínica se simulan.
- **No hay uso con datos reales de pacientes.**
- **No hay seguridad productiva** — los perfiles funcionales son filtros de interfaz, no autenticación real.
- **No se construye Dermatología completa** — solo la entrada estructurada a Farmacia.
- **Reumatología estructurada** solo como caso demo precargado, sin integración profunda nueva.
- **Estética coherente** con el Hub Clínico actual — no se rediseña desde cero.
- El **Excel es mecanismo de persistencia del piloto**, no la arquitectura definitiva.

---

## 2. Alcance de la demo

### Módulo

Farmacia Hospitalaria como **módulo multipatología**: capaz de recibir solicitudes de servicios origen con distinto nivel de madurez.

### Casos demo

| Caso | Tipo de entrada | Servicio origen |
|------|----------------|-----------------|
| **HS/Dermatología** (principal) | Manual/semi-estructurada desde orden clínica simulada | Dermatología |
| **Reumatología** (secundario) | Estructurada precargada desde Hub Reuma v2 | Reumatología |

### Pantallas incluidas (foco demo)

1. **Buscador por CIP + Quick View**
2. **Alta guiada** si el paciente no existe
3. **Validación farmacoterapéutica**
4. **Primera visita Farmacia**
5. **Visita de seguimiento Farmacia**
6. **Dashboard paciente mínimo**
7. **Gestión de fármacos**
8. **Gestión de profesionales**

### Pantallas/bloques reservados (NO foco demo)

| Bloque | Estado |
|--------|--------|
| Dashboard poblacional / estadísticas | ⏸️ Reservado — no desarrollar ahora |
| Integración PROMs remota (Microsoft Forms) | ⏸️ Capa futura |
| Integración real con JARA | ❌ Fuera de alcance |
| Integración profunda nueva con Reuma | ❌ Reuma demo es precargado |

---

## 3. Principio de navegación

> **La entrada principal del módulo de Farmacia será siempre el buscador por CIP.**

No habrá un botón principal separado de "Nuevo paciente" como puerta de entrada paralela. El alta se dispara desde el resultado "paciente no encontrado".

### Flujo de entrada

```
1. Usuario introduce CIP
        │
2. Sistema busca en fuentes disponibles:
   ├── Excel propio Farmacia
   ├── Datos sintéticos/precargados Reuma demo
   └── Futuras fuentes conectadas
        │
        ├── Paciente existe → Quick View + acciones contextuales
        │
        └── Paciente NO existe → Alta guiada de episodio FH
```

### Acciones contextuales según estado

| Estado del paciente en FH | Acción disponible |
|--------------------------|-------------------|
| Sin validación previa | Validación farmacoterapéutica |
| Validado, sin visita | Primera visita Farmacia |
| Con primera visita registrada | Visita de seguimiento Farmacia |
| Cualquier estado | Dashboard paciente |

---

## 4. Quick View del paciente

Pantalla resumen que se muestra cuando se localiza un paciente en las fuentes disponibles.

### 4.1 Información del servicio origen

- Servicio origen
- Patología / indicación
- Última solicitud FH
- Fármaco solicitado
- Fecha de solicitud
- Estado analítica/vacunación si existe
- Scores relevantes si existen (para Reuma estructurado)

### 4.2 Información de Farmacia

- Estado FH (Pendiente / Validado / Denegado / En seguimiento)
- Fármaco validado / activo
- Dosis / pauta actual
- Última visita Farmacia
- Adherencia (último registro)
- Efectos adversos activos
- Últimos PROMs (si existen)

### 4.3 Acciones contextuales

Según el estado del paciente, se muestran botones de acción para:

- **Validación farmacoterapéutica** — solicitud pendiente de validar
- **Primera visita Farmacia** — paciente validado sin visita registrada
- **Visita de seguimiento Farmacia** — paciente con visita previa
- **Dashboard paciente** — visión completa del paciente

---

## 5. Alta guiada si el paciente no existe

Cuando el CIP no se encuentra en ninguna fuente disponible, el sistema ofrece **crear un episodio FH**.

### Datos a solicitar

**1. Servicio origen** (selector)

- Dermatología
- Reumatología
- Digestivo
- Oncología
- Otro

**2. Patología / indicación** (dependiente del servicio elegido)

- Si Dermatología → selector de 5 patologías (ver sección 6)
- Si Reumatología → patologías del Hub (AR, EspA, APs, LES, Sjögren)
- Si otro → campo de texto libre

**3. Punto de entrada del circuito**

| Opción | Comportamiento |
|--------|---------------|
| Validación farmacoterapéutica | Abre directamente pantalla de validación |
| Primera visita Farmacia | Abre alta/inicio Farmacia con datos mínimos |
| Visita de seguimiento Farmacia | Abre alta histórica como seguimiento |

### Flujo de alta guiada

```
CIP no encontrado
        ↓
Seleccionar servicio origen
        ↓
Seleccionar patología/indicación
        ↓
Seleccionar punto de entrada
        ↓
Abrir pantalla correspondiente
```

---

## 6. Dermatología como entrada estructurada por Farmacia

Farmacia estructura manualmente la información a partir de una orden clínica / JARA simulada (texto no estructurado).

### Selector de patologías

- Hidradenitis supurativa (**caso principal demo**)
- Psoriasis
- Dermatitis atópica
- Vitíligo
- Alopecia areata

### Decisiones

| Decisión | Valor |
|----------|-------|
| Caso principal demo | Hidradenitis supurativa |
| Selector | Las 5 patologías aparecen, pero no es obligatorio validar clínicamente todos los campos para la demo |
| Origen del dato | Farmacia estructura a partir de orden clínica/JARA simulada |
| Esto NO equivale a | Módulo Dermatología completo |

### Campos que estructura Farmacia

Los mismos definidos en la sección 7.1.A, incluyendo datos clínicos relevantes específicos de la patología seleccionada.

---

## 7. Validación farmacoterapéutica

Pantalla principal del circuito FH. Es donde Farmacia recibe la solicitud del servicio origen y emite su validación.

### 7.1 Datos de solicitud según origen

#### A. Dermatología / servicio no conectado (entrada manual/semi-estructurada)

Campos que Farmacia introduce a partir de la orden clínica/JARA simulada:

| Campo | Tipo |
|-------|------|
| CIP | Texto / búsqueda |
| Servicio origen | Seleccionado (Dermatología) |
| Patología / indicación | Seleccionado del desplegable de 5 patologías |
| Fármaco solicitado | Texto / selector de fármacos |
| Dosis solicitada | Numérico + unidad |
| Pauta / intervalo solicitado | Texto (ej. "cada 8 semanas") |
| Fecha de solicitud | Fecha (automática o manual) |
| Inducción solicitada | Sí / No |
| Peso (si aplica) | Numérico |
| Datos clínicos relevantes según patología | Área de texto o checklist |
| Analítica / vacunación (si aplica) | Texto / checklist |
| Justificación clínica | Área de texto |
| Observaciones del servicio origen | Área de texto |

#### B. Reumatología estructurada demo (datos precargados)

Campos precargados desde el Hub Reuma v2 (no se introducen manualmente):

| Campo | Origen |
|-------|--------|
| CIP | Precargado |
| Patología / indicación | Precargado (AR, EspA, etc.) |
| Fármaco solicitado | Precargado |
| Dosis | Precargado |
| Pauta | Precargado |
| Fecha solicitud | Precargado |
| Estado prebiológico | Precargado (analítica + vacunación/medicina preventiva) |
| Scores relevantes | Precargados (si aplican) |
| Tratamientos/eventos previos | Precargados |
| Inducción solicitada | Precargado |

### 7.2 Estado de validación

| Estado | Descripción |
|--------|-------------|
| Pendiente | Solicitud recibida, pendiente de evaluación |
| Validado | Solicitud aprobada por Farmacia |
| Denegado | Solicitud rechazada por Farmacia |

**Regla:** Si el estado es **Denegado**, debe aparecer y ser **obligatorio** un campo:

- Motivo de denegación (área de texto)

### 7.3 Tratamiento validado

Campos que Farmacia cumplimenta al validar:

| Campo | Tipo |
|-------|------|
| Fármaco validado | Texto / selector |
| Dosis validada | Numérico + unidad |
| Pauta / intervalo validado | Texto |
| Vía (si procede) | Selector (oral, SC, IV, IM, tópica, etc.) |
| Indicación | Texto |
| Fecha de cita en Farmacia (si procede) | Fecha |
| Observaciones farmacoterapéuticas | Área de texto |
| Farmacéutico responsable | Selector de profesionales |

### 7.4 Salidas

| Botón | Prioridad |
|-------|-----------|
| Guardar validación | ✅ Imprescindible |
| Exportar TXT para JARA / historia clínica | ✅ Funcional para demo |
| Exportar CSV Farmacia básico | 🟡 Si da tiempo |

---

## 8. Primera visita Farmacia

Pantalla posterior a validación o alta directa histórica. Registra el inicio del seguimiento farmacoterapéutico.

### 8.1 Datos precargados

- CIP
- Servicio origen
- Patología / indicación
- Fármaco validado o activo
- Dosis
- Pauta / intervalo
- Vía (si procede)
- Fecha solicitud o fecha validación
- Inducción solicitada (Sí/No)
- Estado analítica/vacunación (si existe)

### 8.2 Datos escritos por Farmacia

| Campo | Tipo |
|-------|------|
| Fecha primera visita / administración | Fecha |
| ¿Se realiza inducción? | Sí / No |
| Nivel de estratificación farmacéutica | Selector: Nivel 1 / Nivel 2 / Nivel 3 |
| PROMs basales | Sí / No |
| Cuestionario basal (si aplica) | Área de texto |
| Resultado basal (si se introduce manualmente) | Texto / numérico |
| Notas farmacoterapéuticas | Área de texto |

**Nota sobre estratificación:** Los niveles se basan conceptualmente en la estratificación CMO/MAPEX. Para la demo, el nivel se selecciona manualmente (Nivel 1/2/3). **No implementar cálculo automático** salvo que exista una herramienta externa clara.

---

## 9. Visita de seguimiento Farmacia

Pantalla de evolución farmacoterapéutica. Refleja el estado actual del paciente y permite registrar cambios.

### 9.1 Datos precargados

- Tratamiento activo (fármaco)
- Dosis actual
- Pauta / intervalo actual
- Vía
- Indicación
- Fecha de inicio real / primera visita
- Nivel de estratificación previo
- Última adherencia
- Últimos PROMs
- Efectos adversos previos
- Notas previas

### 9.2 Datos escritos por Farmacia

| Campo | Tipo |
|-------|------|
| Fecha seguimiento | Fecha |
| ¿Cambia nivel de estratificación? | Sí / No |
| Nuevo nivel (si cambia) | Selector: Nivel 1 / Nivel 2 / Nivel 3 |
| ¿Requiere optimización? | Sí / No |
| Nueva dosis (si aplica) | Numérico + unidad |
| Nueva pauta / intervalo (si aplica) | Texto |
| Motivo de optimización | Área de texto |
| ¿Suspensión? | Sí / No |
| Motivo de suspensión | Área de texto |
| Morisky-Green (4 preguntas) | 4 preguntas Sí/No |
| Interpretación Morisky-Green | Automática (ver sección 10) |
| PROMs seguimiento (si aplica) | Texto / numérico |
| Efecto adverso detectado | Sí / No |
| Descripción de efecto adverso | Área de texto |
| Gravedad | Leve / Moderado / Grave |
| Actuación | Sin cambios / Observación / Ajuste de pauta / Suspensión / Contactar/derivar a servicio origen |
| Notas / criterio farmacoterapéutico | Área de texto |

### Regla crítica

> **Cambio de fármaco NO es optimización.**
>
> El cambio de fármaco requiere una **nueva solicitud desde el servicio origen**. Farmacia puede proponerlo, pero no ejecutarlo. La optimización se refiere a ajustes de dosis, pauta o intervalo dentro del mismo fármaco.

---

## 10. Morisky-Green

### Cuestionario (4 preguntas)

Para la demo, se muestran las 4 preguntas estándar de Morisky-Green con respuesta Sí/No:

1. ¿Olvida alguna vez tomar el tratamiento?
2. ¿Toma la medicación a la hora indicada?
3. ¿Deja de tomar la medicación cuando se encuentra bien?
4. ¿Deja de tomar la medicación cuando le sienta mal?

### Interpretación automática simple

| Respuestas | Interpretación |
|------------|---------------|
| Todas correctas | Alta adherencia |
| 1-2 respuestas incorrectas | Adherencia media / parcial |
| 3-4 respuestas incorrectas | Baja adherencia |

### Reglas

- El cuestionario se registra **dentro de la primera visita o seguimiento**, no como módulo independiente.
- No inventar motivos de baja adherencia.
- Si se quiere recoger motivo, usar **campo libre opcional**.
- Para demo, la interpretación es automática simple (no requiere algoritmo complejo).

---

## 11. PROMs (Patient-Reported Outcome Measures)

### Modelo por capas

| Capa | Nivel | Descripción | Estado |
|------|-------|-------------|--------|
| 1 | MVP mínimo | Registrar si PROM existe y score si se tiene | ✅ Para demo |
| 2 | Presencial Farmacia | Farmacia recoge PROM basal y de seguimiento presencial | ✅ Para demo (campos en primera visita y seguimiento) |
| 3 | Remoto (futuro) | Microsoft Forms con código seudonimizado | ⏸️ Futuro |
| 4 | Automático (futuro) | Integración automática con base de datos | ⏸️ Futuro |

### Para demo

- Campo simple **Sí/No** (¿PROM realizado?) en primera visita y seguimiento.
- Si Sí, campo de **score/resultado** si se introduce manualmente.
- **No implementar Microsoft Forms.**
- Si se menciona PROM remoto, usar el término **"seudonimizado/codificado"**, no "anónimo".

---

## 12. Efectos adversos

Modelo simple integrado **dentro del seguimiento** (no como pantalla independiente).

| Campo | Tipo |
|-------|------|
| Efecto adverso detectado | Sí / No |
| Descripción | Área de texto |
| Gravedad | Leve / Moderado / Grave |
| Actuación | Sin cambios / Observación / Ajuste de pauta / Suspensión / Contactar/derivar a servicio origen |
| Observaciones / notas | Área de texto |

---

## 13. Dashboard paciente mínimo

Visión individual del paciente que integra datos de todas las fuentes.

### Bloques del dashboard

| Bloque | Contenido |
|--------|-----------|
| **Resumen paciente** | CIP, nombre (demo), servicio origen, patología |
| **Tratamiento actual** | Fármaco activo, dosis, pauta, vía |
| **Estado validación** | Pendiente / Validado / Denegado con fecha |
| **Timeline longitudinal** | Línea de tiempo mínima con eventos cronológicos |
| Validaciones | Histórico de validaciones realizadas |
| Primera visita | Datos de inicio FH |
| Seguimientos | Listado de visitas de seguimiento |
| Optimizaciones | Registro de cambios de pauta/dosis |
| Suspensiones | Registro de suspensiones con motivo |
| Adherencia | Último resultado Morisky-Green |
| Efectos adversos | Efectos activos e históricos |
| PROMs | PROMs registrados |

**No crear dashboard poblacional complejo todavía.**

---

## 14. Estadísticas / dashboard servicio

Reservar botón o sección de estadísticas, pero **no desarrollar a fondo en demo**.

Puede quedar como placeholder o maqueta ligera que muestre:

- Pacientes por fármaco
- Pacientes por indicación
- Validaciones pendientes
- Dosis media por fármaco
- Adherencia global
- Efectos adversos registrados

> Esta sección se diseñará después a partir de datos reales y necesidades del servicio.

---

## 15. Gestión de fármacos

Mantener coherencia con el módulo de gestión de fármacos del Hub Clínico actual.

Debe permitir, al menos conceptualmente:

| Funcionalidad | Descripción |
|---------------|-------------|
| Listar fármacos en cartera | Tabla con fármacos disponibles |
| Principio activo | Identificador principal del fármaco |
| Nombre comercial / presentación | Si aplica |
| Indicaciones disponibles | Patologías para las que está indicado |
| Dosis / pautas frecuentes | Referencia rápida |
| Estado | Activo / Inactivo |

**No crear catálogo definitivo.** Los datos serán sintéticos para la demo.

---

## 16. Gestión de profesionales

Mantener coherencia con el módulo del Hub Clínico actual.

Debe permitir:

| Funcionalidad | Descripción |
|---------------|-------------|
| Listar profesionales de Farmacia | Tabla con profesionales |
| Nombre | Nombre del profesional |
| Rol | Identificador del rol (farmacéutico, residente, etc.) |
| Estado | Activo / Inactivo |

**No crear gestión avanzada.** Los datos serán sintéticos para la demo.

---

## 17. Excel propio Farmacia

### Decisión

Usar **Excel propio de Farmacia** poblado con datos sintéticos.

### Nombre propuesto

```
Hub_Farmacia_Demo_V0_1.xlsx
```

### Hojas propuestas

| Hoja | Contenido |
|------|-----------|
| `Pacientes` | Datos demográficos básicos sintéticos |
| `Solicitudes_FH` | Solicitudes recibidas de servicios origen |
| `Validaciones_FH` | Validaciones realizadas por Farmacia |
| `Primera_Visita_FH` | Registros de primera visita |
| `Seguimientos_FH` | Registros de visitas de seguimiento |
| `Farmacos` | Catálogo de fármacos |
| `Profesionales` | Catálogo de profesionales |
| `PROMs` | Registros de PROMs |

### Reglas

| Regla | Descripción |
|-------|-------------|
| ❌ No escribir en Excel de Reuma | Cada fuente es independiente |
| ✅ Lectura cruzada sí | Farmacia puede leer datos de Reuma demo |
| ❌ Escritura cruzada no | Farmacia escribe solo en su Excel |
| ✅ Datos sintéticos | La demo se alimenta de datos precargados |
| ⏸️ Futuro | El modelo definitivo será backend/base de datos, no Excel |

---

## 18. Estética y UX

### Reglas

| Regla | Descripción |
|-------|-------------|
| ✅ Mantener estética coherente | Con el Hub Clínico actual (colores, tipografía, espaciado) |
| ❌ No inventar paleta nueva | Usar la existente del Hub |
| ❌ No rediseñar desde cero | Reutilizar componentes existentes |
| ✅ Reutilizar elementos | Barra lateral, tarjetas, estilo de formularios y dashboard actuales |
| ✅ Priorizar claridad | La demo debe ser comprensible para el interlocutor |
| ❌ Evitar sobrecarga | No incluir elementos decorativos ni funcionalidades que distraigan |

---

## 19. Fuera de alcance para la demo del lunes

| Exclusión | Motivo |
|-----------|--------|
| ❌ Dermatología completa | Solo entrada a Farmacia, no módulo clínico |
| ❌ Integración real JARA | Sin conexión real con sistemas hospitalarios |
| ❌ Integración profunda nueva con Reuma | Reuma demo es precargado, sin desarrollo nuevo |
| ❌ Dashboard poblacional complejo | Se reserva para después |
| ❌ Microsoft Forms | Promoción a capa futura |
| ❌ Seguridad productiva | Perfiles funcionales, no autenticación real |
| ❌ Datos reales | Solo datos sintéticos |
| ❌ Contratos de datos definitivos | Pendientes de Fase 1-2 del plan formativo |
| ❌ Migración React/TypeScript | Corresponde a v3.0 |
| ❌ Backend real | Excel es persistencia del piloto |
| ❌ Cambios en arquitectura general | No se modifica la arquitectura progresiva definida |

---

## 20. Criterios de aceptación para pasar a implementación

La especificación debe permitir crear **work orders de implementación separadas** para:

| # | Módulo / funcionalidad |
|---|------------------------|
| 1 | UI shell Farmacia (coherente con Hub actual) |
| 2 | Buscador CIP + Quick View + Alta guiada |
| 3 | Validación farmacoterapéutica (Dermatología y Reuma) |
| 4 | Primera visita Farmacia |
| 5 | Seguimiento Farmacia |
| 6 | Dashboard paciente mínimo |
| 7 | Excel propio Farmacia demo (`Hub_Farmacia_Demo_V0_1.xlsx`) |
| 8 | Export TXT (JARA) y CSV básico |

### Criterios de aceptación del documento

- [ ] Existe `docs/ops/ESPECIFICACION_FUNCIONAL_FARMACIA_HOSPITALARIA_V0_1_20260606.md`
- [ ] Incluye entrada única por buscador/CIP
- [ ] Incluye quick view si paciente existe
- [ ] Incluye alta guiada si paciente no existe
- [ ] Incluye Dermatología con selector de 5 patologías y HS como caso principal
- [ ] Incluye Reumatología como caso demo/precargado, no integración profunda
- [ ] Incluye Excel propio Farmacia demo con nombre y hojas propuestas
- [ ] Incluye validación con estados Pendiente/Validado/Denegado y motivo obligatorio si denegado
- [ ] Incluye primera visita y seguimiento
- [ ] Incluye Morisky-Green 4 preguntas e interpretación simple
- [ ] Incluye PROMs por capas
- [ ] Incluye efectos adversos simples dentro de seguimiento
- [ ] Incluye dashboard paciente mínimo
- [ ] Incluye reglas de estética coherente con Hub actual
- [ ] Incluye fuera de alcance
- [ ] `docs/INDEX.md` enlaza el nuevo documento
- [ ] `docs/ops/WORK_ORDER_STATUS.md` incluye WO-016 como Ready for review

---

*Documento generado a partir de la WO-016 y los documentos de referencia del Hub Clínico Badajoz.*
*Revisión requerida por Sil/Cora antes de pasar a implementación.*
