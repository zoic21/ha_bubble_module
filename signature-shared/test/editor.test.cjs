const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const YAML = require('yaml');
const {editorBootstrap} = require('../../shared/test/editor-bootstrap.cjs');

const definition = YAML.parse(fs.readFileSync(path.resolve(__dirname,'../../signature-compact/dist/signature-compact.yaml'),'utf8')).signature_compact;
const source = editorBootstrap(definition);
const schema = definition.editor.find(field=>field.type === 'signature_options');

// Exercise the native-form bridge; Bubble's field rules are covered separately.
function environment({delayed=false}={}) {
  const registry = new Map(),waiting = new Map(),queue = [];
  class Element extends EventTarget {
    constructor() { super();this.children=[];this.isConnected=false; }
    append(...elements) { this.children.push(...elements); }
    attachShadow() { this.shadowRoot=new Element();return this.shadowRoot; }
    getRootNode() { return {host:{_config:this.card}}; }
  }
  class Engine extends Element {
    _itemFormData(value) { return {...value,__card_entity:this.getRootNode().host._config.entity}; }
    _generateSchema(fields,data) {
      this._warnTop={0:{color:'warning'}};
      return Object.entries(fields).filter(([,field])=>!field.visible_if || new Function('item','hass','card','return !!('+field.visible_if+');')(data,this.hass,this.getRootNode().host._config)).map(([name,field])=>({name,selector:field.selector}));
    }
    _computeLabel(field) { return this.selector.bc_object.fields[field.name].label; }
    _computeHelper(field) { return this.selector.bc_object.fields[field.name].description || ''; }
    _itemChanged(event) {
      event.stopPropagation();
      const value={...event.detail.value};delete value.__card_entity;
      this.dispatchEvent(new CustomEvent('value-changed',{detail:{value},bubbles:true,composed:true}));
    }
  }
  const customElements={
    get:name=>registry.get(name),
    define(name,Class) { registry.set(name,Class);waiting.get(name)?.(); },
    whenDefined:name=>new Promise(resolve=>waiting.set(name,resolve))
  };
  if (!delayed) customElements.define('ha-selector-bc_object',Engine);
  const document={createElement(name) { const element=new (registry.get(name) || Element)();element.tag=name;return element; }};
  const context=vm.createContext({HTMLElement:Element,document,customElements,CustomEvent,queueMicrotask:fn=>queue.push(fn)});
  const register=()=>vm.runInContext(source,context);
  const flush=()=>{while(queue.length) queue.shift()();};
  register();
  const create=(data,card) => {
    const form=document.createElement('ha-form-signature_options');
    form.card=card;
    Object.assign(form,{data,schema,hass:{states:{}},label:schema.label,disabled:false});
    form.isConnected=true;form.connectedCallback();flush();return form;
  };
  return {create,flush,register,registry,Engine,customElements};
}

test('inline editor has one native form without an object header or delete control',() => {
  const env=environment();
  const form=env.create({compact_mode:'value'},{card_type:'button',button_type:'state',entity:'sensor.temperature'});
  assert.deepEqual(form.shadowRoot.children.map(child=>child.tag),['style','label','ha-form']);
  assert.equal(form._labelEl.textContent,schema.label);
  assert.equal(form._form.schema.filter(field=>field.name === 'color').length,1);
  assert.equal(form._form.computeLabel({name:'color'}),schema.fields.color.label);
  assert.equal(form._form.data.__card_entity,'sensor.temperature');
  assert.equal(form._form.warning.color,'warning');
  assert.equal(form._form.computeWarning('warning'),'warning');
  assert.equal(form._engine.isConnected,false,'The object selector UI must never mount');
  const Class=env.registry.get('ha-form-signature_options');
  env.register();assert.equal(env.registry.get('ha-form-signature_options'),Class);
});

test('inline editor forwards flat values once and refreshes native card context',() => {
  const env=environment();
  const original={compact_mode:'value',icon_opacity:0,secondary:"{{ states('sensor.temperature') }}",sub_button_styles:{'1':{opacity:0}}};
  const form=env.create(original,{card_type:'button',entity:'sensor.temperature'});
  const changes=[];
  form.addEventListener('value-changed',event=>changes.push(event));
  form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,color:'teal'}}}));
  assert.equal(changes.length,1);
  assert.equal(changes[0].target,form);
  assert.equal(changes[0].bubbles,true);assert.equal(changes[0].composed,true);
  assert.deepEqual(changes[0].detail.value,{...original,color:'teal'});
  const engine=form._engine,native=form._form;
  form.data={...original,color:'orange'};
  form.card={card_type:'media-player',entity:'sensor.humidity'};
  form.disabled=true;env.flush();
  assert.equal(form._engine,engine);assert.equal(form._form,native);
  assert.equal(form._form.data.__card_entity,'sensor.humidity');
  assert.equal(form._form.disabled,true);
  assert.deepEqual(form._form.schema.map(field=>field.name),['color','color_background']);
  assert.ok(!form._form.schema.some(field=>field.name === 'auto_height'));
});

test('inline editor handles late Bubble selector loading and reconnects with fresh data',async () => {
  const env=environment({delayed:true});
  const form=env.create({compact_mode:'value'},{entity:'sensor.temperature'});
  assert.equal(form._engine,undefined);
  form.isConnected=false;
  env.customElements.define('ha-selector-bc_object',env.Engine);
  await Promise.resolve();env.flush();
  assert.equal(form._engine,undefined,'A detached editor must not be initialized');
  form.data={color:'teal'};form.isConnected=true;form.connectedCallback();env.flush();
  assert.equal(form._form.data.color,'teal');
  assert.ok(form._form.schema.some(field=>field.name === 'color'));
});

test('editor groups inherit native behavior and retain flat paths and warning metadata',()=>{
  const env=environment();
  class NativeGroup {
    render(){return 'native-group';}
  }
  env.customElements.define('ha-form-bc_group',NativeGroup);
  const warnings={controls:'warning'};
  env.Engine.prototype._generateSchema=()=>[{name:'bc_group_0',type:'bc_group',flatten:true,title:'Commandes',warnings,schema:[{name:'controls',selector:{select:{}}}]}];
  const form=env.create({compact_mode:'value'},{card_type:'button'});
  const Styled=env.customElements.get('ha-form-signature_group');
  assert.ok(Styled.prototype instanceof NativeGroup);
  assert.equal(Styled.prototype.render,NativeGroup.prototype.render,'The native rendering and warnings must not be replaced');
  const [group]=form._form.schema;
  assert.equal(group.type,'signature_group');assert.equal(group.flatten,true);
  assert.equal(group.name,'bc_group_0');assert.equal(group.warnings,warnings);
  assert.equal(group.schema[0].name,'controls');
});
