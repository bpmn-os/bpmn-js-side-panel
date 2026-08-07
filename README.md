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

- `addTab({ id, label, priority = 0, width, open = true }) -> { header, body, footer }` — add a tab;
  higher priority is placed first. The three elements are the tab's own: a header and a footer that stay
  put, and a body that scrolls between them. `width` and `open` say what the tab is as a column, and are
  ignored by the tabbed view.
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
- `setViewMode('tabbed' | 'columns')` and `getViewMode()` — show the tabs one at a time, or all of them
  side by side as columns. It may also be stated at construction with `viewMode`.
- `setTabLabel(id, label)` — rename a tab, which names it on its selector and on its column's resizer at
  once. A name that says how much a tab holds changes while a run does, and a host that could name a tab
  only as it added one could not say so.

The tab bar is hidden automatically when there is only one tab, and scrolls horizontally when its
selectors crowd, its ends fading to say that there is more of it.

## The two views

A panel shows its tabs one at a time, which is the default, or all of them at once as columns. The two are
one set of elements: a change of view builds nothing, moves nothing and throws nothing away, so a tab keeps
its content, its scroll position and whatever a host is holding of it, and a tab may be added or taken away
in either view. A tab says what it is as a column when it is added, through `width` and `open`; a tab that
says neither takes a default width and stands open, and what it says survives a switch to the tabbed view
and back, so a reader who arranged the columns finds the arrangement again.

In the column view every column carries a resizer at its left edge and the panel carries none, being as
wide as the sum of its resizers and its open columns rather than having a width of its own. Dragging a
resizer sets that column's width: everything to its right is anchored and never moves, so the resizer goes
exactly where the pointer takes it, and everything to its left keeps its width and translates, which is to
say the panel's left edge moves and the diagram gives up that room or takes it back. There is nothing to
divide up and therefore no minimum widths, no distribution and no clipping; where the columns together want
more room than the window has, the canvas gives way first and what still does not fit is cut off at the
right, which a reader undoes by narrowing the rightmost column. No drag can put a resizer out of reach,
since a resizer follows the pointer and the pointer cannot leave the window.

A double click on a resizer closes its column and opens it again at the width it had, growing and shrinking
into place rather than jumping, and `prefers-reduced-motion` is honoured. Dragging a column to nothing
closes it in the same way and remembers the width it had when the drag began, so the two gestures leave the
same state; dragging the resizer of a closed column pulls it open again. Closing every column leaves the
panel as its resizers and nothing else, which is how a reader puts the whole panel away.

A resizer carries its column's name, read upward between the two halves of its grip. The name takes a
stated length, `--bjs-tab-name-length`, rather than one measured from the longest name, so that a name
saying how much its tab holds — `Tokens (5)` one moment and `Tokens (214)` the next — moves no grip when it
changes; a longer name is cut short. `setTabLabel(id, label)` renames a tab in both views at once.

The panel's own header and footer stand at `--bjs-panel-slot-height`, 40px by default, and a tab's stand at
64px. All four clip what a host puts in them rather than wrapping it, in width and in height alike: a band
that grew to fit its content would set the panel's width in the column view, where the width is what the
columns say, and would move where the tabs begin and end. An entry likewise keeps `--bjs-entry-min-width`,
260px by default and the same measure a column takes when its tab states none, so narrowing a column
changes how much of it is seen rather than how it is written.

Which view is shown is the host's business and the panel draws no control for it. A host that offers the
reader a choice draws that control where its own furniture goes, as the demo does with an entry in the
panel's footer. Nothing is announced when the view changes, since a view that changes while a reader
watches is a demonstration rather than a use.

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

The measures the panel keeps are tokens, and a host retunes any of them: `--bjs-panel-slot-height` is the
height of the panel's own header and footer, `--bjs-tab-name-length` the space a column's name takes on its
resizer, and `--bjs-entry-min-width` the width an entry keeps whatever holds it.

Two more govern where the content of an entry sits, and a host retunes either without disturbing the
other. `--bjs-entry-inset` is the reading inset, where a line of text starts and stops, and is 12px.
`--bjs-control-gap` is the gap a circular control keeps from the edge of what holds it — a disclosure
caret, a control a row carries, a reorder arrow — and is 4px, smaller than the reading inset because a
22px circle carries an optical margin of its own. An entry pays both itself, so it is full-width and its
insets are internal, and a container that has already paid the left inset for what stands in it says so
with `--bjs-entry-inset-left: 0`, which is how the inset is paid once however deeply an entry is nested.

## License

MIT
