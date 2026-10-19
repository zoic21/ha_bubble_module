const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-panel').code;

test('Panel reclaims only the artwork track, preserving sprite scale, values and live theme sizing',async t=>{
 const page=await fixture(t);
 for(const width of [288,328,358,382,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const count of [1,2,3]){
  await render(page,{width,mode,plain});
  const results=await page.evaluate(({code,count})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='square');ctx.teardown();
   ctx.config={card_type:'button',button_type:'state',show_state:true,show_icon:false,entity:'sensor.power',signature_panel:{secondary:'Détail',
    information:[{entity:'sensor.temp',name:'Consommation'},{entity:'sensor.humidity',name:'Coût'}].slice(0,count-1),
    illustration:{image:'/local/atlas.webp',columns:2,rows:1,index:1}}};
   ctx._hass.states['sensor.power']={state:'638',attributes:{unit_of_measurement:'W'}};
   ctx._hass.states['sensor.temp']={state:'6.1',attributes:{unit_of_measurement:'kWh'}};
   ctx._hass.states['sensor.humidity']={state:'0.94',attributes:{unit_of_measurement:'€'}};
   ctx.card.querySelector('.bubble-name').textContent='Puissance';
   const state=ctx.elements.state,style=ctx.card.getRootNode().querySelectorAll('style')[1];
   const update=()=>style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;')
    .call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
   const read=()=>{
    const host=ctx.card.querySelector('.bubble-container'),art=getComputedStyle(host,'::after');
    const tracks=getComputedStyle(host).gridTemplateColumns.split(' ');
    return{height:host.getBoundingClientRect().height,art:[parseFloat(art.width),parseFloat(art.height)],
     track:parseFloat(tracks.at(-1)),background:[art.backgroundSize,art.backgroundPosition],sameState:ctx.elements.state===state,
     fonts:[...ctx.card.querySelectorAll('.bubble-state,.dp-panel-state')].map(e=>getComputedStyle(e).fontSize)};
   };
   update();const base=read(),narrow=[];
   for(const ratio of [0.65,0.7,0.75,0.8]){ctx.config.signature_panel.illustration.width_ratio=ratio;update();narrow.push({ratio,...read()});}
   ctx.config.signature_panel.illustration.width_ratio=0.75;update();
   ctx.card.style.setProperty('--signature-illustration-size','64px');
   const themed=read();
   ctx.card.style.removeProperty('--signature-illustration-size');
   delete ctx.config.signature_panel.illustration.width_ratio;update();
   return{base,narrow,themed,restored:read()};
  },{code,count});
  const hint=JSON.stringify({width,mode,plain,count,results});
  assert.deepEqual(results.base.art,[80,80],hint);assert.equal(results.base.track,80,hint);
  for(const current of results.narrow){
   assert.equal(current.height,118,hint);assert.deepEqual(current.art,[80,80],hint);
   assert.ok(Math.abs(current.track-80*current.ratio)<0.1,hint);
   assert.deepEqual(current.background,results.base.background,hint);
   assert.deepEqual(current.fonts,results.base.fonts,hint);assert.equal(current.sameState,true,hint);
  }
  assert.deepEqual(results.themed.art,[64,64],hint);assert.equal(results.themed.track,48,hint);
  assert.deepEqual(results.restored,results.base,hint);
 }
});

test('Panel respects native no-background over numeric thresholds and active commands',async t=>{
 const page=await fixture(t);
 for(const width of [288,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await render(page,{width,mode,plain});
  const result=await page.evaluate(({code})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='square');ctx.teardown();
   const button=show_background=>({entity:'sensor.demo',show_name:true,show_background});
   ctx.config={card_type:'button',button_type:'state',entity:'sensor.demo',
    sub_button:{main:[{group:[button(false),button(false)]}],bottom:[button(true)]},
    signature_panel:{sub_button_styles:{
     1:{color_thresholds:{enabled:true,values:[{value:0,color:'#29958A'},{value:100,color:'#29958A'}]}},
     2:{type:'command',active:true,color:'#368ACB'},3:{background:'#B97918'}
    }}};
   const host=ctx.card.querySelector('.bubble-sub-button-container');
   host.innerHTML=[1,2,3].map(i=>'<div class="bubble-sub-button bubble-sub-button-'+i+'" style="background:#039be5"><ha-icon class="bubble-sub-button-icon"></ha-icon><span class="bubble-sub-button-name-container">Mesure</span></div>').join('');
   let calls=0;host.firstElementChild.addEventListener('click',()=>calls++);
   const style=ctx.card.getRootNode().querySelectorAll('style')[1];
   const update=()=>style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
   const read=()=>[...host.children].map(e=>({background:getComputedStyle(e).backgroundColor,icon:getComputedStyle(e.querySelector('.bubble-sub-button-icon')).color}));
   update();const initial=read();host.firstElementChild.click();
   ctx.config.sub_button.main[0].group.forEach(b=>b.show_background=true);update();const restored=read();
   ctx.config.sub_button.main[0].group.forEach(b=>b.show_background=false);update();const again=read();
   return {initial,restored,again,calls};
  },{code});
  for(const colors of [result.initial,result.again]){
   assert.deepEqual(colors.map(b=>b.background),['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)','rgb(185, 121, 24)']);
   assert.equal(colors[0].icon,'rgb(41, 149, 138)');assert.equal(colors[1].icon,'rgb(54, 138, 203)');
  }
  assert.ok(result.restored.slice(0,2).every(b=>b.background!=='rgba(0, 0, 0, 0)'));
  assert.equal(result.calls,1);
 }
});

// Always runs in CI; panel-native.browser.cjs adds the optional real Bubble pipeline.
test('Panel shares theme typography and one grid for one to three information columns',async t=>{
 const page=await fixture(t);
 for(const width of [288,328,358,382,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const count of [1,2,3]){
  await render(page,{width,mode,plain});
  const m=await page.evaluate(({code,count})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='square');ctx.teardown();
   ctx.config={card_type:'button',button_type:'state',show_state:true,show_icon:false,entity:'sensor.power',signature_panel:{secondary:'Détail',
    information:[{entity:'sensor.temp'},{entity:'sensor.humidity'}].slice(0,count-1),illustration:{image:'/local/rack.webp'}}};
   ctx._hass.states['sensor.power']={state:'140',attributes:{unit_of_measurement:'W'}};
   ctx._hass.states['sensor.temp']={state:'29.7',attributes:{unit_of_measurement:'°C'}};
   ctx._hass.states['sensor.humidity']={state:'42',attributes:{unit_of_measurement:'%'}};
   ctx.card.querySelector('.bubble-name').textContent='Baie informatique';
   ctx.elements.state.style.display='-webkit-box';
   ctx.card.getRootNode().querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;')
    .call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
   const host=ctx.card.querySelector('.bubble-container'),rect=host.getBoundingClientRect(),art=getComputedStyle(host,'::after');
   const name=getComputedStyle(ctx.card.querySelector('.bubble-name')),detail=getComputedStyle(ctx.card.querySelector('.dp-secondary'));
   return {height:rect.height,radius:getComputedStyle(host).borderRadius,art:parseFloat(art.width),name:{size:name.fontSize,weight:name.fontWeight},detail:{size:detail.fontSize,opacity:detail.opacity},
    values:[...ctx.card.querySelectorAll('.bubble-state,.dp-panel-state')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{center:r.y+r.height/2,font:s.fontSize,weight:s.fontWeight,color:s.color,display:s.display,overflow:e.scrollWidth-e.clientWidth}})};
  },{code,count});
  const hint=JSON.stringify({width,mode,plain,count,m});
  assert.equal(m.height,118,hint);assert.equal(m.radius,'22px',hint);assert.equal(m.art,80,hint);
  assert.deepEqual(m.name,{size:'13px',weight:'500'},hint);assert.deepEqual(m.detail,{size:'12px',opacity:'1'},hint);
  assert.equal(m.values.length,count,hint);
  if(count===3 && width>=382)assert.equal(parseFloat(m.values[0].font),24,hint);
  for(const value of m.values){assert.equal(value.display,'flex',hint);assert.equal(value.weight,'500',hint);assert.equal(value.color,m.values[0].color,hint);assert.equal(value.font,m.values[0].font,hint);assert.ok(Math.abs(value.center-m.values[0].center)<1,hint);assert.ok(value.overflow<=1,hint)}
 }
});

test('command Panel states stay clear of the title and footer after optical adjustment',async t=>{
 const page=await fixture(t);
 for(const width of [288,358,600])for(const mode of ['light','dark'])for(const plain of [false,true]){
  await render(page,{width,mode,plain});
  const measurements=await page.evaluate(({code})=>{
   const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='square');ctx.teardown();
   const root=ctx.card,host=root.querySelector('.bubble-container'),footer=root.querySelector('.bubble-sub-button-container');
   const commands=['Désarmer','Armer','Nuit'].map((name,i)=>({entity:'alarm_control_panel.demo',css_class:'alarm-'+i,name,show_name:true,show_state:false}));
   ctx.config={card_type:'button',button_type:'state',entity:'alarm_control_panel.demo',show_state:true,show_icon:false,
    sub_button:commands,signature_panel:{state:'Désarmée',illustration:{image:'/local/alarm.webp'},sub_button_styles:Object.fromEntries(commands.map(b=>[b.css_class,{type:'command'}]))}};
   ctx._hass.states['alarm_control_panel.demo']={state:'disarmed',attributes:{}};
   root.querySelector('.bubble-name').textContent='Alarme';
   footer.innerHTML=commands.map((b,i)=>'<div class="bubble-sub-button bubble-sub-button-'+(i+1)+' '+b.css_class+'"><ha-icon class="bubble-sub-button-icon"></ha-icon><span class="bubble-sub-button-name-container">'+b.name+'</span></div>').join('');
   const style=root.getRootNode().querySelectorAll('style')[1];
   const box=e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height}};
   const text=e=>{const r=document.createRange();r.selectNodeContents(e);return box(r)};
   return ['Désarmée','Nuit','Absence','Présence','Déclenchée'].map(label=>{
    ctx.config.signature_panel.state=label;
    style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
    const title=text(root.querySelector('.bubble-name')),value=text(root.querySelector('.dp-value')),buttons=box(footer),frame=box(host);
    return{label,upperGap:value.top-title.bottom,lowerGap:buttons.top-value.bottom,height:frame.height,
     footerInset:frame.bottom-buttons.bottom,targets:[...footer.querySelectorAll('[data-dp-command]')].map(e=>box(e).height),art:parseFloat(getComputedStyle(host,'::after').height)};
   });
  },{code});
  for(const m of measurements){const hint=JSON.stringify({width,mode,plain,m});
   assert.ok(m.upperGap>=6,hint);assert.ok(m.lowerGap>=6,hint);
   assert.equal(m.height,118,hint);assert.equal(m.art,80,hint);assert.equal(m.footerInset,8,hint);assert.deepEqual(m.targets,[44,44,44],hint);
  }
 }
});
