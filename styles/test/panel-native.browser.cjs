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
     gap:button.getBoundingClientRect().left-card.card.querySelector('.bubble-name').getBoundingClientRect().right};
   },state);
   const after=await snapshot(page),hint=JSON.stringify({width,mode,plain,state,m});
   assert.equal(after.frame.height,118,hint);assert.deepEqual(after.art,before.art,hint);
   assert.deepEqual(after.labels.map(x=>[x.top,x.bottom,x.font]),before.labels.map(x=>[x.top,x.bottom,x.font]),hint);
   assert.equal(m.height,20,hint);assert.equal(m.size,'14px',hint);assert.ok(m.gap>=6 && m.gap<=9,hint);
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
