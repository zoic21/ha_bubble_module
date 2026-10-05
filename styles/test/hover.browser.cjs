const assert = require('node:assert/strict');
const {test} = require('node:test');
const {loadModule} = require('../../shared/test/module.cjs');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');

const definitions = Object.fromEntries(['compact','square','room','header'].map(layout =>
  [layout,loadModule('signature-'+layout).code]));

// Relevant Bubble Card 3.4.1 geometry and hit testing. The ripple fixture uses
// HA's parent pointer-enter/leave contract and shadow surface, not HA's runtime.
const nativeCSS = `
 .bubble-container { overflow:hidden; }
 .bubble-wrapper { position:absolute; justify-content:space-between; }
 .bubble-background { display:flex; position:absolute; width:100%; height:100%; border-radius:var(--bubble-border-radius,28px); }
 .bubble-content-container { display:contents; padding:0; gap:0; }
 .bubble-name-container { display:flex; flex-direction:column; justify-content:center; flex-grow:1; position:relative; overflow:hidden; pointer-events:none; }
 .bubble-name,.bubble-state { position:relative; }
 .bubble-icon-container { position:relative; overflow:hidden; }
 .bubble-sub-button { position:relative; height:36px; min-width:36px; padding:0 8px; border-radius:var(--bubble-sub-button-border-radius,28px); overflow:hidden; pointer-events:auto; background:var(--secondary-background-color); }
 .bubble-cover-button,.bubble-media-button,.bubble-climate-minus-button,.bubble-climate-plus-button { display:flex; position:relative; overflow:hidden; }
`;

async function prepare(page, scenario = {}) {
  await render(page, scenario);
  await page.evaluate(({nativeCSS,definitions,trailing,switches}) => {
    if (!customElements.get('ha-ripple')) customElements.define('ha-ripple', class extends HTMLElement {
      connectedCallback() {
        this.attachShadow({mode:'open'}).innerHTML = `<style>
          :host { display:flex; margin:auto; pointer-events:none; }
          :host,.surface { border-radius:inherit; position:absolute; inset:0; overflow:hidden; }
          .hover { position:absolute; inset:0; background:var(--ha-ripple-hover-color,var(--ha-ripple-color,var(--secondary-text-color))); opacity:0; }
          .hovered .hover { opacity:var(--ha-ripple-hover-opacity,.08); }
          :host([disabled]) { display:none; }
        </style><div class="surface"><div class="hover"></div></div>`;
        this.parentElement.addEventListener('pointerenter', event => {
          if (event.pointerType !== 'touch') this.shadowRoot.querySelector('.surface').classList.add('hovered');
        });
        this.parentElement.addEventListener('pointerleave', () => this.shadowRoot.querySelector('.surface').classList.remove('hovered'));
      }
    });
    window.clicks = [];
    for (const ctx of window.contexts) {
      const root = ctx.card, shadow = root.getRootNode();
      shadow.querySelector('style').textContent += nativeCSS;
      const layout = root.dataset.dpLayout;
      if ((trailing || switches) && ['compact','square'].includes(layout)) {
        const button = {entity:'light.demo',css_class:'test-control',tap_action:{action:'toggle'}};
        ctx.config = {...ctx.config,sub_button:{main:[button]}};
        const key = 'signature_'+layout;
        ctx.config[key] = {...ctx.config[key],...(switches ? {sub_button_styles:{'test-control':{type:'switch'}}} : {})};
        root.querySelector('.bubble-sub-button-container').innerHTML = '<div class="bubble-sub-button bubble-sub-button-1 test-control bubble-action"><ha-icon class="bubble-sub-button-icon"></ha-icon></div>';
        shadow.lastElementChild.textContent = new Function('hass','onTeardown','renderTemplate','return `'+definitions[layout]+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
      }
      const background = root.querySelector('.bubble-background');
      background.classList.add('bubble-action');
      background.dataset.tapAction = JSON.stringify({action:'navigate',navigation_path:'#details'});
      const icon = root.querySelector('.bubble-main-icon-container');
      icon.classList.add('bubble-action');
      icon.dataset.entity = ctx.config.entity;
      icon.dataset.tapAction = JSON.stringify({action:'more-info'});
      for (const element of root.querySelectorAll('.bubble-background,.bubble-main-icon-container,.bubble-sub-button,.bubble-cover-button,.bubble-media-button,.bubble-climate-minus-button,.bubble-climate-plus-button')) element.append(document.createElement('ha-ripple'));
      root.addEventListener('click', event => {
        const target = event.composedPath().find(element => element.classList?.contains('bubble-action'));
        if (target) window.clicks.push({id:root.getRootNode().host.dataset.id,target:target.className,entity:target.dataset.entity,action:target.dataset.tapAction});
      });
    }
  },{nativeCSS,definitions,...scenario});
}

const card = (page,id) => page.locator('[data-id="'+id+'"]');
async function pointAt(locator) {
  const box = await locator.boundingBox();
  assert.ok(box,'Missing pointer target');
  return {x:box.x+box.width/2,y:box.y+box.height/2};
}
async function bounds(page,id) {
  return card(page,id).evaluate(shell => {
    const root = shell.shadowRoot;
    const read = selector => {
      const el = root.querySelector(selector), rect = el.getBoundingClientRect(), s = getComputedStyle(el);
      return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,radius:s.borderRadius};
    };
    return {container:read('.bubble-container'),background:read('.bubble-background'),ripple:read('.bubble-background > ha-ripple')};
  });
}
function fills(actual,expected,label) {
  for (const key of ['x','y','width','height']) assert.ok(Math.abs(actual[key]-expected[key]) < .1,label+' '+key+': '+actual[key]+' / '+expected[key]);
}
async function hoverOpacity(page,id,selector) {
  return card(page,id).locator(selector+' > ha-ripple').evaluate(el => getComputedStyle(el.shadowRoot.querySelector('.hover')).opacity);
}

test('main hover feedback fills each native tile, including flex padding and trailing grid controls', async t => {
  const page = await fixture(t);
  for (const width of [288,328,358,382,600]) for (const mode of ['light','dark']) for (const plain of [false,true]) {
    await prepare(page,{width,mode,plain,trailing:true});
    for (const id of ['compact','compact-standard','cover','climate','number','square','square-auto','room','room-no-controls','header']) {
      const b = await bounds(page,id);
      const inside = {...b.container,x:b.container.x+(id==='header'?0:1),y:b.container.y+(id==='header'?0:1),width:b.container.width-(id==='header'?0:2),height:b.container.height-(id==='header'?0:2)};
      fills(b.background,inside,id+' background');
      fills(b.ripple,b.background,id+' ripple');
      assert.equal(b.ripple.radius,b.background.radius);
    }
  }
});

test('compact names pass hover and navigation through while values and controls keep separate actions', async t => {
  const page = await fixture(t);
  await prepare(page,{trailing:true});
  for (const id of ['compact','compact-standard','cover','climate','square','room-no-controls']) {
    const name = card(page,id).locator('.bubble-name');
    const point = await pointAt(name);
    await page.mouse.move(point.x,point.y);
    assert.equal(await hoverOpacity(page,id,'.bubble-background'),'0.08',id+' name blocks the native background');
    await page.mouse.click(point.x,point.y);
    const click = await page.evaluate(() => window.clicks.at(-1));
    assert.equal(click.id,id);assert.match(click.target,/bubble-background/);
    assert.equal(JSON.parse(click.action).navigation_path,'#details');
  }
  await card(page,'compact').locator('.bubble-state').click();
  let click = await page.evaluate(() => window.clicks.at(-1));
  assert.equal(click.entity,'sensor.demo');assert.equal(JSON.parse(click.action).action,'more-info');
  await card(page,'compact').locator('.bubble-main-icon-container').click();
  click = await page.evaluate(() => window.clicks.at(-1));
  assert.match(click.target,/bubble-main-icon-container/);assert.equal(JSON.parse(click.action).action,'more-info');
  await card(page,'compact').locator('.test-control').hover();
  assert.equal(await hoverOpacity(page,'compact','.bubble-background'),'0');
  assert.equal(await hoverOpacity(page,'compact','.test-control'),'0.08');
  await card(page,'compact').locator('.test-control').click();
  click = await page.evaluate(() => window.clicks.at(-1));assert.match(click.target,/test-control/);
});

test('other native controls retain their ripple bounds and custom canvases hide native feedback', async t => {
  const page = await fixture(t);
  await prepare(page,{});
  for (const [id,selector] of [['cover','.bubble-cover-button'],['media','.bubble-media-button'],['room','.room-control-light']]) {
    const result = await card(page,id).locator(selector).evaluate(el => {
      const read = node => {
        const rect = node.getBoundingClientRect();
        return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,radius:getComputedStyle(node).borderRadius};
      };
      return {control:read(el),ripple:read(el.querySelector('ha-ripple'))};
    });
    fills(result.ripple,result.control,id+' control');
    assert.equal(result.ripple.radius,result.control.radius);
  }
  for (const id of ['flow','weather-ribbon','weather-summary','weather-ranges','wind']) {
    assert.equal(await card(page,id).locator('.bubble-wrapper').evaluate(el => getComputedStyle(el).display),'none',id+' native feedback still visible');
  }
});

test('switch hover follows the visible track and preserves its larger native target', async t => {
  const page = await fixture(t);
  await prepare(page,{switches:true});
  for (const id of ['compact','square']) {
    const result = await card(page,id).locator('.test-control').evaluate(el => {
      const track = getComputedStyle(el,'::before'), ripple = el.querySelector('ha-ripple');
      const r = ripple.getBoundingClientRect(), e = el.getBoundingClientRect();
      return {target:{width:e.width,height:e.height},track:{x:e.x+parseFloat(track.left),y:e.y+parseFloat(track.top),width:parseFloat(track.width),height:parseFloat(track.height)},ripple:{x:r.x,y:r.y,width:r.width,height:r.height,radius:getComputedStyle(ripple).borderRadius}};
    });
    assert.deepEqual(result.target,{width:52,height:34});
    fills(result.ripple,result.track,id+' switch');assert.equal(result.ripple.radius,'14px');
  }
});

test('pointer hover clears on leave, respects theme changes and stays absent on touch', async t => {
  const page = await fixture(t);
  await prepare(page,{});
  const point = await pointAt(card(page,'compact').locator('.bubble-name'));
  await page.mouse.move(point.x,point.y);
  assert.equal(await hoverOpacity(page,'compact','.bubble-background'),'0.08');
  const color = () => card(page,'compact').locator('.bubble-background > ha-ripple').evaluate(el => getComputedStyle(el.shadowRoot.querySelector('.hover')).backgroundColor);
  const light = await color();
  await page.evaluate(() => document.body.style.setProperty('--secondary-text-color','#9b9b9b'));
  assert.notEqual(await color(),light);
  await page.mouse.move(0,0);
  assert.equal(await hoverOpacity(page,'compact','.bubble-background'),'0');
  const touch = await fixture(t,{hasTouch:true});
  await prepare(touch,{});
  const tap = await pointAt(card(touch,'compact').locator('.bubble-name'));
  await touch.touchscreen.tap(tap.x,tap.y);
  assert.equal(await hoverOpacity(touch,'compact','.bubble-background'),'0');
});
