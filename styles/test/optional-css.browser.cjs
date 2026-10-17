const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');

test('Square adds/removes artwork CSS on live template changes, preserving native targets',async t=>{
 const page=await fixture(t),code=loadModule('signature-square').code;
 for(const mode of ['light','dark'])for(const plain of [false,true]){
  await render(page,{width:328,mode,plain});
  const result=await page.evaluate(code=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='square');
   ctx.config.signature_square.illustration={image:'{{ image }}'};
   const native=ctx.elements.state,base=ctx.card.getRootNode().querySelectorAll('style')[1];
   const run=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;');
   const results=[];
   for(const image of ['', '/local/day.webp', '/local/night.webp', '']){
    base.textContent=run.call(ctx,ctx._hass,fn=>ctx.teardown=fn,value=>value==='{{ image }}'?image:value);
    const art=getComputedStyle(ctx.elements.contentContainer,'::after');
    results.push({content:art.content,image:art.backgroundImage,sameNode:native===ctx.elements.state,hasAction:native.classList.contains('dp-value-action')});
   }
   return results;
  },code);
  assert.ok(result.every(r=>r.sameNode&&r.hasAction));
  assert.ok(['none','normal'].includes(result[0].content));assert.match(result[1].image,/day\.webp/);assert.match(result[2].image,/night\.webp/);
  assert.ok(['none','normal'].includes(result[3].content));
 }
});

test('Compact value-button CSS changes with the option on the same state node',async t=>{
 const page=await fixture(t),code=loadModule('signature-compact').code;
 for(const width of [288,600])for(const mode of ['light','dark']){
  await render(page,{width,mode});
  const result=await page.evaluate(code=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='compact'),state=ctx.elements.state;
   const run=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;'),style=ctx.card.getRootNode().querySelectorAll('style')[1];
   return ['text','button','text'].map(value_style=>{
    ctx.config.signature_compact.value_style=value_style;
    style.textContent=run.call(ctx,ctx._hass,fn=>ctx.teardown=fn,value=>value);
    const css=getComputedStyle(state);
    return {height:state.getBoundingClientRect().height,display:css.display,sameNode:state===ctx.elements.state,action:state.dataset.tapAction};
   });
  },code);
  assert.equal(result[1].height,36);assert.ok(['flex','inline-flex'].includes(result[1].display));assert.equal(result[0].display,result[2].display);
  assert.ok(result.every(r=>r.sameNode&&r.action===result[0].action));
 }
});
