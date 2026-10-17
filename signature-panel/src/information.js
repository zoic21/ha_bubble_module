// The native name/state/secondary form the first information column.
// Up to two more columns use the same roles and Bubble's delegated actions.
const information = Array.isArray(o.information) ? o.information.filter(item => item?.enabled !== false).slice(0,2) : [];
attr('data-dp-panel-count', String(information.length + 1));
attr('data-dp-panel-shared-name',information.length && information.every(item => !item?.name) ? 'yes' : 'no');
let items = runtime.information || (runtime.information = []);
if (!runtime.informationCleanup) {
  const dispose = runtime.dispose;
  runtime.dispose = () => {
    if (this._dpRuntime !== runtime) return;
    items.forEach(item => { item.summaryStatistics = null; item.el.remove(); });
    dispose();
  };
  runtime.informationCleanup = true;
}
while (items.length > information.length) {
  const item = items.pop(); item.summaryStatistics = null; item.el.remove();
}
for (let index=information.length;index<2;index++)
  for (const key of ['panelName','panelState','panelDetail']) bindAction(key+index,null,{});
information.forEach((spec, index) => {
  spec = spec && typeof spec === 'object' ? spec : {};
  const entity = String(spec.entity || '').trim();
  const target = JSON.stringify([entity, spec.tap_action]);
  let item = items[index];
  if (item && (!root.contains(item.el) || item.target !== target)) {
    item.summaryStatistics = null; item.el.remove(); item = null;
  }
  if (!item) {
    const el = document.createElement('div'); el.className = 'dp-panel-information';
    for (const role of ['name','state','secondary']) {
      const node = document.createElement('div'); node.className = 'dp-panel-' + role;
      el.appendChild(node);
    }
    content.appendChild(el);
    item = items[index] = {el, target};
  }
  item.el.style.setProperty('--dp-panel-column', String(index + 2));
  const name = item.el.querySelector('.dp-panel-name');
  const state = item.el.querySelector('.dp-panel-state');
  let detail = item.el.querySelector('.dp-panel-secondary');
  name.textContent = render(spec.name ?? '', entity).trim();
  const paintState = ({value,unit}) => {
    const key = JSON.stringify([value,unit,spec.icon]);
    // Templates/icons remain live even if the measured value is unchanged.
    const icon = render(spec.icon,entity).trim();
    if (item.stateKey === key + icon) return;
    const valueEl = document.createElement('span'); valueEl.className = 'dp-value'; valueEl.textContent = value;
    const unitEl = document.createElement('span'); unitEl.className = 'dp-unit'; unitEl.textContent = unit;
    state.replaceChildren(valueEl,unitEl);
    if (/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(icon)) {
      const iconEl = document.createElement('ha-icon'); iconEl.className = 'dp-panel-icon'; iconEl.setAttribute('icon',icon);
      state.replaceChildren(iconEl,valueEl,unitEl);
    }
    item.stateKey = key + icon;
  };
  const raw = spec.state == null ? null : render(spec.state,entity).trim();
  const parts = raw?.match(/^([+\-−]?[\d .,\u00a0\u202f]+)\s*([\p{L}°%€$£][^\d\s]*)$/u);
  paintState(raw === null ? displayState(hass.states[entity],entity,'panelFormat' + index)
    : {value:parts ? parts[1].trim() : raw, unit:parts ? parts[2] : ''});
  const source = sourceFor(spec.secondary,entity);
  const detailEntity = spec.statistics && spec.secondary_statistics ? '' : source.main ? entity : source.entity;
  if (item.detailEntity !== detailEntity) {
    const next = document.createElement('div'); next.className = detail.className;
    detail.replaceWith(next); detail = next; item.detailEntity = detailEntity;
  }
  const display = source.direct ? displayState(hass.states[detailEntity],detailEntity,'panelDetailFormat' + index) : null;
  detail.textContent = display ? display.value + (display.unit ? ' ' + display.unit : '') : render(spec.secondary,entity).trim();
  const action = entity ? {...info(entity), ...(spec.tap_action ? {tapAction:JSON.stringify(spec.tap_action)} : {})}
    : {tapAction:'{"action":"none"}',holdAction:'{"action":"none"}',doubleTapAction:'{"action":"none"}'};
  bindAction('panelName'+index,name,action,!!entity);
  bindAction('panelState'+index,state,action,!!entity);
  bindAction('panelDetail'+index,detail,detailEntity ? info(detailEntity) : action,!!detailEntity);
  if (spec.statistics) dailyPanelStatistics(spec,item,(value,secondaryValue) => {
    const format = (n,options) => ({value:n === null ? '—' : formatterFor(hass,{
      minimumFractionDigits:number(options.decimals,2,0,6),maximumFractionDigits:number(options.decimals,2,0,6)
    }).format(n),unit:n === null ? '' : String(options.unit || '')});
    paintState(format(value,spec.statistics));
    if (spec.secondary_statistics) {
      const next = format(secondaryValue,spec.secondary_statistics);
      detail.textContent = next.value + (next.unit ? ' ' + next.unit : '');
    }
  });
  else item.summaryStatistics = null;
  item.el.style.setProperty('--dp-panel-information-color',color(spec.color,accent,entity));
});
