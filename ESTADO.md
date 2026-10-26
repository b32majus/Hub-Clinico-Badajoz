# ESTADO — PROMueve Nexus (27-10-2026)

Una página. La verdad del producto es GitHub `promueve/nexus-v4` (cabeza al redactar: `6eaa3a4`); esto es un resumen. Todo el desarrollo usa **datos sintéticos**; ninguna pieza está en piloto.

## Qué hay hoy

| Módulo | Estado |
|---|---|
| **Farmacia (FH)** | Operativo en demo sintética. Seguimiento con salidas manuales TXT JARA y Excel WO8 con EA 0..N (#841) y copia Bridge raw de 166 columnas (#850). Snapshot 0.6 en evaluación por las farmacéuticas de Cáceres |
| **Reumatología** | Visit Act v1 publicado. Desarrollo teórico, sin validar con equipos. Sin destino Bridge/Processor |
| **Dermatología** | Solo «DermaNEXus — Próximamente» en la Home. Nada implementado |
| **Enfermería** | Solo importación del Excel v6; no es módulo |
| **Plataforma** | Home multiservicio, registry/profile/manifest. Un único perfil de despliegue (`BAD` sintético) |

## En curso (máx. 1)
- **EA 0..N de Farmacia, congelado** hasta la reunión con las farmacéuticas de Cáceres (27-10). Propuesta pendiente de confirmar: cerrar «EA v1 demo» = guardar en Bridge → reabrir → ver EA en el Dashboard del paciente.

## Siguiente (máx. 3)
1. Decidir el corte de EA tras la reunión del 27-10.
2. Corregir las auditorías de Sil: Farmacia primero; Reuma, solo seguridad y errores.
3. Desarrollo real de Reuma **después** de las revisiones de proceso (Mérida desde el 26-10; Badajoz desde el 06-11).

## Aparcado
- Bridge C3–C5 (lector, guardar/reabrir, Processor relacional) hasta decidir el corte EA.
- G2 y JIT: abandonados, no se fusionan (preservados con tags `archive/*`). C3a (Metis): parada.
- Control Plane / form-builder / V5: diferidos por el Freeze (24-09).

## Seguimiento (epics)

Cada epic agrupa sus issues con lista de tareas; GitHub marca la casilla al cerrarse cada issue. Los `Closes #N` cierran solos porque la rama por defecto es ahora `promueve/nexus-v4`.

- [#860 FH · EA 0..N](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/860) · [#858 FH · Bridge raw y entrega F4.5/F4.6](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/858) · [#861 FH · Estadísticas e informes](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/861)
- [#862 FH · Renovaciones y recogidas](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/862) · [#859 FH · Catálogo/CIMA y QA de Cáceres](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/859)
- [#865 Reuma · pendientes y entrega](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/865) · [#857 Dermatología · módulo](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/857)
- [#864 Plataforma · F6/F7 y almacenamiento](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/864) · [#863 Orden y deuda técnica](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/863) · [#856 Cáceres · circuito asistencial](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/856)

## Dónde mirar
- Decisiones: `docs/DECISIONES.md` · Ideas: `docs/IDEAS.md` · Preguntas sin resolver: `docs/PREGUNTAS_ABIERTAS.md`
- Catálogo de documentos: `docs/MAPA.md` · Variables por hospital: `docs/INVENTARIO_VARIABLES.md`
- Documentos que solo vivían en ramas: `docs/legacy/ramas/`
- Reglas de trabajo: `AGENTS.md`, `docs/agents/issue-tracker.md`

## Cómo mantenerlo
Cada PR que cambie algo visible actualiza una línea de este fichero, en la misma PR. Se dejan de crear ficheros `WO_DOC_*_POSTMERGE_*`: la evidencia va en la descripción de la PR y en el issue.
