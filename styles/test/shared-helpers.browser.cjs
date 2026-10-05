const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),YAML=require('yaml');
const {fixture: browserFixture}=require('./browser.cjs');
const {render}=require('./fixtures.cjs');
const {readSource}=require('../../scripts/source-files.cjs');
const names=['signature-compact','signature-flow','signature-wind-rose','alert_manager'];
const codes=Object.fromEntries(names.map(name=>[name,Object.values(YAML.parse(fs.readFileSync(path.resolve(__dirname,'../../'+name+'/dist/'+name+'.yaml'),'utf8')))[0].code]));
async function fixture(t){
  const page=await browserFixture(t);await render(page,{mode:'dark',plain:true,width:600});
  await page.evaluate(codes=>{
    window.auditContext=id=>window.contexts.find(ctx=>ctx.card.getRootNode().host.dataset.id===id);
    window.auditRun=(ctx,name)=>{
      const value=new Function('hass','onTeardown','renderTemplate','return `'+codes[name]+'`;').call(ctx,ctx._hass,()=>{},(template,id)=>ctx._hass.states[id||ctx.config.entity]?.state||'');
      const root=ctx.card.getRootNode();let style=root.querySelector('[data-audit-module="'+name+'"]');
      if(!style){style=document.createElement('style');style.dataset.auditModule=name;root.append(style);}
      style.textContent=value;
    };
  },codes);return page;
}

test('named colors match across modules, remain live and invalid wind colors restore the semantic default',async t=>{
  const page=await fixture(t);
  const result=await page.evaluate(()=>{
    const compact=auditContext('compact'),flow=auditContext('flow'),wind=auditContext('wind');
    compact._hass.connection={};
    compact._hass.states['sensor.alert_manager_main_active']={state:'1',attributes:{alerts:[{id:'rule:test:sensor.demo',entity_id:'sensor.demo'}]}};
    compact._hass.states['sensor.alert_manager_main_pending']={state:'0',attributes:{alerts:[]}};
    const colors=()=>[getComputedStyle(compact.card.querySelector('.bubble-main-icon')).color,getComputedStyle(flow.card.querySelector('.sf-slot-1 .sf-icon')).color,getComputedStyle(wind.card.querySelector('.swr-sector')).fill,getComputedStyle(compact.card.querySelector('.am-alert-badge')).color];
    const cases=[];
    for(const value of ['blue','teal','red','#123456']){
      compact.config.signature_compact.color=value;flow.config.signature_flow.slots[1].color=value;wind.config.signature_wind_rose.color=value;
      compact.config.alert_manager={colors:{active:value}};
      auditRun(compact,'signature-compact');auditRun(flow,'signature-flow');auditRun(wind,'signature-wind-rose');auditRun(compact,'alert_manager');
      cases.push({value,colors:colors()});
    }
    for(const ctx of [compact,flow,wind]){
      if(ctx===compact)ctx.config.signature_compact.color='blue';
      else if(ctx===flow)ctx.config.signature_flow.slots[1].color='blue';
      else ctx.config.signature_wind_rose.color='blue';
    }
    compact.config.alert_manager={colors:{active:'blue'}};
    auditRun(compact,'signature-compact');auditRun(flow,'signature-flow');auditRun(wind,'signature-wind-rose');auditRun(compact,'alert_manager');
    document.body.style.setProperty('--blue-color','#654321');const live=colors();
    wind.config.signature_wind_rose.color='not-a-color';auditRun(wind,'signature-wind-rose');const invalid=getComputedStyle(wind.card.querySelector('.swr-sector')).fill;
    delete wind.config.signature_wind_rose.color;auditRun(wind,'signature-wind-rose');const absent=getComputedStyle(wind.card.querySelector('.swr-sector')).fill;
    return {cases,live,invalid,absent};
  });
  for(const item of result.cases)for(const color of item.colors)assert.equal(color,item.colors[0],item.value);
  assert.equal(result.cases[0].colors[0],'rgb(33, 150, 243)');
  assert.deepEqual(result.live,Array(4).fill('rgb(101, 67, 33)'));
  assert.equal(result.invalid,'rgb(77, 182, 172)');assert.equal(result.absent,result.invalid);
});

test('Flow and Compact resolve main templates and native precision consistently on existing nodes',async t=>{
  const page=await fixture(t);
  const result=await page.evaluate(()=>{
    const compact=auditContext('compact'),flow=auditContext('flow');
    compact.config.signature_compact.secondary='{{ states(entity) }}';flow.config.signature_flow.slots[1].primary='{{ states(entity) }}';
    auditRun(compact,'signature-compact');auditRun(flow,'signature-flow');
    const targets=[compact.card.querySelector('.dp-secondary').dataset.entity,flow.card.querySelector('.sf-slot-1 .sf-value').dataset.entity];
    const action=JSON.parse(flow.card.querySelector('.sf-slot-1 .sf-value').dataset.tapAction).action;
    for(const ctx of [compact,flow]){
      ctx._hass.entities={'sensor.demo':{display_precision:2}};ctx._hass.states['sensor.demo'].state='22.567';
      ctx._hass.states['sensor.demo'].attributes.suggested_display_precision=3;
    }
    flow.config.signature_flow.slots[1].primary='sensor.demo';delete flow.config.signature_flow.slots[1].primary_precision;
    auditRun(compact,'signature-compact');auditRun(flow,'signature-flow');
    const values=[compact.card.querySelector('.bubble-state .dp-value').textContent,flow._signatureFlow.nodes[1].number.textContent];
    return {targets,action,values};
  });
  assert.deepEqual(result.targets,['sensor.demo','sensor.demo']);assert.equal(result.action,'more-info');
  assert.deepEqual(result.values,['22,57','22,57']);
});

test('shared fragment defaults and neutral alert badges inherit native surfaces without Signature and follow live changes',async t=>{
  const page=await fixture(t);
  const fragments={tabs:readSource('shared/src/styles/period-tabs.css'),selected:readSource('shared/src/styles/period-tab-selected.css'),control:readSource('shared/src/styles/control-surface.css')};
  const result=await page.evaluate(fragments=>{
    const host=document.createElement('div');host.innerHTML='<style>.audit-tabs{'+fragments.tabs+'}.audit-selected{'+fragments.selected+'}.audit-control{'+fragments.control+'background:var(--signature-track)}</style><div class="audit-tabs"></div><div class="audit-selected"></div><div class="audit-control"></div>';
    document.body.append(host);
    const ctx=auditContext('compact');ctx.config.alert_manager={color_badge:false};ctx._hass.connection={};
    ctx._hass.states['sensor.alert_manager_main_active']={state:'1',attributes:{alerts:[{id:'rule:test:sensor.demo',entity_id:'sensor.demo'}]}};
    ctx._hass.states['sensor.alert_manager_main_pending']={state:'0',attributes:{alerts:[]}};
    auditRun(ctx,'alert_manager');const badge=ctx.card.querySelector('.am-alert-badge');
    const snapshots=[];
    for(const [surface,text] of [['#1c1c1c','#e1e1e1'],['#f2f2f2','#151515']]){
      document.body.style.setProperty('--ha-card-background',surface);document.body.style.setProperty('--card-background-color','#ff00ff');document.body.style.setProperty('--primary-text-color',text);
      const selected=getComputedStyle(host.querySelector('.audit-selected')).backgroundColor;
      const tabs=getComputedStyle(host.querySelector('.audit-tabs')).backgroundColor,control=getComputedStyle(host.querySelector('.audit-control')).backgroundColor;
      snapshots.push({selected,tabs,control,badge:getComputedStyle(badge).backgroundColor,color:getComputedStyle(badge).color});
    }
    document.body.style.setProperty('--signature-alert-badge-background','#abcdef');document.body.style.setProperty('--signature-alert-badge-neutral-color','#123456');
    return {snapshots,override:{badge:getComputedStyle(badge).backgroundColor,color:getComputedStyle(badge).color}};
  },fragments);
  for(const [i,item] of result.snapshots.entries()){
    assert.equal(item.selected,i?'rgb(242, 242, 242)':'rgb(28, 28, 28)');assert.equal(item.badge,item.selected);
    assert.equal(item.color,i?'rgb(21, 21, 21)':'rgb(225, 225, 225)');assert.equal(item.tabs,item.control);assert.notEqual(item.tabs,'rgba(0, 0, 0, 0)');
  }
  assert.deepEqual(result.override,{badge:'rgb(171, 205, 239)',color:'rgb(18, 52, 86)'});
});
