# Identity Plane local y Nursing Readiness Gateway

| Metadato | Valor |
|---|---|
| Estado | Propuesta exploratoria avanzada |
| Fecha | 2026-07-14 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama base | `preview/demo-lunes-wo4-20260614` |
| Tipo | Documento de arquitectura funcional/técnica |
| Relación | Extiende `PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md` |
| Implementación | No implementado en esta WO |
| Datos reales | No autorizados por este documento |

> Este documento no autoriza datos reales, producción ni despliegue institucional. Describe una arquitectura transitoria pendiente de validación humana, técnica, STIC/DPO y organizativa.

## 1. Decisión resumida

La identidad clínica identificada debe vivir en un Identity Plane local/hospitalario. Los eventos clínico-operativos estructurados pueden almacenarse seudonimizados usando `hub_patient_key`. La recomposición de identidad y actividad clínica ocurre solo dentro del Hub profesional.

> La identidad vive local. La actividad clínica estructurada puede viajar seudonimizada. La recomposición ocurre en el Hub profesional.

Esta propuesta amplía el patrón del [PROM Capture Gateway seudonimizado con QR permanente](PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md). No convierte los eventos seudonimizados en datos anónimos ni elimina requisitos de protección de datos, autorización o gobierno institucional.

## 2. Arquitectura por capas

| Capa | Responsabilidad | Datos principales |
|---|---|---|
| Identity Plane | Custodia local de la correspondencia identificada. | CIP, identidad operativa y `hub_patient_key`. |
| Control Plane no-paciente | Configuración, profesionales, roles y permisos. | Formularios, catálogos, roles, plantillas y configuración por tenant. |
| Clinical Event Plane | Eventos clínico-operativos estructurados seudonimizados. | `hub_patient_key`, tipo de evento, estado, fecha, procedencia y versión. |

La separación es conceptual: no define tablas reales, migraciones, Supabase, SharePoint, API ni permisos implementados.

## 3. Identity Plane local/hospitalario

El Identity Plane contiene la relación sensible:

```text
CIP <-> hub_patient_key
```

Campos mínimos conceptuales:

```text
CIP
nombre, si procede
servicio
patología/programa
hub_patient_key
código/tarjeta PROM-Hub asignada
estado: activo/inactivo
fecha_alta_tecnica
profesional_asignador
fecha_revocacion, si aplica
motivo_revocacion_codificado, si aplica
```

El Excel o SharePoint de correspondencia no es un Excel operativo intermedio de Enfermería/Farmacia. Es el registro maestro de correspondencia de seudonimización y requiere custodia, minimización, control de acceso, backup y trazabilidad.

### Fases propuestas

| Fase | Custodia del Identity Plane | Estado |
|---|---|---|
| Fase 0 | Excel o tabla en SharePoint hospitalario/Microsoft 365. | Exploratorio. |
| Fase 1 | Mini PC propio para laboratorio con datos sintéticos. | Exploratorio. |
| Fase 2 | Mini PC o equipo dedicado en red interna hospitalaria. | Exploratorio. |
| Fase 3 | Servidor local/API/PostgreSQL como backend principal progresivo. | Pendiente de diseño y gobierno. |

SharePoint no se redefine aquí como backend clínico general. Su papel potencial inicial es la custodia controlada de la correspondencia, si la institución lo valida.

## 4. Control Plane no-paciente

El Control Plane reúne configuración que no corresponde a un paciente individual:

- formularios;
- catálogos;
- filtros guardados;
- roles;
- permisos;
- profesionales;
- plantillas;
- diccionario de variables;
- configuración por tenant o área.

Los profesionales, roles y permisos no son datos clínicos de paciente, pero son datos personales/profesionales. Requieren minimización, control de acceso y trazabilidad conforme al contexto institucional.

## 5. Clinical Event Plane seudonimizado

El Clinical Event Plane es un plano futuro de eventos clínico-operativos estructurados vinculados a `hub_patient_key`, sin identificadores directos. Permite registrar actividad longitudinal y recomponerla localmente dentro del Hub profesional.

Ejemplos conceptuales:

- paciente responde EQ-5D;
- Enfermería marca serología realizada;
- Enfermería marca profilaxis en curso;
- Enfermería marca `OK Enfermería para Farmacia`;
- Farmacia marca validación completada;
- Dermatología envía una solicitud a FH;
- Reumatología programa seguimiento.

Aunque no contenga CIP o nombre, este plano sigue procesando datos de salud seudonimizados. La minimización debe evitar que el tipo o combinación de eventos exponga información clínica innecesaria.

## 6. Nursing Readiness Gateway

El Nursing Readiness Gateway es un módulo propuesto para que Enfermería registre de forma estructurada el estado de preparación del paciente antes de validación o citación por Farmacia. No es una implementación aprobada ni un contrato clínico final.

Estados cerrados recomendados:

| Área | Valores conceptuales |
|---|---|
| Analítica | `pendiente`, `solicitada`, `realizada`, `revisar` |
| Serología | `pendiente`, `negativa`, `positiva`, `revisar` |
| Medicina preventiva | `pendiente`, `citada`, `realizada`, `no_aplica` |
| Vacunación/prebiológico | `pendiente`, `en_curso`, `completo`, `no_aplica` |
| Profilaxis | `no`, `si`, `en_curso`, `finalizada`, `revisar` |
| OK Enfermería para Farmacia | `si`, `no`, `pendiente` |

Líneas rojas del MVP conceptual:

- sin texto libre;
- sin resultados analíticos detallados;
- sin diagnósticos escritos;
- sin comentarios identificativos;
- sin CIP o nombre en Supabase u otro backend de eventos seudonimizados.

## 7. Alta técnica de paciente

Flujo conceptual:

1. Enfermería o Farmacia abre el alta de paciente en el Hub profesional.
2. Introduce o selecciona el paciente identificado en el entorno autorizado.
3. El sistema comprueba si ya existe `hub_patient_key` para ese CIP.
4. Si existe, recupera la identidad técnica existente.
5. Si no existe, permite crear un alta técnica con confirmación explícita.
6. El profesional asigna código o tarjeta disponible si el circuito lo requiere.
7. El sistema crea o confirma el `hub_patient_key`.
8. El sistema guarda la correspondencia en el Identity Plane local.
9. El sistema verifica el guardado correcto.
10. Solo entonces permite registrar eventos en el backend seudonimizado.

Barreras obligatorias:

```text
No hub_patient_key guardado -> no se registran eventos.
No alta tecnica completa -> no se habilita Nursing Readiness.
```

## 8. Riesgos críticos y barreras

| Riesgo | Barrera funcional propuesta |
|---|---|
| Dos `hub_patient_key` activos para el mismo CIP. | Validación de duplicado por CIP y recuperación de identidad existente. |
| Una tarjeta asignada a dos pacientes. | Validación de tarjeta disponible y asociación activa única. |
| Reasignación de tarjeta con respuestas previas. | Bloqueo por defecto; excepción solo con rol administrador y procedimiento auditado. |
| Eventos sin correspondencia. | Bloqueo de inserción sin `hub_patient_key` confirmado. |
| Error al teclear código. | Validación de formato, búsqueda de tarjeta y confirmación visual. |
| Nueva identidad por pérdida de tarjeta. | Revocación/reemisión sobre el mismo `hub_patient_key`. |
| Eventos huérfanos en backend. | Clave obligatoria, auditoría y conciliación técnica antes de uso real. |

Pantalla conceptual:

```text
Paciente: [IDENTIDAD ENMASCARADA]
CIP: ***456
Código tarjeta: PROM-0382-R

¿Confirmar asignación?
[Confirmar] [Cancelar]
```

La representación visual es orientativa y no implica implementación ni uso de datos reales.

## 9. Seguridad del backend seudonimizado

Checklist obligatorio para cualquier futura implementación:

- RLS o control equivalente activado en todas las tablas sensibles.
- Acceso profesional autenticado.
- Permisos mínimos por rol.
- Sin lectura pública de datos clínico-operativos.
- Portal paciente limitado a inserción/respuesta; sin lectura de histórico.
- Sin `service role key` en frontend.
- Sin tokens administrativos en navegador.
- Sin texto libre en MVP.
- Logs sin payload clínico sensible cuando sea posible.
- Exportaciones controladas.
- Separación por tenant o área sanitaria.
- Auditoría de cambios relevantes.
- Validación institucional antes de datos reales.

Un endpoint público limitado no es un canal libre. Aunque no incluya identificadores directos, procesa datos de salud seudonimizados y requiere los controles anteriores.

## 10. Profesionales, roles y permisos por tenant

Los roles y permisos pertenecen al Control Plane. Modelo conceptual:

### `tenant_professionals`

```text
id
login_identifier / email / nick_interno
service
role
active
created_at
```

### `tenant_roles`

```text
id
role_name
```

### `tenant_role_permissions`

```text
role_id
permission_key
```

Roles iniciales posibles:

```text
admin_tenant
farmacia
clinico_reuma
clinico_derma
lectura
```

Permisos posibles:

```text
patient_identity.create
patient_identity.read
patient_identity.update
prom_card.assign
prom_card.revoke
nursing_readiness.write
nursing_readiness.read
prom_response.read
questionnaire.configure
professional.manage
export.run
audit.read
```

Flujo conceptual de alta profesional:

1. Un administrador del tenant abre `Profesionales`.
2. Da de alta un profesional con nombre, nick o email mínimo autorizado.
3. Selecciona servicio.
4. Selecciona rol.
5. El sistema aplica los permisos asociados al rol.

> Ocultar un botón no es control de acceso.

Los permisos deben aplicarse en backend/RLS o mecanismo equivalente, no solo en la interfaz.

## 11. Alertas y bloqueos funcionales

| Condición | Respuesta mínima |
|---|---|
| Paciente sin correspondencia | Bloquear registro de eventos. |
| Código o tarjeta no disponible | Bloquear asignación. |
| Código mal escrito | Mostrar error claro sin revelar información clínica. |
| Duplicado de CIP | Sugerir paciente existente y evitar nueva alta técnica. |
| Duplicado de tarjeta | Bloquear. |
| Usuario sin rol o inactivo | Bloquear acceso. |
| Tenant no resuelto | Bloquear lectura y escritura. |
| Evento sin `hub_patient_key` | Bloquear inserción. |
| Formulario sin versionado | Bloquear publicación. |
| Campo explotable sin `variable_id` | Advertir o bloquear según criticidad validada. |

## 12. Ruta de evolución

### Fase 0 - Supabase + SharePoint

```text
Identity Plane: Excel o tabla SharePoint hospitalaria.
Clinical Event Plane: Supabase.
Control Plane: Supabase.
Recomposición: Hub profesional.
```

### Fase 1 - Mini PC de laboratorio

```text
Probar Identity Plane local en mini PC con datos sintéticos.
Validar que el Hub recompone contra Supabase.
```

### Fase 2 - Equipo dedicado en red interna

```text
Custodiar la correspondencia de seudonimización.
Acceso por navegador y API HTTPS desde puestos autorizados.
```

### Fase 3 - Migración progresiva

```text
Mover eventos críticos desde Supabase a API local/PostgreSQL si procede.
Mantener repository layer para backend intercambiable.
```

Estas fases son exploratorias. No autorizan despliegue, infraestructura hospitalaria, datos reales ni sustitución de JARA.

## 13. Petición operativa orientativa a informática Cáceres

> Queremos valorar un equipo local dedicado de piloto, sin exposición pública, conectado únicamente a red interna hospitalaria, para custodiar una tabla mínima de correspondencia de seudonimización y servir una aplicación interna/API accesible por navegador desde puestos autorizados. No sustituye JARA, no aloja la historia clínica corporativa y no expone la base de datos directamente. La función inicial sería proteger la relación entre paciente identificado y clave técnica, permitiendo que los formularios y estados asistenciales se almacenen sin identificadores directos.

Requisitos orientativos:

- equipo dedicado o mini PC;
- red interna hospitalaria;
- IP fija o reserva DHCP;
- acceso HTTPS interno desde puestos autorizados;
- sin exposición pública a internet;
- PostgreSQL o base local no expuesta directamente;
- API interna;
- administración técnica restringida;
- backup local cifrado o ruta de backup acordada;
- salida a internet opcional solo para actualizaciones autorizadas.

Esta petición es material de discovery y no equivale a solicitud de infraestructura aprobada.

## 14. Líneas rojas y pendientes

- No se implementan Supabase, RLS, usuarios, API, Docker, migraciones, formularios ni autenticación en esta WO.
- No se registran datos reales.
- No se guardan identificadores directos en el backend de eventos seudonimizados.
- No se usan comentarios clínicos libres en el MVP conceptual.
- No se afirma que SharePoint, Supabase o un mini PC estén aprobados.
- No se diseñan mecanismos para sortear restricciones de red o gobierno del SES.
- La definición clínica de los estados de readiness requiere validación de Sil/Cora y los equipos asistenciales.
- La retención, borrado, incidentes, backups, RLS, autenticación y auditoría real requieren una WO técnica y revisión institucional posterior.

## 15. Decisión resumida

Se propone que la identidad identificada permanezca en un Identity Plane local/hospitalario, mientras los eventos clínico-operativos estructurados viajan mediante `hub_patient_key` sin identificadores directos. El Nursing Readiness Gateway sería la primera aplicación concreta para representar estados prebiológicos de Enfermería antes de Farmacia. La recomposición ocurre exclusivamente dentro del Hub profesional y cualquier realización técnica futura deberá mantener separación, permisos mínimos, RLS o controles equivalentes y validación institucional previa.
