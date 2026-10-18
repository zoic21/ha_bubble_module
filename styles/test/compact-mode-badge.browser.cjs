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
 await page.route('**/*',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.setContent('<style>body{margin:16px}#cards{width:393px}</style><home-assistant></home-assistant><div id="cards"></div>');
 await page.evaluate(()=>{
  customElements.define('ha-card',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>'}});
  customElements.define('ha-icon',class extends HTMLElement{get icon(){return this.getAttribute('icon')}set icon(v){this.setAttribute('icon',v)}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}</style>'}});
  customElements.define('ha-ripple',class extends HTMLElement{});
  document.querySelector('home-assistant').attachShadow({mode:'open'});
 });
 await page.addScriptTag({path:nativePath});return page;
}
async function draw(page,{kind='climate',width=393,mode='light',plain=false}={}){
 await page.evaluate(({code,theme,nativeModes,kind,width,mode,plain})=>{
  window.card?.remove();
  document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})}).filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
  document.querySelector('#cards').style.width=width+'px';
  const id=window.fixtureId=(window.fixtureId||0)+1;
  window.templateKeys=Object.fromEntries(['mode','fg','bg','opacity'].map(k=>[k,'{{ '+k+'_'+id+' }}']));
  window.results={[templateKeys.mode]:'Auto',[templateKeys.fg]:'#ffffff',[templateKeys.bg]:'#36993B',[templateKeys.opacity]:'1'};
  window.subscriptions=[];window.events=[];window.services=[];
  const primary=kind+'.demo';
  window.hass={states:{[primary]:{entity_id:primary,state:kind==='cover'?'open':'heat',attributes:{friendly_name:'Chambre principale',supported_features:kind==='cover'?15:385,current_position:50,temperature:20.5,current_temperature:21,hvac_modes:['off','heat'],hvac_action:'idle',min_temp:5,max_temp:30}},'automation.demo':{entity_id:'automation.demo',state:'on',attributes:{friendly_name:'Gestion automatique'}}},locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:mode==='dark'},config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris'},
   localize:()=>undefined,formatEntityState:s=>s.state,formatEntityAttributeValue:(s,k,v)=>v,hassUrl:p=>new URL(p,'https://ha.example.test').href,
   connection:{subscribeMessage:async(callback,message)=>{if(message.type==='render_template'&&Object.hasOwn(results,message.template)){const s={callback,template:message.template};subscriptions.push(s);callback({result:results[s.template]});return()=>{subscriptions=subscriptions.filter(x=>x!==s)}}return()=>{}},subscribeEvents:async()=>()=>{}},
   callWS:async m=>m.type==='frontend/get_icons'?{resources:{climate:{},cover:{},automation:{}}}:{},callService:async(...args)=>services.push(args)};
  document.querySelector('home-assistant').hass=hass;
  window.card=document.createElement('bubble-card');
  card.setConfig({type:'custom:bubble-card',card_type:kind,entity:primary,name:'Chambre principale',icon:kind==='cover'?'mdi:window-shutter':'mdi:radiator',show_name:true,show_icon:true,card_layout:'large',scrolling_effect:false,modules:[],styles:code,
   sub_button:{main:[{entity:'automation.demo',css_class:'mode-control',name:templateKeys.mode,show_name:true,show_icon:false,show_state:false,show_background:true,state_background:false,hide_when_parent_unavailable:false,scrolling_effect:false,tap_action:{action:'toggle'},hold_action:{action:'more-info',entity:primary}}]},
   signature_compact:{color:'#2A987A',sub_button_styles:{'mode-control':{type:'mode_badge',color:templateKeys.fg,background:templateKeys.bg,opacity:templateKeys.opacity}}}});
  document.querySelector('#cards').append(card);card.hass=hass;
  card.addEventListener('hass-action',e=>events.push(e.detail));
 },{code,theme,nativeModes,...{kind,width,mode,plain}});
 await page.waitForFunction(()=>card?._signatureCompactRuntime&&!card.initialLoad,{},{timeout:5000});
}
async function snapshot(page){return page.evaluate(()=>{
 const root=card.card,b=root.querySelector('.mode-control'),icon=root.querySelector('.bubble-main-icon-container'),name=root.querySelector('.bubble-name'),container=root.querySelector('.bubble-container');
 const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
 const pseudo=getComputedStyle(b,'::after');
 const ancestors=[];for(let el=b.parentElement;el&&el!==container.parentElement;el=el.parentElement){const s=getComputedStyle(el);ancestors.push({cls:el.className,position:s.position,transform:s.transform,filter:s.filter,contain:s.contain,containerType:s.containerType,box:box(el)})}
 return{button:box(b),icon:box(icon),name:box(name),container:box(container),ancestors,glyph:pseudo.content,badgeWidth:pseudo.width,badgeHeight:pseudo.height,background:pseudo.backgroundColor,foreground:pseudo.color,fullName:b.textContent,display:getComputedStyle(b).display,position:getComputedStyle(b).position};
});}
test('Compact mode badges keep 44px targets and 14px letters through native updates, themes and narrow widths',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const kind of ['cover','climate'])for(const width of [288,328,393,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await draw(page,{kind,width,mode,plain});
  for(const name of ['Auto','Manuel','—']){
   await page.evaluate(name=>{results[templateKeys.mode]=name;results[templateKeys.fg]=name==='Auto'?'#ffffff':'var(--primary-text-color)';results[templateKeys.bg]=name==='Auto'?'#36993B':'var(--ha-card-background, var(--card-background-color))';for(const s of subscriptions)s.callback({result:results[s.template]});card.updateBubbleCard()},name);
   try{await page.waitForFunction(name=>getComputedStyle(card.card.querySelector('.mode-control'),'::after').content==='"'+name[0]+'"',name,{timeout:5000})}
   catch(error){throw new Error(JSON.stringify({kind,width,mode,plain,name,snapshot:await snapshot(page),subscriptions:await page.evaluate(()=>subscriptions.map(s=>({template:s.template,value:results[s.template]})))}),{cause:error})}
   const m=await snapshot(page);
   assert.equal(m.button.width,44);assert.equal(m.button.height,44);assert.equal(m.badgeWidth,'14px');assert.equal(m.badgeHeight,'14px');
   assert.equal(Math.round(m.container.height),56);assert.equal(m.glyph,'"'+name[0]+'"');assert.ok(m.fullName.includes(name));
   assert.ok(m.icon.left+m.icon.width/2>=m.button.left&&m.icon.right-m.icon.width/2<=m.button.right,JSON.stringify({kind,width,mode,plain,...m}));
   assert.ok(m.button.right<=m.name.left,'mode target must not cover the room name');
   assert.ok(m.button.top>=m.container.top&&m.button.bottom<=m.container.bottom);
   if(name==='Auto')assert.equal(m.background,'rgb(54, 153, 59)');
   if(name==='Manuel')assert.notEqual(m.background,'rgb(54, 153, 59)');
  }
 }
});
test('tapping the whole main icon toggles only the native mode; holding opens parent details and equipment controls stay independent',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const kind of ['cover','climate']){
  await draw(page,{kind});const m=await snapshot(page);
  await page.mouse.click(m.icon.x+m.icon.width/2,m.icon.y+m.icon.height/2);await page.waitForTimeout(350);
  let events=await page.evaluate(()=>window.events);
  assert.equal(events.length,1);assert.equal(events[0].action,'tap');assert.equal(events[0].config.entity,'automation.demo');assert.equal(events[0].config.tap_action.action,'toggle');
  await page.evaluate(()=>{events=[]});
  await page.mouse.move(m.icon.x+m.icon.width/2,m.icon.y+m.icon.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();await page.waitForTimeout(100);
  events=await page.evaluate(()=>window.events);assert.equal(events.length,1);assert.equal(events[0].action,'hold');assert.deepEqual(events[0].config.hold_action,{action:'more-info',entity:kind+'.demo'});
  await page.evaluate(()=>{events=[];services=[]});
  const button=page.locator('bubble-card').locator(kind==='climate'?'.bubble-climate-plus-button:visible':'.bubble-cover-button:visible').last();
  await button.click();await page.waitForFunction(()=>events.length||services.length,{},{timeout:3000});
  const calls=await page.evaluate(()=>({events,services}));
  assert.ok(calls.events.length||calls.services.length,'equipment control must still act '+JSON.stringify({kind,calls,control:await button.evaluate(el=>({html:el.outerHTML,box:el.getBoundingClientRect().toJSON(),pointer:getComputedStyle(el).pointerEvents}))}));
  assert.ok(calls.events.every(e=>e.config.entity!=='automation.demo'),'equipment control must not toggle mode');
 }
});
test('native visibility and removing mode_badge restore the original control without replacing its node',{skip:!nativePath},async t=>{
 const page=await setup(t);await draw(page);
 await page.evaluate(()=>{
  const b=card.card.querySelector('.mode-control');b.classList.add('hidden');const hidden=getComputedStyle(b).display;b.classList.remove('hidden');
  card.config.signature_compact.sub_button_styles['mode-control'].type='mode';card.updateBubbleCard();
  window.restoration={hidden,b};
 });
 await page.waitForFunction(()=>getComputedStyle(card.card.querySelector('.mode-control')).position!=='absolute');
 const result=await page.evaluate(()=>({hidden:restoration.hidden,same:restoration.b===card.card.querySelector('.mode-control'),position:getComputedStyle(restoration.b).position,width:restoration.b.getBoundingClientRect().width}));
 assert.equal(result.hidden,'none');assert.equal(result.same,true);assert.notEqual(result.position,'absolute');assert.equal(result.width,46);
});
