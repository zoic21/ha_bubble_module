const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const code = loadModule('signature-square').code;

async function card(page, {width=170, mode='light', plain=false, hidden=false}={}) {
  await render(page, {width,mode,plain});
  return page.evaluate(({code,hidden})=>{
    const shell=document.querySelector('[data-id="square"]'),shadow=shell.shadowRoot;
    const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
    const warning={entity:'sensor.last_seen',show_name:false,show_icon:true,
      tap_action:{action:'more-info',entity:'sensor.last_seen'}};
    ctx.config.show_icon=false;ctx.elements.iconContainer.classList.add('hidden');
    ctx.elements.nameContainer.querySelector('.bubble-name').textContent='ID.4';
    ctx.config.sub_button={main:[warning]};
    ctx.config.signature_square={secondary:'570 km',illustration:{image:'/local/car.png'},
      sub_button_styles:{1:{type:'badge',color:'#B97918'}}};
    ctx._hass.states[ctx.config.entity]={state:'100',attributes:{unit_of_measurement:'%'}};
    const button=document.createElement('div');button.className='bubble-sub-button bubble-sub-button-1';
    button.classList.toggle('hidden',hidden);button.title='Données de plus de 12 h · voir la date';
    button.innerHTML='<ha-icon class="bubble-sub-button-icon"></ha-icon>';
    button.dataset.tapAction=JSON.stringify(warning.tap_action);
    shadow.querySelector('.bubble-sub-button-container').append(button);
    ctx.update=()=>{shadow.querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);};
    ctx.update();
    window.badgeContext=ctx;
  },{code,hidden});
}

test('single native status badge fits two-row illustrated half-width squares without taking artwork or range space',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [142,156,170,190,296]){
    await card(page,{width,mode,plain});
    const m=await page.evaluate(()=>{
      const root=window.badgeContext.card,button=root.querySelector('.bubble-sub-button-1');
      const secondary=root.querySelector('.dp-secondary'),state=root.querySelector('.bubble-state');
      const container=root.querySelector('.bubble-container'),content=root.querySelector('.bubble-content-container');
      const b=button.getBoundingClientRect(),r=secondary.getBoundingClientRect(),s=container.getBoundingClientRect();
      return {height:s.height,badgeWidth:b.width,badgeHeight:b.height,
        inside:b.right<=s.right&&b.bottom<=s.bottom,clear:r.right<=b.left,
        rangeOverflow:secondary.scrollWidth>secondary.clientWidth,
        valueOverflow:state.scrollWidth>state.clientWidth,
        art:parseFloat(getComputedStyle(content,'::after').width),
        action:JSON.parse(button.dataset.tapAction),title:button.title};
    });
    assert.equal(m.height,120);assert.equal(m.badgeWidth,24);assert.equal(m.badgeHeight,24);
    assert.equal(m.inside,true);assert.equal(m.clear,true);assert.equal(m.rangeOverflow,false);
    assert.equal(m.valueOverflow,false);assert.ok(m.art>0&&m.art<=80);
    assert.deepEqual(m.action,{action:'more-info',entity:'sensor.last_seen'});
    assert.match(m.title,/12 h/);
  }
});

test('native hiding releases the detail row, and removing badge mode restores native geometry',async t=>{
  const page=await fixture(t);await card(page);
  const m=await page.evaluate(()=>{
    const ctx=window.badgeContext,button=ctx.card.querySelector('.bubble-sub-button-1');
    const secondary=ctx.card.querySelector('.dp-secondary'),content=ctx.elements.contentContainer;
    const active=getComputedStyle(secondary).maxWidth;
    button.classList.add('hidden');
    const hidden={display:getComputedStyle(button).display,maxWidth:getComputedStyle(secondary).maxWidth};
    button.classList.remove('hidden');
    ctx.config={...ctx.config,signature_square:{...ctx.config.signature_square,sub_button_styles:{}}};
    ctx.update();
    return {active,hidden,restored:getComputedStyle(button).position,
      unchanged:button===ctx.card.querySelector('.bubble-sub-button-1'),
      nodes:content.querySelectorAll('.dp-secondary').length};
  });
  assert.match(m.active,/32px/);assert.equal(m.hidden.display,'none');assert.ok(['100%','none'].includes(m.hidden.maxWidth));
  assert.notEqual(m.restored,'absolute');assert.equal(m.unchanged,true);assert.equal(m.nodes,1);
});

test('badge mode leaves named, multiple or specialized native controls in their normal layout',async t=>{
  const page=await fixture(t);
  for(const variant of ['name','multiple','select','auto','measure']){
    await card(page);
    const position=await page.evaluate(variant=>{
      const ctx=window.badgeContext,main=ctx.config.sub_button.main;
      if(variant==='name')main[0]={...main[0],show_name:true};
      if(variant==='multiple')main.push({entity:'sensor.other'});
      if(variant==='select')main[0]={...main[0],sub_button_type:'select'};
      if(variant==='auto')ctx.config.signature_square.auto_height=true;
      if(variant==='measure')ctx.config.signature_square.controls='measure';
      ctx.config={...ctx.config,sub_button:{main:[...main]}};ctx.update();
      return getComputedStyle(ctx.card.querySelector('.bubble-sub-button-1')).width;
    },variant);
    assert.notEqual(position,'24px',variant);
  }
});
