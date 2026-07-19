# Work Order Template — Hub Clínico Badajoz

**WO-ID:** `WO-NNN`
**Título:** Descriptivo y corto
**Fecha:** YYYY-MM-DD
**Autor:** Sil / Cora
**Riesgo:** Verde / Amarillo / Rojo
**Factores requeridos y adicionales:** Factores concretos que determinan el nivel y sus gates

## Proporcionalidad

**Obligatorio para:** toda WO ámbar o roja, y para cualquier WO (incluidas verdes) que introduzca dependencia, servicio, capa, persistencia, contrato compartido o infraestructura nuevos.

**Campos mínimos (ámbar/rojo o nuevo factor):**
- **Factor de riesgo que obliga a esta sección:** (dependencia, capa, persistencia, contrato compartido, infraestructura, ámbito multiarchivo, etc.)
- **Solución mínima suficiente propuesta:** qué alcance concreto resuelve el riesgo sin sobredimensionar.
- **Por qué no basta una solución más simple:** justificación de que la solución elegida es la mínima viable, no la máxima disponible.
- **Modelo y perfil justificados:** qué perfil de modelo activo del harness ejecuta y por qué es el de menor coste capaz para el riesgo.

**Para WOs verdes sin los factores anteriores:** basta una línea:
`Solución mínima suficiente, sin nuevas dependencias, servicios, infraestructura, capas, persistencia ni contratos compartidos.`

---

## Objetivo

Una frase clara que describa qué se va a hacer.

## Contexto

Máximo 5 líneas. Por qué es necesario, qué lo motiva. Sin historia ni arquitectura.

## Base autorizada

```
Ref: <rama-o-tag-autorizado>
SHA remoto esperado: <sha-completo-verificable>
```

## Rama de trabajo

```
work/hermes/<paquete>-<descripcion-corta>
```

## Documentos obligatorios

Lista de documentos que Hermes debe leer antes de ejecutar:

- `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`
- `docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md`
- ...

Incluir [`WO_HANDOFF_AND_REVIEW_PROTOCOL.md`](WO_HANDOFF_AND_REVIEW_PROTOCOL.md) para toda WO con cambios.

## Diagnóstico previo (obligatorio para ámbar/rojo)

- Productores:
- Consumidores:
- Callers:
- Persistencia y rerenders:
- Importación/exportación:
- Contrato publicado afectado:
- Compatibilidad legacy:
- Decisiones humanas pendientes:
- Rutas previsiblemente afectadas:

## Alcance

Qué incluye esta tarea. Lista concreta y acotada.

## Fuera de alcance

Qué NO incluye esta tarea. Importante para evitar expansión silenciosa.

## Archivos permitidos

Rutas y patrones de archivos que se pueden modificar o crear.

## Archivos prohibidos

Rutas que no se deben tocar bajo ningún concepto.

## Criterios de aceptación

Checklist verificable. Todo debe poder comprobarse con comandos o lectura directa.

- [ ] Criterio 1
- [ ] Criterio 2
- [ ] ...

## Pruebas esperadas

Si aplica, describir qué pruebas deben pasar antes de dar la tarea por completada.

### Plan RED/GREEN

- RED reproducible esperado:
- Cambio mínimo para GREEN:
- Regresiones que deben permanecer GREEN:

### QA soportada

Indicar interacciones soportadas, QA manual, navegador, harness o checks automatizados. No usar estados DOM imposibles como evidencia.

## Paquete de cierre esperado

- Ruta externa: `/srv/kairos-lab/outbox/reports/<WO-ID>/<UTC-TIMESTAMP>/`
- Contenido mínimo: `REPORT.md`, `DIFF.patch`, `TESTS.log`, `MANIFEST.sha256`.
- Requisitos adicionales de evidencia:
- Captura literal de checks desde su ejecución: sí / no aplicable.

## Política de revisión, commit y publicación

- Formato del mensaje de commit
- Revisión proporcional (verde) o independiente read-only (ámbar/rojo)
- Quién puede autorizar el commit después del paquete
- Estado inicial del commit: no autorizado / pendiente / autorizado
- Autorizaciones separadas para issue, push, PR y merge
- Reconciliación documental post-merge esperada

## Condiciones de parada

Situaciones en las que Hermes debe detenerse y escalar a Sil/Cora sin intentar resolver.

Aplicar siempre la regla de segundo bloqueo: si un segundo bloqueo comparte raíz conceptual con el primero, detener la implementación, congelar el worktree, generar evidencia y abrir una WO diagnóstica o contractual.

## Reporte final esperado

Seguir [`WO_HANDOFF_AND_REVIEW_PROTOCOL.md`](WO_HANDOFF_AND_REVIEW_PROTOCOL.md) y [`HERMES_EXECUTION_REPORT_TEMPLATE.md`](HERMES_EXECUTION_REPORT_TEMPLATE.md). Indicar el veredicto de build permitido y la ruta del paquete; el reporte no presupone commit.

## Notas adicionales

Cualquier información útil que no encaje en las secciones anteriores.
