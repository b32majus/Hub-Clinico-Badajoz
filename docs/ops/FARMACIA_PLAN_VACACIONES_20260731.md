# Plan maestro de trabajo — FarmaNEXus / PROMueve Nexus V4

| Metadato | Valor |
|---|---|
| Ventana | 2026-07-31 a 2026-08-15 |
| Duración | 16 días |
| Estado | Plan operativo aprobado por Sil/Cora para ejecución gobernada |
| Aprobación institucional | No |
| Rama publicada de partida | `recovery/farmacia-pr-replay-20260727` |
| HEAD inicial | `accac670ba216d8c291ee849d2198742d02bb3f0` |
| Snapshot estable inicial | `CÁCERES-REVIEW-0.2` |
| Disponibilidad humana | 3–4 horas diarias |
| Trabajo asíncrono | Una WO atómica puede ejecutarse mientras Silvia no está delante |
| Datos | Exclusivamente sintéticos |
| Documento arquitectónico | `../architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md` |

> Este plan ordena trabajo. No autoriza automáticamente sus WOs, merges, datos reales, piloto, backend institucional ni integraciones.

---

## 1. Misión del ciclo

Llegar al 2026-08-15 con una primera implementación V4 coherente, no con una colección de parches:

1. Incorporar el feedback inmediato de Farmacia Cáceres.
2. Permitir que la farmacéutica simule pacientes arbitrarios mediante el flujo normal.
3. Dejar de depender exclusivamente de pacientes hardcodeados.
4. Estabilizar un modelo canónico versionado.
5. Construir un Excel Bridge por hospital.
6. Demostrar el roundtrip Hub → Excel → Hub.
7. Extraer configuración no-paciente hacia un Control Plane.
8. Mantener CIMA oficial versionado y preparar su actualización revisable.
9. Reducir doble registro mediante parsers deterministas.
10. Preparar renovaciones por línea desde datos explícitos de Presalud.
11. Dejar el sistema listo para migrar a servidor.
12. Demostrar que el modelo puede proyectarse a FHIR/openEHR sin depender de la fila Excel.

---

## 2. Resultado mínimo de éxito

Al terminar las vacaciones deben estar demostrados:

```text
Quick wins clínicos de Cáceres
+
uso normal de CIP sintéticos arbitrarios
+
evento canónico versionado
+
Export Manager común
+
Excel Bridge Cáceres
+
roundtrip Hub → Excel → Hub
+
Control Plane Supabase v0.1 sin pacientes
+
CIMA oficial separado de catálogo local
+
parser de orden clínica
+
matriz FHIR/openEHR v0.1
```

Presalud y renovaciones son parte del objetivo si llega el texto exacto a tiempo. No se fabricará un formato especulativo.

---

## 3. Decisiones cerradas

### 3.1 Pacientes de evaluación

- No existe un botón `Nuevo paciente sintético`.
- La profesional introduce un CIP inventado y trabaja como si fuera un paciente normal.
- Los formularios exigen los campos aprobados para cada acto; no existe un alta sintética reducida.
- Los fixtures existentes permanecen para demo y regresión.
- El funcionamiento debe dejar de depender exclusivamente de ellos.

### 3.2 Persistencia y Excel

- El Hub siempre genera la información.
- La profesional no crea el paciente escribiendo una fila Excel.
- Un único esquema de evento/fila cubre Validación, Primera Visita y Seguimiento.
- Una fila representa un acto concreto.
- Varias filas del mismo paciente construyen longitudinalidad.
- Los bloques que no aplican permanecen vacíos.
- Un libro independiente por hospital.
- Sin consolidación regional automática.

### 3.3 Hospitales y branding

- Despliegues: Cáceres, Badajoz y Mérida.
- Código y contratos comunes.
- Configuración, nombre visible y servicios habilitados por hospital.
- Nombre paraguas provisional interno: `PROMueve Nexus`.
- Módulo Farmacia: `FarmaNEXus`.
- Primer Excel Bridge: Cáceres, Dermatología y Digestivo.

### 3.4 Identidad

- No se implementa un Identity Plane físico durante este ciclo.
- No se crea otro Excel ni una doble alta manual.
- Sí se reserva `patient_id` opaco y la interfaz futura `IdentityRepository`.
- El Identity Plane se activa cuando exista servidor/PROM Gateway y pueda funcionar de forma invisible.

### 3.5 CIMA

- CIMA oficial sigue versionado en GitHub.
- La actualización mensual todavía no está implementada.
- La Action futura abrirá PR revisable; no actualizará snapshots silenciosamente.
- Catálogo local especial y CIMA oficial permanecen separados.

### 3.6 Control Plane

Supabase puede almacenar configuración no-paciente:

- hospitales;
- servicios;
- profesionales;
- roles funcionales;
- patologías;
- formularios;
- filtros;
- reglas;
- widgets;
- perfiles de exportación;
- catálogo local especial;
- diccionario de variables.

No almacenará datos de pacientes durante este ciclo.

### 3.7 Interoperabilidad

- El evento canónico es la fuente conceptual.
- Excel, JARA, FHIR y openEHR son adaptadores/proyecciones.
- No se convierte directamente la fila Excel a FHIR como arquitectura definitiva.
- FHIR/openEHR se documentan y prueban con datos sintéticos; no se implementa integración institucional.

---

## 4. Prioridades

### P0

- No romper el entorno Cáceres que ya funciona.
- Mantener seguridad clínica y no inferencia.
- Incorporar los quick wins solicitados.
- Habilitar trabajo normal con CIP arbitrario.
- Estabilizar persistencia y roundtrip.

### P1

- Modelo canónico.
- Export Manager y Excel Bridge.
- Diccionario de variables.
- Control Plane no-paciente.
- Parser de orden clínica.

### P2

- Presalud y renovaciones, condicionados a evidencia.
- CIMA Action mensual.
- Power Automate.
- mapeo FHIR/openEHR.

### No toca durante el ciclo

- V5 agnóstica completa;
- refactor general del frontend;
- producción;
- datos reales;
- autenticación productiva;
- Identity Plane manual;
- servidor FHIR;
- CDR openEHR;
- integración automática JARA/Farmatool;
- consolidación regional;
- mezcla con Reuma v2 o `main`.

---

## 5. Entrega rápida del lunes 2026-08-03

### Objetivo

Entregar a la farmacéutica una versión estable que incorpore su feedback y le permita explorar un caso propio inventado mediante el flujo normal.

### Incluye

1. `Cada 3 semanas` en el catálogo común.
2. Normalización, labels y exportación coherentes.
3. `Observaciones de Farmacia Hospitalaria` en:
   - pantalla;
   - TXT JARA;
   - Excel/exportación;
   - tests.
4. Comorbilidades comunes:
   - infecciones recurrentes;
   - riesgo/antecedentes cardiovasculares;
   - alteraciones neurológicas;
   - antecedentes/riesgo de neoplasia.
5. CIP arbitrario mediante flujo normal.
6. Validación completa con datos inventados.
7. Exportación del acto.
8. Conservación de fixtures demo.
9. QA navegador y regresiones.
10. Promoción separada a `CÁCERES-REVIEW-0.3` solo después de QA regional humana.

### No promete para el lunes

- Excel Bridge relacional completo;
- roundtrip longitudinal;
- Supabase;
- Presalud;
- Power Automate;
- Digestivo definitivo;
- FHIR/openEHR.

---

## 6. Cronograma de 16 días

## Días 1–3 — 31 de julio a 2 de agosto

### Bloque A — Reconciliación documental

- estado regional y Cáceres 0.2;
- plan de vacaciones;
- arquitectura objetivo V4;
- índice y tablero de WOs;
- addendum del roadmap.

### Bloque B — Quick wins Cáceres

- pauta cada 3 semanas;
- observaciones FH;
- cuatro comorbilidades;
- coherencia JARA/Excel;
- tests y QA;
- paciente arbitrario en Validación.

### Criterio de salida

- versión regional demostrada;
- cero regresiones conocidas;
- paquete preparado para la farmacéutica;
- promoción Cáceres separada y gobernada.

---

## Días 4–5 — 3 y 4 de agosto

### Modelo canónico v0.1

Definir:

- envelope de evento;
- `schema_version`;
- `event_id`;
- `source_event_id`;
- `patient_id`;
- `hospital_code`;
- `service_code`;
- `pathology_code`;
- `request_id`;
- `validation_id`;
- `treatment_id`;
- `line_id`;
- `visit_id`;
- `ea_id`;
- procedencia y flags de calidad.

### Entregables

- JSON Schema base;
- ejemplos sintéticos de Validación, Primera Visita y Seguimiento;
- diccionario de variables v0.1;
- política de compatibilidad y versionado;
- mapa desde las 61 columnas actuales.

### Criterio de salida

- un mismo acto produce una representación canónica estable;
- no se pierde `0`, `false` o ausencia;
- solicitado, validado, iniciado y dispensado permanecen separados.

---

## Días 6–7 — 5 y 6 de agosto

### Export Manager v2

- construir salidas desde evento canónico;
- mantener TXT JARA;
- mantener Excel compatible;
- incluir `schema_version` y `source_event_id`;
- soportar Validación, Primera Visita y Seguimiento;
- soportar seguimiento multilínea sin inventar dispensación;
- tests de paridad con salidas existentes.

### Criterio de salida

```text
Evento canónico
→ TXT JARA
→ fila Excel
```

con misma identidad y verdad clínica.

---

## Días 8–10 — 7 a 9 de agosto

### Excel Bridge Cáceres

Crear el libro con:

- `01_DERMA`;
- `03_DIGESTIVO`;
- tablas técnicas relacionadas;
- estados de procesamiento;
- errores;
- vistas `APP_*`.

### Office Script

- procesa pendientes;
- valida esquema;
- comprueba duplicados;
- conserva entrada nativa;
- fragmenta;
- registra errores;
- genera vistas;
- es idempotente.

### Criterio de salida

- una fila pegada se procesa una sola vez;
- reejecutar no duplica;
- un error no destruye la fila;
- no existe inferencia clínica.

---

## Días 11–12 — 10 y 11 de agosto

### Roundtrip

Demostrar:

```text
CIP inventado
→ Validación
→ Primera Visita
→ Seguimiento
→ exportaciones
→ Excel Bridge
→ recarga en Hub
→ dashboard longitudinal
```

### Cobertura

- un paciente con una línea;
- un paciente con dos líneas activas explícitas;
- `0` y `false` preservados;
- campos ausentes preservados;
- EA común y causalidad por sospechoso;
- no duplicados;
- cambio de CIP seguro;
- recarga de página.

### Criterio de salida

La herramienta deja de depender funcionalmente de los fixtures para reconstruir una historia.

---

## Días 13–14 — 12 y 13 de agosto

### Control Plane Supabase v0.1

Definir e implementar con datos sintéticos:

- tenant Cáceres;
- servicios Dermatología/Digestivo;
- profesionales;
- roles funcionales;
- patologías habilitadas;
- catálogo local especial;
- formulario JSON;
- filtro JSON;
- regla de alerta JSON;
- perfil de exportación;
- versión y auditoría.

### Consumo desde el Hub

El Hub debe leer, como mínimo:

- identidad/configuración Cáceres;
- profesionales;
- servicios y patologías habilitadas;
- catálogo local.

### Barreras

- cero datos de pacientes;
- RLS o controles equivalentes en laboratorio;
- sin service key en frontend;
- fallo seguro si no carga configuración;
- fallback demo versionado y explícito, no silencioso.

### Criterio de salida

La configuración deja de estar obligatoriamente incrustada en código.

---

## Día 15 — 14 de agosto

### Parser de orden clínica

- usar la plantilla de Dermatología;
- reconocer etiquetas constantes;
- preview actual/propuesto;
- confirmación profesional;
- no sobrescribir silenciosamente;
- conservar texto fuente;
- separar justificación clínica y observaciones FH.

### Presalud

Si ha llegado el texto exacto:

- fixture sintético fiel;
- parser delimitado;
- preview;
- mapeo canónico;
- detección de fecha explícita;
- tests de variantes reales.

Si no ha llegado:

- contrato de entrada pendiente;
- campos abiertos documentados;
- parser no implementado;
- renovaciones bloqueadas por evidencia.

---

## Día 16 — 15 de agosto

### Integración y cierre

- regresión general;
- QA navegador visible;
- revisión de consola y errores;
- comprobación de datos sintéticos;
- documentación de estado;
- paquete de migración a servidor;
- backlog siguiente;
- matriz de interoperabilidad.

### FHIR/openEHR v0.1

Producir con un acto sintético:

- evento canónico;
- fila Excel;
- TXT JARA;
- Bundle FHIR candidato;
- COMPOSITION openEHR candidata;
- matriz de gaps.

### Criterio de salida

Demostrar que el modelo no está encerrado en Excel, sin presentar interoperabilidad como implementada.

---

## 7. Trabajo transversal

### CIMA

Dos WOs separadas:

1. extracción y JSON versionado manualmente;
2. workflow mensual que abre PR.

Solo se ejecutan si no ponen en riesgo los hitos principales.

### Power Automate

- máximo un día;
- Office Script manual sigue siendo suficiente;
- investigar compatibilidad del runtime;
- evaluar trigger HTML sin datos clínicos ni secretos;
- detener ante permisos o gobernanza.

### Digestivo

- Silvia prepara/recibe el consenso;
- no implementar campos definitivos sin evidencia;
- el Excel Bridge reserva `03_DIGESTIVO` y `service_code`.

### Diccionario regional de patologías

- importar y versionar cuando llegue;
- no reemplazar códigos existentes sin tabla de correspondencia;
- registrar procedencia, versión y fecha.

---

## 8. Secuencia de WOs

Las siguientes WOs son una cola orientativa. Cada una necesita autorización concreta.

| Orden | WO | Objetivo | Condición |
|---:|---|---|---|
| 1 | `WO-FH-CACERES-FEEDBACK-QUICK-WINS-01` | Pauta, observaciones y comorbilidades | Inmediata |
| 2 | `WO-FH-DYNAMIC-PATIENT-NORMAL-FLOW-01` | CIP arbitrario por flujo normal | Inmediata |
| 3 | `WO-FH-CACERES-REVIEW-03-PROMOTION-01` | Promover SHA demostrado | Tras QA humana regional |
| 4 | `WO-DATA-FH-CANONICAL-EVENT-CONTRACT-01` | Envelope e IDs | Tras quick wins |
| 5 | `WO-DATA-DICTIONARY-FH-V0-1-01` | Diccionario | Con contrato canónico |
| 6 | `WO-FH-EXPORT-MANAGER-CANONICAL-EVENT-01` | Adaptadores JARA/Excel | Con schemas |
| 7 | `WO-FH-EXCEL-BRIDGE-CACERES-CONTRACT-01` | Estructura del libro | Con export contract |
| 8 | `WO-FH-EXCEL-BRIDGE-CACERES-OFFICE-SCRIPT-01` | Procesamiento idempotente | Con libro |
| 9 | `WO-FH-EXCEL-BRIDGE-ROUNDTRIP-01` | Recuperación longitudinal | Con Bridge estable |
| 10 | `WO-FH-CONTROL-PLANE-SUPABASE-V0-1-01` | Configuración no-paciente | Sin clínica |
| 11 | `WO-FH-DERMA-CLINICAL-ORDER-PARSER-01` | Parser orden clínica | Plantilla vigente |
| 12 | `WO-FH-PRESALUD-CLIPBOARD-PARSER-01` | Parser Presalud | Condicionado al texto |
| 13 | `WO-FH-TREATMENT-RENEWAL-ALERTS-01` | Renovaciones por línea | Condicionado a fechas |
| 14 | `WO-FH-CIMA-VERSIONED-JSON-UPDATE-01` | Extracción reproducible | No bloqueante |
| 15 | `WO-FH-CIMA-MONTHLY-PR-WORKFLOW-01` | Action mensual con PR | Tras extracción validada |
| 16 | `WO-FH-POWER-AUTOMATE-COMPATIBILITY-01` | Compatibilidad/trigger | Opcional, máximo un día |
| 17 | `WO-DOC-FH-INTEROPERABILITY-MAPPING-V0-1-01` | Matriz FHIR/openEHR | Con modelo canónico |
| 18 | `WO-DOC-HUB-CANONICAL-ALIGNMENT-POST-FH-PLAN-01` | README/Architecture/Changelog/Agents | Tras cierre del ciclo |

No encadenar varias WOs clínicas sin revisión humana intermedia.

---

## 9. Cadencia diaria

Para cada jornada de 3–4 horas:

1. **30–45 min:** revisar reporte y diff del trabajo asíncrono.
2. **60–90 min:** QA manual y decisión funcional.
3. **60 min:** preparar/corregir la siguiente WO.
4. **30–45 min:** documentación, commit, PR o reconciliación.

Trabajo asíncrono permitido:

- implementación de una WO atómica;
- tests;
- inventarios read-only;
- generación de fixtures sintéticos;
- documentación acotada.

Trabajo asíncrono no permitido sin revisión:

- varias WOs clínicas encadenadas;
- merges;
- cambios de arquitectura;
- migraciones;
- datos;
- seguridad;
- refactors amplios.

---

## 10. Dependencias externas

| Dependencia | Estado 2026-07-31 | Impacto | Respuesta |
|---|---|---|---|
| Texto Presalud | Solicitado | Parser/renovaciones | Esperar evidencia; no inventar |
| Diccionario de patologías | Solicitado | Configuración regional | Preparar importador, no contenido |
| Formulario Digestivo | Pendiente | Campos clínicos | No cerrar circuito definitivo |
| Consenso SEFH/PROs | Preparación por Silvia | Variables | Incorporar tras revisión |
| Servidor Badajoz | Disponibilidad comunicada | Migración futura | Llegar con contrato y roundtrip |
| Servidor Mérida | Apoyo gerencial comunicado | Migración futura | Mismo paquete técnico |
| Servidor Cáceres | No cerrado | Persistencia futura | No bloquea evaluación |
| Trigger HTML Power Automate | Pendiente | Automatización/PROs | PoC sin datos clínicos |
| FHIR/openEHR SES | Pendiente institucional | Interoperabilidad | Preparar mapping, no integración |
| Auth/permisos | Pendiente | Piloto real | No introducir datos reales |

---

## 11. QA obligatoria

Según alcance:

- `node --check`;
- checks focales;
- smoke Farmacia;
- common y tratamiento común;
- Validación;
- Primera Visita;
- Seguimiento;
- Enfermería/importaciones;
- Export Manager;
- Excel Bridge e idempotencia;
- schema validation;
- QA navegador con controles visibles;
- consola y `pageerror`;
- recarga directa;
- estados vacíos;
- duplicados;
- fallo de carga;
- datos sintéticos;
- `git diff --check`;
- revisión independiente cuando el riesgo lo justifique.

No se considerará corregida una UI solo por tests de VM/DOM si la interacción de navegador es relevante.

---

## 12. Criterios clínicos de aceptación

- solicitado, validado, iniciado y dispensado separados;
- línea identificada explícitamente;
- ausencia preservada;
- cambios profesionales preservados;
- no inferencia desde CIMA;
- no switch/add-on por aparición de fármaco;
- causalidad solo por sospechoso explícito;
- renovación solo por confirmación/fuente válida;
- fechas confirmadas y estimadas visibles como categorías distintas;
- JARA y Excel consumen la misma verdad canónica.

---

## 13. Señales de parada

Detener y escalar si:

- el alcance exige datos reales;
- aparece un contrato clínico no validado;
- el Excel obliga a doble alta manual;
- un parser necesita adivinar el formato;
- un cambio mezcla quick win y refactor amplio;
- Supabase empieza a recibir datos clínicos;
- el trigger HTML expone secretos o payload clínico;
- FHIR/openEHR requiere decisiones institucionales no disponibles;
- el diff toca rutas fuera de WO;
- falla dos veces la misma corrección conceptual;
- la QA humana contradice los tests.

---

## 14. Stretch goals

Solo después del roundtrip completo:

- `DemoRepository` / `ExcelRepository` / `PostgresRepository` con tests de contrato;
- PostgreSQL local en M7 con datos sintéticos;
- API local mínima;
- migrador Excel → PostgreSQL;
- paquete de configuración exportable/importable;
- comparación Supabase/PostgreSQL para configuración;
- PoC del trigger HTML;
- formulario declarativo adicional.

No iniciar una V5 agnóstica completa.

---

## 15. Entregables del cierre

1. Versión Cáceres posterior al feedback, si supera QA.
2. Estado publicado reconciliado.
3. Evento canónico y schemas.
4. Diccionario v0.1.
5. Export Manager v2.
6. Excel Bridge Cáceres.
7. Office Script.
8. Roundtrip demostrado.
9. Control Plane v0.1.
10. Parser orden clínica.
11. Presalud/renovaciones o bloqueo documentado.
12. CIMA Action implementada o plan técnico listo, según tiempo.
13. Matriz FHIR/openEHR.
14. Paquete para solicitar/usar servidor.
15. Backlog del ciclo siguiente.

---

## 16. Frontera final

Al terminar este plan, el objetivo es disponer de una **V4 demostrada en laboratorio y evaluación sintética**, preparada para servidor.

No se declarará:

- piloto real;
- producción;
- integración SES;
- autenticación real;
- Identity Plane operativo;
- captura PROM real;
- cumplimiento institucional completo;
- interoperabilidad FHIR/openEHR implementada.

Cada salto posterior requiere decisión, WO, seguridad, QA y gobierno específicos.