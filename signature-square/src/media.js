// Opt-in media branch keeps every native node, visibility and event handler.
// No tile value/secondary transformations or additional observers are needed.
if (kind === 'media-player') {
  let css = `
    ha-card {
      --dp-accent: ${accent};
      --bubble-media-player-main-background-color: ${surface};
      /* @include shared/src/styles/font-family.css */
      /* @include shared/src/styles/card-frame.css {"RADIUS_PROPERTY":"--bubble-media-player-border-radius","BORDER_PROPERTY":"--bubble-media-player-border","SHADOW_PROPERTY":"--bubble-media-player-box-shadow"} */
      --bubble-media-player-buttons-border-radius: var(--signature-control-border-radius,14px);
    }
    ha-card .bubble-container { container-type: size; }
    ha-card .bubble-background { inset: 0; width: auto; height: auto; background: transparent !important; }
    ha-card .bubble-main-icon-container { display: none; }
    ha-card .bubble-content-container { display: contents; }
    ha-card .bubble-name-container { position: absolute; inset: 15px 94px auto 10px; margin: 0; }
    ha-card .bubble-name {
      /* @include shared/src/styles/name.css */
      line-height: 20px; color: var(--primary-text-color);
    }
    ha-card .bubble-media-info-container { position: absolute; inset: 39px 94px auto 10px; width: auto; margin: 0; }
    ha-card .bubble-title {
      /* @include shared/src/styles/name.css */
      font-weight: var(--signature-font-weight-normal,400); line-height: 20px; color: var(--primary-text-color);
    }
    ha-card .bubble-artist {
      /* @include shared/src/styles/secondary.css */
      line-height: 18px; opacity: 1;
    }
    ha-card :is(.bubble-title,.bubble-artist) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
    ha-card .bubble-buttons-container { position: absolute; inset: auto 9px 7px; margin: 0; width: auto; padding: 0; justify-content: flex-start; gap: 8px; }
    ha-card .bubble-media-button { height: 30px; width: 36px; min-width: 30px; }
    ha-card .bubble-volume-slider-wrapper { inset: auto 9px 7px; height: 30px; width: auto; }
    ha-card .bubble-container::after {
      content: ''; position: absolute; right: 10px; top: 9px;
      width: min(var(--signature-illustration-size,80px),72px,max(0px,calc(100cqw - 140px)));
      aspect-ratio: 1; pointer-events: none;
      background: var(--dp-illustration-image) var(--dp-illustration-position) / var(--dp-illustration-size) no-repeat;
    }
    ha-card[data-dp-illustration="no"] .bubble-container::after { display: none; }
  `;
  /* @include signature-shared/src/illustration.js */
  return css;
}
