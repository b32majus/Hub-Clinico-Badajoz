---
name: promueve-vanilla-ui
description: "Trigger: UI, HTML, CSS, JavaScript, forms, dashboards, modals or responsive changes in PROMueve. Preserve the current vanilla stack and verify user-facing behavior through supported interactions."
---

# PROMueve vanilla UI

Use this skill for user-interface changes in Hub Clínico Badajoz.

## Current stack boundary

- The active product is plain HTML/CSS/JavaScript without a mandatory package manager, bundler or framework.
- Do not introduce React, Vue, build tooling or a new dependency merely to implement a local UI change.
- Follow the existing page/script/module structure unless the accepted task explicitly changes the architecture.
- Prefer reusable CSS classes over new inline style attributes.

## Product behavior before polish

Preserve clinical meaning, existing data contracts and supported workflows before changing layout or aesthetics.

Use semantic controls, labels, keyboard-operable interactions and visible focus. Do not rely on color alone to convey state.

Avoid broad redesign while implementing a bounded functional fix unless redesign is itself accepted scope.
## Verification

For affected JavaScript, run `node --check` where applicable and the focused deterministic project checker for the changed behavior.

For interactive/visual behavior, use a supported browser path. Do not mutate the DOM, force readonly fields, inject impossible state or bypass the normal UI merely to make QA pass.

Check relevant responsive widths and horizontal overflow when layout changes. Console/page errors should remain zero where the browser harness exposes them.

Screenshots are supplementary evidence; deterministic assertions and supported interaction remain primary.

Pi + Gentle own execution/review mechanics. This skill contains only project-specific UI constraints.