`/* Compact illustrated rooms share Square's target artwork size.
    The name and value stay to its left, above the unchanged native footer. */
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-container {
      height: calc(max(148px,calc(var(--signature-illustration-size,80px) + 68px)) + ${roomExtraHeight}px) !important;
      min-height: calc(max(148px,calc(var(--signature-illustration-size,80px) + 68px)) + ${roomExtraHeight}px) !important;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-content-container {
      inset: 12px;
      padding: 0;
      grid-template-columns: minmax(0,1fr);
      grid-template-rows: 38px 32px;
      gap: 4px 0;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-name {
      grid-area: 1 / 1;
      align-self: start;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-illustration="yes"] .bubble-name {
      max-width: calc(100% - min(var(--signature-illustration-size,80px),max(0px,100cqw - 112px)) - 8px);
    }
    /* Let the shared native capsule grow left over the artwork, independently
       of the name. Flex shrink keeps even three badges clear of narrow titles. */
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-illustration="yes"] .dp-room-heading {
      max-width: none;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-illustration="yes"] .dp-room-heading .bubble-name {
      max-width: calc(100% - var(--dp-room-badge-art) - 8px);
      align-self: flex-start;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-illustration="yes"] .dp-room-badges {
      position: relative;
      z-index: 2;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is(.bubble-icon-container,.room-humidity) {
      display: none !important;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .room-temperature {
      top: 52px;
      height: 36px;
      left: 8px;
      padding-inline: 4px !important;
      max-width: calc(100% - 24px);
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-illustration="yes"] .room-temperature {
      /* Preserve at least 80px for the value; reduce the artwork on tiny tiles. */
      max-width: calc(100% - min(var(--signature-illustration-size,80px),max(0px,100cqw - 112px)) - 24px);
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-illustration="yes"] .bubble-content-container::after {
      content: '';
      position: absolute;
      /* Centre within the card interior above the 1px footer divider. */
      top: calc((100% - ${roomDividerBottom + 1}px) / 2);
      transform: translateY(-50%);
      right: 0;
      width: min(var(--signature-illustration-size,80px),max(0px,100cqw - 112px));
      aspect-ratio: 1;
      pointer-events: none;
      border-radius: var(--signature-icon-border-radius,12px);
      background-image: var(--dp-illustration-image);
      background-size: var(--dp-illustration-size);
      background-position: var(--dp-illustration-position);
      background-repeat: no-repeat;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-secondary="no"] .bubble-container:not(:has(:is([class*="room-control-"],.room-climate):not(.hidden):not([hidden]))) .bubble-content-container::after {
      top: 50%;
    }
    /* Badges remain independent native targets at the top right. */
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .room-status {
      left: auto;
      right: 8px;
      top: 8px;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-illustration="no"]:has(.room-status:not(.hidden):not([hidden])) .bubble-name {
      padding-right: 24px;
    }
    /* Preserve optional main/secondary text instead of overlapping artwork. */
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-state {
      grid-area: 2 / 1;
      align-self: end;
      max-width: calc(100% - min(var(--signature-illustration-size,80px),max(0px,100cqw - 112px)) - 8px);
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-secondary="yes"] .bubble-container {
      height: auto !important;
      min-height: calc(max(172px,calc(var(--signature-illustration-size,80px) + 92px)) + ${(roomRows - 1) * 48}px) !important;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-secondary="yes"] .bubble-content-container {
      position: relative;
      inset: auto;
      grid-template-rows: 38px max(32px,calc(var(--signature-illustration-size,80px) - 48px)) auto;
      padding: 12px 12px ${68 + (roomRows - 1) * 48}px;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-secondary="yes"] .bubble-content-container::after {
      top: 8px;
      transform: none;
      right: 12px;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .dp-secondary {
      grid-area: 3 / 1;
    }
    /* Native named controls (e.g. Garden) keep labels alongside their icons. */
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate):has(.bubble-sub-button-name-container:not(:empty):not(.hidden):not([hidden])) {
      display: grid !important;
      grid-template-columns: 30px minmax(0,1fr);
      grid-template-areas: 'icon label';
      gap: 4px;
      padding: 0 8px !important;
      border-radius: var(--signature-control-border-radius,14px);
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate):has(.bubble-sub-button-name-container:not(:empty):not(.hidden):not([hidden])) .bubble-sub-button-icon {
      grid-area: icon;
      width: 30px;
      height: 30px;
      padding: 6px;
      --mdc-icon-size: 18px;
      margin: 0 !important;
    }
    ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate) .bubble-sub-button-name-container {
      grid-area: label;
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
