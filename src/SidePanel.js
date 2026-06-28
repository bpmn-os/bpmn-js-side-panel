/**
 * A resizable, tabbed side panel.
 *
 * - Builds a tab bar + panes inside the configured `parent`.
 * - If a `propertiesPanel` service is present, hosts it automatically as the first tab.
 * - Lets consumers add any number of tabs via `addTab()`.
 * - The panel is resizable via a left-edge drag handle; after a resize the canvas is
 *   notified (`canvas.resized()`) so the diagram refits.
 *
 * Config (`sidePanel`):
 *   - parent:   selector or element the panel is mounted into and whose width is resized.
 *   - header:   optional content (HTML string or element) for a header/logo slot shown above
 *               the tabs and spanning the body, with the resize handle running full height
 *               alongside it.
 *   - width:    initial width (CSS value, default '300px').
 *   - minWidth: minimum width in px while resizing (default 180).
 */
export default class SidePanel {
  constructor(config, injector, eventBus, canvas) {
    this._config = config || {};
    this._injector = injector;
    this._canvas = canvas;
    this._tabs = [];
    this._activeId = null;

    eventBus.on('diagram.init', () => this._init());
    eventBus.on('diagram.destroy', () => this._destroy());
  }

  _init() {
    const parent = this._parent = resolveElement(this._config.parent);

    if (!parent) {
      return;
    }

    if (this._config.width) {
      parent.style.width = this._config.width;
    }

    const container = this._container = el('div', 'bjs-side-panel');

    // left-edge resize handle
    const handle = el('div', 'bjs-side-panel-resize-handle');
    container.appendChild(handle);
    this._setupResize(handle);

    const body = el('div', 'bjs-side-panel-body');
    container.appendChild(body);

    // optional header / logo slot at the top, spanning the body width
    if (this._config.header) {
      const header = el('div', 'bjs-side-panel-header');
      if (typeof this._config.header === 'string') {
        header.innerHTML = this._config.header;
      } else {
        header.appendChild(this._config.header);
      }
      body.appendChild(header);
    }

    this._tabBar = el('div', 'bjs-side-panel-tabs');
    body.appendChild(this._tabBar);

    this._panes = el('div', 'bjs-side-panel-panes');
    body.appendChild(this._panes);

    parent.appendChild(container);

    // host the properties panel as the first tab, if available
    const propertiesPanel = this._injector.get('propertiesPanel', false);

    if (propertiesPanel) {
      const pane = this.addTab({ id: 'properties', label: 'Properties', priority: 1000 });
      propertiesPanel.attachTo(pane);
    }
  }

  _destroy() {
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }

  /**
   * Add a tab. Returns the tab's content element for the caller to render into.
   *
   * @param {Object} options
   * @param {string} options.id
   * @param {string} options.label
   * @param {number} [options.priority=0]  higher priority tabs are placed first
   * @return {HTMLElement} the tab's content pane
   */
  addTab({ id, label, priority = 0 }) {
    if (this.getTab(id)) {
      throw new Error('tab <' + id + '> already exists');
    }

    const button = el('button', 'bjs-side-panel-tab');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('data-tab', id);
    button.addEventListener('click', () => this.activate(id));

    const pane = el('div', 'bjs-side-panel-pane');
    pane.setAttribute('data-tab', id);

    this._tabs.push({ id, label, priority, button, pane });
    this._tabs.sort((a, b) => b.priority - a.priority);

    this._renderTabs();

    if (this._activeId === null) {
      this.activate(id);
    }

    return pane;
  }

  removeTab(id) {
    const index = this._tabs.findIndex(t => t.id === id);

    if (index === -1) {
      return;
    }

    const [ tab ] = this._tabs.splice(index, 1);
    remove(tab.button);
    remove(tab.pane);

    if (this._activeId === id) {
      this._activeId = null;
      if (this._tabs.length) {
        this.activate(this._tabs[0].id);
      }
    }

    this._renderTabs();
  }

  activate(id) {
    this._activeId = id;
    this._tabs.forEach(tab => {
      const active = tab.id === id;
      tab.button.classList.toggle('active', active);
      tab.pane.classList.toggle('active', active);
    });
  }

  getTab(id) {
    const tab = this._tabs.find(t => t.id === id);
    return tab ? { id: tab.id, label: tab.label, pane: tab.pane } : undefined;
  }

  _renderTabs() {
    // (re)insert buttons and panes in priority order
    this._tabs.forEach(tab => {
      this._tabBar.appendChild(tab.button);
      this._panes.appendChild(tab.pane);
    });

    // hide the tab bar when there is nothing to switch between
    this._tabBar.style.display = this._tabs.length > 1 ? '' : 'none';
  }

  _setupResize(handle) {
    const minWidth = this._config.minWidth || 180;
    let startX, startWidth;

    const onMove = (event) => {
      // dragging the left edge to the left widens the panel
      const width = Math.max(minWidth, startWidth + (startX - event.clientX));
      this._parent.style.width = width + 'px';
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('bjs-side-panel-resizing');
      if (this._canvas && this._canvas.resized) {
        this._canvas.resized();
      }
    };

    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      startX = event.clientX;
      startWidth = this._parent.getBoundingClientRect().width;
      document.body.classList.add('bjs-side-panel-resizing');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }
}

SidePanel.$inject = [ 'config.sidePanel', 'injector', 'eventBus', 'canvas' ];

// helpers //////////

function el(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function remove(node) {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

function resolveElement(parent) {
  if (!parent) {
    return null;
  }
  return typeof parent === 'string' ? document.querySelector(parent) : parent;
}
