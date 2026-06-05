# AGENTS.md — Hub Clínico Badajoz / PROMueve Extremadura

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Repo:** `b32majus/Hub-Clinico-Badajoz`  
**Rama base viva:** `feature/reuma-v2-prebiologico-fh-les-sjogren`  
**Documento marco:** `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`  
**Gobernanza operativa:** `docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md`

---

## 1. Identidad y alcance

Este archivo define las reglas de obligado cumplimiento para cualquier agente (Hermes, OpenCode, Claude Code) que trabaje dentro de este repositorio.

El proyecto es **Hub Clínico Badajoz / PROMueve Extremadura**, un sistema de apoyo a la toma de decisiones en reumatología, enfermería y farmacia hospitalaria, actualmente en fase MVP.

**Regla madre:** Los agentes ejecutan planes, no redefinen el producto. Toda decisión clínica, funcional o arquitectónica debe estar documentada o escalarse a Sil/Cora.

---

## 2. Pipeline de ejecución

```
Sil + Cora → Work Order detallada → Hermes PM → OpenCode Builder → auditoría Hermes → commit/push → revisión humana → merge manual
```

### Responsabilidades

| Rol | Responsabilidad |
|---|---|
| **Hermes PM** | Lee contexto, fragmenta work orders, delega a OpenCode Builder, audita resultados, pide correcciones, genera commits/push y reporta. |
| **OpenCode Builder** | Implementa subtareas acotadas. No decide arquitectura ni alcance. |
| **Claude Code** | Agente especialista opcional solo si la work order lo autoriza. |

---

## 3. Ramas y protección

| Rama | Uso | Escritura agente |
|---|---|---|
| `main` | Producción/releases | ❌ Prohibida |
| `release/*` | Releases | ❌ Prohibida |
| `feature/reuma-v2-prebiologico-fh-les-sjogren` | Base viva del MVP | ❌ Prohibida como escritura directa |
| `work/hermes/<paquete>-<descripcion>` | Ejecución de work orders | ✅ Permitida |

Los agentes pueden:
- ✅ Crear ramas `work/hermes/*`
- ✅ Modificar archivos dentro del alcance de la work order
- ✅ Commitear y pushear
- ✅ Crear PRs solo si la work order lo indica

Los agentes NO pueden:
- ❌ Mergear ramas
- ❌ Hacer force push
- ❌ Borrar ramas
- ❌ Cerrar PRs
- ❌ Reescribir historia git

---

## 4. Datos prohibidos

Nunca incluir en el repo, commits o ramas:

- ❌ Datos reales de pacientes
- ❌ Exports clínicos reales
- ❌ Identificadores reales (nombre, DNI, NHC, email, teléfono)
- ❌ Datos personales sanitarios
- ❌ Credenciales, tokens, secretos
- ❌ `.env` con claves reales
- ❌ Ficheros descargados de sistemas clínicos

Sí permitidos:
- ✅ Código
- ✅ Documentación
- ✅ Plantillas
- ✅ Datos sintéticos / datasets demo artificiales
- ✅ Reports y work orders

---

## 5. Política de commits

- **Un commit = un cambio atómico revisable.**
- Formato: `tipo: mensaje descriptivo en inglés`
- Tipos válidos: `docs`, `feat`, `fix`, `refactor`, `chore`, `test`, `style`
- Ejemplos:
  ```
  docs: add work order template
  feat: add role selector scaffold
  fix: normalize longitudinal event date
  ```
- ❌ Evitar: `update`, `changes`, `fix stuff`, `final version`

---

## 6. Work orders

Toda tarea debe llegar como work order estructurada con:
- Objetivo, contexto, rama base y rama de trabajo
- Documentos obligatorios y alcance
- Archivos permitidos y prohibidos
- Criterios de aceptación verificables
- Política de commit/push y condiciones de parada
- Formato de reporte final esperado

No se permiten tareas abiertas tipo "haz el módulo entero".

---

## 7. Criterios de escalado a Sil/Cora

Hermes debe **detenerse y escalar** si aparece cualquiera de estos casos:

1. Ambigüedad clínica o funcional no documentada
2. Duda de privacidad o protección de datos
3. Cambio arquitectónico no previsto
4. Dependencia nueva no autorizada
5. Conflicto Git no trivial
6. Modificación de contrato de datos (`docs/CONTRATO_DATOS_*`)
7. Toque en ramas protegidas
8. Fallo repetido (2 intentos de corrección superados)
9. Impacto en fecha crítica (ej. demo 8 de julio)
10. Decisión de producto no documentada en `docs/DECISIONES_*`

---

## 8. Definición de done (DoD)

Una tarea está completada cuando:

- ✅ Todos los archivos previstos existen y están en la ruta correcta
- ✅ El contenido cumple los criterios de aceptación de la work order
- ✅ No hay cambios fuera del alcance autorizado
- ✅ No hay datos reales, secretos ni credenciales
- ✅ `git status --short` muestra solo los archivos esperados
- ✅ Se ha hecho commit con mensaje claro y formato convenido
- ✅ La rama se ha pusheado al remoto (si la WO lo indica)
- ✅ Se ha generado el reporte de ejecución

---

## 9. Niveles de riesgo

| Nivel | Tipo de cambio | Supervisión |
|---|---|---|
| 🟢 Verde | Documentación, plantillas, contratos, validaciones simples | Autonomía con reporte |
| 🟡 Amarillo | Cambios multiarchivo limitados, funcionalidad acotada | Revisión humana antes de merge |
| 🔴 Rojo | Migraciones, backend, cambios de arquitectura, ramas protegidas | Autorización explícita de Sil |

---

## 10. Política de modelos y delegación

### Modelos y nivel de autonomía

| Modelo | Nivel | Tareas permitidas | Delegación |
|--------|-------|------------------|------------|
| **DeepSeek v4 Flash** (Hermes brain) | 🟢 Verde | Documentación, índices, inventarios, checklists, reportes, lectura de código sin modificación, cambios Markdown de bajo riesgo, work orders documentales acotadas | Ejecución directa |
| **DeepSeek v4 Pro** (OpenCode Builder) | 🟡 Amarillo | Código funcional acotado, refactor localizado, carga multiarchivo, normalización de datos, pruebas automatizadas, cambios multiarchivo limitados | Delegar a OpenCode |
| **GPT/Codex PM** o **Sil/Cora** | 🔴 Rojo | Arquitectura, backend, migración React, contratos definitivos, decisiones clínicas, seguridad, datos, cambios en ramas protegidas | Escalar siempre |

### Reglas

- DeepSeek v4 Flash **NO debe usarse** para decidir arquitectura, diseñar formularios clínicos, crear contratos definitivos, tocar código funcional complejo, cambiar Excel/contratos o introducir dependencias.
- DeepSeek v4 Pro / OpenCode Builder debe usarse para tareas amarillas de código que requieran implementación técnica acotada.
- GPT/Codex PM o Sil/Cora deben intervenir en toda tarea roja.
- **El buen resultado del lote nocturno documental no autoriza a Flash a ejecutar tareas funcionales o clínicas fuera de alcance.**
- Hermes puede ejecutar directamente tareas verdes documentales si están perfectamente acotadas; debe delegar o escalar tareas amarillas/rojas.
- Si hay duda sobre el nivel de riesgo de una tarea, escalar a Sil/Cora antes de ejecutar.

---

## 11. Ejecución nocturna

### Nota operativa: cambios en configuración de Hermes

Los cambios en `~/.hermes/config.yaml` (modelo, provider, delegación) no son efectivos hasta que se reinicia el gateway de Hermes:

```bash
sudo systemctl restart hermes-gateway.service
```

Sin reinicio, el gateway en memoria arrastra la configuración anterior. Esto aplica especialmente a `delegation.model` y `delegation.provider`.

---

Permitida solo con work orders cerradas de riesgo verde/amarillo.

Reglas:
- Ejecución secuencial, una tarea cada vez
- Máximo 2 intentos de corrección por tarea
- Si falla 2 veces → marcar `blocked/pending_review`
- No cambios rojos sin aprobación
- No merge
- Reporte matinal obligatorio al día siguiente
