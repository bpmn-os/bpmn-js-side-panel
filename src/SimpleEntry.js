import { buildEntryRow, el, labelSetter, makeClickable } from './entryUtil.js';

/**
 * Plain-DOM **summary row** — one line of an entry list that discloses nothing.
 *
 * It is the collapsible entry's header without the caret and without the body, drawn from the same
 * helper so the two cannot drift: a label slot that takes the width and a controls slot held to its
 * right, holding whatever controls the row carries. Because it has no disclosure at all, the label runs
 * the full width of the entry rather than stopping short of a caret's space.
 *
 * Which of the three to reach for. **This one** for a row that never opens, in a list where nothing
 * opens: a token in a panel that shows no detail, a message, a name with a value beside it. A
 * **collapsible entry** for a row that opens, and also for one that cannot open but stands among rows
 * that can, which is what its `expandable: false` is for: such a row keeps the caret's space so the
 * list holds one alignment. A **plain entry** when what is wanted is not a row at all but a
 * full-width box to fill with content of the consumer's own, a note or a hint.
 *
 * Live updates: mutate `summaryEl` (or what was put in it) directly, or call `setLabel`. The element
 * is the same node throughout, so nothing is rebuilt and a click target never moves under the pointer.
 *
 * @param {Object} [options]
 * @param {string} [options.id]              stamped as data-entry-id
 * @param {string|Node} [options.label]      the row's content, a string or an element
 * @param {Function} [options.onClick]       when given, the whole row is clickable
 * @param {Node|Node[]} [options.controls]   controls the row carries, held right of the label
 * @param {string} [options.emptyLabel='<empty>'] placeholder shown when `label` is empty
 *
 * @return {{
 *   element: HTMLElement,
 *   summaryEl: HTMLElement,
 *   controlsEl: HTMLElement,
 *   setLabel: (function((string|Node)): void),
 *   destroy: (function(): void)
 * }}
 */
export default function createSimpleEntry(options = {}) {
  const {
    id,
    label,
    onClick,
    controls,
    emptyLabel = '<empty>'
  } = options;

  const element = el('div', 'bjs-entry bjs-simple-entry');
  makeClickable(element, onClick);
  if (id != null) {
    element.setAttribute('data-entry-id', id);
  }

  const { row, titleEl, controlsEl } = buildEntryRow({
    rowClass: 'bjs-simple-entry-row',
    titleClass: 'bjs-simple-entry-title',
    controlsClass: 'bjs-simple-entry-controls',
    controls
  });
  element.appendChild(row);

  const setLabel = labelSetter(titleEl, emptyLabel);
  setLabel(label);

  const destroy = () => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  };

  return { element, summaryEl: titleEl, controlsEl, setLabel, destroy };
}
