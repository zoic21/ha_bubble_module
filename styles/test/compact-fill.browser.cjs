const assert=require('node:assert/strict');
const {test}=require('node:test');
const {loadModule}=require('../../shared/test/module.cjs');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const compact=loadModule('signature-compact').code;
const alert=loadModule('alert_manager').code;

// Relevant native Bubble 3.4.1 geometry, commit 061ed837. Select menus are
// represented by native select elements; this does not load Home Assistant.
const nativeCSS=`
.bubble-wrapper{position:absolute;justify-content:space-between}
.bubble-background{position:absolute;width:100%;height:100%;border-radius:var(--bubble-border-radius);pointer-events:auto}
.bubble-content-container{display:contents;padding:0;gap:0}
.bubble-name-container{display:flex;flex-direction:column;flex-grow:1;position:relative;overflow:hidden;pointer-events:none}
.bubble-name,.bubble-state,.bubble-icon-container{position:relative}
.bubble-sub-button-container,.bubble-sub-button-group{display:flex;align-items:center;gap:8px}
.bubble-sub-button{display:flex;flex-direction:row-reverse;align-items:center;justify-content:center;position:relative;box-sizing:border-box;width:max-content;min-width:36px;height:36px;font-size:12px;border-radius:var(--bubble-sub-button-border-radius);padding:0 8px;white-space:nowrap;color:var(--primary-text-color);pointer-events:auto}
.bubble-sub-button-name-container{display:flex;overflow:auto}
.bubble-sub-button-icon{display:flex;width:16px;height:16px;margin-inline-end:4px}
.bubble-dropdown-container{display:flex;position:static;width:36px;height:36px;pointer-events:none}
.bubble-dropdown-arrow{position:absolute;width:36px;height:36px;pointer-events:none}
.bubble-dropdown-select{position:absolute;inset:0;width:auto;height:36px;margin:auto;opacity:0;pointer-events:auto}
.bubble-sub-button .hidden{display:none!important}
`;
const controls={
  none:[],
  switch:[{entity:'switch.socket',tap_action:{action:'toggle'}}],
  select:[{entity:'select.mode',sub_button_type:'select',label:'Eco+'}],
  crowded:[{entity:'sensor.status',label:'En attente',icon:true},{entity:'select.mode',sub_button_type:'select',label:'Eco+',icon:true},{entity:'input_select.priority',sub_button_type:'select',label:'Prioritaire'}],
  temperatures:[{entity:'sensor.temperature1',label:'45 °C',icon:true},{entity:'sensor.temperature2',label:'55 °C',icon:true}],
  mixed:[{entity:'switch.socket',tap_action:{action:'toggle'}},{entity:'select.mode',sub_button_type:'select',label:'Eco+'},{entity:'sensor.status',label:'En attente'}],
};
async function prepare(page,scenario={}){
  await render(page,scenario);
  return page.evaluate(({compact,alert,nativeCSS,buttons,scenario})=>{
    const ctx=window.contexts.find(ctx=>ctx.card.getRootNode().host.dataset.id==='compact');
    window.contexts.filter(other=>other!==ctx).forEach(other=>other.teardown?.());window.contexts=[ctx];
    [...document.getElementById('cards').children].filter(shell=>shell.dataset.id!=='compact').forEach(shell=>shell.remove());
    const root=ctx.card,shadow=root.getRootNode();shadow.querySelector('style').textContent+=nativeCSS;
    root.querySelector('.bubble-name').textContent=scenario.name||'Pompe de relevage';
    ctx.config={...ctx.config,entity:'sensor.demo',button_type:'state',show_icon:scenario.noIcon!==true,signature_compact:{compact_mode:'value',value_style:scenario.valueStyle||'text',secondary:scenario.secondary||'',...(['switch','mixed'].includes(scenario.controls)?{sub_button_styles:{'1':{type:'switch'}}}:{})},sub_button:scenario.grouped?{main:[{group:buttons}]}:buttons};
    if(scenario.noIcon)root.querySelector('.bubble-icon-container').classList.add('hidden');
    ctx._hass.states['sensor.demo']={state:scenario.value||'200',attributes:{unit_of_measurement:'W'}};
    ctx._hass.states['sensor.house']={state:'1000',attributes:{unit_of_measurement:'W'}};
    ctx._hass.states['switch.socket']={state:'on',attributes:{}};
    window.events=[];
    root.addEventListener('click',e=>{const target=e.composedPath().find(el=>el.classList?.contains('dp-value-action'));if(target)window.events.push({entity:target.dataset.entity,action:JSON.parse(target.dataset.tapAction).action});});
    const subs=root.querySelector('.bubble-sub-button-container');subs.replaceChildren();
    const group=scenario.grouped?document.createElement('div'):subs;
    if(scenario.grouped){group.className='bubble-sub-button-group';subs.append(group);}
    buttons.forEach((b,i)=>{
      const el=document.createElement('div');el.className='bubble-sub-button bubble-sub-button-'+(i+1)+(b.sub_button_type==='select'?' is-select':'');
      el.dataset.entity=b.entity;
      if(b.label){const label=document.createElement('span');label.className='bubble-sub-button-name-container';label.textContent=b.label;el.append(label);}
      if(b.icon){const icon=document.createElement('ha-icon');icon.className='bubble-sub-button-icon';el.append(icon);}
      if(b.sub_button_type==='select'){
        const dropdown=document.createElement('div');dropdown.className='bubble-dropdown-container';
        dropdown.innerHTML='<ha-icon class="bubble-dropdown-arrow"></ha-icon><select class="bubble-dropdown-select"><option>Eco+</option><option>Fast</option></select>';
        dropdown.querySelector('select').addEventListener('change',e=>window.events.push({entity:b.entity,value:e.target.value}));el.append(dropdown);
      }else el.addEventListener('click',()=>window.events.push({entity:b.entity}));
      group.append(el);
    });
    const compactStyle=shadow.lastElementChild;
    const update=()=>compactStyle.textContent=new Function('hass','onTeardown','renderTemplate','return `'+compact+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
    update();
    const readControls=()=>[...root.querySelectorAll('.bubble-sub-button')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {width:r.width,height:r.height,padding:s.padding,fontSize:s.fontSize};});
    const before=readControls(),nodes=[...root.querySelectorAll('.bubble-state,.bubble-sub-button,.bubble-dropdown-select')];
    if(scenario.fill!==false)ctx.config={...ctx.config,signature_compact:{...ctx.config.signature_compact,fill:{reference_entity:'sensor.house'}}};update();
    window.fillContext=ctx;window.updateFill=update;
    if(scenario.alert){
      ctx.config.alert_manager={};ctx._hass.states['sensor.alert_manager_main_active']={state:'1',attributes:{alerts:[{id:'rule:power:sensor.demo',entity_id:'sensor.demo'}]}};
      const style=document.createElement('style');style.textContent=new Function('hass','onTeardown','return `'+alert+'`;').call(ctx,ctx._hass,()=>{});shadow.append(style);
    }
    return {before,after:readControls(),sameNodes:nodes.every((node,i)=>node===root.querySelectorAll('.bubble-state,.bubble-sub-button,.bubble-dropdown-select')[i])};
  },{compact,alert,nativeCSS,buttons:controls[scenario.controls||'none'],scenario});
}
async function geometry(page){return page.evaluate(()=>{
  const root=window.fillContext.card,host=root.querySelector('.bubble-container');const rect=host.getBoundingClientRect();
  const read=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left-rect.left,right:r.right-rect.left,top:r.top-rect.top,bottom:r.bottom-rect.top,width:r.width,height:r.height,color:s.color,fontSize:s.fontSize};};
  const s=getComputedStyle(host);
  const badge=root.querySelector('.am-alert-badge');
  return {width:rect.width,height:rect.height,background:s.backgroundImage,size:s.backgroundSize,surface:s.backgroundColor,transition:s.transitionDuration,state:read(root.querySelector('.bubble-state')),unit:read(root.querySelector('.dp-unit')),name:read(root.querySelector('.bubble-name')),buttons:[...root.querySelectorAll('.bubble-sub-button')].map(read),badge:badge?getComputedStyle(badge).display:null};
});}

test('fill retains switch/select nodes, native geometry and click/change handlers',async t=>{
  const page=await fixture(t);
  for(const grouped of [false,true])for(const name of ['switch','select']){
    const result=await prepare(page,{controls:name,grouped,width:328});assert.equal(result.sameNodes,true);assert.deepEqual(result.after,result.before);
    const shell=page.locator('[data-id="compact"]');
    if(name==='switch'){await shell.locator('.bubble-sub-button').click();assert.deepEqual(result.after[0],{width:52,height:34,padding:'0px',fontSize:'12px'});}
    else await shell.locator('select').selectOption('Fast');
    assert.equal((await page.evaluate(()=>window.events)).length,1);
  }
});

test('fill stays within the card with values and controls at mobile/desktop widths',async t=>{
  const page=await fixture(t);
  for(const width of [288,328,358,382,600])for(const mode of ['light','dark'])for(const controls of ['none','switch','select','temperatures','crowded']){
    await prepare(page,{width,mode,controls,grouped:true});const g=await geometry(page);
    assert.equal(g.state.fontSize,'20px');assert.equal(g.unit.fontSize,'13px');
    assert.ok(g.name.width>0,'No room for the name: '+JSON.stringify({width,controls,g}));
    for(const b of [g.state,...g.buttons])assert.ok(b.left>=0&&b.right<=g.width+.1&&b.top>=0&&b.bottom<=g.height+.1,'Clipped control: '+JSON.stringify({width,controls,g}));
    assert.match(g.background,/linear-gradient/);assert.match(g.size,/20% 100%/);
  }
});

test('fill follows live theme changes, missing values, reduced motion and Alert Manager badges',async t=>{
  const page=await fixture(t,{reducedMotion:'reduce'});
  await prepare(page,{width:328,plain:true,alert:true});const before=await geometry(page);
  assert.equal(before.transition,'0s');assert.equal(before.badge,'flex');
  await page.evaluate(()=>{document.body.style.setProperty('--signature-card-background','#123456');document.body.style.setProperty('--primary-text-color','#eee');});
  const changed=await geometry(page);assert.equal(changed.surface,'rgb(18, 52, 86)');assert.equal(changed.state.color,'rgb(238, 238, 238)');
  await page.evaluate(()=>{window.fillContext._hass.states['sensor.house'].state='unavailable';window.updateFill();});
  const missing=await geometry(page);assert.equal(missing.background,'none');assert.equal(missing.badge,'flex');
});

test('small value buttons precede native actions and keep switches last at narrow/wide widths',async t=>{
  const page=await fixture(t);
  for(const width of [288,328,382,480,500,600])for(const mode of ['light','dark'])for(const control of ['none','switch','select','crowded','mixed']){
    const result=await prepare(page,{width,mode,controls:control,grouped:true,valueStyle:'button',name:'Pompe de relevage',fill:width!==328,alert:control==='switch',secondary:width===480?'Actif':'',noIcon:width===382});
    assert.ok(result.sameNodes);assert.deepEqual(result.after,result.before);
    const g=await geometry(page);
    assert.equal(g.state.fontSize,'14px');assert.equal(g.unit.fontSize,'12px');assert.equal(g.state.height,36);
    assert.ok(g.name.width>0,'Name clipped: '+JSON.stringify({width,control,g}));
    for(const b of [g.state,...g.buttons])assert.ok(b.left>=0&&b.right<=g.width+.1&&b.top>=0&&b.bottom<=g.height+.1,'Control clipped: '+JSON.stringify({width,control,g}));
    for(const b of g.buttons)assert.ok(b.top>=g.state.bottom-.1||b.left>=g.state.right-.1,'Power must precede controls: '+JSON.stringify({width,control,g}));
    if(control==='mixed')for(const b of g.buttons.slice(1))assert.ok(g.buttons[0].top>=b.bottom-.1||g.buttons[0].left>=b.right-.1,'Switch must end its group: '+JSON.stringify({width,control,g}));
    if(control==='switch')assert.equal(g.badge,'flex');
  }
  await prepare(page,{width:328,controls:'mixed',grouped:true,valueStyle:'button'});
  const shell=page.locator('[data-id="compact"]');
  await shell.locator('.bubble-state').click();
  await shell.locator('select').selectOption('Fast');
  await shell.locator('.bubble-sub-button-1').click();
  assert.deepEqual(await page.evaluate(()=>window.events),[{entity:'sensor.demo',action:'more-info'},{entity:'select.mode',value:'Fast'},{entity:'switch.socket'}]);
  await page.evaluate(()=>{window.smallState=window.fillContext.elements.state;window.fillContext.config.signature_compact.value_style='text';window.updateFill();});
  assert.equal((await geometry(page)).state.fontSize,'20px');
  await page.evaluate(()=>{window.fillContext.config.signature_compact.value_style='button';window.updateFill();});
  assert.equal((await geometry(page)).state.fontSize,'14px');
  assert.ok(await page.evaluate(()=>window.smallState===window.fillContext.elements.state));
});
