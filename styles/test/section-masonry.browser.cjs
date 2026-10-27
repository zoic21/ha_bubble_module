const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-header').code;

async function render(page,{columns=2,enabled=true,gap=24}={}){
 await page.evaluate(({code,columns,enabled,gap})=>{
  window.contexts?.forEach(c=>c.teardown?.());window.contexts=[];
  document.body.innerHTML='<hui-sections-view></hui-sections-view>';
  const view=document.querySelector('hui-sections-view');
  const shadow=view.attachShadow({mode:'open'});
  shadow.innerHTML=`<style>
    :host{display:block;--row-gap:${gap}px;--column-gap:32px;--content-column-count:${columns}}
    .wrapper{max-width:1032px;margin:auto}.container{display:grid;grid-template-columns:repeat(var(--content-column-count),1fr);padding:24px 0}
    ha-sortable{display:contents}.content{grid-column:1/-1;display:grid;grid-template-columns:repeat(var(--content-column-count),1fr);gap:var(--row-gap) var(--column-gap);align-items:start}
    .section{grid-column:span var(--column-span);grid-row:span var(--row-span)}
    .section:has(hui-section[hidden]){display:none}
  </style><div class="wrapper ${columns===1?'single-column':''}"><div class="container"><ha-sortable><div class="content"></div></ha-sortable></div></div>`;
  const content=shadow.querySelector('.content');window.viewFixture={view,content,shadow};
  const add=(height,span=1)=>{
   const section=document.createElement('div');section.className='section';section.style.cssText=`--column-span:${Math.min(columns,span)};--row-span:1`;
   section.innerHTML=`<div class="section-container"><hui-section><div class="body" style="height:${height}px;background:#ddd"></div></hui-section></div>`;
   content.append(section);return section;
  };
  window.viewFixture.add=add;
  [100,260,80,100,156,76].forEach((h,i)=>add(h,i===0?columns:1));
  const attach=(section)=>{
   const grid=document.createElement('hui-grid-section');section.querySelector('hui-section').append(grid);
   const shadow=grid.attachShadow({mode:'open'});shadow.innerHTML='<ha-card><div class="bubble-container"><div class="bubble-name">Titre</div></div></ha-card>';
   const root=shadow.querySelector('ha-card'),config={card_type:'separator',name:'Titre',signature_header:{masonry_sections:enabled}};
   const ctx={card:root,config,elements:{mainContainer:root.querySelector('.bubble-container')}};
   const render=()=>new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,{states:{}},fn=>ctx.teardown=fn,v=>v);
   const style=document.createElement('style');style.textContent=render();shadow.append(style);
   window.contexts.push(ctx);return{ctx,render};
  };
  window.viewFixture.first=attach(content.children[0]);window.viewFixture.attach=attach;
 },{code,columns,enabled,gap});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
}
async function boxes(page){return page.evaluate(()=>[...viewFixture.content.children].map(s=>{const b=s.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height,hidden:getComputedStyle(s).display==='none'};}));}
function noOverlap(rows){for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j];if(a.hidden||b.hidden)continue;assert.ok(a.right<=b.x+.1||b.right<=a.x+.1||a.bottom<=b.y+.1||b.bottom<=a.y+.1,JSON.stringify({a,b}));}}

test('independent sections fill vertical space and follow height, column, visibility and list changes',async t=>{
 const page=await fixture(t);
 for(const columns of [2,3,4])for(const gap of [24,32]){
  await render(page,{columns,gap});let b=await boxes(page);noOverlap(b);
  const successor=b[columns+1];
  assert.ok(successor.y<b[1].bottom,'short-column successor starts above tall neighbor bottom');
  assert.ok(successor.y-b[2].bottom>=gap&&successor.y-b[2].bottom<gap+4.1,'only the configured gap and grid rounding remain');
  await page.evaluate(()=>viewFixture.content.children[2].querySelector('.body').style.height='180px');
  await page.waitForFunction(gap=>viewFixture.content.children[2].style.getPropertyValue('--signature-masonry-rows')===String(Math.ceil((180+gap)/4)),gap);
  noOverlap(await boxes(page));
  await page.evaluate(()=>viewFixture.content.children[1].querySelector('hui-section').hidden=true);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  b=await boxes(page);assert.equal(b[1].hidden,true);noOverlap(b);
  await page.evaluate(()=>{viewFixture.content.children[1].querySelector('hui-section').hidden=false;viewFixture.add(196);viewFixture.content.children[4].remove();});
  await page.waitForFunction(()=>viewFixture.content.lastElementChild.style.getPropertyValue('--signature-masonry-rows')!=='');
  noOverlap(await boxes(page));
 }
});

test('native mobile and edit-mode grids stay unchanged and all shared resources are restored',async t=>{
 const page=await fixture(t);await render(page,{columns:1});
 assert.equal(await page.evaluate(()=>getComputedStyle(viewFixture.content).rowGap),'24px');
 await render(page,{columns:2});
 await page.evaluate(()=>{
  viewFixture.second=viewFixture.attach(viewFixture.content.children[1]);
  const edit=document.createElement('hui-section-edit-mode');viewFixture.content.children[0].append(edit);
 });
 assert.equal(await page.evaluate(()=>getComputedStyle(viewFixture.content).rowGap),'24px');
 await page.evaluate(()=>viewFixture.content.querySelector('hui-section-edit-mode').remove());
 assert.equal(await page.evaluate(()=>viewFixture.shadow.querySelectorAll('[data-signature-view-masonry]').length),1);
 await page.evaluate(()=>{viewFixture.first.ctx.config.signature_header.masonry_sections=false;viewFixture.first.render();});
 assert.equal(await page.evaluate(()=>viewFixture.shadow.querySelectorAll('[data-signature-view-masonry]').length),1);
 await page.evaluate(()=>viewFixture.second.ctx.teardown());
 assert.equal(await page.evaluate(()=>viewFixture.shadow.querySelectorAll('[data-signature-view-masonry]').length),0);
 assert.equal(await page.evaluate(()=>[...viewFixture.content.children].some(s=>s.style.getPropertyValue('--signature-masonry-rows'))),false);
 assert.equal(await page.evaluate(()=>getComputedStyle(viewFixture.content).rowGap),'24px');
});

test('partial-width wide sections keep their native columns without overlapping shorter neighbors',async t=>{
 const page=await fixture(t);await render(page,{columns:4});
 await page.evaluate(()=>viewFixture.content.children[1].style.setProperty('--column-span','3'));
 await page.waitForFunction(()=>viewFixture.content.children[1].getBoundingClientRect().width>700);
 const b=await boxes(page);noOverlap(b);
 assert.ok(Math.abs(b[1].width-(b[2].width*3+64))<.1);
 assert.ok(Math.abs(b[0].width-(b[2].width*4+96))<.1);
});

test('minimum card width restores whole rows in narrow native sections without changing configuration',async t=>{
 const page=await fixture(t);
 await page.evaluate(({code})=>{
  document.body.innerHTML='<hui-grid-section></hui-grid-section>';
  const grid=document.querySelector('hui-grid-section');grid.style.cssText='display:block;width:500px';
  const shadow=grid.attachShadow({mode:'open'});
  shadow.innerHTML='<style>.container{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px}.card{grid-column:span 6;min-width:0}.full-width{grid-column:1/-1}</style><div class="container"><div class="card full-width"><ha-card><div class="bubble-container"></div></ha-card></div><div class="card">Lumière</div><div class="card">Ambiance</div></div>';
  const root=shadow.querySelector('ha-card');
  const ctx={card:root,config:{card_type:'separator',signature_header:{minimum_card_width:220}},elements:{mainContainer:root.querySelector('.bubble-container')}};
  const style=document.createElement('style');style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,{states:{}},fn=>ctx.teardown=fn,v=>v);shadow.append(style);
  window.contexts=[ctx];window.minFixture={grid,shadow};
 },{code});
 for(const width of [288,328,374,414,447,448,500]){
  await page.evaluate(width=>minFixture.grid.style.width=width+'px',width);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const b=await page.evaluate(()=>[...minFixture.shadow.querySelectorAll('.card')].map(c=>{const b=c.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width};}));
  assert.equal(b[0].width,width);
  if(width<448){assert.equal(b[1].width,width);assert.ok(b[2].y>b[1].y);}
  else{assert.equal(b[1].width,(width-8)/2);assert.equal(b[1].y,b[2].y);}
 }
 await page.evaluate(()=>contexts[0].teardown());
 assert.equal(await page.evaluate(()=>minFixture.shadow.querySelectorAll('[data-signature-section-min-width]').length),0);
});
