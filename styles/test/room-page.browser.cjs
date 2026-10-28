const assert=require('node:assert/strict'),fs=require('node:fs');
const {test}=require('node:test');
const {setup,draw}=require('./panel-variants.fixture.cjs');
const {fixture}=require('./browser.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const nativePath=process.env.BUBBLE_VARIANTS_NATIVE_SCRIPT_PATH;
const scripts=Object.fromEntries(['signature-compact','signature-header'].map(name=>[name,loadModule(name).code]));

// Native Bubble 3.4.1, with a source-derived HA Sections shell:
// frontend 20260930.5, hui-grid-section.ts and hui-sections-view.ts.
// Visibility and HA backend are simulated; this is not a running HA frontend.
async function room(page,width,mode){
 await draw(page,{width,mode,kind:'double'});
 await page.evaluate(({width,scripts})=>{
  const gap=width<=600?8:32;
  const columns=Math.max(1,Math.min(2,Math.floor((width-gap)/(320+gap))));
  const host=document.querySelector('#cards'),heading=window.card;host.replaceChildren();host.style.width='auto';
  document.body.style.cssText='margin:0;background:var(--primary-background-color);font-family:var(--signature-font-family,Arial,sans-serif)';
  host.innerHTML='<div class="page-wrapper"><div class="page-content"></div></div>';
  const style=document.createElement('style');style.textContent=
   '.page-wrapper{padding:0 '+gap+'px;box-sizing:content-box;margin:auto;max-width:'+(columns*500+(columns-1)*gap)+'px}'+
   '.page-content{display:grid;grid-template-columns:repeat('+columns+',minmax(0,1fr));align-items:start;gap:24px '+gap+'px;padding:24px 0}'+
   '.page-section{grid-column:span var(--column-span);min-width:0}';
  host.prepend(style);
  const content=host.querySelector('.page-content');
  const section=(name,span)=>{
   const shell=document.createElement('section');shell.className='page-section';shell.dataset.section=name;
   shell.style.setProperty('--column-span',Math.min(span,columns));content.append(shell);
   const grid=document.createElement('hui-grid-section');grid.style.display='block';shell.append(grid);
   const shadow=grid.attachShadow({mode:'open'});
   shadow.innerHTML='<style>.container{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px}.card{min-width:0;grid-column:span var(--columns)}.full-width{grid-column:1/-1}.hidden{display:none}</style><div class="container"></div>';
   return shadow.querySelector('.container');
  };
  const append=(parent,card,columns='full',show=true)=>{
   const frame=document.createElement('div');frame.className='card'+(columns==='full'?' full-width':'')+(show?'':' hidden');
   frame.style.setProperty('--columns',columns);frame.append(card);parent.append(frame);card.hass=hass;
  };
  append(section('summary',2),heading);
  const state=(entity_id,s,attributes)=>({entity_id,state:s,attributes});
  Object.assign(hass.states,{
   'light.main':state('light.main','off',{friendly_name:'Lumière'}),
   'light.ambient':state('light.ambient','on',{friendly_name:'Ambiance'}),
   'cover.shutter':state('cover.shutter','open',{friendly_name:'Volet',current_position:100,supported_features:15,device_class:'shutter'}),
   'climate.heating':state('climate.heating','heat',{friendly_name:'Chauffage',temperature:20.5,current_temperature:22.9,hvac_action:'idle',hvac_modes:['off','heat'],min_temp:7,max_temp:30,target_temp_step:.5,supported_features:385}),
   'binary_sensor.window':state('binary_sensor.window','off',{friendly_name:'Fenêtre',device_class:'window'}),
   'binary_sensor.smoke':state('binary_sensor.smoke','off',{friendly_name:'Fumée',device_class:'smoke'})
  });
  const make=(kind,entity,name,icon)=>{
   const c={type:'custom:bubble-card',card_type:kind,entity,name,icon,card_layout:'large',rows:1,show_name:true,show_state:false,styles:scripts[kind==='separator'?'signature-header':'signature-compact'],modules:[],scrolling_effect:false};
   if(kind==='button'){
    c.button_type='state';c.tap_action={action:'more-info'};
    if(entity.startsWith('light.')){
     c.sub_button={main:[{entity,css_class:'power',icon:'mdi:power',show_background:false,tap_action:{action:'toggle'}}]};
     c.signature_compact={sub_button_styles:{power:{type:'switch'}}};
    }
   }
   const card=document.createElement('bubble-card');card.setConfig(c);return card;
  };
  const left=section('left',1),right=section('right',1);
  append(left,make('separator',undefined,'Lumières','mdi:floor-lamp'));
  for(const [entity,name] of [['light.main','Lumière'],['light.ambient','Ambiance']]){
   append(left,make('button',entity,name,'mdi:lightbulb'),6,width>=1280);
   append(left,make('button',entity,name,'mdi:lightbulb'),'full',width<1280);
  }
  append(left,make('separator',undefined,'Sécurité','mdi:shield-half-full'));
  append(left,make('button','binary_sensor.window','Fenêtre','mdi:window-closed'),6);
  append(left,make('button','binary_sensor.smoke','Fumée','mdi:smoke-detector'),6);
  append(right,make('separator',undefined,'Climat','mdi:home-thermometer'));
  append(right,make('cover','cover.shutter','Volet','mdi:window-shutter'));
  append(right,make('climate','climate.heating','Chauffage','mdi:radiator'));
  append(right,make('climate','climate.heating','Climatisation','mdi:air-conditioner'));
  window.pageCards=[...host.querySelectorAll('hui-grid-section')].flatMap(g=>[...g.shadowRoot.querySelectorAll('bubble-card')]);
 },{width,scripts});
 await page.waitForFunction(()=>pageCards.every(c=>!c.initialLoad));
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}

test('native columns place Security directly after Lights and preserve full-width headings and mobile order',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [328,382,760,1100,1279,1280,1568])for(const mode of ['light','dark']){
  await page.setViewportSize({width,height:1100});await room(page,width,mode);
  const m=await page.evaluate(()=>{
   const box=e=>{const b=e.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
   const cards=n=>[...document.querySelector('[data-section="'+n+'"] hui-grid-section').shadowRoot.querySelectorAll('.card:not(.hidden)>bubble-card')].map(c=>({name:c.config.name,box:box(c.card.querySelector('.bubble-container')),needed:c.card.querySelector('.bubble-name')?.scrollWidth,available:c.card.querySelector('.bubble-name')?.clientWidth}));
   return{page:box(document.querySelector('.page-content')),summary:cards('summary')[0],left:cards('left'),right:cards('right'),styles:[...document.querySelectorAll('hui-grid-section')].reduce((n,g)=>n+g.shadowRoot.querySelectorAll('style[data-signature-section-columns],style[data-signature-section-min-width]').length,0)};
  });
  const hint=JSON.stringify({width,mode,m});assert.equal(m.styles,0,hint);
  assert.ok(Math.abs(m.summary.box.width-m.page.width)<1,hint);assert.ok(m.page.width<=1032.1,hint);
  const safety=m.left.find(c=>c.name==='Sécurité');
  const lastLight=m.left.filter(c=>['Lumière','Ambiance'].includes(c.name)).at(-1);
  assert.ok(Math.abs(safety.box.top-lastLight.box.bottom-8)<1,hint);
  for(const c of m.left.filter(c=>['Lumière','Ambiance'].includes(c.name))){
   assert.ok(c.needed<=c.available+1,hint);
   const expected=width>=1280?(m.left[0].box.width-8)/2:m.left[0].box.width;
   assert.ok(Math.abs(c.box.width-expected)<1,hint);
  }
  if(width>=760)assert.ok(safety.box.top<m.right.at(-1).box.bottom,hint);
  else assert.ok(m.right[0].box.top>=m.left.at(-1).box.bottom+23.9,hint);
  if(process.env.PANEL_CAPTURE_DIR){
   fs.mkdirSync(process.env.PANEL_CAPTURE_DIR,{recursive:true});
   await page.screenshot({path:process.env.PANEL_CAPTURE_DIR+'/native-room-'+width+'-'+mode+'.png',fullPage:true});
  }
 }
});

test('Header confines its styles to its card and ignores retired parent-layout options',async t=>{
 const page=await fixture(t);
 for(const kind of ['separator','button']){
  const result=await page.evaluate(({code,kind})=>{
   window.contexts?.forEach(c=>c.teardown?.());window.contexts=[];
   document.body.innerHTML='<hui-sections-view></hui-sections-view>';
   const view=document.querySelector('hui-sections-view'),vs=view.attachShadow({mode:'open'});
   vs.innerHTML='<style>.content{display:grid;grid-template-columns:1fr 1fr;gap:24px 32px}</style><div class="content"><hui-grid-section></hui-grid-section></div>';
   const grid=vs.querySelector('hui-grid-section'),gs=grid.attachShadow({mode:'open'});
   gs.innerHTML='<style>.container{display:block}</style><div class="container"><div id="card"></div></div>';
   const host=gs.querySelector('#card'),shadow=host.attachShadow({mode:'open'});
   shadow.innerHTML='<ha-card><div class="bubble-container"><div class="bubble-name">Titre</div></div></ha-card>';
   const root=shadow.querySelector('ha-card');
   const ctx={card:root,config:{card_type:kind,button_type:'name',signature_header:{masonry_sections:true,minimum_card_width:220,align_section_columns:true}},elements:{mainContainer:root.querySelector('.bubble-container')}};
   const before=[vs.innerHTML,gs.innerHTML,view.getAttribute('style'),grid.getAttribute('style')];
   const ro=window.ResizeObserver;let observers=0;window.ResizeObserver=class{constructor(){observers++}};
   let css;const tick=String.fromCharCode(96);
   try{css=new Function('hass','onTeardown','renderTemplate','return '+tick+code+tick+';').call(ctx,{states:{}},fn=>ctx.teardown=fn,v=>v);}
   finally{window.ResizeObserver=ro;}
   window.contexts=[ctx];
   const after=[vs.innerHTML,gs.innerHTML,view.getAttribute('style'),grid.getAttribute('style')];
   return{before,after,observers,css,version:ctx._signatureHeaderRuntime.version};
  },{code:scripts['signature-header'],kind});
  assert.deepEqual(result.after,result.before);
  assert.equal(result.observers,0);assert.equal(result.version,'1.4.0');assert.ok(result.css.length>0);
 }
 assert.doesNotMatch(scripts['signature-header'],/hui-grid-section|hui-sections-view|signature-masonry-rows|signatureSectionMinWidth/);
});
