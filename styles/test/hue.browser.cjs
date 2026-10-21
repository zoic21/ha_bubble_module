const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const hue=loadModule('signature-hue').code, compact=loadModule('signature-compact').code;

test('Hue companion preserves native nodes, geometry, live palette and theme tokens',async t=>{
 const page=await fixture(t);
 for(const width of [288,328,358,382,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await render(page,{width,mode,plain});
  const result=await page.evaluate(({hue,compact})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='compact-standard'),root=ctx.card;
   const shadow=root.getRootNode(), styles=document.createElement('style');shadow.append(styles);
   ctx.config.signature_compact={};
   const runCompact=new Function('hass','onTeardown','renderTemplate','return `'+compact+'`;');
   styles.textContent=runCompact.call(ctx,ctx._hass,()=>{},v=>v);
   const base=styles.textContent;
   const nodes=[...root.querySelectorAll('.bubble-name,.bubble-state,.bubble-main-icon')];
   const run=new Function('renderTemplate','return `'+hue+'`;');
   const update=()=>styles.textContent=base+run.call(ctx,v=>v);
   const host=root.querySelector('.bubble-container'), wrapper=root.querySelector('.bubble-wrapper');
   ctx.config.signature_hue={mode:'scene',palette:'#123456, #abcdef, #123ABC',status:'{"available":true,"selected":true}'};update();
   const scene={height:getComputedStyle(host).height,palette:getComputedStyle(host,'::before').backgroundImage,check:getComputedStyle(wrapper,'::after').opacity};
   ctx.config.signature_hue={...ctx.config.signature_hue,status:'{"available":false,"selected":false}'};update();
   const unavailable={opacity:getComputedStyle(host).opacity,pointer:getComputedStyle(host).pointerEvents,check:getComputedStyle(wrapper,'::after').opacity};
   ctx.config.signature_hue={mode:'light',available:true};update();
   const light={minHeight:getComputedStyle(host).minHeight,name:getComputedStyle(root.querySelector('.bubble-name')).fontSize,state:getComputedStyle(root.querySelector('.bubble-state')).fontSize};
   const cache=ctx._signatureHue;update();
   return {scene,unavailable,light,sameNodes:nodes.every((n,i)=>n===root.querySelectorAll('.bubble-name,.bubble-state,.bubble-main-icon')[i]),sameCache:cache===ctx._signatureHue};
  },{hue,compact});
  assert.equal(result.scene.height,'112px');assert.equal(result.scene.check,'1');
  assert.match(result.scene.palette,/rgb\(18, 52, 86\)/);
  assert.deepEqual(result.unavailable,{opacity:'0.4',pointer:'none',check:'0'});
  assert.deepEqual(result.light,{minHeight:'88px',name:'14px',state:'13px'});
  assert.equal(result.sameNodes,true);assert.equal(result.sameCache,true);
 }
});

test('Hue popup only changes the lamp grid below its 320px container threshold',async t=>{
 const page=await fixture(t,{prepare:null});
 await page.setContent('<div id="root"></div>');
 for(const width of [288,320,321,600]){
  const result=await page.evaluate(({hue,width})=>{
   const root=document.querySelector('#root');root.style.cssText='width:'+width+'px;--signature-card-border-radius:18px';
   root.innerHTML='<div class="bubble-pop-up"><div class="bubble-pop-up-container"><div class="bubble-cards-container"><div class="card"></div><div class="card"><hui-grid-card></hui-grid-card></div><div class="card"><hui-grid-card></hui-grid-card></div><div class="card"><hui-grid-card></hui-grid-card></div></div></div></div>';
   const style=document.createElement('style');style.textContent='hui-grid-card{--grid-card-column-count:4}'+new Function('return `'+hue+'`;').call({config:{card_type:'pop-up',signature_hue:{mode:'popup'}}});root.append(style);
   return {columns:[...root.querySelectorAll('hui-grid-card')].map(e=>getComputedStyle(e).getPropertyValue('--grid-card-column-count').trim()),radius:getComputedStyle(root.querySelector('.bubble-pop-up')).getPropertyValue('--bubble-pop-up-border-radius').trim()};
  },{hue,width});
  assert.deepEqual(result.columns,['4',width<=320?'3':'4','4']);assert.equal(result.radius,'18px');
 }
});

test('Hue bottom brightness slider has a separate full-width row and follows native availability and theme',async t=>{
 const page=await fixture(t);
 for(const width of [288,320,382,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await render(page,{width,mode,plain});
  const result=await page.evaluate(({hue,compact})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='compact-standard'),root=ctx.card;
   ctx.config.signature_compact={color:'#B97918'};
   ctx.config.signature_hue={mode:'brightness',available:true};
   const style=document.createElement('style');root.getRootNode().append(style);
   const frame=root.querySelector('.bubble-container'),heading=root.querySelector('.bubble-wrapper');
   const bottom=document.createElement('div');bottom.className='bubble-sub-button-bottom-container';
   bottom.style.cssText='position:absolute;bottom:0;display:flex';
   bottom.innerHTML='<div class="bubble-sub-button-group" style="width:100%"><div class="bubble-sub-slider-wrapper inline" style="height:36px;width:100%"><div class="bubble-sub-button-slider inline" style="height:36px;position:relative;pointer-events:auto"><div class="bubble-range-fill" style="position:absolute;inset:0;width:10%;pointer-events:auto"></div></div></div></div>';
   heading.append(bottom);
   const runCompact=new Function('hass','onTeardown','renderTemplate','return `'+compact+'`;');
   const runHue=new Function('renderTemplate','return `'+hue+'`;');
   const update=()=>style.textContent=runCompact.call(ctx,ctx._hass,()=>{},v=>v)+runHue.call(ctx,v=>v);
   update();
   const icon=root.querySelector('.bubble-icon-container'),slider=bottom.querySelector('.bubble-sub-button-slider'),fill=bottom.querySelector('.bubble-range-fill');
   const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
   const before={frame:box(frame),iconBox:box(icon),slider:box(slider),icon:getComputedStyle(icon).display,accent:getComputedStyle(fill).backgroundColor};
   ctx.config.signature_hue.available=false;update();
   const disabled=[bottom.querySelector('.bubble-sub-slider-wrapper'),slider,fill].map(e=>getComputedStyle(e).pointerEvents);
   ctx.config.signature_hue.available=true;update();
   const sameNodes=slider===bottom.querySelector('.bubble-sub-button-slider')&&heading===root.querySelector('.bubble-wrapper');
   root.style.setProperty('--primary-text-color','#123456');
   const marker=getComputedStyle(fill,'::after').backgroundColor;
   const enabled=getComputedStyle(slider).pointerEvents;
   bottom.remove();update();
   return{before,disabled,sameNodes,marker,enabled,legacyHeight:box(frame).height};
  },{hue,compact});
  assert.equal(result.before.frame.height,104);
  assert.equal(result.before.icon,'flex');
  assert.ok(Math.abs(result.before.iconBox.y-result.before.frame.y-10)<=1);
  assert.equal(result.before.slider.height,36);
  assert.ok(result.before.slider.y>=result.before.iconBox.bottom);
  assert.ok(Math.abs(result.before.slider.x-result.before.frame.x-10)<=1);
  assert.ok(Math.abs(result.before.frame.right-result.before.slider.right-10)<=1);
  assert.ok(Math.abs(result.before.frame.bottom-result.before.slider.bottom-10)<=1);
  assert.equal(result.before.accent,'rgb(185, 121, 24)');
  assert.deepEqual(result.disabled,['none','none','none']);
  assert.equal(result.enabled,'auto');assert.equal(result.sameNodes,true);
  assert.equal(result.marker,'rgb(18, 52, 86)');assert.equal(result.legacyHeight,56);
 }
});
