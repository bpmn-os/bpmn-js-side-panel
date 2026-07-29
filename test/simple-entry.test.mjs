import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import createSimpleEntry from '../src/SimpleEntry.js';
import createCollapsibleEntry from '../src/CollapsibleEntry.js';

// The entry factories read the global `document` at call time; give them a linkedom one. Geometry is
// out of reach here, linkedom doing no layout, so what is asserted is structure and behaviour.
function dom() {
  const { document, Event } = parseHTML('<!doctype html><html><body></body></html>');
  globalThis.document = document;
  globalThis.Event = Event;
  return document;
}

function click(node) {
  node.dispatchEvent(new globalThis.Event('click', { bubbles: true }));
}

test('structure: a row with a label and a controls slot, and no disclosure', () => {
  dom();
  const entry = createSimpleEntry({ id: 's', label: 'Hello' });

  assert.ok(entry.element.classList.contains('bjs-entry'));
  assert.ok(entry.element.classList.contains('bjs-simple-entry'));
  assert.equal(entry.element.getAttribute('data-entry-id'), 's');

  const row = entry.element.querySelector('.bjs-simple-entry-row');
  assert.ok(row, 'has a row');
  assert.equal(entry.summaryEl.textContent, 'Hello');
  assert.ok(entry.controlsEl.classList.contains('bjs-simple-entry-controls'));

  // no caret and no body: a simple entry discloses nothing, so its label takes the full width
  assert.equal(entry.element.querySelector('.bjs-collapsible-entry-arrow'), null);
  assert.equal(entry.element.querySelector('.bjs-simple-entry-arrow'), null);
  assert.equal(entry.element.querySelector('.bjs-collapsible-entry-entries'), null);
  assert.equal(entry.contentEl, undefined);
});

test('the row is the collapsible entry header, minus the caret and the body', () => {
  dom();
  const simple = createSimpleEntry({ label: 'x' });
  const collapsible = createCollapsibleEntry({ label: 'x' });

  const shape = (root, sel) => Array.from(root.querySelectorAll(sel)).length;

  // one title slot and one controls slot in each, in that order
  assert.equal(shape(simple.element, '.bjs-simple-entry-title'), 1);
  assert.equal(shape(simple.element, '.bjs-simple-entry-controls'), 1);
  assert.equal(simple.element.querySelector('.bjs-simple-entry-row').children.length, 2);
  assert.equal(collapsible.element.querySelector('.bjs-collapsible-entry-header').children.length, 3);
});

test('label: a string, an element, and the placeholder', () => {
  const document = dom();
  const entry = createSimpleEntry({});
  assert.equal(entry.summaryEl.textContent, '<empty>');
  assert.ok(entry.summaryEl.classList.contains('bjs-empty'));

  entry.setLabel('named');
  assert.equal(entry.summaryEl.textContent, 'named');
  assert.ok(!entry.summaryEl.classList.contains('bjs-empty'));

  const badge = document.createElement('span');
  badge.textContent = 'element';
  entry.setLabel(badge);
  assert.equal(entry.summaryEl.firstChild, badge);
});

test('onClick makes the whole row clickable', () => {
  dom();
  let clicked = 0;
  const entry = createSimpleEntry({ label: 'c', onClick: () => clicked++ });

  assert.ok(entry.element.classList.contains('bjs-entry-clickable'));
  assert.equal(entry.element.getAttribute('role'), 'button');
  click(entry.element);
  assert.equal(clicked, 1);
});

test('remove control: fires its callback and does not fire the row click', () => {
  dom();
  let removed = 0, clicked = 0;
  const entry = createSimpleEntry({ label: 'r', onClick: () => clicked++, remove: () => removed++ });

  const btn = entry.controlsEl.querySelector('.bjs-simple-entry-remove');
  assert.ok(btn, 'has a remove control');
  click(btn);
  assert.equal(removed, 1);
  assert.equal(clicked, 0, 'the remove control stops the click reaching the row');
});

test('destroy detaches the entry', () => {
  const document = dom();
  const entry = createSimpleEntry({ label: 'd' });
  document.body.appendChild(entry.element);

  entry.destroy();
  assert.equal(entry.element.parentNode, null);
});
