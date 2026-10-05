/* @include shared/src/color-thresholds.js */
/* @include shared/src/color-contrast.js */
const entityThresholdColor = (scale, entity) => {
  if (!scale) return null;
  // Keep this read outside the configuration cache so Bubble tracks the source.
  const state = hass.states[scale.entity || entity];
  const unavailable = !state || ['unknown','unavailable'].includes(state.state);
  const value = unavailable ? null : scale.attribute ? state.attributes?.[scale.attribute] : state.state;
  return resolveThresholdColor(value,scale);
};
const subThresholdCSS = (selector, button, spec, scale) => {
  const manual = String(spec.icon_color ?? '').trim();
  const preferred = 'var(--primary-text-color,#212121)';
  const iconColor = manual ? color(spec.icon_color,preferred,button.entity) : preferred;
  const tint = entityThresholdColor(scale,button.entity);
  if (!tint) return manual ? selector + ' .bubble-sub-button-icon { color:' + iconColor + ' !important; }' : '';
  const background = thresholdRGB(tint) ? tint : 'color-mix(in srgb,var(--secondary-text-color) 16%,' + neutralSurface + ')';
  const minimum = button.show_state || button.show_name || button.show_attribute ? 4.5 : 3;
  // Do not animate background and foreground independently: an intermediate
  // frame could lose contrast even when both endpoint palettes are readable.
  return selector + '.bubble-sub-button { background:' + background + ' !important; transition:none !important; }'
    + readableForegroundCSS(selector + '.bubble-sub-button',background,preferred,minimum)
    + selector + ' :is(.bubble-sub-button-icon,.bubble-sub-button-name-container) { color:inherit !important; transition:none !important; }'
    + (manual ? readableForegroundCSS(selector + ' .bubble-sub-button-icon',background,iconColor,minimum) : '');
};
const mainThresholdCSS = (scale, entity, preferred) => {
  const tint = entityThresholdColor(scale,entity);
  if (!tint) return '';
  const background = thresholdRGB(tint) ? tint : 'color-mix(in srgb,var(--secondary-text-color) 16%,' + neutralSurface + ')';
  return 'ha-card[data-dp-layout] .bubble-main-icon-container { --bubble-icon-background-color:' + background
    + '; background:' + background + ' !important; transition:none !important; }'
    + 'ha-card[data-dp-layout] .bubble-main-icon { transition:none !important; }'
    + readableForegroundCSS('ha-card[data-dp-layout] .bubble-main-icon',background,preferred);
};
