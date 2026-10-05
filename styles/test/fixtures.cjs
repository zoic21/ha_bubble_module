const {loadModule}=require('../../shared/test/module.cjs');
// Minimal native-shaped fixture, not a Home Assistant runtime or a Bubble Card build.
// The native secondary-opacity rule intentionally reproduces the audited cascade.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const YAML=require('yaml');
const root=path.resolve(__dirname,'../..');
const names=['signature-flow','signature-weather','signature-wind-rose','signature-square','signature-compact','signature-room','signature-header'];
const modules=Object.fromEntries(names.map(k=>[k,loadModule(k)]));
const theme=YAML.parse(fs.readFileSync(path.join(root,'themes/signature.yaml'),'utf8')).Signature;
const cases=[
  ['compact','signature-compact',{compact_mode:'value',secondary:'65 %'}],
  ['compact-standard','signature-compact',{secondary:'65 %'}],
  ['square','signature-square',{secondary:'65 %'}],
  ['square-auto','signature-square',{secondary:'65 %',auto_height:true}],
  ['room','signature-room',{secondary:'65 %'}],
  ['room-no-controls','signature-room',{}],
  ['header','signature-header',{}],
  ['title','signature-header',{}],
  ['media','signature-compact',{}],
  ['cover','signature-compact',{}],
  ['climate','signature-compact',{}],
  ['number','signature-compact',{controls:'number'}],
  ['native-cover','signature-compact',{}],
  ['native-media','signature-compact',{}],
  ['flow','signature-flow',{}],
  ['weather-ranges','signature-weather',{layout:'ranges',show_current:true}],
  ['weather-ribbon','signature-weather',{layout:'ribbon',show_current:true}],
  ['weather-summary','signature-weather',{layout:'summary'}],
  ['wind','signature-wind-rose',{}]
];
// Representative host palettes, independent of the Signature theme.
const nativeModes={
 light:{'primary-text-color':'#212121','secondary-text-color':'#727272','card-background-color':'#fff','secondary-background-color':'#e5e5e5','primary-background-color':'#fafafa','divider-color':'#e0e0e0'},
 dark:{'primary-text-color':'#e1e1e1','secondary-text-color':'#9b9b9b','card-background-color':'#1c1c1c','secondary-background-color':'#202020','primary-background-color':'#111111','divider-color':'#303030'}
};
const common={'ha-card-background':'var(--card-background-color)','blue-color':'#2196f3','row-size':2,'row-height':'56px','row-gap':'8px'};
const base="ha-card{display:block;position:relative;font:14px/1.3 Roboto,sans-serif}.card-content{padding:0}.bubble-container{display:flex;position:relative;width:100%;height:calc(var(--row-size,2)*var(--row-height,56px) + var(--row-gap,8px));box-sizing:border-box;border-radius:var(--bubble-border-radius,16px);background:var(--bubble-main-background-color,var(--ha-card-background,var(--card-background-color,#fff)));border:var(--bubble-border,0);box-shadow:var(--bubble-box-shadow,none)}.bubble-wrapper{position:relative;width:100%;height:100%;display:flex;align-items:center}.bubble-content-container{display:flex;gap:10px;flex:1;min-width:0;padding:10px}.bubble-name-container{min-width:0}.bubble-name{font-size:14px;font-weight:600}.bubble-state{font-size:12px;font-weight:normal;opacity:.7}.bubble-icon-container{display:flex;align-items:center;justify-content:center;width:36px;height:36px;flex-shrink:0;border-radius:var(--bubble-icon-border-radius,50%)}.bubble-sub-button{display:flex;align-items:center;justify-content:center}.bubble-sub-button-container{display:flex}.hidden,[hidden]{display:none!important}";
const nativeControls='.bubble-cover-button{border-radius:var(--bubble-cover-buttons-border-radius,var(--bubble-border-radius,28px))}.bubble-media-button{border-radius:var(--bubble-media-player-buttons-border-radius,var(--bubble-border-radius,28px))}.bubble-media-info-container{display:flex;flex-direction:column;font-size:12px;line-height:14px}.bubble-title{font-weight:600}.bubble-title,.bubble-artist{margin:2px 0}';
const media=".bubble-container{background:var(--bubble-media-player-main-background-color,var(--ha-card-background,var(--card-background-color,#fff)));border-radius:var(--bubble-media-player-border-radius,16px);box-shadow:var(--bubble-media-player-box-shadow,none);border:var(--bubble-media-player-border,0)}";
async function setup(page){
 await page.setContent('<style>body{margin:20px}#cards{display:flex;flex-wrap:wrap;gap:24px;align-items:start}.fixture{flex:none}</style><div id="cards"></div>');
 await page.evaluate(()=>{
  customElements.define('ha-card',class extends HTMLElement{});
  customElements.define('ha-icon',class extends HTMLElement{});
 });
}
async function render(page,scenario={}){
 const mode=scenario.mode||'light';
 const vars={...common,...nativeModes[mode],...scenario.nativePalette,...(scenario.plain?{}:{...theme,...theme.modes[mode]}),...scenario.overrides};delete vars.modes;
 const result=await page.evaluate(async ({cases,modules,vars,scenario,base,button,sub,cover,climate,media,nativeControls})=>{
    window.contexts?.forEach(ctx=>ctx.teardown?.());window.contexts=[];
    const container=document.getElementById('cards');container.innerHTML='';
    document.body.style.cssText=Object.entries(vars).map(([k,v])=>'--'+k+':'+v).join(';');document.body.style.backgroundColor='var(--primary-background-color)';document.body.style.color='var(--primary-text-color)';document.body.style.fontFamily='var(--signature-font-family,Roboto,sans-serif)';
    const now=Date.now();
    const forecasts=Array.from({length:6},(_,i)=>({datetime:new Date(now+i*86400000).toISOString(),condition:i%2?'partlycloudy':'sunny',temperature:22-i,templow:12-i,precipitation_probability:i*10,wind_speed:10+i}));
    const state=(v,u,n)=>({state:String(v),attributes:{unit_of_measurement:u,friendly_name:n,min:0,max:100,step:1}});
    const fixtureErrors=[];
    for(const [id,module,options] of cases){
     const shell=document.createElement('div');shell.className='fixture';shell.style.width=scenario.width+'px';shell.dataset.id=id;container.append(shell);
     const shadow=shell.attachShadow({mode:'open'});shadow.innerHTML='<style>'+base.replace(/card-type/g,id.includes('media')?'media-player':id.includes('cover')?'cover':id==='climate'?'climate':'button')+nativeControls+(id.includes('media')?media:id==='cover'?cover:id==='climate'?climate:button)+sub+'</style>';
     const root=document.createElement('ha-card');root.className='large';root.style.cssText='background:none;border:none;box-shadow:none;border-radius:16px';shadow.append(root);
     if(id==='title'&&scenario.titleSurface)root.style.cssText='background:var(--ha-card-background);border:1px solid red;box-shadow:0 2px 10px black;border-radius:22px';
     const content=document.createElement('div');content.className='card-content';content.style.padding='0';root.append(content);
     content.innerHTML='<div class="bubble-button-card-container bubble-container"><div class="bubble-button-card bubble-wrapper"><div class="bubble-background bubble-button-background"></div><div class="bubble-content-container"><div class="bubble-main-icon-container bubble-icon-container"><ha-icon class="bubble-main-icon bubble-icon"></ha-icon></div><div class="bubble-name-container"><div class="bubble-name">Maison</div><div class="bubble-state">22,5 °C</div></div></div><div class="bubble-sub-button-container"></div><div class="bubble-buttons-container"></div></div></div>';
     const query=s=>root.querySelector(s);if(scenario.nameText)query('.bubble-name').textContent=scenario.nameText;const host=query('.bubble-container');
     const kind=id==='title'?'separator':id.includes('media')?'media-player':id.includes('cover')?'cover':id==='climate'?'climate':'button';
     const entity=module==='signature-weather'?'weather.home':module==='signature-wind-rose'?'sensor.direction':'sensor.demo';
     if(kind==='cover')query('.bubble-buttons-container').innerHTML='<div class="bubble-cover-button"></div>';
     if(kind==='media-player'){query('.bubble-buttons-container').innerHTML='<div class="bubble-media-button"></div>';const info=document.createElement('div');info.className='bubble-media-info-container';info.innerHTML='<div class="bubble-title">Une chanson</div><div class="bubble-artist">Un artiste</div>';query('.bubble-content-container').append(info);}
     const config={card_type:kind,button_type:id==='header'||id.startsWith('room')?'name':'state',entity,show_state:!id.startsWith('room'),show_name:true,card_layout:'large',[modules[module].key]:options};
     config[module.replaceAll('-','_')]=options;
     const ctx={card:root,elements:{mainContainer:host,contentContainer:query('.bubble-content-container'),nameContainer:query('.bubble-name-container'),iconContainer:query('.bubble-icon-container'),state:query('.bubble-state')},config};
     if(id==='room'){
      config.sub_button={main:[{entity:'light.demo',css_class:'room-control-light'},{entity:'sensor.demo',css_class:'room-temperature'}]};
      query('.bubble-sub-button-container').innerHTML='<div class="bubble-sub-button bubble-sub-button-1 room-control-light"><ha-icon class="bubble-sub-button-icon"></ha-icon></div><div class="bubble-sub-button room-temperature"><div class="bubble-sub-button-name-container">22,5 °C</div></div>';
     }
     if(id.startsWith('room'))ctx.elements.state.classList.add('hidden');
     if(id==='header')ctx.elements.state.classList.add('hidden');
     if(module==='signature-flow')config.signature_flow={slots:{1:{primary:'sensor.demo',color:'#ff9800',name:'Solaire',secondary:'65 %'},2:{primary:'sensor.demo',color:'#009688',name:'Réseau'},3:{primary:'sensor.demo',name:'Batterie',secondary:'65 %'},4:{primary:'sensor.demo',name:'Eau'},5:{primary:'sensor.demo',name:'Maison'},6:{primary:'sensor.demo',name:'Voiture'}}};
     let callbacks=[];
     const hass={locale:{language:'fr',number_format:'space_comma',time_format:'24'},language:'fr',config:{time_zone:'Europe/Paris',unit_system:{temperature:'°C'}},states:{'sensor.demo':state(scenario.value ?? 22.5,'°C','Maison'),'sensor.direction':state(90,'°','Vent'),'light.demo':state('off','','Lumière'),'weather.home':{state:'sunny',attributes:{friendly_name:'Maison',supported_features:3,temperature:22.5,temperature_unit:'°C',humidity:65,wind_speed:10,wind_speed_unit:'km/h',precipitation_unit:'mm'}}},connection:{subscribeMessage(cb){callbacks.push(cb);return Promise.resolve(()=>{});}},callWS:async()=>({'sensor.direction':Array.from({length:24},(_,i)=>({s:String([90,90,135,45][i%4]),lu:(now-86400000+i*3600000)/1000}))}),localize:()=>undefined};
     ctx._hass=hass;
     try{
      const css=id.startsWith('native-')?'':new Function('hass','onTeardown','renderTemplate','return `'+modules[module].code+'`;').call(ctx,hass,fn=>ctx.teardown=fn,v=>v);
      const style=document.createElement('style');style.textContent=css;shadow.append(style);
      callbacks.forEach(cb=>cb({forecast:forecasts}));window.contexts.push(ctx);
     }catch(e){fixtureErrors.push({id,error:e.stack});}
    }
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    window.contexts.forEach(ctx=>ctx._signatureFlow?.draw());
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const selectors=['ha-card','.bubble-container','.bubble-name','.bubble-state','.bubble-title','.bubble-artist','.bubble-cover-button','.bubble-media-button','.dp-secondary','.bubble-icon-container','.room-temperature','.dp-room-unit','.sf-label','.sf-value','.sf-unit','.sf-secondary','.sf-slot-3 .sf-secondary','.sf-icon','.sf-slot-4 .sf-value','.sw-name','.sw-condition','.sw-current-temperature','.sw-current-unit','.sw-tab','.sw-tab[aria-pressed="true"]','.sw-tab[aria-pressed="false"]','.sw-tabs','.sw-entry-label','.sw-high','.sw-low','.sw-metric','.sw-detail','.swr-tab','.swr-tab[aria-pressed="true"]','.swr-tab[aria-pressed="false"]','.swr-tabs','.swr-label','.swr-value','.swr-cardinal','.swr-tooltip'];
    const props=['fontFamily','fontSize','fontWeight','fontVariantNumeric','lineHeight','letterSpacing','color','backgroundColor','boxShadow','borderRadius','borderTopWidth','borderTopColor','paddingLeft','paddingRight','opacity','display','minHeight','gridTemplateRows','outlineWidth','outlineStyle','strokeWidth'];
    return {errors:fixtureErrors,cards:[...container.children].map(shell=>{
     const root=shell.shadowRoot;let styles={};for(const selector of selectors){const el=root.querySelector(selector);if(!el)continue;const s=getComputedStyle(el);styles[selector]={text:el.textContent,...Object.fromEntries(props.map(p=>[p,s[p]])),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height};}
     let dividers=[];for(const selector of ['.bubble-container','.sw-toolbar','.sw-detail','.sw-entry','.swr-footer'])for(const el of root.querySelectorAll(selector))for(const pseudo of ['::before','::after']){
      const s=getComputedStyle(el,pseudo);if(s.content==='none'||s.content==='normal'||s.display==='none'||s.height!=='1px'||!el.getBoundingClientRect().width)continue;
      const card=root.querySelector('.bubble-container').getBoundingClientRect();const rect=el.getBoundingClientRect();
      const own=getComputedStyle(el);
      dividers.push({selector,pseudo,left:rect.left-card.left+parseFloat(s.left)+parseFloat(own.borderLeftWidth),right:card.right-rect.right+parseFloat(s.right)+parseFloat(own.borderRightWidth),width:s.width,color:s.backgroundColor,height:s.height});
     }
     const overflow=[...root.querySelectorAll('.sw-entry,.sf-content,.dp-secondary,.swr-footer,.swr-tabs')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>({cls:el.className,scroll:el.scrollWidth,client:el.clientWidth}));
     return {id:shell.dataset.id,styles,dividers,overflow,flowClasses:root.querySelector('.sf-canvas')?.className,svgWidth:root.querySelector('.swr-svg')?.getBoundingClientRect().width};
    })};
   },{cases,modules,vars,scenario:{width:328,...scenario},base,button:'',sub:'',cover:'',climate:'',media,nativeControls});
 assert.deepEqual(result.errors,[],'Module errors in browser fixtures');
 return result;
}
module.exports={setup,render,theme,nativeModes};
