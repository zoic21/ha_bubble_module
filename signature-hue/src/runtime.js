// A presentation companion, not a Hue controller. Actions and Jinja stay native.
const config = this.config, options = config.signature_hue || {}, mode = options.mode;
if (mode === 'popup' ? config.card_type !== 'pop-up'
  : config.card_type !== 'button' || !['light','scene','brightness','animation'].includes(mode)) return '';
/* @include shared/src/template-source.js */
const boolean = (value, fallback) => value == null ? fallback
  : ['true','1','on','yes'].includes(renderValue(value, config.entity).trim().toLowerCase());
let available = boolean(options.available, true), selected = boolean(options.selected, false);
if (options.status != null) {
  // Related conditions can share a single HA template subscription. Keep the
  // conditions in Jinja; the module only reads the resulting two flags.
  try {
    const status = typeof options.status === 'object' ? options.status : JSON.parse(renderValue(options.status, config.entity));
    available = boolean(status?.available, false); selected = boolean(status?.selected, false);
  } catch { available = false; selected = false; }
}
let runtime = this._signatureHue;
if (!runtime || runtime.version !== '@@MODULE_VERSION@@' || runtime.mode !== mode) {
  let css = '';
  if (mode === 'light') css = `
    /* @include signature-hue/src/light.css */
  `;
  else if (mode === 'scene') css = `
    /* @include signature-hue/src/scene.css */
  `;
  else if (mode === 'brightness') css = `
    /* @include signature-hue/src/brightness.css */
  `;
  else if (mode === 'animation') css = `
    /* @include signature-hue/src/animation.css */
  `;
  else css = `
    /* @include signature-hue/src/popup.css */
  `;
  runtime = this._signatureHue = {version:'@@MODULE_VERSION@@', mode, css};
}
let css = runtime.css;
if (mode === 'scene' || mode === 'light') {
  css += `ha-card { --signature-hue-opacity: ${available ? 1 : .4}; --signature-hue-pointer: ${available ? 'auto' : 'none'}; }`;
}
if (mode === 'scene') {
  // Restrict this illustrative gradient to three opaque hex colors. It never
  // changes a light's color, and no arbitrary CSS is interpolated into a rule.
  const colors = renderValue(options.palette, config.entity).split(',').map(color => color.trim());
  const palette = colors.length === 3 && colors.every(color => /^#[\da-f]{6}$/i.test(color))
    ? 'linear-gradient(115deg,' + colors.join(',') + ')' : 'transparent';
  css += `ha-card { --signature-hue-palette: ${palette}; --signature-hue-selected: ${selected ? 1 : 0}; }`;
}
if (mode === 'brightness' && !available)
  css += 'ha-card .hue-brightness-step { opacity: .4 !important; pointer-events: none !important; }';
return css;
