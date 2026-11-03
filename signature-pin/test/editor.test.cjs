const assert = require('node:assert/strict');
const {test} = require('node:test');
const {createHash} = require('node:crypto');
const {loadModule} = require('../../shared/test/module.cjs');
const {editorEnvironment} = require('../../shared/test/editor-environment.cjs');
const {editorBootstrap} = require('../../shared/test/editor-bootstrap.cjs');
const definition = loadModule('signature-pin');
const schema = definition.editor.find(field => field.type === 'signature_pin_hash_options');
const digest = pin => createHash('sha256').update(pin).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
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
  const OldEditor = class extends env.Element {};
  env.customElements.define('ha-form-signature_pin_options', OldEditor);
  env.evaluate(editorBootstrap(definition));
  assert.equal(env.customElements.get('ha-form-signature_pin_options'),OldEditor);
  const form = env.document.createElement('ha-form-signature_pin_hash_options');
  Object.assign(form, {hass, data, schema}); form.isConnected = true; form.connectedCallback(); env.flush();
  const changes=[]; form.addEventListener('value-changed',event=>changes.push(plain(event.detail.value)));
  const change = values => { form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,...values}}}));env.flush(); };
  const save = () => { form._saveCode.dispatchEvent(new Event('click'));env.flush();return changes.at(-1); };
  const accept = () => { form.data=changes.at(-1);env.flush(); };
  return {...env, form, changes, change, save, accept};
}
test('PIN editor exposes a blank replacement field and named multi-user selection without changing YAML on open', async () => {
  let calls = 0;
  const env = setup({user:{id:'admin',name:'Loïc',is_admin:true}, connection:{}, callWS:async message => {
    calls++; assert.equal(message.type,'config/auth/list');
    return [{id:'tablet',name:'Tablette',is_active:true},{id:'system',system_generated:true},{id:'inactive',is_active:false}];
  }}, {code_hash:digest('0073'),users:['tablet'],future:false});
  const {form,changes} = env;
  await Promise.resolve(); env.flush();
  assert.equal(calls,1);assert.deepEqual(changes,[]);
  assert.equal(form._form.schema.find(field=>field.name==='new_code').selector.text.type,'password');
  assert.equal(form._form.data.new_code,'');
  assert.equal(Object.hasOwn(form._form.data,'code'),false);assert.equal(Object.hasOwn(form._form.data,'code_hash'),false);
  assert.match(form._pinStatus.textContent,/ne peut pas être affiché/);
  assert.equal(form._saveCode.disabled,true);
  const users=form._form.schema.find(field=>field.name==='users').selector.select;
  assert.equal(users.multiple,true);
  assert.deepEqual(plain(users.options),[{value:'tablet',label:'Tablette'},{value:'admin',label:'Loïc'}]);
  env.change({users:[]});
  assert.deepEqual(changes[0],{code_hash:digest('0073'),users:[],future:false});
  form.hass={...form.hass};env.flush();assert.equal(calls,1);
});
test('draft prefixes never persist and saving emits only SHA-256, retaining leading zeros and other settings', () => {
  const env=setup({user:{id:'tablet'},connection:{}},{users:['tablet'],future:{value:0}});
  for(const new_code of ['0','00','007','0073'])env.change({new_code});
  assert.deepEqual(env.changes,[]);assert.equal(env.form._form.data.new_code,'0073');
  assert.equal(env.form._saveCode.disabled,false);
  assert.deepEqual(env.save(),{users:['tablet'],future:{value:0},code_hash:digest('0073')});
  env.accept();assert.equal(env.form._form.data.new_code,'');assert.equal(env.form._saveCode.disabled,true);
  assert.equal(JSON.stringify(env.changes).includes('0073'),false);
  assert.equal(Object.hasOwn(env.changes[0],'new_code'),false);assert.equal(Object.hasOwn(env.changes[0],'code'),false);
});
test('reopening never reveals a stored hash or PIN; empty edits preserve it and a new code replaces it', () => {
  const original={code_hash:digest('0073'),users:['tablet'],enabled:false,future:true};
  const env=setup({user:{id:'tablet'},connection:{}},original);
  env.change({new_code:''});assert.deepEqual(env.changes,[]);
  env.save();assert.deepEqual(env.changes,[]);
  env.change({new_code:'1234'});assert.deepEqual(env.changes,[]);
  assert.deepEqual(env.save(),{...original,code_hash:digest('1234')});
  env.accept();assert.equal(env.form._form.data.new_code,'');
  const reopened=setup({user:{id:'tablet'},connection:{}},env.changes.at(-1));
  assert.equal(reopened.form._form.data.new_code,'');assert.deepEqual(reopened.changes,[]);
});
test('an old plaintext PIN stays hidden and migrates on the next settings change without a conversion button', () => {
  const original={code:'0073',users:['tablet'],future:false};
  const env=setup({user:{id:'tablet'},connection:{}},original);
  assert.deepEqual(env.changes,[]);assert.equal(env.form._form.data.new_code,'');
  assert.equal(Object.hasOwn(env.form._form.data,'code'),false);
  assert.equal(env.form._saveCode.textContent,'Remplacer le code');
  assert.equal(env.form._saveCode.disabled,true);
  env.save();assert.deepEqual(env.changes,[]);
  env.change({users:[]});
  assert.deepEqual(env.changes[0],{users:[],future:false,code_hash:digest('0073')});
  env.accept();assert.match(env.form._pinStatus.textContent,/ne peut pas être affiché/);
  const replacement=setup({user:{id:'tablet'},connection:{}},original);
  replacement.change({new_code:'1234'});
  assert.deepEqual(replacement.save(),{users:['tablet'],future:false,code_hash:digest('1234')});
});
test('invalid PIN drafts and disabled forms cannot save a replacement', () => {
  const env=setup({user:{id:'tablet'},connection:{}},{code_hash:digest('0073')});
  for(const new_code of ['abc','12 34','12.34','１２３４']){
    env.change({new_code});assert.equal(env.form._saveCode.disabled,true);env.save();
  }
  assert.deepEqual(env.changes,[]);assert.match(env.form._pinStatus.textContent,/uniquement des chiffres/);
  env.change({new_code:'5678'});env.form.disabled=true;env.flush();env.save();assert.deepEqual(env.changes,[]);
});
test('limited editor never enumerates accounts and retains manually saved IDs', () => {
  const env=setup({user:{id:'tablet',name:'Tablette',is_admin:false},connection:{},callWS:()=>{throw Error('must not run');}}, {code_hash:digest('0073'),users:['other']});
  const options=env.form._form.schema.find(field=>field.name==='users').selector.select.options;
  assert.deepEqual(plain(options),[{value:'tablet',label:'Tablette'},{value:'other',label:'other'}]);
  assert.equal(env.form._form.data.new_code,'');
});
