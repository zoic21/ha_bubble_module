let css = 'ha-card { --dp-accent: '+accent+'; }';
// Opt-in trailing controls: leave native buttons and their actions intact.
if (layout === 'compact' && o.sub_buttons_position === 'end') {
  css += 'ha-card[data-dp-layout="compact"] .bubble-wrapper > .bubble-sub-button-container { order: 1 !important; }';
}
if (layout === 'compact' && kind === 'climate' && !String(o.icon_color ?? '').trim()) {
  const action = entityState?.attributes?.hvac_action;
  const fg = ['heating','preheating'].includes(action) ? 'var(--orange-color,#ff9800)' : action === 'cooling' ? 'var(--blue-color,#2196f3)' : entityState?.state === 'off' ? 'var(--secondary-text-color)' : accent;
  css += 'ha-card .bubble-main-icon { color:'+fg+' !important; }';
}
const iconOverride = String(o.icon_color ?? '').trim();
const iconTint = iconOverride ? color(o.icon_color,accent) : accent;
if (iconOverride || layout === 'square') css += 'ha-card .bubble-main-icon { color: '+iconTint+' !important; }';
if (!iconOverride && kind === 'button' && (layout === 'compact' || layout === 'square')) {
  const tint = entityThresholdColor(structure.thresholdScale,c.entity);
  if (tint) css += 'ha-card .bubble-main-icon { color:'+tint+' !important; }';
}
const iconOpacity = o.icon_opacity == null ? null : number(render(o.icon_opacity),null,0,1);
if (iconOpacity !== null) css += 'ha-card[data-dp-layout] .bubble-main-icon { opacity: '+iconOpacity+' !important; }';
if (String(o.border_color ?? '').trim()) css += 'ha-card .bubble-container { box-shadow: inset 0 0 0 2px '+color(o.border_color,'transparent')+' !important; }';
if (String(o.icon_border_color ?? '').trim()) css += 'ha-card .bubble-icon-container { box-shadow: inset 0 0 0 2px '+color(o.icon_border_color,'transparent')+' !important; }';
