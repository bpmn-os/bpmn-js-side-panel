/**
 * Plain-DOM editable table entry — the side panel's grid primitive: a **fixed header** with a **fixed
 * set of columns**, editable text cells, **add / delete rows**, and **keyboard cell navigation**. Part of
 * the side panel's own UI toolkit (`bjs-table-*` classes, `--bjs-*` design tokens); styling lives in
 * assets/side-panel.css. No dependency on @bpmn-io/properties-panel.
 *
 * The delete controls sit in a column **beside** the table (outside the `<table>`), one per row, aligned
 * to the rows — they are a row action, not a data column. The footer holds the add-row (plus) button on
 * the left, and on the right the table's own file controls beside a slot (`footerEl`) for a consumer's.
 *
 * **The table owns its file.** A table is rows under named columns, which is a CSV, so saving one and
 * loading one belong to the table and not to each host that draws it: `downloadable` and `uploadable`
 * give it the two controls, `filename` names what it saves and `separator` says how a cell is divided
 * from the next. A loaded file whose header names the table's own columns, trimmed and regardless of
 * case, has that header dropped and its remaining lines become the rows; one whose header names anything
 * else is refused whole, since a file of the wrong shape read positionally is worse than one not read,
 * and `onError` is told so a host may say which file it was. `getCsv` and `setCsv` are the same
 * conversion without the controls, for a host that keeps the text somewhere of its own.
 *
 * Composition, like the collapsible entry: this returns the grid `element`; a consumer nests it. Rows are
 * **arrays of cell strings** aligned to `columns`. `onChange` fires after every edit / add / delete with
 * the current rows.
 *
 * Keyboard navigation (within the grid):
 * - Tab / Shift-Tab — next / previous cell (native DOM order).
 * - ArrowUp / ArrowDown — same column, previous / next row.
 * - ArrowLeft / ArrowRight — move a cell only when the caret is at the start / end of the text.
 * - Enter — next row, same column; on the last row it appends a new row (when addable).
 * Moving to a cell selects its content.
 *
 * @param {Object} options
 * @param {Array<string|{label:string,width?:string}>} options.columns  the fixed header columns (a
 *        plain string is treated as its label)
 * @param {Array<Array<string>>} [options.rows=[]]  initial rows (each aligned to `columns`)
 * @param {Function} [options.onChange]  (rows) => void — after any edit / add / delete
 * @param {string} [options.addLabel='Add row']  label for the add-row button
 * @param {number} [options.minRows=0]  never delete below this many rows
 * @param {number|string} [options.maxHeight]  cap the grid height and scroll rows under the fixed header
 *        (a number is treated as px; a string is used verbatim, e.g. '240px', '50vh'). Consumers can also
 *        set the `--bjs-table-max-height` custom property instead.
 * @param {boolean} [options.addable=true]  render the add-row button + allow Enter-append
 * @param {boolean} [options.deletable=true]  render the beside-table delete column
 * @param {boolean} [options.downloadable=true]  render the download control, saving the rows as CSV
 * @param {boolean} [options.uploadable=true]  render the upload control, replacing the rows from a CSV
 * @param {string} [options.filename='table.csv']  what a download saves as, and what both controls name
 * @param {string} [options.separator=';']  what divides one cell from the next in that CSV
 * @param {Function} [options.onError]  (message) => void — a file refused for naming other columns
 *
 * @return {{
 *   element: HTMLElement,
 *   footerEl: HTMLElement,
 *   getRows: (function(): Array<Array<string>>),
 *   setRows: (function(Array<Array<string>>): void),
 *   getCsv: (function(): string),
 *   setCsv: (function(string): boolean),
 *   addRow: (function((Array<string>|null)=, boolean=): HTMLTableRowElement),
 *   destroy: (function(): void)
 * }}
 */
export default function createTableEntry(options = {}) {
  const {
    columns = [],
    rows = [],
    onChange,
    addLabel = 'Add row',
    minRows = 0,
    maxHeight,
    addable = true,
    deletable = true,
    downloadable = true,
    uploadable = true,
    filename = 'table.csv',
    separator = ';',
    onError
  } = options;

  // columns may be plain strings or { label, width } objects — normalise to objects
  const cols = columns.map(c => (typeof c === 'string' ? { label: c } : c));
  const ncols = cols.length;

  const element = el('div', 'bjs-entry bjs-table-entry');
  if (maxHeight != null) {
    element.style.setProperty(
      '--bjs-table-max-height', typeof maxHeight === 'number' ? maxHeight + 'px' : maxHeight
    );
  }
  // a per-column minimum → the table scrolls horizontally when the panel is too narrow, rather than
  // cramping the columns (we can't guarantee the panel is wide enough for every column)
  element.style.setProperty('--bjs-table-min-width', ncols * 100 + 'px');

  // grid: the data table + a delete column that sits OUTSIDE the table
  const grid = el('div', 'bjs-table-grid');
  element.appendChild(grid);

  const scroll = el('div', 'bjs-table-scroll');
  grid.appendChild(scroll);

  // Header and body are SEPARATE tables so the body can scroll vertically under a header that stays put —
  // the vertical scrollbar then spans only the body, never the header. table-layout:fixed + a shared
  // min-width (CSS) keeps their columns aligned; their horizontal scroll is synced below.
  const headScroll = el('div', 'bjs-table-headscroll');
  const headTable = el('table', 'bjs-table');
  headScroll.appendChild(headTable);
  scroll.appendChild(headScroll);

  const bodyScroll = el('div', 'bjs-table-bodyscroll');
  const bodyTable = el('table', 'bjs-table');
  bodyScroll.appendChild(bodyTable);
  scroll.appendChild(bodyScroll);

  // header row (in the header table)
  const thead = el('thead', '');
  const headRow = el('tr', '');
  cols.forEach(col => {
    const th = el('th', '');
    th.textContent = col.label;
    if (col.width) {
      th.style.width = col.width;
    }
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  headTable.appendChild(thead);

  const tbody = el('tbody', '');
  bodyTable.appendChild(tbody);

  // delete controls, beside the table: a fixed header spacer + a scrolling body of one trash per row,
  // OUTSIDE the table. Mirror the body's scroll onto the header (horizontal) and this column (vertical),
  // so the header tracks the body's horizontal position and each trash icon stays aligned with its row.
  let actionsBody = null; // the scrolling trash container (rebuilt by syncActions)
  const rowActions = deletable ? el('div', 'bjs-table-rowactions') : null;
  if (rowActions) {
    grid.appendChild(rowActions);
  }
  bodyScroll.addEventListener('scroll', () => {
    headScroll.scrollLeft = bodyScroll.scrollLeft;
    if (actionsBody) { actionsBody.scrollTop = bodyScroll.scrollTop; }
  });

  // --- helpers -----------------------------------------------------------------

  function fire() {
    if (onChange) {
      onChange(getRows());
    }
  }

  function reindex() {
    Array.from(tbody.children).forEach((tr, r) => tr.setAttribute('data-row', String(r)));
  }

  function cellAt(r, c) {
    const tr = tbody.children[r];
    return tr ? tr.querySelector('.bjs-table-cell[data-col="' + c + '"]') : null;
  }

  function makeRow(values) {
    const tr = el('tr', '');
    for (let c = 0; c < ncols; c++) {
      const td = el('td', '');
      const input = el('input', 'bjs-table-cell');
      input.type = 'text';
      input.setAttribute('data-col', String(c));
      input.value = values && values[c] != null ? String(values[c]) : '';
      td.appendChild(input);
      tr.appendChild(td);
    }
    return tr;
  }

  // rebuild the beside-table delete column to mirror the current rows (a header spacer, then one control
  // per row aligned to the row heights via CSS)
  function syncActions() {
    if (!rowActions) {
      return;
    }
    rowActions.textContent = '';
    rowActions.appendChild(el('div', 'bjs-table-rowactions-head')); // fixed spacer, aligned with the header
    actionsBody = el('div', 'bjs-table-rowactions-body');           // scrolls with the table body
    rowActions.appendChild(actionsBody);
    Array.from(tbody.children).forEach(tr => {
      const cell = el('div', 'bjs-table-rowaction');
      const del = el('button', 'bjs-table-delete');
      del.type = 'button';
      del.tabIndex = -1;
      del.title = 'Delete row';
      del.innerHTML = DELETE_SVG;
      del.addEventListener('click', () => removeRow(tr));
      cell.appendChild(del);
      actionsBody.appendChild(cell);
    });
  }

  // --- operations --------------------------------------------------------------

  function getRows() {
    return Array.from(tbody.children).map(tr =>
      Array.from(tr.querySelectorAll('.bjs-table-cell')).map(input => input.value)
    );
  }

  function setRows(newRows) {
    tbody.textContent = '';
    (newRows || []).forEach(r => tbody.appendChild(makeRow(r)));
    reindex();
    syncActions();
  }

  function addRow(values, focusFirst) {
    const tr = makeRow(values);
    tbody.appendChild(tr);
    reindex();
    syncActions();
    fire();
    if (focusFirst) {
      const first = tr.querySelector('.bjs-table-cell');
      if (first) {
        first.focus();
        first.select();
      }
    }
    return tr;
  }

  function removeRow(tr) {
    if (tbody.children.length <= minRows) {
      return;
    }
    const idx = Number(tr.getAttribute('data-row'));
    tbody.removeChild(tr);
    reindex();
    syncActions();
    fire();
    const target = cellAt(Math.min(idx, tbody.children.length - 1), 0);
    if (target) {
      target.focus();
    }
  }

  // --- editing + keyboard navigation (delegated on the body) -------------------

  tbody.addEventListener('input', event => {
    if (event.target.classList.contains('bjs-table-cell')) {
      fire();
    }
  });

  tbody.addEventListener('keydown', event => {
    const input = event.target;
    if (!input.classList || !input.classList.contains('bjs-table-cell')) {
      return;
    }
    const tr = input.closest('tr');
    const r = Number(tr.getAttribute('data-row'));
    const c = Number(input.getAttribute('data-col'));
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;

    let target = null;
    switch (event.key) {
    case 'ArrowDown': target = cellAt(r + 1, c); break;
    case 'ArrowUp': target = cellAt(r - 1, c); break;
    case 'ArrowRight': if (atEnd) { target = cellAt(r, c + 1) || cellAt(r + 1, 0); } break;
    case 'ArrowLeft': if (atStart) { target = cellAt(r, c - 1) || (r > 0 ? cellAt(r - 1, ncols - 1) : null); } break;
    case 'Enter':
      target = cellAt(r + 1, c);
      if (!target && addable) {
        addRow(null, false);
        target = cellAt(r + 1, c);
      }
      break;
    default: return;
    }

    if (target) {
      event.preventDefault();
      target.focus();
      target.select();
    }
  });

  setRows(rows);

  /** The rows as CSV, the column labels first and an empty row left out. */
  function getCsv() {
    const line = (cells) => cells.join(separator);

    return [ line(cols.map(c => c.label)) ]
      .concat(getRows().filter(r => r.some(c => String(c).trim() !== '')).map(line))
      .join('\n');
  }

  /**
   * The rows from CSV, replacing what the table holds. A leading line naming the table's own columns is
   * the header and is dropped; a leading line naming anything else means a file of another shape, which
   * is refused whole rather than read positionally. Answers whether it was taken.
   */
  function setCsv(text) {
    const lines = String(text).split(/\r?\n/).filter(l => l.trim() !== ''),
          head = (lines[0] || '').split(separator).map(s => s.trim()),
          same = (a, b) => a.trim().toLowerCase() === String(b).trim().toLowerCase();

    if (head.length !== ncols || !head.every((h, i) => same(h, cols[i].label))) {
      return false;
    }

    setRows(lines.slice(1).map(l => l.split(separator).map(s => s.trim())));
    fire();

    return true;
  }

  // footer: add-row (plus) on the left; on the right a slot (`footerEl`) for a consumer's own controls,
  // and after it the table's own, so that a consumer emptying its slot cannot take them with it
  const footer = el('div', 'bjs-table-footer');
  if (addable) {
    const addBtn = el('button', 'bjs-table-add');
    addBtn.type = 'button';
    addBtn.title = addLabel; // label lives in the tooltip; the button is icon-only (properties-panel style)
    addBtn.innerHTML = CREATE_SVG;
    addBtn.addEventListener('click', () => addRow(null, true));
    footer.appendChild(addBtn);
  } else {
    footer.appendChild(el('span', ''));
  }

  const actions = el('div', 'bjs-table-footer-actions');
  const footerEl = el('div', 'bjs-table-footer-slot');
  actions.appendChild(footerEl);

  const control = (icon, title, onClick) => {
    const button = el('button', '');

    button.type = 'button';
    button.title = title;
    button.setAttribute('aria-label', title);
    button.innerHTML = icon;
    button.addEventListener('click', onClick);
    actions.appendChild(button);
  };

  if (uploadable) {
    const file = el('input', '');

    file.type = 'file';
    file.accept = '.csv,text/csv';
    file.hidden = true;
    file.addEventListener('change', () => {
      const chosen = file.files && file.files[0];

      if (chosen) {
        chosen.text().then((text) => {
          if (!setCsv(text) && typeof onError === 'function') {
            onError('Unexpected header in ' + chosen.name);
          }
        });
      }
      file.value = '';   // so that choosing the same file again is a change
    });
    actions.appendChild(file);
    control(UPLOAD_SVG, 'Load ' + filename, () => file.click());
  }

  if (downloadable) {
    control(DOWNLOAD_SVG, 'Download ' + filename, () => {
      const link = el('a', '');

      link.href = URL.createObjectURL(new Blob([ getCsv() ], { type: 'text/csv' }));
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  footer.appendChild(actions);
  element.appendChild(footer);

  function destroy() {
    element.remove();
  }

  return { element, footerEl, getRows, setRows, getCsv, setCsv, addRow, destroy };
}

// The exact icons @bpmn-io/properties-panel uses for its list add / remove controls, so a hosted table
// entry reads identically next to a Properties tab (create = plus, delete = trash; filled currentColor).
// They are theirs and MIT licensed; see LICENSE. They are exported because a consumer drawing its own
// create or delete control must draw the same glyph: one trash in the panel, whatever row carries it.
export const CREATE_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" fill-rule="evenodd" d="M9,13 L9,9 L13,9 C13.5522847,9 14,8.55228475 14,8 ' +
  'C14,7.44771525 13.5522847,7 13,7 L9,7 L9,3 C9,2.44771525 8.55228475,2 8,2 C7.44771525,2 7,2.44771525 ' +
  '7,3 L7,7 L3,7 C2.44771525,7 2,7.44771525 2,8 C2,8.55228475 2.44771525,9 3,9 L7,9 L7,13 ' +
  'C7,13.5522847 7.44771525,14 8,14 C8.55228475,14 9,13.5522847 9,13 Z"/></svg>';

// Load and save, drawn as a stroked arrow over a tray rather than in the filled properties-panel manner,
// there being no properties-panel control for either. They are exported for the same reason the other two
// are: a consumer drawing its own load or save control draws the same glyph.
export const UPLOAD_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M8 11V3M4.5 5.5 8 2l3.5 3.5M3 13h10"/></svg>';

export const DOWNLOAD_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M8 2v8M4.5 7.5 8 11l3.5-3.5M3 13h10"/></svg>';

export const DELETE_SVG =
  // viewBox offset so the (off-centre) properties-panel trash path — content ~x:0-10, y:0-12.55 — is
  // centred in the button rather than sitting up-and-left.
  '<svg width="16" height="16" viewBox="-3 -1.7 16 16" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" fill-rule="evenodd" d="M9,4 L9,11 C9,12.1 8.6,12.55 7.5,12.55 L2.5,12.55 ' +
  'C1.4,12.55 1,12.1 1,11 L1,4 L9,4 Z M7.5,5.5 L2.5,5.5 L2.5,9.8 C2.5,10.46 3,11 3.61111111,11 ' +
  'L6.38888889,11 C7,11 7.5,10.46 7.5,9.8 L7.5,5.5 Z M10,1 L8,1 L7,0 L3,0 L2,1 L0,1 L0,2.5 L10,2.5 ' +
  'L10,1 Z"/></svg>';

function el(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}
