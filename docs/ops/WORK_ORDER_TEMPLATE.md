# Work Order Template — Hub Clínico Badajoz

**WO-ID:** `WO-NNN`
**Título:** Descriptivo y corto
**Fecha:** YYYY-MM-DD
**Autor:** Sil / Cora
**Riesgo:** 🟢 Verde / 🟡 Amarillo / 🔴 Rojo

---

## Objetivo

Una frase clara que describa qué se va a hacer.

## Contexto

Máximo 5 líneas. Por qué es necesario, qué lo motiva. Sin historia ni arquitectura.

## Rama base

```
feature/reuma-v2-prebiologico-fh-les-sjogren
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

## Política de commit/push

- Formato del mensaje de commit
- ¿Push automático o no?
- ¿Crear PR?

## Condiciones de parada

Situaciones en las que Hermes debe detenerse y escalar a Sil/Cora sin intentar resolver.

## Reporte final esperado

Estructura del reporte que Hermes debe devolver tras la ejecución.

## Notas adicionales

Cualquier información útil que no encaje en las secciones anteriores.
