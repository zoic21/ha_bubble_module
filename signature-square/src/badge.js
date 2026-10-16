// A single native icon-only status button can occupy the detail row's corner.
// Bubble still owns its visibility, title and handlers. No extra DOM or listener.
const cornerBadge = !autoHeight && !summaryEnabled && o.controls !== 'measure'
  && flat.length === 1 && styles.find(({b,spec}) => spec.type === 'badge'
    && b === flat[0] && (!b.sub_button_type || b.sub_button_type === 'default')
    && b.show_name === false && b.show_state !== true && b.show_attribute !== true
    && b.show_last_changed !== true && b.show_last_updated !== true);
if (cornerBadge) {
  const selector = 'ha-card[data-dp-layout="square"]';
  const button = '.' + cornerBadge.cls;
  const parents = selector + ' :is(.bubble-sub-button-container,.bubble-sub-button-group)';
  const target = selector + ' ' + button;
  const icon = target + ' .bubble-sub-button-icon';
  css += `
    ${parents} { position: static !important; }
    ${target} {
      position: absolute !important; right: 8px; bottom: 6px;
      width: 24px !important; min-width: 24px !important; height: 24px !important;
      padding: 0 !important; margin: 0 !important; border-radius: 50% !important;
      box-sizing: border-box; z-index: 2; --mdc-icon-size: 16px;
    }
    ${icon} { --mdc-icon-size: 16px; }
    ${selector}:has(${button}:not(.hidden):not([hidden])) .dp-secondary { max-width: calc(100% - 32px); }
  `;
}
