const assert=require('node:assert/strict');
const {test}=require('node:test');
const {setup,draw}=require('./panel-variants.fixture.cjs');
const nativePath=process.env.BUBBLE_VARIANTS_NATIVE_SCRIPT_PATH;
const geometry=()=>{
 const root=card.card,host=root.querySelector('.bubble-container'),frame=host.getBoundingClientRect(),style=getComputedStyle(host),art=getComputedStyle(host,'::after');
 const rect=e=>{const r=e.getBoundingClientRect();return{x:r.left-frame.left,y:r.top-frame.top,width:r.width,height:r.height}};
 const button=selector=>{const e=root.querySelector(selector),s=getComputedStyle(e);return{...rect(e),display:s.display,background:s.backgroundImage,pointer:s.pointerEvents,color:getComputedStyle(e.querySelector('.bubble-sub-button-icon')).color,icon:e.querySelector('.bubble-sub-button-icon').getAttribute('icon')}};
 return{width:frame.width,height:frame.height,tracks:style.gridTemplateColumns,rows:style.gridTemplateRows,title:rect(root.querySelector('.dp-panel-title')),values:[...root.querySelectorAll('.bubble-state,.dp-panel-state')].filter(e=>e.getBoundingClientRect().height>0).map(rect),art:{width:art.width,grid:art.gridArea,position:art.backgroundPosition,size:art.backgroundSize},settings:button('.settings'),robot:button('.robot-status')};
};
test('heading robot badges share symmetric corner margins, native targets and fixed artwork without a reserved column',{skip:!nativePath},async t=>{
 const page=await setup(t);await page.setViewportSize({width:1700,height:900});
 for(const width of [288,328,350,386,520,600,761,1032,1568])for(const mode of ['light','dark'])for(const plain of [false,true])for(const kind of ['mower','mode']){
  await draw(page,{width,mode,plain,kind,robotBadge:true,title:kind==='mower'?'Jardin':'Piscine'});
  const m=await page.evaluate(geometry),hint=JSON.stringify({width,mode,plain,kind,m});
  for(const b of [m.settings,m.robot]){assert.equal(b.width,44,hint);assert.equal(b.height,44,hint);assert.equal(b.pointer,'auto',hint);assert.ok(b.background.includes('16px'),hint);}
  assert.equal(m.settings.x,m.robot.x,'keep both controls on the same vertical axis: '+hint);
  const insetTop=m.settings.y,insetRight=m.width-m.settings.x-44,insetBottom=m.height-m.robot.y-44;
  assert.ok(Math.abs(insetTop-insetRight)<.1&&Math.abs(insetBottom-insetRight)<.1,'equal outer target and visible circle margins: '+hint);
  assert.ok(m.settings.y+44<=m.robot.y,'targets must not overlap: '+hint);
  // Hide only the robot, as native visibility does: no change to layout or artwork.
  await page.evaluate(()=>card.card.querySelector('.robot-status').classList.add('hidden'));
  const hidden=await page.evaluate(geometry);
  for(const key of ['height','tracks','rows','title','values','art','settings'])assert.deepEqual(hidden[key],m[key],'hiding the robot must leave geometry unchanged: '+hint);
  await page.evaluate(()=>card.card.querySelector('.robot-status').classList.remove('hidden'));
  // Compare with a real no-badge heading using the same native select/readings.
  const baseKind=kind==='mower'?'double':'mode';await draw(page,{width,mode,plain,kind:baseKind,title:kind==='mower'?'Jardin':'Piscine'});
  const without=await page.evaluate(()=>{const h=card.card.querySelector('.bubble-container'),r=h.getBoundingClientRect(),s=getComputedStyle(h),a=getComputedStyle(h,'::after');const rect=e=>{const b=e.getBoundingClientRect();return{x:b.left-r.left,y:b.top-r.top,width:b.width,height:b.height}};return{height:r.height,tracks:s.gridTemplateColumns,rows:s.gridTemplateRows,title:rect(card.card.querySelector('.dp-panel-title')),values:[...card.card.querySelectorAll('.bubble-state,.dp-panel-state')].filter(e=>e.getBoundingClientRect().height>0).map(rect),art:{width:a.width,grid:a.gridArea,position:a.backgroundPosition,size:a.backgroundSize}}});
  for(const key of ['height','tracks','rows','title','values','art'])assert.deepEqual(without[key],m[key],'adding the badge must not move artwork or data: '+hint);
 }
});
test('robot badges retain popup actions, visibility, live colors/icons and their native nodes',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const kind of ['mower','mode']){
  await draw(page,{width:386,mode:'dark',kind,robotBadge:true});
  await page.evaluate(()=>window.robotNode=card.card.querySelector('.robot-status'));
  await page.locator('bubble-card').locator('.robot-status').click();await page.waitForFunction(()=>calls.length>0);
  assert.equal((await page.evaluate(()=>calls.at(-1))).config.tap_action.navigation_path,kind==='mower'?'#mower':'#dolphin');
  await page.evaluate(()=>window.calls=[]);await page.locator('bubble-card').locator('.settings').click();await page.waitForFunction(()=>calls.length>0);
  assert.equal((await page.evaluate(()=>calls.at(-1))).config.tap_action.navigation_path,'#scenarios');
  for(const width of [1032,328,386]){await page.evaluate(width=>document.querySelector('#cards').style.width=width+'px',width);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.evaluate(()=>robotNode===card.card.querySelector('.robot-status')),true);}
  const activeColor=kind==='mower'?'#29958A':'#368ACB',activeIcon=kind==='mower'?'mdi:robot-mower':'mdi:robot-vacuum';
  for(const [state,icon,color,opacity] of [['docked',kind==='mower'?'mdi:robot-mower-outline':'mdi:robot-vacuum-off','#818181',1],[kind==='mower'?'mowing':'cleaning',activeIcon,activeColor,1],['returning','mdi:home-import-outline',activeColor,1],['paused','mdi:pause-circle-outline','#B97918',1],['error','mdi:alert-circle-outline','#E1463E',1],['unavailable','mdi:help-circle-outline','#818181',.4],['unknown','mdi:help-circle-outline','#818181',.4]]){
   await page.evaluate(({kind,state,icon,color,opacity})=>{const spec=card.config.signature_panel.sub_button_styles['robot-status'];Object.assign(spec,{icon,color,opacity});const entity=kind==='mower'?'lawn_mower.demo':'vacuum.demo';window.hass={...hass,states:{...hass.states,[entity]:{...hass.states[entity],state}}};card.hass=hass;},{kind,state,icon,color,opacity});
   const rgb='rgb('+color.slice(1).match(/../g).map(v=>parseInt(v,16)).join(', ')+')';
   await page.waitForFunction(({icon,rgb,opacity})=>{const e=card.card.querySelector('.robot-status'),i=e.querySelector('.bubble-sub-button-icon');return i.getAttribute('icon')===icon&&getComputedStyle(i).color===rgb&&Number(getComputedStyle(e).opacity)===opacity;},{icon,rgb,opacity});
   assert.equal(await page.evaluate(()=>robotNode===card.card.querySelector('.robot-status')),true,'state changes keep native nodes and actions');
  }
  if(kind==='mower')for(const state of ['not_home','home']){await page.evaluate(state=>{window.hass={...hass,states:{...hass.states,'device_tracker.mower':{...hass.states['device_tracker.mower'],state}}};card.hass=hass;},state);await page.waitForFunction(visible=>getComputedStyle(card.card.querySelector('.robot-status')).display!=='none'===visible,state==='home');assert.equal(await page.evaluate(()=>robotNode===card.card.querySelector('.robot-status')),true);}
 }
});
