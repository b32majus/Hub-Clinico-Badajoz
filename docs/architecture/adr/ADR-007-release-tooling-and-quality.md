# ADR-007 — Tooling, CI, release y calidad

**Estado:** `ACCEPTED_ENGINEERING`
**Fecha:** 2026-09-24

## Decisión

Introducir tooling reproducible de forma incremental sin reescribir la aplicación ni exigir tooling en el puesto asistencial.

Dirección:

- Node fijado para dev/CI;
- package/lock + instalación reproducible cuando se implemente Foundation tooling;
- conservar/clasificar checkers actuales;
- tests nuevos con herramientas sencillas (`node:test` si procede);
- validación JSON Schema mantenida;
- JSDoc/checkJs en seams nuevos y TypeScript solo por decisión explícita;
- empaquetado estático reproducible;
- harness browser común;
- vendor de dependencias runtime críticas con versión/origen/licencia/hash.

## Gates

1. PR rápida: alcance afectado + invariantes transversales + smoke si UI/routing.
2. Suite completa: contratos/oráculos de ambos módulos, negativos y flujos browser principales.
3. Release hospitalaria: suite completa + QA del artefacto generado + manifest + compatibilidad/reversión.

## Release

Unidad publicada: artefacto hospitalario inmutable con manifest de:

- release ID;
- code SHA;
- deployment/config hash;
- contract/schema versions;
- dependencias/tooling;
- gates/evidencia.

No todas las versiones necesitan el mismo número; el manifest fija la combinación compatible.

## Legacy/oráculos

Caracterización y aceptación son distintas. Un defecto conocido no se convierte en golden deseable.

## Alternativas rechazadas

- convertir todos los scripts históricos en gates sin clasificación;
- bundler/framework obligatorio por defecto;
- migración masiva a TypeScript;
- considerar tests verdes equivalentes a QA navegador/piloto.

## Reabrir si

El tamaño/build/dependencies o los targets de despliegue requieren un pipeline distinto.
