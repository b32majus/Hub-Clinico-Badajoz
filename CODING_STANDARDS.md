# Atenea Coding Standards

This file contains Atenea's stable repo-local horizontal engineering guardrails.

It does **not** define an execution sequence. Task-specific engineering methods are owned by the upstream Matt Pocock skills and should be used when their own triggers apply. Machine-decidable rules belong in deterministic repo tooling. Gentle native RDD remains the final exact-candidate review authority on the unattended Atenea path.

## 1. Keep changes scoped

Make the smallest coherent change that satisfies the current contract.

Do not refactor, rename, reorganize or "clean up" unrelated code unless doing so is necessary to implement the requested behavior safely.

If unrelated debt or defects are discovered, report them separately rather than silently expanding the change.

## 2. Prefer changeability over cleverness

Choose designs that are easy to understand, modify and delete.

Do not add speculative abstractions, indirection, generic frameworks, services or extension points without demonstrated change pressure.

A locally explicit design is preferable to a globally "flexible" one that increases cognitive or operational cost.

Do not abstract repetition merely because code looks similar. Deduplicate when repeated code represents the same knowledge, rule or reason to change; keep coincidentally similar behavior separate.

Keep behavior that changes for the same reason close enough to understand and modify coherently. Avoid scattering one logical change across unrelated modules without a demonstrated boundary that earns the separation.

## 3. Follow local consistency and expose intent

Respect the established architecture, vocabulary and conventions of the code being changed unless the work explicitly changes those conventions.

Do not introduce a new architectural or stylistic pattern merely because it is attractive in isolation.

When a local convention is actively harmful to the requested change, make that conflict explicit and change it deliberately rather than drifting into a second competing pattern.

Names should expose domain intent. Avoid vague, generic or misleading names that require implementation knowledge or explanatory comments to understand what a concept represents. Prefer the repository's established domain vocabulary.

## 4. Introduce seams and abstractions only under real pressure

Introduce interfaces, adapters or abstraction seams when there is demonstrated variation, substitution, isolation or testability pressure.

Do not create abstraction layers for hypothetical future implementations or merely to satisfy a design pattern.

Prefer the simplest boundary that preserves locality and lets the current behavior be changed or tested safely.

## 5. Preserve one authority and remove obsolete design

Do not create competing sources of truth for the same durable fact.

When a contract changes, remove code, tests, adapters and branches of design that no longer serve a real supported behavior.

Backward compatibility, migrations or temporary dual paths are justified only when a real consumer, persisted contract or rollout requires them. Give temporary compatibility a retirement condition.

Record durable, non-obvious architectural or domain decisions in the repository's normal authority surface (for example `CONTEXT.md`, ADRs, specs or canonical product docs), not only in chat, commit messages or agent memory.

## 6. Technical debt must be intentional

Technical debt may be accepted when the trade-off is worth it, but it must be visible, bounded and owned by a person, team, issue or explicit remediation condition.

Do not silently accumulate compatibility layers, TODO architecture, duplicated implementations or temporary shortcuts as permanent design.

## 7. Verification must be meaningful

Prefer deterministic verification that can independently disagree with the implementation.

Do not add tautological tests or checks that merely restate the implementation.

Use the upstream TDD method when its trigger applies. Do not force TDD for wiring-only, generated, declarative or purely visual changes when it would provide no independent oracle.

Negative and adversarial verification should be proportional to actual risk, especially around authorization, parsing, trust boundaries, migrations, failure/retry behavior, state transitions and destructive operations.

## 8. Fail explicitly when correctness requires knowledge

Do not hide invariant, authority, persistence or safety failures behind silent fallbacks, guessed defaults or "best effort" success.

When correctness depends on knowing, `UNKNOWN` is not `SUCCESS`.

Return or propagate actionable failures. Make retry, idempotency and recovery semantics explicit when operations may repeat or produce persistent side effects.

Preserve enough diagnostic context to understand failures without leaking secrets.

## 9. Dependencies must earn their cost

Add a dependency only when it provides concrete value that is not reasonably available from the existing stack or a small local implementation.

Consider maintenance, transitive risk, runtime weight, upgrade burden and lock-in. Remove dependencies that no longer justify their cost.

Do not build internal substitutes for mature upstream capabilities merely to avoid a dependency that the architecture has already adopted.

## 10. Security and data boundaries must be explicit

Apply least privilege and minimize credential and data exposure.

For sensitive or persistent data, make ownership, trust boundaries and mutation authority explicit.

Never log secrets or credentials. Avoid broad environment or credential propagation when a narrower boundary is available.

Security controls should match the actual threat and risk model; do not invent a bespoke security platform without a concrete requirement.

## 11. Performance and scale require evidence

Optimize when requirements, measurements or credible load characteristics justify it.

Do not pre-emptively introduce caches, queues, sharding, microservices, distributed coordination or generic scalability abstractions.

For Atenea, "scalable" means the software can be understood, modified, tested, operated and extended without each change multiplying fragility.

## Review interpretation

Upstream Matt `code-review` may consume this file as the repository Standards axis when that skill is explicitly invoked. This does not make Matt `code-review` part of the default autonomous execution lifecycle.

Repo standards here override generic preferences where they conflict. Gentle native RDD remains the default final candidate review authority; this file is engineering policy, not a second review lifecycle.

## PROMueve clinical/semantic additions

### 12. Preserve explicit clinical meaning

Clinical source text, parsed concepts, proposed values, applied values and current editable form values are distinct states. Do not collapse them into one variable when that would erase provenance or professional confirmation boundaries.

Never turn absence, unknown, `NO_VALUE`, `No informado` or parser failure into a therapeutic default. Fail safe and preserve the explicit source/raw evidence required by the current contract.

### 13. Parser and importer discipline

For contractual parsers/importers, prefer explicit table-driven grammar/state rules and named contractual tokens over hidden normalization, positional magic or convenience heuristics. Only normalizations explicitly authorized by the live spec are allowed.

Each contractual exception or negative boundary should have an independent fixture when material: missing required sections, altered labels/order, whitespace boundaries, duplicated/ambiguous values, unsupported multi-record input and parser exceptions.

The implementation must not author the principal acceptance oracle it is being judged against. Builder-added tests may supplement but never replace the frozen acceptance package.

### 14. Clinical UI/apply boundaries

Parsing and preview do not authorize apply. Source association does not equal clinical validation. Applying a proposed source value requires the explicit professional confirmation and protection rules defined by the current live contract.

A value already present in the form must not be overwritten unless the current contract explicitly authorizes that exact transition. Browser QA must use supported interactions and synthetic data.
