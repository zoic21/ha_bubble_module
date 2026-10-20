// Transparent ordinary buttons keep their native targets with less horizontal space.
const flatButtonPadding = number(o.flat_button_padding,4,0,8);
const flatButtonTargets = [];
flat.forEach((b,i) => {
  if (b.sub_button_type && !['default','select'].includes(b.sub_button_type)) return;
  const overrides = styles.filter(style => style.b === b);
  if (overrides.some(style => style.visualSwitch
      || ['mode_badge','mode','metric'].includes(style.spec.type))) return;
  let background = b.show_background === false ? 'transparent' : '';
  let thresholdBackground;
  overrides.forEach(({spec,thresholdScale}) => {
    if (String(spec.background ?? '').trim()) background = color(spec.background,'transparent',b.entity);
    // Threshold surfaces have higher specificity than ordinary manual backgrounds.
    if (thresholdScale) thresholdBackground = spec.color_thresholds.background === false ? 'transparent' : 'tinted';
  });
  if ((thresholdBackground ?? background).trim().toLowerCase() === 'transparent')
    flatButtonTargets.push('.bubble-sub-button-'+(i+1));
});
if (flatButtonTargets.length) {
  const selector = flatButtonTargets.length === 1 ? flatButtonTargets[0] : ':is('+flatButtonTargets.join(',')+')';
  css += 'ha-card[data-dp-layout="compact"] '+selector+' { padding-inline:'+flatButtonPadding+'px !important; }';
}
