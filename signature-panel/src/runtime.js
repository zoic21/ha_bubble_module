/* @include signature-shared/src/editor.js */
const c = this.config, root = this.card;
const layout = 'panel', kind = c.card_type || 'button';
const tileEnabled = root && (kind === 'media-player'
  || kind === 'button' && !['switch','slider'].includes(c.button_type));
/* @include signature-shared/src/lifecycle.js */
if (!tileEnabled) return '';
/* @include shared/src/media-artwork.js */
const configured = c.signature_panel || {};
const mediaArtwork = mediaArtworkFor(c, configured.illustration);
const o = mediaArtwork ? {...configured, illustration: {image: mediaArtwork}} : configured;
/* @include signature-shared/src/helpers.js */
/* @include signature-shared/src/color-thresholds.js */
/* @include signature-shared/src/structure.js */
const numberEnabled = false;
/* @include signature-shared/src/value-config.js */
/* @include signature-shared/src/value-render.js */
/* @include signature-shared/src/secondary.js */
/* @include signature-shared/src/actions.js */
/* @include signature-shared/src/appearance.js */
/* @include signature-shared/src/illustration.js */
if (mediaArtwork) css += 'ha-card[data-dp-illustration="yes"] {--dp-illustration-size:contain;--dp-illustration-position:center;}ha-card[data-dp-illustration="yes"] .bubble-container::after {border-radius:max(0px,calc(var(--signature-card-border-radius,22px) - 10px));}';
const roles = [], roomColumns = 3;
/* @include signature-shared/src/sub-buttons.js */
/* @include signature-panel/src/statistics.js */
/* @include signature-panel/src/information.js */
/* @include signature-shared/src/title-badges.js {"LAYOUT":"panel","ENABLED":"kind === 'button'","SCOPE_SUFFIX":"","HEADING_GRID":"grid-row: 1; grid-column: 1 / -2; align-self: center;","HEADING_WIDTH":"max-width: 100%;"} */
/* @include signature-panel/src/commands.js */
/* @include signature-panel/src/progress.js */
if (o.hover === false) css += 'ha-card[data-dp-layout="panel"] ha-ripple { --ha-ripple-hover-opacity: 0; }';
const twoLineDetails = kind === 'button' && flat.length === 0 && o.secondary_lines === 2;
const styleKey = [kind, surface, !!secondary, information.length, flat.length, commandStyles.length > 0, twoLineDetails].join('\u0001');
if (runtime.styleKey !== styleKey) {
  runtime.styleCSS = `
    /* @include signature-panel/src/presentation.css */
  `;
  runtime.styleKey = styleKey;
}
return runtime.styleCSS + css;
