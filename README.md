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

- `addTab({ id, label, priority = 0 }) -> HTMLElement` — add a tab; higher priority is placed
  first; returns the content element to render into.
- `removeTab(id)`
- `activate(id)`
- `getTab(id) -> { id, label, pane } | undefined`

The tab bar is hidden automatically when there is only one tab.

## Styling

Import `bpmn-js-side-panel/assets/side-panel.css`. The active-tab accent can be themed:

```css
:root { --bjs-side-panel-accent: #52b415; }
```

## License

MIT
