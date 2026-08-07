/**
 * A resizable, tabbed side panel.
 *
 * Required structure. The wrapper holds the canvas and the panel slot.
 *
 *     <div class="bpmn-ui">
 *       <div class="canvas" id="canvas"></div>
 *       <div class="side-panel" id="side-panel"></div>
 *     </div>
 *
 * On init the module mounts into the `parent` slot and adds `.bjs-layout` to the wrapper and
 * `.bjs-side-panel-parent` to the slot. side-panel.css uses those to make the wrapper a flex row, grow
 * the canvas, and fix the panel width. The panel width (initial and drag-resize) is set here.
 *
 * The panel is a grid of four children, and every name states the level it belongs to so that no word
 * means two things:
 *
 *     bjs-panel                 the panel itself
 *       bjs-panel-divider       its left edge, which resizes it; the first of the panel's dividers
 *       bjs-panel-header        a slot spanning the panel, above everything
 *       bjs-panel-body          the tab selectors and the tabs; the part that grows
 *         bjs-panel-tabs        the selectors, which scroll horizontally when they crowd
 *           bjs-tab-selector
 *         bjs-tab               one per tab, of which one is active
 *           bjs-tab-header      fixed at the head of the tab
 *           bjs-tab-body        scrolls
 *           bjs-tab-footer      fixed at the foot of the tab
 *           bjs-tab-note        stands in for all three while a note is set
 *       bjs-panel-footer        a slot spanning the panel, below everything
 *
 * The divider occupies the first grid column and spans every row, so it is the panel's full height, while
 * the other three stack in the second column. A grid rather than nested elements is what lets the panel's
 * own parts be siblings: an intermediate wrapper would have to be called a body, which is how the previous
 * naming came to use one word for the panel's body and for a tab's.
 *
 * - A `propertiesPanel` service, if present, is added as the first tab.
 * - Further tabs are added via `addTab()`.
 * - The divider resizes the panel by dragging. `canvas.resized()` fires afterward.
 *
 * Config (`sidePanel`):
 *   - parent:   selector or element for the panel slot (a flex sibling of the canvas in the wrapper).
 *   - header:   optional content (HTML string or element) shown in the panel's header.
 *   - width:    initial panel width (CSS value, default '300px').
 *   - minWidth: minimum content width in px during resize, beside the divider (default none, so the
 *               panel collapses to its divider; a double click on the divider collapses and restores it).
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

    // Stamp the layout classes so side-panel.css can arrange the two panes: the wrapper (the slot's
    // parent) becomes the flex row, the slot is fixed-width, and the canvas sibling grows.
    const layout = this._layout = parent.parentNode;
    if (layout) {
      layout.classList.add('bjs-layout');
    }
    parent.classList.add('bjs-side-panel-parent');
    parent.style.width = this._config.width || '300px';

    const container = this._container = el('div', 'bjs-panel');

    // the panel's left edge, which resizes it: the first of its dividers
    const divider = el('div', 'bjs-panel-divider');
    container.appendChild(divider);
    this._setupResize(divider);

    // The header and the footer are slots spanning the panel, and both are built whether or not anything
    // is put in them: an empty slot is a row of no height, and a slot that exists only sometimes is one a
    // host cannot fill later.
    this._header = el('div', 'bjs-panel-header');
    container.appendChild(this._header);

    if (this._config.header) {
      if (typeof this._config.header === 'string') {
        this._header.innerHTML = this._config.header;
      } else {
        this._header.appendChild(this._config.header);
      }
    }

    this._body = el('div', 'bjs-panel-body');
    container.appendChild(this._body);

    this._tabBar = el('div', 'bjs-panel-tabs');
    this._body.appendChild(this._tabBar);

    this._footer = el('div', 'bjs-panel-footer');
    container.appendChild(this._footer);

    parent.appendChild(container);

    // host the properties panel as the first tab, if available
    const propertiesPanel = this._injector.get('propertiesPanel', false);

    if (propertiesPanel) {
      const { body } = this.addTab({ id: 'properties', label: 'Properties', priority: 1000 });
      propertiesPanel.attachTo(body);
    }
  }

  _destroy() {
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    if (this._parent) {
      this._parent.classList.remove('bjs-side-panel-parent');
    }
    if (this._layout) {
      this._layout.classList.remove('bjs-layout');
    }
  }

  /**
   * Add a tab. The side panel owns the tab structure: a fixed `header`, a scrolling `body` and a fixed
   * `footer`. All three hold a sequence of entries (createSimpleEntry / createCollapsibleEntry) and
   * separators (createSeparator); a heading put in the header stays while the body scrolls under it.
   *
   * @param {Object} options
   * @param {string} options.id
   * @param {string} options.label
   * @param {number} [options.priority=0]  higher priority tabs are placed first
   * @return {{ header: HTMLElement, body: HTMLElement, footer: HTMLElement }} the tab's three slots: a
   *         heading and a footer that stay put, and a body that scrolls between them
   */
  addTab({ id, label, priority = 0 }) {
    if (this.getTab(id)) {
      throw new Error('tab <' + id + '> already exists');
    }

    const button = el('button', 'bjs-tab-selector');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('data-tab', id);
    button.addEventListener('click', () => this.activate(id));

    const pane = el('div', 'bjs-tab');
    pane.setAttribute('data-tab', id);
    const header = el('div', 'bjs-tab-header');  // fixed at the head of the tab; holds entries + separators
    const body = el('div', 'bjs-tab-body');     // scrolls; holds entries + separators
    const footer = el('div', 'bjs-tab-footer');  // fixed at the foot of the tab; holds entries + separators
    const note = el('div', 'bjs-tab-note');      // shown in place of all three while a note is set
    note.style.display = 'none';
    pane.appendChild(header);
    pane.appendChild(body);
    pane.appendChild(footer);
    pane.appendChild(note);

    this._tabs.push({ id, label, priority, button, pane, header, body, footer, note });
    this._tabs.sort((a, b) => b.priority - a.priority);

    this._renderTabs();

    if (this._activeId === null) {
      this.activate(id);
    }

    return { header, body, footer };
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

  /**
   * Show a note in place of a tab's content, or take it away again with `null`.
   *
   * The tab keeps its title and stays where it is; what it holds is hidden and the note stands in its
   * place. It is for a tab whose content does not apply for the moment and whose absence would otherwise be
   * unexplained — a properties panel while a simulation runs, where editing is off, saying what the reader
   * may do instead.
   *
   * @param {string} id
   * @param {string|Node|null} note  an HTML string, an element, or null to restore the content
   */
  setNote(id, note) {
    const tab = this._tabs.find(t => t.id === id);

    if (!tab) {
      throw new Error('tab <' + id + '> does not exist');
    }

    if (note == null) {
      tab.note.replaceChildren();
      tab.note.style.display = 'none';
      tab.header.style.display = '';
      tab.body.style.display = '';
      tab.footer.style.display = '';

      return;
    }

    if (typeof note === 'string') {
      tab.note.innerHTML = note;
    } else {
      tab.note.replaceChildren(note);
    }

    tab.note.style.display = '';
    tab.header.style.display = 'none';
    tab.body.style.display = 'none';
    tab.footer.style.display = 'none';
  }

  /**
   * The panel's own slots, spanning it whichever tab is shown.
   *
   * They are elements the host fills rather than content given at construction, exactly as a tab's are:
   * what governs a run belongs in the panel's footer, and such a thing changes while the run does, so a
   * slot that could be filled only once could never hold it. The `header` config remains as a convenience
   * for a host with nothing to change.
   *
   * @return {{ header: HTMLElement, footer: HTMLElement }}
   */
  getSlots() {
    return { header: this._header, footer: this._footer };
  }

  getTab(id) {
    const tab = this._tabs.find(t => t.id === id);
    return tab ? { id: tab.id, label: tab.label, pane: tab.pane } : undefined;
  }

  _renderTabs() {
    // (re)insert buttons and panes in priority order
    this._tabs.forEach(tab => {
      this._tabBar.appendChild(tab.button);
      this._body.appendChild(tab.pane);
    });

    // hide the tab bar when there is nothing to switch between
    this._tabBar.style.display = this._tabs.length > 1 ? '' : 'none';
  }

  _setupResize(divider) {
    // No floor unless a host asks for one. The panel collapses to its divider, which is the same rule a
    // column will obey when it collapses to its own: there is one way to put something away and one thing
    // left behind to bring it back, rather than a rule and an exception. A host that needs a floor states
    // it; the package does not choose a number on its behalf.
    const minWidth = this._config.minWidth || 0;
    const dividerWidth = () => divider.getBoundingClientRect().width;
    let startX, startWidth;

    const onMove = (event) => {
      // dragging the left edge to the left widens the panel
      const width = Math.max(minWidth + dividerWidth(), startWidth + (startX - event.clientX));
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

    // Collapsed and back again, since dragging an eleven-pixel strip is possible but unkind and the reader
    // should not have to remember a width. The width it had is what it returns to.
    divider.addEventListener('dblclick', () => {
      const width = this._parent.getBoundingClientRect().width;
      const collapsed = width <= dividerWidth() + 1;

      this._parent.style.width = collapsed
        ? (this._restoreWidth || this._config.width || '300px')
        : dividerWidth() + 'px';

      if (!collapsed) {
        this._restoreWidth = width + 'px';
      }

      if (this._canvas && this._canvas.resized) {
        this._canvas.resized();
      }
    });

    divider.addEventListener('pointerdown', (event) => {
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
