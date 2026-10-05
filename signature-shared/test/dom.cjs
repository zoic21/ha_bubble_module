// Native-shaped test fixture. This is not a Home Assistant runtime.
class Element {
  constructor() {
    this.children = []; this.attrs = new Map(); this.dataset = {}; this.listeners = new Map(); this.events = [];
    const classes = new Set();
    this.classList = {contains: value => classes.has(value),add: (...values) => values.forEach(value => classes.add(value)),remove: value => classes.delete(value)};
  }
  get attributes() { return [...this.attrs].map(([name,value]) => ({name,value})); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  setAttribute(name,value) { this.attrs.set(name,String(value)); }
  removeAttribute(name) { this.attrs.delete(name); }
  contains(element) { return this === element || this.children.some(child => child.contains?.(element)); }
  append(...children) { children.forEach(child => {child.parentElement=this;this.children.push(child);}); }
  appendChild(child) { this.append(child);return child; }
  replaceChildren(...children) { this.children=[];this._text='';this.append(...children); }
  get textContent() { return (this._text || '')+this.children.map(child => child.textContent).join(''); }
  set textContent(text) { this.children=[];this._text=String(text); }
  querySelector(selector) {
    if (!selector.startsWith('.')) return null;
    const cls = selector.slice(1);
    for (const child of this.children) {
      if ((child.className || '').split(' ').includes(cls)) return child;
      const found = child.querySelector?.(selector); if (found) return found;
    }
    return null;
  }
  querySelectorAll() { return []; }
  addEventListener(event,fn) { const list=this.listeners.get(event)||[];list.push(fn);this.listeners.set(event,list); }
  async click() { for (const fn of this.listeners.get('click') || []) await fn({stopPropagation(){}}); }
  dispatchEvent(event) { this.events.push(event);return true; }
  remove() { if (this.parentElement) this.parentElement.children=this.parentElement.children.filter(child => child!==this); }
}

module.exports = {
  Element,
  document: {createElement: () => new Element(), createTextNode: text => ({textContent:text}), createDocumentFragment: () => new Element()},
  MutationObserver: class {observe(){} disconnect(){this.disconnected=true;}},
  CSS: {supports: () => true},
  CustomEvent: class {constructor(type,options){this.type=type;Object.assign(this,options);}},
  navigator: {language:'en-US'}
};
