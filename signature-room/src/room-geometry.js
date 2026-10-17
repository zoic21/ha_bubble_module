// Only room roles are repositioned. Other native sub-button groups stay native.
const roles = layout === 'room' ? structure.roles : [];
const roomColumns = Math.round(number(o.room_control_columns,4,1,6));
const roomRows = Math.max(1,Math.ceil(roles.length / roomColumns));
const roomIllustrated = o.room_mode === 'illustrated';
attr('data-dp-room-mode',roomIllustrated ? 'illustrated' : 'classic');
// Header measures free the second row for controls without enlarging the room tile.
// A main state or secondary still needs the regular content rows.
const roomHeaderMeasures = layout === 'room' && !roomIllustrated && o.room_measures_position === 'header' && !visibleState && !secondary;
const roomExtraHeight = Math.max(0,roomRows - (roomHeaderMeasures ? 2 : 1)) * 48;
// Keep an 8px visual gap below the header without shrinking the 44px action targets.
const roomControlPitch = roomHeaderMeasures ? 44 : 48;
const roomControlBottom = roomHeaderMeasures ? 4 : 8;
const roomDividerBottom = roomControlBottom + 47 + (roomRows - 1) * roomControlPitch;
// Opt-in presentation refinements leave existing room cards unchanged. Emit
// these outside the structural cache so removing an option restores defaults.
if (o.room_show_divider === false)
  css += 'ha-card[data-dp-layout="room"] .bubble-container::after { display: none; }';
if (roomIllustrated && o.room_state_centered === true && visibleState && !secondary) {
  const content = 'ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] .bubble-container:has(:is([class*="room-control-"],.room-climate):not(.hidden):not([hidden])) .bubble-content-container';
  css += `
    ${content} { bottom: ${roomControlBottom + 44 + (roomRows - 1) * roomControlPitch}px; grid-template-rows: auto minmax(0,1fr); row-gap: 0; }
    ${content+' .bubble-state'} { align-self: center; }
  `;
  // Keep the artwork centred in the original upper region: shortening the
  // content grid must not move it down into, or up out of, the card.
  css += content+'::after { top: calc(50% - 8px); }';
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
