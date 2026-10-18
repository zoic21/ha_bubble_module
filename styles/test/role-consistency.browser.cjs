const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const codes = Object.fromEntries(['panel','room','compact','hue'].map(name => [name,loadModule('signature-'+name).code]));

test('Panel units, secondary lines and insets follow shared roles without a module rerender',async t => {
  const page = await fixture(t);
  for (const width of [288,328,358,382,600]) for (const mode of ['light','dark']) for (const plain of [false,true]) {
    await render(page,{width,mode,plain});
    const snapshots = await page.evaluate(code => {
      const ctx = contexts.find(c => c.card.getRootNode().host.dataset.id === 'square');ctx.teardown();
      ctx.config = {card_type:'button',button_type:'state',entity:'sensor.demo',show_state:true,signature_panel:{secondary:'Détail accentué',
        information:[{entity:'sensor.demo',name:'Jour',secondary:'Coût'},{entity:'sensor.demo',name:'Mois',secondary:'Total'}],illustration:{image:'/local/rack.webp'}}};
      const shadow = ctx.card.getRootNode(),style = shadow.querySelectorAll('style')[1];
      style.textContent = new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn => ctx.teardown=fn,v => v);
      const nodes = [...ctx.card.querySelectorAll('.dp-unit,.dp-secondary,.dp-panel-secondary')],css = style.textContent;
      const read = () => {
        const host = ctx.card.querySelector('.bubble-container'),s = getComputedStyle(host);
        const role = selector => [...ctx.card.querySelectorAll(selector)].map(e => {
          const c = getComputedStyle(e);return {size:c.fontSize,weight:c.fontWeight,color:c.color,spacing:c.letterSpacing,numeric:c.fontVariantNumeric,line:c.lineHeight,opacity:c.opacity,height:e.getBoundingClientRect().height};
        });
        const probe = document.createElement('span');probe.style.color='var(--secondary-text-color)';ctx.card.append(probe);
        const secondaryColor = getComputedStyle(probe).color;probe.remove();
        return {height:host.getBoundingClientRect().height,radius:s.borderRadius,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],
          units:role('.dp-unit'),values:role('.bubble-state,.dp-panel-state'),details:role('.dp-secondary,.dp-panel-secondary'),secondaryColor,
          unchanged:css===style.textContent && nodes.every(e => e.isConnected)};
      };
      const before = read();
      document.body.style.setProperty('--signature-secondary-font-size','19px');
      document.body.style.setProperty('--signature-caption-font-size','17px');
      document.body.style.setProperty('--signature-card-border-radius','18px');
      document.body.style.setProperty('--secondary-text-color','#765432');
      return [before,read()];
    },codes.panel);
    for (const [i,m] of snapshots.entries()) {
      const hint = JSON.stringify({width,mode,plain,i,m});
      assert.equal(m.height,118,hint);assert.equal(m.radius,i?'18px':'22px',hint);
      assert.deepEqual(m.padding,['9px','11px','9px','11px'],hint);assert.equal(m.unchanged,true,hint);
      assert.equal(m.units.length,3,hint);assert.equal(m.details.length,3,hint);
      for (const unit of m.units) {assert.equal(unit.weight,'400',hint);assert.equal(unit.color,m.secondaryColor,hint);assert.ok(['normal','0px'].includes(unit.spacing),hint);}
      for (const value of m.values) assert.equal(value.numeric,'tabular-nums',hint);
      for (const detail of m.details) {
        assert.equal(detail.size,i?'17px':'12px',hint);assert.equal(detail.color,m.secondaryColor,hint);assert.equal(detail.opacity,'1',hint);
        assert.ok(Math.abs(parseFloat(detail.line)-(i?20.4:16))<.02,hint);
        assert.ok(detail.height >= parseFloat(detail.line)-.02,hint);
      }
    }
  }
});

test('Panel compound durations preserve their text spaces without extra unit margins',async t => {
  const page = await fixture(t);await render(page,{width:328});
  const result = await page.evaluate(code => {
    const ctx=contexts.find(c=>c.card.getRootNode().host.dataset.id==='square');ctx.teardown();
    ctx.config={card_type:'button',button_type:'state',entity:'sensor.demo',show_state:true,signature_panel:{state:'1 h 05 min'}};
    ctx.card.getRootNode().querySelectorAll('style')[1].textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
    return {text:ctx.elements.state.textContent,units:[...ctx.elements.state.querySelectorAll('.dp-duration-unit')].map(e=>({text:e.textContent,margin:getComputedStyle(e).marginInlineStart}))};
  },codes.panel);
  assert.equal(result.text,'1 h 05 min');assert.deepEqual(result.units,[{text:' h',margin:'0px'},{text:' min',margin:'0px'}]);
});

test('Room main-value units retain normal weight and secondary color',async t => {
  const page = await fixture(t);
  for (const mode of ['light','dark']) for (const plain of [false,true]) {
    await render(page,{width:328,mode,plain});
    const result = await page.evaluate(code => {
      const ctx = contexts.find(c => c.card.getRootNode().host.dataset.id === 'room-no-controls');
      ctx.config = {...ctx.config,button_type:'state',show_state:true,signature_room:{room_state_as_value:true}};
      ctx.elements.state.classList.remove('hidden');
      ctx.card.getRootNode().querySelectorAll('style')[1].textContent = new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn => ctx.teardown=fn,v => v);
      const unit = getComputedStyle(ctx.card.querySelector('.dp-unit'));
      const probe = document.createElement('span');probe.style.color='var(--secondary-text-color)';ctx.card.append(probe);
      const color = getComputedStyle(probe).color;probe.remove();
      return {size:unit.fontSize,weight:unit.fontWeight,spacing:unit.letterSpacing,color:unit.color,expectedColor:color};
    },codes.room);
    assert.equal(result.size,'13px');assert.equal(result.weight,'400');assert.ok(['normal','0px'].includes(result.spacing));assert.equal(result.color,result.expectedColor);
  }
});

test('Hue scene labels and their two-line space follow secondary typography live',async t => {
  const page = await fixture(t);
  for (const width of [80,100,144,288,328,358,382,600]) for (const mode of ['light','dark']) for (const plain of [false,true]) {
    await render(page,{width,mode,plain});
    const result = await page.evaluate(({compact,hue}) => {
      const ctx = contexts.find(c => c.card.getRootNode().host.dataset.id === 'compact-standard');
      ctx.config = {...ctx.config,signature_compact:{},signature_hue:{mode:'scene',palette:'#123456,#abcdef,#123abc'}};
      const style = ctx.card.getRootNode().querySelectorAll('style')[1];
      style.textContent = new Function('hass','onTeardown','renderTemplate','return `'+compact+'`;').call(ctx,ctx._hass,fn => ctx.teardown=fn,v => v)
        +new Function('renderTemplate','return `'+hue+'`;').call(ctx,v => v);
      const css = style.textContent,name = ctx.card.querySelector('.bubble-name');name.textContent='Crépuscule et lumière du salon';
      const read = () => {
        const host = ctx.card.querySelector('.bubble-container'),content = ctx.card.querySelector('.bubble-content-container'),s = getComputedStyle(name);
        return {size:s.fontSize,line:s.lineHeight,height:host.getBoundingClientRect().height,space:content.getBoundingClientRect().height,
          paletteBottom:parseFloat(getComputedStyle(host,'::before').bottom),unchanged:css===style.textContent && name===ctx.card.querySelector('.bubble-name')};
      };
      const before = read();document.body.style.setProperty('--signature-secondary-font-size','17px');return [before,read()];
    },codes);
    assert.equal(result[0].size,'13px');assert.equal(result[0].line,'16px');assert.equal(result[0].space,40);
    assert.equal(result[1].size,'17px');assert.equal(result[1].line,'20.4px');
    for (const m of result) {assert.equal(m.height,112);assert.equal(m.unchanged,true);assert.ok(Math.abs(m.space-m.paletteBottom)<.02);assert.ok(m.space>=2*parseFloat(m.line)-.02);}
  }
});

test('Hue animation switches share the native Signature switch geometry',async t => {
  const page = await fixture(t);
  await render(page,{width:600});
  const result = await page.evaluate(({compact,hue}) => {
    const ctx = contexts.find(c => c.card.getRootNode().host.dataset.id === 'compact-standard');
    const classes = ['power-switch','hue-animation-start','hue-animation-stop','hue-animation-disabled'];
    ctx.config = {...ctx.config,signature_compact:{sub_button_styles:{'power-switch':{type:'switch'}}},signature_hue:{mode:'animation'},
      sub_button:{main:classes.map(css_class => ({entity:'light.demo',css_class,tap_action:{action:'toggle'}}))}};
    const list = ctx.card.querySelector('.bubble-sub-button-container');
    list.innerHTML = classes.map((cls,i) => '<div class="bubble-sub-button bubble-sub-button-'+(i+1)+' '+cls+'"><ha-icon class="bubble-sub-button-icon"></ha-icon><ha-ripple></ha-ripple></div>').join('');
    const nodes = [...list.children];
    ctx.card.getRootNode().querySelectorAll('style')[1].textContent = new Function('hass','onTeardown','renderTemplate','return `'+compact+'`;').call(ctx,ctx._hass,fn => ctx.teardown=fn,v => v)
      +new Function('renderTemplate','return `'+hue+'`;').call(ctx,v => v);
    return nodes.map(e => {
      const read = pseudo => {const s=getComputedStyle(e,pseudo);return [s.width,s.height,s.left,s.top,s.borderRadius];};
      const s=getComputedStyle(e),r=getComputedStyle(e.querySelector('ha-ripple'));
      return {target:[s.width,s.height,s.borderRadius],track:read('::before'),thumb:read('::after'),feedback:[r.inset,r.borderRadius],same:e===list.children[nodes.indexOf(e)]};
    });
  },codes);
  assert.deepEqual(result[0].target,['52px','34px','17px']);
  assert.deepEqual(result[0].track,['48px','28px','2px','3px','14px']);
  assert.deepEqual(result[0].thumb,['24px','24px','4px','5px','50%']);
  for (const item of result) assert.deepEqual(item,result[0]);
});
