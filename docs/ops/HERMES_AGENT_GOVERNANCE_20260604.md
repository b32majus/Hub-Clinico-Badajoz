# Gobernanza operativa — Hermes, agentes y VPS

**Fecha:** 2026-06-04  
**Versión:** 1.1  
**Proyecto:** Hub Clínico Reuma / PROMueve Extremadura  
**Repo:** `b32majus/Hub-Clinico-Badajoz`  
**Rama base viva:** `feature/reuma-v2-prebiologico-fh-les-sjogren`  
**Documento marco:** `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`

---

## 1. Objetivo

Definir cómo se trabajará con Hermes, OpenCode y otros agentes desde el VPS KairOS/Hermes.

La idea no es que varios agentes editen libremente el repo, sino crear una cadena controlada:

```text
Sil + Cora → Work Order detallada → Hermes PM → OpenCode Builder → auditoría Hermes → commit/push → revisión humana → merge manual
```

Regla madre:

> Los agentes ejecutan planes, no redefinen el producto. Toda decisión clínica, funcional o arquitectónica debe estar documentada o escalarse a Sil/Cora.

---

## 2. Orden operativo corregido

El orden correcto antes de lanzar work orders funcionales es:

1. Validar acceso GitHub desde VPS.
2. Clonar el repo en la ruta de trabajo del VPS.
3. Entrar en la rama base viva.
4. Crear `AGENTS.md` dentro de la raíz del repo clonado.
5. Crear plantillas operativas en `docs/ops/`.
6. Ejecutar una primera work order documental de bajo riesgo.
7. Revisar comportamiento Hermes PM → OpenCode Builder → auditoría.
8. Ajustar gobernanza.
9. Lanzar work orders funcionales pequeñas.

Motivo: el `AGENTS.md` del proyecto debe vivir dentro del repo clonado. El `AGENTS.md` global de Hermes gobierna Hermes; el `AGENTS.md` del repo gobierna este proyecto concreto.

---

## 3. Rutas VPS recomendadas

```text
/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/
├── repo/          # clon Git del proyecto
├── work-orders/   # work orders entregadas a Hermes
├── reports/       # reportes de ejecución Hermes
├── prompts/       # prompts auxiliares
└── tmp/           # temporales no persistentes
```

Todo el trabajo del Hub debe quedar dentro de esa ruta. No tocar KairOS core, SanitarIA, systemd, `.env`, Tailscale, secretos ni otros proyectos.

---

## 4. Fuente de verdad

```text
GitHub = fuente de verdad
VPS = taller de ejecución
AGENTS.md del repo = constitución del proyecto
Work Orders = unidad de trabajo aprobada
Ramas work/hermes/* = unidad de ejecución
Merge = decisión humana
```

El VPS no sustituye GitHub. Todo trabajo relevante debe acabar en commit/push a una rama revisable.

---

## 5. Datos permitidos y prohibidos

Permitido en VPS/repo:

- código;
- documentación;
- plantillas;
- datos sintéticos;
- datasets demo artificiales;
- reports;
- work orders;
- prompts técnicos.

Prohibido:

- datos reales de pacientes;
- exports clínicos reales;
- identificadores reales;
- datos personales sanitarios;
- credenciales;
- secretos;
- tokens;
- `.env` con claves reales;
- ficheros descargados de sistemas clínicos.

---

## 6. Roles

### Sil

Decide estrategia, alcance, prioridades, validación funcional, revisión final y merge.

### Cora

Diseña planes, work orders, criterios de aceptación, documentación, arquitectura y revisión crítica.

### Hermes PM

Lee contexto, fragmenta work orders, delega a OpenCode, audita, pide correcciones, genera commits/push y reporta.

### OpenCode Builder

Implementa subtareas acotadas. No decide arquitectura ni alcance.

### Claude Code

Agente especialista opcional para revisión arquitectónica, refactor complejo o documentación avanzada, solo si la work order lo autoriza.

---

## 7. Pipeline de ejecución

```text
1. Sil/Cora preparan work order cerrada.
2. Hermes lee AGENTS.md + dossier + work order.
3. Hermes crea o usa rama work/hermes/*.
4. Hermes fragmenta en subtareas.
5. Hermes delega a OpenCode Builder.
6. Builder implementa.
7. Hermes audita diff y criterios.
8. Si falla, Hermes pide corrección.
9. Si pasa, Hermes commitea y pushea.
10. Hermes deja reporte.
11. Sil/Cora revisan.
12. Sil/Cora deciden merge, corrección o descarte.
```

---

## 8. Ramas y permisos

Rama base viva:

```text
feature/reuma-v2-prebiologico-fh-les-sjogren
```

Ramas de trabajo permitidas para Hermes:

```text
work/hermes/<paquete>-<descripcion-corta>
```

Ejemplos:

```text
work/hermes/mvp-contratos-enfermeria-farmacia
work/hermes/mvp-role-config
work/hermes/backend-ready-diccionario-clinico
```

Ramas protegidas/no escritura directa por agentes:

```text
main
release/*
feature/reuma-v2-prebiologico-fh-les-sjogren
```

Los agentes pueden crear ramas, modificar dentro de alcance, probar, commitear y pushear. No pueden mergear, forzar push, borrar ramas, cerrar PRs ni reescribir historia.

---

## 9. Política de commits

Un commit debe ser pequeño y revisable.

Formato recomendado:

```text
docs: add work order template
feat: add role selector scaffold
fix: normalize longitudinal event date
refactor: extract clinical repository interface
chore: add synthetic pharmacy demo rows
```

Evitar commits genéricos tipo `update`, `changes`, `fix stuff`, `final version`.

---

## 10. Work Orders

Toda work order debe incluir:

```text
Objetivo
Contexto
Rama base
Rama de trabajo
Documentos obligatorios
Alcance
Fuera de alcance
Archivos permitidos
Archivos prohibidos
Criterios de aceptación
Pruebas esperadas
Política de commit/push
Condiciones de parada
Reporte final esperado
```

No se permiten tareas abiertas tipo “haz el módulo entero”. Las tareas deben ser pequeñas, acotadas y auditables.

---

## 11. Ejecución nocturna

Permitida solo con work orders cerradas y de riesgo bajo/medio.

Reglas:

- ejecución secuencial;
- máximo 2 intentos de corrección por tarea;
- si falla dos veces, marcar `blocked/pending_review`;
- no cambios rojos sin aprobación;
- no merge;
- reporte matinal obligatorio.

Reporte matinal mínimo:

```text
work orders ejecutadas
ramas actualizadas
commits generados
archivos tocados
pruebas realizadas
errores/correcciones
bloqueos
decisiones requeridas
recomendación: ready_for_review / needs_human_decision / do_not_merge
```

---

## 12. Criterios de escalado a Sil/Cora

Hermes debe detenerse y escalar si aparece:

- ambigüedad clínica;
- duda de privacidad;
- cambio arquitectónico;
- dependencia nueva;
- conflicto Git no trivial;
- modificación de contrato de datos;
- toque en ramas protegidas;
- fallo repetido;
- impacto en demo del 8 de julio;
- decisión de producto no documentada.

---

## 13. Niveles de riesgo

### Verde

Documentación, plantillas, contratos exploratorios/documentales, cambios menores, validaciones simples.

### Amarillo

Cambios multiarchivo limitados, selector de perfil, carga multiarchivo, normalización longitudinal.

### Rojo

Migración React, backend real, cambios en Excel maestro/contrato de 497 columnas, nuevas dependencias importantes, cambios de arquitectura, ramas protegidas, **contratos clínicos definitivos**.

**Matiz sobre contratos:** Los contratos exploratorios (borradores, maquetas, referencias) pueden clasificarse como verde o amarillo según alcance. Los **contratos clínicos definitivos** (campos, validaciones, reglas de negocio que impactan en la app) son siempre **rojo** y requieren autorización de Sil/Cora antes de tocar.

---

## 14. Modelo de routing operativo

Define qué modelo/tool puede ejecutar cada tipo de tarea según su nivel de riesgo.

| Nivel | Tipo de tarea | Modelo permitido | Delegación | Ejemplos | Condición de parada |
|-------|--------------|-----------------|-----------|----------|-------------------|
| 🟢 **Verde** | Documentación, índices, inventarios, checklists, reportes, lectura de código, cambios Markdown de bajo riesgo | DeepSeek v4 Flash (Hermes brain) | Ejecución directa por Hermes | WO-003 inventario, WO-004 flujos, WO-005 checklist, WO-006 índice, WO-007 snapshot, WO-008 auditoría, WO-009 reporte, WO-011 gobernanza | Tarea mal acotada, ambigüedad, necesidad de decisión clínica |
| 🟡 **Amarillo** | Código funcional acotado, refactor localizado, carga multiarchivo, normalización de datos, pruebas automatizadas, cambios multiarchivo limitados | DeepSeek v4 Pro (OpenCode Builder) | Delegar a OpenCode Builder por work order | Implementación de perfiles, carga multiarchivo, normalización longitudinal, tests | Fallo repetido (2 intentos), cambio de alcance, riesgo de tocar datos reales |
| 🔴 **Rojo** | Arquitectura, backend, migración React, contratos definitivos, decisiones clínicas, seguridad, datos, cambios en ramas protegidas, Excel maestro | GPT/Codex PM o Sil/Cora | Escalar siempre. No ejecutar sin autorización explícita | Migración React, backend real, contrato 497 columnas, nuevas dependencias, cambios arquitectura | Cualquier intento de ejecución sin autorización es condición de parada inmediata |

### Reglas de routing

1. **DeepSeek v4 Flash** puede usarse para tareas verdes documentales perfectamente acotadas. No requiere delegación externa.
2. **DeepSeek v4 Flash NO debe usarse** para decidir arquitectura, diseñar formularios clínicos, crear contratos definitivos, tocar código funcional complejo, cambiar Excel/contratos o introducir dependencias. Si una tarea documental deriva en necesidad de cambio funcional, debe detenerse y escalar.
3. **DeepSeek v4 Pro / OpenCode Builder** es el ejecutor de tareas amarillas. Hermes prepara la work order, delega la implementación, audita el resultado y commitea. Hermes no implementa directamente tareas amarillas.
4. **GPT/Codex PM** es el planificador/auditor de tareas rojas. No ejecuta directamente; delega a OpenCode Builder o espera instrucción de Sil/Cora.
5. **El buen resultado del lote nocturno documental (2026-06-05) no autoriza a Flash a ejecutar tareas funcionales o clínicas fuera de alcance.** El éxito en documentación verde no es validación para código amarillo/rojo.
6. **Hermes puede ejecutar directamente tareas verdes documentales si están perfectamente acotadas; debe delegar o escalar tareas amarillas/rojas.**
7. **Si hay duda sobre el nivel de riesgo de una tarea, escalar a Sil/Cora antes de ejecutar.** El coste de escalar es menor que el coste de una ejecución incorrecta.

---

## 15. Siguientes archivos a crear

Una vez clonado el repo en VPS:

```text
AGENTS.md
docs/ops/WORK_ORDER_TEMPLATE.md
docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md
```

Estos archivos convierten esta gobernanza en instrucciones ejecutables para Hermes y Builders.

---

## 16. Primeras work orders recomendadas

1. `WO-001`: crear `AGENTS.md` del repo.
2. `WO-002`: crear plantillas operativas.
3. `WO-003`: crear contratos mínimos documentales:
   - evento longitudinal común;
   - módulo Enfermería;
   - módulo Farmacia.

No empezar por código funcional hasta validar esta cadena.

---

## 17. Primer preflight recomendado

Antes de crear `AGENTS.md`, lanzar a Hermes una tarea de preflight para comprobar:

- acceso GitHub;
- clonación del repo;
- checkout de rama viva;
- lectura de documentos clave;
- estado limpio del repo;
- capacidad de crear una rama `work/hermes/preflight-vps-git` sin pushear cambios de contenido.

---

## 18. Regla final

> La velocidad vendrá de la gobernanza, no de soltar agentes antes de tiempo.

Primero se valida el taller. Después se lanzan work orders.

---

## 19. Governance hygiene — observaciones abiertas

### 19.1 Pre-commit / CI (prioridad siguiente, no implementar aún)

Se identifica como necesidad crítica a medio plazo la incorporación de:

- **Pre-commit hooks** que validen: ausencia de datos reales (DNI, NHC, teléfonos, emails), cambios en rutas prohibidas, formato Markdown básico
- **GitHub Actions** para validación en CI: lint básico, smoke test automatizado, validación de estructura

**Esta prioridad está identificada pero no debe implementarse sin diseño previo y work order específica.** No crear `.github/workflows/`, no instalar pre-commit, no modificar scripts.

Motivo: requiere decidir tecnología (husky + lint-staged, pre-commit framework, Action oficial), alcance y criterios de fallo antes de implementar.

### 19.2 CRLF/LF — riesgo menor pendiente de .gitattributes

El repo usa finales de línea CRLF (Windows). Hermes genera archivos con LF (Linux). Cada commit muestra warnings de normalización. No afecta a la funcionalidad pero ensucia diffs y puede causar conflictos en merges con editores mixtos.

Solución pendiente: crear `.gitattributes` con:

```text
* text=auto
*.md text
*.html text
*.css text
*.js text
*.py text
*.xlsx binary
```

No implementar sin work order.

### 19.3 WO-002 — contratos mínimos, pausada

WO-002 (`work/hermes/wo-002-contratos-minimos`) contiene borradores de contratos de evento longitudinal, Enfermería y Farmacia. Está **pausada** y no debe mergearse. Los archivos existen en una rama separada para referencia exploratoria, no como contrato definitivo.

Ver `docs/ops/WORK_ORDER_STATUS.md` para estado actualizado.

### 19.4 Tablero de estado

`docs/ops/WORK_ORDER_STATUS.md` contiene el estado de todas las WOs ejecutadas. Debe actualizarse al mergear, pausar o descartar cada WO.

### 19.5 Política de limpieza de ramas

`docs/ops/BRANCH_CLEANUP_POLICY.md` define cuándo y cómo borrar ramas `work/hermes/*` una vez mergeadas.