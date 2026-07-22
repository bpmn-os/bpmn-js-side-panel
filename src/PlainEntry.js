import { el, makeClickable } from './entryUtil.js';

/**
 * Plain-DOM non-collapsible entry — a full-width, internally-inset container the consumer fills with its
 * own content. Part of the side panel's entry toolkit alongside createCollapsibleEntry; full-width with
 * the shared `--bjs-entry-inset` applied inside, so plain and collapsible entries line up and full-width
 * separators/backgrounds are trivial.
 *
 * Give an `onClick` to make the whole entry a clickable row (Issues-style): pointer, hover highlight, and
 * keyboard-activatable. Styling of the entry's own content is the consumer's; the frame is the panel's.
 *
 * @param {Object} [options]
 * @param {string} [options.id]         stamped as data-entry-id
 * @param {Function} [options.onClick]  when given, the whole entry is clickable
 * @return {{ element: HTMLElement, contentEl: HTMLElement, destroy: (function(): void) }}
 */
export default function createPlainEntry(options = {}) {
  const { id, onClick } = options;

  const element = el('div', 'bjs-entry bjs-plain-entry');
  makeClickable(element, onClick);
  if (id != null) {
    element.setAttribute('data-entry-id', id);
  }

  const destroy = () => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  };

  // the entry element IS the content slot — the consumer appends its content directly (the inset lives on it)
  return { element, contentEl: element, destroy };
}
