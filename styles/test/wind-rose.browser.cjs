const assert = require('node:assert/strict');
const {test} = require('node:test');
const {loadModule} = require('../../shared/test/module.cjs');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');
const code = loadModule('signature-wind-rose').code;

test('long weekly calm durations keep the footer on one row on narrow cards and enlarged value fonts',async t => {
  const page=await fixture(t);
  for(const font of [14,18]) {
    await render(page,{width:288,windSpeed:true,overrides:{'signature-name-font-size':font+'px'}});
    const result=await page.evaluate(()=>{
      const r=window.contexts.find(ctx=>ctx._signatureWindRose)._signatureWindRose,entry=r.cache.get(r.period),end=entry.data.end,start=end-168*3600000;
      entry.data=r.aggregate({'sensor.direction':[{s:'337.5',lu:start/1000}],
        'sensor.speed':[{s:'0',lu:start/1000},{s:'7',lu:(end-55*60000)/1000}]},start,end);
      r.renderKey=null;r.render();
      return {text:r.calmValue.textContent,overflow:r.footer.scrollWidth>r.footer.clientWidth,
        height:r.calmValue.getBoundingClientRect().height,line:parseFloat(getComputedStyle(r.calmValue).lineHeight),
        columns:[...r.footer.children].map(el=>({width:el.clientWidth,scroll:el.scrollWidth}))};
    });
    assert.equal(result.text,'167 h 05');assert.equal(result.overflow,false);
    assert.ok(Math.abs(result.height-result.line)<1,JSON.stringify(result));
    assert.ok(result.columns.every(column=>column.scroll<=column.width));
  }
});

test('wind speed bands and legend fit narrow/wide cards with and without the theme',async t => {
  const page = await fixture(t);
  for(const mode of ['light','dark']) for(const plain of [false,true]) for(const width of [288,328,358,382,600]) {
    await render(page,{mode,plain,width,windSpeed:true});
    const result = await page.evaluate(() => {
      const r=window.contexts.find(ctx=>ctx._signatureWindRose)._signatureWindRose;
      const bounds=r.canvas.getBoundingClientRect();
      const fits=el=>{const b=el.getBoundingClientRect();return b.left>=bounds.left && b.right<=bounds.right && el.scrollWidth<=el.clientWidth;};
      r.sectors[4].dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      return {legend:!r.legend.hidden,tooltip:!r.tooltip.hidden,fit:[r.legend,r.tooltip,r.footer,...r.footer.children,...r.legendLabels].every(fits),
        footerLabels:[...r.footer.querySelectorAll('.swr-label')].map(el=>el.textContent),calm:r.calmValue.textContent,
        rings:r.svg.querySelectorAll('circle').length,labels:[...r.svg.querySelectorAll('text')].map(el=>el.textContent),
        bandPaths:r.bands.flat().filter(el=>el.getAttribute('d')).length,
        colors:r.bands[4].map((el,i)=>({fill:getComputedStyle(el).fill,swatch:getComputedStyle(r.legend.querySelectorAll('.swr-swatch')[i]).backgroundColor})),
        pointer:getComputedStyle(r.bands[4][0]).pointerEvents,
        legendSize:getComputedStyle(r.legend).fontSize,text:r.tooltip.textContent};
    });
    assert.ok(result.legend && result.tooltip && result.fit,JSON.stringify({width,mode,plain,result}));
    assert.equal(result.rings,3);assert.deepEqual(result.labels,['N','E','S','O']);
    assert.deepEqual(result.footerLabels,['Dominant','Fréquence','Calme']);assert.equal(result.calm,'0 min');
    assert.equal(result.bandPaths,12);assert.equal(result.pointer,'none');assert.equal(result.legendSize,'12px');
    assert.equal(new Set(result.colors.map(c=>c.fill)).size,4);
    for(const color of result.colors)assert.equal(color.fill,color.swatch);
    assert.match(result.text,/Moyenne : 10,8 km\/h\nMaximum : 24 km\/h/);
  }
});

test('speed petals preserve real pointer, touch and keyboard interactions without native card actions',async t => {
  for(const touch of [false,true]) {
    const page = await fixture(t,{hasTouch:touch});
    await render(page,{width:328,windSpeed:true});
    await page.locator('[data-id="wind"] .swr-svg').scrollIntoViewIfNeeded();
    const target = await page.evaluate(() => {
      const ctx=window.contexts.find(ctx=>ctx._signatureWindRose),r=ctx._signatureWindRose,b=r.svg.getBoundingClientRect();
      window.windClicks=0;ctx.card.addEventListener('click',()=>window.windClicks++);
      return {x:b.left+b.width*238/320,y:b.top+b.height/2};
    });
    const sector=page.locator('[data-id="wind"] .swr-sector').nth(4);
    if(touch)await page.touchscreen.tap(target.x,target.y);
    else {
      await page.mouse.move(target.x,target.y);
      assert.equal(await page.locator('[data-id="wind"] .swr-tooltip').isVisible(),true);
      await page.mouse.click(target.x,target.y);
      await page.mouse.move(0,0);
    }
    assert.equal(await sector.getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('[data-id="wind"] .swr-tooltip').isVisible(),true);
    await sector.focus();await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-id="wind"] .swr-tooltip').isVisible(),false);
    await page.keyboard.press('Space');assert.equal(await sector.getAttribute('aria-pressed'),'true');
    const focus=await sector.evaluate(el=>getComputedStyle(el).strokeWidth);assert.equal(focus,'1.2px');
    await page.locator('[data-id="wind"] .swr-svg').click({position:{x:5,y:5}});
    assert.equal(await page.locator('[data-id="wind"] .swr-tooltip').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.windClicks),0);
  }
});

test('band and legend shades follow live colors and custom overrides on the same cached nodes',async t => {
  const page=await fixture(t);await render(page,{width:328,windSpeed:true});
  const result=await page.evaluate(code => {
    const ctx=window.contexts.find(ctx=>ctx._signatureWindRose),r=ctx._signatureWindRose,nodes=r.bands.flat(),data=r.cache.get(r.period).data;
    let requests=0;ctx._hass.callWS=()=>{requests++;throw new Error('Unexpected request');};
    const read=()=>r.bands[4].map((el,i)=>({fill:getComputedStyle(el).fill,swatch:getComputedStyle(r.legend.querySelectorAll('.swr-swatch')[i]).backgroundColor}));
    const initial=read();document.body.style.setProperty('--signature-wind-rose-color','#cc4400');
    const live=read();
    ctx.config.signature_wind_rose.color='#0066cc';
    new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
    return {initial,live,custom:read(),requests,sameNodes:nodes.every((node,i)=>r.bands.flat()[i]===node),sameData:r.cache.get(r.period).data===data};
  },code);
  assert.notDeepEqual(result.initial,result.live);assert.notDeepEqual(result.live,result.custom);
  assert.ok(result.sameNodes && result.sameData);assert.equal(result.requests,0);
  for(const colors of [result.initial,result.live,result.custom])for(const color of colors)assert.equal(color.fill,color.swatch);
});

const luminance=rgb=>rgb.reduce((sum,c,i)=>sum+[.2126,.7152,.0722][i]*(c/255<=.04045?c/255/12.92:((c/255+.055)/1.055)**2.4),0);
const mix=(a,b,p)=>a.map((c,i)=>c*p+b[i]*(1-p));
const expectedBands=(accent,surface)=>{
  const tint=mix(surface,[255,255,255],.25);
  return [mix(accent,tint,.42),mix(accent,tint,.72),mix(accent,[0,0,0],.94),mix(accent,[0,0,0],.67)];
};
const assertRgb=(actual,expected)=>actual.forEach((c,i)=>assert.ok(Math.abs(c-expected[i])<=1,JSON.stringify({actual,expected})));

test('wind lower shades reduce dark highlights while preserving the white-card palette and shade order',async t=>{
  const page=await fixture(t);
  for(const mode of ['light','dark']) for(const plain of [false,true]) for(const width of [328,600]) {
    await render(page,{mode,plain,width,windSpeed:true});
    for(const accent of ['#4db6ac','#2196f3','#f44336']) {
      const result=await page.evaluate(accent=>{
        document.body.style.setProperty('--signature-wind-rose-color',accent);
        const r=window.contexts.find(ctx=>ctx._signatureWindRose)._signatureWindRose;
        const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const paint=canvas.getContext('2d');
        const rgb=color=>{paint.clearRect(0,0,1,1);paint.fillStyle=color;paint.fillRect(0,0,1,1);return Array.from(paint.getImageData(0,0,1,1).data).slice(0,3);};
        return {bands:r.bands[4].map((el,i)=>({rgb:rgb(getComputedStyle(el).fill),fill:getComputedStyle(el).fill,swatch:getComputedStyle(r.legend.querySelectorAll('.swr-swatch')[i]).backgroundColor}))};
      },accent);
      const base=accent.match(/\w\w/g).map(c=>parseInt(c,16)),surface=mode==='light'?[255,255,255]:[28,28,28];
      const expected=expectedBands(base,surface),actual=result.bands.map(b=>b.rgb),light=expectedBands(base,[255,255,255]);
      for(let i=0;i<4;i++) {
        assertRgb(actual[i],expected[i]);assert.equal(result.bands[i].fill,result.bands[i].swatch);
        if(i)assert.ok(luminance(actual[i-1])>luminance(actual[i]),JSON.stringify({mode,plain,width,accent,actual}));
      }
      if(mode==='dark') {
        assert.ok(luminance(actual[0])<luminance(light[0])*.85);
        assert.ok(luminance(actual[1])<luminance(light[1]));
      }
    }
  }
});

test('wind shades follow native surface cascades and live mode changes without another module pass',async t=>{
  const page=await fixture(t);
  for(const plain of [false,true]) for(const width of [328,600]) {
    await render(page,{mode:'light',plain,width,windSpeed:true});
    const result=await page.evaluate(()=>{
      const ctx=window.contexts.find(ctx=>ctx._signatureWindRose),r=ctx._signatureWindRose,nodes=r.bands.flat(),data=r.cache.get(r.period).data;
      let requests=0;ctx._hass.callWS=()=>{requests++;throw new Error('Unexpected history request');};
      const read=()=>r.bands[4].map((el,i)=>({fill:getComputedStyle(el).fill,swatch:getComputedStyle(r.legend.querySelectorAll('.swr-swatch')[i]).backgroundColor}));
      const initial=read();document.body.style.setProperty('--card-background-color','#1c1c1c');document.body.style.setProperty('--primary-text-color','#e1e1e1');
      const dark=read();document.body.style.setProperty('--ha-card-background','#fff');
      const nativeOverride=read();document.body.style.setProperty('--signature-card-background','#1c1c1c');
      const signatureOverride=read();document.body.style.removeProperty('--signature-card-background');document.body.style.removeProperty('--ha-card-background');document.body.style.setProperty('--card-background-color','#fff');document.body.style.setProperty('--primary-text-color','#212121');
      return {initial,dark,nativeOverride,signatureOverride,restored:read(),requests,
        sameNodes:nodes.every((node,i)=>r.bands.flat()[i]===node),sameData:r.cache.get(r.period).data===data};
    });
    assert.notDeepEqual(result.initial,result.dark);assert.deepEqual(result.initial,result.nativeOverride);assert.deepEqual(result.dark,result.signatureOverride);assert.deepEqual(result.initial,result.restored);
    assert.ok(result.sameNodes && result.sameData);assert.equal(result.requests,0);
    for(const colors of [result.initial,result.dark,result.nativeOverride,result.signatureOverride,result.restored])for(const color of colors)assert.equal(color.fill,color.swatch);
  }
});
