const config = this.config || {};
const options = config.signature_group || {};
const version = '@@MODULE_VERSION@@';
const producer = config.card_type === 'pop-up';
const chips = !producer && options.presentation === 'chips';
const editing = !!(this.editor || this.detectedEditor || this.inEditorPreview || this._preview || this.preview);
const supported = producer || (config.card_type === 'button' && config.button_type === 'name');
const tap = config.button_action?.tap_action || config.tap_action;
const target = producer ? config.hash : options.popup || (tap?.action === 'navigate' ? tap.navigation_path : '');
const hash = typeof target === 'string' && /^#?[^/#\s]+$/.test(target.trim()) ? '#' + target.trim().replace(/^#/, '') : '';
const key = location.pathname + '|' + hash;
const root = this.card;
let runtime = this._signatureGroup;
if (runtime && (runtime.version !== version || runtime.key !== key || runtime.root !== root || runtime.producer !== producer || runtime.chipsMode !== chips || !supported || !hash)) {
  runtime.dispose();
  runtime = null;
}
if (typeof onTeardown === 'function') onTeardown(() => this._signatureGroup?.dispose());
if (!supported || !hash) return '';
const symbol = Symbol.for('ha.signature.group.registry');
const registry = window[symbol] || (window[symbol] = {sources: new Map(), listeners: new Map()});
const notify = () => registry.listeners.get(key)?.forEach(listener => listener());
/* @include signature-group/src/items.js */
if (!runtime) {
  runtime = this._signatureGroup = {version, key, root, producer, chipsMode: chips, owner: this, disposed: false};
  const current = runtime;
  current.setHidden = hidden => {
    if (hidden && !current.ownsHidden && !this.hidden) {
      current.previousConnected = this.connectedWhileHidden;
      current.hadConnected = Object.hasOwn(this, 'connectedWhileHidden');
      this.connectedWhileHidden = true;
      this.hidden = true;
      current.ownsHidden = true;
    } else if (!hidden && current.ownsHidden) {
      this.hidden = false;
      if (current.hadConnected) this.connectedWhileHidden = current.previousConnected;
      else delete this.connectedWhileHidden;
      current.ownsHidden = false;
    } else return;
    this.dispatchEvent?.(new CustomEvent('card-visibility-changed', {detail:{value:!this.hidden}, bubbles:true, composed:true}));
  };
  current.refresh = () => {
    if (current.pending || current.disposed) return;
    current.pending = true;
    queueMicrotask(() => {
      current.pending = false;
      if (!current.disposed && this.isConnected !== false) this.updateBubbleCard?.();
    });
  };
  current.dispose = () => {
    if (current.disposed) return;
    current.disposed = true;
    if (producer) {
      if (registry.sources.get(key) === current) { registry.sources.delete(key); notify(); }
      current.empty?.remove();
    } else {
      current.setHidden(false);
      const listeners = registry.listeners.get(key);
      listeners?.delete(current.refresh);
      if (!listeners?.size) registry.listeners.delete(key);
      current.summary?.remove();
      current.badge?.remove();
      current.resize?.disconnect();
      if (current.frame != null) cancelAnimationFrame(current.frame);
      current.strip?.remove();
      root?.removeAttribute('data-signature-group');
    }
    if (this._signatureGroup === current) delete this._signatureGroup;
  };
  if (!producer) {
    if (!registry.listeners.has(key)) registry.listeners.set(key, new Set());
    registry.listeners.get(key).add(current.refresh);
  }
}
if (producer) {
  if (!Array.isArray(config.cards)) { runtime.dispose(); return ''; }
  const changed = runtime.config !== config || runtime.cards !== config.cards || runtime.editing !== editing;
  runtime.config = config;
  runtime.editing = editing;
  if (registry.sources.get(key) !== runtime) { registry.sources.set(key, runtime); notify(); }
  else if (changed) notify();
  const host = this.elements?.popUpContainer;
  if (host && !editing) {
    if (!runtime.empty || !host.contains(runtime.empty)) {
      runtime.empty?.remove();
      runtime.empty = document.createElement('div');
      runtime.empty.className = 'sg-empty';
      runtime.empty.textContent = 'Aucune activité';
      host.appendChild(runtime.empty);
    }
    runtime.empty.hidden = activeItems(runtime).length > 0;
  } else {
    runtime.empty?.remove();
    runtime.empty = null;
  }
  return `
    .sg-empty { padding: 20px 12px; text-align: center; color: var(--secondary-text-color); font-size: var(--signature-secondary-font-size, 13px); }
    .sg-empty[hidden] { display: none !important; }
  `;
}
if (!root || !this.elements?.nameContainer) return '';
const source = registry.sources.get(key);
const ready = source && !source.disposed && source.owner.isConnected !== false
  && source.owner.config.card_type === 'pop-up'
  && source.owner.config.modules?.includes('signature_group');
const items = ready ? activeItems(source) : null;
runtime.setHidden(options.hide_empty === true && items?.length === 0 && !editing);
if (chips) {
/* @include signature-group/src/chips.js */
  return `
/* @include signature-group/src/chips.css */
  `;
}
const limit = Math.max(0, Math.min(5, Number.isFinite(Number(options.max_names)) ? Math.floor(Number(options.max_names)) : 2));
const names = items?.slice(0, limit).map(labelFor) || [];
const remaining = items ? items.length - names.length : 0;
const summary = !items ? 'Popup non initialisée' : !items.length ? 'Aucune activité'
  : names.join(', ') + (remaining ? (names.length ? ' +' : '+') + remaining : '');
const attach = (slot, className, parent) => {
  if (!runtime[slot] || !parent.contains(runtime[slot])) {
    runtime[slot]?.remove();
    runtime[slot] = document.createElement('span');
    runtime[slot].className = className;
    parent.appendChild(runtime[slot]);
  }
  return runtime[slot];
};
const summaryEl = attach('summary', 'sg-summary', this.elements.nameContainer);
const badge = attach('badge', 'sg-count', this.elements.mainContainer || root);
if (summaryEl.textContent !== summary) summaryEl.textContent = summary;
summaryEl.title = items?.map(labelFor).join(', ') || summary;
badge.textContent = items ? String(items.length) : '—';
badge.setAttribute('aria-label', items ? items.length + ' activité' + (items.length === 1 ? '' : 's') : 'Popup non initialisée');
root.setAttribute('data-signature-group', 'summary');
return `
/* @include signature-group/src/presentation.css */
`;
