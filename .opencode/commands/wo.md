---
description: Ejecutar una work order aprobada con el arnés PROMueve.
agent: build
---

Lee la work order indicada por el usuario: `$ARGUMENTS`.

1. Ejecuta el preflight del contrato del proyecto.
2. Confirma nivel, alcance, archivos autorizados y criterio de cierre.
3. Si la WO exige capacidad clínica o arquitectónica crítica, indica que debe usarse `promueve-critical`.
4. Ejecuta únicamente lo autorizado.
5. Ejecuta los checks definidos, revisa el diff y reporta el cierre.

No rediseñes la tarea, no amplíes alcance y no ejecutes una WO distinta.
