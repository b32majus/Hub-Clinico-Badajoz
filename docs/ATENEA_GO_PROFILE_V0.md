# Atenea C-087 GO — referencia local legible para Nexus

Status: **NEXUS LOCAL AUTHORITY TRANSPORT CAPSULE** (C-087 upstream).
Source checked: `b32majus/Atenea` `main@0e904085695a7b074460251123eab62c8a2f0221` (PR #143 included). This SHA is **provenance**, not an evergreen live HEAD. Confirm upstream at a new work boundary.

This small worktree-local capsule prevents child agents from needing denied or nonexistent external documentation. It is **not** a copy of Atenea's full Go policy, does not change any model, provider, permissions or work-unit budget, and is subordinate to current upstream C-087 for execution and Nexus `AGENTS.md` for clinical/product policy.

## Role bindings (match project-local agent frontmatter)

| Role | Agent | Exact model |
| --- | --- | --- |
| Coordinator | `atenea-go` | `opencode-go/mimo-v2.6-flash` |
| Explorer | `atenea-explorer-go` | `nan/qwen3.6` |
| Implementer | `atenea-implementer-go` | `opencode-go/muse-spark-1.3-contributor` |
| Merger | `atenea-merger-go` | `opencode-go/mimo-v2.6-flash` |
| Standards | `atenea-review-standards-go` | `nan/qwen3.6` |
| Spec | `atenea-review-spec-go` | `openai/gpt-6-luna#high` |
| Volume correction | `atenea-corrector-go-volume` | `opencode-go/muse-spark-1.3-contributor` |
| Complex correction | `atenea-corrector-go-complex` | `opencode-go/deepseek-v4.1-flash` |

## Execution, evidence and authority

- Human selects `Cost policy: go` and `Risk class: volume|complex` explicitly; GO Volume/Complex operationally qualified for bounded work, without quality-parity/quotas/clinical-pilot claims.
- One delegated implementer/TDD → fixed candidate → one canonical Standards + Spec review → fresh finding-scoped corrector only when needed (maximum two) → STOP for human/publication authority. `complex` does not add review or broad suites by default.
- Writer tests only changed seams with focused TDD. Reviewer checks real authority and evidence; specialized fidelity, security or consumer propagation only for concrete material trigger. Do not do repo-wide archaeology or repeat accepted decisions.
- Child authority transport: reference existing repo-local handoff, this capsule and `AGENTS.md`; when a required source is inaccessible, pass its small phase-relevant capsule inline. Missing material authority → `INCOMPLETE_AUTHORITY`, never an invented verdict.
- Model unavailable/quota-blocked/capability blocked → HUMAN STOP at clean boundary; no fallback, provider switch or unapproved agent. Publication/merge needs explicit user authorization.
- Preparation upstream follows Atenea PR #143: no premature test repair, reselecting accepted work or elevating microfixes to strategic Trains. **This is a Cora-side boundary, not a new writer/reviewer gate.**
- Keep Nexus's clinical non-inference, synthetic-only data, independent QA and Git permission limits in `AGENTS.md`. Read the current accepted WO/handoff; do not import the whole Atenea corpus.
