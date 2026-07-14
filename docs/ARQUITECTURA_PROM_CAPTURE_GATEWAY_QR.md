# Arquitectura PROM Capture Gateway QR

**Fecha:** 2026-07-14  
**Estado:** decisión arquitectónica/documento vivo  
**Ámbito:** Hub Clínico / PROMueve Farmacia Hospitalaria / evolución V4.8  
**Tipo:** recap documental de decisiones funcionales, técnicas y de gobernanza  

---

## 1. Propósito

Este documento recoge las decisiones tomadas sobre el diseño de un módulo de captura de PROMs/PREMs mediante QR y códigos seudónimos, evitando la dispersión de Microsoft Forms y Excels independientes.

No describe una funcionalidad ya implementada. Define una arquitectura objetivo incremental para una fase posterior del Hub:

```text
V4.8 — PROM Capture Gateway seudonimizado
```

El objetivo es permitir que pacientes contesten cuestionarios cerrados desde casa, sala de espera, hospital de día, consulta o farmacia, y que esas respuestas entren en tiempo casi real al Hub profesional sin enviar identificadores directos a un backend externo.

---

## 2. Problema de partida

El diseño previo con Microsoft Forms resolvía una necesidad inmediata, pero generaba problemas estructurales:

```text
1 formulario por patología/cuestionario
→ 1 Excel de respuestas por formulario
→ múltiples Excels dispersos
→ recargas manuales
→ pérdida de tiempo real
→ dificultad de explotación longitudinal
```

Además, el Excel asociado a Microsoft Forms puede vivir en ubicaciones distintas según cómo se cree y gestione el formulario, lo que añade incertidumbre operativa y de permisos.

El Hub necesita una solución más coherente:

```text
1 motor de formularios
→ muchas plantillas versionadas
→ 1 tabla homogénea de respuestas
→ lectura longitudinal desde el Hub
```

---

## 3. Principio de clasificación del dato

Los datos recogidos no deben describirse como anónimos.

La decisión conceptual es tratarlos como:

```text
datos de salud seudonimizados, minimizados y estructurados
```

Aunque no incluyan nombre, CIP, DNI, teléfono, email ni fecha de nacimiento, los PROMs/PREMs describen estado de salud, calidad de vida, dolor, capacidad funcional, ansiedad/depresión u otras dimensiones reportadas por el paciente.

Por tanto:

- no se deben tratar como datos inocuos;
- no deben mezclarse con identificadores directos en cloud;
- deben recogerse con minimización estricta;
- deben evitar texto libre;
- deben limitarse a respuestas cerradas y codificables;
- deben mantener la tabla de reidentificación bajo custodia hospitalaria/local.

---

## 4. Decisión principal

Se descarta mantener Microsoft Forms como arquitectura longitudinal principal.

Se propone un módulo propio:

```text
PROM Capture Gateway
```

Definición:

> Módulo de captura de PROMs/PREMs con QR o código seudónimo, sin login de paciente, sin app de paciente, con respuestas cerradas y vínculo longitudinal controlado por el Hub profesional.

La arquitectura debe permitir dos modos de despliegue:

```text
MVP cloud / ágil:
frontend estático + Supabase para tarjetas, cuestionarios y respuestas seudonimizadas

Piloto local futuro:
mini servidor/appliance local con PostgreSQL + API + frontend
```

La app debe diseñarse con una capa de repositorio intercambiable:

```text
PromRepository → Supabase
PromRepository → API local/PostgreSQL
```

---

## 5. Identificadores y responsabilidades

### 5.1. CIP

Identificador clínico real.

```text
CIP = solo entorno hospitalario/local
```

No debe enviarse a Supabase ni aparecer en formularios de paciente.

### 5.2. `hub_patient_key`

Identificador técnico estable del paciente dentro del Hub.

```text
hub_patient_key = clave técnica estable del paciente
```

Sirve como bisagra entre:

```text
CIP local/hospitalario
↔ hub_patient_key
↔ respuestas PROM/PREM seudonimizadas
```

La relación sensible es:

```text
CIP ↔ hub_patient_key
```

Debe permanecer en entorno hospitalario/local.

### 5.3. Tarjeta PROM

La tarjeta PROM no identifica al paciente por sí misma. Es una credencial física de acceso para contestar cuestionarios.

Puede tener:

```text
QR con token largo aleatorio
+
código corto visible para asignación manual por profesional
```

Ejemplo:

```text
QR token: 8F7KQ2L9P4ZB
Código visible: PROM-0382-R
```

El código visible facilita el trabajo del profesional cuando no hay cámara, lector QR, NFC o escáner en consulta.

---

## 6. Decisión sobre QR preimpresos

No se deben preimprimir QR por patología ni por cuestionario.

Decisión:

```text
preimprimir tarjetas PROM universales, no asignadas
```

Las tarjetas nacen como stock:

```text
PROM-0382-R = disponible
PROM-0383-K = disponible
PROM-0384-T = disponible
```

No tienen patología, paciente ni formulario asociado hasta el momento de asignación.

El QR no apunta a un cuestionario concreto. Apunta al portal PROM de la tarjeta:

```text
/prom/t/<qr_token>
```

Cuando el paciente escanea, el sistema consulta qué cuestionarios tiene pendientes ese paciente técnico.

```text
QR universal
→ portal PROM
→ sistema decide cuestionarios según hub_patient_key / plan / patología / visita / periodicidad
```

---

## 7. Flujo de asignación de tarjeta permanente

### 7.1. Preparación

Se generan 500/1000 tarjetas PROM no asignadas.

Cada tarjeta tiene:

- QR grande para el paciente;
- código corto visible para el profesional;
- instrucciones neutras;
- sin nombre;
- sin CIP;
- sin patología;
- sin tratamiento.

Ejemplo visible:

```text
PROMueve
Cuestionarios de seguimiento

[ QR ]

Conserve esta tarjeta.
No la comparta con otras personas.

Tarjeta PROM: PROM-0382-R
```

### 7.2. Asignación en consulta/Farmacia/Hospital de Día

El profesional no necesita usar móvil personal ni cámara.

Flujo:

```text
1. Profesional abre el paciente en el Hub.
2. Pulsa “Asignar tarjeta PROM”.
3. Coge una tarjeta del taco.
4. Teclea el código visible: PROM-0382-R.
5. El Hub comprueba que la tarjeta está disponible.
6. El Hub muestra confirmación:
   “Va a asignar la tarjeta PROM-0382-R al paciente abierto. Confirmar.”
7. Profesional confirma.
8. El sistema registra:
   hub_patient_key ↔ card_id / qr_token
9. Se entrega la tarjeta al paciente.
```

### 7.3. Confirmación obligatoria

La asignación debe exigir confirmación visual para evitar errores:

```text
Paciente abierto:
- Nombre / alias visible según entorno
- CIP parcial o enmascarado
- Servicio
- Patología

Tarjeta detectada:
- PROM-0382-R

¿Asignar esta tarjeta PROM a este paciente?
[Confirmar] [Cancelar]
```

---

## 8. Flujo de respuesta del paciente

Cuando el paciente escanea el QR:

```text
1. El portal recibe qr_token.
2. Comprueba que la tarjeta está asignada y activa.
3. Resuelve el hub_patient_key asociado.
4. Consulta cuestionarios pendientes.
5. Muestra solo cuestionarios permitidos.
6. Guarda respuestas cerradas.
7. No muestra histórico ni datos clínicos identificativos.
```

El formulario de paciente debe ser de inserción, no de consulta longitudinal.

```text
Puede enviar respuestas.
No puede leer respuestas previas.
No puede listar pacientes.
No puede ver CIP/nombre/diagnóstico/tratamiento.
```

---

## 9. Flujo profesional longitudinal

Cuando el profesional abre un paciente en el Hub:

```text
1. El Hub conoce el CIP y el hub_patient_key en entorno local/hospitalario.
2. El Hub consulta el backend PROM por hub_patient_key.
3. Recupera respuestas longitudinales.
4. Recompone localmente la vista paciente + PROM.
5. No persiste en cloud la combinación CIP + PROM.
```

La recomposición debe ocurrir en el Hub profesional, no en Supabase.

---

## 10. QR temporal de visita

La tarjeta permanente es el flujo principal, pero debe existir un QR temporal para situaciones reales:

- paciente olvidó tarjeta;
- está en sala de espera;
- está en hospital de día;
- el profesional quiere que responda un cuestionario ahora;
- aún no se desea entregar tarjeta permanente.

Flujo:

```text
1. Profesional abre paciente en el Hub.
2. Pulsa “Responder PROM ahora”.
3. El Hub genera token temporal vinculado al hub_patient_key.
4. Muestra QR en pantalla.
5. Paciente lo escanea con móvil o tablet.
6. Contesta cuestionario.
7. Token queda usado/caducado.
```

Características:

```text
visit_token:
- vinculado a hub_patient_key
- válido 30-60 minutos
- un solo uso
- scope: cuestionario concreto o paquete de visita
- no permite leer histórico
```

Regla crítica:

```text
El token temporal solo se genera desde el Hub profesional con el paciente abierto.
```

---

## 11. Pérdida, revocación y reemisión de tarjeta

La tarjeta física no debe ser la identidad final del paciente.

La identidad longitudinal es:

```text
hub_patient_key
```

Por tanto, si el paciente pierde la tarjeta:

```text
1. Profesional abre paciente.
2. Marca tarjeta anterior como perdida/revocada.
3. Coge nueva tarjeta disponible.
4. Teclea código corto visible.
5. Asocia nueva tarjeta al mismo hub_patient_key.
6. Las respuestas anteriores se conservan.
```

Ejemplo:

```text
hp_8f73
├── tarjeta PROM-0382-R — perdida/revocada
├── tarjeta PROM-0517-M — activa
├── EQ-5D enero
├── EQ-5D febrero
└── BASDAI marzo
```

No se debe reasignar a otro paciente una tarjeta que ya tenga respuestas sin proceso explícito de administrador y auditoría.

---

## 12. Modelo de datos conceptual

### 12.1. Entorno local / Hub

```text
patients
- cip
- nombre / alias operativo
- servicio
- patologia
- hub_patient_key
```

La relación `cip ↔ hub_patient_key` es sensible y debe permanecer local/hospitalaria.

### 12.2. Backend PROM — Supabase MVP o API local futura

```text
prom_cards
- card_id
- short_code
- qr_token
- tenant_id
- status: available / assigned / lost / revoked
- created_at
- assigned_at
```

```text
prom_card_assignments
- assignment_id
- card_id
- hub_patient_key
- assigned_by
- assigned_at
- active
- revoked_at
- revocation_reason
```

```text
prom_questionnaires
- questionnaire_id
- name
- version
- pathology_scope
- schema_json
- scoring_json
- active
```

```text
prom_questionnaire_plan
- plan_id
- hub_patient_key
- questionnaire_id
- status: pending / completed / expired
- available_from
- available_until
- source: scheduled / visit / manual / hospital_day
```

```text
prom_visit_tokens
- visit_token_id
- token
- hub_patient_key
- questionnaire_scope
- expires_at
- used_at
- created_by
```

```text
prom_responses
- response_id
- tenant_id
- hub_patient_key
- questionnaire_id
- questionnaire_version
- submitted_at
- source: home / waiting_room / hospital_day / assisted
- answers_json
- score_json
```

---

## 13. Seguridad mínima obligatoria

### 13.1. No guardar en Supabase/MVP cloud

```text
- CIP
- nombre y apellidos
- DNI
- teléfono
- email
- fecha de nacimiento
- diagnóstico textual identificativo
- tratamiento identificativo
- texto libre de paciente
```

### 13.2. Reglas del formulario paciente

```text
- Solo respuestas cerradas.
- Sin texto libre.
- Sin lectura de histórico.
- Sin listado de pacientes.
- Sin búsqueda por paciente.
- Sin acceso a Hub profesional.
- Token/código robusto, no semántico.
- Validación de tarjeta activa/asignada.
```

### 13.3. Reglas del backend

```text
- RLS o control equivalente por tenant.
- Endpoint público solo para inserción controlada.
- Lectura profesional autenticada.
- Claves de servicio nunca en frontend.
- Logs sin payload sensible innecesario.
- Auditoría de asignación, revocación y reemisión.
- Exportaciones controladas.
```

---

## 14. Despliegue MVP cloud

Objetivo: iterar rápido, demostrar flujo y evitar Microsoft Forms/Excels intermedios.

```text
Frontend:
- GitHub Pages / Netlify / Vercel / estático equivalente

Backend PROM:
- Supabase

Hub actual:
- mantiene paciente identificado y hub_patient_key
- recompone localmente la vista clínica
```

Ventajas:

```text
- tiempo casi real;
- no hay Excel intermedio de respuestas PROM;
- permite responder desde sala de espera/hospital de día;
- reduce fragmentación por formularios;
- mantiene agilidad de desarrollo.
```

Limitaciones:

```text
- no es arquitectura hospitalaria definitiva;
- sigue siendo dato de salud seudonimizado en cloud;
- requiere configuración estricta de permisos;
- no debe usarse con identificadores directos.
```

---

## 15. Despliegue local futuro — appliance/mini servidor

Objetivo: preparar una evolución local-first/backend-ready para piloto más robusto.

No se propone iniciar aquí antes de cerrar MVP, pero sí diseñar el sistema para poder migrar.

### 15.1. Arquitectura local

```text
Mini PC / appliance local
- Ubuntu Server LTS
- Docker Compose
- PostgreSQL
- API FastAPI o Node/Express
- Caddy/Nginx para HTTPS
- frontend servido localmente
- backups automáticos
```

Acceso:

```text
https://hub-promueve.local
```

El servidor local serviría:

```text
- frontend profesional;
- API;
- base de datos;
- módulo PROM;
- formularios;
- dashboard;
- logs/auditoría;
- backups.
```

### 15.2. Hardware orientativo

Para PoC/laboratorio:

```text
CPU: Intel N100/N150
RAM: 16 GB
Disco: 512 GB NVMe
Red: Ethernet
SO: Ubuntu Server LTS
Backup: SSD externo cifrado
```

Para piloto hospitalario cómodo:

```text
CPU: Ryzen 5 / Intel i5 equivalente
RAM: 16 GB suficiente; 32 GB ideal si hay margen
Disco: 1 TB NVMe recomendable
Red: Ethernet
Backup: SSD externo + copia adicional si el hospital lo permite
SAI/UPS pequeño
```

La carga prevista inicial es baja:

```text
5 farmacéuticos + 5/6 clínicos ≈ 10-12 usuarios
```

El cuello de botella no será la CPU/RAM, sino red, gobernanza, backup y mantenimiento.

### 15.3. No usar SSH como flujo profesional

Los profesionales no deben subir datos por SSH/SFTP/MCP ni mecanismos manuales.

El flujo operativo debe ser:

```text
navegador → API HTTPS → base de datos
```

SSH, si existe, queda restringido a administración técnica.

---

## 16. Deployment bundle futuro

Una fase posterior puede crear un paquete de instalación reproducible:

```text
deployment bundle / appliance setup
```

Objetivo:

```text
1. Instalar dependencias.
2. Levantar contenedores.
3. Crear base de datos.
4. Ejecutar migraciones.
5. Crear usuario admin inicial.
6. Servir frontend.
7. Configurar backups.
8. Dejar logs y estado visibles.
```

Ejemplo conceptual:

```bash
./install-hub-promueve.sh
```

No es prioridad de demo. Es una línea de producto futura.

---

## 17. Decisiones cerradas

```text
1. No usar Microsoft Forms como arquitectura longitudinal principal.
2. No imprimir QR por patología/cuestionario.
3. Sí imprimir tarjetas PROM universales no asignadas.
4. El QR apunta a portal PROM, no a formulario fijo.
5. El sistema decide cuestionarios según hub_patient_key y plan.
6. El profesional puede asignar tarjeta tecleando código corto visible.
7. El paciente usa QR; el profesional no necesita cámara ni móvil personal.
8. La identidad longitudinal es hub_patient_key, no la tarjeta.
9. Las tarjetas pueden perderse, revocarse y reemitirse sin perder longitudinalidad.
10. QR temporal de visita solo desde paciente abierto en Hub.
11. No hay Excel intermedio de respuestas PROM.
12. La recomposición CIP + PROM ocurre localmente en el Hub.
13. MVP cloud aceptable si no hay identificadores directos ni texto libre.
14. Diseñar repositorio de datos intercambiable para migrar a servidor local.
```

---

## 18. NO TOCA ahora

No mezclar esta línea con rescate urgente de Farmacia si hay demo cercana.

No tocar en una WO de documentación/arquitectura:

```text
- validación farmacéutica actual;
- CIMA/catálogo farmacológico;
- inferencias terapéuticas;
- pantallas productivas de demo;
- Pages de demo si no se autoriza;
- migración completa a backend;
- instalación hospitalaria real;
- endpoint público con datos reales;
- app de paciente;
- login de paciente.
```

---

## 19. Criterios de aceptación para MVP futuro

Un MVP técnico de PROM Capture Gateway estaría aceptado si:

```text
1. Existe stock de tarjetas PROM no asignadas.
2. El profesional puede asignar una tarjeta a un paciente abierto mediante código corto.
3. El paciente puede contestar un cuestionario desde QR.
4. La respuesta se guarda en backend sin CIP/nombre.
5. El Hub profesional puede leer las respuestas por hub_patient_key.
6. La vista longitudinal se recompone localmente.
7. Existe revocación/reemisión de tarjeta.
8. Existe QR temporal de visita.
9. No hay texto libre.
10. No hay Excel intermedio de respuestas PROM.
11. Hay auditoría básica de asignación/revocación/respuesta.
```

---

## 20. Preguntas abiertas

Pendientes de decidir antes de ejecución:

```text
- ¿Dónde se aloja el frontend del MVP: GitHub Pages, Netlify, Vercel u otro?
- ¿Supabase será solo laboratorio o también MVP real con aprobación local?
- ¿Cómo se genera y custodia el hub_patient_key en la versión Excel/local actual?
- ¿Qué cuestionario se implementa primero: EQ-5D, BASDAI, DLQI, HAQ u otro?
- ¿Qué rol profesional puede asignar/revocar tarjetas?
- ¿Qué política de caducidad tendrán los QR temporales?
- ¿Qué retención tendrán las respuestas PROM?
- ¿Cómo se documenta la información al paciente?
- ¿Qué checklist de seguridad se exigirá antes de usar datos reales?
```

---

## 21. Formulación ejecutiva

> Se propone sustituir la dispersión de Microsoft Forms por un módulo único de captura PROM/PREM con tarjetas QR universales no asignadas. La asignación se realiza desde el Hub profesional al paciente abierto, mediante código corto visible de tarjeta. El paciente responde desde QR y el backend guarda respuestas cerradas vinculadas a `hub_patient_key`, sin CIP ni identificadores directos. La recomposición con el paciente real ocurre localmente en el Hub. El diseño permite un MVP cloud ágil con Supabase y una migración posterior a servidor local/appliance sin cambiar el modelo funcional.

---

## 22. Estado de implementación

```text
Documento creado.
Funcionalidad no implementada.
Debe convertirse en work order específica antes de tocar código.
```
