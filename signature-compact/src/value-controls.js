// Preserve native command sizes and let small-value rows wrap by intrinsic width.
const wrapValueControls = (valueButton || fillEnabled) && valueTrailing && flat.length >= 3;
if (wrapValueControls) {
  attr('data-dp-value-controls', 'wrap');
  if (!runtime.valueControlsCSS) runtime.valueControlsCSS = `
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .bubble-container { height: auto !important; min-height: var(--row-height,56px); }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .bubble-wrapper {
      display: flex !important; flex-wrap: wrap; position: relative !important;
      height: auto !important; min-height: calc(var(--row-height,56px) - 2px); padding-block: 9px; gap: 8px;
    }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .bubble-content-container {
      display: flex !important; flex: 100000 1 max-content; min-width: 0;
      padding: 0; gap: 0;
    }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .bubble-icon-container { margin: 0 10px 0 0 !important; }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .bubble-name-container {
      display: grid !important; flex: 1; width: max-content;
      grid-template-columns: minmax(0,1fr) auto; column-gap: 8px;
    }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .bubble-name { grid-area: 1 / 1 / 3 / 2 !important; }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .bubble-state { grid-area: 1 / 2 / 3 / 3 !important; }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .dp-secondary { grid-area: 2 / 1 / 3 / 2 !important; }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"][data-dp-secondary="yes"] .bubble-name { grid-area: 1 / 1 / 2 / 2 !important; }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .bubble-sub-button-container {
      flex: 1 0 max-content; max-width: 100%; min-width: 0;
      flex-wrap: wrap; justify-content: end;
    }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style="button"] .bubble-sub-button-group { flex-wrap: wrap; min-width: 0; max-width: 100%; }
    @container (max-width: 480px) {
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"] .bubble-container { height: auto !important; }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"] .bubble-wrapper {
        position: relative !important; height: auto !important;
        grid-template-columns: 38px minmax(0, 1fr) fit-content(60%);
        grid-template-rows: minmax(36px, auto) auto;
        padding-block: 9px; row-gap: 8px;
      }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"][data-dp-icon="no"] .bubble-wrapper { grid-template-columns: 0 minmax(0, 1fr) fit-content(60%); }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"] .bubble-icon-container { grid-area: 1 / 1 / 2 / 2; }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"] .bubble-name { grid-area: 1 / 2 / 2 / 3 !important; }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"] .bubble-state { grid-area: 1 / 3 / 2 / 4 !important; }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"] .bubble-sub-button-container {
        grid-area: 2 / 1 / 3 / 4; min-width: 0; flex-wrap: wrap; justify-content: end;
      }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"] .bubble-sub-button-group { flex-wrap: wrap; min-width: 0; }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"][data-dp-secondary="yes"] .bubble-wrapper { grid-template-rows: auto auto auto; row-gap: 0; }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"][data-dp-secondary="yes"] :is(.bubble-icon-container,.bubble-state) { grid-row: 1 / 3 !important; }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"][data-dp-secondary="yes"] .dp-secondary { grid-area: 2 / 2 / 3 / 3 !important; }
      ha-card[data-dp-value-controls="wrap"][data-dp-value-style="text"][data-dp-secondary="yes"] .bubble-sub-button-container { grid-row: 3; margin-block-start: 8px !important; }
    }
    ha-card[data-dp-value-controls="wrap"][data-dp-value-style] :is(.hidden,[hidden]) { display: none !important; }
  `;
  css += runtime.valueControlsCSS;
} else root.removeAttribute('data-dp-value-controls');
