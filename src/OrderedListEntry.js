import { el } from './entryUtil.js';
import createListEntry from './ListEntry.js';

/**
 * Plain-DOM **ordered list**: a {@link createListEntry} whose order is consumer-driven, with a
 * reorder *strip* on each entry.
 *
 * The order is explicit. The user reorders with the per-entry ▲/▼ buttons, or the consumer reorders
 * algorithmically via `move`/`moveUp`/`moveDown`. There is no sort key, so new entries append and
 * nothing re-sorts on its own. `onReorder(orderedKeys)` fires after any change.
 *
 * The reorder controls live in a thin **strip**, a lane on one side of the entry opposite the collapse
 * caret, so they never overlap the entry's own content and the content stays freely clickable. The
 * strip holds ▲ (top) and ▼ (bottom), styled like the collapse caret with a grey glyph and a circular
 * hover. On an expanded entry a passive line connects the two arrows through the taller body; on a
 * collapsed entry the arrows sit together and the line collapses away. The strip shows only while
 * reordering is enabled (`bjs-reordering`); ▲ is disabled on the first entry, ▼ on the last. Reorder
 * is fully keyboard-operable because ▲/▼ are real buttons. There is no drag support.
 *
 * An entry added as **fixed** holds its position. It is an anchor rather than a member of the order: it
 * carries the lane but no arrows, neither `move` nor the user's controls displace it, and no other entry
 * passes it, so ▲ is disabled on the entry below an anchor and ▼ on the entry above one. A list whose
 * first entry is fixed therefore reorders freely beneath a heading that stays put. The lane is kept
 * empty rather than dropped, so an anchor lines up with the entries around it.
 *
 * The entries a list starts with are given as `items`, as {@link createListEntry} takes them, each of
 * them the key it is held under and the element it is, and an anchor saying so with `fixed`.
 *
 * @param {Object} [options]
 * @param {string} [options.id]
 * @param {'left'|'right'} [options.side='left']   which side the strip sits (default opposite the caret)
 * @param {boolean} [options.reordering=true]      show the strip (call `setReordering` to toggle)
 * @param {boolean} [options.separators=false]     hairline between entries (see {@link createListEntry})
 * @param {Function} [options.onReorder]           called with the new key order after any reorder
 * @param {Array<{key: string, element: HTMLElement, fixed: boolean=}>} [options.items]  the entries to
 *                                                 start with, an anchor among them marked `fixed`
 * @return {{
 *   element: HTMLElement,
 *   add: (function(string, HTMLElement, number=, Object=): HTMLElement),
 *   remove: (function(string): void),
 *   move: (function(string, number): void),
 *   moveUp: (function(string): void),
 *   moveDown: (function(string): void),
 *   setReordering: (function(boolean): void),
 *   has: (function(string): boolean),
 *   get: (function(string): (HTMLElement|undefined)),
 *   keys: (function(): string[]),
 *   clear: (function(): void)
 * }}
 */
export default function createOrderedListEntry(options = {}) {
  const { id, side = 'left', reordering = true, separators = false, onReorder, items } = options;

  const list = createListEntry({ separators });   // holds ROW wrappers (strip + item), keyed the same
  const element = list.element;
  element.classList.remove('bjs-list');
  element.classList.add('bjs-ordered-list');
  if (side === 'right') {
    element.classList.add('bjs-strip-right');
  }
  element.classList.toggle('bjs-reordering', reordering !== false);
  if (id != null) {
    element.setAttribute('data-entry-id', id);
  }

  const rows = new Map();   // key -> { up, down, entryEl, fixed }

  const isFixed = (key) => !!(rows.get(key) || {}).fixed;

  const syncEnds = () => {
    const ks = list.keys();
    ks.forEach((k, i) => {
      const r = rows.get(k);
      if (!r || r.fixed) {
        return; // an anchor carries no arrows
      }
      r.up.disabled = (i === 0) || isFixed(ks[i - 1]);
      r.down.disabled = (i === ks.length - 1) || isFixed(ks[i + 1]);
    });
  };

  const emit = () => {
    if (typeof onReorder === 'function') {
      onReorder(list.keys());
    }
  };

  // An anchor holds its position and nothing passes it, so a move is confined to the run of entries
  // between the nearest anchor above and the nearest anchor below.
  const bounds = (from) => {
    const ks = list.keys();
    let lower = 0,
        upper = ks.length - 1;

    for (let i = from - 1; i >= 0; i--) {
      if (isFixed(ks[i])) {
        lower = i + 1;
        break;
      }
    }
    for (let i = from + 1; i < ks.length; i++) {
      if (isFixed(ks[i])) {
        upper = i - 1;
        break;
      }
    }

    return [ lower, upper ];
  };

  const move = (key, index) => {
    const from = list.keys().indexOf(key);

    if (from < 0 || isFixed(key)) {
      return;
    }

    const [ lower, upper ] = bounds(from),
          target = Math.min(Math.max(index, lower), upper);

    if (target === from) {
      return;
    }

    list.move(key, target);
    syncEnds();
    emit();
  };
  const moveUp = (key) => {
    const i = list.keys().indexOf(key);
    if (i > 0) {
      move(key, i - 1);
    }
  };
  const moveDown = (key) => {
    const ks = list.keys();
    const i = ks.indexOf(key);
    if (i >= 0 && i < ks.length - 1) {
      move(key, i + 1);
    }
  };

  const add = (key, entryEl, index, { fixed = false } = {}) => {
    const row = el('div', 'bjs-ordered-list-row');

    const strip = el('div', 'bjs-reorder-strip');

    if (fixed) {
      // an anchor: the lane without the arrows, so it lines up with the entries it holds in place
      const item = el('div', 'bjs-ordered-list-item');

      item.appendChild(entryEl);
      row.append(strip, item);

      rows.set(key, { entryEl, fixed: true });
      list.add(key, row, index);
      syncEnds();

      return entryEl;
    }

    const up = el('button', 'bjs-reorder-up');
    up.type = 'button';
    up.title = 'Move up';
    up.setAttribute('aria-label', 'Move up');
    up.innerHTML = UP_SVG;
    // passive connector line between the arrows; grows on an expanded entry, collapses to nothing on a
    // short row (see .bjs-reorder-line). Purely decorative, so it carries no interaction.
    const line = el('div', 'bjs-reorder-line');
    line.setAttribute('aria-hidden', 'true');
    const down = el('button', 'bjs-reorder-down');
    down.type = 'button';
    down.title = 'Move down';
    down.setAttribute('aria-label', 'Move down');
    down.innerHTML = DOWN_SVG;
    strip.append(up, line, down);

    up.addEventListener('click', (event) => { event.stopPropagation(); moveUp(key); });
    down.addEventListener('click', (event) => { event.stopPropagation(); moveDown(key); });

    const item = el('div', 'bjs-ordered-list-item');
    item.appendChild(entryEl);

    row.append(strip, item);

    rows.set(key, { up, down, entryEl });
    list.add(key, row, index);
    syncEnds();
    return entryEl;
  };

  const remove = (key) => {
    list.remove(key);
    rows.delete(key);
    syncEnds();
  };

  const setReordering = (on) => element.classList.toggle('bjs-reordering', !!on);

  [].concat(items || []).forEach((item) => item && add(item.key, item.element, undefined, item));

  return {
    element,
    add,
    remove,
    move,
    moveUp,
    moveDown,
    setReordering,
    setSeparators: list.setSeparators,
    has: (key) => list.has(key),
    get: (key) => (rows.get(key) || {}).entryEl,
    keys: () => list.keys(),
    clear: () => { rows.clear(); list.clear(); }
  };
}

// Font Awesome Free's solid arrow-up and arrow-down, so the step controls share the icon language of the
// disclosure caret rather than being ad-hoc triangles. They are CC BY 4.0 and attributed in LICENSE.
const UP_SVG =
  '<svg width="12" height="12" viewBox="0 0 640 640" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M342.6 73.4C330.1 60.9 309.8 60.9 297.3 73.4L137.3 233.4C124.8 245.9 ' +
  '124.8 266.2 137.3 278.7C149.8 291.2 170.1 291.2 182.6 278.7L288 173.3L288 544C288 561.7 302.3 576 ' +
  '320 576C337.7 576 352 561.7 352 544L352 173.3L457.4 278.7C469.9 291.2 490.2 291.2 502.7 278.7C515.2 ' +
  '266.2 515.2 245.9 502.7 233.4L342.7 73.4z"/></svg>';
const DOWN_SVG =
  '<svg width="12" height="12" viewBox="0 0 640 640" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M297.4 566.6C309.9 579.1 330.2 579.1 342.7 566.6L502.7 406.6C515.2 ' +
  '394.1 515.2 373.8 502.7 361.3C490.2 348.8 469.9 348.8 457.4 361.3L352 466.7L352 96C352 78.3 337.7 ' +
  '64 320 64C302.3 64 288 78.3 288 96L288 466.7L182.6 361.3C170.1 348.8 149.8 348.8 137.3 361.3C124.8 ' +
  '373.8 124.8 394.1 137.3 406.6L297.3 566.6z"/></svg>';
