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

const CHAT_SVG = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
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
// what governs the whole panel belongs, since a tab is shown one at a time and this is not.
sidePanel.getSlots().footer.appendChild(
  createSimpleEntry({ content: 'This footer is visible in every tab.' }).element
);

const custom = sidePanel.addTab({ id: 'custom', label: 'Custom' });

// The tab's header, which stays at the head of this tab while the body scrolls under it.
custom.header.appendChild(createSimpleEntry({ content: 'Custom header' }).element);

custom.body.appendChild(createSimpleEntry({
  content: 'A simple entry, whose content is shown always and runs over as many lines as it needs.'}).element);

custom.body.appendChild(createSeparator());

custom.body.appendChild(createSimpleEntry({
  content: 'A simple entry with a button.',
  controls: createControlButton({ icon: CHAT_SVG, title: 'Say Hi', onClick: () => alert('Hello!') })
}).element);

custom.body.appendChild(createSeparator());


custom.body.appendChild(createCollapsibleEntry({
  id: 'demo-collapsible',
  label: 'A collapsible entry',
  open: true, // default: false
  content: 'Its content is disclosed by the caret. An entry is the full width of the panel and the inset lives '
    + 'inside it, so a rule or a background reaches the edges.'
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



