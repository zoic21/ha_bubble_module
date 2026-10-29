const assert=require('node:assert/strict'),vm=require('node:vm');
const {test}=require('node:test');
const {loadModule}=require('../../shared/test/module.cjs');
const context=vm.createContext({...require('../../signature-shared/test/dom.cjs'),Intl,setTimeout,clearTimeout});
const render=vm.runInContext('(function(hass,onTeardown,renderTemplate,hasChanged){return `'+loadModule('signature-panel').code+'`;})',context);
function fixture(){
 const {Element}=context,root=new Element('ha-card'),content=new Element(),names=new Element(),state=new Element();
 content.className='bubble-content-container';names.className='bubble-name-container';state.className='bubble-state';
 root.append(content);content.append(names);names.append(state);
 const options={illustration:{image:'/local/rack.webp'},information:[{entity:'sensor.temp',icon:'{{ icon }}',secondary:'sensor.humidity',tap_action:{action:'navigate',navigation_path:'#temperature'}},{entity:'sensor.humidity'}]};
 const ctx={card:root,config:{card_type:'button',button_type:'state',entity:'sensor.power',show_state:true,signature_panel:options},elements:{state,contentContainer:content,nameContainer:names}};
 const hass={locale:{language:'fr',number_format:'space_comma'},states:{'sensor.power':{state:'140',attributes:{unit_of_measurement:'W'}},'sensor.temp':{state:'29',attributes:{unit_of_measurement:'°C'}},'sensor.humidity':{state:'42',attributes:{unit_of_measurement:'%'}}}};
 let icon='mdi:thermometer';
 return {ctx,root,hass,options,run:()=>render.call(ctx,hass,fn=>ctx.teardown=fn,v=>v==='{{ icon }}'?icon:v,ctx.nativeGate),setIcon:value=>icon=value};
}
test('an optional global heading stays separate from metric names and native actions, and cleans up on removal',()=>{
 const f=fixture(),name=new context.Element();name.className='bubble-name';name.textContent='Puissance';f.ctx.elements.nameContainer.append(name);
 f.options.title='Baie informatique';f.options.tap_action={action:'navigate',navigation_path:'#power'};
 f.run();const title=f.root.querySelector('.dp-panel-title'),state=f.ctx.elements.state,runtime=f.ctx._signaturePanelRuntime,css=runtime.styleCSS;
 assert.equal(title.textContent,'Baie informatique');assert.equal(name.textContent,'Puissance');
 assert.equal(f.root.getAttribute('data-dp-panel-shared-name'),'no');
 assert.equal(title.dataset.entity,undefined);assert.equal(JSON.parse(state.dataset.tapAction).navigation_path,'#power');
 f.options.title='<img src=x onerror=alert(1)>';f.run();
 assert.equal(f.root.querySelector('.dp-panel-title'),title);assert.equal(title.textContent,f.options.title);assert.equal(title.children.length,0);
 assert.equal(runtime.styleCSS,css,'changing heading text must not rebuild geometry');
 f.options.title=' ';f.run();assert.equal(f.root.querySelector('.dp-panel-title'),null);assert.equal(f.root.getAttribute('data-dp-panel-title'),'no');
 f.options.title='Baie';f.run();assert.equal(f.root.querySelectorAll('.dp-panel-title').length,1);
 f.ctx.teardown();assert.equal(f.root.querySelector('.dp-panel-title'),null);assert.equal(f.root.getAttribute('data-dp-panel-title'),null);
 assert.equal(name.parentNode,f.ctx.elements.nameContainer);
});
test('global heading badges retain their native nodes when the heading changes or disappears',()=>{
 const f=fixture(),name=new context.Element(),group=new context.Element(),badge=new context.Element();
 name.className='bubble-name';name.textContent='Puissance';group.className='bubble-sub-button-group';badge.className='bubble-sub-button status';
 f.ctx.elements.nameContainer.append(name);group.append(badge);f.root.append(group);
 f.ctx.config.sub_button={main:[{entity:'sensor.temp',css_class:'status',show_name:false,show_state:false}]};
 f.options.sub_button_styles={status:{type:'badge'}};f.options.title='Baie';f.run();
 assert.equal(f.root.querySelector('.dp-panel-heading').firstElementChild,f.root.querySelector('.dp-panel-title'));
 assert.equal(name.parentNode,f.ctx.elements.nameContainer);assert.equal(f.root.querySelector('.dp-panel-badges').firstElementChild,badge);
 delete f.options.title;f.run();assert.equal(f.root.querySelector('.dp-panel-heading').firstElementChild,name);
 assert.equal(f.root.querySelector('.dp-panel-title'),null);assert.equal(f.root.querySelector('.dp-panel-badges').firstElementChild,badge);
 f.options.title='Baie';f.run();f.ctx.teardown();assert.equal(badge.parentNode,group);assert.equal(name.parentNode,f.ctx.elements.nameContainer);
 assert.equal(f.root.querySelector('.dp-panel-title'),null);assert.equal(f.root.querySelector('.dp-panel-heading'),null);
 f.ctx.config.card_type='media-player';f.run();assert.equal(f.root.querySelector('.dp-panel-title'),null);f.ctx.teardown();
});
test('Panel emits command and media CSS only for their active native configuration',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());
 const base=f.run();assert.doesNotMatch(base,/grid-template-areas:'icon' 'label'|bubble-media-info-container/);
 f.ctx.config.sub_button=[{entity:'sensor.power',show_name:true,css_class:'command'}];
 f.options.sub_button_styles={command:{type:'command'}};
 assert.match(f.run(),/grid-template-areas:'icon' 'label'/);
 delete f.options.sub_button_styles;
 assert.doesNotMatch(f.run(),/grid-template-areas:'icon' 'label'/);
 f.ctx.config.card_type='media-player';
 assert.match(f.run(),/bubble-media-info-container/);
});
test('three information columns preserve native primary value, independent details and explicit navigation',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());f.run();
 const states=f.root.querySelectorAll('.dp-panel-state');
 assert.equal(f.ctx.elements.state.textContent,'140W');assert.equal(states.length,2);
 assert.equal(states[0].textContent,'29°C');assert.equal(states[1].textContent,'42%');
 assert.equal(JSON.parse(states[0].dataset.tapAction).navigation_path,'#temperature');
 assert.equal(f.root.querySelector('.dp-panel-secondary').dataset.entity,'sensor.humidity');
 assert.equal(f.root.getAttribute('data-dp-panel-count'),'3');
});
test('cached updates follow values and Jinja icons, and changing entities replaces cached action targets',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());f.run();const old=f.root.querySelector('.dp-panel-information');
 f.hass.states['sensor.temp'].state='30';f.setIcon('mdi:fan');f.run();
 assert.equal(f.root.querySelector('.dp-panel-information'),old);assert.equal(old.querySelector('.dp-panel-icon').getAttribute('icon'),'mdi:fan');
 assert.equal(old.querySelector('.dp-panel-state').textContent,'30°C');
 f.options.information[0]={entity:'sensor.humidity'};f.run();
 assert.equal(f.root.contains(old),false);assert.equal(old.querySelector('.dp-panel-state').dataset.entity,undefined);
 assert.equal(f.root.querySelector('.dp-panel-state').dataset.entity,'sensor.humidity');
});
test('removing columns and teardown release every delegated target, including removed information nodes',()=>{
 const f=fixture();f.run();const removed=f.root.querySelectorAll('.dp-panel-state')[1];
 f.options.information.pop();f.run();assert.equal(removed.dataset.entity,undefined);
 assert.equal(f.root.getAttribute('data-dp-panel-count'),'2');
 delete f.options.information;f.run();assert.equal(f.root.querySelectorAll('.dp-panel-information').length,0);
 assert.equal(f.root.getAttribute('data-dp-panel-count'),'1');
 f.ctx.teardown();assert.equal(f.root.getAttribute('data-dp-layout'),null);
});
test('missing data, disabled entries and calculated labels remain explicit without invented more-info targets',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());
 f.options.information=[{entity:'sensor.missing',name:'Mesure'}, {state:'22 %',name:'Part',secondary:'Calcul'}];f.run();
 const states=f.root.querySelectorAll('.dp-panel-state');assert.equal(states[0].textContent,'—');
 assert.equal(states[1].textContent,'22%');assert.equal(states[1].dataset.entity,undefined);
 assert.equal(JSON.parse(states[1].dataset.tapAction).action,'none');
 f.options.information[0].enabled=false;f.run();assert.equal(f.root.getAttribute('data-dp-panel-count'),'2');
});

test('Panel primary tap override keeps long-press details and the default when removed',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());f.run();const state=f.ctx.elements.state;
 assert.equal(JSON.parse(state.dataset.tapAction).action,'more-info');
 f.options.tap_action={action:'navigate',navigation_path:'#power'};f.run();
 assert.equal(f.ctx.elements.state,state);
 assert.deepEqual(JSON.parse(state.dataset.tapAction),f.options.tap_action);
 assert.equal(JSON.parse(state.dataset.holdAction).action,'more-info');
 delete f.options.tap_action;f.run();
 assert.equal(JSON.parse(state.dataset.tapAction).action,'more-info');
});

test('Panel title badges move native nodes and restore every home on removal and teardown',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());const {Element}=context;
 const name=new Element();name.className='bubble-name';name.textContent='Equipment';
 f.ctx.elements.nameContainer.append(name);
 const group=new Element(),badge=new Element();group.className='bubble-sub-button-group';badge.className='bubble-sub-button status';
 group.append(badge);f.root.append(group);
 f.ctx.config.sub_button={main:[{entity:'sensor.temp',css_class:'status',show_name:false,show_state:false}]};
 f.options.sub_button_styles={status:{type:'badge',color:'teal'}};f.run();
 assert.equal(f.root.querySelector('.dp-panel-badges').firstElementChild,badge);
 assert.equal(f.root.querySelector('.dp-panel-heading').firstElementChild,name);
 delete f.options.sub_button_styles;f.run();
 assert.equal(badge.parentNode,group);assert.equal(name.parentNode,f.ctx.elements.nameContainer);
 assert.equal(f.root.querySelector('.dp-panel-heading'),null);
 f.options.sub_button_styles={status:{type:'badge'}};f.run();f.ctx.teardown();
 assert.equal(badge.parentNode,group);assert.equal(name.parentNode,f.ctx.elements.nameContainer);
});

test('illustration width ratio updates outside the geometry cache and rejects invalid input',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());
 assert.match(f.run(),/--dp-panel-artwork-ratio:1;/);
 const css=f.ctx._signaturePanelRuntime.styleCSS,state=f.ctx.elements.state;
 for(const ratio of [0.65,0.7,0.75,0.8,'0.5']){
  f.options.illustration.width_ratio=ratio;
  assert.ok(f.run().includes('--dp-panel-artwork-ratio:'+Number(ratio)+';'));
  assert.equal(f.ctx._signaturePanelRuntime.styleCSS,css);
  assert.equal(f.ctx.elements.state,state);
 }
 for(const invalid of [0,-1,1.1,'','invalid',true,{},Infinity,NaN]){
  f.options.illustration.width_ratio=invalid;
  assert.match(f.run(),/--dp-panel-artwork-ratio:1;/);
 }
 f.options.illustration.width_ratio='{{ ratio }}';
 for(const ratio of ['0.75','0.65','bad']){
  const css=render.call(f.ctx,f.hass,fn=>f.ctx.teardown=fn,v=>v==='{{ ratio }}'?ratio:v);
  assert.ok(css.includes('--dp-panel-artwork-ratio:'+(ratio==='bad'?1:Number(ratio))+';'));
 }
 delete f.options.illustration.width_ratio;
 assert.match(f.run(),/--dp-panel-artwork-ratio:1;/);
});

test('real media artwork keeps its full track while an atlas fallback retains its width ratio',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());
 f.ctx.config.card_type='media-player';
 f.options.illustration={image:'/local/rack.webp',media_artwork:true,width_ratio:0.65};
 assert.match(f.run(),/--dp-panel-artwork-ratio:0.65;/);
 f.hass.states['sensor.power'].attributes.entity_picture='/api/media_player_proxy/album';
 assert.match(f.run(),/--dp-panel-artwork-ratio:1;/);
 delete f.hass.states['sensor.power'].attributes.entity_picture;
 assert.match(f.run(),/--dp-panel-artwork-ratio:0.65;/);
});

test('heading corner placement follows live badge options and preserves template icons and native restoration',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());const {Element}=context;
 const group=new Element(),badge=new Element(),icon=new Element();group.className='bubble-sub-button-group';badge.className='bubble-sub-button robot';icon.className='bubble-sub-button-icon';icon.setAttribute('icon','mdi:robot-mower-outline');badge.append(icon);group.append(badge);f.root.append(group);
 f.ctx.config.sub_button={main:[{entity:'sensor.temp',css_class:'robot',show_name:false,show_state:false,show_icon:true,tap_action:{action:'navigate',navigation_path:'#robot'}}]};
 f.options.variant='heading';f.options.title='Jardin';f.options.sub_button_styles={robot:{type:'badge',position:'bottom-right',icon:'{{ icon }}',color:'#29958A'}};
 f.setIcon('mdi:robot-mower');const css=f.run(),geometry=f.ctx._signaturePanelRuntime.styleCSS;
 assert.match(css,/\.robot\{--dp-panel-badge-position:absolute;--dp-panel-badge-inset:auto 0 0 auto;/);
 assert.equal(icon.getAttribute('icon'),'mdi:robot-mower');assert.equal(f.root.querySelector('.dp-panel-badges').firstElementChild,badge);
 f.options.sub_button_styles.robot.position='top-right';f.options.sub_button_styles.robot.color='#B97918';f.setIcon('mdi:pause-circle-outline');
 const next=f.run();assert.doesNotMatch(next,/\.robot\{--dp-panel-badge-position:absolute/);assert.match(next,/color:#B97918\s*!important/);
 assert.equal(icon.getAttribute('icon'),'mdi:pause-circle-outline');assert.equal(f.root.querySelector('.dp-panel-badges').firstElementChild,badge);assert.equal(f.ctx._signaturePanelRuntime.styleCSS,geometry);
 f.options.sub_button_styles.robot.position='bottom-right';f.options.variant='strip';assert.doesNotMatch(f.run(),/\.robot\{--dp-panel-badge-position:absolute/);
 delete f.options.sub_button_styles;f.run();assert.equal(badge.parentNode,group);assert.equal(icon.getAttribute('icon'),'mdi:robot-mower-outline');
});

test('native render gates avoid repeated owned styles and actions while live templates stay current',t=>{
 const f=fixture();t.after(()=>f.ctx.teardown());const gates=new Map();let calls=0;
 f.ctx.nativeGate=(key,...values)=>{calls++;const next=values.join('\\u0001'),changed=gates.get(key)!==next;gates.set(key,next);return changed;};
 f.run();const item=f.root.querySelector('.dp-panel-information');let writes=0;
 const set=item.style.setProperty.bind(item.style);item.style.setProperty=(...args)=>{writes++;return set(...args);};
 const reads=new Set();f.hass.states=new Proxy(f.hass.states,{get(target,id){reads.add(id);return target[id];}});
 for(let i=0;i<30;i++)f.run();
 assert.equal(writes,0);assert.ok(calls>=30);assert.ok(reads.has('sensor.temp'));assert.ok(reads.has('sensor.humidity'));
 f.setIcon('mdi:fan');f.run();assert.equal(item.querySelector('.dp-panel-icon').getAttribute('icon'),'mdi:fan');
 f.options.information[0].color='#ff0000';f.options.information[0].name='New name';f.run();
 assert.equal(item.querySelector('.dp-panel-name').textContent,'New name');assert.ok(writes>0);
 f.options.information[0].tap_action.navigation_path='#updated';f.run();
 assert.equal(JSON.parse(f.root.querySelector('.dp-panel-state').dataset.tapAction).navigation_path,'#updated');
});
