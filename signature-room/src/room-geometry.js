// Only room roles are repositioned. Other native sub-button groups stay native.
const roles = layout === 'room' ? structure.roles : [];
const roomColumns = Math.round(number(o.room_control_columns,4,1,6));
const roomRows = Math.max(1,Math.ceil(roles.length / roomColumns));
const roomIllustrated = o.room_mode === 'illustrated';
attr('data-dp-room-mode',roomIllustrated ? 'illustrated' : 'classic');
// A double-height equipment card keeps the artwork beside, not above, the
// footer. Restrict this opt-in to a single row of at most three named commands.
const roomCompact = roomIllustrated && o.room_compact === true && visibleState && !secondary
  && roomColumns <= 3 && roles.length > 0 && roles.length <= roomColumns
  && roles.every(({b}) => b.show_name === true && (!b.sub_button_type || b.sub_button_type === 'default')
    && styles.some(style => style.b === b && style.spec.type === 'command'));
attr('data-dp-room-density',roomCompact ? 'compact' : 'standard');
// Header measures free the second row for controls without enlarging the room tile.
// A main state or secondary still needs the regular content rows.
const roomHeaderMeasures = layout === 'room' && !roomIllustrated && o.room_measures_position === 'header' && !visibleState && !secondary;
const roomExtraHeight = Math.max(0,roomRows - (roomHeaderMeasures ? 2 : 1)) * 48;
// Keep an 8px visual gap below the header without shrinking the 44px action targets.
const roomControlPitch = roomHeaderMeasures ? 44 : 48;
const roomControlBottom = roomHeaderMeasures ? 4 : 8;
const roomDividerBottom = roomControlBottom + 47 + (roomRows - 1) * roomControlPitch;
// An equipment summary can align its value with up to two native measurements.
// Keep named action commands on their existing footer, never in a measure row.
const roomInlineMetrics = roomIllustrated && !roomCompact && o.room_inline_metrics === true
  && visibleState && !secondary && roles.length > 0 && roles.length <= 2
  && roles.every(({b}) => b.show_name !== true && (b.show_state === true || b.state_content));
const roomInlineCompact = roomInlineMetrics && o.room_compact === true && flat.length === roles.length;
if (roomInlineCompact) attr('data-dp-room-inline','compact');
else root.removeAttribute('data-dp-room-inline');
// The full-height variant keeps its footer. Compact equipment uses a separate
// grid stylesheet, never the regular room/footer geometry plus overrides.
if (roomInlineMetrics && !roomInlineCompact) {
  const scope = 'ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"]';
  const columns = roles.length + 1;
  css += `
    ${scope+' .bubble-state'} { position: absolute; inset: auto auto -4px 0; height: 44px; width: calc(100% / ${columns}); max-width: calc(100% / ${columns}); display: flex !important; align-items: center; }
    ${scope+' .bubble-container::after'} { display: none; }
  `;
  roles.forEach(({selector},i) => {
    const metric = selector.replace('ha-card',scope);
    css += metric+' { left: calc(12px + '+(i+1)+' * (100% - 24px) / '+columns+'); width: calc((100% - 24px) / '+columns+'); bottom: 8px; gap: 4px; font-size: var(--signature-name-font-size,14px); }';
    css += metric+' > .bubble-sub-button-icon { width: 16px; height: 16px; padding: 0; --mdc-icon-size: 16px; }';
    css += metric+' > .bubble-sub-button-name-container { min-width: 0; }';
  });
}
// Keep native actions and press feedback; only suppress the optional mouse halo.
if (o.room_hover === false)
  css += 'ha-card[data-dp-layout="room"] ha-ripple { --ha-ripple-hover-opacity: 0; }';
// Opt-in presentation refinements leave existing room cards unchanged. Emit
// these outside the structural cache so removing an option restores defaults.
if (o.room_show_divider === false)
  css += 'ha-card[data-dp-layout="room"] .bubble-container::after { display: none; }';
if (roomIllustrated && !roomCompact && !roomInlineCompact && o.room_state_centered === true && visibleState && !secondary) {
  const content = 'ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-container:has(:is([class*="room-control-"],.room-climate):not(.hidden):not([hidden])) .bubble-content-container';
  css += `
    ${content} { bottom: ${roomControlBottom + 44 + (roomRows - 1) * roomControlPitch}px; grid-template-rows: auto minmax(0,1fr); row-gap: 0; }
    ${content+' .bubble-state'} { align-self: center; }
  `;
  // Keep the artwork centred in the original upper region: shortening the
  // content grid must not move it down into, or up out of, the card.
  css += content+'::after { top: calc(50% - 8px); }';
}
if (roomCompact) {
  const scope = 'ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"][data-dp-room-density="compact"]';
  css += `
    ${scope} { --dp-room-compact-art: 0px; }
    ${scope}[data-dp-illustration="yes"] { --dp-room-compact-art: calc(min(var(--signature-illustration-size,80px),max(0px,100cqw - 112px)) + 8px); }
    ${scope+' .bubble-container'} { height: max(118px,calc(var(--signature-illustration-size,80px) + 16px)) !important; min-height: max(118px,calc(var(--signature-illustration-size,80px) + 16px)) !important; }
    ${scope+' .bubble-content-container'} { inset: 8px 12px; padding: 0; box-sizing: border-box; grid-template-rows: 19px minmax(0,1fr); row-gap: 0; }
    ${scope+' .bubble-container:has(:is([class*="room-control-"],.room-climate):not(.hidden):not([hidden])) .bubble-content-container'} { padding-bottom: 44px; }
    ${scope+' .bubble-name'} { white-space: nowrap; max-height: 19px; }
    ${scope+' .bubble-state'} { align-self: center; }
    ${scope+' .bubble-content-container::after'} { top: 50%; }
  `;
}
// Preserve the explicit motion/occupancy ring when artwork replaces the icon.
if (roomIllustrated && String(o.icon_border_color ?? '').trim())
  css += 'ha-card[data-dp-room-mode="illustrated"] .bubble-content-container::after { box-shadow: inset 0 0 0 2px '+color(o.icon_border_color,'transparent')+'; }';
if (roomIllustrated && String(o.border_color ?? '').trim())
  css += 'ha-card[data-dp-room-mode="illustrated"] .bubble-container { box-shadow: var(--signature-card-box-shadow,var(--ha-card-box-shadow,0 2px 10px rgb(0 0 0 / .035))), inset 0 0 0 2px '+color(o.border_color,'transparent')+' !important; }';
// Optional glyph outline replaces per-card CSS without changing exact RGB colors.
styles.forEach(({cls,b,spec}) => {
  if (String(spec.icon_outline_color ?? '').trim())
    css += 'ha-card .'+cls+' .bubble-sub-button-icon { stroke: '+color(spec.icon_outline_color,'transparent',b.entity)+'; stroke-width: 1.5px; stroke-linejoin: round; paint-order: stroke fill; }';
});
roles.forEach(({b,selector},i) => {
  css += selector+' { --dp-room-column: '+(i % roomColumns)+'; --dp-room-row: '+Math.floor(i / roomColumns)+'; }';
  // Native ripple feedback must follow the circular icon, not its wider action target.
  if (b.show_name !== true && b.show_state !== true && !b.state_content && !b.attribute
      && !b.show_last_changed && !b.show_last_updated)
    css += selector+' > ha-ripple { clip-path: circle(18px at 50% 50%); }';
});
