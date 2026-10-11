# Atenea Execution Routing v0

Status: **CURRENT C-087 ROUTING AUTHORITY**
Date: 2026-10-06

This file maps roles to project-local native OpenCode V2 agents. It does not duplicate Matt procedures. C-087 retains the C-086 thin lifecycle and C-085 writer/context economics while hardening authority transport to child agents.

## Standard profiles

| Role | volume | complex |
| --- | --- | --- |
| coordinator | `atenea-volume` → MiMo 2.6 Flash | `atenea-complex` → GLM 5.3 Flash high |
| explorer | `atenea-explorer` → Qwen 3.8 Flash | same |
| implementer | `atenea-implementer-volume` → DeepSeek V4 Flash | `atenea-implementer-complex` → GLM 5.3 Flash high |
| merger | `atenea-merger` → MiMo 2.6 Flash | same |
| Standards review | `atenea-review-standards` → GPT-6 Luna high | same |
| Spec review | `atenea-review-spec-volume` → GPT-6 Luna high | `atenea-review-spec-complex` → GPT-6.1 Sol high |
| correction | `atenea-corrector-volume` → DeepSeek V4 Flash | `atenea-corrector-complex` → GLM 5.3 Flash high |
| integrated feature/train/PR audit | Cora when material | Cora when material |

The NaN provider ID `nan/deepseek-v4-flash` is intentionally retained even when the provider backend serves a newer compatible implementation under that stable ID.

## Routing dimensions

```text
cost_policy = standard | free_only | go
risk_class  = volume | complex
```

Human/project authority owns cost policy. Cora recommends risk class from accepted work.

| Cost policy | Risk class | Primary agent |
| --- | --- | --- |
| standard | volume | `atenea-volume` |
| standard | complex | `atenea-complex` |
| free_only | volume | `atenea-free` |
| free_only | complex | `atenea-free` |
| go | volume | `atenea-go` |
| go | complex | `atenea-go` |

`free_only` is an Atenea upstream cost dimension but is **not bound as local Nexus agents**; the table preserves upstream role names as provenance, not a callable fallback. Adding that route requires separate human-approved configuration.

Go bindings: the **locally readable**, bounded `docs/ATENEA_GO_PROFILE_V0.md` plus the exact `.opencode/agents/*go*.md` frontmatter. Go Volume/Complex are operationally qualified in Atenea C-087 for routine bounded work, **not** a Standard parity claim; no silent fallback.

## Risk selection

Start with `volume` unless accepted authority already exposes a material complex trigger:

- novel/cross-cutting architecture across materially coupled modules;
- difficult concurrency, temporal, scheduling, state-machine, solver or optimization semantics;
- material security/privacy/authorization/tenancy/clinical/trust-boundary risk;
- delicate migration/backward-compatibility/distributed invariants;
- repeated semantic failure demonstrating ordinary assurance is insufficient.

File count, ticket length, ordinary UI, many tests or business importance alone are not complex triggers.

## Matt lifecycle binding

Matt remains upstream-owned. The selected primary coordinator delegates implementation/TDD to the bound implementer, receives a fixed candidate, then owns exactly one canonical Standards + Spec review for that candidate. `/implement-spec` uses the same ownership at integration level.

Review start closes the originating implementer. Findings go to fresh bound correctors; at most two finding-scoped attempts are allowed for the same envelope. No repeated broad review/fix carousel.

Coordinators delegate using a **child-readable authority envelope**: prefer a repo-local durable handoff reference; when required authority is external/inaccessible, inline a compact phase-specific authority capsule from current Atenea C-087 when the required source is not locally readable. Never require a child verdict to read `/outbox`, `/tmp`, another worktree or another denied external directory. Full handoff/policy duplication remains forbidden.

## Conditional safeguards

Specialized product/evidence safeguards are activated by the accepted handoff or a concrete review finding. They are not inferred as always-on work from profile/risk class alone. Reference only the actual named, accessible safeguard in the accepted handoff/finding; if the source is external/inaccessible, transport just its relevant phase-specific capsule, not its entire corpus.

A writer implements the supplied envelope. It does not perform open-ended sibling-consumer auditing. If it discovers a material out-of-envelope impact incidentally, it reports and STOPs.

## PR #143 preparation boundary (Cora-side; not an agent gate)

When the human has approved a bounded task, Cora does not repeat frontier selection, repair unrelated baseline tests in preflight or enlarge a microfix into a strategic Train. Preflight identifies only material launch blockers; the writer performs ordinary implementation/discovery. Preserve risk-proportional proof and clinical safety. This changes neither Matt's internal lifecycle nor the reviewers' responsibilities.

## Evidence economy

Writer evidence is focused. Broad/full suites default to integration/publication unless the accepted handoff explicitly names one existing integrated candidate witness and its command for a material cross-surface risk; the coordinator runs that witness once after the fixed candidate and before canonical reviewers. Correctors run only the required focused closure checks, not optional full regressions; out-of-scope reds are reported instead of pursued. Profile choice alone never mandates extra reviews or suites.

## Standard writer/context economy

Standard writer routing is fixed at a clean work-unit boundary:

```text
volume  → nan/deepseek-v4-flash
complex → nan/glm5.3-flash#high
```

Native OpenCode V2 2.0.26 is the promoted current runtime (2.0.22 is the historical baseline). The inherited NaN writer context guard uses a 220k effective context budget for both long-running NaN writers with automatic compaction and ~15k recent verbatim retention, making compaction due around ~198k. This is an airbag, not a target context size and not permission to weaken required evidence.

## No quota router

Atenea does not implement percentage balancing, automatic quota failover or a model carousel. New routing is selected only at a clean work boundary.
