// Optional page headings and measurement strips reuse the Panel values and
// Bubble's existing buttons, selectors, visibility and delegated actions.
attr('data-dp-panel-variant',panelVariant);
const primaryIconName = panelVariant ? render(o.metric_icon).trim() : '';
let primaryIcon = runtime.primaryMetricIcon;
if (primaryIcon && primaryIcon.parentNode !== stateEl) { primaryIcon.remove(); primaryIcon = null; }
if (panelPrimaryEnabled && stateEl && /^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(primaryIconName)) {
  if (!primaryIcon) {
    primaryIcon = document.createElement('ha-icon'); primaryIcon.className = 'dp-panel-icon dp-panel-primary-icon';
    stateEl.insertBefore(primaryIcon,stateEl.firstChild);
  }
  if (primaryIcon.getAttribute('icon') !== primaryIconName) primaryIcon.setAttribute('icon',primaryIconName);
} else if (primaryIcon) { primaryIcon.remove(); primaryIcon = null; }
runtime.primaryMetricIcon = primaryIcon;
if (!runtime.primaryMetricCleanup) {
  const dispose = runtime.dispose;
  runtime.dispose = () => { runtime.primaryMetricIcon?.remove(); dispose(); };
  runtime.primaryMetricCleanup = true;
}
if (panelVariant) {
  css += 'ha-card[data-dp-panel-variant] {--dp-panel-information-color:'
    +(entityThresholdColor(structure.thresholdScale,c.entity) || iconTint)+';--dp-panel-count:'+(information.length+(panelPrimaryEnabled ? 1 : 0))+';--dp-panel-primary-shift:'+(panelPrimaryEnabled ? 0 : 1)+';}';
  if (iconOpacity !== null) css += 'ha-card[data-dp-panel-variant] .dp-panel-primary-icon {opacity:'+iconOpacity+';}';
  styles.forEach(({cls,spec}) => {
    if (panelVariant === 'heading' && spec.type === 'badge' && spec.position === 'bottom-right')
      css += 'ha-card[data-dp-panel-variant="heading"] .'+cls
        +'{--dp-panel-badge-position:absolute;--dp-panel-badge-inset:auto 0 0 auto;}';
    if (spec.column != null) css += 'ha-card[data-dp-panel-variant="strip"] .'+cls
      +'{--dp-panel-column:calc('+number(spec.column,1,1,3)+' - var(--dp-panel-primary-shift));}';
  });
}
const variantCSS = panelVariant ? (runtime.variantCSS ||= `
  /* @include signature-panel/src/variants.css */
`) : '';
