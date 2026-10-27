const assert=require('node:assert/strict'),fs=require('node:fs');
const {test}=require('node:test');
const {setup,draw}=require('./panel-variants.fixture.cjs');
const nativePath=process.env.BUBBLE_VARIANTS_NATIVE_SCRIPT_PATH;
test('illustrated headings and measurement strips fit real Bubble at phone and desktop widths',{skip:!nativePath},async t=>{
 const page=await setup(t);
 await page.setViewportSize({width:2100,height:1400});
 for(const width of [288,328,358,382,600,900,1036,1568,2000])for(const mode of ['light','dark'])for(const plain of [false,true])for(const kind of ['none','single','double','mode','mower','strip']){
  await draw(page,{width,mode,plain,kind});
  const m=await page.evaluate(()=>{
   const root=card.card,host=root.querySelector('.bubble-container'),frame=host.getBoundingClientRect();
   const visible=el=>{const r=el.getBoundingClientRect();return getComputedStyle(el).display!=='none'&&r.width>0&&r.height>0};
   const fields=[...root.querySelectorAll('.bubble-state,.dp-panel-state,.dp-panel-title,.bubble-name,.dp-panel-name,.dp-secondary,.dp-panel-secondary,.bubble-sub-button')].filter(visible);
   const artwork=getComputedStyle(host,'::after'),layout=getComputedStyle(host),lastTrack=parseFloat(layout.gridTemplateColumns.split(' ').at(-1));
   return{width:frame.width,left:frame.left-document.querySelector('#cards').getBoundingClientRect().left,artwork:{width:parseFloat(artwork.width),right:parseFloat(layout.paddingRight)+(lastTrack-parseFloat(artwork.width))/2},height:frame.height,count:root.getAttribute('data-dp-panel-count'),fields:fields.map(el=>{const r=el.getBoundingClientRect();return{text:el.textContent,cls:el.className,left:r.left-frame.left,right:r.right-frame.left,top:r.top-frame.top,bottom:r.bottom-frame.top,fontSize:parseFloat(getComputedStyle(el).fontSize),overflow:el.scrollWidth-el.clientWidth}})};
  });
  const hint=JSON.stringify({width,mode,kind,m});
  if(process.env.PANEL_CAPTURE_DIR&&[382,900,1568].includes(width)){
   fs.mkdirSync(process.env.PANEL_CAPTURE_DIR,{recursive:true});
   await page.locator('bubble-card').screenshot({path:process.env.PANEL_CAPTURE_DIR+'/'+kind+'-'+width+'-'+mode+'.png'});
  }
  assert.ok(m.height>=80,hint);
  assert.equal(m.width,width,'heading must fill its native section: '+hint);
  assert.equal(m.left,0,'heading must remain left aligned: '+hint);
  for(const f of m.fields){assert.ok(f.left>=-1&&f.right<=m.width+1&&f.top>=-1&&f.bottom<=m.height+1,hint);if(!f.cls.includes('bubble-sub-button'))assert.ok(f.overflow<=1,hint);}
  for(let i=0;i<m.fields.length;i++)for(let j=i+1;j<m.fields.length;j++){
   const a=m.fields[i],b=m.fields[j];
   assert.ok(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'overlapping native fields: '+hint);
  }
  if(kind==='mode'&&width>=350){
   const value=m.fields.find(f=>f.cls.includes('bubble-state')),control=m.fields.find(f=>f.cls.includes('is-select'));
   assert.ok(Math.abs((value.top+value.bottom-control.top-control.bottom)/2)<1,'mode must align with temperature: '+hint);
   const centers=[(value.left+value.right)/2,(control.left+control.right)/2,m.width-m.artwork.right-m.artwork.width/2];
   assert.ok(control.left-value.right>=8&&Math.abs((centers[1]-centers[0])-(centers[2]-centers[1]))<2,'temperature, mode and illustration must occupy balanced centered zones: '+hint);
  }
  if(kind!=='strip'){
   for(const field of m.fields.filter(f=>!f.cls.includes('settings')))
    assert.ok(field.right<=m.width-m.artwork.right-m.artwork.width+2,'reserve artwork space: '+hint);
   assert.ok(m.artwork.width<=m.height+1,'artwork must not be clipped vertically: '+hint);
   if(m.width>=600&&kind!=='none'){
    const title=m.fields.find(f=>f.cls.includes('dp-panel-title'));
    const footer=m.fields.filter(f=>f.cls.includes('bubble-sub-button')&&!f.cls.includes('settings')).some(f=>f.top>=m.fields.find(f=>f.cls.includes('bubble-state')).bottom);
    assert.ok(m.height>=112&&m.height<=118+Math.max(0,title.bottom-title.top-32)+(footer?44:0),'heading grows only for wrapped titles or required controls: '+hint);
    for(const field of m.fields.filter(f=>f.cls.includes('bubble-state')||f.cls.includes('dp-panel-state')))assert.ok(field.fontSize>=30&&field.fontSize<=40,'keep summary values readable without oversized numbers: '+hint);
    assert.equal(m.artwork.width,96,'illustration uses the compact size: '+hint);
   }
   if(kind==='double'){
    const temperature=m.fields.find(f=>f.cls.includes('bubble-state')),humidity=m.fields.find(f=>f.cls.includes('dp-panel-state'));
    const centers=[(temperature.left+temperature.right)/2,(humidity.left+humidity.right)/2,m.width-m.artwork.right-m.artwork.width/2];
    assert.ok(Math.abs((centers[1]-centers[0])-(centers[2]-centers[1]))<2,'the two measurements and artwork must be evenly spaced: '+hint);
    const title=m.fields.find(f=>f.cls.includes('dp-panel-title'));
    assert.ok(Math.abs(m.height-temperature.bottom-title.top)<1,'balance the top title margin and bottom value margin: '+hint);
    assert.ok(m.height-temperature.bottom<=30,'remove unused space below measurements: '+hint);
    if(m.width<=520)assert.ok(m.height<=102+Math.max(0,title.bottom-title.top-28),'phone summary grows only for wrapped titles: '+hint);
    if(m.width>=382&&m.width<=520)assert.ok(title.bottom-title.top<=30,'use the space before the artwork to avoid an unnecessary second title line: '+hint);
   }
  }
  if(kind==='none'){assert.equal(m.count,'0');assert.ok(!m.fields.some(f=>f.cls.includes('state')),hint);assert.ok(m.height<120,hint);}
  if(kind==='strip')assert.equal(m.count,'3');
 }
});
test('native treatment toggles, value details, settings and primary visibility keep their targets',{skip:!nativePath},async t=>{
 const page=await setup(t);
 await draw(page,{width:382,mode:'dark',kind:'strip'});
 await page.locator('bubble-card').locator('.ph-control').click();
 await page.waitForFunction(()=>calls.length>0);
 assert.equal((await page.evaluate(()=>calls.at(-1))).config.tap_action.action,'toggle');
 await draw(page,{width:382,mode:'light',kind:'strip',primary:false});
 assert.equal(await page.evaluate(()=>card.card.getAttribute('data-dp-panel-count')),'2');
 const primary=await page.evaluate(()=>getComputedStyle(card.card.querySelector('.bubble-state')).display);assert.equal(primary,'none');
 await draw(page,{width:382,mode:'light',kind:'double'});
 await page.locator('bubble-card').locator('.settings').click();await page.waitForFunction(()=>calls.length>0);
 assert.equal((await page.evaluate(()=>calls.at(-1))).config.tap_action.navigation_path,'#scenarios');
 await page.evaluate(()=>window.calls=[]);await page.locator('bubble-card').locator('.dp-panel-state').click();await page.waitForFunction(()=>calls.length>0);
 assert.equal((await page.evaluate(()=>calls.at(-1))).config.entity,'sensor.humidity');
});
test('a heading fills its section through resize and preserves a live explicit width override',{skip:!nativePath},async t=>{
 const page=await setup(t);await page.setViewportSize({width:2100,height:1400});
 await draw(page,{width:1568,mode:'light',kind:'double'});
 await page.evaluate(()=>window.savedNodes={settings:card.card.querySelector('.settings'),value:card.card.querySelector('.dp-panel-state')});
 for(const width of [2000,382,1568]){
  await page.evaluate(width=>document.querySelector('#cards').style.width=width+'px',width);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const m=await page.evaluate(()=>{const root=card.card,box=root.querySelector('.bubble-container').getBoundingClientRect();return{width:box.width,left:box.left-document.querySelector('#cards').getBoundingClientRect().left,same:savedNodes.settings===root.querySelector('.settings')&&savedNodes.value===root.querySelector('.dp-panel-state')}});
  assert.equal(m.width,width);assert.equal(m.left,0);assert.equal(m.same,true);
 }
 await page.evaluate(()=>document.documentElement.style.setProperty('--signature-panel-heading-max-width','760px'));
 await page.waitForFunction(()=>card.card.getBoundingClientRect().width===760);
 await page.locator('bubble-card').locator('.settings').click();await page.waitForFunction(()=>calls.length>0);
 assert.equal((await page.evaluate(()=>calls.at(-1))).config.tap_action.navigation_path,'#scenarios');
 await page.evaluate(()=>window.calls=[]);await page.locator('bubble-card').locator('.dp-panel-state').click();await page.waitForFunction(()=>calls.length>0);
 assert.equal((await page.evaluate(()=>calls.at(-1))).config.entity,'sensor.humidity');
});

test('a single-reading heading centers Normal and Hivers between temperature and artwork from 350 px, with a narrow fallback',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,349,350,358,382,386,480,520,521,600,1032])for(const mode of ['light','dark'])for(const poolMode of ['Normal','Hivers']){
  await draw(page,{width,mode,kind:'mode',poolMode});
  const m=await page.evaluate(()=>{
   const root=card.card,host=root.querySelector('.bubble-container'),frame=host.getBoundingClientRect();
   const rect=el=>{const r=el.getBoundingClientRect();return{left:r.left-frame.left,right:r.right-frame.left,top:r.top-frame.top,bottom:r.bottom-frame.top,width:r.width,height:r.height}};
   const value=rect(root.querySelector('.bubble-state')),select=root.querySelector('.is-select'),label=select.querySelector('.bubble-sub-button-name-container'),art=getComputedStyle(host,'::after'),layout=getComputedStyle(host),lastTrack=parseFloat(layout.gridTemplateColumns.split(' ').at(-1));
   return{value,control:rect(select),text:label.textContent,overflow:label.scrollWidth-label.clientWidth,artStart:frame.width-parseFloat(layout.paddingRight)-(lastTrack+parseFloat(art.width))/2,artCenter:frame.width-parseFloat(layout.paddingRight)-lastTrack/2};
  });
  const hint=JSON.stringify({width,mode,poolMode,m});
  assert.equal(m.text.trim(),poolMode,hint);assert.ok(m.overflow<=1,hint);assert.equal(m.control.height,44,hint);
  assert.ok(m.control.right<=m.artStart+1,'keep the selector clear of the illustration: '+hint);
  if(width>=350){
   assert.ok(Math.abs((m.value.top+m.value.bottom-m.control.top-m.control.bottom)/2)<1,'align selector and temperature: '+hint);
   const centers=[(m.value.left+m.value.right)/2,(m.control.left+m.control.right)/2,m.artCenter];
   assert.ok(m.control.left-m.value.right>=8&&Math.abs((centers[1]-centers[0])-(centers[2]-centers[1]))<2,'center each item in a balanced zone: '+hint);
  }else assert.ok(m.control.top>=m.value.bottom,'keep the selector below when the row is too narrow: '+hint);
 }
 // Resizing must change only CSS placement, preserving native select and actions.
 await draw(page,{width:328,mode:'dark',kind:'mode',poolMode:'Hivers'});
 await page.evaluate(()=>window.savedSelect=card.card.querySelector('.is-select'));
 for(const width of [382,1032,328]){
  await page.evaluate(width=>document.querySelector('#cards').style.width=width+'px',width);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(await page.evaluate(()=>savedSelect===card.card.querySelector('.is-select')),true);
 }
});

test('headings reuse existing vertical space without increasing height or moving horizontal positions',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,382,600,1032])for(const kind of ['single','double','mode','mower'])for(const mode of ['light','dark']){
  await draw(page,{width,kind,mode});
  const m=await page.evaluate(async width=>{
   const host=card.card.querySelector('.bubble-container');
   const read=()=>{const r=host.getBoundingClientRect();const rect=e=>{const b=e.getBoundingClientRect();return{cls:e.className,top:b.top-r.top,bottom:b.bottom-r.top,left:b.left-r.left,right:b.right-r.left}};return{height:r.height,title:rect(host.querySelector('.dp-panel-title')),fields:[...host.querySelectorAll('.bubble-state,.dp-panel-state,.bubble-sub-button-container')].filter(e=>e.getBoundingClientRect().height>0).map(rect)}};
   const current=read();
   // Compare against the previous 1.4.7 row contract on these same native nodes.
   host.style.setProperty('grid-template-rows',`minmax(${width<=520?28:32}px,max-content) 4px minmax(44px,max-content) auto auto`,'important');
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   return{current,previous:read()};
  },width);
  const hint=JSON.stringify({width,kind,mode,m});
  assert.ok(m.current.height<=m.previous.height+.1,'reuse space without increasing the card height: '+hint);
  assert.ok(Math.abs(m.current.title.top-m.previous.title.top)<.1,'keep the title in place: '+hint);
  assert.equal(m.current.fields.length,m.previous.fields.length,hint);
  m.current.fields.forEach((f,i)=>{const old=m.previous.fields[i];const shrink=f.cls.includes('sub-button-container')?m.previous.height-m.current.height:0;assert.ok(f.top>=old.top-shrink-.1,'keep values below their previous position and footer controls within the original height: '+hint);assert.ok(Math.abs(f.left-old.left)<.1&&Math.abs(f.right-old.right)<.1,'keep horizontal positioning unchanged: '+hint);});
 }
});

test('conditional garden controls use centered zones and release their column when hidden',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [328,382,600,900,1032])for(const mode of ['light','dark'])for(const mowerHome of [true,false]){
  await draw(page,{width,mode,kind:'mower',mowerHome});
  const m=await page.evaluate(()=>{
   const root=card.card,host=root.querySelector('.bubble-container'),r=host.getBoundingClientRect(),s=getComputedStyle(host),art=getComputedStyle(host,'::after'),tracks=s.gridTemplateColumns.split(' ').map(parseFloat);
   const center=e=>{const b=e.getBoundingClientRect();return(b.left+b.right)/2-r.left};
   const button=root.querySelector('.bubble-sub-button-container .bubble-sub-button'),values=[...root.querySelectorAll('.bubble-state,.dp-panel-state')].map(center);
   return{columns:tracks.length,values,control:center(button),visible:getComputedStyle(button).display!=='none',art:r.width-parseFloat(s.paddingRight)-tracks.at(-1)/2};
  });
  const hint=JSON.stringify({width,mode,mowerHome,m});
  assert.equal(m.visible,mowerHome,hint);assert.equal(m.columns,mowerHome&&width>760?4:3,hint);
  if(mowerHome&&width>760){
   const centers=[...m.values,m.control,m.art],gaps=centers.slice(1).map((c,i)=>c-centers[i]);
   assert.ok(Math.max(...gaps)-Math.min(...gaps)<2,'center all four garden fields in regular columns: '+hint);
  }else{
   assert.ok(Math.abs((m.values[1]-m.values[0])-(m.art-m.values[1]))<2,'keep readings and artwork balanced when controls wrap or disappear: '+hint);
   if(mowerHome)assert.ok(Math.abs(m.control-(m.values[0]+m.values[1])/2)<2,'center footer commands under the readings: '+hint);
  }
 }
 await draw(page,{width:1032,mode:'dark',kind:'mower'});
 await page.evaluate(()=>window.savedMower=card.card.querySelector('.bubble-sub-button-container .bubble-sub-button'));
 for(const state of ['not_home','home']){
  await page.evaluate(state=>{window.hass={...hass,states:{...hass.states,'device_tracker.mower':{...hass.states['device_tracker.mower'],state}}};card.hass=hass;},state);
  await page.waitForFunction(count=>getComputedStyle(card.card.querySelector('.bubble-container')).gridTemplateColumns.split(' ').length===count,state==='home'?4:3);
  assert.equal(await page.evaluate(()=>savedMower===card.card.querySelector('.bubble-sub-button-container .bubble-sub-button')),true);
 }
});

test('hiding a native selector removes its reserved heading column without replacing nodes',{skip:!nativePath},async t=>{
 const page=await setup(t);await draw(page,{width:386,mode:'dark',kind:'mode',poolMode:'Hivers'});
 await page.evaluate(()=>window.savedMode=card.card.querySelector('.is-select'));
 for(const method of ['class','attribute']){
  await page.evaluate(method=>{if(method==='class')savedMode.classList.add('hidden');else savedMode.hidden=true;},method);
  await page.waitForFunction(()=>getComputedStyle(card.card.querySelector('.bubble-container')).gridTemplateColumns.split(' ').length===2);
  await page.evaluate(method=>{if(method==='class')savedMode.classList.remove('hidden');else savedMode.hidden=false;},method);
  await page.waitForFunction(()=>getComputedStyle(card.card.querySelector('.bubble-container')).gridTemplateColumns.split(' ').length===3);
  assert.equal(await page.evaluate(()=>savedMode===card.card.querySelector('.is-select')),true);
 }
});
