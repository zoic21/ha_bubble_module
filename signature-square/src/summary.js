// An optional second measurement turns Square into a wide summary. Keep the
// primary native nodes and use Bubble's existing delegated value actions.
const summary = o.summary && typeof o.summary === 'object' && !Array.isArray(o.summary)
  ? o.summary : {};
const summaryEntity = String(summary.entity ?? '').trim();
const summaryEnabled = !autoHeight && o.controls !== 'measure'
  && /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(summaryEntity);
attr('data-dp-square-mode', summaryEnabled ? 'summary' : 'standard');
let summaryEl = runtime.summaryEl;
if (summaryEl && (!root.contains(summaryEl) || runtime.summaryEntity !== summaryEntity)) {
  summaryEl.remove();
  summaryEl = null;
}
if (summaryEnabled && content) {
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
  name.textContent = render(summary.name ?? hass.states[summaryEntity]?.attributes?.friendly_name ?? summaryEntity, summaryEntity).trim();
  const {value,unit} = displayState(hass.states[summaryEntity], summaryEntity, 'summaryFormat');
  const signature = value + '\u0001' + unit;
  if (state.dataset.dpSignature !== signature) {
    const val = document.createElement('span');
    val.className = 'dp-value'; val.textContent = value;
    const u = document.createElement('span');
    u.className = 'dp-unit'; u.textContent = unit;
    state.replaceChildren(val,u);
    state.dataset.dpSignature = signature;
  }
  const detailSource = sourceFor(summary.secondary, summaryEntity);
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
  if (detailSource.direct) {
    const item = displayState(hass.states[detailEntity], detailEntity, 'summarySecondaryFormat');
    detailText = item.value + (item.unit ? ' ' + item.unit : '');
  } else detailText = render(summary.secondary, summaryEntity).trim();
  detail.textContent = detailText;
  bindAction('summaryName', name, info(summaryEntity));
  bindAction('summaryState', state, info(summaryEntity));
  bindAction('summarySecondary', detailText && detailEntity ? detail : null, info(detailEntity));
} else {
  summaryEl?.remove(); summaryEl = null;
  for (const key of ['summaryName','summaryState','summarySecondary']) bindAction(key, null, {});
}
runtime.summaryEl = summaryEl;
runtime.summaryEntity = summaryEntity;
if (summaryEl && !runtime.summaryCleanup) {
  const dispose = runtime.dispose;
  runtime.dispose = () => { runtime.summaryEl?.remove(); dispose(); };
  runtime.summaryCleanup = true;
}
