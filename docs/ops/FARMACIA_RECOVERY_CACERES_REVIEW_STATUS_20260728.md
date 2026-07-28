# Estado actual — Farmacia recovery y evaluación Cáceres

**Fecha:** 2026-07-28  
**Estado documental:** `current_published_evaluation_state`  
**Repositorio:** `b32majus/Hub-Clinico-Badajoz`  
**Rama regional publicada:** `recovery/farmacia-pr-replay-20260727`  
**HEAD regional publicado:** `cd258e76dad76d2abf1dfd0cb9f11f086516236e`

---

## 1. Propósito

Este documento fija la foto operativa vigente del módulo de Farmacia Hospitalaria tras:

- recuperación y consolidación del desarrollo regional;
- integración del dashboard longitudinal por visita y línea;
- integración de Validación Dermatología multipatología;
- generación y publicación del snapshot estable de evaluación para Cáceres;
- envío del entorno de evaluación a las farmacéuticas del Hospital Universitario de Cáceres.

No sustituye los contratos clínicos ni convierte la demo en piloto real.

---

## 2. Fuentes de verdad actuales

| Elemento | Fuente de verdad | Estado |
|---|---|---|
| Código regional Farmacia | `recovery/farmacia-pr-replay-20260727` | Publicado para pruebas y evolución regional |
| HEAD regional | `cd258e76dad76d2abf1dfd0cb9f11f086516236e` | Vigente a 2026-07-28 |
| Snapshot Cáceres | `previews/caceres-fh/` | Publicado y compartido para evaluación |
| Manifest del snapshot | `previews/caceres-fh/deployment-manifest.json` | Registra versión, SHA fuente, allowlist y hashes |
| Versión Cáceres | `CÁCERES-REVIEW-0.1` | Congelada hasta promoción explícita |
| SHA fuente del snapshot | `ce88818be931b0b008890fede19257530fca10c6` | Fuente clínica/funcional del bundle Cáceres |
| Índice documental | `docs/INDEX.md` | Debe apuntar a este estado vigente |
| Tablero de WOs | `docs/ops/WORK_ORDER_STATUS.md` | Trazabilidad de implementación y merges |

La rama histórica `preview/demo-lunes-wo4-20260614` deja de ser la referencia publicada vigente. Se conserva como evidencia histórica y punto de comparación, no como base de trabajo actual.

---

## 3. URLs operativas

### Versión regional para pruebas y evolución

`https://b32majus.github.io/Hub-Clinico-Badajoz/farmacia_index.html`

- sigue el contenido fusionado en `recovery/farmacia-pr-replay-20260727`;
- puede evolucionar tras nuevas PRs aprobadas;
- no es un entorno productivo ni un piloto real.

### Versión estable para Farmacia Cáceres

`https://b32majus.github.io/Hub-Clinico-Badajoz/previews/caceres-fh/`

- entrada directa al Hub de Farmacia;
- sin gate ni navegación de Reumatología;
- branding Hospital Universitario de Cáceres / Área de Salud de Cáceres;
- perfil compartido `Profesional FH — Entorno de evaluación`;
- aviso permanente de datos exclusivamente sintéticos;
- no cambia con el desarrollo regional salvo promoción explícita de una nueva versión.

---

## 4. Integraciones cerradas en recovery

| Issue / WO | PR | Resultado | Merge |
|---|---|---|---|
| #172 — dashboard longitudinal por visita y línea | #173 | Integrada | `712b413e3ab0f011282fe93134f63858dcb4f9ae` |
| #174 — Validación Dermatología multipatología | #175 | Integrada | `ce88818be931b0b008890fede19257530fca10c6` |
| #176 — snapshot Pharmacy-only Cáceres | #177 | Integrada | `cd258e76dad76d2abf1dfd0cb9f11f086516236e` |

Los tres issues están cerrados como completados.

---

## 5. Estado funcional demostrado

### Regional

- Inicio Farmacia y búsqueda por CIP demo.
- Validación farmacoterapéutica.
- Validación Dermatología para:
  - hidradenitis supurativa;
  - psoriasis;
  - dermatitis atópica;
  - vitíligo;
  - alopecia areata.
- Primera Visita.
- Seguimiento con varias líneas terapéuticas.
- efectos adversos y causalidad por fármaco sospechoso;
- Naranjo y Karch-Lasagna;
- dashboard paciente y longitudinal por `visit_id + line_id`;
- actividad y estadísticas;
- catálogo CIMA/local con autocomplete;
- carga opcional de Excel sintético de Enfermería y Farmacia;
- generación de salida TXT para registro en JARA;
- exportadores estructurados existentes, todavía pendientes de adaptación funcional definitiva a todos los formularios.

### Snapshot Cáceres

Demostrado mediante interacción soportada en navegador:

- entrada directa a Farmacia;
- ausencia de gate y navegación Reumatología;
- identidad Cáceres y perfil compartido;
- búsqueda de `CIP-DEMO-FH-004`;
- dashboard y seguimiento multilínea;
- cinco patologías Dermatología con salida JARA;
- Primera Visita;
- recarga directa de páginas internas;
- consola, `pageerror` y errores HTTP locales: 0.

Checks asociados:

- focal snapshot: 14/14;
- smoke Farmacia: 48/48;
- QA navegador: 12/12;
- CI GitHub de PR #177: success.

---

## 6. Entrega a Farmacia Cáceres

El 2026-07-28 se envió a las farmacéuticas:

1. URL estable `CÁCERES-REVIEW-0.1`;
2. guía rápida de evaluación de dos páginas;
3. Excel sintético de Enfermería para probar el circuito de entrada;
4. correo con alcance y puntos de revisión.

La guía y el Excel enviados son materiales de evaluación externa y no se declaran aquí como contratos canónicos del repositorio.

---

## 7. Revisión solicitada a las farmacéuticas

La revisión se acota a piezas ya visibles y utilizables:

- adecuación de Primera Visita y Seguimiento para patologías distintas de HS;
- bloques clínicos de Validación Dermatología multipatología;
- comorbilidades relevantes para selección y seguridad del tratamiento:
  - infecciones recurrentes;
  - riesgo cardiovascular;
  - alteraciones neurológicas;
  - antecedentes o riesgo de neoplasia;
- búsquedas de medicamentos y presentaciones mediante CIMA;
- catálogo de pautas y opción `Otra pauta`;
- longitud y contenido de los TXT generados para JARA en Validación, Primera Visita y Seguimiento;
- coherencia conceptual del recorrido Validación → Primera Visita → Seguimiento → Dashboard;
- utilidad del modelo multifármaco/multilínea;
- claridad del dashboard longitudinal;
- usabilidad general y errores observados;
- revisión específica con Luis Carlos de Naranjo y Karch-Lasagna, evaluación por sospechoso y contenido a registrar en JARA.

No se solicita todavía validar:

- persistencia longitudinal real;
- continuidad completa generada desde exportadores estructurados;
- Excel/CSV definitivo;
- autenticación;
- permisos;
- uso multiusuario;
- seguridad productiva.

El estudio prebiológico ya había sido revisado con Farmacia y no forma parte de esta ronda de deberes.

---

## 8. Limitaciones y frontera de seguridad

El estado actual sirve para:

- demo funcional;
- evaluación clínica y de usabilidad con datos sintéticos;
- identificación de ajustes antes de una futura definición de piloto.

No sirve todavía para:

- asistencia clínica real;
- introducir datos reales de pacientes;
- uso persistente o multiusuario;
- autenticación y permisos reales;
- trazabilidad productiva;
- integración JARA/SES/Farmatool;
- considerar los Excel/CSV como contrato definitivo;
- declarar piloto operativo o producto sanitario.

Tratamiento solicitado no equivale a tratamiento validado. Los datos ausentes permanecen vacíos o `No informado`. El catálogo identifica medicamentos y presentaciones, pero no debe inferir dosis, vía, pauta, inducción ni duración desde el nombre del fármaco.

---

## 9. Pendientes reales siguientes

1. Recoger feedback de Farmacia Cáceres.
2. Consolidar decisiones sobre campos de Primera Visita y Seguimiento por patología.
3. Cerrar comorbilidades Dermatología y su presencia en JARA/dashboard.
4. Ajustar los TXT JARA según práctica real.
5. Revisar CIMA, presentaciones y pautas con casos habituales y especiales.
6. Validar causalidad con Luis Carlos.
7. Adaptar exportadores estructurados a los formularios antes de pedir su validación.
8. Mantener el snapshot Cáceres congelado; cualquier actualización requiere promoción explícita desde un nuevo SHA aprobado.
9. Abordar seguridad, persistencia, autenticación y backend en una fase separada de piloto/arquitectura.

---

## 10. Regla operativa

```text
Ramas work → QA → PR → merge en recovery → versión regional

Nuevo SHA regional aprobado → regeneración explícita → nueva versión Cáceres
```

No editar manualmente `previews/caceres-fh/`: es una salida generada y trazable.
