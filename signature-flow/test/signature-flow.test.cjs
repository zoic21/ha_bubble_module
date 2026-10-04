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
    const classes=new Set();
    this.classList={add:(...v)=>v.forEach(x=>classes.add(x)),contains:x=>classes.has(x),
      toggle:(x,on)=>{if(on ?? !classes.has(x)) classes.add(x);else classes.delete(x);},remove:x=>classes.delete(x)};
    const styles=new Map();this.style={setProperty:(k,v)=>styles.set(k,v),getPropertyValue:k=>styles.get(k)||''};
  }
  setAttribute(k,v) {this.attrs.set(k,String(v));if(k==='class') this.classList.add(...v.split(' '));}
  getAttribute(k) {return this.attrs.get(k) ?? null;}
  removeAttribute(k) {this.attrs.delete(k);}
  get textContent() {return (this._text||'')+this.children.map(c=>c.textContent).join('');}
  set textContent(v) {this.children=[];this._text=String(v);}
  append(...nodes) {nodes.forEach(n=>{n.parentElement=this;this.children.push(n);});}
  appendChild(n) {this.append(n);return n;}
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
const options={1:{entity:'sensor.solar'},2:{entity:'sensor.grid'},3:{entity:'sensor.soc',flow_entity:'sensor.battery',secondary_entity:'sensor.battery',secondary_precision:0},
  5:{entity:'sensor.home'},6:{entity:'sensor.water',scale:1000,unit:'L/min',precision:1}};
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
  assert.equal(definition.name,'Signature Flow');assert.equal(definition.version,'2.0.0');assert.deepEqual(definition.supported,['button']);
  const home=YAML.parse(fs.readFileSync(path.join(base,'examples/home.yaml'),'utf8'));
  assert.deepEqual(home.modules,['signature_flow']);assert.equal(home.signature_flow.slots[6].scale,1000);
  assert.equal(home.grid_options.rows,5);assert.equal(home.signature_flow.height,310);
  assert.equal(home.signature_flow.slots[2].secondary,'');
  assert.deepEqual(home.signature_flow.animation,{min_speed:4,max_speed:40,reference:10000});
  assert.equal(home.signature_flow.slots[6].animation_reference,20);
  for(const key of [1,2,3,5,6]) assert.match(home.signature_flow.slots[key].tap_action.navigation_path,/^#/);
  assert.equal(home.signature_flow.slots[3].flow_entity,home.signature_flow.slots[3].secondary_entity);
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
test('every slot accepts the same independent primary, secondary and flow measurements',t=>{
  const {ctx,hass,r}=fixture(t);
  ctx.config.signature_flow.slots=Object.fromEntries([1,2,3,4,5,6].map(id=>[id,{
    entity:'sensor.soc',flow_entity:'sensor.battery',secondary_entity:'sensor.temperature',
    name:'Any measurement',icon:'mdi:thermometer',color:'#009c90',precision:1,
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
  const {r}=fixture(t,{3:{...options[3],secondary_entity:'sensor.water',secondary_scale:1000,secondary_unit:'L/min',secondary_precision:1}},
    {'sensor.water':state(.005,'m³/min')});
  assert.equal(r.nodes[3].value.textContent,'14 %');assert.equal(r.nodes[3].secondary.textContent,'5,0 L/min');
  assert.equal(r.edges[3].direction,-1);assert.ok(r.edges[3].speed>4);
});
test('all slots are optional and hiding them removes their connections and the junction',t=>{
  const {ctx,hass,r}=fixture(t);
  ctx.config.signature_flow.slots={};run(ctx,hass);
  for(const id of [1,2,3,4,5,6]) {
    assert.equal(r.nodes[id].el.hidden,true);assert.equal(r.edges[id].group.getAttribute('display'),'none');
  }
  assert.equal(r.junction.getAttribute('display'),'none');
  ctx.config.signature_flow.slots[2]={entity:'sensor.home',name:'Only block'};run(ctx,hass);
  assert.equal(r.nodes[2].el.hidden,false);assert.equal(r.nodes[2].label.textContent,'Only block');
  assert.equal(r.junction.getAttribute('display'),'inline');
});
test('right-side connections pause when slot 5 is absent and resume when it returns',t=>{
  const {ctx,hass,r}=fixture(t,{4:{entity:'sensor.solar'}}, {'sensor.water':state(.01,'m³/min')});
  const animations=[r.edges[4].animation,r.edges[6].animation];
  delete ctx.config.signature_flow.slots[5];run(ctx,hass);
  for(const [index,id] of [4,6].entries()) {
    assert.equal(r.nodes[id].el.hidden,false);assert.equal(r.edges[id].group.getAttribute('display'),'none');
    assert.equal(animations[index].playState,'paused');
  }
  ctx.config.signature_flow.slots[5]=options[5];run(ctx,hass);
  for(const [index,id] of [4,6].entries()) {
    assert.equal(r.edges[id].group.getAttribute('display'),'inline');
    assert.equal(r.edges[id].animation,animations[index]);assert.equal(animations[index].playState,'running');
  }
});
test('animation can be disabled without hiding its block or thin connection',t=>{
  const {r}=fixture(t,{2:{...options[2],animate:false}});
  assert.equal(r.nodes[2].el.hidden,false);assert.equal(r.edges[2].group.getAttribute('display'),'inline');
  assert.equal(r.edges[2].direction,0);assert.equal(r.edges[2].animation,undefined);
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
  const {r}=fixture(t,{1:{entity:'sensor.missing'}});assert.equal(r.nodes[1].value.textContent,'—');
});
test('zero, deadband, scaling and power scaling affect their own measurements',t=>{
  const {r}=fixture(t,{deadband:0.2,1:{entity:'sensor.solar',scale:0.001,unit:'kW',precision:2},
    3:{...options[3],flow_scale:0.001,flow_unit:'kW',secondary_scale:0.001,secondary_unit:'kW',secondary_precision:2}}, {'sensor.water':state(0.0001,'m³/min')});
  assert.equal(r.nodes[1].value.textContent,'1,79 kW');assert.equal(r.nodes[6].value.textContent,'0,1 L/min');
  assert.equal(r.edges[6].group.getAttribute('data-direction'),'0');
  assert.equal(r.nodes[3].secondary.textContent,'-1,38 kW');
});
test('arrow speed grows across the power range, caps at its reference and ignores direction sign',t=>{
  const {ctx,hass,r}=fixture(t);const speeds=[];
  for(const value of [16,855,2403,10000,20000]) {
    run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(value)}});speeds.push(r.edges[2].speed);
  }
  assert.ok(speeds[0]<4.1);assert.ok(speeds[1]>speeds[0]);assert.ok(speeds[2]>speeds[1]);
  assert.ok(speeds[3]>speeds[2]);assert.equal(speeds[3],40);assert.equal(speeds[4],40);
  run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(-2403)}});assert.equal(r.edges[2].speed,speeds[2]);
  ctx.config.signature_flow.animation={min_speed:2,max_speed:10,reference:20000};
  run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(20000)}});assert.equal(r.edges[2].speed,10);
});
test('equal power has equal physical speed across W/kW, display scaling and different path lengths',t=>{
  const {ctx,hass,r}=fixture(t);const initial=r.edges[1].speed;
  run(ctx,{...hass,states:{...hass.states,'sensor.solar':state(1.794,'kW')}});assert.equal(r.edges[1].speed,initial);
  ctx.config.signature_flow.slots[1]={...options[1],scale:0.001,unit:'kW'};run(ctx,hass);
  assert.equal(r.edges[1].speed,initial);
  const a=r.edges[1],b=r.edges[5];a.length=60;b.length=120;b.speed=a.speed;
  r.updateMotion(a);r.updateMotion(b);
  const duration=e=>e.animation.effect.getTiming().duration/(1000*e.animation.playbackRate);
  assert.ok(Math.abs(duration(b)-2*duration(a))<.02);
});
test('water uses its own reference after unit conversion',t=>{
  const {r}=fixture(t,{6:{...options[6],animation_reference:20}}, {'sensor.water':state(.02,'m³/min')});
  assert.equal(r.nodes[6].value.textContent,'20,0 L/min');assert.equal(r.edges[6].speed,40);
});
const progress=animation=>{
  const fraction=(animation.currentTime%1000)/1000;
  return animation.effect.getTiming().direction==='reverse'?1-fraction:fraction;
};
test('flow reversals reuse the animation and preserve position throughout and between cycles',t=>{
  const {ctx,hass,r}=fixture(t);const edge=r.edges[2],animation=edge.animation;
  for(const time of [0,350,999.99,1250,2890]) {
    animation.currentTime=time;const position=progress(animation);
    run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(edge.direction<0?11:-11)}});
    assert.equal(edge.animation,animation);assert.ok(Math.abs(progress(animation)-position)<.000001);
    assert.equal(animation.effect.getTiming().direction,edge.direction<0?'reverse':'normal');
    assert.equal(animation.playState,'running');assert.ok(animation.playbackRate>0);
  }
});
test('power changes adjust playback rate without resetting the existing animation time',t=>{
  const {ctx,hass,r}=fixture(t);const edge=r.edges[2],animation=edge.animation;
  animation.currentTime=643;const position=progress(animation),rate=animation.playbackRate;
  run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(-5000)}});
  assert.equal(edge.animation,animation);assert.equal(animation.currentTime,643);
  assert.equal(progress(animation),position);assert.ok(animation.playbackRate>rate);
  assert.equal(animation.playbackRate,edge.speed/edge.length);
});
test('zero and unavailable flows pause and resume at the same position in either direction',t=>{
  const {ctx,hass,r}=fixture(t);const edge=r.edges[2],animation=edge.animation;
  animation.currentTime=350;const position=progress(animation);
  for(const [stopped,resumed] of [[0,-900],['unavailable',900],[0,-900]]) {
    run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(stopped)}});
    assert.equal(edge.animation,animation);assert.equal(animation.playState,'paused');
    assert.equal(progress(animation),position);
    run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(resumed)}});
    assert.equal(edge.animation,animation);assert.equal(animation.playState,'running');
    assert.equal(progress(animation),position);
  }
});
test('hidden optional sources pause their existing animation until shown again',t=>{
  const {ctx,hass,r}=fixture(t,{}, {'sensor.water':state(.01,'m³/min')});
  const edge=r.edges[6],animation=edge.animation;animation.currentTime=400;
  ctx.config.signature_flow.slots[6].enabled=false;run(ctx,hass);
  assert.equal(animation.playState,'paused');assert.equal(animation.currentTime,400);
  ctx.config.signature_flow.slots[6].enabled=true;run(ctx,hass);
  assert.equal(edge.animation,animation);assert.equal(animation.playState,'running');
  assert.equal(animation.currentTime,400);
});
test('path resizing changes the rate without resetting the position',t=>{
  const {r}=fixture(t);const edge=r.edges[2],animation=edge.animation;
  animation.currentTime=350;const length=edge.length,rate=animation.playbackRate;
  edge.length=length*2;r.updateMotion(edge);
  assert.equal(edge.animation,animation);assert.equal(animation.currentTime,350);
  assert.equal(animation.playbackRate,rate/2);
});
test('reduced motion cancels native animations, resumes active flows and releases listeners',t=>{
  const {ctx,r}=fixture(t);const preference=r.motionPreference;
  const originals=Object.values(r.edges).map(edge=>edge.animation).filter(Boolean);
  assert.ok(preference.listeners.has(r.motionChanged));
  preference.matches=true;r.motionChanged();
  for(const animation of originals) assert.equal(animation.playState,'idle');
  for(const edge of Object.values(r.edges)) assert.equal(edge.animation,null);
  preference.matches=false;r.motionChanged();
  assert.ok(r.edges[2].animation);assert.equal(r.edges[6].animation,null);
  const restarted=r.edges[2].animation;ctx.teardown();
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
  const {r}=fixture(t,{4:{name:'Controls',state:'Open',secondary:'Settings',
    tap_action:{action:'navigate',navigation_path:'#block'},
    value_tap_action:{action:'navigate',navigation_path:'#value'},value_hold_action:{action:'none'},
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
  const {ctx,hass,r}=fixture(t,{1:{...options[1],state:'{{ main }}',secondary:'{{ forecast }}',
    secondary_entity:'sensor.forecast',unit:'kW',color:'invalid'}});
  const calls=[];run(ctx,hass,(template,id)=>{calls.push([template,id]);return '<img src=x onerror=alert(1)>';});
  assert.deepEqual(calls,[['{{ main }}','sensor.solar'],['{{ forecast }}','sensor.forecast']]);
  assert.equal(r.nodes[1].number.textContent,'<img src=x onerror=alert(1)>');
  assert.equal(r.nodes[1].number.children.length,0);assert.equal(r.nodes[1].el.style.getPropertyValue('--sf-color'),'var(--secondary-text-color, #676767)');
});
test('each evaluation reads every configured state through the tracked object',t=>{
  const {ctx,hass}=fixture(t,{1:{...options[1],secondary_entity:'sensor.forecast'}});
  for(let i=0;i<2;i++) {
    const reads=new Set();run(ctx,{...hass,states:new Proxy(hass.states,{get(target,id){reads.add(id);return target[id];}})});
    for(const id of [...Object.keys(states),'sensor.forecast']) assert.ok(reads.has(id),id);
  }
});
test('optional sources can be enabled, disabled and retargeted without rebuilding',t=>{
  const {ctx,hass,r}=fixture(t);assert.ok(r.nodes[4].el.hidden);
  ctx.config.signature_flow.slots[4]={entity:'sensor.solar',name:'Other'};run(ctx,hass);
  assert.equal(r.nodes[4].el.hidden,false);assert.ok(r.canvas.classList.contains('sf-has-4'));
  ctx.config.signature_flow.slots[4].enabled=false;ctx.config.signature_flow.slots[6].entity='sensor.home';run(ctx,hass);
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
    assert.equal(r.edges[1].flow.style.getPropertyValue('offset-path'),'path("'+r.edges[1].line.getAttribute('d')+'")');
  }
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
