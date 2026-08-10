import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import createTableEntry from '../src/TableEntry.js';

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

function cells(entry) {
  return Array.from(entry.element.querySelectorAll('.bjs-table-cell'));
}

/** The controls the table draws for itself, in the order it draws them. */
function controls(entry) {
  return Array.from(entry.element.querySelectorAll('.bjs-table-footer-actions button'));
}

test('the clear control empties the table down to minRows and says so', () => {
  dom();

  let cleared = 0;

  const entry = createTableEntry({
    columns: [ 'Name', 'Value' ],
    rows: [ [ 'a', '1' ], [ 'b', '2' ] ],
    clearable: true,
    minRows: 1,
    onClear: () => cleared++
  });

  const clear = controls(entry)[0];

  assert.equal(clear.title, 'Clear table.csv');

  click(clear);

  assert.equal(entry.getRows().length, 1, 'emptied down to the row it must always hold');
  assert.deepEqual(entry.getRows()[0], [ '', '' ], 'and that row holds nothing');
  assert.equal(cleared, 1);
});

test('a read-only table refuses the reader and not the program', () => {
  dom();

  const entry = createTableEntry({
    columns: [ 'Name', 'Value' ],
    rows: [ [ 'a', '1' ] ],
    clearable: true,
    readOnly: true
  });

  assert.ok(cells(entry).every((cell) => cell.readOnly), 'every cell is read rather than written');
  assert.ok(cells(entry).every((cell) => !cell.disabled), 'and none is disabled, so it still navigates');

  const add = entry.element.querySelector('.bjs-table-add'),
        rowDelete = entry.element.querySelector('.bjs-table-delete'),
        [ clear, load, save ] = controls(entry);

  assert.ok(add.disabled, 'a row cannot be added');
  assert.ok(rowDelete.disabled, 'nor deleted');
  assert.ok(clear.disabled, 'the table cannot be emptied');
  assert.ok(load.disabled, 'nor a file read into it');
  assert.equal(save.disabled, false, 'but its rows may be taken away');

  // what the program does is untouched: a host fills a frozen table as it fills any other
  entry.setRows([ [ 'b', '2' ], [ 'c', '3' ] ]);
  assert.equal(entry.getRows().length, 2);
  assert.ok(cells(entry).every((cell) => cell.readOnly), 'rows arriving later are frozen with the rest');
});

test('the freeze turns over while the table stands', () => {
  dom();

  const entry = createTableEntry({
    columns: [ 'Name' ],
    rows: [ [ 'a' ] ],
    clearable: true
  });

  const add = entry.element.querySelector('.bjs-table-add');

  assert.equal(cells(entry)[0].readOnly, false);
  assert.equal(add.disabled, false);

  entry.setReadOnly(true);

  assert.ok(entry.element.classList.contains('bjs-table-readonly'));
  assert.ok(cells(entry)[0].readOnly);
  assert.ok(add.disabled);
  assert.ok(entry.element.querySelector('.bjs-table-delete').disabled);

  entry.setReadOnly(false);

  assert.equal(cells(entry)[0].readOnly, false);
  assert.equal(add.disabled, false);
  assert.equal(entry.element.querySelector('.bjs-table-delete').disabled, false);
});
