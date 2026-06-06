# Template Excel — Prebiológico

> Hoja: `Prebiologico`. Revisión 2026-05-03.
>
> Nota de vigencia: documento histórico/no vigente como contrato operativo. Reuma v2 vigente usa 497 columnas por hoja clínica con bloque prebiológico embebido por visita; no existe hoja `Prebiologico` obligatoria.

---

## Descripción

Hoja transversal que registra, por cada CIP, la validación manual de aptitud previa al inicio de terapia biológica o dirigida. Cada fila representa una evaluación prebiológica completa.

---

## Cabeceras

1. `CIP`
2. `Fecha_Registro`
3. `Fecha_Validacion_Prebiologico`
4. `Estado_Prebiologico_Final`
5. `Profesional_Validador`
6. `Decision_Clinica_Manual`

### Laboratorio

7. `Hemograma_Solicitado`
8. `Hemograma_Fecha_Solicitud`
9. `Hemograma_Recibido`
10. `Hemograma_Fecha_Recepcion`
11. `Hemograma_Correcto`
12. `Hemograma_Observaciones`
13. `Bioquimica_Solicitada`
14. `Bioquimica_Fecha_Solicitud`
15. `Bioquimica_Recibida`
16. `Bioquimica_Fecha_Recepcion`
17. `Bioquimica_Correcta`
18. `Bioquimica_Observaciones`
19. `Serologias_Solicitadas`
20. `Serologias_Fecha_Solicitud`
21. `Serologias_Recibidas`
22. `Serologias_Fecha_Recepcion`
23. `Serologias_Correctas`
24. `Serologias_Observaciones`

### Screening infeccioso

25. `IGRA_Mantoux_Solicitado`
26. `IGRA_Mantoux_Tipo` (`IGRA`, `Quantiferon`, `Mantoux`)
27. `IGRA_Mantoux_Fecha_Solicitud`
28. `IGRA_Mantoux_Recibido`
29. `IGRA_Mantoux_Fecha_Recepcion`
30. `IGRA_Mantoux_Resultado`
31. `IGRA_Mantoux_Observaciones`
32. `Rx_Torax_Solicitada`
33. `Rx_Torax_Fecha_Solicitud`
34. `Rx_Torax_Recibida`
35. `Rx_Torax_Fecha_Recepcion`
36. `Rx_Torax_Correcta`
37. `Rx_Torax_Observaciones`

### Vacunación y medicina preventiva

38. `Vacunacion_Revisada`
39. `Vacunacion_OK`
40. `Medicina_Preventiva_Requiere_Derivacion`
41. `Medicina_Preventiva_Derivada`
42. `Medicina_Preventiva_Fecha_Derivacion`
43. `Vacunas_Pendientes`
44. `Vacunacion_Observaciones`

### Cierre

45. `Observaciones_Globales`

---

## Estados permitidos

| Estado | Descripción |
|---|---|
| `APTO` | Validado manualmente como apto para biológico |
| `EN_CURSO` | Evaluación iniciada, pendiente de completar |
| `NO_APTO` | Validado manualmente como no apto |
| `NO_EVALUADO` | Sin evaluación registrada (default) |

---

## Reglas de codificación

- Campos booleanos (`*_Solicitado`, `*_Recibido`, `*_Correcto`, `Vacunacion_Revisada`, `Vacunacion_OK`, etc.): `SI` / `NO` / `ND`.
- Fechas: formato `YYYY-MM-DD` o vacío.
- `Estado_Prebiologico_Final`: uno de los 4 estados permitidos.
- `Decision_Clinica_Manual`: texto libre con la justificación de la decisión final.
- `Vacunas_Pendientes`: texto libre listando vacunas pendientes.
- `Observaciones_Globales`: texto libre.

---

## Notas de implementación

- El sistema **no decide automáticamente**. El estado final lo marca manualmente el clínico.
- El sistema puede advertir si hay inconsistencias (ej. marcado `APTO` con pruebas pendientes), pero no bloquea.
- La última validación por CIP se replica en la columna `Estado_Prebiologico_Ultimo` de la hoja clínica correspondiente para facilitar consultas.
