const assert = require('node:assert/strict');
const vm = require('node:vm');
const {test} = require('node:test');
const {loadModule} = require('../../shared/test/module.cjs');

const definition = loadModule('signature-square');
const context = vm.createContext({...require('./dom.cjs'), Intl, setTimeout, clearTimeout});
const render = vm.runInContext('(function(hass,onTeardown,renderTemplate){return `' + definition.code + '`;})', context);

function fixture(options = {}, native = {}) {
  const {Element} = context;
  const root = new Element(), wrapper = new Element(), content = new Element();
  const names = new Element(), value = new Element(), icon = new Element();
  wrapper.className = 'bubble-wrapper'; content.className = 'bubble-content-container';
  names.className = 'bubble-name-container'; value.className = 'bubble-state';
  icon.className = 'bubble-icon-container'; root.append(wrapper); wrapper.append(content);
  content.append(icon,names); names.append(value);
  const entity = 'sensor.demo';
  const ctx = {card:root, elements:{state:value,nameContainer:names,contentContainer:content,iconContainer:icon},
    config:{card_type:'button',button_type:'state',entity,show_icon:false,signature_square:options,...native}};
  const hass = {locale:{language:'fr-FR',number_format:'space_comma'},
    states:{[entity]:{state:'2.2',attributes:{unit_of_measurement:'km/h'}}}};
  const run = (template = x => x) => render.call(ctx,hass,fn => ctx.teardown = fn,template);
  return {ctx,hass,run,root,value,content};
}

test('activity progress is opt-in, bounded and disappears for invalid input',t=>{
  const f=fixture({activity:true,progress:{value:25,color:'#308DCB'}});t.after(()=>f.ctx.teardown());
  const options=f.ctx.config.signature_square;
  for(const [value,expected] of [[-2,0],[25,25],[120,100]]){
    options.progress.value=value;const css=f.run();
    assert.ok(css.includes(' * '+expected+' / 100)'));
    assert.equal(f.value.dataset.entity,'sensor.demo');
  }
  for(const value of ['',null,'unknown','NaN',Infinity]){
    options.progress.value=value;assert.ok(!f.run().includes(' * NaN / 100)'));
    assert.ok(!f.run().includes('.bubble-wrapper::after'));
  }
  options.activity=false;options.progress.value=50;
  assert.ok(!f.run().includes('.bubble-wrapper::after'));
});

test('day/night sprite positions update on the same activity and media nodes',t=>{
 for(const kind of ['button','media-player']){
  const f=fixture({activity:true,illustration:{image:'/local/atlas.png',columns:4,rows:6,index:1,index_dark:13,offset_y:18,offset_y_dark:6}},{card_type:kind});
  t.after(()=>f.ctx.teardown());f.hass.themes={darkMode:false};
  const children=f.content.children.length;
  const day=f.run();const runtime=f.ctx._signatureSquareRuntime;
  f.hass.themes.darkMode=true;const dark=f.run();
  assert.ok(day.includes('--dp-illustration-position:33.333333333333336% 3.6%;'));
  assert.ok(dark.includes('--dp-illustration-position:33.333333333333336% 61.2%;'));
  assert.equal(f.ctx._signatureSquareRuntime,runtime);
  assert.equal(f.ctx.elements.state,f.value);assert.equal(f.content.children.length,children);
  if(kind==='media-player'){
    assert.equal(f.root.getAttribute('data-dp-layout'),null,'native media never gets tile layout');
    f.ctx.config.signature_square.activity=false;assert.equal(f.run(),'');
    assert.equal(f.root.getAttribute('data-dp-illustration'),null,'cleanup before incompatible return');
  }
 }
});
