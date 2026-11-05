const assert=require('node:assert/strict');
const {test}=require('node:test');
const {loadModule}=require('../../shared/test/module.cjs');
const {editorEnvironment}=require('../../shared/test/editor-environment.cjs');
const {editorBootstrap}=require('../../shared/test/editor-bootstrap.cjs');
const definition=loadModule('signature-reactions');
const schema=definition.editor.find(field=>field.fields);
const plain=value=>JSON.parse(JSON.stringify(value));
function setup(hass,data={}) {
  const env=editorEnvironment();
  class Engine extends env.Element {
    _itemFormData(value,index){return {...value,...this._uiState?.[index]};}
    _generateSchema(fields,data){return Object.entries(fields).filter(([,field])=>!field.visible_if||new Function('item','hass','return '+field.visible_if)(data,this.hass))
      .map(([name,field])=>({name,selector:field.selector}));}
    _itemChanged(event,index){
      let value=event.detail.value;
      if(this.selector.bc_object.multiple){
        const clean={},ui={};for(const [key,item]of Object.entries(value))(key.startsWith('__')?ui:clean)[key]=item;
        (this._uiState||={})[index]=ui;value=[...this.value];value[index]=clean;this.value=value;
      }
      this.dispatchEvent(new CustomEvent('value-changed',{detail:{value}}));
    }
    _computeLabel(field){return this.selector.bc_object.fields[field.name].label;}
    _computeHelper(field){return this.selector.bc_object.fields[field.name].description;}
  }
  env.customElements.define('ha-selector-bc_object',Engine);
  env.evaluate(editorBootstrap(definition));
  const form=env.document.createElement('ha-form-signature_reactions_options_v1');
  Object.assign(form,{hass,data,schema});form.isConnected=true;form.connectedCallback();env.flush();
  const changes=[];form.addEventListener('value-changed',event=>changes.push(plain(event.detail.value)));
  const change=patch=>{form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,...patch}}}));env.flush();};
  const mountRules=rules=>{
    const list=env.document.createElement('ha-form-signature_reactions_rules_v1');
    Object.assign(list,{hass,data:rules,schema:{fields:schema.fields.rules.selector.bc_object.fields}});
    list.isConnected=true;list.connectedCallback();env.flush();
    const changes=[];list.addEventListener('value-changed',event=>changes.push(plain(event.detail.value)));
    const change=(patch,index=0)=>{
      list._list._itemChanged({stopPropagation(){},detail:{value:{...list._list._itemFormData(list._list.value[index],index),...patch}}},index);
      return changes.at(-1);
    };
    return {form:list,changes,change};
  };
  return {...env,form,changes,change,mountRules};
}
test('French editor uses native repeated rules, action selectors, Jinja and conditional fields',()=>{
  const list=schema.fields.rules.selector.bc_object;
  assert.equal(list.multiple,true);assert.equal(list.label_field,'trigger');
  assert.deepEqual(Object.keys(schema.fields),['users','rules']);
  for(const key of ['id','name','enabled','scope','return_mode','entity','entity_event_type','__event_source'])assert.equal(Object.hasOwn(list.fields,key),false);
  assert.deepEqual(list.fields.trigger.selector.select.options.map(option=>option.value),['template','event','idle']);
  assert.deepEqual(list.fields.action.selector,{ui_action:{default_action:'none'}});
  assert.deepEqual(list.fields.return_action.selector,{ui_action:{default_action:'none'}});
  assert.deepEqual(list.fields.template.selector,{template:{}});
  for(const trigger of ['template','event','idle']){
    const visible=Object.entries(list.fields).filter(([,field])=>!field.visible_if||new Function('item','hass','return '+field.visible_if)({trigger},{states:{}})).map(([key])=>key);
    assert.equal(visible.includes('template'),trigger==='template');assert.equal(visible.includes('seconds'),trigger==='idle');
    assert.equal(visible.includes('event_type'),trigger==='event');
  }
});
test('rule editor keeps a bus event name and infers returns without adding technical YAML fields',()=>{
  const env=setup({user:{id:'tablet'},connection:{},states:{}});
  const rule={trigger:'event',event_type:'demo',return_after:60,action:{action:'navigate',navigation_path:'/bell'},future:false};
  const list=env.mountRules([rule]);assert.deepEqual(list.changes,[]);
  assert.deepEqual(list.change({event_type:'doorbell'}),[{...rule,event_type:'doorbell'}]);
  const custom=list.change({__return_mode:'action',return_action:{action:'navigate',navigation_path:'/home'}});
  assert.deepEqual(custom,[{...rule,event_type:'doorbell',return_action:{action:'navigate',navigation_path:'/home'}}]);
  assert.deepEqual(list.change({__return_mode:'previous'}),[{...rule,event_type:'doorbell'}]);
});
test('editing removes obsolete entity-source fields without rewriting on open',()=>{
  const env=setup({user:{id:'tablet'},connection:{},states:{}}),list=env.mountRules([{id:'old',trigger:'event',event_type:'demo',
    entity:'event.bell',entity_event_type:'double',return_mode:'action',return_action:{action:'navigate',navigation_path:'/home'},future:0}]);
  assert.deepEqual(list.changes,[]);
  const data=list.form._list._itemFormData(list.form._list.value[0],0);
  assert.equal(data.__return_mode,'action');
  const value=list.change({return_after:60})[0];
  for(const key of ['id','return_mode','entity','entity_event_type','__event_source'])assert.equal(Object.hasOwn(value,key),false);
  assert.equal(value.future,0);assert.equal(value.event_type,'demo');
});
test('opening or reconnecting the editor never writes defaults or modifies nested unknown YAML fields',()=>{
  const original={scope:'tablette',users:['tablet'],rules:[{id:'one',trigger:'template',template:'{{ demo }}',delay:0,enabled:false,future:{x:0}}],future:false};
  const env=setup({user:{id:'tablet'},connection:{}},original);
  assert.deepEqual(env.changes,[]);assert.deepEqual(plain(env.form.data),original);
  env.form.connectedCallback();env.flush();assert.deepEqual(env.changes,[]);
  env.change({scope:'new'});assert.deepEqual(env.changes.at(-1),{...original,scope:'new'});
  env.change({enabled:false});assert.deepEqual(env.changes.at(-1),{...original,enabled:false});
});
test('named account lookup is editor-only, admin-only and deduplicated by connection',async()=>{
  let calls=0;const hass={user:{id:'admin',name:'Loïc',is_admin:true},connection:{},callWS:async message=>{
    calls++;assert.equal(message.type,'config/auth/list');return [{id:'tablet',name:'Tablette'},{id:'system',system_generated:true}];}};
  const env=setup(hass,{users:['tablet']});await Promise.resolve();env.flush();
  assert.equal(calls,1);assert.deepEqual(plain(env.form._form.schema.find(x=>x.name==='users').selector.select.options),[
    {value:'tablet',label:'Tablette'},{value:'admin',label:'Loïc'}]);
  env.form.hass={...hass};env.flush();assert.equal(calls,1);assert.deepEqual(env.changes,[]);
  const limited=setup({...hass,user:{id:'tablet',name:'Tablette',is_admin:false},callWS:()=>{throw Error('must not enumerate');}},{users:['other']});
  assert.deepEqual(plain(limited.form._form.schema.find(x=>x.name==='users').selector.select.options),[
    {value:'tablet',label:'Tablette'},{value:'other',label:'other'}]);
});
