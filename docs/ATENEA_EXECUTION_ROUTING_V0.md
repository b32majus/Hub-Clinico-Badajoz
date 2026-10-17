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
cost_policy = standard | free_only | go | openai_experimental (explicit human opt-in)
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

Free-only agents are included in this LOCAL SYNC CANDIDATE, for future authorized clean-boundary units only. Before actual Free work consult docs/ATENEA_FREE_PROFILE_V0.md and docs/ATENEA_FREE_MODEL_CATALOG_V0.md; verify endpoint availability. This candidate does not activate Free on canonical, change any active OpenCode session or permit paid fallback.

Go bindings: the **locally readable**, bounded `docs/ATENEA_GO_PROFILE_V0.md` plus the exact `.opencode/agents/*go*.md` frontmatter. Go Volume/Complex are operationally qualified in Atenea C-087 for routine bounded work, **not** a Standard parity claim; no silent fallback.

## Conditional Visual/UX v1 — Free PR #152 and Standard PR #153, 2026-10-17

Source authority: Atenea main at 13e07aaaedbeeb7d39d0c0a9d15ad03019423239. Twelve new agents and four Standard agent updates are prepared in this isolated candidate, not activated for running sessions.

Cora must fix the seven handoff fields BEFORE launching a new Free/Standard unit: Cost policy (free_only|standard), Risk class (volume|complex), Implementation focus (technical|visual|mixed), UI impact (none|quality|fidelity), Visual authority, Visual viewport/state, Visual witness. The last three are NONE when UI impact is none.

- none: canonical Matt Standards + Spec only. Do NOT dispatch a Visual/UX reviewer.
- quality: accepted project visual/UX rules plus real browser-rendered screenshot(s) of the actual changed UI.
- fidelity: exact human-frozen repo-local approved PNG with SHA256, additional HTML when available, AND real candidate browser screenshot at the SAME screen, viewport and state. Never claim pixel fidelity from code, a text file path or a historical screenshot alone.
- Free conditional reviewer: atenea-review-visual-free (Nemotron 3.5 Super VL Free). Standard conditional reviewer: atenea-review-visual-standard (GPT-6 Luna High); always a fresh separate session, even though Luna also serves Standards/Spec. These are the third read-only axis on the SAME fixed candidate, not another Matt review or another correction lifecycle.
- Findings from applicable Standards, Spec and Visual axes share the existing maximum TWO fresh finding-scoped correction attempts. A visual repair needs one focused screenshot proof, not a repeated global Visual/UX review.
- Standard implementers remain risk-bound: DeepSeek alias nan/deepseek-v4-flash (provider V4.1-1017) in Volume, GLM 5.3 Flash High in Complex. Free writers remain the approved distinct Volume/Complex Free models. No probability router, no automatic model fallback or aesthetics-based risk reclassification. Go and OpenAI experimental bindings/permissions are unchanged.
- Image pixels MUST reach writer/reviewer, not just image paths. Use synthetic/sanitized browser screenshots authorized for each provider. Missing authority, pixels, privacy approval or real browser witness -> INCOMPLETE_VISUAL_EVIDENCE / HUMAN STOP.
- For handoff preflight run tools/check-free-visual-handoff.mjs or tools/check-standard-visual-handoff.mjs against an approved repo-local handoff; Free endpoint availability via tools/check-free-models.mjs, with --visual when relevant. These structural checks are not evidence of actual image transport.
- Nexus current visual references: .agents/skills/promueve-visual-qa/SKILL.md and docs/PRODUCT_FIDELITY_GATES_V1.md; do not conflate old QA screenshots with a frozen master. The 17 October Pharmacy EA integrated mockup was approved in conversation, but is NOT yet a versioned repo-local PNG with accepted SHA256, and cannot be represented as such in a fidelity handoff before a separate authorized freeze.
- Full applicable local contracts: docs/ATENEA_FREE_VISUAL_UX_ROUTING_V1.md and docs/ATENEA_STANDARD_VISUAL_UX_ROUTING_V1.md. Cora and the human own classification, design decisions, permission to publish and approval of any visual change.

## OpenAI experimental opt-in (Atenea C-087, unqualified)

**Source authority:** `b32majus/Atenea/main@5abad2c4cc450c0824d6019dc5257b17a0ffe66b`, `docs/ATENEA_OPENAI_EXPERIMENTAL_PROFILE_V0.md`. These exact nine `.opencode/agents/atenea-*openai*.md` project-local files were reused from the previously prepared worktree, without changing their content. **EXPERIMENTAL / HUMAN OPT-IN only**, at a new authorized work-unit boundary; no switching ongoing sessions, no silent fallback, no replacement of `standard`, `free_only`, `go` or `default_agent`.

| Role | Sprint — volume | Frontier — complex |
| --- | --- | --- |
| primary coordinator | `atenea-openai-sprint` → `nan/mimo-v2.6-flash` | `atenea-openai-frontier` → `nan/mimo-v2.6-flash` |
| explorer | existing `atenea-explorer` → `nan/qwen3.8-flash` | same |
| implementer | `atenea-implementer-openai-sprint` → `openai/gpt-6-luna#high` | `atenea-implementer-openai-frontier` → `openai/gpt-6.1-sol#high` |
| Standards (read-only) | `atenea-review-standards-openai-sprint` → `nan/deepseek-v4-flash` | `atenea-review-standards-openai-frontier` → `nan/glm5.3-flash#high` |
| Spec (read-only) | `atenea-review-spec-openai-sprint` → `openai/gpt-6.1-sol#high` | `atenea-review-spec-openai-frontier` → `openai/gpt-6-luna#high` |
| fresh corrector | `atenea-corrector-openai` → `openai/gpt-6.1-sol#high` | same |
| merger (/implement-spec only) | existing `atenea-merger` → `nan/mimo-v2.6-flash` | same |

Keep C-087 Matt lifecycle and per-finding correction budget unchanged. Select one visible primary explicitly on a new authorized work unit; authenticate both providers first. Model catalog entries alone do **not** guarantee generation/quota success. If a provider, model binding, permission, or quota is unavailable, HUMAN STOP rather than fall back or change models. No clinical data, production access, synthetic campaigns, or changes to running Trains.

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
