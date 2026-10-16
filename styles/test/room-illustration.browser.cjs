const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const code = loadModule('signature-room').code;

async function room(page,{width=180,mode='dark',plain=false,controls=4,columns=4,named=false,labelFirst=true,temperature='22,1 °C',badge=true,secondary=''}={}) {
  await render(page,{width,mode,plain});
  return page.evaluate(({code,mode,controls,columns,named,labelFirst,temperature,badge,secondary})=>{
    const shell=document.querySelector('[data-id="room"]'), shadow=shell.shadowRoot;
    const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
    // Bubble 3.4.1 creates the label first, appends the icon later and reverses
    // their visual order with flexbox. Grid must place both items explicitly.
    shadow.querySelectorAll('style')[0].textContent+='\n.bubble-sub-button{flex-direction:row-reverse}.bubble-sub-button-name-container{display:flex;overflow:auto}';
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
      if(b.show_icon===false)icon.classList.add('hidden');
      if(b.css_class==='room-temperature'||b.css_class==='room-humidity'||b.show_name){
        const label=document.createElement('div');label.className='bubble-sub-button-name-container';
        if(b.show_name)Object.assign(label.style,{whiteSpace:'normal',display:'-webkit-box',WebkitLineClamp:'2',WebkitBoxOrient:'vertical',textOverflow:'ellipsis',overflow:'hidden'});
        label.textContent=b.css_class==='room-temperature'?temperature:b.css_class==='room-humidity'?'65 %':['Balcon','Étendage','Portillon','Avant','Arrière','Escalier'][i-2];
        if(labelFirst)el.prepend(label);else el.append(label);
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
    return {container,content,name:rect('.bubble-name'),temperature:rect('.room-temperature'),temperatureLabel:rect('.room-temperature .bubble-sub-button-name-container'),humidity:rect('.room-humidity'),icon:rect('.bubble-icon-container'),badge:rect('.room-status'),
      controls:[...ctx.card.querySelectorAll('[class*="room-control-"]')].map(el=>rect('.'+[...el.classList].find(c=>c.startsWith('room-control-')))),
      art:{width:parseFloat(pseudo.width),x:content.right-parseFloat(pseudo.right)-parseFloat(pseudo.width),y:content.y+parseFloat(pseudo.top)+new DOMMatrixReadOnly(pseudo.transform).m42,height:parseFloat(pseudo.height),pointer:pseudo.pointerEvents,image:pseudo.backgroundImage,shadow:pseudo.boxShadow},
      radius:getComputedStyle(ctx.card.querySelector('.bubble-container')).borderRadius,shadow:getComputedStyle(ctx.card.querySelector('.bubble-container')).boxShadow,
      mode:ctx.card.getAttribute('data-dp-room-mode'),text:ctx.card.querySelector('.room-temperature').textContent,
      dividerBottom:parseFloat(getComputedStyle(ctx.card.querySelector('.bubble-container'),'::after').bottom)};
  },{code,mode,controls,columns,named,labelFirst,temperature,badge,secondary});
}

test('illustrated rooms preserve title, temperature, status and footer on small and large cards',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [142,156,170,180,190,220,288,328,358,382,600]){
    const m=await room(page,{width,mode,plain});
    const hint=JSON.stringify({width,mode,plain,m});
    assert.equal(m.container.height,148,hint);assert.equal(m.humidity.display,'none');assert.equal(m.icon.display,'none');
    assert.equal(m.temperature.height,36,hint);
    assert.equal(m.radius,'22px');assert.equal(m.text,'22,1 °C');assert.equal(m.mode,'illustrated');assert.equal(m.art.pointer,'none');
    assert.ok(m.temperature.scroll<=m.temperature.client+1,hint);
    assert.ok(m.temperatureLabel.scroll<=m.temperatureLabel.client+1,hint);
    assert.ok(m.name.scroll<=m.name.client+1,hint);
    assert.ok(m.temperature.right<=m.art.x+1,hint);
    assert.ok(m.name.right<=m.art.x+1,hint);
    assert.ok(m.art.y+m.art.height<m.controls[0].y,hint);
    assert.ok(m.badge.height>0&&m.badge.y>=m.container.y&&m.badge.bottom<m.controls[0].y,hint);
    assert.ok(m.art.image.includes(mode==='dark'?'night.png':'day.png'));
    assert.ok(m.art.shadow.includes('54, 138, 203'));
    assert.ok(m.shadow.includes('225, 70, 62'));
    assert.ok(m.temperature.bottom<=m.container.bottom-m.dividerBottom-2,hint);
    for(const control of m.controls)assert.equal(control.height,44,hint);
  }
});

test('garden retains six labelled controls on two rows and enough room above the divider',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const labelFirst of [true,false])for(const width of [288,328,358,382,600,770]){
    const m=await room(page,{width,mode,plain,labelFirst,controls:6,columns:3,named:true});
    assert.equal(m.container.height,196);assert.equal(m.controls.length,6);
    assert.ok(m.controls[3].y>m.controls[0].y);
    assert.ok(m.art.y+m.art.height<m.controls[0].y);
    const labels=await page.evaluate(()=>[...window.roomCtx.card.querySelectorAll('[class*="room-control-"] .bubble-sub-button-name-container')].map(el=>{
      const label=el.getBoundingClientRect(),icon=el.parentElement.querySelector('.bubble-sub-button-icon').getBoundingClientRect();
      return {text:el.textContent,scroll:el.scrollWidth,client:el.clientWidth,iconRight:icon.right,labelLeft:label.left,iconTop:icon.top,labelTop:label.top};
    }));
    assert.equal(labels.length,6);
    for(const label of labels){
      const hint=JSON.stringify({width,mode,plain,labelFirst,label});
      assert.ok(label.scroll<=label.client+1,hint);assert.ok(label.iconRight<=label.labelLeft,hint);
      assert.ok(Math.abs(label.iconTop-label.labelTop)<15,hint);
    }
  }
  const button=page.locator('[data-id="room"] .room-control-1');
  await button.locator('.bubble-sub-button-name-container').click();
  await button.locator('.bubble-sub-button-icon').click();
  assert.deepEqual(await page.evaluate(()=>window.roomClicks),{tile:0,temperature:0,control:2});
});

test('room artwork is vertically centred above the actual divider, including live size and visibility changes',async t=>{
  const page=await fixture(t),cdp=await page.context().newCDPSession(page);
  const pseudoBox=async selector=>{
    const {result}=await cdp.send('Runtime.evaluate',{expression:'document.querySelector(\'[data-id="room"]\').shadowRoot.querySelector('+JSON.stringify(selector)+')'});
    try{
      const {node}=await cdp.send('DOM.describeNode',{objectId:result.objectId});
      const pseudo=node.pseudoElements.find(n=>n.pseudoType==='after');
      const {model}=await cdp.send('DOM.getBoxModel',{backendNodeId:pseudo.backendNodeId});
      const y=model.border.filter((_,i)=>i%2===1);return {top:Math.min(...y),bottom:Math.max(...y)};
    }finally{await cdp.send('Runtime.releaseObject',{objectId:result.objectId});}
  };
  const check=async footer=>{
    const art=await pseudoBox('.bubble-content-container');
    const card=await page.evaluate(()=>{
      const el=window.roomCtx.card.querySelector('.bubble-container'),r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return {top:r.top+parseFloat(s.borderTopWidth),bottom:r.bottom-parseFloat(s.borderBottomWidth)};
    });
    const limit=footer?(await pseudoBox('.bubble-container')).top:card.bottom;
    assert.ok(Math.abs((art.top-card.top)-(limit-art.bottom))<.1,JSON.stringify({art,card,limit,footer}));
  };
  try{
    for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [142,180,328])for(const controls of [4,6]){
      await room(page,{mode,plain,width,controls,columns:controls===6?3:4});await check(true);
    }
    for(const size of [64,96]){
      await page.evaluate(size=>document.body.style.setProperty('--signature-illustration-size',size+'px'),size);await check(true);
    }
    await page.evaluate(()=>window.roomCtx.card.querySelectorAll('[class*="room-control-"]').forEach(el=>el.classList.add('hidden')));
    await check(false);
    await room(page,{controls:0,width:328});await check(false);
  }finally{await cdp.detach();}
});

test('one live theme size controls Square and Room artwork without rebuilding either layout',async t=>{
  const page=await fixture(t);await room(page,{width:328});
  const values=await page.evaluate(squareCode=>{
    const room=window.roomCtx,shadow=document.querySelector('[data-id="square"]').shadowRoot;
    const square=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
    square.config.show_icon=false;square.elements.iconContainer.classList.add('hidden');
    square.config.signature_square={illustration:{image:'/local/atlas.png'}};
    shadow.querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+squareCode+'`;').call(square,square._hass,fn=>square.teardown=fn,x=>x);
    const layouts=[square._signatureSquareRuntime.styleCSS,room._signatureRoomRuntime.styleCSS];
    const native=[square.elements.state,room.card.querySelector('.room-control-1')];
    const samples=[64,80,96].map(size=>{
      document.body.style.setProperty('--signature-illustration-size',size+'px');
      const art=ctx=>getComputedStyle(ctx.elements.contentContainer,'::after');
      const roomContent=room.elements.contentContainer.getBoundingClientRect();
      return {size,square:parseFloat(art(square).width),room:parseFloat(art(room).width),
        height:room.card.querySelector('.bubble-container').getBoundingClientRect().height,
        artBottom:roomContent.top+parseFloat(art(room).top)+new DOMMatrixReadOnly(art(room).transform).m42+parseFloat(art(room).height),
        controlTop:native[1].getBoundingClientRect().top};
    });
    const same=layouts[0]===square._signatureSquareRuntime.styleCSS&&layouts[1]===room._signatureRoomRuntime.styleCSS&&
      native[0]===square.elements.state&&native[1]===room.card.querySelector('.room-control-1');
    document.body.style.removeProperty('--signature-illustration-size');
    return {samples,same};
  },loadModule('signature-square').code);
  assert.equal(values.same,true);
  for(const m of values.samples){
    assert.equal(m.square,m.size);assert.equal(m.room,m.size);
    assert.equal(m.height,m.size===96?164:148);
    assert.ok(m.artBottom<m.controlTop,JSON.stringify(m));
  }
});

test('source framing excludes neighbouring sprite pixels without shrinking the artwork',async t=>{
  const page=await fixture(t),url='https://signature.test/offset-atlas.svg';
  // The red object crosses from cell 0 into cell 1, like the reported nightstand.
  await page.route(url,route=>route.fulfill({contentType:'image/svg+xml',body:
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><path fill="#f00" d="M75 20h30v60H75z"/><path fill="#05f" d="M125 25h50v50h-50z"/></svg>'}));
  for(const mode of ['light','dark'])for(const width of [180,328]){
    await room(page,{mode,width});
    await page.evaluate(url=>{
      const ctx=window.roomCtx;
      ctx.config.signature_room={...ctx.config.signature_room,icon_border_color:'transparent',border_color:'transparent',
        illustration:{image:url,columns:4,rows:5,index:1}};window.updateRoom();
    },url);
    await page.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();},url);
    const capture=async()=>{
      const box=await page.evaluate(async()=>{
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const content=window.roomCtx.elements.contentContainer,rect=content.getBoundingClientRect(),art=getComputedStyle(content,'::after');
        return {x:rect.right-parseFloat(art.right)-parseFloat(art.width)+scrollX,
          y:rect.top+parseFloat(art.top)+new DOMMatrixReadOnly(art.transform).m42+scrollY,width:parseFloat(art.width),height:parseFloat(art.height)};
      });
      const png=await page.screenshot({clip:box});
      const pixels=await page.evaluate(async encoded=>{
        const data=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
        const image=await createImageBitmap(new Blob([data],{type:'image/png'}));
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,image.width,image.height).data;
        let red=0,blue=0;for(let i=0;i<rgba.length;i+=4){
          if(rgba[i]>240&&rgba[i+1]<20&&rgba[i+2]<20)red++;
          if(rgba[i]<20&&rgba[i+1]>70&&rgba[i+1]<100&&rgba[i+2]>240)blue++;
        }
        image.close();return {red,blue};
      },png.toString('base64'));
      return {...pixels,width:box.width,height:box.height};
    };
    const before=await capture();
    await page.evaluate(()=>{Object.assign(window.roomCtx.config.signature_room.illustration,{offset_x:7,offset_y:4});window.updateRoom();});
    const after=await capture();
    assert.ok(before.red>0,JSON.stringify({mode,width,before}));
    assert.equal(after.red,0,JSON.stringify({mode,width,after}));
    assert.ok(before.blue>0&&after.blue>0);assert.equal(after.width,before.width);assert.equal(after.height,before.height);
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
  assert.ok(m.container.height>=220);
  const values=await page.evaluate(()=>{
    const ctx=window.roomCtx,secondary=ctx.card.querySelector('.dp-secondary');
    const detail=secondary.getBoundingClientRect();
    const controls=[...ctx.card.querySelectorAll('[class*="room-control-"]')].map(el=>el.getBoundingClientRect().top);
    ctx.config.signature_room={...ctx.config.signature_room,illustration:{image:'javascript:alert(1)'}};window.updateRoom();
    return {text:secondary.textContent,bottom:detail.bottom,controlTop:Math.min(...controls),image:ctx.card.getAttribute('data-dp-illustration'),state:getComputedStyle(ctx.elements.state).display};
  });
  assert.equal(values.text,'Détail conservé');assert.ok(values.bottom<values.controlTop);assert.equal(values.image,'no');assert.equal(values.state,'none');
});
