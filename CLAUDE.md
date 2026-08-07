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
  `SimpleEntry.js`, `CollapsibleEntry.js`, `TableEntry.js`, `ListEntry.js`, `OrderedListEntry.js`,
  `ControlButton.js`, `Separator.js`, over the shared `entryUtil.js`, which holds `buildEntryRow` (the
  collapsible entry's summary row), `labelSetter`, `contentSetter` and `makeClickable`.

**Two ways to be an entry, and which is which.** A **simple** entry is what it holds: content that is
shown always, running over as many lines as it needs, with a slot to the right of it for the controls
that act on it. A **collapsible** entry is a summary row — a label that is one line and truncates, its
controls, and a caret — over a body that is shown only when it is open; its `expandable: false` is for a
row that cannot open but stands among rows that can, which is why such a row keeps the caret's space.
A list, an ordered list and a table are entries too, and every one of them carries `bjs-entry`, which is
what the CSS selects on to give an entry the field of the slot it stands in.

Nothing is named by an option: a list is named by nesting it in a collapsible entry, whose label is the
name and whose body is the list. The alternative, a heading option on the list, would be a second way to
write a label and would drift from the first.
- `assets/side-panel.css` — layout + chrome.

**An entry's shape does not depend on its state.** The insets are owned by the entry, not by the
consumer, so that every entry in every tab lines up. Within the collapsible entry the disclosure caret
is part of that: it is rendered for a non-expandable entry too and hidden with `visibility`, never
`display`, so the row keeps its space and a list mixing the two holds one alignment. Dropping the
element instead widens such a row's title by the caret's 22px plus its 4px gap, which is what the
component did before and what misaligned such a list. On a non-expandable row the caret is inert:
`disabled`, `tabIndex -1`, `aria-hidden`, no `aria-label` and no listener. `bjs-caret-left` is likewise
applied by the requested side alone, not by expandability, so the reservation sits where the siblings'
carets are. A row that discloses nothing at all in a list where nothing discloses is a **simple**
entry instead, and reserves nothing.

**Structure.** The panel is a grid of four children: `bjs-panel-divider` in the first column spanning every
row, and `bjs-panel-header`, `bjs-panel-body` and `bjs-panel-footer` stacked in the second. The body holds
`bjs-panel-tabs` (the `bjs-tab-selector` buttons) and one `bjs-tab` per tab, each of which holds
`bjs-tab-header`, `bjs-tab-body`, `bjs-tab-footer` and `bjs-tab-note`. Both levels are reached the same
way: `addTab` hands back a tab's three, `getSlots` hands back the panel's two, and a note stands in for the
whole of a tab rather than part of it. The `header` config remains for a host with nothing to change. Every name states the level it belongs to. The grid
exists so that the panel's own parts are siblings: an intermediate wrapper would have to be called a body,
and that is exactly what went wrong before — `.bjs-side-panel-body` named both the panel's wrapper and a
tab's scrolling body, so the stylesheet declared it twice and each element silently received the union of
both rules. `.bjs-layout`, `.bjs-side-panel-parent` and `body.bjs-side-panel-resizing` name where the panel
sits in its host and what is being done to it rather than what it is made of, and keep their names.

**Resizing.** The divider sets the panel's width, and there is no floor unless a host gives `minWidth`, so
the panel collapses to the divider and the divider is what brings it back; a double click on it collapses
and restores. The selectors scroll horizontally rather than shrinking past reading, their scrollbar hidden
and their ends masked so that the strip says there is more of it.

**The demo** (`npm run dev`, `demo/`) is the package shown working: a modeller, the properties panel hosted
through the `propertiesPanel` seam, and a tab whose entries each say what they are. It runs `src/` directly
rather than a copy, so it is the thing to look at when a change is visual.

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

## Design constraints

The overriding goal is compatibility with `bpmn-js-properties-panel`, in look and in API, so that a host
may put a properties panel in one tab and its own content in the next and read them as one panel. Prefer a
clean implementation with minimal hacks; any hack needed for that compatibility must be rare and
well-documented, so that an upstream change is unlikely to break it.

The entries are what carries it. Each matches the corresponding `@bpmn-io/properties-panel` element in
look — the collapsible entry against `bio-properties-panel-collapsible-entry`, the table's plus and trash
against its list controls — while using this package's own `bjs-*` classes and `--bjs-*` tokens, so there
is no dependency on properties-panel and no class or CSS overlap with it.

## Conventions

- Plain DOM only — no preact/framework in this package (matches the properties-panel direction of
  building entries in plain DOM).
- CSS custom properties are declared once at `:root` (a grey ramp + accent) with `var(--x,
  fallback)` fallbacks, so hosts and hosted tab modules can re-theme from one place; the active-tab
  accent is themable via `--bjs-side-panel-accent`.
