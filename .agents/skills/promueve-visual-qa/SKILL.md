---
name: promueve-visual-qa
description: "Trigger: browser QA, visual QA, Playwright, responsive verification, screenshots or interactive regression checks in PROMueve. Reuse project browser checkers and synthetic supported interactions."
---

# PROMueve visual QA

Use this skill when the task requires browser or visual evidence.

## Prefer project evidence

1. Reuse the existing focused browser checker in `tools/` when one covers the changed seam.
2. Use synthetic fixtures and supported user interactions.
3. Verify the relevant deterministic checker/smoke alongside browser behavior.
4. Record the exact command and result for the candidate actually reviewed.

The repo has no mandatory `package.json`; where an existing checker expects Playwright, use its documented/supported invocation rather than introducing a package manifest solely for QA.

## Do not fake the interaction

Do not prove behavior by directly manipulating DOM state, removing readonly/disabled gates, fabricating impossible persisted state or calling private internals when the contract requires a user-visible workflow.

Where available, assert `console.error = 0` and `pageerror = 0`.
## Visual evidence

Screenshots are useful for layout comparison, but they do not replace assertions for clinical state, persistence, source association or validation boundaries.

When layout changes, inspect the widths relevant to the accepted task and check horizontal overflow/focus/labels as applicable.

Generated snapshots such as `previews/caceres-fh/` are publication artifacts with their own builder/checker contract. Never hand-edit them during ordinary UI QA.

This skill does not create a separate review lifecycle. Native Gentle RDD remains the candidate review mechanism.