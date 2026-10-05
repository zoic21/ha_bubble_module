const paint = (selector,b,spec = {},auto = false) => {
  const st = hass.states[b.entity];
  const d = (b.entity || '').split('.')[0];
  let fg = '', bg = '', opacity = '';
  if (auto && st) {
    const active = d === 'climate' ? ['heating','preheating','cooling'].includes(st.attributes.hvac_action) : d === 'cover' ? ['open','opening','closing'].includes(st.state) : st.state === 'on';
    const activeColor = d === 'cover' || st.attributes.hvac_action === 'cooling' ? 'var(--info-color, #039be5)' : 'var(--warning-color, #ff9800)';
    fg = active ? activeColor : 'var(--secondary-text-color)';
    bg = active ? 'color-mix(in srgb, '+activeColor+' 16%, '+neutralSurface+')' : 'color-mix(in srgb, var(--primary-text-color) 4%, '+neutralSurface+')';
    opacity = ['unknown','unavailable'].includes(st.state) ? '0.4' : '1';
  }
  if (String(spec.color ?? '').trim()) fg = color(spec.color,fg || accent,b.entity);
  if (String(spec.background ?? '').trim()) bg = color(spec.background,bg || 'transparent',b.entity);
  if (spec.opacity != null) opacity = number(render(spec.opacity,b.entity),1,0,1);
  const target = layout === 'room' && roleSet.has(b) ? selector+' .bubble-sub-button-icon' : selector;
  const declarations = (fg?'color:'+fg+' !important;':'')+(bg?'background:'+bg+' !important;':'')+(opacity!==''?'opacity:'+opacity+' !important;':'');
  if (declarations) css += target+' {'+declarations+'}';
  if (spec.column != null) css += selector+' { --room-control-column:'+ (number(spec.column,1,1,roomColumns)-1) +'; }';
  return opacity;
};
if (layout === 'room' && o.room_auto_colors !== false) roles.forEach(({b,selector}) => {
  // Explicit role styles paint the same automatic defaults plus their overrides below.
  if (!structure.styledButtons.has(b)) paint(selector,b,{},true);
});
if (layout === 'header') flat.forEach((b,i) => paint('ha-card .bubble-sub-button-'+(i+1), b, {background:'color-mix(in srgb, '+accent+' 12%, '+neutralSurface+')'}));
const visualSwitches = (layout === 'square' || layout === 'compact') && structure.hasSwitches;
if (visualSwitches && !structure.switchCSS) {
  const selectors = styles.filter(style => style.visualSwitch).map(style => 'ha-card[data-dp-layout] .bubble-sub-button.'+style.cls);
  const select = suffix => selectors.map(selector => selector+suffix).join(', ');
  // Share geometry within this card; only the track, position and opacity vary per switch.
  structure.switchCSS = `
    ${select('')} {
      position: relative; width: 52px !important; min-width: 52px !important;
      height: 34px !important; flex: 0 0 52px; padding: 0 !important;
      border-radius: 17px !important; box-shadow: none !important;
    }
    ${select(' :is(.bubble-sub-button-icon,.bubble-sub-button-name-container)')} { display: none !important; }
    ${select('::before')} {
      content: ''; position: absolute; left: 2px; top: 3px;
      width: 48px; height: 28px; border-radius: 14px;
      background: var(--dp-switch-track); pointer-events: none;
      transition: background 160ms ease;
    }
    ${select('::after')} {
      content: ''; position: absolute; left: 4px; top: 5px;
      width: 24px; height: 24px; border-radius: 50%; background: #fff;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
      transform: translateX(var(--dp-switch-offset));
      transition: transform 160ms ease, background 160ms ease; pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      ${select('::before')}, ${select('::after')} { transition: none; }
    }
  `;
}
if (visualSwitches) css += structure.switchCSS;
styles.forEach(({cls,b,spec,visualSwitch,lock}) => {
  const opacity = paint('ha-card .'+cls,b,spec,layout === 'room' && o.room_auto_colors !== false && roleSet.has(b));
  if (layout !== 'room' && !visualSwitch) css += subThresholdCSS('ha-card .'+cls,b,spec,structure.thresholdScales.get(spec));
  if (spec.type === 'mode' && layout === 'compact'
      && (!b.sub_button_type || b.sub_button_type === 'default')) {
    css += `
      ha-card[data-dp-layout="compact"] .${cls} {
        width: 46px; min-width: 46px; height: 44px; padding: 0;
        box-sizing: border-box; font-size: 11px; font-weight: var(--signature-font-weight-semibold, 600);
      }
    `;
  }
  // Reuse Bubble's Jinja renderer, including dependencies on other entities.
  const iconName = render(spec.icon,b.entity).trim();
  if (/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(iconName)) {
    root.querySelectorAll('ha-card .'+cls+' .bubble-sub-button-icon').forEach(icon => {
      desiredIcons.set(icon,iconName);
    });
  }
  // Style only: explicit lock actions, visibility and native handlers stay untouched.
  if (visualSwitch && visualSwitches) {
    const state = hass.states[b.entity]?.state;
    // ON means passage allowed for locks; transitional/unknown states are dimmed.
    const on = state === (lock ? 'unlocked' : 'on');
    const available = (lock ? ['locked','unlocked'] : ['on','off']).includes(state);
    const selector = 'ha-card[data-dp-layout] .bubble-sub-button.'+cls;
    // Inherit the configured icon/card color unless this switch has its own color.
    const tint = color(spec.color,iconTint,b.entity);
    const track = on ? tint : 'color-mix(in srgb, var(--primary-text-color) 18%, '+neutralSurface+')';
    css += `
      ${selector} {
        --dp-switch-track: ${track}; --dp-switch-offset: ${on ? '20px' : '0px'};
        background: transparent !important; opacity: ${(opacity === '' ? 1 : opacity) * (available ? 1 : .4)} !important;
      }
    `;
    if (layout === 'square' && o.controls === 'measure' && b === flat[0])
      css += 'ha-card[data-dp-controls="measure"] .bubble-name { padding-right: 54px; }';
  }

});
iconOverrides.forEach((value,icon) => {
  if (desiredIcons.has(icon)) return;
  restoreIcon(icon,value);
  iconOverrides.delete(icon);
});
desiredIcons.forEach((iconName,icon) => {
  const current = icon.getAttribute('icon');
  const previous = iconOverrides.get(icon);
  const original = previous && current === previous.applied ? previous.original : current;
  iconOverrides.set(icon,{original,applied:iconName});
  if (current !== iconName) icon.setAttribute('icon',iconName);
});
