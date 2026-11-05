const assert=require('node:assert/strict');
const {test}=require('node:test');
const vm=require('node:vm');
const {loadModule}=require('../../shared/test/module.cjs');
const definition=loadModule('signature-reactions');
const plain=value=>JSON.parse(JSON.stringify(value));
const nav=path=>({action:'navigate',navigation_path:path});
const eventRule=(extra={})=>({trigger:'event',event_type:'signature_reaction',action:nav('/lovelace/bell'),return_after:60,...extra});
function fixture({rules=[eventRule()],users=['tablet'],user='tablet',admin=true,options={},syncSubscription=false,unsubscribeError=false}={}) {
  let now=100000,timerId=0,reads=0;const timers=new Map(),requests=[],actions=[],warnings=[],connections=[];
  class Target {
    constructor(){this.listeners=new Map();this.isConnected=true;}
    addEventListener(name,fn){const set=this.listeners.get(name)||new Set();set.add(fn);this.listeners.set(name,set);}
    removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
    emit(name,event={}){for(const fn of this.listeners.get(name)||[])fn(event);}
    dispatchEvent(event){this.emit(event.type,event);return !event.defaultPrevented;}
  }
  const window=new Target();let location=new URL('https://ha.test/lovelace/home');
  Object.defineProperty(window,'location',{get:()=>location});
  const setPath=path=>{location=new URL(path,location);window.emit('location-changed');};
  const connection=new Target();connection.connected=true;
  connection.subscribeMessage=(callback,message)=>{
    const sub={callback,message:plain(message),active:true,unsubscribes:0};requests.push(sub);
    if(syncSubscription&&message.type==='render_template')callback({result:true});
    return Promise.resolve(()=>{sub.active=false;sub.unsubscribes++;if(unsubscribeError)throw Error('unsubscribe failed');});
  };
  const states={'event.bell':{state:'first',attributes:{event_type:'ring'}}};
  const hass={user:{id:user,is_admin:admin},connection,states:new Proxy(states,{get(target,key){reads++;return target[key];}})};
  const context=vm.createContext({window,URL,CustomEvent,console:{warn:message=>warnings.push(message)},
    Date:class extends Date {static now(){return now;}},
    setTimeout:(fn,delay=0)=>{const id=++timerId;timers.set(id,{fn,at:now+Number(delay)});return id;},clearTimeout:id=>timers.delete(id)});
  const evaluate=vm.runInContext('(function(hass,onTeardown){return `'+definition.code+'`;})',context);
  const base={users,rules,...options};
  const create=(config=base,extra={})=>{
    const host=new Target();host.card=new Target();host._hass=hass;host.config={card_type:'sub-buttons',modules:['signature_reactions'],signature_reactions:config};
    Object.assign(host,extra);
    host.card.addEventListener('hass-action',event=>{
      actions.push(plain(event.detail));const action=event.detail.config.tap_action;
      if(action.action==='navigate'&&!host.cancelActions)setPath(action.navigation_path);
    });
    host.render=(current=host._hass)=>{host._hass=current;host.teardown=undefined;return evaluate.call(host,current,fn=>host.teardown=fn);};
    host.remove=()=>{host.isConnected=false;host.card.isConnected=false;host.teardown?.();};
    host.render();connections.push(host);return host;
  };
  const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
  const tick=async ms=>{
    const end=now+ms;let count=0;
    while(true){await flush();const next=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;
      if(++count>2000)throw Error('timer loop');now=next[1].at;timers.delete(next[0]);next[1].fn();}
    now=end;await flush();
  };
  const state=(token,attributes={event_type:'ring'},id='event.bell')=>{
    states[id]={state:token,attributes};for(const host of connections)if(host.isConnected)host.render();
  };
  const event=(data={},type='signature_reaction')=>{for(const sub of requests)if(sub.active&&sub.message.type==='subscribe_events'&&sub.message.event_type===type)sub.callback({data});};
  const message=(value,index=0)=>requests[index].callback(value);
  return {create,hass,connection,window,timers,requests,actions,warnings,states,context,flush,tick,state,event,message,setPath,
    get reads(){return reads;},get timerCount(){return timerId;},get path(){return location.pathname+location.search+location.hash;},
    get targets(){return actions.map(action=>action.config.tap_action.navigation_path);}};
}
test('untargeted, missing and disabled accounts do no state reads, subscriptions, listeners or timers',()=>{
  for(const args of [{user:'other'},{user:undefined},{options:{enabled:false}},{rules:[{...eventRule(),users:['other']}] }]){
    const f=fixture(args);if(Object.hasOwn(args,'user')&&args.user===undefined)f.hass.user={};
    f.create();assert.equal(f.reads,0);assert.deepEqual(f.requests,[]);assert.equal(f.timers.size,0);
    assert.equal(f.window.listeners.size,0);assert.equal(f.window.__signatureReactions,undefined);
  }
});
test('the excluded account gate precedes any access to rules or their configuration',()=>{
  const f=fixture({user:'other'});
  f.create({users:['tablet'],get rules(){throw Error('must not inspect excluded rules');}});
  assert.equal(f.reads,0);assert.equal(f.requests.length,0);assert.equal(f.timers.size,0);
  assert.equal(f.window.__signatureReactions,undefined);
});
test('editor and detached previews are inert even for a targeted administrator',()=>{
  for(const flags of [{editor:true},{preview:true},{inEditorPreview:true},{isConnected:false}]){
    const f=fixture({admin:true,rules:[{id:'x',trigger:'event',event_type:'demo',action:nav('/x')}]});
    f.create(undefined,flags);assert.deepEqual(f.requests,[]);assert.equal(f.timers.size,0);assert.equal(f.window.listeners.size,0);
  }
});
test('a mixed configuration never reads or subscribes rules excluded for the current user',()=>{
  const f=fixture({rules:[eventRule(),{id:'for-other',users:['other'],trigger:'template',template:'{{ expensive }}',action:nav('/other')},
    {id:'other-event',users:['other'],trigger:'event',event_type:'other',action:nav('/other')}]});
  f.create();assert.equal(f.requests.length,1);assert.equal(f.reads,0);assert.equal(f.warnings.length,0);
});
test('a bus event runs once per occurrence and restarts the return deadline without replay on load',async()=>{
  const f=fixture();f.create();await f.flush();assert.equal(f.actions.length,0);
  f.event();await f.flush();assert.deepEqual(f.targets,['/lovelace/bell']);
  await f.tick(40000);f.event();await f.flush();assert.equal(f.actions.length,2);
  await f.tick(59000);assert.equal(f.path,'/lovelace/bell');
  await f.tick(1000);assert.deepEqual(f.targets,['/lovelace/bell','/lovelace/bell','/lovelace/home']);
});
test('event_data filters nested bus payloads and accepts repeated matching events',async()=>{
  const f=fixture({rules:[eventRule({event_data:{name:'bell',source:{room:'garden'}},return_after:0})]});f.create();
  f.event({name:'bell',source:{room:'hall'}});await f.flush();assert.equal(f.actions.length,0);
  const payload={name:'bell',source:{room:'garden',device:'doorbell'}};
  f.event(payload);await f.flush();f.event(payload);await f.flush();
  assert.equal(f.actions.length,2);assert.equal(f.requests.length,1);assert.equal(f.reads,0);
});
test('non-admin bus rules are rejected before reading their event name or action',async()=>{
  const bus={trigger:'event',get event_type(){throw Error('must not inspect admin event');},get action(){throw Error('must not inspect admin action');}};
  const f=fixture({admin:false,rules:[bus]});f.create();
  assert.equal(f.requests.length,0);assert.equal(f.reads,0);assert.equal(f.timers.size,0);
  assert.equal(f.window.__signatureReactions,undefined);assert.equal(f.window.listeners.size,0);
  const mixed=fixture({admin:false,rules:[bus,{trigger:'template',template:'{{ demo }}',action:nav('/warning')}]});mixed.create();
  assert.equal(mixed.requests.length,1);assert.equal(mixed.requests[0].message.type,'render_template');
  mixed.message({result:false});mixed.message({result:true});await mixed.flush();assert.deepEqual(mixed.targets,['/warning']);
});
test('inactive configurations are not parsed again on hass updates and activate after an admin role change',()=>{
  let reads=0;const rules=[eventRule()];
  const options={users:['tablet'],get rules(){reads++;return rules;}};
  const f=fixture({admin:false}),host=f.create(options),before=reads;
  for(let i=0;i<1000;i++)host.render();
  assert.equal(reads,before);assert.equal(f.requests.length,0);assert.equal(f.timers.size,0);
  assert.equal(f.window.listeners.size,0);assert.equal(f.window.__signatureReactions,undefined);
  host.render({...f.hass,user:{id:'tablet',is_admin:true}});const active=reads;
  for(let i=0;i<1000;i++)host.render();
  assert.equal(reads,active);assert.equal(f.requests.length,1);assert.equal(f.reads,0);
});
test('removed entity and relay rules are inert for every account',()=>{
  for(const admin of [false,true]){
    const f=fixture({admin,rules:[{trigger:'entity',entity:'event.bell',action:nav('/old')},
      {trigger:'event',entity:'sensor.signature_reactions_relay',action:nav('/old')}]});f.create();
    f.state('next');assert.equal(f.requests.length,0);assert.equal(f.reads,0);assert.equal(f.timers.size,0);
    assert.equal(f.window.__signatureReactions,undefined);assert.equal(f.window.listeners.size,0);
  }
});
test('losing admin rights cancels events and pending work for the same user, restoring rights resubscribes',async()=>{
  const f=fixture({rules:[eventRule({delay:5,return_after:0})]});const host=f.create();await f.flush();f.event();
  host.render({...f.hass,user:{id:'tablet',is_admin:false}});await f.flush();
  assert.equal(f.requests[0].active,false);assert.equal(f.timers.size,0);
  f.message({data:{}});await f.tick(5000);assert.equal(f.actions.length,0);
  host.render(f.hass);assert.equal(f.requests.length,2);f.event();await f.tick(5000);assert.deepEqual(f.targets,['/lovelace/bell']);
});
test('identical module copies share one subscription and keep their return across view teardown/mount',async()=>{
  const rule={id:'x',trigger:'template',template:'{{ demo }}',action:nav('/bell'),return_after:60};
  const f=fixture({rules:[rule]});const a=f.create(),b=f.create();assert.equal(f.requests.length,1);
  f.message({result:false});f.message({result:true});await f.flush();assert.equal(f.actions.length,1);
  a.remove();b.remove();await f.tick(1000);f.create();await f.tick(59000);
  assert.deepEqual(f.targets,['/bell','/lovelace/home']);assert.equal(f.requests.length,1);
});
test('the cached action carrier is revalidated and another allowed card takes over immediately',async()=>{
  const f=fixture({rules:[eventRule({return_after:0})]}),a=f.create(),b=f.create();let first=0,second=0;
  a.card.addEventListener('hass-action',()=>first++);b.card.addEventListener('hass-action',()=>second++);
  f.event();await f.flush();assert.equal(first,1);assert.equal(second,0);
  a.config.signature_reactions={users:['other'],rules:[]};
  f.event();await f.flush();assert.equal(first,1);assert.equal(second,1);
  b.remove();f.event();await f.flush();assert.equal(first,1);assert.equal(second,1);
});
test('hass snapshots cannot trigger or replay bus events and require no entity reads',async()=>{
  const f=fixture();const a=f.create(),b=f.create();
  f.state('second');a.render({...f.hass,states:{}});b.render();await f.flush();assert.equal(f.actions.length,0);
  f.event();await f.flush();a.render();b.render();await f.flush();assert.equal(f.actions.length,1);assert.equal(f.reads,0);
});
test('template fires only on false to true, with optional first-load execution and no replay on reconnect',async()=>{
  for(const fire_on_load of [false,true]){
    const f=fixture({admin:false,rules:[{id:'x',trigger:'template',template:'{{ demo }}',action:nav('/x'),fire_on_load}]});f.create();
    f.message({result:true});await f.flush();assert.equal(f.actions.length,Number(fire_on_load));
    f.message({result:true});await f.flush();assert.equal(f.actions.length,Number(fire_on_load));
    f.message({result:false});f.message({result:'True'});await f.flush();assert.equal(f.actions.length,1+Number(fire_on_load));
    f.connection.emit('disconnected');f.connection.emit('ready');f.message({result:true});await f.flush();
    assert.equal(f.actions.length,1+Number(fire_on_load));
  }
});
test('a synchronous subscription result is handled after the owner is attached',async()=>{
  const f=fixture({syncSubscription:true,rules:[{id:'x',trigger:'template',template:'{{ true }}',action:nav('/x'),fire_on_load:true}]});
  f.create();await f.flush();assert.deepEqual(f.targets,['/x']);
});
test('false cancels delayed actions and can return immediately from a temporary page',async()=>{
  const f=fixture({rules:[{id:'x',trigger:'template',template:'{{ demo }}',action:nav('/x'),delay:5,return_after:60,return_on_false:true}]});
  f.create();f.message({result:false});f.message({result:true});await f.tick(4000);f.message({result:false});await f.tick(5000);
  assert.equal(f.actions.length,0);
  f.message({result:true});await f.tick(5000);assert.equal(f.path,'/x');
  f.message({result:false});await f.flush();assert.equal(f.path,'/lovelace/home');
  await f.tick(60000);assert.equal(f.actions.length,2);
});
test('leaving manually cancels the previous-page return and preserves URL/query/hash when returning',async()=>{
  const f=fixture();f.setPath('/dashboard-room/bedroom?mode=tablet#climate');f.create();f.event();await f.flush();
  await f.tick(60000);assert.equal(f.path,'/dashboard-room/bedroom?mode=tablet#climate');
  f.event();await f.flush();f.setPath('/dashboard-security/summary');await f.tick(60000);
  assert.equal(f.path,'/dashboard-security/summary');assert.equal(f.actions.length,3);
});
test('an explicit native return action selects the configured destination',async()=>{
  const f=fixture({rules:[eventRule({return_mode:'action',return_action:nav('/overview')})]});f.create();f.event();await f.flush();
  await f.tick(60000);assert.equal(f.path,'/overview');
});
test('idle uses human activity, not hass updates; it fires once and does not churn timers during scrolling',async()=>{
  const f=fixture({admin:false,rules:[{id:'idle',trigger:'idle',seconds:300,action:nav('/overview')}]});const host=f.create();
  await f.tick(240000);const count=f.timerCount;
  for(let i=0;i<100;i++){f.window.emit('pointermove',{isTrusted:true});host.render();}
  assert.equal(f.timerCount,count,'Pointer movement should only update a timestamp');
  await f.tick(299000);assert.equal(f.actions.length,0);await f.tick(1000);assert.deepEqual(f.targets,['/overview']);
  await f.tick(600000);assert.equal(f.actions.length,1);
  f.window.emit('scroll',{isTrusted:true});await f.tick(300000);assert.equal(f.actions.length,2);
});
test('temporary camera return takes priority over an already almost-expired idle deadline',async()=>{
  const f=fixture({rules:[eventRule(),{id:'idle',trigger:'idle',seconds:300,action:nav('/overview')}]});f.create();
  await f.tick(299000);f.event();await f.flush();await f.tick(59000);assert.deepEqual(f.targets,['/lovelace/bell']);
  await f.tick(1000);assert.equal(f.path,'/lovelace/home');await f.tick(299000);assert.equal(f.actions.length,2);
  await f.tick(1000);assert.equal(f.path,'/overview');
});
test('direct events are shared by event type, filtered and never subscribed by a limited user',async()=>{
  const rule={id:'event',trigger:'event',event_type:'signature_reaction',event_data:{name:'bell'},action:nav('/bell')};
  const denied=fixture({admin:false,rules:[rule]});denied.create();assert.equal(denied.requests.length,0);assert.equal(denied.window.__signatureReactions,undefined);
  const f=fixture({admin:true,rules:[rule,{...rule,id:'other',event_data:{name:'other'},action:nav('/other')}]});
  f.create();f.create();assert.equal(f.requests.length,1);
  f.message({data:{name:'skip'}});await f.flush();assert.equal(f.actions.length,0);
  f.message({data:{name:'bell'}});await f.flush();assert.deepEqual(f.targets,['/bell']);
});
test('templated native action parameters retain bus data and unsubscribe one-shot renders',async()=>{
  const action={action:'perform-action',perform_action:'script.notify',data:{message:'{{ event.data.message }}'},target:{entity_id:'script.notify'}};
  const f=fixture({rules:[eventRule({event_data:{name:'bell'},action,return_after:0})]});f.create();
  f.event({name:'other'});await f.flush();assert.equal(f.requests.length,1);
  f.event({name:'bell',message:'Bonjour'});await f.flush();assert.equal(f.requests.length,2);
  assert.deepEqual(f.requests[1].message.variables.event.data,{name:'bell',message:'Bonjour'});
  f.message({result:'Bonjour'},1);await f.flush();assert.equal(f.requests[1].unsubscribes,1);
  assert.deepEqual(f.actions[0].config.tap_action,{...action,data:{message:'Bonjour'}});
});
test('literal actions keep their native values and reuse the object without any render subscription',async()=>{
  const data=Object.freeze({value:0,enabled:false,optional:null,list:Object.freeze(['a',0,false])});
  const action=Object.freeze({action:'perform-action',perform_action:'script.notify',data});
  const f=fixture({rules:[eventRule({action,return_after:0})]}),host=f.create(),seen=[];
  host.card.addEventListener('hass-action',event=>seen.push(event.detail.config.tap_action));
  f.event();await f.flush();f.event();await f.flush();
  assert.equal(f.requests.length,1);assert.equal(seen.length,2);
  assert.ok(seen.every(value=>value===action));assert.deepEqual(f.actions[0].config.tap_action,plain(action));
});
test('a disabled return does not render unused Jinja or install navigation listeners',async()=>{
  const f=fixture({rules:[eventRule({return_after:0,return_action:nav('{{ unused }}')})]});f.create();
  for(const name of ['location-changed','popstate','hashchange'])assert.equal(f.window.listeners.has(name),false);
  f.event();await f.flush();assert.equal(f.requests.length,1);assert.deepEqual(f.targets,['/lovelace/bell']);
  await f.tick(60000);assert.equal(f.actions.length,1);
});
test('a repeated event cancels an older nested Jinja render and retains the new native result type',async()=>{
  const action={action:'perform-action',perform_action:'script.notify',data:{items:[false,'{{ event.data.value }}',0]}};
  const f=fixture({rules:[eventRule({action,return_after:0})]});f.create();
  f.event({value:1});await f.flush();assert.equal(f.requests.length,2);
  f.event({value:2});await f.flush();assert.equal(f.requests.length,3);assert.equal(f.requests[1].active,false);
  f.message({result:'old'},1);await f.flush();assert.equal(f.actions.length,0);
  f.message({result:[0,false]},2);await f.flush();
  assert.deepEqual(f.actions[0].config.tap_action.data.items,[false,[0,false],0]);
  assert.deepEqual(action.data.items,[false,'{{ event.data.value }}',0]);assert.equal(f.requests[2].unsubscribes,1);
});
test('a throwing unsubscribe cannot interrupt cleanup of other subscriptions or timers',async()=>{
  const f=fixture({unsubscribeError:true,rules:[{trigger:'template',template:'{{ first }}',action:nav('/first')},
    {trigger:'template',template:'{{ second }}',action:nav('/second')}]});const host=f.create();await f.flush();
  host.config.signature_reactions={enabled:false};assert.doesNotThrow(()=>host.render());await f.flush();
  assert.ok(f.requests.every(sub=>!sub.active&&sub.unsubscribes===1));assert.equal(f.timers.size,0);
  for(const listeners of f.window.listeners.values())assert.equal(listeners.size,0);
});
test('losing the targeted account immediately unsubscribes, removes listeners and cancels pending work',async()=>{
  const f=fixture({rules:[{id:'x',trigger:'template',template:'{{ demo }}',action:nav('/x'),delay:5},
    {id:'idle',trigger:'idle',seconds:300,action:nav('/overview')}]});const host=f.create();await f.flush();
  f.message({result:false});f.message({result:true});
  host.render({...f.hass,user:{id:'other'}});await f.flush();
  assert.equal(f.requests[0].active,false);assert.equal(f.timers.size,0);
  for(const listeners of f.window.listeners.values())assert.equal(listeners.size,0);
  f.message({result:true});await f.tick(300000);assert.equal(f.actions.length,0);
});
test('pending subscription promises clean up after teardown, errors never execute actions',async()=>{
  const f=fixture({rules:[{id:'x',trigger:'template',template:'{{ bad }}',action:nav('/x')}]});const host=f.create();
  f.message({error:'bad template'});await f.flush();assert.equal(f.actions.length,0);
  host.config.signature_reactions={enabled:false};host.render();await f.flush();
  assert.equal(f.requests[0].unsubscribes,1);assert.equal(f.timers.size,0);
});
test('an unsubscribe promise arriving after immediate removal is invoked exactly once',async()=>{
  const f=fixture({rules:[{id:'x',trigger:'template',template:'{{ demo }}',action:nav('/x')}]});
  let finish,unsubscribes=0;f.connection.subscribeMessage=()=>new Promise(resolve=>{finish=resolve;});
  const host=f.create();host.config.signature_reactions={enabled:false};host.render();
  finish(()=>{unsubscribes++;});await f.flush();assert.equal(unsubscribes,1);assert.equal(f.timers.size,0);
});
test('a template error cancels an already delayed action and reseeds its recovery',async()=>{
  const f=fixture({rules:[{id:'x',trigger:'template',template:'{{ demo }}',action:nav('/x'),delay:5}]});f.create();
  f.message({result:false});f.message({result:true});f.message({error:'unavailable template'});await f.tick(5000);
  assert.equal(f.actions.length,0);f.message({result:true});await f.tick(5000);assert.equal(f.actions.length,0);
  f.message({result:false});f.message({result:true});await f.tick(5000);assert.deepEqual(f.targets,['/x']);
});
test('different configurations coexist without a scope and invalid destinations cannot navigate',async()=>{
  const f=fixture();f.create();f.create({users:['tablet'],rules:[eventRule({action:nav('/other')})]});
  assert.equal(f.warnings.length,0);f.event();await f.flush();assert.equal(f.actions.length,2);
  const invalid=fixture({rules:[eventRule({action:nav('//external.test')})]});invalid.create();invalid.event();await invalid.flush();
  assert.equal(invalid.actions.length,0);
});
test('anonymous duplicate rules and copies with legacy IDs, scopes or reordered keys execute only once',async()=>{
  const rule=eventRule();
  const f=fixture({rules:[rule,plain(rule)]});f.create();
  f.create({users:['tablet'],scope:'old',rules:[{return_after:60,action:{navigation_path:'/lovelace/bell',action:'navigate'},
    event_type:'signature_reaction',trigger:'event',id:'legacy',name:'Old name'}]});
  assert.equal(f.window.__signatureReactions.engines.size,1);
  f.event();await f.flush();assert.deepEqual(f.targets,['/lovelace/bell']);
  await f.tick(60000);assert.equal(f.path,'/lovelace/home');assert.equal(f.actions.length,2);
});
test('different anonymous rules are not lost when old IDs collide',async()=>{
  const f=fixture({rules:[eventRule({id:'same',return_after:0}),eventRule({id:'same',action:nav('/other'),return_after:0})]});
  f.create();f.event();await f.flush();assert.deepEqual(f.targets,['/lovelace/bell','/other']);
});
test('an equivalent configuration replacement keeps the subscription and pending return deadline',async()=>{
  const f=fixture({rules:[{trigger:'template',template:'{{ demo }}',action:nav('/bell'),return_after:60}]});
  const host=f.create();f.message({result:false});f.message({result:true});await f.flush();await f.tick(40000);
  host.config.signature_reactions=plain(host.config.signature_reactions);host.render();
  assert.equal(f.requests.length,1);await f.tick(20000);assert.equal(f.path,'/lovelace/home');
});
test('return_action implies a custom return without return_mode and shares its legacy equivalent',async()=>{
  const rule=eventRule({return_action:nav('/overview')});
  const f=fixture({rules:[rule]});f.create();f.create({users:['tablet'],rules:[{...rule,id:'legacy',return_mode:'action'}]});
  f.event();await f.flush();assert.equal(f.actions.length,1);
  await f.tick(60000);assert.deepEqual(f.targets,['/lovelace/bell','/overview']);
});
test('detached carriers stop acting and release the shared session after its bounded handoff grace',async()=>{
  const f=fixture({rules:[{id:'x',trigger:'template',template:'{{ demo }}',action:nav('/x')}]});const host=f.create();await f.flush();
  host.remove();f.message({result:false});f.message({result:true});await f.flush();assert.equal(f.actions.length,0);
  await f.tick(20000);assert.equal(f.requests[0].active,false);assert.equal(f.timers.size,0);
});
