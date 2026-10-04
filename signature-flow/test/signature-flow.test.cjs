const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const YAML = require('yaml');
const base = path.resolve(__dirname, '..');
const definition = YAML.parse(fs.readFileSync(path.join(base,'dist/signature-flow.yaml'),'utf8')).signature_flow;
const render = new Function('hass','onTeardown','renderTemplate','return `'+definition.code+'`;');

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
  closest(selector) {return this.classList.contains(selector.slice(1)) ? this : this.parentElement?.closest(selector);}
  getBoundingClientRect() {return {left:0,right:468,top:0,bottom:280,width:468,height:280};}
}
global.document={createElement:()=>new Element(),createElementNS:()=>new Element()};
global.CSS={supports:(_,s)=>s!=='invalid'};
global.ResizeObserver=class {constructor(fn){this.fn=fn;}observe(){}disconnect(){this.disconnected=true;}};
const state=(value,unit='W')=>({state:String(value),attributes:{unit_of_measurement:unit}});
const options={solar:{entity:'sensor.solar'},grid:{entity:'sensor.grid'},home:{entity:'sensor.home'},
  battery:{entity:'sensor.soc',power_entity:'sensor.battery'},bottom:{entity:'sensor.water',scale:1000,unit:'L/min',precision:1}};
const states={'sensor.solar':state(1794),'sensor.grid':state(-11),'sensor.home':state(401),
  'sensor.soc':state(14,'%'),'sensor.battery':state(-1381),'sensor.water':state(0,'m³/min')};
const run=(ctx,hass,template)=>render.call(ctx,hass,fn=>ctx.teardown=fn,template);
function fixture(t,extra={},data={}) {
  const root=new Element(),host=new Element();root.append(host);
  const ctx={card:root,elements:{mainContainer:host},config:{card_type:'button',button_type:'state',signature_flow:{...options,...extra}}};
  const hass={states:{...states,...data},locale:{language:'fr-FR',number_format:'space_comma'}};
  const css=run(ctx,hass);t.after(()=>ctx.teardown());return {ctx,hass,css,r:ctx._signatureFlow};
}
test('distribution metadata and the home example agree on the module ID',()=>{
  assert.equal(definition.name,'Signature Flow');assert.equal(definition.version,'1.0.0');assert.deepEqual(definition.supported,['button']);
  const home=YAML.parse(fs.readFileSync(path.join(base,'examples/home.yaml'),'utf8'));
  assert.deepEqual(home.modules,['signature_flow']);assert.equal(home.signature_flow.bottom.scale,1000);
  assert.equal(home.grid_options.rows,5);assert.equal(home.signature_flow.height,310);
  for(const key of ['solar','grid','home','battery','bottom']) assert.match(home.signature_flow[key].tap_action.navigation_path,/^#/);
});
test('snapshot uses instantaneous values and correct net directions',t=>{
  const {r}=fixture(t);assert.equal(r.nodes.solar.value.textContent,'1\u202f794 W');
  assert.equal(r.nodes.battery.value.textContent,'14 %');assert.equal(r.nodes.bottom.value.textContent,'0,0 L/min');
  assert.equal(r.nodes.battery.secondary.textContent,'Recharge · 1\u202f381 W');
  assert.equal(r.nodes.grid.secondary.textContent,'Injection');
  assert.equal(r.edges.grid.group.getAttribute('data-direction'),'-1');
  assert.equal(r.edges.battery.group.getAttribute('data-direction'),'-1');
  assert.equal(r.edges.solar.group.getAttribute('data-direction'),'1');
});
test('grid import, battery discharge and inversion update existing elements',t=>{
  const {ctx,hass,r}=fixture(t);
  run(ctx,{...hass,states:{...hass.states,'sensor.grid':state(130),'sensor.battery':state(200)}});
  assert.equal(ctx._signatureFlow,r);assert.equal(r.nodes.grid.secondary.textContent,'Importation');
  assert.equal(r.nodes.battery.secondary.textContent,'Décharge · 200 W');
  ctx.config.signature_flow.battery={...options.battery,invert_flow:true};run(ctx,hass);
  assert.equal(r.nodes.battery.secondary.textContent,'Décharge · 1\u202f381 W');
});
test('missing, blank, unknown and non-finite values never animate as zero',t=>{
  for(const invalid of ['unknown','unavailable','','NaN','Infinity']) {
    const {r}=fixture(t,{}, {'sensor.solar':state(invalid),'sensor.battery':state(invalid),'sensor.water':state(invalid)});
    assert.equal(r.nodes.solar.value.textContent,'—');assert.equal(r.nodes.bottom.value.textContent,'—');
    assert.equal(r.edges.solar.group.getAttribute('data-direction'),'0');
    assert.equal(r.nodes.battery.secondary.textContent,'Indisponible');
  }
  const {r}=fixture(t,{solar:{entity:'sensor.missing'}});assert.equal(r.nodes.solar.value.textContent,'—');
});
test('zero, deadband, scaling and power scaling affect their own measurements',t=>{
  const {r}=fixture(t,{deadband:0.2,solar:{entity:'sensor.solar',scale:0.001,unit:'kW',precision:2},
    battery:{...options.battery,power_scale:0.001,power_unit:'kW',power_precision:2}}, {'sensor.water':state(0.0001,'m³/min')});
  assert.equal(r.nodes.solar.value.textContent,'1,79 kW');assert.equal(r.nodes.bottom.value.textContent,'0,1 L/min');
  assert.equal(r.edges.bottom.group.getAttribute('data-direction'),'0');
  assert.equal(r.nodes.battery.secondary.textContent,'Recharge · 1,38 kW');
});
test('locale and number preferences are independent and refresh without rebuilding',t=>{
  const {ctx,hass,r}=fixture(t);run(ctx,{...hass,locale:{language:'en',number_format:'none'}});
  assert.equal(r.nodes.solar.label.textContent,'Solar');assert.equal(r.nodes.solar.value.textContent,'1794 W');
  assert.equal(r.nodes.battery.secondary.textContent,'Charging · 1381 W');
  run(ctx,{...hass,locale:{language:'fr',number_format:'comma_decimal'}});
  assert.equal(r.nodes.bottom.value.textContent,'0.0 L/min');
});
test('native action targets distinguish the block, primary value and battery power',t=>{
  const {r}=fixture(t,{battery:{...options.battery,tap_action:{action:'navigate',navigation_path:'#battery'},
    hold_action:{action:'none'},double_tap_action:{action:'toggle'}}});
  assert.deepEqual(JSON.parse(r.nodes.battery.el.dataset.tapAction),{action:'navigate',navigation_path:'#battery'});
  assert.equal(r.nodes.battery.value.dataset.entity,'sensor.soc');
  assert.equal(JSON.parse(r.nodes.battery.value.dataset.tapAction).action,'more-info');
  assert.equal(r.nodes.battery.secondary.dataset.entity,'sensor.battery');
  assert.equal(r.nodes.battery.secondary.classList.contains('sf-detail'),true);
  assert.equal(JSON.parse(r.nodes.battery.el.dataset.doubleTapAction).action,'toggle');
});
test('keyboard dispatches the native hass-action contract once and ignores held keys',t=>{
  const {r}=fixture(t,{home:{...options.home,tap_action:{action:'navigate',navigation_path:'#home'}}});
  let prevented=0;const event={key:'Enter',target:r.nodes.home.el,preventDefault(){prevented++;},stopPropagation(){}};
  r.keyboard(event);r.keyboard({...event,repeat:true});
  assert.equal(prevented,1);assert.equal(r.nodes.home.el.events.length,1);
  assert.equal(r.nodes.home.el.events[0].type,'hass-action');
  assert.equal(r.nodes.home.el.events[0].detail.config.tap_action.navigation_path,'#home');
});
test('templates use the supplied helper and output remains inert text',t=>{
  const {ctx,hass,r}=fixture(t,{solar:{...options.solar,state:'{{ main }}',secondary:'{{ forecast }}',
    secondary_entity:'sensor.forecast',unit:'kW',color:'invalid'}});
  const calls=[];run(ctx,hass,(template,id)=>{calls.push([template,id]);return '<img src=x onerror=alert(1)>';});
  assert.deepEqual(calls,[['{{ main }}','sensor.solar'],['{{ forecast }}','sensor.forecast']]);
  assert.equal(r.nodes.solar.number.textContent,'<img src=x onerror=alert(1)>');
  assert.equal(r.nodes.solar.number.children.length,0);assert.equal(r.nodes.solar.el.style.getPropertyValue('--sf-color'),'#ff9800');
});
test('each evaluation reads every configured state through the tracked object',t=>{
  const {ctx,hass}=fixture(t,{solar:{...options.solar,secondary_entity:'sensor.forecast'}});
  for(let i=0;i<2;i++) {
    const reads=new Set();run(ctx,{...hass,states:new Proxy(hass.states,{get(target,id){reads.add(id);return target[id];}})});
    for(const id of [...Object.keys(states),'sensor.forecast']) assert.ok(reads.has(id),id);
  }
});
test('optional sources can be enabled, disabled and retargeted without rebuilding',t=>{
  const {ctx,hass,r}=fixture(t);assert.ok(r.nodes.top.el.hidden);
  ctx.config.signature_flow.top={entity:'sensor.solar',name:'Other'};run(ctx,hass);
  assert.equal(r.nodes.top.el.hidden,false);assert.ok(r.canvas.classList.contains('sf-has-top'));
  ctx.config.signature_flow.top.enabled=false;ctx.config.signature_flow.bottom.entity='sensor.home';run(ctx,hass);
  assert.equal(r.nodes.top.el.hidden,true);assert.equal(r.nodes.bottom.value.dataset.entity,'sensor.home');
});
test('teardown disconnects the observer and restores the native card on removal or unsupported type',t=>{
  const {ctx,hass,r}=fixture(t);ctx.config.button_type='slider';run(ctx,hass);
  assert.equal(ctx._signatureFlow,undefined);assert.ok(r.observer.disconnected);
  assert.equal(r.canvas.listeners.size,0);assert.equal(r.host.children.length,0);
  assert.equal(r.root.getAttribute('data-signature-flow'),null);ctx.teardown();
});
test('documentation links resolve locally',()=>{
  const doc=fs.readFileSync(path.join(base,'doc/README.md'),'utf8');
  for(const match of doc.matchAll(/\]\((\.\.\/[^)]+)\)/g)) assert.ok(fs.existsSync(path.resolve(base,'doc',match[1])),match[1]);
});
