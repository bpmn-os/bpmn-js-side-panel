import { el } from './entryUtil.js';

/**
 * Plain-DOM separator — an explicit full-width divider the consumer places between entries in a tab's
 * body or footer (`body.append(entryA.element, createSeparator(), entryB.element)`). Because entries are
 * full-width, the divider spans the panel with no breakout. Omit it for flush entries.
 *
 * @return {HTMLElement}
 */
export default function createSeparator() {
  return el('div', 'bjs-separator');
}
