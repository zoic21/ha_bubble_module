// A native title and its badges share intrinsic flex layout. Move the existing
// nodes, retaining Bubble handlers, and restore them when the option is removed.
if (!runtime.roomBadgeTeardown) {
  const current = runtime, dispose = current.dispose;
  current.dispose = () => { current.roomBadges?.dispose(); dispose(); };
  current.roomBadgeTeardown = true;
}
if (!structure.roomBadgeStyles) {
  const seen = new Set();
  structure.roomBadgeStyles = styles.filter(({b,spec}) => spec.type === 'badge' && flat.includes(b)
    && (!b.sub_button_type || b.sub_button_type === 'default')
    && b.show_icon !== false && b.show_name !== true && b.show_state !== true
    && !b.state_content && !b.attribute && !b.show_last_changed && !b.show_last_updated
    && !roleSet.has(b) && !['room-temperature','room-humidity'].includes(b.css_class)
    && !seen.has(b) && seen.add(b))
    .sort((a,b) => flat.indexOf(a.b)-flat.indexOf(b.b));
}
const badgeNodes = roomIllustrated ? structure.roomBadgeStyles.flatMap(({cls}) =>
  [...root.querySelectorAll('.bubble-sub-button.'+cls)]) : [];
const badgeName = root.querySelector('.bubble-name');
let badgeFrame = runtime.roomBadges;
if (badgeFrame && (!badgeNodes.length || badgeFrame.name !== badgeName
    || badgeName?.parentNode !== badgeFrame.heading || !root.contains(badgeFrame.heading))) {
  badgeFrame.dispose();
  badgeFrame = null;
}
if (badgeNodes.length && badgeName?.parentNode) {
  if (!badgeFrame) {
    const heading = document.createElement('div'), group = document.createElement('div');
    heading.className = 'dp-room-heading'; group.className = 'dp-room-badges';
    const nameHome = {node:badgeName,parent:badgeName.parentNode,next:badgeName.nextSibling};
    nameHome.parent.insertBefore(heading,badgeName);
    heading.append(badgeName,group);
    const bindings = new Map();
    const restore = (binding,owner) => {
      const {node,parent,next} = binding;
      if (node.parentNode !== owner || !root.contains(parent)) return;
      parent.insertBefore(node,next?.parentNode === parent ? next : null);
      // Bubble hides empty native groups while their buttons are in the title.
      // Reconcile that native all-hidden flag when restoring the actual nodes.
      if (parent.classList.contains('bubble-sub-button-group')) {
        const hidden = el => el.classList.contains('hidden') || el.hidden || el.style.display === 'none';
        const buttons = [...parent.querySelectorAll('.bubble-sub-button')];
        const slider = [...parent.querySelectorAll('.bubble-sub-slider-wrapper.inline')].some(el => !hidden(el));
        parent.classList.toggle('hidden',!slider && buttons.every(hidden));
      }
    };
    badgeFrame = runtime.roomBadges = {name:badgeName,heading,group,bindings,restore,dispose() {
      [...bindings.values()].reverse().forEach(binding => restore(binding,group));
      bindings.clear(); restore(nameHome,heading); heading.remove();
      if (runtime.roomBadges === this) delete runtime.roomBadges;
    }};
  }
  const desired = new Set(badgeNodes);
  for (const [node,binding] of badgeFrame.bindings) if (!desired.has(node)) {
    badgeFrame.restore(binding,badgeFrame.group); badgeFrame.bindings.delete(node);
  }
  // A native update may put a button back in its group: adopt its current home.
  badgeNodes.forEach(node => {
    if (node.parentNode !== badgeFrame.group) {
      badgeFrame.bindings.set(node,{node,parent:node.parentNode,next:node.nextSibling});
      badgeFrame.group.append(node);
    }
  });
  // Preserve native config order even when the list is reconfigured in place.
  badgeNodes.forEach((node,i) => {
    if (badgeFrame.group.children[i] !== node)
      badgeFrame.group.insertBefore(node,badgeFrame.group.children[i] || null);
  });
  if (!structure.roomBadgeCSS) {
    const scope = 'ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"]';
    const active = scope+':has(.dp-room-badges .bubble-sub-button:not(.hidden):not([hidden]))';
    const all = scope+' .dp-room-badges .bubble-sub-button';
    structure.roomBadgeCSS = `
      ${scope} { --dp-room-badge-art: 0px; }
      ${scope}[data-dp-illustration="yes"] {
        --dp-room-badge-art: min(var(--signature-illustration-size,80px),max(0px,100cqw - 112px));
      }
      ${scope+' .dp-room-heading'} {
        grid-area: 1 / 1; align-self: start; display: flex; align-items: center;
        gap: 6px; min-width: 0; max-width: calc(100% - var(--dp-room-badge-art) - 8px);
        pointer-events: none;
      }
      ${scope+' .dp-room-heading .bubble-name'} {
        flex: 0 1 auto; min-width: 0; max-width: none; padding-right: 0 !important;
        align-self: center;
      }
      ${scope+' .dp-room-badges'} { display: flex; align-items: center; gap: 4px; flex: none; }
      ${scope+' .dp-room-badges:not(:has(.bubble-sub-button:not(.hidden):not([hidden])))'} { display: none; }
      ${all} {
        position: relative !important; top: auto; right: auto; left: auto; bottom: auto;
        width: 20px; min-width: 0 !important; height: 20px; flex: 0 0 20px;
        padding: 0 !important; margin: 0 !important; transform: none !important;
        border-radius: 50%; box-sizing: border-box; z-index: 2; pointer-events: auto;
        color: var(--dp-accent);
        background: color-mix(in srgb,currentColor 16%,${neutralSurface});
        box-shadow: none; --mdc-icon-size: 14px;
      }
      ${all+' .bubble-sub-button-icon'} { color: inherit; --mdc-icon-size: 14px; }
      @container (max-width: 239px) {
        ${active+' .dp-room-heading'} { max-width: 100%; }
        ${active}[data-dp-illustration="yes"] .bubble-content-container::after {
          width: min(48px,var(--signature-illustration-size,80px),max(0px,100cqw - 112px));
          top: calc(100% - var(--dp-room-badge-divider) - 12px);
        }
        ${active}[data-dp-illustration="yes"][data-dp-secondary="yes"] .bubble-content-container::after { top: 38px; }
      }
    `;
  }
  css += 'ha-card[data-dp-room-mode="illustrated"] { --dp-room-badge-divider: '
    + roomDividerBottom+'px; }'+structure.roomBadgeCSS;
}
