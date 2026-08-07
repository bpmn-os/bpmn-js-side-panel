import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import SidePanel from '../src/SidePanel.js';

/**
 * The two views the panel shows its tabs in.
 *
 * What matters here is that they are one set of elements: a change of view builds nothing, moves nothing
 * and throws nothing away, so a tab keeps its content and whatever a host is holding of it. Geometry is
 * out of reach, linkedom doing no layout, so what is asserted is the class the stylesheet reads, the
 * identity of the elements across a change, and what a tab states about itself as a column.
 */
function panel(config = {}) {
  const { document } = parseHTML('<!doctype html><html><body><div id="host"></div></body></html>');

  globalThis.document = document;

  const handlers = new Map();
  const eventBus = {
    on: (event, callback) => handlers.set(event, callback),
    fire: (event) => (handlers.get(event) || (() => {}))()
  };

  const sidePanel = new SidePanel({ parent: '#host', ...config }, { get: () => false }, eventBus, {});

  eventBus.fire('diagram.init');

  return { document, sidePanel };
}

test('the panel shows its tabs one at a time until it is told otherwise', () => {
  const { document, sidePanel } = panel();

  assert.equal(sidePanel.getViewMode(), 'tabbed');
  assert.ok(!document.querySelector('.bjs-panel').classList.contains('bjs-columns'));

  sidePanel.setViewMode('columns');
  assert.equal(sidePanel.getViewMode(), 'columns');
  assert.ok(document.querySelector('.bjs-panel').classList.contains('bjs-columns'));

  sidePanel.setViewMode('tabbed');
  assert.ok(!document.querySelector('.bjs-panel').classList.contains('bjs-columns'));
});

test('the view may be stated at construction', () => {
  const { document, sidePanel } = panel({ viewMode: 'columns' });

  assert.equal(sidePanel.getViewMode(), 'columns');
  assert.ok(document.querySelector('.bjs-panel').classList.contains('bjs-columns'));
});

test('a change of view is the same elements: nothing is built, moved or thrown away', () => {
  const { sidePanel } = panel();

  const a = sidePanel.addTab({ id: 'a', label: 'A' }),
        b = sidePanel.addTab({ id: 'b', label: 'B' });

  const held = document.createElement('div');
  a.body.appendChild(held);

  const panes = [ sidePanel.getTab('a').pane, sidePanel.getTab('b').pane ];

  sidePanel.setViewMode('columns');

  assert.deepEqual([ sidePanel.getTab('a').pane, sidePanel.getTab('b').pane ], panes,
    'the panes are the very same nodes');
  assert.equal(a.body.firstChild, held, 'and what a host put in one is still in it');

  sidePanel.setViewMode('tabbed');

  assert.deepEqual([ sidePanel.getTab('a').pane, sidePanel.getTab('b').pane ], panes);
  assert.equal(a.body.firstChild, held);
  assert.equal(b.body.childNodes.length, 0);
});

test('the selectors select nothing while every tab is a column', () => {
  const { document, sidePanel } = panel();

  sidePanel.addTab({ id: 'a', label: 'A' });
  sidePanel.addTab({ id: 'b', label: 'B' });

  const bar = document.querySelector('.bjs-panel-tabs');

  assert.equal(bar.style.display, '', 'two tabs, so there is something to switch between');

  sidePanel.setViewMode('columns');
  assert.equal(bar.style.display, 'none');

  sidePanel.setViewMode('tabbed');
  assert.equal(bar.style.display, '');
});

test('a tab states the width it takes as a column and whether it stands open', () => {
  const { document, sidePanel } = panel();

  sidePanel.addTab({ id: 'wide', label: 'Wide', width: 320 });
  sidePanel.addTab({ id: 'shut', label: 'Shut', open: false });
  sidePanel.addTab({ id: 'plain', label: 'Plain' });

  const pane = (id) => sidePanel.getTab(id).pane;

  assert.ok(!pane('wide').classList.contains('bjs-closed'));
  assert.ok(pane('shut').classList.contains('bjs-closed'), 'a tab that says it is shut is drawn shut');
  assert.ok(!pane('plain').classList.contains('bjs-closed'), 'and one that says nothing stands open');

  // each column carries a divider of its own, standing at its left edge
  const parts = [ ...document.querySelector('.bjs-panel-body').children ]
    .filter((child) => child.getAttribute('data-tab'))
    .map((child) =>
      (child.classList.contains('bjs-tab-divider') ? 'divider' : 'column') + ':' + child.getAttribute('data-tab'));

  assert.deepEqual(parts, [
    'divider:wide', 'column:wide',
    'divider:shut', 'column:shut',
    'divider:plain', 'column:plain'
  ]);
});

test('a column is as wide as its tab states, and a closed one is nothing at all', () => {
  const { sidePanel } = panel();

  sidePanel.addTab({ id: 'a', label: 'A', width: 320 });
  sidePanel.addTab({ id: 'b', label: 'B' });

  const pane = (id) => sidePanel.getTab(id).pane;

  assert.equal(pane('a').style.width, '', 'the tabbed view is told nothing about a column');

  sidePanel.setViewMode('columns');

  assert.equal(pane('a').style.width, '320px');
  assert.equal(pane('b').style.width, '260px', 'a tab that states no width takes the default');

  sidePanel.setViewMode('tabbed');

  assert.equal(pane('a').style.width, '', 'and the tabbed view is told nothing about it again');
});

test('the panel is as wide as its columns, and as wide as the host said again on the way out', () => {
  const { document, sidePanel } = panel({ width: '340px' });

  const host = document.querySelector('#host');

  assert.equal(host.style.width, '340px');

  sidePanel.setViewMode('columns');
  assert.equal(host.style.width, '0px', 'a panel holding no column is its columns and nothing else');

  sidePanel.setViewMode('tabbed');
  assert.equal(host.style.width, '340px', 'and it is where the host put it');
});

test('a tab may be added and taken away in either view', () => {
  const { sidePanel } = panel();

  sidePanel.addTab({ id: 'a', label: 'A' });
  sidePanel.setViewMode('columns');

  const extra = sidePanel.addTab({ id: 'extra', label: 'Extra', width: '200px' });

  assert.ok(sidePanel.getTab('extra'));
  assert.equal(extra.body.parentNode, sidePanel.getTab('extra').pane);

  sidePanel.removeTab('extra');
  assert.equal(sidePanel.getTab('extra'), undefined);
  assert.equal(sidePanel.getViewMode(), 'columns', 'and the view is what it was');
});
