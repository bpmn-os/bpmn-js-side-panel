import SidePanel from './SidePanel.js';

/**
 * diagram-js module providing a resizable, tabbed side panel.
 *
 * Usage (bpmn-js):
 *   new BpmnModeler({
 *     additionalModules: [ SidePanelModule ],
 *     sidePanel: { parent: '#side-panel' }
 *   });
 *   const sidePanel = modeler.get('sidePanel');
 *   const el = sidePanel.addTab({ id: 'issues', label: 'Issues' });
 */
export default {
  __init__: [ 'sidePanel' ],
  sidePanel: [ 'type', SidePanel ]
};
