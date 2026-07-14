# PROM Capture Gateway seudonimizado con QR permanente

| Metadato | Valor |
|---|---|
| Estado | Propuesta exploratoria avanzada |
| Fecha | 2026-07-14 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama base | `preview/demo-lunes-wo4-20260614` |
| Tipo | Documento de arquitectura funcional/técnica |
| Alcance | Captura PROM/PREM seudonimizada, QR permanente, token temporal y backend intercambiable |
| Datos reales | No autorizados por este documento |
| Implementación | No implementada en esta WO |

> Este documento registra una propuesta exploratoria. No autoriza despliegue productivo, uso con datos reales ni integración institucional. Cualquier uso real requiere validación de seguridad, STIC/DPO, gobernanza, soporte y responsabilidades definidas.

## 1. Resumen ejecutivo

Se propone sustituir la dispersión de Microsoft Forms y Excels por un módulo único de captura PROM/PREM, controlado por el Hub, basado en:

- tarjetas PROM permanentes preimpresas;
- un QR universal de paciente;
- un código corto visible para asignación manual por el profesional;
- tokens temporales de visita;
- respuestas cerradas y sin texto libre en el MVP;
- separación entre identidad clínica local y backend PROM;
- backend intercambiable: Supabase, API local/PostgreSQL o futuro backend institucional.

El objetivo es permitir seguimiento longitudinal y captura en tiempo casi real sin crear una app de paciente ni exigir login de paciente.

## 2. Problema que resuelve

El uso de múltiples Microsoft Forms y Excels por patología o cuestionario provoca fragmentación, recargas manuales, pérdida de tiempo real, riesgo de errores y dificultad para explotar longitudinalmente los datos. El Gateway propone un motor único con plantillas versionadas, respuestas homogéneas y lectura controlada desde el Hub profesional.

## 3. Terminología

| Término | Definición |
|---|---|
| PROM/PREM | Cuestionarios reportados por paciente o experiencia del paciente. |
| Tarjeta PROM | Credencial física preimpresa con QR y código corto visible. |
| QR permanente | QR estable que puede usarse desde casa o el hospital. |
| Código corto visible | Código fácil de teclear por el profesional para asignar una tarjeta. |
| `hub_patient_key` | Identificador técnico estable del paciente dentro del Hub, distinto del CIP. |
| `prom_card_token` | Token aleatorio incluido en el QR. |
| Token temporal de visita | Acceso de un solo uso y corta duración generado desde el Hub profesional. |

## 4. Principios y decisiones

1. No se debe hablar de anonimización como característica del sistema. Las respuestas PROM/PREM son datos de salud seudonimizados y minimizados.
2. El backend PROM no debe recibir CIP, nombre, DNI, teléfono, email, fecha de nacimiento ni texto libre identificativo.
3. La relación `CIP <-> hub_patient_key` permanece en el entorno local/hospitalario.
4. `hub_patient_key` es la bisagra entre el paciente identificado localmente y sus respuestas PROM/PREM.
5. El QR no representa una patología ni un cuestionario concreto.
6. No se imprimen QR por patología, EQ-5D, BASDAI, DLQI, HAQ u otro instrumento.
7. Un mismo QR permanente puede servir cuestionarios distintos a lo largo del tiempo.
8. El sistema decide dinámicamente qué cuestionarios mostrar según paciente técnico, circuito, plan, fecha, visita y rol/procedencia.
9. La longitudinalidad depende de `hub_patient_key`, no de la tarjeta física.
10. El portal paciente permite responder, pero no leer histórico ni consultar datos identificativos.
11. El diseño debe ser backend-intercambiable.
12. No se introduce un Excel intermedio para las respuestas PROM/PREM.

## 5. Separación de identidad

### Entorno local/hospitalario/Hub identificado

Puede conocer:

```text
CIP
nombre, si procede
servicio
patología
hub_patient_key
```

La relación sensible es:

```text
CIP <-> hub_patient_key
```

Debe permanecer bajo custodia local/hospitalaria.

### Backend PROM

Puede conocer:

```text
hub_patient_key
prom_card_id
prom_card_token
card_short_code
questionnaire_id
questionnaire_version
responses
```

No debe conocer identificadores directos ni datos clínicos textuales que permitan identificar al paciente.

La seudonimización no elimina el carácter sanitario de las respuestas ni los requisitos de gobernanza, seguridad y validación institucional.

## 6. Decisión sobre el identificador técnico

No se añade un `pseudo_id` opaco generado por Supabase si no existe un mecanismo determinista o una tabla local que lo vincule. La clave estable será:

```text
hub_patient_key
```

La generación, custodia, rotación y política de acceso de esa clave deberán definirse antes de cualquier uso real.

## 7. Tarjetas PROM universales

Las tarjetas nacen como stock preimpreso no asignado:

```text
available
```

La tarjeta debe incluir:

- QR grande para el paciente;
- código corto visible para el profesional;
- instrucciones mínimas;
- ninguna identidad directa;
- ninguna patología, tratamiento o servicio innecesario.

Ejemplo conceptual, no especificación de seguridad:

```text
PROMueve
Cuestionarios de seguimiento

[ QR grande ]

Conserve esta tarjeta.
No la comparta.

Tarjeta PROM: PROM-0382-R
```

El `card_short_code` es un identificador de stock para un profesional autenticado; no es una credencial suficiente por sí mismo. Los formatos, longitudes, entropía, almacenamiento, rate limiting y expiración de tokens requieren diseño de seguridad específico.

## 8. Flujo de asignación de tarjeta permanente

1. El profesional abre el paciente correcto en el Hub.
2. Pulsa `Asignar tarjeta PROM`.
3. Coge una tarjeta disponible.
4. Teclea el código corto visible.
5. El sistema comprueba que la tarjeta está en estado `available`.
6. El sistema muestra paciente contextualizado y tarjeta detectada.
7. El profesional confirma la asignación.
8. Se registra `hub_patient_key <-> prom_card_id`.
9. La tarjeta pasa a `assigned`.
10. Se entrega la tarjeta al paciente.

El profesional no necesita móvil personal, cámara, NFC ni escáner.

## 9. Flujo de respuesta del paciente

1. El paciente escanea el QR.
2. El portal PROM recibe el `prom_card_token`.
3. El sistema comprueba que la tarjeta está asignada y activa.
4. Recupera el `hub_patient_key` asociado.
5. Consulta cuestionarios pendientes o habilitados.
6. El paciente responde únicamente preguntas cerradas.
7. Se guardan las respuestas asociadas al `hub_patient_key`.
8. El Hub profesional puede consultarlas según su autorización.

El portal público de paciente no debe mostrar histórico, CIP, nombre, diagnóstico, tratamiento, listados de pacientes ni acceso al Hub profesional.

Un endpoint público de capacidad limitada, si se evalúa, procesaría datos de salud seudonimizados y no eliminaría los requisitos de autenticación profesional, protección de datos, seguridad, auditoría, STIC/DPO ni aprobación institucional.

## 10. QR temporal de visita

El QR temporal cubre situaciones como tarjeta olvidada, sala de espera, Hospital de Día, Farmacia o una respuesta puntual antes de emitir tarjeta permanente.

Flujo:

1. El profesional abre el paciente correcto en el Hub.
2. Pulsa `Generar QR temporal de visita`.
3. El Hub genera un `visit_token` vinculado a `hub_patient_key`.
4. El QR se muestra en pantalla.
5. El paciente responde desde móvil o tablet asistencial.
6. El token queda usado o caduca.

Características previstas:

- un solo uso;
- caducidad corta, por ejemplo 30-60 minutos;
- scope limitado a la visita o cuestionarios definidos;
- generación únicamente desde Hub profesional;
- sin lectura de histórico;
- no sustituye a la tarjeta permanente.

Los valores y formatos indicados son decisiones conceptuales, no especificaciones criptográficas.

## 11. Pérdida, revocación y reemisión

Estados conceptuales de tarjeta:

```text
available
assigned
lost
revoked
expired
```

Ante una pérdida:

1. El profesional abre el paciente.
2. Marca la tarjeta anterior como `lost` o `revoked`.
3. Coge una tarjeta disponible.
4. Teclea el nuevo código corto.
5. Asigna la nueva tarjeta al mismo `hub_patient_key`.
6. La longitudinalidad se conserva.

Una tarjeta perdida o revocada no debe aceptar nuevas respuestas. Una tarjeta con respuestas no debe reasignarse libremente a otro paciente; cualquier excepción requiere rol autorizado, auditoría y procedimiento explícito.

## 12. Modelo conceptual de datos

### `prom_cards`

```text
id
tenant_id
card_short_code
prom_card_token
status
created_at
assigned_at
revoked_at
lost_at
```

### `prom_card_assignments`

```text
id
tenant_id
prom_card_id
hub_patient_key
assigned_by
assigned_at
active
ended_at
end_reason
```

### `prom_questionnaires`

```text
id
name
instrument_type
version
schema_json
scoring_json
active
```

### `prom_questionnaire_plan`

```text
id
tenant_id
hub_patient_key
questionnaire_id
status
available_from
available_until
reason
visit_context
```

### `prom_responses`

```text
id
tenant_id
hub_patient_key
questionnaire_id
questionnaire_version
submitted_at
source
answers_json
score_json
```

### `prom_visit_tokens`

```text
id
tenant_id
hub_patient_key
token
status
scope_json
created_by
created_at
expires_at
used_at
```

### `audit_log`

```text
id
tenant_id
actor
action
entity_type
entity_id
created_at
metadata_json
```

Este modelo es conceptual; no constituye migración, esquema SQL ni contrato clínico final.

## 13. Backends intercambiables

### MVP cloud exploratorio

```text
Frontend: GitHub Pages / Netlify / Vercel / equivalente estático
Backend PROM: Supabase
Datos: sintéticos o escenario transitorio explícitamente validado
```

Supabase no autoriza por sí mismo datos reales. Las respuestas seguirían siendo datos de salud seudonimizados y requerirían gobernanza previa.

### Laboratorio local/appliance

```text
Ubuntu Server LTS
Docker
PostgreSQL
API HTTPS
frontend servido localmente
backups cifrados
```

Uso: laboratorio técnico, prueba de concepto o ensayo de appliance local, siempre sin datos reales salvo autorización posterior.

### Futuro institucional

```text
backend autorizado por área sanitaria / SES / STIC
identidad
permisos
auditoría
soporte
DPO
continuidad
backup institucional
```

El canal operativo es `Frontend -> API HTTPS -> PostgreSQL/Supabase`. SSH queda reservado para administración técnica. MCP no es un canal clínico operativo.

## 14. Mini PC / appliance local

El mini PC no es imprescindible para el primer laboratorio cloud, pero es una vía estratégica para innovación asistencial controlada.

PoC orientativa:

```text
Intel N100/N150
16 GB RAM
512 GB SSD/NVMe
Ubuntu Server LTS
Docker
PostgreSQL
API
backup externo cifrado
```

Piloto técnico más cómodo:

```text
Ryzen 5 / Intel i5 pequeño
16-32 GB RAM
512 GB-1 TB NVMe
Ethernet
SAI pequeño
backup cifrado
```

Los usuarios clínicos no usan SSH. La aplicación debe funcionar por navegador y no se diseñará para sortear restricciones de red o gobernanza del SES.

## 15. Repository layer

El dominio no debe depender de Supabase, Excel, SharePoint, PostgreSQL o una API concreta.

```text
PromRepository -> Supabase
PromRepository -> API local/PostgreSQL
PromRepository -> backend institucional futuro
```

Implementaciones conceptuales:

```text
SupabasePromRepository
ApiPromRepository
PostgresPromRepository
MockPromRepository
```

La interfaz, errores, compatibilidad de identificadores y migración entre backends requieren una WO técnica posterior. No se implementan aquí.

## 16. Líneas rojas

- No CIP en el backend PROM cloud.
- No nombre, DNI, teléfono, email o fecha de nacimiento.
- No texto libre en el MVP.
- Solo respuestas cerradas y codificables.
- No lectura pública de histórico.
- No `service role key` en frontend.
- No tokens administrativos en navegador.
- No reasignación libre de tarjetas usadas.
- No inferencias clínicas automáticas desde PROM/PREM sin validación.
- No uso real con pacientes sin validación institucional, STIC y DPO.
- No confundir seudonimización con anonimización.
- No convertir este documento en autorización de producción, backend o integración corporativa.

## 17. Estado y preguntas abiertas

Estado: documento arquitectónico exploratorio; funcionalidad no implementada.

Preguntas pendientes:

- alojamiento del frontend del MVP;
- alcance de Supabase como laboratorio o MVP;
- generación y custodia de `hub_patient_key`;
- primer instrumento PROM/PREM;
- roles autorizados para asignar y revocar tarjetas;
- caducidad exacta de tokens temporales;
- retención, borrado, backup y respuesta a incidentes;
- información al paciente y checklist previo a cualquier uso real.

## 18. Criterios de aceptación para un MVP futuro

Un MVP técnico futuro solo podría considerarse aceptado si:

1. Existe stock de tarjetas PROM no asignadas.
2. El profesional puede asignar una tarjeta a un paciente abierto mediante código corto.
3. El paciente puede contestar un cuestionario desde un QR.
4. La respuesta se guarda sin CIP ni nombre en el backend PROM.
5. El Hub profesional puede leer respuestas por `hub_patient_key`.
6. La vista longitudinal se recompone localmente.
7. Existe revocación y reemisión de tarjeta.
8. Existe QR temporal de visita.
9. No hay texto libre en el formulario MVP.
10. No hay Excel intermedio de respuestas PROM/PREM.
11. Existe auditoría básica de asignación, revocación y respuesta.

Estos criterios describen una futura WO técnica; no autorizan implementación, datos reales ni producción.

## 19. Decisión resumida

Se propone un módulo único de captura PROM/PREM con tarjetas QR universales preimpresas y no asignadas. El profesional asigna una tarjeta al paciente abierto en el Hub mediante el código corto visible. El paciente responde mediante QR. El backend conserva respuestas cerradas vinculadas a `hub_patient_key`, mientras la relación con CIP permanece fuera del backend PROM cloud. La arquitectura permite comenzar con un backend cloud exploratorio y migrar después a una API local/PostgreSQL o backend institucional sin cambiar el modelo funcional.

La rama remota `origin/docs/prom-capture-gateway-qr-20260714`, basada en `main`, fue usada únicamente como material de comparación documental. No es la base, no se mergea ni se borra; queda como rama no canónica, reemplazada por esta nueva WO.
