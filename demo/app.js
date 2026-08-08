import BpmnModeler from 'bpmn-js/lib/Modeler';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import '@bpmn-io/properties-panel/assets/properties-panel.css';

import SidePanelModule, {
  createCollapsibleEntry,
  createControlButton,
  createListEntry,
  createOrderedListEntry,
  createSeparator,
  createSimpleEntry,
  createTableEntry
} from '../src/index.js';

import '../assets/side-panel.css';
import './demo.css';

import diagramXML from './diagram.bpmn?raw';

const CHAT_ICON = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
  + ' stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M1 14l1-4H1V3c0-1 1-2 2-2h10c1 0 2 1 2 2v7c0 1-1 2-2 2H4l-3 3z"/></svg>';

/**
 * The package shown working, and describing itself while it does.
 *
 * Every part of the panel says what it is, so that reading the demo and reading the documentation are the
 * same act. Two of the things it shows are contracts rather than appearances. The properties panel is
 * hosted automatically: it is registered as the `propertiesPanel` service and the side panel finds it,
 * makes a tab for it and attaches it there, which is why its own `parent` is not set here and must not be.
 * And a tab of one's own is added with `addTab`, which hands back that tab's body and its footer.
 */
const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    SidePanelModule
  ],
  sidePanel: {
    parent: '#side-panel',

    // What a host puts in the panel's header: the name of the thing and a link to its source.
    header: '<div class="demo-brand">'
      + '<span class="demo-brand-name">bpmn-js-side-panel</span>'
      + '<a class="demo-brand-gh" href="https://github.com/bpmn-os/bpmn-js-side-panel" target="_blank"'
      + ' rel="noopener" title="View source on GitHub" aria-label="GitHub repository">'
      + '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">'
      + '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49'
      + '-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82'
      + '.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15'
      + '-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2'
      + '-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54'
      + ' 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>'
      + '</svg></a></div>'
  }
});

await modeler.importXML(diagramXML);
modeler.get('canvas').zoom('fit-viewport');

const sidePanel = modeler.get('sidePanel');

// The panel's own footer, spanning it below everything and standing whichever tab is shown. It is where
// what governs the whole panel belongs, since a tab is shown one at a time and this is not. Both of the
// controls here are the host's own: the panel offers neither, the view being the host's to choose and a
// tab being the host's to add.
sidePanel.getSlots().footer.appendChild(createSimpleEntry({ content: viewControls() }).element);
sidePanel.getSlots().footer.appendChild(createSimpleEntry({ content: tabControls() }).element);

const custom = sidePanel.addTab({ id: 'custom', label: 'Custom' });

// The tab's header, which stays at the head of this tab while the body scrolls under it.
custom.header.appendChild(createSimpleEntry({ content: 'Custom header' }).element);

custom.body.appendChild(createSimpleEntry({
  content: 'A simple entry, whose content is shown always and runs over as many lines as it needs.'}).element);

custom.body.appendChild(createSeparator());

custom.body.appendChild(createSimpleEntry({
  content: 'A simple entry with a button.',
  controls: createControlButton({ icon: CHAT_ICON, title: 'Say Hi', onClick: () => alert('Hello!') })
}).element);

custom.body.appendChild(createSeparator());


custom.body.appendChild(createCollapsibleEntry({
  id: 'demo-collapsible',
  label: 'A collapsible entry',
  open: true, // default: false
  content: 'Its content is disclosed by the caret. An entry is the full width of the panel.'
}).element);

custom.body.appendChild(createSeparator());

// A list nested in a collapsible entry, which is how a list is given a name: the entries are composed,
// the list holding the entries and the collapsible holding the list.
custom.body.appendChild(createCollapsibleEntry({
  id: 'demo-list-group',
  label: 'My list',
  content: createListEntry({
    id: 'demo-list',
    separators: true,
    items: [
      { key: 'first', element: createSimpleEntry({ content: 'Item 1.' }).element },
      { key: 'second', element: createSimpleEntry({ content: 'Item 2.' }).element },
      { key: 'third', element: createSimpleEntry({ content: 'Item 3.' }).element }
    ]
  }).element
}).element);

custom.body.appendChild(createSeparator());

custom.body.appendChild(createCollapsibleEntry({
  id: 'demo-ordered-list-group',
  label: 'My ordered list',
  content: createOrderedListEntry({
    id: 'demo-ordered',
    separators: true,
    items: [
      {
        key: 'anchor',
        element: createSimpleEntry({ content: 'I am always first.' }).element,
        fixed: true
      },
      { key: 'a', element: createSimpleEntry({ content: 'Move me with the arrows.' }).element },
      { key: 'b', element: createSimpleEntry({ content: 'Or me.' }).element },
      {
        key: 'c',
        element: createSimpleEntry({
          content: 'I don\'t want to be last.'
        }).element
      }
    ]
  }).element
}).element);

custom.body.appendChild(createSeparator());

// A table entry: rows a reader edits in place, with a delete beside each, a plus to add one, and the
// table's own controls to save it as a CSV and to load one back.
custom.body.appendChild(createTableEntry({
  id: 'demo-table',
  filename: 'demo-table.csv',
  columns: [ 'Name', 'Value' ],
  rows: [ [ 'A table entry', 'edited in place' ], [ 'Rows', 'added and deleted' ] ]
}).element);

// The tab's footer, which stays at the foot of this tab whatever the body does.

custom.footer.appendChild(createSimpleEntry({ content: 'Custom footer.' }).element);

// The third of the panel's footer controls, which stands there for the same reason the other two do and is
// added here because it says something about a tab and the tab has just been made.
sidePanel.getSlots().footer.appendChild(createSimpleEntry({ content: customControls() }).element);

/**
 * The view a panel is shown in: one tab at a time, or every tab a column. The panel draws no control for
 * it, so this is the demo's, and it is put in the panel's footer because it governs the whole panel rather
 * than any one tab.
 */
function viewControls() {
  const row = domify('div', 'demo-controls'),
        name = domify('span', 'demo-controls-name');

  name.textContent = 'View';
  row.appendChild(name);

  const buttons = [ 'tabbed', 'columns' ].map((mode) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = mode;
    button.addEventListener('click', () => {
      sidePanel.setViewMode(mode);
      sync();
    });
    row.appendChild(button);

    return { mode, button };
  });

  const sync = () => buttons.forEach(({ mode, button }) => {
    button.setAttribute('aria-pressed', String(sidePanel.getViewMode() === mode));
  });

  sync();

  return row;
}

/**
 * A tab added and taken away while the panel is up, which works the same in either view: `addTab` hands
 * back the three slots to fill, `removeTab` takes the tab away and moves the reader to the first that
 * remains. As a column the tab states the width it takes, which the tabbed view ignores.
 */
function tabControls() {
  const row = domify('div', 'demo-controls'),
        name = domify('span', 'demo-controls-name'),
        button = document.createElement('button');

  name.textContent = 'Extra tab';
  button.type = 'button';

  const sync = () => { button.textContent = sidePanel.getTab('extra') ? 'remove' : 'add'; };

  button.addEventListener('click', () => {
    if (sidePanel.getTab('extra')) {
      sidePanel.removeTab('extra');
    } else {
      const extra = sidePanel.addTab({ id: 'extra', label: 'Extra', width: 200 });

      extra.header.appendChild(createSimpleEntry({ content: 'Extra header' }).element);
      extra.body.appendChild(createSimpleEntry({
        content: 'A tab added while the panel was up, and taken away again by the same control.'
      }).element);
    }
    sync();
  });

  row.append(name, button);
  sync();

  return row;
}

/**
 * The two things a host says about a tab it did not add itself, shown here on the demo's own tab.
 *
 * They are independent: whether the tab is in the panel at all, which both views obey, and whether its
 * column stands open, which is the column view's. A tab hidden and shown again is the column it was, and a
 * column closed is its resizer and nothing else, so the two together are every state a tab has.
 */
function customControls() {
  const row = domify('div', 'demo-controls'),
        name = domify('span', 'demo-controls-name'),
        visibility = document.createElement('button'),
        openness = document.createElement('button');

  name.textContent = 'Custom tab';
  visibility.type = openness.type = 'button';

  const sync = () => {
    const tab = sidePanel.getTab('custom');

    visibility.textContent = tab.visible ? 'hide' : 'show';
    openness.textContent = tab.open ? 'close' : 'open';
    openness.disabled = !tab.visible;
  };

  visibility.addEventListener('click', () => {
    sidePanel.setTabVisible('custom', !sidePanel.getTab('custom').visible);
    sync();
  });

  openness.addEventListener('click', () => {
    sidePanel.setTabOpen('custom', !sidePanel.getTab('custom').open);
    sync();
  });

  row.append(name, visibility, openness);
  sync();

  return row;
}

function domify(tag, className) {
  const node = document.createElement(tag);

  node.className = className;

  return node;
}



