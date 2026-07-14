# Roadmap de arquitectura Hub PROMueve post-SES

| Metadato | Valor |
|---|---|
| Estado | **Propuesta canónica pendiente de validación humana** |
| Fecha | 2026-07-10 |
| Rama fuente | `preview/demo-lunes-wo4-20260614` |
| Baseline funcional verificado | `7486243264e6952e7f1d6afe3d1b24e5907a2a0f` |
| Snapshot documental actual | `17f29fa14611c5f020a9f164935456b8019cf211` (post-PR #14) |
| Alcance | Roadmap documental post-reunión SES para Reumatología, Enfermería y Farmacia Hospitalaria; no aprueba arquitectura, contratos clínicos, despliegues ni integraciones |
| Propietaria y validadores | Sil / Cora |

**Leyenda de estado**

| Estado | Significado en este documento |
|---|---|
| **Cerrado** | Decisión registrada en una fuente canónica. Puede quedar materialización operativa pendiente. |
| **Propuesto** | Recomendación sometida a validación de Sil/Cora; no es una aprobación ni un compromiso institucional. |
| **Exploratorio** | Hipótesis o candidato que requiere evaluación técnica, clínica o institucional. |
| **Pendiente** | Decisión no tomada o actuación no ejecutada. |

**Referencias de evidencia**

| Ref. | Fuente |
|---|---|
| **E1** | `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md` y `AGENTS.md` |
| **E2** | `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md` y `docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md` |
| **E3** | `docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md` y `docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md` |
| **E4** | `docs/farmacia_branch_manifest_20260614.md`, contratos Farmacia WO6-WO8 y documentos `docs/ops/FARMACIA_V0_3*`, `FARMACIA_V0_4*`, `FARMACIA_V0_5*` |
| **E5** | `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y `docs/ops/farmacia-roadmap-post-demo-v0-3-20260607.md` |
| **E6** | Informe externo de auditoría `/srv/kairos-lab/outbox/reports/WO-DOC-AUDIT-HUB-POST-SES-01.md`, 2026-07-10 |
| **E7** | Rama HOLD `origin/docs/promueve-fh-control-plane-federado-20260713` — propuesta de control plane federado, 2026-07-13 |

Las referencias indican procedencia, no aprobación. Cuando una afirmación procede del contexto post-SES aportado por esta work order y no de un acta institucional, se marca expresamente como propuesta o pendiente.

## 1. Resumen ejecutivo post-SES

El proyecto cambia de encuadre después de la reunión con la Subdirección General de Farmacia del SES: deja de poder explicarse solo como una aplicación de Reumatología y pasa a necesitar una visión clínico-farmacéutica transversal. La aceptación en el grupo de trabajo se recoge únicamente como **contexto aportado por esta work order**; no equivale a aprobación formal del SES, autorización institucional, validación de producción ni compromiso de Salud Digital o STIC.

Existe una tensión saludable que debe preservarse. El piloto local permite validar pronto el proceso asistencial y aprender con una solución manejable; la integración corporativa futura exige seguridad, gobierno del dato, interoperabilidad, soporte y arquitectura institucional. Forzar ahora cualquiera de los extremos sería perjudicial: convertir el piloto en una plataforma corporativa sin patrocinio técnico aumentaría el riesgo, y consolidar Excel como arquitectura final bloquearía la evolución.

Por ello se propone una vía dual:

1. **Piloto local controlado:** continuar con navegador, Excel/archivos estructurados y datos exclusivamente sintéticos mientras se endurecen contratos, validaciones y trazabilidad.
2. **Arquitectura corporativa futura:** preparar abstracciones y modelos portables para una integración que deberá diseñarse con Salud Digital/STIC, cuyo papel, requisitos y capacidad de soporte siguen **pendientes**.

El baseline funcional verificado de la preview de GitHub Pages `preview/demo-lunes-wo4-20260614` es `7486243264e6952e7f1d6afe3d1b24e5907a2a0f`. El snapshot documental actual tras el PR #14 es `17f29fa14611c5f020a9f164935456b8019cf211`; los commits posteriores al baseline funcional incorporados hasta ese snapshot son documentales y no sustituyen una nueva validación funcional. Ninguna de estas referencias debe confundirse con una release institucional ni con producción. [E2][E4][E6]

## 2. Nomenclatura provisional

Se propone la siguiente nomenclatura de trabajo:

| Nivel | Nombre provisional | Uso |
|---|---|---|
| Framework | **Hub clínico-farmacéutico** | Marco modular y transversal de coordinación clínica. |
| Piloto | **PROMueve Farmacia Extremadura** | Piloto/programa específico de la línea Farmacia. |
| Módulo | **Validación Farmacoterapéutica** | Revisión de solicitudes, tratamiento y bloqueantes. |
| Módulo | **Primera Visita FH** | Inicio del seguimiento de Farmacia Hospitalaria. |
| Módulo | **Seguimiento FH** | Evolución farmacoterapéutica longitudinal. |
| Módulo | **Dashboard paciente** | Proyección longitudinal individual. |
| Módulo | **Importación Enfermería/Farmacia** | Entrada diferenciada de solicitudes de Enfermería y actos FH. |
| Módulo | **Catálogo farmacológico** | Selección y normalización CIMA/local. |
| Módulo | **Exportación JARA/Excel FH** | Salida documental y fila estructurada para persistencia provisional. |

Todos estos nombres están **pendientes de validación de Sil/Cora antes de cualquier comunicación externa**. Son descriptores de trabajo, no marcas aprobadas por el SES. [E4][E6]

## 3. Filosofía del proyecto

> **El objetivo del proyecto no es desarrollar una aplicación para una patología concreta, sino un framework clínico-farmacéutico configurable que permita construir herramientas asistenciales centradas en el paciente, reutilizando arquitectura funcional, modelo de datos, principios de seguridad clínica y mecanismos de interoperabilidad futura.**

Esto implica priorizar un piloto sólido antes que un sistema total, aprender del flujo profesional real y conservar una ruta de salida del Excel. La herramienta digital sirve al rediseño asistencial; no es el proyecto por sí sola. [E2]

## 4. Principios de diseño

1. **Seguridad clínica antes que automatización.** Ninguna mejora de velocidad justifica reducir validación, trazabilidad o control profesional.
2. **No inferir información terapéutica cuando exista incertidumbre.** La ausencia o ambigüedad debe quedar visible y pendiente de confirmación.
3. **El catálogo ayuda, nunca decide.** Facilita selección y normalización sin sustituir el criterio profesional.
4. **Todo dato relevante debe ser estructurable.** Las salidas legibles pueden convivir con una representación analítica trazable.
5. **Una pantalla nunca es el modelo de datos.** La presentación es una proyección del dominio, no su contrato.
6. **Backend intercambiable.** El dominio no debe depender de Excel, SharePoint, PostgreSQL o una API concreta.
7. **Configuración antes que programación.** Las variaciones funcionales repetibles deben expresarse declarativamente cuando sea seguro.
8. **Una patología nueva debería añadirse configurando, no reescribiendo código.** El framework debe reutilizar estructura, reglas y componentes.
9. **Local-first mientras sea necesario.** El piloto debe seguir siendo viable bajo las restricciones operativas actuales.
10. **Cloud/backend-ready cuando sea posible.** La evolución debe prepararse sin anticipar infraestructura no aprobada ni romper el piloto.
11. **Cada WO debe dejar el sistema más gobernable que antes.** Toda intervención debe mejorar evidencia, límites, contratos o mantenibilidad.

**Regla clínica explícita de no inferencia:** nunca se deben inferir dosis, vía, pauta, presentación o inducción a partir del nombre del fármaco. El catálogo ayuda a seleccionar y normalizar, pero no decide datos terapéuticos.

[E1][E2][E3][E4]

## 5. Estado real de las líneas de producto

### 5.1 Reuma v2

**Estado: Cerrado en capacidad funcional; pendiente de alineación documental con la preview.**

Reuma v2 cubre EspA, APs, AR, LES y Sjögren, bloque prebiológico/vacunación, Solicitud FH, contrato Excel ancho de 497 columnas por hoja clínica, dashboard de paciente y estadísticas multipatología. Sus documentos canónicos siguen siendo la referencia para Reuma, pero no describen adecuadamente toda la evolución Farmacia presente en la preview. No debe alterarse el contrato ancho sin validación clínica y una WO específica. [E1][E2][E6]

### 5.2 Farmacia preview

**Estado: Cerrado como evidencia técnica de preview; no aprobado como producto institucional.**

La referencia completa es `preview/demo-lunes-wo4-20260614` en `7486243264e6952e7f1d6afe3d1b24e5907a2a0f`. Incluye validación farmacoterapéutica, primera visita, seguimiento, dashboard de paciente, importación de Excel de Enfermería y Farmacia, catálogo CIMA/local, copia TXT para JARA y copia de fila Excel FH. La QA real de GitHub Pages quedó verificada en la auditoría post-SES, junto con smoke y checks de exportación. Esto demuestra capacidad funcional de demo, no autorización productiva ni integración real con JARA. [E4][E6]

### 5.3 Enfermería

**Estado: Propuesto/parcial.**

Existe una plantilla Excel sintética de inicio de biológico, un adaptador de importación y un flujo Enfermería hacia validación de Farmacia. También existen bloques de prebiológico/vacunación y paneles de solicitudes. Sin embargo, el diseño funcional consolidado de Enfermería continúa pendiente: el canvas no está validado y la implementación táctica no debe elevarse automáticamente a contrato clínico definitivo. [E3][E4]

### 5.4 Hub general

**Estado: Propuesto.**

El Hub se entiende como capa transversal intermedia entre la práctica local y una futura arquitectura corporativa. Debe permitir que los módulos funcionen de forma independiente, conectada o como ecosistema completo, sin atribuirse las funciones legales del registro clínico corporativo ni las garantías de un sistema productivo. [E2][E6]

## 6. Versionado propuesto

Las etiquetas V3/V4/V4.5/V5 se reservan aquí **solo como fases de producto propuestas**. No son versiones técnicas, releases, tags, ramas ni compromisos aprobados.

| Fase de producto propuesta | Objetivo | Estado |
|---|---|---|
| **V3** | Demo funcional institucional: explicar el circuito completo, sus límites y el valor asistencial. | Propuesto |
| **V4** | Piloto local-first backend-ready: Excel controlado, contratos, validación, diccionario y repository layer. | Propuesto |
| **V4.5** | Evolución Microsoft/SharePoint o backend progresivo, solo si el entorno institucional lo permite. | Exploratorio y condicionado |
| **V5** | Hub agnóstico y configurable por organización, servicio, programa, patología y recorrido. | Exploratorio |

Para evitar falsas equivalencias se distinguen siete conceptos:

| Concepto | Definición |
|---|---|
| Fase de producto | Hito funcional o institucional validado por responsables del proyecto. |
| Versión técnica | Evolución interna de un módulo o contrato; por ejemplo, la serie Farmacia v0.x ya documentada. |
| Rama/commit | Evidencia reproducible de código, como `preview/demo-lunes-wo4-20260614` @ `7486243`. |
| Release institucional | Entrega formal aceptada por la organización; no consta ninguna nueva en este roadmap. |
| Demo | Presentación controlada, con datos sintéticos, para validar comprensión y flujo. |
| Piloto | Uso controlado bajo condiciones, responsabilidades y soporte definidos; no equivale a producción. |
| Producción | Operación con garantías institucionales, seguridad, soporte, datos reales y gobierno formal; no alcanzada. |

Hay colisión con los conceptos existentes del repositorio: v1 legacy, Reuma v2/v2.1/v2.2, arquitectura v3, framework v4 y Farmacia v0.1-v0.5. Antes de usar V3/V4/V4.5/V5 fuera de este documento se recomienda una tabla de mapeo explícita y validación humana. No se crean ni se presuponen releases o tags. [E1][E2][E4][E6]

## 7. Roadmap de arquitectura

| Fase | Alcance exacto | Resultado esperado | Estado/condición |
|---|---|---|---|
| **1. Piloto local-first Excel/SharePoint** | Mantener operación local con Excel; SharePoint solo como opción de intercambio si ya está habilitado. | Flujo demostrable, controlado y reversible. | Excel actual; SharePoint **condicional** y sujeto a revisión de DEC-009. |
| **2. Hardening/backend-ready** | Validación de plantillas, `schemaVersion`, contratos, separación demo/piloto y QA. | Menor riesgo de rotura silenciosa. | Propuesto. |
| **3. Repository layer** | Desacoplar dominio y pantallas de Excel, almacenamiento de sesión o API. | Sustitución progresiva de persistencia sin reescribir el circuito clínico. | Propuesto. |
| **4. Diccionario de variables** | Definir significado, tipo, origen, responsable, destino y mapeos potenciales. | Lenguaje común para Excel, backend e interoperabilidad. | Propuesto; requiere validación clínica. |
| **5. Persistencia Microsoft/SharePoint/Lists** | Evaluar Lists, bibliotecas o automatización Microsoft cuando permisos, tenant y soporte estén resueltos. | Alternativa institucional intermedia. | Exploratorio; no aprobado y sujeto a DEC-009. |
| **6. Backend de laboratorio PostgreSQL/Supabase/Oracle Cloud** | Probar con datos sintéticos una persistencia real y migración desde repositorios. | Evidencia técnica, no producción. | OCI/PostgreSQL es candidato canónico pero no implementado; Supabase es exploratorio; Oracle Cloud significa OCI, no Oracle Database aprobada. |
| **7. Arquitectura institucional con Salud Digital/STIC** | Definir identidad, permisos, hosting, auditoría, integración, soporte, DPO y continuidad. | Diseño institucional gobernado. | Pendiente; el papel de Salud Digital/STIC no está acordado. |
| **8. Hub agnóstico configurable V5** | Configurar organización, servicio, programa, patología, journey, visita, formularios, scores y PROMs. | Framework portable sin exponer complejidad técnica al clínico. | Exploratorio y no aprobado. |

Ninguna fase posterior autoriza por sí sola el uso de datos reales. [E2][E3][E6]

## Control plane federado y configuración no-paciente

> **Estado:** propuesta arquitectónica derivada del análisis post-SES reflejado en la rama HOLD `origin/docs/promueve-fh-control-plane-federado-20260713`. **No es arquitectura aprobada ni capacidad implementada.** Solo introduce una distinción conceptual para futuras decisiones.

El roadmap post-SES distingue dos planos que evolucionarán de forma desacoplada:

| Plano | Contenido | Ejemplos |
|---|---|---|
| **Plano de datos clínicos / data plane** | Información vinculada a pacientes, tratamientos, visitas, validaciones, formularios respondidos y resultados. | Pacientes, visitas, tratamientos, validaciones FH, seguimientos, respuestas de formularios, resultados de cohortes. |
| **Plano de control / control plane** | Configuración, metadatos y preferencias del servicio que no son datos clínicos individuales. | Filtros guardados, formularios declarativos, catálogos locales, profesionales, roles, permisos, plantillas de exportación, widgets de dashboard, configuración por área. |

### Reglas de separación

- **Los datos clínicos de paciente, respuestas de formularios, tratamientos, visitas, validaciones, seguimientos y resultados de cohortes no deben almacenarse en el control plane** sin backend autorizado y marco institucional explícito.
- **Los filtros guardados almacenan criterios, no resultados.** Ejecutar un filtro implica aplicar los criterios sobre el backend clínico autorizado; el resultado no se persiste en el plano de configuración.
- **Los formularios declarativos versionados definen estructura, campos, validaciones y mapeos a variables, pero no contienen respuestas de pacientes.**
- **Los campos explotables de un formulario deben mapearse a una variable del diccionario de variables** o quedar explícitamente marcados como texto libre/no explotable.

### Modelo de despliegue propuesto

Hasta que exista gobernanza corporativa explícita (SES / Salud Digital / STIC) que resuelva titularidad, permisos, auditoría y soporte, se prefiere un modelo **federado por área sanitaria**:

```text
Código común
+ esquema común
+ diccionario común
+ paquetes de configuración interoperables
+ bases / backends separados por área sanitaria
```

- Cada área puede desplegar su propia instancia con su backend autorizado.
- La configuración común se comparte mediante **paquetes exportables/importables** (filtros, formularios, widgets, plantillas, variables), no necesariamente mediante una base central multi-tenant única.
- Una **base multi-tenant central** solo es futura y condicional: requiere que Salud Digital/STIC asuma la gobernanza, el soporte y las responsabilidades legales/operativas.

### Elementos propuestos para el control plane

- Filtros poblacionales guardados (criterios, no resultados).
- Catálogos farmacológicos locales (ensayos clínicos, uso compasivo, medicación extranjera, protocolos locales) junto al catálogo CIMA/global.
- Profesionales, roles y permisos funcionales.
- Formularios declarativos versionados con estados (borrador, validado localmente, publicado, archivado).
- Diccionario de variables compartido.
- Plantillas de exportación.
- Widgets de dashboard declarativos.

### Dashboard

- **Dashboard basal común:** resumen del paciente, tratamientos activos, línea temporal, últimas visitas, formularios completados, pendientes, alertas, exportaciones y observaciones. No depende de una patología concreta.
- **Dashboard específico configurable:** widgets declarativos vinculados a variables del diccionario. El sistema no inventa significado clínico; solo representa variables, reglas o widgets definidos y validados.

### Relación con otros conceptos del roadmap

Esta propuesta es coherente con los principios ya establecidos:

- **Backend intercambiable:** el dominio no debe depender de Excel, SharePoint, PostgreSQL, Supabase, Neon, Firebase, AWS, Azure, OCI o una API concreta. Se mantiene la repository layer como abstracción.
- **Diccionario de variables:** conecta nombres clínicos, columnas Excel, formularios, repositorios y futuros contratos de API.
- **Formularios declarativos:** las variaciones funcionales repetibles deben expresarse configurando, no reescribiendo código.
- **Catálogo CIMA/local:** el catálogo asiste selección y normalización, pero no decide datos terapéuticos.
- **No inferencia:** nunca se deben inferir dosis, vía, pauta, presentación, inducción ni intervalo de administración a partir del nombre del fármaco o del catálogo.
- **Futuro backend:** la transición a backend real requiere modelo validado, soporte institucional y plan de datos aprobado.

[E7]

## PROM Capture Gateway seudonimizado y tarjetas QR

> **Estado:** propuesta exploratoria avanzada. No implementada. No autoriza datos reales, producción ni integración institucional.

Se propone una capa específica de captura PROM/PREM para evitar la dispersión de Microsoft Forms y Excels. El módulo permitiría recoger cuestionarios cerrados mediante tarjeta PROM permanente, QR universal y tokens temporales de visita, manteniendo la identidad clínica en entorno local/hospitalario.

### Decisión conceptual

- El QR no representa una patología ni un cuestionario concreto.
- El QR representa una tarjeta PROM universal.
- Las tarjetas nacen preimpresas y no asignadas.
- La asignación ocurre desde el Hub profesional con el paciente abierto.
- El profesional puede teclear un código corto visible; no se requiere móvil personal, NFC ni escáner.
- El backend PROM almacena `hub_patient_key`, tarjeta, cuestionario y respuestas cerradas.
- La relación `CIP <-> hub_patient_key` permanece fuera del backend PROM cloud.
- La longitudinalidad depende de `hub_patient_key`, no de la tarjeta física.
- Las respuestas PROM/PREM son datos de salud seudonimizados, no datos anónimos.

### Modelos de despliegue

| Modelo | Uso | Estado |
|---|---|---|
| Supabase cloud | Laboratorio o MVP exploratorio con datos sintéticos o escenario explícitamente validado | Exploratorio |
| Mini servidor local | Laboratorio técnico o piloto local controlado | Exploratorio |
| Backend institucional | Uso real con gobierno SES/STIC, identidad, permisos, auditoría, soporte y DPO | Pendiente |

El documento canónico [`docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](/docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md) define flujos de asignación, respuesta, revocación/reemisión, token temporal de visita y una `PromRepository` intercambiable. No es una especificación de seguridad ni un contrato clínico final; los tokens y códigos mostrados son ejemplos conceptuales.

### Límites

Este módulo no sustituye la historia clínica, no implica una app de paciente y no autoriza uso con datos reales. El portal paciente no debe permitir lectura de histórico ni mostrar datos identificativos. Cualquier endpoint público de capacidad limitada procesaría datos de salud seudonimizados y requeriría validación institucional, STIC/DPO, seguridad y auditoría.

## Identity Plane local y Nursing Readiness Gateway

> **Estado:** propuesta exploratoria avanzada. No implementada. No autoriza datos reales, producción ni despliegue institucional.

Se propone extender el patrón del PROM Capture Gateway hacia una arquitectura por capas: un Identity Plane local/hospitalario para la correspondencia `CIP <-> hub_patient_key`, un Clinical Event Plane seudonimizado para PROMs y eventos clínico-operativos estructurados, y un Control Plane para configuración, profesionales, roles y permisos.

La primera aplicación concreta sería el Nursing Readiness Gateway, destinado a registrar de forma estructurada el estado prebiológico de Enfermería antes de la validación o citación por Farmacia. La recomposición entre identidad y eventos ocurre únicamente en el Hub profesional.

La fase transitoria puede evaluar SharePoint hospitalario para la correspondencia y Supabase para eventos seudonimizados, siempre con RLS o controles equivalentes, permisos mínimos, sin texto libre, sin identificadores directos y sin autorización implícita de datos reales. La evolución propuesta es probar un mini PC o servidor local como custodio inicial de la correspondencia de seudonimización.

El documento canónico [`docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md`](/docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md) detalla altas técnicas, riesgos de duplicado, eventos huérfanos, roles por tenant, bloqueos y una petición operativa orientativa a informática. No es una implementación ni un contrato clínico final.

## 8. Estrategia Excel a backend

Excel es un **backend provisional** y una capa de aprendizaje: permite observar qué registra el equipo, qué corrige manualmente y qué necesita consultar. Su valor no elimina riesgos de edición manual, columnas desplazadas, formatos inconsistentes, concurrencia, pérdida de trazabilidad o roturas silenciosas.

La transición propuesta es incremental:

1. Validar hojas y columnas obligatorias al cargar.
2. Incorporar `schemaVersion` en cada plantilla y exportación estructurada.
3. Mantener un diccionario de variables trazable con los nombres físicos de Excel.
4. Generar salidas estructuradas junto a las salidas documentales para JARA.
5. Introducir una repository layer que concentre lectura y escritura.
6. Registrar errores de validación sin corregir o inferir datos clínicos automáticamente.
7. Migrar repositorios a base de datos cuando exista modelo validado, soporte institucional y plan de datos.

La migración no debe copiar ciegamente el formato ancho: debe conservar trazabilidad desde la celda/columna original hasta la entidad destino. [E1][E2][E4]

## 9. Objetivo de la repository layer

La repository layer debe aislar casos de uso y reglas de presentación respecto del soporte físico. Se propone la siguiente interfaz conceptual:

| Repositorio | Responsabilidad |
|---|---|
| `PatientRepository` | Identidad operativa y localización del paciente. |
| `VisitRepository` | Visitas y actos longitudinales. |
| `TreatmentRepository` | Líneas, estados y movimientos terapéuticos. |
| `PharmacyValidationRepository` | Solicitudes y validaciones FH. |
| `NursingRepository` | Solicitudes, seguimientos y eventos de Enfermería. |
| `PromRepository` | PROMs con fecha, instrumento, valor y procedencia. |
| `CatalogRepository` | Catálogo oficial/local, alias y snapshots de selección. |
| `AuditRepository` | Trazas técnicas y de cambios cuando el contexto lo permita. |

Implementaciones previstas, intercambiables y no aprobadas por esta propuesta:

- `ExcelRepository`: adaptador de la persistencia provisional.
- `SharePointRepository`: adaptador condicional a disponibilidad institucional.
- `PostgresRepository`: candidato para laboratorio/backend futuro.
- `ApiRepository`: cliente de una API institucional o de laboratorio.

La interfaz no debe ocultar errores de esquema ni convertir ausencias en datos clínicos inferidos. [E2][E4]

## 10. Diccionario de variables

El diccionario mínimo debe contener todos los campos siguientes:

| Campo | Finalidad |
|---|---|
| `variable_id` | Identificador estable independiente de UI y Excel. |
| `label_clinico` | Denominación comprensible para uso y revisión funcional. |
| `servicio` | Servicio asistencial responsable o consumidor. |
| `patologia` | Ámbito clínico cuando proceda. |
| `rol` | Perfil que captura, revisa o utiliza la variable. |
| `tipo_visita` | Contexto de visita o acto en el que se registra. |
| `seccion_formulario` | Sección declarativa de captura o visualización. |
| `tipo_dato` | Texto, número, fecha, booleano, código o lista controlada. |
| `unidad` | Unidad explícita cuando aplique. |
| `rango` | Restricción documentada, nunca inferida por el importador. |
| `obligatoriedad` | Condición de obligatoriedad validada. |
| `fuente` | Sistema, módulo o profesional de origen. |
| `destino` | Persistencia, salida documental, dashboard o integración. |
| `mapeo_excel` | Hoja, columna o regla física de importación/exportación Excel. |
| `mapeo_jara_texto` | Representación prevista en la salida documental para JARA. |
| `mapeo_fhir_opcional` | Candidato futuro de recurso o elemento FHIR; no implica implementación. |
| `mapeo_snomed_loinc_opcional` | Candidato terminológico sujeto a validación especializada. |
| `estado` | Estado de definición, validación, deprecación o uso. |
| `version` | Versión del metadato para trazabilidad y compatibilidad. |

El diccionario conecta nombres clínicos, columnas, repositorios y futuros contratos de API. Reduce dependencia de conocimiento tácito y permite analizar impactos antes de cambiar una variable. Los mapeos terminológicos requieren validación especializada. [E2][E4]

## 11. Modelo de datos objetivo

El modelo objetivo es **conceptual**. No constituye implementación, esquema SQL, contrato clínico final ni autorización para migrar datos.

| Entidad conceptual | Responsabilidad |
|---|---|
| `PATIENTS` | Identidad común y referencias operativas del paciente. |
| `VISITS` | Visitas y actos asistenciales fechados. |
| `SERVICES` | Servicios clínicos y asistenciales configurables. |
| `PATHOLOGIES` | Patologías o condiciones configuradas. |
| `JOURNEYS` | Recorridos asistenciales y sus etapas. |
| `FORM_SECTIONS` | Secciones declarativas de formularios. |
| `FORM_FIELDS` | Campos configurables, reglas de captura y metadatos. |
| `OBSERVATIONS` | Observaciones clínicas estructuradas y contextualizadas. |
| `SCORES` | Índices calculados con instrumento, fecha y contexto. |
| `PROMS` | Resultados comunicados por pacientes. |
| `PREMS` | Medidas de experiencia comunicadas por pacientes. |
| `TREATMENTS` | Líneas terapéuticas, estados, movimientos y snapshots. |
| `PHARMACY_VALIDATIONS` | Solicitudes, revisiones y resultados de validación FH. |
| `NURSING_INTERVENTIONS` | Intervenciones y seguimientos propios de Enfermería. |
| `LAB_CHECKS` | Comprobaciones analíticas y prebiológicas trazables. |
| `VACCINATION_STATUS` | Estado vacunal con fuente y fecha. |
| `DRUG_CATALOG` | Catálogo farmacológico oficial regenerable. |
| `LOCAL_DRUG_CATALOG` | Extensiones y medicamentos especiales de gestión local. |
| `PROFESSIONALS` | Profesionales, roles y referencias organizativas. |
| `AUDIT_LOG` | Trazas de creación, modificación, importación y exportación. |
| `CONFIG_MODULES` | Configuración de módulos, servicios, patologías y journeys. |
| `CONFIG_EXPORTS` | Configuración de salidas documentales y estructuradas. |

Las cardinalidades, campos obligatorios, reglas clínicas, retención y responsabilidades legales permanecen pendientes de contratos validados. [E2][E3][E4]

## 12. Catálogo farmacológico

La fuente oficial regenerable propuesta es CIMA/AEMPS, con versión, fecha, checksum y validación de integridad. Debe coexistir con un catálogo local especial para medicamentos extranjeros, uso compasivo, ensayo, fuera de ficha técnica, preparación especial o pendientes de normalización.

El diseño debe contemplar:

- alias de búsqueda sin cambiar el identificador estable;
- favoritos de circuito como preferencia de acceso, no como verdad clínica;
- snapshots de tratamiento que conserven qué registro se seleccionó y con qué versión del catálogo;
- trazabilidad de selección por nombre comercial, principio activo, código nacional, `nregistro` y origen;
- actualización revisable, sin sobrescribir el catálogo local especial;
- catálogo compartido por módulos mediante `CatalogRepository`.

**Regla absoluta:** el catálogo asiste la selección y normalización, pero no infiere ni decide dosis, vía, pauta, presentación o inducción. Si esos datos no están confirmados, permanecen vacíos o pendientes. La autoactualización CIMA documentada sigue siendo exploratoria, no una automatización activa aprobada. [E4]

## 13. Interoperabilidad futura

JARA debe seguir siendo el registro clínico/legal institucional mientras no exista decisión distinta de la organización. El TXT copiado al portapapeles es una salida provisional para facilitar documentación; no es integración, escritura automática ni sustitución de JARA.

En paralelo, cada acto debe poder generar datos estructurados para Excel y, en el futuro, repositorios o APIs. El modelo debe ser **FHIR-ready**, pero FHIR no está implementado. Podrán evaluarse mapeos a FHIR y terminologías SNOMED CT, LOINC o ATC, siempre como candidatos revisados por especialistas y no como equivalencias automáticas.

La interoperabilidad real requiere la participación de Salud Digital/STIC para resolver identidad, autorización, endpoints, seguridad, auditoría, catálogo corporativo, responsabilidades y soporte. Esa participación está pendiente. [E2][E3][E6]

## 14. Programa de formación para Silvia

El objetivo no es formar a Silvia como desarrolladora full-stack. Es desarrollar **alfabetización de decisión y auditoría**: comprender riesgos, pedir evidencia, validar límites y decidir cuándo avanzar o parar.

| Bloque | Competencia de decisión/auditoría | Evidencia de salida |
|---|---|---|
| **Bloque 1 — Git/GitHub y gobernanza de ramas** | Entender ramas, commits, tags, PR, backups y protecciones. | Puede verificar una referencia reproducible y detectar una operación no autorizada. |
| **Bloque 2 — HTML/CSS/JS para auditoría funcional** | Leer estructura, estilos y comportamiento sin exigir dominio de desarrollo. | Puede localizar qué capa cambia una interacción visible. |
| **Bloque 3 — Arquitectura frontend simple** | Distinguir presentación, lógica, datos, dependencias y estado de sesión. | Puede detectar acoplamiento o duplicación entre pantalla y dominio. |
| **Bloque 4 — Modelo de datos relacional** | Comprender entidades, relaciones, claves y normalización. | Puede revisar si un modelo conserva histórico y trazabilidad. |
| **Bloque 5 — SQL/PostgreSQL** | Entender tablas, consultas, restricciones y migraciones a nivel decisional. | Puede auditar una propuesta PostgreSQL sin elegirla por inercia. |
| **Bloque 6 — APIs REST** | Comprender recursos, operaciones, errores, identidad y versionado. | Puede revisar el contrato y los límites de una integración. |
| **Bloque 7 — JSON / JSON Schema** | Distinguir ejemplo JSON, contrato validable y compatibilidad de esquema. | Puede exigir validación y versión antes de intercambiar datos. |
| **Bloque 8 — Formularios declarativos** | Comprender configuración de secciones, campos, reglas y visibilidad. | Puede evaluar si una nueva patología requiere configuración o reescritura. |
| **Bloque 9 — Testing y QA clínica** | Diferenciar test técnico, QA visual y validación clínica. | Puede exigir evidencia proporcional y reconocer lo que un test no demuestra. |
| **Bloque 10 — Seguridad, RGPD, ENS** | Reconocer límites de datos, perfiles, autenticación, autorización y cumplimiento. | Detiene promesas o usos no validados y sabe cuándo escalar. |
| **Bloque 11 — FHIR básico aplicado** | Comprender recursos y mapeos candidatos sin afirmar interoperabilidad implementada. | Puede revisar una propuesta FHIR-ready y pedir validación especializada. |
| **Bloque 12 — Cloud/backend institucional** | Evaluar hosting, soporte, continuidad, auditoría y papel de STIC. | Puede comparar opciones y separar laboratorio, piloto y producción. |

Este programa amplía el protocolo por fases existente y debe impartirse sobre decisiones reales del Hub, no mediante ejercicios genéricos de programación. [E3]

## 15. Decisiones cerradas

Las decisiones siguientes están cerradas **en el texto fuente**; su cumplimiento material puede seguir pendiente.

| Decisión | Resumen | Materialización |
|---|---|---|
| DEC-001 | Reuma v2 es la base funcional real; `main` es legacy. | Parcial: ramas aún no consolidadas. |
| DEC-002 | No eliminar `main` sin trazabilidad. | **Pendiente:** los tags propuestos no existen. |
| DEC-003 | Mantener MVP local-first para el hito inmediato. | Aplicado al enfoque actual. |
| DEC-004 | Perfiles funcionales no equivalen a seguridad real. | Aplicado en demo; seguridad real pendiente. |
| DEC-005 | Una app común con módulos. | Vigente. |
| DEC-006 | Lectura cruzada y escritura separada por rol. | Vigente como principio. |
| DEC-007 | Enfermería tiene fuente propia e integra eventos. | Materialización parcial; diseño final pendiente. |
| DEC-008 | Farmacia tiene fuente propia. | Materializada en demo/Excel provisional. |
| DEC-009 | SharePoint Lists no es backend del MVP. | Vigente; cualquier reconsideración requiere revisión. |
| DEC-010 | OCI como entorno candidato; PostgreSQL preferido y MySQL alternativo. | No implementado; Oracle Database no decidido. |
| DEC-011 | No normalizar ahora el Excel Reuma de 497 columnas. | Vigente. |
| DEC-012 | FHIR/HL7 es horizonte, no requisito MVP. | FHIR no implementado. |
| DEC-013 | No imponer Vite como fase intermedia. | Vigente. |
| DEC-014 | Arquitectura futura recomendada con frontend, API y BD real. | Recomendación no implementada y revisable con STIC. |
| DEC-015 | Sistema modular en modos independiente, conectado y ecosistema. | Vigente como dirección. |
| DEC-016 | Ampliar la demo sintética existente. | Materializado en varias líneas demo. |
| DEC-017 | Vista longitudinal multiarchivo por CIP. | Parcialmente materializada. |
| DEC-018 | Capa temporal multipatología para entrada Farmacia. | Materializada en demo; no integración real. |
| DEC-019 | Congelar Farmacia v0.1 como hito de demo. | Materializada históricamente; la preview evolucionó después. |

[E2][E6]

## 16. Decisiones pendientes

| Tema pendiente | Pregunta que debe cerrarse | Responsable/dependencia |
|---|---|---|
| Nomenclatura | ¿Se validan framework, piloto y nombres de módulos para comunicación externa? | Sil/Cora; contexto institucional. |
| Fases V3/V4/V4.5/V5 | ¿Se adopta este marco y cómo se mapea con v1/v2/v2.1/v2.2/v3/v4 y Farmacia v0.x? | Sil/Cora. |
| Tags DEC-002 | ¿Se crean ahora los tags legacy/v2 propuestos o se redefine la trazabilidad? | Sil/Cora; WO específica. |
| Merge canónico | ¿La línea Farmacia preview se integra en `feature/reuma-v2...` o permanece separada? | Auditoría de merge y validación humana. |
| Relación entre líneas | ¿Qué partes de Reuma, Enfermería y Farmacia son núcleo común, módulo o adaptador temporal? | Diseño funcional y arquitectura. |
| Contratos funcionales | ¿Qué campos, eventos, alertas, dashboards y responsabilidades quedan validados por perfil? | Canvas y equipo clínico. |
| Backend | ¿Cuándo se justifica pasar de Excel y quién desarrolla, opera y mantiene el backend? | Sil/Cora + institución. |
| Microsoft/SharePoint | ¿Existe una vía permitida sin contradecir DEC-009 y con soporte de tenant? | Salud Digital/STIC. |
| Laboratorio | ¿Se evalúa PostgreSQL en OCI, Supabase u otra opción solo con datos sintéticos? | Decisión técnica gobernada; no aprobada. |
| Integración corporativa | ¿Qué papel asumen Salud Digital/STIC en identidad, hosting, seguridad, interoperabilidad y soporte? | Pendiente institucional. |
| Local frente a corporativo | ¿Qué alcance conserva el piloto local y qué condiciones activan el camino corporativo? | Sil/Cora + Salud Digital/STIC. |
| JARA y datos estructurados | ¿Qué salida documental y qué integración futura son aceptables? | SES/Salud Digital/STIC. |

[E3][E4][E6]

## 17. Documentos actuales, obsoletos y a archivar

Esta clasificación procede de la auditoría. **No se ha movido, renombrado ni archivado ningún documento.**

### 17.1 Mantener como actuales o históricos vigentes

| Documento/grupo | Disposición propuesta |
|---|---|
| `AGENTS.md` | Mantener como fuente operativa. |
| `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md` | Mantener como registro histórico DEC-001..019. |
| `docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md` | Mantener para Reuma y actualizar su relación con Farmacia preview. |
| `CHANGELOG.md` raíz | Mantener como changelog principal orientado a releases técnicas. |
| `docs/CONTRATO_DATOS_REUMA_V2.md` | Mantener como contrato Reuma vigente. |
| `docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md` | Mantener como protocolo de decisión y aprendizaje. |
| `docs/farmacia_branch_manifest_20260614.md` | Mantener como log operativo, no como roadmap ejecutivo. |
| Contratos Farmacia WO6-WO8 | Mantener como referencias de la preview, sujetos a revisión de estado y alcance. |
| Documentos `FARMACIA_V0_3*` a `V0_5*` | Mantener como historia evolutiva/exploratoria; no confundir con releases institucionales. |
| Auditorías visuales en `docs/ops/audits/` | Mantener como evidencia histórica. |

### 17.2 Actualizar tras validar este roadmap

| Documento | Motivo |
|---|---|
| `README.md` | Nomenclatura y estado Farmacia desactualizados. |
| `ARCHITECTURE.md` | Farmacia ya no es solo diseño no implementado. |
| `docs/INDEX.md` | No cubre toda la línea Farmacia v0.3-v0.5/post-demo. |
| `docs/ops/WORK_ORDER_STATUS.md` | No registra WO5-WO8, PR #8 ni estado post-SES. |
| `docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md` | Revisar alineación con el modelo operativo v2 si se confirma. |

### 17.3 Archivo ejecutado

Los tres candidatos claros se archivaron en `WO-DOC-ARCHIVE-POST-SES-01`.

| Documento | Clasificación de auditoría | Destino real |
|---|---|---|
| `docs/ESTADO_IMPLEMENTACION.md` | Obsoleto, 2026-03-07. | `docs/archive/ESTADO_IMPLEMENTACION_20260307.md` ✅ |
| `docs/CHANGELOG.md` | Duplicado y obsoleto frente al changelog raíz. | `docs/archive/CHANGELOG_20260307.md` ✅ |
| `docs/CONTRATO_DATOS_UNIFICADO.md` | Legacy, reemplazado para Reuma por el contrato v2. | `docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md` ✅ |
| `docs/ops/FARMACIA_DEMO_FREEZE_20260606.md` | Histórico ya cubierto por el manifiesto; archivo opcional/pendiente. | Se mantiene en su ubicación original a decisión de Sil/Cora. |

[E5][E6]

## 18. Reglas de desarrollo después del roadmap

1. No desarrollar ni mergear directamente sobre `main`.
2. La rama `preview/demo-lunes-wo4-20260614` se usa solo para correcciones de bug o necesidades explícitas de demo mediante WO autorizada.
3. Antes de mover una rama de demo, crear y verificar un punto de backup/retorno.
4. Cada WO debe ser atómica, revisable, con alcance, archivos permitidos y criterio de salida.
5. Los cambios multiarchivo o con dependencias de secuencia requieren PM y plan de integración.
6. No mezclar en una misma WO refactor, estética y cambio de comportamiento clínico.
7. No introducir dependencias, backend, contratos clínicos definitivos o integraciones sin autorización correspondiente.
8. No usar datos reales de pacientes, identificadores reales, exports clínicos reales, secretos o credenciales.
9. Toda modificación funcional debe actualizar la documentación afectada y aportar QA proporcional: sintaxis, checks automatizados y, cuando corresponda, validación visual/E2E.
10. No inferir datos terapéuticos ni convertir normalización técnica en decisión clínica.
11. La promoción entre líneas o ramas requiere evidencia, revisión humana y una WO específica; nunca consolidación accidental.

[E1][E4][E6]

## 19. Work orders recomendadas siguientes

| Orden | Identificador | Objetivo | Dependencias | Criterio de salida |
|---:|---|---|---|---|
| 1 | `WO-DOC-ARCHIVE-POST-SES-01` | Mover los candidatos obsoletos a archivo y corregir sus referencias. | Validación humana de la clasificación de la sección 17. | Solo los documentos aprobados se mueven; no quedan enlaces canónicos rotos. |
| 2 | `WO-DOC-UPDATE-ARCHITECTURE-POST-SES-01` | Alinear `ARCHITECTURE.md` con el estado real de Farmacia y la vía dual local/corporativa. | Roadmap validado y nomenclatura decidida o marcada provisional. | Arquitectura distingue implementado, propuesto, exploratorio y pendiente sin afirmar aprobaciones. |
| 3 | `WO-DOC-UPDATE-INDEX-WORKORDERSTATUS-01` | Actualizar índice y tablero operativo con la línea post-demo/post-SES. | Archivo y arquitectura documental resueltos. | Índice y estados apuntan a fuentes vigentes y registran la preview en `7486243`. |
| 4 | `WO-AUDIT-MERGE-FARMACIA-PREVIEW-TO-CANONICAL-01` | Auditar si y cómo Farmacia preview puede incorporarse a la base canónica. | Documentación alineada; ramas y backups verificados. | Informe de diferencias, riesgos, orden de integración y decisión humana; sin merge automático. |
| 5 | `WO-DATA-DICTIONARY-FH-MINIMAL-01` | Crear un diccionario mínimo FH trazable a formularios, Excel y contratos existentes. | Diseño funcional revisado; no inferencia clínica. | Cada variable incluida tiene los 19 metadatos de la sección 10 y validación Sil/Cora. |
| 6 | `WO-REPOSITORY-LAYER-DESIGN-01` | Diseñar interfaces, errores y límites de la capa de repositorios sin implementarla. | Diccionario mínimo y flujos de lectura/escritura confirmados. | Especificación revisada para los ocho repositorios y cuatro adaptadores, sin elegir backend definitivo. |
| 7 | `WO-EXCEL-SCHEMAVERSION-FARMACIA-01` | Definir e incorporar versionado y validación compatible de plantillas Farmacia. | Diccionario mínimo y diseño de repository layer. | `schemaVersion`, columnas obligatorias, errores y política de compatibilidad documentados y probados con datos sintéticos. |
| 8 | `WO-QA-E2E-FARMACIA-POST-SES-01` | Verificar de extremo a extremo importación, validación, visitas, seguimiento, dashboard y exportaciones. | Preview estable y contratos/versionado identificados. | Matriz E2E ejecutada en Pages y local, consola limpia, resultados trazables y hallazgos clasificados. |

La ejecución de esta secuencia no autoriza por sí misma integración corporativa, backend, datos reales ni producción. [E3][E4][E6]
