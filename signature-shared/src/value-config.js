const custom = String(o.state ?? '').trim() !== '';
// Computed summaries have no single entity; name buttons can use the same value layout.
const compactValue = layout === 'compact' && kind === 'button' && o.compact_mode === 'value'
  && (c.button_type === 'state' || (c.button_type === 'name' && custom));
const displayState = (state, id, slot) => {
  const raw = state?.state;
  if (raw == null || ['unknown','unavailable'].includes(raw)) return {value:'—',unit:''};
  if (String(raw).trim() === '' || !Number.isFinite(Number(raw))) {
    return {value:typeof hass.formatEntityState === 'function' ? hass.formatEntityState(state) : raw,unit:''};
  }
  // Share native precision and locale rules; cache one formatter per displayed value.
  const precision = precisionFor(hass,id,state);
  const [mantissa,exponent = '0'] = String(raw).toLowerCase().split('e');
  const inferredDigits = Math.max(0,(mantissa.split('.')[1] || '').length - Number(exponent));
  const digits = precision == null ? Math.min(20,inferredDigits) : number(precision,2,0,20);
  const key = localeFor(hass)+'|'+hass.locale?.number_format+'|'+digits+'|'+(precision == null);
  if (runtime[slot]?.key !== key) runtime[slot] = {key,
    formatter:formatterFor(hass,{minimumFractionDigits:precision == null ? 0 : digits,maximumFractionDigits:digits})};
  return {value:runtime[slot].formatter.format(Number(raw)),unit:state.attributes?.unit_of_measurement || ''};
};
const secondaryInput = String(o.secondary ?? '').trim();
if (runtime.secondarySource?.input !== secondaryInput) {
  runtime.secondarySource = sourceFor(secondaryInput);
}
const source = runtime.secondarySource;
const secondaryEntity = source.main ? c.entity : source.entity;
let secondary;
if (source.direct) {
  const {value,unit} = displayState(hass.states[secondaryEntity],secondaryEntity,'secondaryFormat');
  secondary = value+(unit ? ' '+unit : '');
} else secondary = render(o.secondary).trim();
const multiline = o.multiline === true;
// Opt-in natural sizing; fixed-height cards retain their existing layout.
const autoHeight = layout === 'square' && o.auto_height === true;
const stateEl = this.elements?.state;
runtime.stateEl = stateEl;
const nameBox = this.elements?.nameContainer;
const content = this.elements?.contentContainer;
attr('data-dp-layout',layout);
attr('data-dp-kind',kind);
attr('data-dp-color-background',colorBackground ? 'yes' : 'no');
attr('data-dp-compact-mode',compactValue ? 'value' : 'standard');
attr('data-dp-icon',c.show_icon === false ? 'no' : 'yes');
attr('data-dp-secondary',secondary ? 'yes' : 'no');
attr('data-dp-multiline',multiline ? 'yes' : 'no');
if (autoHeight) attr('data-dp-auto-height','yes');
else root.removeAttribute('data-dp-auto-height');
attr('data-dp-controls',o.controls === 'measure' && layout === 'square' ? 'measure' : 'native');
attr('data-dp-measure-detail',o.controls === 'measure' && (flat.length > 1 || o.reserve_measure_detail === true) ? 'yes' : 'no');
// Keep native state_content and legacy attributes/timestamps. Explicit module state wins.
const explicitState = c.state_content != null;
const legacy = !!(c.show_attribute !== false && c.attribute) || !!c.show_last_changed || !!c.show_last_updated;
const nativeEmpty = explicitState && (Array.isArray(c.state_content) ? c.state_content.length === 0 : String(c.state_content).trim() === '');
const show = (explicitState ? !nativeEmpty : c.show_state !== false);
const entityState = hass.states[c.entity];
const domain = (c.entity || '').split('.')[0];
