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
  const tint = manual ? color(spec.icon_color,accent,button.entity)
    : String(spec.color ?? '').trim() ? null : entityThresholdColor(scale,button.entity);
  return tint ? selector + ' .bubble-sub-button-icon { color:' + tint + ' !important; }' : '';
};
