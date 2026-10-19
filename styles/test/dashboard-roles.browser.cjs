const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const compact=loadModule('signature-compact').code,header=loadModule('signature-header').code;

test('Compact two-line names follow live fonts, preserve the native value target and restore the one-line layout',async t=>{
 const page=await fixture(t);
 for(const width of [148,180,288,328,382,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await render(page,{width,mode,plain});
  const result=await page.evaluate(code=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='compact'),style=ctx.card.getRootNode().querySelectorAll('style')[1];
   ctx.config={...ctx.config,signature_compact:{compact_mode:'value',name_lines:2}};
   const name=ctx.card.querySelector('.bubble-name'),value=ctx.elements.state;name.textContent='Ventilation auxiliaire';
   const run=()=>style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
   const read=()=>{const s=getComputedStyle(name);return {size:s.fontSize,line:parseFloat(s.lineHeight),max:parseFloat(s.maxHeight),clamp:s.webkitLineClamp,wrap:s.whiteSpace,height:ctx.elements.mainContainer.getBoundingClientRect().height}};
   run();const before=read(),css=style.textContent;
   document.body.style.setProperty('--signature-name-font-size','18px');const after=read(),sameCSS=css===style.textContent;
   ctx.config.signature_compact={compact_mode:'value',name_lines:1};run();const restored=read();
   return {before,after,restored,sameCSS,sameNodes:name===ctx.card.querySelector('.bubble-name')&&value===ctx.elements.state,action:JSON.parse(value.dataset.tapAction).action,attribute:ctx.card.getAttribute('data-dp-name-lines')};
  },compact);
  assert.equal(result.before.size,'14px');assert.equal(result.before.clamp,'2');assert.equal(result.before.wrap,'normal');
  assert.equal(result.before.max,2*result.before.line);assert.ok(Math.abs(result.after.max-39.6)<.02);
  assert.equal(result.after.max,2*result.after.line);assert.equal(result.before.height,result.after.height);
  assert.equal(result.restored.wrap,'nowrap');assert.equal(result.attribute,null);assert.ok(result.sameCSS&&result.sameNodes);assert.equal(result.action,'more-info');
 }
});

test('Compact clock durations retain the numeric role through native asynchronous text updates',async t=>{
 const page=await fixture(t);await render(page,{width:328});
 const result=await page.evaluate(async()=>{
  const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='compact'),node=ctx.card.querySelector('.dp-value');
  const result=[];
  for(const text of ['1:05','123:59:09','0:00','12:99','2026-10-17 12:30','Fermée','22,5']){
   node.textContent=text;await Promise.resolve();const s=getComputedStyle(ctx.elements.state);
   result.push({text,size:s.fontSize,weight:s.fontWeight,small:ctx.card.dataset.dpValueText==='yes',clock:ctx.card.dataset.dpValueClock==='yes'});
  }
  return result;
 });
 for(const [i,r]of result.entries()){
  const small=i>=3&&i<=5;assert.equal(r.clock,i<3,r.text);assert.equal(r.small,small,r.text);assert.equal(r.size,small?'16px':'20px',r.text);assert.equal(r.weight,small?'400':'500',r.text);
 }
});

test('Header page buttons use secondary typography and title metrics use the caption role',async t=>{
 const page=await fixture(t);
 for(const width of [288,328,382,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await render(page,{width,mode,plain});
  const result=await page.evaluate(code=>{
   const result=[];
   for(const id of ['header','title']){
    const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id===id),shadow=ctx.card.getRootNode(),container=ctx.card.querySelector('.bubble-sub-button-container');
    const button=document.createElement('div');button.className='bubble-sub-button bubble-sub-button-1 battery-metric';
    button.innerHTML='<span class="bubble-sub-button-name-container">22,5 °C</span>';container.replaceChildren(button);
    ctx.config={...ctx.config,sub_button:{main:[{entity:'sensor.demo',css_class:'battery-metric',tap_action:{action:'more-info'}}]},signature_header:{sub_button_styles:{'battery-metric':{type:'metric'}}}};
    const style=shadow.querySelectorAll('style')[1];style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
    const css=style.textContent,label=button.firstElementChild;
    const read=()=>{const s=getComputedStyle(label);return {size:s.fontSize,line:s.lineHeight,padding:getComputedStyle(button).padding,height:button.getBoundingClientRect().height}};
    const before=read();document.body.style.setProperty('--signature-secondary-font-size','17px');document.body.style.setProperty('--signature-caption-font-size','15px');
    const after=read();result.push({id,before,after,sameCSS:css===style.textContent,sameNode:button===container.firstElementChild});
    document.body.style.removeProperty('--signature-secondary-font-size');document.body.style.removeProperty('--signature-caption-font-size');
   }
   return result;
  },header);
  const [pageHeader,title]=result;assert.equal(pageHeader.before.size,'13px');assert.equal(pageHeader.after.size,'17px');assert.equal(pageHeader.before.height,44);
  assert.equal(title.before.size,'12px');assert.equal(title.after.size,'15px');assert.equal(title.before.padding,'0px 4px');assert.equal(title.after.line,'18px');
  for(const r of result)assert.ok(r.sameCSS&&r.sameNode);
 }
});
