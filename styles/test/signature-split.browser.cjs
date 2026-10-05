const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
test('standalone modules resolve live theme variables without a module execution',async t=>{
 const page=await fixture(t);
 await render(page,{});
 const read=()=>page.evaluate(()=>Object.fromEntries(['compact','square','room','header','title','media'].map(id=>{
  const root=document.querySelector('[data-id="'+id+'"]').shadowRoot;
  const name=root.querySelector('.bubble-name'),box=root.querySelector('.bubble-container');
  const control=root.querySelector('.bubble-media-button');
  return [id,{fontSize:getComputedStyle(name).fontSize,color:getComputedStyle(name).color,radius:getComputedStyle(box).borderRadius,height:box.getBoundingClientRect().height,secondary:getComputedStyle(root.querySelector('.bubble-state')).color,controlRadius:control?getComputedStyle(control).borderRadius:null}];
 })));
 const original=await read();
 await page.evaluate(()=>{
  document.body.style.setProperty('--signature-name-font-size','18px');
  document.body.style.setProperty('--signature-card-border-radius','17px');
  document.body.style.setProperty('--signature-control-border-radius','9px');
  document.body.style.setProperty('--signature-header-small-font-size','29px');
  document.body.style.setProperty('--signature-title-font-size','19px');
  document.body.style.setProperty('--secondary-text-color','#ff0000');
 });
 const changed=await read();
 for(const id of ['compact','square','room']){assert.equal(changed[id].fontSize,'18px');assert.equal(changed[id].radius,'17px');}
 assert.equal(original.header.fontSize,'32px');assert.equal(changed.header.fontSize,'29px');
 assert.equal(changed.title.fontSize,'19px');assert.equal(changed.title.color,'rgb(255, 0, 0)');
 assert.equal(changed.media.fontSize,'18px');assert.equal(changed.media.radius,'17px');
 assert.equal(changed.media.controlRadius,'9px');assert.equal(changed.media.secondary,'rgb(255, 0, 0)');
 assert.equal(changed.media.height,original.media.height);assert.notEqual(changed.media.height,56);
});

// Native-shaped flat/grouped header with the two rows used by the home dashboard.
async function headerButtons(page, scenario, grouped = false) {
 await render(page, scenario);
 await page.evaluate(grouped => {
  document.body.style.margin = '0';
  const root = document.querySelector('[data-id="header"]').shadowRoot;
  root.querySelector('style').textContent += `
   .bubble-background { position:absolute; }
   .bubble-content-container { display:contents; }
   .bubble-name-container { display:flex; flex-direction:column; flex-grow:1; }
   .bubble-sub-button-container { align-items:center; }
   .bubble-sub-button-group { display:flex; gap:8px; align-items:center; }
   .bubble-sub-button { box-sizing:border-box; flex:0 0 auto; width:max-content; white-space:nowrap; font-size:12px; }
  `;
  root.querySelector('.bubble-icon-container').classList.add('hidden');
  root.querySelector('.bubble-buttons-container').remove();
  const container = root.querySelector('.bubble-sub-button-container');
  const widths = [66,68,110,126,134,48];
  const labels = ['Loïc\nPrésent','Marie\nPrésente','Présent','Volets · 6','Chauffage','⚙'];
  const buttons = widths.map((width,i) => {
   const button = document.createElement('div');
   button.className = 'bubble-sub-button bubble-sub-button-'+(i+1);
   button.style.width = width+'px';
   if (i<2) button.style.whiteSpace = 'pre-line';
   button.textContent = labels[i];
   button.dataset.index = i;
   return button;
  });
  if (grouped) {
   for (const start of [0,3]) {
    const group = document.createElement('div');
    group.className = 'bubble-sub-button-group display-inline';
    group.append(...buttons.slice(start,start+3));container.append(group);
   }
  } else container.append(...buttons);
  const hidden = document.createElement('div');
  hidden.className = 'bubble-sub-button hidden';
  hidden.textContent = 'Masqué';container.append(hidden);
 }, grouped);
}

async function headerGeometry(page) {
 return page.evaluate(() => {
  const root = document.querySelector('[data-id="header"]').shadowRoot;
  const container = root.querySelector('.bubble-sub-button-container');
  const rect = container.getBoundingClientRect();
  const read = element => {
   const box = element.getBoundingClientRect();
   return {left:box.left-rect.left,right:box.right-rect.left,top:box.top-rect.top,width:box.width,height:box.height};
  };
  return {
   cardWidth:root.querySelector('ha-card').getBoundingClientRect().width,
   container:read(container),title:read(root.querySelector('.bubble-name')),
   justification:getComputedStyle(container).justifyContent,
   buttons:[...container.querySelectorAll('.bubble-sub-button:not(.hidden)')].filter(element=>element.getClientRects().length).map(read),
   hidden:container.querySelector('.hidden').getBoundingClientRect().width,
   sectionJustification:getComputedStyle(document.querySelector('[data-id="title"]').shadowRoot.querySelector('.bubble-sub-button-container')).justifyContent
  };
 });
}

test('mobile header justifies each wrapped row without stretching buttons or showing hidden controls', async t => {
 const page = await fixture(t, {hasTouch:true});
 for (const mode of ['light','dark']) for (const plain of [false,true]) {
  for (const width of [288,328,358,382,600]) for (const grouped of [false,true]) {
   await page.setViewportSize({width,height:1400});
   await headerButtons(page,{mode,plain,width},grouped);
   const geometry = await headerGeometry(page);
   assert.equal(geometry.justification,'space-between');
   assert.equal(geometry.hidden,0);
   assert.deepEqual(geometry.buttons.map(button=>button.width),[66,68,110,126,134,48]);
   const rows = Map.groupBy(geometry.buttons,button=>button.top);
   for (const row of rows.values()) {
    assert.ok(Math.abs(row[0].left-geometry.container.left)<1,'first button must align to the left edge');
    if (row.length>1) {
     assert.ok(Math.abs(row.at(-1).right-geometry.container.right)<1,'last button must align to the right edge');
     const gaps = row.slice(1).map((button,i)=>button.left-row[i].right);
     assert.ok(gaps.every(gap=>gap>=8-0.1 && Math.abs(gap-gaps[0])<1),'spaces must be equal and retain the minimum gap');
    }
   }
   assert.ok(geometry.title.top<geometry.buttons[0].top,'buttons must stay below the title');
  }
 }
});

test('mobile header moves the entire button group below the title before losing its 24px clearance', async t => {
 const page = await fixture(t, {hasTouch:true});
 for (const mode of ['light','dark']) for (const plain of [false,true]) for (const grouped of [false,true]) {
  await page.setViewportSize({width:600,height:1400});
  await headerButtons(page,{mode,plain,width:382,nameText:'Étage'},grouped);
  await page.evaluate(() => {
   const root = document.querySelector('[data-id="header"]').shadowRoot;
   const buttons = [...root.querySelectorAll('.bubble-sub-button:not(.hidden)')];
   buttons.slice(2).forEach(button=>button.remove());
   buttons[0].style.width = '72px';buttons[0].textContent = 'Éteint';
   buttons[1].style.width = '158px';buttons[1].textContent = "À la station d'accueil";
   buttons.forEach(button=>button.style.whiteSpace='nowrap');
  });
  const sameRow = geometry => geometry.buttons.every(button=>button.top<geometry.title.top+geometry.title.height && geometry.title.top<button.top+button.height);
  const below = geometry => {
   assert.ok(geometry.buttons.every(button=>button.top>=geometry.title.top+geometry.title.height+12-0.1),'all buttons must move below the title together');
   assert.ok(Math.abs(geometry.container.width-geometry.cardWidth)<1,'wrapped group must fill the card width');
   for (const row of Map.groupBy(geometry.buttons,button=>button.top).values()) {
    assert.ok(Math.abs(row[0].left)<1,'wrapped row must start at the left edge');
    if (row.length>1) assert.ok(Math.abs(row.at(-1).right-geometry.container.width)<1,'wrapped row must retain justification');
   }
  };
  const original = await headerGeometry(page);
  assert.ok(sameRow(original),'short title and two status pills must fit on one row');
  assert.ok(original.container.left-original.title.right>=24-0.1,'title needs at least 24px clearance');
  assert.ok(Math.abs(original.buttons.at(-1).right-original.container.right)<1,'group must align to the right edge');

  // Cross the exact fit boundary on the same DOM: no module execution or JS measurement in the module.
  const required = original.title.width+24+72+8+158;
  const setWidth = width => page.locator('[data-id="header"]').evaluate((shell,width)=>shell.style.width=width+'px',width);
  await setWidth(required-0.5);
  below(await headerGeometry(page));
  await setWidth(required+0.5);
  const borderline = await headerGeometry(page);
  assert.ok(sameRow(borderline));
  assert.ok(borderline.container.left-borderline.title.right>=24-0.1);

  await setWidth(382);
  await page.locator('[data-id="header"] .bubble-name').evaluate(element=>element.textContent='Étage et chambres');
  below(await headerGeometry(page));
  await page.locator('[data-id="header"] .bubble-name').evaluate(element=>element.textContent='Étage');
  assert.ok(sameRow(await headerGeometry(page)));
  await page.locator('[data-id="header"] .bubble-sub-button-2').evaluate(element=>{
   element.style.width='';element.textContent="Retour à la station d'accueil pour recharger";
  });
  below(await headerGeometry(page));
  await page.locator('[data-id="header"] .bubble-sub-button-2').evaluate(element=>{
   element.style.width='158px';element.textContent="À la station d'accueil";
  });
  assert.ok(sameRow(await headerGeometry(page)));
  await page.locator('[data-id="header"] .bubble-sub-button-container').evaluate(container=>{
   const group=document.createElement('div');group.className='bubble-sub-button-group hidden';
   group.innerHTML='<div class="bubble-sub-button" style="width:600px">Groupe masqué</div>';
   container.append(group);
  });
  assert.ok(sameRow(await headerGeometry(page)),'a hidden group must not reserve width or reappear');
  await page.locator('[data-id="header"] .bubble-sub-button-group.hidden').evaluate(group=>{group.classList.remove('hidden');group.hidden=true;});
  assert.ok(sameRow(await headerGeometry(page)),'the native hidden attribute must also remove a group from layout');
 }
});

test('header justification follows the mobile viewport without changing narrow desktop cards or section titles', async t => {
 const page = await fixture(t);
 await page.setViewportSize({width:601,height:1400});
 await headerButtons(page,{width:328});
 const desktop = await headerGeometry(page);
 assert.equal(desktop.justification,'flex-start');
 await page.setViewportSize({width:600,height:1400});
 const mobile = await headerGeometry(page);
 assert.equal(mobile.justification,'space-between');
 assert.equal(mobile.sectionJustification,desktop.sectionJustification);
 await page.setViewportSize({width:1400,height:1400});
 assert.deepEqual(await headerGeometry(page),desktop);
 await headerButtons(page,{width:1000});
 const wide = await headerGeometry(page);
 assert.equal(wide.justification,'flex-end');
 assert.ok(wide.container.left>=wide.title.right,'wide desktop must keep the buttons to the right of the title');
 assert.ok(wide.title.top<wide.buttons[0].top+wide.buttons[0].height && wide.buttons[0].top<wide.title.top+wide.title.height,'wide desktop title and buttons must share the same row');
});
