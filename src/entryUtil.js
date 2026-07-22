/**
 * Shared DOM helpers for the side panel's entry primitives (collapsible / plain entries, separators).
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
