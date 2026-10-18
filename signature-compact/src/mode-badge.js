// Overlay the existing mode button on the main icon. Bubble owns every gesture,
// action, full accessible name and visibility; no new node or handler is needed.
const modeBadges = styles.filter(({b,spec}) => spec.type === 'mode_badge'
  && b.entity && b.show_name === true && b.show_state !== true
  && (!b.sub_button_type || b.sub_button_type === 'default'));
const modeBadge = ['cover','climate'].includes(kind) && c.show_icon !== false
  && modeBadges.length === 1 ? modeBadges[0] : null;
attr('data-dp-mode-badge',modeBadge ? 'yes' : 'no');
if (modeBadge) {
  const label = render(modeBadge.b.name,modeBadge.b.entity).trim();
  const glyph = [...label][0] || '—';
  const scope = 'ha-card[data-dp-layout="compact"][data-dp-mode-badge="yes"]';
  const target = scope+' .bubble-sub-button.'+modeBadge.cls;
  const select = suffix => target+suffix;
  const parents = scope+' :is(.bubble-wrapper,.bubble-sub-button-container,.bubble-sub-button-group,.bubble-sub-button-alignment-lane)';
  css += `
    ${parents} { position: static !important; }
    ${target} {
      position: absolute !important; left: 5px; top: 50%; transform: translateY(-50%);
      width: 44px !important; min-width: 44px !important; height: 44px !important;
      padding: 0 !important; margin: 0 !important; gap: 0;
      box-sizing: border-box; border-radius: var(--signature-control-border-radius,14px);
      background: transparent !important; box-shadow: none; z-index: 3;
    }
    ${target}::after {
      content: ${JSON.stringify(glyph)}; position: absolute; right: 0; bottom: 0;
      display: grid; place-items: center; box-sizing: border-box;
      width: 14px; height: 14px; border-radius: 50%;
      border: 1px solid ${neutralSurface};
      background: var(--dp-mode-badge-background,${neutralSurface}); color: inherit;
      font-family: inherit; font-size: 9px; line-height: 1;
      font-weight: var(--signature-font-weight-semibold,600); pointer-events: none;
    }
    /* Keep the full native Auto/Manuel label available to assistive technology. */
    ${select(' .bubble-sub-button-name-container')} {
      position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
    }
    ${select(' .bubble-sub-button-icon')} { display: none !important; }
    ${select(' > ha-ripple')} { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
    ${target}:focus-visible { outline: 2px solid var(--dp-accent); outline-offset: 2px; }
  `;
}
