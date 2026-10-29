const assert = require('node:assert/strict');
const vm = require('node:vm');
const {test} = require('node:test');
const {loadModule} = require('../../shared/test/module.cjs');
const definition = loadModule('signature-panel');
const ids = ['sensor.hc_cost','sensor.hp_cost'];
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture(intl = Intl, sharedContext) {
  let stamp = Date.parse('2026-10-16T10:00:00Z');
  class Clock extends Date { static now() { return stamp; } }
  const context = sharedContext || vm.createContext({...require('../../signature-shared/test/dom.cjs'),Intl:intl,Date:Clock,setTimeout,clearTimeout});
  const render = vm.runInContext('(function(hass,onTeardown,renderTemplate){return `' + definition.code + '`;})',context);
  const {Element} = context,root = new Element(),content = new Element(),names = new Element(),state = new Element();
  content.className = 'bubble-content-container'; names.className = 'bubble-name-container'; state.className = 'bubble-state';
  root.append(content); content.append(names); names.append(state);
  const summary = {name:'Coût du jour',secondary:'Hors abonnement',statistics:{statistic_ids:ids,unit:'€',decimals:2}};
  const ctx = {card:root,config:{card_type:'button',button_type:'state',entity:'sensor.power',show_icon:false,
    signature_panel:{information:[summary]}},elements:{state,contentContainer:content,nameContainer:names}};
  const calls = [];
  let reply = () => Object.fromEntries(ids.map(id => [id,[{start:'2026-10-15T22:00:00Z',change:1}]]));
  const hass = {config:{time_zone:'Europe/Paris'},locale:{language:'fr-FR',number_format:'space_comma'},states:{
    'sensor.power':{state:'580',attributes:{unit_of_measurement:'W'}},
    'sensor.hc_cost':{state:'900',attributes:{unit_of_measurement:'EUR'}},
    'sensor.hp_cost':{state:'1100',attributes:{unit_of_measurement:'EUR'}}},
    callWS:request => { calls.push(request); return reply(request); }};
  return {context,ctx,root,hass,summary,calls,run:()=>render.call(ctx,hass,fn=>ctx.teardown=fn,x=>x),
    setTime:time=>stamp=typeof time==='number'?time:Date.parse(time),reply:fn=>reply=fn,
    value:()=>root.querySelector('.dp-panel-state')?.textContent};
}

test('cached daily totals keep their DOM and formatters and only read current date parts',async t=>{
  let numberFormats=0,dateParts=0;
  class NumberFormat extends Intl.NumberFormat {constructor(...args){super(...args);numberFormats++;}}
  class DateTimeFormat extends Intl.DateTimeFormat {formatToParts(...args){dateParts++;return super.formatToParts(...args);}}
  const f=fixture({NumberFormat,DateTimeFormat});t.after(()=>f.ctx.teardown());
  f.run();await flush();
  const state=f.root.querySelector('.dp-panel-state');let writes=0;
  const replace=state.replaceChildren.bind(state);state.replaceChildren=(...args)=>{writes++;return replace(...args);};
  const formats=numberFormats,parts=dateParts;
  for(let i=0;i<30;i++)f.run();
  assert.equal(writes,0);assert.equal(numberFormats,formats);assert.equal(dateParts-parts,30);
  assert.equal(f.calls.length,1);assert.equal(f.value(),'2,00€');
  f.hass.locale={language:'en',number_format:'comma_decimal'};f.run();
  assert.equal(f.value(),'2.00€');assert.ok(numberFormats>formats);
  f.summary.statistics.decimals=1;f.run();assert.equal(f.value(),'2.0€');
  assert.equal(f.calls.length,1);
});

test('daily summary adds Recorder changes, filters the time window and never uses live meter states',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());
  f.summary.statistics.statistic_ids=[...ids,ids[0]];
  const watched=[];f.hass.states=new Proxy(f.hass.states,{get(target,id){watched.push(id);return target[id];}});
  f.reply(()=>({[ids[0]]:[{start:'2026-10-15T21:55:00Z',change:500},
    {start:'2026-10-15T22:00:00Z',change:.5},{start:'2026-10-16T03:00:00Z',change:.3}],
    [ids[1]]:[{start:'2026-10-16T04:00:00Z',change:1.2},{start:'2026-10-16T11:00:00Z',change:500}]}));
  f.run();assert.equal(f.value(),'—');await flush();assert.equal(f.value(),'2,00€');
  for(const id of ids)assert.ok(watched.includes(id),'source change must stay tracked by Bubble');
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0])),{type:'recorder/statistics_during_period',
    start_time:'2026-10-15T22:00:00.000Z',end_time:'2026-10-16T10:00:00.000Z',
    statistic_ids:ids,period:'5minute',types:['change']});
  assert.equal(f.root.querySelector('.dp-panel-state').dataset.entity,undefined);
  assert.equal(JSON.parse(f.root.querySelector('.dp-panel-state').dataset.tapAction).action,'none');
  assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,'Hors abonnement');
  f.hass.states[ids[0]].state='0';f.hass.states[ids[1]].state='0';f.run();await flush();
  assert.equal(f.value(),'2,00€');assert.equal(f.calls.length,1);
});

test('in-flight requests and frequent hass updates coalesce, with refresh after one minute',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());let resolve;
  f.reply(()=>new Promise(done=>resolve=done));f.run();await flush();
  for(let i=0;i<20;i++)f.run();await flush();assert.equal(f.calls.length,1);
  resolve(Object.fromEntries(ids.map(id=>[id,[{start:f.calls[0].start_time,change:1}]])));
  await flush();assert.equal(f.value(),'2,00€');
  f.setTime('2026-10-16T10:00:59Z');f.run();await flush();assert.equal(f.calls.length,1);
  f.setTime('2026-10-16T10:01:00Z');f.run();await flush();assert.equal(f.calls.length,2);
});

test('missing, invalid and failed statistics stay unavailable; recorded zero stays zero',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());
  const responses=[{}, {[ids[0]]:[{start:'2026-10-15T22:00:00Z',change:3}]},
    Object.fromEntries(ids.map(id=>[id,[{start:'2026-10-15T22:00:00Z',change:null}]])),
    Object.fromEntries(ids.map(id=>[id,[{start:'2026-10-15T22:00:00Z',change:0}]]))];
  for(const [i,response]of responses.entries()){
    f.setTime(Date.parse('2026-10-16T10:00:00Z')+i*60000);f.reply(()=>response);f.run();await flush();
    assert.equal(f.value(),i===3?'0,00€':'—');
  }
  f.setTime('2026-10-16T10:04:00Z');f.reply(()=>Promise.reject(Error('offline')));f.run();await flush();assert.equal(f.value(),'—');
});

test('local midnight is resolved in the HA timezone on both DST transitions',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());
  for(const [time,start]of [['2026-03-29T10:00:00Z','2026-03-28T23:00:00.000Z'],
    ['2026-03-30T10:00:00Z','2026-03-29T22:00:00.000Z'],
    ['2026-10-25T10:00:00Z','2026-10-24T22:00:00.000Z'],
    ['2026-10-26T10:00:00Z','2026-10-25T23:00:00.000Z']]){
    f.setTime(time);f.run();assert.equal(f.value(),'—');await flush();assert.equal(f.calls.at(-1).start_time,start);
  }
});

test('midnight clears the old day and stale requests cannot restore it',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());const pending=[];
  f.reply(()=>new Promise(resolve=>pending.push(resolve)));
  f.setTime('2026-10-16T21:59:59Z');f.run();await flush();
  f.setTime('2026-10-16T22:00:01Z');f.run();await flush();assert.equal(f.calls.length,2);
  pending[0](Object.fromEntries(ids.map(id=>[id,[{start:'2026-10-16T20:00:00Z',change:99}]])));
  await flush();assert.equal(f.value(),'—');
  pending[1](Object.fromEntries(ids.map(id=>[id,[{start:'2026-10-16T22:00:00Z',change:0}]])));
  await flush();assert.equal(f.value(),'0,00€');
});

test('disabling statistics or tearing down ignores the pending answer and preserves normal summaries',async()=>{
  for(const teardown of [false,true]){
    const f=fixture();let resolve;f.reply(()=>new Promise(done=>resolve=done));f.run();await flush();
    const old=f.root.querySelector('.dp-panel-information');
    if(teardown)f.ctx.teardown();else{f.ctx.config.signature_panel.information[0]={entity:'sensor.power',name:'Power'};f.run();}
    resolve(Object.fromEntries(ids.map(id=>[id,[{start:'2026-10-15T22:00:00Z',change:99}]])));
    await flush();assert.equal(f.root.contains(old),false);
    if(!teardown){assert.equal(f.value(),'580W');f.ctx.teardown();}
  }
});

test('disabled and invalid sources do not issue requests',async()=>{
  for(const options of [{enabled:false}, {statistics:{statistic_ids:[]}},
    {statistics:{statistic_ids:['sensor.hc_cost','bad id']}},
    {statistics:{statistic_ids:ids,subtract_statistic_ids:['bad id']}},
    {statistics:{statistic_ids:ids,operation:'unknown'}},
    {statistics:{statistic_ids:ids,operation:'remaining_percentage'}},
    {statistics:{statistic_ids:ids,operation:'remaining_percentage',part_statistic_ids:['sensor.other']}},
    {statistics:{statistic_ids:ids,subtract_statistic_ids:[ids[0]]}}, {entity:'sensor.power'}]){
    const f=fixture();Object.assign(f.summary,options);if(options.entity)delete f.summary.statistics;
    f.run();await flush();assert.equal(f.calls.length,0);f.ctx.teardown();
  }
});

test('daily remaining share excludes exports and storage input, without a subtitle',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());
  const inputs=['sensor.grid_hc','sensor.grid_hp','sensor.solar','sensor.battery_out'];
  const outputs=['sensor.export','sensor.battery_in'];
  Object.assign(f.summary,{name:'Autosuffisance',statistics:{statistic_ids:inputs,
    subtract_statistic_ids:outputs,part_statistic_ids:inputs.slice(0,2),
    operation:'remaining_percentage',unit:'%',decimals:0}});
  delete f.summary.secondary;
  // Imports 6, solar 14, discharge 4, export 2, charge 2: house 20, share 70%.
  const amounts=[2,4,14,4,2,2];
  f.reply(req=>Object.fromEntries(req.statistic_ids.map((id,i)=>[id,[{start:req.start_time,change:amounts[i]}]])));
  f.run();await flush();assert.equal(f.value(),'70%');
  assert.deepEqual(Array.from(f.calls[0].statistic_ids),[...inputs,...outputs]);
  assert.equal(f.root.querySelector('.dp-panel-name').textContent,'Autosuffisance');
  assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,'');
  assert.equal(JSON.parse(f.root.querySelector('.dp-panel-state').dataset.tapAction).action,'none');
  // The same raw Recorder series can immediately serve a different operation.
  f.summary.statistics.part_statistic_ids=inputs.slice(0,1);f.run();assert.equal(f.value(),'90%');
  await flush();assert.equal(f.calls.length,1);
});

test('remaining share handles zero consumption, missing sources and grid battery charging',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());
  f.summary.statistics={statistic_ids:['sensor.grid','sensor.solar'],
    subtract_statistic_ids:['sensor.charge'],part_statistic_ids:['sensor.grid'],
    operation:'remaining_percentage',unit:'%',decimals:0};
  // Respectively: no energy, all grid, all solar, grid charging, negative balance.
  for(const [i,[amounts,expected]]of [
    [[0,0,0],'—'],[[6,0,0],'0%'],[[0,6,0],'100%'],[[10,0,8],'0%'],[[0,2,5],'—'],
    [[6,14,null],'—']].entries()){
    f.setTime(Date.parse('2026-10-16T10:00:00Z')+i*60000);
    f.reply(req=>Object.fromEntries(req.statistic_ids.map((id,j)=>[id,
      amounts[j]===null?[]:[{start:req.start_time,change:amounts[j]}]])));
    f.run();await flush();assert.equal(f.value(),expected);
  }
});

test('daily consumption and cost share one query and stay independent of live indexes',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());
  f.summary.name='Jour';
  f.summary.statistics={statistic_ids:['sensor.hc','sensor.hp'],unit:'kWh',decimals:2};
  f.summary.secondary_statistics={statistic_ids:ids,unit:'€',decimals:2};
  f.summary.secondary='sensor.power';
  const watched=[];f.hass.states=new Proxy(f.hass.states,{get(target,id){watched.push(id);return target[id];}});
  f.reply(req=>Object.fromEntries(req.statistic_ids.map((id,i)=>[id,[
    {start:'2026-10-15T21:55:00Z',change:10000},
    {start:req.start_time,change:[2.3,4.5,.31,.77][i]},
    {start:'2026-10-16T11:00:00Z',change:10000}]])));
  f.run();await flush();
  const detail=f.root.querySelector('.dp-panel-secondary');
  assert.equal(f.value(),'6,80kWh');assert.equal(detail.textContent,'1,08 €');
  assert.equal(f.root.querySelector('.dp-panel-name').textContent,'Jour');
  assert.equal(JSON.parse(detail.dataset.tapAction).action,'none');assert.equal(detail.dataset.entity,undefined);
  assert.equal(f.calls.length,1);assert.deepEqual(Array.from(f.calls[0].statistic_ids),['sensor.hc','sensor.hp',...ids]);
  for(const id of ids)assert.ok(watched.includes(id));
  for(let i=0;i<5;i++)f.run();await flush();assert.equal(f.calls.length,1);assert.equal(detail.textContent,'1,08 €');
  delete f.summary.secondary_statistics;f.run();await flush();
  assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,'580 W');
  assert.equal(f.root.querySelector('.dp-panel-secondary').dataset.entity,'sensor.power');
});

test('water converts daily cubic metres to litres while cost keeps its own unit',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());
  f.summary.statistics={statistic_ids:['sensor.water_total'],unit:'L',decimals:0,factor:1000};
  f.summary.secondary_statistics={statistic_ids:['sensor.water_cost'],unit:'€',decimals:2};
  f.reply(req=>({'sensor.water_total':[{start:req.start_time,change:.1234}],
    'sensor.water_cost':[{start:req.start_time,change:.68}]}));
  f.run();await flush();assert.equal(f.value(),'123L');
  assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,'0,68 €');
  f.summary.statistics.factor=1;f.run();assert.equal(f.value(),'0L');await flush();assert.equal(f.calls.length,1);
});

test('a missing cost cannot hide consumption and a missing consumption cannot invent a partial total',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());
  f.summary.statistics={statistic_ids:['sensor.hc','sensor.hp'],unit:'kWh',decimals:2};
  f.summary.secondary_statistics={statistic_ids:ids,unit:'€',decimals:2};
  const cases=[['sensor.hp_cost','6,00kWh','—'],['sensor.hp','—','2,00 €'],[null,'0,00kWh','0,00 €']];
  for(const [i,[missing,value,detail]]of cases.entries()){
    f.setTime(Date.parse('2026-10-16T10:00:00Z')+i*60000);
    f.reply(req=>Object.fromEntries(req.statistic_ids.filter(id=>id!==missing).map(id=>[id,[
      {start:req.start_time,change:missing?(ids.includes(id)?1:3):0}]])));
    f.run();await flush();assert.equal(f.value(),value);
    assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,detail);
  }
  f.setTime('2026-10-16T10:04:00Z');f.reply(()=>Promise.reject(Error('offline')));f.run();await flush();
  assert.equal(f.value(),'—');assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,'—');
});

test('changing secondary sources or day rejects stale combined replies',async t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());const pending=[];
  f.summary.secondary_statistics={statistic_ids:['sensor.cost'],unit:'€'};
  f.reply(req=>new Promise(resolve=>pending.push(()=>resolve(Object.fromEntries(req.statistic_ids.map(id=>[id,[
    {start:req.start_time,change:1}]]))))));
  f.run();await flush();f.summary.secondary_statistics.statistic_ids=['sensor.new_cost'];f.run();await flush();
  pending[0]();await flush();assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,'—');
  pending[1]();await flush();assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,'1,00 €');
  f.setTime('2026-10-16T22:00:01Z');f.run();assert.equal(f.value(),'—');
  assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,'—');await flush();
  pending[2]();await flush();assert.equal(f.value(),'2,00€');
});

test('invalid factors and secondary statistics do not request unbounded or incompatible sources',async t=>{
  for(const factor of [0,-1,Infinity,'1000']){
    const f=fixture();f.summary.statistics.factor=factor;f.run();await flush();assert.equal(f.calls.length,0);f.ctx.teardown();
  }
  for(const secondary of [{statistic_ids:['invalid']},{statistic_ids:['sensor.cost'],time_zone:'UTC'},
    {statistic_ids:Array.from({length:16},(_,i)=>'sensor.cost_'+i)}]){
    const f=fixture();t.after(()=>f.ctx.teardown());f.summary.secondary_statistics=secondary;
    f.run();await flush();assert.deepEqual(Array.from(f.calls[0].statistic_ids),ids);
    assert.equal(f.value(),'2,00€');assert.equal(f.root.querySelector('.dp-panel-secondary').textContent,'—');
  }
});

test('same source series share a pending request across cards and different operations',async t=>{
  const first=fixture(),second=fixture(Intl,first.context),connection={};
  t.after(()=>first.ctx.teardown());t.after(()=>second.ctx.teardown());
  first.hass.connection=second.hass.connection=connection;
  second.summary.statistics={statistic_ids:[...ids].reverse(),part_statistic_ids:[ids[0]],
    operation:'remaining_percentage',unit:'%',decimals:0};
  let resolve;first.reply(()=>new Promise(done=>resolve=done));
  first.run();second.run();await flush();
  assert.equal(first.calls.length,1);assert.equal(second.calls.length,0);
  resolve({[ids[0]]:[{start:first.calls[0].start_time,change:2}],
    [ids[1]]:[{start:first.calls[0].start_time,change:6}]});
  await flush();assert.equal(first.value(),'8,00€');assert.equal(second.value(),'75%');
});

test('a recreated card paints fresh cached statistics synchronously without another request',async t=>{
  const f=fixture();f.hass.connection={};t.after(()=>f.ctx.teardown());
  f.run();await flush();assert.equal(f.value(),'2,00€');
  f.ctx.teardown();f.run();
  assert.equal(f.value(),'2,00€');await flush();assert.equal(f.calls.length,1);
  f.setTime('2026-10-16T10:01:00Z');f.run();await flush();assert.equal(f.calls.length,2);
});

test('a pending result survives its original card and serves a newly mounted consumer',async t=>{
  const first=fixture(),second=fixture(Intl,first.context),connection={};
  first.hass.connection=second.hass.connection=connection;t.after(()=>second.ctx.teardown());
  let resolve;first.reply(()=>new Promise(done=>resolve=done));
  first.run();await flush();first.ctx.teardown();second.run();
  resolve(Object.fromEntries(ids.map(id=>[id,[{start:first.calls[0].start_time,change:3}]])));
  await flush();assert.equal(second.value(),'6,00€');assert.equal(second.calls.length,0);
  assert.equal(first.root.querySelector('.dp-panel-information'),null);
});

test('cached series remain isolated by user, connection and local day',async t=>{
  const f=fixture();f.hass.connection={};f.hass.user={id:'first'};t.after(()=>f.ctx.teardown());
  f.run();await flush();assert.equal(f.calls.length,1);
  f.hass.user={id:'second'};f.run();assert.equal(f.value(),'—');await flush();assert.equal(f.calls.length,2);
  f.hass.connection={};f.run();assert.equal(f.value(),'—');await flush();assert.equal(f.calls.length,3);
  f.setTime('2026-10-16T22:00:01Z');f.run();assert.equal(f.value(),'—');await flush();assert.equal(f.calls.length,4);
  assert.equal(f.calls.at(-1).start_time,'2026-10-16T22:00:00.000Z');
});
