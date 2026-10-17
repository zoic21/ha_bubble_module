// One or two measurements share the wide summary. Keep the primary native
// nodes and use Bubble's existing delegated value actions for a second entity.
const summary = o.summary && typeof o.summary === 'object' && !Array.isArray(o.summary)
  ? o.summary : {};
/* @include signature-square/src/summary-statistics.js */
const summaryEntity = statisticsEnabled ? '' : String(summary.entity ?? '').trim();
const summarySingle = !statisticsEnabled && summary.enabled === true && summaryEntity === '';
const summaryEnabled = !autoHeight && o.controls !== 'measure'
  && summary.enabled !== false
  && (statisticsEnabled || summarySingle || /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(summaryEntity));
if (!summaryEnabled || !statisticsEnabled) runtime.summaryStatistics = null;
attr('data-dp-square-mode', summaryEnabled ? 'summary' : 'standard');
if (summaryEnabled) attr('data-dp-summary-single', summarySingle ? 'yes' : 'no');
else root.removeAttribute('data-dp-summary-single');
let summaryEl = runtime.summaryEl;
if (summaryEl && (!root.contains(summaryEl) || runtime.summaryEntity !== summaryEntity)) {
  summaryEl.remove();
  summaryEl = null;
}
if (summaryEnabled && !summarySingle && content) {
  if (!summaryEl) {
    summaryEl = document.createElement('div');
    summaryEl.className = 'dp-summary';
    for (const role of ['name','state','secondary']) {
      const el = document.createElement('div');
      el.className = 'dp-summary-' + role;
      summaryEl.appendChild(el);
    }
    content.appendChild(summaryEl);
  }
  const name = summaryEl.querySelector('.dp-summary-name');
  const state = summaryEl.querySelector('.dp-summary-state');
  // Source labels also enrol entity changes in Bubble's tracked hass reads.
  // Recorder remains the only source of the displayed total.
  if (statisticsEnabled) name.title = statisticIds.map(id =>
    hass.states[id]?.attributes?.friendly_name || id).join(' + ');
  else name.removeAttribute('title');
  name.textContent = render(summary.name ?? hass.states[summaryEntity]?.attributes?.friendly_name ?? summaryEntity, summaryEntity).trim();
  const paintState = ({value,unit}) => {
    const signature = value + '\u0001' + unit;
    if (state.dataset.dpSignature === signature) return;
    const val = document.createElement('span');
    val.className = 'dp-value'; val.textContent = value;
    const u = document.createElement('span');
    u.className = 'dp-unit'; u.textContent = unit;
    state.replaceChildren(val,u);
    state.dataset.dpSignature = signature;
  };
  if (!statisticsEnabled) paintState(displayState(hass.states[summaryEntity], summaryEntity, 'summaryFormat'));
  const detailSource = sourceFor(secondaryStatisticsMode ? '' : summary.secondary, summaryEntity);
  const detailEntity = detailSource.main ? summaryEntity : detailSource.entity;
  let detail = summaryEl.querySelector('.dp-summary-secondary');
  // Bubble caches handlers on the target: a different entity needs a fresh node.
  if (runtime.summaryDetailTarget !== detailEntity) {
    const next = document.createElement('div');
    next.className = 'dp-summary-secondary';
    detail.replaceWith(next); detail = next;
  }
  runtime.summaryDetailTarget = detailEntity;
  let detailText;
  if (secondaryStatisticsMode) detailText = '—';
  else if (detailSource.direct) {
    const item = displayState(hass.states[detailEntity], detailEntity, 'summarySecondaryFormat');
    detailText = item.value + (item.unit ? ' ' + item.unit : '');
  } else detailText = render(summary.secondary, summaryEntity).trim();
  detail.textContent = detailText;
  // A calculated total has no single entity: explicitly suppress the parent
  // card's action so tapping the total cannot open the primary power sensor.
  const summaryAction = summaryEntity ? info(summaryEntity) : {
    tapAction:'{"action":"none"}',holdAction:'{"action":"none"}',doubleTapAction:'{"action":"none"}'};
  bindAction('summaryName', name, summaryAction, !!summaryEntity);
  bindAction('summaryState', state, summaryAction, !!summaryEntity);
  bindAction('summarySecondary', secondaryStatisticsMode ? detail : detailText && detailEntity ? detail : null,
    secondaryStatisticsMode ? summaryAction : info(detailEntity), !secondaryStatisticsMode);
  if (statisticsEnabled) dailyStatistics((value,secondaryValue) => {
    const display = (value,options) => {
      const decimals = Math.trunc(number(options.decimals,2,0,6));
      return {value:value === null ? '—' : formatterFor(hass,
        {minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value),
        unit:value === null ? '' : String(options.unit ?? '')};
    };
    paintState(display(value,statisticOptions));
    if (secondaryStatisticsMode) {
      const item = display(secondaryValue,summary.secondary_statistics);
      detail.textContent = item.value + (item.unit ? ' ' + item.unit : '');
    }
  });
} else {
  summaryEl?.remove(); summaryEl = null;
  for (const key of ['summaryName','summaryState','summarySecondary']) bindAction(key, null, {});
}
runtime.summaryEl = summaryEl;
runtime.summaryEntity = summaryEntity;
if (summaryEl && !runtime.summaryCleanup) {
  const dispose = runtime.dispose;
  runtime.dispose = () => { runtime.summaryStatistics = null; runtime.summaryEl?.remove(); dispose(); };
  runtime.summaryCleanup = true;
}
