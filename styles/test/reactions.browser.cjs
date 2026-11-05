const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const reactions=loadModule('signature-reactions');
const nativePath=process.env.BUBBLE_PIN_NATIVE_SCRIPT_PATH;
const native={skip:!nativePath};
async function setup(t,user='tablet',rules) {
  const bytes=fs.readFileSync(nativePath);
  assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'26f2c84116f20fa21f4cf3812a18f7aa1498246c');
  const page=await fixture(t,{prepare:null});page.setDefaultTimeout(7000);
  t.signal.addEventListener('abort',()=>{page.context().close().catch(()=>{});},{once:true});
  await page.route('**/*',route=>route.fulfill({contentType:'application/json',body:route.request().url().includes('bubble-modules.yaml')?JSON.stringify({signature_reactions:reactions}):'{}'}));
  await page.goto('https://ha.example.test/lovelace/home');
  await page.setContent('<home-assistant></home-assistant><div id="cards"></div>');
  await page.evaluate(()=>{
    customElements.define('ha-card',class extends HTMLElement {connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>';}});
    customElements.define('ha-icon',class extends HTMLElement {
      get icon(){return this.getAttribute('icon');}set icon(value){this.setAttribute('icon',value);}
      connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'});}
    });
    customElements.define('ha-ripple',class extends HTMLElement {});
    customElements.define('ha-select',class extends HTMLElement {get updateComplete(){return Promise.resolve();}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<slot></slot>';}});
    document.querySelector('home-assistant').attachShadow({mode:'open'});
  });
  await page.addScriptTag({path:nativePath});
  await page.evaluate(({user,rules})=>{
    window.requests=[];window.actions=[];window.hosts=[];
    const connection={haVersion:'2026.10.4',subscribeEvents:async()=>()=>{},subscribeMessage:async(callback,message)=>{
      const request={callback,message,active:true};requests.push(request);return()=>{request.active=false;};}};
    window.hass={connection,user:{id:user,name:user,is_admin:false},
      states:{'input_select.mode':{entity_id:'input_select.mode',state:'Présent',attributes:{options:['Présent','Absent'],friendly_name:'Mode'}}},
      config:{version:'2026.10.4',time_zone:'Europe/Paris',unit_system:{temperature:'°C'}},
      locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:false},localize:()=>undefined,
      formatEntityState:state=>state.state,formatEntityAttributeValue:(state,key,value)=>value,hassUrl:path=>new URL(path,location.origin).href,
      callWS:async()=>({resources:{input_select:{}}}),callService:async()=>{}};
    document.querySelector('home-assistant').hass=hass;
    window.mount=()=>{
      const card=document.createElement('bubble-card');
      card.setConfig({type:'custom:bubble-card',card_type:'button',button_type:'state',entity:'input_select.mode',name:'Porteur',show_icon:false,
        modules:['signature_reactions'],signature_reactions:{users:['tablet'],rules:rules || [{id:'condition',trigger:'template',template:'{{ demo }}',
          action:{action:'navigate',navigation_path:'/lovelace/bell'},return_after:1}]}});
      document.querySelector('#cards').append(card);card.hass=hass;hosts.push(card);return card;
    };
    document.addEventListener('hass-action',event=>{
      actions.push(event.detail);const action=event.detail.config.tap_action;
      if(action.action==='navigate'){history.pushState({from:location.pathname},'',action.navigation_path);window.dispatchEvent(new CustomEvent('location-changed'));}
    });
    window.first=mount();window.second=mount();window.contexts=[{teardown:()=>hosts.forEach(host=>host.remove())}];
  },{user,rules});
  await page.waitForFunction(()=>hosts.every(host=>!host.initialLoad));
  return page;
}
test('real Bubble 3.4.3 creates no Reactions runtime or Jinja subscription for the wrong account',{...native,timeout:30000},async t=>{
  const page=await setup(t,'other');
  assert.deepEqual(await page.evaluate(()=>({runtimes:hosts.filter(host=>host._signatureReactions).length,
    templates:requests.filter(request=>request.message.type==='render_template').length,actions:actions.length})),
    {runtimes:0,templates:0,actions:0});
});
test('real Bubble dependency tracking follows an event entity only on the targeted session',{...native,timeout:30000},async t=>{
  const page=await setup(t,'tablet',[{id:'bell',trigger:'entity',entity:'event.bell',action:{action:'navigate',navigation_path:'/lovelace/bell'}}]);
  await page.evaluate(()=>{
    window.hass={...hass,states:{...hass.states,'event.bell':{state:'first',attributes:{event_type:'ring'}}}};
    for(const card of hosts)card.hass=hass;
  });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>actions.length),0);
  await page.evaluate(()=>{
    window.hass={...hass,states:{...hass.states,'event.bell':{state:'second',attributes:{event_type:'ring'}}}};
    for(const card of hosts)card.hass=hass;
  });
  await page.waitForFunction(()=>location.pathname==='/lovelace/bell');
  assert.equal(await page.evaluate(()=>actions.length),1);
});
test('real Bubble module copies share Jinja and dispatch native actions, retaining the return on view handoff',{...native,timeout:30000},async t=>{
  const page=await setup(t);
  await page.waitForFunction(()=>requests.some(request=>request.message.type==='render_template'));
  assert.equal(await page.evaluate(()=>requests.filter(request=>request.message.type==='render_template').length),1);
  await page.evaluate(()=>{
    const sub=requests.find(request=>request.message.type==='render_template');sub.callback({result:false});sub.callback({result:true});
  });
  await page.waitForFunction(()=>location.pathname==='/lovelace/bell');
  await page.evaluate(()=>{first.remove();second.remove();window.third=mount();});
  await page.waitForFunction(()=>location.pathname==='/lovelace/home');
  assert.equal(await page.evaluate(()=>actions.length),2);
  assert.equal(await page.evaluate(()=>requests.filter(request=>request.message.type==='render_template').length),1);
});
