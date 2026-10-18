const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const code = loadModule('signature-square').code;

async function illustrated(page, {width=180,mode='dark',plain=false,value='25.3',unit='°C',secondary='',index=1,icon=false}={}) {
  await render(page,{width,mode,plain});
  return page.evaluate(({code,value,unit,secondary,index,icon,mode}) => {
    const shell=document.querySelector('[data-id="square"]'), shadow=shell.shadowRoot;
    const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
    ctx.config.show_icon=icon;
    // Native Bubble applies this visibility before invoking module styles.
    ctx.elements.iconContainer.classList.toggle('hidden', !icon);
    ctx.config.signature_square={secondary,illustration:{image:'/local/atlas.webp',
      image_light:'/local/day.webp?v=1',image_dark:'/local/night.webp?v=1',columns:4,rows:3,index}};
    ctx._hass.themes={darkMode:mode==='dark'};
    ctx._hass.states[ctx.config.entity]={state:value,attributes:{unit_of_measurement:unit}};
    const css=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
    shadow.querySelectorAll('style')[1].textContent=css;
    const content=shadow.querySelector('.bubble-content-container'),state=shadow.querySelector('.bubble-state');
    const pseudo=getComputedStyle(content,'::after'),rect=state.getBoundingClientRect(),box=content.getBoundingClientRect();
    const second=shadow.querySelector('.dp-secondary');
    return {stateWidth:rect.width,stateScroll:state.scrollWidth,stateClient:state.clientWidth,
      contentTop:box.top,contentRight:box.right,valueText:state.textContent,secondaryText:second?.textContent,
      imageWidth:parseFloat(pseudo.width),imageHeight:parseFloat(pseudo.height),imagePosition:pseudo.backgroundPosition,imageURL:pseudo.backgroundImage,
      pointer:pseudo.pointerEvents,contentWidth:box.width,secondaryWidth:second?.getBoundingClientRect().width,
      icon:getComputedStyle(shadow.querySelector('.bubble-icon-container')).display,
      valueAction:JSON.parse(state.dataset.tapAction).action,template:shadow.querySelector('ha-card').getAttribute('data-dp-illustration')};
  },{code,value,unit,secondary,index,icon,mode});
}

test('illustrated squares prioritize values and keep secondary full-width at mobile card widths', async t => {
  const page=await fixture(t);
  for(const mode of ['light','dark']) for(const plain of [false,true]) {
    for(const width of [142,156,170,180,190,220,288,328,358,382,600]) {
      for(const metric of [{value:'17.4',unit:'°C'},{value:'25.3',unit:'°C'},
        {value:'0.0',unit:'mm'},{value:'2.2',unit:'km/h',secondary:'Rafales · 4,0 km/h'}]) {
        const m=await illustrated(page,{width,mode,plain,...metric});
        assert.equal(m.stateScroll<=m.stateClient+1,true,JSON.stringify({width,metric,m}));
        assert.ok(m.imageWidth>=0 && m.imageWidth<=80.1);
        assert.ok(m.imageWidth<=m.contentWidth-m.stateWidth+1,'art overlaps value');
        assert.equal(m.pointer,'none');assert.equal(m.icon,'none');assert.equal(m.valueAction,'more-info');
        if(metric.secondary)assert.ok(Math.abs(m.secondaryWidth-m.contentWidth)<1,'secondary lost width');
      }
    }
  }
});

test('artwork stays at the top right with or without gust detail and preserves both units', async t => {
  const page=await fixture(t);
  const cdp=await page.context().newCDPSession(page);
  try {
    for(const mode of ['light','dark']) for(const width of [142,180,288,600]) {
      for(const secondary of ['', 'Rafales · 3,2 km/h']) {
        const m=await illustrated(page,{width,mode,value:'2.5',unit:'km/h',secondary});
        const {result}=await cdp.send('Runtime.evaluate',{
          expression:'document.querySelector(\'[data-id="square"]\').shadowRoot.querySelector(".bubble-content-container")'
        });
        const {node}=await cdp.send('DOM.describeNode',{objectId:result.objectId});
        const artwork=node.pseudoElements.find(p=>p.pseudoType==='after');
        const {model}=await cdp.send('DOM.getBoxModel',{backendNodeId:artwork.backendNodeId});
        assert.ok(Math.abs(model.border[1]-m.contentTop)<1,'artwork moved away from the top');
        assert.ok(Math.abs(model.border[2]-m.contentRight)<1,'artwork moved away from the right');
        assert.match(m.valueText,/km\/h$/);
        if(secondary) assert.equal(m.secondaryText,secondary);
        await cdp.send('Runtime.releaseObject',{objectId:result.objectId});
      }
    }
  } finally {
    await cdp.detach();
  }
});

test('long/unavailable values reduce illustration space instead of clipping additional data', async t => {
  const page=await fixture(t);
  for(const width of [142,180,288]) {
    const ordinary=await illustrated(page,{width,value:'2.2',unit:'km/h'});
    const long=await illustrated(page,{width,value:'12345.6',unit:'km/h'});
    assert.ok(long.imageWidth<=ordinary.imageWidth,'long value did not take priority');
    const unavailable=await illustrated(page,{width,value:'unavailable',index:-1});
    assert.equal(unavailable.template,'no');
  }
});

test('a larger shared size keeps square artwork clear of full-width secondary text',async t=>{
  const page=await fixture(t);
  await illustrated(page,{width:328,value:'2.2',unit:'km/h',secondary:'Rafales · 4,0 km/h'});
  const m=await page.evaluate(()=>{
    document.body.style.setProperty('--signature-illustration-size','96px');
    const root=document.querySelector('[data-id="square"]').shadowRoot;
    const content=root.querySelector('.bubble-content-container'),art=getComputedStyle(content,'::after');
    const secondary=root.querySelector('.dp-secondary');
    return {width:parseFloat(art.width),height:parseFloat(art.height),
      bottom:content.getBoundingClientRect().top+parseFloat(art.height),
      secondaryTop:secondary.getBoundingClientRect().top,
      secondaryWidth:secondary.getBoundingClientRect().width,contentWidth:content.getBoundingClientRect().width};
  });
  assert.ok(m.width>0&&m.width<96);assert.equal(m.width,m.height);
  assert.ok(m.bottom<=m.secondaryTop,JSON.stringify(m));
  assert.equal(m.secondaryWidth,m.contentWidth);
});

test('illustration keeps a visible native icon clear of the heading when it is not hidden', async t => {
  const page=await fixture(t);
  await illustrated(page,{width:220,icon:true});
  const m=await page.evaluate(()=>{
    const root=document.querySelector('[data-id="square"]').shadowRoot;
    const name=root.querySelector('.bubble-name'),icon=root.querySelector('.bubble-icon-container');
    return {padding:parseFloat(getComputedStyle(name).paddingLeft),iconWidth:icon.getBoundingClientRect().width};
  });
  assert.ok(m.padding>=m.iconWidth+10);
});

test('iconless Square headings share Panel insets while values keep their baseline and native targets',async t=>{
  const page=await fixture(t);
  for(const width of [148,180,246,328,600])for(const mode of ['light','dark'])for(const plain of [false,true])for(const autoHeight of [false,true])for(const artwork of [false,true]){
    await render(page,{width,mode,plain});
    const m=await page.evaluate(({code,autoHeight,artwork})=>{
      const root=document.querySelector('[data-id="square"]').shadowRoot,ctx=contexts.find(c=>c.card===root.querySelector('ha-card'));
      const style=root.querySelectorAll('style')[1],name=root.querySelector('.bubble-name'),state=ctx.elements.state,icon=ctx.elements.iconContainer;
      ctx.config.signature_square={auto_height:autoHeight,secondary:'Rafales · 4,0 km/h',...(artwork?{illustration:{image:'/local/wind.webp'}}:{})};
      const samples=[];
      for(const visible of [true,false,true]){
        ctx.config.show_icon=visible;icon.classList.toggle('hidden',!visible);
        style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
        const frame=ctx.elements.mainContainer.getBoundingClientRect(),content=ctx.elements.contentContainer.getBoundingClientRect(),title=name.getBoundingClientRect(),value=state.getBoundingClientRect(),padding=getComputedStyle(ctx.elements.contentContainer);
        samples.push({top:title.top-frame.top,left:content.left-frame.left+parseFloat(padding.paddingLeft),right:frame.right-content.right+parseFloat(padding.paddingRight),valueTop:value.top-frame.top,valueBottom:value.bottom-frame.top,height:frame.height,
          icon:getComputedStyle(icon).display,valueAction:JSON.parse(state.dataset.tapAction).action,sameName:root.querySelector('.bubble-name')===name,sameState:ctx.elements.state===state});
      }
      return samples;
    },{code,autoHeight,artwork});
    const hint=JSON.stringify({width,mode,plain,autoHeight,artwork,m}),[before,hidden,restored]=m;
    if(!(autoHeight&&artwork)){assert.equal(before.top,18,hint);assert.equal(before.left,10,hint);assert.equal(before.right,10,hint);}
    assert.equal(hidden.top,10,hint);assert.equal(hidden.left,12,hint);assert.equal(hidden.right,12,hint);assert.equal(hidden.icon,'none',hint);
    if(!(autoHeight&&artwork)){assert.equal(hidden.valueTop,before.valueTop,hint);assert.equal(hidden.valueBottom,before.valueBottom,hint);assert.equal(hidden.height,before.height,hint);}
    assert.ok(hidden.valueTop>hidden.top+20&&hidden.valueBottom<hidden.height-10,hint);
    assert.equal(hidden.valueAction,'more-info',hint);assert.ok(hidden.sameName&&hidden.sameState,hint);assert.deepEqual(restored,before,hint);
  }
});

test('theme variants follow HA instead of OS mode, including a theme-only update with cached layout', async t => {
  const page=await fixture(t,{colorScheme:'dark'});
  for(const plain of [false,true]) {
    await page.emulateMedia({colorScheme:'dark'});
    const light=await illustrated(page,{mode:'light',plain,secondary:'Rafales · 4,0 km/h'});
    assert.ok(light.imageURL.includes('/local/day.webp?v=1'));
    const dark=await page.evaluate(code=>{
      const shadow=document.querySelector('[data-id="square"]').shadowRoot;
      const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
      const states=ctx._hass.states,structural=ctx._signatureSquareRuntime.styleCSS;
      const content=ctx.elements.contentContainer,state=ctx.elements.state;
      const before=state.textContent,count=content.children.length;
      ctx._hass={...ctx._hass,themes:{darkMode:true}};
      const css=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
      shadow.querySelectorAll('style')[1].textContent=css;
      return {url:getComputedStyle(content,'::after').backgroundImage,
        sameStates:states===ctx._hass.states,sameStructure:structural===ctx._signatureSquareRuntime.styleCSS,
        sameNodes:count===content.children.length&&state===ctx.elements.state,
        sameValue:before===state.textContent,action:JSON.parse(state.dataset.tapAction).action};
    },code);
    assert.ok(dark.url.includes('/local/night.webp?v=1'));
    assert.equal(dark.sameStates,true);assert.equal(dark.sameStructure,true);
    assert.equal(dark.sameNodes,true);assert.equal(dark.sameValue,true);assert.equal(dark.action,'more-info');
    await page.emulateMedia({colorScheme:'light'});
    assert.ok(await page.evaluate(()=>getComputedStyle(document.querySelector('[data-id="square"]').shadowRoot.querySelector('.bubble-content-container'),'::after').backgroundImage.includes('/local/night.webp?v=1')));
  }
});
