const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render,nativeModes} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const code = loadModule('signature-header').code;

test('all Header labels follow live theme text while icons, currentColor fills, actions and native visibility retain their roles',async t => {
  const page = await fixture(t);
  for (const mode of ['light','dark']) for (const plain of [false,true]) for (const width of [390,1400]) {
    await page.setViewportSize({width,height:1400});
    await render(page,{mode,plain,width:width-40});
    const rows = await page.evaluate(({code,palettes}) => {
      const rows = [];
      for (const id of ['header','title']) {
        const root = document.querySelector('[data-id="'+id+'"]').shadowRoot;
        const ctx = window.contexts.find(ctx => ctx.card===root.querySelector('ha-card'));
        const native = root.querySelector('style');
        native.textContent += `
          .bubble-sub-button { color:#1565c0; background:color-mix(in srgb,currentColor 16%,var(--card-background-color)); }
          .bubble-sub-button-name-container { color:inherit; }
          .bubble-range-value { color:inherit; opacity:.8; }
          .bright-background .bubble-sub-button-name-container { color:rgba(0,0,0,.65); }
          .bubble-sub-button.disabled { opacity:.4; }
        `;
        const specs = {
          presence:{color:'#1565c0',background:'color-mix(in srgb,currentColor 16%,var(--card-background-color))'},
          mode:{color:'#fb8c00'},
          temperature:{color_thresholds:{values:[{value:15,color:'#2196f3'},{value:30,color:'#ff9800'}]}},
          humidity:{color_thresholds:{values:[{value:0,color:'#90caf9'},{value:100,color:'#1976d2'}]}}
        };
        const keys = ['presence','mode','command','alert','temperature','humidity','slider','disabled','hidden'];
        const container = root.querySelector('.bubble-sub-button-container');
        ctx.config.sub_button={main:keys.map(key=>({entity:'sensor.demo',css_class:key,show_state:true,tap_action:{action:'more-info'}}))};
        ctx.config.signature_header={sub_button_styles:specs};
        keys.forEach((key,index) => {
          const button=document.createElement('div');
          button.className='bubble-sub-button bubble-sub-button-'+(index+1)+' '+key+' bright-background';
          button.innerHTML='<ha-icon class="bubble-sub-button-icon"></ha-icon><span class="bubble-sub-button-name-container">'+key+'</span>';
          if(key==='slider')button.insertAdjacentHTML('beforeend','<span class="bubble-range-value">22</span>');
          if(key==='hidden')button.hidden=true;
          container.append(button);
        });
        const style=[...root.querySelectorAll('style')].at(-1);
        const configured=JSON.stringify(ctx.config);
        style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
        // Avoid reading intermediate native background/color transitions.
        native.textContent += '.bubble-sub-button { transition:none!important; }';
        const probe=document.createElement('span');ctx.card.append(probe);
        const read=()=>{
          probe.style.color='var(--primary-text-color,#212121)';
          probe.style.backgroundColor='var(--card-background-color)';
          return {preferred:getComputedStyle(probe).color,surface:getComputedStyle(probe).backgroundColor,
            buttons:keys.map(key=>{
              const button=container.querySelector('.'+key),label=button.querySelector('.bubble-sub-button-name-container');
              return {key,label:getComputedStyle(label).color,icon:getComputedStyle(button.querySelector('ha-icon')).color,
                tint:getComputedStyle(button).color,background:getComputedStyle(button).backgroundColor,
                opacity:getComputedStyle(button).opacity,visible:button.getClientRects().length>0,
                slider:button.querySelector('.bubble-range-value')&&{color:getComputedStyle(button.querySelector('.bubble-range-value')).color,opacity:getComputedStyle(button.querySelector('.bubble-range-value')).opacity},
                text:label.textContent};
            })};
        };
        const original=read(),originalCSS=style.textContent;
        let clicks=0;const command=container.querySelector('.command');command.addEventListener('click',()=>clicks++);command.click();
        const changed=[];
        for(const palette of Object.values(palettes)){
          for(const [name,value] of Object.entries(palette))document.body.style.setProperty('--'+name,value);
          changed.push(read());
        }
        rows.push({id,original,changed,clicks,sameNode:command===container.querySelector('.command'),sameCSS:style.textContent===originalCSS,sameConfig:configured===JSON.stringify(ctx.config)});
        probe.remove();
      }
      return rows;
    },{code,palettes:nativeModes});
    for(const row of rows){
      for(const sample of [row.original,...row.changed]) for(const [index,button] of sample.buttons.entries()){
        assert.equal(button.label,sample.preferred,row.id+' '+button.key+' theme label');
        assert.equal(button.icon,row.original.buttons[index].icon,row.id+' '+button.key+' icon tint');
        assert.equal(button.tint,['temperature','humidity'].includes(button.key)?sample.preferred:row.original.buttons[index].tint,row.id+' parent currentColor preserved');
        assert.equal(button.text,button.key);
        assert.equal(button.visible,button.key!=='hidden');
        if(button.key==='disabled')assert.equal(button.opacity,'0.4');
        if(button.slider){assert.equal(button.slider.color,sample.preferred);assert.equal(button.slider.opacity,'0.8');}
      }
      const presence=row.original.buttons[0];
      assert.equal(presence.icon,'rgb(21, 101, 192)');
      assert.equal(presence.tint,'rgb(21, 101, 192)');
      // Recompute expected native currentColor fill in the browser, never recolor its parent to theme text.
      assert.match(presence.background,/color\(srgb/);
      assert.notEqual(row.changed[0].buttons[0].background,row.changed[1].buttons[0].background);
      assert.notEqual(row.original.buttons[4].icon,row.original.preferred,'temperature keeps its measured accent');
      assert.notEqual(row.original.buttons[5].icon,row.original.preferred,'humidity keeps its measured accent');
      assert.equal(row.clicks,1);assert.ok(row.sameNode);assert.ok(row.sameCSS);assert.ok(row.sameConfig);
    }
  }
});
