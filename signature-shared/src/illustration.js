// Decorative, opt-in artwork. Templates use Bubble's existing tracked render;
// CSS owns responsive placement, with no listener, measurement or extra runtime.
const illustration = o.illustration && typeof o.illustration === 'object' && !Array.isArray(o.illustration)
  ? o.illustration : {};
// Follow Home Assistant's effective theme, never the OS colour preference.
// Keep this selection outside the structural cache: a theme-only hass update
// must switch the asset even when every entity state stays identical.
const illustrationMode = hass?.themes?.darkMode;
const modeImage = illustrationMode === true ? illustration.image_dark
  : illustrationMode === false ? illustration.image_light : undefined;
const validImage = image => /^(?:\/(?!\/)|https?:\/\/)/i.test(image)
  && !/[\u0000-\u001f\u007f]/.test(image);
const variantImage = modeImage == null ? '' : render(modeImage).trim();
const illustrationImage = validImage(variantImage) ? variantImage : render(illustration.image).trim();
const columns = Math.trunc(number(illustration.columns, 1, 1, 16));
const rows = Math.trunc(number(illustration.rows, 1, 1, 16));
const illustrationInput = render(illustration.index ?? 0).trim();
const illustrationIndex = illustrationInput === '' ? NaN : Number(illustrationInput);
const index = Math.trunc(illustrationIndex);
// Use ordinary local/HTTP image URLs, never executable URLs or injected CSS.
const illustrationEnabled = validImage(illustrationImage)
  && Number.isFinite(illustrationIndex) && index >= 0 && index < columns * rows;
attr('data-dp-illustration', illustrationEnabled ? 'yes' : 'no');
if (illustrationEnabled) {
  // Shift the sampled window within an imperfect atlas, not the decoration.
  // Percentages are relative to one source cell; its size remains unchanged.
  const offsetX = number(render(illustration.offset_x ?? 0).trim(), 0, -50, 50);
  const offsetY = number(render(illustration.offset_y ?? 0).trim(), 0, -50, 50);
  const x = columns === 1 ? 0 : ((index % columns) + offsetX / 100) * 100 / (columns - 1);
  const y = rows === 1 ? 0 : (Math.floor(index / columns) + offsetY / 100) * 100 / (rows - 1);
  // Quoting escapes quotes/backslashes in CSS url("..."). Keep this data outside
  // the structural style cache so entity/template updates stay live.
  css += 'ha-card[data-dp-illustration="yes"] {'
    + '--dp-illustration-image:url(' + JSON.stringify(illustrationImage) + ');'
    + '--dp-illustration-size:' + columns * 100 + '% ' + rows * 100 + '%;'
    + '--dp-illustration-position:' + x + '% ' + y + '%;'
    + '}';
}
