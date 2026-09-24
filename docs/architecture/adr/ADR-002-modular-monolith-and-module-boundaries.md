# ADR-002 — Monolito modular y límites de módulos

**Estado:** `ACCEPTED_ENGINEERING`
**Fecha:** 2026-09-24

## Contexto

PROMueve nació alrededor de Reuma y creció incorporando Farmacia. Más servicios/hospitales requieren una plataforma común sin fusionar actos profesionales ni duplicar aplicaciones completas.

## Decisión

PROMueve Nexus evoluciona como **monolito modular**:

- shell/composición común;
- workspaces de módulo separados;
- dominio/casos de uso/Ports por módulo;
- adapters por capabilities y módulo;
- código compartido solo cuando representa la misma responsabilidad.

Reumatología no genera actos de Farmacia y Farmacia no reinterpreta actos de Reuma. El Hub coordina navegación y contratos explícitos, no sustituye responsabilidades profesionales.

## Home

La Home es shell/navegación, no Data Plane:

- no resuelve pacientes;
- no transporta CIP/workbook/cohorte entre módulos;
- no interpreta hojas/columnas;
- puede mostrar readiness técnico resumido.

## Módulo real

Una plantilla/formulario aislado no equivale a módulo habilitable. Un módulo requiere entrada/workspace, contexto, contratos/capabilities y qualification para el deployment aplicable.

## Alternativas rechazadas/deferidas

- una única aplicación clínica universal: acoplamiento de dominios;
- paciente universal ahora: Identity/permisos/data contracts inmaduros;
- microservicios: complejidad operativa sin presión real;
- duplicar app por hospital: forks y divergencia.

## Consecuencias

Los refactors deben introducir límites por strangler, no mover carpetas como sustituto de arquitectura.

## Reabrir si

Un módulo necesita lifecycle/ownership/seguridad/deploy independiente que el monolito no pueda sostener razonablemente.
