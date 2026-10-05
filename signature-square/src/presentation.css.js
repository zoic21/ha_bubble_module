`/* Layout changes are confined to button name/state cards. */
    ha-card[data-dp-layout="square"] .bubble-container { container-type: inline-size; }
    ha-card[data-dp-layout="square"] .bubble-state:not(.hidden) { min-width: 0; margin: 0 !important; color: var(--primary-text-color); font-variant-numeric: tabular-nums; opacity: 1 !important; white-space: nowrap; }
    /* Square: title / value / optional secondary. */
    /* 9px inside the 1px border gives a 10px inset: card radius 22px, icon radius 12px. */
    ha-card[data-dp-layout="square"] .bubble-content-container { min-width: 0; margin: 0 !important; pointer-events: none; position: absolute; inset: 9px; display: grid !important; grid-template-columns: 36px minmax(0,1fr); grid-template-rows: 36px minmax(0,1fr); gap: 6px 10px; }
    ha-card[data-dp-layout="square"] .bubble-name-container { display: contents !important; }
    ha-card[data-dp-layout="square"] .bubble-icon-container { margin: 0 !important; pointer-events: auto; grid-area: 1 / 1; width: 36px; height: 36px; min-width: 36px !important; min-height: 36px !important; --mdc-icon-size: 22px; }
    ha-card[data-dp-layout="square"] .bubble-name { min-width: 0;
      /* @include shared/src/styles/name.css {"SIZE_IMPORTANT":" !important"} */
      line-height: 20px; color: var(--primary-text-color); grid-area: 1 / 2; align-self: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    ha-card[data-dp-layout="square"] .bubble-state { grid-area: 2 / 1 / 3 / 3; align-self: center;
      /* @include shared/src/styles/value.css {"SIZE_IMPORTANT":" !important","WEIGHT_IMPORTANT":" !important"} */
      line-height: 1.1; overflow: hidden; text-overflow: ellipsis; }
    ${secondary ? `ha-card[data-dp-layout="square"][data-dp-secondary="yes"] .bubble-content-container { grid-template-rows: 36px minmax(0,1fr) max(16px, calc(var(--signature-secondary-font-size, 13px) * 1.2)); row-gap: 4px; }
    ha-card[data-dp-layout="square"] .dp-secondary { grid-area: 3 / 1 / 4 / 3; }` : ''}
    ha-card[data-dp-layout="square"][data-dp-icon="no"] .bubble-name { grid-column: 1 / 3; }

    ha-card[data-dp-layout="square"] .bubble-button-card { transition: none !important; }

    ha-card[data-dp-layout="square"] .dp-unit {
      /* @include shared/src/styles/unit.css */
     }
    `
