# ROADMAP — bpmn-js-side-panel

The `bpmn-js-side-panel` aims at maximum compatibility with `bpmn-js-properties-panel`, both in terms of user interface as well as API. If necessary downstream user need to be updated accordingly. Overarching requirements is a clean implementation with a minimum of workarounds or hacks. Some hacks may be required to achieve upstream compatibility with `bpmn-js-properties-panel`. These should be used very carefully and should be well documented. An upstream change should be unlikely to break this implementation.

Downstream repos: **bpmnos-js** (its Issues panel), **bpmn-workbench** and **bpmnos-workbench** (Tokens, Messages, and the
decision panels) — see those repos' roadmaps for how they use it.

Add a demo modeller using `bpmn-js-properties-panel` and GH action to automatically deploy the demo to GH pages. Add a reusable **collapsible entry** to the side panel, matching `@bpmn-io/properties-panel`'s collapsible entry in look and API (in plain DOM), so any tab can present rich, expandable lists that are visually consistent with the Properties tab. It is built as small tasks, each leaving a demo that can be visually validated.


## Collapsible entries

**1 · Collapsible entry (core)**
- **Goal:** A reusable entry with a collapsed summary and optional expandable content, expandable only when content is supplied (otherwise a plain row).
- **Prerequisites:** None.
- **Details:** Match `@bpmn-io/properties-panel`'s collapsible entry (`bio-properties-panel-collapsible-entry`, with its header, title, `-arrow-right`/`-arrow-down` disclosure, and entries body) in both look and API, in plain DOM (min-dom, no preact). Reuse the properties-panel CSS variables and classes so an entry is visually consistent with the Properties tab. Expose an API shaped like the properties-panel `CollapsibleEntry` (`{ id, label, entries/content, open }`). To support point 5, it may be an option to leverage on `Group.js` from `@bpmn-io/properties-panel`.
- **Validation:** The demo shows an entry expanding and collapsing, a content-less entry rendering as a plain row, and styling that matches the properties panel.

**2 · Entry action buttons**
- **Goal:** Let entries carry action buttons such as confirm and delete.
- **Prerequisites:** 1.
- **Details:** Add a per-entry controls area for action icons (e.g. confirm, delete), available even on non-expandable entries, with the consumer supplying the handlers.
- **Validation:** The demo fires an entry's confirm and delete actions, and a non-expandable entry still shows its controls.

**3 · Reorder entries**
- **Goal:** Let a list of entries be reordered with up and down controls.
- **Prerequisites:** 2.
- **Details:** Add standard up/down controls that emit a reorder callback (e.g. `onMove(id, dir)` / `onReorder(from, to)`) and disable at the list ends, keyboard-accessible. The consumer owns the ordered data and what the order means; the entry only renders the controls and reports moves.
- **Validation:** The demo reorders a list on up/down, reports the new order, and disables the controls at the ends.

**4 · Live entry updates**
- **Goal:** Let an entry's contents update in place without losing its expanded or focused state.
- **Prerequisites:** 1.
- **Details:** Update an entry's summary and content in place without losing its expanded/collapsed state, focus, scroll position, or any input in progress.
- **Validation:** The demo updates an entry's content while it stays expanded and focused.

**5 · Nested entry groups**
- **Goal:** Let an entry contain a nested list of entries.
- **Prerequisites:** 1.
- **Details:** Support a collapsible group whose expanded content is itself a list of collapsible entries.
- **Validation:** The demo expands a group to reveal a sub-list of entries.

**6 · All/selected filter**
- **Goal:** Give an entry list an "all versus selected" filter.
- **Prerequisites:** 1.
- **Details:** Add a reusable filter header offering "all" or "selected" for an entry list.
- **Validation:** The demo toggles an entry list between all and selected.

## For later

Add edit | view toggles to propoerties panel. In view mode a readability focussed view of the element's properties is to be shown.