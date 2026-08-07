/**
 * A control button — a small, consistently styled button for use in entry control slots or elsewhere.
 * Part of the side panel's entry toolkit; applies the `.bjs-control` class for circular shape,
 * sizing, and hover highlight. The icon is mandatory and centered in the button.
 *
 * @param {Object} options
 * @param {string} options.icon          SVG markup to render as the button's content (icon-only, mandatory)
 * @param {string} [options.title]       shown as a tooltip and aria-label
 * @param {Function} [options.onClick]   click handler
 *
 * @return {HTMLButtonElement}  a styled button ready to pass to an entry's `controls` option
 */
export default function createControlButton(options = {}) {
  const { icon, title, onClick } = options;

  if (!icon) {
    throw new Error('createControlButton: icon is required');
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bjs-control';
  button.innerHTML = icon;

  if (title) {
    button.title = title;
    button.setAttribute('aria-label', title);
  }

  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }

  return button;
}
