/**
 * What a column takes when its tab says nothing about it.
 *
 * It is the same measure as `--bjs-entry-min-width` in the stylesheet, which is the width an entry keeps
 * whatever holds it, so that a column at its default width is exactly wide enough for what it holds. The
 * two are stated twice because neither language can read the other's, and a host changing one should
 * change the other.
 */
const DEFAULT_COLUMN_WIDTH = 260;

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
    this._viewMode = this._config.viewMode === 'columns' ? 'columns' : 'tabbed';

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
    container.classList.toggle('bjs-columns', this._viewMode === 'columns');

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

    // A width that is animated arrives at its end after the diagram has been told, so the diagram is told
    // again when it gets there. A drag is not animated and reports itself when it ends.
    parent.addEventListener('transitionend', (event) => {
      if (event.propertyName === 'width') {
        this._resized();
      }
    });

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
   * A tab also states what it is as a column, which the tabbed view ignores and the column view obeys: the
   * width it takes and whether it stands open. Both are optional, a tab stating neither taking the default
   * width and standing open, and both survive a switch to the tabbed view and back, so that a reader who
   * arranged the columns finds the arrangement again.
   *
   * Whether the tab is in the panel at all is `visible`, which both views obey and which a host changes
   * later through `setTabVisible`. A module that registers a tab states what that tab wants; the
   * application, which is the only party that knows the whole arrangement, says what it gets.
   *
   * @param {Object} options
   * @param {string} options.id
   * @param {string} options.label
   * @param {number} [options.priority=0]  higher priority tabs are placed first
   * @param {number} [options.width=260]  the width in px it takes as a column
   * @param {boolean} [options.open=true]  whether it stands open as a column
   * @param {boolean} [options.visible=true]  whether it is in the panel
   * @return {{ header: HTMLElement, body: HTMLElement, footer: HTMLElement }} the tab's three slots: a
   *         heading and a footer that stay put, and a body that scrolls between them
   */
  addTab({ id, label, priority = 0, width = DEFAULT_COLUMN_WIDTH, open = true, visible = true }) {
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
    pane.classList.toggle('bjs-closed', open === false);

    // The column's own divider, standing at its left edge and drawn only in the column view. It is what
    // sets the column's width and what opens and closes it, and in the tabbed view it has nothing to
    // divide, so the stylesheet does not draw it there.
    const columnDivider = el('div', 'bjs-tab-divider');
    columnDivider.setAttribute('data-tab', id);

    // The name the column is known by, read upward along its resizer. It is what a closed column is reduced
    // to, so it is drawn whether the column is open or not, and it is the reason a resizer is furniture
    // rather than a handle.
    const columnName = el('div', 'bjs-tab-divider-name');
    columnName.textContent = label;
    columnDivider.appendChild(columnName);
    const header = el('div', 'bjs-tab-header');  // fixed at the head of the tab; holds entries + separators
    const body = el('div', 'bjs-tab-body');     // scrolls; holds entries + separators
    const footer = el('div', 'bjs-tab-footer');  // fixed at the foot of the tab; holds entries + separators
    const note = el('div', 'bjs-tab-note');      // shown in place of all three while a note is set
    note.style.display = 'none';
    pane.appendChild(header);
    pane.appendChild(body);
    pane.appendChild(footer);
    pane.appendChild(note);

    const tab = {
      id, label, priority, width, open, visible,
      button, pane, header, body, footer, note, divider: columnDivider, name: columnName
    };

    this._tabs.push(tab);
    this._tabs.sort((a, b) => b.priority - a.priority);

    this._applyVisibility(tab);
    this._setupColumnResize(tab);
    this._renderTabs();

    if (this._activeId === null && visible) {
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
    remove(tab.divider);

    if (this._activeId === id) {
      const shown = this._tabs.find(t => t.visible);
      this.activate(shown ? shown.id : null);
    }

    this._renderTabs();
  }

  /**
   * Show a tab, which in the tabbed view is the whole of what a selector does. A hidden tab is not in the
   * panel, so it cannot be the one shown, and a host that wants it shown makes it visible first.
   */
  activate(id) {
    const hidden = this._tabs.find(t => t.id === id && !t.visible);

    if (hidden) {
      return;
    }

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

  /**
   * Show the tabs one at a time, or all of them side by side as columns.
   *
   * The two views are one set of elements: nothing is built, moved or thrown away by a change of view, so
   * a tab keeps its content, its scroll position and whatever a host is holding of it. Which view is shown
   * is the host's business, and the panel draws no control for it: a host that offers the reader a choice
   * draws that control where its own furniture goes. Nothing is announced, since a view that changes while
   * a reader watches is a demonstration rather than a use.
   *
   * @param {'tabbed'|'columns'} mode
   */
  setViewMode(mode) {
    this._viewMode = mode === 'columns' ? 'columns' : 'tabbed';

    if (this._container) {
      this._container.classList.toggle('bjs-columns', this._viewMode === 'columns');
    }

    // In the column view the panel is as wide as what it holds, so it is given no width of its own; the
    // width it had in the tabbed view is kept and given back on the way out, so a reader who switches views
    // twice finds the panel where it was.
    if (this._parent) {
      if (this._viewMode === 'columns') {
        this._tabbedWidth = this._parent.style.width;
        this._parent.style.width = '';
      } else {
        this._parent.style.width = this._tabbedWidth || this._config.width || '300px';
      }
    }

    this._renderTabs();
    this._resized();
  }

  getViewMode() {
    return this._viewMode;
  }

  /**
   * Rename a tab, which names it in both views at once: on its selector and on its resizer.
   *
   * A name that says how much a tab holds — how many tokens are standing, how many issues were found —
   * changes while a run does, and a host that could name a tab only as it added one could not say so.
   *
   * @param {string} id
   * @param {string} label
   */
  setTabLabel(id, label) {
    const tab = this._tabs.find(t => t.id === id);

    if (!tab) {
      throw new Error('tab <' + id + '> does not exist');
    }

    tab.label = label;
    tab.button.textContent = label;
    tab.name.textContent = label;
  }

  /**
   * Put a tab in the panel, or take it out of the panel altogether.
   *
   * A hidden tab has no selector in the tabbed view, and in the column view neither a column nor a resizer,
   * so nothing of it is left to be found; the panel's width counts neither while it is away, and a panel with
   * every tab hidden is nothing at all. It keeps what it holds, the width it takes and whether it stands
   * open, so showing it again gives back the arrangement rather than a default one.
   *
   * Hiding the tab the tabbed view shows passes the selection to the first tab still shown, there being
   * something to show as long as one tab remains. Showing a tab takes the selection from nobody, since a host
   * that means it to be read activates it.
   *
   * This is the answer for a tab that has no business being offered — a properties panel while a simulation
   * runs, where the model is not being edited. It is not the answer for a tab that is empty for the moment,
   * which is `setNote`: that keeps the tab where it is and says why it holds nothing.
   *
   * @param {string} id
   * @param {boolean} visible
   */
  setTabVisible(id, visible) {
    const tab = this._tabs.find(t => t.id === id);

    if (!tab) {
      throw new Error('tab <' + id + '> does not exist');
    }

    tab.visible = visible !== false;
    this._applyVisibility(tab);

    if (!tab.visible && this._activeId === id) {
      const shown = this._tabs.find(t => t.visible);
      this.activate(shown ? shown.id : null);
    } else if (tab.visible && this._activeId === null) {
      this.activate(id);
    }

    this._renderTabs();
    this._resized();
  }

  /**
   * Open a tab's column, or close it to its resizer, as a double click on that resizer does.
   *
   * The panel widens and narrows by exactly that column, and a column closed keeps the width it had, so
   * opening it again gives that width back. The state belongs to the tab and is kept in the tabbed view,
   * where it has no effect, so a host may arrange the columns whichever view is shown. What a column is when
   * it is added is the `open` option of `addTab`.
   *
   * @param {string} id
   * @param {boolean} open
   */
  setTabOpen(id, open) {
    const tab = this._tabs.find(t => t.id === id);

    if (!tab) {
      throw new Error('tab <' + id + '> does not exist');
    }

    this._open(tab, open !== false);
    this._layoutColumns();
    this._resized();
  }

  /**
   * What the panel holds of a tab: the identity and the name it is known by, the element its content stands
   * in, and what it is as a column. The three states a host may set are the three it may read.
   *
   * @param {string} id
   * @return {{ id: string, label: string, pane: HTMLElement, width: number, open: boolean,
   *          visible: boolean }|undefined}
   */
  getTab(id) {
    const tab = this._tabs.find(t => t.id === id);

    return tab ? {
      id: tab.id, label: tab.label, pane: tab.pane,
      width: tab.width, open: tab.open, visible: tab.visible
    } : undefined;
  }

  _renderTabs() {
    if (!this._tabBar) {
      return;   // the view may be set before the panel is built; _init draws what the tabs then say
    }

    // (re)insert buttons, dividers and panes in priority order; a column's divider stands at its left edge
    this._tabs.forEach(tab => {
      this._tabBar.appendChild(tab.button);
      this._body.appendChild(tab.divider);
      this._body.appendChild(tab.pane);
    });

    // The selectors select nothing while every tab is a column, and there is nothing to switch between
    // while there is one tab shown. The display is set here rather than in the stylesheet because an inline
    // display would otherwise beat the rule that hides it.
    const shown = this._tabs.filter(tab => tab.visible);
    const useless = this._viewMode === 'columns' || shown.length <= 1;
    this._tabBar.style.display = useless ? 'none' : '';

    this._layoutColumns();
  }

  /**
   * Give each column the width its tab states, which in the tabbed view is none of the panel's business.
   *
   * There is nothing to divide up and nothing to measure: the panel's width is the sum of its resizers and
   * its open columns rather than a quantity of its own, so writing each column's width is the whole of the
   * layout. A closed column is written as nothing, which is what makes the panel narrow by exactly that
   * column when it is closed and widen by exactly that column when it is opened again.
   */
  _layoutColumns() {
    if (!this._body) {
      return;
    }

    this._tabs.forEach(tab => {
      tab.pane.style.width = this._viewMode === 'columns' ? (tab.open ? tab.width + 'px' : '0px') : '';
    });

    if (this._viewMode !== 'columns') {
      return;
    }

    // A hidden tab is not in the panel, so it is in none of this arithmetic: neither its column nor its
    // resizer is drawn, and neither is counted.
    const shown = this._tabs.filter(tab => tab.visible);

    // The panel is exactly its resizers and its open columns, and it is told so rather than left to work
    // it out: what a host puts in the panel's header or its footer would otherwise hold the panel open
    // wider than its columns, and then narrowing a column would move the columns after it. Those slots are
    // clipped to the width the columns decide, which is the whole of the arrangement's arithmetic.
    const resizers = shown.reduce((sum, tab) => sum + (tab.divider.offsetWidth || 0), 0);

    if (!resizers && shown.length) {
      return;   // nothing is laid out, so nothing can be measured, as under a test
    }

    const columns = shown.reduce((sum, tab) => sum + (tab.open ? tab.width : 0), 0);

    this._parent.style.width = (resizers + columns) + 'px';
  }

  /**
   * A column's resizer, which is its left edge: dragging it sets that column's width, and a double click
   * closes the column and opens it again at the width it had.
   *
   * Everything to the right of a resizer is anchored and never moves — the column's own right edge, the
   * columns after it, and the panel's right edge at the window — so the resizer goes exactly where the
   * pointer takes it. Everything to its left keeps every width and simply translates: dragging left by
   * forty widens the column by forty and moves the panel's left edge forty further left, taking that room
   * from the diagram, and dragging right gives it back. No other column changes width, and the panel is
   * never asked how wide it is, since it is as wide as what it holds.
   *
   * The first column's resizer is therefore the panel's left edge, and the panel's own divider is not drawn
   * in this view. There is one rule and one kind of grip, and a reader who has arranged the columns can
   * always undo it, since a resizer follows the pointer and the pointer cannot leave the window.
   */
  _setupColumnResize(tab) {
    let startX, startWidth;

    const onMove = (event) => {
      // dragging the left edge to the left widens the column, as it widens the panel
      tab.width = Math.max(0, startWidth + (startX - event.clientX));

      // a closed column is pulled open by its own resizer, so that the resizer of a closed column is not
      // a grip that answers nothing
      if (!tab.open && tab.width > 0) {
        this._open(tab, true);
      }

      this._layoutColumns();
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('bjs-side-panel-resizing');

      // A column dragged to nothing is closed, and takes back the width it had when the drag began, so that
      // the double click that opens it again gives back what was there rather than the nothing it was
      // dragged to. Dragging one away and closing one are therefore the same act and leave the same state.
      if (tab.open && tab.width === 0) {
        tab.width = startWidth || DEFAULT_COLUMN_WIDTH;
        this._open(tab, false);
        this._layoutColumns();
      }

      this._resized();   // the diagram has been given room, or taken some back
    };

    tab.divider.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      startX = event.clientX;
      startWidth = tab.open ? tab.width : 0;   // a closed column is dragged open from nothing
      document.body.classList.add('bjs-side-panel-resizing');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    // Put this column away, and bring it back at the width it had. Its resizer stays where it is, which is
    // what says the column is there and what opens it again; there is no other way to put a column away and
    // none is wanted, since a panel with every column closed is its resizers and nothing else.
    tab.divider.addEventListener('dblclick', () => {
      this._open(tab, !tab.open);
      this._layoutColumns();
      this._resized();
    });
  }

  /** Open or close a column, which is the state its width is read through. */
  _open(tab, open) {
    tab.open = open;
    tab.pane.classList.toggle('bjs-closed', !open);
  }

  /**
   * Draw a tab away, or back: its selector, its column and that column's resizer, which is everything of it
   * either view puts on the screen.
   *
   * The three are hidden where they stand rather than taken out of the panel, so that nothing is built or
   * thrown away and the tab keeps its content and its scroll position, exactly as a change of view does. The
   * display is set on the elements rather than in the stylesheet for the reason the tab bar's is: what a
   * view draws a tab with is a rule, and an inline display is what beats a rule.
   */
  _applyVisibility(tab) {
    const display = tab.visible ? '' : 'none';

    tab.button.style.display = display;
    tab.divider.style.display = display;
    tab.pane.style.display = display;
  }

  _resized() {
    if (this._canvas && this._canvas.resized) {
      this._canvas.resized();
    }
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
