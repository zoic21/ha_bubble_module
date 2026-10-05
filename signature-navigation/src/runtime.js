  const config = this.config;
  const buttons = config.sub_button?.bottom;
  // A navigation footer uses one flat bottom row, with native Bubble actions.
  if (config.card_type !== 'sub-buttons' || !config.footer_mode
      || !Array.isArray(buttons) || config.sub_button.main?.length
      || buttons.some(button => !button || Array.isArray(button.group))) return '';
  const options = config.signature_navigation || {};
  const number = (value, fallback, min, max) => {
    const n = Number(value ?? fallback);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const margin = number(options.mobile_margin, 24, 0, 48);
  const blur = number(options.blur, 18, 0, 32);
  const opacity = number(options.opacity, 45, 0, 100);
  const dashboard = window.location.pathname.split('/')[1];
  const active = buttons.findIndex(button => button.tap_action?.action === 'navigate'
    && button.tap_action.navigation_path?.split('/')[1] === dashboard);
  return `
ha-card {
  --bubble-footer-width: ${config.footer_width ?? 420}px !important;
  --signature-nav-margin: ${margin}px;
  --signature-nav-selection-radius: max(0px, calc(var(--signature-card-border-radius, 22px) - 6px));
  /* @include shared/src/styles/card-surface.css {"PROPERTY":"--signature-nav-surface"} */
  --signature-nav-highlight: color-mix(in srgb, var(--signature-nav-surface) 30%, #fff);
  --bubble-footer-box-shadow: none;
  background: transparent !important;
  border: none !important;
  /* @include shared/src/styles/card-radius.css {"IMPORTANT":" !important"} */
  backdrop-filter: blur(${blur}px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(${blur}px) saturate(180%) !important;
  box-shadow: 0 4px 16px rgb(0 0 0 / .10) !important;
  /* @include shared/src/styles/font-family.css */
}
/* Below Bubble's backdrop (4) and popup (5), above dashboard content. */
ha-card.footer-mode:not(.editor) {
  z-index: 3 !important;
}
.bubble-container {
  display: flex;
  align-items: center;
  height: 64px !important;
  padding: 6px;
  background: color-mix(in srgb, var(--signature-nav-surface) ${opacity}%, transparent) !important;
  border: none !important;
  /* @include shared/src/styles/card-radius.css {"IMPORTANT":" !important"} */
  box-shadow: none !important;
}
.bubble-container::before {
  display: none !important;
}
/* Reflet limite au contour : masque CSS inspire de
   https://zenn.dev/takagit/articles/css-liquid-glass-backdrop-filter
   Lumiere en haut et a droite, attenuation en bas et a gauche. */
@supports ((mask-composite: exclude) or (-webkit-mask-composite: xor)) {
  .bubble-container::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    box-sizing: border-box;
    border-radius: inherit;
    padding: 1px;
    background:
      linear-gradient(180deg,
        color-mix(in srgb, var(--signature-nav-highlight) 75%, transparent),
        color-mix(in srgb, var(--signature-nav-highlight) 16%, transparent) 28%,
        transparent 62%),
      linear-gradient(270deg,
        color-mix(in srgb, var(--signature-nav-highlight) 65%, transparent),
        color-mix(in srgb, var(--signature-nav-highlight) 12%, transparent) 8%,
        transparent 22%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    pointer-events: none;
  }
}
.bubble-sub-button-container {
  display: none !important;
}
.bubble-sub-button-bottom-container {
  position: static;
  width: 100%;
  height: 52px;
  margin: 0;
  gap: 4px;
}
.bubble-sub-button-alignment-lane,
.bubble-sub-button-bottom-container .bubble-sub-button-group {
  gap: 4px;
}
.bubble-sub-button {
  flex: 1 1 0% !important;
  min-width: 0 !important;
  height: 52px !important;
  border-radius: var(--signature-nav-selection-radius) !important;
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: var(--secondary-text-color) !important;
  transition: color .2s ease;
}
.bubble-sub-button::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 52px;
  box-sizing: border-box;
  border-radius: var(--signature-nav-selection-radius);
  border: 1px solid transparent;
  background: transparent;
  pointer-events: none;
  transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.bubble-sub-button-icon {
  position: relative;
  --mdc-icon-size: 26px;
  --icon-primary-color: currentColor;
  color: inherit !important;
}
.bubble-sub-button > ha-ripple {
  --ha-ripple-hover-opacity: 0;
  width: 100%;
  height: 52px;
  border-radius: var(--signature-nav-selection-radius);
}
.bubble-sub-button:focus-visible {
  /* @include shared/src/styles/focus-ring.css */
}
@media (max-width: 600px) {
  ha-card.footer-mode:not(.editor) {
    width: calc(100% - var(--signature-nav-margin) - var(--signature-nav-margin)) !important;
    inset-inline-start: var(--signature-nav-margin) !important;
  }
}
@media (hover: hover) and (pointer: fine) {
  .bubble-sub-button:hover::before {
    background: color-mix(in srgb, var(--signature-nav-surface) 40%, transparent);
    box-shadow: inset -1px 1px 1px color-mix(in srgb, var(--signature-nav-highlight) 35%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .bubble-sub-button,
  .bubble-sub-button::before {
    transition: none;
  }
}
${active < 0 ? '' : `
  .bubble-sub-button.bubble-sub-button-${active + 1} {
    color: var(--primary-text-color) !important;
  }
  .bubble-sub-button.bubble-sub-button-${active + 1}::before {
    background: color-mix(in srgb,
      color-mix(in srgb, var(--primary-text-color) 12%, var(--signature-nav-surface)) 65%, transparent);
    box-shadow:
      0 1px 2px rgb(0 0 0 / .025),
      inset -1px 1px 1px color-mix(in srgb, var(--signature-nav-highlight) 25%, transparent);
  }
`}
`;
