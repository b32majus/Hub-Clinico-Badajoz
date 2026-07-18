# Execution Report — Hub Clínico Badajoz

Esta plantilla materializa `REPORT.md` según el [protocolo canónico de handoff y revisión](WO_HANDOFF_AND_REVIEW_PROTOCOL.md). Describe evidencia pre-commit y no presupone que exista un commit.

## Metadatos

| Campo | Valor |
|---|---|
| WO-ID / título | `<WO-ID>` — `<título>` |
| Fecha UTC | `<YYYY-MM-DDTHH:MM:SSZ>` |
| Repositorio | `<ruta y remoto verificados>` |
| Worktree | `<ruta absoluta>` |
| Rama | `<rama>` |
| Base ref / SHA esperado | `<ref>` / `<sha>` |
| HEAD observado | `<sha>` |
| Ejecutor / perfil / modelo | `<valores verificables o no verificable>` |
| Riesgo y razón | `verde / ámbar / rojo` — `<razón>` |
| Package path | `/srv/kairos-lab/outbox/reports/<WO-ID>/<UTC-TIMESTAMP>/` |

## Fuentes realmente leídas

- `<WO o instrucción>`
- `<ruta/ref verificada>`

## Objetivo y contrato funcional

Describir el resultado exigido y las invariantes que no pueden cambiar.

## Alcance

- `<incluido>`

## NO TOCA

- `<fuera de alcance>`

## Diagnóstico y flujo

| Tipo | Elementos verificados |
|---|---|
| Productores | `<símbolos/rutas>` |
| Consumidores | `<símbolos/rutas>` |
| Callers | `<flujo>` |
| Persistencia / rerenders | `<impacto o no aplica>` |
| Importación / exportación | `<impacto o no aplica>` |
| Contratos publicados | `<afectados o no aplica>` |
| Compatibilidad legacy | `<tratamiento y evidencia>` |

## Estado del diff real

| Ruta | Estado Git | Tracked/untracked | Explicación semántica |
|---|---|---|---|
| `<ruta>` | `modificada/nueva/eliminada/renombrada` | `<tipo>` | `<por qué cambió>` |

Indicar expresamente archivos untracked, eliminados, renombrados y binarios. `DIFF.patch` debe incluirlos sin hacer stage.

## RED

| Timestamp UTC | Comando | Exit code | Fallo reproducido |
|---|---|---|---|
| `<hora>` | `<comando>` | `<código>` | `<evidencia>` |

## GREEN

| Timestamp UTC | Comando | Exit code | Resultado |
|---|---|---|---|
| `<hora>` | `<comando>` | `<código>` | `<evidencia>` |

La salida literal, incluidos stdout, stderr, warnings y errores posteriores a assertions, vive en `TESTS.log`. Si no se preservó, declararlo sin reconstruirla.

## QA manual y automatizada

- Interacciones soportadas ejecutadas:
- QA de navegador ejecutada y evidencia:
- Checks automatizados:
- QA no ejecutada y motivo:

## Compatibilidad histórica

Describir compatibilidad legacy, degradaciones deliberadas y cobertura disponible.

## Riesgos y limitaciones

- `<riesgo o limitación residual>`

## Decisiones humanas pendientes

- `<decisión, responsable e impacto>`

## Estado Git literal

```text
<salida literal de git status --short --branch>
```

## Acciones Git

| Acción | Estado | Evidencia |
|---|---|---|
| Stage | no realizado / realizado | `<detalle>` |
| Commit | no autorizado / pendiente / realizado | `<SHA y mensaje solo si existe>` |
| Push | no autorizado / pendiente / realizado | `<ref remota solo si existe>` |
| Issue / PR / merge | no autorizado / pendiente / realizado | `<URL/SHA solo si existe>` |
| Rebase / amend / limpieza | no realizado | `<detalle si aplica>` |

## Visibilidad y publicación

- OpenCode observó: `<worktree, diff, checks>`.
- Evidencia entregada a Cora/Sil: `<artefactos>`.
- GitHub verificado: `<rama/commit/PR/merge o no publicado>`.
- Estado: `diff local / commit local / rama remota / PR / merge publicado`.

## Documentación viva

- Modificada por esta WO:
- Pendiente de reconciliación post-merge:

## Condiciones de parada y desviaciones

- Bloqueos encontrados e intentos acotados:
- Regla de segundo bloqueo activada: sí / no.
- Desviaciones de la WO: ninguna / `<detalle>`.

## Veredicto

Elegir exactamente uno:

- **APTO PARA REVISIÓN**
- **BLOQUEADO**
- **IMPLEMENTACIÓN EXPERIMENTAL CONGELADA**

Para riesgo ámbar o rojo, `APTO PARA REVISIÓN` exige todavía revisión independiente y autorización humana posterior antes de commit.
