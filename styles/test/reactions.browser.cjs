const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const reactions=loadModule('signature-reactions');
const nativePath=process.env.BUBBLE_PIN_NATIVE_SCRIPT_PATH;
const native={skip:!nativePath};
async function setup(t,user='tablet',rules,admin=false) {
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
  await page.evaluate(({user,rules,admin})=>{
    window.requests=[];window.actions=[];window.hosts=[];
    const connection={haVersion:'2026.10.4',subscribeEvents:async()=>()=>{},subscribeMessage:async(callback,message)=>{
      const request={callback,message,active:true};requests.push(request);return()=>{request.active=false;};}};
    window.hass={connection,user:{id:user,name:user,is_admin:admin},
      states:{'input_select.mode':{entity_id:'input_select.mode',state:'Présent',attributes:{options:['Présent','Absent'],friendly_name:'Mode'}}},
      config:{version:'2026.10.4',time_zone:'Europe/Paris',unit_system:{temperature:'°C'}},
      locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:false},localize:()=>undefined,
      formatEntityState:state=>state.state,formatEntityAttributeValue:(state,key,value)=>value,hassUrl:path=>new URL(path,location.origin).href,
      callWS:async()=>({resources:{input_select:{}}}),callService:async()=>{}};
    document.querySelector('home-assistant').hass=hass;
    window.mount=()=>{
      const card=document.createElement('bubble-card');
      card.setConfig({type:'custom:bubble-card',card_type:'button',button_type:'state',entity:'input_select.mode',name:'Porteur',show_icon:false,
        modules:['signature_reactions'],signature_reactions:{users:['tablet'],rules:rules || [{trigger:'template',template:'{{ demo }}',
          action:{action:'navigate',navigation_path:'/lovelace/bell'},return_after:1}]}});
      document.querySelector('#cards').append(card);card.hass=hass;hosts.push(card);return card;
    };
    document.addEventListener('hass-action',event=>{
      actions.push(event.detail);const action=event.detail.config.tap_action;
      if(action.action==='navigate'){history.pushState({from:location.pathname},'',action.navigation_path);window.dispatchEvent(new CustomEvent('location-changed'));}
    });
    window.first=mount();window.second=mount();window.contexts=[{teardown:()=>hosts.forEach(host=>host.remove())}];
  },{user,rules,admin});
  await page.waitForFunction(()=>hosts.every(host=>!host.initialLoad));
  return page;
}
test('real Bubble 3.4.3 creates no Reactions runtime or Jinja subscription for the wrong account',{...native,timeout:30000},async t=>{
  const page=await setup(t,'other');
  assert.deepEqual(await page.evaluate(()=>({runtimes:hosts.filter(host=>host._signatureReactions).length,
    templates:requests.filter(request=>request.message.type==='render_template').length,actions:actions.length})),
    {runtimes:0,templates:0,actions:0});
});
test('real Bubble listens once to the generic bus for admin and creates nothing for a non-admin',{...native,timeout:30000},async t=>{
  for(const admin of [false,true]){
    const page=await setup(t,'tablet',[{trigger:'event',event_type:'signature_reaction',action:{action:'navigate',navigation_path:'/lovelace/bell'}}],admin);
    if(admin){
      await page.waitForFunction(()=>requests.some(request=>request.message.type==='subscribe_events'));
      assert.equal(await page.evaluate(()=>requests.filter(request=>request.message.type==='subscribe_events').length),1);
      await page.evaluate(()=>requests.find(request=>request.message.type==='subscribe_events').callback({data:{name:'bell'}}));
      await page.waitForFunction(()=>location.pathname==='/lovelace/bell');assert.equal(await page.evaluate(()=>actions.length),1);
    } else {
      assert.deepEqual(await page.evaluate(()=>({events:requests.filter(request=>request.message.type==='subscribe_events').length,
        runtimes:hosts.filter(host=>host._signatureReactions).length,actions:actions.length})),{events:0,runtimes:0,actions:0});
    }
  }
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
test('real Bubble editor exposes generic events without entity sources and keeps the return choice transient',{...native,timeout:30000},async t=>{
  const page=await setup(t);
  const result=await page.evaluate(async schema=>{
    if(!customElements.get('ha-selector-bc_object'))throw Error('Native Bubble object selector missing');
    const rule={trigger:'event',event_type:'signature_reaction',return_after:60,action:{action:'navigate',navigation_path:'/bell'},future:false};
    const form=document.createElement('ha-form-signature_reactions_options_v1');
    Object.assign(form,{hass,schema,data:{users:['tablet'],rules:[rule]}});document.body.append(form);await Promise.resolve();
    const field=form._form.schema.find(field=>field.name==='rules');
    const rows=document.createElement('ha-form-'+field.type);
    Object.assign(rows,{hass,schema:field,data:[rule]});const values=[];
    rows.addEventListener('value-changed',event=>{values.push(event.detail.value);rows.data=event.detail.value;});
    document.body.append(rows);await Promise.resolve();
    const list=rows._list,leaves=entries=>entries.flatMap(field=>field.schema?leaves(field.schema):[field]);
    const generated=list._generateSchema(list.selector.bc_object.fields,list._itemFormData(list.value[0],0),0);
    const initial={writes:values.length,formType:field.type,hasSelector:Object.hasOwn(field,'selector'),
      timingCollapsed:generated.some(field=>field.title==='Temporisations et retour'&&field.expanded===false),
      entitySourceAbsent:!leaves(generated).some(field=>['entity','entity_event_type','__event_source'].includes(field.name)),
      eventNamePresent:leaves(generated).some(field=>field.name==='event_type'),
      genericFilterPresent:leaves(generated).some(field=>field.name==='event_data')};
    const change=patch=>{
      list._itemChanged(new CustomEvent('value-changed',{detail:{value:{...list._itemFormData(list.value[0],0),...patch}}}),0);
      return JSON.parse(JSON.stringify(values.at(-1)));
    };
    const bus=change({event_type:'demo'});await Promise.resolve();
    const returned=change({__return_mode:'action',return_action:{action:'navigate',navigation_path:'/home'}});await Promise.resolve();
    const previous=change({__return_mode:'previous'});rows.remove();form.remove();
    return {initial,bus,returned,previous};
  },reactions.editor.find(field=>field.fields));
  const rule={trigger:'event',event_type:'signature_reaction',return_after:60,action:{action:'navigate',navigation_path:'/bell'},future:false};
  const bus={...rule,event_type:'demo'};
  assert.deepEqual(result.initial,{writes:0,formType:'signature_reactions_rules_v1',hasSelector:false,timingCollapsed:true,entitySourceAbsent:true,eventNamePresent:true,genericFilterPresent:true});
  assert.deepEqual(result.bus,[bus]);
  assert.deepEqual(result.returned,[{...bus,return_action:{action:'navigate',navigation_path:'/home'}}]);
  assert.deepEqual(result.previous,[bus]);
});
