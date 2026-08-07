import { buildEntryRow, el, labelSetter, contentSetter, makeClickable } from './entryUtil.js';

/**
 * Plain-DOM collapsible entry — the first entry-component of the side panel's own UI toolkit.
 *
 * It mirrors the *structure* of @bpmn-io/properties-panel's collapsible entry (a summary header with
 * a disclosure arrow over an indented, side-lined body) but under this repo's own `bjs-collapsible-*`
 * class namespace and `--bjs-*` design tokens — no dependency on, and no class/CSS overlap with,
 * properties-panel. Styling lives in assets/side-panel.css.
 *
 * Design notes:
 * - The entry owns its open state as a class on the persistent root element, so live in-place updates
 *   (mutating the summary or content) never lose the expanded/collapsed state — the basis for
 *   focus/scroll-preserving live updates.
 * - The summary is a *slot* (`summaryEl`): pass a plain string or a custom element (colour swatch,
 *   badge, status pill, …) so consumers own the row's appearance.
 * - `expandable: false` renders a plain, non-expandable row (no arrow, no body) that still carries
 *   its controls — e.g. a marker/leaf row.
 * - Nesting is by composition: append child entries' `element` into a parent's `contentEl`.
 *
 * @param {Object} [options]
 * @param {string} [options.id]              stamped as data-entry-id (stable identity for updates)
 * @param {string|Node} [options.label]      collapsed summary content, string or element
 * @param {string|Node|Node[]} [options.content] content placed in the body (ignored when not expandable)
 * @param {boolean} [options.open=false]     initial open state (ignored when not expandable)
 * @param {'left'|'right'} [options.caretSide='right'] disclosure-caret placement, mirroring
 *        properties-panel: top-level groups put it on the right, nested entries on the left
 * @param {'header'|'caret'} [options.toggleOn='header'] what click toggles the disclosure. `'header'`
 *        (default, Issues/properties-panel style) toggles on a click anywhere in the summary row.
 *        `'caret'` toggles only on the caret, leaving summary/row clicks to the consumer (via `onClick`,
 *        e.g. select the row's item) — the caret stops propagation so it never also fires `onClick`.
 * @param {boolean} [options.expandable=true] false → a plain row with no arrow and no content body
 * @param {Node|Node[]} [options.controls]   controls the row carries, held right of the label
 * @param {string} [options.emptyLabel='<empty>'] placeholder shown when `label` is empty
 *
 * @return {{
 *   element: HTMLElement,
 *   summaryEl: HTMLElement,
 *   contentEl: (HTMLElement|null),
 *   controlsEl: HTMLElement,
 *   setOpen: (function(boolean): void),
 *   toggle: (function(): void),
 *   isOpen: (function(): boolean),
 *   setLabel: (function((string|Node)): void),
 *   destroy: (function(): void)
 * }}
 */
export default function createCollapsibleEntry(options = {}) {
  const {
    id,
    label,
    content,
    open = false,
    caretSide = 'right',
    toggleOn = 'header',
    expandable = true,
    controls,
    onToggle,
    onClick,
    emptyLabel = '<empty>'
  } = options;

  const element = el('div', 'bjs-entry bjs-collapsible-entry');
  makeClickable(element, onClick); // whole-entry click (Issues-style), when onClick is given
  if (expandable) {
    element.classList.add('bjs-collapsible-entry-expandable');
  }
  if (id != null) {
    element.setAttribute('data-entry-id', id);
  }

  // the summary row, shared with the simple entry (see buildEntryRow) — here it is the header, with
  // the caret appended to it and the body below
  const { row: header, titleEl: summaryEl, controlsEl } = buildEntryRow({
    rowClass: 'bjs-collapsible-entry-header',
    titleClass: 'bjs-collapsible-entry-title',
    controlsClass: 'bjs-collapsible-entry-controls',
    controls
  });
  element.appendChild(header);

  // Disclosure caret, rotating when open. Placement mirrors properties-panel: top-level groups on the
  // right (default); nested entries on the left, where the caret is pinned absolutely (see
  // .bjs-caret-left CSS) so DOM order is irrelevant — the class alone drives it.
  //
  // It is rendered for EVERY entry, expandable or not, so that a row's shape does not depend on
  // whether it can be opened: on a plain row the CSS hides it with `visibility` and it keeps its
  // space, so a list mixing the two kinds keeps one alignment. (Dropping the element instead would
  // widen a plain row's title by the caret's width, and rows would not line up.) On a plain row it is
  // inert: disabled, out of the tab order, hidden from a reader, and toggling nothing.
  const arrow = el('button', 'bjs-collapsible-entry-arrow');
  arrow.type = 'button';
  arrow.innerHTML = ARROW_SVG;
  if (expandable) {
    arrow.setAttribute('aria-label', 'Toggle');
  } else {
    arrow.disabled = true;
    arrow.tabIndex = -1;
    arrow.setAttribute('aria-hidden', 'true');
  }
  if (caretSide === 'left') {
    element.classList.add('bjs-caret-left');
  }
  header.appendChild(arrow);

  // content body (entries) — only for expandable entries
  let contentEl = null;
  if (expandable) {
    contentEl = el('div', 'bjs-collapsible-entry-entries');
    element.appendChild(contentEl);
    if (content != null) {
      const setContent = contentSetter(contentEl);
      setContent(content);
    }
  }

  // open state lives as a class on the persistent root, so it survives content mutation
  const isOpen = () => element.classList.contains('bjs-open');
  const setOpen = (value) => {
    if (!expandable) {
      return;
    }
    const next = !!value;
    if (next === isOpen()) {
      return;
    }
    element.classList.toggle('bjs-open', next);
    if (typeof onToggle === 'function') {
      onToggle(next);   // fires only on an actual change, not on the initial render
    }
  };
  const toggle = () => setOpen(!isOpen());

  if (expandable) {
    if (open) {
      element.classList.add('bjs-open');   // set initial state directly, without firing onToggle
    }
    if (toggleOn === 'caret') {
      // caret-scoped: only the disclosure caret toggles, so a summary/row click is free for the
      // consumer (e.g. select the row's item). stopPropagation keeps the caret from also firing onClick.
      arrow.addEventListener('click', (event) => { event.stopPropagation(); toggle(); });
    } else {
      header.addEventListener('click', toggle); // whole-header toggle (Issues/properties-panel style)
    }
  }

  const setLabel = labelSetter(summaryEl, emptyLabel);
  setLabel(label);

  const destroy = () => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  };

  return { element, summaryEl, contentEl, controlsEl, setOpen, toggle, isOpen, setLabel, destroy };
}

// A right-pointing chevron; CSS rotates it 90° (→ down) when the entry is open. This is the exact
// glyph @bpmn-io/properties-panel uses for its group/collapsible arrow (a filled L-bracket rotated
// -45°) so the caret's weight and colour match a hosted Properties tab rather than reading lighter.
// It is theirs and MIT licensed; see LICENSE.
const ARROW_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" fill-rule="evenodd" transform="rotate(-45 6 8)" ' +
  'd="M10,12 L3,12 C2.44771525,12 2,11.5522847 2,11 C2,10.4477153 2.44771525,10 3,10 ' +
  'L8,10 L8,5 C8,4.44771525 8.44771525,4 9,4 C9.55228475,4 10,4.44771525 10,5 L10,12 Z"/></svg>';
