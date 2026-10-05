// Media players keep Bubble's native layout, artwork, volume and actions.
// Return before the tile DOM transformations and compact sizing rules.
if (kind === 'media-player') {
  return `
    ha-card {
      --dp-accent: ${accent};
      --bubble-media-player-main-background-color: ${surface};
      font-family: var(--signature-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      --bubble-media-player-border-radius: var(--signature-card-border-radius, 22px);
      --bubble-media-player-buttons-border-radius: var(--signature-control-border-radius, 14px);
      --bubble-media-player-box-shadow: var(--signature-card-box-shadow,var(--ha-card-box-shadow,0 2px 10px rgb(0 0 0 / .035)));
      --bubble-media-player-border: 1px solid var(--signature-card-border-color, color-mix(in srgb, var(--primary-text-color) 5%, transparent));
    }
    ha-card .bubble-main-icon-container {
      --bubble-icon-background-color: ${iconSurface};
      --bubble-icon-border-radius: var(--signature-icon-border-radius, 12px);
    }
    ha-card .bubble-main-icon { color: ${accent} !important; }
    ha-card :is(.bubble-name,.bubble-title) { font-size: var(--signature-name-font-size, 14px); font-weight: var(--signature-font-weight-semibold, 600); letter-spacing: -0.2px; color: var(--primary-text-color); }
    ha-card :is(.bubble-state,.bubble-artist) { font-size: var(--signature-secondary-font-size, 13px); font-weight: var(--signature-font-weight-normal, 400); color: var(--secondary-text-color); opacity: 1; }
    ha-card .bubble-media-info-container { line-height: 1.3; }
  `;
}
