const assert=require('node:assert/strict');const {test}=require('node:test');
const {fixture}=require('./browser.cjs');const {render}=require('./fixtures.cjs');const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-square').code;
test('activity state is centered between the fixed name and native footer',async t=>{
 const page=await fixture(t);
 for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [288,328,600])for(const secondary of ['', 'Fin à 18:00']){
  await render(page,{width,mode,plain});
  const m=await page.evaluate(({code,secondary})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='square');
   ctx.config.show_icon=false;ctx.elements.iconContainer.classList.add('hidden');
   ctx.config.signature_square={activity:true,secondary,illustration:{image:'/local/printer.png'}};
   ctx.card.querySelector('.bubble-name').textContent='H2S';
   ctx.elements.state.textContent='Impression en cours';
   ctx.config.state_content='state';ctx.config.entity='vacuum.demo';
   ctx._hass.states['vacuum.demo']={state:'cleaning',attributes:{}};
   const css=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);ctx.card.getRootNode().querySelectorAll('style')[1].textContent=css;
   const name=ctx.card.querySelector('.bubble-name').getBoundingClientRect(),state=ctx.elements.state.getBoundingClientRect(),content=ctx.elements.contentContainer.getBoundingClientRect();
   const footer=ctx.card.querySelector('.bubble-sub-button-container').getBoundingClientRect();
   const lower=ctx.card.querySelector('.dp-secondary')?.getBoundingClientRect().top??footer.top;
   return{center:state.y+state.height/2,expected:(name.bottom+lower)/2,bottom:state.bottom,footer:footer.top};
  },{code,secondary});
  assert.ok(Math.abs(m.center-m.expected)<1,JSON.stringify({width,mode,plain,secondary,m}));assert.ok(m.bottom<m.footer);
 }
});
test('activity buttons keep lower native actions clear of text and artwork in two rows',async t=>{
 const page=await fixture(t);
 for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [288,358,600]){
  await render(page,{mode,plain,width});
  const m=await page.evaluate(code=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='square');const root=ctx.card;
   ctx.config.show_icon=false;ctx.elements.iconContainer.classList.add('hidden');ctx.config.signature_square={activity:true,secondary:'Fin à 15:15',illustration:{image:'/local/atlas.png',columns:4,rows:6,index:4,index_dark:16},progress:{value:25}};
   const buttons=root.querySelector('.bubble-sub-button-container');buttons.innerHTML='<button class="bubble-sub-button">Arrêter</button><button class="bubble-sub-button hidden">Masqué</button><button class="bubble-sub-button">1 750 µS/cm</button>';
   let clicked=0;const original=buttons.firstChild;original.addEventListener('click',()=>clicked++);
   const css=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
   root.getRootNode().querySelectorAll('style')[1].textContent=css;original.click();
   const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const host=rect(root.querySelector('.bubble-container')),value=rect(ctx.elements.state),detail=rect(root.querySelector('.dp-secondary'));
   const art=getComputedStyle(ctx.elements.contentContainer,'::after');
   return{host,value,detail,art:{width:parseFloat(art.width),height:parseFloat(art.height)},buttons:[...buttons.children].filter(e=>getComputedStyle(e).display!=='none').map(rect),clicked,same:buttons.firstChild===original,hidden:getComputedStyle(buttons.children[1]).display};
  },code);
  assert.equal(m.host.height,120);assert.equal(m.same,true);assert.equal(m.clicked,1);assert.equal(m.hidden,'none');assert.equal(m.art.width,72);assert.equal(m.art.height,72);
  for(const r of m.buttons){assert.ok(r.top>=m.detail.bottom-1);assert.ok(r.right<=m.host.right&&r.bottom<=m.host.bottom);}
 }
});
test('activity media retains native track, controls and volume nodes without tile transformations',async t=>{
 const page=await fixture(t);
 for(const mode of ['light','dark'])for(const width of [288,358,600]){
  await render(page,{mode,width});
  const m=await page.evaluate(code=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='media');const root=ctx.card;
   ctx.config.signature_square={activity:true,illustration:{image:'/local/atlas.png'}};
   const buttons=root.querySelector('.bubble-buttons-container');buttons.innerHTML='<button class="bubble-media-button">Lecture</button><button class="bubble-media-button hidden">Masqué</button>';
   const native=root.querySelector('.bubble-media-info-container'),button=buttons.firstChild;let clicked=0;button.addEventListener('click',()=>clicked++);
   const css=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);root.getRootNode().querySelectorAll('style')[1].textContent=css;button.click();
   const box=e=>{let r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,right:r.right,height:r.height};};
   return{card:box(root.querySelector('.bubble-container')),info:box(native),button:box(button),same:native===root.querySelector('.bubble-media-info-container')&&button===buttons.firstChild,clicked,layout:root.getAttribute('data-dp-layout'),hidden:getComputedStyle(buttons.children[1]).display};
  },code);
  assert.equal(m.card.height,120);assert.equal(m.layout,null);assert.equal(m.same,true);assert.equal(m.clicked,1);assert.equal(m.hidden,'none');assert.ok(m.button.top>=m.info.bottom);assert.ok(m.button.bottom<=m.card.bottom);
 }
});
