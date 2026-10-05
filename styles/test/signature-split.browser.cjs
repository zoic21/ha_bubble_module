const assert=require('node:assert/strict');
const {test,before,after}=require('node:test');
const {chromium}=require('playwright');
const {setup,render}=require('./fixtures.cjs');
let browser;
before(async()=>{browser=await chromium.launch({headless:true,...(process.env.BUBBLE_STYLE_BROWSER_PATH?{executablePath:process.env.BUBBLE_STYLE_BROWSER_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});});
after(async()=>{await browser?.close();});
test('standalone modules resolve live theme variables without a module execution',async t=>{
 const page=await browser.newPage({viewport:{width:1400,height:1400}});t.after(()=>page.close());await setup(page);
 const result=await render(page,{});assert.deepEqual(result.errors,[]);
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
