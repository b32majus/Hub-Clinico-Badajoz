# WO-OPS-ATENEA-C087-FREE-ROUTE — Nexus Free binding preparation

Status: local configuration candidate; NOT PUSHED, NOT MERGED, NOT ACTIVE on canonical. Prepared separately from product issue #671.

## Authority and why
The operator requested Free routing for future Nexus work. Nexus canonical promueve/nexus-v4@5445878 already has Atenea PR #145/#146 via Nexus PR #738, with GLM High Standard Complex. Nexus had no callable atenea-free agents. Atenea main@2f8ace5 has the complete, current Free-only family; its model preflight passes on this VPS.

## Exact configuration
- Copy only the eight Free-specific agent definitions from current Atenea into .opencode/agents/. No other agent, model, or permission changes.
- Copy the exact current Free policy and catalog, and the model availability checker, into Nexus.
- Update only the existing local routing statement that previously described Free as unbound.
- Do not change defaults, any Standard/Volume/Go/Frontier/OpenAI bindings, product runtime, patient data, Herdr, project identity or existing sessions.

## Proof and human boundaries
- Byte-identical to Atenea fixed SHA for all eight Free agents, policy, catalog and checker; inspect coordinator permissions and exact seven child role allowlist, read-only reviewers, isolated correction models and no model fallback.
- Checker PASS for bound models; local scope and diff clean, GLM High unchanged. No clinical test suites.
- #671 is already in progress with Standard Complex and cannot be switched mid-unit; the Free route is for the *next separately accepted work unit* after this isolated change is merged.
- No push, PR, merge, deploy or launch without authority and accepted issue for this separate configuration WO. If Free usage presents a material privacy or source-eligibility issue for future actual data, HUMAN STOP; only synthetic/demo data is permitted.
