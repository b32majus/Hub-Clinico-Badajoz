# Contrato de Datos Reuma v2

> Revisión 2026-05-03. Extensión del contrato unificado ESPA/APS/AR para incluir LES, Sjögren, prebiológico y Solicitud FH. Compatible con el contrato v1 existente; las hojas nuevas se añaden sin modificar las históricas.

---

## 1. Hojas del Excel maestro v2

| Hoja | Contenido | Estado |
|---|---|---|
| `ESPA` | Espondiloartritis axial (existente) | Conservada |
| `APS` | Artritis psoriásica (existente) | Conservada |
| `AR` | Artritis reumatoide (existente) | Conservada |
| `LES` | Lupus eritematoso sistémico | **Nueva v2** |
| `SJOGREN` | Síndrome de Sjögren | **Nueva v2** |
| `Prebiologico` | Validación prebiológica transversal | **Nueva v2** |
| `Profesionales` | Catálogo de profesionales | Existente |
| `Farmacos` | Catálogo de fármacos | Existente |
| `Solicitud_FH_Log` | Log de solicitudes a Farmacia Hospitalaria | **Nueva v2, opcional** |

---

## 2. Columnas comunes a todas las hojas clínicas

Todas las hojas de patología (ESPA, APS, AR, LES, SJOGREN) comparten estas cabeceras base en el mismo orden:

1. `CIP`
2. `Nombre_Paciente`
3. `Sexo`
4. `Fecha_Visita`
5. `Tipo_Visita` (`primera`, `seguimiento`)
6. `Profesional`
7. `Diagnostico_Primario`
8. `Diagnostico_Secundario`
9. `Peso`
10. `Talla`
11. `IMC`
12. `TA`
13. `Comorbilidad_HTA`
14. `Comorbilidad_DM`
15. `Comorbilidad_DLP`
16. `Comorbilidad_ECV`
17. `Comorbilidad_Obesidad`
18. `Comorbilidad_Osteoporosis`
19. `Toxico_Tabaco`
20. `Toxico_Tabaco_Desc`
21. `Toxico_Alcohol`
22. `Toxico_Alcohol_Desc`
23. `Tratamiento_Actual`
24. `Fecha_Inicio_Tratamiento`
25. `Decision_Terapeutica`
26. `Cambio_Motivo`
27. `Cambio_Efectos_Adversos`
28. `Cambio_Descripcion_Efectos`
29. `Cambio_Biologico_Farmaco`
30. `Cambio_Biologico_Dosis`
31. `Fecha_Proxima_Revision`
32. `Comentarios_Adicionales`
33. `Estado_Prebiologico_Ultimo`
34. `Fecha_Validacion_Prebiologico_Ultima`

> **Nota de compatibilidad**: Las hojas ESPA/APS/AR existentes usan `ID_Paciente` en lugar de `CIP`. El loader normaliza ambos campos mediante `HubTools.normalizer.getPatientCIP()`.

---

## 3. Reglas de codificación

| Valor | Significado |
|---|---|
| `SI` | Presente / positivo / cumplido |
| `NO` | Ausente / negativo / no cumplido |
| `ND` | No determinado / no interrogado / no analizado |
| `NA` | No aplica por patología o tipo de visita |
| `""` (vacío) | Texto libre sin dato |

---

## 4. Referencias por patología

- Columnas específicas de **LES**: ver `docs/template_les_excel.md`
- Columnas específicas de **Sjögren**: ver `docs/template_sjogren_excel.md`
- Columnas de **prebiológico**: ver `docs/template_prebiologico_excel.md`
- Estructura de **Solicitud FH**: ver `docs/template_solicitud_fh.md`
- Columnas históricas ESPA/APS/AR: ver `docs/CONTRATO_DATOS_UNIFICADO.md`

---

## 5. Regla de longitudinalidad

Cada patología mantiene primera visita y seguimiento en la misma hoja mediante `Tipo_Visita`. No se crean hojas separadas por tipo de visita.

---

## 6. Cambios respecto a v1

- `ID_Paciente` → `CIP` como identificador canónico visible (con alias de lectura para compatibilidad).
- Añadidas columnas transversales `Estado_Prebiologico_Ultimo` y `Fecha_Validacion_Prebiologico_Ultima` a todas las hojas clínicas.
- Nuevas hojas: `LES`, `SJOGREN`, `Prebiologico`, `Solicitud_FH_Log`.
- ASDAS en AR: columnas conservadas pero codificadas como `NA` (ver Fase 2 del plan).
