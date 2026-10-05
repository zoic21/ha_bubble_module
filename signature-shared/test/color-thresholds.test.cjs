const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const YAML = require('yaml');
const context = vm.createContext({...require('./dom.cjs'),Intl,setTimeout,clearTimeout});
const definitions = Object.fromEntries(['compact','square','header','room'].map(layout => [layout,
  YAML.parse(fs.readFileSync(path.resolve(__dirname,'../../signature-' + layout + '/dist/signature-' + layout + '.yaml'),'utf8'))['signature_' + layout]]));
const renderers = Object.fromEntries(Object.entries(definitions).map(([layout,definition]) => [layout,
  vm.runInContext('(function(hass,onTeardown,renderTemplate){return `' + definition.code + '`;})',context)]));
const scale = {enabled:true,values:[{value:15,color:'#2196f3'},{value:19,color:'#4caf50'},{value:22,color:'#4caf50'},{value:30,color:'#ff9800'}]};
function fixture(t,layout,options={},native={}) {
  const card = new context.Element(), state = new context.Element();
  state.className = 'bubble-state';card.append(state);
  const ctx = {card,elements:{state},config:{card_type:'button',button_type:layout === 'header' || layout === 'room' ? 'name' : 'state',
    entity:'sensor.temperature',['signature_' + layout]:options,...native}};
  const hass = {states:{'sensor.temperature':{state:'17',attributes:{unit_of_measurement:'°C'}},
    'sensor.humidity':{state:'26',attributes:{unit_of_measurement:'%'}}}};
  const run = () => renderers[layout].call(ctx,hass,fn => ctx.teardown = fn,value => value);
  t.after(() => ctx.teardown?.());
  return {ctx,hass,run};
}
test('main icon surfaces follow live numeric states without tinting values or card surfaces',t => {
  for (const layout of ['compact','square']) {
    const f = fixture(t,layout,{color_thresholds:scale});
    const config = JSON.stringify(f.ctx.config);
    assert.match(f.run(),/\.bubble-main-icon-container\s*\{[^}]*background:rgb\(55,163,162\)\s*!important/);
    const runtime = f.ctx['_signature' + layout[0].toUpperCase() + layout.slice(1) + 'Structure'];
    const cached = runtime.thresholdScale;
    f.hass.states['sensor.temperature'].state = '26';
    const css = f.run();
    assert.match(css,/\.bubble-main-icon-container\s*\{[^}]*background:rgb\(166,164,40\)\s*!important/);
    assert.match(css,/color:color\(from rgb\(from var\(--primary-text-color,#212121\)/);
    assert.equal(runtime.thresholdScale,cached);
    assert.doesNotMatch(css,/\.bubble-state\s*\{[^}]*rgb\(166,164,40\)/);
    assert.doesNotMatch(css,/--dp-accent:\s*rgb\(166,164,40\)/);
    assert.equal(JSON.stringify(f.ctx.config),config);
  }
});
test('manual foregrounds retain contrast protection without blocking scales; disabled scales and thermostat activity remain native',t => {
  for (const layout of ['compact','square']) {
    const manual = fixture(t,layout,{color_thresholds:scale,icon_color:'#abcdef'});
    assert.match(manual.run(),/\.bubble-main-icon\s*\{\s*color:\s*#abcdef\s*!important/);
    assert.match(manual.run(),/background:rgb\(55,163,162\)/);
    assert.match(manual.run(),/color:color\(from rgb\(from #abcdef/);
    const disabled = fixture(t,layout,{color_thresholds:{...scale,enabled:false}});
    assert.doesNotMatch(disabled.run(),/rgb\(55,163,162\)/);
  }
  const thermostat = fixture(t,'compact',{color_thresholds:{...scale,attribute:'current_temperature'}},{card_type:'climate'});
  thermostat.hass.states['sensor.temperature'].attributes = {current_temperature:17,hvac_action:'heating'};
  assert.match(thermostat.run(),/color:var\(--orange-color,#ff9800\)/);
  assert.doesNotMatch(thermostat.run(),/rgb\(55,163,162\)/);
  assert.doesNotMatch(fixture(t,'room',{color_thresholds:scale}).run(),/rgb\(55,163,162\)/);
});
test('missing, unavailable and invalid data use neutral color; optional sources remain tracked',t => {
  const f = fixture(t,'compact',{color_thresholds:{...scale,entity:'sensor.humidity',attribute:'temperature'}});
  let reads = 0;
  const states = f.hass.states;
  f.hass.states = new Proxy(states,{get(target,key){if(key === 'sensor.humidity') reads++;return target[key];}});
  states['sensor.humidity'].attributes.temperature = '20';
  assert.match(f.run(),/rgb\(76,175,80\)/);
  states['sensor.humidity'].attributes.temperature = '26';
  assert.match(f.run(),/rgb\(166,164,40\)/);
  assert.equal(reads,2);
  for (const state of ['unknown','unavailable','']) {
    states['sensor.humidity'].state = state;
    if (state === '') delete states['sensor.humidity'].attributes.temperature;
    assert.match(f.run(),/background:color-mix\(in srgb,var\(--secondary-text-color\) 16%/);
    assert.match(f.run(),/\.bubble-main-icon\s*\{\s*color:var\(--primary-text-color,#212121\)/);
  }
  delete states['sensor.humidity'];
  assert.match(f.run(),/background:color-mix\(in srgb,var\(--secondary-text-color\) 16%/);
});
test('sub-button thresholds color badge surfaces in Compact, Square, headers and separators',t => {
  for (const [layout,card_type] of [['compact','button'],['square','button'],['header','button'],['header','separator']]) {
    const f = fixture(t,layout,{sub_button_styles:{temperature:{color_thresholds:scale},'2':{color_thresholds:scale}}},
      {card_type,sub_button:{main:[{group:[{entity:'sensor.temperature',css_class:'temperature'},
        {entity:'sensor.humidity',css_class:'humidity'}]}]}});
    const css = f.run();
    assert.match(css,/ha-card \.temperature\.bubble-sub-button\s*\{\s*background:rgb\(55,163,162\)/);
    assert.match(css,/ha-card \.bubble-sub-button-2\.bubble-sub-button\s*\{\s*background:rgb\(166,164,40\)/);
    assert.match(css,/color:color\(from rgb\(from var\(--primary-text-color,#212121\)/);
    f.ctx.config['signature_' + layout] = {};
    assert.doesNotMatch(f.run(),/rgb\(55,163,162\)|rgb\(166,164,40\)/);
  }
});
test('sub-button manual backgrounds and tints do not mask scales; visual switches keep their own track',t => {
  const f = fixture(t,'compact',{sub_button_styles:{temperature:{color:'#abcdef',color_thresholds:scale}}},
    {sub_button:[{entity:'sensor.temperature',css_class:'temperature'}]});
  assert.match(f.run(),/background:rgb\(55,163,162\)/);
  f.ctx.config.signature_compact = {sub_button_styles:{temperature:{color:'#abcdef',icon_color:'#123456',color_thresholds:scale}}};
  assert.match(f.run(),/color:color\(from rgb\(from #123456/);
  f.ctx.config.signature_compact = {sub_button_styles:{temperature:{background:'#f00',color_thresholds:scale}}};
  assert.match(f.run(),/background:rgb\(55,163,162\)/);
  const toggle = fixture(t,'compact',{sub_button_styles:{toggle:{type:'switch',color_thresholds:scale}}},
    {sub_button:[{entity:'switch.demo',css_class:'toggle',tap_action:{action:'toggle'}}]});
  toggle.hass.states['switch.demo'] = {state:'on',attributes:{}};
  assert.doesNotMatch(toggle.run(),/\.toggle \.bubble-sub-button-icon\s*\{\s*color:var\(--secondary-text-color\)/);
});
test('configuration changes replace cached scales and editor visibility follows supported targets',t => {
  const f = fixture(t,'square',{color_thresholds:scale});f.run();
  f.ctx.config.signature_square.color_thresholds = {values:[{value:0,color:'#f00'}]};
  assert.match(f.run(),/\.bubble-main-icon-container\s*\{[^}]*background:#f00/);
  for (const layout of ['compact','square']) {
    const field = definitions[layout].editor[1].fields.color_thresholds;
    assert.deepEqual(JSON.parse(JSON.stringify(field.selector)),{object:{}});
    const visible = new Function('card','return ' + field.visible_if);
    assert.equal(visible({card_type:'button',button_type:'state'}),true);
    assert.equal(visible({card_type:'climate'}),false);
    assert.equal(visible({card_type:'media-player'}),false);
  }
  const subField = definitions.header.editor[1].fields.sub_button_styles;
  assert.equal(new Function('card','return ' + subField.visible_if)({card_type:'separator'}),true);
});
