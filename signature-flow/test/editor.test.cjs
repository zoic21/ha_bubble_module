const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {test}=require('node:test');
const YAML=require('yaml');
const {editorBootstrap}=require('../../shared/test/editor-bootstrap.cjs');
const {readSource}=require('../../scripts/source-files.cjs');
const definition=YAML.parse(fs.readFileSync(path.resolve(__dirname,'../dist/signature-flow.yaml'),'utf8')).signature_flow;
const schema=definition.editor.find(field=>field.type==='signature_flow_options');
const slots=schema.fields.slots.fields;
const fields=slots[1].fields;
const bootstrap=editorBootstrap(definition);
const flatten=schema=>schema.flatMap(field=>field.schema?flatten(field.schema):[field]);

// Native-shaped form fixtures exercise the bridge; they are not a Home Assistant runtime.
function environment() {
  const registry=new Map(),queue=[];
  class Element extends EventTarget {
    constructor(){super();this.children=[];this.isConnected=false;}
    append(...children){this.children.push(...children);}
    attachShadow(){return this.shadowRoot=new Element();}
    getRootNode(){return {host:{_config:this.card}};}
  }
  class Engine extends Element {
    _itemFormData(value){return {...value,__card_entity:this.getRootNode().host._config.entity};}
    _generateSchema(fields,item){
      const schema=[],groups=new Map();
      for(const [name,field] of Object.entries(fields)) {
        if(field.visible_if&&!new Function('item','hass','card','return !!('+field.visible_if+');')(item,this.hass,this.getRootNode().host._config))continue;
        const input={name,selector:field.selector};
        if(!field.group){schema.push(input);continue;}
        if(!groups.has(field.group)){
          const group={name:'bc_group_'+groups.size,type:'bc_group',flatten:true,title:field.group,schema:[]};groups.set(field.group,group);schema.push(group);
        }
        groups.get(field.group).schema.push(input);
      }
      return schema;
    }
    _computeLabel(field){return this.selector.bc_object.fields[field.name].label;}
    _computeHelper(field){return this.selector.bc_object.fields[field.name].description||'';}
    _itemChanged(event){
      event.stopPropagation();const value={...event.detail.value};delete value.__card_entity;
      this.dispatchEvent(new CustomEvent('value-changed',{detail:{value},bubbles:true,composed:true}));
    }
  }
  const customElements={get:name=>registry.get(name),define:(name,Class)=>registry.set(name,Class)};
  customElements.define('ha-selector-bc_object',Engine);
  customElements.define('ha-form-bc_group',class extends Element {});
  const document={createElement(name){const element=new (registry.get(name)||Element)();element.tag=name;return element;}};
  const context=vm.createContext({HTMLElement:Element,customElements,document,CustomEvent,queueMicrotask:fn=>queue.push(fn)});
  vm.runInContext(bootstrap,context);
  const flush=()=>{while(queue.length)queue.shift()();};
  const create=(schema,data,card={card_type:'button',button_type:'state',entity:'sensor.home'})=>{
    const element=document.createElement('ha-form-signature_flow_options');
    Object.assign(element,{schema,data,card,hass:{states:{}},label:schema.label});element.isConnected=true;element.connectedCallback();flush();return element;
  };
  return {create,flush};
}

test('Flow editor keeps the module, six slot mappings and per-slot animation keys',()=>{
  assert.equal(schema.name,'');assert.equal(schema.selector,undefined);
  assert.deepEqual(Object.keys(schema.fields).sort(),['animation','deadband','height','name','slots']);
  assert.deepEqual(Object.keys(slots),['1','2','3','4','5','6']);
  const runtime=[...new Set([...readSource('signature-flow/src/runtime.js').matchAll(/\bcfg\.([a-z_]+)/g)].map(match=>match[1]))];
  for(const prefix of ['primary','secondary'])for(const suffix of ['unit','scale','precision','tap_action','hold_action','double_tap_action'])runtime.push(prefix+'_'+suffix);
  runtime.push('enabled','primary','secondary');
  assert.deepEqual(Object.keys(fields).sort(),[...new Set(runtime)].sort());
  for(const slot of Object.values(slots)) {
    assert.equal(slot.slot,true);assert.deepEqual(slot.fields,fields);
    assert.deepEqual(Object.keys(slot.fields.animation.fields).sort(),['max_arrows','reference','speed']);
    for(const key of ['speed','max_arrows','reference'])assert.equal(slot.fields.animation.fields[key].default,undefined,'Omitted per-slot settings must inherit the global settings');
  }
  for(const key of ['primary','secondary','name','icon'])assert.ok(fields[key].selector.text,'Mixed Jinja/text fields must retain their types');
  for(const key of ['tap_action','hold_action','double_tap_action','primary_tap_action','primary_hold_action','primary_double_tap_action','secondary_tap_action','secondary_hold_action','secondary_double_tap_action'])assert.ok(fields[key].selector.ui_action,'Lovelace actions must use the native object selector');
});

test('Flow editor opens directly and converts nested scopes inside their existing groups',()=>{
  const env=environment(),form=env.create(schema,{});
  assert.deepEqual(form.shadowRoot.children.map(child=>child.tag),['style','label','ha-form']);
  const nested=flatten(form._form.schema).filter(field=>field.fields);
  assert.deepEqual(nested.map(field=>field.name),['animation','slots']);
  for(const field of nested){assert.equal(field.type,'signature_flow_options');assert.equal(Object.hasOwn(field,'selector'),false);assert.equal(field.show_label,false);}
  const slotForm=env.create(nested.find(field=>field.name==='slots'),{});
  assert.equal(slotForm._form.schema.length,6);
  assert.ok(slotForm._form.schema.every(group=>group.type==='signature_group'&&group.schema.length===1));
  assert.ok(slotForm._form.schema.every(group=>group.flatten&&group.name.startsWith('bc_group_')),'Grouping must preserve the native flat data path');
  for(const field of flatten(slotForm._form.schema)){assert.equal(field.type,'signature_flow_options');assert.equal(field.slot,true);}
  assert.deepEqual(env.create(schema,{}, {card_type:'cover'})._form.schema,[]);
  assert.deepEqual(env.create(schema,{}, {card_type:'button',button_type:'slider'})._form.schema,[]);
});

test('opening absent slots creates no data and shows disabled, existing slots default to enabled',()=>{
  const env=environment(),schema={...slots[1],slot:true};
  const absent=env.create(schema,undefined);
  const changes=[];absent.addEventListener('value-changed',event=>changes.push(event));
  assert.equal(absent._form.data.enabled,false);
  assert.deepEqual(flatten(absent._form.schema).map(field=>field.name),['enabled']);
  env.flush();assert.equal(changes.length,0);
  const existing=env.create(schema,{primary:'sensor.power'});
  assert.equal(existing._form.data.enabled,true);assert.equal(existing._form.data.animate,true);
  assert.equal(existing._form.data.invert_flow,false);
  assert.equal(existing.data.enabled,undefined,'Opening the form must not mutate the stored slot');
});

test('Flow fields follow enablement, animation and entity versus template formatting',()=>{
  const env=environment(),schema={...slots[1],slot:true};
  const visible=data=>{
    const form=env.create(schema,data);
    assert.ok(form._form.schema.filter(field=>field.schema).every(field=>field.type==='signature_group'),'Appearance, formatting, flow, animation and action sections must all use native panel corners');
    return flatten(form._form.schema).map(field=>field.name);
  };
  const direct=visible({primary:'sensor.power',secondary:'sensor.battery'});
  for(const key of ['primary_scale','primary_precision','secondary_scale','secondary_precision','flow_entity','animation'])assert.ok(direct.includes(key),key);
  const template=visible({primary:"{{ states('sensor.power') }}",secondary:'Fixed text'});
  for(const key of ['primary_scale','primary_precision','secondary_scale','secondary_precision'])assert.ok(!template.includes(key),key);
  assert.ok(template.includes('secondary_unit'));assert.ok(template.includes('flow_entity'));
  const noSecondary=visible({primary:'sensor.power'});
  assert.ok(!noSecondary.includes('secondary_unit'));assert.ok(!noSecondary.includes('secondary_tap_action'));
  const paused=visible({primary:'sensor.power',animate:false});
  for(const key of ['flow_entity','flow_scale','flow_unit','invert_flow','deadband','animation'])assert.ok(!paused.includes(key),key);
  assert.ok(paused.includes('animate'));
  assert.deepEqual(visible({primary:'sensor.power',enabled:false}),['enabled']);
});

test('editing a slot retains hidden settings, numeric zeros, Jinja and action objects',()=>{
  const env=environment(),schema={...slots[6],slot:true};
  const original={primary:"{{ states('sensor.water') }}",secondary:'',animate:false,primary_scale:0,secondary_precision:0,flow_scale:0,deadband:0,
    animation:{speed:18,max_arrows:3,reference:20},tap_action:{action:'navigate',navigation_path:'#water-details'},custom:{keep:true}};
  const form=env.create(schema,original),changes=[];
  form.addEventListener('value-changed',event=>changes.push(event.detail.value));
  form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,color:'#009688'}}}));
  assert.equal(changes.length,1);
  assert.deepEqual(changes[0],{...original,color:'#009688',enabled:true,invert_flow:false});
  form.data={...original,enabled:false};env.flush();
  assert.deepEqual(flatten(form._form.schema).map(field=>field.name),['enabled']);
  const animation=env.create({...fields.animation,name:'animation'},original.animation);
  assert.equal(animation._form.data.reference,20);
  assert.equal(animation._form.schema.find(field=>field.name==='speed').selector.number.min,1);
});

test('native action defaults match detected entities for direct values, Jinja and fixed text',()=>{
  const env=environment(),schema={...slots[1],slot:true};
  for(const [primary,action] of [['sensor.power','more-info'],["{{ states('sensor.power') }}",'more-info'],['{{ states.sensor.power.state }}','more-info'],['{{ states(dynamic) }}','none'],['Fixed text','none']]){
    const form=env.create(schema,{primary,secondary:primary}),inputs=flatten(form._form.schema);
    for(const key of ['tap_action','hold_action','primary_tap_action','primary_hold_action','secondary_tap_action','secondary_hold_action'])assert.equal(inputs.find(field=>field.name===key).selector.ui_action.default_action,action,key+' '+primary);
    for(const key of ['double_tap_action','primary_double_tap_action','secondary_double_tap_action'])assert.equal(inputs.find(field=>field.name===key).selector.ui_action.default_action,'none');
  }
});
