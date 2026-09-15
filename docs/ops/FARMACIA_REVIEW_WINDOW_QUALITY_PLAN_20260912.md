# PROMueve Farmacia — Plan de calidad durante la ventana de revisión externa

**Fecha:** 2026-09-12
**Estado:** PLAN ACTIVO / READ-ONLY FIRST
**Issue:** #353
**Rama objetivo:** `recovery/farmacia-pr-replay-20260727`
**Base verificada:** `5150eab2e02ac029aff0cec021b35722725ff318`
**Último HEAD de producto publicado:** `19d10c9abefb7b25130b4b17e3289d54a17315ee`
**HEAD clínico funcional congelado:** `e1120ba85817a1807cea8c1e938867ad778921f4`
**Superficie genérica publicada para auditoría:** `https://b32majus.github.io/Hub-Clinico-Badajoz/farmacia_index.html`
**Snapshot externo estable en revisión:** `CÁCERES-REVIEW-0.6`

## 1. Contexto

Las farmacéuticas están revisando actualmente `CÁCERES-REVIEW-0.6`. Esa vertical es un snapshot/customización hospitalaria de evaluación y permanecerá congelada durante la revisión. **No es la baseline funcional de las auditorías internas.**

La autoridad de producto para Track A y Track B es la superficie genérica publicada desde `recovery/farmacia-pr-replay-20260727`, servida por Pages en `https://b32majus.github.io/Hub-Clinico-Badajoz/farmacia_index.html`. El 2026-09-12 se verificó HTTP 200 y equivalencia de contenido con `farmacia_index.html` de recovery tras normalización EOL. Cualquier discrepancia futura entre superficie genérica y snapshot Cáceres se tratará como hallazgo; la rama genérica canónica prevalece para evolución del producto.

La funcionalidad clínica central está suficientemente avanzada para desplazar temporalmente el foco desde nuevas expansiones clínicas hacia calidad de producto, reducción de fricción, retirada progresiva de residuos demo y cierre de decisiones de arquitectura V4.

Este plan organiza tres auditorías read-only que deben preceder a nuevas WOs de implementación. Su objetivo no es abrir un refactor amplio, sino producir evidencia suficiente para dividir después el trabajo en WOs pequeñas, seguras y trazables.

## 2. Reglas de coordinación

1. La baseline de auditoría/evolución es `recovery/farmacia-pr-replay-20260727` + su superficie genérica publicada en Pages; no `CÁCERES-REVIEW-0.6`.
2. `CÁCERES-REVIEW-0.6` permanece congelada exclusivamente como snapshot hospitalario de evaluación mientras dure la revisión externa.
3. No se considera una issue abierta histórica como backlog funcional por el mero hecho de seguir OPEN.
4. Tests verdes, presencia en código y QA manual son evidencias distintas.
5. Los datos sintéticos útiles para QA se conservan; lo que debe desaparecer es su acoplamiento al runtime operativo.
6. UX, limpieza runtime, arquitectura de persistencia y funcionalidad clínica no se mezclarán en una macro-WO.
7. Ninguna decisión futura de V4.5/V5 se adelantará por comodidad si no resuelve una necesidad demostrada de V4.
## 3. Track A — Reconciliación de backlog y roadmap

**Objetivo:** convertir documentación histórica, issues y estado publicado en un backlog vivo limpio.

Cada pendiente se clasificará por dos ejes:

- estado: `REAL_PENDING`, `SUPERSEDED`, `ADMIN_ONLY`, `FUTURE_ARCHITECTURE`;
- momento: `NOW`, `AFTER_PHARMACY_FEEDBACK`, `BEFORE_PILOT`, `V4_5`, `V5`.

La revisión debe cubrir como mínimo deuda clínica/funcional, UX, Activity, CIMA, persistencia/roundtrip, autenticación/permisos, Identity Plane, diccionario regional de patologías, Digestivo y cualquier deuda técnica que siga imponiendo coste real.

No se reabrirán tareas ya resueltas por A/B/C, Unified Clinical Intake, PreSalud u otras evoluciones solo porque exista una issue histórica abierta.

**Salida:** informe único de backlog reconciliado con evidencia exacta y orden de ejecución recomendado.

## 4. Track B — UX/UI funcional y deuda runtime/demo

### 4.1 Primera pasada de Cora

Cora realizará primero un baseline técnico y de navegador. La auditoría buscará fricción real, no estética decorativa:

- pasos redundantes y decisiones repetidas;
- información duplicada o fuera de jerarquía;
- estados/conflictos/feedback poco claros;
- superficies legacy aún visibles;
- rutas que obligan a cambiar de contexto sin necesidad;
- estados vacíos y error recovery;
- hardcodes, fallbacks y fixtures demo que contaminan el runtime;
- dependencias entre pantallas que dificulten retirar esas piezas.
### 4.2 Clasificación obligatoria de datos sintéticos

Cada dato o caso sintético encontrado se etiquetará como una de estas categorías:

- `QA_FIXTURE_KEEP`: fixture determinista que debe conservarse para regresión;
- `EVALUATION_DATASET_KEEP`: dataset sintético explícito para evaluación/demo;
- `RUNTIME_DEMO_REMOVE`: dato demo visible o activo dentro del runtime normal;
- `LEGACY_FALLBACK_REMOVE`: fallback histórico que altera el comportamiento del producto;
- `DECISION_REQUIRED`: no retirar hasta confirmar su función real.

La limpieza no consistirá en borrar FH-001/FH-004 o profesionales demo a ciegas. Primero se separará su función de test de cualquier fallback operativo y solo después se propondrán WOs atómicas de retirada.

### 4.3 Orden de recorrido UX

Primero se audita el camino clínico principal:

`Inicio -> Validación -> Primera Visita -> Seguimiento -> Dashboard Paciente -> Longitudinal`

Después: Estadísticas, Activity, Profesionales, Fármacos y superficies auxiliares.

La auditoría debe distinguir explícitamente entre entrada clínica, propuesta del parser, resumen, validación, navegación y salida/exportación para no eliminar como "duplicado" dos superficies con funciones diferentes.

### 4.4 Revisión manual de Sil

Tras el baseline de Cora, Sil recibirá una checklist dirigida con hallazgos y preguntas concretas. La revisión manual interna se realizará sobre la **superficie genérica publicada** mediante interacción soportada y servirá para confirmar, rechazar o matizar los hallazgos UX. `CÁCERES-REVIEW-0.6` queda reservada para la evaluación externa de las farmacéuticas; no se usa como autoridad para decidir evolución del producto.

**Salida:** informe reconciliado Cora + Sil antes de abrir WOs de implementación.
## 5. Track C — Microsoft V4 readiness antes del 2026-09-15

### 5.1 Estado que se considera vigente

- Office Scripts: viables según evidencia de campo comunicada por Sil en Microsoft 365 SES.
- Excel Bridge: arquitectura V4 vigente.
- Processor Office Script, tablas/vistas `APP_*`, Excel Read Adapter y roundtrip: no publicados todavía como producto integrado.
- Power Automate: capa opcional de automatización; PoC HTML pendiente.
- SharePoint Lists: evidencia preliminar favorable; `PENDING_CONFIRMATION` hasta prueba final.
- Supabase: candidato sustituible para Control Plane no-paciente, no obligación tecnológica.

### 5.2 Checklist de decisión para la reunión del martes

1. HTML externo -> Power Automate mediante interacción autorizada.
2. Power Automate -> Office Script sobre workbook SES.
3. Payload sintético completo: HTML -> flujo -> script -> fila raw -> tablas/vistas.
4. Respuesta al HTML: síncrona/asíncrona, éxito/error e identificador de acto.
5. Autenticación e identidad Microsoft efectiva del usuario.
6. Concurrencia e idempotencia con dos escrituras próximas/simultáneas.
7. Reintentos, timeouts, doble escritura y recuperación tras fallo.
8. SharePoint Lists: creación, permisos, lectura/escritura, lookup/relaciones, auditoría y límites.
9. Viabilidad de SharePoint Lists para profesionales/roles/configuración no-paciente.
10. Ubicación, versionado, backup y recuperación de Excel/Listas.
11. Restricciones SES: CORS, CSP, endpoints, HTTP, popups y navegador.
12. Necesidad real —o no— de intervención de Sistemas para cada pieza.

No se cerrará una arquitectura por intuición: cada punto se marcará `PROVEN`, `PARTIAL`, `NOT_PROVEN` o `BLOCKED` con evidencia.
## 6. Orden de trabajo y reparto Cora / Sil

### Fase 1 — Cora

Completar Track A y baseline del Track B. No pedir a Sil una auditoría manual abierta antes de tener un mapa de fricción y una checklist dirigida.

### Fase 2 — Trabajo en paralelo

- Sil: revisión manual UX/UI de la superficie genérica publicada con la checklist dirigida.
- Cora: Track C, revisión de arquitectura Microsoft publicada y preparación de preguntas/pruebas para 2026-09-15.

### Fase 3 — Reconciliación

Tras la reunión Microsoft y el feedback de Farmacia, fusionar evidencia técnica, UX manual y feedback externo en un backlog priorizado.

### Fase 4 — Implementación posterior

Abrir WOs pequeñas y separadas. Posibles familias: UX/fricción, retirada de runtime demo, profesionales/roles, catálogo demo, CIMA, persistencia/roundtrip, Microsoft automation, autenticación/Identity Plane, Activity y expansión de diccionarios/patologías.

## 7. Límites

Este plan no autoriza cambios funcionales, promoción 0.7, cambios en `main`, datos reales, implementación de backend, Supabase/Neon/PostgreSQL, Office Script, Power Automate, SharePoint Lists ni V5.

No se tocará la URL de evaluación de Cáceres mientras las farmacéuticas estén revisando 0.6. Las auditorías internas y cualquier futura corrección se basarán primero en la rama/superficie genérica publicada; solo una promoción hospitalaria posterior y explícita podrá trasladar cambios a Cáceres.

## 8. Entregables previstos

1. `FARMACIA_BACKLOG_ROADMAP_RECONCILIATION_202609xx.md`.
2. `FARMACIA_UX_RUNTIME_DEBT_AUDIT_202609xx.md`.
3. `FARMACIA_MICROSOFT_V4_READINESS_20260915.md`.
4. Checklist manual UX para Sil.
5. Backlog reconciliado post-feedback con orden de WOs.

Las rutas definitivas se crearán solo en sus WOs documentales correspondientes; estos nombres son identificadores de salida previstos, no archivos ya existentes.

## 9. Criterio de cierre de esta ventana

La ventana queda suficientemente estudiada cuando existe una verdad reconciliada sobre: qué deuda sigue viva, qué fricción confirma Sil/Farmacia, qué elementos demo deben salir del runtime, qué arquitectura Microsoft está realmente disponible en SES y qué cambios son necesarios antes de piloto frente a V4.5/V5.

Hasta entonces, la prioridad es obtener evidencia y reducir incertidumbre, no aumentar superficie de producto.
