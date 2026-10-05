// Native entity-registry choice, suggested precision, then legacy state metadata.
// Each visual role retains its own default, allowed range and explicit override.
const precisionFor = (hass,id,state) => hass.entities?.[id]?.display_precision
  ?? state?.attributes?.suggested_display_precision ?? state?.attributes?.display_precision;
