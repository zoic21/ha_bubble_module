// Opt-in native command controls. Keep Bubble's nodes, datasets and handlers.
// Its delegated gesture handler caches actions: guarding only data-tap-action
// would leave previously used commands executable after their state changes.
const commandStyles = roomIllustrated ? styles.filter(({b,spec}) => spec.type === 'command'
  && roleSet.has(b) && (!b.sub_button_type || b.sub_button_type === 'default')
  && b.show_name === true) : [];
/* @include signature-shared/src/commands.js */
if (commandNodes.size) {
  const scope = 'ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate)[data-dp-command]';
  const named = scope+':has(.bubble-sub-button-name-container:not(:empty):not(.hidden):not([hidden]))';
  const commandSpace = '100% - 16px';
  css += `
    ${named} {
      display: grid !important; grid-template-columns: minmax(0,1fr);
      grid-template-rows: 18px 16px; grid-template-areas: 'icon' 'label';
      gap: 2px; padding: 4px 2px !important;
      left: calc(11px + var(--room-control-column,var(--dp-room-column,0)) * (${commandSpace}) / ${roomColumns});
      width: calc((${commandSpace}) / ${roomColumns} - 6px);
      border-radius: var(--signature-control-border-radius,14px);
      background: var(--dp-command-background) !important;
      color: var(--dp-command-foreground);
    }
    ${named+' .bubble-sub-button-icon'} {
      justify-self: center; width: 18px !important; height: 18px !important; padding: 0 !important;
      --mdc-icon-size: 18px; border-radius: 0; background: transparent !important;
    }
    ${named+' .bubble-sub-button-name-container'} {
      /* @include shared/src/styles/command-label.css */
      justify-self: stretch; text-align: center;
      color: var(--dp-command-foreground); margin: 0 !important;
    }
    ${scope}[aria-disabled="true"] { cursor: default; }
    ${scope}[aria-disabled="true"][aria-pressed="false"] { opacity: .4; }
    ${scope}[aria-disabled="true"] > ha-ripple { display: none; }
    ${scope} > ha-ripple { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
  `;
}
if (o.room_state_as_value === true) css += `
  ha-card[data-dp-layout="room"] .bubble-state {
    font-size: var(--signature-value-font-size,28px); line-height: 1.15;
    font-weight: var(--signature-font-weight-medium,500); letter-spacing: -.7px;
    font-variant-numeric: tabular-nums;
  }
  ha-card[data-dp-layout="room"] .bubble-state:not(:has(.dp-unit:not(:empty))) {
    font-size: min(var(--signature-value-font-size,28px),22px); letter-spacing: -.4px;
  }
  ha-card[data-dp-layout="room"] .bubble-state .dp-unit {
    font-size: var(--signature-temperature-unit-font-size,13px);
  }
`;
