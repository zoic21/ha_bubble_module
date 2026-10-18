const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadModule}=require('../../shared/test/module.cjs');
const {Element,document,MutationObserver,CSS,CustomEvent}=require('./dom.cjs');
Object.assign(globalThis,{document,MutationObserver,CSS,CustomEvent});
const render=new Function('hass','onTeardown','renderTemplate','return `'+loadModule('signature-compact').code+'`;');
function fixture(t,kind='climate'){
 const root=new Element(),ha=new Element('ha-card'),wrapper=new Element(),state=new Element();
 wrapper.className='bubble-wrapper';root.append(ha);ha.append(wrapper);wrapper.append(state);
 const mode={entity:'automation.demo',name:'{{ mode }}',show_name:true,show_icon:false,show_state:false,
  tap_action:{action:'toggle'},hold_action:{action:'more-info',entity:'climate.demo'}};
 const spec={type:'mode_badge',color:'{{ fg }}',background:'{{ bg }}'};
 const ctx={card:root,elements:{state},config:{card_type:kind,button_type:'state',entity:kind+'.demo',
  sub_button:{main:[mode]},signature_compact:{sub_button_styles:{1:spec}}}};
 const hass={states:{[kind+'.demo']:{state:kind==='cover'?'closed':'heat',attributes:{temperature:20.5}}}};
 const run=(name='Auto')=>render.call(ctx,hass,fn=>ctx.teardown=fn,value=>({'{{ mode }}':name,'{{ fg }}':'#ffffff','{{ bg }}':'#36993B'}[value]??value));
 t.after(()=>ctx.teardown?.());return{ctx,mode,spec,run};
}
test('mode badges reuse the full native mode name and actions, with live first letters',t=>{
 for(const kind of ['cover','climate']){
  const {ctx,run}=fixture(t,kind),before=JSON.stringify(ctx.config);
  for(const name of ['Auto','Manuel','—','']){
   const css=run(name);
   assert.match(css,/width:\s*44px\s*!important/);
   assert.match(css,/width:\s*14px/);
   assert.match(css,new RegExp('content:\\s*'+JSON.stringify(name[0]||'—')));
   assert.match(css,/--dp-mode-badge-background:#36993B/);
   assert.match(css,/background:\s*transparent\s*!important/);
   assert.match(css,/clip-path:\s*inset\(50%\)/);
   assert.equal(JSON.stringify(ctx.config),before);
  }
 }
});
test('badge placement is opt-in and restores ordinary controls when removed',t=>{
 const {ctx,spec,run}=fixture(t);assert.match(run(),/data-dp-mode-badge="yes"/);
 spec.type='mode';assert.doesNotMatch(run(),/data-dp-mode-badge="yes"/);
 assert.equal(ctx.card.getAttribute('data-dp-mode-badge'),'no');
 spec.type='mode_badge';assert.match(run(),/data-dp-mode-badge="yes"/);
});
test('unsupported, unnamed, specialized and ambiguous controls retain native geometry',t=>{
 for(const variant of ['button','hidden-icon','unnamed','state','dropdown','multiple']){
  const {ctx,mode,run}=fixture(t);
  if(variant==='button')ctx.config.card_type='button';
  if(variant==='hidden-icon')ctx.config.show_icon=false;
  if(variant==='unnamed')mode.show_name=false;
  if(variant==='state')mode.show_state=true;
  if(variant==='dropdown')mode.sub_button_type='dropdown';
  if(variant==='multiple'){
   ctx.config.sub_button.main.push({...mode});ctx.config.signature_compact.sub_button_styles[2]={type:'mode_badge'};
  }
  const css=run();
  assert.doesNotMatch(css,/data-dp-mode-badge="yes"/,variant);
  assert.match(css,/background:#36993B/,variant);
 }
});
