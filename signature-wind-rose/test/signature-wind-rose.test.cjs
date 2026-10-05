const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const YAML = require('yaml');
const base = path.resolve(__dirname,'..');
const definition = YAML.parse(fs.readFileSync(path.join(base,'dist/signature-wind-rose.yaml'),'utf8')).signature_wind_rose;

class Element {
  constructor(tag) {
    this.tagName=tag;this.children=[];this.attrs=new Map();this.listeners=new Map();this.hidden=false;this.isConnected=true;this.writes=0;
    this.style={setProperty:(key,value)=>{this.style[key]=value;},removeProperty:key=>{delete this.style[key];}};
  }
  setAttribute(key,value) {this.attrs.set(key,String(value));this.writes++;}
  getAttribute(key) {return this.attrs.get(key) ?? null;}
  removeAttribute(key) {this.attrs.delete(key);}
  get textContent() {return this._text || '';}
  set textContent(value) {this._text=String(value);this.writes++;}
  append(...nodes) {for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  remove() {if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;this.isConnected=false;}
  addEventListener(name,fn) {this.listeners.set(name,fn);}
  event(name,extra={}) {
    const event={target:this,stopPropagation(){this.stopped=true;},preventDefault(){this.prevented=true;},...extra};
    this.listeners.get(name)?.(event);return event;
  }
  click() {return this.event('click');}
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};
function fixture(t,options={}) {
  let now=Date.parse('2026-10-04T18:00:00Z'), timerId=0;
  const timers=new Map(),listeners=new Map();
  class Clock extends Date {static now(){return now;}}
  const document={hidden:false,createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),
    addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}};
  const render=vm.runInNewContext('(function(hass,onTeardown){return `'+definition.code+'`;})',{
    document,Date:Clock,Intl,setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,at:now+delay,delay});return id;},clearTimeout:id=>timers.delete(id)
  });
  const root=new Element('ha-card'),host=new Element('div');root.append(host);
  const ctx={card:root,elements:{mainContainer:host},config:{card_type:'button',button_type:'state',entity:'sensor.direction',signature_wind_rose:options}};
  const requests=[];
  const hass={connection:{},states:{},locale:{language:'fr',number_format:'space_comma'},callWS(message){
    return new Promise((resolve,reject)=>requests.push({message,resolve,reject}));
  }};
  const run=()=>render.call(ctx,hass,fn=>{ctx.teardown=fn;});const css=run();
  t.after(()=>ctx.teardown?.());
  const resolve=async(history,index=requests.length-1)=>{requests[index].resolve(history);await flush();};
  const reject=async(index=requests.length-1)=>{requests[index].reject(new Error('history failed'));await flush();};
  const advance=async milliseconds=>{now+=milliseconds;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}await flush();};
  return {ctx,hass,run,css,r:ctx._signatureWindRose,requests,resolve,reject,advance,timers,document,listeners,get now(){return now;}};
}
const compressed=(milliseconds,state)=>({lu:milliseconds/1000,s:String(state)});
function history(f,direction=135,speed=3) {
  const start=Date.parse(f.requests.at(-1).message.start_time);
  return {'sensor.direction':[compressed(start,direction)],'sensor.speed':[compressed(start,speed)]};
}
const result=f=>f.r.cache.get(f.r.period).data;

test('distribution and documented examples compile with the standalone module',()=>{
  assert.equal(definition.version,'1.1.1');assert.deepEqual(definition.supported,['button']);
  for(const file of fs.readdirSync(path.join(base,'examples'))){
    const example=YAML.parse(fs.readFileSync(path.join(base,'examples',file),'utf8'));
    assert.deepEqual(example.modules,['signature_wind_rose']);assert.equal(example.grid_options.rows,'auto');assert.equal(example.button_type,'state');
  }
  for(const doc of [path.join(base,'doc/README.md'),path.resolve(base,'../README.md')]){
    const content=fs.readFileSync(doc,'utf8');
    for(const [,link] of content.matchAll(/\]\(([^)]+)\)/g))if(!/^(https?:|#)/.test(link))assert.ok(fs.existsSync(path.resolve(path.dirname(doc),link.split('#')[0])),link);
    for(const [,yaml] of content.matchAll(/```yaml\n([\s\S]*?)```/g))assert.doesNotThrow(()=>YAML.parse(yaml));
  }
});
test('requests exact raw history for the two configured entities, without attributes',t=>{
  const f=fixture(t,{speed_entity:'sensor.speed'}),m=f.requests[0].message;
  assert.equal(m.type,'history/history_during_period');assert.equal(Date.parse(m.end_time)-Date.parse(m.start_time),86400000);
  assert.deepEqual(Array.from(m.entity_ids),['sensor.direction','sensor.speed']);
  assert.equal(m.minimal_response,true);assert.equal(m.no_attributes,true);assert.equal(m.include_start_time_state,true);assert.equal(m.significant_changes_only,false);
});
test('constant wind uses boundary state for the entire period and does not require current state',async t=>{
  const f=fixture(t);await f.resolve(history(f));const d=result(f);
  assert.equal(d.wind,86400000);assert.equal(d.bins[6],86400000);assert.equal(d.dominant,6);
  assert.equal(f.r.dominantValue.textContent,'SE');assert.equal(f.r.chart.hidden,false);assert.equal(f.r.status.hidden,true);
  assert.equal(f.r.frequencyLabel.textContent,'Fréquence');assert.equal(f.r.frequencyValue.textContent,'100 %');
  assert.ok(!/NaN|undefined/.test(f.r.sectors[6].getAttribute('d')));
});
test('weights elapsed time rather than state counts, and uses compressed last_updated at the boundary',async t=>{
  const f=fixture(t),end=f.now,start=end-86400000;
  const records=[{lu:start/1000,lc:(start-86400000)/1000,s:'0'},compressed(end-3600000,90)];
  for(let n=1;n<30;n++)records.push(compressed(end-3600000+n*1000,90));
  await f.resolve({'sensor.direction':records});const d=result(f);
  assert.equal(d.bins[0],23*3600000);assert.equal(d.bins[4],3600000);assert.equal(d.dominant,0);
});
test('wraps north across 359, 1, 360 and negative bearings; accepts French and English directions',t=>{
  const {r}=fixture(t);for(const bearing of [359,1,360,-1,'N'])assert.equal(Math.round(r.direction(bearing)/22.5)%16,0);
  assert.equal(r.direction('SSO'),202.5);assert.equal(r.direction('SSW'),202.5);assert.equal(r.direction('ONO'),292.5);
  assert.equal(r.direction('O'),270);assert.equal(r.direction('W'),270);assert.equal(r.direction('unknown'),null);assert.equal(r.direction(''),null);
});
test('joins asynchronous direction/speed histories and excludes calm and unavailable intervals',async t=>{
  const f=fixture(t,{speed_entity:'sensor.speed',calm_threshold:0.5});const start=f.now-86400000,h=3600000;
  await f.resolve({'sensor.direction':[compressed(start,0),compressed(start+6*h,90),compressed(start+20*h,'unavailable')],
    'sensor.speed':[compressed(start,2),compressed(start+3*h,0.5),compressed(start+9*h,2),compressed(start+12*h,'unknown'),compressed(start+15*h,3)]});
  const d=result(f);assert.equal(d.bins[0],3*h);assert.equal(d.bins[4],8*h);assert.equal(d.calm,6*h);assert.equal(d.covered,17*h);
  assert.equal(f.r.frequencyValue.textContent,'72,7 %');
  assert.match(f.r.footer.getAttribute('title'),/17 h \/ 24 h/);
  f.r.sectors[4].click();assert.match(f.r.tooltip.textContent,/72,7 %/);assert.match(f.r.tooltip.textContent,/8 h/);
});
test('partial histories do not extend values backward, and full-form states also work',async t=>{
  const f=fixture(t);await f.resolve({'sensor.direction':[{state:'180',last_changed:new Date(f.now-3600000).toISOString()}]});
  assert.equal(result(f).wind,3600000);assert.match(f.r.footer.getAttribute('title'),/1 h \/ 24 h/);
});
test('unsorted histories, duplicate timestamps and end-boundary records do not invent time',async t=>{
  const f=fixture(t),start=f.now-86400000;
  await f.resolve({'sensor.direction':[compressed(start+3600000,90),compressed(start,0),compressed(start,180),compressed(f.now,270),{lu:'invalid',s:'0'}]});
  assert.equal(result(f).bins[8],3600000);assert.equal(result(f).bins[4],23*3600000);assert.equal(result(f).bins[12],0);
});
test('zero and missing speeds remain distinct; negative speed is invalid and calm needs no direction',async t=>{
  const f=fixture(t,{speed_entity:'sensor.speed'});const start=f.now-86400000,h=3600000;
  await f.resolve({'sensor.speed':[compressed(start,0),compressed(start+6*h,-1),compressed(start+12*h,3)]});
  assert.equal(result(f).calm,6*h);assert.equal(result(f).wind,0);assert.equal(f.r.dominantValue.textContent,'Calme');
  assert.match(f.r.status.textContent,/Vent calme/);assert.equal(f.r.chart.hidden,true);
  assert.equal(f.r.frequencyValue.textContent,'—');
});
test('empty or unavailable history does not fall back to a fabricated current distribution',async t=>{
  const f=fixture(t,{speed_entity:'sensor.speed'});f.hass.states['sensor.direction']={state:'135'};
  await f.resolve({'sensor.direction':[compressed(f.now-86400000,'unknown')]});
  assert.equal(result(f).covered,0);assert.equal(f.r.dominantValue.textContent,'—');assert.equal(f.r.status.textContent,'Aucun historique exploitable');
  assert.equal(f.r.frequencyValue.textContent,'—');
});
test('sector detail is available through touch and keyboard and suppresses native card actions',async t=>{
  const f=fixture(t);await f.resolve(history(f));const el=f.r.sectors[6];
  assert.equal(el.getAttribute('tabindex'),'0');assert.match(el.getAttribute('aria-label'),/SE · 100 % · 24 h/);
  const event=el.click();assert.equal(event.stopped,true);assert.equal(f.r.tooltip.hidden,false);
  el.event('keydown',{key:'Escape'});assert.equal(f.r.tooltip.hidden,true);
  const keyboard=el.event('keydown',{key:' '});assert.equal(keyboard.prevented,true);assert.equal(f.r.tooltip.hidden,false);
  f.r.chart.event('click');assert.equal(f.r.tooltip.hidden,true);
});
test('period buttons cache recent aggregates and preserve user choice on state updates',async t=>{
  const f=fixture(t);await f.resolve(history(f));f.r.tabNodes[0].click();assert.equal(f.requests.length,2);
  assert.equal(Date.parse(f.requests[1].message.end_time)-Date.parse(f.requests[1].message.start_time),3600000);
  await f.resolve(history(f,270));f.run();assert.equal(f.r.period,1);
  f.r.tabNodes[1].click();assert.equal(f.requests.length,2);assert.equal(f.r.dominantValue.textContent,'SE');
  f.r.tabNodes[2].click();assert.equal(Date.parse(f.requests[2].message.end_time)-Date.parse(f.requests[2].message.start_time),168*3600000);
});
test('ignores out-of-order period responses, including failures',async t=>{
  const f=fixture(t);f.r.tabNodes[0].click();await f.resolve(history(f,90),1);await f.reject(0);
  assert.equal(f.r.period,1);assert.equal(f.r.phase,'ready');assert.equal(f.r.dominantValue.textContent,'E');assert.equal(f.r.cache.size,1);
});
test('ordinary state updates neither request nor recalculate nor rewrite the chart',async t=>{
  const f=fixture(t);await f.resolve(history(f));const data=result(f),writes=f.r.sectors.map(el=>el.writes);
  f.r.aggregate=()=>{throw new Error('Unexpected aggregation');};
  for(let n=0;n<30;n++){f.hass.states['sensor.other']={state:String(n)};f.run();}
  assert.equal(f.requests.length,1);assert.equal(result(f),data);assert.deepEqual(f.r.sectors.map(el=>el.writes),writes);assert.equal(f.timers.size,1);
});
test('refreshes only after the interval, keeps the last rose during the request and replaces it',async t=>{
  const f=fixture(t);await f.resolve(history(f));await f.advance(299000);assert.equal(f.requests.length,1);
  await f.advance(1000);assert.equal(f.requests.length,2);assert.equal(f.r.chart.hidden,false);
  await f.resolve(history(f,270));assert.equal(f.r.dominantValue.textContent,'O');assert.equal(f.timers.size,1);
});
test('history errors retry after a bounded interval, never on each hass update',async t=>{
  const f=fixture(t);await f.reject();assert.equal(f.r.status.textContent,'Historique indisponible');
  for(let n=0;n<20;n++)f.run();assert.equal(f.requests.length,1);
  await f.advance(300000);assert.equal(f.requests.length,2);await f.resolve(history(f));assert.equal(f.r.phase,'ready');
});
test('configuration/source/connection changes discard cached and pending histories',async t=>{
  const f=fixture(t);f.ctx.config.signature_wind_rose.direction_entity='sensor.other';f.run();
  await f.resolve(history(f),0);assert.equal(f.r.cache.size,0);
  const start=f.now-86400000;await f.resolve({'sensor.other':[compressed(start,180)]},1);assert.equal(f.r.dominantValue.textContent,'S');
  f.hass.connection={};f.run();assert.equal(f.requests.length,3);assert.equal(f.r.cache.size,0);
  await f.resolve({'sensor.other':[compressed(start,180)]});
  f.ctx.config.signature_wind_rose.direction_offset=90;f.run();await f.resolve({'sensor.other':[compressed(start,180)]});assert.equal(f.r.dominantValue.textContent,'O');
});
test('visibility pauses refresh, resumes stale data and disconnected cards make no requests',async t=>{
  const f=fixture(t);await f.resolve(history(f));f.document.hidden=true;f.listeners.get('visibilitychange')();assert.equal(f.timers.size,0);
  await f.advance(600000);assert.equal(f.requests.length,1);f.document.hidden=false;f.listeners.get('visibilitychange')();assert.equal(f.requests.length,2);
  await f.resolve(history(f));f.r.host.isConnected=false;await f.advance(300000);f.run();assert.equal(f.requests.length,2);assert.equal(f.timers.size,0);
});
test('teardown cleans timers/listeners/DOM and ignores a request still in flight',async t=>{
  const f=fixture(t),r=f.r;f.ctx.teardown();assert.equal(f.ctx._signatureWindRose,undefined);assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);
  assert.equal(r.canvas.parentElement,null);await f.resolve(history(f));assert.equal(r.cache.size,0);assert.equal(f.timers.size,0);
});
test('locale changes update compass labels and numbers without another history request',async t=>{
  const f=fixture(t);await f.resolve(history(f,270));assert.equal(f.r.dominantValue.textContent,'O');
  f.hass.locale={language:'en',number_format:'comma_decimal'};f.run();assert.equal(f.r.dominantValue.textContent,'W');assert.equal(f.r.tabNodes[1].textContent,'1 day');assert.equal(f.requests.length,1);
  assert.equal(f.r.frequencyLabel.textContent,'Frequency');assert.equal(f.r.frequencyValue.textContent,'100 %');
});
test('invalid options fall back and absent direction shows a configuration message',t=>{
  const f=fixture(t,{hours:5,refresh_interval:1,calm_threshold:-1});assert.equal(f.r.period,24);assert.equal(f.r.refresh,60);assert.equal(f.r.calmThreshold,0);
  delete f.ctx.config.entity;f.run();assert.equal(f.r.phase,'configuration');assert.equal(f.timers.size,0);
});
test('custom color is removable and incompatible slider cards dispose the runtime',t=>{
  const f=fixture(t,{color:'#32b5ad'});assert.equal(f.r.canvas.style['--swr-accent'],'#32b5ad');
  delete f.ctx.config.signature_wind_rose.color;f.run();assert.equal(f.r.canvas.style['--swr-accent'],undefined);
  f.ctx.config.button_type='slider';f.run();assert.equal(f.ctx._signatureWindRose,undefined);assert.equal(f.listeners.size,0);
});
