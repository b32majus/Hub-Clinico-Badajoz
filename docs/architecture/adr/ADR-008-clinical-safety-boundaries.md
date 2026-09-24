# ADR-008 — Límites de seguridad clínica y confianza

**Estado:** `ACCEPTED_ENGINEERING`
**Fecha:** 2026-09-24

## Decisión

Las invariantes clínicas no dependen del adapter, del hospital ni de configuración local.

Preservar como mínimo:

- solicitado ≠ validado;
- validado ≠ inicio;
- previo ≠ nuevo inicio;
- ausencia/unknown ≠ NO;
- catálogo/CIMA identifica/selecciona, no decide terapia;
- parser/preview ≠ apply;
- configuración no introduce reglas clínicas nuevas;
- site no redefine significado canónico;
- migration/adapters no alteran cardinalidad/estado silenciosamente;
- ambigüedad relevante falla cerrada.

## Configuración y metadata

Metadata clínica puede tener impacto asistencial y requiere gobierno. Site puede elegir opciones autorizadas, no redefinir unidades/semántica/transiciones.

Cuando una política clínica deba seleccionarse, config solo referencia un ID de política implementada/versionada/probada; su activación es un cambio gobernado.

## Identidad/autoridad

Distinguir:

- profesional declarado;
- identidad autenticada;
- autorización de operación;
- referencia de paciente dentro del módulo.

Un selector de nombre no acredita identidad. Ocultar un botón no autoriza una operación.

## Observabilidad

Diagnóstico técnico minimiza PHI/identificadores. No incluir en logs/URLs sin necesidad:

- CIP/NHC/nombre;
- payloads/formularios;
- texto fuente/filas;
- nombres de fichero con datos no controlados.

Auditoría asistencial es otra responsabilidad institucional.

## Alternativas rechazadas

- seguridad derivada solo de JSON declarativo;
- «fail open» para datos clínicos ambiguos;
- auth propia inicial sin requisito;
- inferencias terapéuticas por conveniencia.

## Reabrir si

Una decisión institucional define nuevos trust boundaries o un nuevo dominio requiere invariantes adicionales.
