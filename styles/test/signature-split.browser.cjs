const assert=require('node:assert/strict');
const {test,before,after}=require('node:test');
const {chromium}=require('playwright');
const {setup,render}=require('./fixtures.cjs');
let browser;
before(async()=>{browser=await chromium.launch({headless:true,...(process.env.BUBBLE_STYLE_BROWSER_PATH?{executablePath:process.env.BUBBLE_STYLE_BROWSER_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});});
after(async()=>{await browser?.close();});
test('standalone presentations match legacy computed styles across sizes and light/dark themes',async t=>{
 const page=await browser.newPage({viewport:{width:1400,height:1400}});t.after(()=>page.close());await setup(page);
 const ids=['compact','compact-standard','square','square-auto','room','room-no-controls','header','title','cover','climate','number'];
 for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [190,328,520]){
  const legacy=await render(page,{mode,plain,width,split:false});
  const fresh=await render(page,{mode,plain,width,split:true});
  assert.deepEqual(legacy.errors,[]);assert.deepEqual(fresh.errors,[]);
  for(const id of ids)assert.deepEqual(fresh.cards.find(c=>c.id===id),legacy.cards.find(c=>c.id===id),JSON.stringify({mode,plain,width,id}));
 }
});
test('standalone modules resolve live theme variables without a module execution',async t=>{
 const page=await browser.newPage({viewport:{width:1400,height:1400}});t.after(()=>page.close());await setup(page);
 const result=await render(page,{split:true});assert.deepEqual(result.errors,[]);
 const read=()=>page.evaluate(()=>Object.fromEntries(['compact','square','room','header','title'].map(id=>{
  const root=document.querySelector('[data-id="'+id+'"]').shadowRoot;
  const name=root.querySelector('.bubble-name'),box=root.querySelector('.bubble-container');
  return [id,{fontSize:getComputedStyle(name).fontSize,color:getComputedStyle(name).color,radius:getComputedStyle(box).borderRadius,secondary:getComputedStyle(root.querySelector('.bubble-state')).color}];
 })));
 const original=await read();
 await page.evaluate(()=>{
  document.body.style.setProperty('--signature-name-font-size','18px');
  document.body.style.setProperty('--signature-card-border-radius','17px');
  document.body.style.setProperty('--signature-header-small-font-size','29px');
  document.body.style.setProperty('--signature-title-font-size','19px');
  document.body.style.setProperty('--secondary-text-color','#ff0000');
 });
 const changed=await read();
 for(const id of ['compact','square','room']){assert.equal(changed[id].fontSize,'18px');assert.equal(changed[id].radius,'17px');}
 assert.equal(original.header.fontSize,'32px');assert.equal(changed.header.fontSize,'29px');
 assert.equal(changed.title.fontSize,'19px');assert.equal(changed.title.color,'rgb(255, 0, 0)');
});
