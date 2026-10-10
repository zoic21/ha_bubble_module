const {loadModule}=require('../../shared/test/module.cjs');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render, theme, nativeModes} = require('./fixtures.cjs');
const card = (result, id) => {
  const found = result.cards.find(item => item.id === id);
  assert.ok(found, id);
  return found;
};
const style = (result, id, selector) => {
  const found = card(result, id).styles[selector];
  assert.ok(found, `${id}: ${selector}`);
  return found;
};
const surfaceIds = ['compact', 'compact-standard', 'square', 'room', 'media', 'cover', 'climate', 'number', 'flow', 'weather-ranges', 'weather-ribbon', 'weather-summary', 'wind'];
const same = (a, b, properties) => properties.forEach(key => assert.equal(a[key], b[key], key));

test('Module editor sections follow native expansion-panel radii across live theme changes',async t => {
  const {editorBootstrap}=require('../../shared/test/editor-bootstrap.cjs');
  const definitions=['signature-square','signature-compact','signature-room','signature-header','signature-flow','signature-weather','signature-wind-rose','alert_manager'].map(name=>loadModule(name));
  const modules=definitions.map(definition=>({bootstrap:editorBootstrap(definition),schema:definition.editor.find(field=>field.fields)}));
  const page=await fixture(t);
  const result=await page.evaluate(async modules=>{
    // Audited CSS roles from Bubble 3.4.1's bc_group and HA's expansion panel.
    customElements.define('ha-expansion-panel',class extends HTMLElement {
      constructor(){super();const root=this.attachShadow({mode:'open'});root.innerHTML='<style>:host{display:block} :host([outlined]),.top{border-radius:var(--ha-card-border-radius,var(--ha-border-radius-lg))} :host([expanded]) .top{border-bottom-left-radius:0;border-bottom-right-radius:0}</style><div class="top">Section</div>';}
    });
    const groupCSS='ha-expansion-panel{border-radius:6px;--ha-card-border-radius:6px}';
    const groupSheet=new CSSStyleSheet();groupSheet.replaceSync(groupCSS);
    customElements.define('ha-form-bc_group',class extends HTMLElement {
      createRenderRoot(){
        const root=this.attachShadow({mode:'open'});
        if(this.hasAttribute('fallback-style')){const style=document.createElement('style');style.textContent=groupCSS;root.append(style);}
        else root.adoptedStyleSheets=[groupSheet];
        return root;
      }
      connectedCallback(){const root=this.createRenderRoot();this.panel=document.createElement('ha-expansion-panel');this.panel.setAttribute('outlined','');root.append(this.panel);}
    });
    customElements.define('ha-selector-bc_object',class extends HTMLElement {
      _itemFormData(value){return {...value};}
      _generateSchema(){return [{name:'bc_group_0',type:'bc_group',flatten:true,schema:[]}];}
      _computeLabel(){return '';}_computeHelper(){return '';}
    });
    const container=document.createElement('div');document.body.append(container);
    for(const module of modules){new Function(module.bootstrap)();const form=document.createElement('ha-form-'+module.schema.type);Object.assign(form,{schema:module.schema,data:{},hass:{states:{}}});container.append(form);}
    await Promise.resolve();
    const editors=[...container.children].map(form=>form._form.schema[0].type);
    const native=document.createElement('ha-expansion-panel');native.setAttribute('outlined','');container.append(native);
    const base=document.createElement('ha-form-bc_group');container.append(base);
    const styled=document.createElement('ha-form-signature_group');container.append(styled);
    const fallback=document.createElement('ha-form-signature_group');fallback.setAttribute('fallback-style','');container.append(fallback);
    const read=panel=>({radius:getComputedStyle(panel).borderTopLeftRadius,top:getComputedStyle(panel.shadowRoot.querySelector('.top')).borderTopLeftRadius,bottom:getComputedStyle(panel.shadowRoot.querySelector('.top')).borderBottomLeftRadius});
    const snapshots=[];
    for(const radius of ['22px','17px',null]){
      container.style.setProperty('--ha-border-radius-lg','12px');
      if(radius)container.style.setProperty('--ha-card-border-radius',radius);else container.style.removeProperty('--ha-card-border-radius');
      for(const expanded of [false,true]){
        for(const panel of [native,styled.panel,fallback.panel])panel.toggleAttribute('expanded',expanded);
        snapshots.push({radius:radius||'12px',expanded,native:read(native),styled:read(styled.panel),fallback:read(fallback.panel),base:read(base.panel)});
      }
    }
    return {editors,snapshots,renderInherited:Object.getPrototypeOf(customElements.get('ha-form-signature_group').prototype)===customElements.get('ha-form-bc_group').prototype};
  },modules);
  assert.deepEqual(result.editors,Array(8).fill('signature_group'));
  assert.equal(result.renderInherited,true);
  for(const snapshot of result.snapshots){
    assert.deepEqual(snapshot.styled,snapshot.native);
    assert.deepEqual(snapshot.fallback,snapshot.native,'Lit style-tag fallbacks must match adopted stylesheets');
    assert.equal(snapshot.styled.radius,snapshot.radius);
    assert.equal(snapshot.styled.bottom,snapshot.expanded?'0px':snapshot.radius);
    assert.equal(snapshot.base.radius,'6px','Other Bubble forms must retain their own styles');
  }
});

test('Flow inline editor keeps one root label and hides nested labels in the browser',async t => {
  const definition=loadModule('signature-flow');
  const {editorBootstrap}=require('../../shared/test/editor-bootstrap.cjs');
  const bootstrap=editorBootstrap(definition);
  const schema=definition.editor.find(field=>field.type==='signature_flow_options');
  const page=await fixture(t);
  const result=await page.evaluate(async ({bootstrap,schema})=>{
    // Browser DOM fixture for the bridge; not a Home Assistant form runtime.
    customElements.define('ha-selector-bc_object',class extends HTMLElement {
      _itemFormData(value){return {...value};}
      _generateSchema(fields){return Object.entries(fields).map(([name,field])=>({name,selector:field.selector}));}
      _computeLabel(field){return this.selector.bc_object.fields[field.name].label;}
      _computeHelper(){return '';}
      _itemChanged(event){event.stopPropagation();this.dispatchEvent(new CustomEvent('value-changed',{detail:event.detail}));}
    });
    new Function(bootstrap)();
    const root=document.createElement('ha-form-signature_flow_options');
    Object.assign(root,{schema,data:{},hass:{states:{}},label:schema.label});document.body.append(root);
    const nested=document.createElement('ha-form-signature_flow_options');
    Object.assign(nested,{schema:{...schema.fields.slots.fields[1],slot:true,show_label:false},data:{primary:'sensor.power'},hass:{states:{}},label:'Réglages de l’emplacement 1'});document.body.append(nested);
    await Promise.resolve();
    const events=[];root.addEventListener('value-changed',event=>events.push({value:event.detail.value,target:event.target===root}));
    root._form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{height:400}},bubbles:true,composed:true}));
    return {
      rootDisplay:getComputedStyle(root._labelEl).display,
      nestedDisplay:getComputedStyle(nested._labelEl).display,
      rootChildren:[...root.shadowRoot.children].map(child=>child.localName),
      nestedChildren:[...nested.shadowRoot.children].map(child=>child.localName),
      engineConnected:root._engine.isConnected,
      enabled:nested._form.data.enabled,animate:nested._form.data.animate,events
    };
  },{bootstrap,schema});
  assert.equal(result.rootDisplay,'block');assert.equal(result.nestedDisplay,'none');
  assert.deepEqual(result.rootChildren,['style','label','ha-form']);
  assert.deepEqual(result.nestedChildren,['style','label','ha-form']);
  assert.equal(result.engineConnected,false);
  assert.equal(result.enabled,true);assert.equal(result.animate,true);
  assert.deepEqual(result.events,[{value:{height:400},target:true}]);
});

test('Signature preserves the host page palette and uses its native card surface', async t => {
  const page = await fixture(t);
  const bodyColors = () => page.evaluate(() => {
    const computed = getComputedStyle(document.body);
    return {background: computed.backgroundColor, color: computed.color};
  });
  for (const mode of ['light', 'dark']) {
    const nativePalette = {
      'primary-background-color': mode === 'light' ? '#ededed' : '#121314',
      'primary-text-color': mode === 'light' ? '#234567' : '#dedcda',
      'ha-card-background': mode === 'light' ? '#fefdfc' : '#252627'
    };
    const plain = await render(page, {mode, nativePalette, plain: true});
    const body = await bodyColors();
    const themed = await render(page, {mode, nativePalette});
    assert.deepEqual(await bodyColors(), body);
    for (const id of surfaceIds) same(style(themed, id, '.bubble-container'),
      style(plain, id, '.bubble-container'), ['backgroundColor']);
    assert.equal(style(themed, 'compact', '.bubble-name').color, body.color);
  }
});

test('section titles stay transparent without borders or shadows in both modes', async t => {
  const page = await fixture(t);
  for (const mode of ['light', 'dark']) for (const plain of [false, true]) {
    const result = await render(page, {mode, plain, nameText: 'Prévisions', titleSurface: true,
      overrides: {'bubble-main-background-color': '#abcdef', 'bubble-border': '1px solid red', 'bubble-box-shadow': '0 2px 10px black'}});
    for (const selector of ['ha-card', '.bubble-container']) {
      const title = style(result, 'title', selector);
      assert.equal(title.backgroundColor, 'rgba(0, 0, 0, 0)');
      assert.equal(title.borderTopWidth, '0px');
      assert.equal(title.boxShadow, 'none');
    }
    assert.equal(style(result, 'title', '.bubble-container').height, 32);
    assert.equal(style(result, 'title', '.bubble-name').fontSize, '18px');
  }
});

test('shared switch CSS preserves independent tracks, opacity, actions and live themes', async t => {
  const code = loadModule('signature-compact').code;
  const page = await fixture(t);
  await page.emulateMedia({reducedMotion:'reduce'});
  await render(page);
  const result = await page.evaluate(code => {
    const ctx=window.contexts[0],host=ctx.card.querySelector('.bubble-sub-button-container');
    const buttons=Array.from({length:4},(_,i)=>({entity:'switch.demo_'+i,css_class:'switch-'+i,tap_action:{action:'toggle'}}));
    ctx.config={...ctx.config,sub_button:buttons,signature_compact:{sub_button_styles:Object.fromEntries(buttons.map((b,i)=>[b.css_class,{type:'switch',color:'#008080',opacity:i===2?0.5:1}]))}};
    buttons.forEach((b,i)=>{
      const el=document.createElement('div');el.className='bubble-sub-button '+b.css_class;
      el.innerHTML='<ha-icon class="bubble-sub-button-icon"></ha-icon><span class="bubble-sub-button-name-container">État</span>';
      host.append(el);ctx._hass.states[b.entity]={state:['on','off','unavailable','on'][i],attributes:{}};
    });
    const nodes=[...host.children],config=JSON.stringify(ctx.config);
    const style=[...ctx.card.getRootNode().querySelectorAll('style')].at(-1);
    const apply=()=>{style.textContent=new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);};
    const read=()=>nodes.map(el=>{
      const own=getComputedStyle(el),track=getComputedStyle(el,'::before'),knob=getComputedStyle(el,'::after');
      return {width:own.width,height:own.height,opacity:own.opacity,trackWidth:track.width,trackHeight:track.height,trackColor:track.backgroundColor,knobWidth:knob.width,transform:knob.transform,icon:getComputedStyle(el.firstElementChild).display};
    });
    apply();const initial=read();
    ctx._hass.states[buttons[1].entity]={state:'on',attributes:{}};apply();const toggled=read();
    ctx._hass.states[buttons[1].entity]={state:'off',attributes:{}};apply();
    document.body.style.setProperty('--signature-card-background','#1c1c1e');const dark=read();
    const sameNodes=nodes.every((node,i)=>host.children[i]===node),sameConfig=config===JSON.stringify(ctx.config);
    ctx.config={...ctx.config,signature_compact:{}};apply();
    return {initial,toggled,dark,sameNodes,sameConfig,restored:nodes.map(el=>getComputedStyle(el.firstElementChild).display)};
  },code);
  for (const control of result.initial) {
    assert.equal(control.width,'52px');assert.equal(control.height,'34px');
    assert.equal(control.trackWidth,'48px');assert.equal(control.trackHeight,'28px');
    assert.equal(control.knobWidth,'24px');assert.equal(control.icon,'none');
  }
  assert.equal(result.initial[0].transform,'matrix(1, 0, 0, 1, 20, 0)');
  assert.equal(result.initial[1].transform,'matrix(1, 0, 0, 1, 0, 0)');
  assert.equal(result.initial[2].opacity,'0.2');
  assert.equal(result.toggled[1].transform,'matrix(1, 0, 0, 1, 20, 0)');
  assert.notEqual(result.initial[1].trackColor,result.dark[1].trackColor);
  assert.ok(result.sameNodes);assert.ok(result.sameConfig);
  assert.ok(result.restored.every(display=>display!=='none'));
});

test('light/dark surfaces agree across five widths and fine/coarse pointers', async t => {
  const windCode=loadModule('signature-wind-rose').code;
  for (const touch of [false, true]) {
    const page = await fixture(t, {hasTouch: touch});
    for (const mode of ['light', 'dark']) for (const width of [288, 328, 358, 382, 600]) {
      const result = await render(page, {mode, width});
      const reference = style(result, 'compact', '.bubble-container');
      assert.equal(reference.borderRadius, '22px');
      assert.equal(reference.borderTopWidth, '1px');
      for (const id of surfaceIds) same(style(result, id, '.bubble-container'), reference,
        ['backgroundColor', 'borderRadius', 'borderTopWidth', 'borderTopColor', 'boxShadow']);
      assert.equal(style(result, 'weather-summary', '.sw-tab').height, touch ? 44 : 40);
      assert.equal(style(result, 'wind', '.swr-tab').height, touch ? 44 : 40);
      for (const id of ['flow', 'wind', 'weather-summary']) assert.deepEqual(card(result, id).overflow, [], `${id} ${width}`);
      const visibility=await page.evaluate(code=>{
        const ctx=window.contexts.find(ctx=>ctx._signatureWindRose),r=ctx._signatureWindRose;
        const apply=()=>new Function('hass','onTeardown','renderTemplate','return `'+code+'`;').call(ctx,ctx._hass,fn=>ctx.teardown=fn,v=>v);
        const height=()=>r.canvas.getBoundingClientRect().height;
        const initial=height(),toolbarHeight=r.toolbar.getBoundingClientRect().height,svgWidth=r.svg.getBoundingClientRect().width;
        ctx.config.signature_wind_rose.show_period_buttons=false;apply();
        const hidden=height(),display=getComputedStyle(r.toolbar).display,sameWidth=r.svg.getBoundingClientRect().width===svgWidth;
        delete ctx.config.signature_wind_rose.show_period_buttons;apply();
        return {initial,toolbarHeight,hidden,display,sameWidth,restored:height()};
      },windCode);
      assert.equal(visibility.display,'none');assert.ok(visibility.sameWidth);
      assert.ok(Math.abs(visibility.initial-visibility.hidden-visibility.toolbarHeight)<0.1);
      assert.equal(visibility.restored,visibility.initial);
    }
  }
});

test('native graph frames follow Signature borders and live theme changes', async t => {
  const page = await fixture(t);
  await render(page, {mode: 'light'});
  const result = await page.evaluate(({theme, nativeModes}) => {
    // Native HA ha-card frame; Statistics Graph only removes it for card_border: false.
    const sheet = document.createElement('style');
    sheet.textContent = '#native-graph-frame{background:var(--ha-card-background,var(--card-background-color,white));box-shadow:var(--ha-card-box-shadow,none);border-radius:var(--ha-card-border-radius,12px);border-width:var(--ha-card-border-width,1px);border-style:solid;border-color:var(--ha-card-border-color,var(--divider-color,#e0e0e0))}';
    document.head.append(sheet);
    const graph = document.createElement('ha-card');
    graph.id = 'native-graph-frame';
    document.body.append(graph);
    const compact = window.contexts[0].card.querySelector('.bubble-container');
    const properties = ['backgroundColor','borderRadius','borderTopWidth','borderTopColor','boxShadow'];
    const read = node => {
      const computed = getComputedStyle(node);
      return Object.fromEntries(properties.map(key => [key, computed[key]]));
    };
    const snapshots = [];
    for (const mode of ['light','dark','light']) {
      for (const [key,value] of Object.entries({...nativeModes[mode],...theme.modes[mode]}))
        document.body.style.setProperty('--'+key,value);
      snapshots.push({graph:read(graph),compact:read(compact)});
    }
    document.body.style.setProperty('--signature-card-border-color','#445566');
    document.body.style.setProperty('--signature-card-box-shadow','none');
    snapshots.push({graph:read(graph),compact:read(compact)});
    graph.style.border = 'none';
    const disabled = read(graph);
    return {snapshots,disabled,sameNodes:window.contexts[0].card.querySelector('.bubble-container')===compact};
  }, {theme,nativeModes});
  for (const snapshot of result.snapshots) {
    assert.deepEqual(snapshot.graph,snapshot.compact);
    assert.equal(snapshot.graph.borderTopWidth,'1px');
  }
  assert.notEqual(result.snapshots[0].graph.borderTopColor,result.snapshots[1].graph.borderTopColor);
  assert.deepEqual(result.snapshots[0],result.snapshots[2]);
  assert.equal(result.snapshots[3].graph.borderTopColor,'rgb(68, 85, 102)');
  assert.equal(result.snapshots[3].graph.boxShadow,'none');
  assert.equal(result.disabled.borderTopWidth,'0px');
  assert.ok(result.sameNodes);
});

test('without Signature theme the same HA surface, border and shadow fallbacks apply', async t => {
  const page = await fixture(t);
  for (const overrides of [
    {'ha-card-background': '#123456', 'card-background-color': '#abcdef'},
    {'ha-card-background': '#1c1c1e', 'primary-text-color': '#f5f5f7', 'secondary-text-color': '#a1a1a6'},
    {'ha-card-box-shadow': '0 3px 8px rgb(0 0 0 / .2)'},
    {'signature-card-background': '#eeddcc', 'signature-card-box-shadow': 'none', 'signature-card-border-color': '#445566'}
  ]) {
    const result = await render(page, {plain: true, width: 600, overrides});
    const reference = style(result, 'compact', '.bubble-container');
    for (const id of surfaceIds) same(style(result, id, '.bubble-container'), reference,
      ['backgroundColor', 'borderTopColor', 'boxShadow']);
    if (overrides['ha-card-background'] === '#123456') assert.equal(reference.backgroundColor, 'rgb(18, 52, 86)');
    if (overrides['signature-card-background']) assert.equal(reference.backgroundColor, 'rgb(238, 221, 204)');
  }
});

test('ordinary native and media states use secondary color at full opacity', async t => {
  const page = await fixture(t);
  for (const mode of ['light', 'dark']) {
    const result = await render(page, {mode});
    const reference = style(result, 'weather-summary', '.sw-condition');
    for (const id of ['compact-standard', 'cover', 'climate', 'media']) {
      const state = style(result, id, '.bubble-state');
      assert.equal(state.opacity, '1');
      assert.equal(state.fontWeight, '400');
      assert.equal(state.fontSize, '13px');
      assert.equal(state.color, reference.color);
    }
  }
});

test('names, numeric values, temperature units and captions retain distinct roles', async t => {
  const page = await fixture(t);
  const result = await render(page, {width: 600});
  for (const [id, selector] of [['compact', '.bubble-name'], ['media', '.bubble-name'], ['flow', '.sf-label'], ['weather-summary', '.sw-name']]) {
    const name = style(result, id, selector);
    assert.equal(name.fontSize, '14px'); assert.equal(name.fontWeight, '600');
    assert.equal(name.letterSpacing, '-0.2px');
  }
  for (const [id, selector, size] of [['compact', '.bubble-state', '20px'], ['square', '.bubble-state', '28px'], ['flow', '.sf-value', '28px'], ['room', '.room-temperature', '30px'], ['weather-summary', '.sw-current-temperature', '30px']]) {
    assert.equal(style(result, id, selector).fontSize, size);
    assert.equal(style(result, id, selector).fontWeight, '500');
  }
  same(style(result, 'room', '.dp-room-unit'), style(result, 'weather-summary', '.sw-current-unit'), ['fontSize', 'fontWeight', 'color']);
  assert.equal(style(result, 'wind', '.swr-cardinal').fontSize, '12px');
  assert.equal(style(result, 'weather-summary', '.sw-entry-label').fontSize, '12px');
});

test('numeric readings keep tabular figures through button resets and responsive layouts', async t => {
  const page = await fixture(t);
  for (const scenario of [{width: 288}, {width: 600, mode: 'dark'}, {width: 600, plain: true}]) {
    const result = await render(page, scenario);
    for (const [id, selector] of [
      ['compact', '.bubble-state'], ['square', '.bubble-state'], ['room', '.room-temperature'],
      ['flow', '.sf-value'], ['wind', '.swr-value'],
      ...['weather-ranges', 'weather-ribbon', 'weather-summary'].flatMap(id =>
        ['.sw-current-temperature', '.sw-metric', '.sw-high', '.sw-low'].map(selector => [id, selector]))
    ]) assert.equal(style(result, id, selector).fontVariantNumeric, 'tabular-nums', `${id} ${selector}`);
    assert.equal(style(result, 'weather-ranges', '.sw-high').fontSize, scenario.width <= 360 ? '15px' : '16px');
    assert.equal(style(result, 'weather-ribbon', '.sw-high').fontSize, scenario.width <= 360 ? '18px' : '20px');
  }
});

test('period controls agree in active/inactive colors, font, padding and corners', async t => {
  const page = await fixture(t);
  for (const mode of ['light', 'dark']) {
    const result = await render(page, {mode});
    for (const suffix of ['[aria-pressed="true"]', '[aria-pressed="false"]']) same(
      style(result, 'weather-summary', '.sw-tab' + suffix), style(result, 'wind', '.swr-tab' + suffix),
      ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'boxShadow', 'borderRadius', 'paddingLeft', 'paddingRight', 'minHeight']);
    same(style(result, 'weather-summary', '.sw-tabs'), style(result, 'wind', '.swr-tabs'), ['borderRadius', 'backgroundColor', 'paddingLeft', 'paddingRight']);
  }
});

test('custom fonts grow secondary rows and reach media and Flow mobile text', async t => {
  const page = await fixture(t);
  const result = await render(page, {overrides: {'signature-name-font-size': '18px', 'signature-secondary-font-size': '17px', 'signature-font-weight-normal': 450}});
  for (const id of ['compact-standard', 'media']) assert.equal(style(result, id, '.bubble-state').fontSize, '17px');
  for (const id of ['compact', 'square', 'room']) {
    const secondary = style(result, id, '.dp-secondary');
    assert.equal(secondary.fontSize, '17px');
    assert.ok(parseFloat(secondary.lineHeight) >= 20.4);
  }
  assert.equal(style(result, 'media', '.bubble-name').fontSize, '18px');
  assert.equal(style(result, 'flow', '.sf-slot-3 .sf-secondary').fontSize, '17px');
  assert.equal(style(result, 'flow', '.sf-secondary').fontWeight, '450');
  const rows = await page.locator('[data-id="square"] .bubble-content-container').evaluate(el => getComputedStyle(el).gridTemplateRows.split(' ').map(parseFloat));
  assert.ok(rows.at(-1) >= 20.39);
});

test('derived small/control/tooltip radii honor custom values and explicit overrides', async t => {
  const page = await fixture(t);
  const result = await render(page, {overrides: {'signature-icon-border-radius': '8px', 'signature-control-border-radius': '9px', 'signature-card-border-radius': '18px', 'signature-control-box-shadow': 'none'}});
  for (const id of surfaceIds) assert.equal(style(result, id, '.bubble-container').borderRadius, '18px');
  assert.equal(style(result, 'flow', '.sf-icon').borderRadius, '6px');
  for (const [id, selector] of [['weather-summary', '.sw-tab'], ['wind', '.swr-tab']]) assert.equal(style(result, id, selector).borderRadius, '6px');
  assert.equal(style(result, 'wind', '.swr-tooltip').borderRadius, '8px');
  assert.equal(style(result, 'wind', '.swr-tooltip').boxShadow, 'none');
  const explicit = await render(page, {overrides: {'signature-icon-small-border-radius': '4px', 'signature-tooltip-border-radius': '7px'}});
  assert.equal(style(explicit, 'flow', '.sf-icon').borderRadius, '4px');
  assert.equal(style(explicit, 'wind', '.swr-tooltip').borderRadius, '7px');
});

test('divider lengths share 1px thickness and one inset, including forecast rows', async t => {
  const page = await fixture(t);
  for (const width of [288, 600]) for (const inset of [0, 16, 24]) {
    const result = await render(page, {width, overrides: {'signature-divider-inset': inset + 'px'}});
    const lines = ['room', 'weather-ranges', 'weather-summary', 'wind'].flatMap(id => {
      assert.ok(card(result, id).dividers.length, id);
      return card(result, id).dividers;
    });
    for (const line of lines) {
      assert.equal(line.height, '1px');
      // The card border is 1px; inset starts at its inner edge.
      assert.ok(Math.abs(line.left - inset - 1) < .1, JSON.stringify(line));
      assert.ok(Math.abs(line.right - inset - 1) < .1, JSON.stringify(line));
      assert.equal(line.color, lines[0].color);
    }
  }
});

test('theme mode switches update existing elements without running module code again', async t => {
  const page = await fixture(t);
  await render(page);
  const switched = await page.evaluate(dark => {
    for (const [key, value] of Object.entries(dark)) document.body.style.setProperty('--' + key, value);
    return [...document.querySelectorAll('.fixture')].map(shell => ({id: shell.dataset.id,
      color: getComputedStyle(shell.shadowRoot.querySelector('.bubble-container')).backgroundColor,
      shadow: getComputedStyle(shell.shadowRoot.querySelector('.bubble-container')).boxShadow}));
  }, {...nativeModes.dark, ...theme.modes.dark});
  for (const id of surfaceIds) {
    assert.equal(switched.find(item => item.id === id).color, 'rgb(28, 28, 28)');
    assert.match(switched.find(item => item.id === id).shadow, /0\.2/);
  }
});

test('keyboard focus preserves themed period corners and visible 2px outlines', async t => {
  const page = await fixture(t);
  await render(page, {overrides: {'signature-control-border-radius': '9px'}});
  await page.keyboard.press('Tab');
  for (const [id, selector] of [['weather-summary', '.sw-tab'], ['wind', '.swr-tab']]) {
    const locator = page.locator(`[data-id="${id}"] ${selector}`).first();
    await locator.focus();
    const focused = await locator.evaluate(el => ({visible: el.matches(':focus-visible'), radius: getComputedStyle(el).borderRadius, outline: getComputedStyle(el).outlineWidth}));
    assert.equal(focused.visible, true); assert.equal(focused.radius, '6px'); assert.equal(focused.outline, '2px');
  }
});

test('signed four-digit Flow watts retain mobile wire space and stable density', async t => {
  const page = await fixture(t, true);
  const code = loadModule('signature-flow').code;
  for (const mode of ['light', 'dark']) for (const width of [358, 374, 382, 488, 490, 600]) {
    await render(page, {width, mode, value: -9999});
    const dimensions = await page.evaluate(async code => {
      const ctx = window.contexts.find(ctx => ctx._signatureFlow);
      ctx._hass.locale.number_format = 'none';
      ctx._hass.states['sensor.demo'].attributes.unit_of_measurement = 'W';
      new Function('hass', 'onTeardown', 'renderTemplate', 'return `'+code+'`;').call(ctx, ctx._hass, fn => ctx.teardown = fn, v => v);
      const r = ctx._signatureFlow;
      for (let i = 0; i < 3; i++) {
        r.draw();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      const padding = getComputedStyle(r.host), node = r.nodes[2];
      const box = r.canvas.getBoundingClientRect();
      return {
        padding: [padding.paddingTop, padding.paddingRight, padding.paddingBottom, padding.paddingLeft],
        gap: getComputedStyle(node.el).columnGap,
        small: r.canvas.classList.contains('sf-small'), narrow: r.canvas.classList.contains('sf-narrow'),
        text: node.value.textContent, font: getComputedStyle(node.number).fontSize,
        length: r.edges[2].length, unitGap: r.edges[2].start - (node.unit.getBoundingClientRect().right - box.left),
        junction: box.left + r.center.x, cardCenter: r.host.getBoundingClientRect().left + r.host.getBoundingClientRect().width / 2
      };
    }, code);
    const compact = width < 490;
    assert.deepEqual(dimensions.padding, ['14px', compact ? '10px' : '14px', '14px', compact ? '10px' : '14px']);
    assert.equal(dimensions.gap, compact ? '8px' : '10px');
    assert.equal(dimensions.small, width < 382);
    assert.equal(dimensions.narrow, compact);
    assert.equal(dimensions.text, '-9999 W');
    assert.equal(dimensions.font, width < 382 ? '26px' : '28px');
    assert.ok(dimensions.length >= 24, JSON.stringify({width, mode, dimensions}));
    assert.ok(Math.abs(dimensions.unitGap - 12) < .1);
    assert.ok(Math.abs(dimensions.junction - dimensions.cardCenter) < .1);
  }
});

test('long Flow numbers fit while secondary text stays aligned under each value', async t => {
  const page = await fixture(t, {hasTouch: true});
  for (const mode of ['light', 'dark']) for (const plain of [false, true]) for (const width of [288, 328, 358, 382, 600]) {
    const result = await render(page, {width, mode, plain, value: 1234567.8, nameText: 'Énergie de la maison — mesure détaillée'});
    const sizes = await page.locator('[data-id="flow"] .sf-content').evaluateAll(nodes => nodes.map(el => {
      const value = el.querySelector('.sf-value'), secondary = el.querySelector('.sf-secondary');
      const label = el.querySelector('.sf-label').getBoundingClientRect();
      return {
        content: el.getBoundingClientRect().width,
        value: value.getBoundingClientRect().width,
        number: value.firstElementChild.textContent,
        secondary: secondary.textContent,
        labelLeft: label.left, valueLeft: value.getBoundingClientRect().left,
        secondaryLeft: secondary.getBoundingClientRect().left,
        valueTop: value.getBoundingClientRect().top, secondaryTop: secondary.getBoundingClientRect().top
      };
    }));
    for (const size of sizes) {
      const detail = JSON.stringify({width, mode, plain, size});
      assert.ok(size.number.includes('234')); assert.ok(size.value <= size.content + 1, detail);
      if (size.secondary) {
        assert.ok(Math.abs(size.secondaryLeft - size.labelLeft) < .1, detail);
        assert.ok(Math.abs(size.secondaryLeft - size.valueLeft) < .1, detail);
        assert.ok(size.secondaryTop > size.valueTop, detail);
      }
    }
    assert.equal(style(result, 'flow', '.sf-slot-3 .sf-secondary').fontSize, '13px');
    assert.equal(style(result, 'flow', '.sf-unit').fontSize, '16px');
  }
});

test('unavailable readings and reduced motion keep a stable render', async t => {
  const page = await fixture(t);
  await page.emulateMedia({reducedMotion: 'reduce'});
  const result = await render(page, {value: 'unavailable'});
  assert.deepEqual(result.errors, []);
  const transitions = await page.locator('[data-id="flow"] .sf-flow').evaluateAll(nodes => nodes.map(el => getComputedStyle(el).transitionDuration));
  transitions.forEach(value => assert.equal(value, '0s'));
  const active = await page.locator('[data-id="flow"] .sf-canvas').evaluate(el => el.getAnimations({subtree: true}).filter(animation => animation.playState === 'running').length);
  assert.equal(active, 0);
  assert.equal(style(result, 'compact-standard', '.bubble-state').opacity, '1');
});

test('native cover/media controls and Signature cover honor the shared control radius', async t => {
  const page = await fixture(t);
  for (const overrides of [{}, {'signature-control-border-radius': '9px'}]) {
    const result = await render(page, {overrides});
    const radius = overrides['signature-control-border-radius'] || '14px';
    for (const [id, selector] of [['cover', '.bubble-cover-button'], ['media', '.bubble-media-button'], ['native-cover', '.bubble-cover-button'], ['native-media', '.bubble-media-button']]) {
      assert.equal(style(result, id, selector).borderRadius, radius, id);
    }
  }
  const plain = await render(page, {plain: true});
  assert.equal(style(plain, 'cover', '.bubble-cover-button').borderRadius, '14px');
  assert.equal(style(plain, 'media', '.bubble-media-button').borderRadius, '14px');
});

test('real media title/artist follow the name/secondary roles and theme weights', async t => {
  const page = await fixture(t);
  for (const scenario of [{}, {plain: true}, {overrides: {'signature-name-font-size': '18px', 'signature-secondary-font-size': '17px', 'signature-font-weight-normal': 450, 'signature-font-weight-semibold': 550}}]) {
    const result = await render(page, scenario);
    same(style(result, 'media', '.bubble-title'), style(result, 'media', '.bubble-name'), ['fontSize', 'fontWeight', 'letterSpacing']);
    same(style(result, 'media', '.bubble-artist'), style(result, 'media', '.bubble-state'), ['fontSize', 'fontWeight', 'color', 'opacity']);
    const lineHeight = await page.locator('[data-id="media"] .bubble-title').evaluate(el => getComputedStyle(el).lineHeight);
    assert.ok(parseFloat(lineHeight) >= parseFloat(style(result, 'media', '.bubble-title').fontSize));
  }
});
