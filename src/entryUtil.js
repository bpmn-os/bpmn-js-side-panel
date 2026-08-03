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
 * held to its right, holding whatever controls the row carries. A simple entry is this row and nothing
 * else; a collapsible entry is this row, a caret and a body. Both draw it from here, so the row cannot
 * drift between them, and the class names are the caller's so each kind keeps its own namespace.
 *
 * The controls belong to the row: what it can be asked to do — remove it, deliver a message to the token
 * it shows, move it up or down an order. They are the consumer's own elements, so a consumer decides what
 * they are, what they look like and when they are shown; the slot only holds them, and takes no width
 * while it holds none. A control that must not also toggle or select the row stops its own event.
 *
 * @param {Object} options
 * @param {string} options.rowClass
 * @param {string} options.titleClass
 * @param {string} options.controlsClass
 * @param {Node|Node[]} [options.controls]  what the row carries, in the order given
 * @return {{ row: HTMLElement, titleEl: HTMLElement, controlsEl: HTMLElement }}
 */
export function buildEntryRow({ rowClass, titleClass, controlsClass, controls }) {
  const row = el('div', rowClass);

  const titleEl = el('div', titleClass);
  row.appendChild(titleEl);

  const controlsEl = el('div', controlsClass);

  // A control acts on the row, not through it: the slot stops its clicks, as the caret does, so a control
  // never also toggles the disclosure or fires the row's own click.
  controlsEl.addEventListener('click', (event) => event.stopPropagation());
  row.appendChild(controlsEl);

  [].concat(controls || []).forEach((control) => control && controlsEl.appendChild(control));

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

