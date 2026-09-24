# ADR-003 — Deployment hospitalario y configuración gobernada

**Estado:** `ACCEPTED_ENGINEERING`
**Fecha:** 2026-09-24

## Decisión

Cada despliegue asistencial tiene `siteId`/`deploymentId` fijos; el profesional no elige libremente CAC/BAD/MER.

La primera configuración de plataforma será deliberadamente pequeña:

```text
module-registry.json
deployment-profile.json
        ↓
deployment-manifest.json (generado)
```

`ConfigurationRepository` inicial puede ser una función de carga/validación/freeze, no un servicio ni framework.

## Autoridad por propiedad

No existe una cascada universal Platform→Module→Site→Module×Site. Cada clase tiene autoridad propia:

- clínica: contrato del módulo;
- metadata: diccionario gobernado;
- opciones funcionales: allowlist/schema del módulo;
- operación site: responsable institucional/técnico;
- composición: responsable de release;
- branding: producto/site.

Claves desconocidas o combinaciones incompatibles fallan de forma explícita.

## Qualification hospital × módulo

Un módulo solo se habilita para un site cuando identidad visible, fuentes, navegación, outputs y scope han sido comprobados. `siteId` en la Home no corrige hardcodes internos.

## Configuración prohibida al inicio

- lógica clínica ejecutable;
- fórmulas/umbrales libres;
- transiciones solicitado/validado;
- reglas de dosis/pauta;
- roles de seguridad manipulables en cliente;
- form/rules engine genérico;
- edición runtime/remota mutable.

## Aislamiento

Contexto visual, aislamiento de storage y autorización son garantías distintas. Una carpeta URL no aísla Web Storage; un origin distinto tampoco sustituye autenticación/autorización.

## Reabrir si

Existe necesidad demostrada de cambios de config sin redeploy o variabilidad repetida que justifique una fuente remota/engine más rico.
