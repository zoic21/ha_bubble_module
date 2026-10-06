const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {loadModule} = require('../../shared/test/module.cjs');
const context = vm.createContext({...require('./dom.cjs'), Intl, setTimeout, clearTimeout});
const definition = loadModule('signature-compact');
const runModule = vm.runInContext('(function(hass,onTeardown,renderTemplate){return `'+definition.code+'`;})',context);

function fixture(t, fill, config = {}, states = {}) {
  const Element = context.Element;
  const card = new Element(), host = new Element(), content = new Element(), names = new Element(), state = new Element();
  host.className='bubble-wrapper';content.className='bubble-content-container';names.className='bubble-name-container';state.className='bubble-state';
  card.append(host);host.append(content);content.append(names);names.append(state);
  const ctx={card,elements:{state,contentContainer:content,nameContainer:names},config:{card_type:'button',button_type:'state',entity:'sensor.pump',signature_compact:{compact_mode:'value',fill},...config}};
  const hass={locale:{language:'fr',number_format:'space_comma'},states:{'sensor.pump':{state:'200',attributes:{unit_of_measurement:'W'}},'sensor.house':{state:'1000',attributes:{unit_of_measurement:'W'}},...states}};
  const run=()=>runModule.call(ctx,hass,fn=>ctx.teardown=fn,value=>value);
  t.after(()=>ctx.teardown?.());return {ctx,hass,run};
}

test('Compact fill follows both tracked sources without recreating layout or nodes',t=>{
  const f=fixture(t,{reference_entity:'sensor.house'});
  assert.match(f.run(),/--dp-fill-part:20%/);
  const runtime=f.ctx._signatureCompactRuntime,css=runtime.styleCSS,nodes=[...f.ctx.card.children];
  const reads=new Set();f.hass.states=new Proxy(f.hass.states,{get:(states,key)=>{reads.add(key);return states[key];}});
  f.hass.states['sensor.house']={state:'2000',attributes:{unit_of_measurement:'W'}};
  assert.match(f.run(),/--dp-fill-part:10%/);
  assert.ok(reads.has('sensor.house'));assert.ok(reads.has('sensor.pump'));
  f.hass.states['sensor.pump']={state:'500',attributes:{unit_of_measurement:'W'}};
  assert.match(f.run(),/--dp-fill-part:25%/);
  assert.equal(f.ctx._signatureCompactRuntime,runtime);assert.equal(runtime.styleCSS,css);
  assert.deepEqual(f.ctx.card.children,nodes);assert.equal(f.ctx.elements.state.textContent,'500W');
});

test('fixed scales preserve zero, clamp the visual range and leave the actual value intact',t=>{
  const f=fixture(t,{max:20});
  for(const [value,percent] of [['0',0],['10',50],['40',100],['-4',0]]){
    f.hass.states['sensor.pump']={state:value,attributes:{unit_of_measurement:'L/min'}};
    assert.match(f.run(),new RegExp('--dp-fill-part:'+percent+'%'));
    assert.equal(f.ctx.card.getAttribute('data-dp-fill'),'valid');
    assert.equal(f.ctx.elements.state.querySelector('.dp-value').textContent,value);
  }
});

test('invalid values and totals hide the fill instead of inventing zero readings',t=>{
  const f=fixture(t,{reference_entity:'sensor.house',max:100});
  for(const [source,total] of [['unavailable','1000'],['unknown','1000'],['','1000'],['NaN','1000'],['200','unavailable'],['200',''],['200','0'],['200','-100'],['200','Infinity'],[false,'1000']]){
    f.hass.states['sensor.pump']={state:source,attributes:{unit_of_measurement:'W'}};
    f.hass.states['sensor.house']={state:total,attributes:{unit_of_measurement:'W'}};
    const css=f.run();assert.equal(f.ctx.card.getAttribute('data-dp-fill'),'unavailable');assert.match(css,/background-image:none!important/);
    if(source==='unavailable'||source==='unknown')assert.equal(f.ctx.elements.state.textContent,'—');
  }
  delete f.hass.states['sensor.house'];assert.match(f.run(),/background-image:none!important/);
  f.hass.states['sensor.house']={state:'1000',attributes:{unit_of_measurement:'kW'}};
  assert.match(f.run(),/background-image:none!important/);
  f.hass.states['sensor.house']={state:'1000',attributes:{unit_of_measurement:'W'}};
  f.hass.states['sensor.pump']={state:'0',attributes:{unit_of_measurement:'W'}};
  f.run();
  assert.equal(f.ctx.card.getAttribute('data-dp-fill'),'valid');
});

test('fill is opt-in, reversible and limited to numeric state buttons without generated controls',t=>{
  const f=fixture(t,{max:100});assert.match(f.run(),/--dp-fill-part:100%/);
  f.ctx.config.signature_compact.fill.enabled=false;
  assert.doesNotMatch(f.run(),/--dp-fill-part:/);assert.equal(f.ctx.card.getAttribute('data-dp-fill'),null);
  for(const fill of [undefined,{},true,[],{enabled:true},{enabled:false,max:100}]){
    f.ctx.config.signature_compact.fill=fill;assert.doesNotMatch(f.run(),/--dp-fill-part:/);
  }
  f.ctx.config.signature_compact.fill={max:100};f.run();f.ctx.teardown();
  assert.equal(f.ctx.card.getAttribute('data-dp-fill'),null);
  for(const config of [{button_type:'name'},{button_type:'switch'},{card_type:'cover'},{card_type:'climate'},{card_type:'media-player'},{entity:'input_number.pump',signature_compact:{controls:'number',fill:{max:100}}}]){
    assert.doesNotMatch(fixture(t,{max:100},config).run(),/--dp-fill-part:/);
  }
});

test('fill keeps theme surfaces, colors and reduced motion in CSS and exposes its native editor field',t=>{
  const f=fixture(t,{max:100});const css=f.run();
  assert.match(css,/var\(--signature-fill-tint,\s*16%\)/);
  assert.match(css,/var\(--dp-accent\)/);assert.match(css,/prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css,/background:linear-gradient/);
  const field=definition.editor[1].fields.fill;assert.deepEqual(field.selector,{object:{}});
  const visible=new Function('item','card','return !!('+field.visible_if+');');
  assert.equal(visible({}, {card_type:'button',button_type:'state'}),true);
  assert.equal(visible({}, {card_type:'media-player'}),false);
  assert.equal(visible({controls:'number'}, {card_type:'button',button_type:'state'}),false);
});

test('small value style is reversible, respects native visibility and restores delegated actions on teardown',t=>{
  const f=fixture(t,undefined,{signature_compact:{compact_mode:'value',value_style:'button'}});
  const state=f.ctx.elements.state;
  f.run();assert.equal(f.ctx.card.getAttribute('data-dp-value-style'),'button');
  assert.equal(state.dataset.entity,'sensor.pump');assert.equal(JSON.parse(state.dataset.tapAction).action,'more-info');
  f.ctx.config.signature_compact.value_style='text';f.run();
  assert.equal(f.ctx.card.getAttribute('data-dp-value-style'),'text');assert.equal(f.ctx.elements.state,state);
  f.ctx.config.signature_compact.value_style='button';f.ctx.config.show_state=false;state.classList.add('hidden');f.run();
  assert.equal(f.ctx.card.getAttribute('data-dp-value-style'),'text');assert.ok(state.classList.contains('hidden'));
  f.ctx.config.show_state=true;state.classList.remove('hidden');f.run();assert.equal(f.ctx.card.getAttribute('data-dp-value-style'),'button');
  f.ctx.teardown();assert.equal(f.ctx.card.getAttribute('data-dp-value-style'),null);assert.equal(state.dataset.tapAction,undefined);
  const field=definition.editor[1].fields.value_style;
  const visible=new Function('item','card','return !!('+field.visible_if+');');
  assert.ok(visible({compact_mode:'value'},{button_type:'state'}));
  assert.equal(visible({compact_mode:'default'},{button_type:'state'}),false);
  assert.equal(visible({compact_mode:'value',controls:'number'},{button_type:'state'}),false);
  assert.equal(visible({compact_mode:'value'},{card_type:'media-player'}),false);
});
