import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import createOrderedListEntry from '../src/OrderedListEntry.js';

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

// the list keys its rows internally, so a row is found where its key stands in the order
function row(list, key) {
  return list.element.children[list.keys().indexOf(key)];
}

function item(document, label) {
  const element = document.createElement('div');

  element.textContent = label;

  return element;
}

test('order: entries append and the user moves them with the arrows', () => {
  const document = dom();
  const list = createOrderedListEntry({ id: 'o' });

  list.add('a', item(document, 'A'));
  list.add('b', item(document, 'B'));
  list.add('c', item(document, 'C'));

  assert.deepEqual(list.keys(), [ 'a', 'b', 'c' ]);

  click(row(list, 'c').querySelector('.bjs-reorder-up'));
  assert.deepEqual(list.keys(), [ 'a', 'c', 'b' ]);

  list.moveDown('a');
  assert.deepEqual(list.keys(), [ 'c', 'a', 'b' ]);
});

test('an anchor carries the lane but no arrows', () => {
  const document = dom();
  const list = createOrderedListEntry({ id: 'o' });

  list.add('head', item(document, 'Head'), undefined, { fixed: true });
  list.add('a', item(document, 'A'));

  const anchor = row(list, 'head');

  assert.ok(anchor.querySelector('.bjs-reorder-strip'), 'keeps the lane, so it lines up');
  assert.equal(anchor.querySelector('.bjs-reorder-up'), null);
  assert.equal(anchor.querySelector('.bjs-reorder-down'), null);
  assert.ok(anchor.querySelector('.bjs-ordered-list-item').textContent === 'Head');
});

test('an anchor holds its position and nothing passes it', () => {
  const document = dom();
  const list = createOrderedListEntry({ id: 'o' });

  list.add('head', item(document, 'Head'), undefined, { fixed: true });
  list.add('a', item(document, 'A'));
  list.add('b', item(document, 'B'));

  // the anchor cannot be displaced, by the consumer or by anyone
  list.move('head', 2);
  assert.deepEqual(list.keys(), [ 'head', 'a', 'b' ]);

  // and no entry rises past it, whether asked for a step or for an index
  list.moveUp('a');
  assert.deepEqual(list.keys(), [ 'head', 'a', 'b' ]);

  list.move('b', 0);
  assert.deepEqual(list.keys(), [ 'head', 'b', 'a' ]);
});

test('the arrows say where an entry may go: ends and anchors alike', () => {
  const document = dom();
  const list = createOrderedListEntry({ id: 'o' });

  list.add('head', item(document, 'Head'), undefined, { fixed: true });
  list.add('a', item(document, 'A'));
  list.add('b', item(document, 'B'));

  const a = row(list, 'a'),
        b = row(list, 'b');

  assert.equal(a.querySelector('.bjs-reorder-up').disabled, true, 'sits beneath the anchor');
  assert.equal(a.querySelector('.bjs-reorder-down').disabled, false);
  assert.equal(b.querySelector('.bjs-reorder-up').disabled, false);
  assert.equal(b.querySelector('.bjs-reorder-down').disabled, true, 'sits last');
});

test('an order changed announces the keys it now holds, and a refused move announces nothing', () => {
  const document = dom();
  const orders = [];
  const list = createOrderedListEntry({ id: 'o', onReorder: (keys) => orders.push(keys) });

  list.add('head', item(document, 'Head'), undefined, { fixed: true });
  list.add('a', item(document, 'A'));
  list.add('b', item(document, 'B'));

  list.moveUp('a'); // refused: the anchor is above it
  list.moveUp('b');

  assert.deepEqual(orders, [ [ 'head', 'b', 'a' ] ]);
});
