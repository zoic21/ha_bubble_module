`/* Compact equipment owns one grid instead of overriding room/footer layouts.
     Flatten only structural wrappers: native text, controls and actions stay. */
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] .bubble-container {
      height: max(118px,calc(var(--signature-illustration-size,80px) + 16px)) !important;
      min-height: max(118px,calc(var(--signature-illustration-size,80px) + 16px)) !important;
      container-type: inline-size;
    }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] .bubble-wrapper {
      --dp-room-metric-font: clamp(13px,calc(8cqw - 11px),22px);
      --dp-room-metric-icon: clamp(12px,3.5cqw,18px);
      --dp-room-metric-art: 0px;
      --dp-room-metric-art-column: 0px;
      position: relative !important; inset: 0; width: 100%; height: 100%;
      display: grid !important; box-sizing: border-box; padding: 8px 12px;
      grid-template-columns: ${roles.length === 2 ? 'minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))'} var(--dp-room-metric-art-column);
      grid-template-rows: 20px minmax(0,1fr); gap: 0;
      align-items: center; align-content: stretch; justify-content: stretch;
      transition: none;
    }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"][data-dp-illustration="yes"] .bubble-wrapper {
      --dp-room-metric-art: min(var(--signature-illustration-size,80px),max(0px,100cqw - 112px));
      --dp-room-metric-art-column: calc(var(--dp-room-metric-art) + 8px);
    }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] :is(.bubble-content-container,.bubble-name-container,.bubble-sub-button-container,.bubble-sub-button-group) {
      display: contents !important; position: static !important;
      contain: none; transform: none !important;
    }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] :is(.bubble-icon-container,.bubble-buttons-container) { display: none !important; }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] .bubble-name {
      grid-area: 1 / 1 / 2 / ${roles.length + 2}; align-self: start; min-width: 0;
      /* @include shared/src/styles/name.css {"SIZE_IMPORTANT":" !important"} */
      line-height: 19px; max-height: 20px; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    /* Bubble's non-scrolling text pipeline sets display:-webkit-box inline.
       This targeted !important is required for the value to remain centred. */
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] :is(.bubble-state,.bubble-sub-button) {
      grid-row: 2; align-self: center; position: relative !important; inset: auto;
      display: flex !important; flex-direction: row !important; align-items: center;
      justify-content: center; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0 !important;
      height: 44px; margin: 0 !important; padding: 0 !important; gap: 3px;
      transition: none;
      transform: none !important; background: transparent !important; box-shadow: none !important;
      font-size: var(--dp-room-metric-font); line-height: 1.2;
      font-weight: var(--signature-font-weight-normal,400);
      font-variant-numeric: tabular-nums; letter-spacing: 0;
      white-space: nowrap !important; overflow: hidden; text-overflow: ellipsis;
    }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] .bubble-state {
      grid-column: 1; justify-content: start; gap: 0;
      font-size: var(--dp-room-metric-font) !important;
      color: var(--primary-text-color); opacity: 1;
    }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] .bubble-state .dp-unit { font-size: inherit; color: inherit; }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] .bubble-sub-button-name-container {
      display: block !important; min-width: 0; margin: 0 !important;
      font-size: inherit; line-height: inherit; font-weight: inherit;
      white-space: nowrap !important; overflow: hidden; text-overflow: ellipsis;
      color: var(--primary-text-color); opacity: 1;
    }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] .bubble-sub-button-icon {
      order: -1; flex: none; width: var(--dp-room-metric-icon); height: var(--dp-room-metric-icon);
      padding: 0; margin: 0 !important; --mdc-icon-size: var(--dp-room-metric-icon);
    }
    ${roles.map(({selector},i) => selector.replace('ha-card','ha-card[data-dp-layout="room"][data-dp-room-inline="compact"]')+' { grid-column: '+(i+2)+'; }').join('')}
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"][data-dp-illustration="yes"] .bubble-content-container::after {
      content: ''; grid-area: 1 / ${roles.length + 2} / -1 / ${roles.length + 3};
      align-self: center; justify-self: end;
      width: var(--dp-room-metric-art); height: var(--dp-room-metric-art);
      pointer-events: none; border-radius: var(--signature-icon-border-radius,12px);
      background-image: var(--dp-illustration-image); background-size: var(--dp-illustration-size);
      background-position: var(--dp-illustration-position); background-repeat: no-repeat;
    }
    ha-card[data-dp-layout="room"][data-dp-room-inline="compact"] :is(.hidden,[hidden]) { display: none !important; }
    `
