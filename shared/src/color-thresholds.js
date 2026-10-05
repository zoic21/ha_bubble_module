// Portable value -> color scale. Opaque RGB colors make the interpolation
// deterministic across charts, themes and browsers, without reading CSS tokens.
// Matches Statistics Graph Chart Card's linear RGB interpolation and rounding.
const thresholdNumber = value => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const thresholdRGB = input => {
  if (typeof input !== 'string') return null;
  const color = input.trim();
  const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map(digit => digit + digit).join('') : hex[1];
    return [0,2,4].map(offset => parseInt(digits.slice(offset,offset + 2),16));
  }
  const rgb = color.match(/^rgb\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)\s*\)$/i);
  if (!rgb) return null;
  const channels = rgb.slice(1).map(Number);
  return channels.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 255)
    ? channels.map(Math.round) : null;
};
const prepareColorThresholds = options => {
  if (!options || options.enabled === false || !Array.isArray(options.values)) return null;
  const points = options.values.map(point => {
    const value = thresholdNumber(point?.value), rgb = thresholdRGB(point?.color);
    return value === null || !rgb ? null : {value,rgb,color:point.color.trim()};
  }).filter(Boolean).sort((a,b) => a.value - b.value);
  return points.length ? {points,transition:options.transition === 'hard' ? 'hard' : 'smooth',
    entity:options.entity,attribute:options.attribute} : null;
};
const resolveThresholdColor = (value, scale) => {
  if (!scale) return null;
  const number = thresholdNumber(value);
  if (number === null) return 'var(--secondary-text-color)';
  const points = scale.points;
  if (scale.transition === 'hard') {
    // The reference chart uses a strict comparison at hard boundaries.
    let color = points[0].color;
    for (const point of points) if (number > point.value) color = point.color;
    return color;
  }
  if (number <= points[0].value) return points[0].color;
  for (let index = 1; index < points.length; index++) {
    const high = points[index], low = points[index - 1];
    if (number > high.value) continue;
    const ratio = (number - low.value) / (high.value - low.value || 1);
    return 'rgb(' + low.rgb.map((channel,i) => Math.round(channel + (high.rgb[i] - channel) * ratio)).join(',') + ')';
  }
  return points[points.length - 1].color;
};
