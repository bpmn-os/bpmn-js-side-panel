# bpmn-js-side-panel

A resizable, tabbed side panel for [bpmn-js](https://github.com/bpmn-io/bpmn-js) /
[diagram-js](https://github.com/bpmn-io/diagram-js).

- The panel is placed next to the canvas.
- A properties panel, if present, is shown as the first tab.
- Any number of tabs can be added.
- The panel can be resized by dragging its left edge.

## Usage

Wrap the canvas and a panel slot in a container (give the container — or an ancestor like `body` — a
height):

```html
<div class="bpmn-ui">
  <div class="canvas" id="canvas"></div>
  <div class="side-panel" id="side-panel"></div>
</div>
```

```js
import BpmnModeler from 'bpmn-js/lib/Modeler';
import SidePanelModule from 'bpmn-js-side-panel';
import 'bpmn-js-side-panel/assets/side-panel.css';

const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [
    // ...the properties panel module, if you use one...
    SidePanelModule
  ],
  sidePanel: {
    parent: '#side-panel',   // the panel slot (a flex sibling of the canvas)
    width: '300px',          // optional initial width
    minWidth: 180            // optional min width while resizing (px)
    // header: '<img …>'      // optional content shown above the tabs
  }
});

const sidePanel = modeler.get('sidePanel');

// add your own tabs; render into the returned element
const issues = sidePanel.addTab({ id: 'issues', label: 'Issues', priority: 0 });
issues.appendChild(/* ... */);
```

The module mounts into the `parent` slot and stamps the layout classes (`.bjs-layout` on the wrapper,
`.bjs-side-panel-parent` on the slot) so `side-panel.css` arranges the two panes. If the properties
panel module is registered, **do not** set its `parent` — the side panel attaches it into a
"Properties" tab.

## API (`modeler.get('sidePanel')`)

- `addTab({ id, label, priority = 0 }) -> { header, body, footer }` — add a tab; higher priority is
  placed first. The three elements are the tab's own: a header and a footer that stay put, and a body
  that scrolls between them.
- `getSlots() -> { header, footer }` — the panel's own slots, which span it whichever tab is shown.
  They are elements a host fills rather than content given at construction, so what governs the whole
  panel, and changes while it does, can live there.
- `removeTab(id)`
- `activate(id)`
- `getTab(id) -> { id, label, pane } | undefined`
- `setNote(id, note)` — show a note in place of a tab's content, `note` being an HTML string or an
  element, or `null` to restore the content. The tab keeps its title and its place; what it holds is
  hidden while the note stands there. It is for a tab whose content does not apply for the moment and
  whose absence would otherwise be unexplained, a properties panel during a simulation among them.

The tab bar is hidden automatically when there is only one tab, and scrolls horizontally when its
selectors crowd, its ends fading to say that there is more of it.

The panel is resized by dragging its divider, and collapses to it: there is no minimum unless a host asks
for one with `minWidth`, so the panel can be put away entirely and its divider is what remains to bring it
back. A double click on the divider collapses it and restores the width it had.

## Entry factories

What a tab's header, body and footer hold is a sequence of entries, and the panel provides the factory for
each kind. A **simple** entry is what it holds: content that is shown always, over as many lines as it
needs, with a slot for the controls that act on it. A **collapsible** entry is a summary row — a label of
one line, its controls, and a caret — over a body shown only while it is open, and its `expandable: false`
is a row that cannot open but stands among rows that can. A **list** and an **ordered list** hold entries
by key, adding, removing and moving them in place rather than rebuilding, the ordered one with arrows the
reader reorders by. A **table** is rows under named columns, edited in place, and owns the CSV it saves
and loads. A **separator** divides one entry from the next, and a **control button** is the small circular
control an entry carries.

Nothing is named by an option of its own: a list is named by nesting it in a collapsible entry, whose
label is the name and whose body is the list. See [docs.md](./docs.md) for every option, what each factory
returns, and examples.

## Structure

The panel is a grid of four parts, and each name states the level it belongs to, so that no word names two
things. The panel has a divider, a header, a body and a footer; a tab has a body, a footer and a note. The
divider occupies the first grid column and spans every row, so it is the panel's full height, while the
other three stack in the second column.

```
bjs-panel                 the panel itself
  bjs-panel-divider       its left edge, which resizes it
  bjs-panel-header        a slot spanning the panel, above everything
  bjs-panel-body          the tab selectors and the tabs; the part that grows
    bjs-panel-tabs        the selectors, hidden while there is only one tab
      bjs-tab-selector
    bjs-tab               one per tab, of which one is active
      bjs-tab-header      fixed at the head of the tab
      bjs-tab-body        scrolls
      bjs-tab-footer      fixed at the foot of the tab
      bjs-tab-note        stands in for all three while a note is set
  bjs-panel-footer        a slot spanning the panel, below everything
```

The header and the footer are built whether or not a host fills one, and an empty slot takes no room and
draws nothing. The two classes a host may see elsewhere, `.bjs-layout` and `.bjs-side-panel-parent`, name
where the panel sits in its host rather than what it is made of, and are unchanged.

## Demo

`npm run dev` serves `demo/`, which is the package shown working rather than described: a modeller with the
properties panel hosted in a tab of its own, and a tab the demo adds, whose every entry says what it is.

## Styling

Import `bpmn-js-side-panel/assets/side-panel.css`. The active-tab accent can be themed:

```css
:root { --bjs-side-panel-accent: #52b415; }
```

Two tokens govern where the content of an entry sits, and a host retunes either without disturbing the
other. `--bjs-entry-inset` is the reading inset, where a line of text starts and stops, and is 12px.
`--bjs-control-gap` is the gap a circular control keeps from the edge of what holds it — a disclosure
caret, a control a row carries, a reorder arrow — and is 4px, smaller than the reading inset because a
22px circle carries an optical margin of its own. An entry pays both itself, so it is full-width and its
insets are internal, and a container that has already paid the left inset for what stands in it says so
with `--bjs-entry-inset-left: 0`, which is how the inset is paid once however deeply an entry is nested.

## License

MIT
