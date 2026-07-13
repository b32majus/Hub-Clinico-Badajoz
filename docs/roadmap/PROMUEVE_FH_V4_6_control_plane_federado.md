# PROMueve FH — V4.6 Control Plane Federado

**Fecha:** 2026-07-13  
**Repositorio:** `b32majus/Hub-Clinico-Badajoz`  
**Rama de trabajo:** `docs/promueve-fh-control-plane-federado-20260713`  
**Estado:** propuesta arquitectónica / roadmap funcional, **no implementado**  
**Ámbito:** evolución del Hub Clínico-Farmacéutico PROMueve FH entre MVP local-first y Hub agnóstico configurable.

---

## 1. Propósito del documento

Este documento recoge una decisión de evolución arquitectónica para el módulo de Farmacia Hospitalaria / Hub Clínico-Farmacéutico PROMueve FH.

No describe funcionalidad actualmente implementada en producción o demo. Su objetivo es dejar documentado un camino intermedio entre:

- el estado actual local-first con Excel como backend operativo;
- una futura base clínica real;
- y una versión V5/V6 de Hub agnóstico configurable por servicio, patología, visita, rol, formulario, variable, dashboard y exportación.

La idea central es separar dos planos:

```text
1. Backend clínico / data plane
   Datos de paciente, tratamientos, visitas, validaciones, seguimientos y resultados.

2. Control plane / plano de configuración
   Catálogos, filtros guardados, formularios declarativos, profesionales, roles, permisos,
   plantillas de exportación, widgets y configuración por área sanitaria.
```

---

## 2. Contexto funcional

El Hub actual nace como una herramienta local-first, orientada a entorno hospitalario con restricciones STIC, donde la persistencia clínica provisional se apoya en Excel.

Esta aproximación permite avanzar en demo y piloto inicial, pero genera límites cuando se quiere:

- guardar filtros poblacionales recurrentes;
- mantener catálogos locales de fármacos especiales;
- registrar fármacos en ensayo clínico, uso compasivo o medicación extranjera;
- gestionar profesionales, roles y permisos;
- definir formularios sin tocar código;
- compartir configuraciones entre áreas sanitarias;
- preparar una evolución hacia un producto configurable.

No todos estos elementos son datos clínicos de paciente. Muchos son configuración operativa o metadatos del servicio. Por tanto, pueden evolucionar antes que la base clínica, siempre que se mantenga una separación estricta.

---

## 3. Decisión arquitectónica

Se propone una fase intermedia denominada:

```text
V4.6 — Control Plane Federado
```

Su objetivo es construir una capa de configuración desacoplada de los datos clínicos de paciente.

Esta capa debe permitir que cada área sanitaria pueda configurar elementos no-paciente sin modificar código y sin depender de una base central compartida entre todas las áreas.

La decisión clave es:

```text
Diseño multi-tenant lógico, despliegue federado por área sanitaria.
```

Esto significa:

- el software entiende el concepto de área sanitaria / tenant;
- el esquema de datos y configuración es común;
- cada área puede tener su propia base o backend autorizado;
- lo común se comparte mediante paquetes exportables/importables, no necesariamente mediante una base central única;
- si en el futuro el SES asume una instancia corporativa central, el modelo podrá migrar hacia multi-tenant físico.

---

## 4. Por qué NO empezar con una base central multi-tenant

Una base central multi-tenant es atractiva técnicamente, pero exige una gobernanza institucional clara.

En el contexto actual, una base común para varias áreas sanitarias plantearía preguntas no resueltas:

- quién es el titular de la cuenta o infraestructura;
- quién gobierna la capa común;
- quién valida cambios transversales;
- quién administra permisos;
- quién responde ante seguridad, auditoría y soporte;
- quién decide qué configuración es común y qué configuración es local.

Hasta que exista una gobernanza corporativa explícita, no se propone una base de datos central compartida entre áreas.

Se propone un modelo federado:

```text
Código común
+ esquema común
+ diccionario común
+ paquetes de configuración interoperables
+ bases separadas por área sanitaria
```

---

## 5. Modelo federado propuesto

```text
Hub Clínico-Farmacéutico PROMueve FH

Código común
├── componentes UI
├── motor de formularios
├── motor de filtros
├── repository layer
├── motor de exportación
└── reglas de seguridad clínica

Esquema común
├── variables
├── formularios
├── catálogos
├── filtros guardados
├── roles y permisos
├── plantillas de exportación
└── widgets de dashboard

Despliegues separados
├── BD / backend Área Badajoz
├── BD / backend Área Mérida
├── BD / backend Área Cáceres
└── otros despliegues autorizados

Intercambio
├── exportar configuración
├── revisar / validar
└── importar configuración
```

---

## 6. Qué puede vivir en el control plane

El control plane puede alojar configuración no-paciente, por ejemplo:

- filtros poblacionales guardados;
- vistas operativas del servicio;
- catálogos locales de fármacos especiales;
- fármacos en ensayo clínico;
- fármacos de uso compasivo;
- medicación extranjera;
- profesionales del servicio;
- roles y permisos;
- feature flags por área;
- plantillas de exportación;
- definiciones de formularios declarativos;
- diccionario de variables;
- widgets de dashboard;
- configuración de módulos por servicio, patología o rol.

Ejemplos de tablas o entidades:

```text
config_tenants
config_variables
config_forms
config_form_versions
config_saved_views
config_export_templates
config_dashboard_widgets
config_professionals
config_roles
config_permissions
tenant_drug_catalog
tenant_clinical_trials
tenant_compassionate_use_drugs
tenant_foreign_meds
tenant_feature_flags
config_audit_log
```

---

## 7. Qué NO debe vivir en el control plane sin autorización institucional

No deben almacenarse en esta capa, salvo marco institucional claro y backend autorizado:

- datos clínicos individuales de paciente;
- respuestas de formularios vinculadas a paciente;
- tratamientos reales de paciente;
- visitas, validaciones, seguimientos o resultados;
- resultados de cohortes ejecutadas con identificadores individuales;
- exportaciones clínicas identificables o pseudonimizadas;
- cualquier dato que permita reconstruir actividad clínica individual.

Diferencia clave:

```text
Guardar la definición de un filtro = configuración.
Guardar qué pacientes cumplen ese filtro = dato clínico/operativo sensible.
```

---

## 8. Filtros poblacionales guardados

Los filtros guardados deben almacenar criterios, no resultados.

Ejemplo conceptual:

```json
{
  "name": "Cosentyx q14d · inicios mes anterior",
  "module": "pharmacy_population_dashboard",
  "criteria": {
    "drug_brand": "Cosentyx",
    "administration_interval_days": 14,
    "treatment_start": {
      "mode": "previous_calendar_month"
    }
  },
  "export_template": "ministerial_rebate_report_v1"
}
```

Al ejecutar el filtro:

```text
1. La app carga la definición del filtro desde el control plane.
2. La app carga los datos clínicos desde el backend clínico autorizado.
3. El filtro se aplica sobre el backend clínico, no sobre la base de configuración.
4. El reporte se genera según plantilla y reglas de gobernanza.
5. El resultado no se persiste en el control plane salvo autorización expresa.
```

### Regla clínica sobre dosificación

La expresión informal “doble dosis” no debe modelarse como dato estructurado.

Debe usarse un dato objetivo, por ejemplo:

```text
administration_interval_days = 14
frecuencia_administracion = cada 14 días
```

El sistema no debe inferir dosis, vía, pauta, presentación, inducción ni intervalo de administración desde el nombre del fármaco o desde el catálogo.

El catálogo ayuda a seleccionar/normalizar fármacos, pero no decide datos terapéuticos.

---

## 9. Catálogo farmacológico dual y capa local

El catálogo farmacológico debe distinguir:

```text
1. Capa global regenerable
   Fuente oficial / CIMA / catálogo común.

2. Capa local por área sanitaria
   Ensayos clínicos, uso compasivo, medicación extranjera, protocolos locales,
   fármacos no normalizados o situaciones especiales.
```

La capa local debe ser editable por perfiles autorizados de Farmacia del área sanitaria.

No debe depender de GitHub ni requerir permisos de escritura en el repositorio.

El patrón esperado es:

```text
CIMA global
→ sincronización automática central / artefacto global

Catálogo local del área
→ editable en backend del área

App
→ combina ambas capas según área sanitaria activa
```

---

## 10. Formularios declarativos versionados

El control plane puede alojar definiciones de formularios en JSON.

Estos formularios no contienen respuestas de pacientes. Solo definen estructura, campos, validaciones, obligatoriedad, visibilidad y relación con variables clínicas.

Ejemplo conceptual:

```json
{
  "form_id": "inicio_biologico_reuma_ar_v1",
  "service": "Reumatología",
  "pathology": "AR",
  "visit_type": "Inicio biológico",
  "version": "1.0.0",
  "status": "draft",
  "sections": [
    {
      "title": "Tratamiento solicitado",
      "fields": [
        {
          "field_id": "drug_requested",
          "label": "Fármaco solicitado",
          "type": "drug_autocomplete",
          "variable_id": "treatment.drug.requested",
          "required": true
        },
        {
          "field_id": "administration_interval_days",
          "label": "Intervalo de administración",
          "type": "select",
          "variable_id": "treatment.administration_interval_days",
          "options": [
            { "label": "Cada 14 días", "value": 14 },
            { "label": "Cada 28 días", "value": 28 }
          ]
        }
      ]
    }
  ]
}
```

### Estados mínimos del formulario

```text
Draft / borrador
Validated locally / validado localmente
Published / publicado
Archived / archivado
```

### Metadatos obligatorios

```text
form_id
service
pathology
visit_type
version
status
author
clinical_validator
published_at
schema_json
```

---

## 11. Diccionario de variables

No se deben crear formularios como JSON aislados sin conexión con un diccionario de variables.

Cada campo explotable debe mapearse a una variable estable.

Ejemplo:

```json
{
  "field_id": "basdai_total",
  "label": "BASDAI total",
  "type": "number",
  "variable_id": "reuma.basdai.total",
  "unit": "0-10",
  "required": false,
  "dashboard": {
    "widget": "trend_line",
    "group": "actividad"
  }
}
```

Regla:

```text
Ningún formulario publicado debe generar datos explotables si sus campos no están
mapeados a un diccionario de variables o marcados explícitamente como texto libre/no explotable.
```

Esto evita que el Hub se convierta en un formulario flexible pero analíticamente inútil.

---

## 12. Dashboard basal y dashboard específico

### 12.1. Dashboard basal genérico

Cuando se crea una nueva patología, el sistema debe poder mostrar una capa basal común:

```text
Resumen del paciente
Tratamientos activos
Línea temporal
Últimas visitas
Formularios completados
Pendientes
Alertas
Exportaciones disponibles
Observaciones
```

Esta capa no depende de una patología concreta.

### 12.2. Dashboard específico configurable

Los elementos específicos de patología deben definirse mediante widgets declarativos.

Ejemplo conceptual:

```json
{
  "dashboard_widgets": [
    {
      "type": "timeline",
      "title": "Evolución clínica"
    },
    {
      "type": "score_trend",
      "title": "BASDAI",
      "variable_id": "reuma.basdai.total"
    },
    {
      "type": "latest_value",
      "title": "Adherencia",
      "variable_id": "farmacia.adherence.status"
    }
  ]
}
```

El sistema no debe inventar significado clínico. Solo debe representar variables, reglas o widgets explícitamente definidos y validados.

---

## 13. Paquetes exportables/importables de configuración

Para compartir configuraciones entre áreas sanitarias sin depender de una base central, se propone un sistema de paquetes.

Ejemplos:

```text
saved_view_cosentyx_q14d_v1.json
form_inicio_biologico_reuma_v1.json
dashboard_fh_basico_v1.json
export_template_ministerial_v1.json
variables_reuma_core_v1.json
```

Un paquete debe declarar:

```text
package_type
package_version
name
description
requires_schema_version
requires_variables
requires_catalogs
created_by
validated_by
payload
```

Al importar, el sistema debe comprobar:

```text
¿La versión de esquema es compatible?
¿Existen las variables requeridas?
¿Existen los catálogos requeridos?
¿El usuario tiene permiso para importar?
¿Requiere validación clínica local antes de publicar?
```

---

## 14. Gobernanza

Principios propuestos:

1. Hasta que exista una gobernanza corporativa explícita, no se plantea una base central compartida entre áreas.
2. Cada área sanitaria puede tener su propia persistencia autorizada.
3. El conocimiento común se comparte como esquema, diccionario y paquetes de configuración.
4. Toda configuración publicada debe tener trazabilidad de autor, versión y validador.
5. Los cambios locales no deben romper compatibilidad con el esquema común.
6. Los permisos no deben implementarse solo como controles visuales de frontend.
7. Las acciones relevantes deben quedar registradas en auditoría.

---

## 15. Repository layer y desacoplamiento de backend

El dominio de la app no debe quedar acoplado a Supabase, Neon, Firebase, AWS, SharePoint, Excel o una API concreta.

Debe existir una capa repository capaz de abstraer:

```text
ClinicalRepository
ConfigRepository
CatalogRepository
FormRepository
SavedViewRepository
ExportTemplateRepository
UserPermissionRepository
```

Así, durante MVP se puede trabajar con Excel/JSON/localStorage o un backend cloud de laboratorio, pero el diseño no queda bloqueado.

---

## 16. Fases propuestas

### V4 actual — Local-first / Excel

- Excel como backend clínico provisional.
- App estática HTML/CSS/JS.
- Formularios codificados en la app.
- Catálogos básicos y carga local.

### V4.6 — Control Plane Federado

- Separación formal entre datos de paciente y configuración.
- Backend de configuración no-paciente.
- Modelo federado por área sanitaria.
- Catálogos locales especiales.
- Filtros guardados.
- Profesionales, roles y permisos iniciales.
- Paquetes exportables/importables.

### V4.7 — Formularios declarativos iniciales

- Definición JSON de formularios simples.
- Versionado y estados de publicación.
- Mapeo de campos a diccionario de variables.
- Validación local antes de publicar.
- Primer motor de renderizado de formularios configurables.

### V5 — Hub agnóstico configurable

- Configuración por servicio, patología, visita, rol y formulario.
- Dashboard basal + dashboards específicos por widgets.
- Plantillas de indicadores y reportes.
- Motor de recorrido asistencial.
- Multipatología real.
- Backend clínico autorizado y escalable.

### Futuro corporativo

- Posible instancia central SES multi-tenant si Salud Digital/STIC asume gobernanza.
- Migración desde despliegues federados gracias a esquema común, versiones, tenant_id y paquetes de configuración.

---

## 17. No toca en fase inicial

Esta propuesta no autoriza todavía:

- modificar la validación clínica de demo;
- cambiar la persistencia clínica actual;
- subir datos clínicos de paciente a cloud;
- tocar CIMA/autoload sin work order específica;
- dar permisos de escritura en GitHub a equipos clínicos para mantener catálogos;
- crear una base central multi-área sin dueño institucional;
- introducir formularios libres sin diccionario de variables;
- inferir dosis, vía, pauta, presentación, inducción o intervalo desde el nombre del fármaco.

---

## 18. Criterios de aceptación futuros para V4.6

Una implementación inicial de V4.6 debería cumplir:

```text
1. Existe un ConfigRepository desacoplado del backend clínico.
2. Los filtros guardados se almacenan como criterios, no como resultados.
3. El catálogo local especial se gestiona por área sanitaria.
4. Los profesionales, roles y permisos se cargan desde configuración.
5. La app puede importar/exportar un paquete de configuración.
6. Ningún dato de paciente se persiste en el control plane.
7. Las acciones críticas quedan auditadas.
8. La configuración incluye versión, tenant/área, estado y trazabilidad.
9. El sistema mantiene compatibilidad con el modo local-first/Excel.
10. La separación paciente/configuración queda documentada y testada.
```

---

## 19. Resumen ejecutivo

La evolución recomendada no es pasar directamente de Excel a una base central multi-tenant.

La propuesta es construir una fase intermedia:

```text
Modelo federado por área sanitaria,
con software común,
esquema común,
diccionario común,
control plane de configuración,
y paquetes exportables/importables.
```

Esto permite autonomía local sin perder homogeneidad, reduce el riesgo de gobernanza prematura y prepara la herramienta para convertirse en un Hub agnóstico configurable.

La regla de seguridad principal es:

```text
La configuración puede vivir fuera del backend clínico;
los datos de paciente deben permanecer en el backend clínico autorizado.
```
