const assert = require('node:assert/strict');
const vm = require('node:vm');
const {test} = require('node:test');
const {loadModule} = require('../../shared/test/module.cjs');
const definition = loadModule('signature-square');
const ids = ['sensor.hc_cost','sensor.hp_cost'];
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
  let stamp = Date.parse('2026-10-16T10:00:00Z');
  class Clock extends Date { static now() { return stamp; } }
  const context = vm.createContext({...require('./dom.cjs'),Intl,Date:Clock,setTimeout,clearTimeout});
  const render = vm.runInContext('(function(hass,onTeardown,renderTemplate){return `' + definition.code + '`;})',context);
  const {Element} = context,root = new Element(),content = new Element(),names = new Element(),state = new Element();
  content.className = 'bubble-content-container'; names.className = 'bubble-name-container'; state.className = 'bubble-state';
  root.append(content); content.append(names); names.append(state);
  const summary = {name:'Coût du jour',secondary:'Hors abonnement',statistics:{statistic_ids:ids,unit:'€',decimals:2}};
  const ctx = {card:root,config:{card_type:'button',button_type:'state',entity:'sensor.power',show_icon:false,
    signature_square:{summary}},elements:{state,contentContainer:content,nameContainer:names}};
  const calls = [];
  let reply = () => Object.fromEntries(ids.map(id => [id,[{start:'2026-10-15T22:00:00Z',change:1}]]));
  const hass = {config:{time_zone:'Europe/Paris'},locale:{language:'fr-FR',number_format:'space_comma'},states:{
    'sensor.power':{state:'580',attributes:{unit_of_measurement:'W'}},
    'sensor.hc_cost':{state:'900',attributes:{unit_of_measurement:'EUR'}},
    'sensor.hp_cost':{state:'1100',attributes:{unit_of_measurement:'EUR'}}},
    callWS:request => { calls.push(request); return reply(request); }};
  return {ctx,root,hass,summary,calls,run:()=>render.call(ctx,hass,fn=>ctx.teardown=fn,x=>x),
    setTime:time=>stamp=typeof time==='number'?time:Date.parse(time),reply:fn=>reply=fn,
    value:()=>root.querySelector('.dp-summary-state')?.textContent};
}

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
  assert.equal(f.root.querySelector('.dp-summary-state').dataset.entity,undefined);
  assert.equal(JSON.parse(f.root.querySelector('.dp-summary-state').dataset.tapAction).action,'none');
  assert.equal(f.root.querySelector('.dp-summary-secondary').textContent,'Hors abonnement');
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
    const old=f.root.querySelector('.dp-summary');
    if(teardown)f.ctx.teardown();else{f.ctx.config.signature_square.summary={entity:'sensor.power',name:'Power'};f.run();}
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
  assert.equal(f.root.querySelector('.dp-summary-name').textContent,'Autosuffisance');
  assert.equal(f.root.querySelector('.dp-summary-secondary').textContent,'');
  assert.equal(JSON.parse(f.root.querySelector('.dp-summary-state').dataset.tapAction).action,'none');
  // Changing the numerator invalidates the cached result immediately.
  f.summary.statistics.part_statistic_ids=inputs.slice(0,1);f.run();assert.equal(f.value(),'—');
  await flush();assert.equal(f.value(),'90%');assert.equal(f.calls.length,2);
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
