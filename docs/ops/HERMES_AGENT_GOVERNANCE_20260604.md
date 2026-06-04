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

Documentación, plantillas, contratos, cambios menores, validaciones simples.

### Amarillo

Cambios multiarchivo limitados, selector de perfil, carga multiarchivo, normalización longitudinal.

### Rojo

Migración React, backend real, cambios en Excel maestro/contrato de 497 columnas, nuevas dependencias importantes, cambios de arquitectura, ramas protegidas.

---

## 14. Siguientes archivos a crear

Una vez clonado el repo en VPS:

```text
AGENTS.md
docs/ops/WORK_ORDER_TEMPLATE.md
docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md
```

Estos archivos convierten esta gobernanza en instrucciones ejecutables para Hermes y Builders.

---

## 15. Primeras work orders recomendadas

1. `WO-001`: crear `AGENTS.md` del repo.
2. `WO-002`: crear plantillas operativas.
3. `WO-003`: crear contratos mínimos documentales:
   - evento longitudinal común;
   - módulo Enfermería;
   - módulo Farmacia.

No empezar por código funcional hasta validar esta cadena.

---

## 16. Primer preflight recomendado

Antes de crear `AGENTS.md`, lanzar a Hermes una tarea de preflight para comprobar:

- acceso GitHub;
- clonación del repo;
- checkout de rama viva;
- lectura de documentos clave;
- estado limpio del repo;
- capacidad de crear una rama `work/hermes/preflight-vps-git` sin pushear cambios de contenido.

---

## 17. Regla final

> La velocidad vendrá de la gobernanza, no de soltar agentes antes de tiempo.

Primero se valida el taller. Después se lanzan work orders.