const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const YAML = require('yaml');

const layouts = ['compact', 'square', 'room', 'header'];
const renders = Object.fromEntries(layouts.map(layout => {
  const definition = YAML.parse(fs.readFileSync(path.resolve(__dirname, '../../signature-' + layout + '/dist/signature-' + layout + '.yaml'), 'utf8'))['signature_' + layout];
  return [layout, new Function('hass', 'onTeardown', 'renderTemplate', 'return `'+definition.code+'`;')];
}));

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
globalThis.document = {createElement: () => new Element(),createTextNode: text => ({textContent:text}),createDocumentFragment: () => new Element()};
globalThis.MutationObserver = class { observe(){} disconnect(){this.disconnected=true;} };
globalThis.CSS = {supports: () => true};
globalThis.CustomEvent = class {constructor(type,options) {this.type=type;Object.assign(this,options);}};
Object.defineProperty(globalThis,'navigator',{value:{language:'en-US'},configurable:true});

const id = 'input_number.target';
const state = {state:'2.5',attributes:{min:0,max:10,step:0.5,unit_of_measurement:'kW'}};
// presentation is fixture input only; each actual renderer receives its own
// module options without a layout field. Simulate Bubble teardown on a module change.
function run(ctx, hass, template) {
  const config = ctx.config;
  const {layout: requested = 'compact', ...options} = config.presentation || {};
  const layout = requested === 'title' ? 'header' : requested;
  if (ctx.activeLayout && ctx.activeLayout !== layout) ctx.teardown?.();
  ctx.activeLayout = layout;
  const {presentation, ...native} = config;
  ctx.config = {...native, ['signature_' + layout]: options};
  try { return renders[layout].call(ctx,hass,fn => ctx.teardown=fn,template); }
  finally { ctx.config = config; }
}
const runtimeField = (ctx, suffix) => ctx['_signature' + ctx.activeLayout[0].toUpperCase() + ctx.activeLayout.slice(1) + suffix];
function fixture(t,extra={},options={controls:'number'},config={}) {
  const root=new Element(),host=new Element(),stateEl=new Element();
  host.className='bubble-wrapper';root.append(host);
  const ctx={card:root,elements:{state:stateEl},config:{card_type:'button',button_type:'state',entity:id,presentation:options,...config}};
  const hass={states:{[id]:state},callService:async()=>{},...extra};
  run(ctx,hass);t.after(() => ctx.teardown());
  return {ctx,hass};
}

test('native translations label all controls and preserve numeric service calls',async t => {
  const labels={'ui.card.counter.actions.decrement':'Verringern','ui.dialogs.more_info_control.details':'Details anzeigen','ui.card.counter.actions.increment':'Erhöhen'};
  let service;
  const {ctx}=fixture(t,{locale:{language:'de-DE'},localize:key=>labels[key],callService:async(...args)=>{service=args;}});
  assert.equal(ctx._signatureCompactNumber.minus.getAttribute('aria-label'),'Verringern');
  assert.equal(ctx._signatureCompactNumber.display.getAttribute('aria-label'),'Details anzeigen');
  assert.equal(ctx._signatureCompactNumber.plus.getAttribute('aria-label'),'Erhöhen');
  assert.equal(ctx._signatureCompactNumber.display.textContent,'2,5 kW');
  await ctx._signatureCompactNumber.plus.click();
  assert.deepEqual(service,['input_number','set_value',{entity_id:id,value:3}]);
});

test('missing translations fall back to French or English with the selected number locale',t => {
  for (const [language,minus,plus,details,value] of [
    ['fr-FR','Diminuer','Augmenter','Ouvrir les détails','2,5 kW'],
    ['en-US','Decrease','Increase','Show details','2.5 kW'],
    ['de-DE','Decrease','Increase','Show details','2,5 kW'],
  ]) {
    const {ctx}=fixture(t,{locale:{language},localize:()=>undefined});
    assert.equal(ctx._signatureCompactNumber.minus.getAttribute('aria-label'),minus);
    assert.equal(ctx._signatureCompactNumber.plus.getAttribute('aria-label'),plus);
    assert.equal(ctx._signatureCompactNumber.display.getAttribute('aria-label'),details);
    assert.equal(ctx._signatureCompactNumber.display.textContent,value);
  }
});

test('locale changes update existing controls without recreating them',t => {
  const {ctx,hass}=fixture(t,{locale:{language:'fr-FR'}});
  const controls=ctx._signatureCompactNumber;
  run(ctx,{...hass,locale:{language:'en-US'}});
  assert.equal(ctx._signatureCompactNumber,controls);
  assert.equal(controls.minus.getAttribute('aria-label'),'Decrease');
  assert.equal(controls.display.textContent,'2.5 kW');
});

test('translations loaded later update labels even when the locale stays the same',t => {
  const {ctx,hass}=fixture(t,{locale:{language:'de-DE'}});
  run(ctx,{...hass,localize:key=>key === 'ui.card.counter.actions.increment' ? 'Erhöhen' : undefined});
  assert.equal(ctx._signatureCompactNumber.plus.getAttribute('aria-label'),'Erhöhen');
  assert.equal(ctx._signatureCompactNumber.minus.getAttribute('aria-label'),'Decrease');
});

test('number formatting falls back to hass.language then the browser language',t => {
  const first=fixture(t,{language:'fr-FR'});
  assert.equal(first.ctx._signatureCompactNumber.display.textContent,'2,5 kW');
  const second=fixture(t);
  assert.equal(second.ctx._signatureCompactNumber.display.textContent,'2.5 kW');
  assert.equal(second.ctx._signatureCompactNumber.minus.getAttribute('aria-label'),'Decrease');
});

test('ordinary numeric states use the same locale fallback without number controls',t => {
  const {ctx}=fixture(t,{language:'en-US'},{});
  assert.equal(ctx.elements.state.textContent,'2.5kW');
  assert.equal(ctx._signatureCompactNumber,undefined);
});

test('numeric states and controls respect every Home Assistant number format',t => {
  const formats={comma_decimal:'en-US',decimal_comma:'de',space_comma:'fr',quote_decimal:'de-CH',none:'en-US',system:undefined};
  for (const [number_format,locale] of Object.entries(formats)) {
    const hass={locale:{language:'en-US',number_format},states:{[id]:{...state,state:'1234.5'}}};
    const expected=new Intl.NumberFormat(locale,{useGrouping:number_format !== 'none'}).format(1234.5);
    const ordinary=fixture(t,hass,{});
    const controls=fixture(t,hass);
    assert.equal(ordinary.ctx.elements.state.querySelector('.dp-value').textContent,expected,number_format);
    assert.equal(controls.ctx._signatureCompactNumber.display.textContent,expected+' kW',number_format);
  }
});

test('changing only number_format refreshes existing formatters and preserves translated labels',t => {
  const hass={locale:{language:'fr-FR',number_format:'language'},states:{[id]:{...state,state:'1234.5'}}};
  const ordinary=fixture(t,hass,{}),controls=fixture(t,hass);
  const group=controls.ctx._signatureCompactNumber;
  for (const item of [ordinary,controls]) run(item.ctx,{...item.hass,locale:{language:'fr-FR',number_format:'none'}});
  assert.equal(ordinary.ctx.elements.state.querySelector('.dp-value').textContent,'1234.5');
  assert.equal(group.display.textContent,'1234.5 kW');
  assert.equal(group.minus.getAttribute('aria-label'),'Diminuer');
  assert.equal(controls.ctx._signatureCompactNumber,group);
});

test('scientific notation retains decimal precision and explicit precision still wins',t => {
  for (const [raw,expected] of [['1e-6','0.000001'],['1.234e-6','0.000001234'],['5e-12','0.000000000005'],['1.2e3','1,200']]) {
    const {ctx}=fixture(t,{locale:{language:'en-US'},states:{[id]:{...state,state:raw}}},{});
    assert.equal(ctx.elements.state.querySelector('.dp-value').textContent,expected,raw);
  }
  const {ctx}=fixture(t,{entities:{[id]:{display_precision:2}},states:{[id]:{...state,state:'1.234e-2'}}},{});
  assert.equal(ctx.elements.state.querySelector('.dp-value').textContent,'0.01');
});

test('room overrides do not reactivate automatic colors when room_auto_colors is false',t => {
  const button={entity:'light.room',css_class:'room-control-1'};
  const options={layout:'room',room_auto_colors:false,sub_button_styles:{'room-control-1':{column:2,icon:'mdi:lightbulb'}}};
  const {ctx,hass}=fixture(t,{states:{'light.room':{state:'on',attributes:{}}}},options,{button_type:'name',sub_button:[button]});
  const css=run(ctx,hass);
  assert.doesNotMatch(css,/ha-card \.room-control-1 \.bubble-sub-button-icon \{(?:color|background|opacity):/);
  assert.match(css,/ha-card \.room-control-1 \{ --room-control-column:1;/);
  ctx.config.presentation={...options,sub_button_styles:{'room-control-1':{color:'teal',background:'#ff0000'}}};
  assert.match(run(ctx,hass),/ha-card \.room-control-1 \.bubble-sub-button-icon \{color:var\(--teal-color, #009688\) !important;background:#ff0000 !important;/);
  ctx.config.presentation={...options,room_auto_colors:true};
  assert.match(run(ctx,hass),/ha-card \.room-control-1 \.bubble-sub-button-icon \{color:var\(--warning-color/);
});

test('visual switches combine custom opacity with availability without changing their actions',t => {
  for (const [raw,opacity,expected] of [['on',0.2,0.2],['off',0,0],['unavailable',0.5,0.2],['unknown',undefined,0.4],['on',undefined,1],['on',2,1]]) {
    const button={entity:'switch.ventilation',css_class:'ventilation',tap_action:{action:'toggle'}};
    const options={sub_button_styles:{ventilation:{type:'switch',...(opacity == null ? {} : {opacity})}}};
    const {ctx,hass}=fixture(t,{states:{[button.entity]:{state:raw,attributes:{}}}},options,{button_type:'name',sub_button:[button]});
    const before=JSON.stringify(ctx.config);
    assert.match(run(ctx,hass),new RegExp('background: transparent !important; opacity: '+expected+' !important;'));
    assert.equal(JSON.stringify(ctx.config),before);
  }
});

test('visual switch opacity templates refresh without being evaluated twice',t => {
  const button={entity:'switch.ventilation',css_class:'ventilation',tap_action:{action:'toggle'}};
  const {ctx,hass}=fixture(t,{states:{[button.entity]:{state:'on',attributes:{}}}},
    {sub_button_styles:{ventilation:{type:'switch',opacity:'{{ opacity }}'}}},{button_type:'name',sub_button:[button]});
  let calls=0;
  assert.match(run(ctx,hass,()=>{calls++;return '0.3';}),/background: transparent !important; opacity: 0.3 !important;/);
  assert.equal(calls,1);
  assert.match(run(ctx,hass,()=> '0.6'),/background: transparent !important; opacity: 0.6 !important;/);
});

test('room controls paint automatic defaults once when explicit styles are present',t => {
  const button={entity:'light.room',css_class:'room-control-1'};
  const {ctx,hass}=fixture(t,{states:{'light.room':{state:'on',attributes:{}}}},
    {layout:'room',sub_button_styles:{'room-control-1':{color:'teal'}}},
    {button_type:'name',sub_button:[button]});
  const css=run(ctx,hass);
  assert.equal((css.match(/ha-card \.room-control-1 \.bubble-sub-button-icon \{/g)||[]).length,1);
  assert.match(css,/color:var\(--teal-color, #009688\) !important;background:color-mix/);
  const changed=run(ctx,{...hass,states:{'light.room':{state:'unavailable',attributes:{}}}});
  assert.match(changed,/opacity:0.4 !important/);
});

test('multiple visual switches share cached geometry while retaining independent states',t => {
  const buttons=Array.from({length:4},(_,i)=>({entity:'switch.control_'+i,css_class:'control-'+i,tap_action:{action:'toggle'}}));
  const options={sub_button_styles:Object.fromEntries(buttons.map(b=>[b.css_class,{type:'switch'}]))};
  const {ctx,hass}=fixture(t,{states:Object.fromEntries(buttons.map((b,i)=>[b.entity,{state:i%2?'off':'on',attributes:{}}]))},options,{sub_button:buttons});
  const css=run(ctx,hass),structure=runtimeField(ctx, 'Structure');
  assert.equal((css.match(/width: 48px; height: 28px/g)||[]).length,1);
  assert.equal((css.match(/--dp-switch-offset: 20px/g)||[]).length,2);
  assert.equal((css.match(/--dp-switch-offset: 0px/g)||[]).length,2);
  let writes=0,cached=structure.switchCSS;
  Object.defineProperty(structure,'switchCSS',{get:()=>cached,set:value=>{writes++;cached=value;}});
  const changed=run(ctx,{...hass,states:{...hass.states,[buttons[1].entity]:{state:'on',attributes:{}}}});
  assert.equal(writes,0);
  assert.equal((changed.match(/--dp-switch-offset: 20px/g)||[]).length,3);
  assert.ok(changed.includes('--signature-card-background'));
  ctx.config={...ctx.config,presentation:{sub_button_styles:{'control-0':{type:'switch'}}}};
  run(ctx,hass);
  assert.notEqual(runtimeField(ctx, 'Structure'),structure);
  assert.doesNotMatch(runtimeField(ctx, 'Structure').switchCSS,/control-1/);
});

test('reusing layout CSS still updates numeric values, Jinja colors and observed state dependencies',t => {
  const {ctx,hass}=fixture(t,{}, {compact_mode:'value',color:'{{ color }}'});
  const runtime=runtimeField(ctx, 'Runtime');
  let layoutCSS=runtime.styleCSS,writes=0;
  Object.defineProperty(runtime,'styleCSS',{get:()=>layoutCSS,set:value=>{writes++;layoutCSS=value;},configurable:true});
  let queries=0;
  const query=ctx.card.querySelector.bind(ctx.card);
  ctx.card.querySelector=selector=>{queries++;return query(selector);};
  const dependencies=new Set();
  const states=new Proxy({[id]:{...state,state:'3.5'}},{get(states,key){dependencies.add(key);return states[key];}});
  const css=run(ctx,{...hass,states},()=> '#123456');
  assert.equal(ctx.elements.state.querySelector('.dp-value').textContent,'3.5');
  assert.match(css,/ha-card \{ --dp-accent: #123456; \}/);
  assert.ok(dependencies.has(id));
  assert.equal(writes,0,'A value or accent change reuses layout CSS');
  assert.equal(queries,0,'A card with no secondary text does not search for a secondary node');
  ctx.elements.state.textContent='native update';
  run(ctx,{...hass,states},()=> '#654321');
  assert.equal(ctx.elements.state.querySelector('.dp-value').textContent,'3.5','Native DOM replacement is still repaired');
});

test('cached layout CSS follows geometry, controls, surface and layout changes like a fresh card',t => {
  const buttons=Array.from({length:5},(_,i)=>({css_class:'room-control-'+(i+1),entity:'light.room'}));
  const extra={states:{...{[id]:state},'light.room':{state:'on',attributes:{}}}};
  const {ctx,hass}=fixture(t,extra,{});
  for (const [options,config] of [
    [{layout:'square',controls:'measure'},{button_type:'state',sub_button:buttons.slice(0,2)}],
    [{layout:'square',controls:'measure',auto_height:true},{button_type:'state',sub_button:buttons}],
    [{layout:'square',color_background:true},{button_type:'state'}],
    [{layout:'room',room_control_columns:2},{button_type:'name',show_state:false,sub_button:buttons}],
    [{layout:'room',room_control_columns:3,room_measures_position:'header'},{button_type:'name',show_state:false,sub_button:buttons}],
    [{layout:'header'},{button_type:'name',show_state:false,sub_button:buttons}],
    [{layout:'square',auto_height:true,secondary:'Details',multiline:true},{button_type:'state'}],
    [{layout:'room',secondary:'Details',multiline:true},{button_type:'name',show_state:false,sub_button:buttons}],
    [{compact_mode:'value'},{button_type:'state'}],
    [{compact_mode:'value',secondary:'Details'},{button_type:'state',sub_button:buttons}],
    [{compact_mode:'value',multiline:true},{button_type:'state',sub_button:buttons,show_state:false}],
    [{compact_mode:'value',state:'Summary'},{button_type:'name',sub_button:buttons}],
    [{compact_mode:'value'},{button_type:'name',sub_button:buttons}],
    [{},{card_type:'cover'}],
    [{secondary:'Details',multiline:true},{card_type:'climate'}],
    [{controls:'number'},{button_type:'state'}],
    [{},{button_type:'state'}],
  ]) {
    ctx.config={card_type:'button',entity:id,presentation:options,...config};
    const fresh=fixture(t,extra,options,config);
    assert.equal(run(ctx,hass),run(fresh.ctx,fresh.hass),JSON.stringify(options));
  }
});

test('a standard compact tile stays below its CSS budget and preserves native visibility',t => {
  const {ctx,hass}=fixture(t,{},{});
  const css=run(ctx,hass);
  assert.ok(Buffer.byteLength(css) < 7000,'A simple compact tile must not include every optional layout');
  assert.doesNotMatch(css,/data-dp-compact-mode="value"|data-dp-value-trailing|bubble-cover-button|bubble-climate|dp-secondary|pre-line/);
  assert.match(css,/\.hidden, ha-card\[data-dp-layout\] \[hidden\] \{ display: none !important; \}/);
  assert.match(css,/data-dp-has-state="no"\] \.bubble-state.hidden \{ display: none !important; \}/);
});

test('cover, climate and numeric controls retain their geometry when a card changes type',t => {
  const {ctx,hass}=fixture(t,{},{});
  for (const [kind,options] of [['cover',{}],['climate',{}],['button',{controls:'number'}],['button',{}]]) {
    ctx.config={card_type:kind,button_type:'state',entity:id,presentation:options};
    const css=run(ctx,hass);
    const fresh=fixture(t,{},options,{card_type:kind});
    assert.equal(css,run(fresh.ctx,fresh.hass),kind);
    if (kind === 'cover') {
      assert.match(css,/bubble-cover-button \{[^}]*width: 38px; min-width: 38px; height: 44px;/);
      assert.match(css,/data-dp-kind="cover"\] \.bubble-buttons-container \{ width: 128px;/);
      assert.doesNotMatch(css,/bubble-climate|bubble-temperature-container/);
    } else if (kind === 'climate' || options.controls === 'number') {
      assert.match(css,/bubble-climate-minus-button,.bubble-climate-plus-button\) \{ width: 38px; min-width: 38px; height: 44px;/);
      assert.match(css,/bubble-high-temp-container\) \{ width: 128px; height: 44px;/);
      assert.match(css,/--bubble-climate-button-background-color:/);
      assert.doesNotMatch(css,/bubble-cover/);
    } else assert.doesNotMatch(css,/bubble-cover|bubble-climate/);
  }
});

test('trailing value CSS follows sub-buttons, state visibility and numeric controls',t => {
  const button={entity:'switch.room',css_class:'mode'};
  const {ctx,hass}=fixture(t,{}, {compact_mode:'value'});
  for (const [buttons,hidden,controls,trailing] of [
    [[],false,undefined,false],[[button],false,undefined,true],[[button],true,undefined,false],
    [[button],false,undefined,true],[[button],false,'number',false],[[button],false,undefined,true],
  ]) {
    ctx.config.sub_button=buttons;
    ctx.config.presentation={compact_mode:'value',controls};
    ctx.config.show_state=!hidden;
    if (hidden) ctx.elements.state.classList.add('hidden');
    else ctx.elements.state.classList.remove('hidden');
    const css=run(ctx,hass);
    assert.equal(ctx.card.getAttribute('data-dp-value-trailing'),trailing ? 'yes' : 'no');
    assert.equal(css.includes('ha-card[data-dp-value-trailing="yes"] .bubble-wrapper'),trailing);
    assert.match(css,/data-dp-compact-mode="value"\] \.bubble-name-container/);
    assert.match(css,/data-dp-has-state="no"\] \.bubble-state.hidden \{ display: none !important; \}/);
  }
});

test('secondary template presence updates cached CSS without rebuilding it for text-only changes',t => {
  for (const [layout,options] of [
    ['compact',{}],['compact',{compact_mode:'value'}],['square',{auto_height:true}],['room',{}],
  ]) {
    const config={button_type:layout === 'room' ? 'name' : 'state',sub_button:[{entity:'switch.room'}]};
    const presentation={...options,layout,secondary:"{{ states('input_number.target') }}"};
    const {ctx,hass}=fixture(t,{},presentation,config);
    const content=new Element(),name=new Element();content.append(name);ctx.card.append(content);
    ctx.elements.contentContainer=content;ctx.elements.nameContainer=name;
    run(ctx,hass,()=> '');
    let layoutCSS=runtimeField(ctx, 'Runtime').styleCSS,writes=0;
    Object.defineProperty(runtimeField(ctx, 'Runtime'),'styleCSS',{get:()=>layoutCSS,set:value=>{writes++;layoutCSS=value;},configurable:true});
    for (const [text,expectedWrites] of [['Details',1],['Other details',1],['',2],['**Details**',3]]) {
      const css=run(ctx,hass,()=> text);
      const fresh=fixture(t,{},presentation,config);
      assert.equal(css,run(fresh.ctx,fresh.hass,()=> text),layout);
      assert.equal(writes,expectedWrites,layout+': '+text);
      assert.equal(css.includes('.dp-secondary'),!!text,layout);
      assert.equal(ctx.card.querySelector('.dp-secondary') !== null,!!text,layout);
    }
  }
});

test('multiline changes restore the correct wrapping rules in cached standard and value tiles',t => {
  for (const compact_mode of ['standard','value']) {
    const {ctx,hass}=fixture(t,{}, {compact_mode});
    for (const multiline of [true,false,true]) {
      ctx.config.presentation={compact_mode,multiline};
      const css=run(ctx,hass);
      assert.equal(css.includes('white-space: pre-line !important;'),multiline);
      assert.equal(css.includes('data-dp-multiline="no"'),!multiline);
      const fresh=fixture(t,{},ctx.config.presentation);
      assert.equal(css,run(fresh.ctx,fresh.hass));
    }
  }
});

test('cached secondary text refreshes templates, survives DOM replacement and is removed on teardown',t => {
  const {ctx,hass}=fixture(t,{}, {secondary:"{{ states('input_number.target') }}"});
  const content=new Element(),name=new Element();
  content.append(name);ctx.card.append(content);
  ctx.elements.contentContainer=content;ctx.elements.nameContainer=name;
  run(ctx,hass,()=> 'First');
  const first=ctx.card.querySelector('.dp-secondary');
  assert.equal(first.textContent,'First');
  run(ctx,hass,()=> 'Second');
  assert.equal(ctx.card.querySelector('.dp-secondary'),first);
  assert.equal(first.textContent,'Second');
  first.remove();
  run(ctx,hass,()=> 'Third');
  const replacement=ctx.card.querySelector('.dp-secondary');
  assert.notEqual(replacement,first);
  assert.equal(replacement.textContent,'Third');
  ctx.teardown();
  assert.equal(ctx.card.querySelector('.dp-secondary'),null);
  assert.equal(runtimeField(ctx, 'Runtime'),undefined);
});

function secondaryFixture(t,options,extra={},config={}) {
  const {ctx,hass}=fixture(t,extra,options,config);
  const content=new Element(),name=new Element();content.append(name);ctx.card.append(content);
  ctx.elements.contentContainer=content;ctx.elements.nameContainer=name;
  return {ctx,hass};
}

test('direct secondary entities display native units, precision and locale and refresh without rebuilding',t => {
  const target='sensor.temperature';
  const {ctx,hass}=secondaryFixture(t,{secondary:target},{locale:{language:'fr',number_format:'space_comma'},
    entities:{[target]:{display_precision:1}},states:{[id]:state,[target]:{state:'21.25',attributes:{unit_of_measurement:'°C'}}}});
  const css=run(ctx,hass),node=ctx.card.querySelector('.dp-secondary');
  assert.equal(node.textContent,'21,3 °C');
  assert.equal(node.dataset.entity,target);
  assert.equal(JSON.parse(node.dataset.tapAction).action,'more-info');
  assert.equal(JSON.parse(node.dataset.holdAction).action,'more-info');
  assert.equal(ctx.elements.state.dataset.entity,id);
  const source=runtimeField(ctx, 'Runtime').secondarySource,formatter=runtimeField(ctx, 'Runtime').secondaryFormat.formatter;
  hass.states[target]={state:'22.75',attributes:{unit_of_measurement:'°C'}};
  assert.equal(run(ctx,hass),css);
  assert.equal(node.textContent,'22,8 °C');
  assert.equal(ctx.card.querySelector('.dp-secondary'),node);
  assert.equal(runtimeField(ctx, 'Runtime').secondarySource,source);
  assert.equal(runtimeField(ctx, 'Runtime').secondaryFormat.formatter,formatter);
  run(ctx,{...hass,locale:{language:'fr',number_format:'comma_decimal'}});
  assert.equal(node.textContent,'22.8 °C');
});

test('secondary entity detection runs once for repeated updates and again only after a source change',t => {
  const original=String.prototype.match;let analyses=0;
  t.mock.method(String.prototype,'match',function(pattern){
    if(pattern?.source?.includes('states|state_attr|is_state|is_state_attr|has_value'))analyses++;
    return original.call(this,pattern);
  });
  const {ctx,hass}=secondaryFixture(t,{secondary:"{{ states('sensor.one') }}"});
  for(let i=0;i<1000;i++)run(ctx,hass,()=> String(i));
  assert.equal(analyses,1);
  ctx.config.presentation={secondary:"{{ states('sensor.one') }}"};
  run(ctx,hass,()=> 'Same configuration');assert.equal(analyses,1);
  ctx.config.presentation={secondary:"{{ states('sensor.two') }}"};
  run(ctx,hass,()=> 'New source');assert.equal(analyses,2);
});

test('direct secondary states are read on every render and missing values retain their details target',t => {
  const target='sensor.temperature';let reads=0,current={state:'23.5',attributes:{unit_of_measurement:'°C'}};
  const states={[id]:state};Object.defineProperty(states,target,{get:()=>{reads++;return current;}});
  const {ctx,hass}=secondaryFixture(t,{secondary:target},{states});
  const before=reads;run(ctx,hass);run(ctx,hass);
  assert.equal(reads-before,2);
  for(const raw of ['unknown','unavailable',undefined]) {
    current=raw === undefined ? undefined : {state:raw,attributes:{unit_of_measurement:'°C'}};
    run(ctx,hass);const node=ctx.card.querySelector('.dp-secondary');
    assert.equal(node.textContent,'—');assert.equal(node.dataset.entity,target);
  }
  current={state:'on',attributes:{}};
  run(ctx,{...hass,formatEntityState:()=> 'Allumé'});
  assert.equal(ctx.card.querySelector('.dp-secondary').textContent,'Allumé');
});

test('secondary templates select their first entity in source order and retain the native rendering context',t => {
  for(const [secondary,target]of [
    ["{{ states('sensor.one') }} · {{ states('sensor.two') }}",'sensor.one'],
    ['{{ state_attr("sensor.two", "measured_at") }}','sensor.two'],
    ['{{ states.sensor.dotted.state }}','sensor.dotted'],
    ['{{ states(entity) }}',id],
    ["{{ state_attr(entity, 'measured_at') }}",id],
    ["{{ states(entity) }} {{ states('sensor.one') }}",id],
    ["{{ states('sensor.one') }} {{ states(entity) }}",'sensor.one'],
  ]) {
    const {ctx,hass}=secondaryFixture(t,{secondary});
    run(ctx,hass,(text,entity)=>{assert.equal(text,secondary);assert.equal(entity,id);return 'Details';});
    const node=ctx.card.querySelector('.dp-secondary');
    assert.equal(node.textContent,'Details');assert.equal(node.dataset.entity,target);
    assert.equal(node.classList.contains('bubble-action'),true);
    assert.equal(ctx.elements.state.dataset.entity,id);
  }
});

test('fixed secondary text and templates without a static entity keep their text and native card actions',t => {
  for(const secondary of ['Protect','**Ajax**','{{ text }}',"{{ states('sensor.' ~ room) }}"]) {
    const {ctx,hass}=secondaryFixture(t,{secondary,secondary_bold:true});
    run(ctx,hass,()=> '<img src=x>');const node=ctx.card.querySelector('.dp-secondary');
    assert.equal(node.classList.contains('bubble-action'),false);
    assert.equal(node.dataset.entity,undefined);
    assert.equal(ctx.elements.state.dataset.entity,id);
    if(secondary.includes('{{'))assert.equal(node.textContent,'<img src=x>');
  }
});

test('changing a secondary target replaces its cached action node and switching to plain text removes actions',t => {
  const {ctx,hass}=secondaryFixture(t,{secondary:"{{ states('sensor.one') }}"});
  run(ctx,hass,()=> 'First');const first=ctx.card.querySelector('.dp-secondary');
  ctx.config.presentation={secondary:"{{ states('sensor.two') }}"};
  run(ctx,hass,()=> 'Second');const second=ctx.card.querySelector('.dp-secondary');
  assert.notEqual(second,first);assert.equal(second.dataset.entity,'sensor.two');
  assert.equal(ctx.card.contains(first),false);assert.equal(first.dataset.entity,undefined);
  ctx.config.presentation={secondary:'Protect'};run(ctx,hass);
  const plain=ctx.card.querySelector('.dp-secondary');
  assert.notEqual(plain,second);assert.equal(plain.textContent,'Protect');
  assert.equal(plain.classList.contains('bubble-action'),false);
  assert.equal(second.dataset.entity,undefined);
});

test('custom main state keeps the Bubble entity as its details target',t => {
  const {ctx,hass}=secondaryFixture(t,{state:"{{ states('sensor.other') }} kW",secondary:'Details'});
  run(ctx,hass,()=> '12 kW');assert.equal(ctx.elements.state.dataset.entity,id);
  assert.equal(ctx.elements.state.textContent,'12kW');
});

test('service errors use native translations and retain the original error detail',async t => {
  const calls=[];
  const {ctx}=fixture(t,{locale:{language:'de-DE'},localize:(key,args)=>{
    calls.push([key,args]);return key === 'ui.notification_toast.action_failed' ? 'Aktion fehlgeschlagen.' : undefined;
  },callService:async()=>{throw new Error('service unavailable');}});
  await ctx._signatureCompactNumber.plus.click();
  const notice=ctx._signatureCompactNumber.group.events.find(event=>event.type==='hass-notification');
  assert.equal(notice.detail.message,'Aktion fehlgeschlagen. service unavailable');
  assert.deepEqual(calls.at(-1),['ui.notification_toast.action_failed',{service:'input_number.set_value'}]);
  assert.equal(ctx._signatureCompactNumber.pending,null);
  assert.equal(ctx._signatureCompactNumber.timer,null);
});

test('service errors have a French or English fallback without native translations',async t => {
  for (const [language,prefix] of [['fr-FR','Impossible de modifier la valeur.'],['en-US','Failed to set the value.']]) {
    const {ctx}=fixture(t,{locale:{language},callService:async()=>{throw new Error('denied');}});
    await ctx._signatureCompactNumber.plus.click();
    assert.equal(ctx._signatureCompactNumber.group.events.at(-1).detail.message,prefix+' denied');
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
    await ctx._signatureCompactNumber[direction].click();
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
    assert.equal(ctx._signatureCompactNumber.minus.disabled,true);
    assert.equal(ctx._signatureCompactNumber.plus.disabled,true);
    await ctx._signatureCompactNumber.plus.click();
    assert.equal(calls,0);
  }
});

test('repeated presses wait for HA to acknowledge the new value',async t => {
  const calls=[];
  const {ctx,hass}=fixture(t,{callService:async(...args)=>calls.push(args)});
  await ctx._signatureCompactNumber.plus.click();
  await ctx._signatureCompactNumber.plus.click();
  assert.equal(calls.length,1);
  assert.equal(ctx._signatureCompactNumber.plus.disabled,true);
  const updated={...hass,states:{[id]:{...state,state:'3'}}};
  run(ctx,updated);
  assert.equal(ctx._signatureCompactNumber.plus.disabled,false);
  await ctx._signatureCompactNumber.plus.click();
  assert.equal(calls.length,2);
  assert.equal(calls[1][2].value,3.5);
});

test('a pending command becomes available again after the acknowledgement timeout',async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const {ctx}=fixture(t);
  await ctx._signatureCompactNumber.plus.click();
  t.mock.timers.tick(4999);
  assert.equal(ctx._signatureCompactNumber.plus.disabled,true);
  t.mock.timers.tick(1);
  assert.equal(ctx._signatureCompactNumber.plus.disabled,false);
  assert.equal(ctx._signatureCompactNumber.pending,null);
});

test('switching to a section title removes pending controls and restores delegated actions',async t => {
  const clear=t.mock.method(globalThis,'clearTimeout');
  const {ctx,hass}=fixture(t);
  const old=ctx._signatureCompactNumber;
  await old.plus.click();
  assert.equal(ctx.elements.state.classList.contains('bubble-action'),true);
  ctx.config={card_type:'separator',presentation:{layout:'title'}};
  run(ctx,hass);
  assert.equal(old.disposed,true);
  assert.ok(clear.mock.calls.some(call=>call.arguments[0] === old.timer),'The pending timer is cancelled');
  assert.equal(old.host.children.includes(old.group),false);
  assert.equal(ctx._signatureCompactNumber,undefined);
  assert.equal(ctx.elements.state.classList.contains('bubble-action'),false);
  assert.equal(ctx.elements.state.dataset.entity,undefined);
});

test('a service failure received after teardown does not dispatch a notification',async t => {
  let reject;
  const {ctx}=fixture(t,{callService:()=>new Promise((_,fail)=>{reject=fail;})});
  const controls=ctx._signatureCompactNumber;
  const click=controls.plus.click();
  ctx.teardown();
  reject(new Error('late rejection'));
  await click;
  assert.equal(controls.group.events.length,0);
  assert.equal(controls.disposed,true);
});
