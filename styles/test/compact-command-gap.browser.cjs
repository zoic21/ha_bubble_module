const assert=require('node:assert/strict');
const fs=require('node:fs');
const {test}=require('node:test');
const {setup,draw}=require('./panel-variants.fixture.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const nativePath=process.env.BUBBLE_VARIANTS_NATIVE_SCRIPT_PATH;
const code=loadModule('signature-compact').code;

test('Compact keeps the same reduced action gap at every width and releases four pixels for names beside a native switch',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [187.33,188,210,382,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const state of ['on','off','unavailable']){
  await draw(page,{width,mode,plain,kind:'double'});
  await page.evaluate(({width,state,code})=>{
   card.remove();window.calls=[];window.services=[];
   hass.states['light.ambiance']={entity_id:'light.ambiance',state,attributes:{friendly_name:'Ambiance'}};
   hass.callService=async(...args)=>services.push(args);
   window.card=document.createElement('bubble-card');
   card.setConfig({type:'custom:bubble-card',card_type:'button',button_type:'state',entity:'light.ambiance',icon:'mdi:lightbulb',force_icon:true,
    show_name:true,show_state:false,scrolling_effect:false,card_layout:'large',rows:1,modules:[],styles:code,
    tap_action:{action:'navigate',navigation_path:'#ambiance'},button_action:{tap_action:{action:'navigate',navigation_path:'#ambiance'}},
    sub_button:{main:[{entity:'light.ambiance',css_class:'power',show_name:false,show_state:false,show_icon:true,show_background:false,icon:'mdi:power',tap_action:{action:'toggle'},hold_action:{action:'more-info'}}]},
    signature_compact:{sub_button_styles:{power:{type:'switch'}}}});
   document.querySelector('#cards').append(card);card.hass=hass;
   card.addEventListener('hass-action',event=>calls.push(event.detail));
  },{width,state,code});
  await page.waitForFunction(()=>!card.initialLoad&&card.card?.dataset.dpLayout==='compact'&&card.card.querySelector('.bubble-name')?.textContent==='Ambiance');
  const m=await page.evaluate(()=>{
   const root=card.card,box=e=>e.getBoundingClientRect(),frame=box(root.querySelector('.bubble-container'));
   const content=box(root.querySelector('.bubble-content-container')),icon=box(root.querySelector('.bubble-icon-container'));
   const name=root.querySelector('.bubble-name'),nameBox=box(name),group=box(root.querySelector('.bubble-sub-button-container')),button=root.querySelector('.power'),target=box(button);
   const range=document.createRange();range.selectNodeContents(name);const text=range.getBoundingClientRect();
   window.powerNode=button;
   return{gap:group.left-content.right,iconGap:nameBox.left-icon.right,left:icon.left-frame.left,right:frame.right-target.right,height:frame.height,
    target:[target.width,target.height],textFits:text.right<=nameBox.right+.1,overflow:name.scrollWidth-name.clientWidth,font:getComputedStyle(name).fontSize,nameWidth:nameBox.width,textWidth:text.width,
    track:[getComputedStyle(button,'::before').width,getComputedStyle(button,'::before').height],version:card._signatureCompactRuntime?.version};
  });
  const hint=JSON.stringify({width,mode,plain,state,m});
  assert.ok(Math.abs(m.gap-4)<.1,hint);assert.ok(Math.abs(m.iconGap-10)<.1,hint);
  assert.ok(Math.abs(m.left-10)<.1&&Math.abs(m.right-10)<.1,hint);
  assert.equal(m.height,56,hint);assert.deepEqual(m.target,[52,34],hint);assert.deepEqual(m.track,['48px','28px'],hint);
  assert.equal(m.font,'14px',hint);assert.ok(Math.abs(m.nameWidth-(width-122))<.1,hint);
  if(width>=210)assert.ok(m.textFits&&m.overflow<=1,hint);
  // Reproduce a label just beyond the old limit using the available system font.
  // Its glyph width differs from Safari/iOS; avoid assuming Apple's font metrics.
  const edge=await page.evaluate(()=>{
   const root=card.card,name=root.querySelector('.bubble-name'),range=document.createRange();range.selectNodeContents(name);
   document.querySelector('#cards').style.width=(range.getBoundingClientRect().width+124)+'px';
   const read=()=>({available:name.getBoundingClientRect().width,needed:range.getBoundingClientRect().width});
   const current=read(),old=document.createElement('style');old.textContent='ha-card[data-dp-layout="compact"] .bubble-wrapper{gap:8px!important}';root.append(old);
   const previous=read();old.remove();return{current,previous};
  });
  assert.ok(edge.current.available>=edge.current.needed+.9,JSON.stringify(edge));
  assert.ok(edge.previous.available<edge.previous.needed,JSON.stringify(edge));
  assert.ok(Math.abs(edge.current.available-edge.previous.available-4)<.1,JSON.stringify(edge));
  if(state==='on'){
   await page.locator('bubble-card').locator('.power').click();
   await page.waitForFunction(()=>calls.length>0||services.length>0);
   const action=await page.evaluate(()=>({calls,services,same:powerNode===card.card.querySelector('.power')}));
   assert.ok(action.same,hint);
   assert.ok(action.calls.some(c=>c.config.entity==='light.ambiance'&&c.config.tap_action?.action==='toggle')||action.services.some(c=>c[1]==='toggle'&&c[2]?.entity_id==='light.ambiance'),JSON.stringify(action));
  }
  if(process.env.COMPACT_CAPTURE_DIR&&width===187.33&&!plain&&state==='on'){
   fs.mkdirSync(process.env.COMPACT_CAPTURE_DIR,{recursive:true});
   await page.locator('bubble-card').screenshot({path:process.env.COMPACT_CAPTURE_DIR+'/ambiance-'+mode+'.png',scale:'css'});
  }
 }
});
