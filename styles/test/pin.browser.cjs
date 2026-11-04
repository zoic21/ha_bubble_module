const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const {editorBootstrap} = require('../../shared/test/editor-bootstrap.cjs');
const {theme,nativeModes} = require('./fixtures.cjs');
const pin = loadModule('signature-pin'), panel = loadModule('signature-panel');
const nativePath = process.env.BUBBLE_PIN_NATIVE_SCRIPT_PATH;
const native = {skip: !nativePath};
const digest = code => crypto.createHash('sha256').update(code).digest('hex');
const guidedModules=['signature-compact','signature-square','signature-room','signature-panel','signature-header','signature-flow','signature-weather','signature-wind-rose','signature-hue','signature-irrigation','signature-energy-balance','signature-group'];
async function setup(t, {user='tablet', options={}, config={}, width=382, mode='light', plain=false, touch=false,haVersion='2026.10.4'}={}) {
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
  await page.evaluate(({user,options,config,theme,nativeModes,mode,plain,codeHash,haVersion})=>{
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
      config:{unit_system:{temperature:'°C'},time_zone:'Europe/Paris',version:haVersion},localize:()=>undefined,
      formatEntityState:s=>s.state,formatEntityAttributeValue:(s,key,value)=>value,hassUrl:p=>new URL(p,'https://ha.example.test').href,
      connection:{haVersion,subscribeMessage:async()=>()=>{},subscribeEvents:async()=>()=>{}},
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
  },{user,options,config,theme,nativeModes,mode,plain,codeHash:digest('0073'),haVersion});
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
test('backdrop clicks and taps cancel without running the action, while keypad clicks and crossing drags keep it open',native,async t=>{
  for(const touch of [false,true]){
    const page=await setup(t,{width:touch?328:800,touch});
    const click=async point=>touch?page.touchscreen.tap(point.x,point.y):page.mouse.click(point.x,point.y);
    await command(page).click();await dialog(page).waitFor({state:'visible'});
    await dialog(page).locator('[data-digit="0"]').click();
    await dialog(page).locator('[data-reveal]').click();
    await page.evaluate(()=>{window.dismissedInput=card.card.querySelector('dialog input');});
    const box=await dialog(page).boundingBox();
    await click({x:box.x+8,y:box.y+box.height/2});
    assert.equal(await dialog(page).isVisible(),true,'Internal padding is part of the keypad');
    const inside={x:box.x+box.width/2,y:box.y+80},outside={x:2,y:2};
    for(const [start,end]of [[inside,outside],[outside,inside]]){
      await page.mouse.move(start.x,start.y);await page.mouse.down();
      await page.mouse.move(end.x,end.y,{steps:4});await page.mouse.up();
      assert.equal(await dialog(page).isVisible(),true,'Crossing the dialog boundary must not dismiss');
    }
    await click(outside);await dialog(page).waitFor({state:'detached'});
    assert.deepEqual(await page.evaluate(()=>({value:dismissedInput.value,type:dismissedInput.type,calls,actions,details})),
      {value:'',type:'password',calls:[],actions:[],details:[]});
    // Direct native services also settle on cancellation instead of being queued.
    await page.evaluate(()=>{window.pendingService=card._hass.callService('light','turn_on',{entity_id:'light.test'});});
    await dialog(page).waitFor({state:'visible'});await click(outside);
    await dialog(page).waitFor({state:'detached'});await page.evaluate(()=>pendingService);
    assert.deepEqual(await page.evaluate(()=>calls),[]);
    await command(page).click();await dialog(page).waitFor({state:'visible'});
    assert.equal(await dialog(page).locator('input').inputValue(),'');
    await send(page);await dialog(page).waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>calls.length),1,'A fresh request still executes once after validation');
  }
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
    const form=document.createElement('ha-form-signature_pin_scope_options_v2');
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
  },{schema:pin.editor.find(field=>field.type==='signature_pin_scope_options_v2'),storedHash:digest('0073')});
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
test('selected sub-buttons protect every gesture and More info while the main card and identical unselected actions stay direct',native,async t=>{
  const button=name=>({name,entity:'input_select.mode',show_name:true,sub_button_type:'default',
    tap_action:{action:'perform-action',perform_action:'input_select.select_option',data:{option:'Absent'},target:{entity_id:'input_select.mode'}},
    hold_action:{action:'more-info'},double_tap_action:{action:'navigate',navigation_path:'#modes'}});
  const page=await setup(t,{options:{scope:'sub_buttons',sub_buttons:['2']},config:{sub_button:{main:[button('Libre'),button('Mode maison')]}}});
  await page.locator('bubble-card').locator('.bubble-main-icon-container').click();
  await page.locator('bubble-card').locator('.bubble-sub-button-1').click();
  await page.waitForFunction(()=>calls.length===1);
  assert.equal(await dialog(page).count(),0);assert.equal(await page.evaluate(()=>calls.length),1);
  for(const action of ['tap','hold','double_tap']){
    const before=await page.evaluate(()=>actions.length);
    await page.evaluate(action=>card.card.querySelector('.bubble-sub-button-2').dispatchEvent(new CustomEvent('hass-action',{
      detail:{action,config:card.config.sub_button.main[1]},bubbles:true,composed:true,cancelable:true})),action);
    await dialog(page).waitFor({state:'visible'});assert.equal(await page.evaluate(()=>actions.length),before);
    await send(page,'9999');assert.equal(await page.evaluate(()=>actions.length),before);
    await send(page);await dialog(page).waitFor({state:'detached'});assert.equal(await page.evaluate(()=>actions.length),before+1);
  }
  const moreInfo=number=>page.evaluate(number=>card.card.querySelector('.bubble-sub-button-'+number+' .bubble-sub-button-name-container')
    .dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:'input_select.mode'},bubbles:true,composed:true})),number);
  await moreInfo(1);assert.equal(await page.evaluate(()=>details.length),1);assert.equal(await dialog(page).count(),0);
  await moreInfo(2);await dialog(page).waitFor({state:'visible'});
  await dialog(page).locator('[data-close]').click();await dialog(page).waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>details.length),1);
  await moreInfo(2);await send(page);await dialog(page).waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>details.length),2);
  await page.evaluate(()=>{card.hass=window.hass={...hass,user:{id:'admin'}};});
  await page.locator('bubble-card').locator('.bubble-sub-button-2').click();
  await page.waitForFunction(()=>calls.length===3);
  assert.equal(await dialog(page).count(),0);assert.equal(await page.evaluate(()=>calls.length),3);
});
test('native dropdown choices are scoped by sub-button, even with the same entity and legacy HA menus',native,async t=>{
  for(const haVersion of ['2026.10.4','2025.12.0']){
    const page=await setup(t,{haVersion,options:{scope:'sub_buttons',sub_buttons:['2']},config:{card_type:'select',sub_button:{main:[
      {entity:'input_select.mode',name:'Libre',sub_button_type:'select'},
      {entity:'input_select.mode',name:'Mode maison',sub_button_type:'select'}]}}});
    const select=(index,value)=>page.evaluate(({index,value,legacy})=>{
      const select=index ? card.card.querySelector('.bubble-sub-button-'+index).dropdownSelect : card.elements.dropdownSelect;
      if(legacy){const item=document.createElement('mwc-list-item');item.value=value;select.append(item);item.click();}
      else select.dispatchEvent(new CustomEvent('selected',{detail:{value}}));
    },{index,value,legacy:haVersion==='2025.12.0'});
    await select(0,'Présent');await select(1,'Nuit');
    assert.equal(await dialog(page).count(),0);assert.equal(await page.evaluate(()=>calls.length),2);
    await select(2,'Absent');await dialog(page).waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>calls.length),2);
    await send(page);await dialog(page).waitFor({state:'detached'});
    assert.deepEqual((await page.evaluate(()=>calls)).at(-1),['input_select','select_option',{entity_id:'input_select.mode',option:'Absent'}]);
    assert.equal(await page.evaluate(()=>calls.length),3);
  }
});
test('sub-slider services keep their own scope, original values and clean handles through native renders and teardown',native,async t=>{
  const page=await setup(t,{width:600,options:{scope:'sub_buttons',sub_buttons:['2']},config:{button_type:'slider',entity:'input_number.test',sub_button:{main:[
    {entity:'input_number.test',name:'Libre',sub_button_type:'slider',always_visible:true},
    {entity:'input_number.test',name:'Protégé',sub_button_type:'slider',always_visible:true}]}}});
  const drag=async selector=>{
    const box=await page.locator('bubble-card').locator(selector).boundingBox();assert.ok(box?.width>0);
    await page.mouse.move(box.x+box.width*.4,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.75,box.y+box.height/2,{steps:4});await page.mouse.up();
  };
  await drag('.bubble-sub-button-slider-1 .bubble-range-slider');
  assert.equal(await dialog(page).count(),0);await page.waitForFunction(()=>calls.length===1);
  await page.evaluate(()=>card._hass.callService('input_number','set_value',{entity_id:'input_number.test',value:10}));
  assert.equal(await dialog(page).count(),0);assert.equal(await page.evaluate(()=>calls.length),2);
  await page.evaluate(()=>{for(let i=0;i<3;i++)card.updateBubbleCard();});
  await drag('.bubble-sub-button-slider-2 .bubble-range-slider');
  await dialog(page).waitFor({state:'visible'});assert.equal(await page.evaluate(()=>calls.length),2);
  await send(page);await dialog(page).waitFor({state:'detached'});assert.equal(await page.evaluate(()=>calls.length),3);
  const last=(await page.evaluate(()=>calls)).at(-1);
  assert.equal(last[0],'input_number');assert.equal(last[1],'set_value');assert.equal(last[2].entity_id,'input_number.test');assert.equal(typeof last[2].value,'number');
  await page.evaluate(()=>{window.subHosts=Object.values(card.elements).filter(node=>node?.sliderContext);card.config.signature_pin.enabled=false;card.updateBubbleCard();});
  assert.equal(await page.evaluate(()=>subHosts.length===2&&subHosts.every(node=>node.sliderContext._hass===hass)),true);
});
test('an empty sub-button selection protects all sub-buttons, preserves grouped indices and leaves the main card direct',native,async t=>{
  const button=name=>({name,entity:'input_select.mode',sub_button_type:'default',show_name:true,tap_action:{action:'more-info'}});
  const page=await setup(t,{options:{scope:'sub_buttons',sub_buttons:[]},config:{rows:2,sub_button:{main:[button('Libre'),{group:[button('Mode maison')]}],bottom:[button('Jardin')]}}});
  assert.deepEqual(await page.evaluate(()=>[1,2,3].map(index=>card.card.querySelector('.bubble-sub-button-'+index).nameContainer.textContent.trim())),['Mode maison','Libre','Jardin']);
  await page.locator('bubble-card').locator('.bubble-main-icon-container').click();assert.equal(await dialog(page).count(),0);
  for(const index of [1,2,3]){
    await page.locator('bubble-card').locator('.bubble-sub-button-'+index).click();await dialog(page).waitFor({state:'visible'});
    await dialog(page).locator('[data-close]').click();await dialog(page).waitFor({state:'detached'});
  }
  await page.evaluate(()=>{card.config.signature_pin.sub_buttons=['1'];card.updateBubbleCard();});
  await page.locator('bubble-card').locator('.bubble-sub-button-3').click();assert.equal(await dialog(page).count(),0);
  await page.locator('bubble-card').locator('.bubble-sub-button-1').click();await dialog(page).waitFor({state:'visible'});
  await page.evaluate(()=>{card.config.signature_pin.scope='card';card.updateBubbleCard();});
  await dialog(page).waitFor({state:'detached'});
  await page.locator('bubble-card').locator('.bubble-main-icon-container').click();await dialog(page).waitFor({state:'visible'});
});
test('tablet selection, all-user mode, fresh identities and cancellation are scoped to the card',native,async t=>{
  const page=await setup(t,{user:'admin'});
  await gesture(page);assert.equal(await dialog(page).count(),0);assert.equal(await page.evaluate(()=>calls.length),1);
  // HA's setter writes _hass before Bubble's coalesced render. Explicitly
  // flush that render after the first action to make the ordering deterministic.
  await page.evaluate(()=>{card._hass=window.hass={...hass,user:{id:'tablet'}};});
  await gesture(page);await page.evaluate(()=>card.updateBubbleCard());
  await dialog(page).waitFor({state:'visible'});
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

test('all guided editors register together with native Bubble, open without writes and preserve legacy YAML on targeted edits',native,async t=>{
  const page=await setup(t);
  const modules=guidedModules.map(folder=>{const d=loadModule(folder);return {folder,bootstrap:editorBootstrap(d),schema:d.editor.find(x=>x.fields)};});
  const result=await page.evaluate(async modules=>{
    const root=document.createElement('div');root._config={card_type:'button',button_type:'state',entity:'input_select.mode',modules:['signature_compact','signature_panel']};
    document.body.append(root);const shadow=root.attachShadow({mode:'open'});
    const values={};
    for(const module of modules){
      new Function(module.bootstrap)();
      const form=document.createElement('ha-form-'+module.schema.type);
      const original={future:{enabled:false,value:0},color_background:false,sub_button_styles:{'1':{type:'badge',opacity:0}}};
      Object.assign(form,{hass,schema:module.schema,data:original});
      const changes=[];form.addEventListener('value-changed',event=>{changes.push(event.detail.value);form.data=event.detail.value;});
      shadow.append(form);await Promise.resolve();
      const leaves=entries=>entries.flatMap(field=>field.schema?leaves(field.schema):[field]);
      if(leaves(form._form.schema).some(field=>field.type==='signature_guided_v1'&&Object.hasOwn(field,'selector')))throw Error('Guided fields must not retain the old HA selector');
      values[module.folder]={writes:changes.length,original:JSON.stringify(form.data)===JSON.stringify(original)};
      if(module.folder==='signature-compact'){
        form._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form._form.data,value_presentation:'pill'}}}));await Promise.resolve();
        values.compactSaved=JSON.parse(JSON.stringify(changes.at(-1)));
      }
      form.remove();
    }
    const image=document.createElement('ha-form-signature_guided_v1');
    Object.assign(image,{hass,schema:{fields:{},ui_kind:'illustration'},data:{image:'/local/day.png',index:0,image_dark:'/local/night.png',future:false}});
    const edits=[];image.addEventListener('value-changed',event=>{edits.push(event.detail.value);image.data=event.detail.value;});
    shadow.append(image);await Promise.resolve();
    image._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...image._form.data,edit_mode:'yaml'}}}));await Promise.resolve();
    image._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...image._form.data,edit_mode:'form'}}}));await Promise.resolve();
    values.imageModeWrites=edits.length;
    image._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...image._form.data,image:'/local/new.png'}}}));await Promise.resolve();
    values.imageSaved=JSON.parse(JSON.stringify(edits.at(-1)));image.remove();root.remove();
    return values;
  },modules);
  for(const folder of guidedModules)assert.deepEqual(result[folder],{writes:0,original:true},folder);
  assert.deepEqual(result.compactSaved,{future:{enabled:false,value:0},color_background:false,sub_button_styles:{'1':{type:'badge',opacity:0}},compact_mode:'value',value_style:'button',value_background:true});
  assert.equal(result.imageModeWrites,0);
  assert.deepEqual(result.imageSaved,{image:'/local/new.png',index:0,image_dark:'/local/night.png',future:false});
});
