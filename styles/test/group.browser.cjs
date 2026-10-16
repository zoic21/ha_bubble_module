const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture:browserFixture}=require('./browser.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const {theme,nativeModes}=require('./fixtures.cjs');
const group=loadModule('signature-group').code;
const compact=loadModule('signature-compact').code;

test('group summary fits compact cards in light and dark, follows native updates and cleans up',async t=>{
  const page=await browserFixture(t,{prepare:null,viewport:{width:650,height:500}});
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [142,288,358,600]){
    await page.setContent('<div id="fixture"></div>');
    const result=await page.evaluate(async({group,compact,theme,native,plain,width})=>{
      const vars={...native,...(plain?{}:{...theme,...theme.modes[native.mode]})};delete vars.modes;
      for(const [key,value] of Object.entries(vars))document.documentElement.style.setProperty('--'+key,value);
      const shell=document.querySelector('#fixture');shell.style.width=width+'px';
      const shadow=shell.attachShadow({mode:'open'});
      shadow.innerHTML='<style>ha-card{display:block;position:relative;width:100%;font:14px/1.3 sans-serif}.bubble-container{position:relative;width:100%;overflow:hidden;box-sizing:border-box}.bubble-wrapper{position:relative;height:100%}.bubble-content-container{display:flex}.bubble-name-container{display:flex;flex-direction:column}.bubble-name{color:var(--primary-text-color)}.bubble-background{position:absolute;inset:0}.hidden{display:none!important}</style><ha-card><div class="bubble-container"><div class="bubble-wrapper"><div class="bubble-content-container"><div class="bubble-icon-container"></div><div class="bubble-name-container"><div class="bubble-name">Activités</div><div class="bubble-state hidden"></div></div></div><div class="bubble-sub-button-container"></div><div class="bubble-buttons-container"></div></div></div></ha-card>';
      const root=shadow.querySelector('ha-card');const q=s=>shadow.querySelector(s);
      const hass={locale:{language:'fr',number_format:'language'},states:{'sensor.demo':{state:'on',attributes:{}}}};
      const source={config:{card_type:'pop-up',hash:'#activities',modules:['signature_group'],cards:Array.from({length:4},(_,i)=>({type:'tile',name:['Imprimante du bureau','Télévision du séjour','Tondeuse','Robot'][i],entity:'sensor.demo',visibility:[{condition:'state',entity:'sensor.demo',state:'on'}]}))}};
      const ctx={card:root,config:{card_type:'button',button_type:'name',show_state:false,signature_compact:{color:'blue'},button_action:{tap_action:{action:'navigate',navigation_path:'#activities'}}},elements:{mainContainer:q('.bubble-container'),contentContainer:q('.bubble-content-container'),nameContainer:q('.bubble-name-container'),iconContainer:q('.bubble-icon-container'),state:q('.bubble-state')}};
      const compile=code=>new Function('hass','onTeardown','renderTemplate','checkConditionsMet','return `'+code+'`;');
      const render=compile(group),renderCompact=compile(compact),check=conditions=>conditions.every(c=>hass.states[c.entity]?.state===c.state);
      const teardown=owner=>fn=>owner.teardown=fn;
      render.call(source,hass,teardown(source),v=>v,check);
      const css=document.createElement('style');shadow.append(css);
      const update=()=>{css.textContent=renderCompact.call(ctx,hass,()=>{},v=>v)+render.call(ctx,hass,teardown(ctx),v=>v,check);};update();
      const get=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,height:r.height,color:s.color,font:s.fontSize,background:s.backgroundColor};};
      const first={card:get(root),summary:get(ctx._signatureGroup.summary),badge:get(ctx._signatureGroup.badge),text:ctx._signatureGroup.summary.textContent};
      hass.states['sensor.demo'].state='off';update();const empty={count:ctx._signatureGroup.badge.textContent,text:ctx._signatureGroup.summary.textContent};
      source.teardown();update();const missing=ctx._signatureGroup.badge.textContent;
      ctx.teardown();await Promise.resolve();
      return {first,empty,missing,remaining:root.querySelectorAll('.sg-summary,.sg-count').length};
    },{group,compact,theme,native:{...nativeModes[mode],mode},plain,width});
    const {first}=result;
    assert.equal(first.card.height,56);assert.equal(first.summary.font,'13px');assert.equal(first.badge.font,'14px');
    assert.equal(first.badge.height,28);assert.ok(first.summary.right<=first.badge.x-6);
    assert.ok(first.summary.bottom<=first.card.bottom);assert.ok(first.badge.right<=first.card.right-9);
    assert.equal(first.text,'Imprimante du bureau, Télévision du séjour +2');
    assert.deepEqual(result.empty,{count:'0',text:'Aucune activité'});assert.equal(result.missing,'—');assert.equal(result.remaining,0);
  }
});

test('native hidden-card contract collapses the grid row and keeps updates alive, including editor transitions',async t=>{
  const page=await browserFixture(t,{prepare:null});
  const result=await page.evaluate(({group})=>{
    document.body.innerHTML='<style>#grid{display:grid;gap:8px}#cell[hidden]{display:none}#next{height:56px}</style><div id="grid"><div id="cell"></div><div id="next">Confort</div></div>';
    const host=document.createElement('div'),root=document.createElement('div'),names=document.createElement('div');
    const cell=document.querySelector('#cell');cell.append(host);host.append(root);root.append(names);
    Object.assign(host,{config:{card_type:'button',button_type:'name',signature_group:{popup:'#activities',hide_empty:true}},card:root,elements:{nameContainer:names,mainContainer:root}});
    // Same retention contract as hui-card: hidden elements must opt in to staying connected.
    host.addEventListener('card-visibility-changed',event=>{
      event.stopPropagation();cell.hidden=host.hidden;
      if(host.connectedWhileHidden===true||!host.hidden){if(!host.parentNode)cell.append(host);}else host.remove();
    });
    const sourceHost=document.createElement('div');document.body.append(sourceHost);
    const source={config:{card_type:'pop-up',hash:'#activities',modules:['signature_group'],cards:[]},elements:{popUpContainer:sourceHost}};
    const hass={states:{}},render=new Function('hass','onTeardown','renderTemplate','checkConditionsMet','return `'+group+'`;');
    const run=ctx=>render.call(ctx,hass,fn=>ctx.teardown=fn,v=>v,()=>true);
    run(source);run(host);
    const empty={hidden:host.hidden,connected:host.isConnected,nextTop:document.querySelector('#next').getBoundingClientRect().top,gridTop:document.querySelector('#grid').getBoundingClientRect().top};
    source.config={...source.config,cards:[{type:'tile',name:'Alarme'}]};run(source);run(host);
    const active={hidden:host.hidden,visible:!cell.hidden,count:host._signatureGroup.badge.textContent,text:host._signatureGroup.summary.textContent};
    source.config={...source.config,cards:[]};run(source);run(host);
    source.editor=true;host.editor=true;run(source);run(host);
    const editing={hidden:host.hidden,emptyBlocks:sourceHost.querySelectorAll('.sg-empty').length};
    host.teardown();source.teardown();return {empty,active,editing};
  },{group});
  assert.equal(result.empty.hidden,true);assert.equal(result.empty.connected,true);assert.equal(result.empty.nextTop,result.empty.gridTop);
  assert.deepEqual(result.active,{hidden:false,visible:true,count:'1',text:'Alarme'});
  assert.deepEqual(result.editing,{hidden:false,emptyBlocks:0});
});
