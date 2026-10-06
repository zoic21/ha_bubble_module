const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {theme, nativeModes} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');
const code = loadModule('signature-header').code;

// Audited Bubble separator structure: direct icon/name/line/buttons, no button wrapper.
// Relevant native cascade from Bubble Card 3.4.1 (061ed837), not a full HA runtime.
const nativeCSS = `
  ha-card { display:block; position:relative; font:14px/1.3 Arial,sans-serif; }
  .bubble-container { position:relative; width:100%; box-sizing:border-box; display:flex; align-items:center; height:40px; overflow:visible; }
  .bubble-icon { display:inline-flex; width:20px; height:20px; flex-shrink:0; margin:0 22px 0 8px; }
  .bubble-name { margin:0 30px 0 0; font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bubble-name:empty { display:none; }
  .bubble-line { flex-grow:1; height:6px; margin-right:14px; }
  .bubble-sub-button-container { position:relative; display:flex; inset-inline-end:8px; margin-inline-start:8px; align-items:center; justify-content:end; gap:8px; }
  .bubble-sub-button-group { display:flex; position:relative; gap:8px; align-items:center; }
  .bubble-sub-button { display:flex; flex-direction:row-reverse; align-items:center; justify-content:center; position:relative; box-sizing:border-box; width:max-content; min-width:36px; height:36px; border-radius:18px; padding:0 8px; font-size:12px; white-space:nowrap; color:var(--primary-text-color); background:var(--card-background-color); }
  .bubble-sub-button-name-container { display:flex; overflow:auto; }
  .bubble-sub-button-icon { width:16px; height:16px; flex-shrink:0; margin-right:4px; }
  .hidden,[hidden] { display:none!important; }
`;
const machineLabels = ['Sauvegarde HA : il y a 4 heures', 'Disque HA : 17,5 %', 'Clients UDM : 4', 'Latence : 11 ms'];

async function section(page, {width=750, mode='light', plain=false, grouped=false, name='Machines', labels=machineLabels, hidden=false}={}) {
  const vars = {...nativeModes[mode], ...(plain ? {} : {...theme, ...theme.modes[mode]})};
  delete vars.modes;
  await page.setContent('<div id="section"></div><div id="neighbor">Add-ons</div><div id="following">Home Assistant</div>');
  await page.evaluate(({code,nativeCSS,width,vars,grouped,name,labels,hidden}) => {
    document.body.style.cssText = 'margin:0;font-family:Arial;background:var(--primary-background-color);'+Object.entries(vars).map(([k,v])=>'--'+k+':'+v).join(';');
    const shell=document.querySelector('#section');shell.style.width=width+'px';
    const neighbor=document.querySelector('#neighbor');neighbor.style.cssText='position:absolute;left:'+(width+24)+'px;top:0;';
    const shadow=shell.attachShadow({mode:'open'});
    shadow.innerHTML='<style>'+nativeCSS+'</style><ha-card><div class="bubble-container bubble-separator separator-container"><ha-icon class="bubble-icon"></ha-icon><h4 class="bubble-name"></h4><div class="bubble-line"></div><div class="bubble-sub-button-container"></div></div></ha-card>';
    const root=shadow.querySelector('ha-card'),container=root.querySelector('.bubble-sub-button-container');
    root.querySelector('.bubble-name').textContent=name;
    let parent=container;
    if(grouped){parent=document.createElement('div');parent.className='bubble-sub-button-group display-inline';container.append(parent);}
    const config={card_type:'separator',name,signature_header:{sub_button_styles:{'ha-disk':{color_thresholds:{transition:'hard',values:[{value:0,color:'#43A047'},{value:80,color:'#E53935'}]}}}},sub_button:{main:[],bottom:[]}};
    const buttons=[];
    labels.forEach((label,index)=>{
      const b=document.createElement('div');b.className='bubble-sub-button bubble-sub-button-'+(index+1)+(index===1?' ha-disk':'');
      b.innerHTML='<span class="bubble-sub-button-name-container"></span><ha-icon class="bubble-sub-button-icon"></ha-icon>';
      b.querySelector('span').textContent=label;parent.append(b);buttons.push(b);
      config.sub_button.main.push({entity:'sensor.disk',css_class:index===1?'ha-disk':undefined,tap_action:{action:'more-info'}});
      b.addEventListener('click',()=>window.clicks=(window.clicks||0)+1);
    });
    if(hidden){const b=document.createElement('button');b.className='bubble-sub-button hidden';b.textContent='Hidden very long label';container.append(b);}
    if(!labels.length)container.classList.add('hidden');
    const ctx={card:root,config,elements:{mainContainer:root.querySelector('.bubble-container')}};
    const hass={states:{'sensor.disk':{state:'17.5',attributes:{}}}};
    const configured=JSON.stringify(config);
    const style=document.createElement('style');style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,hass,fn=>ctx.teardown=fn,v=>v);shadow.append(style);
    window.contexts=[ctx];window.section={shell,root,container,buttons,style,config,configured};window.clicks=0;
  },{code,nativeCSS,width,vars,grouped,name,labels,hidden});
}

async function geometry(page) {
  return page.evaluate(()=>{
    const {shell,root,buttons,style,config,configured}=window.section;
    const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const title=root.querySelector('.bubble-name');
    return {card:rect(root),title:rect(title),text:title.textContent,titleOverflow:title.scrollWidth>title.clientWidth+1,
      buttons:buttons.map(b=>({rect:rect(b),overflow:b.scrollWidth>b.clientWidth+1,color:getComputedStyle(b.querySelector('span')).color,icon:getComputedStyle(b.querySelector('ha-icon')).color})),
      following:rect(document.querySelector('#following')),neighbor:rect(document.querySelector('#neighbor')),shell:rect(shell),
      hidden:root.querySelector('.hidden')?.getClientRects().length||0,sameConfig:JSON.stringify(config)===configured,css:style.textContent,
      titleSize:getComputedStyle(title).fontSize,surface:getComputedStyle(root).backgroundColor,border:getComputedStyle(root).borderTopWidth,shadow:getComputedStyle(root).boxShadow};
  });
}

function contained(sample) {
  assert.equal(sample.titleOverflow,false,'title is fully visible');
  assert.ok(sample.title.width>0,'title retains width');
  for(const b of sample.buttons){
    assert.ok(b.rect.left>=sample.card.left-0.1 && b.rect.right<=sample.card.right+0.1,'badge stays within its section');
    assert.ok(b.rect.top>=sample.card.top-0.1 && b.rect.bottom<=sample.card.bottom+0.1,'height includes all badge rows');
    assert.equal(b.overflow,false,'badge content fits');
    assert.ok(b.rect.top>=sample.title.bottom-0.1 || b.rect.left>=sample.title.right+13.9,'badges do not cover title');
    assert.ok(b.rect.right<sample.neighbor.left,'badges do not cover adjacent section');
  }
  assert.ok(sample.following.top>=sample.card.bottom-0.1,'next card follows complete title height');
  assert.equal(sample.hidden,0);assert.ok(sample.sameConfig);
  assert.equal(sample.titleSize,'18px');assert.equal(sample.surface,'rgba(0, 0, 0, 0)');assert.equal(sample.border,'0px');assert.equal(sample.shadow,'none');
}

test('machine section keeps its title and four native badges within its column in light/dark and desktop/mobile',async t=>{
  const page=await fixture(t,{prepare:null});
  for(const mode of ['light','dark'])for(const plain of [false,true])for(const grouped of [false,true])for(const width of [288,328,358,382,600,750,1200]){
    await page.setViewportSize({width:width<600?width:1600,height:1400});
    await section(page,{width,mode,plain,grouped,hidden:true});
    const sample=await geometry(page);contained(sample);
    assert.equal(sample.text,'Machines');assert.equal(sample.buttons[1].icon,'rgb(67, 160, 71)');
    if(width<=750)assert.ok(sample.buttons.every(b=>b.rect.top>=sample.title.bottom),'entire group moves under title');
    if(width===1200)assert.ok(sample.buttons.every(b=>b.rect.top<sample.title.bottom),'fitting group stays beside title');
    const button=sample.buttons[1].rect;await page.mouse.click((button.left+button.right)/2,(button.top+button.bottom)/2);assert.equal(await page.evaluate(()=>window.clicks),1);
  }
});

test('section title responds to resize, long labels and live theme changes without replacing controls or running JS',async t=>{
  const page=await fixture(t,{prepare:null});
  await section(page,{width:1200,labels:['Disk : 17,5 %'],name:'Machines'});
  const initial=await geometry(page);contained(initial);
  await page.evaluate(()=>{window.savedButton=window.section.buttons[0];window.section.shell.style.width='288px';window.section.buttons[0].querySelector('span').textContent='Sauvegarde Home Assistant : indisponible depuis plusieurs semaines';window.section.root.querySelector('.bubble-name').textContent='Machines et infrastructure informatique';});
  const narrow=await geometry(page);contained(narrow);assert.ok(narrow.buttons[0].rect.top>=narrow.title.bottom);
  await page.evaluate(vars=>{for(const [k,v]of Object.entries(vars))document.body.style.setProperty('--'+k,v);window.section.shell.style.width='1200px';},nativeModes.dark);
  const changed=await geometry(page);contained(changed);assert.notEqual(changed.buttons[0].color,initial.buttons[0].color);assert.equal(changed.css,initial.css);
  assert.ok(await page.evaluate(()=>window.savedButton===window.section.buttons[0]));await page.evaluate(()=>window.savedButton.click());assert.equal(await page.evaluate(()=>window.clicks),1);
});

test('section title without badges retains its 32px height and native hidden controls stay hidden',async t=>{
  const page=await fixture(t,{prepare:null});await section(page,{width:328,labels:[],name:'Add-ons'});
  const sample=await geometry(page);contained(sample);assert.equal(sample.card.height,32);
});
