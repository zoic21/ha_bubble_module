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
  `;
}
