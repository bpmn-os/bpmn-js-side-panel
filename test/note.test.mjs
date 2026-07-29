import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import SidePanel from '../src/SidePanel.js';

// A tab whose content does not apply for the moment keeps its title and its place, and says why.

function panel() {
  const { document } = parseHTML('<!doctype html><html><body><div id="host"></div></body></html>');

  globalThis.document = document;

  // the panel builds itself on `diagram.init`, so the stub bus keeps the handlers and fires it
  const handlers = new Map();
  const eventBus = {
    on: (event, callback) => handlers.set(event, callback),
    fire: (event) => (handlers.get(event) || (() => {}))()
  };

  const sidePanel = new SidePanel({ parent: '#host' }, { get: () => false }, eventBus, {});

  eventBus.fire('diagram.init');

  return { document, sidePanel };
}

test('a note stands in for a tab\'s content, and gives it back', () => {
  const { sidePanel } = panel();

  const { body, footer } = sidePanel.addTab({ id: 'properties', label: 'Properties' });

  body.appendChild(globalThis.document.createElement('span'));

  sidePanel.setNote('properties', 'Select a node.');

  const pane = sidePanel.getTab('properties').pane,
        note = pane.querySelector('.bjs-side-panel-note');

  assert.equal(note.textContent, 'Select a node.');
  assert.equal(note.style.display, '');
  assert.equal(body.style.display, 'none');
  assert.equal(footer.style.display, 'none');

  sidePanel.setNote('properties', null);

  assert.equal(note.style.display, 'none');
  assert.equal(body.style.display, '');
  assert.equal(body.childNodes.length, 1, 'what the tab held is untouched');
});

test('a note may be an element, and an unknown tab is an error', () => {
  const { document, sidePanel } = panel();

  sidePanel.addTab({ id: 'tokens', label: 'Tokens' });

  const element = document.createElement('em');

  element.textContent = 'nothing to show';
  sidePanel.setNote('tokens', element);

  assert.equal(sidePanel.getTab('tokens').pane.querySelector('.bjs-side-panel-note em').textContent,
    'nothing to show');

  assert.throws(() => sidePanel.setNote('missing', 'x'), /tab <missing> does not exist/);
});
