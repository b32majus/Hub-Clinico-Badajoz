# PROMueve Nexus — Atenea C-087 local reconciliation

Status: **CURRENT LOCAL EXECUTION RECONCILIATION**
Date: 2026-10-06

Canonical project fixed point before this reconciliation: `promueve/nexus-v4@728163c73312e3607114e72c1d4acc129fd98bdd`.
Canonical Atenea: `b32majus/Atenea@ddaf9612da67da42eb9bd2c9c03d652b254cc332` (C-087, PR #135).

Nexus adopts C-087 without changing clinical/product authority, cost policy, risk classification or any current work-order decision.

Local Nexus affected-surface / representation / clinical safety guardrails remain project authority. C-087 changes only the shared execution transport boundary here:
- child agents receive required authority through readable repo-local references or compact inline capsules;
- no child verdict depends on external `/outbox`/`/tmp`/other-worktree paths;
- reviewers fail closed with `INCOMPLETE_AUTHORITY` rather than guessing;
- Cora-side pre-execution hardening remains canonical Atenea preparation authority and is not duplicated into project `AGENTS.md`.

No product code, test, clinical data contract, routing model or publication state is changed by this reconciliation.
