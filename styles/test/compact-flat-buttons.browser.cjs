const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-compact').code;

test('Cave à vin gains room from transparent metrics while gaps, touch targets, colors and actions remain native',async t=>{
 const page=await fixture(t);
 for(const width of [288,328,358,376,382,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await render(page,{width,mode,plain});
  const result=await page.evaluate(({code,width})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='compact-standard'),root=ctx.card,shadow=root.getRootNode();
   // Native Bubble 3.4.1 defaults relevant to these targets (061ed837).
   const native=document.createElement('style');native.textContent=`
    .bubble-content-container{padding:0;gap:0}
    .bubble-sub-button{position:relative;box-sizing:border-box;flex-direction:row-reverse;flex-wrap:nowrap;width:max-content;min-width:36px;height:36px;padding:0 8px;font-size:12px;white-space:nowrap}
    .bubble-sub-button-icon{display:block;flex-shrink:0;width:16px;height:16px;margin-inline-end:4px}
   `;shadow.insertBefore(native,shadow.firstChild.nextSibling);
   const name=root.querySelector('.bubble-name');name.textContent='Cave à vin';ctx.elements.state.classList.add('hidden');
   const group=root.querySelector('.bubble-sub-button-container');group.replaceChildren();
   const texts=['85','17,4 °C','0 W',''];let clicks=0;
   const buttons=texts.map((text,i)=>{
    const b=document.createElement('div');b.className='bubble-sub-button bubble-sub-button-'+(i+1);
    b.innerHTML='<span class="bubble-sub-button-name-container">'+text+'</span><ha-icon class="bubble-sub-button-icon"></ha-icon>';
    b.addEventListener('click',()=>clicks++);group.append(b);return b;
   });
   ctx.config={card_type:'button',button_type:'name',entity:'sensor.demo',name:'Cave à vin',show_state:false,
    sub_button:{main:texts.map((_,i)=>({entity:i===3?'switch.demo':'sensor.demo',show_background:false,...(i===3?{tap_action:{action:'toggle'}}:{})}))},
    signature_compact:{flat_button_padding:8,sub_button_styles:{1:{background:'transparent',icon_color:'#368ACB'},2:{background:'transparent'},3:{background:'transparent'},4:{type:'switch'}}}};
   ctx._hass.states['switch.demo']={state:'on',attributes:{}};
   const style=[...shadow.querySelectorAll('style')].at(-1);
   const run=()=>style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
   const box=e=>{const b=e.getBoundingClientRect();return{left:b.left,right:b.right,width:b.width,height:b.height,top:b.top,bottom:b.bottom}};
   const read=()=>({group:box(group),name:box(name),frame:box(ctx.elements.mainContainer),buttons:buttons.map(b=>({...box(b),padding:getComputedStyle(b).paddingInlineStart,color:getComputedStyle(b.querySelector('ha-icon')).color,min:getComputedStyle(b).minWidth})),gap:getComputedStyle(group).gap,line:parseFloat(getComputedStyle(name).lineHeight)});
   run();const before=read();delete ctx.config.signature_compact.flat_button_padding;run();const after=read();
   buttons.forEach(b=>b.click());
   ctx.config.signature_compact.sub_button_styles[2].background='#ff0000';run();const opaque=read();
   ctx.config.signature_compact.sub_button_styles[2].background='transparent';ctx.config.signature_compact.flat_button_padding=2;run();const custom=read();
   buttons[0].classList.add('hidden');run();const hidden=getComputedStyle(buttons[0]).display;
   return{width,before,after,opaque,custom,clicks,hidden,sameNodes:buttons.every(b=>b.isConnected)};
  },{code,width});
  const {before,after,opaque,custom}=result,hint=JSON.stringify({width,mode,plain,result});
  assert.ok(Math.abs(before.group.width-after.group.width-24)<.1,hint);
  assert.equal(after.gap,'8px');assert.equal(after.frame.height,56);
  for(let i=0;i<3;i++){
   assert.equal(before.buttons[i].padding,'8px');assert.equal(after.buttons[i].padding,'4px');assert.equal(custom.buttons[i].padding,'2px');
   assert.equal(after.buttons[i].height,before.buttons[i].height);assert.equal(after.buttons[i].min,'36px');assert.ok(after.buttons[i].width>=36);
   assert.equal(after.buttons[i].color,before.buttons[i].color);
  }
  assert.equal(opaque.buttons[1].padding,'8px');
  for(const key of ['width','height','padding','min','color'])assert.equal(after.buttons[3][key],before.buttons[3][key]);
  if(width>=376)assert.ok(after.name.height<=after.line+4.1,hint);
  assert.ok(after.name.right<=after.group.left+.1,hint);
  assert.equal(result.hidden,'none');assert.equal(result.clicks,4);assert.ok(result.sameNodes);
 }
});
