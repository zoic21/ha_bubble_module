const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');

const file = process.argv[2] || path.resolve(__dirname, '../alert_manager/dist/alert_manager.yaml');
const code = fs.readFileSync(file, 'utf8').split('  code: |2-\n')[1];
assert.ok(code, 'Module code missing');
const render = new Function('hass', 'onTeardown', 'return `'+code+'`;');
// This stub validates the test fixtures; it does not replace browser CSS validation.
globalThis.CSS = {supports: (property,value) => property === 'color' && /^(#[a-f0-9]{6}|red|orange|teal|rgb\([\d ,]+\)|var\(--[a-z-]+(?:, #[a-f0-9]{6})?\))$/i.test(value)};
const key = Symbol.for('bubble.alertManager.v3');
const ids = ['sensor.alert_manager_main_active','sensor.alert_manager_main_acknowledge','sensor.alert_manager_main_pending'];
const primary = 'switch.appliance';
const target = 'sensor.temperature';
const power = 'sensor.power';
const manager = (alerts=[]) => ({state:String(alerts.length),attributes:{alerts}});
const normal = () => ({states:Object.fromEntries(ids.map(id=>[id,manager()])),connection:{}});
const custom = (entity=primary,rule='temperature') => ({id:`rule:${rule}:${entity}`,entity_id:entity});
const pack = (entity=primary,id='battery') => ({id:`${id}:${entity}`,entity_id:entity});
const context = (options,extra={}) => ({card:{},config:{card_type:'button',entity:primary,...extra,...(options === undefined ? {} : {alert_manager:options})}});
const run = (ctx,hass) => render.call(ctx,hass,fn=>ctx.teardown=fn).trim();
const accent = css => /\.bubble-main-icon \{ color: (.*?) !important; \}/.exec(css)?.[1] || '';
const red = 'var(--red-color, #f44336)';
const orange = 'var(--orange-color, #ff9800)';
const withAlerts = (alerts,partition=0) => {const hass=normal();hass.states[ids[partition]]=manager(alerts);return hass;};
const forbiddenHass = new Proxy({}, {get(){throw new Error('Unexpected hass access');}});

test('no options watches the main entity; every lifecycle partition has the right color',()=>{
  for (const partition of [0,1,2]) {
    assert.equal(accent(run(context(),withAlerts([custom()],partition))),partition === 2 ? orange : red);
  }
  assert.equal(run(context(),normal()),'');
});

test('default discovery covers sub-button arrays, main/bottom groups, targets and secondary entities',()=>{
  const extra = {sub_button:{main:[{entity:target},{group:[{entity:power}]}],bottom:[{group:[{entity:'sensor.bottom'}]}]},
    signature:{secondary_entity:'sensor.secondary'},button_action:{tap_action:{target:{entity_id:['light.one','light.two']}}}};
  for (const entity of [primary,target,power,'sensor.bottom','sensor.secondary','light.one','light.two']) {
    assert.equal(accent(run(context(undefined,extra),withAlerts([custom(entity)]))),red,entity);
  }
  assert.equal(accent(run(context(undefined,{sub_button:[{entity:target}]}),withAlerts([custom(target)]))),red);
});

test('literal Jinja and JS references are discovered; dynamic IDs can be explicitly added',()=>{
  const extra = {name:"{{ states('sensor.jinja') }}",styles:"${hass.states['sensor.javascript'].state}",
    signature:{secondary:'{{ states.sensor.dotted.state }}'}};
  for (const entity of ['sensor.jinja','sensor.javascript','sensor.dotted']) {
    assert.equal(accent(run(context(undefined,extra),withAlerts([custom(entity)]))),red);
  }
  const dynamic = {name:"{{ states('sensor.' ~ 'dynamic') }}"};
  assert.equal(run(context(undefined,dynamic),withAlerts([custom('sensor.dynamic')])),'');
  assert.equal(accent(run(context({entities:{'sensor.dynamic':{}}},dynamic),withAlerts([custom('sensor.dynamic')]))),red);
});

test('entity-like labels, service names, pack colors and nested cards do not expand discovery',()=>{
  const ctx = context({pack_colors:{battery:{active:'var(--sensor-color)'}}},{name:'sensor.label',
    tap_action:{action:'call-service',service:'switch.toggle'},card:{entity:'sensor.child'},cards:[{entity:target}]});
  for (const entity of ['sensor.label','switch.toggle','sensor.child',target,'var.sensor']) {
    assert.equal(run(ctx,withAlerts([custom(entity)])),'',entity);
  }
});

test('old alertManager lists do not restrict or add entities',()=>{
  const ctx = context(undefined,{alertManager:[target]});
  assert.equal(accent(run(ctx,withAlerts([custom()]))),red);
  assert.equal(run(ctx,withAlerts([custom(target)])),'');
});

test('excluded entities never produce a color and additional entities are opt-in',()=>{
  const ctx = context({entities:{[primary]:{exclude:true},[target]:{}}});
  assert.equal(run(ctx,withAlerts([custom()])),'');
  assert.equal(accent(run(ctx,withAlerts([custom(target)]))),red);
  assert.equal(run(context({entities:{[primary]:{exclude:true,packs:['battery']}}}),forbiddenHass),'');
});

test('ignore_pending affects only pending; active and acknowledged still win',()=>{
  const ctx = context({entities:{[primary]:{ignore_pending:true}}},{sub_button:[{entity:target}]});
  assert.equal(run(ctx,withAlerts([custom()],2)),'');
  assert.equal(accent(run(ctx,withAlerts([custom(target)],2))),orange);
  for (const partition of [0,1]) {
    const hass=withAlerts([custom()],partition);hass.states[ids[2]]=manager([custom(target)]);
    assert.equal(accent(run(ctx,hass)),red);
  }
});

test('global pending policy can be overridden explicitly per entity',()=>{
  assert.equal(run(context({ignore_pending:true}),withAlerts([custom()],2)),'');
  assert.equal(accent(run(context({ignore_pending:true,entities:{[primary]:{ignore_pending:false}}}),withAlerts([custom()],2))),orange);
  for (const value of [false,'true',1]) {
    assert.equal(accent(run(context({entities:{[primary]:{ignore_pending:value}}}),withAlerts([custom()],2))),orange);
  }
});

test('all automatic packs are excluded by default and arbitrary future IDs work',()=>{
  for (const id of ['battery','connectivity','unavailable','unifi','execution_errors','flapping','update_available','future_pack']) {
    for (const partition of [0,1,2]) {
      const hass=withAlerts([pack(primary,id)],partition);
      assert.equal(run(context(),hass),'',id);
      assert.equal(accent(run(context({packs:[id]}),hass)),partition === 2 ? orange : red,id);
    }
  }
});

test('global and entity pack additions are cumulative and exclusions take priority',()=>{
  const ctx = context({packs:['battery'],entities:{[target]:{packs:['future_pack']}}},{sub_button:[{entity:target}]});
  for (const entity of [primary,target]) assert.equal(accent(run(ctx,withAlerts([pack(entity)]))),red);
  assert.equal(accent(run(ctx,withAlerts([pack(target,'future_pack')]))),red);
  assert.equal(run(ctx,withAlerts([pack(primary,'future_pack')])),'');
  for (const options of [
    {packs:['battery'],entities:{[primary]:{exclude_packs:['battery']}}},
    {exclude_packs:['battery'],entities:{[primary]:{packs:['battery']}}},
    {packs:['battery'],exclude_packs:['battery'],entities:{[primary]:{packs:['battery']}}},
  ]) assert.equal(run(context(options),withAlerts([pack()])),'');
});

test('rule exclusions apply by stable rule ID and preserve other errors and other entities',()=>{
  const ctx = context({entities:{[primary]:{exclude_rules:['notification']}}},{sub_button:[{entity:target}]});
  for (const partition of [0,1,2]) {
    assert.equal(run(ctx,withAlerts([custom(primary,'notification')],partition)),'');
    assert.equal(accent(run(ctx,withAlerts([custom(primary,'notification'),custom(primary,'error')],partition))),partition === 2 ? orange : red);
    assert.equal(accent(run(ctx,withAlerts([custom(target,'notification')],partition))),partition === 2 ? orange : red);
  }
  assert.equal(run(context({exclude_rules:['notification']}),withAlerts([custom(primary,'notification')])),'');
  assert.equal(accent(run(ctx,withAlerts([{...custom(),rule:'notification',message:'notification'}]))),red);
});

test('rule and pack exclusion namespaces are independent',()=>{
  assert.equal(accent(run(context({packs:['battery'],exclude_rules:['battery']}),withAlerts([pack()]))),red);
  assert.equal(accent(run(context({exclude_packs:['battery']}),withAlerts([custom(primary,'battery')]))),red);
});

test('pack pending policies and simultaneous custom/pack alerts use lifecycle severity',()=>{
  const ctx = context({packs:['battery'],entities:{[primary]:{ignore_pending:true}}});
  assert.equal(run(ctx,withAlerts([pack()],2)),'');
  assert.equal(accent(run(ctx,withAlerts([pack()],1))),red);
  const hass=withAlerts([custom()],2);hass.states[ids[1]]=manager([pack()]);
  assert.equal(accent(run(context({packs:['battery']}),hass)),red);
});

test('colors cascade entity > pack > general separately for each lifecycle state',()=>{
  const options={packs:['battery'],colors:{active:'#111111',pending:'#222222'},
    pack_colors:{battery:{active:'#333333',pending:'#444444'}},entities:{[primary]:{colors:{active:'#555555'}}}};
  assert.equal(accent(run(context(options),withAlerts([pack()]))),'#555555');
  assert.equal(accent(run(context(options),withAlerts([pack()],1))),'#555555');
  assert.equal(accent(run(context(options),withAlerts([pack()],2))),'#444444');
  assert.equal(accent(run(context(options),withAlerts([custom()],2))),'#222222');
  const partial={packs:['battery'],colors:{active:'#111111'},pack_colors:{battery:{pending:'#444444'}}};
  assert.equal(accent(run(context(partial),withAlerts([pack()]))),'#111111');
  assert.equal(accent(run(context(partial),withAlerts([pack()],2))),'#444444');
  assert.equal(accent(run(context({packs:['battery'],pack_colors:{battery:{active:'#333333'}}}),withAlerts([pack()],2))),orange);
});

test('valid CSS colors work; invalid colors fall back without emitting CSS injection',()=>{
  for (const value of ['#123456','teal','rgb(1, 2, 3)','var(--my-color)']) {
    const css=run(context({colors:{active:value}}),withAlerts([custom()]));
    assert.equal(accent(css),value);
    assert.ok(css.includes(`color-mix(in srgb, ${value} 16%`));
  }
  const options={packs:['battery'],colors:{active:'not-a-color'},pack_colors:{battery:{active:'#123456'}},entities:{[primary]:{colors:{active:'red; } body {display:none'}}}};
  const css=run(context(options),withAlerts([pack()]));
  assert.equal(accent(css),'#123456');assert.ok(!css.includes('display:none'));
});

test('configuring pack colors alone does not enable a pack',()=>{
  assert.equal(run(context({pack_colors:{battery:{active:'#123456'}}}),withAlerts([pack()])),'');
});

test('equal severity chooses first card entity; same-entity ties are stable across list order',()=>{
  const options={packs:['battery','connectivity'],pack_colors:{battery:{active:'#111111'},connectivity:{active:'#222222'}},
    entities:{[target]:{colors:{active:'#333333'}}}};
  const ctx=context(options,{sub_button:[{entity:target}]});
  const records=[pack(primary,'connectivity'),custom(target),pack()];
  assert.equal(accent(run(ctx,withAlerts(records))),'#111111');
  assert.equal(accent(run(ctx,withAlerts([...records].reverse()))),'#111111');
  const hass=withAlerts([custom(target)]);hass.states[ids[2]]=manager([pack()]);
  assert.equal(accent(run(ctx,hass)),'#333333');
});

test('disabled, unsupported and entity-free cards do not access HA or build an index',()=>{
  delete globalThis[key];
  const contexts=[context(false),context(undefined,{card_type:'separator'}),context(undefined,{card_type:'pop-up'}),
    context(undefined,{button_type:'slider'}),context(undefined,{entity:undefined}),{config:{entity:primary}}];
  for (const ctx of contexts) assert.equal(run(ctx,forbiddenHass),'');
  assert.equal(globalThis[key],undefined);
});

test('zero counts do not access alert attributes',()=>{
  const hass=normal();
  for(const id of ids) Object.defineProperty(hass.states[id],'attributes',{get(){throw new Error('Unexpected zero-count attributes');}});
  assert.equal(run(context(),hass),'');
});

test('availability stays native; missing or incomplete data adds no grey and visible alerts still apply',()=>{
  for (const raw of ['unknown','unavailable','',null,undefined,'-1','1.5','NaN']) {
    const hass=normal();hass.states[ids[0]]={state:raw,attributes:{alerts:[custom()]}};
    assert.equal(run(context(),hass),'');
  }
  const hass=normal();delete hass.states[ids[0]];
  assert.equal(run(context(),hass),'');
  hass.states[ids[0]]={state:'2',attributes:{alerts:[custom(target)],alerts_omitted:1}};
  assert.equal(run(context(),hass),'');
  hass.states[ids[0]]={state:'2',attributes:{alerts:[custom()],alerts_omitted:1}};
  assert.equal(accent(run(context(),hass)),red);
  hass.states[ids[0]]={state:'1',attributes:{}};
  assert.equal(run(context(),hass),'');
});

test('same connection shares one alert traversal across 100 cards with different policies',()=>{
  let visits=0;
  const records=new Proxy([...Array.from({length:1000},(_,i)=>custom('sensor.other_'+i)),custom(),pack()],{
    get(array,prop){if(prop===Symbol.iterator) return function*(){for(const item of array){visits++;yield item;}};return Reflect.get(array,prop);},
  });
  const hass=withAlerts(records);
  for(let i=0;i<100;i++) assert.equal(accent(run(context(i%2 ? {packs:['battery']} : {exclude_rules:['temperature'],packs:['battery']}),hass)),red);
  assert.equal(visits,1002);
  run(context(),{...hass,connection:{}});
  assert.equal(visits,2004,'Different HA connections have independent snapshots');
});

test('cache hits observe all lifecycle dependencies without reading watched entity availability',()=>{
  const hass=withAlerts([custom()]);run(context(),hass);
  const dependencies=new Set();
  const tracked={...hass,states:new Proxy(hass.states,{get(states,id){dependencies.add(id);return states[id];}})};
  assert.equal(accent(run(context(),tracked)),red);
  assert.deepEqual([...dependencies],ids);
});

test('attribute changes with unchanged counts and lifecycle changes invalidate the shared cache',()=>{
  const ctx=context();const hass=withAlerts([custom()]);
  assert.equal(accent(run(ctx,hass)),red);
  const first=globalThis[key].get(hass.connection);
  hass.states[ids[0]]=manager([custom(target)]);
  assert.equal(run(ctx,hass),'');assert.notEqual(globalThis[key].get(hass.connection),first);
  hass.states[ids[2]]=manager([custom()]);assert.equal(accent(run(ctx,hass)),orange);
  hass.states[ids[1]]=manager([custom()]);assert.equal(accent(run(ctx,hass)),red);
  for (const id of ids) hass.states[id]=manager();assert.equal(run(ctx,hass),'');
});

test('default configuration structure is cached and setConfig/option replacement rebuilds it',()=>{
  const ctx=context();const hass=withAlerts([custom()]);
  run(ctx,hass);const first=ctx._amConfig;run(ctx,hass);assert.equal(ctx._amConfig,first);
  ctx.config={...ctx.config,entity:target};assert.equal(run(ctx,hass),'');assert.notEqual(ctx._amConfig,first);
  ctx.config.alert_manager={entities:{[primary]:{}}};assert.equal(accent(run(ctx,hass)),red);
  ctx.config.alert_manager={entities:{[primary]:{exclude:true}}};assert.equal(run(ctx,hass),'');
});

test('teardown and disabling clear local policies; reactivation restores default detection',()=>{
  const ctx=context();const hass=withAlerts([custom()]);
  assert.equal(accent(run(ctx,hass)),red);ctx.teardown();assert.equal(ctx._amConfig,undefined);
  assert.equal(accent(run(ctx,hass)),red);ctx.config.alert_manager=false;
  assert.equal(run(ctx,forbiddenHass),'');assert.equal(ctx._amConfig,undefined);
  delete ctx.config.alert_manager;assert.equal(accent(run(ctx,hass)),red);
});

test('button, cover, climate and media-player cards preserve commands and only style the main icon',()=>{
  for(const card_type of ['button','cover','climate','media-player']) {
    const ctx=context(undefined,{card_type,tap_action:{action:'more-info'},sub_button:[{entity:target,tap_action:{action:'toggle'}}]});
    const before=JSON.stringify(ctx.config);const css=run(ctx,withAlerts([custom()]));
    assert.equal(accent(css),red);assert.equal(JSON.stringify(ctx.config),before);
    assert.ok(!/bubble-state|bubble-sub-button|ha-card \{/.test(css));
  }
});

test('renamed sensors preserve the severity of every lifecycle partition',()=>{
  const renamed = ['sensor.custom_active','sensor.custom_acknowledged','sensor.custom_pending'];
  const sensors = {active:renamed[0],acknowledge:renamed[1],pending:renamed[2]};
  for (const partition of [0,1,2]) {
    const hass = normal();
    renamed.forEach((id,index) => hass.states[id] = manager(index === partition ? [custom()] : []));
    assert.equal(accent(run(context({sensors}),hass)),partition === 2 ? orange : red);
    assert.equal(run(context(),hass),'','Custom source IDs are opt-in');
  }
});

test('partial sensor overrides keep default sources for the other partitions',()=>{
  const ctx = context({sensors:{active:'sensor.custom_active'}});
  const hass = withAlerts([custom()]);
  assert.equal(run(ctx,hass),'','The overridden default source is ignored');
  hass.states['sensor.custom_active'] = manager([custom()]);
  assert.equal(accent(run(ctx,hass)),red);
  hass.states['sensor.custom_active'] = manager();
  hass.states[ids[1]] = manager([custom()]);
  assert.equal(accent(run(ctx,hass)),red);
  hass.states[ids[1]] = manager();
  hass.states[ids[2]] = manager([custom()]);
  assert.equal(accent(run(ctx,hass)),orange);
});

test('configured source sensors are not added to the watched card entities',()=>{
  const sensors = {active:'sensor.custom_active'};
  assert.equal(run(context({sensors},{entity:undefined}),forbiddenHass),'');
  const hass = normal();
  hass.states[sensors.active] = manager([custom(sensors.active)]);
  assert.equal(run(context({sensors}),hass),'');
});

test('cards with different sources on one connection do not leak colors',()=>{
  const hass = withAlerts([custom()],2);
  hass.states['sensor.custom_active'] = manager([custom(target)]);
  const first = context();
  const second = context({sensors:{active:'sensor.custom_active',pending:'sensor.custom_pending'}});
  for (let i=0;i<3;i++) {
    assert.equal(accent(run(first,hass)),orange);
    assert.equal(run(second,hass),'');
  }
  hass.states['sensor.custom_active'] = manager([custom()]);
  assert.equal(accent(run(second,hass)),red);
  assert.equal(accent(run(first,hass)),orange);
});

test('replacing sensor options updates sources on an existing card',()=>{
  const ctx = context();
  const hass = withAlerts([custom()]);
  hass.states['sensor.custom_pending'] = manager([custom()]);
  assert.equal(accent(run(ctx,hass)),red);
  ctx.config.alert_manager = {sensors:{active:'sensor.custom_active',pending:'sensor.custom_pending'}};
  assert.equal(accent(run(ctx,hass)),orange);
  delete ctx.config.alert_manager;
  assert.equal(accent(run(ctx,hass)),red);
});

test('custom source cache hits observe all configured dependencies and share alert traversal',()=>{
  const renamed = ['sensor.custom_active','sensor.custom_acknowledged','sensor.custom_pending'];
  const options = {sensors:{active:renamed[0],acknowledge:renamed[1],pending:renamed[2]}};
  let visits = 0;
  const records = new Proxy([custom()],{get(array,prop) {
    if (prop === Symbol.iterator) return function*() { for(const item of array) {visits++;yield item;} };
    return Reflect.get(array,prop);
  }});
  const hass = {states:Object.fromEntries(renamed.map((id,index) => [id,manager(index === 0 ? records : [])])),connection:{}};
  const dependencies = new Set();
  const tracked = {...hass,states:new Proxy(hass.states,{get(states,id) {dependencies.add(id);return states[id];}})};
  for (let i=0;i<100;i++) assert.equal(accent(run(context(options),tracked)),red);
  assert.deepEqual([...dependencies],renamed);
  assert.equal(visits,1);
});
