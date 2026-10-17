const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-room').code;

// Native positioning contract from Bubble Card 3.4.1, 061ed837, base-card/styles.css.
// The earlier minimal fixture omitted fixed-top and the positioned name wrapper.
const native=`
.bubble-wrapper{position:absolute;display:flex;align-items:center;height:100%;width:100%}
.bubble-wrapper.fixed-top{align-items:baseline}
.bubble-content-container{display:contents}
.bubble-wrapper.fixed-top .bubble-content-container{display:flex;align-items:center;align-self:flex-start;overflow:hidden;flex-grow:1;margin-top:1px;min-height:54px}
.bubble-name-container{display:flex;position:relative;flex-direction:column;justify-content:center;flex-grow:1;margin-inline:4px 16px;overflow:hidden;line-height:18px}
.bubble-name,.bubble-state{display:flex;position:relative;white-space:nowrap}
`;

test('compact metrics use one containing block and text line with native fixed-top framing',async t=>{
 const page=await fixture(t);
 for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [288,328,500,600])for(const power of [140,1600,"unavailable"]){
  await render(page,{width,mode,plain});
  const m=await page.evaluate(({code,native,power})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='room');
   const shadow=ctx.card.getRootNode();shadow.querySelectorAll('style')[0].textContent+=native;
   ctx.card.querySelector('.bubble-wrapper').classList.add('fixed-top');
   const buttons=[1,2].map(i=>({entity:'sensor.demo',css_class:'room-control-'+i,show_state:true,show_name:false}));
   ctx.config={...ctx.config,button_type:'state',show_state:true,show_icon:false,sub_button:{main:buttons},signature_room:{room_mode:'illustrated',room_state_as_value:true,room_inline_metrics:true,room_compact:true,room_auto_colors:false,room_control_columns:2,illustration:{image:'/local/rack.webp'}}};
   ctx._hass.states['sensor.demo']={state:String(power),attributes:{unit_of_measurement:'W'}};
   ctx.elements.state.classList.remove('hidden');ctx.elements.iconContainer.classList.add('hidden');
   const container=ctx.card.querySelector('.bubble-sub-button-container');
   container.innerHTML=buttons.map((b,i)=>'<div class="bubble-sub-button bubble-sub-button-'+(i+1)+' '+b.css_class+'"><div class="bubble-sub-button-name-container">'+['29,0 °C','42 %'][i]+'</div><ha-icon class="bubble-sub-button-icon"></ha-icon></div>').join('');
   shadow.querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
   const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,center:r.y+r.height/2};};
   const card=ctx.card.querySelector('.bubble-container'),content=card.getBoundingClientRect(),border=parseFloat(getComputedStyle(card).borderTopWidth),art=getComputedStyle(ctx.elements.contentContainer,'::after');
   const artTop=content.top+border+parseFloat(art.top)+new DOMMatrixReadOnly(art.transform).m42;
   const labels=[ctx.elements.state.querySelector('.dp-value'),...container.querySelectorAll('.bubble-sub-button-name-container')];
   const targets=[ctx.elements.state,...container.children];
   const result={card:box(card),sameContainingBlock:targets.every(e=>e.offsetParent===card),name:box(ctx.card.querySelector('.bubble-name')),art:{center:artTop+parseFloat(art.height)/2,width:parseFloat(art.width),left:content.right-border-parseFloat(art.right)-parseFloat(art.width)},texts:labels.map(e=>{const range=document.createRange();range.selectNodeContents(e);return {font:getComputedStyle(e).fontSize,box:box(e),text:box(range),scroll:e.scrollWidth,client:e.clientWidth}}),targets:targets.map(box)};
   result.nativeHidden=[...ctx.card.querySelectorAll('.bubble-wrapper,.bubble-content-container,.bubble-name-container')].flatMap(e=>['hidden','class'].map(kind=>{
    if(kind==='hidden')e.hidden=true;else e.classList.add('hidden');
    const display=getComputedStyle(e).display;
    e.hidden=false;e.classList.remove('hidden');return display;
   }));return result;
  },{code,native,power});
  const hint=JSON.stringify({width,mode,plain,power,m});
  assert.equal(m.card.height,118,hint);assert.equal(m.art.width,80,hint);
  assert.equal(m.sameContainingBlock,true,hint);
  assert.ok(m.nativeHidden.every(display=>display==='none'),hint);
  assert.ok(Math.abs(m.name.top-m.card.top-9)<1,hint);
  assert.ok(Math.abs(m.art.center-m.card.center)<1,hint);
  for(const t of m.texts){assert.equal(t.font,m.texts[0].font,hint);assert.ok(Math.abs(t.text.center-m.texts[0].text.center)<1,hint);assert.ok(t.scroll<=t.client+1,hint);assert.ok(t.text.right<=m.art.left-7,hint);}
  for(let i=1;i<m.targets.length;i++)assert.ok(m.targets[i].left>=m.targets[i-1].right-.5,hint);
 }
});
