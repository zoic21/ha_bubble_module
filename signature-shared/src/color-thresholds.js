/* @include shared/src/color-thresholds.js */
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
  const background = 'color-mix(in srgb,' + tint + ' 16%,' + neutralSurface + ')';
  const accent = thresholdRGB(tint) ? tint : preferred;
  // Keep the numeric accent in step with the graph; geometry/actions stay native.
  return selector + '.bubble-sub-button { background:' + background + ' !important; transition:none !important; }'
    + selector + '.bubble-sub-button { color:' + preferred + ' !important; }'
    + selector + ' .bubble-sub-button-name-container { color:inherit !important; transition:none !important; }'
    + selector + ' .bubble-sub-button-icon { transition:none !important; }'
    + selector + ' .bubble-sub-button-icon { color:' + accent + ' !important; }';
};
const mainThresholdCSS = (scale, entity) => {
  const tint = entityThresholdColor(scale,entity);
  if (!tint) return '';
  const background = 'color-mix(in srgb,' + tint + ' 16%,' + neutralSurface + ')';
  const preferred = thresholdRGB(tint) ? tint : 'var(--primary-text-color,#212121)';
  return 'ha-card[data-dp-layout] .bubble-main-icon-container { --bubble-icon-background-color:' + background
    + '; background:' + background + ' !important; transition:none !important; }'
    + 'ha-card[data-dp-layout] .bubble-main-icon { transition:none !important; }'
    + 'ha-card[data-dp-layout] .bubble-main-icon { color:' + preferred + ' !important; }';
};
