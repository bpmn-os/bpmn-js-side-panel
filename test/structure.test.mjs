import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import SidePanel from '../src/SidePanel.js';

/**
 * The panel's structure, which is two levels of the same three parts.
 *
 * A side panel has a header, a body and a footer, and so does a tab, and each name states the level it
 * belongs to. That is what these cover: that both levels exist, that a host is handed the slots of both
 * rather than being asked to give content at construction, and that a note stands in for the whole of a
 * tab rather than for part of it.
 */
function panel(config = {}) {
  const { document } = parseHTML('<!doctype html><html><body><div id="host"></div></body></html>');

  globalThis.document = document;

  // the panel builds itself on `diagram.init`, so the stub bus keeps the handlers and fires it
  const handlers = new Map();
  const eventBus = {
    on: (event, callback) => handlers.set(event, callback),
    fire: (event) => (handlers.get(event) || (() => {}))()
  };

  const sidePanel = new SidePanel({ parent: '#host', ...config }, { get: () => false }, eventBus, {});

  eventBus.fire('diagram.init');

  return { document, sidePanel };
}

test('the panel is a divider, a header, a body and a footer', () => {
  const { document } = panel();

  const parts = [ ...document.querySelector('.bjs-panel').children ]
    .map((child) => child.getAttribute('class'));

  assert.deepEqual(parts, [ 'bjs-panel-divider', 'bjs-panel-header', 'bjs-panel-body', 'bjs-panel-footer' ],
    'four siblings, so that no name has to be invented for a wrapper');
});

test('the panel hands its slots back, so a host may fill either later', () => {
  const { document, sidePanel } = panel();

  const { header, footer } = sidePanel.getSlots();

  assert.equal(header.getAttribute('class'), 'bjs-panel-header');
  assert.equal(footer.getAttribute('class'), 'bjs-panel-footer');

  footer.textContent = 'shown whichever tab is selected';

  assert.equal(document.querySelector('.bjs-panel-footer').textContent,
    'shown whichever tab is selected');
});

test('the header may still be given at construction, for a host with nothing to change', () => {
  const { document } = panel({ header: '<strong>name</strong>' });

  assert.equal(document.querySelector('.bjs-panel-header strong').textContent, 'name');
});

test('a tab is a header, a body and a footer, and addTab hands back all three', () => {
  const { document, sidePanel } = panel();

  const tab = sidePanel.addTab({ id: 'first', label: 'First' });

  assert.equal(tab.header.getAttribute('class'), 'bjs-tab-header');
  assert.equal(tab.body.getAttribute('class'), 'bjs-tab-body');
  assert.equal(tab.footer.getAttribute('class'), 'bjs-tab-footer');

  const parts = [ ...document.querySelector('.bjs-tab').children ]
    .map((child) => child.getAttribute('class'));

  assert.deepEqual(parts, [ 'bjs-tab-header', 'bjs-tab-body', 'bjs-tab-footer', 'bjs-tab-note' ]);
});

test('a tab lives in the panel body, beside the selectors', () => {
  const { document, sidePanel } = panel();

  sidePanel.addTab({ id: 'first', label: 'First' });

  const body = document.querySelector('.bjs-panel-body');

  assert.equal(body.firstChild.getAttribute('class'), 'bjs-panel-tabs');
  assert.ok(body.querySelector('.bjs-tab'), 'the tab is in the body rather than beside it');
  assert.equal(body.querySelector('.bjs-tab-selector').textContent, 'First');
});

test('a note stands in for the whole of a tab, its header included', () => {
  const { sidePanel } = panel();

  const tab = sidePanel.addTab({ id: 'first', label: 'First' });

  tab.header.textContent = 'a heading';

  sidePanel.setNote('first', 'nothing to show here for the moment');

  assert.equal(tab.header.style.display, 'none');
  assert.equal(tab.body.style.display, 'none');
  assert.equal(tab.footer.style.display, 'none');

  sidePanel.setNote('first', null);

  assert.equal(tab.header.style.display, '');
  assert.equal(tab.body.style.display, '');
  assert.equal(tab.footer.style.display, '');
});
