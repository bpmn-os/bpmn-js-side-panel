# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm test` — runs `node --test test/*.test.mjs` (built-in Node test runner). `test/` holds
  `collapsible-entry.test.mjs`; add further tests as `test/*.test.mjs`, run a single file with
  `node --test test/foo.test.mjs`. The DOM comes from **linkedom** (`parseHTML`), assigned to
  `globalThis.document` — so **structure and behaviour are testable, geometry is not** (linkedom does
  no layout). A claim about size or alignment has to be measured in a real browser; the token rows of
  `bpmn-js-animation` are where that has been done.

There is no build step — `src/` is shipped as-is (ESM). No linter is configured.

## What this is

A diagram-js/bpmn-js additional module exposing a `sidePanel` service: a resizable, tabbed panel
placed beside the canvas. If the `bpmn-js-properties-panel` module is registered, its panel is
hosted as the first ("Properties") tab; consumers add further tabs via `addTab()`.

The package (`main`/`module`) points at `src/index.js` directly — consumers import the ESM source,
and separately import `assets/side-panel.css`.

## Architecture

Two source files plus one stylesheet — but the design hinges on a division of labor between JS and
CSS that isn't obvious from either alone:

- `src/index.js` — the diagram-js module definition (`__init__: ['sidePanel']`), plus the entry
  factories it re-exports.
- `src/SidePanel.js` — the service. Wired via `$inject` on `config.sidePanel`, `injector`,
  `eventBus`, `canvas`. Builds all DOM imperatively (no framework; plain `document.createElement`
  via the local `el()` helper).
- The **entry components**, each a factory returning a handle over a plain element:
  `CollapsibleEntry.js`, `PlainEntry.js`, `TableEntry.js`, `ListEntry.js`, `OrderedListEntry.js`,
  `Separator.js`, over the shared `entryUtil.js`.
- `assets/side-panel.css` — layout + chrome.

**An entry's shape does not depend on its state.** The insets are owned by the entry, not by the
consumer, so that every entry in every tab lines up. The disclosure caret is part of that: it is
rendered for a **plain** (non-expandable) entry too and hidden with `visibility`, never `display`, so
the row keeps its space and a list mixing plain and expandable rows holds one alignment. Dropping the
element instead widens a plain row's title by the caret's 22px plus its 4px gap, which is what the
component did before and what misaligned such a list. On a plain row the caret is inert: `disabled`,
`tabIndex -1`, `aria-hidden`, no `aria-label` and no listener. `bjs-caret-left` is likewise applied by
the requested side alone, not by expandability, so the reservation sits where the siblings' carets are.

**JS/CSS contract (the key thing to understand):** on `diagram.init`, `_init()` mounts into the
configured `parent` slot and *stamps two class names* — `.bjs-layout` on the slot's parent (the
wrapper) and `.bjs-side-panel-parent` on the slot itself. The CSS keys off those classes to make
the wrapper a flex row, grow the canvas sibling, and fix the panel width. So the host writes **no
layout CSS** and must not — it only provides the wrapper + slot markup and a height. Width (initial
and drag-resize) is owned by the JS, set as an inline style on the slot. Don't move width logic into
CSS or hardcode layout the host is expected to own.

**Properties-panel hosting:** `_init()` does `injector.get('propertiesPanel', false)` and, if
present, `propertiesPanel.attachTo(pane)` into a "Properties" tab (priority 1000, so it sorts
first). Consumers using the properties panel must **not** set its `parent` — the side panel owns
placement. This is the main upstream-compatibility seam.

**Lifecycle:** `diagram.init` → `_init()`, `diagram.destroy` → `_destroy()` (removes the container
and un-stamps the layout classes).

**Tabs:** kept in `this._tabs`, sorted by `priority` descending (higher = first). The tab bar hides
itself when only one tab exists (`_renderTabs`). `addTab` returns the content `pane` element for the
caller to render into.

**Resize:** left-edge pointer-drag handle; dragging left widens. On pointer-up it calls
`canvas.resized()` so diagram-js re-measures.

## Design constraints (from ROADMAP.md)

The overriding goal is **compatibility with `bpmn-js-properties-panel`** (UI and API), so downstream
repos (**bpmnos-js**, **bpmn-workbench**, **bpmnos-workbench**) can adopt it. Prefer a clean
implementation with minimal hacks; any hack needed for upstream compatibility must be rare and
well-documented so an upstream change is unlikely to break it.

Planned work centers on a reusable **collapsible entry** that matches `@bpmn-io/properties-panel`'s
`bio-properties-panel-collapsible-entry` in look and API, built in plain DOM (min-dom, no preact),
reusing the properties-panel CSS variables/classes. See ROADMAP.md for the staged task list.

## Conventions

- Plain DOM only — no preact/framework in this package (matches the properties-panel direction of
  building entries in plain DOM).
- CSS custom properties are declared once at `:root` (a grey ramp + accent) with `var(--x,
  fallback)` fallbacks, so hosts and hosted tab modules can re-theme from one place; the active-tab
  accent is themable via `--bjs-side-panel-accent`.
