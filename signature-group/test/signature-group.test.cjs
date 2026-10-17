const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {loadModule} = require('../../shared/test/module.cjs');
const dom = require('../../shared/test/dom.cjs');
const definition = loadModule('signature-group');

function fixture() {
  const location = {pathname:'/lovelace/home'};
  const frames = new Map(); let nextFrame = 0;
  class ResizeObserver {
    constructor(callback) { this.callback=callback; this.targets=new Set(); }
    observe(target) { this.targets.add(target); }
    disconnect() { this.targets.clear(); }
  }
  const context = vm.createContext({...dom, document:{createElement:tag=>new dom.Element(tag)}, window:{}, location, queueMicrotask,
    ResizeObserver,requestAnimationFrame:callback=>{const id=++nextFrame;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id)});
  const render = vm.runInContext('(function(hass,onTeardown,renderTemplate,checkConditionsMet){return `' + definition.code + '`;})', context);
  const hass = {states:{'vacuum.robot':{state:'cleaning',attributes:{friendly_name:'Robot'}},'sensor.printer':{state:'idle',attributes:{}}}};
  const checks = [];
  const evaluate = conditions => conditions.every(c => {
    if(c.condition === 'and') return evaluate(c.conditions);
    if(c.condition === 'or') return c.conditions.some(z=>evaluate([z]));
    if(c.condition === 'not') return !evaluate(c.conditions);
    const state=hass.states[c.entity]?.state;
    return c.state !== undefined ? (Array.isArray(c.state) ? c.state.includes(state) : state === c.state) : state !== c.state_not;
  });
  const make = config => {
    const card=new dom.Element(), host=new dom.Element(), names=new dom.Element();
    card.append(host);host.append(names);
    const ctx={config,card,elements:{mainContainer:host,nameContainer:names,popUpContainer:host},isConnected:true,events:[]};
    ctx.dispatchEvent=event=>{ctx.events.push(event);return true;};
    const run=()=>render.call(ctx,hass,fn=>ctx.teardown=fn,value=>value,conditions=>{checks.push(conditions);return evaluate(conditions);});
    ctx.updateBubbleCard=run;
    return {ctx,run,get text(){return ctx._signatureGroup?.summary?.textContent},get count(){return ctx._signatureGroup?.badge?.textContent}};
  };
  const producer=cards=>make({card_type:'pop-up',hash:'#activities',modules:['signature_group'],cards});
  const consumer=(options={})=>make({card_type:'button',button_type:'name',signature_group:options,button_action:{tap_action:{action:'navigate',navigation_path:'#activities'}}});
  return {context,location,hass,make,producer,consumer,checks,frames};
}
const robot={type:'custom:bubble-card',card_type:'button',entity:'vacuum.robot',name:'Aspirateur',visibility:[{condition:'state',entity:'vacuum.robot',state:'cleaning'}]};

test('counts all visible cards, including connected idle devices, without changing their configuration',()=>{
  const f=fixture();const cards=[robot,{type:'custom:bubble-card',card_type:'button',entity:'sensor.printer',name:'H2S',visibility:[{condition:'state',entity:'sensor.printer',state_not:'offline'}]}];
  const original=structuredClone(cards), source=f.producer(cards), button=f.consumer();
  source.run();button.run();assert.equal(button.count,'2');assert.equal(button.text,'Aspirateur, H2S');
  f.hass.states['vacuum.robot'].state='docked';button.run();assert.equal(button.count,'1');assert.equal(button.text,'H2S');
  f.hass.states['sensor.printer'].state='offline';source.run();button.run();assert.equal(button.count,'0');assert.equal(button.text,'Aucune activité');
  assert.equal(source.ctx._signatureGroup.empty.hidden,false);assert.deepEqual(cards,original);
  source.ctx.teardown();button.ctx.teardown();
});

test('consumer mounted before its closed popup updates as soon as the source registers',async()=>{
  const f=fixture(),button=f.consumer();button.run();assert.equal(button.count,'—');assert.equal(button.text,'Popup non initialisée');
  const source=f.producer([robot]);source.run();await Promise.resolve();assert.equal(button.count,'1');
  assert.equal(button.text,'Aspirateur');source.ctx.teardown();await Promise.resolve();assert.equal(button.count,'—');button.ctx.teardown();
});

test('nested grids and conditional cards inherit guards while headings and nested popups are excluded',()=>{
  const f=fixture();const source=f.producer([
    {type:'heading',heading:'Machines'},
    {type:'custom:bubble-card',card_type:'separator',name:'Machines'},
    {type:'grid',visibility:[{condition:'state',entity:'sensor.printer',state:'idle'}],cards:[
      {type:'conditional',conditions:[{condition:'state',state:'cleaning'}],card:robot}
    ]},
    {type:'custom:bubble-card',card_type:'pop-up',cards:[robot]},
    {type:'markdown',content:'Aucune activité'}
  ]), button=f.consumer();source.run();button.run();assert.equal(button.count,'1');
  assert.equal(f.checks.at(-1).length,3);assert.equal(f.checks.at(-1)[1].entity,'vacuum.robot');
  f.hass.states['sensor.printer'].state='offline';button.run();assert.equal(button.count,'0');
  source.ctx.teardown();button.ctx.teardown();
});

test('summary limits, labels and native action references remain configurable',()=>{
  const f=fixture(),source=f.producer([robot,{type:'tile',entity:'vacuum.robot'}, {type:'tile',name:'Télévision'}]),button=f.consumer();
  source.run();button.run();assert.equal(button.text,'Aspirateur, Robot +1');
  button.ctx.config.signature_group.max_names=0;button.run();assert.equal(button.text,'+3');
  button.ctx.config.signature_group.max_names=5;button.run();assert.equal(button.text,'Aspirateur, Robot, Télévision');
  source.ctx.config={...source.ctx.config,cards:[{type:'tile',name:'<img src=x onerror=alert(1)>'}]};source.run();button.run();
  assert.equal(button.count,'1');assert.equal(button.text,'<img src=x onerror=alert(1)>');assert.equal(button.ctx._signatureGroup.summary.children.length,0);
  source.ctx.teardown();button.ctx.teardown();
});

test('same-version renders reuse nodes, hot reload and teardown remove all registry references',async()=>{
  const f=fixture(),source=f.producer([robot]),button=f.consumer();source.run();button.run();
  const before=button.ctx._signatureGroup;button.run();assert.equal(before,button.ctx._signatureGroup);
  const node=before.summary;before.version='old';button.run();assert.notEqual(before,button.ctx._signatureGroup);assert.equal(node.parentNode,null);
  assert.equal(button.ctx.elements.nameContainer.children.length,1);
  const registry=f.context.window[Symbol.for('ha.signature.group.registry')];assert.equal(registry.listeners.size,1);
  source.ctx.teardown();button.ctx.teardown();await Promise.resolve();assert.equal(registry.listeners.size,0);assert.equal(registry.sources.size,0);
});

test('identical hashes in different views do not mix and unsupported cards do nothing',()=>{
  const f=fixture(),source=f.producer([robot]);source.run();f.location.pathname='/lovelace/other';
  const button=f.consumer();button.run();assert.equal(button.count,'—');
  const invalid=f.make({card_type:'button',button_type:'state',signature_group:{popup:'#activities'}});assert.equal(invalid.run().trim(),'');
  button.ctx.teardown();source.ctx.teardown();
});

test('empty groups use native visibility and remain connected so new activities can reveal them',async()=>{
  const f=fixture(),source=f.producer([robot]),button=f.consumer({hide_empty:true});
  f.hass.states['vacuum.robot'].state='docked';source.run();button.run();
  assert.equal(button.ctx.hidden,true);assert.equal(button.ctx.connectedWhileHidden,true);
  assert.equal(button.ctx.events.at(-1).type,'card-visibility-changed');assert.equal(button.ctx.events.at(-1).detail.value,false);
  f.hass.states['vacuum.robot'].state='cleaning';button.run();assert.equal(button.ctx.hidden,false);assert.equal(button.count,'1');
  assert.equal(button.ctx.connectedWhileHidden,undefined);assert.equal(button.ctx.events.at(-1).detail.value,true);
  f.hass.states['vacuum.robot'].state='docked';button.run();assert.equal(button.ctx.hidden,true);
  source.ctx.teardown();await Promise.resolve();assert.equal(button.ctx.hidden,false);assert.equal(button.count,'—');
  button.ctx.teardown();
});

test('editing keeps empty buttons available and adds no empty-state block above the native popup placeholder',async()=>{
  const f=fixture(),source=f.producer([robot]),button=f.consumer({hide_empty:true});
  f.hass.states['vacuum.robot'].state='docked';source.run();button.run();
  source.ctx.editor=true;button.ctx.editor=true;source.run();await Promise.resolve();
  assert.equal(source.ctx._signatureGroup.empty,null);assert.equal(source.ctx.elements.popUpContainer.querySelector('.sg-empty'),null);
  assert.equal(button.ctx.hidden,false);assert.equal(button.count,'0');
  source.ctx.editor=false;button.ctx.editor=false;source.run();button.run();
  assert.equal(source.ctx._signatureGroup.empty.hidden,false);assert.equal(button.ctx.hidden,true);
  button.ctx.teardown();assert.equal(button.ctx.hidden,false);assert.equal(button.ctx.connectedWhileHidden,undefined);source.ctx.teardown();
});

test('group visibility does not undo a hidden state set by another feature',()=>{
  const f=fixture(),source=f.producer([robot]),button=f.consumer({hide_empty:true});
  button.ctx.hidden=true;f.hass.states['vacuum.robot'].state='docked';source.run();button.run();
  f.hass.states['vacuum.robot'].state='cleaning';button.run();assert.equal(button.ctx.hidden,true);
  button.ctx.teardown();assert.equal(button.ctx.hidden,true);source.ctx.teardown();
});

test('chips inherit names and atlas variants, reuse nodes and leave native actions intact',()=>{
  const f=fixture();f.hass.themes={darkMode:false};
  const art={image:'/local/atlas.png',columns:4,rows:6,index:0,index_dark:12,offset_y:12.5,offset_y_dark:3.125};
  const cards=[{type:'tile',entity:'sensor.printer',name:'H2S',signature_square:{illustration:art}}];
  const original=structuredClone(cards),source=f.producer(cards),button=f.consumer({presentation:'chips',max_names:0});
  const action=button.ctx.config.button_action;source.run();button.run();
  const runtime=button.ctx._signatureGroup,node=runtime.nodes[0];
  assert.equal(node.label.textContent,'H2S');assert.equal(node.art.hidden,false);
  assert.equal(node.art.style.backgroundPosition,'0% 2.5%');
  assert.equal(runtime.summary,undefined);assert.equal(runtime.badge,undefined);
  f.hass.themes.darkMode=true;button.run();assert.equal(runtime.nodes[0],node);
  assert.equal(node.art.style.backgroundPosition,'0% 60.625%');
  assert.equal(button.ctx.config.button_action,action);assert.deepEqual(cards,original);
  const observer=runtime.resize;assert.equal(observer.targets.size,3);assert.equal(f.frames.size,1);
  button.ctx.config.signature_group.presentation='summary';button.run();
  assert.equal(observer.targets.size,0);assert.equal(runtime.strip.parentNode,null);assert.equal(f.frames.size,0);
  assert.equal(button.text,'+1');button.ctx.teardown();source.ctx.teardown();
});

test('chips display a maximal prefix and only the hidden count, including exact fit and narrow cards',()=>{
  const f=fixture(),source=f.producer(Array.from({length:10},(_,i)=>({type:'tile',name:'Équipement '+i}))),button=f.consumer({presentation:'chips'});
  source.run();button.run();const runtime=button.ctx._signatureGroup;
  let width=500;runtime.track.getBoundingClientRect=()=>({width});
  runtime.nodes.forEach(node=>node.getBoundingClientRect=()=>({width:80}));
  runtime.more.getBoundingClientRect=()=>({width:runtime.more.textContent.length>2?44:36});
  runtime.layout();assert.equal(runtime.visibleCount,5);assert.equal(runtime.more.textContent,'+5');
  assert.equal(runtime.nodes[5].style.visibility,'hidden');
  width=872;runtime.layout();assert.equal(runtime.visibleCount,10);assert.equal(runtime.more.style.visibility,'hidden');
  width=871;runtime.layout();assert.equal(runtime.visibleCount,9);assert.equal(runtime.more.textContent,'+1');
  width=40;runtime.layout();assert.equal(runtime.visibleCount,0);assert.equal(runtime.more.textContent,'+10');
  width=0;runtime.layout();assert.equal(runtime.visibleCount,0);
  button.ctx.teardown();source.ctx.teardown();assert.equal(f.frames.size,0);
});

test('chips keep untrusted labels literal, reject executable images and reflect source and state changes',async()=>{
  const f=fixture(),source=f.producer([robot,{type:'tile',name:'<img src=x onerror=alert(1)>',icon:'mdi:printer-3d',signature_square:{illustration:{image:'javascript:alert(1)'}}}]),button=f.consumer({presentation:'chips',hide_empty:true});
  source.run();button.run();let runtime=button.ctx._signatureGroup;
  assert.equal(runtime.nodes[1].label.children.length,0);assert.equal(runtime.nodes[1].art.hidden,true);
  assert.equal(runtime.nodes[1].icon.icon,'mdi:printer-3d');
  f.hass.states['vacuum.robot'].state='docked';button.run();assert.equal(runtime.nodes.length,1);
  source.ctx.config={...source.ctx.config,cards:[]};source.run();button.run();assert.equal(button.ctx.hidden,true);
  assert.equal(runtime.nodes.length,0);assert.equal(runtime.message.textContent,'Aucune activité');
  source.ctx.teardown();await Promise.resolve();assert.equal(button.ctx.hidden,false);
  assert.equal(runtime.message.textContent,'Popup non initialisée');
  button.ctx.teardown();
});
