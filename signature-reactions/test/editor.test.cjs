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
    _itemFormData(value){return {...value};}
    _generateSchema(fields){return Object.entries(fields).map(([name,field])=>({name,selector:field.selector}));}
    _itemChanged(event){this.dispatchEvent(new CustomEvent('value-changed',{detail:event.detail}));}
    _computeLabel(field){return this.selector.bc_object.fields[field.name].label;}
    _computeHelper(field){return this.selector.bc_object.fields[field.name].description;}
  }
  env.customElements.define('ha-selector-bc_object',Engine);
  env.evaluate(editorBootstrap(definition));
  const form=env.document.createElement('ha-form-signature_reactions_options_v1');
  Object.assign(form,{hass,data,schema});form.isConnected=true;form.connectedCallback();env.flush();
  const changes=[];form.addEventListener('value-changed',event=>changes.push(plain(event.detail.value)));
  const change=patch=>{form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,...patch}}}));env.flush();};
  return {...env,form,changes,change};
}
test('French editor uses native repeated rules, action selectors, Jinja and conditional fields',()=>{
  const list=schema.fields.rules.selector.bc_object;
  assert.equal(list.multiple,true);assert.equal(list.label_field,'id');
  assert.deepEqual(list.fields.action.selector,{ui_action:{default_action:'none'}});
  assert.deepEqual(list.fields.return_action.selector,{ui_action:{default_action:'none'}});
  assert.deepEqual(list.fields.template.selector,{template:{}});
  for(const trigger of ['template','entity','event','idle']){
    const visible=Object.entries(list.fields).filter(([,field])=>!field.visible_if||new Function('item','return '+field.visible_if)({trigger})).map(([key])=>key);
    assert.equal(visible.includes('template'),trigger==='template');assert.equal(visible.includes('seconds'),trigger==='idle');
    assert.equal(visible.includes('event_type'),trigger==='event');
  }
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
