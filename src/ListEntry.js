import { el } from './entryUtil.js';

/**
 * Plain-DOM **list container** — a keyed, live collection of entry elements kept in order.
 *
 * Entry-type-agnostic: it holds whatever entry elements you add (collapsible / plain / table / a
 * token entry / a nested list). Its whole reason to exist over a bare `<div>` is the **keyed
 * reconcile** — `add`/`remove`/`move` by key, mutating the DOM in place so a live stream of updates
 * never rebuilds the list and never loses expansion, scroll, or focus. New entries append by default
 * (no sorting, no selection, no collapse of its own — those are composition/consumer concerns).
 *
 * Live updates: keep the element you `add`ed (or fetch it with `get(key)`) and mutate it directly;
 * the list holds the same node, so the change is in place.
 *
 * The entries a list starts with are given as `items`, each of them the key it is held under and the
 * element it is, in the order they are to be shown; it is `add` that gives it one later. A list built in
 * one call reads as the list it is rather than as the calls that made it.
 *
 * @param {Object} [options]
 * @param {string} [options.id]           stamped as data-entry-id
 * @param {boolean} [options.separators=false]  draw a hairline between consecutive entries (the same
 *                                        1px grey rule as {@link createSeparator}); off by default so
 *                                        entries stack flush. Toggle later with `setSeparators`.
 * @param {Array<{key: string, element: HTMLElement}>} [options.items]  the entries to start with
 * @return {{
 *   element: HTMLElement,
 *   add: (function(string, HTMLElement, number=): HTMLElement),
 *   remove: (function(string): void),
 *   move: (function(string, number): void),
 *   setSeparators: (function(boolean): void),
 *   has: (function(string): boolean),
 *   get: (function(string): (HTMLElement|undefined)),
 *   keys: (function(): string[]),
 *   clear: (function(): void)
 * }}
 */
export default function createListEntry(options = {}) {
  const { id, separators = false, items } = options;

  const element = el('div', 'bjs-entry bjs-list');
  element.classList.toggle('bjs-list-separated', separators !== false);
  if (id != null) {
    element.setAttribute('data-entry-id', id);
  }

  const entries = new Map();   // key -> entry element
  const order = [];            // keys, in display order

  const nodeAt = (index) => element.children[index] || null;

  /** Add (or replace) the entry for `key`; appends unless `index` is given. Returns the entry element. */
  const add = (key, entryEl, index) => {
    if (entries.has(key)) {
      remove(key);
    }
    const at = (index == null || index >= order.length) ? order.length : Math.max(0, index);
    order.splice(at, 0, key);
    entries.set(key, entryEl);
    element.insertBefore(entryEl, nodeAt(at));
    return entryEl;
  };

  const remove = (key) => {
    const entryEl = entries.get(key);
    if (!entryEl) {
      return;
    }
    if (entryEl.parentNode === element) {
      element.removeChild(entryEl);
    }
    entries.delete(key);
    const i = order.indexOf(key);
    if (i >= 0) {
      order.splice(i, 1);
    }
  };

  /** Move `key` to `index` (clamped), reflowing the DOM to match. */
  const move = (key, index) => {
    const from = order.indexOf(key);
    if (from < 0) {
      return;
    }
    const to = Math.max(0, Math.min(index, order.length - 1));
    if (to === from) {
      return;
    }
    order.splice(from, 1);
    order.splice(to, 0, key);
    // appendChild on an existing child moves it, so appending in order reorders the whole list
    order.forEach((k) => element.appendChild(entries.get(k)));
  };

  const has = (key) => entries.has(key);
  const get = (key) => entries.get(key);
  const keys = () => order.slice();
  const clear = () => order.slice().forEach(remove);
  const setSeparators = (on) => element.classList.toggle('bjs-list-separated', !!on);

  [].concat(items || []).forEach((item) => item && add(item.key, item.element));

  return { element, add, remove, move, setSeparators, has, get, keys, clear };
}
