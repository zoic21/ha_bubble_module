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

test('square illustration is opt-in, decorative and preserves native value/action nodes', t => {
  const f = fixture(); t.after(() => f.ctx.teardown());
  f.run(); const count = f.content.children.length;
  assert.equal(f.root.getAttribute('data-dp-illustration'),'no');
  f.ctx.config.signature_square = {illustration:{image:'/local/illustrations/test.png'}};
  const css = f.run();
  assert.equal(f.root.getAttribute('data-dp-illustration'),'yes');
  assert.match(css,/--dp-illustration-size:100% 100%/);
  assert.match(css,/--dp-illustration-position:0% 0%/);
  assert.match(css,/pointer-events:\s*none/);
  assert.equal(f.content.children.length,count,'no extra DOM or native node replacement');
  assert.equal(f.ctx.elements.state,f.value);
  assert.equal(f.value.textContent,'2,2km/h');
  assert.equal(JSON.parse(f.value.dataset.tapAction).action,'more-info');
  assert.equal(f.value.dataset.entity,'sensor.demo');
});

test('all sprite cells use the correct percentage coordinates', t => {
  const illustration = {image:'/local/atlas.png',columns:4,rows:3,index:0};
  const f = fixture({illustration}); t.after(() => f.ctx.teardown());
  for (let i=0;i<12;i++) {
    illustration.index=i; const css=f.run();
    assert.equal(f.root.getAttribute('data-dp-illustration'),'yes');
    assert.ok(css.includes('--dp-illustration-position:'+(i%4)*100/3+'% '+Math.floor(i/4)*50+'%;'));
  }
});

test('Jinja URL/index stay live without rebuilding structural CSS or adding a runtime', t => {
  const f = fixture({illustration:{image:'{{ image }}',columns:4,rows:3,index:'{{ frame }}'}});
  t.after(() => f.ctx.teardown());
  let image='/local/first.png', frame='2',calls=0;
  const template = source => { calls++;return source.includes('image') ? image : frame; };
  let css=f.run(template); const runtime=f.ctx._signatureSquareRuntime, structural=runtime.styleCSS;
  assert.ok(css.includes('first.png'));assert.ok(css.includes('66.66666666666667% 0%'));
  image='/local/second.png';frame='11';css=f.run(template);
  assert.equal(f.ctx._signatureSquareRuntime,runtime);assert.equal(runtime.styleCSS,structural);
  assert.ok(css.includes('second.png'));assert.ok(css.includes('100% 100%'));assert.equal(calls,4);
});

test('invalid/missing frames hide artwork instead of showing another situation', t => {
  const illustration={image:'/local/atlas.png',columns:4,rows:3,index:0};
  const f=fixture({illustration});t.after(() => f.ctx.teardown());
  for (const index of [-1,12,'','unknown','unavailable','NaN',Infinity]) {
    illustration.index=index;const css=f.run();
    assert.equal(f.root.getAttribute('data-dp-illustration'),'no',String(index));
    assert.ok(!css.includes('--dp-illustration-image:url('));
  }
  illustration.index=0;f.run();assert.equal(f.root.getAttribute('data-dp-illustration'),'yes');
  delete f.ctx.config.signature_square.illustration;f.run();
  assert.equal(f.root.getAttribute('data-dp-illustration'),'no');
});

test('URLs are quoted and non-image URL schemes are rejected', t => {
  const illustration={image:'/local/test.png'};
  const f=fixture({illustration});t.after(() => f.ctx.teardown());
  for (const image of ['javascript:alert(1)','data:text/html,test','//untrusted.example/a.png','/local/x\n.png']) {
    illustration.image=image;f.run();assert.equal(f.root.getAttribute('data-dp-illustration'),'no');
  }
  for (const image of ['/local/a.png','https://example.org/a.png','/local/a"b.png']) {
    illustration.image=image;const css=f.run();assert.equal(f.root.getAttribute('data-dp-illustration'),'yes');
    assert.ok(css.includes('url('+JSON.stringify(image)+')'));
  }
});

test('artwork keeps secondary action and native visibility, and cleans up on teardown', () => {
  const f=fixture({secondary:'sensor.gust',illustration:{image:'/local/a.png'}},{show_state:false});
  f.value.classList.add('hidden');
  f.hass.states['sensor.gust']={state:'4.0',attributes:{unit_of_measurement:'km/h'}};
  f.run();const secondary=f.root.querySelector('.dp-secondary');
  assert.equal(secondary.dataset.entity,'sensor.gust');assert.equal(f.value.classList.contains('hidden'),true);
  f.ctx.teardown();assert.equal(f.root.getAttribute('data-dp-illustration'),null);
  assert.equal(f.root.contains(secondary),false);assert.equal(f.value.dataset.entity,undefined);
});

test('the illustration object is exposed only in the Square editor', () => {
  assert.ok(definition.editor[1].fields.illustration.selector.object);
  for (const module of ['signature-compact','signature-room','signature-header'])
    assert.equal(loadModule(module).editor[1].fields.illustration,undefined);
});
