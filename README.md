# bpmn-js-side-panel

A resizable, tabbed side panel for [bpmn-js](https://github.com/bpmn-io/bpmn-js) /
[diagram-js](https://github.com/bpmn-io/diagram-js).

- Works **with or without** the properties panel — if a `propertiesPanel` service is present it
  is hosted automatically as the first tab.
- Holds **any number of tabs** (e.g. issues, simulation), added via a small API.
- The panel is **resizable** via a left-edge drag handle; the canvas refits afterwards.

## Usage

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
    parent: '#side-panel',   // selector or element; its width is resized
    width: '300px',          // optional initial width
    minWidth: 180            // optional min width while resizing (px)
  }
});

const sidePanel = modeler.get('sidePanel');

// add your own tabs; render into the returned element
const issues = sidePanel.addTab({ id: 'issues', label: 'Issues', priority: 0 });
issues.appendChild(/* ... */);
```

If the properties panel module is registered, **do not** set its `parent` — the side panel
attaches it into a "Properties" tab.

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
