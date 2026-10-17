// Reuse native icon-only sub-buttons. CSS :has follows Bubble visibility on
// the same nodes, without a DOM wrapper, observer, measurement or subscription.
if (roomIllustrated) {
  if (structure.roomBadgeCSS === undefined) {
    const badges = styles.filter(({b,spec}) => spec.type === 'badge' && flat.includes(b)
      && (!b.sub_button_type || b.sub_button_type === 'default')
      && b.show_icon !== false && b.show_name !== true && b.show_state !== true
      && !b.state_content && !b.attribute && !b.show_last_changed && !b.show_last_updated
      && !roleSet.has(b) && !['room-temperature','room-humidity'].includes(b.css_class))
      .sort((a,b) => flat.indexOf(a.b)-flat.indexOf(b.b));
    structure.roomBadgeCSS = '';
    if (badges.length) {
      const scope = 'ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"]';
      const selectors = badges.map(({cls}) => '.bubble-sub-button.'+cls);
      const visible = selector => selector+':not(.hidden):not([hidden])';
      const widths = badges.map((_,i) => 'var(--dp-room-badge-'+i+',0px)');
      const active = scope+':has(:is('+selectors.map(visible).join(',')+'))';
      const all = scope+' :is('+selectors.join(',')+')';
      let rules = `
        ${scope} {
          --dp-room-badge-space: calc(0px + ${widths.join(' + ')});
          --dp-room-badge-art: 0px; --dp-room-badge-edge: 12px;
        }
        ${scope}[data-dp-illustration="yes"] {
          --dp-room-badge-art: min(var(--signature-illustration-size,80px),max(0px,100cqw - 112px));
          --dp-room-badge-edge: calc(20px + var(--dp-room-badge-art));
        }
        ${active+' .bubble-name'} {
          padding-right: 0;
          max-width: calc(100% - var(--dp-room-badge-art) - 8px - var(--dp-room-badge-space));
        }
        ${all} {
          position: absolute !important; top: 10px; left: auto; bottom: auto;
          width: 22px; min-width: 0 !important; height: 22px;
          padding: 0 !important; margin: 0 !important; transform: none !important;
          border-radius: 50%; box-sizing: border-box; z-index: 2;
          color: var(--dp-accent);
          background: color-mix(in srgb,currentColor 16%,${neutralSurface});
          box-shadow: none; --mdc-icon-size: 14px;
        }
        ${all+' .bubble-sub-button-icon'} { color: inherit; --mdc-icon-size: 14px; }
        @container (max-width: 239px) {
          ${all} { --dp-room-badge-edge: 12px; }
          ${active+' .bubble-name'} { max-width: calc(100% - var(--dp-room-badge-space)); }
          ${active}[data-dp-illustration="yes"] .bubble-content-container::after {
            width: min(48px,var(--signature-illustration-size,80px),max(0px,100cqw - 112px));
            top: calc(100% - var(--dp-room-badge-divider) - 16px);
          }
          ${active}[data-dp-illustration="yes"][data-dp-secondary="yes"] .bubble-content-container::after {
            top: 38px;
          }
        }
      `;
      badges.forEach((_,i) => {
        rules += scope+' { --dp-room-badge-'+i+': 0px; }';
        rules += scope+':has('+visible(selectors[i])+') { --dp-room-badge-'+i+': 26px; }';
        rules += scope+' '+selectors[i]+' { right: calc(var(--dp-room-badge-edge) + 0px'
          + widths.slice(i+1).map(width => ' + '+width).join('')+'); }';
      });
      structure.roomBadgeCSS = rules;
    }
  }
  if (structure.roomBadgeCSS) css += 'ha-card[data-dp-room-mode="illustrated"] { --dp-room-badge-divider: '
    + roomDividerBottom+'px; }'+structure.roomBadgeCSS;
}
