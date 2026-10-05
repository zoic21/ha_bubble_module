const assert=require('node:assert/strict');
const {test}=require('node:test');
const {editorEnvironment}=require('./editor-environment.cjs');

test('editor registries and queued updates are isolated between fixtures',()=>{
  const first=editorEnvironment(),second=editorEnvironment();
  first.evaluate('customElements.define("ha-test-form",class extends HTMLElement {});queueMicrotask(()=>globalThis.updated=true);');
  assert.ok(first.document.createElement('ha-test-form') instanceof first.Element);
  assert.equal(second.customElements.get('ha-test-form'),undefined);
  second.flush();assert.equal(first.evaluate('globalThis.updated'),undefined);
  first.flush();assert.equal(first.evaluate('globalThis.updated'),true);assert.equal(second.evaluate('globalThis.updated'),undefined);
});
test('late registration resolves every waiting editor and subsequent readiness checks',async()=>{
  const env=editorEnvironment(),ready=[];
  const first=env.customElements.whenDefined('ha-test-form').then(()=>ready.push('first'));
  const second=env.customElements.whenDefined('ha-test-form').then(()=>ready.push('second'));
  env.customElements.define('ha-test-form',env.Element);await Promise.all([first,second]);
  assert.deepEqual(ready,['first','second']);await env.customElements.whenDefined('ha-test-form');
  assert.throws(()=>env.customElements.define('ha-test-form',env.Element),/already defined/);
});
test('editor events retain native target, detail and propagation flags',()=>{
  const env=editorEnvironment(),form=env.document.createElement('ha-form'),events=[];
  form.addEventListener('value-changed',event=>events.push(event));
  form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:0},bubbles:true,composed:true}));
  assert.equal(events.length,1);assert.equal(events[0].target,form);assert.equal(events[0].detail.value,0);
  assert.equal(events[0].bubbles,true);assert.equal(events[0].composed,true);
});
