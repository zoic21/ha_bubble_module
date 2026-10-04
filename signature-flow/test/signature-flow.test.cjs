const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const YAML = require('yaml');
const base = path.resolve(__dirname, '..');
const definition = YAML.parse(fs.readFileSync(path.join(base,'dist/signature-flow.yaml'),'utf8')).signature_flow;
const render = new Function('hass','onTeardown','renderTemplate','return `'+definition.code+'`;');

class Animation {
  constructor(timing) {
    this.currentTime=0;this.playbackRate=1;this.playState='running';
    this.effect={getTiming:()=>({...timing}),updateTiming:value=>Object.assign(timing,value)};
  }
  updatePlaybackRate(rate) {this.playbackRate=rate;}
  pause() {this.playState='paused';}
  play() {this.playState='running';}
  cancel() {this.playState='idle';this.currentTime=null;}
}
class Element {
  constructor() {
    this.children=[]; this.attrs=new Map(); this.dataset={}; this.listeners=new Map(); this.hidden=false; this.events=[];
    const classes=this.classes=new Set();
    this.classList={add:(...v)=>v.forEach(x=>classes.add(x)),contains:x=>classes.has(x),
      toggle:(x,on)=>{if(on ?? !classes.has(x)) classes.add(x);else classes.delete(x);},remove:x=>classes.delete(x)};
    const styles=this.styles=new Map();this.style={setProperty:(k,v)=>styles.set(k,v),getPropertyValue:k=>styles.get(k)||''};
  }
  setAttribute(k,v) {this.attrs.set(k,String(v));if(k==='class') this.classList.add(...v.split(' '));}
  getAttribute(k) {return this.attrs.get(k) ?? null;}
  removeAttribute(k) {this.attrs.delete(k);}
  get textContent() {return (this._text||'')+this.children.map(c=>c.textContent).join('');}
  set textContent(v) {this.children=[];this._text=String(v);}
  append(...nodes) {nodes.forEach(n=>{n.parentElement=this;this.children.push(n);});}
  appendChild(n) {this.append(n);return n;}
  get childNodes() {
    if (!this._text) return this.children;
    const node=new Element();node._text=this._text;return [node,...this.children];
  }
  cloneNode() {
    const clone=new Element();
    for(const [key,value] of this.attrs) clone.setAttribute(key,value);
    for(const cls of this.classes) clone.classList.add(cls);
    for(const [key,value] of this.styles) clone.style.setProperty(key,value);
    Object.assign(clone.dataset,this.dataset);clone.hidden=this.hidden;clone.style.fontSize=this.style.fontSize;
    return clone;
  }
  replaceWith(next) {
    const parent=this.parentElement;parent.children[parent.children.indexOf(this)]=next;next.parentElement=parent;
  }
  contains(n) {return this===n||this.children.some(c=>c.contains(n));}
  remove() {this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
  addEventListener(k,fn) {this.listeners.set(k,fn);}
  removeEventListener(k) {this.listeners.delete(k);}
  dispatchEvent(e) {this.events.push(e);}
  animate(_,timing) {return new Animation(timing);}
  closest(selector) {return this.classList.contains(selector.slice(1)) ? this : this.parentElement?.closest(selector);}
  getBoundingClientRect() {return {left:0,right:468,top:0,bottom:280,width:468,height:280};}
}
const documentListeners=new Set();
global.document={createElement:()=>new Element(),createElementNS:()=>new Element(),
  addEventListener:(_,fn)=>documentListeners.add(fn),removeEventListener:(_,fn)=>documentListeners.delete(fn)};
global.CSS={supports:(_,s)=>s!=='invalid'};
global.ResizeObserver=class {constructor(fn){this.fn=fn;}observe(){}disconnect(){this.disconnected=true;}};
global.matchMedia=()=>({matches:false,listeners:new Set(),
  addEventListener(_,fn){this.listeners.add(fn);},removeEventListener(_,fn){this.listeners.delete(fn);}});
const state=(value,unit='W')=>({state:String(value),attributes:{unit_of_measurement:unit}});
const options={1:{primary:'sensor.solar'},2:{primary:'sensor.grid'},3:{primary:'sensor.soc',flow_entity:'sensor.battery',secondary:'sensor.battery',secondary_precision:0},
  5:{primary:'sensor.home'},6:{primary:'sensor.water',primary_scale:1000,primary_unit:'L/min',primary_precision:1}};
const states={'sensor.solar':state(1794),'sensor.grid':state(-11),'sensor.home':state(401),
  'sensor.soc':state(14,'%'),'sensor.battery':state(-1381),'sensor.water':state(0,'m³/min')};
const run=(ctx,hass,template)=>render.call(ctx,hass,fn=>ctx.teardown=fn,template);
function fixture(t,extra={},data={}) {
  const root=new Element(),host=new Element();root.append(host);
  const {animation,deadband,name,...slots}=extra;
  const ctx={card:root,elements:{mainContainer:host},config:{card_type:'button',button_type:'state',signature_flow:{animation,deadband,name,slots:{...options,...slots}}}};
  const hass={states:{...states,...data},locale:{language:'fr-FR',number_format:'space_comma'}};
  const css=run(ctx,hass);t.after(()=>ctx.teardown());return {ctx,hass,css,r:ctx._signatureFlow};
}
test('distribution metadata and the home example agree on the module ID',()=>{
  assert.equal(definition.name,'Signature Flow');assert.equal(definition.version,'3.4.1');assert.deepEqual(definition.supported,['button']);
  const home=YAML.parse(fs.readFileSync(path.join(base,'examples/home.yaml'),'utf8'));
  assert.deepEqual(home.modules,['signature_flow']);assert.equal(home.signature_flow.slots[6].primary_scale,1000);
  assert.equal(home.grid_options.rows,5);assert.equal(home.signature_flow.height,310);
  assert.equal(home.signature_flow.slots[2].secondary,'');
  assert.deepEqual(home.signature_flow.animation,{speed:24,max_arrows:5,reference:10000});
  assert.equal(home.signature_flow.slots[6].animation.reference,20);
  for(const key of [1,2,3,5,6]) assert.match(home.signature_flow.slots[key].tap_action.navigation_path,/^#/);
  assert.equal(home.signature_flow.slots[3].primary,'sensor.zendure_manager_power');
  assert.equal(home.signature_flow.slots[3].flow_entity,undefined);
  assert.equal(home.signature_flow.slots[3].secondary,"{{ states('sensor.zendure_manager_global_soc') | int }} %");
});
test('snapshot uses instantaneous values and correct net directions',t=>{
  const {r}=fixture(t);assert.equal(r.nodes[1].value.textContent,'1\u202f794 W');
  assert.equal(r.nodes[3].value.textContent,'14 %');assert.equal(r.nodes[6].value.textContent,'0,0 L/min');
  assert.equal(r.nodes[3].secondary.textContent,'-1\u202f381 W');
  assert.equal(r.nodes[2].secondary.textContent,'');
  assert.equal(r.edges[2].group.getAttribute('data-direction'),'-1');
  assert.equal(r.edges[3].group.getAttribute('data-direction'),'-1');
  assert.equal(r.edges[1].group.getAttribute('data-direction'),'1');
});

test('cached CSS still tracks sensors and updates only when effective height changes',t=>{
  const {ctx,hass,css,r}=fixture(t);
  let writes=0,cached=r.styleCSS;
  Object.defineProperty(r,'styleCSS',{get:()=>cached,set:value=>{writes++;cached=value;},configurable:true});
  const reads=new Set();
  const changed={...hass,states:new Proxy({...hass.states,'sensor.solar':state(2400)},{get:(states,id)=>{reads.add(id);return states[id];}})};
  for(let i=0;i<100;i++) assert.equal(run(ctx,changed),css);
  assert.equal(writes,0);
  assert.ok(reads.has('sensor.solar'));
  assert.equal(r.nodes[1].number.textContent,'2\u202f400');
  ctx.config={...ctx.config,signature_flow:{...ctx.config.signature_flow,height:400}};
  assert.match(run(ctx,changed),/height:400px!important/);
  assert.equal(writes,1);
  ctx.config.signature_flow.height=400.0;
  run(ctx,changed);assert.equal(writes,1);
  ctx.config.signature_flow.height=900;
  assert.match(run(ctx,changed),/height:600px!important/);
  assert.equal(writes,2);
  ctx.config.signature_flow.height=800;
  run(ctx,changed);assert.equal(writes,2);
  assert.ok(cached.includes('--signature-card-background'));
});
test('every slot accepts the same independent primary, secondary and flow measurements',t=>{
  const {ctx,hass,r}=fixture(t);
  ctx.config.signature_flow.slots=Object.fromEntries([1,2,3,4,5,6].map(id=>[id,{
    primary:'sensor.soc',flow_entity:'sensor.battery',secondary:'sensor.temperature',
    name:'Any measurement',icon:'mdi:thermometer',color:'#009c90',primary_precision:1,
    secondary_precision:1,flow_scale:.001,flow_unit:'kW'
  }]));
  run(ctx,{...hass,states:{...hass.states,'sensor.temperature':state(23.6,'°C')}});
  const speed=r.edges[3].speed;
  for(const id of [1,2,3,4,5,6]) {
    assert.equal(r.nodes[id].value.textContent,'14,0 %');
    assert.equal(r.nodes[id].secondary.textContent,'23,6 °C');
    assert.equal(r.nodes[id].label.textContent,'Any measurement');
    assert.equal(r.nodes[id].icon.getAttribute('icon'),'mdi:thermometer');
    assert.equal(r.edges[id].direction,-1);assert.equal(r.edges[id].speed,speed);
    assert.equal(r.nodes[id].value.dataset.entity,'sensor.soc');
    assert.equal(r.nodes[id].secondary.dataset.entity,'sensor.temperature');
  }
});
test('optional names and icons use entity metadata while explicit overrides take priority',t=>{
  const measurement={state:'500',attributes:{unit_of_measurement:'W',friendly_name:'Workshop',icon:'mdi:tools'}};
  const {ctx,hass,r}=fixture(t,{}, {'sensor.solar':measurement});
  assert.equal(r.nodes[1].label.textContent,'Workshop');assert.equal(r.nodes[1].icon.getAttribute('icon'),'mdi:tools');
  ctx.config.signature_flow.slots[1]={...options[1],name:'Custom label',icon:'mdi:flash'};run(ctx,hass);
  assert.equal(r.nodes[1].label.textContent,'Custom label');assert.equal(r.nodes[1].icon.getAttribute('icon'),'mdi:flash');
});
test('a separate flow remains active when its primary or secondary measurement is unavailable',t=>{
  const {ctx,hass,r}=fixture(t,{}, {'sensor.soc':state('unavailable'),'sensor.battery':state(500)});
  assert.equal(r.nodes[3].value.textContent,'—');assert.equal(r.edges[3].direction,1);
  assert.equal(r.nodes[3].secondary.textContent,'500 W');
  run(ctx,{...hass,states:{...hass.states,'sensor.soc':state(30,'%'),'sensor.battery':state('unavailable')}});
  assert.equal(r.nodes[3].value.textContent,'30 %');assert.equal(r.edges[3].direction,0);
  assert.equal(r.nodes[3].secondary.textContent,'Indisponible');
});
test('secondary scaling, units and precision are independent of primary and flow scaling',t=>{
  const {r}=fixture(t,{3:{...options[3],secondary:'sensor.water',secondary_scale:1000,secondary_unit:'L/min',secondary_precision:1}},
    {'sensor.water':state(.005,'m³/min')});
  assert.equal(r.nodes[3].value.textContent,'14 %');assert.equal(r.nodes[3].secondary.textContent,'5,0 L/min');
  assert.equal(r.edges[3].direction,-1);assert.ok(r.edges[3].speed>4);
});
test('primary and secondary share entity formatting defaults and support text states',t=>{
  const measurement={state:'23.64',attributes:{unit_of_measurement:'°C',display_precision:1}};
  const {ctx,hass,r}=fixture(t,{4:{primary:'sensor.temperature',secondary:'sensor.temperature'}},
    {'sensor.temperature':measurement,'binary_sensor.door':state('on','')});
  assert.equal(r.nodes[4].value.textContent,'23,6 °C');assert.equal(r.nodes[4].secondary.textContent,'23,6 °C');
  ctx.config.signature_flow.slots[4]={primary:'binary_sensor.door',secondary:'binary_sensor.door'};run(ctx,hass);
  assert.equal(r.nodes[4].value.textContent,'on');assert.equal(r.nodes[4].secondary.textContent,'on');
  assert.equal(r.edges[4].direction,0);assert.equal(r.nodes[4].value.dataset.entity,'binary_sensor.door');
});
test('both template values infer the first literal entity in textual order for more-info',t=>{
  const {ctx,hass,r}=fixture(t);
  const expressions=[
    "{{ states('sensor.solar') }}",
    '{{ state_attr("sensor.solar", "unit_of_measurement") }}',
    "{% set id = 'sensor.solar' %} {{ states(id) }}",
    "{{ states.sensor.solar.state }}",
    "{{ states('sensor.solar') | float + states('sensor.home') | float }}"
  ];
  for(const expression of expressions) {
    ctx.config.signature_flow.slots=Object.fromEntries([1,2,3,4,5,6].map(id=>[id,{primary:expression,secondary:expression}]));
    const calls=[];run(ctx,hass,(template,id)=>{calls.push([template,id]);return 'Calculated';});
    assert.equal(calls.length,12);assert.ok(calls.every(([template,id])=>template===expression&&id==='sensor.solar'));
    for(const node of Object.values(r.nodes)) {
      assert.equal(node.value.textContent,'Calculated');assert.equal(node.secondary.textContent,'Calculated');
      for(const target of [node.el,node.value,node.secondary]) {
        assert.equal(target.dataset.entity,'sensor.solar');assert.equal(JSON.parse(target.dataset.tapAction).action,'more-info');
      }
    }
    assert.ok(Object.values(r.edges).every(edge=>edge.direction===0));
  }
});
test('template display values do not implicitly control flow, but a separate flow does',t=>{
  const {ctx,hass,r}=fixture(t,{1:{primary:"{{ states('sensor.solar') | float / 1000 }}",primary_unit:'kW',
    primary_scale:1000,primary_precision:0,secondary:'Fixed text'}});
  run(ctx,hass,()=> '1.794');
  assert.equal(r.nodes[1].value.textContent,'1.794 kW');assert.equal(r.edges[1].direction,0);
  assert.equal(r.nodes[1].secondary.dataset.entity,'');assert.equal(r.nodes[1].secondary.classList.contains('sf-detail'),false);
  ctx.config.signature_flow.slots[1].flow_entity='sensor.solar';run(ctx,hass,()=> '1.794');
  assert.equal(r.edges[1].direction,1);assert.equal(r.edges[1].speed,24);
});
test('plain text and templates without literal entities have no inferred actions',t=>{
  const {ctx,hass,r}=fixture(t,{4:{primary:'See sensor.solar',secondary:'{{ states(variable) }}'}});
  run(ctx,hass,()=> 'Unknown source');
  for(const target of [r.nodes[4].el,r.nodes[4].value,r.nodes[4].secondary]) {
    assert.equal(target.dataset.entity,'');assert.equal(JSON.parse(target.dataset.tapAction).action,'none');
  }
  ctx.config.signature_flow.slots[4].primary='';ctx.config.signature_flow.slots[4].secondary='';run(ctx,hass);
  assert.equal(r.nodes[4].value.textContent,'—');assert.equal(r.nodes[4].secondary.textContent,'');
});
test('explicit primary and secondary actions override inferred more-info targets',t=>{
  const {r}=fixture(t,{4:{primary:"{{ states('sensor.solar') }}",secondary:"{{ states('sensor.battery') }}",
    primary_tap_action:{action:'more-info',entity:'sensor.home'},primary_hold_action:{action:'none'},
    secondary_tap_action:{action:'navigate',navigation_path:'#custom'},secondary_hold_action:{action:'none'}}});
  const node=r.nodes[4];
  assert.deepEqual(JSON.parse(node.value.dataset.tapAction),{action:'more-info',entity:'sensor.home'});
  assert.equal(node.value.dataset.entity,'sensor.solar');assert.equal(JSON.parse(node.value.dataset.holdAction).action,'none');
  assert.equal(JSON.parse(node.secondary.dataset.tapAction).navigation_path,'#custom');
  assert.equal(node.secondary.dataset.entity,'sensor.battery');assert.equal(JSON.parse(node.secondary.dataset.holdAction).action,'none');
});
test('template sources refresh their text and inferred target when configuration changes',t=>{
  const {ctx,hass,r}=fixture(t,{1:{primary:"{{ states('sensor.solar') }}",secondary:"{{ states('sensor.battery') }}"}});
  run(ctx,hass,(_,id)=>hass.states[id].state);
  assert.equal(r.nodes[1].value.textContent,'1794');assert.equal(r.nodes[1].secondary.textContent,'-1381');
  const updated={...hass,states:{...hass.states,'sensor.solar':state(2100)}};run(ctx,updated,(_,id)=>updated.states[id].state);
  assert.equal(r.nodes[1].value.textContent,'2100');
  ctx.config.signature_flow.slots[1].primary="{{ states('sensor.home') }}";run(ctx,updated,(_,id)=>updated.states[id].state);
  assert.equal(ctx._signatureFlow,r);assert.equal(r.nodes[1].value.dataset.entity,'sensor.home');assert.equal(r.nodes[1].value.textContent,'401');
});
test('all slots are optional and hiding them removes their connections and the junction',t=>{
  const {ctx,hass,r}=fixture(t);
  ctx.config.signature_flow.slots={};run(ctx,hass);
  for(const id of [1,2,3,4,5,6]) {
    assert.equal(r.nodes[id].el.hidden,true);assert.equal(r.edges[id].group.getAttribute('display'),'none');
  }
  assert.equal(r.junction.getAttribute('display'),'none');
  ctx.config.signature_flow.slots[2]={primary:'sensor.home',name:'Only block'};run(ctx,hass);
  assert.equal(r.nodes[2].el.hidden,false);assert.equal(r.nodes[2].label.textContent,'Only block');
  assert.equal(r.junction.getAttribute('display'),'inline');
});
test('right-side connections pause when slot 5 is absent and resume when it returns',t=>{
  const {ctx,hass,r}=fixture(t,{4:{primary:'sensor.solar'}}, {'sensor.water':state(.01,'m³/min')});
  const animations=[r.edges[4].particles[0]?.animation,r.edges[6].particles[0]?.animation];
  delete ctx.config.signature_flow.slots[5];run(ctx,hass);
  for(const [index,id] of [4,6].entries()) {
    assert.equal(r.nodes[id].el.hidden,false);assert.equal(r.edges[id].group.getAttribute('display'),'none');
    assert.equal(animations[index].playState,'paused');
  }
  ctx.config.signature_flow.slots[5]=options[5];run(ctx,hass);
  for(const [index,id] of [4,6].entries()) {
    assert.equal(r.edges[id].group.getAttribute('display'),'inline');
    assert.equal(r.edges[id].particles[0]?.animation,animations[index]);assert.equal(animations[index].playState,'running');
  }
});
test('animation can be disabled without hiding its block or thin connection',t=>{
  const {r}=fixture(t,{2:{...options[2],animate:false}});
  assert.equal(r.nodes[2].el.hidden,false);assert.equal(r.edges[2].group.getAttribute('display'),'inline');
  assert.equal(r.edges[2].direction,0);assert.equal(r.edges[2].particles[0]?.animation,undefined);
});
test('grid import, battery discharge and inversion update existing elements',t=>{
  const {ctx,hass,r}=fixture(t);
  run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(130),'sensor.battery':state(200)}});
  assert.equal(ctx._signatureFlow,r);assert.equal(r.nodes[2].secondary.textContent,'');
  assert.equal(r.edges[2].group.getAttribute('data-direction'),'1');
  assert.equal(r.nodes[3].secondary.textContent,'200 W');
  ctx.config.signature_flow.slots[3]={...options[3],invert_flow:true};run(ctx,hass);
  assert.equal(r.nodes[3].secondary.textContent,'-1\u202f381 W');
});
test('missing, blank, unknown and non-finite values never animate as zero',t=>{
  for(const invalid of ['unknown','unavailable','','NaN','Infinity']) {
    const {r}=fixture(t,{}, {'sensor.solar':state(invalid),'sensor.battery':state(invalid),'sensor.water':state(invalid)});
    assert.equal(r.nodes[1].value.textContent,'—');assert.equal(r.nodes[6].value.textContent,'—');
    assert.equal(r.edges[1].group.getAttribute('data-direction'),'0');
    assert.equal(r.nodes[3].secondary.textContent,'Indisponible');
  }
  const {r}=fixture(t,{1:{primary:'sensor.missing'}});assert.equal(r.nodes[1].value.textContent,'—');
});
test('zero, deadband, scaling and power scaling affect their own measurements',t=>{
  const {r}=fixture(t,{deadband:0.2,1:{primary:'sensor.solar',primary_scale:0.001,primary_unit:'kW',primary_precision:2},
    3:{...options[3],flow_scale:0.001,flow_unit:'kW',secondary_scale:0.001,secondary_unit:'kW',secondary_precision:2}}, {'sensor.water':state(0.0001,'m³/min')});
  assert.equal(r.nodes[1].value.textContent,'1,79 kW');assert.equal(r.nodes[6].value.textContent,'0,1 L/min');
  assert.equal(r.edges[6].group.getAttribute('data-direction'),'0');
  assert.equal(r.nodes[3].secondary.textContent,'-1,38 kW');
});
test('power changes the arrow count while physical speed stays fixed',t=>{
  const {ctx,hass,r}=fixture(t);r.route(2,[[0,0],[200,0]]);
  for(const [value,count] of [[16,1],[2500,2],[5000,3],[7500,4],[10000,5],[20000,5],[-5000,3]]) {
    run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(value)}});
    assert.equal(r.edges[2].count,count);assert.equal(r.edges[2].speed,24);
    assert.equal(r.edges[2].direction,Math.sign(value));
    assert.equal(r.edges[2].particles.filter(p=>p.flow.getAttribute('display')==='inline').length,count);
  }
  ctx.config.signature_flow.animation={speed:18,max_arrows:3,reference:20000};
  run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(20000)}});
  assert.equal(r.edges[2].speed,18);assert.equal(r.edges[2].count,3);
});
test('equal power has equal counts across W/kW/MW and display scaling',t=>{
  const {ctx,hass,r}=fixture(t);const initial=r.edges[1].demand;
  for(const [value,unit] of [[1794,'W'],[1.794,'kW'],[.001794,'MW']]) {
    run(ctx,{...hass,states:{...hass.states,'sensor.solar':state(value,unit)}});
    assert.equal(r.edges[1].demand,initial);assert.equal(r.edges[1].speed,24);
  }
  ctx.config.signature_flow.slots[1]={...options[1],primary_scale:0.001,primary_unit:'kW'};run(ctx,hass);
  assert.equal(r.edges[1].demand,initial);
  const a=r.edges[1],b=r.edges[5];a.length=60;b.length=120;
  r.updateMotion(a);r.updateMotion(b);
  const duration=e=>e.particles[0].animation.effect.getTiming().duration/(1000*e.particles[0].animation.playbackRate);
  assert.ok(Math.abs(duration(b)-2*duration(a))<.02);
});
test('water uses its own reference after unit conversion',t=>{
  const {r}=fixture(t,{6:{...options[6],animation:{reference:20}}}, {'sensor.water':state(.02,'m³/min')});
  assert.equal(r.nodes[6].value.textContent,'20,0 L/min');assert.equal(r.edges[6].speed,24);
  assert.equal(r.edges[6].demand,5);
});
test('each slot inherits global animation settings and overrides individual settings independently',t=>{
  const {ctx,hass,r}=fixture(t,{animation:{speed:30,max_arrows:7,reference:20000},
    1:{...options[1],animation:{reference:10000}},
    3:{...options[3],animation:{speed:18,max_arrows:3,reference:2400}},
    6:{...options[6],animation:{reference:20}}},
    {'sensor.solar':state(7500),'sensor.battery':state(1200),'sensor.water':state(.01,'m³/min')});
  assert.equal(r.edges[1].speed,30);assert.equal(r.edges[1].demand,6);
  assert.equal(r.edges[3].speed,18);assert.equal(r.edges[3].demand,2);
  assert.equal(r.edges[6].speed,30);assert.equal(r.edges[6].demand,4);
  assert.equal(r.edges[5].speed,30);assert.equal(r.edges[5].demand,1);
  const first=r.edges[1].particles[0],animation=first.animation;
  ctx.config.signature_flow.slots[1].animation.speed=12;run(ctx,hass);
  assert.equal(r.edges[1].speed,12);assert.equal(r.edges[1].demand,6);
  assert.equal(first.animation,animation);assert.equal(animation.playbackRate,12/r.edges[1].length);
  assert.equal(r.edges[3].speed,18);assert.equal(r.edges[6].speed,30);
  delete ctx.config.signature_flow.slots[1].animation;run(ctx,hass);
  assert.equal(r.edges[1].speed,30);assert.equal(r.edges[1].demand,3);
  assert.equal(r.edges[1].particles[0],first);
  ctx.config.signature_flow.animation.speed=36;run(ctx,hass);
  assert.equal(r.edges[1].speed,36);assert.equal(r.edges[3].speed,18);
  assert.equal(r.edges[5].speed,36);assert.equal(r.edges[6].speed,36);
});
test('slot references normalize W/kW/MW consistently and replace the old reference option',t=>{
  const {ctx,hass,r}=fixture(t,{1:{...options[1],animation:{reference:5000},animation_reference:1}});
  for(const [value,unit] of [[2500,'W'],[2.5,'kW'],[.0025,'MW']]) {
    run(ctx,{...hass,states:{...hass.states,'sensor.solar':state(value,unit)}});
    assert.equal(r.edges[1].demand,3);assert.equal(r.edges[1].speed,24);
  }
  delete ctx.config.signature_flow.slots[1].animation;run(ctx,hass);
  assert.equal(r.edges[1].demand,2);
  ctx.config.signature_flow.slots[1].animation={reference:5000};
  ctx.config.signature_flow.slots[1].primary_scale=.001;
  ctx.config.signature_flow.slots[1].primary_unit='kW';
  run(ctx,{...hass,states:{...hass.states,'sensor.solar':state(2500)}});
  assert.equal(r.edges[1].demand,3);
});
test('count hysteresis stabilizes readings near a threshold without a timer',t=>{
  const {ctx,hass,r}=fixture(t);r.route(2,[[0,0],[200,0]]);
  const set=value=>run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(value)}});
  set(1000);assert.equal(r.edges[2].count,1);
  for(const value of [1240,1260,1400,1490]) {set(value);assert.equal(r.edges[2].count,1);}
  set(1510);assert.equal(r.edges[2].count,2);
  for(const value of [1490,1260,1240,1010]) {set(value);assert.equal(r.edges[2].count,2);}
  set(990);assert.equal(r.edges[2].count,1);
});
test('short paths cap the count and reuse their arrow pool after resizing',t=>{
  const {r}=fixture(t,{}, {'sensor.solar':state(10000)});const edge=r.edges[1];
  r.route(1,[[0,0],[140,0]]);assert.equal(edge.count,5);
  const particles=[...edge.particles];
  for(const [length,count] of [[55,3],[20,1],[10,1],[140,5]]) {
    r.route(1,[[0,0],[length,0]]);assert.equal(edge.count,count);
    assert.deepEqual(edge.particles,particles);
    for(const [i,particle] of edge.particles.entries()) {
      assert.equal(particle.flow.getAttribute('display'),i<count?'inline':'none');
      assert.equal(particle.animation.playState,i<count?'running':'paused');
    }
  }
});
test('resizing redistributes every arrow evenly while retaining the first physical position',t=>{
  const {r}=fixture(t,{}, {'sensor.solar':state(5000)});const edge=r.edges[1];
  r.route(1,[[20,0],[200,0]]);
  edge.particles[0].animation.currentTime=400;
  const position=edge.start+progress(edge.particles[0].animation)*edge.length;
  for(const start of [30,5,40,20]) {
    r.route(1,[[start,0],[200,0]]);
    assert.ok(Math.abs(edge.start+progress(edge.particles[0].animation)*edge.length-position)<.00001);
    const phases=edge.particles.slice(0,edge.count).map(p=>progress(p.animation)).sort((a,b)=>a-b);
    for(let i=0;i<phases.length;i++) {
      const gap=(phases[(i+1)%phases.length]-phases[i]+1)%1;
      assert.ok(Math.abs(gap-1/edge.count)<.000001);
    }
  }
});
test('all active arrows reverse in place and surplus arrows pause until reused',t=>{
  const {r}=fixture(t,{}, {'sensor.solar':state(10000)});const edge=r.edges[1];
  r.route(1,[[0,0],[200,0]]);const particles=[...edge.particles];
  for(const [i,particle] of particles.entries()) particle.animation.currentTime=120+i*200;
  const positions=particles.map(p=>progress(p.animation));
  edge.direction=-1;r.updateMotion(edge);
  for(const [i,particle] of particles.entries()) {
    assert.ok(Math.abs(progress(particle.animation)-positions[i])<.000001);
    assert.equal(particle.animation.effect.getTiming().direction,'reverse');
  }
  edge.demand=2;r.updateMotion(edge);
  assert.ok(particles.slice(2).every(p=>p.animation.playState==='paused'));
  edge.direction=1;edge.demand=5;r.updateMotion(edge);
  assert.deepEqual(edge.particles,particles);
  assert.ok(particles.every(p=>p.animation.playState==='running'&&p.animation.effect.getTiming().direction==='normal'));
});
test('speed and arrow count options stay finite and the pool is bounded',t=>{
  const {ctx,hass,r}=fixture(t,{}, {'sensor.solar':state(10000)});
  for(const [settings,speed,count] of [[{speed:0,max_arrows:0},1,1],
    [{speed:'invalid',max_arrows:'invalid'},24,5],[{speed:30,max_arrows:1000},30,12]]) {
    ctx.config.signature_flow.animation=settings;run(ctx,hass);r.route(1,[[0,0],[400,0]]);
    assert.equal(r.edges[1].speed,speed);assert.equal(r.edges[1].count,count);
    assert.ok(r.edges[1].particles.length<=12);
  }
  ctx.config.signature_flow.animation={min_speed:2,max_speed:99};run(ctx,hass);
  assert.equal(r.edges[1].speed,24);
});
const progress=animation=>{
  const fraction=(animation.currentTime%1000)/1000;
  return animation.effect.getTiming().direction==='reverse'?1-fraction:fraction;
};
test('flow reversals reuse the animation and preserve position throughout and between cycles',t=>{
  const {ctx,hass,r}=fixture(t);const edge=r.edges[2],animation=edge.particles[0]?.animation;
  for(const time of [0,350,999.99,1250,2890]) {
    animation.currentTime=time;const position=progress(animation);
    run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(edge.direction<0?11:-11)}});
    assert.equal(edge.particles[0]?.animation,animation);assert.ok(Math.abs(progress(animation)-position)<.000001);
    assert.equal(animation.effect.getTiming().direction,edge.direction<0?'reverse':'normal');
    assert.equal(animation.playState,'running');assert.ok(animation.playbackRate>0);
  }
});
test('power changes retain fixed playback rate and the leading arrow position',t=>{
  const {ctx,hass,r}=fixture(t);const edge=r.edges[2],animation=edge.particles[0]?.animation;
  animation.currentTime=643;const position=progress(animation),rate=animation.playbackRate;
  run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(-5000)}});
  assert.equal(edge.particles[0]?.animation,animation);assert.equal(animation.currentTime,643);
  assert.equal(progress(animation),position);assert.equal(animation.playbackRate,rate);
  assert.equal(animation.playbackRate,edge.speed/edge.length);
});
test('zero and unavailable flows pause and resume at the same position in either direction',t=>{
  const {ctx,hass,r}=fixture(t);const edge=r.edges[2],animation=edge.particles[0]?.animation;
  animation.currentTime=350;const position=progress(animation);
  for(const [stopped,resumed] of [[0,-900],['unavailable',900],[0,-900]]) {
    run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(stopped)}});
    assert.equal(edge.particles[0]?.animation,animation);assert.equal(animation.playState,'paused');
    assert.equal(progress(animation),position);
    run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(resumed)}});
    assert.equal(edge.particles[0]?.animation,animation);assert.equal(animation.playState,'running');
    assert.equal(progress(animation),position);
  }
});
test('hidden optional sources pause their existing animation until shown again',t=>{
  const {ctx,hass,r}=fixture(t,{}, {'sensor.water':state(.01,'m³/min')});
  const edge=r.edges[6],animation=edge.particles[0]?.animation;animation.currentTime=400;
  ctx.config.signature_flow.slots[6].enabled=false;run(ctx,hass);
  assert.equal(animation.playState,'paused');assert.equal(animation.currentTime,400);
  ctx.config.signature_flow.slots[6].enabled=true;run(ctx,hass);
  assert.equal(edge.particles[0]?.animation,animation);assert.equal(animation.playState,'running');
  assert.equal(animation.currentTime,400);
});
test('path resizing changes the rate without resetting the position',t=>{
  const {r}=fixture(t);const edge=r.edges[2],animation=edge.particles[0]?.animation;
  animation.currentTime=350;const length=edge.length,rate=animation.playbackRate;
  edge.length=length*2;r.updateMotion(edge);
  assert.equal(edge.particles[0]?.animation,animation);assert.equal(animation.currentTime,350);
  assert.equal(animation.playbackRate,rate/2);
});
test('slot 2 retains its physical arrow position when the connection grows or shrinks',t=>{
  const {r}=fixture(t);const edge=r.edges[2],animation=edge.particles[0]?.animation;
  r.route(2,[[30,136],[100,136]]);animation.currentTime=350;
  const position=edge.start+progress(animation)*edge.length;
  for(const start of [50,20,60,30]) {
    r.route(2,[[start,136],[100,136]]);
    assert.equal(edge.particles[0]?.animation,animation);
    assert.ok(Math.abs(edge.start+progress(animation)*edge.length-position)<.00001);
    assert.equal(animation.playbackRate,edge.speed/edge.length);
  }
});
test('mobile sources retain arrow position on either side of their bend when the origin moves',t=>{
  const {r}=fixture(t);
  for(const id of [1,3]) for(const direction of [-1,1]) {
    const edge=r.edges[id],animation=edge.particles[0]?.animation;
    edge.direction=direction;r.updateMotion(edge);
    r.route(id,[[20,30],[100,30],[100,136]]);
    for(const fraction of [.2,.5,.99]) {
      animation.currentTime=(direction<0?1-fraction:fraction)*1000;
      const remaining=(1-progress(animation))*edge.length;
      for(const start of [30,5,40,20]) {
        r.route(id,[[start,30],[100,30],[100,136]]);
        assert.equal(edge.particles[0]?.animation,animation);
        assert.ok(Math.abs((1-progress(animation))*edge.length-remaining)<.00001);
        assert.equal(animation.playbackRate,edge.speed/edge.length);
      }
    }
  }
});
test('reduced motion cancels native animations, resumes active flows and releases listeners',t=>{
  const {ctx,r}=fixture(t);const preference=r.motionPreference;
  const originals=Object.values(r.edges).flatMap(edge=>edge.particles.map(p=>p.animation)).filter(Boolean);
  assert.ok(preference.listeners.has(r.motionChanged));
  preference.matches=true;r.motionChanged();
  for(const animation of originals) assert.equal(animation.playState,'idle');
  for(const edge of Object.values(r.edges)) for(const particle of edge.particles) assert.equal(particle.animation,null);
  for(const edge of Object.values(r.edges).filter(e=>e.direction&&!e.hidden)) {
    const positions=edge.particles.slice(0,edge.count).map(p=>p.flow.style.getPropertyValue('offset-distance'));
    assert.equal(new Set(positions).size,edge.count);
  }
  preference.matches=false;r.motionChanged();
  assert.ok(r.edges[2].particles[0]?.animation);assert.equal(r.edges[6].particles.length,0);
  for(const edge of Object.values(r.edges).filter(e=>e.direction&&!e.hidden)) {
    const positions=edge.particles.slice(0,edge.count).map(p=>progress(p.animation)).sort((a,b)=>a-b);
    if(edge.count>1) for(let i=0;i<positions.length;i++) {
      assert.ok(Math.abs((positions[(i+1)%positions.length]-positions[i]+1)%1-1/edge.count)<.000001);
    }
  }
  const restarted=r.edges[2].particles[0]?.animation;ctx.teardown();
  assert.equal(restarted.playState,'idle');assert.equal(preference.listeners.size,0);
});
test('locale and number preferences are independent and refresh without rebuilding',t=>{
  const {ctx,hass,r}=fixture(t);run(ctx,{...hass,locale:{language:'en',number_format:'none'}});
  assert.equal(r.nodes[1].label.textContent,'Slot 1');assert.equal(r.nodes[1].value.textContent,'1794 W');
  assert.equal(r.nodes[3].secondary.textContent,'-1381 W');
  run(ctx,{...hass,locale:{language:'fr',number_format:'comma_decimal'}});
  assert.equal(r.nodes[6].value.textContent,'0.0 L/min');
});
test('native action targets distinguish the block, primary value and battery power',t=>{
  const {r}=fixture(t,{3:{...options[3],tap_action:{action:'navigate',navigation_path:'#battery'},
    hold_action:{action:'none'},double_tap_action:{action:'toggle'}}});
  assert.deepEqual(JSON.parse(r.nodes[3].el.dataset.tapAction),{action:'navigate',navigation_path:'#battery'});
  assert.equal(r.nodes[3].value.dataset.entity,'sensor.soc');
  assert.equal(JSON.parse(r.nodes[3].value.dataset.tapAction).action,'more-info');
  assert.equal(r.nodes[3].secondary.dataset.entity,'sensor.battery');
  assert.equal(r.nodes[3].secondary.classList.contains('sf-detail'),true);
  assert.equal(JSON.parse(r.nodes[3].el.dataset.doubleTapAction).action,'toggle');
});
test('primary and secondary actions can be overridden independently, even without entities',t=>{
  const {r}=fixture(t,{4:{name:'Controls',primary:'Open',secondary:'Settings',
    tap_action:{action:'navigate',navigation_path:'#block'},
    primary_tap_action:{action:'navigate',navigation_path:'#value'},primary_hold_action:{action:'none'},
    secondary_tap_action:{action:'navigate',navigation_path:'#secondary'},secondary_double_tap_action:{action:'toggle'}}});
  const node=r.nodes[4];
  for(const [target,path] of [[node.el,'#block'],[node.value,'#value'],[node.secondary,'#secondary']]) {
    assert.equal(JSON.parse(target.dataset.tapAction).navigation_path,path);
    assert.equal(target.getAttribute('aria-disabled'),'false');assert.equal(target.dataset.entity,'');
  }
  assert.equal(JSON.parse(node.value.dataset.holdAction).action,'none');
  assert.equal(JSON.parse(node.secondary.dataset.doubleTapAction).action,'toggle');
  assert.equal(node.secondary.classList.contains('sf-detail'),true);
});
test('keyboard dispatches the native hass-action contract once and ignores held keys',t=>{
  const {r}=fixture(t,{5:{...options[5],tap_action:{action:'navigate',navigation_path:'#home'}}});
  let prevented=0;const event={key:'Enter',target:r.nodes[5].el,preventDefault(){prevented++;},stopPropagation(){}};
  r.keyboard(event);r.keyboard({...event,repeat:true});
  assert.equal(prevented,1);assert.equal(r.nodes[5].el.events.length,1);
  assert.equal(r.nodes[5].el.events[0].type,'hass-action');
  assert.equal(r.nodes[5].el.events[0].detail.config.tap_action.navigation_path,'#home');
});
test('focus feedback follows keyboard/pointer input and input-mode listeners are removed on teardown',t=>{
  const {ctx,r}=fixture(t);
  r.modalityKey({key:'Tab'});assert.equal(r.canvas.getAttribute('data-sf-keyboard'),'');
  r.modalityPointer();assert.equal(r.canvas.getAttribute('data-sf-keyboard'),null);
  r.modalityKey({key:'Escape'});assert.equal(r.canvas.getAttribute('data-sf-keyboard'),null);
  assert.ok(documentListeners.has(r.modalityKey));assert.ok(documentListeners.has(r.modalityPointer));
  ctx.teardown();assert.ok(!documentListeners.has(r.modalityKey));assert.ok(!documentListeners.has(r.modalityPointer));
});
test('templates use the supplied helper and output remains inert text',t=>{
  const {ctx,hass,r}=fixture(t,{1:{primary:"{{ states('sensor.solar') }}",secondary:"{{ states('sensor.forecast') }}",
    primary_unit:'kW',color:'invalid'}});
  const calls=[];run(ctx,hass,(template,id)=>{calls.push([template,id]);return '<img src=x onerror=alert(1)>';});
  assert.deepEqual(calls,[["{{ states('sensor.solar') }}",'sensor.solar'],["{{ states('sensor.forecast') }}",'sensor.forecast']]);
  assert.equal(r.nodes[1].number.textContent,'<img src=x onerror=alert(1)>');
  assert.equal(r.nodes[1].number.children.length,0);assert.equal(r.nodes[1].el.style.getPropertyValue('--sf-color'),'var(--secondary-text-color, #676767)');
});
test('each evaluation reads every configured state through the tracked object',t=>{
  const {ctx,hass}=fixture(t,{1:{...options[1],secondary:'sensor.forecast'}});
  for(let i=0;i<2;i++) {
    const reads=new Set();run(ctx,{...hass,states:new Proxy(hass.states,{get(target,id){reads.add(id);return target[id];}})});
    for(const id of [...Object.keys(states),'sensor.forecast']) assert.ok(reads.has(id),id);
  }
});
test('optional sources can be enabled, disabled and retargeted without rebuilding',t=>{
  const {ctx,hass,r}=fixture(t);assert.ok(r.nodes[4].el.hidden);
  ctx.config.signature_flow.slots[4]={primary:'sensor.solar',name:'Other'};run(ctx,hass);
  assert.equal(r.nodes[4].el.hidden,false);assert.ok(r.canvas.classList.contains('sf-has-4'));
  ctx.config.signature_flow.slots[4].enabled=false;ctx.config.signature_flow.slots[6].primary='sensor.home';run(ctx,hass);
  assert.equal(r.nodes[4].el.hidden,true);assert.equal(r.nodes[6].value.dataset.entity,'sensor.home');
});
test('connections share the center axis on desktop and join aligned mobile columns',t=>{
  const {r}=fixture(t);
  const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
  for(const width of [468,360]) {
    const narrow=width<460,sourceWidth=narrow?170:180;
    const positions={1:rect(narrow?0:width/2-90,0,sourceWidth,76),2:rect(0,98,128,76),
      5:rect(width-140,98,140,76),3:rect(narrow?0:width/2-90,204,sourceWidth,76),
      6:rect(width-140,204,140,76)};
    r.canvas.getBoundingClientRect=()=>rect(0,0,width,280);
    for(const [key,box] of Object.entries(positions)) r.nodes[key].el.getBoundingClientRect=()=>box;
    r.draw();
    const x=width/2;
    assert.equal(r.junction.getAttribute('cx'),String(x));
    assert.equal(r.edges[1].line.getAttribute('d'),narrow?'M170 38 L180 38 L180 136':'M234 76 L234 136');
    assert.equal(r.edges[3].line.getAttribute('d'),narrow?'M170 242 L180 242 L180 136':'M234 204 L234 136');
    assert.equal(r.edges[6].line.getAttribute('d'),'M'+(width-70)+' 204 L'+(width-70)+' 174');
    assert.equal(r.edges[1].particles[0].flow.style.getPropertyValue('offset-path'),'path("'+r.edges[1].line.getAttribute('d')+'")');
  }
});
test('mobile left connections start after their displayed unit or number and update only changed sources',t=>{
  const {ctx,hass,r}=fixture(t);
  const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
  r.canvas.getBoundingClientRect=()=>rect(0,0,360,280);
  const positions={1:rect(0,0,160,76),2:rect(0,98,160,76),3:rect(0,204,160,76),
    5:rect(220,98,140,76),6:rect(220,204,140,76)};
  for(const [id,box] of Object.entries(positions)) r.nodes[id].el.getBoundingClientRect=()=>box;
  for(const [id,end] of [[1,102],[2,83],[3,76]]) r.nodes[id].unit.getBoundingClientRect=()=>rect(end-20,0,20,16);
  r.draw();
  assert.equal(r.edges[1].line.getAttribute('d'),'M114 38 L180 38 L180 136');
  assert.equal(r.edges[2].line.getAttribute('d'),'M95 136 L180 136');
  assert.equal(r.edges[3].line.getAttribute('d'),'M88 242 L180 242 L180 136');
  const paths=[2,3].map(id=>r.edges[id].line.getAttribute('d'));
  r.nodes[1].unit.getBoundingClientRect=()=>rect(55,0,20,16);r.updateLeftConnections([1]);
  assert.equal(r.edges[1].line.getAttribute('d'),'M87 38 L180 38 L180 136');
  assert.deepEqual([2,3].map(id=>r.edges[id].line.getAttribute('d')),paths);
  ctx.config.signature_flow.slots[1].primary_unit='';run(ctx,hass);
  r.nodes[1].number.getBoundingClientRect=()=>rect(46,0,40,34);r.updateLeftConnections([1]);
  assert.equal(r.edges[1].line.getAttribute('d'),'M98 38 L180 38 L180 136');
  r.canvas.getBoundingClientRect=()=>rect(0,0,468,280);r.draw();
  assert.equal(r.edges[1].line.getAttribute('d'),'M234 76 L234 136');
  assert.equal(r.edges[3].line.getAttribute('d'),'M234 204 L234 136');
});
test('teardown disconnects the observer and restores the native card on removal or unsupported type',t=>{
  const {ctx,hass,r}=fixture(t);ctx.config.button_type='slider';run(ctx,hass);
  assert.equal(ctx._signatureFlow,undefined);assert.ok(r.observer.disconnected);
  assert.equal(r.canvas.listeners.size,0);assert.equal(r.host.children.length,0);
  assert.equal(r.root.getAttribute('data-signature-flow'),null);ctx.teardown();
});
test('a module update replaces the old runtime once and retains the new one on sensor refreshes',t=>{
  const {ctx,hass,r}=fixture(t);delete r.version;run(ctx,hass);
  const updated=ctx._signatureFlow;assert.notEqual(updated,r);assert.ok(r.observer.disconnected);
  assert.equal(updated.version,definition.version);assert.equal(updated.host.children.length,1);
  run(ctx,hass);assert.equal(ctx._signatureFlow,updated);assert.equal(updated.host.children.length,1);
});
test('documentation links resolve locally',()=>{
  const doc=fs.readFileSync(path.join(base,'doc/README.md'),'utf8');
  for(const match of doc.matchAll(/\]\((\.\.\/[^)]+)\)/g)) assert.ok(fs.existsSync(path.resolve(base,'doc',match[1])),match[1]);
});
test('the documented examples use valid YAML and match the published version',()=>{
  const doc=fs.readFileSync(path.join(base,'doc/README.md'),'utf8');
  assert.ok(doc.includes('Version: **'+definition.version+'**'));
  for(const match of doc.matchAll(/```yaml\n([\s\S]*?)```/g)) assert.ok(YAML.parse(match[1]));
});
