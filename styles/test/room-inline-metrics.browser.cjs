const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-room').code;

test('equipment value and two native measurements share a row without losing targets',async t=>{
 const page=await fixture(t);
 for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [288,328,600])for(const compact of [false,true]){
  await render(page,{width,mode,plain});
  const m=await page.evaluate(({code,compact})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='room');
   const buttons=[1,2].map(i=>({entity:'sensor.demo',css_class:'room-control-'+i,show_state:true,show_name:false}));
   ctx.config={...ctx.config,button_type:'state',show_state:true,show_icon:false,sub_button:{main:buttons},signature_room:{room_mode:'illustrated',room_state_as_value:true,room_inline_metrics:true,room_compact:compact,room_auto_colors:false,room_control_columns:2,illustration:{image:'/local/rack.webp'}}};
   ctx._hass.states['sensor.demo']={state:'183',attributes:{unit_of_measurement:'W'}};
   ctx.elements.state.classList.remove('hidden');ctx.elements.iconContainer.classList.add('hidden');
   const container=ctx.card.querySelector('.bubble-sub-button-container');
   container.innerHTML=buttons.map((b,i)=>'<div class="bubble-sub-button bubble-sub-button-'+(i+1)+' '+b.css_class+'"><div class="bubble-sub-button-name-container">'+['27,1 °C','49 %'][i]+'</div><ha-icon class="bubble-sub-button-icon"></ha-icon></div>').join('');
   const nodes=[...container.children];let clicked=0;nodes.forEach(n=>n.addEventListener('click',()=>clicked++));
   const update=()=>ctx.card.getRootNode().querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
   update();nodes.forEach(n=>n.click());
   const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,center:r.y+r.height/2,height:r.height};};
   const art=getComputedStyle(ctx.elements.contentContainer,'::after'),content=(compact?ctx.card.querySelector('.bubble-container'):ctx.elements.contentContainer).getBoundingClientRect();
   const artLeft=content.right-(compact?parseFloat(getComputedStyle(ctx.card.querySelector('.bubble-container')).borderRightWidth):0)-parseFloat(art.right)-parseFloat(art.width);
   const result={card:box(ctx.card.querySelector('.bubble-container')),state:box(ctx.elements.state),metrics:nodes.map(box),art:{left:artLeft,width:parseFloat(art.width)},clicked,same:nodes.every(n=>container.contains(n)),labels:nodes.map(n=>{const e=n.querySelector('.bubble-sub-button-name-container');const st=getComputedStyle(e),icon=n.querySelector('ha-icon');return {scroll:e.scrollWidth,client:e.clientWidth,margin:st.margin,padding:st.padding,iconWidth:icon.getBoundingClientRect().width,iconMin:getComputedStyle(icon).minWidth,iconPadding:getComputedStyle(icon).padding}})};
   ctx.config.signature_room.room_inline_metrics=false;update();result.restored=Math.abs(box(ctx.elements.state).center-box(nodes[0]).center)>10;
   return result;
  },{code,compact});
  const hint=JSON.stringify({width,mode,plain,compact,m});
  assert.equal(m.card.height,compact?118:148,hint);assert.equal(m.clicked,2,hint);assert.equal(m.same,true,hint);assert.equal(m.restored,true,hint);
  if(compact){assert.equal(m.art.width,80,hint);assert.ok(m.metrics[1].right<=m.art.left-7,hint);}
  assert.ok(m.state.right<=m.metrics[0].left+.5,hint);
  m.metrics.forEach((b,i)=>{assert.ok(Math.abs(b.center-m.state.center)<1,hint);assert.equal(b.height,44,hint);assert.ok(b.bottom<=m.card.bottom,hint);assert.ok(m.labels[i].scroll<=m.labels[i].client+1,hint);});
  assert.ok(m.metrics[0].right<=m.metrics[1].left+.5,hint);
 }
});
