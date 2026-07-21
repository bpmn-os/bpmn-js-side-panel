# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm test` — runs `node --test test/*.test.mjs` (built-in Node test runner). Note: no `test/`
  directory exists yet, so this currently matches nothing. Add tests as `test/*.test.mjs`; run a
  single file with `node --test test/foo.test.mjs`.

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

- `src/index.js` — the diagram-js module definition (`__init__: ['sidePanel']`).
- `src/SidePanel.js` — the service. Wired via `$inject` on `config.sidePanel`, `injector`,
  `eventBus`, `canvas`. Builds all DOM imperatively (no framework; plain `document.createElement`
  via the local `el()` helper).
- `assets/side-panel.css` — layout + chrome.

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
