const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-square').code;

test('daily consumption and cost fit the existing banner on mobile and desktop',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark'])for(const width of [288,358,600])for(const water of [false,true]){
    await summary(page,{mode,width,single:true,kind:water?'water':'grid'});
    await page.evaluate(water=>{
      const ctx=window.summaryContext;
      ctx._hass.config={time_zone:'Europe/Paris'};
      ctx._hass.callWS=async req=>Object.fromEntries(req.statistic_ids.map(id=>[id,
        [{start:req.start_time,change:id==='sensor.cost'?3.6:water?.123:12.34}]]));
      ctx.config.signature_square.summary={name:'Jour',statistics:{statistic_ids:['sensor.consumption'],
        unit:water?'L':'kWh',decimals:water?0:2,factor:water?1000:1},
        secondary_statistics:{statistic_ids:['sensor.cost'],unit:'€',decimals:2}};
      window.refreshSummary();
    },water);
    await page.waitForFunction(()=>window.summaryContext.card.querySelector('.dp-summary-secondary').textContent==='3,60 €');
    const m=await page.evaluate(()=>{
      const root=window.summaryContext.card;
      const state=root.querySelector('.dp-summary-state'),detail=root.querySelector('.dp-summary-secondary');
      const card=root.querySelector('.bubble-container').getBoundingClientRect();
      return {height:card.height,value:state.textContent,detail:detail.textContent,
        overflow:[state,detail].some(el=>el.scrollWidth>el.clientWidth+1||el.getBoundingClientRect().bottom>card.bottom),
        stateFont:parseFloat(getComputedStyle(state).fontSize),detailFont:parseFloat(getComputedStyle(detail).fontSize)};
    });
    assert.equal(m.height,120);assert.equal(m.value,water?'123L':'12,34kWh');assert.equal(m.overflow,false);
    assert.ok(m.detailFont<m.stateFont);
  }
});

test('a daily statistics total uses the same large summary rows as an entity value',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [288,358,600])for(const percent of [false,true]){
    await summary(page,{mode,plain,width});
    await page.evaluate(percent=>{
      const ctx=window.summaryContext;
      ctx._hass.config={time_zone:'Europe/Paris'};
      ctx._hass.callWS=async request=>Object.fromEntries(request.statistic_ids.map(id=>[id,
        [{start:request.start_time,change:1.8}]]));
      ctx.elements.nameContainer.querySelector('.bubble-name').textContent='Puissance';
      ctx.config.signature_square.secondary='';
      ctx.config.signature_square.summary=percent?{name:'Autosuffisance',
        statistics:{statistic_ids:['sensor.grid','sensor.solar'],part_statistic_ids:['sensor.grid'],
          operation:'remaining_percentage',unit:'%',decimals:0}}:
        {name:'Coût du jour',secondary:'Hors abonnement',
          statistics:{statistic_ids:['sensor.hc_cost','sensor.hp_cost'],unit:'€',decimals:2}};
      window.refreshSummary();
    },percent);
    await page.waitForFunction(expected=>window.summaryContext.card.querySelector('.dp-summary-state').textContent===expected,percent?'50%':'3,60€');
    const m=await page.evaluate(()=>{
      const root=window.summaryContext.card;
      const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
      const value=root.querySelector('.dp-summary-state'),other=root.querySelector('.bubble-state');
      return {height:root.querySelector('.bubble-container').getBoundingClientRect().height,
        value:rect(value),other:rect(other),font:getComputedStyle(value).fontSize,
        otherFont:getComputedStyle(other).fontSize,unit:getComputedStyle(value.querySelector('.dp-unit')).fontSize,
        otherUnit:getComputedStyle(other.querySelector('.dp-unit')).fontSize,
        clipped:value.scrollWidth>value.clientWidth+1,
        detail:root.querySelector('.dp-summary-secondary').textContent};
    });
    assert.equal(m.height,120);assert.equal(m.font,m.otherFont);assert.equal(m.unit,m.otherUnit);
    assert.equal(m.value.top,m.other.top);assert.ok(m.value.left>=m.other.right+9);assert.equal(m.clipped,false);
    if(percent)assert.equal(m.detail,'');
  }
});

async function summary(page,{width=328,mode='dark',plain=false,solar=false,missing=false,single=false,kind='home',shortNames=false}={}){
  await render(page,{width,mode,plain});
  return page.evaluate(({code,solar,missing,mode,single,kind,shortNames})=>{
    const shadow=document.querySelector('[data-id="square"]').shadowRoot;
    const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
    ctx.config.show_icon=false;ctx.elements.iconContainer.classList.add('hidden');
    ctx.elements.nameContainer.querySelector('.bubble-name').textContent=single?(kind==='water'?'Débit total':'Puissance'):solar?'Reste à produire':'Disponible';
    ctx._hass.themes={darkMode:mode==='dark'};
    ctx._hass.states['sensor.demo']={state:missing?'unavailable':single?(kind==='water'?'15.0':kind==='grid'?'-7500':'7500'):solar?'22.15':'3.4',attributes:{unit_of_measurement:single?(kind==='water'?'L/min':'W'):'kWh'}};
    ctx._hass.states['sensor.power']={state:missing?'unavailable':solar?'7500':'385',attributes:{unit_of_measurement:'W'}};
    ctx.config.signature_square={secondary:single?'':solar?'Demain : 4,7 kWh':'Charge globale : 42,0 %',
      summary:single?{enabled:true}:{entity:'sensor.power',name:shortNames?'Puissance':missing?'Indisponible':solar?'Puissance':'En décharge',secondary:solar?'':missing?'Estimation indisponible':'8 h 47 min restantes'},
      illustration:{image:'/local/day.png',image_dark:'/local/night.png',columns:2,rows:1,index:solar?1:0}};
    window.summaryContext=ctx;
    window.refreshSummary=()=>{
      shadow.querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
    };
    window.refreshSummary();
    const selectors=['.bubble-name','.bubble-state','.dp-secondary','.dp-summary-name','.dp-summary-state','.dp-summary-secondary'];
    const box=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const content=ctx.elements.contentContainer,art=getComputedStyle(content,'::after');
    return {height:shadow.querySelector('.bubble-container').getBoundingClientRect().height,card:box(shadow.querySelector('.bubble-container')),content:box(content),
      art:{width:parseFloat(art.width),height:parseFloat(art.height)},
      single:ctx.card.getAttribute('data-dp-summary-single'),groups:shadow.querySelectorAll('.dp-summary').length,
      nodes:selectors.flatMap(selector=>{const el=shadow.querySelector(selector);if(!el)return[];const s=getComputedStyle(el);return[{selector,text:el.textContent,box:box(el),scroll:el.scrollWidth,client:el.clientWidth,font:s.fontSize,entity:el.dataset.entity}];})};
  },{code,solar,missing,mode,single,kind,shortNames});
}

test('energy banner titles keep the same top inset as classic half-width tiles',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [288,328,358,382,600])for(const single of [false,true]){
    const banner=await summary(page,{mode,plain,width,single,shortNames:true});
    const classic=await page.evaluate(width=>{
      const ctx=window.summaryContext,shadow=ctx.card.getRootNode();
      delete ctx.config.signature_square.summary;
      window.refreshSummary();
      shadow.host.style.width=(width-8)/2+'px';
      const title=shadow.querySelector('.bubble-name'),card=shadow.querySelector('.bubble-container');
      return {top:title.getBoundingClientRect().top-card.getBoundingClientRect().top,height:title.getBoundingClientRect().height};
    },width);
    for(const name of banner.nodes.filter(n=>['.bubble-name','.dp-summary-name'].includes(n.selector))){
      assert.equal(name.box.top-banner.card.top,classic.top,JSON.stringify({mode,plain,width,single,name,classic}));
      assert.equal(name.box.height,classic.height);
    }
    assert.equal(banner.height,120);
  }
});

test('single banners share classic value placement and grow secondary leading with the live font',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [288,328,358,382,600]){
    const banner=await summary(page,{mode,plain,width,single:true});
    const classic=await page.evaluate(()=>{
      const ctx=window.summaryContext,shadow=ctx.card.getRootNode();
      delete ctx.config.signature_square.summary;window.refreshSummary();
      return shadow.querySelector('.bubble-state').getBoundingClientRect().top-shadow.querySelector('.bubble-container').getBoundingClientRect().top;
    });
    assert.equal(banner.nodes.find(n=>n.selector==='.bubble-state').box.top-banner.card.top,classic);
    assert.equal(banner.height,120);
  }
  await summary(page,{width:600});
  const leading=await page.evaluate(()=>{
    const ctx=window.summaryContext,shadow=ctx.card.getRootNode(),css=ctx._signatureSquareRuntime.styleCSS;
    document.body.style.setProperty('--signature-secondary-font-size','17px');
    return {cached:css===ctx._signatureSquareRuntime.styleCSS,nodes:[...shadow.querySelectorAll('.dp-secondary,.dp-summary-secondary')].map(el=>({font:parseFloat(getComputedStyle(el).fontSize),line:parseFloat(getComputedStyle(el).lineHeight)}))};
  });
  assert.equal(leading.cached,true);
  for(const node of leading.nodes){assert.equal(node.font,17);assert.ok(node.line>=20.39);}
});

test('wide energy summaries remain two rows with complete text, both values and centred artwork',async t=>{
  const page=await fixture(t),cdp=await page.context().newCDPSession(page);
  try{
    for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [252,288,328,358,600])for(const solar of [false,true])for(const missing of [false,true]){
      const m=await summary(page,{mode,plain,width,solar,missing});
      assert.equal(m.height,120,JSON.stringify({mode,plain,width,solar,missing,m}));
      for(const n of m.nodes){
        assert.ok(n.scroll<=n.client+1,'clipped '+JSON.stringify({width,solar,missing,n}));
        assert.ok(n.box.top>=m.content.top-.1&&n.box.bottom<=m.content.bottom+.1,'vertical overflow '+JSON.stringify({width,solar,missing,n,m}));
      }
      for(const [left,right]of [[0,3],[1,4],[2,5]])assert.ok(m.nodes[left].box.right+9<=m.nodes[right].box.left,'columns overlap '+JSON.stringify(m));
      for(const [name,state,detail]of [[0,1,2],[3,4,5]]){
        assert.ok(m.nodes[name].box.bottom<=m.nodes[state].box.top+.1,'name/value overlap '+JSON.stringify(m));
        assert.ok(m.nodes[state].box.bottom<=m.nodes[detail].box.top+.1,'value/detail overlap '+JSON.stringify(m));
      }
      assert.ok(m.art.width>0&&m.art.width<=80);assert.equal(m.art.width,m.art.height);
      const {result}=await cdp.send('Runtime.evaluate',{expression:'window.summaryContext.elements.contentContainer'});
      const {node}=await cdp.send('DOM.describeNode',{objectId:result.objectId});
      const art=node.pseudoElements.find(p=>p.pseudoType==='after');
      const {model}=await cdp.send('DOM.getBoxModel',{backendNodeId:art.backendNodeId});
      assert.ok(Math.abs((model.border[1]+model.border[5])/2-(m.content.top+m.content.bottom)/2)<.1,'art not centred');
      assert.ok(model.border[0]>=m.nodes[4].box.right+9,'art overlaps value');
      await cdp.send('Runtime.releaseObject',{objectId:result.objectId});
    }
  }finally{await cdp.detach();}
});

test('summary size and HA theme remain live while keeping its fixed card height and value targets',async t=>{
  const page=await fixture(t);await summary(page,{width:358});
  const m=await page.evaluate(()=>{
    const ctx=window.summaryContext,shadow=ctx.card.getRootNode(),before=ctx._signatureSquareRuntime.styleCSS;
    document.body.style.setProperty('--signature-illustration-size','96px');
    const sizes=[];
    for(const size of ['64px','96px','140px']){
      document.body.style.setProperty('--signature-illustration-size',size);
      const art=getComputedStyle(ctx.elements.contentContainer,'::after');
      sizes.push({width:parseFloat(art.width),height:parseFloat(art.height),card:shadow.querySelector('.bubble-container').getBoundingClientRect().height});
    }
    ctx._hass.themes={darkMode:false};window.refreshSummary();
    const power=shadow.querySelector('.dp-summary-state');
    return{sizes,sameCss:before===ctx._signatureSquareRuntime.styleCSS,url:getComputedStyle(ctx.elements.contentContainer,'::after').backgroundImage,
      target:power.dataset.entity,action:JSON.parse(power.dataset.tapAction).action};
  });
  assert.equal(m.sameCss,true);assert.ok(m.url.includes('/local/day.png'));assert.equal(m.target,'sensor.power');assert.equal(m.action,'more-info');
  assert.equal(m.sizes[0].width,64);assert.equal(m.sizes[1].width,96);assert.ok(m.sizes[2].width<=100);
  for(const s of m.sizes){assert.equal(s.width,s.height);assert.equal(s.card,120);}
});

test('active or pending alert badges stay visible despite the hidden main illustration icon',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark']){
    await summary(page,{mode});
    const result=await page.evaluate(()=>{
      const icon=window.summaryContext.elements.iconContainer;
      const badge=document.createElement('span');badge.className='am-alert-badge';icon.append(badge);
      return ['active','pending','none'].map(state=>{
        badge.setAttribute('data-am-state',state);
        return{state,display:getComputedStyle(icon).display,main:getComputedStyle(icon.firstElementChild).display};
      });
    });
    for(const m of result){assert.equal(m.display,m.state==='none'?'none':'flex');assert.equal(m.main,'none');}
  }
});

test('single energy banners keep two native rows, full-size values and centred common artwork without an empty second column',async t=>{
  const page=await fixture(t),cdp=await page.context().newCDPSession(page);
  try{
    for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [252,328,600])for(const kind of ['home','grid','water'])for(const missing of [false,true]){
      const m=await summary(page,{mode,plain,width,kind,missing,single:true});
      assert.equal(m.height,120);assert.equal(m.single,'yes');assert.equal(m.groups,0);assert.equal(m.art.width,80);assert.equal(m.art.height,80);
      const name=m.nodes.find(n=>n.selector==='.bubble-name'),value=m.nodes.find(n=>n.selector==='.bubble-state');
      assert.equal(value.font,'28px');assert.equal(value.entity,'sensor.demo');
      assert.ok(value.scroll<=value.client+1,JSON.stringify({mode,plain,width,kind,missing,m}));
      assert.ok(name.box.bottom<=value.box.top);assert.ok(value.box.bottom<=m.content.bottom);
      const {result}=await cdp.send('Runtime.evaluate',{expression:'window.summaryContext.elements.contentContainer'});
      const {node}=await cdp.send('DOM.describeNode',{objectId:result.objectId});
      const {model}=await cdp.send('DOM.getBoxModel',{backendNodeId:node.pseudoElements.find(p=>p.pseudoType==='after').backendNodeId});
      assert.ok(value.box.right+9<=model.border[0],'art/value intersection '+JSON.stringify(m));
      assert.ok(Math.abs((model.border[1]+model.border[5])/2-(m.content.top+m.content.bottom)/2)<.1);
      assert.ok(Math.abs(model.border[2]-m.content.right)<.1);
      await cdp.send('Runtime.releaseObject',{objectId:result.objectId});
    }
  }finally{await cdp.detach();}
});
