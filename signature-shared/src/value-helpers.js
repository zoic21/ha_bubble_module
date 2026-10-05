/* @include shared/src/template-source.js */
/* @include shared/src/color.js */
const render = (value,id = c.entity) => renderValue(value,id);
const number = (v, fallback, min, max) => {
  const n = typeof v === 'number' ? v : Number(v);
  return v == null || v === '' || !Number.isFinite(n) ? fallback : Math.min(max, Math.max(min, n));
};
const color = (input,fallback = 'var(--blue-color, #2196f3)',id = c.entity) => colorFor(render(input,id),fallback);
const accent = color(o.color ?? 'blue');
// Jinja booleans are strings here: "False" must never enable the tint.
const colorBackground = render(o.color_background).trim().toLowerCase() === 'true';
const neutralSurface = 'var(--signature-card-background, var(--ha-card-background, var(--card-background-color, #fff)))';
const iconSurface = 'color-mix(in srgb, var(--dp-accent) 16%, '+neutralSurface+')';
const surface = colorBackground
  ? 'color-mix(in srgb, var(--dp-accent) var(--dp-tint, 16%), '+neutralSurface+')'
  : neutralSurface;
