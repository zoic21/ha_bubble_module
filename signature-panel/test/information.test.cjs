const assert=require('node:assert/strict'),vm=require('node:vm');
const {test}=require('node:test');
const {loadModule}=require('../../shared/test/module.cjs');
const context=vm.createContext({...require('../../signature-shared/test/dom.cjs'),Intl,setTimeout,clearTimeout});
const render=vm.runInContext('(function(hass,onTeardown,renderTemplate){return `'+loadModule('signature-panel').code+'`;})',context);
function fixture(){
 const {Element}=context,root=new Element('ha-card'),content=new Element(),names=new Element(),state=new Element();
 content.className='bubble-content-container';names.className='bubble-name-container';state.className='bubble-state';
 root.append(content);content.append(names);names.append(state);
 const options={illustration:{image:'/local/rack.webp'},information:[{entity:'sensor.temp',icon:'{{ icon }}',secondary:'sensor.humidity',tap_action:{action:'navigate',navigation_path:'#temperature'}},{entity:'sensor.humidity'}]};
 const ctx={card:root,config:{card_type:'button',button_type:'state',entity:'sensor.power',show_state:true,signature_panel:options},elements:{state,contentContainer:content,nameContainer:names}};
 const hass={locale:{language:'fr',number_format:'space_comma'},states:{'sensor.power':{state:'140',attributes:{unit_of_measurement:'W'}},'sensor.temp':{state:'29',attributes:{unit_of_measurement:'°C'}},'sensor.humidity':{state:'42',attributes:{unit_of_measurement:'%'}}}};
 let icon='mdi:thermometer';
 return {ctx,root,hass,options,run:()=>render.call(ctx,hass,fn=>ctx.teardown=fn,v=>v==='{{ icon }}'?icon:v),setIcon:value=>icon=value};
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
