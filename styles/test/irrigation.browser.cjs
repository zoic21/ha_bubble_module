const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const compact=loadModule('signature-compact').code, irrigation=loadModule('signature-irrigation').code;

test('irrigation renders a real table and next time, reuses the request and cleans the grid',async t=>{
 const page=await fixture(t);
 for(const width of [288,328,358,382,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await render(page,{width,mode,plain});
  const result=await page.evaluate(async({compact,irrigation})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='compact-standard'),root=ctx.card;
   const shadow=root.getRootNode(),style=document.createElement('style');shadow.append(style);
   const compactCleanup=ctx.teardown;ctx.style={};ctx.isConnected=true;
   const wrapper=document.createElement('div'),grid=document.createElement('div');grid.className='bubble-cards-grid-container';grid.append(wrapper);ctx.closest=()=>wrapper;
   window.location.hash='#watering';
   const state={state:'off',attributes:{logging_enabled:true},last_updated:'now'};
   const hass=ctx._hass;hass.states['calendar.test']=state;hass.states['switch.logging']=state;
   let requests=0;
   hass.callApi=async()=>{requests++;return [{summary:'Potager',description:'Run Once',start:new Date(Date.now()-2*86400000).toISOString(),end:new Date(Date.now()-2*86400000+342000).toISOString()},
    {summary:'Potager',start:new Date(Date.now()+3600000).toISOString(),end:new Date(Date.now()+3600000).toISOString()}];};
   const runCompact=new Function('hass','onTeardown','renderTemplate','return `'+compact+'`;');
   const run=new Function('hass','onTeardown','return `'+irrigation+'`;');let cleanup;
   ctx.config={...ctx.config,entity:'calendar.test',button_type:'name',signature_compact:{multiline:true,secondary:'Lecture du calendrier'},signature_irrigation:{calendar:'calendar.test',stations:['Potager'],popup:'#watering',logging_entity:'switch.logging',role:'history'}};
   ctx.updateBubbleCard=()=>{style.textContent=runCompact.call(ctx,hass,()=>{},v=>v)+run.call(ctx,hass,fn=>cleanup=fn);};
   ctx.updateBubbleCard();await new Promise(resolve=>setTimeout(resolve,0));
   const table=root.querySelector('table'),cells=[...table.querySelectorAll('td')].map(c=>c.textContent);
   const history={cells,font:getComputedStyle(table).fontSize,columns:table.rows[0].cells.length};
   ctx.updateBubbleCard();const sameTable=root.querySelector('table')===table;
   ctx.config.signature_irrigation={...ctx.config.signature_irrigation,role:'next'};
   ctx.config.signature_compact={compact_mode:'value'};ctx.config.button_type='state';ctx.updateBubbleCard();
   const next={value:root.querySelector('.dp-value').textContent,whiteSpace:getComputedStyle(root.querySelector('.dp-value')).whiteSpace};
   const service=ctx._signatureIrrigation.service;cleanup();compactCleanup?.();
   ctx.teardown=undefined;
   return {history,sameTable,next,requests,roots:service.roots.size,timer:service.timer,display:wrapper.style.display,tableRemoved:!root.querySelector('table')};
  },{compact,irrigation});
  assert.equal(result.history.columns,4);assert.equal(result.history.cells[2],'Manuel / commande HA');assert.equal(result.history.cells[3],'05:42');
  assert.equal(result.history.font,'13px');assert.equal(result.sameTable,true);
  assert.match(result.next.value,/\n\d{2}:\d{2}$/);assert.equal(result.next.whiteSpace,'pre');
  assert.equal(result.requests,1);assert.equal(result.roots,0);assert.equal(result.timer,null);assert.equal(result.display,'');assert.equal(result.tableRemoved,true);
 }
});
