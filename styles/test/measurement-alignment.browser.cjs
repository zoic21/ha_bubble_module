const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const square=loadModule('signature-square').code;
const compact=loadModule('signature-compact').code;

test('fixed Square values retain their baseline when optional detail appears or disappears',async t=>{
 const page=await fixture(t);
 for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [148,180,288,358,600]){
  await render(page,{mode,plain,width});
  const results=await page.evaluate(({code})=>{
   const shadow=document.querySelector('[data-id="square"]').shadowRoot;
   const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
   const style=shadow.querySelectorAll('style')[1];
   const out=[];
   for(const variant of ['classic','illustrated','measure']){
    const samples=[];
    for(const secondary of ['', 'Rafales · 3,2 km/h', '']){
     ctx.config.show_icon=variant==='classic'||variant==='measure';
     ctx.elements.iconContainer.classList.toggle('hidden',!ctx.config.show_icon);
     ctx.config.signature_square={secondary,
      ...(variant==='illustrated'?{illustration:{image:'/local/room.png'}}:{}),
      ...(variant==='measure'?{controls:'measure'}:{})};
     style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;')
      .call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
     const state=ctx.elements.state.getBoundingClientRect();
     const card=ctx.elements.mainContainer.getBoundingClientRect();
     const detail=ctx.card.querySelector('.dp-secondary');
     const art=getComputedStyle(ctx.elements.contentContainer,'::after');
     samples.push({top:state.top,bottom:state.bottom,height:card.height,
      detailTop:detail?.getBoundingClientRect().top,detailBottom:detail?.getBoundingClientRect().bottom,
      cardBottom:card.bottom,artWidth:art.width,artHeight:art.height,
      action:JSON.parse(ctx.elements.state.dataset.tapAction).action});
    }
    out.push({variant,samples});
   }
   return out;
  },{code:square});
  for(const {variant,samples} of results){
   for(const s of samples){
    assert.equal(s.top,samples[0].top,JSON.stringify({mode,plain,width,variant,samples}));
    assert.equal(s.height,120);assert.equal(s.action,'more-info');
   }
   assert.ok(samples[1].detailTop>=samples[1].bottom-1,'detail overlaps the value '+JSON.stringify({mode,plain,width,variant,samples}));
   assert.ok(samples[1].detailBottom<=samples[1].cardBottom,'detail leaves the card');
   if(variant==='illustrated')assert.equal(samples[0].artWidth,samples[1].artWidth,'art resizes with detail');
  }
  assert.equal(results[0].samples[0].top,results[2].samples[0].top,'measurement controls move the baseline');
 }
});

test('Square opt-in centers a lone value and restores its usual layout with detail or without the option',async t=>{
 const page=await fixture(t);
 for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [114,122,148,180,288]){
  await render(page,{mode,plain,width});
  const results=await page.evaluate(({code})=>{
   const shadow=document.querySelector('[data-id="square"]').shadowRoot;
   const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
   const style=shadow.querySelectorAll('style')[1];
   // Bubble writes this native state display when scrolling is disabled.
   ctx.elements.state.style.display='-webkit-box';
   const results=[];
   for(const [value,unit] of [['0','ppm'],['21','ppm'],['83','W/m²'],['120','nSv/h'],['0','']]){
    ctx._hass.states['sensor.demo'].state=value;
    ctx._hass.states['sensor.demo'].attributes.unit_of_measurement=unit;
    const samples=[];
    for(const [enabled,secondary] of [[false,''],[true,''],[true,'Détail'],[true,'   '],[false,'']]){
     ctx.config.signature_square={center_value_without_secondary:enabled,secondary};
     style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;')
      .call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
     const state=ctx.elements.state;
     const box=state.getBoundingClientRect();
     const content=ctx.elements.contentContainer.getBoundingClientRect();
     const icon=ctx.elements.iconContainer.getBoundingClientRect();
     const range=document.createRange();range.selectNodeContents(state);
     const text=range.getBoundingClientRect();
     samples.push({top:box.top,x:(text.left+text.right)/2,boxX:(box.left+box.right)/2,y:(box.top+box.bottom)/2,
      targetX:(content.left+content.right)/2,targetY:(icon.bottom+3+content.bottom)/2,
      detail:!!ctx.card.querySelector('.dp-secondary'),text:state.textContent,
      height:ctx.elements.mainContainer.getBoundingClientRect().height,
      action:JSON.parse(state.dataset.tapAction).action,
      clipped:state.scrollWidth>state.clientWidth+1});
    }
    results.push(samples);
   }
   return results;
  },{code:square});
  for(const samples of results){
   const context=JSON.stringify({mode,plain,width,samples});
   for(const i of [1,3]){
    assert.ok(Math.abs(samples[i].boxX-samples[i].targetX)<1,context);
    if(!samples[i].clipped)assert.ok(Math.abs(samples[i].x-samples[i].targetX)<1,context);
    assert.ok(Math.abs(samples[i].y-samples[i].targetY)<1,context);
    assert.equal(samples[i].detail,false,context);
   }
   assert.equal(samples[2].detail,true,context);
   assert.equal(samples[2].top,samples[0].top,context);
   assert.equal(samples[4].top,samples[0].top,context);
   for(const s of samples){assert.equal(s.height,120);assert.equal(s.action,'more-info');assert.equal(s.clipped,samples[0].clipped,context);}
  }
 }
});

test('Compact metric columns align numbers without replacing native actions or visibility',async t=>{
 const page=await fixture(t);
 for(const mode of ['light','dark'])for(const width of [288,328,358,382,600]){
  await render(page,{mode,width});
  const m=await page.evaluate(({code})=>{
   const shadow=document.querySelector('[data-id="compact-standard"]').shadowRoot;
   const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
   ctx.config.signature_compact={sub_button_styles:{1:{type:'metric'},2:{type:'metric'},3:{type:'metric'}}};
   ctx.config.sub_button={main:[{entity:'sensor.cpu'},{entity:'sensor.ram'},{entity:'sensor.temperature'}]};
   const group=ctx.card.querySelector('.bubble-sub-button-container');
   group.replaceChildren();let clicks=0;
   const nodes=['0,0 %','100,0 %','48,3 °C'].map((text,i)=>{
    const n=document.createElement('div');n.className='bubble-sub-button bubble-sub-button-'+(i+1);
    const icon=document.createElement('ha-icon');icon.className='bubble-sub-button-icon';n.append(icon);
    const label=document.createElement('span');label.className='bubble-sub-button-name-container';label.textContent=text;n.append(label);
    n.addEventListener('click',()=>clicks++);group.append(n);return n;
   });
   const native=document.createElement('style');native.textContent='.bubble-sub-button{gap:4px;font-size:12px;height:36px}.bubble-sub-button-icon{width:16px;flex:0 0 16px}.bubble-sub-button-name-container{white-space:nowrap}';shadow.append(native);
   const style=shadow.querySelectorAll('style')[1];
   const refresh=()=>style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;')
    .call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
   refresh();nodes.forEach(n=>n.click());
   const widths=nodes.map(n=>n.getBoundingClientRect().width);
   const clipped=nodes.some(n=>n.scrollWidth>n.clientWidth+1);
   nodes[1].classList.add('hidden');refresh();const hidden=getComputedStyle(nodes[1]).display;
   ctx.config.signature_compact={};refresh();
   return {widths,clipped,hidden,clicks,same:nodes.every(n=>group.contains(n)),removed:getComputedStyle(nodes[0]).width};
  },{code:compact});
  assert.equal(new Set(m.widths).size,1,JSON.stringify({mode,width,m}));
  assert.equal(m.widths[0],width<=382?72:80);assert.equal(m.clipped,false,JSON.stringify({mode,width,m}));
  assert.equal(m.hidden,'none');assert.equal(m.clicks,3);assert.equal(m.same,true);
  assert.notEqual(parseFloat(m.removed),m.widths[0]);
 }
});
