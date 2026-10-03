# Domain docs — PROMueve Nexus

PROMueve is a multi-domain clinical repository. There is no root `GLOSSARY.md` today; do not create one merely to satisfy tooling. Use the repository's existing live authorities.

Before exploring domain behavior, read only what the task needs:

1. `docs/INDEX.md` and `docs/ops/WORK_ORDER_STATUS.md`;
2. the accepted issue/spec/WO;
3. `docs/architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md` and relevant `docs/architecture/adr/ADR-*.md` when architecture is implicated;
4. the live module audit/contract/plan linked from INDEX;
5. the applicable project-local skill under `.agents/skills/` for Farmacia/UI/QA/documentation.

Use established clinical/product vocabulary from those authorities. If a proposed change contradicts an ADR or clinical invariant, surface the conflict explicitly instead of silently overriding it. Historical recovery plans, old Atenea runbooks and conversational memory are evidence/provenance, not current authority.
