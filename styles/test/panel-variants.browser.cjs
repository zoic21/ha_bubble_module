const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {theme,nativeModes}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-panel').code;
const nativePath=process.env.BUBBLE_VARIANTS_NATIVE_SCRIPT_PATH;
async function setup(t){
 const bytes=fs.readFileSync(nativePath);
 assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'5fe8799e8070e3169e1b2889c6d5d268632f9082');
 const page=await fixture(t,{prepare:null});
 page.on('console',message=>{if(message.type()==='error')console.error(message.text());});
 await page.route('**/*',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.setContent('<style>body{margin:16px}#cards{width:400px}</style><home-assistant></home-assistant><div id="cards"></div>');
 await page.evaluate(()=>{
  customElements.define('ha-card',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>'}});
  customElements.define('ha-icon',class extends HTMLElement{get icon(){return this.getAttribute('icon')}set icon(v){this.setAttribute('icon',v)}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}</style>'}});
  customElements.define('ha-ripple',class extends HTMLElement{});
  customElements.define('ha-select',class extends HTMLElement{constructor(){super();this.updateComplete=Promise.resolve();this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block}</style>';}});
  document.querySelector('home-assistant').attachShadow({mode:'open'});
 });
 await page.addScriptTag({path:nativePath});
 return page;
}
async function draw(page,scenario){
 await page.evaluate(({scenario,code,theme,nativeModes})=>{
  window.card?.remove();
  const {width,mode,plain,kind,primary=true}=scenario;
  document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})}).filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
  document.querySelector('#cards').style.width=width+'px';
  const state=(v,u)=>({state:String(v),attributes:{unit_of_measurement:u}});
  window.hass={states:{'sensor.temperature':state(22.8,'°C'),'sensor.humidity':state(64,'%'),'sensor.salt':state(2.8,'g/L'),'sensor.ph':state(7.2,''),'sensor.redox':state(720,'mV'),'switch.ph':state('on',''),'switch.redox':state('off',''),'device_tracker.mower':state('home',''),'lawn_mower.demo':state('docked',''),'input_select.mode':{state:'Normal',attributes:{options:['Normal','Hivers']}}},
   locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:mode==='dark'},config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris'},hassUrl:p=>new URL(p,'https://ha.example.test').href,
   localize:()=>undefined,formatEntityState:s=>s.state,formatEntityAttributeValue:(s,k,v)=>v,
   connection:{subscribeMessage:async(cb,msg)=>{if(msg.type==='render_template'){window.templateMessages ||= [];templateMessages.push(msg.template);cb({result:msg.template.includes('primary')?String(primary):'0 %'});}return()=>{}},subscribeEvents:async()=>()=>{}},
   callWS:async msg=>msg.type==='frontend/get_icons'?{resources:{sensor:{},switch:{},input_select:{},lawn_mower:{}}}:{},callService:async()=>{}};
  Object.entries(hass.states).forEach(([entity_id,value])=>value.entity_id=entity_id);document.querySelector('home-assistant').hass=hass;
  const badge={css_class:'settings',name:'Scénarios',icon:'mdi:cog',show_name:false,show_state:false,show_icon:true,show_background:false,tap_action:{action:'navigate',navigation_path:'#scenarios'}};
  const options={variant:'heading',title:'Chambre principale',metric_icon:'mdi:thermometer',illustration:{image:'/local/atlas.png',columns:4,rows:5,index:0},information:[{entity:'sensor.humidity',icon:'mdi:water-percent'}],sub_button_styles:{settings:{type:'badge',color:'#777777'}}};
  const config={type:'custom:bubble-card',card_type:'button',button_type:'state',entity:'sensor.temperature',name:'Chambre principale',show_name:false,show_icon:false,show_state:true,state_content:'state',card_layout:'large',rows:2,scrolling_effect:false,modules:[],styles:code,signature_panel:options,sub_button:{main:[badge]}};
  if(kind==='none'){delete config.entity;config.button_type='name';config.show_state=false;options.title='Couloir';options.information=[];}
  if(kind==='single')options.information=[];
  if(kind==='mode'){options.title='Piscine';options.information=[];config.sub_button.main.unshift({entity:'input_select.mode',sub_button_type:'select',icon:'mdi:pool',show_state:true,show_name:false,show_icon:true});}
  if(kind==='mower')config.sub_button.main.unshift({entity:'lawn_mower.demo',icon:'mdi:robot-mower',show_state:true,show_name:false,visibility:[{condition:'state',entity:'device_tracker.mower',state:'home'}]});
  if(kind==='strip'){
   Object.assign(config,{entity:'sensor.salt',name:'Sel',show_name:true,sub_button:{main:[{entity:'switch.ph',css_class:'ph-control',icon:'mdi:power',show_name:false,show_state:false,tap_action:{action:'toggle'}},{entity:'switch.redox',css_class:'redox-control',icon:'mdi:power',show_name:false,show_state:false,tap_action:{action:'toggle'}}]}});
   config.signature_panel={variant:'strip',metric_icon:'mdi:water-sync',primary_enabled:primary ? '{{ primary }}' : false,information:[{entity:'sensor.ph',name:'pH',icon:'mdi:flask-outline',secondary:'{{ detail }}'},{entity:'sensor.redox',name:'Redox',icon:'mdi:lightning-bolt-outline',secondary:'{{ detail }}'}],sub_button_styles:{'ph-control':{type:'switch',column:2,color:'#368ACB'},'redox-control':{type:'switch',column:3,color:'#368ACB'}}};
  }
  window.card=document.createElement('bubble-card');card.setConfig(config);document.querySelector('#cards').append(card);card.hass=hass;
  window.calls=[];card.addEventListener('hass-action',e=>calls.push(e.detail));
 },{scenario,code,theme,nativeModes});
 try { await page.waitForFunction(()=>card?._signaturePanelRuntime&&!card.initialLoad,{},{timeout:5000}); }
 catch(error){throw new Error(JSON.stringify({scenario,debug:await page.evaluate(()=>({initialLoad:card?.initialLoad,keys:Object.keys(card||{}),content:card?.card?.innerHTML?.slice(-1400)}))})+'\n'+error.message);}
 if(scenario.kind==='strip'){
  try{await page.waitForFunction(expected=>card.card.getAttribute('data-dp-panel-count')===expected,scenario.primary===false?'2':'3',{timeout:5000});}
  catch(error){throw new Error(JSON.stringify({scenario,debug:await page.evaluate(()=>({messages:window.templateMessages,config:card.config.signature_panel,count:card.card.getAttribute('data-dp-panel-count')}))})+'\n'+error.message);}
 }
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}
test('illustrated headings and measurement strips fit real Bubble at phone and desktop widths',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,358,382,600,1000])for(const mode of ['light','dark'])for(const plain of [false,true])for(const kind of ['none','single','double','mode','mower','strip']){
  await draw(page,{width,mode,plain,kind});
  const m=await page.evaluate(()=>{
   const root=card.card,host=root.querySelector('.bubble-container'),frame=host.getBoundingClientRect();
   const visible=el=>{const r=el.getBoundingClientRect();return getComputedStyle(el).display!=='none'&&r.width>0&&r.height>0};
   const fields=[...root.querySelectorAll('.bubble-state,.dp-panel-state,.dp-panel-title,.bubble-name,.dp-panel-name,.dp-secondary,.dp-panel-secondary,.bubble-sub-button')].filter(visible);
   const artwork=getComputedStyle(host,'::after');
   return{artwork:{width:parseFloat(artwork.width),right:parseFloat(artwork.right)},height:frame.height,count:root.getAttribute('data-dp-panel-count'),fields:fields.map(el=>{const r=el.getBoundingClientRect();return{text:el.textContent,cls:el.className,left:r.left-frame.left,right:r.right-frame.left,top:r.top-frame.top,bottom:r.bottom-frame.top,overflow:el.scrollWidth-el.clientWidth}})};
  });
  const hint=JSON.stringify({width,mode,kind,m});
  if(process.env.PANEL_CAPTURE_DIR&&[382,1000].includes(width)){
   fs.mkdirSync(process.env.PANEL_CAPTURE_DIR,{recursive:true});
   await page.locator('bubble-card').screenshot({path:process.env.PANEL_CAPTURE_DIR+'/'+kind+'-'+width+'-'+mode+'.png'});
  }
  assert.ok(m.height>=80,hint);
  for(const f of m.fields){assert.ok(f.left>=-1&&f.right<=width+1&&f.top>=-1&&f.bottom<=m.height+1,hint);if(!f.cls.includes('bubble-sub-button'))assert.ok(f.overflow<=1,hint);}
  for(let i=0;i<m.fields.length;i++)for(let j=i+1;j<m.fields.length;j++){
   const a=m.fields[i],b=m.fields[j];
   assert.ok(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'overlapping native fields: '+hint);
  }
  if(kind==='mode'&&width>=600){
   const value=m.fields.find(f=>f.cls.includes('bubble-state')),control=m.fields.find(f=>f.cls.includes('is-select'));
   assert.ok(Math.abs((value.top+value.bottom-control.top-control.bottom)/2)<1,'mode must align with temperature: '+hint);
   assert.ok(control.left-value.right>=12&&control.left-value.right<=56,'mode must stay beside temperature: '+hint);
  }
  if(kind!=='strip'){
   for(const field of m.fields.filter(f=>!f.cls.includes('settings')))
    assert.ok(field.right<=width-m.artwork.right-m.artwork.width+2,'reserve artwork space: '+hint);
   assert.ok(m.artwork.width<=m.height+1,'artwork must not be clipped vertically: '+hint);
   if(width===1000&&kind!=='none')assert.ok(m.artwork.width>=250,'desktop artwork must fill the header: '+hint);
  }
  if(kind==='none'){assert.equal(m.count,'0');assert.ok(!m.fields.some(f=>f.cls.includes('state')),hint);assert.ok(m.height<120,hint);}
  if(kind==='strip')assert.equal(m.count,'3');
 }
});
test('native treatment toggles, value details, settings and primary visibility keep their targets',{skip:!nativePath},async t=>{
 const page=await setup(t);
 await draw(page,{width:382,mode:'dark',kind:'strip'});
 await page.locator('bubble-card').locator('.ph-control').click();
 await page.waitForFunction(()=>calls.length>0);
 assert.equal((await page.evaluate(()=>calls.at(-1))).config.tap_action.action,'toggle');
 await draw(page,{width:382,mode:'light',kind:'strip',primary:false});
 assert.equal(await page.evaluate(()=>card.card.getAttribute('data-dp-panel-count')),'2');
 const primary=await page.evaluate(()=>getComputedStyle(card.card.querySelector('.bubble-state')).display);assert.equal(primary,'none');
 await draw(page,{width:382,mode:'light',kind:'double'});
 await page.locator('bubble-card').locator('.settings').click();await page.waitForFunction(()=>calls.length>0);
 assert.equal((await page.evaluate(()=>calls.at(-1))).config.tap_action.navigation_path,'#scenarios');
 await page.evaluate(()=>window.calls=[]);await page.locator('bubble-card').locator('.dp-panel-state').click();await page.waitForFunction(()=>calls.length>0);
 assert.equal((await page.evaluate(()=>calls.at(-1))).config.entity,'sensor.humidity');
});
