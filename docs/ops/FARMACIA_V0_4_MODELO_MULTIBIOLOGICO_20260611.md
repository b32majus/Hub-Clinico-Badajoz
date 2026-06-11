# Farmacia v0.4 — Modelo multibiológico

Fecha: 2026-06-11
Estado: propuesta operativa para prototipo localizado v0.4
Ámbito: Hub Farmacia demo local, sin backend, sin persistencia real

## 1. Objetivo

Permitir que un paciente de Farmacia Hospitalaria tenga hasta 3 biológicos simultáneos o secuenciales sin forzar que toda alta adicional sea interpretada como cambio terapéutico.

El objetivo del prototipo v0.4 es:

- soportar representación de hasta 3 líneas biológicas por paciente;
- distinguir añadido de cambio;
- permitir validación, primera visita, seguimiento y eventos adversos por línea;
- no romper la demo post-demo v0.3 existente.

## 2. Principio de compatibilidad

La compatibilidad con v0.3 se mantiene con estas reglas:

- `patient.farmaco`, `patient.dosis`, `patient.pauta`, `patient.via`, `patient.principioActivo`, `patient.efectosAdversos` y `patient.proms` siguen existiendo como resumen legacy;
- el dataset longitudinal añade estructura nueva sin eliminar la anterior;
- cuando un paciente tenga varias líneas, los campos legacy mostrarán un resumen del tratamiento principal o activo prioritario;
- las vistas que no se adapten todavía a multibiológico seguirán leyendo los campos legacy sin romper navegación.

## 3. Modelo paciente

Se mantiene el objeto paciente actual y se añade:

```json
{
  "biologicos": [
    {
      "linea_id": "BIO-FH-003-L1",
      "orden": 1,
      "tipo_relacion": "base",
      "estado_linea": "historico",
      "es_principal": false,
      "tratamiento_id_principal": "TRAT-FH-003-A",
      "nombre_linea": "Adalimumab",
      "nombre_comercial": "Amgevita",
      "principio_activo": "Adalimumab",
      "dosis": "40 mg",
      "via": "SC",
      "pauta": "Cada 2 semanas",
      "fecha_inicio": "2026-04-05",
      "fecha_fin": "2026-05-20",
      "motivo_inicio": "Inicio de biologico",
      "motivo_fin": "Cambio terapeutico",
      "servicio_origen": "Reumatologia"
    }
  ]
}
```

## 4. Estructura de línea biológica

Cada línea biológica representa una unidad clínica seguida por Farmacia. No equivale necesariamente a una única fase cronológica cerrada; puede ser:

- tratamiento base;
- tratamiento añadido;
- línea suspendida;
- línea histórica.

Campos mínimos de línea:

- `linea_id`
- `orden`
- `tipo_relacion`
- `estado_linea`
- `es_principal`
- `tratamiento_id_principal`
- `nombre_linea`
- `nombre_comercial`
- `principio_activo`
- `dosis`
- `via`
- `pauta`
- `fecha_inicio`
- `fecha_fin`
- `motivo_inicio`
- `motivo_fin`
- `servicio_origen`

## 5. Estados de línea

Estados admitidos:

- `activo`: biológico vigente y administrándose.
- `añadido`: biológico activo incorporado sobre otra línea activa sin implicar sustitución automática.
- `suspendido`: línea cerrada por decisión clínica, EA, falta de eficacia u otro motivo.
- `historico`: línea no activa, mantenida para trazabilidad longitudinal.

Regla práctica:

- `añadido` implica coexistencia con otra línea activa.
- `suspendido` e `historico` no deben contarse como activos.

## 6. Cambio de tratamiento vs tratamiento añadido

### Cambio de tratamiento

Se registra cuando:

- una línea previa se suspende o pasa a histórico;
- una nueva línea ocupa su lugar terapéutico principal;
- existe motivo de cambio documentado.

Marcadores de dataset:

- evento en `cambios_pauta` con `tipo = "cambio_farmaco"`;
- referencias a `tratamiento_anterior_id` y `tratamiento_nuevo_id`;
- la línea previa deja de estar activa.

### Tratamiento añadido

Se registra cuando:

- se incorpora un segundo o tercer biológico;
- la línea previa sigue activa;
- no existe sustitución automática.

Marcadores de dataset:

- evento en `cambios_pauta` con `tipo = "tratamiento_añadido"` o equivalente;
- nueva línea con `estado_linea = "añadido"` o `activo`;
- otra línea activa permanece vigente.

Regla funcional obligatoria:

Un segundo o tercer biológico nunca debe traducirse por defecto a `cambio_farmaco`.

## 7. Validación por línea

La validación farmacoterapéutica deja de ser implícitamente única por paciente.

Modelo recomendado:

- mantener `estado_validacion_farmacia` por cada `tratamiento` o línea;
- permitir varias validaciones sobre un mismo paciente si afectan a líneas distintas;
- en exportación TXT/CSV, cada validación debe identificar `linea_id` o `tratamiento_id`.

En el prototipo v0.4 se documenta este modelo, pero no se plantea una reescritura completa del formulario de validación si no es estrictamente necesaria para preservar estabilidad.

## 8. Primera visita por paciente y por línea

La primera visita puede existir en dos niveles:

- primera visita global del paciente en Farmacia;
- primera visita específica de una línea biológica.

Modelo recomendado:

- el episodio asistencial conserva el hito global;
- la línea biológica puede tener `fecha_inicio` y `fecha_primera_visita_linea`;
- si se añade un segundo biológico, no debe sobrescribir la primera visita histórica del paciente.

Para no romper v0.3:

- la vista legacy puede seguir mostrando una primera visita resumen;
- el modelo ampliado debe permitir seleccionar la línea objetivo cuando proceda.

## 9. Seguimiento por paciente y por línea

Cada seguimiento debe poder registrar:

- contexto paciente;
- línea biológica principal revisada;
- líneas adicionales implicadas;
- decisión farmacoterapéutica por línea;
- EA y causalidad asociados a una o varias líneas.

Campos mínimos nuevos del seguimiento:

- `linea_principal_id`
- `lineas_relacionadas`
- `tipo_movimiento_linea`: `sin_cambios`, `optimizacion`, `suspension`, `añadido`, `revision`

## 10. Eventos adversos vinculados a uno o varios biológicos

Cada EA debe poder enlazarse a una o varias líneas o tratamientos:

```json
{
  "sospechosos": [
    {
      "linea_id": "BIO-FH-003-L2",
      "tratamiento_id": "TRAT-FH-003-B",
      "rol": "sospechoso_principal"
    },
    {
      "linea_id": "BIO-FH-003-L3",
      "tratamiento_id": "TRAT-FH-003-C",
      "rol": "sospechoso_secundario"
    }
  ]
}
```

Regla:

- si no hay selección múltiple, no puede inferirse automáticamente que el único biológico visible sea el causante.

## 11. Impacto en dashboard paciente

El dashboard debe:

- listar varias líneas biológicas;
- distinguir activas, añadidas, suspendidas e históricas;
- mostrar si hubo `cambio_farmaco` o `tratamiento_añadido`;
- reflejar en eventos adversos los biológicos sospechosos.

Para el prototipo mínimo:

- basta una visualización sencilla por tarjetas o bandas;
- no es necesaria analítica avanzada de combinaciones.

## 12. Impacto en estadísticas del servicio

No es necesario completar toda la explotación en esta WO, pero el modelo debe prever:

- número de pacientes con 1, 2 o 3 biológicos;
- combinaciones terapéuticas activas;
- EA por biológico y por combinación;
- líneas activas vs históricas;
- cambios vs añadidos.

Compatibilidad mínima:

- si la estadística actual usa `tratamientos`, seguirá funcionando;
- más adelante deberá discriminar `tratamientos activos simultáneos` y no asumir unicidad.

## 13. Impacto en exports TXT/CSV

Los exports v0.4 deben contemplar:

- `linea_principal_id`;
- `lineas_relacionadas`;
- distinción entre `cambio_farmaco` y `tratamiento_añadido`;
- sospechosos de EA;
- causalidad, puntuación y categoría.

Regla de transición:

- si el paciente solo tiene una línea, el export puede seguir la estructura actual;
- si tiene varias, se usarán listas separadas por ` | ` o `; ` sin romper lectura humana.

## 14. Criterios para no romper v0.3

- no eliminar campos legacy;
- no cambiar rutas ni navegación;
- no exigir backend ni persistencia;
- no modificar catálogo farmacológico transversal;
- no reinterpretar automáticamente toda coexistencia de biológicos como cambio;
- encapsular cambios en dataset demo, seguimiento y dashboard antes de ampliar otras vistas.

## 15. Alcance propuesto para el prototipo v0.4 de esta sesión

Sí:

- dataset demo con paciente de 2-3 biológicos;
- seguimiento con selección de línea/biológico;
- EA asociados a uno o varios biológicos;
- causalidad básica;
- dashboard con visualización mínima multibiológico.

No todavía:

- reescritura completa de validación;
- reescritura completa de primera visita;
- explotación estadística avanzada de combinaciones;
- neoplasias;
- backend o persistencia real.
