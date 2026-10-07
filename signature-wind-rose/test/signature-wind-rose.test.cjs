const {loadModule}=require('../../shared/test/module.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const YAML = require('yaml');
const base = path.resolve(__dirname,'..');
const definition = loadModule('signature-wind-rose');

const {Element:BaseElement,createDocument}=require('../../shared/test/dom.cjs');
class Element extends BaseElement {
  constructor(tag) {super(tag);this.isConnected=true;this.writes=0;}
  setAttribute(key,value) {super.setAttribute(key,value);this.writes++;}
  get textContent() {return super.textContent;}
  set textContent(value) {super.textContent=value;this.writes++;}
  remove() {super.remove();this.isConnected=false;}
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};
function fixture(t,options={},speedUnit='km/h') {
  let now=Date.parse('2026-10-04T18:00:00Z'), timerId=0;
  const timers=new Map(),listeners=new Map();
  class Clock extends Date {static now(){return now;}}
  const document={...createDocument(Element),hidden:false,
    addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}};
  const render=vm.runInNewContext('(function(hass,onTeardown,renderTemplate){return `'+definition.code+'`;})',{
    document,Date:Clock,Intl,CSS:{supports:(_,value)=>/^(#[a-f0-9]{6}|var\(--[a-z-]+, #[a-f0-9]{6}\))$/i.test(value)},setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,at:now+delay,delay});return id;},clearTimeout:id=>timers.delete(id)
  });
  const root=new Element('ha-card'),host=new Element('div');root.append(host);
  const ctx={card:root,elements:{mainContainer:host},config:{card_type:'button',button_type:'state',entity:'sensor.direction',signature_wind_rose:options}};
  const requests=[];
  const hass={connection:{},states:options.speed_entity ? {[options.speed_entity]:{state:'unavailable',attributes:{unit_of_measurement:speedUnit}}} : {},locale:{language:'fr',number_format:'space_comma'},callWS(message){
    return new Promise((resolve,reject)=>requests.push({message,resolve,reject}));
  }};
  const run=template=>render.call(ctx,hass,fn=>{ctx.teardown=fn;},template);const css=run();
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

test('calm footer distinguishes zero duration from missing data, hides without speed and follows cached periods',async t=>{
  const f=fixture(t,{speed_entity:'sensor.speed'});
  assert.equal(f.r.calm.hidden,false);assert.equal(f.r.calmValue.textContent,'—');
  await f.resolve(history(f));assert.equal(f.r.calmValue.textContent,'0 min');
  f.r.tabNodes[0].click();await f.resolve(history(f,135,0));assert.equal(f.r.calmValue.textContent,'1 h');
  f.r.tabNodes[1].click();assert.equal(f.r.calmValue.textContent,'0 min');assert.equal(f.requests.length,2);
  f.hass.locale={language:'en',number_format:'comma_decimal'};f.run();
  assert.equal(f.r.calmLabel.textContent,'Calm');assert.equal(f.requests.length,2);
  f.r.tabNodes[2].click();await f.resolve({});assert.equal(f.r.calmValue.textContent,'—');
  assert.ok(f.r.footer.getAttribute('title').endsWith('Calm —'));
  const noSpeed=fixture(t);await noSpeed.resolve(history(noSpeed));
  assert.equal(noSpeed.r.calm.hidden,true);assert.equal(noSpeed.r.footer.getAttribute('data-has-calm'),'false');
  assert.ok(!noSpeed.r.footer.getAttribute('title').includes('Calme'));
  const padded=fixture(t,{speed_entity:'sensor.speed'}),start=padded.now-86400000;
  await padded.resolve({'sensor.direction':[compressed(start,135)],
    'sensor.speed':[compressed(start,0),compressed(start+65*60000,3)]});
  assert.equal(padded.r.calmValue.textContent,'1 h 05');
});

test('speed bands share sector duration and mean weights time, with exact range boundaries',async t=>{
  const f=fixture(t,{speed_entity:'sensor.speed'}),start=f.now-86400000,h=3600000;
  const speeds=[compressed(start,2),compressed(start+12*h,5),compressed(start+18*h,10),compressed(start+22*h,20)];
  for(let n=1;n<30;n++)speeds.push(compressed(start+22*h+n*1000,20));
  await f.resolve({'sensor.direction':[compressed(start,180)],'sensor.speed':speeds});
  const d=result(f);
  assert.deepEqual(Array.from(d.speedBins[8]),[12*h,6*h,4*h,2*h]);
  assert.equal(d.speedBins[8].reduce((a,b)=>a+b,0),d.bins[8]);
  assert.equal(d.speedTotals[8]/d.bins[8],134/24);assert.equal(d.speedMaxima[8],20);
  assert.equal(f.r.legend.hidden,false);assert.equal(f.r.svg.getAttribute('data-speed-bands'),'true');
  f.r.sectors[8].click();
  assert.equal(f.r.tooltip.textContent,'S · 100 %\nDurée : 24 h\nMoyenne : 5,6 km/h\nMaximum : 20 km/h');
  assert.match(f.r.sectors[8].getAttribute('aria-label'),/Moyenne : 5,6 km\/h/);
  assert.equal(f.r.bands[8].filter(el=>el.getAttribute('d')).length,4);
  assert.equal(f.r.svg.querySelectorAll('text').length,4,'Only cardinal labels, no ring percentages');
});

test('speed statistics join changes and exclude calm, gaps, duplicate and end-boundary maxima',async t=>{
  const f=fixture(t,{speed_entity:'sensor.speed',calm_threshold:2}),start=f.now-86400000,h=3600000;
  await f.resolve({'sensor.direction':[compressed(start,0),compressed(start+6*h,90),compressed(start+20*h,'unknown')],
    'sensor.speed':[compressed(start,3),compressed(start+3*h,2),compressed(start+9*h,7),compressed(start+12*h,'unavailable'),
      compressed(start+15*h,99),compressed(start+15*h,12),compressed(start+20*h,50),compressed(f.now,100)]});
  const d=result(f);
  assert.equal(d.speedMaxima[0],3);assert.equal(d.speedMaxima[4],12);
  assert.equal(d.speedTotals[0]/d.bins[0],3);assert.equal(d.speedTotals[4]/d.bins[4],81/8);
  assert.deepEqual(Array.from(d.speedBins[4]),[0,3*h,5*h,0]);
  assert.equal(d.calm,6*h);assert.equal(d.covered,17*h);
  assert.equal(d.speedMaxima[8],null);
});

test('supported speed units convert bands to km/h and preserve native tooltip and calm units',async t=>{
  for(const [unit,speed,band] of [['m/s',3,2],['mph',4,1],['kn',12,3],['kt',2,0],['km/h',20,3]]) {
    const f=fixture(t,{speed_entity:'sensor.speed',calm_threshold:1},unit);
    await f.resolve(history(f,90,speed));
    assert.equal(result(f).speedBins[4][band],86400000,unit);
    f.r.sectors[4].click();assert.ok(f.r.tooltip.textContent.includes('Maximum : '+speed+' '+unit));
    assert.equal(f.r.legend.hidden,false);
  }
});

test('direction-only and missing or unsupported speed units keep a monochrome rose',async t=>{
  const directionOnly=fixture(t);await directionOnly.resolve(history(directionOnly));
  directionOnly.r.sectors[6].click();assert.equal(directionOnly.r.legend.hidden,true);
  assert.equal(directionOnly.r.tooltip.textContent,'SE · 100 % · 24 h');
  for(const unit of [null,'custom']) {
    const f=fixture(t,{speed_entity:'sensor.speed'},unit);await f.resolve(history(f));
    assert.equal(f.r.legend.hidden,true);assert.equal(f.r.svg.getAttribute('data-speed-bands'),'false');
    assert.ok(f.r.bands.flat().every(el=>!el.getAttribute('d')));
    f.r.sectors[6].click();assert.ok(f.r.tooltip.textContent.endsWith('Maximum : 3'+(unit ? ' '+unit : '')));
  }
});

test('speed details relocalize cached data and unit changes discard pending and cached aggregates',async t=>{
  const f=fixture(t,{speed_entity:'sensor.speed'});await f.resolve(history(f,270,6.8));
  f.r.sectors[12].click();f.hass.locale={language:'en',number_format:'comma_decimal'};f.run();
  assert.equal(f.requests.length,1);assert.match(f.r.tooltip.textContent,/W · 100 %\nDuration : 24 h\nMean : 6.8 km\/h/);
  f.hass.states['sensor.speed'].attributes.unit_of_measurement='m/s';f.run();
  assert.equal(f.r.cache.size,0);assert.equal(f.requests.length,2);assert.equal(f.r.legend.hidden,true);
  f.hass.states['sensor.speed'].attributes.unit_of_measurement='mph';f.run();
  await f.resolve(history(f,180,100),1);assert.equal(f.r.cache.size,0);
  await f.resolve(history(f,90,4),2);assert.equal(result(f).speedMaxima[4],4);
  assert.equal(result(f).speedBins[4][1],86400000);
});

test('distribution and documented examples compile with the standalone module',()=>{
  assert.equal(definition.version,'1.5.2');assert.deepEqual(definition.supported,['button']);
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
  assert.equal(f.r.calm.hidden,false);assert.equal(f.r.calmLabel.textContent,'Calme');assert.equal(f.r.calmValue.textContent,'6 h');
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
  assert.equal(f.r.calmValue.textContent,'6 h');
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
  const f=fixture(t);assert.equal(f.r.toolbar.hidden,false);await f.resolve(history(f));f.r.tabNodes[0].click();assert.equal(f.requests.length,2);
  assert.equal(Date.parse(f.requests[1].message.end_time)-Date.parse(f.requests[1].message.start_time),3600000);
  await f.resolve(history(f,270));f.run();assert.equal(f.r.period,1);
  f.r.tabNodes[1].click();assert.equal(f.requests.length,2);assert.equal(f.r.dominantValue.textContent,'SE');
  f.r.tabNodes[2].click();assert.equal(Date.parse(f.requests[2].message.end_time)-Date.parse(f.requests[2].message.start_time),168*3600000);
  f.ctx.config.signature_wind_rose.show_period_buttons=false;f.run();
  assert.equal(f.r.toolbar.hidden,true);assert.equal(f.r.period,24);assert.equal(f.requests.length,3);
  await f.resolve(history(f,180),2);assert.equal(f.r.dominantValue.textContent,'SE');assert.equal(f.r.cache.has(168),false);
  f.ctx.config.signature_wind_rose.hours=168;f.run();assert.equal(f.requests.length,4);
  assert.equal(Date.parse(f.requests[3].message.end_time)-Date.parse(f.requests[3].message.start_time),168*3600000);
  await f.resolve(history(f,180));f.run();assert.equal(f.r.period,168);assert.equal(f.r.toolbar.hidden,true);
  delete f.ctx.config.signature_wind_rose.show_period_buttons;f.run();
  assert.equal(f.r.toolbar.hidden,false);assert.equal(f.r.period,168);assert.equal(f.requests.length,4);
});
test('ignores out-of-order period responses, including failures',async t=>{
  const f=fixture(t);f.r.tabNodes[0].click();await f.resolve(history(f,90),1);await f.reject(0);
  assert.equal(f.r.period,1);assert.equal(f.r.phase,'ready');assert.equal(f.r.dominantValue.textContent,'E');assert.equal(f.r.cache.size,1);
});
test('ordinary state updates neither request nor recalculate nor rewrite the chart',async t=>{
  const f=fixture(t,{speed_entity:'sensor.speed'});await f.resolve(history(f));const data=result(f),nodes=[...f.r.sectors,...f.r.bands.flat()],writes=nodes.map(el=>el.writes);
  f.r.aggregate=()=>{throw new Error('Unexpected aggregation');};
  for(let n=0;n<30;n++){f.hass.states['sensor.speed'].state=String(n);f.run();}
  assert.equal(f.requests.length,1);assert.equal(result(f),data);assert.deepEqual(nodes.map(el=>el.writes),writes);assert.equal(f.timers.size,1);
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
  const f=fixture(t,{hours:5,refresh_interval:1,calm_threshold:-1,show_period_buttons:false});assert.equal(f.r.period,24);assert.equal(f.r.refresh,60);assert.equal(f.r.calmThreshold,0);assert.equal(f.r.toolbar.hidden,true);
  delete f.ctx.config.entity;f.run();assert.equal(f.r.phase,'configuration');assert.equal(f.timers.size,0);
});
test('custom color is removable and incompatible slider cards dispose the runtime',t=>{
  const f=fixture(t,{color:'#32b5ad'});assert.equal(f.r.canvas.style['--swr-accent'],'#32b5ad');
  delete f.ctx.config.signature_wind_rose.color;f.run();assert.equal(f.r.canvas.style['--swr-accent'],undefined);
  f.ctx.config.button_type='slider';f.run();assert.equal(f.ctx._signatureWindRose,undefined);assert.equal(f.listeners.size,0);
});

test('hover previews duration and percentage without requests and preserves tap selection',async t=>{
  const f=fixture(t);const start=Date.parse(f.requests[0].message.start_time),h=3600000;
  await f.resolve({'sensor.direction':[compressed(start,0),compressed(start+6*h,90)]});
  const north=f.r.sectors[0],east=f.r.sectors[4];
  north.event('pointerenter',{pointerType:'mouse'});
  assert.equal(f.r.tooltip.hidden,false);assert.match(f.r.tooltip.textContent,/N · 25 % · 6 h/);
  north.event('pointerleave');assert.equal(f.r.tooltip.hidden,true);
  north.click();east.event('pointerenter',{pointerType:'mouse'});
  assert.match(f.r.tooltip.textContent,/E · 75 % · 18 h/);
  east.event('pointerleave');assert.match(f.r.tooltip.textContent,/N · 25 % · 6 h/);
  north.click();assert.equal(f.r.tooltip.hidden,true);
  east.event('pointerenter',{pointerType:'touch'});assert.equal(f.r.tooltip.hidden,true);
  east.click();assert.equal(f.r.tooltip.hidden,false);
  east.click();assert.equal(f.r.tooltip.hidden,true);
  assert.equal(f.requests.length,1);
});

test('named wind colors use live theme variables and invalid colors restore the default',t=>{
  const f=fixture(t,{color:'blue'});
  assert.equal(f.r.canvas.style['--swr-accent'],'var(--blue-color, #2196f3)');
  f.ctx.config.signature_wind_rose.color='not-a-color';f.run();
  assert.equal(f.r.canvas.style['--swr-accent'],undefined);
  f.ctx.config.signature_wind_rose.color='#123456';f.run();
  assert.equal(f.r.canvas.style['--swr-accent'],'#123456');
});

test('wind template colors keep reading dependencies when the rendered color is cached',t=>{
  const f=fixture(t,{color:'{{ states(entity) }}'});
  let value='blue',reads=0;
  const template=(input,id)=>{assert.equal(input,'{{ states(entity) }}');assert.equal(id,'sensor.direction');reads++;return value;};
  f.run(template);assert.equal(f.r.canvas.style['--swr-accent'],'var(--blue-color, #2196f3)');
  f.run(template);assert.equal(reads,2);
  value='#123456';f.run(template);assert.equal(f.r.canvas.style['--swr-accent'],'#123456');
  value='invalid';f.run(template);assert.equal(f.r.canvas.style['--swr-accent'],undefined);
});
