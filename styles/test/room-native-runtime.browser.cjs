const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const YAML=require('yaml');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {theme,nativeModes}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');

// Optional integration fixture, deliberately not a copied Bubble DOM/CSS.
// Use dist/bubble-card.js from Clooos/Bubble-Card at 061ed837 (3.4.1).
const nativePath=process.env.BUBBLE_NATIVE_SCRIPT_PATH;
const code=process.env.BUBBLE_ROOM_MODULE_PATH
  ? YAML.parse(fs.readFileSync(process.env.BUBBLE_ROOM_MODULE_PATH,'utf8')).signature_room.code
  : loadModule('signature-room').code;

test('real Bubble text pipeline keeps compact measurements aligned across native refreshes', {skip:!nativePath},async t=>{
 const bytes=fs.readFileSync(nativePath);
 const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(sha,'5fe8799e8070e3169e1b2889c6d5d268632f9082','Use the documented Bubble 3.4.1 fixture');
 const page=await fixture(t,{prepare:null});const errors=[];
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('**/*',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.setContent('<style>body{margin:16px}#cards{width:500px}</style><home-assistant></home-assistant><div id="cards"></div>');
 await page.evaluate(()=>{
  customElements.define('ha-card',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>'}});
  customElements.define('ha-icon',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}</style>'}});
  customElements.define('ha-ripple',class extends HTMLElement{
   connectedCallback(){
    this.attachShadow({mode:'open'}).innerHTML='<style>:host{pointer-events:none;position:absolute;inset:0}.hover{opacity:0}.hovered .hover{opacity:var(--ha-ripple-hover-opacity,.08)}</style><div class="surface"><div class="hover"></div></div>';
    this.parentElement.addEventListener('pointerenter',()=>this.shadowRoot.querySelector('.surface').classList.add('hovered'));
    this.parentElement.addEventListener('pointerleave',()=>this.shadowRoot.querySelector('.surface').classList.remove('hovered'));
   }
  });
  document.querySelector('home-assistant').attachShadow({mode:'open'});
 });
 await page.addScriptTag({path:nativePath});
 for(const width of [288,328,500,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const scrolling of [false,true])for(const power of [140,1600,'unavailable']){
  await page.evaluate(({width,mode,plain,scrolling,power,code,theme,palettes})=>{
   window.card?.remove();
   document.documentElement.style.cssText=Object.entries({...palettes[mode],...(plain?{}:{...theme,...theme.modes[mode]})}).filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
   document.querySelector('#cards').style.width=width+'px';
   const state=(value,unit)=>({state:String(value),attributes:{unit_of_measurement:unit}});
   window.hass={states:{'sensor.power':state(power,'W'),'sensor.temperature':state(29,'°C'),'sensor.humidity':state(42,'%')},
    locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:mode==='dark'},config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris'},
    localize:()=>undefined,formatEntityState:s=>Number.isFinite(Number(s.state))?new Intl.NumberFormat('fr-FR',{minimumFractionDigits:s.attributes.unit_of_measurement==='°C'?1:0}).format(Number(s.state))+' '+s.attributes.unit_of_measurement:'Indisponible',formatEntityAttributeValue:(s,k,v)=>v,
    connection:{subscribeMessage:async()=>()=>{},subscribeEvents:async()=>()=>{}},
    // An empty icon response makes Bubble retry and redraw forever.
    callWS:async msg=>msg.type==='frontend/get_icons'?{resources:{sensor:{}}}:{}};
   document.querySelector('home-assistant').hass=hass;
   window.card=document.createElement('bubble-card');
   card.setConfig({type:'custom:bubble-card',card_type:'button',button_type:'state',entity:'sensor.power',name:'Baie informatique',show_icon:false,show_state:true,state_content:'state',card_layout:'large',rows:2,scrolling_effect:scrolling,
    button_action:{tap_action:{action:'navigate',navigation_path:'#rack'}},modules:[],styles:code,
    signature_room:{room_mode:'illustrated',room_inline_metrics:true,room_compact:true,room_state_as_value:true,room_hover:false,room_auto_colors:false,room_control_columns:2,illustration:{image:'https://fixture.test/rack.webp'}},
    sub_button:{main:[{entity:'sensor.temperature',show_name:false,show_icon:true,show_state:true,state_content:'state',css_class:'room-control-1',tap_action:{action:'navigate',navigation_path:'#temperature'}},{entity:'sensor.humidity',show_name:false,show_icon:true,show_state:true,state_content:'state',css_class:'room-control-2',tap_action:{action:'more-info'}}]}});
   document.querySelector('#cards').append(card);card.hass=hass;
   window.calls=[];card.addEventListener('hass-action',e=>calls.push(e.detail));
  },{width,mode,plain,scrolling,power,code,theme,palettes:nativeModes});
  await page.waitForFunction(()=>card?._signatureRoomRuntime && !card.initialLoad);
  for(const refreshed of [false,true]){
   if(refreshed)await page.evaluate(()=>{hass={...hass,states:{...hass.states,'sensor.power':{...hass.states['sensor.power'],state:'141'}}};card.hass=hass;card.updateBubbleCard()});
   // Snapshot actual text atomically. Bubble may keep its native text node or
   // the formatter's spans; alignment must work with either representation.
   const snapshot=await page.waitForFunction(()=>{
    const root=card.card,wrapper=root.querySelector('.bubble-wrapper'),state=root.querySelector('.bubble-state');
    const targets=[state,...root.querySelectorAll('.room-control-1,.room-control-2')];
    const firstText=element=>{const walk=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node;while(node=walk.nextNode())if(node.textContent.trim())return node;return null};
    const text=[state,...root.querySelectorAll('.bubble-sub-button-name-container')].map(firstText);
    if(text.some(e=>!e))return false;
    const read=e=>{const b=e.getBoundingClientRect();return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,height:b.height,center:b.top+b.height/2}};
    return{height:root.querySelector('.bubble-container').getBoundingClientRect().height,grid:getComputedStyle(wrapper).display,inlineDisplay:state.style.display,display:getComputedStyle(state).display,
     rows:targets.map(e=>getComputedStyle(e).gridRow),targets:targets.map(e=>({...read(e),style:e.style.cssText,zoom:getComputedStyle(e).zoom,scale:getComputedStyle(e).scale,transform:getComputedStyle(e).transform})),texts:text.map(e=>{const r=document.createRange();r.selectNodeContents(e);return{...read(r),font:getComputedStyle(e.parentElement).fontSize}}),
     nodesRemainNative:targets.every(e=>e.classList.contains('bubble-action')&&e.dataset.entity),code:card.lastEvaluatedStyles};
   },{},{timeout:3000});
   const m=await snapshot.jsonValue();await snapshot.dispose();
   const hint=JSON.stringify({width,mode,plain,scrolling,power,refreshed,m:{...m,code:undefined}});
   assert.equal(m.height,118,hint);assert.equal(m.nodesRemainNative,true,hint);
   if(!scrolling)assert.equal(m.inlineDisplay,'-webkit-box',hint);
   for(let i=0;i<3;i++){
    assert.ok(Math.abs(m.texts[i].center-m.texts[0].center)<1,hint);assert.equal(m.texts[i].font,m.texts[0].font,hint);
    assert.equal(m.targets[i].height,44,hint);
   }
   assert.ok(m.rows.every(row=>row==='2'),hint);
   assert.equal(m.grid,'grid',hint);assert.equal(m.display,'flex',hint);
   assert.ok(m.targets[0].right<=m.targets[1].left+1&&m.targets[1].right<=m.targets[2].left+1,hint);
   assert.ok(!m.code.includes('grid-template-rows:38px 32px'), 'Compact must not ship the regular room geometry');
  }
 }
 // Native delegated gestures, not fixture click listeners.
 for(const [selector,action,entity] of [['.bubble-background','navigate','sensor.power'],['.bubble-state','more-info','sensor.power'],['.room-control-1','navigate','sensor.temperature'],['.room-control-2','more-info','sensor.humidity']]){
  await page.locator('bubble-card').locator(selector).click({position:{x:selector==='.bubble-background'?30:8,y:5}});
  const call=await page.evaluate(()=>calls.at(-1));assert.equal(call.action,'tap');assert.equal(call.config.tap_action.action,action);assert.equal(call.config.entity,entity);
 }
 assert.deepEqual(errors,[]);
});
