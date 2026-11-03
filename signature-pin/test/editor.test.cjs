const assert = require('node:assert/strict');
const {test} = require('node:test');
const {loadModule} = require('../../shared/test/module.cjs');
const {editorEnvironment} = require('../../shared/test/editor-environment.cjs');
const {editorBootstrap} = require('../../shared/test/editor-bootstrap.cjs');
const definition = loadModule('signature-pin');
const schema = definition.editor.find(field => field.type === 'signature_pin_options');
function setup(hass, data = {}) {
  const env = editorEnvironment();
  class Engine extends env.Element {
    _itemFormData(value) { return value; }
    _generateSchema(fields) { return Object.entries(fields).map(([name,field]) => ({name, selector: field.selector})); }
    _computeLabel(field) { return this.selector.bc_object.fields[field.name].label; }
    _computeHelper(field) { return this.selector.bc_object.fields[field.name].description; }
    _itemChanged(event) { this.dispatchEvent(new CustomEvent('value-changed', {detail: event.detail})); }
  }
  env.customElements.define('ha-selector-bc_object', Engine);
  env.evaluate(editorBootstrap(definition));
  const form = env.document.createElement('ha-form-signature_pin_options');
  Object.assign(form, {hass, data, schema}); form.isConnected = true; form.connectedCallback(); env.flush();
  return {...env, form};
}
test('PIN editor exposes activation, password and named multi-user selection without changing YAML on open', async () => {
  let calls = 0;
  const env = setup({user:{id:'admin',name:'Loïc',is_admin:true}, connection:{}, callWS:async message => {
    calls++; assert.equal(message.type,'config/auth/list');
    return [{id:'tablet',name:'Tablette',is_active:true},{id:'system',system_generated:true},{id:'inactive',is_active:false}];
  }}, {code:'0073',users:['tablet'],future:false});
  const {form} = env; const changes = [];
  form.addEventListener('value-changed',event => changes.push(event.detail.value));
  await Promise.resolve(); env.flush();
  assert.equal(calls,1);
  assert.deepEqual(changes,[]);
  assert.equal(form._form.schema.find(field=>field.name==='code').selector.text.type,'password');
  const users=form._form.schema.find(field=>field.name==='users').selector.select;
  assert.equal(users.multiple,true);
  assert.equal(JSON.stringify(users.options),JSON.stringify([{value:'tablet',label:'Tablette'},{value:'admin',label:'Loïc'}]));
  form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,users:[]}}}));
  assert.equal(JSON.stringify(changes[0]),JSON.stringify({code:'0073',users:[],future:false}));
  form.hass={...form.hass};env.flush(); assert.equal(calls,1);
});
test('limited editor never enumerates accounts and retains manually saved IDs', () => {
  const env=setup({user:{id:'tablet',name:'Tablette',is_admin:false},connection:{},callWS:()=>{throw Error('must not run');}}, {code:'0073',users:['other']});
  const options=env.form._form.schema.find(field=>field.name==='users').selector.select.options;
  assert.equal(JSON.stringify(options),JSON.stringify([{value:'tablet',label:'Tablette'},{value:'other',label:'other'}]));
  assert.equal(env.form._form.data.code,'0073');
});
