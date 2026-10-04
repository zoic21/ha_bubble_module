const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const YAML = require('yaml');
const base = path.resolve(__dirname, '..');
const definition = YAML.parse(fs.readFileSync(path.join(base,'dist/signature-weather.yaml'),'utf8')).signature_weather;

class Element {
  constructor(tag) {
    this.tagName=tag;this.children=[];this.attrs=new Map();this.listeners=new Map();this.style={};this.events=[];this.hidden=false;
  }
  setAttribute(k,v) {this.attrs.set(k,String(v));}
  getAttribute(k) {return this.attrs.get(k) ?? null;}
  removeAttribute(k) {this.attrs.delete(k);}
  get textContent() {return (this._text||'')+this.children.map(c=>c.textContent).join('');}
  set textContent(v) {this.children.forEach(c=>{c.parentElement=null;});this.children=[];this._text=String(v);}
  append(...nodes) {
    for(const node of nodes) {
      if(node.parentElement) node.remove();
      node.parentElement=this;this.children.push(node);
    }
  }
  appendChild(node) {this.append(node);return node;}
  remove() {
    if(this.parentElement) this.parentElement.children=this.parentElement.children.filter(c=>c!==this);
    this.parentElement=null;
  }
  addEventListener(name,fn) {this.listeners.set(name,fn);}
  dispatchEvent(event) {this.events.push(event);}
  click() {const event={stopPropagation(){this.stopped=true;}};this.listeners.get('click')?.(event);return event;}
}
class CustomEvent {
  constructor(type,options) {this.type=type;Object.assign(this,options);}
}
let now='2026-10-04T11:46:00Z';
class Clock extends Date {
  constructor(...args) {super(...(args.length ? args : [now]));}
}
const document={createElement:tag=>new Element(tag)};
const render=vm.runInNewContext('(function(hass,onTeardown){return `'+definition.code+'`;})',{document,CustomEvent,Date:Clock,Intl});
const state=(value,unit)=>({state:String(value),attributes:unit ? {unit_of_measurement:unit} : {}});
function connection(deferred=false) {
  const calls=[];
  return {calls,subscribeMessage(callback,message) {
    const record={callback,message,unsubscribed:0};calls.push(record);
    const unsubscribe=()=>{record.unsubscribed++;};
    if(!deferred) return Promise.resolve(unsubscribe);
    return new Promise((resolve,reject)=>{record.resolve=()=>resolve(unsubscribe);record.reject=reject;});
  }};
}
function fixture(t,options={},extra={}) {
  const root=new Element('ha-card'),host=new Element('div');root.append(host);
  const ctx={card:root,elements:{mainContainer:host},config:{card_type:'button',button_type:'state',entity:'weather.home',signature_weather:options}};
  const weather={state:'cloudy',attributes:{friendly_name:'Maison',supported_features:3,temperature:23.4,temperature_unit:'°C',
    humidity:65,wind_speed:10,wind_speed_unit:'km/h',precipitation_unit:'mm',pressure:1013,pressure_unit:'hPa'}};
  const hass={connection:connection(),states:{'weather.home':weather},locale:{language:'fr',number_format:'space_comma',time_format:'24'},
    config:{time_zone:'Europe/Paris',unit_system:{temperature:'°C'}},...extra};
  const run=()=>render.call(ctx,hass,fn=>{ctx.teardown=fn;});
  const css=run();t.after(()=>ctx.teardown?.());
  const emit=forecast=>hass.connection.calls.at(-1).callback({forecast});
  return {ctx,hass,run,css,r:ctx._signatureWeather,emit};
}
const daily=[
  {datetime:'2026-10-04T10:00:00Z',condition:'cloudy',temperature:23.4,templow:17.2,precipitation_probability:20,wind_speed:10},
  {datetime:'2026-10-05T10:00:00Z',condition:'partlycloudy',temperature:23.4,templow:12.7,precipitation_probability:10,wind_speed:12},
  {datetime:'2026-10-06T10:00:00Z',condition:'sunny',temperature:22.9,templow:12,precipitation_probability:0,wind_speed:9},
  {datetime:'2026-10-07T10:00:00Z',condition:'rainy',temperature:16.3,templow:13.9,precipitation_probability:80,precipitation:2.4,wind_speed:18},
  {datetime:'2026-10-08T10:00:00Z',condition:'rainy',temperature:14.6,templow:8.9,precipitation_probability:70,wind_speed:14},
  {datetime:'2026-10-09T10:00:00Z',condition:'partlycloudy',temperature:12.8,templow:6.6,precipitation_probability:10,wind_speed:8}
];
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};

test('distribution compiles and all examples use the same standalone module',()=>{
  assert.equal(definition.name,'Signature Weather');assert.equal(definition.version,'1.0.0');assert.deepEqual(definition.supported,['button']);
  const layouts=[];
  for(const file of fs.readdirSync(path.join(base,'examples'))) {
    const card=YAML.parse(fs.readFileSync(path.join(base,'examples',file),'utf8'));
    assert.deepEqual(card.modules,['signature_weather']);assert.equal(card.grid_options.rows,'auto');assert.equal(card.button_type,'state');
    layouts.push(card.signature_weather.layout);
  }
  assert.deepEqual(layouts.sort(),['ranges','ribbon','summary']);
});
test('all three layouts render the real forecasts and keep provider measurements separate',t=>{
  for(const layout of ['ribbon','ranges','summary']) {
    const {r,emit}=fixture(t,{layout});emit(daily);
    assert.equal(r.canvas.getAttribute('data-layout'),layout);assert.equal(r.records.length,6);
    assert.equal(r.current.hidden,layout!=='summary');assert.equal(r.entries[0].high.textContent,'23°');assert.equal(r.entries[0].low.textContent,'17°');
    assert.equal(r.entries[3].icon.getAttribute('icon'),'mdi:weather-rainy');
    r.entries[3].el.click();assert.match(r.detailTitle.textContent,/mercredi.*Pluie/);
    assert.equal(r.detailNodes.precipitation_probability.value.textContent,'80 %');assert.equal(r.detailNodes.precipitation.value.textContent,'2,4 mm');
  }
});
test('only one active subscription is started across unrelated style passes',t=>{
  const {run,hass,r,emit}=fixture(t);const first=hass.connection.calls[0];
  assert.deepEqual({...first.message},{type:'weather/subscribe_forecast',forecast_type:'daily',entity_id:'weather.home'});
  emit(daily);const entry=r.entries[0];
  for(let i=0;i<10;i++) {hass.states['sensor.unrelated']=state(i);run();}
  assert.equal(hass.connection.calls.length,1);assert.equal(r.entries[0],entry);
  const cached=r.formatters.get('number|0');run();assert.equal(r.formatters.get('number|0'),cached);
});
test('summary switches supported periods and rejects late events from the old period',async t=>{
  const {r,hass,emit}=fixture(t,{layout:'summary'});emit(daily);await flush();
  const first=hass.connection.calls[0];assert.equal(r.tabs.hidden,false);assert.equal(r.tabNodes.daily.hidden,false);
  r.tabNodes.hourly.click();assert.equal(first.unsubscribed,1);assert.equal(hass.connection.calls.length,2);
  const hours=[{datetime:'2026-10-04T13:00:00Z',temperature:21,condition:'sunny'}];
  hass.connection.calls[1].callback({forecast:hours});assert.equal(r.entries[0].high.textContent,'21°');assert.equal(r.entries[0].low.hidden,true);
  first.callback({forecast:daily});assert.equal(r.entries[0].high.textContent,'21°');
  r.tabNodes.daily.click();assert.equal(r.entries[0].high.textContent,'23°');assert.equal(r.entries[0].low.hidden,false);
});
test('auto mode follows provider capabilities and hides a single period control',t=>{
  const {r,hass,run}=fixture(t,{layout:'summary'});
  hass.states['weather.home']={...hass.states['weather.home'],attributes:{...hass.states['weather.home'].attributes,supported_features:2}};run();
  assert.equal(r.period,'hourly');assert.equal(r.tabs.hidden,true);assert.equal(r.tabNodes.daily.hidden,true);
  hass.states['weather.home']={...hass.states['weather.home'],attributes:{...hass.states['weather.home'].attributes,supported_features:4}};run();
  assert.equal(r.period,'twice_daily');assert.equal(r.tabNodes.hourly.hidden,true);
});
test('explicit unsupported periods show a message instead of another forecast',t=>{
  const {r,hass}=fixture(t,{forecast_type:'twice_daily'});
  assert.equal(hass.connection.calls.length,0);assert.equal(r.phase,'unsupported');assert.match(r.status.textContent,/pas pris en charge/);
});
test('local sensors enable the current header in any layout and retain provider forecast values',t=>{
  const {r,emit}=fixture(t,{local:{temperature:'sensor.temp',humidity:'sensor.hum',wind_speed:'sensor.wind'}},
    {states:{'weather.home':{state:'cloudy',attributes:{supported_features:3,temperature:23,temperature_unit:'°C',wind_speed:10,wind_speed_unit:'km/h'}},
      'sensor.temp':state(19.8,'°C'),'sensor.hum':state(61,'%'),'sensor.wind':state(4,'km/h')}});
  emit(daily);assert.equal(r.current.hidden,false);assert.equal(r.temperatureValue.textContent,'19,8');assert.equal(r.temperatureUnit.textContent,'°C');
  assert.equal(r.metricNodes.humidity.value.textContent,'61 %');assert.equal(r.entries[0].high.textContent,'23°');
  assert.equal(r.detailNodes.wind_speed.value.textContent,'10 km/h');
  r.temperature.click();assert.equal(r.canvas.events.at(-1).detail.entityId,'sensor.temp');
  r.metricNodes.wind_speed.el.click();assert.equal(r.canvas.events.at(-1).detail.entityId,'sensor.wind');
});
test('local attribute sources, scaling, independent units and precision update without rebuilding',t=>{
  const {r,hass,run}=fixture(t,{layout:'summary',current_metrics:['wind_speed','wind_bearing'],local:{
    temperature:{entity:'sensor.station',attribute:'temperature',unit:'°F',precision:2},
    wind_speed:{entity:'sensor.wind',scale:3.6,unit:'km/h',precision:1},wind_bearing:'sensor.direction'}},
    {states:{'weather.home':{state:'sunny',attributes:{supported_features:3,temperature_unit:'°C'}},
      'sensor.station':{state:'ok',attributes:{temperature:68.25}},'sensor.wind':state(2,'m/s'),'sensor.direction':state('NNE')}});
  assert.equal(r.temperatureValue.textContent,'68,25');assert.equal(r.temperatureUnit.textContent,'°F');assert.equal(r.metricNodes.wind_speed.value.textContent,'7,2 km/h');
  assert.equal(r.metricNodes.wind_bearing.value.textContent,'NNE');const original=r.current;
  hass.states['sensor.station']={state:'ok',attributes:{temperature:70}};run();assert.equal(r.temperatureValue.textContent,'70,00');assert.equal(r.current,original);
});
test('unavailable configured local values remain dashes instead of silently using the provider',t=>{
  for(const value of ['unknown','unavailable','','NaN','Infinity']) {
    const {r}=fixture(t,{local:{temperature:'sensor.temp',humidity:'sensor.hum'}},{states:{
      'weather.home':{state:'sunny',attributes:{supported_features:1,temperature:23,humidity:65}},'sensor.temp':state(value),'sensor.hum':state(value)}});
    assert.equal(r.temperatureValue.textContent,'—');assert.equal(r.metricNodes.humidity.value.textContent,'—');assert.equal(r.metricNodes.humidity.el.hidden,false);
  }
});
test('zero and negative temperatures remain valid and missing minima are not invented',t=>{
  const {r,emit}=fixture(t,{layout:'ranges',precision:1});
  emit([{...daily[0],temperature:0,templow:-3.5,precipitation_probability:0},{...daily[1],temperature:-1,templow:null},{...daily[2],temperature:2,templow:2}]);
  assert.equal(r.entries[0].high.textContent,'0,0°');assert.equal(r.entries[0].low.textContent,'-3,5°');assert.equal(r.detailNodes.precipitation_probability.value.textContent,'0 %');
  assert.equal(r.entries[0].fill.hidden,false);assert.equal(r.entries[1].low.textContent,'—');assert.equal(r.entries[1].point.hidden,false);
  assert.equal(r.entries[2].fill.hidden,true);assert.equal(r.entries[2].point.hidden,false);
  assert.ok(Number.parseFloat(r.entries[0].fill.style.width)>Number.parseFloat(r.entries[1].fill.style.width) || r.entries[1].fill.hidden);
});
test('temperature bars share one scale across days',t=>{
  const {r,emit}=fixture(t,{layout:'ranges'});emit(daily);
  const lower=Math.min(...daily.map(x=>x.templow))-1,upper=Math.max(...daily.map(x=>x.temperature))+1;
  daily.forEach((item,i)=>{
    assert.ok(Math.abs(parseFloat(r.entries[i].fill.style.left)-(item.templow-lower)/(upper-lower)*100)<1e-9);
    assert.ok(Math.abs(parseFloat(r.entries[i].fill.style.width)-(item.temperature-item.templow)/(upper-lower)*100)<1e-9);
  });
});
test('selection survives refreshed or shifted forecasts by timestamp',t=>{
  const {r,emit}=fixture(t);emit(daily);r.entries[3].el.click();assert.equal(r.selectedDate,daily[3].datetime);
  emit(daily.slice(1));assert.equal(r.selected,2);assert.equal(r.records[r.selected].datetime,daily[3].datetime);
  assert.equal(r.entries[2].el.getAttribute('aria-pressed'),'true');assert.equal(r.entries[5].el.hidden,true);
  emit([daily[4],daily[5]]);assert.equal(r.selected,0);assert.equal(r.entries[0].el.getAttribute('aria-pressed'),'true');
});
test('daily filtering uses the HA timezone across UTC midnight and sorts the entries',t=>{
  const previousNow=now;now='2026-10-03T22:30:00Z';t.after(()=>{now=previousNow;});
  const {r,emit}=fixture(t);
  emit([{datetime:'2026-10-04T22:30:00Z',temperature:22},{datetime:'2026-10-03T21:30:00Z',temperature:10},
    {datetime:'2026-10-03T22:30:00Z',temperature:20},{datetime:'invalid',temperature:30}]);
  assert.equal(r.records.length,2);assert.equal(r.records[0].temperature,20);assert.equal(r.entries[0].label.textContent,'Auj.');
});
test('hourly filtering removes completed hours and supports 12h times',t=>{
  const {r,emit}=fixture(t,{forecast_type:'hourly'},{locale:{language:'en',number_format:'comma_decimal',time_format:'12'}});
  emit([{datetime:'2026-10-04T10:00:00Z',temperature:19},{datetime:'2026-10-04T11:00:00Z',temperature:20},{datetime:'2026-10-04T13:00:00Z',temperature:21}]);
  assert.equal(r.records.length,2);assert.equal(r.entries[0].label.textContent,'1:00 PM');assert.equal(r.entries[1].label.textContent,'3:00 PM');
});
test('twice daily forecasts distinguish day and night, including accessible labels',t=>{
  const {r,emit}=fixture(t,{forecast_type:'twice_daily'},{states:{'weather.home':{state:'cloudy',attributes:{supported_features:4,temperature_unit:'°C'}}}});
  emit([{...daily[0],is_daytime:true},{...daily[0],datetime:'2026-10-04T22:00:00Z',is_daytime:false,condition:'clear-night'}]);
  assert.match(r.entries[0].label.textContent,/Jour/);assert.match(r.entries[1].label.textContent,/Nuit/);
  assert.match(r.entries[1].el.getAttribute('aria-label'),/Nuit/);
});
test('entity changes discard old forecasts and release old subscriptions',async t=>{
  const {ctx,r,hass,run,emit}=fixture(t);emit(daily);await flush();const first=hass.connection.calls[0];
  hass.states['weather.other']={...hass.states['weather.home']};ctx.config.signature_weather.entity='weather.other';run();
  assert.equal(first.unsubscribed,1);assert.equal(r.forecast.hidden,true);assert.equal(hass.connection.calls.at(-1).message.entity_id,'weather.other');
  first.callback({forecast:daily});assert.equal(r.forecast.hidden,true);
});
test('teardown releases both completed and still-pending subscriptions without DOM writes afterward',async t=>{
  for(const deferred of [false,true]) {
    const c=connection(deferred);const {ctx,r}=fixture(t,{}, {connection:c});
    if(!deferred) await flush();ctx.teardown();const first=c.calls[0];
    if(deferred) {first.resolve();await flush();}
    assert.equal(first.unsubscribed,1);assert.equal(ctx._signatureWeather,undefined);assert.equal(r.canvas.parentElement,null);
    first.callback({forecast:daily});assert.equal(r.entries.length,0);
  }
});
test('changing connection releases a pending subscription as soon as it settles',async t=>{
  const old=connection(true);const {hass,run}=fixture(t,{}, {connection:old});
  hass.connection=connection();run();old.calls[0].resolve();await flush();
  assert.equal(old.calls[0].unsubscribed,1);assert.equal(hass.connection.calls.length,1);
});
test('subscription failures show an error and do not retry on every style pass',async t=>{
  const c=connection(true);const {r,run}=fixture(t,{}, {connection:c});c.calls[0].reject(new Error('failure'));await flush();
  assert.equal(r.phase,'error');assert.equal(r.forecast.hidden,true);assert.equal(r.status.textContent,'Prévisions indisponibles');
  for(let i=0;i<5;i++) run();assert.equal(c.calls.length,1);
});
test('a failed forecast retries when the weather entity actually updates',async t=>{
  const c=connection(true);const {hass,run,r}=fixture(t,{}, {connection:c});c.calls[0].reject(new Error('temporary provider failure'));await flush();
  hass.states['weather.home']={...hass.states['weather.home'],last_updated:'2026-10-04T12:00:00Z'};run();
  assert.equal(c.calls.length,2);assert.equal(r.phase,'loading');run();assert.equal(c.calls.length,2);
  c.calls[1].resolve();await flush();
});
test('weather unavailability hides cached forecasts and recovery starts one subscription',async t=>{
  const {r,hass,run,emit}=fixture(t);emit(daily);await flush();const first=hass.connection.calls[0];
  hass.states['weather.home']={...hass.states['weather.home'],state:'unavailable'};run();
  assert.equal(r.phase,'unavailable');assert.equal(r.forecast.hidden,true);assert.equal(first.unsubscribed,1);
  hass.states['weather.home']={...hass.states['weather.home'],state:'cloudy'};run();assert.equal(hass.connection.calls.length,2);
});
test('empty and null forecast events hide old entries and expose an empty state',t=>{
  const {r,emit}=fixture(t);emit(daily);emit(null);assert.equal(r.forecast.hidden,true);assert.equal(r.detail.hidden,true);
  assert.equal(r.status.textContent,'Aucune prévision disponible');assert.ok(r.entries.every(node=>node.el.hidden));
});
test('metric subsets and order, current visibility and details can change in-place',t=>{
  const {ctx,r,run,emit}=fixture(t,{layout:'summary',current_metrics:['humidity','wind_speed']});emit(daily);
  ctx.config.signature_weather.current_metrics=['wind_speed','humidity'];run();
  assert.equal(r.metrics.children[0],r.metricNodes.wind_speed.el);
  ctx.config.signature_weather.current_metrics=[];ctx.config.signature_weather.show_current=false;ctx.config.signature_weather.show_details=false;run();
  assert.equal(r.metrics.hidden,true);assert.equal(r.current.hidden,true);assert.equal(r.detail.hidden,true);
});
test('number and language changes refresh values and formatters without recreating the card',t=>{
  const {r,hass,run,emit}=fixture(t,{layout:'summary',precision:1});emit(daily);const node=r.entries[0];
  assert.equal(node.high.textContent,'23,4°');hass.locale={language:'en',number_format:'comma_decimal',time_format:'24'};run();
  assert.equal(r.entries[0],node);assert.equal(node.high.textContent,'23.4°');assert.equal(r.condition.textContent,'Cloudy');assert.equal(r.periodLabel.textContent,'Days · °C');
});
test('custom conditions are inserted as text, and missing provider metrics are omitted',t=>{
  const value='<img src=x onerror=alert(1)>';
  const {r}=fixture(t,{layout:'summary'},{states:{'weather.home':{state:value,attributes:{supported_features:1,temperature:0,temperature_unit:'°C'}}}});
  assert.equal(r.condition.textContent,value);assert.equal(r.condition.children.length,0);assert.equal(r.metrics.hidden,true);
  assert.equal(r.temperatureValue.textContent,'0,0');assert.equal(r.currentIcon.getAttribute('icon'),'mdi:weather-cloudy');
});
test('disabled/unsupported card types release their existing runtime',async t=>{
  const {ctx,hass,run}=fixture(t);await flush();ctx.config.button_type='slider';run();
  assert.equal(ctx._signatureWeather,undefined);assert.equal(hass.connection.calls[0].unsubscribed,1);
});
test('documentation local links and YAML examples parse',()=>{
  const docs=[path.resolve(base,'..','README.md'),path.join(base,'doc','README.md')];
  for(const file of docs) {
    const source=fs.readFileSync(file,'utf8');
    for(const [,link] of source.matchAll(/\]\(([^)]+)\)/g)) {
      if(/^(https?:|#)/.test(link)) continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(file),link.split('#')[0])),link);
    }
    for(const [,yaml] of source.matchAll(/```yaml\n([\s\S]*?)```/g)) assert.doesNotThrow(()=>YAML.parse(yaml));
  }
});
