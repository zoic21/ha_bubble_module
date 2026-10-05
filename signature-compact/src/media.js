// Media players keep Bubble's native layout, artwork, volume and actions.
// Return before the tile DOM transformations and compact sizing rules.
if (kind === 'media-player') {
  return `
    ha-card {
      --dp-accent: ${accent};
      --bubble-media-player-main-background-color: ${surface};
      /* @include shared/src/styles/font-family.css */
      /* @include shared/src/styles/card-frame.css {"RADIUS_PROPERTY":"--bubble-media-player-border-radius","BORDER_PROPERTY":"--bubble-media-player-border","SHADOW_PROPERTY":"--bubble-media-player-box-shadow"} */
      --bubble-media-player-buttons-border-radius: var(--signature-control-border-radius, 14px);
    }
    ha-card .bubble-main-icon-container {
      --bubble-icon-background-color: ${iconSurface};
      --bubble-icon-border-radius: var(--signature-icon-border-radius, 12px);
    }
    ha-card .bubble-main-icon { color: ${accent} !important; }
    ha-card :is(.bubble-name,.bubble-title) {
      /* @include shared/src/styles/name.css */
       color: var(--primary-text-color); }
    ha-card :is(.bubble-state,.bubble-artist) {
      /* @include shared/src/styles/secondary.css */
      font-weight: var(--signature-font-weight-normal, 400); opacity: 1; }
    ha-card .bubble-media-info-container { line-height: 1.3; }
  `;
}
