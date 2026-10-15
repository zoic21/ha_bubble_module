const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const code = loadModule('signature-square').code;

async function illustrated(page, {width=180,mode='dark',plain=false,value='25.3',unit='°C',secondary='',index=1,icon=false}={}) {
  await render(page,{width,mode,plain});
  return page.evaluate(({code,value,unit,secondary,index,icon}) => {
    const shell=document.querySelector('[data-id="square"]'), shadow=shell.shadowRoot;
    const ctx=window.contexts.find(c=>c.card===shadow.querySelector('ha-card'));
    ctx.config.show_icon=icon;
    // Native Bubble applies this visibility before invoking module styles.
    ctx.elements.iconContainer.classList.toggle('hidden', !icon);
    ctx.config.signature_square={secondary,illustration:{image:'/local/atlas.webp',columns:4,rows:3,index}};
    ctx._hass.states[ctx.config.entity]={state:value,attributes:{unit_of_measurement:unit}};
    const css=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,x=>x);
    shadow.querySelectorAll('style')[1].textContent=css;
    const content=shadow.querySelector('.bubble-content-container'),state=shadow.querySelector('.bubble-state');
    const pseudo=getComputedStyle(content,'::after'),rect=state.getBoundingClientRect(),box=content.getBoundingClientRect();
    const second=shadow.querySelector('.dp-secondary');
    return {stateWidth:rect.width,stateScroll:state.scrollWidth,stateClient:state.clientWidth,
      imageWidth:parseFloat(pseudo.width),imageHeight:parseFloat(pseudo.height),imagePosition:pseudo.backgroundPosition,
      pointer:pseudo.pointerEvents,contentWidth:box.width,secondaryWidth:second?.getBoundingClientRect().width,
      icon:getComputedStyle(shadow.querySelector('.bubble-icon-container')).display,
      valueAction:JSON.parse(state.dataset.tapAction).action,template:shadow.querySelector('ha-card').getAttribute('data-dp-illustration')};
  },{code,value,unit,secondary,index,icon});
}

test('illustrated squares prioritize values and keep secondary full-width at mobile card widths', async t => {
  const page=await fixture(t);
  for(const mode of ['light','dark']) for(const plain of [false,true]) {
    for(const width of [142,156,170,180,190,220,288,328,358,382,600]) {
      for(const metric of [{value:'17.4',unit:'°C'},{value:'25.3',unit:'°C'},
        {value:'0.0',unit:'mm'},{value:'2.2',unit:'km/h',secondary:'Rafales · 4,0 km/h'}]) {
        const m=await illustrated(page,{width,mode,plain,...metric});
        assert.equal(m.stateScroll<=m.stateClient+1,true,JSON.stringify({width,metric,m}));
        assert.ok(m.imageWidth>=0 && m.imageWidth<=80.1);
        assert.ok(m.imageWidth<=m.contentWidth-m.stateWidth+1,'art overlaps value');
        assert.equal(m.pointer,'none');assert.equal(m.icon,'none');assert.equal(m.valueAction,'more-info');
        if(metric.secondary)assert.ok(Math.abs(m.secondaryWidth-m.contentWidth)<1,'secondary lost width');
      }
    }
  }
});

test('long/unavailable values reduce illustration space instead of clipping additional data', async t => {
  const page=await fixture(t);
  for(const width of [142,180,288]) {
    const ordinary=await illustrated(page,{width,value:'2.2',unit:'km/h'});
    const long=await illustrated(page,{width,value:'12345.6',unit:'km/h'});
    assert.ok(long.imageWidth<=ordinary.imageWidth,'long value did not take priority');
    const unavailable=await illustrated(page,{width,value:'unavailable',index:-1});
    assert.equal(unavailable.template,'no');
  }
});

test('illustration keeps a visible native icon clear of the heading when it is not hidden', async t => {
  const page=await fixture(t);
  await illustrated(page,{width:220,icon:true});
  const m=await page.evaluate(()=>{
    const root=document.querySelector('[data-id="square"]').shadowRoot;
    const name=root.querySelector('.bubble-name'),icon=root.querySelector('.bubble-icon-container');
    return {padding:parseFloat(getComputedStyle(name).paddingLeft),iconWidth:icon.getBoundingClientRect().width};
  });
  assert.ok(m.padding>=m.iconWidth+10);
});
