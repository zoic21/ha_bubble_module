const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-energy-balance').code;

test('daily bar throttles requests, handles Paris midnight/DST, source changes and stale replies',async t=>{
 const page=await fixture(t,{prepare:null});
 await page.setContent('<div id="root"><div class="bubble-container"></div></div>');
 await page.evaluate(code=>{
  window.stamp=Date.parse('2026-10-18T10:00:00Z');Date.now=()=>stamp;
  window.requests=[];window.pending=[];
  const root=document.getElementById('root');
  window.ctx={card:root,config:{card_type:'button',signature_energy_balance:{imports:['sensor.grid'],solar:['sensor.solar'],time_zone:'Europe/Paris'}},elements:{mainContainer:root.firstElementChild}};
  window.hass={config:{time_zone:'Europe/Paris'},locale:{language:'fr'},states:{},connection:{},callWS:req=>{
   requests.push(req);return new Promise(resolve=>pending.push({req,resolve}));
  }};
  window.render=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;');
  window.run=()=>render.call(ctx,hass,fn=>ctx.teardown=fn,x=>x);
  window.answer=(index,grid=8,solar=2)=>{const {req,resolve}=pending[index];resolve(Object.fromEntries(req.statistic_ids.map(id=>[id,[{start:req.start_time,change:id.includes('solar')?solar:grid}]])));};
  run();
 },code);
 await page.waitForFunction(()=>requests.length===1);
 await page.evaluate(()=>{for(let i=0;i<10;i++)run();answer(0)});
 await page.waitForFunction(()=>ctx._signatureEnergyBalance.data.balance);
 assert.equal(await page.evaluate(()=>requests.length),1);
 await page.evaluate(()=>{stamp+=59999;run()});assert.equal(await page.evaluate(()=>requests.length),1);
 await page.evaluate(()=>{stamp+=1;run()});await page.waitForFunction(()=>requests.length===2);
 await page.evaluate(()=>{ctx.config.signature_energy_balance.imports=['sensor.other_grid'];run()});
 await page.waitForFunction(()=>requests.length===3);
 await page.evaluate(()=>answer(1,100,0));
 assert.equal(await page.evaluate(()=>ctx._signatureEnergyBalance.data.balance),null);
 await page.evaluate(()=>answer(2,6,4));await page.waitForFunction(()=>ctx._signatureEnergyBalance.data.balance?.selfSufficiency===40);
 await page.evaluate(()=>{stamp=Date.parse('2026-10-18T21:59:59Z');run()});await page.waitForFunction(()=>requests.length===4);
 await page.evaluate(()=>{stamp=Date.parse('2026-10-18T22:00:01Z');run()});await page.waitForFunction(()=>requests.length===5);
 assert.equal(await page.evaluate(()=>requests.at(-1).start_time),'2026-10-18T22:00:00.000Z');
 await page.evaluate(()=>answer(3,100,0));assert.equal(await page.evaluate(()=>ctx._signatureEnergyBalance.data.balance),null);
 await page.evaluate(()=>answer(4,0,0));await page.waitForFunction(()=>!ctx._signatureEnergyBalance.data.pending);
 assert.equal(await page.evaluate(()=>ctx._signatureEnergyBalance.data.balance),null);
 for(const [time,start]of [['2026-03-29T10:00:00Z','2026-03-28T23:00:00.000Z'],['2026-03-30T10:00:00Z','2026-03-29T22:00:00.000Z'],
  ['2026-10-25T10:00:00Z','2026-10-24T22:00:00.000Z'],['2026-10-26T10:00:00Z','2026-10-25T23:00:00.000Z']]){
  await page.evaluate(time=>{stamp=Date.parse(time);run()},time);
  assert.equal(await page.evaluate(()=>requests.at(-1).start_time),start);
 }
 await page.evaluate(()=>{window.saved=ctx._signatureEnergyBalance;ctx.teardown();pending.at(-1).resolve({})});
 assert.equal(await page.evaluate(()=>ctx._signatureEnergyBalance),undefined);
 assert.equal(await page.locator('.seb-bar').count(),0);
});
