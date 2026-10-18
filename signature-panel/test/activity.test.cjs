const assert = require('node:assert/strict');
const vm = require('node:vm');
const {test} = require('node:test');
const {loadModule} = require('../../shared/test/module.cjs');

const definition = loadModule('signature-panel');
const context = vm.createContext({...require('../../signature-shared/test/dom.cjs'), Intl, setTimeout, clearTimeout});
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
    config:{card_type:'button',button_type:'state',entity,show_icon:false,signature_panel:options,...native}};
  const hass = {locale:{language:'fr-FR',number_format:'space_comma'},
    states:{[entity]:{state:'2.2',attributes:{unit_of_measurement:'km/h'}}}};
  const run = (template = x => x) => render.call(ctx,hass,fn => ctx.teardown = fn,template);
  return {ctx,hass,run,root,value,content};
}

test('activity progress is opt-in, bounded and disappears for invalid input',t=>{
  const f=fixture({activity:true,progress:{value:25,color:'#308DCB'}});t.after(()=>f.ctx.teardown());
  const options=f.ctx.config.signature_panel;
  for(const [value,expected] of [[-2,0],[25,25],[120,100]]){
    options.progress.value=value;const css=f.run();
    assert.ok(css.includes(' * '+expected+' / 100)'));
    assert.equal(f.value.dataset.entity,'sensor.demo');
  }
  for(const value of ['',null,'unknown','NaN',Infinity]){
    options.progress.value=value;assert.ok(!f.run().includes(' * NaN / 100)'));
    assert.ok(!f.run().includes('.bubble-wrapper::after'));
  }
  delete options.progress;
  assert.ok(!f.run().includes('.bubble-wrapper::after'));
});

test('day/night sprite positions update on the same activity and media nodes',t=>{
 for(const kind of ['button','media-player']){
  const f=fixture({activity:true,illustration:{image:'/local/atlas.png',columns:4,rows:6,index:1,index_dark:13,offset_y:18,offset_y_dark:6}},{card_type:kind});
  t.after(()=>f.ctx.teardown());f.hass.themes={darkMode:false};
  const children=f.content.children.length;
  const day=f.run();const runtime=f.ctx._signaturePanelRuntime;
  f.hass.themes.darkMode=true;const dark=f.run();
  assert.ok(day.includes('--dp-illustration-position:33.333333333333336% 3.6%;'));
  assert.ok(dark.includes('--dp-illustration-position:33.333333333333336% 61.2%;'));
  assert.equal(f.ctx._signaturePanelRuntime,runtime);
  assert.equal(f.ctx.elements.state,f.value);assert.equal(f.content.children.length,children);
  if(kind==='media-player'){
    assert.equal(f.root.getAttribute('data-dp-layout'),'panel');
    f.ctx.config.card_type='cover';assert.equal(f.run(),'');
    assert.equal(f.root.getAttribute('data-dp-illustration'),null,'cleanup before incompatible return');
  }
 }
});

test('media artwork follows track attributes and restores the complete themed sprite without changing native nodes',t=>{
 const illustration={media_artwork:true,image:'/local/atlas.png',image_dark:'/local/night.png',columns:4,rows:6,index:2,index_dark:14,offset_x:7,offset_y:27,offset_y_dark:8};
 const original=structuredClone(illustration);
 const f=fixture({illustration},{card_type:'media-player',entity:'media_player.demo'});
 t.after(()=>f.ctx.teardown());
 f.hass.states['media_player.demo']={state:'playing',attributes:{}};
 f.hass.themes={darkMode:false};
 const day=f.run(),runtime=f.ctx._signaturePanelRuntime,children=f.content.children.length;
 for(const picture of ['/api/media_player_proxy/media_player.demo?token=one','https://example.test/landscape.jpg','/local/new-album.jpg']){
  f.hass.states['media_player.demo'].attributes.entity_picture=picture;
  const css=f.run();
  assert.ok(css.includes('url('+JSON.stringify(picture)+')'));
  assert.ok(css.includes('--dp-illustration-size:contain;--dp-illustration-position:center'));
  assert.ok(!css.includes('atlas.png'));assert.ok(!css.includes('night.png'));
  assert.equal(f.ctx._signaturePanelRuntime,runtime);assert.equal(f.content.children.length,children);
 }
 f.hass.themes.darkMode=true;
 assert.ok(f.run().includes('new-album.jpg'),'theme-only refresh keeps the current artwork');
 for(const picture of [undefined,null,'','  ','unknown','javascript:alert(1)','data:image/png;base64,x','//example.test/a','/local/a\n.png',123,{}]){
  f.hass.states['media_player.demo'].attributes.entity_picture=picture;
  const css=f.run();assert.ok(css.includes('night.png'));assert.ok(css.includes('--dp-illustration-size:400% 600%;'));
  assert.ok(!css.includes('--dp-illustration-size:contain'));
 }
 delete f.hass.states['media_player.demo'];assert.ok(f.run().includes('night.png'));
 f.hass.themes.darkMode=false;assert.equal(f.run(),day);
 assert.deepEqual(illustration,original);
});

test('media artwork requires explicit opt-in and never overrides ordinary panels',t=>{
 for(const kind of ['button','media-player'])for(const enabled of [undefined,false,true]){
  const f=fixture({illustration:{image:'/local/fallback.png',media_artwork:enabled}},{card_type:kind,entity:'media_player.demo'});
  t.after(()=>f.ctx.teardown());
  f.hass.states['media_player.demo']={state:'playing',attributes:{entity_picture:'/local/album.jpg'}};
  const css=f.run();assert.equal(css.includes('album.jpg'),kind==='media-player'&&enabled===true);
 }
});
