const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-square').code;

async function summary(page,{width=328,mode='dark',plain=false,solar=false,missing=false}={}){
  await render(page,{width,mode,plain});
  return page.evaluate(({code,solar,missing,mode})=>{
    const shadow=document.querySelector('[data-id="square"]').shadowRoot;
    const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
    ctx.config.show_icon=false;ctx.elements.iconContainer.classList.add('hidden');
    ctx.elements.nameContainer.querySelector('.bubble-name').textContent=solar?'Reste à produire':'Disponible';
    ctx._hass.themes={darkMode:mode==='dark'};
    ctx._hass.states['sensor.demo']={state:missing?'unavailable':solar?'22.15':'3.4',attributes:{unit_of_measurement:'kWh'}};
    ctx._hass.states['sensor.power']={state:missing?'unavailable':solar?'7500':'385',attributes:{unit_of_measurement:'W'}};
    ctx.config.signature_square={secondary:solar?'Demain : 4,7 kWh':'Charge globale : 42,0 %',
      summary:{entity:'sensor.power',name:missing?'Indisponible':solar?'Puissance':'En décharge',secondary:solar?'':missing?'Estimation indisponible':'8 h 47 min restantes'},
      illustration:{image:'/local/day.png',image_dark:'/local/night.png',columns:2,rows:1,index:solar?1:0}};
    window.summaryContext=ctx;
    window.refreshSummary=()=>{
      shadow.querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
    };
    window.refreshSummary();
    const selectors=['.bubble-name','.bubble-state','.dp-secondary','.dp-summary-name','.dp-summary-state','.dp-summary-secondary'];
    const box=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const content=ctx.elements.contentContainer,art=getComputedStyle(content,'::after');
    return {height:shadow.querySelector('.bubble-container').getBoundingClientRect().height,content:box(content),
      art:{width:parseFloat(art.width),height:parseFloat(art.height)},
      nodes:selectors.map(selector=>{const el=shadow.querySelector(selector),s=getComputedStyle(el);return{selector,text:el.textContent,box:box(el),scroll:el.scrollWidth,client:el.clientWidth,font:s.fontSize,entity:el.dataset.entity};})};
  },{code,solar,missing,mode});
}

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
