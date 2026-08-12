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

test('a hidden tab is in neither view, and in nothing the panel measures', () => {
  const { document, sidePanel } = panel({ viewMode: 'columns' });

  sidePanel.addTab({ id: 'a', label: 'A' });
  sidePanel.addTab({ id: 'gone', label: 'Gone', visible: false });

  const part = (selector) => document.querySelector(selector + '[data-tab="gone"]');

  assert.equal(part('.bjs-tab-selector').style.display, 'none', 'no selector in the tabbed view');
  assert.equal(part('.bjs-tab').style.display, 'none', 'no column in the other');
  assert.equal(part('.bjs-tab-divider').style.display, 'none', 'and no resizer either');

  assert.equal(sidePanel.getTab('gone').visible, false);

  // the panel is its resizers and its open columns, and a hidden tab is neither: with the one tab that is
  // left hidden as well, there is nothing to be as wide as
  sidePanel.setTabVisible('a', false);
  assert.equal(document.querySelector('#host').style.width, '0px');

  sidePanel.setTabVisible('gone', true);
  assert.equal(part('.bjs-tab-divider').style.display, '', 'a tab shown again is drawn by the rules');
});

test('the selectors select nothing while one tab is shown, whatever is hidden', () => {
  const { document, sidePanel } = panel();

  sidePanel.addTab({ id: 'a', label: 'A' });
  sidePanel.addTab({ id: 'b', label: 'B' });

  const bar = document.querySelector('.bjs-panel-tabs');

  assert.equal(bar.style.display, '');

  sidePanel.setTabVisible('b', false);
  assert.equal(bar.style.display, 'none', 'there is nothing to switch between');

  sidePanel.setTabVisible('b', true);
  assert.equal(bar.style.display, '');
});

test('hiding the tab that is shown passes the selection to the first still shown', () => {
  const { sidePanel } = panel();

  sidePanel.addTab({ id: 'a', label: 'A', priority: 10 });
  sidePanel.addTab({ id: 'b', label: 'B' });

  const active = (id) => sidePanel.getTab(id).pane.classList.contains('active');

  assert.ok(active('a'), 'the first tab added is the one shown');

  sidePanel.setTabVisible('a', false);
  assert.ok(active('b'), 'and the selection passes on');
  assert.ok(!active('a'));

  sidePanel.setTabVisible('a', true);
  assert.ok(active('b'), 'a tab shown again takes the selection from nobody');

  sidePanel.setTabVisible('b', false);
  sidePanel.setTabVisible('a', false);
  assert.ok(!active('a'), 'and with nothing shown there is nothing selected');
  assert.ok(!active('b'));

  sidePanel.setTabVisible('b', true);
  assert.ok(active('b'), 'the first tab shown again is shown');
});

test('a tab hidden keeps the width it takes and whether it stands open', () => {
  const { sidePanel } = panel({ viewMode: 'columns' });

  sidePanel.addTab({ id: 'a', label: 'A', width: 320 });
  sidePanel.setTabOpen('a', false);
  sidePanel.setTabVisible('a', false);
  sidePanel.setTabVisible('a', true);

  const tab = sidePanel.getTab('a');

  assert.equal(tab.width, 320);
  assert.equal(tab.open, false, 'a tab shown again is the column it was');
  assert.ok(tab.pane.classList.contains('bjs-closed'));
});

test('a column is opened and closed as a double click on its resizer does it', () => {
  const { sidePanel } = panel({ viewMode: 'columns' });

  sidePanel.addTab({ id: 'a', label: 'A', width: 320 });

  const pane = sidePanel.getTab('a').pane;

  assert.equal(pane.style.width, '320px');

  sidePanel.setTabOpen('a', false);
  assert.equal(pane.style.width, '0px', 'a closed column takes nothing');
  assert.ok(pane.classList.contains('bjs-closed'));
  assert.equal(sidePanel.getTab('a').width, 320, 'and keeps the width it had');

  sidePanel.setTabOpen('a', true);
  assert.equal(pane.style.width, '320px', 'which it is given back');
  assert.ok(!pane.classList.contains('bjs-closed'));
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

test('a column with no width worth opening to opens to the default', () => {
  const { document, sidePanel } = panel({ viewMode: 'columns' });

  sidePanel.addTab({ id: 'wide', label: 'Wide', width: 320 });
  sidePanel.addTab({ id: 'sliver', label: 'Sliver', width: 8 });
  sidePanel.addTab({ id: 'narrow', label: 'Narrow', width: 21 });

  const dblclick = (id) => document.querySelector('.bjs-tab-divider[data-tab="' + id + '"]')
    .dispatchEvent(new document.defaultView.Event('dblclick'));

  const width = (id) => sidePanel.getTab(id).width,
        open = (id) => sidePanel.getTab(id).open;

  dblclick('wide');
  assert.equal(open('wide'), false, 'a double click puts the column away');
  dblclick('wide');
  assert.deepEqual([ open('wide'), width('wide') ], [ true, 320 ],
    'and brings it back at the width it had');

  // a column dragged almost shut and then put away holds a width that would open onto nothing
  dblclick('sliver');
  assert.equal(open('sliver'), false);
  dblclick('sliver');
  assert.deepEqual([ open('sliver'), width('sliver') ], [ true, 260 ],
    'so it is opened to the default instead');

  // and one that is narrow but readable is the reader's to keep
  dblclick('narrow');
  dblclick('narrow');
  assert.deepEqual([ open('narrow'), width('narrow') ], [ true, 21 ]);
});
