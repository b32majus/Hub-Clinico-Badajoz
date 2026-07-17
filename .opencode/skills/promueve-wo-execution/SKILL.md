---
name: promueve-wo-execution
description: Procedimiento mínimo para ejecutar work orders PROMueve de forma acotada y revisable.
---

# Ejecución de work orders PROMueve

## Preflight

Confirmar repositorio, rama, HEAD, worktree y estado. Leer la work order y las fuentes de verdad que indique. Confirmar archivos autorizados y restricciones.

## Backup y alcance

Crear backup solo cuando la WO lo exija. No tocar archivos ajenos ni restaurar cambios preexistentes. Mantener la ejecución dentro del alcance y del worktree.

## STOP

Detenerse ante contradicción clínica, HEAD inesperado, conflicto Git, secreto, dato real, dependencia nueva, fallo repetido o ampliación de alcance.

## Checks

Ejecutar exactamente los checks de la WO. Añadir solo checks read-only necesarios para probar el resultado. Revisar `git diff --name-only` y `git diff --check`.

## Commit y reporte

Preparar un commit atómico solo si la WO lo autoriza y todos los criterios pasan. No hacer push, PR ni merge salvo autorización explícita. Reportar archivos, cambios, checks, QA, riesgos y acciones Git.
