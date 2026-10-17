const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {theme,nativeModes}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-panel').code;
const nativePath=process.env.BUBBLE_NATIVE_SCRIPT_PATH;

async function setup(t){
 const bytes=fs.readFileSync(nativePath);
 assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'5fe8799e8070e3169e1b2889c6d5d268632f9082');
 const page=await fixture(t,{prepare:null});
 page.on('console',m=>{if(m.type()==='error') console.error(m.text());});
 await page.route('**/*',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.setContent('<style>body{margin:16px}#cards{width:500px}</style><home-assistant></home-assistant><div id="cards"></div>');
 await page.evaluate(()=>{
  customElements.define('ha-card',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>'}});
  customElements.define('ha-icon',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}</style>'}});
  customElements.define('ha-ripple',class extends HTMLElement{});
  document.querySelector('home-assistant').attachShadow({mode:'open'});
 });
 await page.addScriptTag({path:nativePath});
 return page;
}
async function draw(page,{width=328,mode='light',plain=false,count=1,buttons=0,detail=false,media=false,scrolling=false,unavailable=false}={}){
 await page.evaluate(({width,mode,plain,count,buttons,detail,media,scrolling,unavailable,code,theme,nativeModes})=>{
  window.card?.remove();
  document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})})
   .filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
  document.querySelector('#cards').style.width=width+'px';
  const state=(value,unit)=>({state:String(value),attributes:{unit_of_measurement:unit}});
  window.hass={states:{'sensor.power':state(unavailable?'unavailable':140,'W'),'sensor.temperature':state(29.7,'°C'),'sensor.humidity':state(42,'%'),
   'media_player.demo':{state:'playing',attributes:{friendly_name:'Musique',media_title:'Une chanson',media_artist:'Un artiste',supported_features:0,volume_level:.4}}},
   locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:mode==='dark'},config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris'},
   localize:()=>undefined,formatEntityState:s=>s.state,formatEntityAttributeValue:(s,k,v)=>v,
   connection:{subscribeMessage:async()=>()=>{},subscribeEvents:async()=>()=>{}},callWS:async msg=>msg.type==='frontend/get_icons'?{resources:{sensor:{},media_player:{}}}:{},callService:async()=>{}};
  Object.entries(hass.states).forEach(([entity_id,value])=>value.entity_id=entity_id);
  document.querySelector('home-assistant').hass=hass;
  window.card=document.createElement('bubble-card');
  const commands=Array.from({length:buttons},(_,i)=>({entity:'sensor.power',name:['Désarmer','Armer','Nuit'][i],icon:'mdi:shield',show_name:true,show_state:false,show_background:true,css_class:'command-'+i,tap_action:{action:'more-info'}}));
  const extra=[{entity:'sensor.temperature',icon:'mdi:thermometer',secondary:detail?'Température':''},{entity:'sensor.humidity',icon:'mdi:water-percent',secondary:detail?'Humidité':''}].slice(0,count-1);
  const options={hover:false,secondary:detail?'Détail principal':'',information:extra,
   illustration:{image:'/local/atlas.webp',image_light:'/local/day.webp',image_dark:'/local/night.webp',columns:3,rows:2,index:0,index_dark:3},
   sub_button_styles:Object.fromEntries(commands.map((b,i)=>[b.css_class,{type:'command',active:i===0,disabled:i===0}]))};
  card.setConfig({type:'custom:bubble-card',card_type:media?'media-player':'button',button_type:'state',entity:media?'media_player.demo':'sensor.power',
   name:count===3?'Baie informatique':'Alarme',show_icon:false,show_state:true,state_content:'state',card_layout:'large',rows:2,scrolling_effect:scrolling,
   modules:[],styles:code,signature_panel:options,sub_button:{main:commands},button_action:{tap_action:{action:'navigate',navigation_path:'#panel'}}});
  document.querySelector('#cards').append(card);card.hass=hass;
  window.calls=[];card.addEventListener('hass-action',e=>calls.push(e.detail));
 },{width,mode,plain,count,buttons,detail,media,scrolling,unavailable,code,theme,nativeModes});
 await page.waitForFunction(()=>card?._signaturePanelRuntime && !card.initialLoad,{},{timeout:5000});
}
async function snapshot(page){
 return page.evaluate(()=>{
  const root=card.card,host=root.querySelector('.bubble-container');
  const box=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,height:b.height,width:b.width,center:b.y+b.height/2}};
  const art=getComputedStyle(host,'::after'),frame=box(host);
  const nodes=[...root.querySelectorAll('.bubble-state,.dp-panel-state')].filter(e=>getComputedStyle(e).display!=='none');
  const labels=nodes.map(el=>{
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let text;while(text=walker.nextNode())if(text.textContent.trim())break;
   const range=document.createRange();if(text)range.selectNodeContents(text);
   return {...box(el),text:text?box(range):null,font:getComputedStyle(el).fontSize,color:getComputedStyle(el).color,overflow:el.scrollWidth-el.clientWidth};
  });
  const commands=[...root.querySelectorAll('[data-dp-command]')].map(e=>({...box(e),disabled:e.getAttribute('aria-disabled'),
   style:e.style.cssText,widthCSS:getComputedStyle(e).width,min:getComputedStyle(e).minWidth,zoom:getComputedStyle(e).zoom,transform:getComputedStyle(e).transform,
   parent:{style:e.parentElement.style.cssText,width:box(e.parentElement).width,display:getComputedStyle(e.parentElement).display}}));
  return {frame,name:box(root.querySelector('.bubble-name')),labels,commands,
   art:{width:parseFloat(art.width),height:parseFloat(art.height),row:art.gridRow,align:art.alignSelf},
   radius:getComputedStyle(host).borderRadius,background:getComputedStyle(host).backgroundColor,
   media:root.querySelector('.bubble-media-info-container')?box(root.querySelector('.bubble-media-info-container')):null,
   css:card.lastEvaluatedStyles};
 });
}

test('Panel aligns one to three information columns in real Bubble, across themes and native refreshes',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,358,382,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const count of [1,2,3]){
  await draw(page,{width,mode,plain,count,detail:count===2,scrolling:count===2,unavailable:count===1});
  for(const refresh of [false,true]){
   if(refresh)await page.evaluate(()=>{hass={...hass,states:{...hass.states,'sensor.power':{...hass.states['sensor.power'],state:'141'}}};card.hass=hass;card.updateBubbleCard()});
   const m=await snapshot(page),hint=JSON.stringify({width,mode,plain,count,refresh,m:{...m,css:undefined}});
   assert.equal(m.frame.height,118,hint);assert.equal(m.radius,'22px',hint);
   assert.equal(m.art.width,80,hint);assert.equal(m.art.height,80,hint);assert.equal(m.art.row,'1 / -1',hint);assert.equal(m.art.align,'center',hint);
   assert.equal(m.labels.length,count,hint);
   for(let i=0;i<count;i++){
    assert.ok(m.labels[i].overflow<=1,hint);
    assert.equal(m.labels[i].font,m.labels[0].font,hint);
    assert.ok(Math.abs(m.labels[i].text.center-m.labels[0].text.center)<1,hint);
    if(i)assert.ok(m.labels[i].left>=m.labels[i-1].right-1,hint);
   }
  }
 }
});

test('Panel reserves a native command footer, guards disabled gestures and follows theme-only updates',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,600])for(const buttons of [1,2,3])for(const detail of [false,true]){
  await draw(page,{width,buttons,detail});const m=await snapshot(page),hint=JSON.stringify({width,buttons,detail,m:{...m,css:undefined}});
  assert.equal(m.frame.height,118,hint);assert.equal(m.commands.length,buttons,hint);
  for(const command of m.commands){assert.equal(command.height,44,hint);assert.ok(command.width>=44,hint);assert.ok(command.bottom<=m.frame.bottom,hint);}
  assert.ok(m.labels[0].bottom<=m.commands[0].top+1,hint);
  assert.ok(m.commands.at(-1).right<=m.frame.right-80,hint);
  const calls=await page.evaluate(()=>{
   const nodes=[...card.card.querySelectorAll('[data-dp-command]')];
   nodes[0].dispatchEvent(new CustomEvent('hass-action',{bubbles:true,composed:true,detail:{action:'tap'}}));
   const blocked=calls.length;
   if(nodes[1])nodes[1].dispatchEvent(new CustomEvent('hass-action',{bubbles:true,composed:true,detail:{action:'tap'}}));
   return {blocked,allowed:calls.length};
  });
  assert.equal(calls.blocked,0,hint);if(buttons>1)assert.equal(calls.allowed,1,hint);
 }
 await draw(page);const light=(await snapshot(page)).css;
 await page.evaluate(()=>{hass={...hass,themes:{darkMode:true}};card.hass=hass;card.updateBubbleCard()});
 const dark=(await snapshot(page)).css;
 assert.ok(light.includes('/local/day.webp'));assert.ok(dark.includes('/local/night.webp'));
});

test('Panel keeps native media and controls within the same illustration grid',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,600])for(const mode of ['light','dark']){
  await draw(page,{width,mode,media:true});const m=await snapshot(page),hint=JSON.stringify({width,mode,m:{...m,css:undefined}});
  assert.equal(m.frame.height,118,hint);assert.ok(m.media.height>0,hint);
  assert.ok(m.media.right<=m.frame.right-80,hint);assert.ok(m.media.top>=m.name.bottom-1,hint);
 }
});
