import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import createSimpleEntry from '../src/SimpleEntry.js';

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

test('structure: content and a controls slot, and no disclosure', () => {
  dom();
  const entry = createSimpleEntry({ id: 's', content: 'Hello' });

  assert.ok(entry.element.classList.contains('bjs-entry'));
  assert.ok(entry.element.classList.contains('bjs-simple-entry'));
  assert.equal(entry.element.getAttribute('data-entry-id'), 's');

  assert.ok(entry.contentEl.classList.contains('bjs-simple-entry-content'));
  assert.equal(entry.contentEl.textContent, 'Hello');

  // the slot is built whether or not it is filled, so a consumer may fill it later; the CSS gives an
  // empty one no room
  assert.ok(entry.controlsEl.classList.contains('bjs-simple-entry-controls'));
  assert.equal(entry.controlsEl.children.length, 0);

  // no caret and no body: a simple entry discloses nothing
  assert.equal(entry.element.querySelector('.bjs-collapsible-entry-arrow'), null);
  assert.equal(entry.element.querySelector('.bjs-collapsible-entry-entries'), null);
});

test('content: a string, an element, a list of elements, and nothing', () => {
  const document = dom();

  assert.equal(createSimpleEntry({ content: 'text' }).contentEl.textContent, 'text');

  const badge = document.createElement('span');
  assert.equal(createSimpleEntry({ content: badge }).contentEl.firstChild, badge);

  const a = document.createElement('div'),
        b = document.createElement('div');
  const many = createSimpleEntry({ content: [ a, b ] });
  assert.deepEqual(Array.from(many.contentEl.children), [ a, b ]);

  assert.equal(createSimpleEntry({}).contentEl.childNodes.length, 0);
});

test('setContent replaces what the entry holds, in place', () => {
  const document = dom();
  const entry = createSimpleEntry({ content: 'before' });
  document.body.appendChild(entry.element);

  entry.setContent('after');
  assert.equal(entry.contentEl.textContent, 'after');

  // the entry itself is the same node, so what holds it holds it still
  assert.equal(entry.element.parentNode, document.body);
  assert.equal(entry.element.firstChild, entry.contentEl);
});

test('onClick makes the whole entry clickable', () => {
  dom();
  let clicked = 0;
  const entry = createSimpleEntry({ content: 'c', onClick: () => clicked++ });

  assert.ok(entry.element.classList.contains('bjs-entry-clickable'));
  assert.equal(entry.element.getAttribute('role'), 'button');
  click(entry.element);
  assert.equal(clicked, 1);
});

test('a control the entry carries acts on it, and does not click it', () => {
  const document = dom();
  let acted = 0, clicked = 0;
  const button = document.createElement('button');
  button.addEventListener('click', () => acted++);

  const entry = createSimpleEntry({ content: 'r', onClick: () => clicked++, controls: button });
  assert.equal(entry.controlsEl.firstChild, button, 'the control is held in the controls slot');

  click(button);
  assert.equal(acted, 1, 'the control acted');
  assert.equal(clicked, 0, 'and its click never reached the entry');
});

test('destroy detaches the entry', () => {
  const document = dom();
  const entry = createSimpleEntry({ content: 'd' });
  document.body.appendChild(entry.element);

  entry.destroy();
  assert.equal(entry.element.parentNode, null);
});
