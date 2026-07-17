---
description: Revisar una work order y su diff sin editar.
agent: promueve-review
---

Recibe la work order, el diff y los tests indicados por el usuario: `$ARGUMENTS`.

Devuelve tres secciones separadas:

- Bloqueantes: defectos probados que impiden el cierre.
- Advertencias: riesgos concretos no bloqueantes.
- Sugerencias: mejoras opcionales fuera del criterio mínimo.

No edites archivos, no commitees, no delegues y no amplíes los criterios de aceptación.
