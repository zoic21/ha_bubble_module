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
async function draw(page,{media=false,width=180,mode='dark',plain=false,playback='playing',metadata=true,scrolling=false,customState='',label='Lever',clockValue='8:15',showState,showName,hide={},buttons=true,fullWidth=false}={}){
 await page.evaluate(({code,theme,nativeModes,media,width,mode,plain,playback,metadata,scrolling,customState,label,clockValue,showState,showName,hide,buttons,fullWidth})=>{
  window.card?.remove();
  document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})}).filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
  document.querySelector('#cards').style.width=width+'px';
  const entity=media?'media_player.emilie_emilie':'input_datetime.emilie_heure_levee';
  window.events=[];window.services=[];
  window.hass={states:{[entity]:{entity_id:entity,state:media?playback:'08:15:00',attributes:media?{
   friendly_name:'Émilie',supported_features:buttons?32767:0,volume_level:.4,is_volume_muted:false,media_content_type:'music',
   ...(metadata?{media_title:'Il était un Petit Navire et autres comptines',media_artist:'La superstar des chansons pour les enfants',entity_picture:'/api/cover.jpg'}:{})
  }:{friendly_name:'Lever',has_date:false,has_time:true,hour:8,minute:15,second:0}}},
   locale:{language:'fr',number_format:'language',time_format:'24'},language:'fr',themes:{darkMode:mode==='dark'},config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris'},
   localize:()=>undefined,formatEntityState:s=>media?s.state:clockValue,formatEntityAttributeValue:(s,k,v)=>v,hassUrl:p=>new URL(p,'https://ha.example.test').href,
   connection:{subscribeMessage:async()=>()=>{},subscribeEvents:async()=>()=>{}},
   callWS:async m=>m.type==='frontend/get_icons'?{resources:{input_datetime:{},media_player:{}}}:{},callService:async(...args)=>services.push(args)};
  document.querySelector('home-assistant').hass=hass;
  window.card=document.createElement('bubble-card');
  card.setConfig({type:'custom:bubble-card',card_type:media?'media-player':'button',button_type:'state',entity,name:media?'Émilie':label,icon:media?'mdi:speaker':'mdi:weather-sunset-up',
   force_icon:!media,card_layout:'large',scrolling_effect:scrolling,cover_background:false,grid_options:{columns:'full',rows:'auto'},modules:[],styles:code,
   tap_action:{action:'more-info'},button_action:{tap_action:{action:'more-info'}},hide,main_buttons_full_width:fullWidth,
   ...(showState===undefined?{}:{show_state:showState}),...(showName===undefined?{}:{show_name:showName}),
   ...(!media?{rows:1,state_content:'state'}:{}),
   signature_compact:{color:'#208EC6',...(!media?{compact_mode:'value',...(customState?{state:customState}:{})}:{})}});
  document.querySelector('#cards').append(card);card.hass=hass;card.addEventListener('hass-action',e=>events.push(e.detail));
 },{code,theme,nativeModes,media,width,mode,plain,playback,metadata,scrolling,customState,label,clockValue,showState,showName,hide,buttons,fullWidth});
 await page.waitForFunction(()=>card&&!card.initialLoad&&card.card?.querySelector('.bubble-container'),{},{timeout:5000});
}
async function snapshot(page){return page.evaluate(()=>{
 const root=card.card,frame=root.querySelector('.bubble-container');
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);const range=document.createRange();range.selectNodeContents(e);const b=range.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,center:r.y+r.height/2,
  display:s.display,font:s.fontSize,line:s.lineHeight,padding:s.padding,margin:s.margin,text:e.innerText,textCenter:b.y+b.height/2,textTop:b.top,textBottom:b.bottom,overflow:e.scrollWidth-e.clientWidth,ellipsis:s.textOverflow,whiteSpace:s.whiteSpace,trim:s.textBoxTrim}};
 const ink=e=>{const s=getComputedStyle(e),r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect(),ctx=document.createElement('canvas').getContext('2d');ctx.font=s.fontWeight+' '+s.fontSize+' '+s.fontFamily;const m=ctx.measureText(e.textContent);return{baseline:b.top+m.fontBoundingBoxAscent,cap:m.actualBoundingBoxAscent,desc:m.actualBoundingBoxDescent,center:b.top+m.fontBoundingBoxAscent+(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2}};
 return {clock:root.dataset.dpValueClock,ink:root.dataset.dpValueClock?{name:ink(root.querySelector('.bubble-name')),state:ink(root.querySelector('.bubble-state'))}:null,frame:box(frame),name:box(root.querySelector('.bubble-name')),state:box(root.querySelector('.bubble-state')),info:box(root.querySelector('.bubble-media-info-container')),title:box(root.querySelector('.bubble-title')),artist:box(root.querySelector('.bubble-artist')),
  nodes:[...root.querySelectorAll('.bubble-name-container,.bubble-content-container,.bubble-buttons-container,.bubble-media-button')].map(e=>({cls:e.className,...box(e)}))};
});}
test('Compact clocks centre the visible title and time glyphs through native rendering and theme changes',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [180,188,210,382])for(const mode of ['light','dark'])for(const plain of [false,true])for(const label of ['Lever','Coucher']){
  await draw(page,{width,mode,plain,label,clockValue:label==='Lever'?'8:15':'20:15'});
  const m=await snapshot(page);assert.equal(m.frame.height,56);assert.equal(m.clock,'yes');
  assert.equal(m.name.center,m.state.center);assert.ok(Math.abs(m.ink.name.center-m.ink.state.center)<=1,JSON.stringify(m));
  assert.equal(m.name.trim,'trim-both');assert.equal(m.state.trim,'trim-both');
  assert.ok(m.state.left>=m.name.right&&m.state.right<=m.frame.right-9);
 }
 await draw(page,{width:210});
 await page.evaluate(()=>{window.timeNode=card.card.querySelector('.bubble-state');document.documentElement.style.setProperty('--signature-font-family','Georgia,serif')});
 let m=await snapshot(page);assert.ok(Math.abs(m.ink.name.center-m.ink.state.center)<=1,JSON.stringify(m));
 await page.evaluate(()=>{hass.formatEntityState=()=> 'Indisponible';card.hass={...hass};card.updateBubbleCard()});
 await page.waitForFunction(()=>!card.card.hasAttribute('data-dp-value-clock'));
 assert.equal(await page.evaluate(()=>getComputedStyle(timeNode).paddingBlock),'2px');
 await page.evaluate(()=>{hass.formatEntityState=()=> '20:15';card.hass={...hass};card.updateBubbleCard()});
 await page.waitForFunction(()=>card.card.dataset.dpValueClock==='yes');
 assert.ok(await page.evaluate(()=>timeNode===card.card.querySelector('.bubble-state')));
 await page.locator('bubble-card').locator('.bubble-state').click();await page.waitForFunction(()=>events.length>0);
 assert.equal((await page.evaluate(()=>events[0])).config.entity,'input_datetime.emilie_heure_levee');
});
test('Compact media keeps native title and artist to one line inside the 56px card',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,366,382,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const scrolling of [false,true]){
  await draw(page,{media:true,width,mode,plain,scrolling});const m=await snapshot(page);
  const hint=JSON.stringify({width,mode,plain,scrolling,m});
  assert.equal(m.frame.height,56,hint);assert.ok(m.info.height>0&&m.info.height<=44,hint);
  assert.ok(m.info.top>=m.frame.top&&m.info.bottom<=m.frame.bottom,hint);
  assert.ok(Math.abs(m.info.center-m.frame.center)<=.1,hint);
  for(const text of [m.title,m.artist]){assert.equal(text.whiteSpace,'nowrap',hint);assert.equal(text.ellipsis,'ellipsis',hint);assert.ok(text.height<=parseFloat(text.line)+.1,hint);}
  assert.equal(await page.evaluate(()=>card.card.querySelectorAll('.bubble-buttons-container > .bubble-media-button').length),5);
 }
});
test('Compact media preserves metadata updates, native visibility, volume and transport actions',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const playback of ['paused','idle','off','unavailable'])for(const metadata of [true,false]){
  await draw(page,{media:true,width:366,playback,metadata});const m=await snapshot(page);
  assert.equal(m.frame.height,56);
  if(m.info.height)assert.ok(m.info.top>=m.frame.top&&m.info.bottom<=m.frame.bottom,JSON.stringify(m));
 }
 await draw(page,{media:true,width:366,playback:'playing'});
 await page.evaluate(()=>window.mediaNodes=[card.card.querySelector('.bubble-title'),card.card.querySelector('.bubble-artist')]);
 await page.locator('bubble-card').locator('.bubble-play-pause-button').click();
 await page.waitForFunction(()=>services.length>0);
 assert.equal((await page.evaluate(()=>services))[0][1],'media_pause');
 await page.locator('bubble-card').locator('.bubble-volume-button').click();
 assert.ok(await page.evaluate(()=>!card.card.querySelector('.bubble-volume-slider-wrapper').classList.contains('is-hidden')));
 await page.locator('bubble-card').locator('.bubble-volume-slider-close-button').click();
 await page.evaluate(()=>{hass.states['media_player.emilie_emilie'].attributes.media_title='Un autre titre';hass.states['media_player.emilie_emilie'].attributes.media_artist='Nouvel artiste';card.hass={...hass};card.updateBubbleCard()});
 await page.waitForFunction(()=>card.card.querySelector('.bubble-title').textContent.includes('Un autre titre'));
 assert.ok(await page.evaluate(()=>mediaNodes.every((node,i)=>node===card.card.querySelectorAll('.bubble-title,.bubble-artist')[i])));
 await page.evaluate(()=>card.card.querySelector('.bubble-artist').classList.add('hidden'));
 assert.equal((await snapshot(page)).artist.display,'none');
 await page.evaluate(()=>card.card.querySelector('.bubble-artist').classList.remove('hidden'));
 assert.equal((await snapshot(page)).artist.display,'block');
});

test('Compact play and pause stay neutral while native Power hiding releases space and keeps transport actions',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,366,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const playback of ['playing','paused'])for(const fullWidth of [false,true]){
  await draw(page,{media:true,width,mode,plain,playback,fullWidth,hide:{power_button:true}});
  await page.waitForFunction(()=>getComputedStyle(card.card.querySelector('.bubble-play-pause-button')).backgroundColor==='rgba(0, 0, 0, 0)');
  const before=await page.evaluate(()=>{
   const root=card.card,play=root.querySelector('.bubble-play-pause-button'),power=root.querySelector('.bubble-power-button'),icon=play.querySelector('.bubble-media-button-icon');
   window.playNode=play;window.ripple=play.querySelector('ha-ripple');
   return{background:getComputedStyle(play).backgroundColor,color:getComputedStyle(icon).color,reference:getComputedStyle(root.querySelector('.bubble-next-button .bubble-media-button-icon')).color,
    icon:icon.getAttribute('icon'),powerWidth:power.getBoundingClientRect().width,playWidth:play.getBoundingClientRect().width,playHeight:play.getBoundingClientRect().height,ripple:!!window.ripple};
  });
  assert.equal(before.background,'rgba(0, 0, 0, 0)');assert.equal(before.color,before.reference);assert.equal(before.powerWidth,0);assert.ok(before.ripple);
  assert.equal(before.icon,playback==='playing'?'mdi:pause':'mdi:play');assert.ok(before.playWidth>=30&&before.playHeight>=30);
  await page.locator('bubble-card').locator('.bubble-play-pause-button').click();await page.waitForFunction(()=>services.length>0);
  assert.equal((await page.evaluate(()=>services))[0][1],playback==='playing'?'media_pause':'media_play');
  await page.evaluate(()=>{document.documentElement.style.setProperty('--primary-text-color','#abcdef');card.updateBubbleCard()});
  assert.equal(await page.evaluate(()=>getComputedStyle(playNode.querySelector('.bubble-media-button-icon')).color),'rgb(171, 205, 239)');
  assert.ok(await page.evaluate(()=>playNode===card.card.querySelector('.bubble-play-pause-button')&&ripple===playNode.querySelector('ha-ripple')));
 }
 await draw(page,{media:true,width:366});const withPower=await snapshot(page);
 await page.locator('bubble-card').locator('.bubble-power-button').click();await page.waitForFunction(()=>services.length>0);
 assert.equal((await page.evaluate(()=>services))[0][1],'turn_off');
 await draw(page,{media:true,width:366,hide:{power_button:true}});const withoutPower=await snapshot(page);
 assert.ok(withoutPower.info.width>=withPower.info.width+35);
});
