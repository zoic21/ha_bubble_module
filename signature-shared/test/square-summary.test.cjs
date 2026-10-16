const assert = require('node:assert/strict');
const vm = require('node:vm');
const {test} = require('node:test');
const {loadModule} = require('../../shared/test/module.cjs');
const definition = loadModule('signature-square');
const context = vm.createContext({...require('./dom.cjs'), Intl, setTimeout, clearTimeout});
const render = vm.runInContext('(function(hass,onTeardown,renderTemplate){return `' + definition.code + '`;})', context);

function fixture(summary={entity:'sensor.power',name:'Puissance',secondary:'sensor.duration'}) {
  const {Element}=context,root=new Element(),content=new Element(),names=new Element(),state=new Element(),icon=new Element();
  content.className='bubble-content-container';names.className='bubble-name-container';state.className='bubble-state';
  root.append(content);content.append(icon,names);names.append(state);
  const config={card_type:'button',button_type:'state',entity:'sensor.energy',show_icon:false,signature_square:{secondary:'sensor.soc',summary}};
  const ctx={card:root,config,elements:{state,contentContainer:content,nameContainer:names,iconContainer:icon}};
  const hass={locale:{language:'fr-FR',number_format:'space_comma'},states:{
    'sensor.energy':{state:'3.4',attributes:{unit_of_measurement:'kWh'}},
    'sensor.soc':{state:'42',attributes:{unit_of_measurement:'%'}},
    'sensor.power':{state:'385',attributes:{unit_of_measurement:'W'}},
    'sensor.duration':{state:'8 h 47 min restantes',attributes:{}}
  }};
  return {root,ctx,hass,state,run:(template=x=>x)=>render.call(ctx,hass,fn=>ctx.teardown=fn,template)};
}

test('wide summary retains the primary nodes, units and four separate more-info targets',t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());f.run();
  assert.equal(f.root.getAttribute('data-dp-square-mode'),'summary');
  assert.equal(f.state.textContent,'3,4kWh');assert.equal(f.ctx.elements.state,f.state);
  for(const [selector,entity] of [['.bubble-state','sensor.energy'],['.dp-secondary','sensor.soc'],['.dp-summary-state','sensor.power'],['.dp-summary-secondary','sensor.duration']]){
    const el=f.root.querySelector(selector);assert.equal(el.dataset.entity,entity);
    assert.equal(JSON.parse(el.dataset.tapAction).action,'more-info');
  }
  assert.equal(f.root.querySelector('.dp-summary-state').textContent,'385W');
  assert.equal(f.root.querySelector('.dp-summary-secondary').textContent,'8 h 47 min restantes');
});

test('summary values and Jinja stay live through cached updates and missing states are explicit',t=>{
  const f=fixture({entity:'sensor.power',name:'{{ label }}',secondary:"{{ states('sensor.duration') }}"});t.after(()=>f.ctx.teardown());
  let label='En décharge',detail='8 h restantes';const template=s=>s.includes('label')?label:detail;
  f.run(template);const runtime=f.ctx._signatureSquareRuntime,css=runtime.styleCSS,group=runtime.summaryEl;
  label='En charge';detail='2 h restantes';f.hass.states['sensor.power'].state='-700';f.run(template);
  assert.equal(f.ctx._signatureSquareRuntime,runtime);assert.equal(runtime.styleCSS,css);assert.equal(runtime.summaryEl,group);
  assert.equal(group.querySelector('.dp-summary-name').textContent,label);assert.equal(group.querySelector('.dp-summary-state').textContent,'-700W');
  assert.equal(group.querySelector('.dp-summary-secondary').textContent,detail);
  f.hass.states['sensor.power'].state='unavailable';f.run(template);assert.equal(group.querySelector('.dp-summary-state').textContent,'—');
  delete f.hass.states['sensor.power'];f.run(template);assert.equal(group.querySelector('.dp-summary-state').textContent,'—');
});

test('summary entity changes replace cached action targets and disabling it restores the square',t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());f.run();const old=f.root.querySelector('.dp-summary'),detail=old.querySelector('.dp-summary-secondary');
  f.ctx.config.signature_square.summary={entity:'sensor.soc',name:'Charge',secondary:'sensor.energy'};f.run();
  assert.equal(f.root.contains(old),false);assert.equal(detail.dataset.entity,undefined);
  const next=f.root.querySelector('.dp-summary');assert.equal(next.querySelector('.dp-summary-state').dataset.entity,'sensor.soc');
  f.ctx.config.signature_square.summary.secondary='sensor.power';f.run();
  assert.equal(next.querySelector('.dp-summary-secondary').dataset.entity,'sensor.power');
  delete f.ctx.config.signature_square.summary;f.run();
  assert.equal(f.root.getAttribute('data-dp-square-mode'),'standard');assert.equal(f.root.querySelector('.dp-summary'),null);
  assert.equal(f.state.dataset.entity,'sensor.energy');assert.equal(f.root.querySelector('.dp-secondary').dataset.entity,'sensor.soc');
});

test('summary nodes and delegated data are cleaned on version replacement and teardown',()=>{
  const f=fixture();f.run();const old=f.ctx._signatureSquareRuntime,group=old.summaryEl,value=group.querySelector('.dp-summary-state');
  old.version='old';f.run();const current=f.ctx._signatureSquareRuntime;
  assert.notEqual(current,old);assert.equal(f.root.contains(group),false);assert.equal(value.dataset.entity,undefined);
  const next=current.summaryEl;old.dispose();assert.equal(f.root.contains(next),true);
  f.ctx.teardown();assert.equal(f.root.contains(next),false);assert.equal(f.root.getAttribute('data-dp-square-mode'),null);
});

test('invalid or incompatible summary settings do not change the regular layout',t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());
  for(const summary of [undefined,[],{}, {entity:'bad'}, {entity:'sensor.x;bad'}]){
    f.ctx.config.signature_square.summary=summary;f.run();assert.equal(f.root.querySelector('.dp-summary'),null);assert.equal(f.root.getAttribute('data-dp-square-mode'),'standard');
  }
  f.ctx.config.signature_square.summary={entity:'sensor.power'};f.ctx.config.signature_square.auto_height=true;f.run();assert.equal(f.root.querySelector('.dp-summary'),null);
  delete f.ctx.config.signature_square.auto_height;f.ctx.config.signature_square.controls='measure';f.run();assert.equal(f.root.querySelector('.dp-summary'),null);
  assert.ok(definition.editor[1].fields.summary.selector.object);
});

test('a single-measurement banner keeps the native value and secondary without creating a second group',t=>{
  const f=fixture({enabled:true});t.after(()=>f.ctx.teardown());
  const before=f.root.querySelectorAll('.dp-summary').length;f.run();
  assert.equal(f.root.getAttribute('data-dp-square-mode'),'summary');
  assert.equal(f.root.getAttribute('data-dp-summary-single'),'yes');
  assert.equal(f.root.querySelectorAll('.dp-summary').length,before);
  assert.equal(f.ctx._signatureSquareRuntime.summaryEl,null);
  assert.equal(f.ctx.elements.state,f.state);assert.equal(f.state.textContent,'3,4kWh');
  assert.equal(f.state.dataset.entity,'sensor.energy');assert.equal(f.root.querySelector('.dp-secondary').dataset.entity,'sensor.soc');
});

test('switching between one and two measurements restores delegated targets without duplicates',t=>{
  const f=fixture();t.after(()=>f.ctx.teardown());f.run();const old=f.root.querySelector('.dp-summary'),value=old.querySelector('.dp-summary-state');
  f.ctx.config.signature_square.summary={enabled:true};f.run();
  assert.equal(f.root.contains(old),false);assert.equal(value.dataset.entity,undefined);
  assert.equal(f.root.getAttribute('data-dp-summary-single'),'yes');
  f.ctx.config.signature_square.summary={entity:'sensor.power'};f.run();
  assert.equal(f.root.getAttribute('data-dp-summary-single'),'no');assert.equal(f.root.querySelectorAll('.dp-summary').length,1);
  f.ctx.config.signature_square.summary.enabled=false;f.run();
  assert.equal(f.root.getAttribute('data-dp-square-mode'),'standard');assert.equal(f.root.getAttribute('data-dp-summary-single'),null);
  assert.equal(f.root.querySelector('.dp-summary'),null);
  f.ctx.config.signature_square.summary={enabled:true,entity:'invalid'};f.run();
  assert.equal(f.root.getAttribute('data-dp-square-mode'),'standard');
});
