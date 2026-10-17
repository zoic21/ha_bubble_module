const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const code = loadModule('signature-room').code;

async function room(page,{width=288,mode='light',plain=false,classic=false,secondary='',controls=1}={}) {
  await render(page,{width,mode,plain});
  await page.evaluate(({code,classic,secondary,controls})=>{
    const shadow=document.querySelector('[data-id="room"]').shadowRoot;
    const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
    const buttons=[{entity:'sensor.demo',css_class:'room-temperature',show_icon:false,show_state:true},
      ...Array.from({length:controls},(_,i)=>({entity:'light.demo',css_class:'room-control-'+(i+1)})),
      {entity:'binary_sensor.motion',css_class:'room-motion',show_name:false,show_state:false,icon:'mdi:walk'},
      {entity:'binary_sensor.window',css_class:'room-status',show_name:false,show_state:false,icon:'mdi:window-open'}];
    ctx.config={...ctx.config,name:'Chambre principale',show_state:false,sub_button:{main:buttons},
      signature_room:{room_mode:classic?'classic':'illustrated',secondary,
        illustration:{image:'/local/rooms.png'},sub_button_styles:{
          'room-status':{type:'badge',color:'#368ACB'},'room-motion':{type:'badge',color:'#B97918'}}}};
    ctx.elements.state.classList.add('hidden');ctx.card.querySelector('.bubble-name').textContent=ctx.config.name;
    const container=ctx.card.querySelector('.bubble-sub-button-container');container.replaceChildren();
    window.badgeClicks=[];
    buttons.forEach((b,i)=>{
      const el=document.createElement('div');el.className='bubble-sub-button bubble-sub-button-'+(i+1)+' '+b.css_class;
      el.innerHTML='<ha-icon class="bubble-sub-button-icon"></ha-icon>';
      if(b.show_state){el.querySelector('ha-icon').classList.add('hidden');const name=document.createElement('div');name.className='bubble-sub-button-name-container';name.textContent='22,9 °C';el.append(name);}
      el.addEventListener('click',e=>{e.stopPropagation();window.badgeClicks.push(b.css_class);});
      container.append(el);
    });
    ctx.update=()=>{shadow.querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);};
    const requested=ctx.config;
    ctx.config={...requested,signature_room:{...requested.signature_room,sub_button_styles:{}}};
    ctx.update();
    const count=ctx.card.querySelectorAll('*').length;
    ctx.config=requested;
    ctx.update();window.roomBadges=ctx;window.badgeNativeCount=count;
    window.readBadges=()=>{
      const root=ctx.card,content=ctx.elements.contentContainer;
      const box=selector=>{const el=root.querySelector(selector),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,display:s.display,color:s.color,background:s.backgroundColor,scroll:el.scrollWidth,client:el.clientWidth};};
      const c=content.getBoundingClientRect(),p=getComputedStyle(content,'::after');
      return {motion:box('.room-motion'),window:box('.room-status'),name:box('.bubble-name'),value:box('.room-temperature'),
        control:root.querySelector('.room-control-1')?box('.room-control-1'):null,card:box('.bubble-container'),
        nodes:root.querySelectorAll('*').length,art:{x:c.right-parseFloat(p.right)-parseFloat(p.width),
          y:c.y+parseFloat(p.top)+new DOMMatrixReadOnly(p.transform).m42,width:parseFloat(p.width),height:parseFloat(p.height)}};
    };
  },{code,classic,secondary,controls});
  return page.evaluate(()=>window.readBadges());
}

const overlap=(a,b)=>a.x<b.right-.5&&a.right>b.x+.5&&a.y<b.bottom-.5&&a.bottom>b.y+.5;

test('room badges fit beside the native name without changing values, footer or card height',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [142,170,190,220,240,288,328,358,382,600]){
    const m=await room(page,{width,mode,plain});const hint=JSON.stringify({width,mode,plain,m});
    assert.equal(m.card.height,148,hint);assert.equal(m.control.height,44,hint);
    assert.equal(m.motion.width,20,hint);assert.equal(m.window.height,20,hint);
    assert.equal(m.motion.color,'rgb(185, 121, 24)');assert.equal(m.window.color,'rgb(54, 138, 203)');
    assert.ok(m.motion.right+3<=m.window.x,hint);
    assert.ok(Math.abs(m.motion.x-m.name.right-6)<.1,hint);
    assert.ok(Math.abs(m.motion.y+m.motion.height/2-m.name.y-m.name.height/2)<.1,hint);
    assert.ok(!overlap(m.name,m.motion)&&!overlap(m.name,m.window),hint);
    assert.ok(!overlap(m.value,m.motion)&&!overlap(m.value,m.window),hint);
    assert.ok(m.motion.y>=m.card.y&&m.window.right<=m.card.right,hint);
    const art={...m.art,right:m.art.x+m.art.width,bottom:m.art.y+m.art.height};
    assert.ok(!overlap(art,m.motion)&&!overlap(art,m.window),hint);
    assert.ok(art.bottom<m.control.y,hint);
    assert.equal(m.nodes,await page.evaluate(()=>window.badgeNativeCount+2),'two reusable title holders');
  }
  const shell=page.locator('[data-id="room"]');
  await shell.locator('.room-motion').click();await shell.locator('.room-status').click();
  assert.deepEqual(await page.evaluate(()=>window.badgeClicks),['room-motion','room-status']);
});

test('native visibility collapses badge space immediately without rerendering the module',async t=>{
  const page=await fixture(t);const both=await room(page,{width:328});
  const m=await page.evaluate(()=>{
    const ctx=window.roomBadges,motion=ctx.card.querySelector('.room-motion'),windowBadge=ctx.card.querySelector('.room-status');
    windowBadge.classList.add('hidden');const single=window.readBadges();
    motion.hidden=true;const none=window.readBadges();
    windowBadge.classList.remove('hidden');const windowOnly=window.readBadges();
    motion.hidden=false;return {single,none,windowOnly,restored:window.readBadges()};
  });
  assert.equal(m.single.window.display,'none');assert.equal(m.none.motion.display,'none');
  assert.equal(m.windowOnly.motion.display,'none');assert.equal(m.windowOnly.window.display,'flex');
  assert.ok(m.single.name.width>=both.name.width);assert.ok(m.none.name.width>=m.single.name.width);
  assert.equal(m.single.motion.x,m.single.name.right+6);
  assert.equal(m.windowOnly.window.x,m.windowOnly.name.right+6);
  assert.equal(m.restored.name.width,both.name.width);assert.equal(m.restored.nodes,both.nodes);
});

test('badge colors follow live theme surfaces and explicit overrides, and removal restores room status',async t=>{
  const page=await fixture(t);await room(page);
  const m=await page.evaluate(()=>{
    const ctx=window.roomBadges,initial=window.readBadges();
    document.body.style.setProperty('--signature-card-background','#1c1c1c');const dark=window.readBadges();
    ctx.config={...ctx.config,signature_room:{...ctx.config.signature_room,sub_button_styles:{
      'room-motion':{type:'badge',color:'#E1463E'},'room-status':{type:'badge',color:'#368ACB',background:'#abcdef'}}}};ctx.update();const alarm=window.readBadges();
    ctx.config={...ctx.config,signature_room:{...ctx.config.signature_room,sub_button_styles:{}}};ctx.update();
    return {initial,dark,alarm,removed:window.readBadges()};
  });
  assert.notEqual(m.dark.motion.background,m.initial.motion.background);
  assert.equal(m.alarm.motion.color,'rgb(225, 70, 62)');assert.equal(m.alarm.window.background,'rgb(171, 205, 239)');
  assert.notEqual(m.removed.window.y,m.initial.window.y);assert.equal(m.removed.nodes,m.initial.nodes-2);
});

test('classic, named and specialized controls do not acquire illustrated badge geometry',async t=>{
  const page=await fixture(t);
  const classic=await room(page,{classic:true});assert.notEqual(classic.motion.width,20);
  for(const option of [{show_name:true},{sub_button_type:'select'},{show_state:true},{show_icon:false}]){
    await room(page);
    const width=await page.evaluate(option=>{
      const ctx=window.roomBadges;
      const buttons=ctx.config.sub_button.main.map(b=>b.css_class==='room-motion'?{...b,...option}:b);
      ctx.config={...ctx.config,sub_button:{main:buttons}};ctx.update();return window.readBadges().motion.width;
    },option);assert.notEqual(width,20,JSON.stringify(option));
  }
});

test('badges remain clear of optional secondary text and two-row or absent controls',async t=>{
  const page=await fixture(t);
  for(const width of [170,288])for(const controls of [0,6])for(const secondary of ['', 'Texte secondaire']){
    const m=await room(page,{width,controls,secondary});
    const hint=JSON.stringify({width,controls,secondary,m});
    assert.ok(!overlap(m.name,m.motion)&&!overlap(m.name,m.window),hint);
    assert.ok(m.window.right<=m.card.right,hint);
    if(secondary){
      const bounds=await page.evaluate(()=>{
        const el=window.roomBadges.card.querySelector('.dp-secondary'),r=el.getBoundingClientRect();
        return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};
      });
      const art={...m.art,right:m.art.x+m.art.width,bottom:m.art.y+m.art.height};
      assert.ok(!overlap(art,bounds),hint);
    }
  }
});

test('short titles keep badges immediately after their text, including live name changes',async t=>{
  const page=await fixture(t);await room(page,{width:328});
  for(const name of ['Centre','Entrée','Cuisine','Chambre principale','WC']){
    const m=await page.evaluate(name=>{
      window.roomBadges.card.querySelector('.bubble-name').textContent=name;
      return window.readBadges();
    },name);
    assert.ok(Math.abs(m.motion.x-m.name.right-6)<.1,name);
    assert.ok(Math.abs(m.motion.y+10-m.name.y-m.name.height/2)<.1,name);
    if(name==='Centre')assert.ok(m.name.width<70,'the name must retain its natural text width');
  }
});

test('native nodes and handlers survive repeated renders, native regrouping and option removal',async t=>{
  const page=await fixture(t);await room(page);
  const result=await page.evaluate(()=>{
    const ctx=window.roomBadges,root=ctx.card,original=ctx.config;
    ctx.config={...original,signature_room:{...original.signature_room,sub_button_styles:{}}};ctx.update();
    const name=root.querySelector('.bubble-name'),nameParent=name.parentNode;
    const motion=root.querySelector('.room-motion'),status=root.querySelector('.room-status');
    const group=document.createElement('div');group.className='bubble-sub-button-group';
    motion.parentNode.append(group);group.append(motion,status);
    ctx.config=original;ctx.update();
    const heading=name.parentNode,badges=motion.parentNode,count=root.querySelectorAll('*').length;
    for(let i=0;i<20;i++)ctx.update();
    const stable=name.parentNode===heading&&motion.parentNode===badges&&root.querySelectorAll('*').length===count;
    // Bubble can reparent its existing native nodes during a configuration update.
    group.append(motion,status);ctx.update();group.classList.add('hidden');
    motion.click();status.click();
    ctx.config={...original,signature_room:{...original.signature_room,sub_button_styles:{}}};ctx.update();
    const restored=name.parentNode===nameParent&&group.children[0]===motion&&group.children[1]===status;
    const clean=!root.querySelector('.dp-room-heading')&&!group.classList.contains('hidden');
    return {stable,restored,clean,clicks:window.badgeClicks};
  });
  assert.deepEqual(result,{stable:true,restored:true,clean:true,clicks:['room-motion','room-status']});
});

test('teardown restores the native title and buttons without retaining title holders',async t=>{
  const page=await fixture(t);await room(page);
  const result=await page.evaluate(()=>{
    const ctx=window.roomBadges,root=ctx.card,original=ctx.config;
    ctx.config={...original,signature_room:{...original.signature_room,sub_button_styles:{}}};ctx.update();
    const name=root.querySelector('.bubble-name'),nameParent=name.parentNode;
    const buttons=[...root.querySelectorAll('.bubble-sub-button')],homes=buttons.map(b=>b.parentNode);
    ctx.config=original;ctx.update();ctx.teardown();
    return {nameRestored:name.parentNode===nameParent,
      buttonsRestored:buttons.every((b,i)=>b.parentNode===homes[i]),
      order:[...homes[0].children].filter(b=>b.classList.contains('bubble-sub-button')).map(b=>buttons.indexOf(b)),
      holders:root.querySelectorAll('.dp-room-heading,.dp-room-badges').length};
  });
  assert.deepEqual(result,{nameRestored:true,buttonsRestored:true,order:[0,1,2,3],holders:0});
});

test('rooms without artwork do not reserve the legacy status corner beside the name',async t=>{
  const page=await fixture(t);await room(page,{width:328});
  const m=await page.evaluate(()=>{
    const ctx=window.roomBadges;ctx.card.querySelector('.bubble-name').textContent='Centre';
    ctx.config={...ctx.config,signature_room:{...ctx.config.signature_room,illustration:{}}};ctx.update();
    return {...window.readBadges(),padding:getComputedStyle(ctx.card.querySelector('.bubble-name')).paddingRight};
  });
  assert.equal(m.padding,'0px');assert.ok(m.name.width<70);
  assert.equal(m.motion.x,m.name.right+6);
});
