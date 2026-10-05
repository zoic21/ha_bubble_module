const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test, before, after} = require('node:test');
const {chromium} = require('playwright');
const YAML = require('yaml');
const {theme, nativeModes} = require('./fixtures.cjs');
const root = path.resolve(__dirname, '../..');
const definition = YAML.parse(fs.readFileSync(path.join(root, 'signature-navigation/dist/signature-navigation.yaml'), 'utf8')).signature_navigation;
const example = YAML.parse(fs.readFileSync(path.join(root, 'signature-navigation/examples/home.yaml'), 'utf8'));
// Minimal native footer/group/ripple cascade, based on Bubble Card 3.4.1.
const native = `
  ha-card { display:block; position:relative; font:14px/1.3 sans-serif; }
  .bubble-container { display:flex; position:relative; width:100%; box-sizing:border-box; overflow:hidden; border-radius:28px; }
  ha-card.footer-mode { position:fixed; bottom:var(--bubble-footer-bottom,16px); --start:var(--bubble-content-inline-start,0px); }
  ha-card.footer-mode:not(.footer-full-width) { width:var(--bubble-footer-width,500px); left:calc(var(--start) + (100% - var(--start) - var(--bubble-footer-width,500px))/2); }
  @media(max-width:600px) { ha-card.footer-mode:not(.footer-full-width) { width:calc(100% - 16px); left:8px; } }
  ha-card.footer-mode .bubble-container { box-shadow:2px 2px 40px #0006; }
  ha-card.footer-mode .bubble-container::before { content:''; position:absolute; inset:0; background:#fff; opacity:.2; }
  .bubble-sub-button-bottom-container { position:absolute; display:flex; width:calc(100% - 16px); margin:0 8px 8px; gap:8px; pointer-events:none; }
  .bubble-sub-button-alignment-lane { display:flex; flex:1; min-width:0; gap:8px; align-items:center; }
  .bubble-sub-button-group { display:flex; position:relative; flex:1; min-width:0; gap:8px; align-items:center; }
  .bubble-sub-button { display:flex; position:relative; align-items:center; justify-content:center; box-sizing:border-box; min-width:36px; height:36px; border-radius:18px; padding:0 8px; pointer-events:auto; }
  .bubble-sub-button-icon { display:block; width:var(--mdc-icon-size,24px); height:var(--mdc-icon-size,24px); }
  ha-ripple { display:block; position:absolute; inset:0; pointer-events:none; --ha-ripple-hover-opacity:.08; }
  .hidden,[hidden] { display:none!important; }
`;
let browser;
before(async () => {
  browser = await chromium.launch({headless:true,
    ...(process.env.BUBBLE_STYLE_BROWSER_PATH ? {executablePath:process.env.BUBBLE_STYLE_BROWSER_PATH} : {}),
    args:['--no-sandbox', '--disable-dev-shm-usage']});
});
after(async () => { await browser?.close(); });

async function fixture(t, {width=1280, touch=false, mode='light', plain=false, options={}, sidebar=0}={}) {
  const page = await browser.newPage({viewport:{width,height:240},hasTouch:touch});
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  t.after(async()=>{await page.close();assert.deepEqual(errors,[]);});
  await page.route('http://navigation.test/**',route=>route.fulfill({contentType:'text/html',body:'<body style="margin:0"></body>'}));
  await page.goto('http://navigation.test/lovelace/summary-home');
  const vars={...nativeModes[mode],...(plain?{}:{...theme,...theme.modes[mode]}),
    'blue-color':'#2196f3','bubble-content-inline-start':sidebar+'px'};
  delete vars.modes;
  await page.evaluate(({native,example,code,vars,options})=>{
    document.body.style.backgroundColor='var(--primary-background-color)';
    for(const [name,value] of Object.entries(vars))document.body.style.setProperty('--'+name,value);
    const shell=document.createElement('div');document.body.append(shell);
    const shadow=shell.attachShadow({mode:'open'});
    shadow.innerHTML='<style>'+native+'</style><ha-card class="footer-mode"><div class="bubble-container"><div class="bubble-sub-button-container"></div><div class="bubble-sub-button-bottom-container"><div class="bubble-sub-button-alignment-lane"><div class="bubble-sub-button-group"></div></div></div></div></ha-card>';
    const card=shadow.querySelector('ha-card');
    card.style.cssText='background:white;border:1px solid red;box-shadow:0 2px 20px red';
    const group=shadow.querySelector('.bubble-sub-button-group');
    window.nativeClicks=[];
    example.sub_button.bottom.forEach((route,index)=>{
      const button=document.createElement('div');button.className='bubble-sub-button bubble-sub-button-'+(index+1);button.tabIndex=0;
      button.setAttribute('aria-label',route.name);
      button.innerHTML='<svg class="bubble-sub-button-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3 2 12h3v9h5v-6h4v6h5v-9h3z"/></svg><ha-ripple></ha-ripple>';
      button.addEventListener('click',()=>window.nativeClicks.push(route.tap_action.navigation_path));group.append(button);
    });
    const config={...example,signature_navigation:options};
    const style=document.createElement('style');shadow.append(style);
    const render=new Function('return `'+code+'`;');
    window.nav={shadow,card,config,style,render:()=>{style.textContent=render.call({config});}};
    window.nav.render();
  },{native,example,code:definition.code,vars,options});
  return page;
}
async function computed(page) {
  return page.evaluate(()=>{
    const q=s=>window.nav.shadow.querySelector(s);
    const get=(el,pseudo)=>{
      const s=getComputedStyle(el,pseudo),r=el.getBoundingClientRect();
      return {x:r.x,y:r.y,width:parseFloat(s.width),height:parseFloat(s.height),radius:s.borderRadius,
        background:s.backgroundColor,color:s.color,shadow:s.boxShadow,border:s.borderTopWidth,
        filter:s.backdropFilter,outline:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,transition:s.transitionDuration,
        hover:s.getPropertyValue('--ha-ripple-hover-opacity').trim(),mask:s.maskComposite,display:s.display};
    };
    const first=q('.bubble-sub-button-1');
    return {card:get(q('ha-card')),bar:get(q('.bubble-container')),selection:get(first,'::before'),
      first:get(first),icon:get(first.querySelector('.bubble-sub-button-icon')),ripple:get(first.querySelector('ha-ripple')),rim:get(q('.bubble-container'),'::after'),
      second:get(q('.bubble-sub-button-2'),'::before'),secondButton:get(q('.bubble-sub-button-2')),
      oldLayer:get(q('.bubble-container'),'::before')};
  });
}

test('navigation has concentric first/last selections and one glass surface',async t=>{
  const page=await fixture(t);
  const s=await computed(page);
  assert.equal(s.bar.height,64);assert.equal(s.card.height,64);assert.equal(s.card.width,420);
  assert.equal(page.viewportSize().height-s.card.y-s.card.height,16);
  assert.equal(s.bar.radius,'22px');assert.equal(s.selection.radius,'16px');
  assert.equal(s.first.x-s.bar.x,6);assert.equal(s.first.y-s.bar.y,6);
  assert.equal(s.first.height,52);
  assert.equal(s.icon.width,26);assert.equal(s.icon.height,26);
  assert.equal(s.selection.width,s.first.width);assert.equal(s.selection.height,52);
  assert.equal(s.ripple.width,s.selection.width);assert.equal(s.ripple.height,52);assert.equal(s.ripple.radius,'16px');
  assert.equal(s.card.border,'0px');assert.equal(s.bar.border,'0px');assert.equal(s.bar.shadow,'none');
  assert.equal(s.oldLayer.display,'none');assert.equal(s.rim.mask,'exclude, exclude');
  assert.equal(s.first.color,'rgb(33, 33, 33)');assert.equal(s.ripple.hover,'0');
  await page.evaluate(()=>{history.pushState({},'','/dashboard-serveur/devices');window.nav.render();});
  await page.waitForFunction(()=>getComputedStyle(window.nav.shadow.querySelector('.bubble-sub-button-6')).color==='rgb(33, 33, 33)');
  const end=await page.evaluate(()=>{
    const bar=window.nav.shadow.querySelector('.bubble-container').getBoundingClientRect();
    const button=window.nav.shadow.querySelector('.bubble-sub-button-6'),rect=button.getBoundingClientRect();
    return {gap:bar.right-rect.right,color:getComputedStyle(button).color,radius:getComputedStyle(button,'::before').borderRadius};
  });
  assert.ok(Math.abs(end.gap-6)<.01);assert.equal(end.radius,'16px');assert.equal(end.color,'rgb(33, 33, 33)');
  await page.evaluate(()=>window.nav.shadow.querySelector('.bubble-sub-button-3').click());
  assert.deepEqual(await page.evaluate(()=>window.nativeClicks),['/dashboard-rdc/summary']);
});

test('navigation preserves mobile margins, desktop sidebar centering and native hiding',async t=>{
  for(const width of [288,328,358,382,600,1280]){
    const page=await fixture(t,{width,sidebar:width>600?240:0});
    const s=await computed(page);
    assert.ok(Math.abs(s.card.width-(width<=600?width-48:420))<.01);
    assert.equal(s.card.x,width<=600?24:240+(1280-240-420)/2);
    assert.equal(s.bar.height,64);assert.equal(s.first.height,52);
    assert.equal(s.first.y-s.bar.y,6);
    assert.equal(s.icon.width,26);assert.equal(s.icon.height,26);
    assert.ok(s.first.width>s.icon.width,'icon fits the route cell');
    await page.evaluate(()=>window.nav.shadow.querySelector('.bubble-sub-button-2').classList.add('hidden'));
    const hidden=await page.evaluate(()=>getComputedStyle(window.nav.shadow.querySelector('.bubble-sub-button-2')).display);
    assert.equal(hidden,'none');
  }
});

test('navigation theme fallbacks and concentric radius update on existing nodes',async t=>{
  for(const plain of [false,true]){
    const page=await fixture(t,{plain});
    await page.evaluate(()=>{
      document.body.style.setProperty('--ha-card-background','#abcdef');
      document.body.style.setProperty('--card-background-color','#123456');
      document.body.style.setProperty('--signature-card-border-radius','18px');
    });
    const light=await computed(page);
    assert.equal(light.bar.radius,'18px');assert.equal(light.selection.radius,'12px');
    assert.match(light.bar.background,/0\.45/);
    assert.ok(light.bar.background.includes('0.670588')||light.bar.background.includes('171'),'HA surface takes priority');
    await page.evaluate(()=>{
      document.body.style.setProperty('--ha-card-background','#222222');
      document.body.style.setProperty('--primary-text-color','#e1e1e1');
      document.body.style.setProperty('--secondary-text-color','#9b9b9b');
      document.body.style.setProperty('--signature-card-border-radius','4px');
    });
    await page.waitForFunction(()=>getComputedStyle(window.nav.shadow.querySelector('.bubble-sub-button-2')).color==='rgb(155, 155, 155)'
      &&getComputedStyle(window.nav.shadow.querySelector('.bubble-sub-button-1')).color==='rgb(225, 225, 225)');
    const dark=await computed(page);
    assert.equal(dark.bar.radius,'4px');assert.equal(dark.selection.radius,'0px');
    assert.notEqual(dark.bar.background,light.bar.background);
    assert.equal(dark.first.color,'rgb(225, 225, 225)');
    assert.equal(dark.secondButton.color,'rgb(155, 155, 155)');
  }
});

test('navigation hover, keyboard focus, reduced motion and custom zero options share bounds',async t=>{
  const page=await fixture(t,{width:390,options:{mobile_margin:0,blur:0,opacity:0}});
  let s=await computed(page);
  assert.equal(s.card.width,390);assert.equal(s.card.x,0);assert.match(s.card.filter,/blur\(0px\)/);
  assert.match(s.bar.background,/\/ 0\)/);
  await page.evaluate(()=>window.nav.shadow.querySelector('.bubble-sub-button-2').focus());
  await page.keyboard.press('ArrowRight');
  s=await computed(page);assert.equal(s.secondButton.outline,'solid');assert.equal(s.secondButton.outlineWidth,'2px');assert.equal(s.secondButton.outlineColor,'rgb(33, 33, 33)');
  await page.emulateMedia({reducedMotion:'reduce'});
  s=await computed(page);assert.equal(s.selection.transition,'0s');assert.equal(s.second.transition,'0s');
  await page.locator('ha-card .bubble-sub-button-2').hover();
  s=await computed(page);assert.notEqual(s.second.background,'rgba(0, 0, 0, 0)');assert.equal(s.ripple.hover,'0');
  const touch=await fixture(t,{width:390,touch:true});
  await touch.emulateMedia({reducedMotion:'reduce'});
  await touch.locator('ha-card .bubble-sub-button-2').hover();
  const u=await computed(touch);assert.equal(u.second.background,'rgba(0, 0, 0, 0)');assert.equal(u.ripple.radius,'16px');
});

test('neutral selection and focus follow light/dark palettes without rerendering',async t=>{
  const luminance=rgb=>rgb.map(value=>{
    const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
  }).reduce((sum,c,index)=>sum+c*[.2126,.7152,.0722][index],0);
  const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(values[0]+.05)/(values[1]+.05);};
  for(const plain of [false,true]){
    const page=await fixture(t,{width:390,plain});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{window.nav.originalStyle=window.nav.style.textContent;window.nav.originalButton=window.nav.shadow.querySelector('.bubble-sub-button-1');});
    for(const mode of ['light','dark','light']){
      await page.evaluate(vars=>{
        for(const [name,value] of Object.entries(vars))document.body.style.setProperty('--'+name,value);
      },nativeModes[mode]);
      await page.locator('ha-card .bubble-sub-button-1').focus();
      await page.keyboard.press('ArrowRight');
      const s=await computed(page);
      const expected=mode==='dark'?'rgb(225, 225, 225)':'rgb(33, 33, 33)';
      assert.equal(s.first.color,expected);assert.equal(s.first.outlineColor,expected);
      assert.equal(s.first.outlineWidth,'2px');assert.equal(s.selection.radius,'16px');
      assert.equal(s.icon.width,26);assert.equal(s.icon.height,26);
      const pixels=await page.evaluate(()=>{
        const q=selector=>window.nav.shadow.querySelector(selector);
        const color=(el,pseudo)=>getComputedStyle(el,pseudo).backgroundColor;
        const context=document.createElement('canvas').getContext('2d');
        context.canvas.width=context.canvas.height=1;
        const pixel=(...fills)=>{
          context.clearRect(0,0,1,1);
          for(const fill of fills){context.fillStyle=fill;context.fillRect(0,0,1,1);}
          return Array.from(context.getImageData(0,0,1,1).data);
        };
        const body=color(document.body),bar=color(q('.bubble-container')),selected=color(q('.bubble-sub-button-1'),'::before');
        return {bar:pixel(body,bar),selected:pixel(body,bar,selected),fill:pixel(selected),
          active:pixel(getComputedStyle(q('.bubble-sub-button-1')).color),inactive:pixel(getComputedStyle(q('.bubble-sub-button-2')).color),
          sameStyle:window.nav.originalStyle===window.nav.style.textContent,sameButton:window.nav.originalButton===q('.bubble-sub-button-1')};
      });
      assert.ok(pixels.sameStyle&&pixels.sameButton,'theme changes use the same CSS and native button');
      assert.ok(pixels.fill[3]>0&&pixels.fill[3]<255,'selection fill stays translucent');
      assert.ok(Math.abs(pixels.selected[0]-pixels.bar[0])>=12&&Math.abs(pixels.selected[0]-pixels.bar[0])<32,'selection has a visible neutral tint without becoming a solid block');
      assert.ok(mode==='dark'?pixels.selected[0]>pixels.bar[0]:pixels.selected[0]<pixels.bar[0],'selection is lighter in dark mode and darker in light mode');
      assert.ok(Math.max(...pixels.selected.slice(0,3))-Math.min(...pixels.selected.slice(0,3))<=1,'native neutral palette stays neutral');
      assert.ok(contrast(pixels.active.slice(0,3),pixels.selected.slice(0,3))>contrast(pixels.inactive.slice(0,3),pixels.bar.slice(0,3)),'selected icon has stronger contrast than inactive icons');
    }
  }
});
