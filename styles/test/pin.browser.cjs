const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const {theme,nativeModes} = require('./fixtures.cjs');
const pin = loadModule('signature-pin'), panel = loadModule('signature-panel');
const nativePath = process.env.BUBBLE_PIN_NATIVE_SCRIPT_PATH;
const native = {skip: !nativePath};
const digest = code => crypto.createHash('sha256').update(code).digest('hex');
async function setup(t, {user='tablet', options={}, config={}, width=382, mode='light', plain=false, touch=false}={}) {
  const bytes=fs.readFileSync(nativePath);
  assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'26f2c84116f20fa21f4cf3812a18f7aa1498246c');
  const page=await fixture(t,{prepare:null, viewport:{width:Math.max(400,width+32),height:900},hasTouch:touch,isMobile:touch});
  page.setDefaultTimeout(7000);
  page.on('console', message=>{if(message.type()==='error')process.stderr.write(message.text()+'\n');});
  await page.route('**/*',route=>route.fulfill({contentType:'application/json',body:route.request().url().includes('bubble-modules.yaml')?JSON.stringify({signature_pin:pin,signature_panel:panel}):'{}'}));
  await page.goto('https://ha.example.test/');
  await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:16px}#cards{width:'+width+'px}</style><home-assistant></home-assistant><div id="cards"></div>');
  await page.evaluate(()=>{
    customElements.define('ha-card',class extends HTMLElement {connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:relative}</style><slot></slot>';}});
    customElements.define('ha-icon',class extends HTMLElement {
      get icon(){return this.getAttribute('icon');}set icon(value){this.setAttribute('icon',value);}
      connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'});}
    });
    customElements.define('ha-ripple',class extends HTMLElement {});
    customElements.define('ha-select',class extends HTMLElement {get updateComplete(){return Promise.resolve();}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'}).innerHTML='<slot></slot>';}});
    document.querySelector('home-assistant').attachShadow({mode:'open'});
  });
  await page.addScriptTag({path:nativePath});
  await page.evaluate(({user,options,config,theme,nativeModes,mode,plain,codeHash})=>{
    document.documentElement.style.cssText=Object.entries({...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]})})
      .filter(([key])=>key!=='modes').map(([key,value])=>'--'+key+':'+value).join(';');
    window.calls=[];window.actions=[];window.details=[];
    const state=(id,state,attributes={})=>({entity_id:id,state,attributes});
    window.hass={user:{id:user,name:user,is_admin:user==='admin'},
      states:{'input_select.mode':state('input_select.mode','Présent',{options:['Présent','Absent','Nuit'],friendly_name:'Mode'}),
        'alarm_control_panel.alarme':state('alarm_control_panel.alarme','disarmed',{friendly_name:'Ajax',supported_features:7}),
        'cover.test':state('cover.test','open',{supported_features:15,current_position:50}),
        'input_number.test':state('input_number.test','50',{min:0,max:100,step:1}),
        'climate.test':state('climate.test','heat',{temperature:20,current_temperature:21,min_temp:7,max_temp:30,target_temp_step:0.5,supported_features:1,hvac_modes:['heat','off']}),
        'media_player.test':state('media_player.test','playing',{supported_features:65535,volume_level:0.5}),
        'light.test':state('light.test','on',{brightness:128,supported_color_modes:['brightness']})},
      locale:{language:'fr',number_format:'language'},language:'fr',themes:{darkMode:mode==='dark'},
      config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris',version:'2026.10.4'},localize:()=>undefined,
      formatEntityState:s=>s.state,formatEntityAttributeValue:(s,key,value)=>value,hassUrl:p=>new URL(p,'https://ha.example.test').href,
      connection:{haVersion:'2026.10.4',subscribeMessage:async()=>()=>{},subscribeEvents:async()=>()=>{}},
      callWS:async message=>message.type==='frontend/get_icons'?{resources:{input_select:{},alarm_control_panel:{},cover:{},light:{},media_player:{},input_number:{},climate:{}}}:{},
      callService:async(...args)=>{calls.push(args);if(window.rejectCommand)throw Error('private backend response');}};
    document.querySelector('home-assistant').hass=hass;
    document.addEventListener('hass-more-info',event=>details.push(event.detail));
    document.addEventListener('hass-action',event=>{actions.push(event.detail);const data=event.detail;
      const action=data.config[data.action+'_action'];if(['perform-action','call-service'].includes(action.action)){
        const [domain,method]=(action.perform_action||action.service).split('.');
        hass.callService(domain,method,action.data||action.service_data||{},action.target);
      }
    });
    window.card=document.createElement('bubble-card');
    card.setConfig({type:'custom:bubble-card',card_type:'button',button_type:'state',entity:'input_select.mode',name:'Mode maison',show_state:true,
      modules:['signature_pin'],signature_pin:{code_hash:codeHash,users:['tablet'],...options},
      button_action:{tap_action:{action:'more-info'},hold_action:{action:'navigate',navigation_path:'#modes'}},
      sub_button:{main:[{entity:'input_select.mode',name:'Absent',show_name:true,sub_button_type:'default',
        tap_action:{action:'perform-action',perform_action:'input_select.select_option',target:{entity_id:'input_select.mode'},data:{option:'Absent'}},
        hold_action:{action:'more-info'},double_tap_action:{action:'navigate',navigation_path:'#test'}}]},...config});
    document.querySelector('#cards').append(card);card.hass=hass;
    window.contexts=[{teardown:()=>card.remove()}];
  },{user,options,config,theme,nativeModes,mode,plain,codeHash:digest('0073')});
  await page.waitForFunction(()=>card && !card.initialLoad && (!card.config.modules.includes('signature_pin') || card.config.signature_pin?.enabled===false || card._signaturePinRuntime));
  return page;
}
const dialog=page=>page.locator('bubble-card').locator('dialog');
const command=page=>page.locator('bubble-card').locator('.bubble-sub-button-1');
async function send(page,code='0073') {
  await dialog(page).waitFor({state:'visible'});
  for(const digit of code)await dialog(page).locator('[data-digit="'+digit+'"]').click();
  await dialog(page).locator('button[type="submit"]').click();
}
async function gesture(page,action='tap',part='sub') {
  await page.evaluate(({action,part})=>{
    const node=part==='sub'?card.card.querySelector('.bubble-sub-button-1'):card.card.querySelector('.bubble-button-card-container');
    const config=part==='sub'?card.config.sub_button.main[0]:card.config.button_action;
    node.dispatchEvent(new CustomEvent('hass-action',{bubbles:true,composed:true,cancelable:true,detail:{action,config}}));
  },{action,part});
}
test('PIN protects every gesture and action, preserves data and never forwards the local PIN',native,async t=>{
  const page=await setup(t);
  for(const [action,part]of [['tap','sub'],['hold','sub'],['double_tap','sub'],['tap','main'],['hold','main']]){
    const previous=await page.evaluate(()=>actions.length);
    await gesture(page,action,part);await dialog(page).waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>actions.length),previous);
    await send(page,'9999');assert.equal(await page.evaluate(()=>actions.length),previous);
    assert.match(await dialog(page).locator('[role="alert"]').innerText(),/incorrect/);
    await send(page);await dialog(page).waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>actions.length),previous+1);
  }
  assert.deepEqual(await page.evaluate(()=>calls),[['input_select','select_option',{option:'Absent'},{entity_id:'input_select.mode'}]]);
  await page.evaluate(()=>card.card.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:'input_select.mode'},bubbles:true,composed:true})));
  await dialog(page).waitFor({state:'visible'});assert.deepEqual(await page.evaluate(()=>details),[]);
  await send(page);await dialog(page).waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(()=>details),[{entityId:'input_select.mode'}]);
});
test('hashed PINs accept uppercase hex and legacy PINs remain usable, while invalid hashes fail closed',native,async t=>{
  for(const options of [{code_hash:digest('0073').toUpperCase()},{code_hash:undefined,code:'0073'}]){
    const page=await setup(t,{options});
    await gesture(page);await send(page,'73');
    assert.deepEqual(await page.evaluate(()=>calls),[]);
    await send(page);await dialog(page).waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>calls.length),1);
  }
  for(const code_hash of ['', 'invalid', 1234]){
    const page=await setup(t,{options:{code_hash,code:'0073'}});
    await gesture(page);await send(page);
    assert.deepEqual(await page.evaluate(()=>calls),[]);
    assert.match(await dialog(page).locator('[role="alert"]').innerText(),/Configurez/);
  }
});
test('PIN editor uses Bubble native object events without persisting drafts or exposing the stored code',native,async t=>{
  const page=await setup(t);
  const result=await page.evaluate(async ({schema,storedHash})=>{
    if(!customElements.get('ha-selector-bc_object'))throw Error('Native Bubble object selector missing');
    const form=document.createElement('ha-form-signature_pin_hash_options');
    Object.assign(form,{hass,data:{code_hash:storedHash,users:['tablet'],future:false},schema});
    const values=[];
    form.addEventListener('value-changed',event=>{values.push(event.detail.value);form.data=event.detail.value;});
    document.body.append(form);await Promise.resolve();
    const before={field:form._form.data.new_code,hasCode:Object.hasOwn(form._form.data,'code'),hasHash:Object.hasOwn(form._form.data,'code_hash')};
    for(const new_code of ['1','12','123','1234']){
      form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,new_code}}}));
      await Promise.resolve();
    }
    const draftChanges=values.length;
    form._saveCode.click();await Promise.resolve();
    const saved={...form.data};const cleared=form._form.data.new_code;
    form.data={code:'0073',users:['tablet']};await Promise.resolve();
    const legacyButton={text:form._saveCode.textContent,disabled:form._saveCode.disabled};
    form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,users:[]}}}));
    await Promise.resolve();
    const migrated={...form.data};form.remove();
    return {before,draftChanges,saved,cleared,legacyButton,migrated};
  },{schema:pin.editor.find(field=>field.type==='signature_pin_hash_options'),storedHash:digest('0073')});
  assert.deepEqual(result.before,{field:'',hasCode:false,hasHash:false});
  assert.equal(result.draftChanges,0);
  assert.deepEqual(result.saved,{code_hash:digest('1234'),users:['tablet'],future:false});
  assert.equal(result.cleared,'');
  assert.deepEqual(result.legacyButton,{text:'Remplacer le code',disabled:true});
  assert.deepEqual(result.migrated,{code_hash:digest('0073'),users:[]});
});
test('real More info clicks on the icon, card, value and sub-button require PIN before HA opens details',native,async t=>{
  const actionConfig={button_action:{tap_action:{action:'more-info'}},
    sub_button:{main:[{entity:'input_select.mode',name:'Détails',sub_button_type:'default',show_name:true,
      tap_action:{action:'more-info'},hold_action:{action:'more-info'},double_tap_action:{action:'more-info'}}]}};
  for(const scenario of [
    {config:actionConfig,selectors:['.bubble-main-icon-container','.bubble-background','.bubble-sub-button-1']},
    {config:{...actionConfig,rows:2,modules:['signature_panel','signature_pin'],signature_panel:{}},selectors:['.bubble-state']}
  ]){
    const page=await setup(t,{config:scenario.config});
    await page.evaluate(()=>{
      // HA handles hass-action outside the card and opens its own More info dialog.
      document.addEventListener('hass-action',event=>{
        const action=event.detail.config[event.detail.action+'_action'];
        if(action?.action==='more-info')document.querySelector('home-assistant').dispatchEvent(new CustomEvent('hass-more-info',{
          detail:{entityId:action.entity||event.detail.config.entity},bubbles:true,composed:true}));
      });
    });
    for(const selector of scenario.selectors){
      const control=page.locator('bubble-card').locator(selector).first();
      const before=await page.evaluate(()=>details.length);
      await control.click();await dialog(page).waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>details.length),before);
      await send(page,'0000');assert.equal(await page.evaluate(()=>details.length),before);
      await dialog(page).locator('[data-close]').click();await dialog(page).waitFor({state:'detached'});
      assert.equal(await page.evaluate(()=>details.length),before);
      await control.click();await send(page);await dialog(page).waitFor({state:'detached'});
      assert.equal(await page.evaluate(()=>details.length),before+1);
      assert.deepEqual(await page.evaluate(()=>details.at(-1)),{entityId:'input_select.mode'});
    }
    assert.deepEqual(await page.evaluate(()=>calls),[]);
  }
});
test('More info stays direct for an exempt account and for a card with PIN disabled',native,async t=>{
  for(const setting of [{user:'admin'},{options:{enabled:false}}]){
    const page=await setup(t,{...setting,config:{button_action:{tap_action:{action:'more-info'}}}});
    await page.locator('bubble-card').locator('.bubble-main-icon-container').click();
    await page.waitForFunction(()=>actions.length===1);
    assert.equal((await page.evaluate(()=>actions))[0].config.tap_action.action,'more-info');
    assert.equal(await dialog(page).count(),0);
  }
});
test('tablet selection, all-user mode, fresh identities and cancellation are scoped to the card',native,async t=>{
  const page=await setup(t,{user:'admin'});
  await gesture(page);assert.equal(await dialog(page).count(),0);assert.equal(await page.evaluate(()=>calls.length),1);
  await page.evaluate(()=>{card.hass=window.hass={...hass,user:{id:'tablet'}};});
  await gesture(page);await dialog(page).waitFor({state:'visible'});
  await dialog(page).locator('[data-digit="0"]').click();
  await page.keyboard.press('Escape');await dialog(page).waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>calls.length),1);
  await gesture(page);await dialog(page).waitFor({state:'visible'});
  await page.evaluate(()=>{card.hass=window.hass={...hass,user:{id:'admin'}};});
  await dialog(page).waitFor({state:'detached'});
  await page.evaluate(()=>{card.config.signature_pin.users=[];card.updateBubbleCard();});
  await gesture(page);await dialog(page).waitFor({state:'visible'});await send(page);
  await dialog(page).waitFor({state:'detached'});assert.equal(await page.evaluate(()=>calls.length),2);
  assert.equal(await page.evaluate(()=>hass.callService===card._hass.callService),false,'Only this card has a wrapped service handle');
});
test('native cover commands, media controls, select choices and slider writes cannot bypass the PIN',native,async t=>{
  for(const config of [
    {card_type:'cover',entity:'cover.test'},
    {card_type:'media-player',entity:'media_player.test'},
    {card_type:'select',entity:'input_select.mode'},
    {card_type:'climate',entity:'climate.test'},
    {card_type:'button',button_type:'slider',entity:'input_number.test'}
  ]){
    const page=await setup(t,{config});
    if(config.card_type==='cover')await page.locator('bubble-card').locator('.bubble-close').click();
    else if(config.card_type==='media-player')await page.locator('bubble-card').locator('.bubble-play-pause-button').click();
    else if(config.card_type==='select')await page.evaluate(()=>card.elements.dropdownSelect.dispatchEvent(new CustomEvent('selected',{detail:{value:'Nuit'}})));
    else if(config.card_type==='climate')await page.locator('bubble-card').locator('.bubble-climate-plus-button').first().click();
    else {
      const box=await page.locator('bubble-card').locator('.bubble-range-slider').boundingBox();
      await page.mouse.move(box.x+box.width*.4,box.y+box.height/2);await page.mouse.down();
      await page.mouse.move(box.x+box.width*.75,box.y+box.height/2,{steps:4});await page.mouse.up();
    }
    await dialog(page).waitFor({state:'visible'});assert.deepEqual(await page.evaluate(()=>calls),[]);
    await send(page);await dialog(page).waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>calls.length),1);
    assert.equal(await page.evaluate(()=>Object.hasOwn(calls[0][2],'code')),false);
  }
});
test('configuration changes, teardown and unrelated cards never authorize stale requests',native,async t=>{
  const page=await setup(t);
  for(const change of ['config','user','disconnect']){
    await gesture(page);await dialog(page).waitFor({state:'visible'});
    await page.evaluate(({change,changedHash})=>{
      window.oldInput=card.card.querySelector('dialog input');oldInput.value='0073';
      window.oldForm=card.card.querySelector('dialog form');
      if(change==='config'){card.config.signature_pin.code_hash=changedHash;card.updateBubbleCard();}
      if(change==='user')card.hass=window.hass={...hass,user:{id:'admin'}};
      if(change==='disconnect')card.remove();
      oldForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    },{change,changedHash:digest('1234')});
    assert.deepEqual(await page.evaluate(()=>calls),[]);
    assert.equal(await page.evaluate(()=>oldInput.value),'');
    await page.evaluate(codeHash=>{document.querySelector('#cards').append(card);card.config.signature_pin.code_hash=codeHash;card.hass=window.hass={...hass,user:{id:'tablet'}};card.updateBubbleCard();},digest('0073'));
    await page.waitForFunction(()=>!!card._signaturePinRuntime);
  }
  await page.evaluate(()=>hass.callService('light','turn_on',{entity_id:'light.test'}));
  assert.equal(await dialog(page).count(),0);assert.equal(await page.evaluate(()=>calls.length),1);
});
test('alarm commands use only the standalone PIN and original targets stay intact',native,async t=>{
  const page=await setup(t,{config:{entity:'alarm_control_panel.alarme',rows:2,modules:['signature_panel','signature_pin'],
    signature_panel:{sub_button_styles:{'1':{type:'command',active:false,disabled:false}}},
    sub_button:{main:[{name:'Désarmer',entity:'alarm_control_panel.alarme',show_name:true,
      tap_action:{action:'perform-action',perform_action:'alarm_control_panel.alarm_disarm',target:{entity_id:'alarm_control_panel.alarme'}}}]}}});
  await command(page).click();await send(page);await dialog(page).waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(()=>calls),[['alarm_control_panel','alarm_disarm',{}, {entity_id:'alarm_control_panel.alarme'}]]);
});
test('Panel alone has no PIN behavior, including cards with an obsolete alarm_code setting',native,async t=>{
  const page=await setup(t,{config:{entity:'alarm_control_panel.alarme',rows:2,modules:['signature_panel'],
    signature_panel:{alarm_code:true,sub_button_styles:{'1':{type:'command',active:false,disabled:false}}},
    sub_button:{main:[{name:'Désarmer',entity:'alarm_control_panel.alarme',show_name:true,
      tap_action:{action:'perform-action',perform_action:'alarm_control_panel.alarm_disarm',target:{entity_id:'alarm_control_panel.alarme'}}}]}}});
  await command(page).click();await page.waitForFunction(()=>calls.length===1);
  assert.equal(await dialog(page).count(),0);
  assert.equal(await page.evaluate(()=>!!card._signaturePinRuntime),false);
  assert.deepEqual(await page.evaluate(()=>calls),[['alarm_control_panel','alarm_disarm',{}, {entity_id:'alarm_control_panel.alarme'}]]);
});
test('disabling and re-enabling restores the native hass handle and never stacks prompts',native,async t=>{
  const page=await setup(t);
  await page.evaluate(()=>{window.guarded=card._hass.callService;for(let i=0;i<10;i++)card.updateBubbleCard();});
  assert.equal(await page.evaluate(()=>guarded===card._hass.callService),true);
  await gesture(page);await dialog(page).waitFor({state:'visible'});
  await page.evaluate(()=>{card.config.signature_pin.enabled=false;card.updateBubbleCard();});
  await dialog(page).waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>card._hass===hass),true);
  await gesture(page);assert.equal(await page.evaluate(()=>calls.length),1);
  await page.evaluate(()=>{card.config.signature_pin.enabled=true;card.updateBubbleCard();});
  await gesture(page);await send(page);await dialog(page).waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>calls.length),2);
});
test('a persistent native sub-slider created before the module also uses the card PIN',native,async t=>{
  const page=await setup(t,{config:{sub_button:{main:[{entity:'input_number.test',sub_button_type:'slider',always_visible:true,show_name:true}]}}});
  assert.equal(await page.evaluate(()=>{
    const nodes=[...Object.values(card.elements),...Object.values(card.elements.groups||{}).flatMap(group=>Object.values(group.buttons||{}))];
    window.sliderHost=nodes.find(node=>node?.sliderContext);
    const node=sliderHost;
    return node.sliderContext._hass.callService===card._hass.callService;
  }),true);
  await page.evaluate(()=>{sliderHost.sliderContext._hass.callService('input_number','set_value',{entity_id:'input_number.test',value:75});});
  await dialog(page).waitFor({state:'visible'});assert.deepEqual(await page.evaluate(()=>calls),[]);
  await send(page);await dialog(page).waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(()=>calls),[['input_number','set_value',{entity_id:'input_number.test',value:75}]]);
});
test('PIN keypad is usable on touch in both themes at phone and tablet widths',native,async t=>{
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const width of [328,800]){
    const page=await setup(t,{mode,plain,width,touch:true});await command(page).tap();
    await dialog(page).waitFor({state:'visible'});
    assert.equal(await dialog(page).locator('[data-digit]').count(),10);
    assert.equal(await dialog(page).locator('input').evaluate(input=>input.readOnly&&input.inputMode==='none'),true);
    assert.equal(await dialog(page).evaluate(element=>element.scrollWidth<=element.clientWidth),true);
    const box=await dialog(page).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=page.viewportSize().width);
    await send(page);await dialog(page).waitFor({state:'detached'});
  }
});
