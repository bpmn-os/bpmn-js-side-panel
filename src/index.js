import SidePanel from './SidePanel.js';

export { default as createCollapsibleEntry } from './CollapsibleEntry.js';
export { default as createPlainEntry } from './PlainEntry.js';
export { default as createSeparator } from './Separator.js';
export { default as createTableEntry } from './TableEntry.js';
export { default as createListEntry } from './ListEntry.js';
export { default as createOrderedListEntry } from './OrderedListEntry.js';

/**
 * diagram-js module providing a resizable, tabbed side panel.
 *
 * Usage (bpmn-js):
 *   new BpmnModeler({
 *     additionalModules: [ SidePanelModule ],
 *     sidePanel: { parent: '#side-panel' }
 *   });
 *   const sidePanel = modeler.get('sidePanel');
 *   const { body, footer } = sidePanel.addTab({ id: 'issues', label: 'Issues' });
 *   // fill `body`/`footer` with createCollapsibleEntry / createPlainEntry / createSeparator entries
 */
export default {
  __init__: [ 'sidePanel' ],
  sidePanel: [ 'type', SidePanel ]
};
