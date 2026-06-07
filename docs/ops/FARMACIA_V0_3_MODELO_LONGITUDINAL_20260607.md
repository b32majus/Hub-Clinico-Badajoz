# Farmacia Hospitalaria v0.3 — Modelo longitudinal mínimo

**Fecha:** 2026-06-07
Status: pending_review
**Tipo:** Documento exploratorio — modelo de datos conceptual

> ⚠️ Este documento define un modelo de datos conceptual para la historia farmacoterapéutica longitudinal del paciente. **No implica implementación en backend, persistencia, integración con JARA/SES/Farmatool ni validez clínica.** Es una especificación exploratoria v0.3 para guiar la creación de datasets JSON sintéticos y prototipos de dashboard. Nada de lo aquí descrito debe implementarse sin decisión de producto previa.

---

## 1. Schema conceptual

El modelo organiza la historia del paciente como un **conjunto de colecciones planas vinculadas por CIP**. No hay anidamiento profundo ni herencia. Cada colección es una lista de eventos/entidades con fecha y metadata de origen.

```
Paciente (1)
  ├── Tratamientos (0..N)
  ├── PROMs (0..N)
  ├── Actividad clínica / índices (0..N)
  ├── Eventos adversos (0..N)
  └── Adherencia (0..N)
```

Todas las colecciones pueden crecer independientemente. La línea temporal del paciente se construye agregando eventos de todas las colecciones ordenados por fecha.

---

## 2. Objetos y campos

### 2.1 Paciente

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `cip` | string | CIP demo | `CIP-DEMO-FH-001` |
| `nombre_demo` | string | Nombre demo (etiqueta sintética; reemplaza al genérico `nombre` en este dataset) | `Paciente Demo FH-001` |
| `sexo` | string | Hombre / Mujer / No especificado | `Mujer` |
| `edad` | number | Edad en años | `48` |
| `servicios_origen` | string[] | Servicios clínicos que siguen al paciente | `["Dermatología", "Farmacia"]` |
| `patologias` | string[] | Patologías activas | `["Hidradenitis supurativa"]` |
| `comorbilidades_relevantes` | object[] | Lista de comorbilidades con metadata | `[{"nombre": "Obesidad grado I", "tipo": "metabólica", "nota": "IMC 30.2"}]` |
| `episodios_asistenciales` | object[] | Eventos asistenciales abiertos/cerrados | `[{"tipo": "Primera visita Farmacia", "fecha": "2026-05-12", "servicio": "Farmacia"}]` |

### 2.2 Tratamiento longitudinal

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | string | ID único del registro tratamiento | `TRAT-FH-001` |
| `cip` | string | FK a paciente | `CIP-DEMO-FH-001` |
| `drug_id` | string | ID del fármaco en el catálogo | `FAR-001` |
| `selected_drug_id` | string | ID seleccionado en el snapshot (puede ser local o CIMA) | `FAR-001` |
| `nombre_comercial` | string | Nombre comercial | `Cosentyx` |
| `principio_activo` | string | Principio activo | `Secukinumab` |
| `presentacion_dosis` | string | Dosis y presentación | `300 mg solución inyectable` |
| `via` | string | Vía de administración | `SC` |
| `pauta` | string | Pauta posológica | `Cada 4 semanas` |
| `fecha_inicio` | string (date) | Fecha de inicio del tratamiento | `2026-05-12` |
| `fecha_fin` | string (date) | Fecha de fin (vacío si activo) | `null` |
| `activo` | boolean | Indica si el tratamiento está activo | `true` |
| `motivo_inicio` | string | Razón clínica del inicio | `HS Hurley II refractaria a antibioterapia oral` |
| `motivo_cambio` | string | Razón de cambio/optimización (vacío si no aplica) | `Fallo secundario a adalimumab` |
| `motivo_suspension` | string | Razón de suspensión (vacío si activo) | `null` |
| `servicio_clinico_origen` | string | Servicio que prescribe/solicita | `Dermatología` |
| `estado_validacion_farmacia` | string | Estado de la validación por Farmacia | `validado` / `pendiente` / `en_seguimiento` / `denegado` |

### 2.3 PROMs longitudinales

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | string | ID único | `PROM-FH-001` |
| `cip` | string | FK a paciente | `CIP-DEMO-FH-001` |
| `fecha` | string (date) | Fecha de toma del PROM | `2026-05-12` |
| `tipo_prom` | string | Tipo de PROM | `DLQI` |
| `valor` | string | Valor numérico o texto del resultado | `13` |
| `interpretacion` | string | Interpretación clínica | `Efecto moderado` |
| `fuente` | string | Origen del dato | `Farmacia` / `Servicio clínico` / `Enfermería` / `Paciente remoto` / `Demo` |

Tipos de PROM válidos en v0.3: `DLQI`, `EVA dolor`, `EVA prurito`, `HAQ`, `DAS28`, `BASDAI`, `ASDAS`.

### 2.4 Actividad clínica (índices)

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | string | ID único | `ACT-FH-001` |
| `cip` | string | FK a paciente | `CIP-DEMO-FH-001` |
| `fecha` | string (date) | Fecha del registro | `2026-06-01` |
| `tipo_indice` | string | Tipo de índice | `IHS4` |
| `valor` | string | Valor del índice | `5` |
| `interpretacion` | string | Interpretación | `Mejoría respecto a basal (9)` |
| `servicio_origen` | string | Servicio que registró el índice | `Dermatología` |
| `fuente` | string | Fuente del dato | `Farmacia` / `Servicio clínico` / `Enfermería` / `Demo` |

### 2.5 Eventos adversos

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | string | ID único | `EA-FH-001` |
| `cip` | string | FK a paciente | `CIP-DEMO-FH-001` |
| `fecha` | string (date) | Fecha del evento | `2026-05-25` |
| `tipo` | string | Tipo de evento adverso | `Reacción cutánea` |
| `gravedad` | string | Gravedad (demo: leve/moderada/grave) | `leve` |
| `relacion_tratamiento` | string | Relación causal con el fármaco | `Posible` / `Probable` / `Definitiva` / `No relacionada` |
| `accion_tomada` | string | Acción adoptada | `Tratamiento sintomático` |
| `descripcion_corta` | string | Tooltip / descripción breve | `Reacción cutánea leve en zona de inyección, resuelta con antihistamínico` |
| `resuelto` | boolean | Estado del evento | `true` |

### 2.6 Adherencia

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | string | ID único | `ADH-FH-001` |
| `cip` | string | FK a paciente | `CIP-DEMO-FH-001` |
| `fecha` | string (date) | Fecha de evaluación | `2026-06-01` |
| `escala` | string | Escala utilizada | `Morisky-Green` |
| `resultado` | string | Resultado crudo | `4/4` |
| `interpretacion` | string | Interpretación | `Alta` |
| `fuente` | string | Fuente del dato | `Farmacia` / `Servicio clínico` / `Enfermería` / `Paciente remoto` / `Demo` |

### 2.7 Cambios de pauta / tratamiento

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | string | ID único del registro de cambio | `CAM-FH-001` |
| `cip` | string | FK a paciente | `CIP-DEMO-FH-001` |
| `fecha` | string (date) | Fecha del cambio de pauta | `2026-05-05` |
| `tipo` | string | Tipo de cambio: `cambio_farmaco`, `optimizacion_intervalo`, `ajuste_dosis`, `suspension`, `reinicio` | `cambio_farmaco` |
| `tratamiento_id` | string | ID del tratamiento afectado (cuando no es cambio entre dos fármacos) | `TRAT-FH-003` |
| `tratamiento_anterior_id` | string | ID del tratamiento previo (si aplica, ej. cambio de fármaco) | `TRAT-FH-001` |
| `tratamiento_nuevo_id` | string | ID del nuevo tratamiento (si aplica, ej. cambio de fármaco) | `TRAT-FH-002` |
| `motivo` | string | Razón del cambio de pauta | `Fallo secundario a Adalimumab. Cambio de diana terapéutica.` |
| `descripcion` | string | Descripción detallada del cambio | `Suspensión de Adalimumab e inicio de Secukinumab con inducción.` |
| `servicio_solicitante` | string | Servicio que solicita el cambio | `Dermatología` |
| `estado_validacion_farmacia` | string | Estado de validación por Farmacia | `validado` / `pendiente` / `en_seguimiento` / `denegado` |
| `fuente` | string | Fuente del dato | `Farmacia` / `Servicio clínico` / `Demo` |

---

## 3. Ejemplo JSON (paciente fragmento sintético)

```json
{
  "paciente": {
    "cip": "CIP-DEMO-FH-001",
    "nombre_demo": "Paciente Demo FH-001",
    "sexo": "Mujer",
    "edad": 48,
    "servicios_origen": ["Dermatología", "Farmacia"],
    "patologias": ["Hidradenitis supurativa"],
    "comorbilidades_relevantes": [
      {
        "nombre": "Obesidad grado I",
        "tipo": "metabólica",
        "nota": "IMC 30.2"
      },
      {
        "nombre": "Exfumador",
        "tipo": "hábito tóxico",
        "nota": "Abandono hace 5 años"
      }
    ],
    "episodios_asistenciales": [
      {
        "tipo": "Primera visita Farmacia",
        "fecha": "2026-05-12",
        "servicio": "Farmacia",
        "estado": "completado"
      },
      {
        "tipo": "Validación Farmacia",
        "fecha": "2026-05-10",
        "servicio": "Farmacia",
        "estado": "completado"
      }
    ]
  },
  "tratamientos": [
    {
      "id": "TRAT-FH-001",
      "cip": "CIP-DEMO-FH-001",
      "drug_id": "FAR-001",
      "selected_drug_id": "FAR-001",
      "nombre_comercial": "Cosentyx",
      "principio_activo": "Secukinumab",
      "presentacion_dosis": "300 mg solución inyectable",
      "via": "SC",
      "pauta": "Cada 4 semanas",
      "fecha_inicio": "2026-05-12",
      "fecha_fin": null,
      "activo": true,
      "motivo_inicio": "HS Hurley II refractaria a antibioterapia oral",
      "motivo_cambio": null,
      "motivo_suspension": null,
      "servicio_clinico_origen": "Dermatología",
      "estado_validacion_farmacia": "en_seguimiento"
    }
  ],
  "proms": [
    {
      "id": "PROM-FH-001",
      "cip": "CIP-DEMO-FH-001",
      "fecha": "2026-05-12",
      "tipo_prom": "DLQI",
      "valor": "13",
      "interpretacion": "Efecto moderado",
      "fuente": "Farmacia"
    },
    {
      "id": "PROM-FH-002",
      "cip": "CIP-DEMO-FH-001",
      "fecha": "2026-06-01",
      "tipo_prom": "DLQI",
      "valor": "8",
      "interpretacion": "Mejoría",
      "fuente": "Farmacia"
    },
    {
      "id": "PROM-FH-003",
      "cip": "CIP-DEMO-FH-001",
      "fecha": "2026-06-01",
      "tipo_prom": "EVA dolor",
      "valor": "3",
      "interpretacion": "Dolor leve",
      "fuente": "Paciente remoto"
    }
  ],
  "actividad_clinica": [
    {
      "id": "ACT-FH-001",
      "cip": "CIP-DEMO-FH-001",
      "fecha": "2026-05-12",
      "tipo_indice": "IHS4",
      "valor": "9",
      "interpretacion": "Actividad moderada (basal)",
      "servicio_origen": "Dermatología",
      "fuente": "Servicio clínico"
    },
    {
      "id": "ACT-FH-002",
      "cip": "CIP-DEMO-FH-001",
      "fecha": "2026-06-01",
      "tipo_indice": "IHS4",
      "valor": "5",
      "interpretacion": "Mejoría respecto a basal",
      "servicio_origen": "Dermatología",
      "fuente": "Farmacia"
    }
  ],
  "eventos_adversos": [
    {
      "id": "EA-FH-001",
      "cip": "CIP-DEMO-FH-001",
      "fecha": "2026-05-25",
      "tipo": "Reacción cutánea",
      "gravedad": "leve",
      "relacion_tratamiento": "Posible",
      "accion_tomada": "Antihistamínico oral",
      "descripcion_corta": "Reacción cutánea leve en zona de inyección, resuelta con antihistamínico",
      "resuelto": true
    }
  ],
  "adherencia": [
    {
      "id": "ADH-FH-001",
      "cip": "CIP-DEMO-FH-001",
      "fecha": "2026-06-01",
      "escala": "Morisky-Green",
      "resultado": "4/4",
      "interpretacion": "Alta",
      "fuente": "Farmacia"
    }
  ]
}
```

---

> **Nota sobre el ejemplo:** El JSON de esta sección es un fragmento conceptual con las colecciones (`tratamientos`, `proms`, `actividad_clinica`, `eventos_adversos`, `adherencia`) como arrays hermanos del objeto `paciente`. El dataset demo implementado en v0.3 (`data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json`) anida estas colecciones dentro de `pacientes[]`, con cada paciente como un objeto autocontenido bajo ese array.

## 4. Mapeo v0.2 → v0.3

| v0.2 (CSV / farmacia_common.js) | v0.3 | Notas |
|---|---|---|
| `Pacientes.csv: CIP, Nombre_Demo, Edad, Servicio_Origen, Patologia` | `paciente.cip, .nombre_demo, .edad, .servicios_origen[], .patologias[]` | Servicio y patología pasan a ser arrays |
| `Pacientes.csv: Estado_FH` | `tratamientos[].estado_validacion_farmacia` | El estado se asocia al tratamiento, no al paciente |
| `Farmacos.csv: ID, Principio_Activo, Nombre_Comercial` | `tratamientos[].drug_id, .principio_activo, .nombre_comercial` | Tratamiento referencia al catálogo |
| `Solicitudes_FH.csv` | `tratamientos[]` (campos: `fecha_inicio`, `servicio_clinico_origen`, `pauta`, `presentacion_dosis`, `via`) | Solicitud es el origen del tratamiento |
| `Seguimientos_FH.csv: Morisky_Green, Adherencia` | `adherencia[].resultado, .interpretacion` | Escala y resultado separados |
| `Seguimientos_FH.csv: Efecto_Adverso` | `eventos_adversos[]` | Evento adverso como colección propia |
| `Seguimientos_FH.csv: Optimizacion, Suspension` | `tratamientos[].motivo_cambio, .motivo_suspension` | Razones vinculadas al tratamiento |
| `PROMs.csv: Tipo, Cuestionario, Resultado` | `proms[].tipo_prom, .valor, .interpretacion` | Interpretación como campo separado |
| `Primera_Visita_FH.csv` | `paciente.episodios_asistenciales[]` | Episodio dentro del paciente |
| `Validaciones_FH.csv` | `tratamientos[].estado_validacion_farmacia` + `episodios_asistenciales[]` | Validación como evento en la timeline |
| `farmacia_common.js: pacientes[].scores` | `actividad_clinica[]` | Scores desglosados en registros individuales |
| No existía en v0.2: comorbilidades | `paciente.comorbilidades_relevantes[]` | Nuevo |
| No existía en v0.2: vía, pauta como campos separados | `tratamientos[].via, .pauta` | Extraído de cadenas compuestas |

---

## 5. Límites de v0.3

- **Solo datos sintéticos:** Ningún campo contiene datos reales de pacientes. Los CIP son demo (`CIP-DEMO-FH-*`).
- **Sin persistencia:** El modelo no define almacenamiento ni backend. Es una especificación para datasets JSON embebidos o cargados en memoria.
- **Sin integración clínica:** No hay conexión con JARA, SES, Farmatool, CIMA API ni ningún sistema externo.
- **Sin validación clínica:** Los valores, interpretaciones y relaciones son ilustrativos. No representan verdad clínica.
- **Sin autenticación ni autorización:** No se modelan roles, permisos ni separación por servicio a nivel de datos.
- **Sin multi-servicio real:** El modelo permite `servicios_origen` como array, pero la lógica de separación/agregación por servicio no está implementada.
- **Un solo tratamiento activo por ahora:** El modelo soporta varios tratamientos en el array, pero la UI v0.3 no gestiona solapamiento ni interacciones.
- **Sin normalización de catálogo:** `drug_id` referencia al catálogo actual, pero no hay Foreign Key real ni validación de integridad.

---

## 6. Lo que queda para v0.4

- **Multi-tratamiento simultáneo:** Lógica de solapamiento, interacciones, priorización de fármacos activos.
- **Multi-servicio real:** Visibilidad cruzada de eventos entre servicios con reglas de acceso.
- **Dashboard longitudinal renderizado:** Componente de timeline que consume el modelo y pinta eventos.
- **Filtros analíticos por servicio, patología, fármaco, PROM y adherencia.**
- **Persistencia en backend ligero (Supabase / SQLite) o al menos exportable.**
- **Catálogo farmacológico transversal** con datos de CIMA (API o carga estática versionada).
- **Normalización de escalas PROM:** Tablas de referencia para interpretación automática.
- **Eventos adversos con severidad graduada** (CTCAE u otra escala estándar).
- **Adherencia multi-escala:** Soporte para más escalas además de Morisky-Green (SMAQ, MARS-5, etc.).
- **Pruebas automatizadas** sobre el modelo de datos (validación de esquema, integridad referencial básica).

---

## 7. Riesgos y decisiones pendientes

| Riesgo / Decisión | Impacto | Estado |
|---|---|---|
| **¿JSON plano o migrar a backend?** | Determina si este modelo se implementa como dataset embebido o como esquema de base de datos | Pendiente de decisión de producto |
| **¿Catálogo CIMA vía API o carga estática?** | Impacta en `drug_id` y frecuencia de actualización | Pendiente de decisión de producto |
| **¿Multi-servicio en misma app o apps separadas?** | Impacta en cómo se construye la timeline (agregación local vs por servicio) | Pendiente de decisión de producto |
| **Estandarización de interpretaciones PROM** | Sin tablas de referencia, las interpretaciones son texto libre no comparable | Aceptado para v0.3 |
| **Crecimiento del JSON por paciente** | Un paciente con muchos eventos puede generar payloads grandes. ¿Paginación por colección? | No abordado |
| **Identificador único de tratamiento entre servicios** | Un tratamiento puede ser visto por Farmacia y Reumatología. ¿Mismo ID o cada servicio tiene el suyo? | Pendiente de decisión |
| **Eventos adversos sin CTCAE** | La gravedad es texto libre demo. Para uso clínico real se necesita CTCAE v5.0 | Aplazado a v0.4 |

---

*Documento generado: WO Fase B — Modelo longitudinal mínimo Farmacia v0.3, 2026-06-07. Builder: DeepSeek v4 Flash.*
