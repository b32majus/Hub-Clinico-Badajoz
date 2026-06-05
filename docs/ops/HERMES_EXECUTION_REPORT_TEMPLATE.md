# Execution Report — Hub Clínico Badajoz

**WO-ID:** `WO-NNN`
**WO Título:** Título de la work order
**Ejecutor:** Hermes PM
**Fecha:** YYYY-MM-DD HH:MM UTC
**Ejecución:** diurna / nocturna
**Estado:** completed / blocked / failed

---

## Rama de trabajo

```
work/hermes/<paquete>-<descripcion-corta>
```

## Commit generado

```
<commit-sha> <mensaje del commit>
```

## Archivos creados/modificados

- `ruta/al/archivo` — creado/modificado — descripción breve
- ...

## Subtareas ejecutadas

Listar cada subtarea delegada al Builder y su resultado individual.

| Subtarea | Builder | Modelo | Estado | Intentos |
|---|---|---|---|---|
| 1 | OpenCode | modelo usado | ok/failed | N |
| 2 | OpenCode | modelo usado | ok/failed | N |

## Builder / Modelo usado

Indicar qué builder se usó (OpenCode CLI, Claude Code, etc.) y qué modelo concreto.

## Intentos de corrección

Si alguna subtarea requirió corrección, detallar:
- Subtarea, motivo de corrección, resultado tras corrección.

## Desviaciones del plan

Describir cualquier diferencia entre lo planeado en la work order y lo realmente ejecutado. Si no hay desviaciones, indicar "Ninguna".

## Riesgos detectados

Listar riesgos identificados durante la ejecución que puedan afectar a la calidad, seguridad o planificación futura.

## Condiciones de parada activadas

Indicar si se activó alguna condición de parada de las definidas en la work order. Si no, indicar "Ninguna".

## Verificaciones realizadas

- [ ] `git status --short` limpio (solo archivos esperados)
- [ ] `git diff --stat` muestra solo los cambios previstos
- [ ] No hay datos reales, secretos ni credenciales
- [ ] Criterios de aceptación cumplidos (listar cada uno)
- [ ] Pruebas ejecutadas (si aplica)

## Incidencias

Describir cualquier problema encontrado durante la ejecución y cómo se resolvió (o por qué no).

## Decisiones requeridas por Sil/Cora

Indicar si hace falta intervención humana, qué se necesita decidir y qué impacto tiene en el proyecto.

## Siguiente acción recomendada

Indicar qué debería pasar después: revisión, siguiente work order, corrección, pausa, etc.

## Recomendación final

- ✅ **ready_for_review** — todo correcto, pendiente de revisión humana
- ⚠️ **needs_human_decision** — requiere decisión antes de continuar
- ❌ **do_not_merge** — no mergear sin correcciones

---

*Reporte generado automáticamente por Hermes PM*
