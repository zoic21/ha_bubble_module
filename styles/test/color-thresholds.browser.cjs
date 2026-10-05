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
const luminance = rgb => rgb.slice(0,3).map(channel=>{const v=channel/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const ratio = (fg,bg) => {const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
const expectedForeground = (preferred,background,minimum) => ratio(preferred,background)>=minimum+.003 ? preferred
  : ratio([0,0,0],background)>ratio([255,255,255],background)?[0,0,0,255]:[255,255,255,255];

test('thresholds color icon squares and badges, preserve readable theme foregrounds and retain native geometry/actions',async t=>{
  const page = await browser.newPage({viewport:{width:1400,height:1400}});
  t.after(()=>page.close());await setup(page);
  for (const mode of ['light','dark']) for (const plain of [false,true]) {
    const rendered = await render(page,{mode,plain});assert.deepEqual(rendered.errors,[]);
    const result = await page.evaluate(async codes=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const drawing=canvas.getContext('2d',{willReadFrequently:true});
      const rgba=color=>{drawing.clearRect(0,0,1,1);drawing.fillStyle=color;drawing.fillRect(0,0,1,1);return [...drawing.getImageData(0,0,1,1).data];};
      const probe=document.createElement('span');probe.style.color='var(--primary-text-color)';document.body.append(probe);
      const preferred=rgba(getComputedStyle(probe).color);probe.remove();
      const values = [{value:15,color:'#2196f3'},{value:19,color:'#4caf50'},{value:22,color:'#4caf50'},{value:30,color:'#ff9800'}];
      const rows = [];
      for (const [id,isSub] of [['compact',false],['square',false],['compact',true],['square',true],['header',true],['title',true]]) {
        const root = document.querySelector('[data-id="' + id + '"]').shadowRoot;
        const ctx = window.contexts.find(ctx=>ctx.card === root.querySelector('ha-card'));
        const layout = id === 'title' ? 'header' : id;
        const key = 'signature_' + layout;
        const style = [...root.querySelectorAll('style')].at(-1);
        const apply = ()=>{style.textContent = new Function('hass','onTeardown','renderTemplate','return '+String.fromCharCode(96)+codes[layout]+String.fromCharCode(96)+';').call(ctx,ctx._hass,fn=>ctx.teardown=fn,value=>value);};
        let target=root.querySelector('.bubble-main-icon-container'),icon=root.querySelector('.bubble-main-icon'),label=root.querySelector('.bubble-state');
        ctx.config[key]=layout==='compact'?{compact_mode:'value'}:{};apply();
        if (isSub) {
          target=document.createElement('div');target.className='bubble-sub-button bubble-sub-button-1 temperature background-on';
          target.style.cssText='background:#ef0000;color:#ef0000';
          icon=document.createElement('ha-icon');icon.className='bubble-sub-button-icon';
          label=document.createElement('span');label.className='bubble-sub-button-name-container';label.textContent='17 °C';
          target.append(icon,label);ctx.card.querySelector('.bubble-sub-button-container').append(target);
          ctx.config.sub_button={main:[{entity:'sensor.demo',css_class:'temperature',show_state:true,tap_action:{action:'more-info'}}]};
          ctx.config[key].sub_button_styles={temperature:{background:'#ef0000',color:'#ef0000'}};apply();
        }
        let clicks=0;icon.addEventListener('click',()=>clicks++);
        const box=root.querySelector('.bubble-container');
        const read=()=>({icon:rgba(getComputedStyle(icon).color),text:rgba(getComputedStyle(label).color),
          surface:rgba(getComputedStyle(box).backgroundColor),background:rgba(getComputedStyle(target).backgroundColor),
          width:box.getBoundingClientRect().width,height:box.getBoundingClientRect().height,
          targetWidth:target.getBoundingClientRect().width,targetHeight:target.getBoundingClientRect().height,
          opacity:getComputedStyle(icon).opacity,labelText:label.textContent});
        const baseline=read();
        const scale={enabled:true,values};
        if(isSub)ctx.config[key].sub_button_styles.temperature.color_thresholds=scale;
        else ctx.config[key].color_thresholds=scale;
        ctx.config[key]=structuredClone(ctx.config[key]);
        const configured=JSON.stringify(ctx.config),samples=[];
        for(const value of [5,15,17,19,20,22,26,30,50,'unknown','unavailable']) {
          ctx._hass.states['sensor.demo'].state=String(value);apply();samples.push(read());
        }
        icon.click();const sameConfig=configured===JSON.stringify(ctx.config);
        ctx._hass.states['sensor.demo'].state='20';
        if(isSub)ctx.config[key].sub_button_styles.temperature.icon_color='#123456';else ctx.config[key].icon_color='#123456';
        apply();const manual=read();
        if(isSub)ctx.config[key].sub_button_styles.temperature.icon_color='#4caf50';else ctx.config[key].icon_color='#4caf50';
        apply();const lowContrast=read();
        ctx.config[key]=layout==='compact'?{compact_mode:'value'}:{};apply();
        // Removing the scale restores Header's ordinary native transition.
        await new Promise(resolve=>setTimeout(resolve,200));const restored=read();
        rows.push({id,isSub,preferred,baseline,samples,manual,lowContrast,restored,clicks,sameConfig,sameNode:icon.isConnected});
      }
      return rows;
    },codes);
    for (const row of result) {
      const minimum=row.isSub?4.5:3;
      const colors=[[33,150,243,255],[33,150,243,255],[55,163,162,255],[76,175,80,255],[76,175,80,255],
        [76,175,80,255],[166,164,40,255],[255,152,0,255],[255,152,0,255]];
      assert.deepEqual(row.samples.slice(0,9).map(sample=>sample.background),colors,row.id+' '+mode);
      for(const sample of row.samples.slice(0,9)) {
        assert.deepEqual(sample.icon,expectedForeground(row.preferred,sample.background,minimum),row.id+' '+mode+' preferred foreground');
        assert.ok(ratio(sample.icon,sample.background)>=minimum-.003,row.id+' low icon contrast');
        if(row.isSub)assert.ok(ratio(sample.text,sample.background)>=4.5-.003,row.id+' low label contrast');
      }
      for(const sample of row.samples.slice(9))assert.deepEqual(sample.icon,row.preferred,row.id+' unavailable foreground');
      for(const sample of row.samples) for(const key of ['surface','width','height','targetWidth','targetHeight','opacity'])
        assert.equal(JSON.stringify(sample[key]),JSON.stringify(row.baseline[key]),row.id+' changed '+key);
      if(!row.isSub)for(const sample of row.samples)assert.deepEqual(sample.text,row.baseline.text,row.id+' recolored main value');
      if(row.isSub)for(const sample of row.samples)assert.equal(sample.labelText,'17 °C');
      assert.deepEqual(row.manual.icon,expectedForeground([18,52,86,255],row.manual.background,3));
      assert.deepEqual(row.manual.background,[76,175,80,255]);
      assert.deepEqual(row.lowContrast.icon,[0,0,0,255]);
      assert.notDeepEqual(row.restored.background,row.manual.background);
      assert.equal(row.clicks,1);assert.ok(row.sameConfig);assert.ok(row.sameNode);
    }
  }
});

test('contrast follows theme changes on the same nodes without rerender, including unusual and translucent theme colors',async t=>{
  const page=await browser.newPage();t.after(()=>page.close());await setup(page);await render(page,{mode:'light'});
  const results=await page.evaluate(code=>{
    const root=document.querySelector('[data-id="compact"]').shadowRoot;
    const ctx=window.contexts.find(ctx=>ctx.card===root.querySelector('ha-card'));
    const style=[...root.querySelectorAll('style')].at(-1),icon=root.querySelector('.bubble-main-icon');
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const drawing=canvas.getContext('2d',{willReadFrequently:true});
    const rgba=color=>{drawing.clearRect(0,0,1,1);drawing.fillStyle=color;drawing.fillRect(0,0,1,1);return [...drawing.getImageData(0,0,1,1).data];};
    const probe=document.createElement('span');document.body.append(probe);
    const results=[];
    for(const background of ['#000','#fff','#2196f3','#4caf50','#e53935','#777']) {
      ctx.config.signature_compact={compact_mode:'value',color_thresholds:{values:[{value:0,color:background}]}};
      style.textContent=new Function('hass','onTeardown','renderTemplate','return '+String.fromCharCode(96)+code+String.fromCharCode(96)+';').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
      const originalCSS=style.textContent;
      for(const preferred of ['#212121','#e1e1e1','#727272','#2196f3','#fff','#000','rgba(255,255,255,.2)']) {
        document.body.style.setProperty('--primary-text-color',preferred);probe.style.color=preferred;
        results.push({background:rgba(background),preferred:rgba(getComputedStyle(probe).color),icon:rgba(getComputedStyle(icon).color),sameCSS:style.textContent===originalCSS,sameNode:icon===root.querySelector('.bubble-main-icon')});
      }
      // Exercise the declarations used when relative-color arithmetic is absent.
      for(let index=style.sheet.cssRules.length-1;index>=0;index--)
        if(style.sheet.cssRules[index].type===CSSRule.SUPPORTS_RULE)style.sheet.deleteRule(index);
      results.push({legacy:true,background:rgba(background),icon:rgba(getComputedStyle(icon).color),sameCSS:true,sameNode:icon===root.querySelector('.bubble-main-icon')});
    }
    probe.remove();return results;
  },codes.compact);
  for(const row of results) {
    const composed=rgb=>rgb.slice(0,3).map((value,index)=>value*rgb[3]/255+row.background[index]*(1-rgb[3]/255));
    assert.ok(ratio(composed(row.icon),row.background)>=3-.003,'unreadable '+JSON.stringify(row));
    if(row.legacy)assert.deepEqual(row.icon,expectedForeground([0,0,0,0],row.background,Infinity));
    else if(ratio(composed(row.preferred),row.background)>3.003) {
      const expected=composed(row.preferred);
      for(let i=0;i<3;i++)assert.ok(Math.abs(row.icon[i]-expected[i])<=1,'unnecessary foreground change');
    }
    assert.ok(row.sameCSS);assert.ok(row.sameNode);
  }
});
