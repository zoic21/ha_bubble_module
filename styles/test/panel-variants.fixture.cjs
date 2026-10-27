const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
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
  customElements.define('ha-card',class extends HTMLElement{connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>'}});
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
  const {width,mode,plain,kind,primary=true,poolMode='Normal',mowerHome=true,title,robotBadge=false,robotState='docked',robotIcon,robotColor,robotOpacity=1}=scenario;
  document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})}).filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
  document.querySelector('#cards').style.width=width+'px';
  const state=(v,u)=>({state:String(v),attributes:{unit_of_measurement:u}});
  window.hass={states:{'sensor.temperature':state(22.8,'°C'),'sensor.humidity':state(64,'%'),'sensor.salt':state(2.8,'g/L'),'sensor.ph':state(7.2,''),'sensor.redox':state(720,'mV'),'switch.ph':state('on',''),'switch.redox':state('off',''),'device_tracker.mower':state(mowerHome?'home':'not_home',''),'lawn_mower.demo':state(robotState,''),'vacuum.demo':state(robotState,''),'input_select.mode':{state:poolMode,attributes:{options:['Normal','Hivers']}}},
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
  if(robotBadge&&['mower','mode'].includes(kind)){
   const robot=kind==='mower'?config.sub_button.main[0]:{entity:'vacuum.demo',show_icon:true};
   Object.assign(robot,{name:kind==='mower'?'Mova 600':'Robot piscine',css_class:'robot-status',show_state:false,show_name:false,show_background:false,tap_action:{action:'navigate',navigation_path:kind==='mower'?'#mower':'#dolphin'}});
   if(kind==='mode')config.sub_button.main.push(robot);
   options.sub_button_styles['robot-status']={type:'badge',position:'bottom-right',icon:robotIcon||(kind==='mode'?'mdi:robot-vacuum-off':'mdi:robot-mower-outline'),color:robotColor||'#818181',opacity:robotOpacity};
  }
  if(kind==='strip'){
   Object.assign(config,{entity:'sensor.salt',name:'Sel',show_name:true,sub_button:{main:[{entity:'switch.ph',css_class:'ph-control',icon:'mdi:power',show_name:false,show_state:false,tap_action:{action:'toggle'}},{entity:'switch.redox',css_class:'redox-control',icon:'mdi:power',show_name:false,show_state:false,tap_action:{action:'toggle'}}]}});
   config.signature_panel={variant:'strip',metric_icon:'mdi:water-sync',primary_enabled:primary ? '{{ primary }}' : false,information:[{entity:'sensor.ph',name:'pH',icon:'mdi:flask-outline',secondary:'{{ detail }}'},{entity:'sensor.redox',name:'Redox',icon:'mdi:lightning-bolt-outline',secondary:'{{ detail }}'}],sub_button_styles:{'ph-control':{type:'switch',column:2,color:'#368ACB'},'redox-control':{type:'switch',column:3,color:'#368ACB'}}};
  }
  if(title!==undefined)options.title=title;
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

module.exports={setup,draw};
