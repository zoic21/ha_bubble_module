`/* Page header: native sub-buttons retain their labels, visibility and actions. */
    ha-card[data-dp-layout="header"] {
background: transparent !important; border: none !important;
box-shadow: none !important; width: 100% !important; height: auto !important;
container-type: inline-size;
    }
    ha-card[data-dp-layout="header"] .card-content { width: 100% !important; margin: 0 !important; padding: 0 !important; }
    ha-card[data-dp-layout="header"] .bubble-button-card-container {
width: 100% !important; height: auto !important; min-height: 0 !important;
background: transparent !important; border: none !important;
box-shadow: none !important; overflow: visible !important;
    }
    /* Keep native layout changes immediate when the module styles are applied. */
    ha-card[data-dp-layout="header"] .bubble-wrapper {
transition: none !important;
position: relative !important; display: grid !important;
grid-template-columns: minmax(0, 1fr) auto; align-items: center;
gap: 16px; padding: 6px 0 !important;
width: 100% !important; height: auto !important; box-sizing: border-box;
    }
    ha-card[data-dp-layout="header"] .bubble-content-container { min-width: 0 !important; }
    ha-card[data-dp-layout="header"] .bubble-name-container { margin: 0 !important; min-width: 0 !important; overflow: visible !important; }
    /* Bubble's non-scrolling line clamp clips large glyphs, including the descender in Étage. */
    ha-card[data-dp-layout="header"] .bubble-name { display: block !important; overflow: visible !important; font-size: var(--signature-header-font-size, 38px) !important; line-height: 1.15 !important; font-weight: var(--signature-font-weight-bold, 700) !important; letter-spacing: -1.2px; white-space: normal; }
    ha-card[data-dp-layout="header"] .bubble-sub-button-container {
position: static !important;
flex-wrap: wrap !important; justify-content: flex-end !important;
width: auto !important; min-width: 0; margin: 0 !important; gap: 8px !important;
    }
    ha-card[data-dp-layout="header"] .bubble-sub-button-container:not(.hidden):not([hidden]) { display: flex !important; }
    ha-card[data-dp-layout="header"] .bubble-sub-button-group:not(.hidden):not([hidden]) { display: contents !important; }
    ha-card[data-dp-layout="header"] .bubble-sub-button {
transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease !important;
height: 44px !important; min-width: 0 !important; padding: 0 14px !important;
border-radius: var(--signature-header-button-border-radius, 24px) !important; border: none !important; box-shadow: none !important;
    }
    @container (max-width: 900px) {
ha-card[data-dp-layout="header"] .bubble-wrapper { grid-template-columns: minmax(0, 1fr); gap: 12px; }
ha-card[data-dp-layout="header"] .bubble-sub-button-container { justify-content: flex-start !important; }
    }
    @container (max-width: 600px) {
ha-card[data-dp-layout="header"] .bubble-name { font-size: var(--signature-header-small-font-size, 32px) !important; letter-spacing: -0.8px; }
ha-card[data-dp-layout="header"] .bubble-sub-button { padding: 0 10px !important; }
    }
    /* Treat all sub-buttons as one flex item. Its max-content basis either fits
       beside the title or wraps the whole group onto the full-width next row. */
    @media (max-width: 600px) {
ha-card[data-dp-layout="header"] .bubble-wrapper {
display: flex !important; flex-wrap: wrap; column-gap: 24px; row-gap: 12px;
}
ha-card[data-dp-layout="header"] .bubble-content-container:not(.hidden):not([hidden]) {
/* Absorb spare inline space into the title rather than stretching the pills.
   Below it, the button group is alone on its flex line and grows to full width.
   At mobile widths this ratio leaves less than .01px of spare inline growth. */
display: flex !important; align-items: center; flex: 100000 0 auto;
width: max-content; max-width: 100%; padding: 0 !important; margin: 0 !important;
}
ha-card[data-dp-layout="header"] .bubble-sub-button-container {
flex: 1 0 auto; width: max-content !important; max-width: 100%;
justify-content: space-between !important;
}
ha-card[data-dp-layout="header"] .bubble-sub-button {
/* Share each row equally while preserving the width required by long labels. */
flex: 1 0 0 !important; min-width: max-content !important; max-width: 100%;
justify-content: center !important;
}
    }
    `
