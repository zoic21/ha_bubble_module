const assert=require('node:assert/strict');
const {test}=require('node:test');
const {loadModule}=require('../../shared/test/module.cjs');
const {editorEnvironment}=require('../../shared/test/editor-environment.cjs');
const {editorBootstrap}=require('../../shared/test/editor-bootstrap.cjs');
const plain=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function environment(){
  const env=editorEnvironment();
  class Engine extends env.Element {
    _itemFormData(value){return {...value};}
    _generateSchema(fields,data){return Object.entries(fields).filter(([,f])=>!f.visible_if||new Function('item','hass','card','return !!('+f.visible_if+');')(data,this.hass,this.getRootNode().host._config)).map(([name,f])=>({name,selector:f.selector}));}
    _computeLabel(field){return this.selector.bc_object.fields[field.name].label;}
    _computeHelper(field){return this.selector.bc_object.fields[field.name].description;}
    _itemChanged(event){event.stopPropagation();this.dispatchEvent(new CustomEvent('value-changed',{detail:event.detail}));}
  }
  env.customElements.define('ha-selector-bc_object',Engine);
  env.evaluate(editorBootstrap(loadModule('signature-compact')));
  const mount=(schema,data,card={})=>{
    const form=env.document.createElement('ha-form-signature_guided_v1');
    Object.assign(form,{schema:{fields:{},...schema},data,hass:{states:{},user:{id:'admin'}},card});
    form.isConnected=true;form.connectedCallback();env.flush();
    form.changes=[];form.addEventListener('value-changed',event=>form.changes.push(plain(event.detail.value)));
    return form;
  };
  const create=(kind,data,extra={},card)=>mount({ui_kind:kind,...extra},data,card);
  const change=(form,value)=>{form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,...value}}}));env.flush();return form.changes.at(-1);};
  const accept=form=>{form.data=form.changes.at(-1);env.flush();};
  const list=(form,rows)=>{form._list.dispatchEvent(new CustomEvent('value-changed',{detail:{value:rows}}));env.flush();return form.changes.at(-1);};
  return {...env,mount,create,change,accept,list};
}
test('guided forms never write on open/reconnect, including unknown fields and unsupported YAML shapes',()=>{
  const env=environment();
  const cases=[['bool',false],['bool',true],['bool',null],['number',0],['number','{{ states("sensor.x") }}'],['color','var(--accent-color)'],['palette','#123456, #abcdef, #123ABC'],['strings',[]],['source','sensor.x'],['source','{{ states(entity) }}'],['source_object','sensor.x'],['illustration',{image:'/local/a.png',index:0,future:{flag:false}}],['thresholds',{enabled:false,values:[{value:0,color:'#123'}],custom:0}],['fill',{max:0,reference_entity:'sensor.total',future:false}],['animation',{}],['animation',{speed:18,future:true}],['segments',[{name:'X'},undefined,{color:'blue'}, {future:true}]],['styles',{'1':{type:'future',opacity:0}}],['styles',false],['list',{unsupported:true}],['illustration',false]];
  for(const [kind,data]of cases){const original=plain(data),form=env.create(kind,data);assert.deepEqual(form.changes,[],kind);form.isConnected=false;form.connectedCallback();env.flush();form.isConnected=true;form.connectedCallback();env.flush();assert.deepEqual(form.changes,[],kind);assert.deepEqual(plain(form.data),original,kind);}
});
test('guided scalar modes preserve templates and allow native booleans, zero, RGB and original palette strings',()=>{
  const env=environment(),flag=env.create('bool',true);
  assert.equal(env.change(flag,{value:false}),false);
  const n=env.create('number',0);env.change(n,{input_mode:'template'});assert.deepEqual(n.changes,[]);
  assert.equal(env.change(n,{template:'{{ states("sensor.level") }}'}),'{{ states("sensor.level") }}');env.accept(n);
  assert.equal(env.change(n,{template:''}),undefined);
  assert.equal(env.change(n,{input_mode:'auto'}),undefined);
  const p=env.create('palette','#123456, #abcdef, #123ABC');
  env.change(p,{input_mode:'value'});assert.deepEqual(p.changes,[]);
  assert.equal(env.change(p,{color_1:[255,0,0]}),'#123456,#ff0000,#123ABC');
  const source=env.create('source','sensor.test');assert.equal(source._form.data.input_mode,'entity');
  env.change(source,{input_mode:'template'});assert.deepEqual(source.changes,[]);
  assert.equal(env.change(source,{template:'{{ states("sensor.other") }}'}),'{{ states("sensor.other") }}');
});
test('fill reference changes activate the stored fixed maximum without deleting hidden settings',()=>{
  const env=environment(),form=env.create('fill',{reference_entity:'sensor.total',max:100,future:false});
  assert.equal(form._form.data.ui_reference,'entity');
  assert.deepEqual(env.change(form,{ui_reference:'max'}),{max:100,future:false});
  const empty=env.create('fill',{max:100});env.change(empty,{ui_reference:'entity'});assert.deepEqual(empty.changes,[]);
  assert.deepEqual(env.change(empty,{reference_entity:'sensor.other'}),{max:100,reference_entity:'sensor.other'});
});
test('RGB clearing and complete list YAML editing retain the supported legacy shapes',()=>{
  const env=environment(),color=env.create('rgb','#123');
  assert.equal(env.change(color,{value:undefined}),undefined);
  const form=env.create('list',[{entity:'sensor.x',future:false}],{ui_item_kind:'information',ui_max:2});
  env.change(form,{edit_mode:'yaml'});assert.deepEqual(form.changes,[]);
  const raw=[{entity:'sensor.y',future:{x:0}}];assert.deepEqual(env.change(form,{raw}),raw);
});
test('object editing changes only requested fields and YAML/form switches retain the full original object',()=>{
  const env=environment(),original={image:'/local/day.png',image_dark:'/local/night.png',index:0,columns:4,future:{enabled:false}};
  const form=env.create('illustration',original,{}, {modules:['signature_square']});
  env.change(form,{edit_mode:'yaml'});assert.deepEqual(form.changes,[]);
  env.change(form,{edit_mode:'form'});assert.deepEqual(form.changes,[]);
  assert.deepEqual(env.change(form,{image:'/local/new.png'}),{...original,image:'/local/new.png'});
  assert.ok(!Object.hasOwn(form.changes[0],'edit_mode'));assert.ok(!Object.hasOwn(form.changes[0],'raw'));
  const unsupported=env.create('illustration',false);env.change(unsupported,{edit_mode:'form'});assert.deepEqual(unsupported.changes,[]);
});
test('source objects keep shorthand, explicit empty units and arbitrary properties when advanced values change',()=>{
  const env=environment(),fields={entity:{label:'Entité',selector:{entity:{}}},unit:{label:'Unité',selector:{text:{}}},precision:{label:'Décimales',selector:{number:{}}}};
  const short=env.create('source_object','sensor.x',{ui_fields:fields});assert.equal(short._form.data.entity,'sensor.x');
  assert.equal(env.change(short,{entity:'sensor.y'}),'sensor.y');
  const advanced=env.create('source_object',{entity:'sensor.x',unit:'',scale:0,future:false},{ui_fields:fields});
  assert.deepEqual(env.change(advanced,{precision:0}),{entity:'sensor.x',unit:'',scale:0,future:false,precision:0});
  const clear=env.create('source_object','sensor.x',{ui_fields:fields});assert.equal(env.change(clear,{entity:''}),undefined);
});
test('Compact single choice writes only legacy value keys and retains hidden background settings',()=>{
  const env=environment(),definition=loadModule('signature-compact'),schema=definition.editor.find(x=>x.fields);
  const form=env.mount(schema,{color:'teal',future:false,value_background:false});
  const guided=form._form.schema.filter(field=>field.type==='signature_guided_v1');
  assert.ok(guided.length>0);
  assert.ok(guided.every(field=>!Object.hasOwn(field,'selector')),'HA must render the guided component rather than its old YAML selector');
  assert.equal(form._form.data.value_presentation,'standard');
  assert.deepEqual(env.change(form,{value_presentation:'pill'}),{color:'teal',future:false,compact_mode:'value',value_style:'button',value_background:true});env.accept(form);
  assert.deepEqual(env.change(form,{value_presentation:'standard'}),{color:'teal',future:false,compact_mode:'default',value_style:'button',value_background:true});
  assert.equal(Object.hasOwn(form.changes.at(-1),'value_presentation'),false);
});
test('local measurements are added as drafts and clearing the final configured source restores absence',()=>{
  const env=environment(),fields={temperature:{label:'Température',ui_kind:'source_object',ui_fields:{entity:{selector:{entity:{}}}},selector:{object:{}}},humidity:{label:'Humidité',selector:{object:{}}}};
  const form=env.create('locals',{temperature:'sensor.temp'},{ui_fields:fields,ui_source_names:{temperature:'Température',humidity:'Humidité'}});
  assert.ok(!form._form.schema.some(x=>x.name==='humidity'));
  env.change(form,{ui_sources:['temperature','humidity']});assert.deepEqual(form.changes,[]);assert.ok(form._form.schema.some(x=>x.name==='humidity'));
  assert.deepEqual(env.change(form,{humidity:'sensor.hum'}),{temperature:'sensor.temp',humidity:'sensor.hum'});
  const clear=env.create('locals',{temperature:'sensor.temp'},{ui_fields:fields,ui_source_names:{temperature:'Température',humidity:'Humidité'}});
  assert.equal(env.change(clear,{ui_sources:[]}),undefined);
});
test('animation inheritance preserves omitted overrides and clearing customization retains unknown settings',()=>{
  const env=environment(),form=env.create('animation',{speed:18,future:false});
  assert.equal(form._form.data.ui_custom,true);
  assert.deepEqual(env.change(form,{max_arrows:3}),{speed:18,future:false,max_arrows:3});
  assert.deepEqual(env.change(form,{ui_custom:false}),{future:false});
  const absent=env.create('animation',undefined);env.change(absent,{ui_custom:true});assert.deepEqual(absent.changes,[]);
  assert.deepEqual(env.change(absent,{speed:24}),{speed:24});
});
test('sub-button styles use stable classes, retain unknown numeric targets and block duplicate rows',()=>{
  const env=environment(),card={modules:['signature_panel'],sub_button:{main:[{name:'Mode',css_class:'house-mode'},{name:'Autre'}]}},original={'7':{type:'future',active:false,custom:0}};
  const form=env.create('styles',original,{},card);
  const choices=form._list.selector.bc_object.fields.target.selector.select.options;
  assert.deepEqual(plain(choices),[{value:'house-mode',label:'1 — Mode'},{value:'2',label:'2 — Autre'},{value:'7',label:'7'}]);
  env.list(form,[...plain(form._list.value),{}]);assert.deepEqual(form.changes,[]);
  assert.deepEqual(env.list(form,[...plain(form._list.value),{target:'house-mode',settings:{type:'badge'}}]),{...original,'house-mode':{type:'badge'}});
  env.list(form,[{target:'2',settings:{}},{target:'2',settings:{}}]);assert.equal(form._errorEl.hidden,false);
  assert.deepEqual(env.list(form,[]),{});
});
test('information lists retain all entry properties and reject a third new row without dropping it',()=>{
  const env=environment(),original=[{entity:'sensor.a',future:false},{state:'{{ value }}',tap_action:{action:'navigate',navigation_path:'#a'}}];
  const form=env.create('list',original,{ui_item_kind:'information',ui_max:2});
  assert.ok(form._list.selector.bc_object.fields.statistics.ui_kind);
  env.list(form,[...original,{entity:'sensor.c'}]);assert.deepEqual(form.changes,[]);assert.equal(form._errorEl.hidden,false);assert.equal(form._list.value.length,3);
  assert.deepEqual(env.list(form,[original[1]]),[original[1]]);
});
test('energy form retains incomplete edits locally and validates sources across all groups',()=>{
  const env=environment(),schema=loadModule('signature-energy-balance').editor.find(x=>x.fields),form=env.mount(schema,{imports:['sensor.grid'],future:false});
  env.change(form,{solar:['sensor.grid']});assert.deepEqual(form.changes,[]);assert.equal(form._errorEl.hidden,false);
  assert.deepEqual(env.change(form,{imports:['sensor.other']}),{imports:['sensor.other'],solar:['sensor.grid'],future:false});
});
