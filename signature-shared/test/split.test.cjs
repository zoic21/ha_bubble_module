const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const YAML = require('yaml');
const {build, layouts} = require('../../scripts/build-signature.cjs');
const root = path.resolve(__dirname, '../..');
const legacy = YAML.parse(fs.readFileSync(path.join(root, 'signature/dist/signature.yaml'), 'utf8')).signature;
const definitions = Object.fromEntries(layouts.map(layout => [layout, YAML.parse(fs.readFileSync(path.join(root, 'signature-' + layout + '/dist/signature-' + layout + '.yaml'), 'utf8'))['signature_' + layout]]));

// The behavior comparison exercises both actual distributions independently
// in a native-shaped DOM, without executing Home Assistant itself.
const context = vm.createContext({...require('./dom.cjs'), Intl, setTimeout, clearTimeout});
const compile = definition => vm.runInContext('(function(hass,onTeardown,renderTemplate){return `' + definition.code + '`;})', context);
const renders = new Map([legacy,...Object.values(definitions)].map(d => [d, compile(d)]));

function fixture(layout, options = {}, config = {}, states = {}, old = false) {
  const Element = context.Element;
  const card = new Element(), wrapper = new Element(), content = new Element(), names = new Element(), state = new Element(), icon = new Element(), subs = new Element();
  wrapper.className = 'bubble-wrapper';content.className = 'bubble-content-container';names.className = 'bubble-name-container';state.className = 'bubble-state';icon.className = 'bubble-icon-container';subs.className = 'bubble-sub-button-container';
  card.append(wrapper);wrapper.append(content,subs);content.append(icon,names);names.append(state);
  const entity = 'sensor.demo';
  state.textContent = '22,5 °C';
  const key = old ? 'signature' : 'signature_' + layout;
  const cfg = {card_type:'button',button_type:layout === 'header' || layout === 'room' ? 'name' : 'state',entity,show_state:layout !== 'header' && layout !== 'room',[key]:old ? {layout,...options} : options,...config};
  if (cfg.show_state === false) state.classList.add('hidden');
  const buttons = cfg.sub_button?.main || [];
  buttons.forEach((b,i) => {
    const el = new Element(), label = new Element(), buttonIcon = new Element();
    el.className = 'bubble-sub-button bubble-sub-button-' + (i+1) + ' ' + b.css_class;
    label.className = 'bubble-sub-button-name-container';label.textContent = b.css_class === 'room-temperature' ? '22,5 °C' : '65 %';
    buttonIcon.className = 'bubble-sub-button-icon';el.append(label,buttonIcon);subs.append(el);
  });
  const ctx = {card, config:cfg,elements:{state,nameContainer:names,contentContainer:content,iconContainer:icon}};
  const hass = {locale:{language:'fr-FR',number_format:'space_comma'},states:{[entity]:{state:'22.5',attributes:{unit_of_measurement:'°C'}},'sensor.humidity':{state:'65',attributes:{unit_of_measurement:'%'}},'light.demo':{state:'on',attributes:{}},...states},callService:async()=>{}};
  const definition = old ? legacy : definitions[layout];
  const run = (template = value => value) => renders.get(definition).call(ctx,hass,fn => ctx.teardown = fn,template);
  return {ctx,hass,run};
}
const css = value => value.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').trim();
const snapshot = f => ({attributes:[...f.ctx.card.attributes].sort((a,b)=>a.name.localeCompare(b.name)),state:f.ctx.elements.state.textContent,stateData:{...f.ctx.elements.state.dataset},secondary:f.ctx.card.querySelector('.dp-secondary')?.textContent});

test('generated modules are current, autonomous and leave the legacy distribution untouched',async()=>{
  const before=fs.readFileSync(path.join(root,'signature/dist/signature.yaml'),'utf8');
  for(const layout of layouts){
    const output=await build(layout);
    assert.equal(output.content,fs.readFileSync(path.join(root,output.file),'utf8'));
    assert.match(definitions[layout].version,/^\d+\.\d+\.\d+$/);
    assert.ok(definitions[layout].editor[1].fields);
    assert.ok(!Object.hasOwn(definitions[layout].editor[1].fields,'layout'));
    assert.ok(Buffer.byteLength(output.content)<Buffer.byteLength(before));
    for(const other of layouts.filter(name=>name!==layout))assert.ok(!definitions[layout].code.includes('ha-card[data-dp-layout="'+other+'"]'),layout+' contains '+other+' CSS');
  }
  assert.equal(fs.readFileSync(path.join(root,'signature/dist/signature.yaml'),'utf8'),before);
});

for(const layout of ['square','compact','room'])test(layout+' preserves values, CSS, templates, actions and teardown from Signature',()=>{
  const sub_button={main:[{entity:'light.demo',css_class:'room-control-1',tap_action:{action:'toggle'}},{entity:'sensor.demo',css_class:'room-temperature'},{entity:'sensor.humidity',css_class:'room-humidity'}]};
  const scenarios=[
    [{},{}], [{color:'teal',secondary:'sensor.humidity'},{}],
    [{state:'{{ value }}',secondary:"{{ states('sensor.humidity') }}",secondary_bold:true,multiline:true},{}],
    [{state:'1 h 30 min',color_background:true,icon_opacity:0,icon_color:'red'},{}],
    [{state:'Ouvert',compact_mode:'value',secondary:'Détails',sub_button_styles:{'room-control-1':{type:'switch',opacity:0.5,color:'teal'}}},{sub_button}],
    [layout==='square'?{auto_height:true,controls:'measure',reserve_measure_detail:true}:layout==='compact'?{compact_mode:'value',sub_buttons_position:'end'}:{room_measures_position:'header',room_control_columns:2},{sub_button}],
    [{secondary:'sensor.humidity'},{entity:'sensor.missing'}],
  ];
  for(const [options,config]of scenarios){
    const old=fixture(layout,options,config,{},true),fresh=fixture(layout,options,config);
    const template=value=>value==='{{ value }}'?'12.5 kWh':value.includes('states(')?'**Confort**':value;
    assert.equal(css(fresh.run(template)),css(old.run(template)),JSON.stringify([layout,options,config]));
    assert.deepEqual(snapshot(fresh),snapshot(old));
    old.hass.states['sensor.humidity']={state:'unavailable',attributes:{unit_of_measurement:'%'}};
    fresh.hass.states['sensor.humidity']=old.hass.states['sensor.humidity'];
    assert.equal(css(fresh.run(template)),css(old.run(template)));
    assert.deepEqual(snapshot(fresh),snapshot(old));
    fresh.ctx.teardown();old.ctx.teardown();
    assert.deepEqual(snapshot(fresh),snapshot(old));
  }
});

test('Compact preserves native cover/climate/switch cards and number acknowledgements',async()=>{
  for(const card_type of ['cover','climate']){
    const old=fixture('compact',{}, {card_type}, {},true),fresh=fixture('compact',{}, {card_type});
    assert.equal(css(fresh.run()),css(old.run()));assert.deepEqual(snapshot(fresh),snapshot(old));
    fresh.ctx.teardown();old.ctx.teardown();
  }
  const f=fixture('compact',{controls:'number'},{entity:'input_number.target'}, {'input_number.target':{state:'2.5',attributes:{min:0,max:10,step:0.5,unit_of_measurement:'kW'}}});
  const calls=[];f.hass.callService=async(...args)=>calls.push(args);f.run();
  const nc=f.ctx._signatureCompactNumber;
  assert.equal(nc.display.textContent,'2,5 kW');await nc.plus.click();await nc.plus.click();
  assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),['input_number','set_value',{entity_id:'input_number.target',value:3}]);
  f.hass.states['input_number.target'].state='3';f.run();assert.equal(nc.plus.disabled,false);
  await nc.minus.click();f.ctx.teardown();assert.equal(nc.disposed,true);assert.equal(f.ctx._signatureCompactNumber,undefined);
});

test('unsupported native types render nothing and clean up their previous presentation',()=>{
  const invalid={square:[{card_type:'cover'},{button_type:'switch'}],room:[{card_type:'climate'},{button_type:'slider'}],compact:[{card_type:'media-player'},{button_type:'slider'}],header:[{button_type:'state'},{card_type:'cover'}]};
  for(const layout of layouts)for(const config of invalid[layout]){
    const f=fixture(layout);f.run();Object.assign(f.ctx.config,config);
    assert.equal(f.run(),'');assert.equal(f.ctx.card.getAttribute('data-dp-layout'),null);f.ctx.teardown();
  }
  const title=fixture('header',{}, {card_type:'separator'});assert.match(title.run(),/bubble-line/);title.ctx.teardown();
});

test('module forms expose only their useful fields and preserve mixed YAML types',()=>{
  for(const layout of layouts){
    const fields=definitions[layout].editor[1].fields;
    for(const [name,field]of Object.entries(fields)){
      if(layout!=='room')assert.ok(!name.startsWith('room_'));
      if(layout!=='square')assert.ok(!['auto_height','reserve_measure_detail'].includes(name));
      if(layout!=='compact')assert.ok(!['compact_mode','sub_buttons_position'].includes(name));
      if(['color_background','icon_opacity','sub_button_styles','room_auto_colors'].includes(name))assert.deepEqual(field.selector,{object:{}});
      const visible=new Function('item','hass','card','return !!('+field.visible_if+');');
      assert.doesNotThrow(()=>visible({}, {},undefined));
      for(const card_type of ['pop-up','media-player'])assert.equal(visible({}, {},{card_type}),false);
    }
  }
  assert.deepEqual(definitions.compact.editor[1].fields.controls.selector.select.options.map(o=>o.value),['native','number']);
  assert.deepEqual(definitions.square.editor[1].fields.controls.selector.select.options.map(o=>o.value),['native','measure']);
});

test('each standalone distribution registers a working flat editor on its own',()=>{
  for(const layout of layouts){
    const registry=new Map(),queue=[];
    class Element extends EventTarget {
      constructor(){super();this.children=[];this.isConnected=false;}
      append(...children){this.children.push(...children);}
      attachShadow(){return this.shadowRoot=new Element();}
      getRootNode(){return {host:{_config:this.card}};}
    }
    class Engine extends Element {
      _itemFormData(value){return {...value};}
      _generateSchema(fields,item){return Object.entries(fields).filter(([,f])=>!f.visible_if||new Function('item','hass','card','return !!('+f.visible_if+');')(item,this.hass,this.getRootNode().host._config)).map(([name,f])=>({name,selector:f.selector}));}
      _computeLabel(field){return this.selector.bc_object.fields[field.name].label;}
      _computeHelper(){return '';}
      _itemChanged(event){event.stopPropagation();this.dispatchEvent(new CustomEvent('value-changed',{detail:event.detail}));}
    }
    registry.set('ha-selector-bc_object',Engine);
    const customElements={get:key=>registry.get(key),define:(key,value)=>registry.set(key,value)};
    const document={createElement:key=>{const element=new (registry.get(key)||Element)();element.tag=key;return element;}};
    const env=vm.createContext({HTMLElement:Element,CustomEvent,document,customElements,queueMicrotask:fn=>queue.push(fn)});
    const register=vm.runInContext('(function(){return `'+definitions[layout].code+'`;})',env);
    register.call({config:{card_type:'pop-up'},card:null});
    const Form=registry.get('ha-form-signature_options');assert.ok(Form);
    const form=new Form(),original={color_background:false,icon_opacity:0,sub_button_styles:{'1':{opacity:0}},room_auto_colors:false,secondary:"{{ states('sensor.demo') }}"};
    Object.assign(form,{schema:definitions[layout].editor[1],data:original,hass:{states:{}},card:{card_type:'button',button_type:layout==='header'||layout==='room'?'name':'state',show_state:false,entity:'sensor.demo'}});
    form.isConnected=true;form.connectedCallback();while(queue.length)queue.shift()();
    assert.equal(form._engine.isConnected,false);assert.ok(form._form.schema.every(field=>field.name!=='layout'));
    const changes=[];form.addEventListener('value-changed',event=>changes.push(event.detail.value));
    form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,color:'teal'}}}));
    assert.equal(changes.length,1);assert.deepEqual(JSON.parse(JSON.stringify(changes[0])),{...original,color:'teal'});
    const first=registry.get('ha-form-signature_options');register.call({config:{card_type:'pop-up'},card:null});assert.equal(registry.get('ha-form-signature_options'),first);
  }
});

test('new guides, YAML examples and local documentation links are complete',()=>{
  for(const layout of layouts){
    const file=path.join(root,'signature-'+layout+'/doc/README.md');
    const doc=fs.readFileSync(file,'utf8');assert.ok(doc.includes(definitions[layout].version));
    const blocks=[...doc.matchAll(/```yaml\s*\n([\s\S]*?)```/g)];assert.ok(blocks.length);
    for(const [,example]of blocks)assert.doesNotThrow(()=>YAML.parse(example));
    for(const [,target]of doc.matchAll(/\[[^\]]+\]\(([^)]+)\)/g))if(!/^[a-z]+:|^#/i.test(target))assert.ok(fs.existsSync(path.resolve(path.dirname(file),target.split('#')[0])),target);
  }
});
