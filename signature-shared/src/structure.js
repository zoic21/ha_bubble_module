// setConfig replaces the config object. Cache only structure, never template results.
let structure = this._dpStructure;
if (!structure || structure.config !== c || structure.options !== c.signature
    || structure.sub !== c.sub_button || structure.main !== c.sub_button?.main
    || structure.bottom !== c.sub_button?.bottom || structure.overrides !== o.sub_button_styles
    || (layout !== 'room' && structure.thresholdOptions !== o.color_thresholds)) {
  const flat = [];
  // Bubble 3.4 numbers explicit groups before individual buttons in each section.
  // This differs from visual/YAML order when both kinds are mixed.
  const collect = list => {
    const items = Array.isArray(list) ? list.filter(Boolean) : [];
    items.forEach(b => { if (Array.isArray(b.group)) flat.push(...b.group.filter(Boolean)); });
    items.forEach(b => { if (!Array.isArray(b.group)) flat.push(b); });
  };
  const sub = c.sub_button;
  collect(Array.isArray(sub) ? sub : sub?.main);
  collect(Array.isArray(sub) ? [] : sub?.bottom);
  const normalize = v => String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const byClass = new Map();
  flat.forEach(b => {
    const cls = normalize(b.css_class);
    if (!byClass.has(cls)) byClass.set(cls,b);
  });
  const roleButtons = flat.filter(b => /^room-control-\d+$/.test(b.css_class || ''));
  roleButtons.sort((a,b)=>Number(a.css_class.split('-').pop())-Number(b.css_class.split('-').pop()));
  const roles = [...roleButtons,...flat.filter(b => b.css_class === 'room-climate')];
  const overrides = o.sub_button_styles && typeof o.sub_button_styles === 'object' ? o.sub_button_styles : {};
  const styles = Object.entries(overrides).filter(([,spec]) => spec && typeof spec === 'object').map(([key,spec]) => {
    const numeric = /^\d+$/.test(key);
    const cls = numeric ? 'bubble-sub-button-'+key : normalize(key);
    const b = byClass.get(cls) || (numeric ? flat[Number(key)-1] : null) || {};
    const domain = (b.entity || '').split('.')[0];
    const lock = domain === 'lock' && b.tap_action?.action === 'perform-action'
      && ['lock.lock','lock.unlock'].includes(b.tap_action.perform_action);
    const toggle = b.tap_action?.action === 'toggle'
      && ['switch','input_boolean','light','automation','humidifier'].includes(domain);
    const style = {cls,spec,b,visualSwitch:spec.type === 'switch'
      && (!b.sub_button_type || b.sub_button_type === 'default') && (lock || toggle),lock};
    if (layout !== 'room') style.thresholdScale = prepareColorThresholds(spec.color_thresholds);
    return style;
  });
  structure = this._dpStructure = {config:c,options:c.signature,sub,main:sub?.main,bottom:sub?.bottom,overrides:o.sub_button_styles,
    flat,styles,hasSwitches:styles.some(style => style.visualSwitch),
    styledButtons:new Set(styles.map(style => style.b)),roleSet:new Set(roles),
    roles:roles.map(b => ({b,selector:'ha-card .'+normalize(b.css_class)}))};
  if (layout !== 'room') {
    structure.thresholdOptions = o.color_thresholds;
    structure.thresholdScale = prepareColorThresholds(o.color_thresholds);
    structure.thresholdScales = new Map(styles.map(style => [style.spec,style.thresholdScale]));
  }
}
const {flat,styles,roleSet} = structure;
const {iconOverrides,restoreIcon,restoreAction} = runtime;
const desiredIcons = new Map();
