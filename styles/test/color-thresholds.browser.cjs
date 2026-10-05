const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test,before,after} = require('node:test');
const {chromium} = require('playwright');
const YAML = require('yaml');
const {setup,render} = require('./fixtures.cjs');
let browser;
before(async()=>{browser = await chromium.launch({headless:true,
  ...(process.env.BUBBLE_STYLE_BROWSER_PATH ? {executablePath:process.env.BUBBLE_STYLE_BROWSER_PATH} : {}),
  args:['--no-sandbox','--disable-dev-shm-usage']});});
after(async()=>{await browser?.close();});
const codes = Object.fromEntries(['compact','square','header'].map(layout => [layout,
  YAML.parse(fs.readFileSync(path.resolve(__dirname,'../../signature-' + layout + '/dist/signature-' + layout + '.yaml'),'utf8'))['signature_' + layout].code]));

test('threshold icons match chart reference colors in both modes without changing text, surfaces, geometry or actions',async t=>{
  const page = await browser.newPage({viewport:{width:1400,height:1400}});
  t.after(()=>page.close());await setup(page);
  for (const mode of ['light','dark']) for (const plain of [false,true]) {
    const rendered = await render(page,{mode,plain});assert.deepEqual(rendered.errors,[]);
    const result = await page.evaluate(codes=>{
      const values = [{value:15,color:'#2196f3'},{value:19,color:'#4caf50'},{value:22,color:'#4caf50'},{value:30,color:'#ff9800'}];
      const rows = [];
      for (const id of ['compact','square','header','title']) {
        const root = document.querySelector('[data-id="' + id + '"]').shadowRoot;
        const ctx = window.contexts.find(ctx=>ctx.card === root.querySelector('ha-card'));
        const layout = id === 'title' ? 'header' : id;
        const isSub = layout === 'header';
        const key = 'signature_' + layout;
        const icon = isSub ? document.createElement('ha-icon') : root.querySelector('.bubble-main-icon');
        let label = root.querySelector('.bubble-state');
        if (isSub) {
          const button = document.createElement('div');button.className = 'bubble-sub-button bubble-sub-button-1 temperature';
          icon.className = 'bubble-sub-button-icon';label = document.createElement('span');label.className = 'bubble-sub-button-name-container';label.textContent = '17 °C';
          button.append(icon,label);ctx.card.querySelector('.bubble-sub-button-container').append(button);
          ctx.config.sub_button = {main:[{entity:'sensor.demo',css_class:'temperature',tap_action:{action:'more-info'}}]};
        }
        let clicks = 0;icon.addEventListener('click',()=>clicks++);
        const box = root.querySelector('.bubble-container');
        const read = ()=>({icon:getComputedStyle(icon).color,text:getComputedStyle(label).color,
          surface:getComputedStyle(box).backgroundColor,width:box.getBoundingClientRect().width,height:box.getBoundingClientRect().height,
          iconSurface:getComputedStyle(root.querySelector('.bubble-icon-container')).backgroundColor});
        const baseline = read();
        ctx.config[key] = isSub ? {sub_button_styles:{temperature:{color_thresholds:{enabled:true,values}}}}
          : {color_thresholds:{enabled:true,values},...(layout === 'compact' ? {compact_mode:'value'} : {})};
        const style = [...root.querySelectorAll('style')].at(-1);
        const apply = ()=>{style.textContent = new Function('hass','onTeardown','renderTemplate','return `' + codes[layout] + '`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,value=>value);};
        const configured = JSON.stringify(ctx.config);
        const samples = [];
        for (const value of [15,17,20,26,30,'unavailable']) {
          ctx._hass.states['sensor.demo'].state = String(value);apply();samples.push(read());
        }
        icon.click();
        const neutral = getComputedStyle(document.body).getPropertyValue('--secondary-text-color').trim();
        const swatch = document.createElement('span');swatch.style.color = neutral;document.body.append(swatch);
        const neutralRGB = getComputedStyle(swatch).color;swatch.remove();
        const sameConfig = configured === JSON.stringify(ctx.config);
        ctx.config[key] = isSub ? {sub_button_styles:{temperature:{icon_color:'#123456',color_thresholds:{values}}}} : {icon_color:'#123456',color_thresholds:{values}};
        apply();const manual = read().icon;
        ctx.config[key] = {};apply();const restored = read();
        rows.push({id,baseline,samples,neutralRGB,manual,restored,clicks,sameConfig,sameNode:icon.isConnected});
      }
      return rows;
    },codes);
    for (const row of result) {
      assert.deepEqual(row.samples.map(sample=>sample.icon),[
        'rgb(33, 150, 243)','rgb(55, 163, 162)','rgb(76, 175, 80)',
        'rgb(166, 164, 40)','rgb(255, 152, 0)',row.neutralRGB
      ],row.id + ' ' + mode);
      for (const sample of row.samples) for (const key of ['surface','iconSurface','width','height'])
        assert.equal(sample[key],row.baseline[key],row.id + ' changed ' + key);
      for (const sample of row.samples) assert.equal(sample.text,row.samples[0].text,row.id + ' recolored text');
      assert.equal(row.manual,'rgb(18, 52, 86)');
      assert.notEqual(row.restored.icon,row.manual);
      assert.equal(row.clicks,1);assert.ok(row.sameConfig);assert.ok(row.sameNode);
    }
  }
});
