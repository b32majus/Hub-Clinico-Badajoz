---
name: promueve-farmacia-context
description: "Trigger: Farmacia Hospitalaria, Enfermería/Farmacia intake, e-Orden, CIMA, Excel FH, Validación, Primera Visita, Seguimiento, dashboards or Farmacia debt in PROMueve. Resolve current Farmacia authority and clinical boundaries before changing product."
---

# PROMueve Farmacia context

Use this skill for work on the active Farmacia line of Hub Clínico Badajoz.

## Resolve authority first

1. Verify GitHub live: accepted issue/instruction, `recovery/farmacia-pr-replay-20260727` tip and related PRs.
2. Read `AGENTS.md` and `CODING_STANDARDS.md`.
3. Read `docs/INDEX.md` and `docs/ops/WORK_ORDER_STATUS.md`.
4. Read the specific live spec/debt/contract governing the task.

Never use a remembered SHA, old worktree or Engram/session memory as current product authority.

## Clinical invariants

- Requested or imported treatment is not validated treatment.
- Parsing, preview and source association do not authorize clinical apply.
- Never infer dose, route, schedule, presentation, induction, duration, causality or validation outcome from drug/CIMA/catalogue/history/labels/missing data.
- Missing/unknown stays missing/unknown unless the live contract explicitly defines a transition.
- Existing clinical values remain protected unless the live contract explicitly authorizes replacement.
- Use synthetic data only unless a separately authorized environment explicitly permits otherwise.
## Product surfaces are distinct

- Generic Farmacia recovery is the evolving published regional line.
- `previews/caceres-fh/` is a separately promoted frozen evaluation snapshot; never hand-edit or silently resync it.
- External packages/workbooks have their own promotion boundaries.
- Demo/evaluation evidence does not imply pilot or production readiness.

## Verification

Use the focused existing `tools/*_check*` and browser checks for the changed seam, plus the repository smoke when appropriate. Do not hard-code historical assertion counts as permanent truth.

Prefer exact contractual fixtures and supported browser interaction. A passing test is evidence, not permission to override a clinical contract.

Pi + native Gentle own decomposition, workers, verification lifecycle, work-unit commits and RDD. This skill supplies domain context only; it creates no parallel review or execution lifecycle.