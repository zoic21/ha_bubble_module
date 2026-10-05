const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const YAML = require('yaml');

const file = process.argv[2] || path.resolve(__dirname, '../dist/alert_manager.yaml');
const definition = YAML.parse(fs.readFileSync(file, 'utf8')).alert_manager;
const code = definition.code;
assert.ok(code, 'Module code missing');
const render = new Function('hass', 'onTeardown', 'return `'+code+'`;');
// This stub validates the test fixtures; it does not replace browser CSS validation.
globalThis.CSS = {supports: (property,value) => property === 'color' && /^(#[a-f0-9]{6}|red|orange|teal|rgb\([\d ,]+\)|var\(--[a-z-]+(?:, #[a-f0-9]{6})?\))$/i.test(value)};
const key = Symbol.for('bubble.alertManager.v5');
const ids = ['sensor.alert_manager_main_active','sensor.alert_manager_main_pending'];
const primary = 'switch.appliance';
const target = 'sensor.temperature';
const power = 'sensor.power';
const manager = (alerts=[]) => ({state:String(alerts.length),attributes:{alerts}});
const normal = () => ({states:Object.fromEntries(ids.map(id=>[id,manager()])),connection:{}});
const custom = (entity=primary,rule='temperature') => ({id:`rule:${rule}:${entity}`,entity_id:entity});
const pack = (entity=primary,id='battery') => ({id:`${id}:${entity}`,entity_id:entity});
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes=new Map();this.style={};this.className='';}
  appendChild(child){child.parentElement=this;this.children.push(child);return child;}
  get firstElementChild(){return this.children[0];}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name) ?? null;}
  querySelector(selector){
    for(const child of this.children){
      if(selector.startsWith('.') ? child.className.split(' ').includes(selector.slice(1)) : child.tagName===selector)return child;
      const found=child.querySelector(selector);if(found)return found;
    }
    return null;
  }
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
}
globalThis.document={createElement:tag=>new Element(tag)};
const plainContext = (options,extra={}) => {
  const card=new Element();const container=new Element();container.className='bubble-main-icon-container';card.appendChild(container);
  return {card,config:{card_type:'button',entity:primary,...extra,...(options === undefined ? {} : {alert_manager:options})}};
};
// Color/filter tests opt into card tint; plainContext exercises the actual default behavior.
const context = (options,extra={}) => plainContext({color_card:true,...options},extra);
const run = (ctx,hass) => render.call(ctx,hass,fn=>ctx.teardown=fn).trim();
const accent = css => /background-color:\s*color-mix\(in srgb,\s*(.*?) 16%,/.exec(css)?.[1] || '';
const red = 'var(--red-color, #f44336)';
const orange = 'var(--orange-color, #ff9800)';
const withAlerts = (alerts,partition=0) => {const hass=normal();hass.states[ids[partition]]=manager(alerts);return hass;};
const forbiddenHass = new Proxy({}, {get(){throw new Error('Unexpected hass access');}});

test('opt-in card tint watches the main entity; every lifecycle partition has the right color',()=>{
  for (const partition of [0,1]) {
    assert.equal(accent(run(context(),withAlerts([custom()],partition))),partition === 1 ? orange : red);
  }
  assert.equal(run(context(),normal()),'');
});

test('defaults show red active and orange pending badges without recoloring the card or main icon',()=>{
  const ctx=plainContext();
  for(const [partition,icon] of [[0,'mdi:exclamation'],[1,'mdi:clock-outline']]) {
    const css=run(ctx,withAlerts([custom()],partition));
    assert.equal(accent(css),'');
    assert.ok(!/bubble-main-icon\s*\{|--bubble-icon-background-color|background-color:\s*color-mix/.test(css));
    assert.ok(css.includes('color:'+(partition === 1 ? orange : red)));
    assert.ok(css.includes('border:1.5px solid '+(partition === 1 ? orange : red)));
    assert.ok(css.replace(/\s+/g,'').includes('background:var(--signature-alert-badge-background,var(--signature-card-background,var(--ha-card-background,var(--card-background-color,#fff))))'));
    assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),icon);
    assert.equal(ctx._amBadge.getAttribute('data-am-state'),partition === 1 ? 'pending' : 'active');
    assert.equal(ctx._amBadge.style.display,'none','A leftover node is hidden when module CSS is removed');
    assert.equal(ctx._amBadge.style.pointerEvents,'none');
  }
  const simultaneous=withAlerts([custom()]);simultaneous.states[ids[1]]=manager([custom()]);
  assert.ok(run(ctx,simultaneous).includes('color:'+red));
  assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:exclamation');
  assert.equal(run(ctx,normal()),'','Resolving alerts removes all module styling');
  assert.equal(ctx._amBadge,undefined);assert.equal(ctx.card.querySelector('.am-alert-badge'),null);
});

test('the general badge switch preserves colors for all entities, packs and supported card types',()=>{
  for (const card_type of ['button','cover','climate','media-player']) {
    const ctx=context({show_badge:false,packs:{battery:{}},entities:{[target]:{}}},{card_type});
    for (const entity of [primary,target]) for (const alert of [custom(entity),pack(entity)]) {
      for (const partition of [0,1]) {
        const css=run(ctx,withAlerts([alert],partition));
        assert.equal(accent(css),partition === 1 ? orange : red);
        assert.ok(!/am-alert-badge|overflow/.test(css),'No badge or overflow override when disabled');
        assert.equal(ctx._amBadge,undefined);
      }
    }
  }
  for (const show_badge of [undefined,true,'false',0,null]) {
    const ctx=plainContext({show_badge});run(ctx,withAlerts([custom()]));
    assert.ok(ctx._amBadge,'Only boolean false disables badges');
  }
});

test('badge colors apply by default, independently of card tint, and follow the winning entity pack',()=>{
  const options={colors:{active:'#112233',pending:'#223344'},
    entities:{[primary]:{packs:{battery:{colors:{active:'#334455',pending:'#445566'}}}}}};
  const uncolored=plainContext({...options,color_badge:false});
  assert.ok(run(uncolored,withAlerts([pack()])).includes('color:var(--signature-alert-badge-neutral-color, var(--primary-text-color, #000))'));
  const ctx=plainContext(options);
  for (const partition of [0,1]) {
    const css=run(ctx,withAlerts([pack()],partition));
    const expected=partition === 1 ? '#445566' : '#334455';
    assert.equal(accent(css),'','Badge color never opts into card tint');
    assert.ok(css.includes('border:1.5px solid '+expected));
    assert.ok(css.includes('color:'+expected));
  }
});

test('card tint requires YAML true, badge coloring requires YAML false to disable, and neither recolors the device icon',()=>{
  for(const color_card of [undefined,false,'true',1,null]) {
    assert.equal(accent(run(plainContext({color_card}),withAlerts([custom()]))),'');
  }
  for(const color_badge of [undefined,true,'true','false',1,0,null]) {
    assert.ok(run(plainContext({color_badge}),withAlerts([custom()])).includes('color:'+red));
  }
  assert.ok(run(plainContext({color_badge:false}),withAlerts([custom()])).includes('color:var(--signature-alert-badge-neutral-color, var(--primary-text-color, #000))'));
  for(const color_card of [false,true]) for(const color_badge of [false,true]) for(const show_badge of [false,true]) {
    const ctx=plainContext({color_card,color_badge,show_badge});
    const css=run(ctx,withAlerts([custom()]));
    assert.equal(accent(css),color_card ? red : '');
    assert.equal(!!ctx._amBadge,show_badge);
    assert.ok(!/bubble-main-icon\s*\{|--bubble-icon-background-color/.test(css));
    if(show_badge)assert.ok(css.includes('color:'+(color_badge ? red : 'var(--signature-alert-badge-neutral-color, var(--primary-text-color, #000))')));
  }
});

test('custom badge icons cascade entity pack, entity, global pack and general per lifecycle',()=>{
  const options={icons:{active:'mdi:alert',pending:'mdi:timer-sand'},
    packs:{battery:{icons:{active:'mdi:battery-alert'}}},
    entities:{[primary]:{icons:{active:'mdi:fridge-alert'},packs:{battery:{icons:{pending:'mdi:flash'}}}}}};
  const ctx=plainContext(options);
  for(const [alert,partition,expected] of [[custom(),0,'mdi:fridge-alert'],[custom(),1,'mdi:timer-sand'],
    [pack(),0,'mdi:fridge-alert'],[pack(),1,'mdi:flash']]) {
    run(ctx,withAlerts([alert],partition));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),expected);
  }
  ctx.config.alert_manager={icons:options.icons,packs:options.packs};
  run(ctx,withAlerts([pack()]));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:battery-alert');
  run(ctx,withAlerts([pack()],1));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:timer-sand');
  ctx.config.alert_manager={...options,entities:{[primary]:{packs:{battery:{icons:{active:'mdi:flash'}}}}}};
  run(ctx,withAlerts([pack()]));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:flash');
});

test('invalid and omitted icon names inherit safely without HTML or CSS injection',()=>{
  for(const value of ['',null,1,{},'bad-name','mdi:alert; display:none','<img src=x onerror=alert(1)>']) {
    const ctx=plainContext({icons:{active:'mdi:flash'},packs:{battery:{icons:{active:value}}},
      entities:{[primary]:{icons:{active:value},packs:{battery:{icons:{active:value}}}}}});
    run(ctx,withAlerts([pack()]));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:flash');
  }
  const ctx=plainContext({icons:{active:'custom:alarm-icon'}});
  run(ctx,withAlerts([custom()]));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'custom:alarm-icon');
});

test('icon-only pack settings enable that pack at the declared scope',()=>{
  const ctx=plainContext({entities:{[target]:{packs:{battery:{icons:{active:'mdi:battery-alert'}}}}}}, {sub_button:[{entity:target}]});
  assert.equal(run(ctx,withAlerts([pack()])),'');
  run(ctx,withAlerts([pack(target)]));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:battery-alert');
});

test('badge icons follow the same deterministic winning alert as enabled colors',()=>{
  const ctx=context({packs:{battery:{icons:{active:'mdi:battery-alert'},colors:{active:'#112233'}}},
    icons:{active:'mdi:flash'},colors:{active:'#223344'}});
  for(const alerts of [[custom(),pack()],[pack(),custom()]]) {
    assert.equal(accent(run(ctx,withAlerts(alerts))),'#112233');
    assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:battery-alert');
  }
});

test('badge nodes are reused, replaced with the native container and removed on teardown',()=>{
  const ctx=plainContext();const hass=withAlerts([custom()]);
  run(ctx,hass);const first=ctx._amBadge;run(ctx,hass);assert.equal(ctx._amBadge,first);
  const replacement=new Element();replacement.className='bubble-main-icon-container';
  ctx.card.children[0].remove();ctx.card.appendChild(replacement);
  run(ctx,hass);assert.notEqual(ctx._amBadge,first);assert.equal(first.parentElement,null);
  assert.equal(replacement.children.length,1);ctx.teardown();
  assert.equal(replacement.children.length,0);assert.equal(ctx._amBadge,undefined);assert.equal(ctx._amConfig,undefined);
});

test('a live update replaces the pre-icon configuration cache without changing source snapshots',()=>{
  const ctx=plainContext();const hass=withAlerts([custom()]);run(ctx,hass);
  const snapshot=globalThis[key].get(hass.connection).get(ids.join('\u0001'));
  ctx._amConfig={config:ctx.config,options:ctx.config.alert_manager,entities:[{id:primary}],colors:{}};
  run(ctx,hass);assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:exclamation');
  assert.equal(globalThis[key].get(hass.connection).get(ids.join('\u0001')),snapshot);
});

test('badge labels follow the active or pending state and locale',()=>{
  const ctx=plainContext();const hass=withAlerts([custom()]);hass.locale={language:'fr-FR'};
  run(ctx,hass);assert.equal(ctx._amBadge.getAttribute('aria-label'),'Alerte active');
  hass.states[ids[0]]=manager();hass.states[ids[1]]=manager([custom()]);
  run(ctx,hass);assert.equal(ctx._amBadge.getAttribute('title'),'Alerte en attente');
  hass.locale={language:'en-US'};run(ctx,hass);assert.equal(ctx._amBadge.getAttribute('aria-label'),'Pending alert');
});

test('badge preferences retain the index and dependencies without new sensor data',()=>{
  let visits=0;
  const records=new Proxy([custom()],{get(array,prop){
    if(prop===Symbol.iterator) return function*(){for(const item of array){visits++;yield item;}};
    return Reflect.get(array,prop);
  }});
  const hass=withAlerts(records);const reads=new Set();
  const tracked={...hass,states:new Proxy(hass.states,{get(states,id){reads.add(id);return states[id];}})};
  const ctx=plainContext();run(ctx,tracked);const first=ctx._amBadge;
  ctx.config.alert_manager={icons:{active:'mdi:flash'},color_badge:false};
  assert.ok(run(ctx,tracked).includes('color:var(--signature-alert-badge-neutral-color, var(--primary-text-color, #000))'));
  assert.equal(ctx._amBadge,first);assert.equal(first.firstElementChild.getAttribute('icon'),'mdi:flash');
  ctx.config.alert_manager={icons:{active:'mdi:flash'}};
  assert.ok(run(ctx,tracked).includes('color:'+red));assert.equal(ctx._amBadge,first);
  ctx.config.alert_manager={show_badge:false};assert.equal(run(ctx,tracked),'');assert.equal(ctx._amBadge,undefined);
  ctx.config.alert_manager={show_badge:true};run(ctx,tracked);assert.ok(ctx._amBadge);
  assert.equal(visits,1);assert.deepEqual([...reads],ids);
});

test('badges disappear when policies filter an alert or the source changes to acknowledged',()=>{
  const ctx=plainContext();const hass=withAlerts([custom()]);run(ctx,hass);assert.ok(ctx._amBadge);
  ctx.config.alert_manager={entities:{[primary]:{exclude:['temperature']}}};
  assert.equal(run(ctx,hass),'');assert.equal(ctx._amBadge,undefined);
  ctx.config.alert_manager={ignore_pending:true};
  hass.states[ids[0]]=manager();hass.states[ids[1]]=manager([custom()]);
  assert.equal(run(ctx,hass),'');assert.equal(ctx._amBadge,undefined);
  ctx.config.alert_manager={};run(ctx,hass);
  assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:clock-outline');
  hass.states[ids[1]]=manager();hass.states['sensor.alert_manager_main_acknowledge']=manager([custom()]);
  assert.equal(run(ctx,hass),'');assert.equal(ctx._amBadge,undefined);
});

test('card tint can remain enabled while badge coloring is explicitly disabled',()=>{
  const ctx=context({color_badge:false,colors:{active:'#112233',pending:'#223344'},
    entities:{[primary]:{packs:{battery:{colors:{active:'#334455',pending:'#445566'}}}}}});
  for (const partition of [0,1]) {
    const css=run(ctx,withAlerts([pack()],partition));
    const expected=partition === 1 ? '#445566' : '#334455';
    assert.equal(accent(css),expected);
    assert.ok(css.includes('border:1.5px solid var(--signature-alert-badge-neutral-color, var(--primary-text-color, #000))'));
  }
});

test('acknowledged alerts never color the card or become source dependencies',()=>{
  const hass=withAlerts([custom()]);
  const acknowledged='sensor.alert_manager_main_acknowledge';
  hass.states[acknowledged]=manager([custom(),pack()]);
  const reads=new Set();
  const tracked={...hass,states:new Proxy(hass.states,{get(states,id){reads.add(id);return states[id];}})};
  const ctx=context({packs:{battery:{}}});
  assert.equal(accent(run(ctx,tracked)),red);
  hass.states[ids[0]]=manager();
  assert.equal(run(ctx,tracked),'','Moving out of active restores the normal card colors');
  hass.states[ids[1]]=manager([pack()]);
  assert.equal(accent(run(ctx,tracked)),orange,'Ignored alerts never hide the pending color');
  assert.deepEqual([...reads],ids);
  assert.equal(reads.has(acknowledged),false);
});

test('default discovery covers sub-button arrays, main/bottom groups, targets and secondary entities',()=>{
  const extra = {sub_button:{main:[{entity:target},{group:[{entity:power}]}],bottom:[{group:[{entity:'sensor.bottom'}]}]},
    signature:{secondary:'sensor.secondary'},button_action:{tap_action:{target:{entity_id:['light.one','light.two']}}}};
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
  const ctx = context({packs:{battery:{colors:{active:'var(--sensor-color)'}}}},{name:'sensor.label',
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
  assert.equal(run(context({entities:{[primary]:{exclude:true,packs:{battery:{}}}}}),forbiddenHass),'');
});

test('ignore_pending affects only pending; active still wins',()=>{
  const ctx = context({entities:{[primary]:{ignore_pending:true}}},{sub_button:[{entity:target}]});
  assert.equal(run(ctx,withAlerts([custom()],1)),'');
  assert.equal(accent(run(ctx,withAlerts([custom(target)],1))),orange);
  const hass=withAlerts([custom()]);hass.states[ids[1]]=manager([custom(target)]);
  assert.equal(accent(run(ctx,hass)),red);
});

test('global pending policy can be overridden explicitly per entity',()=>{
  assert.equal(run(context({ignore_pending:true}),withAlerts([custom()],1)),'');
  assert.equal(accent(run(context({ignore_pending:true,entities:{[primary]:{ignore_pending:false}}}),withAlerts([custom()],1))),orange);
  for (const value of [false,'true',1]) {
    assert.equal(accent(run(context({entities:{[primary]:{ignore_pending:value}}}),withAlerts([custom()],1))),orange);
  }
});

test('direct Signature and Flow values remain monitored without auxiliary entity fields',()=>{
  const ctx=context(undefined,{signature:{secondary:target},signature_flow:{slots:{1:{primary:power,secondary:'sensor.secondary'}}}});
  for(const entity of [target,power,'sensor.secondary'])assert.equal(accent(run(ctx,withAlerts([custom(entity)]))),red);
  assert.equal(run(ctx,withAlerts([custom('sensor.unrelated')])),'');
});

test('all automatic packs are excluded by default and arbitrary future IDs work',()=>{
  for (const id of ['battery','connectivity','unavailable','unifi','execution_errors','flapping','update_available','future_pack']) {
    for (const partition of [0,1]) {
      const hass=withAlerts([pack(primary,id)],partition);
      assert.equal(run(context(),hass),'',id);
      assert.equal(accent(run(context({packs:{[id]:{}}}),hass)),partition === 1 ? orange : red,id);
    }
  }
});

test('global and entity pack objects activate cumulatively without leaking local packs',()=>{
  const ctx = context({packs:{battery:{}},entities:{[target]:{packs:{future_pack:{}}}}},{sub_button:[{entity:target}]});
  for (const entity of [primary,target]) assert.equal(accent(run(ctx,withAlerts([pack(entity)]))),red);
  assert.equal(accent(run(ctx,withAlerts([pack(target,'future_pack')]))),red);
  assert.equal(run(ctx,withAlerts([pack(primary,'future_pack')])),'');
  assert.equal(accent(run(context({packs:{battery:{}},entities:{[primary]:{packs:{}}}}),withAlerts([pack()]))),red);
});

test('rule exclusions apply by stable rule ID and preserve other errors and other entities',()=>{
  const ctx = context({entities:{[primary]:{exclude:['notification']}}},{sub_button:[{entity:target}]});
  for (const partition of [0,1]) {
    assert.equal(run(ctx,withAlerts([custom(primary,'notification')],partition)),'');
    assert.equal(accent(run(ctx,withAlerts([custom(primary,'notification'),custom(primary,'error')],partition))),partition === 1 ? orange : red);
    assert.equal(accent(run(ctx,withAlerts([custom(target,'notification')],partition))),partition === 1 ? orange : red);
  }
  assert.equal(accent(run(ctx,withAlerts([{...custom(),rule:'notification',message:'notification'}]))),red);
});

test('mixed rule and pack exclusions preserve other alerts and other entities',()=>{
  const ctx=context({packs:{battery:{},connectivity:{}},entities:{[primary]:{exclude:['notification','battery']}}},
    {sub_button:[{entity:target}]});
  for (const partition of [0,1]) {
    const expected=partition === 1 ? orange : red;
    assert.equal(run(ctx,withAlerts([custom(primary,'notification'),pack()],partition)),'');
    for (const remaining of [custom(primary,'error'),pack(primary,'connectivity')]) {
      assert.equal(accent(run(ctx,withAlerts([custom(primary,'notification'),pack(),remaining],partition))),expected);
    }
    for (const other of [custom(target,'notification'),pack(target)]) {
      assert.equal(accent(run(ctx,withAlerts([other],partition))),expected);
    }
  }
});

test('pack exclusions win over global, local and combined activation by stable pack ID',()=>{
  for (const activation of [{packs:{battery:{}}},{entities:{[primary]:{packs:{battery:{}}}}},
    {packs:{battery:{}},entities:{[primary]:{packs:{battery:{}}}}}]) {
    const options={...activation,entities:{[primary]:{...activation.entities?.[primary],exclude:['battery']}}};
    const ctx=context(options);
    for (const partition of [0,1]) {
      assert.equal(run(ctx,withAlerts([{...pack(),rule:'different',message:'different'}],partition)),'');
      assert.equal(accent(run(ctx,withAlerts([custom()],partition))),partition === 1 ? orange : red);
    }
  }
});

test('an excluded ID suppresses both a rule and an enabled pack with that ID',()=>{
  const ctx=context({packs:{battery:{}},entities:{[primary]:{exclude:['battery']}}});
  for (const partition of [0,1]) {
    for (const records of [[pack()],[custom(primary,'battery')],[pack(),custom(primary,'battery')]]) {
      assert.equal(run(ctx,withAlerts(records,partition)),'');
    }
  }
});

test('empty or false exclusions keep the entity watched and unknown IDs do not activate packs',()=>{
  for (const exclude of [[],false,['unknown_rule','future_pack']]) {
    const ctx=context({packs:{battery:{}},entities:{[primary]:{exclude}}});
    for (const partition of [0,1]) {
      for (const records of [[custom()],[pack()]]) {
        assert.equal(accent(run(ctx,withAlerts(records,partition))),partition === 1 ? orange : red);
      }
      assert.equal(run(ctx,withAlerts([pack(primary,'future_pack')],partition)),'');
    }
  }
});

test('excluding active alerts allows an eligible pending alert to determine the color',()=>{
  const ctx=context({packs:{battery:{},connectivity:{colors:{pending:'#123456'}}},
    entities:{[primary]:{exclude:['notification','battery']}}});
  const hass=withAlerts([custom(primary,'notification'),pack()]);
  hass.states[ids[1]]=manager([pack(primary,'connectivity')]);
  assert.equal(accent(run(ctx,hass)),'#123456');
  hass.states[ids[1]]=manager();
  assert.equal(run(ctx,hass),'');
});

test('replacing entity exclusions refreshes the policy without traversing unchanged alerts',()=>{
  let visits=0;
  const records=new Proxy([custom(),pack()],{get(array,prop) {
    if (prop === Symbol.iterator) return function*(){for (const item of array){visits++;yield item;}};
    return Reflect.get(array,prop);
  }});
  const hass=withAlerts(records);
  const ctx=context({packs:{battery:{}}});
  assert.equal(accent(run(ctx,hass)),red);
  ctx.config.alert_manager={color_card:true,packs:{battery:{}},entities:{[primary]:{exclude:['temperature','battery']}}};
  assert.equal(run(ctx,hass),'');
  ctx.config.alert_manager={color_card:true,packs:{battery:{}},entities:{[primary]:{exclude:['battery']}}};
  assert.equal(accent(run(ctx,hass)),red);
  ctx.config={...ctx.config,alert_manager:{color_card:true,packs:{battery:{}},entities:{[primary]:{exclude:[]}}}};
  assert.equal(accent(run(ctx,hass)),red);
  assert.equal(visits,2);
});

test('pack pending policies and simultaneous custom/pack alerts use lifecycle severity',()=>{
  const ctx = context({packs:{battery:{}},entities:{[primary]:{ignore_pending:true}}});
  assert.equal(run(ctx,withAlerts([pack()],1)),'');
  assert.equal(accent(run(ctx,withAlerts([pack()]))),red);
  const hass=withAlerts([custom()],1);hass.states[ids[0]]=manager([pack()]);
  assert.equal(accent(run(context({packs:{battery:{}}}),hass)),red);
});

test('a global pack pending mask affects only that pack and preserves active alerts',()=>{
  const ctx=context({packs:{battery:{ignore_pending:true},connectivity:{}}});
  assert.equal(run(ctx,withAlerts([pack()],1)),'');
  assert.equal(accent(run(ctx,withAlerts([pack(primary,'connectivity')],1))),orange);
  assert.equal(accent(run(ctx,withAlerts([custom()],1))),orange);
  assert.equal(accent(run(ctx,withAlerts([pack()]))),red);
});

test('an entity pack pending mask is scoped to one entity and one pack',()=>{
  const ctx=context({packs:{battery:{},connectivity:{}},entities:{[target]:{packs:{battery:{ignore_pending:true}}}}},
    {sub_button:[{entity:target}]});
  assert.equal(run(ctx,withAlerts([pack(target)],1)),'');
  assert.equal(accent(run(ctx,withAlerts([pack()],1))),orange);
  assert.equal(accent(run(ctx,withAlerts([pack(target,'connectivity')],1))),orange);
  assert.equal(accent(run(ctx,withAlerts([custom(target)],1))),orange);
  assert.equal(accent(run(ctx,withAlerts([pack(target)]))),red);
});

test('pack pending settings inherit and explicit booleans follow specificity',()=>{
  for (const [general,globalPack,entity,localPack,ignored] of [
    [undefined,undefined,undefined,undefined,false],
    [true,undefined,undefined,undefined,true],
    [true,false,undefined,undefined,false],
    [false,true,undefined,undefined,true],
    [false,true,false,undefined,false],
    [false,false,true,undefined,true],
    [false,true,true,false,false],
    [true,false,false,true,true],
  ]) {
    const options={ignore_pending:general,packs:{battery:{ignore_pending:globalPack}},
      entities:{[primary]:{ignore_pending:entity,packs:{battery:{ignore_pending:localPack}}}}};
    assert.equal(accent(run(context(options),withAlerts([pack()],1))),ignored ? '' : orange,
      JSON.stringify([general,globalPack,entity,localPack]));
  }
});

test('a pack exception to the global pending mask never re-enables custom rule pending alerts',()=>{
  const ctx=context({ignore_pending:true,packs:{battery:{ignore_pending:false},connectivity:{}}});
  assert.equal(accent(run(ctx,withAlerts([pack()],1))),orange);
  assert.equal(run(ctx,withAlerts([custom()],1)),'');
  assert.equal(run(ctx,withAlerts([pack(primary,'connectivity')],1)),'');
  assert.equal(accent(run(ctx,withAlerts([custom()]))),red);
});

test('pending masks discard only matching records when several alerts coexist',()=>{
  const ctx=context({packs:{battery:{ignore_pending:true},connectivity:{colors:{pending:'#123456'}}}});
  const hass=withAlerts([pack(),pack(primary,'connectivity')],1);
  assert.equal(accent(run(ctx,hass)),'#123456');
  hass.states[ids[0]]=manager([pack()]);
  assert.equal(accent(run(ctx,hass)),red);
});

test('changing pending pack options refreshes the policy without traversing unchanged alerts',()=>{
  let visits=0;
  const records=new Proxy([pack()],{get(array,prop) {
    if (prop === Symbol.iterator) return function*() {for(const record of array) {visits++;yield record;}};
    return Reflect.get(array,prop);
  }});
  const hass=withAlerts(records,1);
  const ctx=context({packs:{battery:{ignore_pending:true}}});
  assert.equal(run(ctx,hass),'');
  ctx.config.alert_manager={color_card:true,packs:{battery:{ignore_pending:false}}};
  assert.equal(accent(run(ctx,hass)),orange);
  ctx.config.alert_manager={color_card:true,entities:{[primary]:{packs:{battery:{ignore_pending:true}}}}};
  assert.equal(run(ctx,hass),'');
  assert.equal(visits,1);
});

test('colors cascade entity > pack > general separately for each lifecycle state',()=>{
  const options={packs:{battery:{colors:{active:'#333333',pending:'#444444'}}},
    colors:{active:'#111111',pending:'#222222'},entities:{[primary]:{colors:{active:'#555555'}}}};
  assert.equal(accent(run(context(options),withAlerts([pack()]))),'#555555');
  assert.equal(accent(run(context(options),withAlerts([pack()],1))),'#444444');
  assert.equal(accent(run(context(options),withAlerts([custom()],1))),'#222222');
  const partial={packs:{battery:{colors:{pending:'#444444'}}},colors:{active:'#111111'}};
  assert.equal(accent(run(context(partial),withAlerts([pack()]))),'#111111');
  assert.equal(accent(run(context(partial),withAlerts([pack()],1))),'#444444');
  assert.equal(accent(run(context({packs:{battery:{colors:{active:'#333333'}}}}),withAlerts([pack()],1))),orange);
});

test('valid CSS colors work; invalid colors fall back without emitting CSS injection',()=>{
  for (const value of ['#123456','teal','rgb(1, 2, 3)','var(--my-color)']) {
    const css=run(context({colors:{active:value}}),withAlerts([custom()]));
    const expected=value === 'teal' ? 'var(--teal-color, #009688)' : value;
    assert.equal(accent(css),expected);
    assert.ok(css.includes(`color-mix(in srgb,${expected} 16%`));
  }
  const options={packs:{battery:{colors:{active:'#123456'}}},colors:{active:'not-a-color'},entities:{[primary]:{colors:{active:'red; } body {display:none'}}}};
  const css=run(context(options),withAlerts([pack()]));
  assert.equal(accent(css),'#123456');assert.ok(!css.includes('display:none'));
});

test('declaring a pack with colors activates it without a separate list',()=>{
  const ctx=context({packs:{battery:{colors:{active:'#123456'}}}});
  assert.equal(accent(run(ctx,withAlerts([pack()]))),'#123456');
  assert.equal(accent(run(ctx,withAlerts([pack()],1))),orange);
});

test('entity pack colors override entity colors and missing states inherit independently',()=>{
  const options={colors:{active:'#111111',pending:'#222222'},packs:{battery:{colors:{active:'#333333',pending:'#444444'}}},
    entities:{[primary]:{colors:{active:'#555555'},packs:{battery:{colors:{pending:'#666666'}}}}}};
  const ctx=context(options);
  assert.equal(accent(run(ctx,withAlerts([pack()]))),'#555555','Missing local active inherits entity active');
  assert.equal(accent(run(ctx,withAlerts([pack()],1))),'#666666','Local pack pending wins');
  assert.equal(accent(run(ctx,withAlerts([custom()],1))),'#222222','Local pack colors never affect custom rules');
  ctx.config.alert_manager={color_card:true,...options,entities:{[primary]:{colors:{active:'#555555'},packs:{battery:{colors:{active:'#777777'}}}}}};
  assert.equal(accent(run(ctx,withAlerts([pack()]))),'#777777');
  assert.equal(accent(run(ctx,withAlerts([pack()],1))),'#444444','Missing local pending inherits global pack pending');
});

test('a local pack object enables only that entity and inherits global colors',()=>{
  const ctx=context({colors:{active:'#111111'},entities:{[target]:{packs:{future_pack:{colors:{pending:'#222222'}}}}}},
    {sub_button:[{entity:target}]});
  assert.equal(run(ctx,withAlerts([pack(primary,'future_pack')])),'');
  assert.equal(accent(run(ctx,withAlerts([pack(target,'future_pack')]))),'#111111');
  assert.equal(accent(run(ctx,withAlerts([pack(target,'future_pack')],1))),'#222222');
});

test('empty local pack colors inherit and invalid local colors cannot inject CSS',()=>{
  const options={
    packs:{battery:{colors:{active:'#123456',pending:'#654321'}}},
    entities:{[primary]:{packs:{battery:{}}}},
  };
  const ctx=context(options);
  assert.equal(accent(run(ctx,withAlerts([pack()]))),'#123456');
  ctx.config.alert_manager={color_card:true,...options,entities:{[primary]:{packs:{battery:{colors:{active:'red; } body {display:none'}}}}}};
  const css=run(ctx,withAlerts([pack()]));
  assert.equal(accent(css),'#123456');
  assert.ok(!css.includes('display:none'));
  assert.equal(accent(run(ctx,withAlerts([pack()],1))),'#654321');
});

test('replacing pack options updates activation and colors on an existing card',()=>{
  const ctx=context({packs:{battery:{}}});
  const hass=withAlerts([pack()]);
  assert.equal(accent(run(ctx,hass)),red);
  ctx.config.alert_manager={color_card:true,packs:{battery:{colors:{active:'#123456'}}}};
  assert.equal(accent(run(ctx,hass)),'#123456');
  ctx.config.alert_manager={color_card:true,packs:{}};
  assert.equal(run(ctx,hass),'');
  assert.equal(accent(run(ctx,withAlerts([custom()]))),red);
});

test('equal severity chooses first card entity; same-entity ties are stable across list order',()=>{
  const options={packs:{battery:{colors:{active:'#111111'}},connectivity:{colors:{active:'#222222'}}},
    entities:{[target]:{colors:{active:'#333333'}}}};
  const ctx=context(options,{sub_button:[{entity:target}]});
  const records=[pack(primary,'connectivity'),custom(target),pack()];
  assert.equal(accent(run(ctx,withAlerts(records))),'#111111');
  assert.equal(accent(run(ctx,withAlerts([...records].reverse()))),'#111111');
  const hass=withAlerts([custom(target)]);hass.states[ids[1]]=manager([pack()]);
  assert.equal(accent(run(ctx,hass)),'#333333');
});

test('unsupported and entity-free cards do not access HA or build an index',()=>{
  delete globalThis[key];
  const contexts=[context(undefined,{card_type:'separator'}),context(undefined,{card_type:'pop-up'}),
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
  for(let i=0;i<100;i++) assert.equal(accent(run(context(i%2 ? {packs:{battery:{}}} : {entities:{[primary]:{exclude:['temperature']}},packs:{battery:{}}}),hass)),red);
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
  const first=globalThis[key].get(hass.connection).get(ids.join('\u0001'));
  hass.states[ids[0]]=manager([custom(target)]);
  assert.equal(run(ctx,hass),'');assert.notEqual(globalThis[key].get(hass.connection).get(ids.join('\u0001')),first);
  hass.states[ids[1]]=manager([custom()]);assert.equal(accent(run(ctx,hass)),orange);
  hass.states[ids[0]]=manager([custom()]);assert.equal(accent(run(ctx,hass)),red);
  for (const id of ids) hass.states[id]=manager();assert.equal(run(ctx,hass),'');
});

test('default configuration structure is cached and setConfig/option replacement rebuilds it',()=>{
  const ctx=context();const hass=withAlerts([custom()]);
  run(ctx,hass);const first=ctx._amConfig;run(ctx,hass);assert.equal(ctx._amConfig,first);
  ctx.config={...ctx.config,entity:target};assert.equal(run(ctx,hass),'');assert.notEqual(ctx._amConfig,first);
  ctx.config.alert_manager={color_card:true,entities:{[primary]:{}}};assert.equal(accent(run(ctx,hass)),red);
  ctx.config.alert_manager={color_card:true,entities:{[primary]:{exclude:true}}};assert.equal(run(ctx,hass),'');
});

test('teardown and unsupported cards clear local policies; reactivation restores default detection',()=>{
  const ctx=context();const hass=withAlerts([custom()]);
  assert.equal(accent(run(ctx,hass)),red);ctx.teardown();assert.equal(ctx._amConfig,undefined);
  assert.equal(accent(run(ctx,hass)),red);ctx.config.card_type='separator';
  assert.equal(run(ctx,forbiddenHass),'');assert.equal(ctx._amConfig,undefined);
  ctx.config.card_type='button';assert.equal(accent(run(ctx,hass)),red);
});

test('card tint and badges preserve commands and never recolor the main icon',()=>{
  for(const card_type of ['button','cover','climate','media-player']) {
    const ctx=context(undefined,{card_type,tap_action:{action:'more-info'},sub_button:[{entity:target,tap_action:{action:'toggle'}}]});
    const before=JSON.stringify(ctx.config);const css=run(ctx,withAlerts([custom()]));
    assert.equal(accent(css),red);assert.equal(JSON.stringify(ctx.config),before);
    assert.ok(!/bubble-state|bubble-sub-button|ha-card \{|bubble-main-icon\s*\{|--bubble-icon-background-color/.test(css));
  }
});

test('renamed sensors preserve the severity of every lifecycle partition',()=>{
  const renamed = ['sensor.custom_active','sensor.custom_pending'];
  const sensors = {active:renamed[0],pending:renamed[1]};
  for (const partition of [0,1]) {
    const hass = normal();
    renamed.forEach((id,index) => hass.states[id] = manager(index === partition ? [custom()] : []));
    assert.equal(accent(run(context({sensors}),hass)),partition === 1 ? orange : red);
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
  const hass = withAlerts([custom()],1);
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

test('interleaved source pairs on one connection each traverse unchanged alerts only once',()=>{
  let visits=0;
  const records=new Proxy([custom()],{get(array,prop) {
    if (prop === Symbol.iterator) return function*() {for(const record of array) {visits++;yield record;}};
    return Reflect.get(array,prop);
  }});
  const hass=withAlerts(records);
  hass.states['sensor.custom_active']=manager(records);
  hass.states['sensor.custom_pending']=manager();
  const standard=context(),customSources=context({sensors:{active:'sensor.custom_active',pending:'sensor.custom_pending'}});
  for(let i=0;i<100;i++) assert.equal(accent(run(i%2 ? customSources : standard,hass)),red);
  assert.equal(visits,2);
  hass.states['sensor.custom_active']=manager([custom(target)]);
  assert.equal(run(customSources,hass),'');
  assert.equal(accent(run(standard,hass)),red);
  assert.equal(visits,2,'Updating custom sources preserves the default-source index');
});

test('history-only changes preserve a revisioned index and still record source dependencies',()=>{
  let visits=0;
  const records=new Proxy([custom()],{get(array,prop) {
    if (prop === Symbol.iterator) return function*() {for(const record of array) {visits++;yield record;}};
    return Reflect.get(array,prop);
  }});
  const hass=withAlerts(records);
  const revisioned=(alerts,alerts_revision,history_revision=0,last_changed='2026-10-04T06:00:00Z')=>({
    ...manager(alerts),last_changed,attributes:{alerts,alerts_revision,history_revision},
  });
  hass.states[ids[0]]=revisioned(records,1);
  const ctx=context();
  assert.equal(accent(run(ctx,hass)),red);
  const reads=new Set();
  const tracked={...hass,states:new Proxy(hass.states,{get(states,id){reads.add(id);return states[id];}})};
  hass.states[ids[0]]=revisioned(records,1,1);
  assert.equal(accent(run(ctx,tracked)),red);
  assert.equal(visits,1);
  assert.deepEqual([...reads],ids);
  hass.states[ids[0]]=revisioned([custom(target)],2,1);
  assert.equal(run(ctx,hass),'','A new revision refreshes alerts at an unchanged count');
  hass.states[ids[0]]=revisioned(records,2,1,'2026-10-04T06:05:00Z');
  assert.equal(accent(run(ctx,hass)),red,'A sensor re-created with the same revision refreshes its index');
  assert.equal(visits,2);
  hass.states[ids[0]]={...revisioned(records,2),state:'0'};
  assert.equal(run(ctx,hass),'','A changed count invalidates even when the revision is unchanged');
});

test('replacing sensor options updates sources on an existing card',()=>{
  const ctx = context();
  const hass = withAlerts([custom()]);
  hass.states['sensor.custom_pending'] = manager([custom()]);
  assert.equal(accent(run(ctx,hass)),red);
  ctx.config.alert_manager = {color_card:true,sensors:{active:'sensor.custom_active',pending:'sensor.custom_pending'}};
  assert.equal(accent(run(ctx,hass)),orange);
  delete ctx.config.alert_manager;
  assert.equal(accent(run(ctx,hass)),'');
  assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:exclamation','Default source is restored independently of color options');
  ctx.config.alert_manager={color_card:true};assert.equal(accent(run(ctx,hass)),red);
});

test('custom source cache hits observe all configured dependencies and share alert traversal',()=>{
  const renamed = ['sensor.custom_active','sensor.custom_pending'];
  const options = {sensors:{active:renamed[0],pending:renamed[1]}};
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

test('renamed sensors refresh cached alerts and lifecycle colors at unchanged counts',()=>{
  const ctx=context({sensors:{active:'sensor.custom_active',pending:'sensor.custom_pending'}});
  const hass=normal();
  hass.states['sensor.custom_active']=manager([custom()]);
  assert.equal(accent(run(ctx,hass)),red);
  hass.states['sensor.custom_active']=manager([custom(target)]);
  assert.equal(run(ctx,hass),'');
  hass.states['sensor.custom_pending']=manager([custom()]);
  assert.equal(accent(run(ctx,hass)),orange);
  ctx.config.alert_manager={color_card:true,...ctx.config.alert_manager,ignore_pending:true};
  assert.equal(run(ctx,hass),'');
  hass.states['sensor.custom_active']=manager([custom()]);
  assert.equal(accent(run(ctx,hass)),red);
});

test('distribution metadata and documented versions agree',() => {
  assert.equal(definition.name,'Alert Manager');
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

test('the documented general badge option hides only the badge',()=>{
  const doc=fs.readFileSync(path.resolve(__dirname,'../doc/README.md'),'utf8');
  const options=[...doc.matchAll(/```yaml\s*\n([\s\S]*?)```/g)]
    .map(([,example])=>YAML.parse(example).alert_manager)
    .find(options=>options?.show_badge === false);
  assert.ok(options,'A working show_badge: false example is documented');
  const ctx=plainContext(options);
  assert.equal(run(ctx,withAlerts([custom()])),'');assert.equal(ctx._amBadge,undefined);
  const tinted=context(options);assert.equal(accent(run(tinted,withAlerts([custom()]))),red);
  assert.equal(tinted._amBadge,undefined);
});

test('documented icon and color examples match the badge defaults, opt-out and cascade',()=>{
  const doc=fs.readFileSync(path.resolve(__dirname,'../doc/README.md'),'utf8');
  const examples=[...doc.matchAll(/```yaml\s*\n([\s\S]*?)```/g)].map(([,example])=>YAML.parse(example).alert_manager).filter(Boolean);
  const icons=examples.find(options=>options.icons&&options.entities);
  assert.ok(icons);const ctx=plainContext(icons);
  const entity='sensor.fridge_temperature';
  run(ctx,withAlerts([pack(entity)],0));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:fridge-alert');
  run(ctx,withAlerts([pack(entity)],1));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:flash');
  run(ctx,withAlerts([custom(entity)],1));assert.equal(ctx._amBadge.firstElementChild.getAttribute('icon'),'mdi:clock-outline');
  const switches=examples.find(options=>options.color_card === true&&options.color_badge === true);
  assert.ok(switches);const enabled=plainContext(switches);const css=run(enabled,withAlerts([custom()]));
  assert.equal(accent(css),red);assert.ok(css.includes('border:1.5px solid '+red));
  const monochrome=examples.find(options=>options.color_badge === false);
  assert.ok(monochrome);const black=run(plainContext(monochrome),withAlerts([custom()]));
  assert.equal(accent(black),'');assert.ok(black.includes('border:1.5px solid var(--signature-alert-badge-neutral-color, var(--primary-text-color, #000))'));
});

test('documented pack examples activate declared packs for active alerts',()=>{
  const doc=fs.readFileSync(path.resolve(__dirname,'../doc/README.md'),'utf8');
  let checked=0;
  for (const [,example] of doc.matchAll(/```yaml\s*\n([\s\S]*?)```/g)) {
    const options=YAML.parse(example).alert_manager;
    if (!options) continue;
    const checks=Object.keys(options.packs || {}).map(id=>({id,entity:primary,policy:{}}));
    for (const [entity,policy] of Object.entries(options.entities || {})) {
      for (const id of Object.keys(policy.packs || {})) checks.push({id,entity,policy});
    }
    for (const {id,entity,policy} of checks) {
      if (policy.exclude === true) continue;
      assert.notEqual(accent(run(context(options),withAlerts([pack(entity,id)]))),'',`${entity}: ${id}`);
      checked++;
    }
  }
  assert.ok(checked>0);
});

test('documented entity exclusion lists filter rules and packs while preserving other alerts',()=>{
  const doc=fs.readFileSync(path.resolve(__dirname,'../doc/README.md'),'utf8');
  let rules=0,packs=0;
  for (const [,example] of doc.matchAll(/```yaml\s*\n([\s\S]*?)```/g)) {
    const options=YAML.parse(example).alert_manager;
    if (!options) continue;
    for (const [entity,policy] of Object.entries(options.entities || {})) {
      if (!Array.isArray(policy.exclude)) continue;
      const enabled=new Set([...Object.keys(options.packs || {}),...Object.keys(policy.packs || {})]);
      for (const id of policy.exclude) {
        for (const partition of [0,1]) {
          assert.equal(run(context(options),withAlerts([custom(entity,id)],partition)),'');
          if (enabled.has(id)) assert.equal(run(context(options),withAlerts([pack(entity,id)],partition)),'');
        }
        rules++;
        if (enabled.has(id)) packs++;
      }
      assert.notEqual(accent(run(context(options),withAlerts([custom(entity,'other_rule')]))),'');
      for (const id of enabled) {
        if (!policy.exclude.includes(id)) {
          assert.notEqual(accent(run(context(options),withAlerts([pack(entity,id)]))),'');
        }
      }
    }
  }
  assert.ok(rules>0);
  assert.ok(packs>0);
});

test('documented pending masks hide pack alerts and explicit entity pack exceptions restore them',()=>{
  const doc=fs.readFileSync(path.resolve(__dirname,'../doc/README.md'),'utf8');
  let checked=0;
  for (const [,example] of doc.matchAll(/```yaml\s*\n([\s\S]*?)```/g)) {
    const options=YAML.parse(example).alert_manager;
    if (!options) continue;
    for (const [id,spec] of Object.entries(options.packs || {})) {
      if (spec?.ignore_pending !== true) continue;
      assert.equal(run(context(options),withAlerts([pack(primary,id)],1)),'');
      for (const [entity,policy] of Object.entries(options.entities || {})) {
        if (policy.packs?.[id]?.ignore_pending !== false) continue;
        assert.notEqual(accent(run(context(options),withAlerts([pack(entity,id)],1))),'');
        checked++;
      }
    }
  }
  assert.ok(checked>0);
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
