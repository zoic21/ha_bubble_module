const assert=require('node:assert/strict');
const {test}=require('node:test');
const {fixture}=require('./browser.cjs');
const {theme,nativeModes}=require('./fixtures.cjs');
const {loadModule}=require('../../shared/test/module.cjs');
const code=loadModule('signature-energy-balance').code;
const nativePath=process.env.BUBBLE_NATIVE_SCRIPT_PATH;
const options={imports:['sensor.hc','sensor.hp'],solar:['sensor.roof','sensor.balcony'],
 discharges:['sensor.pro_out','sensor.ac_out'],exports:['sensor.export'],charges:['sensor.pro_in','sensor.ac_in'],time_zone:'Europe/Paris'};

async function setup(t){
 const page=await fixture(t,{prepare:null,hasTouch:true});
 await page.route('**/*',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.setContent('<style>body{margin:30px}#cards{margin-top:80px}</style><home-assistant></home-assistant><div id="cards"></div>');
 await page.evaluate(()=>{
  customElements.define('ha-card',class extends HTMLElement{connectedCallback(){this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>'}});
  customElements.define('ha-icon',class extends HTMLElement{
   get icon(){return this.getAttribute('icon')}
   set icon(v){this.setAttribute('icon',v)}
   connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}</style>'}
  });
  customElements.define('ha-ripple',class extends HTMLElement{});
  document.querySelector('home-assistant').attachShadow({mode:'open'});
 });
 await page.addScriptTag({path:nativePath});
 return page;
}
async function draw(page,{width=328,mode='light',plain=false,amounts=[4,3.94,1,.67,.2,.19,.1,.25,.2],missing=false}={}){
 await page.evaluate(({width,mode,plain,amounts,missing,code,options,theme,nativeModes})=>{
  window.card?.remove();window.calls=[];window.actions=[];
  document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})})
   .filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
  document.getElementById('cards').style.width=width+'px';
  const ids=Object.values(options).filter(Array.isArray).flat();
  window.hass={states:Object.fromEntries(ids.map(id=>[id,{entity_id:id,state:'999999',attributes:{unit_of_measurement:'kWh'}}])),
   config:{time_zone:'Europe/Paris',unit_system:{temperature:'°C'}},locale:{language:'fr',number_format:'space_comma'},language:'fr',themes:{darkMode:mode==='dark'},
   localize:()=>undefined,hassUrl:path=>new URL(path,'https://ha.example.test').href,
   formatEntityState:s=>s.state,formatEntityAttributeValue:(s,k,v)=>v,
   connection:{subscribeMessage:async()=>()=>{},subscribeEvents:async()=>()=>{}},
   callWS:async req=>{if(req.type==='frontend/get_icons')return {resources:{sensor:{},media_player:{}}};if(req.type!=='recorder/statistics_during_period')return {};calls.push(req);return Object.fromEntries(
    req.statistic_ids.filter(id=>!missing||id!=='sensor.export').map(id=>[id,[{start:req.start_time,change:amounts[ids.indexOf(id)]}]]));}};
  document.querySelector('home-assistant').hass=hass;
  window.card=document.createElement('bubble-card');
  card.setConfig({type:'custom:bubble-card',card_type:'button',button_type:'name',entity:'sensor.hc',name:'Répartition maison',
   show_icon:false,show_state:false,scrolling_effect:false,card_layout:'large',rows:1,modules:[],styles:code,signature_energy_balance:options,
   button_action:{tap_action:{action:'none'},hold_action:{action:'none'},double_tap_action:{action:'none'}}});
  card.addEventListener('hass-action',e=>actions.push(e.detail));card.addEventListener('hass-more-info',e=>actions.push(e.detail));
  document.getElementById('cards').append(card);card.hass=hass;
 },{width,mode,plain,amounts,missing,code,options,theme,nativeModes});
 await page.waitForFunction(()=>card?._signatureEnergyBalance?.data&&!card._signatureEnergyBalance.data.pending&&!card.initialLoad,{},{timeout:5000});
}

test('native Bubble balance preserves the compact geometry, labels and live theme',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const width of [288,328,382,600])for(const mode of ['light','dark'])for(const plain of [true,false]){
  await draw(page,{width,mode,plain});
  const m=await page.evaluate(()=>{
   const r=card._signatureEnergyBalance,rect=r.host.getBoundingClientRect(),bar=r.bar.getBoundingClientRect();
   return{height:rect.height,barHeight:bar.height,overflow:r.host.scrollWidth-r.host.clientWidth,
    radius:getComputedStyle(r.host).borderRadius,shares:r.data.balance.values.map(v=>100*v/r.data.balance.total),
    widths:r.buttons.map(b=>b.getBoundingClientRect().width),requests:calls.length,
    labels:r.buttons.map(b=>b.getAttribute('aria-label')),background:getComputedStyle(r.host).backgroundColor};
  });
  const hint=JSON.stringify({width,mode,plain,m});assert.equal(m.height,50,hint);assert.equal(m.barHeight,28,hint);
  assert.equal(m.radius,'22px',hint);assert.ok(m.overflow<=1,hint);assert.equal(m.requests,1,hint);
  const total=m.widths.reduce((a,b)=>a+b,0);for(let i=0;i<3;i++)assert.ok(Math.abs(100*m.widths[i]/total-m.shares[i])<.1,hint);
  assert.ok(m.labels[0].includes('84,0 %'),hint);
 }
});

test('mouse, touch and keyboard show tooltips without More info or a native action',{skip:!nativePath},async t=>{
 const page=await setup(t);await draw(page);
 const segments=page.locator('bubble-card').locator('.seb-segment'),tip=page.locator('bubble-card').locator('.seb-tooltip');
 for(let i=0;i<3;i++){
  await segments.nth(i).hover();await tip.waitFor({state:'visible'});assert.ok((await tip.textContent()).includes(['Réseau','Solaire','Batterie'][i]));
  await segments.nth(i).click();await segments.nth(i).tap();await tip.waitFor({state:'visible'});
  await segments.nth(i).focus();await tip.waitFor({state:'visible'});
 }
 await page.keyboard.press('Escape');await tip.waitFor({state:'hidden'});
 assert.deepEqual(await page.evaluate(()=>actions),[]);
 await segments.first().tap();await page.mouse.click(5,5);await tip.waitFor({state:'hidden'});
});

test('missing data, zero load and module removal never expose a stale share',{skip:!nativePath},async t=>{
 const page=await setup(t);
 for(const args of [{missing:true},{amounts:Array(9).fill(0)}]){
  await draw(page,args);assert.equal(await page.locator('bubble-card').locator('.seb-empty').textContent(),'—');
  assert.equal(await page.locator('bubble-card').locator('.seb-bar').isVisible(),false);
 }
 await draw(page);
 await page.evaluate(()=>{delete card.config.signature_energy_balance;card.updateBubbleCard()});
 await page.waitForFunction(()=>!card._signatureEnergyBalance);
 assert.equal(await page.locator('bubble-card').locator('.seb-bar').count(),0);
});
