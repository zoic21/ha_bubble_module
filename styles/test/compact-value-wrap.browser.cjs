const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {fixture}=require('./browser.cjs');
const {theme,nativeModes}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-compact').code;
const nativePath=process.env.BUBBLE_NATIVE_SCRIPT_PATH;
async function setup(t){
 const bytes=fs.readFileSync(nativePath);
 assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'5fe8799e8070e3169e1b2889c6d5d268632f9082');
 const page=await fixture(t,{prepare:null});
 page.on("console",m=>{if(m.type()==="error")console.error(m.text())});
 await page.route('**/*',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.setContent('<style>body{margin:16px}#cards{width:393px}</style><home-assistant></home-assistant><div id="cards"></div>');
 await page.evaluate(()=>{
  customElements.define('ha-card',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>'}});
  customElements.define('ha-icon',class extends HTMLElement{get icon(){return this.getAttribute('icon')}set icon(v){this.setAttribute('icon',v)}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}</style>'}});
  customElements.define('ha-select',class extends HTMLElement{constructor(){super();this.updateComplete=Promise.resolve();this.attachShadow({mode:'open'});}});
  customElements.define('ha-ripple',class extends HTMLElement{});
  document.querySelector('home-assistant').attachShadow({mode:'open'});
 });
 await page.addScriptTag({path:nativePath});return page;
}
async function draw(page,{kind='zappi',width=366,mode='dark',plain=false,secondary='',long=false,originalIcons=false}={}){
 await page.evaluate(({code,theme,nativeModes,kind,width,mode,plain,secondary,long,originalIcons})=>{
  window.card?.remove();
  document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})}).filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
  document.querySelector('#cards').style.width=width+'px';
  const state=(value,attributes={})=>({state:String(value),attributes});
  window.events=[];window.services=[];
  window.hass={states:{'sensor.power':state(kind==='eddi'?3:2,{unit_of_measurement:'W'}),'sensor.house':state(437,{unit_of_measurement:'W'}),
   'sensor.status':state(long?'Waiting for surplus generation':'Paused'),
   'select.mode':state(kind==='zappi'?'Eco+':'Normal',{options:['Eco+','Normal','Fast']}),
   'input_select.priority':state(kind==='eddi'?3:2,{options:['1','2','3']}),'sensor.temperature':state(21,{unit_of_measurement:'°C'})},
   locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:mode==='dark'},config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris'},
   localize:()=>undefined,formatEntityState:s=>s.state+(s.attributes.unit_of_measurement?' '+s.attributes.unit_of_measurement:''),formatEntityAttributeValue:(s,k,v)=>v,hassUrl:p=>new URL(p,'https://ha.example.test').href,
   connection:{subscribeMessage:async()=>()=>{},subscribeEvents:async()=>()=>{}},
   callWS:async m=>m.type==='frontend/get_icons'?{resources:{sensor:{},select:{},input_select:{}}}:{},callService:async(...args)=>services.push(args)};
  Object.entries(hass.states).forEach(([entity_id,s])=>s.entity_id=entity_id);
  document.querySelector('home-assistant').hass=hass;
  const modeButton={entity:'select.mode',show_state:true,state_background:false,icon:'mdi:auto-mode',show_icon:originalIcons,show_name:false,sub_button_type:'select'};
  const priority={entity:'input_select.priority',sub_button_type:'select',show_state:true,show_icon:false};
  const main=kind==='zappi'?[{buttons_layout:'inline',justify_content:'end',group:[{entity:'sensor.status',show_name:false,show_state:true,show_background:false,state_background:false,icon:'mdi:state-machine',show_icon:originalIcons}]},
   {buttons_layout:'inline',justify_content:'end',group:[modeButton,priority]}]:[{buttons_layout:'inline',justify_content:'end',group:[modeButton,priority,{entity:'sensor.temperature',show_name:false,show_icon:originalIcons,show_state:true,show_background:false,state_background:false}]}];
  window.card=document.createElement('bubble-card');
  card.setConfig({type:'custom:bubble-card',card_type:'button',button_type:'state',entity:'sensor.power',name:kind==='zappi'?'Zappi':'Eddi',icon:kind==='zappi'?'mdi:ev-station':'mdi:water-boiler',
   show_state:true,show_name:true,show_icon:true,force_icon:true,card_layout:'large',rows:1,scrolling_effect:false,modules:[],styles:code,
   sub_button:{main,main_layout:'inline'},signature_compact:{color:'#8C6AAF',compact_mode:'value',value_style:'button',value_background:false,fill:{reference_entity:'sensor.house'},secondary},
   tap_action:{action:'more-info'},button_action:{tap_action:{action:'more-info'}}});
  document.querySelector('#cards').append(card);card.hass=hass;card.addEventListener('hass-action',e=>events.push(e.detail));
 },{code,theme,nativeModes,kind,width,mode,plain,secondary,long,originalIcons});
 await page.waitForFunction(()=>card?._signatureCompactRuntime&&!card.initialLoad,{},{timeout:5000});
}
async function snapshot(page){return page.evaluate(()=>{
 const root=card.card;
 const box=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,height:b.height,width:b.width,text:e.querySelector(".bubble-sub-button-name-container")?.textContent||e.querySelector(".dp-value")?.textContent||e.textContent.slice(0,30),overflow:e.scrollWidth-e.clientWidth}};
 return {frame:box(root.querySelector('.bubble-container')),icon:box(root.querySelector('.bubble-icon-container')),name:box(root.querySelector('.bubble-name')),state:box(root.querySelector('.bubble-state')),
  buttons:[...root.querySelectorAll('.bubble-sub-button')].filter(e=>e.getBoundingClientRect().width).map(box)};
});}
function within(m){
 const visible=[m.icon,m.name,m.state,...m.buttons];
 for(const b of visible){assert.ok(b.left>=m.frame.left&&b.right<=m.frame.right+.1&&b.top>=m.frame.top&&b.bottom<=m.frame.bottom+.1,JSON.stringify(m));assert.ok(b.overflow<=1,JSON.stringify(m));}
 assert.equal(m.name.left-m.icon.right,10);
 for(const b of m.buttons)assert.ok(b.top>=m.state.bottom-.1||b.left>=m.state.right-.1,JSON.stringify(m));
}
test('small-value equipment rows use the available width instead of a mobile breakpoint',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const kind of ['zappi','eddi'])for(const width of [288,328,358,366,382,480,500,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await draw(page,{kind,width,mode,plain});
  const m=await snapshot(page);within(m);
  assert.equal(m.frame.height,width>=358?56:100,JSON.stringify({kind,width,mode,plain,m}));
  assert.equal(m.buttons.length,3);
 }
});
test('intrinsic reflow follows resize, longer states, secondary text and hidden native controls without replacing nodes',{skip:!nativePath},async t=>{
 const page=await setup(t);
 await draw(page,{width:600,long:true});
 await page.evaluate(()=>window.originalNodes=[...card.card.querySelectorAll('.bubble-state,.bubble-sub-button,.bubble-dropdown-select')]);
 for(const width of [366,600,328,600]){
  await page.evaluate(width=>document.querySelector('#cards').style.width=width+'px',width);
  const m=await snapshot(page);within(m);if(width===600)assert.equal(m.frame.height,56);else assert.ok(m.frame.height>56);
  assert.ok(await page.evaluate(()=>originalNodes.every((node,i)=>node===card.card.querySelectorAll('.bubble-state,.bubble-sub-button,.bubble-dropdown-select')[i])));
 }
 await page.evaluate(()=>{document.querySelector('#cards').style.width='366px';card.card.querySelector('.bubble-sub-button-1').classList.add('hidden');});
 let m=await snapshot(page);within(m);assert.equal(m.frame.height,56);assert.equal(m.buttons.length,2);
 await page.evaluate(()=>card.card.querySelector('.bubble-sub-button-1').classList.remove('hidden'));
 assert.ok((await snapshot(page)).frame.height>56);
 for(const width of [288,366,600]){
  await draw(page,{kind:'eddi',width,secondary:'20 %'});m=await snapshot(page);within(m);
  const secondary=await page.evaluate(()=>{const e=card.card.querySelector('.dp-secondary'),b=e.getBoundingClientRect();return{left:b.left,top:b.top,bottom:b.bottom,display:getComputedStyle(e).display}});
  assert.equal(secondary.left,m.name.left);assert.ok(secondary.top>=m.name.bottom-.1&&secondary.bottom<=m.frame.bottom);
  await page.evaluate(()=>card.card.querySelector('.bubble-content-container').classList.add('hidden'));
  assert.equal(await page.evaluate(()=>getComputedStyle(card.card.querySelector('.bubble-content-container')).display),'none');
 }
});
test('the native value action and selectors remain usable after reflow',{skip:!nativePath},async t=>{
 const page=await setup(t);await draw(page,{width:366});
 await page.locator('bubble-card').locator('.bubble-state').click();
 await page.waitForFunction(()=>events.length>0);
 assert.deepEqual(await page.evaluate(()=>({entity:events[0].config.entity,action:events[0].config.tap_action.action})),{entity:'sensor.power',action:'more-info'});
 // Home Assistant's select component is stubbed; dispatch its native event to
 // verify Bubble's select_option binding independently of menu presentation.
 await page.evaluate(()=>{const select=card.card.querySelector('.bubble-dropdown-select');select.value='Fast';select.dispatchEvent(new Event('click',{bubbles:true}));});
 await page.waitForFunction(()=>services.length>0,{},{timeout:3000});
 assert.equal((await page.evaluate(()=>services))[0][1],'select_option');
});
