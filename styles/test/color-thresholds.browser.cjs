const {loadModule}=require('../../shared/test/module.cjs');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render,nativeModes} = require('./fixtures.cjs');
const codes = Object.fromEntries(['compact','square','header'].map(layout => [layout,
  loadModule('signature-'+layout).code]));
const luminance = rgb => rgb.slice(0,3).map(channel=>{const v=channel/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const near = (actual,expected,message) => actual.forEach((channel,i)=>assert.ok(Math.abs(channel-expected[i])<=1,message+' '+JSON.stringify({actual,expected})));
const graphColors=[[33,150,243,255],[33,150,243,255],[55,163,162,255],[76,175,80,255],[76,175,80,255],
  [76,175,80,255],[166,164,40,255],[255,152,0,255],[255,152,0,255]];

test('threshold indicators use the same 16% soft surfaces as ordinary icons and exact graph accents in both themes',async t=>{
  const page = await fixture(t);
  for (const mode of ['light','dark']) for (const plain of [false,true]) {
    assert.deepEqual((await render(page,{mode,plain})).errors,[]);
    const result = await page.evaluate(async codes=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const drawing=canvas.getContext('2d',{willReadFrequently:true});
      const rgba=color=>{drawing.clearRect(0,0,1,1);drawing.fillStyle=color;drawing.fillRect(0,0,1,1);return [...drawing.getImageData(0,0,1,1).data];};
      const probe=document.createElement('span');document.body.append(probe);probe.style.color='var(--primary-text-color)';
      const preferred=rgba(getComputedStyle(probe).color);
      probe.style.backgroundColor='var(--signature-card-background,var(--ha-card-background,var(--card-background-color,#fff)))';
      const neutral=rgba(getComputedStyle(probe).backgroundColor);probe.remove();
      const values=[{value:15,color:'#2196f3'},{value:19,color:'#4caf50'},{value:22,color:'#4caf50'},{value:30,color:'#ff9800'}],rows=[];
      for (const [id,isSub] of [['compact',false],['square',false],['compact',true],['square',true],['header',true],['title',true]]) {
        const root=document.querySelector('[data-id="'+id+'"]').shadowRoot,ctx=window.contexts.find(ctx=>ctx.card===root.querySelector('ha-card'));
        const layout=id==='title'?'header':id,key='signature_'+layout,style=[...root.querySelectorAll('style')].at(-1);
        const apply=()=>{style.textContent=new Function('hass','onTeardown','renderTemplate','return '+String.fromCharCode(96)+codes[layout]+String.fromCharCode(96)+';').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);};
        let target=root.querySelector('.bubble-main-icon-container'),icon=root.querySelector('.bubble-main-icon'),label=root.querySelector('.bubble-state');
        ctx.config[key]=layout==='compact'?{compact_mode:'value'}:{};apply();
        if(isSub){
          target=document.createElement('div');target.className='bubble-sub-button bubble-sub-button-1 temperature background-on';target.style.cssText='background:#ef0000;color:#ef0000';
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
        const baseline=read(),scale={enabled:true,values};
        if(isSub)ctx.config[key].sub_button_styles.temperature.color_thresholds=scale;else ctx.config[key].color_thresholds=scale;
        ctx.config[key]=structuredClone(ctx.config[key]);const configured=JSON.stringify(ctx.config),samples=[];
        for(const value of [5,15,17,19,20,22,26,30,50,'unknown','unavailable']){
          ctx._hass.states['sensor.demo'].state=String(value);apply();samples.push(read());
        }
        icon.click();const sameConfig=configured===JSON.stringify(ctx.config);
        ctx._hass.states['sensor.demo'].state='20';
        if(isSub)ctx.config[key].sub_button_styles.temperature.icon_color='#abcdef';else ctx.config[key].icon_color='#abcdef';
        apply();const manual=read();
        ctx.config[key]=layout==='compact'?{compact_mode:'value'}:{};apply();
        await new Promise(resolve=>setTimeout(resolve,200));const restored=read();
        rows.push({id,isSub,preferred,neutral,baseline,samples,manual,restored,clicks,sameConfig,sameNode:icon.isConnected});
      }
      return rows;
    },codes);
    for(const row of result){
      const mixed=rgb=>rgb.map((v,i)=>i===3?255:Math.round(v*.16+row.neutral[i]*.84));
      for(const [i,sample] of row.samples.slice(0,9).entries()){
        near(sample.background,mixed(graphColors[i]),row.id+' soft background '+mode);
        assert.deepEqual(sample.icon,graphColors[i],row.id+' exact graph color '+mode);
        if(row.isSub){
          assert.deepEqual(sample.text,row.preferred,row.id+' theme label');
        }
        if(mode==='dark')assert.ok(luminance(sample.background)<.1,row.id+' bright dark surface');
      }
      for(const sample of row.samples.slice(9))near(sample.icon,row.preferred,row.id+' unavailable foreground');
      for(const sample of row.samples)for(const key of ['surface','width','height','targetWidth','targetHeight','opacity'])
        assert.equal(JSON.stringify(sample[key]),JSON.stringify(row.baseline[key]),row.id+' changed '+key);
      if(!row.isSub)for(const sample of row.samples)assert.deepEqual(sample.text,row.baseline.text,row.id+' recolored main value');
      if(row.isSub)for(const sample of row.samples)assert.equal(sample.labelText,'17 °C');
      assert.deepEqual(row.manual.icon,[76,175,80,255],row.id+' active scale precedence');
      near(row.manual.background,mixed([76,175,80,255]),row.id+' manual soft surface');
      assert.notDeepEqual(row.restored.background,row.manual.background);
      assert.equal(row.clicks,1);assert.ok(row.sameConfig);assert.ok(row.sameNode);
    }
  }
});

test('soft surfaces follow live theme changes while exact accents and theme labels remain unmodified',async t=>{
  const page=await fixture(t);await render(page,{mode:'light'});
  const rows=await page.evaluate(({code,palettes})=>{
    const root=document.querySelector('[data-id="compact"]').shadowRoot,ctx=window.contexts.find(c=>c.card===root.querySelector('ha-card'));
    const style=[...root.querySelectorAll('style')].at(-1),icon=root.querySelector('.bubble-main-icon'),target=root.querySelector('.bubble-main-icon-container');
    const badge=document.createElement('div');badge.className='bubble-sub-button temperature bubble-sub-button-1';
    const badgeIcon=document.createElement('ha-icon');badgeIcon.className='bubble-sub-button-icon';
    const label=document.createElement('span');label.className='bubble-sub-button-name-container';label.textContent='20 °C';badge.append(badgeIcon,label);
    ctx.card.querySelector('.bubble-sub-button-container').append(badge);
    ctx.config.sub_button={main:[{entity:'sensor.demo',css_class:'temperature',show_state:true}]};
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const drawing=canvas.getContext('2d',{willReadFrequently:true});
    const rgba=color=>{drawing.clearRect(0,0,1,1);drawing.fillStyle=color;drawing.fillRect(0,0,1,1);return [...drawing.getImageData(0,0,1,1).data];};
    const rows=[];
    for(const accent of ['#000','#fff','#2196f3','#4caf50','#ff9800','#e53935','#ffc107','#777']){
      const scale={values:[{value:0,color:accent}]};
      ctx.config.signature_compact={compact_mode:'value',color_thresholds:scale,sub_button_styles:{temperature:{color_thresholds:scale}}};
      style.textContent=new Function('hass','onTeardown','renderTemplate','return '+String.fromCharCode(96)+code+String.fromCharCode(96)+';').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
      const originalCSS=style.textContent;
      if(/dp-contrast|xyz-d65|@supports/.test(originalCSS))throw new Error('Contrast machinery still shipped');
      for(const palette of [...Object.values(palettes),{'card-background-color':'#777','primary-text-color':'#777'},{'card-background-color':'#fff','primary-text-color':'#fff'},{'card-background-color':'#000','primary-text-color':'#000'}]){
        for(const [name,value]of Object.entries(palette))document.body.style.setProperty('--'+name,value);
        rows.push({accent:rgba(accent),preferred:rgba(palette['primary-text-color']),background:rgba(getComputedStyle(target).backgroundColor),
          icon:rgba(getComputedStyle(icon).color),badgeIcon:rgba(getComputedStyle(badgeIcon).color),label:rgba(getComputedStyle(label).color),
          sameCSS:originalCSS===style.textContent,sameNode:icon===root.querySelector('.bubble-main-icon')});
      }
    }
    return rows;
  },{code:codes.compact,palettes:nativeModes});
  for(const row of rows){
    assert.deepEqual(row.icon,row.accent,'exact accent, even on an unusual theme surface');
    near(row.badgeIcon,row.icon,'main/badge accent parity');
    assert.deepEqual(row.label,row.preferred,'unmodified theme label');
    assert.ok(row.sameCSS);assert.ok(row.sameNode);
  }
});
