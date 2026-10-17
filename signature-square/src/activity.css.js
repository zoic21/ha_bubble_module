`/* Opt-in two-row activity: native values above, native actions below. */
    ha-card[data-dp-layout="square"][data-dp-kind="button"] .bubble-content-container {
      inset: 9px 9px 37px;
      grid-template-columns: minmax(0,1fr) min(var(--signature-illustration-size,80px),72px);
      grid-template-rows: ${secondary ? '20px minmax(24px,1fr) 18px' : '20px minmax(24px,1fr)'};
      gap: 0 10px;
    }
    ha-card[data-dp-layout="square"][data-dp-kind="button"] .bubble-name { grid-area: 1 / 1; padding: 0; }
    ha-card[data-dp-layout="square"][data-dp-kind="button"] .bubble-state {
      grid-area: 2 / 1; font-size: clamp(18px,6cqw,24px) !important;
      line-height: 24px; white-space: nowrap !important;
    }
    ha-card[data-dp-layout="square"][data-dp-kind="button"] .dp-secondary { grid-area: 3 / 1; align-self: center; }
    ha-card[data-dp-layout="square"][data-dp-kind="button"][data-dp-illustration="yes"] .bubble-content-container::after {
      grid-area: 1 / 2 / -1 / 3; width: min(var(--signature-illustration-size,80px),72px);
      align-self: center;
    }
    ha-card[data-dp-layout="square"][data-dp-kind="button"] .bubble-wrapper > .bubble-sub-button-container {
      position: absolute !important; inset: auto 9px 7px !important; margin: 0 !important;
      width: auto !important; min-height: 30px; justify-content: flex-start;
      gap: 8px; flex-wrap: nowrap;
    }
    ha-card[data-dp-layout="square"][data-dp-kind="button"] .bubble-sub-button-group { gap: 8px; }
    ha-card[data-dp-layout="square"][data-dp-kind="button"] .bubble-sub-button {
      height: 30px; min-width: 30px !important; padding: 0 6px;
      font-size: var(--signature-caption-font-size,12px); --mdc-icon-size: 16px;
    }
    ha-card[data-dp-layout="square"][data-dp-kind="button"] .bubble-sub-button-name-container { min-width: 0; }
    `
