const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-panel').code;

// Always runs in CI; panel-native.browser.cjs adds the optional real Bubble pipeline.
test('Panel shares theme typography and one grid for one to three information columns',async t=>{
 const page=await fixture(t);
 for(const width of [288,328,358,382,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const count of [1,2,3]){
  await render(page,{width,mode,plain});
  const m=await page.evaluate(({code,count})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='square');ctx.teardown();
   ctx.config={card_type:'button',button_type:'state',show_state:true,show_icon:false,entity:'sensor.power',signature_panel:{secondary:'Détail',
    information:[{entity:'sensor.temp'},{entity:'sensor.humidity'}].slice(0,count-1),illustration:{image:'/local/rack.webp'}}};
   ctx._hass.states['sensor.power']={state:'140',attributes:{unit_of_measurement:'W'}};
   ctx._hass.states['sensor.temp']={state:'29.7',attributes:{unit_of_measurement:'°C'}};
   ctx._hass.states['sensor.humidity']={state:'42',attributes:{unit_of_measurement:'%'}};
   ctx.card.querySelector('.bubble-name').textContent='Baie informatique';
   ctx.elements.state.style.display='-webkit-box';
   ctx.card.getRootNode().querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;')
    .call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
   const host=ctx.card.querySelector('.bubble-container'),rect=host.getBoundingClientRect(),art=getComputedStyle(host,'::after');
   const name=getComputedStyle(ctx.card.querySelector('.bubble-name')),detail=getComputedStyle(ctx.card.querySelector('.dp-secondary'));
   return {height:rect.height,radius:getComputedStyle(host).borderRadius,art:parseFloat(art.width),name:{size:name.fontSize,weight:name.fontWeight},detail:{size:detail.fontSize,opacity:detail.opacity},
    values:[...ctx.card.querySelectorAll('.bubble-state,.dp-panel-state')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{center:r.y+r.height/2,font:s.fontSize,weight:s.fontWeight,color:s.color,display:s.display,overflow:e.scrollWidth-e.clientWidth}})};
  },{code,count});
  const hint=JSON.stringify({width,mode,plain,count,m});
  assert.equal(m.height,118,hint);assert.equal(m.radius,'22px',hint);assert.equal(m.art,80,hint);
  assert.deepEqual(m.name,{size:'13px',weight:'500'},hint);assert.deepEqual(m.detail,{size:'13px',opacity:'1'},hint);
  assert.equal(m.values.length,count,hint);
  if(count===3 && width>=382)assert.equal(parseFloat(m.values[0].font),24,hint);
  for(const value of m.values){assert.equal(value.display,'flex',hint);assert.equal(value.weight,'500',hint);assert.equal(value.color,m.values[0].color,hint);assert.equal(value.font,m.values[0].font,hint);assert.ok(Math.abs(value.center-m.values[0].center)<1,hint);assert.ok(value.overflow<=1,hint)}
 }
});
