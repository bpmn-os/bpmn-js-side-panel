import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import createCollapsibleEntry from '../src/CollapsibleEntry.js';

// createCollapsibleEntry reads the global `document` at call time; give it a linkedom one.
function dom() {
  const { document, Event } = parseHTML('<!doctype html><html><body></body></html>');
  globalThis.document = document;
  globalThis.Event = Event;
  return document;
}

function click(node) {
  node.dispatchEvent(new globalThis.Event('click', { bubbles: true }));
}

test('expandable entry: structure, classes and slots', () => {
  dom();
  const entry = createCollapsibleEntry({ id: 'x', label: 'Hello' });

  assert.ok(entry.element.classList.contains('bjs-collapsible-entry'));
  assert.ok(entry.element.classList.contains('bjs-collapsible-entry-expandable'));
  assert.equal(entry.element.getAttribute('data-entry-id'), 'x');

  const header = entry.element.querySelector('.bjs-collapsible-entry-header');
  assert.ok(header, 'has a header');
  assert.ok(header.querySelector('.bjs-collapsible-entry-arrow'), 'has an arrow');
  assert.equal(entry.summaryEl.textContent, 'Hello');
  assert.ok(entry.contentEl && entry.contentEl.classList.contains('bjs-collapsible-entry-entries'));
  assert.equal(entry.contentEl.parentNode, entry.element, 'content body lives on the entry');
});

test('open state: initial, toggle and header click', () => {
  dom();
  const entry = createCollapsibleEntry({ id: 'x', label: 'Hello', open: true });
  assert.equal(entry.isOpen(), true);
  assert.ok(entry.element.classList.contains('bjs-open'));

  entry.setOpen(false);
  assert.equal(entry.isOpen(), false);

  // clicking the header toggles
  const header = entry.element.querySelector('.bjs-collapsible-entry-header');
  click(header);
  assert.equal(entry.isOpen(), true);
  click(header);
  assert.equal(entry.isOpen(), false);
});

test('plain row: not expandable, no content body, an inert caret', () => {
  dom();
  const entry = createCollapsibleEntry({ id: 'p', label: 'Plain', expandable: false });
  assert.ok(!entry.element.classList.contains('bjs-collapsible-entry-expandable'));
  assert.equal(entry.contentEl, null);

  // the caret is rendered so the row keeps the same shape as an expandable one (the CSS hides it with
  // `visibility`), and it is inert: disabled, out of the tab order, hidden from a reader, toggling nothing
  const arrow = entry.element.querySelector('.bjs-collapsible-entry-arrow');
  assert.ok(arrow, 'renders the caret, whose space the row keeps');
  assert.equal(arrow.disabled, true);
  assert.equal(arrow.getAttribute('tabindex'), '-1');
  assert.equal(arrow.getAttribute('aria-hidden'), 'true');
  assert.equal(arrow.getAttribute('aria-label'), null);
  click(arrow);
  assert.equal(entry.isOpen(), false);

  // header clicks and setOpen are inert on a plain row
  click(entry.element.querySelector('.bjs-collapsible-entry-header'));
  entry.setOpen(true);
  assert.equal(entry.isOpen(), false);
});

test('caret placement is independent of expandability', () => {
  dom();
  const plain = createCollapsibleEntry({ id: 'l', label: 'Left', caretSide: 'left', expandable: false });
  assert.ok(plain.element.classList.contains('bjs-caret-left'),
    'a plain row reserves the caret on the same side as its expandable siblings');
});

test('empty label renders the placeholder', () => {
  dom();
  const entry = createCollapsibleEntry({ id: 'e' });
  assert.equal(entry.summaryEl.textContent, '<empty>');
  assert.ok(entry.summaryEl.classList.contains('bjs-empty'));
});

test('a control the row carries acts on the row, and does not toggle it', () => {
  const document = dom();
  let acted = 0;
  const button = document.createElement('button');
  button.addEventListener('click', () => acted++);

  const entry = createCollapsibleEntry({ id: 'r', label: 'R', open: false, controls: button });
  assert.equal(entry.controlsEl.firstChild, button, 'the control is held in the row\'s controls slot');

  click(button);
  assert.equal(acted, 1, 'the control acted');
  assert.equal(entry.isOpen(), false, 'and did not toggle the entry');
});

test('nesting (item 5): child entries live in the parent content body', () => {
  dom();
  const group = createCollapsibleEntry({ id: 'g', label: 'Group', open: true });
  const child = createCollapsibleEntry({ id: 'g-1', label: 'Child' });
  group.contentEl.appendChild(child.element);

  assert.equal(child.element.parentNode, group.contentEl);
  assert.equal(group.contentEl.querySelectorAll('.bjs-collapsible-entry').length, 1);
});

test('onToggle: fires on change (not on init), with the new open state', () => {
  dom();
  const calls = [];
  const entry = createCollapsibleEntry({ id: 'o', label: 'O', open: true, onToggle: v => calls.push(v) });
  assert.deepEqual(calls, [], 'does not fire for the initial open state');

  const header = entry.element.querySelector('.bjs-collapsible-entry-header');
  click(header);                       // true -> false
  click(header);                       // false -> true
  entry.setOpen(true);                 // no change -> no fire
  assert.deepEqual(calls, [ false, true ]);
});

test('live update: setLabel replaces summary in place, open state preserved', () => {
  const document = dom();
  const entry = createCollapsibleEntry({ id: 'l', label: 'v1', open: true });

  const custom = document.createElement('span');
  custom.className = 'name';
  custom.textContent = 'v2';
  entry.setLabel(custom);

  assert.equal(entry.summaryEl.querySelector('.name').textContent, 'v2');
  assert.ok(!entry.summaryEl.classList.contains('bjs-empty'));
  assert.equal(entry.isOpen(), true, 'still open after a summary update');
});
