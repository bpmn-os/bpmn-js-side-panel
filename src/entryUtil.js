/**
 * Shared DOM helpers for the side panel's entry primitives (simple / collapsible / plain entries,
 * separators).
 */

export function el(tag, className) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  return node;
}

/**
 * Make a whole entry behave as a clickable row (like an Issues entry) when an onClick is provided:
 * a pointer with a hover highlight (via the `.bjs-entry-clickable` CSS), and keyboard-activatable.
 * No-op when onClick is not a function, so entries are inert by default.
 */
/**
 * The summary row an entry kind is built on: a title slot that takes the width and a controls slot
 * held to its right, with the optional remove control as the first of those. A simple entry is this
 * row and nothing else; a collapsible entry is this row, a caret and a body. Both draw it from here,
 * so the row cannot drift between them, and the class names are the caller's so each kind keeps its
 * own namespace.
 *
 * @param {Object} options
 * @param {string} options.rowClass
 * @param {string} options.titleClass
 * @param {string} options.controlsClass
 * @param {string} options.removeClass
 * @param {Function} [options.remove]  when given, the row carries a remove control calling it
 * @return {{ row: HTMLElement, titleEl: HTMLElement, controlsEl: HTMLElement }}
 */
export function buildEntryRow({ rowClass, titleClass, controlsClass, removeClass, remove }) {
  const row = el('div', rowClass);

  const titleEl = el('div', titleClass);
  row.appendChild(titleEl);

  const controlsEl = el('div', controlsClass);
  row.appendChild(controlsEl);

  if (typeof remove === 'function') {
    const removeBtn = el('button', removeClass);
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', 'Remove');
    removeBtn.innerHTML = REMOVE_SVG;
    removeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      remove(event);
    });
    controlsEl.appendChild(removeBtn);
  }

  return { row, titleEl, controlsEl };
}

/**
 * The label writer every entry kind shares: a string becomes text, an element replaces the slot's
 * children, and nothing at all becomes the placeholder, marked so the CSS can grey it.
 *
 * @param {HTMLElement} titleEl
 * @param {string} emptyLabel
 * @return {function((string|Node|null)): void}
 */
export function labelSetter(titleEl, emptyLabel) {
  return (value) => {
    if (value == null || value === '') {
      titleEl.textContent = emptyLabel;
      titleEl.classList.add('bjs-empty');
    } else if (typeof value === 'string') {
      titleEl.textContent = value;
      titleEl.classList.remove('bjs-empty');
    } else {
      titleEl.replaceChildren(value);
      titleEl.classList.remove('bjs-empty');
    }
  };
}

export function makeClickable(element, onClick) {
  if (typeof onClick !== 'function') {
    return;
  }
  element.classList.add('bjs-entry-clickable');
  element.tabIndex = 0;
  element.setAttribute('role', 'button');
  element.addEventListener('click', onClick);
  element.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(event);
    }
  });
}

const REMOVE_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<path d="M6 2.5h4M3 4.5h10M5 4.5v8a1 1 0 001 1h4a1 1 0 001-1v-8M6.5 6.5v5M9.5 6.5v5" ' +
  'fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" ' +
  'stroke-linejoin="round"/></svg>';
