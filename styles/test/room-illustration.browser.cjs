const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const code = loadModule('signature-room').code;

async function room(page,{width=180,mode='dark',plain=false,controls=4,columns=4,named=false,temperature='22,1 °C',badge=true,secondary=''}={}) {
  await render(page,{width,mode,plain});
  return page.evaluate(({code,mode,controls,columns,named,temperature,badge,secondary})=>{
    const shell=document.querySelector('[data-id="room"]'), shadow=shell.shadowRoot;
    const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
    const buttons=[{entity:'sensor.demo',css_class:'room-temperature',show_state:true,show_icon:false},
      {entity:'sensor.humidity',css_class:'room-humidity',show_state:true},
      ...Array.from({length:controls},(_,i)=>({entity:'light.demo',css_class:'room-control-'+(i+1),show_name:named,tap_action:{action:'toggle'}})),
      {entity:'binary_sensor.door',css_class:'room-status'}];
    ctx.config={...ctx.config,name:'Chambre principale',sub_button:{main:buttons},signature_room:{room_mode:'illustrated',room_control_columns:columns,
      room_measures_position:'header',secondary,icon_border_color:'#368ACB',border_color:'#E1463E',
      illustration:{image:'/local/rooms.png',image_light:'/local/day.png',image_dark:'/local/night.png',columns:4,rows:5,index:3}}};
    ctx._hass.themes={darkMode:mode==='dark'};
    ctx.elements.state.classList.add('hidden');
    ctx.card.querySelector('.bubble-name').textContent='Chambre principale';
    const subs=ctx.card.querySelector('.bubble-sub-button-container');subs.replaceChildren();
    window.roomClicks={tile:0,temperature:0,control:0};
    ctx.card.addEventListener('click',()=>window.roomClicks.tile++);
    for(const [i,b] of buttons.entries()) {
      const el=document.createElement('div');el.className='bubble-sub-button bubble-sub-button-'+(i+1)+' '+b.css_class;
      const icon=document.createElement('ha-icon');icon.className='bubble-sub-button-icon';el.append(icon);
      if(b.css_class==='room-temperature'||b.css_class==='room-humidity'||b.show_name){
        const label=document.createElement('div');label.className='bubble-sub-button-name-container';
        label.textContent=b.css_class==='room-temperature'?temperature:b.css_class==='room-humidity'?'65 %':['Balcon','Étendage','Portillon','Ambiance','Arrière','Escalier'][i-2];
        el.append(label);
      }
      if(b.css_class==='room-status'&&!badge)el.classList.add('hidden');
      el.addEventListener('click',e=>{e.stopPropagation();window.roomClicks[b.css_class==='room-temperature'?'temperature':'control']++;});
      subs.append(el);
    }
    window.updateRoom=()=>{shadow.querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);};
    window.roomCtx=ctx;window.updateRoom();
    const rect=s=>{const el=ctx.card.querySelector(s),r=el.getBoundingClientRect(),c=getComputedStyle(el);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,display:c.display,scroll:el.scrollWidth,client:el.clientWidth,fontSize:c.fontSize};};
    const pseudo=getComputedStyle(ctx.elements.contentContainer,'::after'),container=rect('.bubble-container');
    const content=rect('.bubble-content-container');
    return {container,content,name:rect('.bubble-name'),temperature:rect('.room-temperature'),humidity:rect('.room-humidity'),icon:rect('.bubble-icon-container'),badge:rect('.room-status'),
      controls:[...ctx.card.querySelectorAll('[class*="room-control-"]')].map(el=>rect('.'+[...el.classList].find(c=>c.startsWith('room-control-')))),
      art:{width:parseFloat(pseudo.width),x:content.right-parseFloat(pseudo.right)-parseFloat(pseudo.width),y:content.y+parseFloat(pseudo.top),height:parseFloat(pseudo.height),pointer:pseudo.pointerEvents,image:pseudo.backgroundImage,shadow:pseudo.boxShadow},
      radius:getComputedStyle(ctx.card.querySelector('.bubble-container')).borderRadius,shadow:getComputedStyle(ctx.card.querySelector('.bubble-container')).boxShadow,
      mode:ctx.card.getAttribute('data-dp-room-mode'),text:ctx.card.querySelector('.room-temperature').textContent,
      dividerBottom:parseFloat(getComputedStyle(ctx.card.querySelector('.bubble-container'),'::after').bottom)};
  },{code,mode,controls,columns,named,temperature,badge,secondary});
}

test('illustrated rooms preserve title, temperature, status and footer on small and large cards',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [142,156,170,180,190,220,288,328,358,382,600]){
    const m=await room(page,{width,mode,plain});
    const hint=JSON.stringify({width,mode,plain,m});
    assert.equal(m.container.height,176,hint);assert.equal(m.humidity.display,'none');assert.equal(m.icon.display,'none');
    assert.equal(m.radius,'22px');assert.equal(m.text,'22,1 °C');assert.equal(m.mode,'illustrated');assert.equal(m.art.pointer,'none');
    assert.ok(m.temperature.scroll<=m.temperature.client+1,hint);
    assert.ok(m.temperature.right<=m.art.x+1,hint);
    assert.ok(m.name.bottom<=m.art.y+1,hint);
    assert.ok(m.art.y+m.art.height<m.controls[0].y,hint);
    assert.ok(m.badge.height>0&&m.badge.y<m.art.y,hint);
    assert.ok(m.art.image.includes(mode==='dark'?'night.png':'day.png'));
    assert.ok(m.art.shadow.includes('54, 138, 203'));
    assert.ok(m.shadow.includes('225, 70, 62'));
    assert.ok(m.temperature.bottom<=m.container.bottom-m.dividerBottom-2,hint);
    for(const control of m.controls)assert.equal(control.height,44,hint);
  }
});

test('garden retains six labelled controls on two rows and enough room above the divider',async t=>{
  const page=await fixture(t);
  for(const width of [288,328,358,382,600]){
    const m=await room(page,{width,controls:6,columns:3,named:true});
    assert.equal(m.container.height,224);assert.equal(m.controls.length,6);
    assert.ok(m.controls[3].y>m.controls[0].y);
    assert.ok(m.art.y+m.art.height<m.controls[0].y);
    const labels=await page.evaluate(()=>[...window.roomCtx.card.querySelectorAll('[class*="room-control-"] .bubble-sub-button-name-container')].map(el=>({text:el.textContent,scroll:el.scrollWidth,client:el.clientWidth})));
    assert.equal(labels.length,6);
    for(const label of labels)assert.ok(label.scroll<=label.client+1,JSON.stringify({width,label}));
  }
});

test('artwork yields taps to the card while native measure and command targets remain independent',async t=>{
  const page=await fixture(t);await room(page);
  const host=page.locator('[data-id="room"]');
  await host.locator('.room-temperature').click();
  await host.locator('.room-control-1').click();
  const title=await host.locator('.bubble-name').boundingBox();
  await page.mouse.click(title.x+5,title.y+5);
  assert.deepEqual(await page.evaluate(()=>window.roomClicks),{tile:1,temperature:1,control:1});
});

test('mode, theme, hidden badges and unavailable values update without replacing native nodes',async t=>{
  const page=await fixture(t);
  const m=await room(page,{badge:false,temperature:'Indisponible'});
  assert.equal(m.badge.display,'none');assert.equal(m.temperature.fontSize,'15px');
  const result=await page.evaluate(()=>{
    const ctx=window.roomCtx,card=ctx.card,icon=ctx.elements.iconContainer,temp=card.querySelector('.room-temperature');
    const structural=ctx._signatureRoomRuntime.styleCSS;
    ctx._hass.themes={darkMode:false};window.updateRoom();
    const light=getComputedStyle(ctx.elements.contentContainer,'::after').backgroundImage;
    const reused=structural===ctx._signatureRoomRuntime.styleCSS;
    ctx.config.signature_room={...ctx.config.signature_room,room_mode:'classic',room_measures_position:'content'};window.updateRoom();
    const classic={height:card.querySelector('.bubble-container').getBoundingClientRect().height,icon:getComputedStyle(icon).display,humidity:getComputedStyle(card.querySelector('.room-humidity')).display};
    ctx.config.signature_room={...ctx.config.signature_room,room_mode:'illustrated'};window.updateRoom();
    return {light,reused,classic,same:icon===ctx.elements.iconContainer&&temp===card.querySelector('.room-temperature')};
  });
  assert.ok(result.light.includes('day.png'));assert.equal(result.reused,true);assert.equal(result.same,true);
  assert.equal(result.classic.height,156);assert.notEqual(result.classic.icon,'none');assert.notEqual(result.classic.humidity,'none');
});

test('secondary text, multiple control rows and a missing image retain native visibility and clear targets',async t=>{
  const page=await fixture(t);
  const m=await room(page,{width:180,secondary:'Détail conservé',controls:6});
  assert.ok(m.container.height>=248);
  const values=await page.evaluate(()=>{
    const ctx=window.roomCtx,secondary=ctx.card.querySelector('.dp-secondary');
    const detail=secondary.getBoundingClientRect();
    const controls=[...ctx.card.querySelectorAll('[class*="room-control-"]')].map(el=>el.getBoundingClientRect().top);
    ctx.config.signature_room={...ctx.config.signature_room,illustration:{image:'javascript:alert(1)'}};window.updateRoom();
    return {text:secondary.textContent,bottom:detail.bottom,controlTop:Math.min(...controls),image:ctx.card.getAttribute('data-dp-illustration'),state:getComputedStyle(ctx.elements.state).display};
  });
  assert.equal(values.text,'Détail conservé');assert.ok(values.bottom<values.controlTop);assert.equal(values.image,'no');assert.equal(values.state,'none');
});
