const assert=require('node:assert/strict'),fs=require('node:fs');
const {test}=require('node:test');
const {setup,draw}=require('./panel-variants.fixture.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const nativePath=process.env.BUBBLE_VARIANTS_NATIVE_SCRIPT_PATH;
const scripts=Object.fromEntries(['signature-compact','signature-header'].map(name=>[name,loadModule(name).code]));
// Source-derived HA Sections geometry, not a running Home Assistant frontend.
// home-assistant/frontend 76ee92807a717b0293ef8636db84ead3da249735:
// views/hui-sections-view.ts and sections/hui-grid-section.ts. Native Bubble
// components below are real; backend, HA primitives and page shell are fixtures.
async function room(page,width,mode){
 await page.evaluate(()=>document.querySelector('#cards').replaceChildren());
 await draw(page,{width,mode,kind:'double'});
 await page.evaluate(({width,scripts})=>{
  const columns=Math.max(1,Math.min(2,Math.floor((width-(width<=600?16:64)+(width<=600?8:32))/(320+(width<=600?8:32)))));
  const pageHost=document.querySelector('#cards');pageHost.style.width=width+'px';
  document.body.style.cssText='margin:0;background:var(--primary-background-color);font-family:var(--signature-font-family,Arial,sans-serif)';
  const heading=window.card;pageHost.replaceChildren();
  if(!customElements.get('hui-grid-section'))customElements.define('hui-grid-section',class extends HTMLElement{});
  const style=document.createElement('style');style.textContent=`
   #cards{--column-count:${columns};--column-gap:${width<=600?8:32}px;--column-max-width:500px}
   .page-wrapper{padding:0 var(--column-gap);box-sizing:content-box;margin:0 auto;max-width:calc(var(--column-count)*var(--column-max-width) + (var(--column-count) - 1)*var(--column-gap))}
   .page-content{display:grid;grid-template-columns:repeat(var(--column-count),minmax(0,1fr));align-items:start;gap:24px var(--column-gap);padding:24px 0}
   .page-section{grid-column:span var(--column-span)}
   .section-grid{display:grid;grid-template-columns:repeat(calc(12*var(--column-span)),minmax(0,1fr));grid-auto-rows:auto;gap:8px}
   .page-card{min-width:0;grid-column:span min(var(--column-size,12),calc(12*var(--column-span)))}
   .page-card.full{grid-column:1 / -1}.page-card.fit{height:56px}
  `;pageHost.append(style);
  const wrapper=document.createElement('div');wrapper.className='page-wrapper';pageHost.append(wrapper);
  const content=document.createElement('div');content.className='page-content';wrapper.append(content);
  const section=(name,span)=>{const el=document.createElement('section');el.dataset.section=name;el.className='page-section';el.style.setProperty('--column-span',Math.min(span,columns));const grid=document.createElement('hui-grid-section');el.append(grid);content.append(el);const shadow=grid.attachShadow({mode:'open'});shadow.innerHTML='<style>:host{display:block;--column-gap:var(--ha-section-grid-column-gap,8px)}.section-grid{display:grid;grid-template-columns:repeat(calc(12*var(--column-span)),minmax(0,1fr));grid-auto-rows:auto;gap:8px var(--column-gap)}.page-card{min-width:0;grid-column:span min(var(--column-size,12),calc(12*var(--column-span)))}.page-card.full{grid-column:1/-1}.page-card.fit{height:56px}</style><div class="section-grid container"></div>';return shadow.querySelector('.section-grid');};
  const append=(parent,card,columns='full',fit=false)=>{const frame=document.createElement('div');frame.className='page-card card'+(columns==='full'?' full full-width':'')+(fit?' fit':'');if(columns!=='full')frame.style.setProperty('--column-size',columns);frame.append(card);parent.append(frame);card.hass=hass;};
  append(section('summary',2),heading);
  const st=(entity_id,state,attributes)=>({entity_id,state,attributes});
  Object.assign(hass.states,{
   'light.main':st('light.main','off',{friendly_name:'Lumière',supported_color_modes:['brightness'],color_mode:'brightness',brightness:0}),
   'light.ambient':st('light.ambient','on',{friendly_name:'Ambiance',supported_color_modes:['brightness'],color_mode:'brightness',brightness:140}),
   'cover.shutter':st('cover.shutter','open',{friendly_name:'Volet',current_position:100,supported_features:15,device_class:'shutter'}),
   'climate.heating':st('climate.heating','heat',{friendly_name:'Chauffage',temperature:20.5,current_temperature:22.9,hvac_action:'idle',hvac_modes:['off','heat'],min_temp:7,max_temp:30,target_temp_step:.5,supported_features:385}),
   'binary_sensor.window':st('binary_sensor.window','off',{friendly_name:'Fenêtre',device_class:'window'}),
   'binary_sensor.smoke':st('binary_sensor.smoke','off',{friendly_name:'Fumée',device_class:'smoke'})
  });
  const make=(kind,entity,name,icon)=>{
   const separator=kind==='separator',module=separator?'signature-header':'signature-compact';
   const c={type:'custom:bubble-card',card_type:kind,entity,name,icon,card_layout:'large',rows:1,show_name:true,show_state:false,styles:scripts[module],modules:[],tap_action:{action:'more-info'},button_action:{tap_action:{action:'none'}}};
   if(kind==='button')c.button_type=entity.startsWith('light.')?'switch':'state';
   if(separator&&name==='Sécurité')c.signature_header={align_section_columns:true};
   const el=document.createElement('bubble-card');el.setConfig(c);return el;
  };
  for(const [name,kind,entity,label,icon]of [['lights','button','light.main','Lumière','mdi:lightbulb'],['climate','cover','cover.shutter','Volet','mdi:window-shutter']]){
   const inner=section(name,1);append(inner,make('separator',undefined,name==='lights'?'Lumières':'Climat',name==='lights'?'mdi:floor-lamp':'mdi:home-thermometer'));
   append(inner,make(kind,entity,label,icon),'full',true);
   append(inner,make(name==='lights'?'button':'climate',name==='lights'?'light.ambient':'climate.heating',name==='lights'?'Ambiance':'Chauffage',name==='lights'?'mdi:floor-lamp':'mdi:radiator'),'full',true);
  }
  const safety=section('security',2);append(safety,make('separator',undefined,'Sécurité','mdi:shield-half-full'));
  append(safety,make('button','binary_sensor.window','Fenêtre','mdi:window-closed'),12,true);
  append(safety,make('button','binary_sensor.smoke','Fumée','mdi:smoke-detector'),12,true);
  window.pageCards=[...pageHost.querySelectorAll('hui-grid-section')].flatMap(g=>[...g.shadowRoot.querySelectorAll('bubble-card')]);
 },{width,scripts});
 await page.waitForFunction(()=>pageCards.every(c=>!c.initialLoad));
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}
test('the room page keeps one shared width, aligned control rows and security below both columns',{skip:!nativePath},async t=>{
 const page=await setup(t);let desktop;
 for(const width of [382,760,1100,1568,2000])for(const mode of ['light','dark']){
  await page.setViewportSize({width,height:1100});await room(page,width,mode);
  const m=await page.evaluate(()=>{
   const box=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
   const section=n=>document.querySelector(`[data-section="${n}"]`);
   const cards=n=>[...section(n).querySelector('hui-grid-section').shadowRoot.querySelectorAll('bubble-card')].map(c=>box(c.card.querySelector('.bubble-container')));
   return{page:box(document.querySelector('.page-content')),summary:cards('summary')[0],lights:cards('lights'),climate:cards('climate'),security:cards('security')};
  });
  const hint=JSON.stringify({width,mode,m});
  assert.ok(Math.abs(m.summary.left-m.page.left)<=1&&Math.abs(m.summary.right-m.page.right)<=1,hint);
  assert.ok(m.page.width<=1032,hint);
  if(width>=1100)assert.ok(m.summary.height>=160&&m.summary.height<=164,'summary must retain the reduced height: '+hint);
  for(const group of [m.lights,m.climate,m.security])for(const c of group)assert.ok(c.left>=m.page.left-1&&c.right<=m.page.right+1,hint);
  if(width>=760){
   for(let i=0;i<3;i++)assert.ok(Math.abs(m.lights[i].top-m.climate[i].top)<=1,'control rows must align: '+hint);
   assert.ok(m.security[0].top>=Math.max(m.lights[2].bottom,m.climate[2].bottom),'security follows both columns: '+hint);
   assert.ok(Math.abs(m.security[1].left-m.lights[1].left)<=1&&Math.abs(m.security[1].right-m.lights[1].right)<=1,hint);
   assert.ok(Math.abs(m.security[2].left-m.climate[1].left)<=1&&Math.abs(m.security[2].right-m.climate[1].right)<=1,hint);
   if(desktop&&width>=1100)assert.equal(m.page.width,desktop);
   if(width>=1100)desktop=m.page.width;
  }else{
   assert.ok(m.climate[0].top>=m.lights[2].bottom,hint);assert.ok(m.security[2].top>=m.security[1].bottom,hint);
  }
  if(process.env.PANEL_CAPTURE_DIR){fs.mkdirSync(process.env.PANEL_CAPTURE_DIR,{recursive:true});await page.screenshot({path:process.env.PANEL_CAPTURE_DIR+'/room-page-'+width+'-'+mode+'.png'});}
 }
});
test('section alignment shares one style, follows live gaps and releases it after the last title leaves',{skip:!nativePath},async t=>{
 const page=await setup(t);await page.setViewportSize({width:1568,height:1100});await room(page,1568,'light');
 await page.evaluate(({scripts})=>{
  window.sectionGrid=document.querySelector('[data-section="security"] hui-grid-section');
  window.firstTitle=[...sectionGrid.shadowRoot.querySelectorAll('bubble-card')].find(c=>c.config.card_type==='separator');
  const extra=document.createElement('bubble-card');extra.setConfig({...firstTitle.config,name:'Second title',styles:scripts['signature-header'],signature_header:{align_section_columns:true}});
  sectionGrid.shadowRoot.querySelector('.container').append(extra);window.extraTitle=extra;extra.hass=hass;
 },{scripts});
 await page.waitForFunction(()=>extraTitle._signatureHeaderRuntime&&!extraTitle.initialLoad);
 const count=()=>page.evaluate(()=>sectionGrid.shadowRoot.querySelectorAll('style[data-signature-section-columns]').length);
 assert.equal(await count(),1);
 await page.evaluate(()=>{firstTitle.setConfig({...firstTitle.config,signature_header:{}});firstTitle.hass=hass;});
 await page.waitForFunction(()=>!firstTitle._signatureHeaderRuntime?.sectionColumns);
 assert.equal(await count(),1,'remaining title owns the shared alignment style');
 await page.evaluate(()=>document.documentElement.style.setProperty('--ha-view-sections-column-gap','40px'));
 await page.waitForFunction(()=>getComputedStyle(sectionGrid).getPropertyValue('--signature-section-view-gap').trim()==='40px');
 await page.evaluate(()=>extraTitle.remove());
 await page.waitForFunction(()=>!sectionGrid.shadowRoot.querySelector('style[data-signature-section-columns]'));
 assert.equal(await count(),0);
});
