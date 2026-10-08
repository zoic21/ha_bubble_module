(autoHeight ? `/* Let square cards grow with their content without altering the shared typography. */
    /* The grid provides a shared height; flex keeps intrinsic text sizing and fills each cell. */
    :host { height: 100%; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] { height: 100%; display: flex; flex-direction: column; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .card-content { flex: 1; display: flex; flex-direction: column; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .bubble-container { height: auto !important; flex: 1; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .bubble-wrapper { position: relative !important; height: auto !important; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .bubble-content-container {
position: relative; inset: auto; width: 100%; box-sizing: border-box;
padding: 9px; grid-template-rows: 36px auto;
    }
    ${secondary ? `ha-card[data-dp-layout="square"][data-dp-auto-height="yes"][data-dp-secondary="yes"] .bubble-content-container { grid-template-rows: 36px auto auto; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .dp-secondary { overflow: visible; text-overflow: clip; }` : ''}
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"][data-dp-measure-detail="yes"] .bubble-content-container { bottom: auto; padding-bottom: 26px; }
    ` : '') + (layout === 'square' && o.controls === 'measure' ? `/* Optional measurement controls; leave visibility and state_background native. */
    ha-card[data-dp-controls="measure"] .bubble-name { padding-right: 34px; }
    ha-card[data-dp-controls="measure"][data-dp-measure-detail="yes"] .bubble-content-container { bottom: 26px; }
    ha-card[data-dp-controls="measure"] :is(.bubble-sub-button-container,.bubble-sub-button-group) { position: static !important; }
    ha-card[data-dp-controls="measure"] .bubble-sub-button-1 { position: absolute !important; top: 8px; right: 10px; width: 34px; min-width: 34px !important; height: 34px; padding: 0; border-radius: 50%; --mdc-icon-size: 20px; }
    /* Keep the text's 14px anchor, with Compact's native inline ripple padding. */
    ha-card[data-dp-controls="measure"] .bubble-sub-button-2 { position: absolute !important; top: auto; bottom: 3px; right: 6px; width: auto; min-width: 0 !important; height: 24px; padding: 0 8px; background: transparent !important; box-shadow: none; font-size: var(--signature-caption-font-size, 12px); }
    ` : '')
