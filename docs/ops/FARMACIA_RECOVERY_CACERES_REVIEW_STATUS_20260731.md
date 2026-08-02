# Estado actual — Farmacia recovery, Cáceres 0.3 y evolución regional

| Metadato | Valor |
|---|---|
| Fecha de reconciliación | 2026-08-02 |
| Estado documental | `current_published_evaluation_state` |
| Repositorio | `b32majus/Hub-Clinico-Badajoz` |
| Rama regional publicada | `recovery/farmacia-pr-replay-20260727` |
| Base Git publicada de esta edición | `6ac041f8d5faa445140b32a7daccd3724dac3529` |
| Último SHA funcional regional | `6ac041f8d5faa445140b32a7daccd3724dac3529` |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.3` |
| SHA funcional fuente del snapshot | `815e16f9564c82f469a95745c5c6917593a8c3f0` |
| Merge de promoción | `96a4cb0b6df775dc5b391a05e87a313adb30a23f` |
| Uso autorizado por este documento | Evaluación con datos exclusivamente sintéticos |
| Piloto real / producción | No acreditados |

> Este documento sustituye como estado vivo a `FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`, que se conserva como fotografía histórica de `CÁCERES-REVIEW-0.1`.

---

## 1. Propósito

Fijar la situación publicada del módulo de Farmacia Hospitalaria después de:

- la recuperación del núcleo regional;
- la corrección definitiva del autocomplete CIMA en la entrada manual de Validación;
- la comprobación humana del recorrido en GitHub Pages;
- las promociones reproducibles a `CÁCERES-REVIEW-0.2` y `CÁCERES-REVIEW-0.3`;
- la reunión de feedback con Farmacia Hospitalaria del 2026-07-30;
- la apertura del plan de trabajo V4 para el periodo 2026-07-31 a 2026-08-15;
- la fusión de los quick wins de Validación mediante PR #193;
- la reconciliación documental y promoción a `CÁCERES-REVIEW-0.3` mediante PR #195/#197;
- la incorporación y posterior realineación del ledger/workbook sintético mediante PR #199/#201/#203;
- la corrección P0 de la verdad Excel de Primera Visita mediante PR #205;
- la publicación de la secuencia WO1–WO9 mediante PR #209;
- la publicación del núcleo canónico Export v2 mediante PR #211.

No sustituye contratos clínicos definitivos, no autoriza datos reales y no convierte la evaluación en piloto asistencial.

---

## 2. Fuentes de verdad

| Elemento | Fuente de verdad | Estado |
|---|---|---|
| Código regional de Farmacia | `recovery/farmacia-pr-replay-20260727` | Publicado para evolución y evaluación |
| Base Git publicada de esta edición | `6ac041f8d5faa445140b32a7daccd3724dac3529` | Incluye PR #195 a #211; PR #209 es documental y PR #211 publica el core no cableado |
| Último bundle funcional regional | `6ac041f8d5faa445140b32a7daccd3724dac3529` | Core Export v2 con tests contractuales PASS; sin integración HTML, navegador o Excel |
| Snapshot Cáceres | `previews/caceres-fh/` | Salida generada y estable |
| Manifest | `previews/caceres-fh/deployment-manifest.json` | Fuente de versión, SHA, allowlist y hashes |
| Versión estable Cáceres | `CÁCERES-REVIEW-0.3` | Snapshot explícitamente promovido; fuente `815e16f9...` |
| Plan vivo del siguiente ciclo | `FARMACIA_PLAN_VACACIONES_20260731.md` | Prioridad y secuencia operativa |
| Arquitectura objetivo | `../architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md` | Dirección V4; no aprobación institucional |
| Índice documental | `../INDEX.md` | Navegación documental |
| Tablero de WOs | `WORK_ORDER_STATUS.md` | Trazabilidad de ejecución |

La rama histórica `preview/demo-lunes-wo4-20260614` continúa como evidencia. No es la base publicada vigente.

---

## 3. URLs operativas

### Regional

`https://b32majus.github.io/Hub-Clinico-Badajoz/farmacia_index.html`

- sigue la rama regional publicada;
- puede evolucionar tras PRs aprobadas;
- sirve para QA y evaluación con datos sintéticos;
- no es producción ni piloto real.

### Cáceres estable

`https://b32majus.github.io/Hub-Clinico-Badajoz/previews/caceres-fh/`

- entrada directa a Farmacia;
- identidad Hospital Universitario de Cáceres / Área de Salud de Cáceres;
- perfil compartido de evaluación;
- aviso permanente de datos sintéticos;
- sin gate ni navegación de Reumatología;
- solo cambia mediante regeneración y promoción explícita.

---

## 4. Trazabilidad del cierre P0, la promoción y los quick wins

| Issue / WO | PR | Merge | Adjudicación real |
|---|---:|---|---|
| #182 — selección CIMA sin contexto | #183 | `ee1abd88cd52a298d9c1e63d93bdddd08b3e3a7e` | Restauró consumidores sin contexto y añadió regresiones |
| #184 — minifix manual solicitado | #185 | `5e70afa53a309186e54f812459d6f7521641c8d3` | Fusionada, pero no corrigió el defecto en la QA humana pública; superseded por #187 |
| #186 — clone del autocomplete funcional | #187 | `54f6bb2cc5cb9c46b4121e8148c00a065f1bca6c` | Corrección definitiva; QA humana regional PASS |
| #188 — promoción Cáceres 0.2 | #189 | `accac670ba216d8c291ee849d2198742d02bb3f0` | Snapshot regenerado, publicado y QA humana Cáceres PASS |
| #190 — estado, plan de vacaciones y arquitectura V4 | #191 | `9725bf60917ea07dc53162e700e86a1743537d3d` | Documentación viva publicada; no añadió capacidad funcional |
| #192 — quick wins de Validación Farmacia | #193 | `4801e9aafaea5e0b56106e9ca38d8bbb1a84b91e` | `Cada 3 semanas`, separación de observaciones, comorbilidades trivalentes y guard de CIP; en ese merge la promoción seguía pendiente |
| #194 — reconciliación documental de quick wins | #195 | `815e16f9564c82f469a95745c5c6917593a8c3f0` | Cierra el estado regional previo a promoción 0.3 |
| #196 — promoción Cáceres 0.3 | #197 | `96a4cb0b6df775dc5b391a05e87a313adb30a23f` | Snapshot `CÁCERES-REVIEW-0.3`, fuente `815e16f9...` |
| #198 — ledger sintético | #199 | `ac93575da6c07d9bf861baa5f1aa7a566d3877fd` | Persistencia local técnica; no piloto |
| #200 — workbook técnico | #201 | `25c751657f18f5825ad92144c3140a8736d6664f` | Workbook de 11 hojas; no Excel Bridge operativo |
| #202 — realineación de flujo | #203 | `6dcedff4c1b4ac60b79d0e7d3951aaebe9f6ae5e` | Flujo normal sin cohorte ficticia visible; QA pública PASS |
| #204 — Excel Primera Visita | #205 | `68b5383762f3ae747f567d49df2e80118c38fe16` | CIP y acto visible correctos; QA pública focal PASS |
| #206 — reconciliación del contrato export v2 | #207 | `2f54c4ec80ed201a4026b374b711eb7572faa367` | Documentación de fila común v2 y Excel Bridge; sin cambio funcional |
| #208 — secuencia Export v2 y WO1 | #209 | `5e9b59ba36dc7760f4529deece33248922ce0b9a` | Secuencia WO1–WO9 publicada; sin cambio funcional |
| #210 — núcleo canónico Export v2 | #211 | `6ac041f8d5faa445140b32a7daccd3724dac3529` | Core candidate `2.0.0-draft.1`, 152 columnas y roundtrip TSV; no cableado |

La PR #185 permanece en la historia Git, pero no debe presentarse como la corrección vigente.

---

## 5. Estado funcional y evidencia disponible

### 5.1 Regional

| Capacidad | Existe en código | Cableada | Visible | Interacción soportada | QA humana pública |
|---|---:|---:|---:|---:|---:|
| Inicio Farmacia y búsqueda por CIP | Sí | Sí | Sí | Sí | Sí |
| Validación farmacoterapéutica | Sí | Sí | Sí | Sí | Sí |
| Entrada manual de solicitud | Sí | Sí | Sí | Sí | Sí |
| Autocomplete CIMA manual solicitado | Sí | Sí | Sí | Sí | **PASS** |
| Dermatología multipatología | Sí | Sí | Sí | Sí | Sí, en alcance evaluado |
| Primera Visita | Sí | Sí | Sí | Sí | Sí |
| Seguimiento multilínea | Sí | Sí | Sí | Sí | Sí |
| EA y causalidad por sospechoso | Sí | Sí | Sí | Sí | Sí, alcance demo |
| Dashboard longitudinal `visit_id + line_id` | Sí | Sí | Sí | Sí | Sí |
| TXT JARA | Sí | Sí | Sí | Sí | Sí, salida provisional |
| Exportación estructurada | Sí | Parcial | Sí | Sí | Pendiente de contrato definitivo |
| Persistencia longitudinal externa | No cerrada | No | No | No | No |

### 5.2 Quick wins regionales fusionados en PR #193

Estado real de la entrega:

- implementada en código y fusionada en `recovery`;
- CI `smoke-check`: PASS;
- un commit y ocho rutas verificadas;
- `Cada 3 semanas` incorporada al catálogo, normalización y exportaciones;
- justificación clínica, observaciones de Farmacia Hospitalaria y otras observaciones del acto separadas;
- cuatro comorbilidades comunes con valores `No informado / Sí / No`;
- CIP sintético literal no vacío obligatorio para JARA, CSV y Excel, sin fallback ni regex;
- paridad JARA/CSV/Excel y contrato Excel de 61 columnas conservado;
- la promoción a `CÁCERES-REVIEW-0.3` fue realizada por PR #197 desde la fuente `815e16f9...`;
- el HEAD regional posterior incorpora cambios que no se promocionan automáticamente al snapshot;
- aptitud para piloto real: no acreditada.

### 5.3 Cáceres 0.3

Demostrado mediante interacción soportada y comprobación humana en la URL pública:

- versión `CÁCERES-REVIEW-0.3` visible;
- entrada directa;
- búsqueda y navegación real;
- Validación → Entrada manual → Fármaco solicitado;
- escritura de `secu` y clic real en una presentación CIMA;
- valores estables y editables;
- pauta e inducción no alteradas;
- Primera Visita y Seguimiento accesibles;
- dashboard de `CIP-DEMO-FH-004`;
- recarga directa de páginas internas;
- ausencia de navegación Reumatología;
- aviso de datos sintéticos;
- consola y `pageerror` sin errores en las pruebas ejecutadas.

Evidencia técnica de promoción:

- snapshot check: 14/14;
- smoke: 48/48;
- autocomplete dentro del snapshot: PASS;
- regresiones Enfermería/precargas: 95/95 + 45/45 + 94/94;
- manifest con SHA y versión exactos;
- snapshot generado, no editado manualmente.

---

### 5.4 Evolución regional posterior al snapshot Cáceres

- El ledger y workbook técnico existen en código regional, pero la interfaz de cohorte ficticia fue retirada por PR #203.
- El flujo público vuelve a ser Paciente → acto → salidas normales, con persistencia local subordinada y discreta.
- Primera Visita exporta el CIP y el acto visibles; no usa fallback demo.
- Seguimiento continúa exportando hoy una fila por línea dispensada. La evolución a fila por línea activa está aprobada documentalmente, pero no implementada.
- La fila común de 61 columnas sigue vigente como única salida pública del runtime.
- El core Export v2 candidate `2.0.0-draft.1` existe en código y está publicado desde PR #211, con 152 columnas, schemas y roundtrip TSV contractual.
- El core no está referenciado por HTML ni conectado a Validación, Primera Visita, Seguimiento, CSV, TXT JARA o Excel.
- La secuencia WO1–WO9 está publicada; WO2–WO4 permanecen pendientes de implementación.
- Ninguno de estos cambios acredita QA de navegador/Excel, piloto real o producción.

---

## 6. Feedback confirmado por Farmacia el 2026-07-30

Los cuatro puntos ejecutables sin dependencia externa de esta sección quedaron implementados en la rama regional mediante PR #193. Permanecen pendientes la QA humana regional específica y una promoción explícita posterior a Cáceres.

### Ejecutable sin dependencia externa

1. Añadir la pauta **Cada 3 semanas** al catálogo común, su normalización, exportación y regresiones.
2. Sustituir el campo farmacéutico visible **Justificación** por **Observaciones de Farmacia Hospitalaria**.
3. Reflejar esa denominación en:
   - interfaz;
   - TXT JARA;
   - Excel/exportación estructurada;
   - documentación y diccionario.
4. Incorporar estas comorbilidades comunes:
   - infecciones recurrentes;
   - riesgo o antecedentes cardiovasculares;
   - alteraciones neurológicas;
   - antecedentes o riesgo de neoplasia.

### Dependencias externas abiertas

| Dependencia | Estado | Regla |
|---|---|---|
| Texto exacto copiado desde Presalud | Solicitado, pendiente | No crear parser con formato inventado |
| Diccionario regional de patologías de Farmacia | Solicitado, pendiente | No codificar contenido provisional como regional |
| Formularios previos de Digestivo | Pendiente de Farmacia | No implementar el circuito definitivo hasta recibirlos |
| Consenso SEFH y PROs | Preparación por Silvia | Incorporar tras revisión explícita |

---

## 7. Interpretación confirmada de Presalud

- Dermatología puede crear Presalud inicialmente solo para una parte de los pacientes.
- Cuando no existe, Farmacia debe crearlo al recibir la orden clínica.
- Por tanto, los pacientes terminan pasando por Presalud, pero el registro puede no existir al iniciar la validación.
- La orden clínica y Presalud son entradas complementarias.
- Presalud es una fuente operativa especialmente relevante para fechas de validez/renovación si estas se reciben explícitamente.
- No existe todavía parser publicado porque falta la cadena exacta del portapapeles.
- Pharmatool queda fuera de este frente: registra dispensación, pero no ofrece una exportación útil para construir este flujo.

---

## 8. Decisiones de producto para el siguiente ciclo

1. No existe un modo ni un botón `Nuevo paciente sintético`.
2. La evaluadora usa el flujo normal con un CIP y datos inventados.
3. Los fixtures hardcodeados se conservan para demo y regresión.
4. La herramienta debe dejar de depender exclusivamente de esos fixtures.
5. La información se genera siempre desde el Hub; la profesional no crea el paciente escribiendo una fila Excel.
6. Cada hospital tendrá un libro independiente.
7. No existe consolidación regional automática.
8. Código, modelo, contratos y scripts serán comunes.
9. El branding será configurable por hospital: Cáceres, Badajoz y Mérida.
10. Nombre paraguas provisional interno: **PROMueve Nexus**.
11. Módulo de Farmacia: **FarmaNEXus**.
12. Cáceres inicia con Dermatología y Digestivo; Digestivo permanece condicionado a su formulario.

---

## 9. Frontera demo, evaluación, piloto y producto futuro

### Apto actualmente para

- demo funcional;
- evaluación de flujo y usabilidad con datos sintéticos;
- revisión de campos y textos por profesionales;
- QA del modelo multilínea y de las exportaciones provisionales;
- preparación técnica del Excel Bridge y del modelo canónico.

### No apto todavía para

- introducir datos reales;
- asistencia clínica real;
- uso persistente multiusuario;
- autenticación y autorización reales;
- auditoría productiva;
- integración automática con JARA, Presalud, Farmatool o sistemas SES;
- captura externa de PROMs reales;
- piloto operativo;
- producción.

---

## 10. Reglas de seguridad clínica

- Tratamiento solicitado no equivale a tratamiento validado.
- Tratamiento validado no equivale a tratamiento iniciado.
- Línea evaluada no equivale a dispensada.
- Tratamiento previo no equivale a iniciar uno nuevo.
- Un segundo tratamiento no demuestra switch ni add-on.
- Ausencia de acción no demuestra renovación.
- CIMA identifica y propone datos editables tras selección explícita; no decide tratamiento.
- Nunca inferir desde nombre, catálogo, etiqueta o dato ausente:
  - dosis;
  - vía;
  - pauta;
  - presentación no seleccionada;
  - inducción;
  - duración;
  - resultado de validación;
  - inicio;
  - switch;
  - add-on;
  - dispensación;
  - renovación;
  - causalidad.
- Los datos ausentes permanecen vacíos, desconocidos o pendientes.

---

## 11. Regla de promoción

```text
Rama work aislada
→ tests y QA
→ issue aprobado
→ PR
→ merge autorizado en recovery
→ QA humana regional
→ promoción explícita del SHA funcional
→ nueva versión Cáceres
→ QA humana Cáceres
→ reconciliación documental
```

`previews/caceres-fh/` es una salida generada. No se edita manualmente.

---

## 12. Siguiente referencia operativa

El orden, arquitectura, dependencias y WOs del ciclo 2026-07-31 a 2026-08-15 se definen en:

- [`FARMACIA_PLAN_VACACIONES_20260731.md`](FARMACIA_PLAN_VACACIONES_20260731.md)
- [`../architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](../architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md)

Ninguna WO futura queda autorizada automáticamente por esos documentos.
