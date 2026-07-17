# Arnés OpenCode PROMueve v1

## Estado

- Proyecto: `Hub-Clinico-Badajoz`
- Proyecto Engram: `hub-clinico-badajoz`
- Rama de referencia: `preview/demo-lunes-wo4-20260614`
- Base validada: `6d86025a8c973d0e9e11b3811b525368972795b7`
- Estado: tooling versionado, pendiente de revisión humana antes de la primera WO piloto.

## Propósito

Este documento describe el arnés mínimo del repositorio para ejecutar work orders PROMueve con alcance acotado, permisos explícitos y trazabilidad Git. No define producto, arquitectura clínica ni prioridades.

## Arquitectura

La configuración vive en `opencode.jsonc`. Las instrucciones están en `AGENTS.md`. Agentes, comandos y skills específicos viven bajo `.opencode/`. Engram se fija mediante `.engram/config.json`.

La configuración global aporta MCP y plugins generales. Esta capa no reconfigura proveedores ni credenciales y no activa MCP de navegador.

## Agentes

### build

Agente por defecto y ejecutor de work orders verdes y ámbar. Usa `opencode-go/deepseek-v4-pro`. Puede editar dentro del repositorio, ejecutar checks y preparar commits locales. Push, merge, force-push y borrado de ramas están denegados.

Puede solicitar únicamente `explore` o `promueve-review` cuando la WO lo autorice.

### plan

Agente principal de preflight y diagnóstico. Usa `openai/gpt-5.6-sol` con variante `low`. Es read-only y solo puede solicitar `explore`.

### explore

Subagente ligero para búsquedas, inventarios, referencias, consumidores y estructura. Usa `opencode-go/deepseek-v4-flash`. No edita, no delega y no usa web.

### promueve-critical

Agente principal seleccionable para seguridad clínica, migraciones, estado de paciente, validación farmacéutica, modelo multilínea, backend o arquitectura. Usa `openai/gpt-5.6-sol` con variante `medium`. Requiere una WO aprobada y puede solicitar `explore`.

### promueve-review

Subagente read-only para comparar WO, diff y checks. Usa `opencode-go/qwen3.7-plus` con variante `low`. No edita, commitea, delega ni crea artefactos.

## Delegación

`subagent_depth` está fijado a `1`. Un agente principal puede solicitar un subagente; el subagente no puede volver a delegar. El agente general está oculto y sin permiso de delegación para este proyecto.

## Modelos efectivos

| Uso | ID exacto | Variante |
|---|---|---|
| build | `opencode-go/deepseek-v4-pro` | — |
| explore | `opencode-go/deepseek-v4-flash` | — |
| plan | `openai/gpt-5.6-sol` | `low` |
| promueve-critical | `openai/gpt-5.6-sol` | `medium` |
| promueve-review | `opencode-go/qwen3.7-plus` | `low` |

El inventario del 17-07-2026 confirmó también `openai/gpt-5.6-luna`, `openai/gpt-5.6-terra`, `github-copilot/gpt-5.6-luna`, `github-copilot/gpt-5.6-sol` y `github-copilot/gpt-5.6-terra`. No se cambió autenticación ni se asignaron esos modelos.

## Niveles operativos

- Verde: cambios acotados, documentación, tests o ajustes de bajo riesgo; usar `build`.
- Ámbar: cambios transversales, permisos, datos o integración; usar `build` con revisión o `promueve-critical` si la WO lo exige.
- Rojo: configuración global, secretos, seguridad crítica, datos reales o publicación; detenerse y escalar.

El nivel ya declarado por la WO no se rebaja por conveniencia del agente.

## Seguridad clínica

El repositorio trabaja con contratos clínicos y datos sintéticos. Nunca inferir dosis, vía, pauta, presentación, inducción, switch, add-on, renovación, duración, causalidad o validación desde nombres de fármacos, CIMA o catálogos. Solicitado no equivale a validado. Datos ausentes permanecen vacíos o pendientes.

## GitHub y Git

GitHub y la documentación versionada son la fuente de verdad. Antes de escribir se confirma repositorio, rama, HEAD y worktree. No se toca `main`, Reuma ni HOLD sin autorización. No hay push, PR, merge ni borrado de ramas en esta versión.

Los commits locales deben ser atómicos y revisables. Cada cierre incluye diff, checks, riesgos y acciones Git.

## Engram

Engram es memoria auxiliar. `.engram/config.json` fija el proyecto `hub-clinico-badajoz` para evitar detección ambigua. No se activa cloud ni se modifica la base desde esta configuración.

Guardar solo aprendizajes durables, decisiones y gotchas. HEAD, rama, prioridades temporales y estado de PR deben verificarse en Git.

## Herramientas disponibles

- OpenCode 1.18.3.
- Codex CLI para coordinación y revisión independiente.
- Engram MCP.
- Context7 MCP.
- CodeGraph MCP.
- Exa/Tavily globales, solo cuando la WO autorice web.
- Terminal y checks locales del repositorio.

## Herramientas deliberadamente no activadas

OpenCode no activa Playwright ni Chrome DevTools en v1. Codex conserva esas herramientas. La decisión se revisará después de tres work orders reales o si una WO demuestra una necesidad concreta.

No se añaden proveedores, plugins, dependencias, automatizaciones persistentes ni herramientas de navegador en esta versión.

## Procedimiento de una WO

1. Leer la WO y las fuentes indicadas.
2. Ejecutar preflight y confirmar alcance.
3. Seleccionar `build` o `promueve-critical` según el nivel y la capacidad requerida.
4. Implementar únicamente los archivos autorizados.
5. Ejecutar checks y revisar diff.
6. Solicitar `/wo-review` cuando la WO lo autorice o el riesgo lo justifique.
7. Preparar commit local solo si está autorizado.
8. Entregar reporte sin push ni PR.

## Cambio de modelos

Un cambio de modelo requiere una WO separada. Debe verificar el ID con `opencode models`, registrar coste/razonamiento esperado, modificar solo configuración del proyecto, ejecutar `opencode debug config` y revertir si el modelo no aparece o falla la validación.

No se deben añadir claves de proveedor ni modificar auth.json.

## Reversión

Antes del commit: restaurar los archivos autorizados y limpiar únicamente `.opencode`, `.engram` y el documento nuevo si fueron creados por la WO. Después del commit: volver a `backup/preview-pre-promueve-harness-v1-20260717` o revertir el commit con una nueva WO. No usar restauraciones destructivas sobre cambios ajenos.

## Validación de esta versión

Ejecutar `opencode debug paths`, `opencode debug config`, `opencode mcp list`, `engram doctor`, `engram projects list`, `git diff --check` y una tarea read-only que informe rama, HEAD, worktree y documentos guía sin crear archivos.

## Perfil OpenAI PROMueve

El perfil híbrido se mantiene sin cambios con `opencode`. El lanzador
`promueve-gpt` aplica únicamente el overlay
`config/opencode/profiles/promueve-gpt.json` mediante `OPENCODE_CONFIG_CONTENT`
para el proceso iniciado.

El overlay contiene solo proveedor, modelos y variantes:

| Agente | Modelo normal | Variante |
|---|---|---|
| explore | `openai/gpt-5.6-luna` | `low` |
| plan | `openai/gpt-5.6-terra` | `low` |
| build | `openai/gpt-5.6-terra` | `medium` |
| promueve-review | `openai/gpt-5.6-sol` | `medium` |
| promueve-critical | `openai/gpt-5.6-sol` | `high` |

El modelo global es `openai/gpt-5.6-terra` y `small_model` es
`openai/gpt-5.6-luna`. No se usan variantes Fast ni `xhigh` por defecto.

Los agentes, modos, permisos, skills, comandos, MCP e instrucciones se
heredan de la configuración del proyecto. El lanzador no modifica archivos,
no persiste variables de entorno y falla si no encuentra el worktree o el
overlay válido.

La credencial OAuth permanece fuera del repositorio. El inventario CLI del
17-07-2026 confirmó los IDs normales `openai/gpt-5.6-luna`,
`openai/gpt-5.6-terra` y `openai/gpt-5.6-sol`.
