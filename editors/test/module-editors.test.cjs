const {loadModule}=require('../../shared/test/module.cjs');
const {editorEnvironment}=require('../../shared/test/editor-environment.cjs');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {editorBootstrap}=require('../../shared/test/editor-bootstrap.cjs');
const modules=['signature-weather','signature-wind-rose','alert_manager'].map(folder=>{
  const definition=loadModule(folder);
  return {folder,definition,schema:definition.editor.find(field=>field.fields),bootstrap:editorBootstrap(definition)};
});
const [weather,wind,alerts]=modules;
const flat=schema=>schema.flatMap(field=>field.schema?flat(field.schema):[field]);
const plain=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
// Native-shaped fixtures cover editor events and stored values, not a live HA frontend.
function environment({delayed=false,module}={}) {
  const {Element,registry,customElements,document,evaluate,flush}=editorEnvironment();
  class Engine extends Element {
    _itemFormData(value){
      const defaults={};
      for(const [key,field]of Object.entries(this.selector.bc_object.fields))if(field.selector?.select&&!field.selector.select.multiple&&field.default!==undefined&&(value?.[key]===undefined||value?.[key]===null||value?.[key]===''))defaults[key]=field.default;
      return {...value,...defaults,__card_entity:this.getRootNode().host._config?.entity};
    }
    _generateSchema(fields,item){
      const schema=[],groups=new Map();
      for(const [name,field]of Object.entries(fields)){
        if(field.visible_if&&!new Function('item','hass','card','return !!('+field.visible_if+');')(item,this.hass,this.getRootNode().host._config))continue;
        const input={name,selector:field.selector};
        if(field.selector?.attribute)input.context={filter_entity:'entity'};
        if(!field.group){schema.push(input);continue;}
        if(!groups.has(field.group)){const group={name:'bc_group_'+groups.size,type:'bc_group',flatten:true,title:field.group,schema:[]};groups.set(field.group,group);schema.push(group);}
        groups.get(field.group).schema.push(input);
      }
      return schema;
    }
    _computeLabel(field){return this.selector.bc_object.fields[field.name].label;}
    _computeHelper(field){return this.selector.bc_object.fields[field.name].description||'';}
    _itemChanged(event){
      event.stopPropagation();const clean={};
      for(const [key,value]of Object.entries(event.detail.value||{}))if(!key.startsWith('__'))clean[key]=value;
      for(const [key,field]of Object.entries(this.selector.bc_object.fields))if(field.selector?.select&&!field.selector.select.multiple&&field.default!==undefined&&this.value?.[key]===undefined&&clean[key]===field.default)delete clean[key];
      this.dispatchEvent(new CustomEvent('value-changed',{detail:{value:clean},bubbles:true,composed:true}));
    }
  }
  if(!delayed)customElements.define('ha-selector-bc_object',Engine);
  customElements.define('ha-form-bc_group',class extends Element {});
  const register=evaluate;
  for(const item of module?[module]:modules)register(item.bootstrap);
  const create=(schema,data,card={card_type:'button',button_type:'state',entity:'weather.home'})=>{
    const form=document.createElement('ha-form-signature_module_options');
    Object.assign(form,{schema,data,card,hass:{states:{}},label:schema.label});form.isConnected=true;form.connectedCallback();flush();
    form.changes=[];form.addEventListener('value-changed',event=>form.changes.push(event.detail.value));return form;
  };
  const change=(form,values)=>{form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,...values}}}));return form.changes.at(-1);};
  const listChange=(form,rows)=>{form._list.dispatchEvent(new CustomEvent('value-changed',{detail:{value:rows}}));return form.changes.at(-1);};
  return {create,change,listChange,flush,registry,customElements,Engine,register};
}
test('remaining schemas cover all documented keys using one standalone inline bridge',()=>{
  assert.deepEqual(Object.keys(weather.schema.fields).sort(),['layout','entity','forecast_type','count','precision','current_precision','show_current','show_details','current_metrics','local','name'].sort());
  assert.deepEqual(Object.keys(wind.schema.fields).sort(),['direction_entity','speed_entity','hours','direction_offset','calm_threshold','refresh_interval','color'].sort());
  assert.deepEqual(Object.keys(alerts.schema.fields).sort(),['sensors','packs','ignore_pending','show_badge','color_card','color_badge','icons','colors','entities'].sort());
  assert.deepEqual(Object.keys(weather.schema.fields.local.fields).sort(),['temperature','condition','apparent_temperature','humidity','pressure','wind_speed','wind_gust_speed','wind_bearing','precipitation','uv_index'].sort());
  assert.equal(alerts.schema.fields.packs.mapping,'packs');assert.equal(alerts.schema.fields.entities.mapping,'entities');
  assert.ok(modules.every(module=>module.schema.name===''&&module.schema.type==='signature_module_options'));
  const env=environment(),Class=env.registry.get('ha-form-signature_module_options');
  env.register(weather.bootstrap);assert.equal(env.registry.get('ha-form-signature_module_options'),Class);
  for(const module of modules){const standalone=environment({module}),form=standalone.create(module.schema,{});assert.equal(form._engine.isConnected,false);assert.equal(form.changes.length,0);assert.ok(form._form.schema.every(group=>group.type!=='bc_group'));}
});
test('Weather conditions follow layouts, explicit overrides and local sources without deleting hidden settings',()=>{
  const env=environment();
  for(const layout of ['ribbon','ranges','summary']){
    const form=env.create(weather.schema,{layout,name:'Maison'}),keys=flat(form._form.schema).map(field=>field.name);
    assert.equal(keys.includes('name'),layout==='summary');assert.equal(keys.includes('current_metrics'),layout==='summary');assert.ok(keys.includes('local'));
  }
  const form=env.create(weather.schema,{layout:'summary',show_current:false,name:'Maison',local:{temperature:'sensor.outdoor'},show_details:false,future:{value:0}});
  assert.ok(!flat(form._form.schema).some(field=>['name','local','current_metrics'].includes(field.name)));
  const value=plain(env.change(form,{count:8}));
  assert.deepEqual(value,{layout:'summary',show_current:false,name:'Maison',local:{temperature:'sensor.outdoor'},show_details:false,future:{value:0},count:8});
  assert.equal(env.change(form,{show_current:'true'}).show_current,true);
  const automatic=env.change(form,{show_current:'auto'});assert.ok(!Object.hasOwn(automatic,'show_current'));
  const absent=env.create(weather.schema,{});assert.equal(absent._form.data.show_details,true);
  assert.deepEqual(plain(env.change(absent,{count:6})),{count:6},'Opening or editing unrelated fields must retain automatic defaults');
});
test('Weather lists distinguish automatic measurements from explicit empty selections',()=>{
  const env=environment(),schema=weather.schema.fields.current_metrics;
  const auto=env.create(schema,undefined);assert.equal(auto._form.data.mode,'auto');assert.equal(env.change(auto,{mode:'auto'}),undefined);
  assert.deepEqual(plain(env.change(auto,{mode:'custom',values:[]})),[]);
  const selected=env.create(schema,['wind_speed','humidity','future_metric']);
  assert.deepEqual(plain(env.change(selected,{mode:'custom'})),['wind_speed','humidity','future_metric']);
  assert.equal(env.change(selected,{mode:'auto'}),undefined);
});
test('Weather source editing preserves string/object forms, attributes, empty units and zero formatting',()=>{
  const env=environment(),schema=weather.schema.fields.local.fields.temperature;
  const simple=env.create(schema,'sensor.outdoor');assert.equal(simple._form.data.entity,'sensor.outdoor');
  assert.equal(env.change(simple,{entity:'sensor.other'}),'sensor.other');
  assert.deepEqual(plain(env.change(simple,{scale:0,precision:0,unit:''})),{entity:'sensor.outdoor',scale:0,precision:0,unit:''});
  const original={entity:'sensor.station',attribute:'temperature',unit:'',scale:0,precision:0,future:false};
  assert.deepEqual(plain(env.change(env.create(schema,original),{entity:'sensor.next'})),{...original,entity:'sensor.next'});
  const absent=env.create(schema,undefined);assert.deepEqual(flat(absent._form.schema).map(field=>field.name),['entity']);assert.equal(absent.changes.length,0);
  assert.equal(env.change(simple,{entity:undefined}),undefined);
  const local=env.create(weather.schema.fields.local,{temperature:'sensor.outdoor'});
  assert.equal(env.change(local,{temperature:undefined}),undefined,'Clearing the last local source restores automatic provider/current behavior');
  const root=env.create(weather.schema,{local:{temperature:'sensor.outdoor'}});
  assert.ok(!Object.hasOwn(env.change(root,{local:undefined}),'local'));
});
test('Wind editor preserves the numeric period and hides calm controls without a speed source',()=>{
  const env=environment(),form=env.create(wind.schema,{});
  assert.equal(form._form.data.hours,'24');assert.ok(!flat(form._form.schema).some(field=>field.name==='calm_threshold'));
  assert.deepEqual(plain(env.change(form,{color:'var(--teal-color)'})),{color:'var(--teal-color)'});
  assert.equal(env.change(form,{hours:'168'}).hours,168);
  assert.ok(!Object.hasOwn(env.change(form,{hours:''}),'hours'));
  for(const hours of [1,24,168,'24'])assert.equal(env.change(env.create(wind.schema,{hours}),{color:'#123456'}).hours,hours);
  const speed=env.create(wind.schema,{speed_entity:'sensor.wind',calm_threshold:0,direction_offset:-10});
  assert.ok(flat(speed._form.schema).some(field=>field.name==='calm_threshold'));
  assert.equal(env.change(speed,{color:''}).calm_threshold,0);
});
test('module fields follow the actual supported native card types',()=>{
  const env=environment();
  for(const module of [weather,wind])for(const card_type of ['cover','climate','media-player','separator','pop-up'])assert.deepEqual(plain(env.create(module.schema,{}, {card_type})._form.schema),[]);
  for(const module of modules)assert.deepEqual(plain(env.create(module.schema,{}, {card_type:'button',button_type:'slider'})._form.schema),[]);
  for(const card_type of ['button','cover','climate','media-player'])assert.ok(env.create(alerts.schema,{}, {card_type})._form.schema.length>0);
});
test('Alert defaults and inherited pending policies preserve unset values and explicit booleans',()=>{
  const env=environment(),root=env.create(alerts.schema,{});
  assert.equal(root._form.data.show_badge,true);assert.equal(root._form.data.color_badge,true);assert.equal(root._form.data.color_card,false);
  assert.deepEqual(plain(env.change(root,{colors:{active:'#ff0000'}})),{colors:{active:'#ff0000'}});
  const policy=alerts.schema.fields.packs;
  const form=env.create({...policy,mapping:undefined},{colors:{active:'red'},future:{enabled:false}});
  assert.equal(form._form.data.ignore_pending,'auto');
  assert.deepEqual(plain(env.change(form,{icons:{pending:'mdi:clock'}})),{colors:{active:'red'},future:{enabled:false},icons:{pending:'mdi:clock'}});
  for(const ignore_pending of [true,false])assert.equal(env.change(env.create({...policy,mapping:undefined},{ignore_pending}),{colors:{active:'blue'}}).ignore_pending,ignore_pending);
  assert.ok(!Object.hasOwn(env.change(form,{ignore_pending:''}),'ignore_pending'));
  const hidden=env.create(alerts.schema,{show_badge:false,color_badge:false,icons:{active:'mdi:fire'}});
  assert.ok(!flat(hidden._form.schema).some(field=>['color_badge','icons'].includes(field.name)));
  assert.deepEqual(plain(env.change(hidden,{color_card:true})),{show_badge:false,color_badge:false,icons:{active:'mdi:fire'},color_card:true});
});
test('Alert indexed lists support drafts, additions, renames and removal while retaining arbitrary settings',()=>{
  const env=environment(),form=env.create(alerts.schema.fields.packs,{battery:true,custom:{ignore_pending:false,future:0,id:'preserved'}});
  assert.equal(form._form.hidden,true);assert.equal(form._list.selector.bc_object.multiple,true);
  assert.deepEqual(plain(form._list.value),[{id:'battery',value:true},{id:'custom',value:{ignore_pending:false,future:0,id:'preserved'}}]);
  const draft=[...plain(form._list.value),{}];env.listChange(form,draft);assert.equal(form.changes.length,0);
  env.flush();form.hass={states:{}};env.flush();assert.equal(form._list.value.length,3,'An incomplete new row must remain editable without writing a setting');
  draft[2]={id:'connectivity',value:{icons:{active:'mdi:lan-disconnect'}}};
  assert.deepEqual(plain(env.listChange(form,draft)),{battery:true,custom:{ignore_pending:false,future:0,id:'preserved'},connectivity:{icons:{active:'mdi:lan-disconnect'}}});
  const rows=[{id:'renamed',value:{ignore_pending:false,future:0,id:'preserved'}}];
  assert.deepEqual(plain(env.listChange(form,rows)),{renamed:{ignore_pending:false,future:0,id:'preserved'}});
  assert.deepEqual(plain(env.listChange(form,[])),{});
  const generated=form._list._generateSchema(form._list.selector.bc_object.fields,{id:'x'},0);
  assert.equal(flat(generated).find(field=>field.name==='value').type,'signature_module_options');
});
test('Alert dictionaries reject duplicate/invalid entity IDs and accept corrected rows',()=>{
  const env=environment(),form=env.create(alerts.schema.fields.entities,{'sensor.room':{exclude:['rule_1'],future:0}});
  env.listChange(form,[{id:'sensor.room',value:{}},{id:'sensor.room',value:{}}]);assert.equal(form.changes.length,0);assert.equal(form._errorEl.hidden,false);
  env.listChange(form,[{id:'not_an_entity',value:{}}]);assert.equal(form.changes.length,0);
  assert.deepEqual(plain(env.listChange(form,[{id:'sensor.room',value:{exclude:false}},{id:'switch.fan',value:{ignore_pending:true}}])),{'sensor.room':{exclude:false},'switch.fan':{ignore_pending:true}});
  assert.equal(form._errorEl.hidden,true);
});
test('Alert exclusions retain true, rule/pack arrays and explicit empty lists',()=>{
  const env=environment(),schema=alerts.schema.fields.entities.fields.exclude;
  assert.equal(env.change(env.create(schema,true),{mode:'all'}),true);
  const rules=env.create(schema,['rule_1','battery']);assert.deepEqual(plain(env.change(rules,{mode:'rules'})),['rule_1','battery']);
  assert.deepEqual(plain(env.change(rules,{mode:'rules',rules:[]})),[]);
  assert.equal(env.change(rules,{mode:'none'}),undefined);
  const entity=env.create({...alerts.schema.fields.entities,mapping:undefined},{exclude:true,ignore_pending:false,packs:{battery:{}},future:0});
  assert.deepEqual(plain(env.change(entity,{exclude:undefined})),{ignore_pending:false,packs:{battery:{}},future:0});
});
test('shared editor tolerates delayed Bubble loading and reconnects without writing configuration',async()=>{
  const env=environment({delayed:true}),form=env.create(weather.schema,{layout:'summary'});
  assert.equal(form._engine,undefined);form.isConnected=false;
  env.customElements.define('ha-selector-bc_object',env.Engine);await Promise.resolve();env.flush();assert.equal(form._engine,undefined);
  form.data={layout:'ribbon',show_current:false};form.isConnected=true;form.connectedCallback();env.flush();assert.equal(form._form.data.layout,'ribbon');assert.equal(form.changes.length,0);
});
