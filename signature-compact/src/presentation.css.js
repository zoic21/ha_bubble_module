(`/* One compact tile for native cover, climate and button controls. */
    ha-card[data-dp-layout="compact"] { container-type: inline-size; ${kind === 'cover' ? `--bubble-cover-button-background-color: ${neutralSurface}; --bubble-cover-buttons-border-radius: var(--signature-control-border-radius, 14px);` : ''} ${kind === 'climate' || numberEnabled ? `--bubble-climate-background-color: transparent; --bubble-climate-button-background-color: ${neutralSurface};` : ''} }
    /* Match the centered 36px icon's 10px vertical inset, including the 1px card border. */
    ha-card[data-dp-layout="compact"] .bubble-wrapper { display: flex !important; align-items: center !important; gap: 2px; padding: 0 4px; padding-inline-start: 9px; box-sizing: border-box; transition: none !important; }
    ha-card[data-dp-layout="compact"] .bubble-content-container { flex: 1; display: flex !important; align-items: center; min-width: 0; }
    ha-card[data-dp-layout="compact"] .bubble-icon-container { width: 36px; height: 36px; min-width: 36px !important; min-height: 36px !important; margin: 0 4px 0 0 !important; background: var(--bubble-icon-background-color) !important; border-radius: var(--bubble-icon-border-radius) !important; }
    ha-card[data-dp-layout="compact"] .bubble-main-icon { --mdc-icon-size: 22px; color: var(--dp-accent); }
    ha-card[data-dp-layout="compact"] .bubble-name-container { margin: 0 !important; min-width: 0; }
    /* Keep glyphs inside Bubble's clipped name; max-height still measures the two content lines. */
    ha-card[data-dp-layout="compact"] .bubble-name { color: var(--primary-text-color);
      /* @include shared/src/styles/name.css */
      line-height: max(16px, calc(var(--signature-name-font-size,14px) * 1.1)); padding-block: 2px; box-sizing: content-box; white-space: normal; }
    ha-card[data-dp-layout="compact"] .bubble-state {
      /* @include shared/src/styles/secondary.css */
      line-height: max(16px, calc(var(--signature-secondary-font-size, 13px) * 1.2)); white-space: normal; }
    ${!compactValue ? `/* Two name lines and one state line fit the 56px tile; multiline remains an explicit opt-in. */
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="standard"] .bubble-name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; max-height: calc(2 * max(16px, calc(var(--signature-name-font-size,14px) * 1.1))); overflow: hidden; }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="standard"] .bubble-state { display: block; letter-spacing: -0.1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Native inline wrapping must not turn a compact state into an extra row. */
    ${!multiline ? `ha-card[data-dp-layout="compact"][data-dp-compact-mode="standard"][data-dp-multiline="no"] .bubble-state { display: block !important; white-space: nowrap !important; }` : ''}` : ''}
    ha-card[data-dp-layout="compact"] .bubble-sub-button-container { position: relative !important; inset-inline-end: 0 !important; margin: 0 !important; flex-shrink: 0; z-index: 2; }
    ha-card[data-dp-layout="compact"] .bubble-buttons-container { position: static !important; margin: 0 !important; gap: 4px; flex-shrink: 0; }
    /* Two compact rows plus the native row gap equal a two-row square. */
    ha-card[data-dp-layout="compact"] .bubble-container { height: var(--row-height, 56px) !important; }
    ${kind === 'cover' ? `/* Match the 128px thermostat group so mode badges share the same column. */
    ha-card[data-dp-layout="compact"][data-dp-kind="cover"] .bubble-buttons-container { width: 128px; justify-content: space-between; }
    ha-card[data-dp-layout="compact"] .bubble-cover-button { transition: none !important; width: 38px; min-width: 38px; height: 44px; margin: 0; }
    ha-card[data-dp-layout="compact"] .bubble-cover-button-icon { --mdc-icon-size: 20px; }` : ''}
    ${kind === 'climate' || numberEnabled ? `ha-card[data-dp-layout="compact"] :is(.bubble-temperature-container,.bubble-low-temp-container,.bubble-high-temp-container) { width: 128px; height: 44px; flex-shrink: 0; justify-content: space-between; }
    ha-card[data-dp-layout="compact"] :is(.bubble-climate-minus-button,.bubble-climate-plus-button) { width: 38px; min-width: 38px; height: 44px; margin: 0; }
    ha-card[data-dp-layout="compact"] .bubble-climate-temp-display { flex: 1; padding: 0 2px; font-size: var(--signature-caption-font-size, 12px); font-weight: var(--signature-font-weight-semibold, 600); }` : ''}

    ha-card[data-dp-layout="compact"] .dp-unit { font-size: 10px; }

    ` + (numberEnabled ? `/* Button cards do not load Bubble's climate CSS. Geometry is included above. */
    ha-card[data-dp-controls="number"] .bubble-state { display: none !important; }
    ha-card .dp-number-control { display: inline-flex; position: relative; align-items: center; border-radius: var(--bubble-sub-button-border-radius); background: var(--bubble-climate-button-background-color, var(--dp-surface)); }
    ha-card .dp-number-control button { display: flex; align-items: center; justify-content: center; position: relative; appearance: none; border: 0; padding: 0; background: transparent; color: var(--primary-text-color); font-family: inherit; cursor: pointer; border-radius: var(--bubble-sub-button-border-radius); box-sizing: border-box; }
    ha-card .dp-number-control .bubble-climate-temp-display { height: 44px; white-space: nowrap; }
    ha-card .dp-number-control ha-icon { --mdc-icon-size: 16px; }
    ha-card .dp-number-control button:disabled { opacity: 0.35; cursor: default; }
    ha-card .dp-number-control button:focus-visible {
      /* @include shared/src/styles/focus-ring.css {"COLOR":"var(--dp-accent)"} */
     }

    ` : '') + (compactValue ? `/* A value is the native main state, placed beside the title in the compact tile. */
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .bubble-name-container {
display: grid;
grid-template-columns: minmax(0, 1fr) fit-content(60%);
align-items: center;
column-gap: 6px;
    }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .bubble-name {
grid-area: 1 / 1 / 3 / 2;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
    }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .bubble-state {
grid-area: 1 / 2 / 3 / 3;
display: block !important;
min-width: 0;
font-size: var(--signature-compact-value-font-size, 20px);
font-weight: var(--signature-font-weight-medium, 500);
font-variant-numeric: tabular-nums;
color: var(--primary-text-color);
padding-inline-end: 6px;
box-sizing: border-box;
line-height: 1.1;
white-space: nowrap;
text-align: right;
overflow: hidden;
text-overflow: ellipsis;
opacity: 1;
    }
    ${!multiline ? `ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-multiline="no"] .bubble-state { white-space: nowrap !important; }` : ''}
    /* Text values need room for accents and descenders inside Bubble's clipped native state. */
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-value-text="yes"] .bubble-state { font-size: 16px; font-weight: var(--signature-font-weight-normal, 400); color: var(--secondary-text-color); line-height: 1.3; padding-block: 2px; }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-value-text="yes"][data-dp-color-background="yes"] .bubble-state { color: var(--dp-accent); }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .dp-unit {
      /* @include shared/src/styles/unit.css {"SIZE":"var(--signature-secondary-font-size, 13px)"} */
     }
    /* A small neutral button uses the existing state and its more-info action. */
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-value-style="button"] .bubble-state {
      display: inline-flex !important; align-items: center; justify-content: center;
      min-width: 36px; height: 36px; padding: 0 10px;
      font-size: var(--signature-name-font-size, 14px); font-weight: var(--signature-font-weight-medium, 500);
      line-height: 1.2; color: var(--primary-text-color); text-align: center;
      border-radius: var(--signature-control-border-radius, 14px);
      background: var(--signature-control-background, color-mix(in srgb, var(--primary-text-color) 4%, ${neutralSurface}));
    }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-value-style="button"] .bubble-state .dp-unit {
      font-size: var(--signature-caption-font-size, 12px); flex-shrink: 0;
    }
    ${secondary ? `ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .dp-secondary { grid-area: 2 / 1; }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-secondary="yes"] .bubble-name { grid-area: 1 / 1; }` : ''}
    ` : '') + (valueTrailing ? `/* Flatten only layout boxes: keep the native state node, formatting and action bindings. */
    ha-card[data-dp-value-trailing="yes"] .bubble-wrapper {
display: grid !important;
grid-template-columns: 36px minmax(0, 1fr) auto fit-content(60%);
grid-template-rows: 1fr 1fr;
column-gap: 4px;
row-gap: 0;
    }
    ha-card[data-dp-value-trailing="yes"] :is(.bubble-content-container,.bubble-name-container) { display: contents !important; }
    ha-card[data-dp-value-trailing="yes"] .bubble-icon-container { grid-area: 1 / 1 / 3 / 2; margin: 0 !important; }
    ha-card[data-dp-value-trailing="yes"] .bubble-name { grid-area: 1 / 2 / 3 / 3 !important; align-self: center; min-width: 0; }
    ha-card[data-dp-value-trailing="yes"] .bubble-sub-button-container { grid-area: 1 / 3 / 3 / 4; align-self: center; }
    ha-card[data-dp-value-trailing="yes"] .bubble-state { grid-area: 1 / 4 / 3 / 5 !important; align-self: center; }
    ${secondary ? `ha-card[data-dp-value-trailing="yes"] .dp-secondary { grid-area: 2 / 2 / 3 / 3 !important; align-self: start; min-width: 0; }
    ha-card[data-dp-value-trailing="yes"][data-dp-secondary="yes"] .bubble-name { grid-area: 1 / 2 / 2 / 3 !important; align-self: end; }` : ''}
    ha-card[data-dp-value-trailing="yes"][data-dp-icon="no"] .bubble-wrapper { grid-template-columns: 0 minmax(0, 1fr) auto fit-content(60%); }
    /* The measurement precedes every native action, including the final switch. */
    ha-card[data-dp-value-style="button"] .bubble-wrapper { grid-template-columns: 36px minmax(0, 1fr) fit-content(40%) auto; }
    ha-card[data-dp-value-style="button"][data-dp-icon="no"] .bubble-wrapper { grid-template-columns: 0 minmax(0, 1fr) fit-content(40%) auto; }
    ha-card[data-dp-value-style="button"] .bubble-state { grid-area: 1 / 3 / 3 / 4 !important; }
    ha-card[data-dp-value-style="button"] .bubble-sub-button-container { grid-area: 1 / 4 / 3 / 5; }
    ` : ''))
