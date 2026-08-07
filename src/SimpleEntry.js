import { contentSetter, el, makeClickable } from './entryUtil.js';

/**
 * Plain-DOM simple entry — the content it holds, and a slot for the controls that act on it.
 *
 * A simple entry discloses nothing: everything it holds is shown, always. Its content takes the width
 * and runs over as many lines as it needs, and the controls slot is held to its right, clear of the
 * content and taking no width while it holds none. An entry that shows some of what it holds only when
 * it is opened is a collapsible entry instead.
 *
 * The content is a string, an element, or a list of elements, and `setContent` replaces it in place, so
 * an entry that is kept is updated rather than rebuilt. The controls are the consumer's own elements:
 * the slot holds them and gives them their place, and what they are and what they do is the consumer's.
 * A click in the slot stops there, so a control never also fires the click the entry itself carries.
 *
 * @param {Object} [options]
 * @param {string} [options.id]                  stamped as data-entry-id
 * @param {string|Node|Node[]} [options.content] what the entry holds
 * @param {Node|Node[]} [options.controls]       controls the entry carries, held to the right of it
 * @param {Function} [options.onClick]           when given, the whole entry is clickable
 *
 * @return {{
 *   element: HTMLElement,
 *   contentEl: HTMLElement,
 *   controlsEl: HTMLElement,
 *   setContent: (function((string|Node|Node[]|null)): void),
 *   destroy: (function(): void)
 * }}
 */
export default function createSimpleEntry(options = {}) {
  const { id, content, controls, onClick } = options;

  const element = el('div', 'bjs-entry bjs-simple-entry');
  makeClickable(element, onClick);
  if (id != null) {
    element.setAttribute('data-entry-id', id);
  }

  const contentEl = el('div', 'bjs-simple-entry-content');
  element.appendChild(contentEl);

  const setContent = contentSetter(contentEl);
  setContent(content);

  const controlsEl = el('div', 'bjs-simple-entry-controls');
  controlsEl.addEventListener('click', (event) => event.stopPropagation());
  element.appendChild(controlsEl);

  [].concat(controls || []).forEach((control) => control && controlsEl.appendChild(control));

  const destroy = () => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  };

  return { element, contentEl, controlsEl, setContent, destroy };
}
