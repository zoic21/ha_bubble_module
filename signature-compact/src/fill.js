// A numeric gauge decorates the native surface; it owns no node or action.
const fill = o.fill;
const fillConfigured = fill && typeof fill === 'object' && !Array.isArray(fill)
  && (String(fill.reference_entity ?? '').trim() !== '' || fill.max != null);
const fillEnabled = kind === 'button' && c.button_type === 'state' && !numberEnabled
  && fillConfigured && fill.enabled !== false;
if (fillEnabled) {
  const numeric = value => {
    if (!['string','number'].includes(typeof value) || String(value).trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  // Reads remain outside configuration/CSS caches so Bubble tracks both sources.
  const current = hass.states[c.entity];
  const referenceId = String(fill.reference_entity ?? '').trim();
  const reference = referenceId ? hass.states[referenceId] : null;
  const value = numeric(current?.state);
  const maximum = numeric(referenceId ? reference?.state : fill.max);
  const sameUnit = !referenceId || (current?.attributes?.unit_of_measurement || '')
    === (reference?.attributes?.unit_of_measurement || '');
  const valid = value !== null && maximum !== null && maximum > 0 && sameUnit;
  const part = valid ? Math.min(100, Math.max(0, value / maximum * 100)) : null;
  attr('data-dp-fill', valid ? 'valid' : 'unavailable');
  // Three native controls need their own row on narrow cards. Do not shrink
  // switches, dropdown arrows or text; CSS wraps existing groups and buttons.
  if (valueTrailing && flat.length >= 3) attr('data-dp-fill-controls','wrap');
  else root.removeAttribute('data-dp-fill-controls');
  const selector = 'ha-card[data-dp-layout="compact"][data-dp-fill] .bubble-button-card-container';
  if (!runtime.fillCSS) runtime.fillCSS = `
    ${selector} {
      background-image: none !important;
      background-size: var(--dp-fill-part) 100% !important;
      background-repeat: no-repeat !important;
      background-position: left center !important;
      background-origin: border-box !important;
      transition: background-size 1.5s ease-in-out !important;
    }
    ha-card[data-dp-layout="compact"][data-dp-fill="valid"] .bubble-button-card-container {
      background-image: linear-gradient(color-mix(in srgb, var(--dp-accent) var(--signature-fill-tint, 16%), transparent), color-mix(in srgb, var(--dp-accent) var(--signature-fill-tint, 16%), transparent)) !important;
    }
    @container (max-width: 480px) {
      ha-card[data-dp-fill-controls="wrap"] .bubble-container { height: auto !important; }
      ha-card[data-dp-fill-controls="wrap"] .bubble-wrapper {
        position: relative !important; height: auto !important;
        grid-template-columns: 36px minmax(0, 1fr) fit-content(60%);
        grid-template-rows: minmax(36px, auto) auto;
        padding-block: 9px; row-gap: 8px;
      }
      ha-card[data-dp-fill-controls="wrap"] .bubble-icon-container { grid-area: 1 / 1 / 2 / 2; }
      ha-card[data-dp-fill-controls="wrap"] .bubble-name { grid-area: 1 / 2 / 2 / 3 !important; }
      ha-card[data-dp-fill-controls="wrap"] .bubble-state { grid-area: 1 / 3 / 2 / 4 !important; }
      ha-card[data-dp-fill-controls="wrap"] .bubble-sub-button-container {
        grid-area: 2 / 1 / 3 / 4; min-width: 0; flex-wrap: wrap; justify-content: end;
      }
      ha-card[data-dp-fill-controls="wrap"] .bubble-sub-button-group { flex-wrap: wrap; min-width: 0; }
      ha-card[data-dp-fill-controls="wrap"][data-dp-secondary="yes"] .bubble-wrapper { grid-template-rows: auto auto auto; row-gap: 0; }
      ha-card[data-dp-fill-controls="wrap"][data-dp-secondary="yes"] :is(.bubble-icon-container,.bubble-state) { grid-row: 1 / 3 !important; }
      ha-card[data-dp-fill-controls="wrap"][data-dp-secondary="yes"] .dp-secondary { grid-area: 2 / 2 / 3 / 3 !important; }
      ha-card[data-dp-fill-controls="wrap"][data-dp-secondary="yes"] .bubble-sub-button-container { grid-row: 3; margin-block-start: 8px !important; }
    }
    @media (prefers-reduced-motion: reduce) { ${selector} { transition: none !important; } }
  `;
  css += runtime.fillCSS + 'ha-card[data-dp-fill]{--dp-fill-part:'+(part === null ? '0' : part)+'%;}';
} else {
  root.removeAttribute('data-dp-fill');
  root.removeAttribute('data-dp-fill-controls');
}
