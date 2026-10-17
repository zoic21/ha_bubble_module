const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const {theme,nativeModes}=require('./fixtures.cjs');
const group=loadModule('signature-group').code,compact=loadModule('signature-compact').code;

async function setup(page,{width=350,count=10,mode='light',plain=false,cards}={}) {
 await page.evaluate(async({group,compact,theme,native,width,count,cards})=>{
  for(const ctx of window.contexts||[])ctx.teardown?.();
  document.body.innerHTML='<div id="fixture"></div>';
  document.body.style.cssText='margin:16px;background:var(--primary-background-color)';
  const vars={...native,...theme};delete vars.modes;
  document.documentElement.style.cssText='';
  for(const [key,value]of Object.entries(vars))document.documentElement.style.setProperty('--'+key,value);
  const shell=document.querySelector('#fixture');shell.style.width=width+'px';
  const shadow=shell.attachShadow({mode:'open'});
  shadow.innerHTML='<style>ha-card{display:block;position:relative;width:100%;font:14px/1.3 sans-serif}.bubble-container{position:relative;width:100%;overflow:hidden;box-sizing:border-box;border:var(--bubble-border,0);border-radius:var(--bubble-button-border-radius,22px);background:var(--bubble-main-background-color,var(--card-background-color));box-shadow:var(--bubble-box-shadow,none)}.bubble-wrapper{position:relative;width:100%;height:100%}.bubble-content-container{display:flex}.bubble-name-container{display:flex;flex-direction:column}.bubble-background{position:absolute;inset:0}.hidden{display:none!important}</style><ha-card><div class="bubble-container"><div class="bubble-wrapper"><div class="bubble-background"></div><div class="bubble-content-container"><div class="bubble-icon-container"></div><div class="bubble-name-container"><div class="bubble-name">Activités</div><div class="bubble-state hidden"></div></div></div><div class="bubble-sub-button-container"></div><div class="bubble-buttons-container"></div></div></div></ha-card>';
  const q=s=>shadow.querySelector(s),hass={locale:{language:'fr'},themes:{darkMode:native.mode==='dark'},states:{}};
  const names=['H2S','Piscine','Télévision','Amplificateur','Enceinte','Tondeuse','Citronnier','Haie','Potager','Fruits rouges','Alarme','Robot piscine','Aspirateur étage','Aspirateur RDC','Apple TV Salon','Apple TV Centre','WiiM Amp'];
  const source={config:{card_type:'pop-up',hash:'#activities',modules:['signature_group'],cards:cards||Array.from({length:count},(_,i)=>({type:'tile',name:names[i],signature_square:{illustration:{image:'/local/atlas.png',columns:4,rows:6,index:i%12,index_dark:i%12+12,offset_y:12.5,offset_y_dark:3.125}}}))}};
  const ctx={config:{card_type:'button',button_type:'name',show_name:false,show_icon:false,show_state:false,signature_group:{presentation:'chips',hide_empty:false},button_action:{tap_action:{action:'navigate',navigation_path:'#activities'}}},card:q('ha-card'),elements:{mainContainer:q('.bubble-container'),contentContainer:q('.bubble-content-container'),nameContainer:q('.bubble-name-container'),iconContainer:q('.bubble-icon-container'),state:q('.bubble-state')}};
  const compile=code=>new Function('hass','onTeardown','renderTemplate','checkConditionsMet','return `'+code+'`;');
  const groupRun=compile(group),compactRun=compile(compact),style=document.createElement('style');shadow.append(style);
  const run=owner=>groupRun.call(owner,hass,fn=>owner.teardown=fn,v=>v,()=>true);
  run(source);ctx.updateBubbleCard=()=>{style.textContent=compactRun.call(ctx,hass,()=>{},v=>v)+run(ctx);};ctx.updateBubbleCard();
  window.demo={source,ctx,hass,run,shadow,clicked:0};window.contexts=[source,ctx];
  q('.bubble-background').addEventListener('click',()=>window.demo.clicked++);
 },{group,compact,theme:plain?{}:{...theme,...theme.modes[mode]},native:{...nativeModes[mode],mode},width,count,cards});
 await settle(page);
}
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function geometry(page){return page.evaluate(()=>{
 const {ctx,shadow}=window.demo,r=ctx._signatureGroup;
 const rect=e=>{const b=e.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
 return{card:rect(shadow.querySelector('.bubble-container')),arrow:rect(r.arrow),track:rect(r.track),more:rect(r.more),moreText:r.more.textContent,moreVisible:getComputedStyle(r.more).visibility==='visible',message:r.message.textContent,visible:r.visibleCount,nodes:r.nodes.map(n=>({...rect(n),shown:getComputedStyle(n).visibility==='visible',label:n.label.textContent,art:getComputedStyle(n.art).display,image:n.art.style.backgroundImage,position:n.art.style.backgroundPosition})),name:getComputedStyle(ctx.elements.nameContainer).display,icon:getComputedStyle(ctx.elements.iconContainer).display};
});}

test('chips pack equipment by actual width with exact hidden count, fixed height and right arrow',async t=>{
 const page=await fixture(t,{prepare:null,viewport:{width:1100,height:300}});
 for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [288,328,358,382,600,992])for(const count of [0,1,2,3,10,17]){
  await setup(page,{width,count,mode,plain});const m=await geometry(page);
  assert.equal(m.card.height,56);assert.equal(m.card.width,width);
  assert.equal(m.name,'none');assert.equal(m.icon,'none');
  assert.ok(m.card.right-m.arrow.right>=9&&m.card.right-m.arrow.right<=10.1,JSON.stringify({mode,plain,width,count,m}));
  assert.ok(Math.abs((m.arrow.top+m.arrow.bottom)/2-(m.card.top+m.card.bottom)/2)<0.5);
  const shown=m.nodes.filter(n=>n.shown);assert.equal(shown.length,m.visible);
  assert.equal(m.moreVisible,m.visible<count);assert.equal(m.moreText,m.visible<count?'+'+(count-m.visible):'');
  let lastRight=m.track.left;
  for(const n of shown){assert.ok(n.left>=lastRight-0.5);assert.equal(n.height,36);assert.ok(n.top>=m.card.top&&n.bottom<=m.card.bottom);assert.ok(n.right<=(m.moreVisible?m.more.left-8:m.track.right)+0.5);lastRight=n.right;}
  const next=m.nodes[m.visible];
  if(next){
   if(m.visible+1===count)assert.ok(next.right>m.track.right,'all fitting equipment must be shown without overflow');
   else assert.ok(next.right+8+m.more.width>m.track.right-0.5,'a further pill must not fit beside +N');
  }
 }
});

test('resize, names, theme fonts and source changes repack the same nodes and preserve native click',async t=>{
 const page=await fixture(t,{prepare:null});await setup(page,{width:992,count:10});
 const before=await geometry(page);
 await page.evaluate(()=>{window.first=demo.ctx._signatureGroup.nodes[0];document.querySelector('#fixture').style.width='288px';});await settle(page);
 const narrow=await geometry(page);assert.ok(narrow.visible<before.visible);assert.equal(narrow.nodes[0].width,before.nodes[0].width);
 await page.evaluate(()=>document.documentElement.style.setProperty('--signature-name-font-size','18px'));await settle(page);
 const large=await geometry(page);assert.ok(large.visible<=narrow.visible);assert.equal(large.card.height,56);
 await page.evaluate(()=>{demo.hass.themes.darkMode=true;demo.ctx.updateBubbleCard();});await settle(page);
 assert.equal(await page.evaluate(()=>demo.ctx._signatureGroup.nodes[0]===window.first),true);
 assert.match((await geometry(page)).nodes[0].position,/60\.625%/);
 await page.evaluate(()=>{demo.source.config={...demo.source.config,cards:[{type:'tile',name:'H2S'}]};demo.run(demo.source);});await settle(page);
 const single=await geometry(page);assert.equal(single.nodes.length,1);assert.equal(single.moreVisible,false);
 await page.mouse.click(single.card.left+30,single.card.top+28);
 await page.mouse.click(single.arrow.left+10,single.arrow.top+10);
 assert.equal(await page.evaluate(()=>demo.clicked),2);
 await page.evaluate(()=>{demo.ctx.config.signature_group.presentation='summary';demo.ctx.updateBubbleCard();});await settle(page);
 assert.equal(await page.evaluate(()=>demo.shadow.querySelectorAll('.sg-strip').length),0);
 assert.notEqual(await page.evaluate(()=>getComputedStyle(demo.ctx.elements.nameContainer).display),'none');
});

test('very long labels, literal HTML, source removal and hidden cards stay bounded',async t=>{
 const page=await fixture(t,{prepare:null});
 await setup(page,{width:288,cards:[{type:'tile',name:'Un nom particulièrement long avec des caractères accentués'},{type:'tile',name:'<img src=x onerror=alert(1)>'}]});
 const m=await geometry(page);assert.equal(m.nodes[0].width,180);assert.equal(m.visible,1);assert.equal(m.moreText,'+1');
 assert.equal(await page.evaluate(()=>demo.shadow.querySelectorAll('.sg-item img').length),0);
 await page.evaluate(()=>{demo.source.teardown();demo.ctx.updateBubbleCard();});await settle(page);
 assert.equal((await geometry(page)).message,'Popup non initialisée');
 await page.evaluate(()=>{demo.source.config.cards=[];demo.run(demo.source);demo.ctx.config.signature_group.hide_empty=true;demo.ctx.updateBubbleCard();});
 assert.equal(await page.evaluate(()=>demo.ctx.hidden),true);
 await page.evaluate(()=>{demo.source.config={...demo.source.config,cards:[{type:'tile',name:'Nouveau'}]};demo.run(demo.source);});await settle(page);
 assert.equal(await page.evaluate(()=>demo.ctx.hidden),false);assert.equal((await geometry(page)).visible,1);
});
