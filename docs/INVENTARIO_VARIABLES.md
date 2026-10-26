# INVENTARIO DE VARIABLES POR HOSPITAL (27-10-2026)

Documento **vivo**: herramienta para las sesiones de revisión de proceso (Mérida empezó el 26-10; Badajoz empieza el 06-11). No es un diccionario de variables de producto: eso espera a las decisiones clínicas (orden: revisión de proceso → decisiones → contrato por módulo → diccionario → configuración).

Base del código: `promueve/nexus-v4@6eaa3a4`. Hasta ahora **todo es core**; lo marcado «core provisional» tiene origen en un hospital concreto y se revisará al llegar la primera variación.

**Estados por hospital:** `teórica` (diseñada sin validar con el equipo) · `en evaluación` · `validada` · `revisada` · `n/a`. Columnas: CAC = Cáceres, MER = Mérida, BAD = Badajoz.

## 1. Elementos fijos con origen en un hospital (core provisional)

| Elemento | Módulo | Dónde está (verificado) | Origen | CAC | MER | BAD |
|---|---|---|---|---|---|---|
| PROMs de seguimiento fijos «Sí, recoger DLQI + EVA dolor/prurito» (HS fijo; la idea de PROMs por patología sigue pendiente) | Farmacia · Seguimiento | `farmacia_seguimiento.html:313`, `scripts/farmacia_seguimiento.js:3633` | CAC | en evaluación (snapshot 0.6) | teórica | teórica |
| Patologías de Dermatología en Validación (Dermatitis atópica, Hidradenitis supurativa, Psoriasis) | Farmacia · Validación | `farmacia_validacion.html` (líneas ~212–254) | CAC | en evaluación | n/a | n/a |
| Texto «Hub Clínico Badajoz — Demo Farmacia v0.2» fijo en salidas TXT y pantallas | Farmacia · Validación, Primera Visita, Seguimiento, Índice, Dashboard, Fármacos, Profesionales | `farmacia_*.html`, `scripts/farmacia_primera_visita.js` y otros | CAC / demo | n/a | n/a | n/a (texto de demo, no de hospital) |
| «Hospital Universitario de Badajoz» fijo | Reuma · Índice | `reuma_index.html` | BAD | n/a | n/a | teórica |
| Circuito FH de Cáceres como modelo del flujo de Farmacia | Farmacia | informe Cáceres v5 (fuera del repo); `docs/ops/PROMUEVE_REQUIREMENTS_TRACEABILITY_20261011.md` | CAC | en evaluación | teórica | teórica |
| Perfil de despliegue único `BAD` sintético | Plataforma | `data/platform/home/deployment-profile.json`, `deployment-manifest.json` | — | no existe perfil | no existe perfil | sintético |

## 2. Variables a decidir por hospital (preguntas para las sesiones de proceso)

| Variable | Módulo | Qué hay hoy | Pregunta | CAC | MER | BAD |
|---|---|---|---|---|---|---|
| Unidad de PCR | Reuma | Valores que constan como autoridad de Sil: BAD mg/dL; MER y CAC mg/L. Sin fuente versionada | ¿Confirmar por hospital con fuente? | teórica | teórica | teórica |
| BASFI | Reuma | Faltan ítems y fórmula autorizados | ¿Qué ítems y fórmula? | n/a | teórica | teórica |
| LES, Sjögren | Reuma | Plantillas existentes, sin decisión del equipo | ¿Qué recogen los equipos? | n/a | teórica | teórica |
| Etiquetas DLQI / IHS4 / HAQ del Quick View | Farmacia | Cortes del Quick View distintos de los de Sil (ver `docs/PREGUNTAS_ABIERTAS.md`) | ¿Qué cortes y fuente? | en evaluación | n/a | n/a |
| Recogidas pendientes (ventana, frecuencia, destinatario) | Farmacia | Sin implementar (OCT-OPEN-001…003) | ¿Qué proceso? | pendiente | pendiente | pendiente |
| Terminología de EA (MedDRA/CTCAE/ambos) | Farmacia (EA) | PR #778 propone configurable por hospital/servicio | ¿Qué usa cada hospital? | por la reunión 27-10 | pendiente | pendiente |
| Qué variaciones Badajoz↔Mérida se configuran | Plataforma | OCT-OPEN-007 | Tras las revisiones de proceso | n/a | pendiente | pendiente |
| Orden de CIP / identidad de paciente | Plataforma | Sintético | ¿Qué identificadores admite cada SES? | pendiente | pendiente | pendiente |

## 3. Formatos de salida (conteo de columnas)

| Formato | Columnas | Estado |
|---|---|---|
| WO8 (Excel operativo FH) | 62 | Salida operativa actual |
| Export V2 | 152 | Demo paralela |
| Bridge raw EA 0..N | 166 | Publicado como copia en Seguimiento (C2b, #850); lector/guardar-reabrir pendientes (C3) |
| Reuma (compatibilidad) | 497 | Salida de Reuma; no hay destino Bridge/Processor |

## Cómo mantenerlo

En cada sesión de proceso (Mérida, Badajoz), actualizar los estados de las columnas CAC/MER/BAD con lo que el equipo confirme, citando la sesión y la fecha. Cuando un elemento pase a variar por hospital, Sil decide si es vertical o core y se registra en `docs/DECISIONES.md`.
