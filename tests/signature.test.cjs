const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');

const file = process.argv[2] || path.resolve(__dirname, '../signature/dist/signature.yaml');
const code = fs.readFileSync(file, 'utf8').split('  code: |2-\n')[1];
assert.ok(code, 'Module code missing');
const render = new Function('hass', 'onTeardown', 'return `'+code+'`;');

// Minimal DOM fixtures exercise behavior; real rendering still needs Home Assistant.
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
globalThis.document = {createElement: () => new Element(),createTextNode: text => ({textContent:text})};
globalThis.CSS = {supports: () => true};
globalThis.CustomEvent = class {constructor(type,options) {this.type=type;Object.assign(this,options);}};
Object.defineProperty(globalThis,'navigator',{value:{language:'en-US'},configurable:true});

const id = 'input_number.target';
const state = {state:'2.5',attributes:{min:0,max:10,step:0.5,unit_of_measurement:'kW'}};
const run = (ctx,hass) => render.call(ctx,hass,fn => ctx.teardown=fn);
function fixture(t,extra={},options={controls:'number'}) {
  const root=new Element(),host=new Element(),stateEl=new Element();
  host.className='bubble-wrapper';root.append(host);
  const ctx={card:root,elements:{state:stateEl},config:{card_type:'button',button_type:'state',entity:id,signature:options}};
  const hass={states:{[id]:state},callService:async()=>{},...extra};
  run(ctx,hass);t.after(() => ctx.teardown());
  return {ctx,hass};
}

test('native translations label all controls and preserve numeric service calls',async t => {
  const labels={'ui.card.counter.actions.decrement':'Verringern','ui.dialogs.more_info_control.details':'Details anzeigen','ui.card.counter.actions.increment':'Erhöhen'};
  let service;
  const {ctx}=fixture(t,{locale:{language:'de-DE'},localize:key=>labels[key],callService:async(...args)=>{service=args;}});
  assert.equal(ctx._dpNumber.minus.getAttribute('aria-label'),'Verringern');
  assert.equal(ctx._dpNumber.display.getAttribute('aria-label'),'Details anzeigen');
  assert.equal(ctx._dpNumber.plus.getAttribute('aria-label'),'Erhöhen');
  assert.equal(ctx._dpNumber.display.textContent,'2,5 kW');
  await ctx._dpNumber.plus.click();
  assert.deepEqual(service,['input_number','set_value',{entity_id:id,value:3}]);
});

test('missing translations fall back to French or English with the selected number locale',t => {
  for (const [language,minus,plus,details,value] of [
    ['fr-FR','Diminuer','Augmenter','Ouvrir les détails','2,5 kW'],
    ['en-US','Decrease','Increase','Show details','2.5 kW'],
    ['de-DE','Decrease','Increase','Show details','2,5 kW'],
  ]) {
    const {ctx}=fixture(t,{locale:{language},localize:()=>undefined});
    assert.equal(ctx._dpNumber.minus.getAttribute('aria-label'),minus);
    assert.equal(ctx._dpNumber.plus.getAttribute('aria-label'),plus);
    assert.equal(ctx._dpNumber.display.getAttribute('aria-label'),details);
    assert.equal(ctx._dpNumber.display.textContent,value);
  }
});

test('locale changes update existing controls without recreating them',t => {
  const {ctx,hass}=fixture(t,{locale:{language:'fr-FR'}});
  const controls=ctx._dpNumber;
  run(ctx,{...hass,locale:{language:'en-US'}});
  assert.equal(ctx._dpNumber,controls);
  assert.equal(controls.minus.getAttribute('aria-label'),'Decrease');
  assert.equal(controls.display.textContent,'2.5 kW');
});

test('translations loaded later update labels even when the locale stays the same',t => {
  const {ctx,hass}=fixture(t,{locale:{language:'de-DE'}});
  run(ctx,{...hass,localize:key=>key === 'ui.card.counter.actions.increment' ? 'Erhöhen' : undefined});
  assert.equal(ctx._dpNumber.plus.getAttribute('aria-label'),'Erhöhen');
  assert.equal(ctx._dpNumber.minus.getAttribute('aria-label'),'Decrease');
});

test('number formatting falls back to hass.language then the browser language',t => {
  const first=fixture(t,{language:'fr-FR'});
  assert.equal(first.ctx._dpNumber.display.textContent,'2,5 kW');
  const second=fixture(t);
  assert.equal(second.ctx._dpNumber.display.textContent,'2.5 kW');
  assert.equal(second.ctx._dpNumber.minus.getAttribute('aria-label'),'Decrease');
});

test('ordinary numeric states use the same locale fallback without number controls',t => {
  const {ctx}=fixture(t,{language:'en-US'},{});
  assert.equal(ctx.elements.state.textContent,'2.5kW');
  assert.equal(ctx._dpNumber,undefined);
});

test('service errors use native translations and retain the original error detail',async t => {
  const calls=[];
  const {ctx}=fixture(t,{locale:{language:'de-DE'},localize:(key,args)=>{
    calls.push([key,args]);return key === 'ui.notification_toast.action_failed' ? 'Aktion fehlgeschlagen.' : undefined;
  },callService:async()=>{throw new Error('service unavailable');}});
  await ctx._dpNumber.plus.click();
  const notice=ctx._dpNumber.group.events.find(event=>event.type==='hass-notification');
  assert.equal(notice.detail.message,'Aktion fehlgeschlagen. service unavailable');
  assert.deepEqual(calls.at(-1),['ui.notification_toast.action_failed',{service:'input_number.set_value'}]);
  assert.equal(ctx._dpNumber.pending,null);
  assert.equal(ctx._dpNumber.timer,null);
});

test('service errors have a French or English fallback without native translations',async t => {
  for (const [language,prefix] of [['fr-FR','Impossible de modifier la valeur.'],['en-US','Failed to set the value.']]) {
    const {ctx}=fixture(t,{locale:{language},callService:async()=>{throw new Error('denied');}});
    await ctx._dpNumber.plus.click();
    assert.equal(ctx._dpNumber.group.events.at(-1).detail.message,prefix+' denied');
  }
});
