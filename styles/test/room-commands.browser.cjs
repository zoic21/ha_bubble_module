const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-room').code;

async function alarm(page,{width=288,mode='light',plain=false}={}) {
 await render(page,{width,mode,plain});
 await page.evaluate(code=>{
  const shadow=document.querySelector('[data-id="room"]').shadowRoot;
  const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
  const choices=['disarmed','armed_away','armed_night'];
  const labels=['Désarmer','Armer','Nuit'];
  const buttons=choices.map((state,i)=>({entity:'alarm_control_panel.demo',name:labels[i],show_name:true,
   css_class:'room-control-'+(i+1),tap_action:{action:'perform-action',perform_action:['alarm_control_panel.alarm_disarm','alarm_control_panel.alarm_arm_away','alarm_control_panel.alarm_arm_night'][i],target:{entity_id:'alarm_control_panel.demo'}},hold_action:{action:'more-info'}}));
  ctx.config={...ctx.config,entity:'alarm_control_panel.demo',button_type:'state',show_state:true,show_icon:false,
   sub_button:{main:buttons},signature_room:{room_mode:'illustrated',room_auto_colors:false,room_state_as_value:true,
    room_control_columns:3,state:'{{ value }}',illustration:{image:'/local/illustration.webp'},
    sub_button_styles:Object.fromEntries(buttons.map((b,i)=>[b.css_class,{type:'command',color:'#368ACB',active:'{{ active'+i+' }}',disabled:'{{ disabled'+i+' }}'}]))}};
  ctx.card.querySelector('.bubble-name').textContent='Alarme';
  ctx.elements.state.classList.remove('hidden');
  const container=ctx.card.querySelector('.bubble-sub-button-container');container.replaceChildren();
  const cache=new WeakMap();window.commandActions=[];
  buttons.forEach((b,i)=>{
   const node=document.createElement('div');node.className='bubble-sub-button bubble-action bubble-action-enabled bubble-sub-button-'+(i+1)+' '+b.css_class;
   node.setAttribute('role','button');node.tabIndex=0;
   node.innerHTML='<span class="bubble-sub-button-name-container">'+labels[i]+'</span><ha-icon class="bubble-sub-button-icon"></ha-icon><ha-ripple></ha-ripple>';
   node.dataset.tapAction=JSON.stringify(b.tap_action);node.dataset.holdAction=JSON.stringify(b.hold_action);
   // Bubble 3.4.1 retains one ActionHandler configuration after first use.
   // Reproduce that behavior, then verify a cached action is still blocked.
   node.addEventListener('click',()=>{
    if(!cache.has(node))cache.set(node,JSON.parse(node.dataset.tapAction));
    node.dispatchEvent(new CustomEvent('hass-action',{bubbles:true,composed:true,detail:cache.get(node)}));
   });
   node.addEventListener('keydown',e=>{if(e.key==='Enter')node.click()});
   container.append(node);
  });
  ctx.card.addEventListener('hass-action',e=>window.commandActions.push(e.detail));
  window.commandContext=ctx;
  window.setCommandState=(state,invalid=false)=>{
   ctx._hass.states['alarm_control_panel.demo']={state,attributes:{}};
   const active=choices.map(s=>s===state);
   const disabled=[['disarmed','unknown','unavailable'].includes(state),!['triggered','armed_night','disarmed'].includes(state),!['triggered','armed_away','disarmed'].includes(state)];
   const template=input=>input==='{{ value }}'?({disarmed:'Désarmée',armed_away:'Armée',armed_night:'Nuit',triggered:'Déclenchée',arming:'Armement',unknown:'—',unavailable:'—'}[state]||state):/^\{\{ active/.test(input)?String(active[Number(input.match(/\d/)[0])]):/^\{\{ disabled/.test(input)?(invalid?'':String(disabled[Number(input.match(/\d/)[0])])):input;
   shadow.querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,template);
  };
  window.setCommandState('disarmed');
 },code);
}

test('three native command positions and labels fit every alarm state without changing illustrated height',async t=>{
 const page=await fixture(t);
 for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [288,328,358,382,600]){
  await alarm(page,{width,mode,plain});
  for(const state of ['disarmed','armed_away','armed_night','triggered','arming','unknown','unavailable']){
   const result=await page.evaluate(state=>{
    window.setCommandState(state);const ctx=window.commandContext;
    const host=ctx.card.querySelector('.bubble-container').getBoundingClientRect();
    return {height:host.height,nodes:[...ctx.card.querySelectorAll('[data-dp-command]')].map(node=>{
     const r=node.getBoundingClientRect(),label=node.querySelector('.bubble-sub-button-name-container'),icon=node.querySelector('ha-icon');
     return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,height:r.height,grid:getComputedStyle(node).gridTemplateAreas,
      disabled:node.getAttribute('aria-disabled'),pressed:node.getAttribute('aria-pressed'),scroll:label.scrollWidth,client:label.clientWidth,
      labelTop:label.getBoundingClientRect().top,iconBottom:icon.getBoundingClientRect().bottom,iconStyle:{height:getComputedStyle(icon).height,padding:getComputedStyle(icon).padding,margin:getComputedStyle(icon).margin,align:getComputedStyle(icon).alignSelf,nodeAlign:getComputedStyle(node).alignItems,rows:getComputedStyle(node).gridTemplateRows},
      action:JSON.parse(node.dataset.tapAction)};
    })};
   },state);
   const hint=JSON.stringify({mode,plain,width,state,result});assert.equal(result.height,148,hint);assert.equal(result.nodes.length,3,hint);
   result.nodes.forEach((node,i)=>{assert.equal(node.height,44,hint);assert.ok(node.scroll<=node.client+1,hint);assert.ok(node.iconBottom<=node.labelTop+.5,hint);assert.match(node.grid,/"icon" "label"/,hint);assert.equal(node.action.action,'perform-action',hint);if(i)assert.ok(result.nodes[i-1].right<node.left,hint)});
   assert.equal(result.nodes.filter(n=>n.pressed==='true').length,['disarmed','armed_away','armed_night'].includes(state)?1:0,hint);
   if(['unknown','unavailable'].includes(state))assert.ok(result.nodes.every(n=>n.disabled==='true'),hint);
   if(state==='arming')assert.deepEqual(result.nodes.map(n=>n.disabled),['false','true','true']);
  }
 }
});

test('disabled commands block cached native actions, keyboard and in-flight hass-action without changing native actions',async t=>{
 const page=await fixture(t);await alarm(page);
 const shell=page.locator('[data-id="room"]');
 await shell.locator('.room-control-2').click();
 assert.equal((await page.evaluate(()=>window.commandActions)).length,1);
 await page.evaluate(()=>window.setCommandState('armed_away'));
 const scroll=await shell.locator('.room-control-2').evaluate(node=>{
  const event=new Event('touchstart',{bubbles:true,composed:true,cancelable:true});node.dispatchEvent(event);return !event.defaultPrevented;
 });assert.ok(scroll,'disabled commands must not prevent starting a page scroll');
 // Dispatching click bypasses pointer hit testing: this is behavior, not CSS.
 await shell.locator('.room-control-2').evaluate(node=>{
  node.click();node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,composed:true,cancelable:true}));
  node.dispatchEvent(new CustomEvent('hass-action',{bubbles:true,composed:true,detail:{action:'perform-action'}}));
 });
 assert.equal((await page.evaluate(()=>window.commandActions)).length,1);
 await shell.locator('.room-control-1').click();assert.equal((await page.evaluate(()=>window.commandActions)).length,2);
 await page.evaluate(()=>window.setCommandState('disarmed'));
 await shell.locator('.room-control-2').click();assert.equal((await page.evaluate(()=>window.commandActions)).length,3);
 await page.evaluate(()=>window.setCommandState('unavailable',true));
 assert.equal(await shell.locator('[aria-disabled="true"]').count(),3,'unresolved templates fail closed');
});

test('removing command options and tearing down restores attributes and native handlers on the same nodes',async t=>{
 const page=await fixture(t);await alarm(page);
 const result=await page.evaluate(()=>{
  const ctx=window.commandContext,buttons=[...ctx.card.querySelectorAll('[data-dp-command]')];
  const actions=buttons.map(b=>b.dataset.tapAction),runtime=ctx._signatureRoomRuntime;
  const nodes=ctx.card.querySelectorAll('*').length;
  ctx.config.signature_room={...ctx.config.signature_room,sub_button_styles:{}};window.setCommandState('disarmed');
  return {same:buttons.every(b=>ctx.card.contains(b)),commands:ctx.card.querySelectorAll('[data-dp-command]').length,
   attrs:buttons.map(b=>b.getAttribute('aria-disabled')),actions:buttons.map(b=>b.dataset.tapAction),original:actions,
   nodes:ctx.card.querySelectorAll('*').length,originalNodes:nodes,disposed:!runtime.roomCommands};
 });
 assert.ok(result.same&&result.disposed);assert.equal(result.commands,0);assert.deepEqual(result.attrs,[null,null,null]);assert.deepEqual(result.actions,result.original);assert.equal(result.nodes,result.originalNodes);
 await page.locator('[data-id="room"]').locator('.room-control-1').click();assert.equal((await page.evaluate(()=>window.commandActions)).length,1);
 await alarm(page);await page.evaluate(()=>window.commandContext.teardown());
 assert.equal(await page.locator('[data-id="room"]').locator('[data-dp-command]').count(),0);
});
