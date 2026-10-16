`/* Two measurements and optional art share the native two-row card height. */
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .bubble-container {
      container-type: size;
      --dp-summary-art-size: min(var(--signature-illustration-size,80px),max(0px,calc(100cqw - 220px)),max(0px,calc(100cqh - 20px)));
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .bubble-content-container {
      grid-template-columns: minmax(0,1fr) minmax(0,1fr);
      grid-template-rows: minmax(36px,max-content) minmax(28px,1fr) minmax(16px,max-content);
      gap: 0 10px;
      padding: 0;
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-illustration="yes"] .bubble-content-container {
      grid-template-columns: minmax(0,1fr) minmax(0,1fr) var(--dp-summary-art-size);
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .dp-summary { display: contents; }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] :is(.bubble-name,.dp-summary-name) {
      /* @include shared/src/styles/name.css {"SIZE_IMPORTANT":" !important"} */
      min-width: 0; margin: 0; padding: 0; align-self: center;
      display: block; white-space: normal; overflow-wrap: anywhere; overflow: visible; text-overflow: clip;
      line-height: 20px; color: var(--primary-text-color);
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .bubble-name { grid-area: 1 / 1; }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .dp-summary-name { grid-area: 1 / 2; }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] :is(.bubble-state,.dp-summary-state) {
      /* @include shared/src/styles/value.css {"SIZE":"clamp(18px,7cqw,var(--signature-value-font-size,28px))","SIZE_IMPORTANT":" !important","WEIGHT_IMPORTANT":" !important"} */
      min-width: 0; margin: 0; padding: 0; align-self: center;
      display: flex; align-items: baseline; width: fit-content; max-width: 100%;
      line-height: 1.1; white-space: nowrap; color: var(--primary-text-color);
      font-variant-numeric: tabular-nums; opacity: 1;
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .bubble-state { grid-area: 2 / 1; }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .dp-summary-state { grid-area: 2 / 2; }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .dp-unit {
      /* @include shared/src/styles/unit.css {"SIZE":"clamp(12px,4cqw,var(--signature-value-unit-font-size,16px))"} */
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] :is(.dp-secondary,.dp-summary-secondary) {
      /* @include shared/src/styles/secondary.css */
      font-size: clamp(12px,3.5cqw,var(--signature-secondary-font-size,13px));
      min-width: 0; margin: 0; padding: 0; align-self: end;
      line-height: max(16px,1.2em); white-space: normal; overflow-wrap: anywhere; overflow: visible; text-overflow: clip;
      font-variant-numeric: tabular-nums;
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .dp-secondary { grid-area: 3 / 1; }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"] .dp-summary-secondary { grid-area: 3 / 2; }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-illustration="yes"] .bubble-content-container::after {
      grid-area: 1 / 3 / 4 / 4; width: var(--dp-summary-art-size);
      align-self: center; justify-self: end;
    }
    /* A single measurement uses the same banner, with no empty metric column. */
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-summary-single="yes"] .bubble-container {
      --dp-summary-art-size: min(var(--signature-illustration-size,80px),max(0px,calc(100cqw - 132px)),max(0px,calc(100cqh - 20px)));
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-summary-single="yes"] .bubble-content-container {
      grid-template-columns: minmax(0,1fr);
    }
    /* No detail means the same two text rows as a classic illustrated tile. */
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-summary-single="yes"][data-dp-secondary="no"] .bubble-content-container {
      grid-template-rows: minmax(36px,max-content) minmax(0,1fr);
      row-gap: 6px;
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-summary-single="yes"][data-dp-illustration="yes"] .bubble-content-container {
      grid-template-columns: minmax(0,1fr) var(--dp-summary-art-size);
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-summary-single="yes"][data-dp-illustration="yes"] .bubble-content-container::after {
      grid-area: 1 / 2 / 4 / 3;
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-summary-single="yes"][data-dp-secondary="no"][data-dp-illustration="yes"] .bubble-content-container::after {
      grid-row-end: 3;
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-summary-single="yes"] .bubble-state {
      font-size: var(--signature-value-font-size,28px) !important;
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-summary-single="yes"] .dp-unit {
      font-size: var(--signature-value-unit-font-size,16px);
    }
    /* The hidden decorative icon must not conceal an active Alert Manager badge. */
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-icon="no"] .bubble-main-icon-container:has(> .am-alert-badge:is([data-am-state="active"],[data-am-state="pending"])) {
      display: flex !important; position: absolute; grid-area: auto;
      top: 0; right: 0; left: auto; width: 22px; height: 22px;
      min-width: 22px !important; min-height: 22px !important;
      background: transparent !important; pointer-events: none;
    }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-icon="no"] .bubble-main-icon-container > :not(.am-alert-badge) { display: none !important; }
    ha-card[data-dp-layout="square"][data-dp-square-mode="summary"][data-dp-icon="no"] .bubble-main-icon-container > .am-alert-badge {
      position: static !important; margin: 0 !important;
    }
    `
