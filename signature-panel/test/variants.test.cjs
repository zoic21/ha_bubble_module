const assert=require('node:assert/strict'),vm=require('node:vm');
const {test}=require('node:test');
const {loadModule}=require('../../shared/test/module.cjs');
const context=vm.createContext({...require('../../signature-shared/test/dom.cjs'),Intl,setTimeout,clearTimeout});
const render=vm.runInContext('(function(hass,onTeardown,renderTemplate){return `'+loadModule('signature-panel').code+'`;})',context);
function fixture(){
 const {Element}=context,root=new Element('ha-card'),content=new Element(),names=new Element(),name=new Element(),state=new Element();
 content.className='bubble-content-container';names.className='bubble-name-container';name.className='bubble-name';name.textContent='Sel';state.className='bubble-state';
 root.append(content);content.append(names);names.append(name,state);
 const options={variant:'strip',metric_icon:'mdi:water-sync',primary_enabled:'{{ primary }}',information:[{entity:'sensor.ph',name:'pH',icon:'mdi:flask-outline',secondary:'sensor.rate'},{entity:'sensor.redox',name:'Redox',icon:'mdi:lightning-bolt-outline'}]};
 const ctx={card:root,config:{card_type:'button',button_type:'state',entity:'sensor.salt',show_state:true,signature_panel:options},elements:{state,contentContainer:content,nameContainer:names}};
 const hass={locale:{language:'fr',number_format:'space_comma'},states:{'sensor.salt':{state:'2.8',attributes:{unit_of_measurement:'g/L'}},'sensor.ph':{state:'7.2',attributes:{}},'sensor.redox':{state:'720',attributes:{unit_of_measurement:'mV'}},'sensor.rate':{state:'35',attributes:{unit_of_measurement:'%'}}}};
 let enabled='True';
 return {ctx,root,options,hass,run:()=>render.call(ctx,hass,fn=>ctx.teardown=fn,v=>v==='{{ primary }}'?enabled:v),enable:v=>enabled=v};
}
test('a strip keeps real values, detail targets and native action nodes through primary visibility changes',()=>{
 const f=fixture();f.run();const state=f.ctx.elements.state,extra=f.root.querySelectorAll('.dp-panel-state');
 assert.equal(f.root.getAttribute('data-dp-panel-count'),'3');assert.equal(state.textContent,'2,8g/L');
 assert.equal(extra[0].textContent,'7,2');assert.equal(extra[1].textContent,'720mV');
 assert.equal(f.root.querySelector('.dp-panel-secondary').dataset.entity,'sensor.rate');
 f.enable('False');f.run();assert.equal(f.root.getAttribute('data-dp-panel-count'),'2');assert.equal(f.root.getAttribute('data-dp-panel-primary'),'no');
 assert.equal(f.ctx.elements.state,state);assert.equal(f.root.querySelectorAll('.dp-panel-state')[0],extra[0]);
 f.enable('True');f.run();assert.equal(f.root.getAttribute('data-dp-panel-count'),'3');
 f.hass.states['sensor.ph'].state='unavailable';f.run();assert.equal(extra[0].textContent,'—');
 f.ctx.teardown();assert.equal(f.root.getAttribute('data-dp-panel-variant'),null);assert.equal(f.root.querySelector('.dp-panel-primary-icon'),null);
});
test('headings with no ambient sensor never manufacture a placeholder measurement',()=>{
 const f=fixture();f.options.variant='heading';f.options.title='Couloir';f.options.information=[];f.ctx.config.show_state=false;delete f.ctx.config.entity;
 f.run();assert.equal(f.root.getAttribute('data-dp-panel-count'),'0');assert.equal(f.root.querySelector('.dp-panel-title').textContent,'Couloir');assert.equal(f.root.querySelector('.dp-panel-primary-icon'),null);
 f.ctx.teardown();
});
test('extra thresholds track their own sensor and icons update without replacing values',()=>{
 const f=fixture();f.options.information[0].color_thresholds={values:[{value:0,color:'#36993B'},{value:8,color:'#E1463E'}],transition:'hard'};
 f.run();const item=f.root.querySelector('.dp-panel-information'),state=item.querySelector('.dp-panel-state');
 assert.equal(item.style.getPropertyValue('--dp-panel-information-color'),'#36993B');
 f.hass.states['sensor.ph'].state='8.5';f.run();assert.equal(item.style.getPropertyValue('--dp-panel-information-color'),'#E1463E');assert.equal(item.querySelector('.dp-panel-state'),state);
 f.options.information[0].enabled=false;f.run();assert.equal(f.root.querySelectorAll('.dp-panel-state').length,1);
 f.options.variant='panel';f.run();assert.equal(f.root.querySelector('.dp-panel-primary-icon'),null);f.ctx.teardown();
});
