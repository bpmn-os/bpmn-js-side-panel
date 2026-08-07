# Entry Factories

The side panel's entry factories are plain-DOM building blocks for constructing rows and containers. Each factory returns a consistent shape, allowing them to be composed freely.

## `createSimpleEntry(options)`

A simple entry is what it holds. It discloses nothing, so everything in it is shown always: its content
takes the width and runs over as many lines as it needs, and the controls that act on it are held to its
right, clear of the first line. An entry that shows some of what it holds only when it is opened is a
collapsible entry instead, and an entry that carries a name carries it in its content.

### Options

| option | type | default | purpose |
|--------|------|---------|---------|
| `id` | `string` | undefined | stamped as `data-entry-id` for stable identity across updates |
| `content` | `string\|Node\|Node[]` | undefined | what the entry holds |
| `controls` | `Node\|Node[]` | undefined | controls the entry carries, held to the right of its content |
| `onClick` | `function` | undefined | when given, the whole entry is clickable, by pointer and by keyboard |

A string becomes text, and an element or a list of elements becomes children, so a consumer composes the
content it wants without reaching into the entry. A click on a control stops at that control, so it never
also fires the click the entry itself carries.

### Return value

```javascript
{
  element: HTMLElement,           // the root; append this to a parent
  contentEl: HTMLElement,         // the slot the content is written into
  controlsEl: HTMLElement,        // the slot the controls are held in, empty until one is given
  setContent: function(content),  // replace the content in place, the entry staying where it is
  destroy: function               // removes the element from its parent
}
```

### Usage

Content alone:
```javascript
const entry = createSimpleEntry({ content: 'A note or a hint, over as many lines as it takes.' });
parent.appendChild(entry.element);
```

Content the entry carries a control for:
```javascript
const entry = createSimpleEntry({
  content: 'Item to remove',
  controls: createControlButton({ icon: DELETE_SVG, title: 'Remove', onClick: () => remove() })
});
parent.appendChild(entry.element);
```

Content composed of elements, and kept current afterwards:
```javascript
const entry = createSimpleEntry({ content: [ swatch, label ] });
parent.appendChild(entry.element);

entry.setContent('Loaded.');
```

## `createCollapsibleEntry(options)`

A summary row over a body that is shown only while the entry is open: a label of one line, which truncates
because the row is what stands for the entry while it is shut, the controls the row carries, and the caret
that opens it. With `expandable: false` it is a row that cannot open but stands among rows that can, which
is why such a row keeps the caret's space rather than dropping it and standing wider than its neighbours.

### Options

| option | type | default | purpose |
|--------|------|---------|---------|
| `id` | `string` | undefined | stamped as `data-entry-id` |
| `label` | `string\|Node` | undefined | the row's label |
| `content` | `string\|Node\|Node[]` | undefined | content placed in the body (ignored when `expandable: false`) |
| `open` | `boolean` | `false` | initial open state (ignored when `expandable: false`) |
| `caretSide` | `'left'\|'right'` | `'right'` | caret placement; `'left'` for nested entries |
| `toggleOn` | `'header'\|'caret'` | `'header'` | whether the whole header or only the caret toggles disclosure |
| `expandable` | `boolean` | `true` | `false` renders a plain row with no arrow, no body, and no toggling |
| `controls` | `Node\|Node[]` | undefined | control elements held right of the label |
| `onClick` | `function` | undefined | when given, the whole entry is clickable |
| `emptyLabel` | `string` | `'<empty>'` | placeholder when `label` is empty |
| `onToggle` | `function` | undefined | fired when disclosure state changes (not on init) |

### Return value

```javascript
{
  element: HTMLElement,           // the root
  summaryEl: HTMLElement,         // the label slot
  contentEl: HTMLElement|null,    // null if not expandable; otherwise holds child entries
  controlsEl: HTMLElement,        // the controls slot
  setOpen: function,              // set disclosure state; no-op if not expandable
  toggle: function,               // toggle disclosure state
  isOpen: function,               // read the disclosure state
  setLabel: function,             // update the label in place
  destroy: function               // removes from parent
}
```

### Usage

A collapsible row:
```javascript
const entry = createCollapsibleEntry({ label: 'Details', open: false });
entry.contentEl.appendChild(childEntry.element);
parent.appendChild(entry.element);
```

A collapsible row with content at construction:
```javascript
const entry = createCollapsibleEntry({
  label: 'Details',
  open: false,
  content: 'This text is shown when expanded.'
});
parent.appendChild(entry.element);
```

A labeled row (non-expandable, for alignment with collapsible rows):
```javascript
const entry = createCollapsibleEntry({
  label: 'Status: active',
  expandable: false,
  controls: statusIndicator
});
parent.appendChild(entry.element);
```

Nesting: child entries are placed in `contentEl`:
```javascript
const parent = createCollapsibleEntry({ label: 'Parent' });
const child = createSimpleEntry({ content: 'Child content' });
parent.contentEl.appendChild(child.element);
```

## `createListEntry(options)`

A keyed collection that holds entries in order, supporting add, remove, and reorder operations without rebuilding the DOM. The entry is type-agnostic — it holds whatever element is given (a `createSimpleEntry().element`, a `createCollapsibleEntry().element`, a raw `<div>`, etc.).

### Options

| option | type | default | purpose |
|--------|------|---------|---------|
| `id` | `string` | undefined | stamped as `data-entry-id` |
| `separators` | `boolean` | `false` | show hairline separators between entries |
| `items` | `Array<{key, element}>` | undefined | the entries to start with, in the order they are shown |

### Return value

```javascript
{
  element: HTMLElement,           // the root; a flex column
  add: function(key, entryEl, index?),    // keyed insert; removes any existing key first
  remove: function(key),          // detach and forget the entry
  move: function(key, newIndex),  // reorder an entry
  setSeparators: function(bool),  // toggle separators at runtime
  has: function(key),             // whether a key exists
  get: function(key),             // retrieve the entry element by key
  keys: function(),               // read the current key order (a copy)
  clear: function()               // remove all entries
}
```

### Usage

A list built in one call:
```javascript
const list = createListEntry({
  id: 'messages',
  separators: true,
  items: [
    { key: 'msg1', element: createSimpleEntry({ content: 'Message 1' }).element },
    { key: 'msg2', element: createSimpleEntry({ content: 'Message 2' }).element }
  ]
});
parent.appendChild(list.element);

// Later, as the run changes it:
list.add('msg3', createSimpleEntry({ content: 'Message 3' }).element);
list.move('msg2', 0);  // msg2 becomes first
```

A list is named by nesting it in a collapsible entry, rather than by an option of its own:
```javascript
parent.appendChild(createCollapsibleEntry({ label: 'Messages', open: true, content: list.element }).element);
```

## `createOrderedListEntry(options)`

Wraps `createListEntry` to add arrow buttons for manual reordering, useful for sequences or queues. Each entry is displayed with up/down arrows; an anchor entry (marked `fixed: true`) cannot be moved and acts as a barrier.

### Options

| option | type | default | purpose |
|--------|------|---------|---------|
| `id` | `string` | undefined | stamped as `data-entry-id` |
| `side` | `'left'\|'right'` | `'left'` | which side the arrow strip is on |
| `reordering` | `boolean` | `true` | show/hide the arrow strip |
| `separators` | `boolean` | `false` | show hairline separators |
| `onReorder` | `function` | undefined | fired with the new key order when an entry moves |
| `items` | `Array<{key, element, fixed?}>` | undefined | the entries to start with, an anchor among them marked `fixed` |

### Return value

```javascript
{
  element: HTMLElement,           // the root
  add: function(key, entryEl, index?, { fixed }?),  // fixed: true = anchor, cannot move
  remove: function(key),
  move: function(key, newIndex),
  moveUp: function(key),          // move one step up (or to nearest allowed position)
  moveDown: function(key),        // move one step down
  setReordering: function(bool),  // show/hide arrows
  has: function(key),
  get: function(key),
  keys: function(),
  clear: function()
}
```

### Usage

```javascript
const queue = createOrderedListEntry({
  id: 'performer-queue',
  items: [
    { key: 'anchor', element: anchorEl, fixed: true },  // an anchor at the top, which nothing passes
    { key: 'task1', element: task1El },
    { key: 'task2', element: task2El }
  ]
});
parent.appendChild(queue.element);
```

## `createTableEntry(options)`

A grid of editable text cells with add and delete controls. Rows are always arrays of strings, aligned to a set of columns. Keyboard navigation is native to the table.

### Options

| option | type | default | purpose |
|--------|------|---------|---------|
| `id` | `string` | undefined | stamped as `data-entry-id` |
| `columns` | `Array<string\|{label, width?}>` | required | column definitions |
| `rows` | `Array<Array<string>>` | `[]` | initial row data |
| `onChange` | `function` | undefined | fired with the new rows after any edit/add/delete |
| `addLabel` | `string` | `'Add row'` | button label |
| `minRows` | `number` | `0` | minimum rows to keep |
| `maxHeight` | `number\|string` | undefined | CSS max-height (e.g. `'300px'`) |
| `addable` | `boolean` | `true` | show the add-row button |
| `deletable` | `boolean` | `true` | show delete controls |
| `downloadable` | `boolean` | `true` | show the control that saves the rows as a CSV |
| `uploadable` | `boolean` | `true` | show the control that replaces the rows from a CSV |
| `filename` | `string` | `'table.csv'` | what a download saves as, and what both controls name |
| `separator` | `string` | `';'` | what divides one cell from the next in that CSV |
| `onError` | `function` | undefined | called with a message when a loaded file names other columns |

### Return value

```javascript
{
  element: HTMLElement,           // the root; the grid
  footerEl: HTMLElement,          // slot in the footer, left of the table's own controls
  getRows: function(),            // read current data as Array<Array<string>>
  setRows: function(rows),        // replace all rows and rebuild
  getCsv: function(),             // the rows as CSV, the column labels first
  setCsv: function(text),         // replace the rows from CSV; false if its header names other columns
  addRow: function(values?, focusFirst?),  // append a row, optionally focusing the first cell
  destroy: function()
}
```

### The file the table owns

A table is rows under named columns, which is a CSV, so saving one and loading one belong to the table
rather than to each host that draws it. Both controls are drawn by default, in the footer:

```javascript
const table = createTableEntry({
  id: 'params',
  filename: 'params.csv',
  columns: ['Name', 'Value'],
  rows: [['timeout', '30'], ['retries', '3']],
  onChange: (rows) => console.log('Updated rows:', rows),
  onError: (message) => showNote(message)
});
parent.appendChild(table.element);
```

A loaded file whose first line names the table's own columns, trimmed and regardless of case, has that
line dropped and the rest become the rows. One whose first line names anything else is refused whole,
since a file of another shape read positionally is worse than one not read at all, and `onError` is told
so that a host may say which file it was. `getCsv` and `setCsv` are that same conversion without the
controls, for a host that keeps the text somewhere of its own.

Pass `downloadable: false` or `uploadable: false` where a table is not a file, and use `footerEl` for a
control of the host's own, which stands left of the table's.

## `createControlButton(options)`

A small, consistently styled button for use in entry control slots or other contexts. Applies the `.bjs-control` class for circular shape, sizing, icon centering, and hover highlight. The icon is mandatory and centered in the button.

### Options

| option | type | required | purpose |
|--------|------|----------|---------|
| `icon` | `string` | yes | SVG markup to render as the button's content (icon-only, centered) |
| `title` | `string` | no | shown as tooltip and aria-label |
| `onClick` | `function` | no | click handler |

### Return value

An `HTMLButtonElement` with `.bjs-control` class applied. Ready to pass to an entry's `controls` option or use anywhere a compact control is needed.

### Usage

A control button in an entry:
```javascript
const deleteBtn = createControlButton({
  title: 'Remove',
  icon: '<svg>…</svg>',
  onClick: () => { removeItem(); }
});

const entry = createSimpleEntry({
  content: 'Item to remove',
  controls: deleteBtn
});
parent.appendChild(entry.element);
```

Multiple controls:
```javascript
const controls = [
  createControlButton({ title: 'Edit', icon: EDIT_SVG, onClick: edit }),
  createControlButton({ title: 'Delete', icon: DELETE_SVG, onClick: del })
];

const entry = createSimpleEntry({
  content: 'Item',
  controls
});
```

## `createSeparator()`

A full-width divider placed between entries to improve visual separation.

### Usage

```javascript
parent.appendChild(entry1.element);
parent.appendChild(createSeparator());
parent.appendChild(entry2.element);
```

## Common patterns

### Appending entries

Each factory returns an `element` property, which is what gets appended to a parent:

```javascript
const entry = createSimpleEntry({ content: 'My row' });
parent.appendChild(entry.element);
```

### Handling state changes

For entries that persist (like table or ordered list), keep the wrapper object to use its methods:

```javascript
const table = createTableEntry({ ... });
// Later:
table.setRows(newData);
table.addRow(['new', 'data']);
```

For entries that are rebuilt on every render (common in panels that tear down and rebuild), just keep the `element`:

```javascript
// On every store change:
inspector.innerHTML = '';
results.forEach(r => {
  inspector.appendChild(createSimpleEntry({ content: r.name }).element);
});
```

### Nesting

Entries are nested by giving one as another's `content`, or by appending it to `contentEl`:

```javascript
const child = createSimpleEntry({ content: 'Child' });
const parent = createCollapsibleEntry({ label: 'Parent', content: child.element });
root.appendChild(parent.element);
```

### Live updates

When an entry is kept and used long-term, call its update methods to keep it current without rebuilding:

```javascript
const entry = createSimpleEntry({ content: 'Status: loading' });
root.appendChild(entry.element);

// Later:
entry.setContent('Status: done');
```
