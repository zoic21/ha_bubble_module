const {loadModule}=require('../../shared/test/module.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const context=vm.createContext({...require('./dom.cjs'),Intl,setTimeout,clearTimeout});
const code=loadModule('signature-compact').code;
const render=vm.runInContext('(function(hass,onTeardown,renderTemplate){return `'+code+'`;})',context);
function fixture(t,buttons,styles={}){
 const card=new context.Element(),state=new context.Element();state.className='bubble-state';card.append(state);
 const ctx={card,elements:{state},config:{card_type:'button',button_type:'name',entity:'sensor.demo',
  sub_button:{main:buttons},signature_compact:{sub_button_styles:styles}}};
 const hass={states:{'sensor.demo':{state:'17.4',attributes:{unit_of_measurement:'°C'}}}};
 const run=(template=v=>v)=>render.call(ctx,hass,fn=>ctx.teardown=fn,template);
 t.after(()=>ctx.teardown?.());return{ctx,hass,run};
}
test('flat padding follows effective background, grouped numbering and live options without changing configuration',t=>{
 const scale={values:[{value:0,color:'#2196f3'}]};
 const f=fixture(t,[{entity:'sensor.demo',css_class:'plain',show_background:false},
  {group:[{entity:'sensor.demo',css_class:'numeric'},{entity:'sensor.demo',css_class:'tinted',show_background:false}]}],
  {numeric:{color_thresholds:{...scale,background:false}},tinted:{background:'transparent',color_thresholds:scale}});
 const original=JSON.stringify(f.ctx.config);
 assert.match(f.run(),/ha-card\[data-dp-layout="compact"\] :is\(\.bubble-sub-button-1,\.bubble-sub-button-3\)\s*\{\s*padding-inline:4px !important/);
 assert.equal(JSON.stringify(f.ctx.config),original);
 f.ctx.config.signature_compact.flat_button_padding=2;
 assert.match(f.run(),/padding-inline:2px !important/);
 f.ctx.config.signature_compact.sub_button_styles.numeric.color_thresholds.background=true;
 f.ctx.config.sub_button.main[0].show_background=true;
 assert.doesNotMatch(f.run(),/padding-inline:/);
});
test('transparent templates shrink ordinary buttons while specialized controls retain their geometry',t=>{
 const buttons=['manual','switch','mode','metric','badge','slider'].map(css_class=>({entity:'sensor.demo',css_class,show_background:false}));
 buttons[1]={entity:'switch.demo',css_class:'switch',show_background:false,tap_action:{action:'toggle'}};
 buttons[5].sub_button_type='slider';
 const f=fixture(t,buttons,{manual:{background:'{{ surface }}'},switch:{type:'switch'},mode:{type:'mode'},metric:{type:'metric'},badge:{type:'mode_badge'}});
 f.hass.states['switch.demo']={state:'on',attributes:{}};
 assert.match(f.run(v=>v==='{{ surface }}'?'transparent':v),/\.bubble-sub-button-1\s*\{\s*padding-inline:4px !important/);
 assert.doesNotMatch(f.run(v=>v==='{{ surface }}'?'#abcdef':v),/padding-inline:/);
});
