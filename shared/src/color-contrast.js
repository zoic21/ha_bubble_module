// Keep the preferred theme color unless its contrast against an opaque RGB
// surface is too low. Relative XYZ colors expose linear luminance (y) in CSS,
// so theme changes need no computed-style reads, listeners or new renders.
const rgbLuminance = rgb => {
  const channels = rgb.map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055,2.4);
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};
const readableForegroundCSS = (selector, background, preferred, minimum = 3) => {
  const rgb = thresholdRGB(background);
  if (!rgb) return selector + ' { color:' + preferred + ' !important; }';
  const luminance = rgbLuminance(rgb);
  const white = 1.05 / (luminance + .05) > (luminance + .05) / .05;
  const fallback = white ? '#fff' : '#000';
  const xyz = white ? [.9504559271,1,1.0890577508] : [0,0,0];
  // A small conservative margin covers RGB/XYZ matrix and browser rounding.
  const low = (luminance + .05) / minimum - .0501;
  const high = minimum * (luminance + .05) - .0499;
  // Compose translucency in encoded sRGB before measuring linear luminance.
  // Keeping the flattened color preserves its appearance on this opaque square.
  const composed = 'rgb(from ' + preferred + ' ' + ['r','g','b'].map((channel,index) =>
    'calc(' + channel + ' * alpha + ' + rgb[index] + ' * (1 - alpha))').join(' ') + ' / 1)';
  const keep = 'round(up,clamp(0,max(' + low + ' - y,y - ' + high + '),1),1)';
  const expression = 'color(from ' + composed + ' xyz-d65 ' + ['x','y','z'].map((channel,index) =>
    'calc(' + channel + ' * var(--dp-contrast-keep) + ' + xyz[index] + ' * (1 - var(--dp-contrast-keep)))').join(' ')
    + ' / 1)';
  // Older engines get a readable opaque fallback. Query the full arithmetic,
  // not just relative-color support, before using theme-preserving adaptation.
  return selector + ' { color:' + fallback + ' !important; }'
    + '@supports (color:color(from rgb(from #fff calc(r * alpha) g b / 1) xyz-d65 calc(x * ' + keep + ') y z)) {'
    + selector + ' { --dp-contrast-keep:' + keep + '; color:' + expression + ' !important; }}';
};
