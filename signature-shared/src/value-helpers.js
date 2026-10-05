const render = (v, id = c.entity) => {
  const s = String(v ?? '');
  if (!/\{[\{%#]/.test(s)) return s;
  return typeof renderTemplate === 'function' ? String(renderTemplate(s, id) ?? '') : '';
};
const number = (v, fallback, min, max) => {
  const n = typeof v === 'number' ? v : Number(v);
  return v == null || v === '' || !Number.isFinite(n) ? fallback : Math.min(max, Math.max(min, n));
};
const colors = {blue:'#2196f3',indigo:'#7986cb',amber:'#ffc107',orange:'#ff9800',green:'#4caf50',red:'#f44336',grey:'#9e9e9e',teal:'#009688',purple:'#9c27b0','light-blue':'#03a9f4',cyan:'#00bcd4',pink:'#e91e63',yellow:'#ffeb3b'};
const color = (input, fallback = 'var(--blue-color, #2196f3)', id = c.entity) => {
  let v = render(input,id).trim();
  if (Object.hasOwn(colors, v)) v = 'var(--' + v + '-color, ' + colors[v] + ')';
  return v && CSS.supports('color', v) ? v : fallback;
};
const accent = color(o.color ?? 'blue');
// Jinja booleans are strings here: "False" must never enable the tint.
const colorBackground = render(o.color_background).trim().toLowerCase() === 'true';
const neutralSurface = 'var(--signature-card-background, var(--ha-card-background, var(--card-background-color, #fff)))';
const iconSurface = 'color-mix(in srgb, var(--dp-accent) 16%, '+neutralSurface+')';
const surface = colorBackground
  ? 'color-mix(in srgb, var(--dp-accent) var(--dp-tint, 16%), '+neutralSurface+')'
  : neutralSurface;
