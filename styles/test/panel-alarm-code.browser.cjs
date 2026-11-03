const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {theme,nativeModes} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const code = loadModule('signature-panel').code;
const nativePath = process.env.BUBBLE_ALARM_NATIVE_SCRIPT_PATH;
const entity = 'alarm_control_panel.alarme';

async function setup(t) {
  const bytes = fs.readFileSync(nativePath);
  // Bubble 3.4.3, commit 2c3b43d1168ca05701be15fd96e416609601ecfa.
  assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'), '26f2c84116f20fa21f4cf3812a18f7aa1498246c');
  const page = await fixture(t,{prepare:null});
  await page.route('**/*',r=>r.fulfill({contentType:'application/json',body:'{}'}));
  await page.setContent('<style>body{margin:16px}#cards{width:500px}</style><home-assistant></home-assistant><div id="cards"></div>');
  await page.evaluate(()=>{
    customElements.define('ha-card',class extends HTMLElement {connectedCallback(){this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>';}});
    customElements.define('ha-icon',class extends HTMLElement {
      get icon(){return this.getAttribute('icon');}
      set icon(value){this.setAttribute('icon',value);}
      connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'});}
    });
    customElements.define('ha-ripple',class extends HTMLElement {});
    document.querySelector('home-assistant').attachShadow({mode:'open'});
  });
  await page.addScriptTag({path:nativePath});
  return page;
}

async function draw(page,{enabled=true,mode='light',plain=false,width=382,format='number',firstAction=null}={}) {
  await page.evaluate(({code,theme,nativeModes,enabled,mode,plain,width,format,firstAction,entity})=>{
    window.card?.remove();
    document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})})
      .filter(([k])=>k!=='modes').map(([k,v])=>'--'+k+':'+v).join(';');
    document.querySelector('#cards').style.width=width+'px';
    window.serviceCalls=[]; window.nativeActions=[]; window.rejectCommand=false; window.hangCommand=false;
    window.hass={states:{[entity]:{entity_id:entity,state:'disarmed',attributes:{friendly_name:'Ajax',code_format:format,supported_features:7}}},
      locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:mode==='dark'},
      config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris'},localize:()=>undefined,
      formatEntityState:s=>s.state,formatEntityAttributeValue:(s,k,v)=>v,hassUrl:p=>new URL(p,'https://ha.example.test').href,
      connection:{subscribeMessage:async()=>()=>{},subscribeEvents:async()=>()=>{}},
      callWS:async m=>m.type==='frontend/get_icons'?{resources:{alarm_control_panel:{}}}:{},
      callService:async(...args)=>{serviceCalls.push(args);if(rejectCommand)throw Error('backend confidential data');if(hangCommand)await new Promise(resolve=>window.finishCommand=resolve);}};
    document.querySelector('home-assistant').hass=hass;
    window.card=document.createElement('bubble-card');
    const methods=['alarm_disarm','alarm_arm_away','alarm_arm_night'];
    card.setConfig({type:'custom:bubble-card',card_type:'button',button_type:'state',entity,name:'Alarme',show_state:true,show_icon:false,card_layout:'large',rows:2,
      modules:[],styles:code,signature_panel:{alarm_code:enabled,hover:false,
        sub_button_styles:Object.fromEntries(methods.map((m,i)=>['alarm-command-'+i,{type:'command',active:false,disabled:false}]))},
      sub_button:{main:methods.map((m,i)=>({entity,css_class:'alarm-command-'+i,name:['Désarmer','Armer','Nuit'][i],icon:'mdi:shield',show_name:true,show_state:false,
        tap_action:i===0&&firstAction?firstAction:{action:'perform-action',perform_action:'alarm_control_panel.'+m,target:{entity_id:entity}},hold_action:{action:'more-info'}}))},
      button_action:{tap_action:{action:'more-info'}}});
    document.querySelector('#cards').append(card);card.hass=hass;
    card.addEventListener('hass-action',e=>nativeActions.push(e.detail));
  },{code,theme,nativeModes,enabled,mode,plain,width,format,firstAction,entity});
  await page.waitForFunction(()=>card?._signaturePanelRuntime&&!card.initialLoad);
}
const command = (page,i=0)=>page.locator('bubble-card').locator('.alarm-command-'+i);
const dialog = page=>page.locator('bubble-card').locator('dialog');
const input = page=>dialog(page).locator('input');
async function send(page,pin='0073') {
  await input(page).fill(pin);
  await dialog(page).locator('button[type="submit"]').click();
}
async function gesture(page,i,action='tap') {
  await page.evaluate(({i,action})=>{
    const b=card.config.sub_button.main[i];
    card.card.querySelector('.alarm-command-'+i).dispatchEvent(new CustomEvent('hass-action',{bubbles:true,composed:true,cancelable:true,detail:{action,config:b}}));
  },{i,action});
}

test('Ajax commands open the chosen PIN form directly and send only that command',{skip:!nativePath},async t=>{
  const page=await setup(t);
  for(const [i,method] of ['alarm_disarm','alarm_arm_away','alarm_arm_night'].entries()) {
    await draw(page);
    const original=await page.evaluate(()=>JSON.stringify(card.config));
    await command(page,i).click();
    await dialog(page).waitFor({state:'visible'});
    assert.equal(await input(page).getAttribute('type'),'password');
    assert.equal(await input(page).getAttribute('inputmode'),'numeric');
    assert.equal(await input(page).evaluate(e=>e===e.getRootNode().activeElement),true);
    assert.equal(await dialog(page).locator('button').count(),2);
    assert.deepEqual(await page.evaluate(()=>({calls:serviceCalls,actions:nativeActions})),{calls:[],actions:[]});
    await dialog(page).locator('button[type="submit"]').click();
    assert.deepEqual(await page.evaluate(()=>serviceCalls),[]);
    await input(page).fill('abc');await dialog(page).locator('button[type="submit"]').click();
    assert.deepEqual(await page.evaluate(()=>serviceCalls),[]);
    if(i===2){await input(page).fill('0073');await page.keyboard.press('Enter');}else await send(page);
    await dialog(page).waitFor({state:'detached'});
    assert.deepEqual(await page.evaluate(()=>serviceCalls),[['alarm_control_panel',method,{code:'0073'},{entity_id:entity}]]);
    assert.equal(await page.evaluate(()=>JSON.stringify(card.config)),original);
  }
});

test('Cancel and Escape clear the code without sending; details and opt-out stay native',{skip:!nativePath},async t=>{
  const page=await setup(t);await draw(page);
  for(const escape of [false,true]) {
    await command(page).click();await input(page).fill('0073');
    await input(page).evaluate(e=>window.oldInput=e);
    if(escape)await page.keyboard.press('Escape');else await dialog(page).getByText('Annuler',{exact:true}).click();
    await dialog(page).waitFor({state:'detached'});
    assert.deepEqual(await page.evaluate(()=>({calls:serviceCalls,value:oldInput.value})),{calls:[],value:''});
  }
  await gesture(page,0,'hold');
  assert.equal((await page.evaluate(()=>nativeActions))[0].action,'hold');
  assert.equal(await dialog(page).count(),0);
  await draw(page,{enabled:false});await command(page).click();
  await page.waitForFunction(()=>nativeActions.length===1);
  assert.equal((await page.evaluate(()=>nativeActions))[0].config.tap_action.perform_action,'alarm_control_panel.alarm_disarm');
  assert.equal(await dialog(page).count(),0);
});

test('In-flight submission cannot be duplicated and backend errors allow a fresh attempt',{skip:!nativePath},async t=>{
  const page=await setup(t);await draw(page);await command(page).click();
  await page.evaluate(()=>window.hangCommand=true);await send(page);
  await dialog(page).locator('form').evaluate(e=>e.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.equal((await page.evaluate(()=>serviceCalls)).length,1);
  assert.equal(await input(page).inputValue(),'');
  await page.evaluate(()=>finishCommand());await dialog(page).waitFor({state:'detached'});
  await page.evaluate(()=>{window.hangCommand=false;window.rejectCommand=true;});
  await command(page).click();await send(page,'0001');
  await dialog(page).locator('[role="alert"]').waitFor({state:'visible'});
  assert.equal(await input(page).inputValue(),'');
  assert.equal(await dialog(page).innerText().then(s=>s.includes('confidential')),false);
  await page.evaluate(()=>window.rejectCommand=false);await send(page,'0073');
  await dialog(page).waitFor({state:'detached'});
  assert.equal((await page.evaluate(()=>serviceCalls)).length,3);
});

test('Disabled, unavailable, removed and changed commands cannot submit a stale PIN',{skip:!nativePath},async t=>{
  const page=await setup(t);
  for(const change of ['disabled','unavailable','action','removed','option','teardown','disconnect']) {
    await draw(page);await command(page).click();await input(page).fill('0073');
    await page.evaluate(change=>{
      window.staleForm=card.card.querySelector('dialog form');window.staleInput=staleForm.querySelector('input');
      if(change==='disabled')card.config.signature_panel.sub_button_styles['alarm-command-0'].disabled=true;
      if(change==='unavailable')hass.states['alarm_control_panel.alarme'].state='unavailable';
      if(change==='action')card.config.sub_button.main[0].tap_action.perform_action='alarm_control_panel.alarm_arm_away';
      if(change==='removed')card.card.querySelector('.alarm-command-0').remove();
      if(change==='option')card.config.signature_panel.alarm_code=false;
      if(change==='disconnect')card.remove();
      else if(change==='teardown')card._signaturePanelRuntime.dispose();
      else if(change!=='removed')card.updateBubbleCard();
    },change);
    await page.evaluate(()=>staleForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    assert.deepEqual(await page.evaluate(()=>serviceCalls),[],change);
    assert.equal(await page.evaluate(()=>staleInput.value),'',change);
  }
  await draw(page);await page.evaluate(()=>{card.config.signature_panel.sub_button_styles['alarm-command-0'].disabled=true;card.updateBubbleCard();});
  await gesture(page,0);assert.equal(await dialog(page).count(),0);
});

test('Only explicit single-entity alarm commands are intercepted; legacy syntax and text codes work',{skip:!nativePath},async t=>{
  const page=await setup(t);await draw(page,{format:'text',firstAction:{action:'call-service',service:'alarm_control_panel.alarm_disarm',service_data:{entity_id:entity,code:'discard-this',extra:'kept'}}});
  await command(page).click();assert.equal(await input(page).getAttribute('inputmode'),'text');await send(page,'aB-007');
  await dialog(page).waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(()=>serviceCalls),[['alarm_control_panel','alarm_disarm',{extra:'kept',code:'aB-007'},{entity_id:entity}]]);
  for(const target of [{entity_id:[entity,'alarm_control_panel.other']},{area_id:'salon'},{entity_id:'alarm_control_panel.other'}]) {
    await draw(page);await page.evaluate(target=>{card.config.sub_button.main[0].tap_action.target=target;card.updateBubbleCard();},target);
    await gesture(page,0);assert.equal(await dialog(page).count(),0);assert.deepEqual(await page.evaluate(()=>nativeActions),[]);
  }
  await draw(page,{firstAction:{action:'navigate',navigation_path:'#other'}});
  await command(page).click();await page.waitForFunction(()=>nativeActions.length===1);
  assert.equal((await page.evaluate(()=>nativeActions))[0].config.tap_action.navigation_path,'#other');
});

test('PIN form fits narrow screens, follows live themes and keeps touch targets',{skip:!nativePath},async t=>{
  const page=await setup(t);
  for(const width of [320,820])for(const mode of ['light','dark'])for(const plain of [false,true]) {
    await page.setViewportSize({width,height:600});await draw(page,{width:width-32,mode,plain});await command(page,1).click();
    const m=await dialog(page).evaluate(e=>{
      const r=e.getBoundingClientRect(),s=getComputedStyle(e),i=e.querySelector('input');
      return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:e.scrollWidth-e.clientWidth,background:s.backgroundColor,
        inputSize:parseFloat(getComputedStyle(i).fontSize),buttons:[...e.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)};
    });
    assert.ok(m.left>=15&&m.right<=width-15&&m.top>=15&&m.bottom<=585,JSON.stringify(m));
    assert.ok(m.overflow<=1);assert.ok(m.inputSize>=16);assert.ok(m.buttons.every(h=>h>=44));
    if(process.env.PANEL_ALARM_CAPTURE_DIR&&!plain) {
      fs.mkdirSync(process.env.PANEL_ALARM_CAPTURE_DIR,{recursive:true});
      await page.screenshot({path:process.env.PANEL_ALARM_CAPTURE_DIR+'/alarm-pin-'+width+'-'+mode+'.png'});
    }
    await page.evaluate(()=>document.documentElement.style.setProperty('--signature-card-background','#123456'));
    assert.equal(await dialog(page).evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 52, 86)');
    await dialog(page).getByText('Annuler',{exact:true}).click();
  }
});
