// Labels stay readable while their parent tint still colors icons and currentColor backgrounds.
const headerTextCSS = `
  ha-card .bubble-sub-button :is(.bubble-sub-button-name-container,.bubble-range-value) {
    color: var(--primary-text-color,#212121) !important;
  }
`;
if (c.card_type === 'separator') {
  return `
    .bubble-container {
      height: 32px !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    ha-card {
      /* @include shared/src/styles/font-family.css */
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    .bubble-icon {
      --mdc-icon-size: 20px !important;
      margin: 0 9px 0 2px !important;
      color: var(--secondary-text-color) !important;
    }
    .bubble-name {
      min-width: 0;
      font-size: var(--signature-title-font-size, 18px) !important;
      font-weight: var(--signature-font-weight-semibold, 600) !important;
      letter-spacing: -0.3px;
      margin-right: 14px !important;
      color: var(--secondary-text-color) !important;
    }
    .bubble-line {
      display: none !important;
    }
    /* Native transition: all must not animate initial layout sizing. */
    .bubble-wrapper { transition: none !important; }
    .bubble-sub-button {
      transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease !important;
    }
    .bubble-sub-button-container {
      margin-inline-start: auto !important;
      flex-shrink: 0;
    }
    /* Separators have direct icon/name/buttons children, unlike page headers.
       Keep the whole button group together beside the title only when it fits. */
    ha-card .bubble-separator {
      height: auto !important;
      min-height: 32px;
      flex-wrap: wrap;
      align-items: center !important;
      row-gap: 8px;
    }
    ha-card .bubble-separator > .bubble-icon { flex: 0 0 auto; }
    ha-card .bubble-separator > .bubble-name {
      flex: 100000 0 auto;
      width: max-content;
      /* Reserve the 20px icon, its 11px margins and the 14px title gap. */
      max-width: calc(100% - 45px);
      white-space: normal !important;
      overflow: visible !important;
      overflow-wrap: anywhere;
    }
    ha-card .bubble-separator .bubble-sub-button-container {
      position: static !important;
      inset: auto !important;
      margin: 0 !important;
      flex: 1 0 auto;
      width: max-content;
      max-width: 100%;
      min-width: 0;
      flex-wrap: wrap;
      justify-content: flex-start;
      gap: 8px;
    }
    ha-card .bubble-separator .bubble-sub-button-group {
      max-width: 100%;
      min-width: 0;
      flex-wrap: wrap;
      justify-content: flex-start;
    }
    ha-card .bubble-separator .bubble-sub-button {
      max-width: 100%;
      min-width: 0;
      height: auto;
      min-height: var(--bubble-sub-button-height, 36px);
      white-space: normal;
    }
    ha-card .bubble-separator .bubble-sub-button-name-container {
      min-width: 0;
      overflow: visible;
      overflow-wrap: anywhere;
    }
  ` + styles.map(({cls,b,spec,thresholdScale}) => subThresholdCSS('ha-card .'+cls,b,spec,thresholdScale)).join('') + headerTextCSS;
}
