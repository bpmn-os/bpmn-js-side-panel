import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import createListEntry from '../src/ListEntry.js';
import createOrderedListEntry from '../src/OrderedListEntry.js';

// The entry factories read the global `document` at call time; give them a linkedom one. Geometry is
// out of reach here, linkedom doing no layout, so what is asserted is structure and behaviour.
function dom() {
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  globalThis.document = document;
  return document;
}

function item(document, label) {
  const element = document.createElement('div');

  element.textContent = label;

  return element;
}

test('a list is an entry, so it takes the field of the slot it stands in', () => {
  dom();

  assert.ok(createListEntry({}).element.classList.contains('bjs-entry'));
  assert.ok(createOrderedListEntry({}).element.classList.contains('bjs-entry'));
});

test('items: a list is given its entries at construction, in the order stated', () => {
  const document = dom();
  const a = item(document, 'A'),
        b = item(document, 'B');

  const list = createListEntry({
    items: [ { key: 'a', element: a }, { key: 'b', element: b } ]
  });

  assert.deepEqual(list.keys(), [ 'a', 'b' ]);
  assert.equal(list.get('a'), a);
  assert.deepEqual(Array.from(list.element.children), [ a, b ]);

  // and what it is given later it is given through `add`, which the same list still takes
  list.add('c', item(document, 'C'), 0);
  assert.deepEqual(list.keys(), [ 'c', 'a', 'b' ]);
});

test('items: an ordered list takes an anchor among them', () => {
  const document = dom();

  const list = createOrderedListEntry({
    items: [
      { key: 'head', element: item(document, 'H'), fixed: true },
      { key: 'a', element: item(document, 'A') },
      { key: 'b', element: item(document, 'B') }
    ]
  });

  assert.deepEqual(list.keys(), [ 'head', 'a', 'b' ]);

  // the anchor holds its position, so nothing passes it and it carries no arrows of its own
  const anchorRow = list.element.children[0];
  assert.equal(anchorRow.querySelector('.bjs-reorder-up'), null);

  list.move('b', 0);
  assert.deepEqual(list.keys(), [ 'head', 'b', 'a' ]);
});

test('an empty items list is the same as none at all', () => {
  dom();

  assert.deepEqual(createListEntry({ items: [] }).keys(), []);
  assert.deepEqual(createListEntry({}).keys(), []);
});
