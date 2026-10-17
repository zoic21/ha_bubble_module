const assert = require('node:assert/strict');
const {test} = require('node:test');
const {loadModule} = require('../../shared/test/module.cjs');
const definition = loadModule('signature-hue');
const render = new Function('renderTemplate', 'return `' + definition.code + '`;');
const make = options => ({config:{card_type:'button',entity:'light.demo',signature_hue:options}});

test('all five Hue presentations are scoped and do not install handlers or read HA', () => {
  for (const mode of ['light','scene','brightness','animation','popup']) {
    const ctx = make({mode}); if(mode === 'popup') ctx.config.card_type='pop-up';
    assert.ok(render.call(ctx).length > 100);
    assert.equal(ctx._signatureHue.version, definition.version);
  }
  assert.doesNotMatch(definition.code, /MutationObserver|ResizeObserver|addEventListener|setInterval|setTimeout|callService/);
  for (const mode of ['unknown',undefined]) assert.equal(render.call(make({mode})), '');
  const unsupported=make({mode:'light'});unsupported.config.card_type='cover';assert.equal(render.call(unsupported),'');
});
test('Jinja availability and selection are rendered every time, outside the CSS cache', () => {
  const ctx = make({mode:'scene',available:'{{ has_value(entity) }}',selected:'{{ selected }}',palette:'#123456,#abcdef,#123ABC'});
  let available = true, selected = false;const calls=[];
  const jinja=(value,entity)=>{calls.push([value,entity]);return value.includes('has_value') ? available : selected;};
  const first=render.call(ctx,jinja), cache=ctx._signatureHue;
  assert.match(first,/--signature-hue-opacity:\s*1/);assert.match(first,/--signature-hue-selected:\s*0/);
  available=false;selected=true;
  const second=render.call(ctx,jinja);assert.equal(ctx._signatureHue,cache);
  assert.match(second,/--signature-hue-opacity:\s*0?\.4/);assert.match(second,/--signature-hue-selected:\s*1/);
  assert.equal(calls.length,4);assert.ok(calls.every(c=>c[1]==='light.demo'));
  ctx._signatureHue.version='old';render.call(ctx,jinja);assert.notEqual(ctx._signatureHue,cache);
});
test('unresolved booleans fail closed and unsafe palettes never become CSS', () => {
  const ctx=make({mode:'scene',available:'{{ pending }}',selected:'{{ pending }}',palette:'#123456,red,red);color:red;--bad:('});
  const css=render.call(ctx);assert.match(css,/--signature-hue-pointer:\s*none/);
  assert.match(css,/--signature-hue-selected:\s*0/);assert.match(css,/--signature-hue-palette:\s*transparent/);
  assert.doesNotMatch(css,/--bad/);
  const bright=make({mode:'brightness',available:false});
  assert.match(render.call(bright),/opacity:\s*\.4!important|opacity:\s*\.4 !important/);
  bright.config.signature_hue.available=true;assert.doesNotMatch(render.call(bright),/opacity:/);
});
test('combined status keeps one template read per render and fails closed',()=>{
 const ctx=make({mode:'scene',status:'{{ combined }}'});let count=0;
 const css=render.call(ctx,()=>{count++;return '{"available":true,"selected":true}';});
 assert.equal(count,1);assert.match(css,/--signature-hue-selected:\s*1/);
 assert.match(css,/--signature-hue-pointer:\s*auto/);
 const invalid=render.call(ctx,()=>'{invalid}');assert.match(invalid,/--signature-hue-pointer:\s*none/);
 ctx.config.signature_hue.status={available:true,selected:false};
 assert.match(render.call(ctx),/--signature-hue-selected:\s*0/);
});
