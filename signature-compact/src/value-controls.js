// Preserve native command sizes, wrapping their existing container when needed.
const wrapValueControls = (valueButton || fillEnabled) && valueTrailing && flat.length >= 3;
if (wrapValueControls) {
  attr('data-dp-value-controls', 'wrap');
  if (!runtime.valueControlsCSS) runtime.valueControlsCSS = `
    @container (max-width: 480px) {
      ha-card[data-dp-value-controls="wrap"] .bubble-container { height: auto !important; }
      ha-card[data-dp-value-controls="wrap"] .bubble-wrapper {
        position: relative !important; height: auto !important;
        grid-template-columns: 36px minmax(0, 1fr) fit-content(60%);
        grid-template-rows: minmax(36px, auto) auto;
        padding-block: 9px; row-gap: 8px;
      }
      ha-card[data-dp-value-controls="wrap"][data-dp-icon="no"] .bubble-wrapper { grid-template-columns: 0 minmax(0, 1fr) fit-content(60%); }
      ha-card[data-dp-value-controls="wrap"] .bubble-icon-container { grid-area: 1 / 1 / 2 / 2; }
      ha-card[data-dp-value-controls="wrap"] .bubble-name { grid-area: 1 / 2 / 2 / 3 !important; }
      ha-card[data-dp-value-controls="wrap"] .bubble-state { grid-area: 1 / 3 / 2 / 4 !important; }
      ha-card[data-dp-value-controls="wrap"] .bubble-sub-button-container {
        grid-area: 2 / 1 / 3 / 4; min-width: 0; flex-wrap: wrap; justify-content: end;
      }
      ha-card[data-dp-value-controls="wrap"] .bubble-sub-button-group { flex-wrap: wrap; min-width: 0; }
      ha-card[data-dp-value-controls="wrap"][data-dp-secondary="yes"] .bubble-wrapper { grid-template-rows: auto auto auto; row-gap: 0; }
      ha-card[data-dp-value-controls="wrap"][data-dp-secondary="yes"] :is(.bubble-icon-container,.bubble-state) { grid-row: 1 / 3 !important; }
      ha-card[data-dp-value-controls="wrap"][data-dp-secondary="yes"] .dp-secondary { grid-area: 2 / 2 / 3 / 3 !important; }
      ha-card[data-dp-value-controls="wrap"][data-dp-secondary="yes"] .bubble-sub-button-container { grid-row: 3; margin-block-start: 8px !important; }
    }
  `;
  css += runtime.valueControlsCSS;
} else root.removeAttribute('data-dp-value-controls');
