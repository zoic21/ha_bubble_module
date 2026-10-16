`/* Opt-in illustrated rooms: 176px (+12.8%), with native footer targets.
    The 38px title row stays full-width; artwork yields space to the temperature. */
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-container {
      height: ${176 + roomExtraHeight}px !important;
      min-height: ${176 + roomExtraHeight}px !important;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-content-container {
      inset: 12px;
      padding: 0;
      grid-template-columns: minmax(0,1fr);
      grid-template-rows: 38px 64px;
      gap: 4px 0;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-name {
      grid-area: 1 / 1;
      align-self: start;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is(.bubble-icon-container,.room-humidity) {
      display: none !important;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .room-temperature {
      top: 78px;
      left: 4px;
      max-width: calc(100% - 24px);
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-illustration="yes"] .room-temperature {
      /* Preserve at least 80px for the value; reduce the artwork on tiny tiles. */
      max-width: calc(100% - min(64px,max(0px,100cqw - 112px)) - 20px);
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-illustration="yes"] .bubble-content-container::after {
      content: '';
      position: absolute;
      top: 42px;
      right: 0;
      width: min(64px,max(0px,100cqw - 112px));
      aspect-ratio: 1;
      pointer-events: none;
      border-radius: var(--signature-icon-border-radius,12px);
      background-image: var(--dp-illustration-image);
      background-size: var(--dp-illustration-size);
      background-position: var(--dp-illustration-position);
      background-repeat: no-repeat;
    }
    /* Badges remain independent native targets at the top right. */
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .room-status {
      left: auto;
      right: 8px;
      top: 8px;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"]:has(.room-status:not(.hidden):not([hidden])) .bubble-name {
      padding-right: 24px;
    }
    /* Preserve optional main/secondary text instead of overlapping artwork. */
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-state {
      grid-area: 2 / 1;
      align-self: end;
      max-width: calc(100% - 72px);
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-secondary="yes"] .bubble-container {
      height: auto !important;
      min-height: ${200 + (roomRows - 1) * 48}px !important;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-secondary="yes"] .bubble-content-container {
      position: relative;
      inset: auto;
      grid-template-rows: 38px 64px auto;
      padding: 12px 12px ${68 + (roomRows - 1) * 48}px;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-secondary="yes"] .bubble-content-container::after {
      top: 54px;
      right: 12px;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .dp-secondary {
      grid-area: 3 / 1;
    }
    /* Native named controls (e.g. Garden) keep labels alongside their icons. */
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate):has(.bubble-sub-button-name-container:not(:empty):not(.hidden):not([hidden])) {
      display: grid !important;
      grid-template-columns: 30px minmax(0,1fr);
      gap: 4px;
      padding: 0 8px !important;
      border-radius: var(--signature-control-border-radius,14px);
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate):has(.bubble-sub-button-name-container:not(:empty):not(.hidden):not([hidden])) .bubble-sub-button-icon {
      width: 30px;
      height: 30px;
      padding: 6px;
      --mdc-icon-size: 18px;
      margin: 0 !important;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate) .bubble-sub-button-name-container {
      min-width: 0;
      margin: 0 !important;
      font-size: var(--signature-caption-font-size,12px);
      line-height: 16px;
      color: var(--primary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 1;
    }
    @container (max-width: 360px) {
      ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate):has(.bubble-sub-button-name-container:not(:empty):not(.hidden):not([hidden])) {
        grid-template-columns: 26px minmax(0,1fr);
        gap: 3px;
        padding-inline: 4px !important;
      }
      ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate):has(.bubble-sub-button-name-container:not(:empty):not(.hidden):not([hidden])) .bubble-sub-button-icon {
        width: 26px;
        height: 26px;
        padding: 4px;
      }
    }
    @container (max-width: 319px) {
      ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate) .bubble-sub-button-name-container {
        font-size: 11px;
      }
      ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate):has(.bubble-sub-button-name-container:not(:empty):not(.hidden):not([hidden])) {
        gap: 2px;
        padding-inline: 3px !important;
      }
    }
    `
