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
   assert.ok(control.left-value.right>=8&&control.left-value.right<=56,'mode must stay beside temperature: '+hint);
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
    assert.ok(temperature.top-title.bottom<=8,'bring the measurements close to the title: '+hint);
    assert.ok(m.height-temperature.bottom<=30,'remove unused space below measurements: '+hint);
    if(m.width<=520)assert.ok(m.height<=102+Math.max(0,title.bottom-title.top-28),'phone summary grows only for wrapped titles: '+hint);
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

test('a single-reading heading keeps Normal and Hivers beside temperature from 350 px, with a narrow fallback',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,349,350,358,382,480,520,521,600,1032])for(const poolMode of ['Normal','Hivers']){
  await draw(page,{width,mode:'light',kind:'mode',poolMode});
  const m=await page.evaluate(()=>{
   const root=card.card,host=root.querySelector('.bubble-container'),frame=host.getBoundingClientRect();
   const rect=el=>{const r=el.getBoundingClientRect();return{left:r.left-frame.left,right:r.right-frame.left,top:r.top-frame.top,bottom:r.bottom-frame.top,width:r.width,height:r.height}};
   const value=rect(root.querySelector('.bubble-state')),select=root.querySelector('.is-select'),label=select.querySelector('.bubble-sub-button-name-container'),art=getComputedStyle(host,'::after'),layout=getComputedStyle(host),lastTrack=parseFloat(layout.gridTemplateColumns.split(' ').at(-1));
   return{value,control:rect(select),text:label.textContent,overflow:label.scrollWidth-label.clientWidth,artStart:frame.width-parseFloat(layout.paddingRight)-(lastTrack+parseFloat(art.width))/2};
  });
  const hint=JSON.stringify({width,poolMode,m});
  assert.equal(m.text.trim(),poolMode,hint);assert.ok(m.overflow<=1,hint);assert.equal(m.control.height,44,hint);
  assert.ok(m.control.right<=m.artStart+1,'keep the selector clear of the illustration: '+hint);
  if(width>=350){
   assert.ok(Math.abs((m.value.top+m.value.bottom-m.control.top-m.control.bottom)/2)<1,'align selector and temperature: '+hint);
   assert.ok(m.control.left-m.value.right>=8&&m.control.left-m.value.right<=56,'place selector immediately after temperature: '+hint);
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
