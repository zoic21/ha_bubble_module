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
  customElements.define('ha-icon',class extends HTMLElement{
   get icon(){return this.getAttribute('icon')}
   set icon(value){this.setAttribute('icon',value)}
   connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}</style>'}
  });
  customElements.define('ha-ripple',class extends HTMLElement{});
  document.querySelector('home-assistant').attachShadow({mode:'open'});
 });
 await page.addScriptTag({path:nativePath});
 return page;
}
async function draw(page,{width=328,mode='light',plain=false,count=1,buttons=0,detail=false,media=false,scrolling=false,unavailable=false,panel={},native={},extraStates={},templateResults={}}={}){
 await page.evaluate(({width,mode,plain,count,buttons,detail,media,scrolling,unavailable,panel,native,extraStates,templateResults,code,theme,nativeModes})=>{
  window.card?.remove();
  document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})})
   .filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
  document.querySelector('#cards').style.width=width+'px';
  const state=(value,unit)=>({state:String(value),attributes:{unit_of_measurement:unit}});
  const subscriptions=window.templateSubscriptions ||= new Set();
  Object.assign(window.liveTemplateResults ||= {},templateResults);
  for(const sub of [...subscriptions])if(Object.hasOwn(templateResults,sub.template))sub.callback({result:templateResults[sub.template]});
  window.hass={states:{'sensor.power':state(unavailable?'unavailable':140,'W'),'sensor.temperature':state(29.7,'°C'),'sensor.humidity':state(42,'%'),
   'media_player.demo':{state:'playing',attributes:{friendly_name:'Musique',media_title:'Une chanson',media_artist:'Un artiste',supported_features:0,volume_level:.4}},...extraStates},
   locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:mode==='dark'},config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris'},
   hassUrl:path=>new URL(path,'https://ha.example.test').href,
   localize:()=>undefined,formatEntityState:s=>s.state,formatEntityAttributeValue:(s,k,v)=>v,
   connection:{subscribeMessage:async(callback,message)=>{
    if(message.type==='render_template' && Object.hasOwn(templateResults,message.template)){const sub={callback,template:message.template};subscriptions.add(sub);callback({result:templateResults[message.template]});return()=>subscriptions.delete(sub)}
    return()=>{};
   },subscribeEvents:async()=>()=>{}},callWS:async msg=>msg.type==='frontend/get_icons'?{resources:{sensor:{},media_player:{}}}:{},callService:async()=>{}};
  Object.entries(hass.states).forEach(([entity_id,value])=>value.entity_id=entity_id);
  document.querySelector('home-assistant').hass=hass;
  window.card=document.createElement('bubble-card');
  const commands=Array.from({length:buttons},(_,i)=>({entity:'sensor.power',name:['Désarmer','Armer','Nuit'][i],icon:'mdi:shield',show_name:true,show_state:false,show_background:true,css_class:'command-'+i,tap_action:{action:'more-info'}}));
  const extra=[{entity:'sensor.temperature',icon:'mdi:thermometer',secondary:detail?'Température':''},{entity:'sensor.humidity',icon:'mdi:water-percent',secondary:detail?'Humidité':''}].slice(0,count-1);
  const options={hover:false,secondary:detail?'Détail principal':'',information:extra,
   illustration:{image:'/local/atlas.webp',image_light:'/local/day.webp',image_dark:'/local/night.webp',columns:3,rows:2,index:0,index_dark:3},
   sub_button_styles:Object.fromEntries(commands.map((b,i)=>[b.css_class,{type:'command',active:i===0,disabled:i===0}])),...panel};
  card.setConfig({type:'custom:bubble-card',card_type:media?'media-player':'button',button_type:'state',entity:media?'media_player.demo':'sensor.power',
   name:count===3?'Baie informatique':'Alarme',show_icon:false,show_state:true,state_content:'state',card_layout:'large',rows:2,scrolling_effect:scrolling,
   modules:[],styles:code,signature_panel:options,sub_button:{main:commands},button_action:{tap_action:{action:'navigate',navigation_path:'#panel'}},...native});
  document.querySelector('#cards').append(card);card.hass=hass;
  window.calls=[];card.addEventListener('hass-action',e=>calls.push(e.detail));
 },{width,mode,plain,count,buttons,detail,media,scrolling,unavailable,panel,native,extraStates,templateResults,code,theme,nativeModes});
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
   const unit=el.querySelector('.dp-unit'),s=unit&&getComputedStyle(unit);
   return {...box(el),text:text?box(range):null,font:getComputedStyle(el).fontSize,color:getComputedStyle(el).color,numeric:getComputedStyle(el).fontVariantNumeric,
    unit:s?{weight:s.fontWeight,color:s.color,spacing:s.letterSpacing}:null,overflow:el.scrollWidth-el.clientWidth};
  });
  const commands=[...root.querySelectorAll('[data-dp-command]')].map(e=>({...box(e),disabled:e.getAttribute('aria-disabled'),
   style:e.style.cssText,widthCSS:getComputedStyle(e).width,min:getComputedStyle(e).minWidth,zoom:getComputedStyle(e).zoom,transform:getComputedStyle(e).transform,
   parent:{style:e.parentElement.style.cssText,width:box(e.parentElement).width,display:getComputedStyle(e.parentElement).display}}));
  const probe=document.createElement('span');probe.style.color='var(--secondary-text-color)';root.append(probe);
  const secondaryColor=getComputedStyle(probe).color;probe.remove();
  return {frame,name:box(root.querySelector('.bubble-name')),labels,commands,secondaryColor,
   art:{width:parseFloat(art.width),height:parseFloat(art.height),row:art.gridRow,align:art.alignSelf},
   radius:getComputedStyle(host).borderRadius,background:getComputedStyle(host).backgroundColor,
   media:root.querySelector('.bubble-media-info-container')?box(root.querySelector('.bubble-media-info-container')):null,
   css:card.lastEvaluatedStyles};
 });
}

test('media Panel artwork follows track changes with natural proportions and restores its themed atlas',{skip:!nativePath},async t=>{
 const page=await setup(t);
 const illustration={media_artwork:true,image:'/local/atlas.webp',image_dark:'/local/night.webp',columns:4,rows:6,index:2,index_dark:14,offset_x:7,offset_y:27,offset_y_dark:8};
 for(const width of [288,328,358,382,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await draw(page,{width,mode,plain,media:true,panel:{illustration}});
  const read=()=>page.evaluate(()=>{
   const host=card.card.querySelector('.bubble-container'),art=getComputedStyle(host,'::after');
   const frame=host.getBoundingClientRect();
   return{image:art.backgroundImage,size:art.backgroundSize,position:art.backgroundPosition,width:parseFloat(art.width),height:parseFloat(art.height),cardHeight:frame.height,radius:art.borderRadius};
  });
  const fallback=await read();
  await page.evaluate(()=>window.mediaNode=card.card.querySelector('.bubble-media-info-container'));
  for(const image of ['https://example.test/album.jpg','/api/media_player_proxy/media_player.demo?token=two']){
   await page.evaluate(image=>{
    hass={...hass,states:{...hass.states,'media_player.demo':{...hass.states['media_player.demo'],attributes:{...hass.states['media_player.demo'].attributes,entity_picture:image}}}};
    card.hass=hass;card.updateBubbleCard();
   },image);
   const current=await read();assert.ok(current.image.includes(image));assert.equal(current.size,'contain');assert.equal(current.position,'50% 50%');
   assert.equal(current.width,80);assert.equal(current.height,80);assert.equal(current.cardHeight,118);
   assert.equal(current.radius,'12px');
   assert.equal(await page.evaluate(()=>mediaNode===card.card.querySelector('.bubble-media-info-container')),true);
  }
  await page.evaluate(()=>{
   const attributes={...hass.states['media_player.demo'].attributes};delete attributes.entity_picture;
   hass={...hass,states:{...hass.states,'media_player.demo':{...hass.states['media_player.demo'],attributes}}};card.hass=hass;card.updateBubbleCard();
  });
  assert.deepEqual(await read(),fallback);
 }
});

test('Panel play and pause keep native taps and neutral icons without a permanent background',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const state of ['playing','paused']){
  await draw(page,{width,mode,plain,media:true,extraStates:{'media_player.demo':{state,attributes:{supported_features:16385,volume_level:.4}}}});
  // Native Bubble animates background-color for 300 ms after style injection.
  await page.waitForFunction(()=>getComputedStyle(card.card.querySelector('.bubble-play-pause-button')).backgroundColor==='rgba(0, 0, 0, 0)');
  const before=await page.evaluate(()=>{
   window.playButton=card.card.querySelector('.bubble-play-pause-button');
   window.playRipple=playButton.querySelector('ha-ripple');window.services=[];
   hass.callService=(domain,service,data)=>services.push({domain,service,data});
   const style=getComputedStyle(playButton),icon=playButton.querySelector('.bubble-media-button-icon');
   return{background:style.backgroundColor,color:getComputedStyle(icon).color,otherColor:getComputedStyle(card.card.querySelector('.bubble-volume-button .bubble-media-button-icon')).color,
    icon:icon.getAttribute('icon'),width:playButton.getBoundingClientRect().width,height:playButton.getBoundingClientRect().height,ripple:!!playRipple};
  });
  assert.equal(before.background,'rgba(0, 0, 0, 0)');assert.equal(before.color,before.otherColor);
  assert.equal(before.icon,state==='playing'?'mdi:pause':'mdi:play');assert.equal(before.ripple,true);
  assert.ok(before.width>=30);assert.ok(before.height>=30);
  await page.locator('bubble-card').locator('.bubble-play-pause-button').click({timeout:3000});
  assert.deepEqual(await page.evaluate(()=>services),[{domain:'media_player',service:state==='playing'?'media_pause':'media_play',data:{entity_id:'media_player.demo'}}]);
  await page.evaluate(()=>{card.updateBubbleCard()});
  assert.equal(await page.evaluate(()=>playButton===card.card.querySelector('.bubble-play-pause-button')&&playRipple===playButton.querySelector('ha-ripple')),true);
 }
});

test('media details keep track metadata and native controls on separate rows and restore the empty-detail layout',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,358,382,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const metadata of [true,false]){
  await draw(page,{width,mode,plain,media:true,native:{show_state:false,state_content:[]},
   panel:{secondary:'{{ detail }}'},templateResults:{'{{ detail }}':'Volume 35 % · Application au nom particulièrement long'},
   extraStates:{'media_player.demo':{state:'playing',attributes:{supported_features:16385,volume_level:.35,media_content_type:'music',...(metadata?{media_title:'Un morceau au titre particulièrement long',media_artist:'Un artiste'}:{})}}}});
  const read=()=>page.evaluate(()=>{
   const root=card.card,rect=e=>{const b=e.getBoundingClientRect();return{top:b.top,bottom:b.bottom,left:b.left,right:b.right,height:b.height}};
   const info=root.querySelector('.bubble-media-info-container'),detail=root.querySelector('.dp-secondary');
   return{frame:rect(root.querySelector('.bubble-container')),name:rect(root.querySelector('.bubble-name')),info:rect(info),row:getComputedStyle(info).gridRow,
    metadata:[...info.querySelectorAll('.bubble-title,.bubble-artist')].filter(e=>e.textContent.trim()&&getComputedStyle(e).display!=='none').map(e=>({...rect(e),line:parseFloat(getComputedStyle(e).lineHeight),inline:e.style.cssText,html:e.innerHTML})),
    detail:detail?{...rect(detail),overflow:getComputedStyle(detail).textOverflow,whiteSpace:getComputedStyle(detail).whiteSpace}:null,
    footer:rect(root.querySelector('.bubble-buttons-container')),buttons:[...root.querySelectorAll('.bubble-media-button')].filter(e=>getComputedStyle(e).display!=='none').map(rect)};
  });
  const m=await read(),hint=JSON.stringify({width,mode,plain,metadata,m});
  assert.equal(m.frame.height,118,hint);assert.equal(m.row,'2',hint);
  if(m.info.height){assert.ok(m.info.top>=m.name.bottom-.1,hint);assert.ok(m.info.bottom<=m.detail.top+.1,hint);}
  for(const line of m.metadata){assert.ok(line.top>=m.name.bottom-.1,hint);assert.ok(line.bottom<=m.detail.top+.1,hint);assert.ok(line.height>=line.line-.1,hint);}
  assert.ok(m.detail.bottom<=m.footer.top+.1,hint);assert.equal(m.detail.overflow,'ellipsis');assert.equal(m.detail.whiteSpace,'nowrap');
  await page.evaluate(()=>{
   window.infoNode=card.card.querySelector('.bubble-media-info-container');
   for(const sub of templateSubscriptions)if(sub.template==='{{ detail }}')sub.callback({result:''});card.updateBubbleCard();
  });
  await page.waitForFunction(()=>!card.card.querySelector('.dp-secondary'));
  const empty=await read();assert.equal(empty.row,'2 / 4');
  assert.equal(await page.evaluate(()=>infoNode===card.card.querySelector('.bubble-media-info-container')),true);
 }
});

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
    assert.equal(m.labels[i].numeric,'tabular-nums',hint);
    if(m.labels[i].unit){assert.equal(m.labels[i].unit.weight,'400',hint);assert.equal(m.labels[i].unit.color,m.secondaryColor,hint);assert.ok(['normal','0px'].includes(m.labels[i].unit.spacing),hint);}
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
 await draw(page,{width:600,buttons:1});
 const themed=await page.evaluate(()=>{
  const style=card.lastEvaluatedStyles,node=card.card.querySelector('[data-dp-command]');
  document.documentElement.style.setProperty('--signature-compact-value-font-size','22px');
  document.documentElement.style.setProperty('--signature-control-border-radius','9px');
  document.documentElement.style.setProperty('--signature-card-border-radius','18px');
  return {value:getComputedStyle(card.card.querySelector('.bubble-state')).fontSize,commandRadius:getComputedStyle(node).borderRadius,
   commandHeight:node.getBoundingClientRect().height,cardRadius:getComputedStyle(card.card.querySelector('.bubble-container')).borderRadius,unchanged:style===card.lastEvaluatedStyles};
 });
 assert.deepEqual(themed,{value:'22px',commandRadius:'9px',commandHeight:44,cardRadius:'18px',unchanged:true});
 await draw(page);const light=(await snapshot(page)).css;
 await page.evaluate(()=>{hass={...hass,themes:{darkMode:true}};card.hass=hass;card.updateBubbleCard()});
 const dark=(await snapshot(page)).css;
 assert.ok(light.includes('/local/day.webp'));assert.ok(dark.includes('/local/night.webp'));
});

test('three Panel measurements stay large on phones and fit together on narrow cards',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,358,366,382,388,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await draw(page,{width,mode,plain,count:3});
  for(const values of [[140,28.8,41],[999,42.5,100]]){
   await page.evaluate(values=>{
    for(const [index,entity] of ['sensor.power','sensor.temperature','sensor.humidity'].entries())
     hass.states[entity]={...hass.states[entity],state:String(values[index])};
    hass={...hass,states:{...hass.states}};card.hass=hass;card.updateBubbleCard();
   },values);
   const m=await snapshot(page),hint=JSON.stringify({width,mode,plain,values,m:{...m,css:undefined}});
   assert.equal(m.frame.height,118,hint);assert.equal(m.art.width,80,hint);
   const size=parseFloat(m.labels[0].font);
   assert.ok(size>=13 && size<=24,hint);
   if(width>=366)assert.ok(size>=22,hint);
   if(width>=382)assert.equal(size,24,hint);
   for(let i=0;i<3;i++){
    assert.equal(m.labels[i].font,m.labels[0].font,hint);
    assert.ok(Math.abs(m.labels[i].text.center-m.labels[0].text.center)<1,hint);
    assert.ok(m.labels[i].overflow<=1,hint);
    if(i)assert.ok(m.labels[i].left>=m.labels[i-1].right+7,hint);
   }
   assert.ok(m.labels[2].right<=m.frame.right-92,hint);
  }
  const live=await page.evaluate(()=>{
   const css=card.lastEvaluatedStyles;
   document.documentElement.style.setProperty('--signature-value-font-size','18px');
   const values=[...card.card.querySelectorAll('.bubble-state,.dp-panel-state')].map(e=>parseFloat(getComputedStyle(e).fontSize));
   return {values,unchanged:css===card.lastEvaluatedStyles};
  });
  assert.equal(live.unchanged,true);
  assert.ok(live.values.every(value=>value===live.values[0] && value<=18));
 }
});

test('Panel keeps native media and controls within the same illustration grid',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,600])for(const mode of ['light','dark']){
  await draw(page,{width,mode,media:true});const m=await snapshot(page),hint=JSON.stringify({width,mode,m:{...m,css:undefined}});
  assert.equal(m.frame.height,118,hint);assert.ok(m.media.height>0,hint);
  assert.ok(m.media.right<=m.frame.right-80,hint);assert.ok(m.media.top>=m.name.bottom-1,hint);
  const typography=await page.evaluate(()=>{
   const read=()=>['.bubble-title','.bubble-artist'].map(s=>{const c=getComputedStyle(card.card.querySelector(s));return [parseFloat(c.fontSize),parseFloat(c.lineHeight)]});
   const before=read();document.documentElement.style.setProperty('--signature-name-font-size','18px');document.documentElement.style.setProperty('--signature-secondary-font-size','17px');
   return [before,read()];
  });
  for(const pair of typography)for(const [size,line] of pair)assert.ok(Math.abs(line-size*1.3)<.02,hint);
 }
});

test('real Panel pointer taps reach explicit value actions above the native background',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,382,600])for(const mode of ['light','dark']){
  await draw(page,{width,mode,count:3,panel:{tap_action:{action:'navigate',navigation_path:'#power'},information:[
   {entity:'sensor.temperature',icon:'mdi:thermometer',tap_action:{action:'navigate',navigation_path:'#temperature'}},
   {entity:'sensor.humidity'}]}});
  for(const refresh of [false,true]){
   if(refresh)await page.evaluate(()=>{hass={...hass,states:{...hass.states,'sensor.temperature':{...hass.states['sensor.temperature'],state:'30.2'}}};card.hass=hass;card.updateBubbleCard()});
   for(const [selector,index,path] of [['.bubble-state .dp-value',0,'#power'],['.bubble-state .dp-unit',0,'#power'],['.dp-panel-state .dp-value',0,'#temperature'],['.dp-panel-state .dp-unit',0,'#temperature'],['.dp-panel-state .dp-panel-icon',0,'#temperature'],['.dp-panel-state .dp-value',1,null]]){
    await page.evaluate(()=>calls.length=0);
    await page.locator('bubble-card').locator(selector).nth(index).click({timeout:3000});
    await page.waitForFunction(()=>calls.length===1);
    const call=await page.evaluate(()=>calls[0]);
    assert.equal(call.action,'tap');
    assert.equal(call.config.tap_action.action,path?'navigate':'more-info');
    if(path)assert.equal(call.config.tap_action.navigation_path,path);
    else assert.equal(call.config.entity,'sensor.humidity');
   }
  }
 }
 await draw(page,{count:3});
 await page.locator('bubble-card').locator('.bubble-state').click();
 await page.waitForFunction(()=>calls.length===1);
 assert.equal((await page.evaluate(()=>calls[0])).config.tap_action.action,'more-info');
});

test('Panel title badges share the Room neutral capsule, preserve geometry and native actions',{skip:!nativePath},async t=>{
 const page=await setup(t);
 const badge={entity:'switch.fan',name:'Ventilation',icon:'{{ fan_icon }}',force_icon:true,show_name:false,show_state:false,show_icon:true,show_background:false,state_background:false,css_class:'fan-status',tap_action:{action:'navigate',navigation_path:'#temperature'}};
 for(const width of [288,328,382,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await draw(page,{width,mode,plain,count:3});const before=await snapshot(page);
  await draw(page,{width,mode,plain,count:3,native:{sub_button:{main:[badge]}},extraStates:{'switch.fan':{state:'on',attributes:{}}},panel:{sub_button_styles:{'fan-status':{type:'badge',color:'{{ fan_color }}',background:'transparent',opacity:'{{ fan_opacity }}'}}},templateResults:{'{{ fan_icon }}':'mdi:fan','{{ fan_color }}':'#29958A','{{ fan_opacity }}':1}});
  for(const state of ['on','off','unknown','unavailable']){
   await page.evaluate(state=>{
    const results={'{{ fan_icon }}':state==='on'?'mdi:fan':state==='off'?'mdi:fan-off':'mdi:fan-alert','{{ fan_color }}':state==='on'?'#29958A':'#818181','{{ fan_opacity }}':['on','off'].includes(state)?1:.4};
    Object.assign(liveTemplateResults,results);
    for(const sub of [...templateSubscriptions])sub.callback({result:results[sub.template]});
    hass={...hass,states:{...hass.states,'switch.fan':{state,attributes:{}}}};card.hass=hass;card.updateBubbleCard();
   },state);
   await page.waitForFunction(state=>{const node=card.card.querySelector('.fan-status');return getComputedStyle(node.querySelector('.bubble-sub-button-icon')).color===(state==='on'?'rgb(41, 149, 138)':'rgb(129, 129, 129)') && Number(getComputedStyle(node).opacity)===(['on','off'].includes(state)?1:.4)},state,{timeout:3000});
   const m=await page.evaluate(()=>{
    const button=card.card.querySelector('.fan-status'),group=card.card.querySelector('.dp-panel-badges'),icon=button.querySelector('.bubble-sub-button-icon');
    window.badgeNode=button;
    return {group:getComputedStyle(group).backgroundColor,fill:getComputedStyle(button).backgroundColor,icon:getComputedStyle(icon).color,glyph:icon.getAttribute('icon'),
     height:button.getBoundingClientRect().height,size:getComputedStyle(icon).getPropertyValue('--mdc-icon-size'),opacity:getComputedStyle(button).opacity,
     gap:button.getBoundingClientRect().left-card.card.querySelector('.bubble-name').getBoundingClientRect().right,
     right:group.getBoundingClientRect().right,
     artRight:card.card.querySelector('.bubble-container').getBoundingClientRect().right-parseFloat(getComputedStyle(card.card.querySelector('.bubble-container')).paddingRight)-parseFloat(getComputedStyle(card.card.querySelector('.bubble-container')).borderRightWidth)};
   },state);
   const after=await snapshot(page),hint=JSON.stringify({width,mode,plain,state,m});
   assert.equal(after.frame.height,118,hint);assert.deepEqual(after.art,before.art,hint);
   assert.deepEqual(after.labels.map(x=>[x.top,x.bottom,x.font]),before.labels.map(x=>[x.top,x.bottom,x.font]),hint);
   assert.equal(m.height,20,hint);assert.equal(m.size,'14px',hint);assert.ok(m.gap>=9.9,hint);
   assert.ok(Math.abs(m.right-m.artRight)<.1,hint);
   assert.equal(m.fill,'rgba(0, 0, 0, 0)',hint);
   assert.equal(m.icon,state==='on'?'rgb(41, 149, 138)':'rgb(129, 129, 129)',hint);
   assert.equal(m.glyph,state==='on'?'mdi:fan':state==='off'?'mdi:fan-off':'mdi:fan-alert',hint);
   assert.equal(Number(m.opacity),['on','off'].includes(state)?1:.4,hint);
   if(state==='on')await page.evaluate(value=>window.neutralBadgeBackground=value,m.group);
   else assert.equal(m.group,await page.evaluate(()=>neutralBadgeBackground),hint);
   await page.evaluate(()=>calls.length=0);
   await page.locator('bubble-card').locator('.fan-status').click({timeout:3000});
   await page.waitForFunction(()=>calls.length===1);
   assert.equal((await page.evaluate(()=>calls[0])).config.tap_action.navigation_path,'#temperature',hint);
  }
  const hidden=await page.evaluate(()=>{badgeNode.classList.add('hidden');return getComputedStyle(card.card.querySelector('.dp-panel-badges')).display});
  assert.equal(hidden,'none');
  await page.evaluate(()=>{badgeNode.classList.remove('hidden');delete card.config.signature_panel.sub_button_styles;card.updateBubbleCard()});
  assert.equal(await page.evaluate(()=>card.card.querySelector('.dp-panel-heading')),null);
  assert.equal(await page.evaluate(()=>badgeNode===card.card.querySelector('.bubble-sub-button-container .fan-status')),true);
 }
});

test('Panel capsules grow over the artwork with one to three native badges and retain the no-image fallback',{skip:!nativePath},async t=>{
 const page=await setup(t);
 const badges=Array.from({length:3},(_,i)=>({entity:'switch.fan',icon:'mdi:fan',show_name:false,show_state:false,show_icon:true,show_background:false,state_background:false,css_class:'status-'+i,tap_action:{action:'navigate',navigation_path:'#badge-'+i}}));
 const sub_button_styles=Object.fromEntries(badges.map(b=>[b.css_class,{type:'badge',color:'#29958A'}]));
 const geometry=()=>page.evaluate(()=>{
  const root=card.card,box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  const host=root.querySelector('.bubble-container'),s=getComputedStyle(host);
  return {group:box(root.querySelector('.dp-panel-badges')),name:box(root.querySelector('.bubble-name')),
   artRight:host.getBoundingClientRect().right-parseFloat(s.paddingRight)-parseFloat(s.borderRightWidth)};
 });
 for(const width of [288,328,382,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const count of [1,2,3]){
  await draw(page,{width,mode,plain,count});const before=await snapshot(page);
  for(const number of [1,2,3]){
   await draw(page,{width,mode,plain,count,native:{sub_button:{main:badges.slice(0,number)}},panel:{sub_button_styles},extraStates:{'switch.fan':{state:'on',attributes:{}}}});
   const m=await geometry(),after=await snapshot(page),hint=JSON.stringify({width,mode,plain,count,number,m});
   assert.equal(m.group.width,number*20+4,hint);assert.equal(m.group.height,20,hint);
   assert.ok(Math.abs(m.group.right-m.artRight)<.1,hint);assert.ok(m.group.x>=m.name.right+7.9,hint);
   assert.equal(m.group.y,m.name.y,hint);assert.deepEqual(after.art,before.art,hint);assert.deepEqual(after.labels,before.labels,hint);
   assert.equal(after.frame.height,before.frame.height,hint);
  }
 }
 for(let i=0;i<3;i++)await page.locator('bubble-card').locator('.status-'+i).click({timeout:3000});
 assert.deepEqual(await page.evaluate(()=>calls.map(c=>c.config.tap_action.navigation_path)),['#badge-0','#badge-1','#badge-2']);
 const beforeAlert=await geometry();
 await page.evaluate(()=>{const badge=document.createElement('span');badge.className='am-alert-badge';badge.dataset.amState='active';card.card.querySelector('.bubble-main-icon-container').append(badge)});
 const active=await geometry();assert.equal(active.group.right,beforeAlert.group.right-24);assert.ok(active.group.x>=active.name.right+7.9);
 await page.evaluate(()=>card.card.querySelector('.am-alert-badge').dataset.amState='resolved');
 assert.deepEqual(await geometry(),beforeAlert,'inactive Alert Manager releases its corner without rerendering');
 await draw(page,{count:3,native:{sub_button:{main:[badges[0]]}},panel:{illustration:{},sub_button_styles},extraStates:{'switch.fan':{state:'on',attributes:{}}}});
 const noImage=await geometry();assert.equal(noImage.group.x,noImage.name.right+6);assert.equal(noImage.group.width,24);
});

test('Panel commands color only the active icon and keep inactive icons and every label neutral',{skip:!nativePath},async t=>{
 const page=await setup(t),colors=['#36993B','#B97918','#8C6AAF'];
 for(const mode of ['light','dark'])for(const active of [-1,0,1,2]){
  const styles=Object.fromEntries(colors.map((color,i)=>['command-'+i,{type:'command',color,active:i===active,disabled:i===active}]));
  await draw(page,{width:328,mode,buttons:3,panel:{sub_button_styles:styles}});
  const m=await page.evaluate(()=>{
   const probe=document.createElement('span');card.card.append(probe);
   const color=name=>{probe.style.color='var(--'+name+')';return getComputedStyle(probe).color};
   const primary=color('primary-text-color'),secondary=color('secondary-text-color');probe.remove();
   return {primary,secondary,buttons:[...card.card.querySelectorAll('[data-dp-command]')].map(e=>({icon:getComputedStyle(e.querySelector('.bubble-sub-button-icon')).color,label:getComputedStyle(e.querySelector('.bubble-sub-button-name-container')).color}))};
  });
  const rgb=['rgb(54, 153, 59)','rgb(185, 121, 24)','rgb(140, 106, 175)'];
  for(let i=0;i<3;i++){assert.equal(m.buttons[i].icon,i===active?rgb[i]:m.secondary);assert.equal(m.buttons[i].label,m.primary);}
 }
});
