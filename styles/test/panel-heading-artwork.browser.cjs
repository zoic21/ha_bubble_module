const assert=require('node:assert/strict');
const {test}=require('node:test');
const {setup,draw}=require('./panel-variants.fixture.cjs');
const nativePath=process.env.BUBBLE_VARIANTS_NATIVE_SCRIPT_PATH;

async function artworkBox(cdp){
 const {result}=await cdp.send('Runtime.evaluate',{expression:"card.card.querySelector('.bubble-container')"});
 const {node}=await cdp.send('DOM.describeNode',{objectId:result.objectId});
 const after=node.pseudoElements.find(n=>n.pseudoType==='after');
 const {model}=await cdp.send('DOM.getBoxModel',{backendNodeId:after.backendNodeId});
 await cdp.send('Runtime.releaseObject',{objectId:result.objectId});
 const left=model.border[0],top=model.border[1],right=model.border[2],bottom=model.border[5];
 return{left,top,right,bottom,width:right-left,height:bottom-top,x:(left+right)/2,y:(top+bottom)/2};
}
const geometry=()=>{
 const root=card.card,host=root.querySelector('.bubble-container'),s=getComputedStyle(host,'::after');
 const box=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height}};
 return{frame:box(host),fields:[...root.querySelectorAll('.dp-panel-title,.bubble-state,.dp-panel-state,.settings,.robot-status')].map(box),image:s.backgroundImage,position:s.backgroundPosition,size:s.backgroundSize};
};

test('heading artwork enlarges around its real painted center without moving the card, text or native corner controls',{skip:!nativePath},async t=>{
 const page=await setup(t);await page.setViewportSize({width:1700,height:900});
 const cdp=await page.context().newCDPSession(page);
 for(const width of [288,382,520,600,760,761,1032])for(const mode of ['light','dark'])for(const plain of [false,true])for(const kind of ['none','double','mode','mower']){
  await draw(page,{width,mode,plain,kind,robotBadge:kind==='mower'});
  const current=await artworkBox(cdp),layout=await page.evaluate(geometry);
  await page.evaluate(()=>{window.artworkReset=document.createElement('style');artworkReset.textContent='ha-card[data-dp-panel-variant=heading] .bubble-container::after{transform:none!important}';card.card.append(artworkReset);});
  const previous=await artworkBox(cdp),before=await page.evaluate(geometry);
  const hint=JSON.stringify({width,mode,plain,kind,current,previous});
  assert.deepEqual(layout,before,'enlargement must be paint-only: '+hint);
  assert.ok(Math.abs(current.x-previous.x)<.05&&Math.abs(current.y-previous.y)<.05,'keep the same actual drawing center: '+hint);
  const expected=width<=520?88:96;
  assert.ok(Math.abs(current.width-expected)<.05&&Math.abs(current.height-expected)<.05,'use the requested visual size: '+hint);
  const frame=layout.frame;
  assert.ok(current.left>=frame.x&&current.right<=frame.x+frame.width&&current.top>=frame.y&&current.bottom<=frame.y+frame.height,'do not clip the enlarged square at the card edges: '+hint);
  await page.evaluate(()=>artworkReset.remove());
 }
 await cdp.detach();
});

test('explicit desktop artwork sizes remain literal and react to live theme changes',{skip:!nativePath},async t=>{
 const page=await setup(t);await draw(page,{width:1032,mode:'dark',kind:'double'});
 const cdp=await page.context().newCDPSession(page);
 for(const size of [64,96,128]){
  await page.evaluate(size=>document.documentElement.style.setProperty('--signature-panel-heading-illustration-size',size+'px'),size);
  const box=await artworkBox(cdp);
  assert.ok(Math.abs(box.width-size)<.05,'an explicit size must not be scaled a second time');
 }
 await page.evaluate(()=>document.documentElement.style.removeProperty('--signature-panel-heading-illustration-size'));
 assert.ok(Math.abs((await artworkBox(cdp)).width-96)<.05,'removing the theme override restores the new default');
 await cdp.detach();
});
