`/* A room has a stable height and only explicitly identified roles are moved. */
    ha-card[data-dp-layout="room"] .bubble-container { height: ${156 + roomExtraHeight}px !important; min-height: ${156 + roomExtraHeight}px !important; container-type: inline-size; }
    ha-card[data-dp-layout="room"] .bubble-wrapper { position: static !important; }
    ha-card[data-dp-layout="room"] .bubble-content-container { position: absolute; inset: 12px; display: grid !important; grid-template-columns: 38px minmax(0,1fr); grid-template-rows: 38px 32px; gap: 10px 10px; margin: 0 !important; pointer-events: none; }
    ha-card[data-dp-layout="room"] .bubble-name-container { display: contents !important; }
    ha-card[data-dp-layout="room"] .bubble-icon-container { grid-area: 1 / 1; width: 38px; height: 38px; min-width: 38px !important; min-height: 38px !important; margin: 0 !important; background: var(--bubble-icon-background-color); --mdc-icon-size: 24px; pointer-events: auto; }
    ha-card[data-dp-layout="room"] .bubble-name { grid-area: 1 / 2; align-self: center;
      /* @include shared/src/styles/name.css {"SIZE_IMPORTANT":" !important"} */
      line-height: 19px; white-space: normal; max-height: 38px; overflow: hidden; }
    ha-card[data-dp-layout="room"] .bubble-state { grid-area: 2 / 1 / 3 / 3; align-self: center; font-size: 17px; line-height: 22px; opacity: 1; }
    ${secondary ? `/* Secondary text gets its own row; reserve the footer even when it wraps. */
    ha-card[data-dp-layout="room"][data-dp-secondary="yes"] .bubble-container { height: auto !important; min-height: ${180 + (roomRows - 1) * 48}px !important; }
    ha-card[data-dp-layout="room"][data-dp-secondary="yes"] .bubble-wrapper { display: block !important; height: auto !important; }
    ha-card[data-dp-layout="room"][data-dp-secondary="yes"] .bubble-content-container { position: relative; inset: auto; width: 100%; box-sizing: border-box; padding: 12px 12px ${68 + (roomRows - 1) * 48}px; grid-template-rows: 38px 32px auto; }
    ha-card[data-dp-layout="room"] .dp-secondary { grid-area: 3 / 1 / 4 / 3; }` : ''}
    ha-card[data-dp-layout="room"][data-dp-has-state="yes"] :is(.room-temperature,.room-humidity) { display: none !important; }
    ha-card[data-dp-layout="room"] :is(.bubble-sub-button-container,.bubble-sub-button-group) { position: static !important; transform: none !important; }
    ha-card[data-dp-layout="room"] :is(.room-temperature,.room-humidity,.room-status,.room-climate,[class*="room-control-"]) { position: absolute !important; margin: 0 !important; padding: 0 !important; min-width: 0 !important; box-sizing: border-box; transform: none !important; }
    /* Match Compact's native 8px inline breathing room. Grow the action box
       around the existing text anchors so its native ripple is never cramped. */
    ha-card[data-dp-layout="room"] :is(.room-temperature,.room-humidity) { top: 60px; bottom: auto; width: max-content; height: 36px; padding: 0 8px !important; background: transparent !important; font-variant-numeric: tabular-nums; }
    ha-card[data-dp-layout="room"] .room-temperature { left: 4px; right: auto; max-width: calc(100% - 86px);
      /* @include shared/src/styles/value.css {"SIZE":"clamp(20px,14cqw,var(--signature-temperature-font-size,30px))"} */
      color: var(--primary-text-color); }
    ha-card[data-dp-layout="room"] .room-humidity { left: auto; right: 4px; max-width: 74px; flex-direction: row !important; gap: 3px; font-size: var(--signature-caption-font-size, 12px); font-weight: var(--signature-font-weight-normal, 400); color: var(--secondary-text-color); }
    ha-card[data-dp-layout="room"] :is(.room-temperature,.room-humidity) .bubble-sub-button-name-container { margin: 0 !important; white-space: nowrap; line-height: 32px; font-size: inherit; overflow: hidden; text-overflow: ellipsis; }
    ha-card[data-dp-layout="room"] .dp-room-unit {
      /* @include shared/src/styles/unit.css {"SIZE":"var(--signature-temperature-unit-font-size, 13px)"} */
       letter-spacing: 0; color: var(--secondary-text-color); }
    ha-card[data-dp-layout="room"][data-dp-room-temperature-text="yes"] .room-temperature { font-size: 15px; letter-spacing: 0; }
    ha-card[data-dp-layout="room"] .room-humidity .bubble-sub-button-icon { --mdc-icon-size: 13px; color: inherit; }
    ${!roomHeaderMeasures ? `/* Narrow tiles keep Compact's 4px bare-value density
       and reserve the humidity target, even for long or unavailable states. */
    @container (max-width: 180px) {
      ha-card[data-dp-layout="room"] :is(.room-temperature,.room-humidity) { padding-inline: 4px !important; }
      ha-card[data-dp-layout="room"] .room-temperature { left: 8px; max-width: calc(100% - 74px); }
      ha-card[data-dp-layout="room"] .room-humidity { right: 8px; max-width: 54px; }
    }` : ''}
    ha-card[data-dp-layout="room"] .room-humidity:not(:has(.bubble-sub-button-icon:not(.hidden):not([hidden])))::before {
content: ''; display: block; width: 11px; height: 14px; flex: 0 0 11px; background: currentColor;
mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3C10 7 5 12 5 16a7 7 0 0 0 14 0c0-4-5-9-7-13Z' fill='none' stroke='black' stroke-width='1.8'/%3E%3C/svg%3E") center / contain no-repeat;
    }
    ${roomHeaderMeasures ? `
    ha-card[data-dp-layout="room"] .bubble-content-container { right: 100px; }
    ha-card[data-dp-layout="room"] .room-temperature { top: 10px; left: auto; right: 4px; height: 26px; max-width: 98px; font-size: 20px; letter-spacing: -0.2px; }
    ha-card[data-dp-layout="room"] .room-temperature .bubble-sub-button-name-container { line-height: 22px; }
    ha-card[data-dp-layout="room"] .room-humidity { top: 36px; height: 18px; }
    ha-card[data-dp-layout="room"] .room-humidity .bubble-sub-button-name-container { line-height: 16px; }
    ` : ''}
    /* The divider exists only for real controls and never intercepts a tap. */
    ha-card[data-dp-layout="room"] .bubble-container:has(:is([class*="room-control-"],.room-climate):not(.hidden):not([hidden]))::after {
      /* @include shared/src/styles/divider.css {"COLOR":"var(--dp-divider-color)"} */
      bottom: ${roomDividerBottom}px;
     }
    ha-card[data-dp-layout="room"] :is([class*="room-control-"],.room-climate) { top: auto; right: auto; bottom: calc(${roomControlBottom}px + (${roomRows - 1} - var(--dp-room-row,0)) * ${roomControlPitch}px); left: calc(8px + var(--room-control-column,var(--dp-room-column,0)) * (100% - 16px) / ${roomColumns}); width: calc((100% - 16px) / ${roomColumns}); height: 44px; justify-content: center; background: transparent !important; box-shadow: none !important; }
    ha-card[data-dp-layout="room"] :is([class*="room-control-"],.room-climate) .bubble-sub-button-icon { width: 36px; height: 36px; padding: 8px; box-sizing: border-box; border-radius: 50%; --mdc-icon-size: 20px; }
    ha-card[data-dp-layout="room"] .room-status { top: 7px; left: 43px; width: 22px; height: 22px; border-radius: 50%; background: ${neutralSurface}; color: var(--warning-color,#ff9800); --mdc-icon-size: 16px; z-index: 2; }

    ha-card[data-dp-layout="room"] .bubble-main-icon { color: var(--primary-text-color); opacity: 1; }
    ha-card[data-dp-layout="room"] .room-status .bubble-sub-button-icon { color: inherit; }

    ha-card[data-dp-layout="room"] .dp-unit { font-size: 11px; }
    `
