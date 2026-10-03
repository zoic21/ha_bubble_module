const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const YAML = require('yaml');

const file = process.argv[2] || path.resolve(__dirname, '../dist/signature.yaml');
const definition = YAML.parse(fs.readFileSync(file, 'utf8')).signature;
const code = definition.code;
assert.ok(code, 'Module code missing');
const render = new Function('hass', 'onTeardown', 'renderTemplate', 'return `'+code+'`;');

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
const run = (ctx,hass,template) => render.call(ctx,hass,fn => ctx.teardown=fn,template);
function fixture(t,extra={},options={controls:'number'},config={}) {
  const root=new Element(),host=new Element(),stateEl=new Element();
  host.className='bubble-wrapper';root.append(host);
  const ctx={card:root,elements:{state:stateEl},config:{card_type:'button',button_type:'state',entity:id,signature:options,...config}};
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

test('unsupported cards and misplaced title layouts do not access HA',() => {
  const forbidden=new Proxy({}, {get() {throw new Error('Unexpected hass access');}});
  for (const config of [
    {card_type:'pop-up'}, {card_type:'button',button_type:'slider'},
    {card_type:'button',signature:{layout:'title'}}, {card_type:'button',signature:{layout:'heading'}},
    {card_type:'separator'},
  ]) {
    const ctx={card:new Element(),config};
    assert.equal(run(ctx,forbidden).trim(),'');
    assert.equal(typeof ctx.teardown,'function');
  }
});

test('section titles hide the separator line without creating tile controls',() => {
  const ctx={card:new Element(),config:{card_type:'separator',signature:{layout:'title'}}};
  const css=run(ctx,{});
  assert.match(css,/\.bubble-line\s*\{\s*display: none !important;/);
  assert.equal(ctx._dpNumber,undefined);
  assert.equal(ctx.card.children.length,0);
});

test('square, room and header layouts apply only to compatible card types',t => {
  for (const layout of ['compact','square','room','header']) {
    const {ctx}=fixture(t,{}, {layout},{button_type:layout === 'header' ? 'name' : 'state'});
    assert.equal(ctx.card.getAttribute('data-dp-layout'),layout);
  }
  for (const card_type of ['cover','climate']) {
    const {ctx}=fixture(t,{}, {layout:'square',controls:'number'},{card_type});
    assert.equal(ctx.card.getAttribute('data-dp-layout'),'compact');
    assert.equal(ctx._dpNumber,undefined,'Native controls must remain intact');
  }
  for (const [button_type,layout] of [['switch','square'],['state','header']]) {
    const {ctx}=fixture(t,{}, {layout},{button_type});
    assert.equal(ctx.card.getAttribute('data-dp-layout'),'compact');
  }
});

test('a Jinja False result does not enable the background tint',t => {
  const {ctx,hass}=fixture(t,{}, {color_background:'{{ value }}'});
  run(ctx,hass,()=> 'False');
  assert.equal(ctx.card.getAttribute('data-dp-color-background'),'no');
  run(ctx,hass,()=> 'True');
  assert.equal(ctx.card.getAttribute('data-dp-color-background'),'yes');
});

test('numeric commands clamp to bounds and do not write an unchanged value',async t => {
  for (const [value,min,max,direction,expected] of [
    ['2.5',0,2.7,'plus',2.7], ['0.3',0.2,10,'minus',0.2],
    ['10',0,10,'plus',undefined], ['0',0,10,'minus',undefined],
  ]) {
    const calls=[];
    const {ctx}=fixture(t,{states:{[id]:{state:value,attributes:{...state.attributes,min,max}}},callService:async(...args)=>calls.push(args)});
    await ctx._dpNumber[direction].click();
    assert.deepEqual(calls,expected === undefined ? [] : [['input_number','set_value',{entity_id:id,value:expected}]]);
  }
});

test('invalid numeric states and attributes disable commands without service calls',async t => {
  for (const entity of [
    {state:'unavailable',attributes:state.attributes}, {state:'',attributes:state.attributes},
    {state:'2',attributes:{...state.attributes,step:0}}, {state:'2',attributes:{...state.attributes,step:-1}},
    {state:'2',attributes:{...state.attributes,min:10,max:0}}, {state:'2',attributes:{}},
  ]) {
    let calls=0;
    const {ctx}=fixture(t,{states:{[id]:entity},callService:async()=>calls++});
    assert.equal(ctx._dpNumber.minus.disabled,true);
    assert.equal(ctx._dpNumber.plus.disabled,true);
    await ctx._dpNumber.plus.click();
    assert.equal(calls,0);
  }
});

test('repeated presses wait for HA to acknowledge the new value',async t => {
  const calls=[];
  const {ctx,hass}=fixture(t,{callService:async(...args)=>calls.push(args)});
  await ctx._dpNumber.plus.click();
  await ctx._dpNumber.plus.click();
  assert.equal(calls.length,1);
  assert.equal(ctx._dpNumber.plus.disabled,true);
  const updated={...hass,states:{[id]:{...state,state:'3'}}};
  run(ctx,updated);
  assert.equal(ctx._dpNumber.plus.disabled,false);
  await ctx._dpNumber.plus.click();
  assert.equal(calls.length,2);
  assert.equal(calls[1][2].value,3.5);
});

test('a pending command becomes available again after the acknowledgement timeout',async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const {ctx}=fixture(t);
  await ctx._dpNumber.plus.click();
  t.mock.timers.tick(4999);
  assert.equal(ctx._dpNumber.plus.disabled,true);
  t.mock.timers.tick(1);
  assert.equal(ctx._dpNumber.plus.disabled,false);
  assert.equal(ctx._dpNumber.pending,null);
});

test('switching to a section title removes pending controls and restores delegated actions',async t => {
  const clear=t.mock.method(globalThis,'clearTimeout');
  const {ctx,hass}=fixture(t);
  const old=ctx._dpNumber;
  await old.plus.click();
  assert.equal(ctx.elements.state.classList.contains('bubble-action'),true);
  ctx.config={card_type:'separator',signature:{layout:'title'}};
  run(ctx,hass);
  assert.equal(old.disposed,true);
  assert.ok(clear.mock.calls.some(call=>call.arguments[0] === old.timer),'The pending timer is cancelled');
  assert.equal(old.host.children.includes(old.group),false);
  assert.equal(ctx._dpNumber,undefined);
  assert.equal(ctx.elements.state.classList.contains('bubble-action'),false);
  assert.equal(ctx.elements.state.dataset.entity,undefined);
});

test('a service failure received after teardown does not dispatch a notification',async t => {
  let reject;
  const {ctx}=fixture(t,{callService:()=>new Promise((_,fail)=>{reject=fail;})});
  const controls=ctx._dpNumber;
  const click=controls.plus.click();
  ctx.teardown();
  reject(new Error('late rejection'));
  await click;
  assert.equal(controls.group.events.length,0);
  assert.equal(controls.disposed,true);
});

test('distribution metadata and documented versions agree',() => {
  assert.equal(definition.name,'Signature');
  assert.match(definition.version,/^\d+\.\d+\.\d+$/);
  assert.ok(definition.description);
  assert.ok(definition.supported.every(type=>typeof type === 'string'));
  for (const file of ['../doc/README.md','../../README.md']) {
    assert.ok(fs.readFileSync(path.resolve(__dirname,file),'utf8').includes(definition.version),file);
  }
});

test('all documented configuration examples are valid YAML',() => {
  const doc=fs.readFileSync(path.resolve(__dirname,'../doc/README.md'),'utf8');
  const blocks=[...doc.matchAll(/```yaml\s*\n([\s\S]*?)```/g)];
  assert.ok(blocks.length>0);
  for (const [,example] of blocks) assert.doesNotThrow(()=>YAML.parse(example));
});

test('documentation links resolve to local files',() => {
  for (const file of ['../doc/README.md','../../README.md']) {
    const location=path.resolve(__dirname,file);
    const doc=fs.readFileSync(location,'utf8');
    for (const [,target] of doc.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^[a-z]+:|^#/i.test(target)) continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(location),target.split('#')[0])),target);
    }
  }
});
