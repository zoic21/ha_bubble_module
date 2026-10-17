// Opt-in native command controls. Keep Bubble's nodes, datasets and handlers.
// Its delegated gesture handler caches actions: guarding only data-tap-action
// would leave previously used commands executable after their state changes.
const commandStyles = roomIllustrated ? styles.filter(({b,spec}) => spec.type === 'command'
  && roleSet.has(b) && (!b.sub_button_type || b.sub_button_type === 'default')
  && b.show_name === true) : [];
const commandNodes = new Map();
commandStyles.forEach(style => root.querySelectorAll('.bubble-sub-button.'+style.cls)
  .forEach(node => commandNodes.set(node,style)));
let commands = runtime.roomCommands;
if (!commands && commandNodes.size) {
  const entries = new Map();
  const events = ['pointerdown','touchstart','click','keydown','hass-action'];
  const guard = event => {
    if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
    const path = event.composedPath?.() || [event.target];
    if (!path.some(node => entries.get(node)?.disabled)) return;
    // Block native gestures without preventing page scrolling from a disabled control.
    if (event.cancelable && !['pointerdown','touchstart'].includes(event.type)) event.preventDefault();
    event.stopImmediatePropagation();
  };
  const restore = (node,entry) => {
    Object.entries(entry.applied).forEach(([name,value]) => {
      if (node.getAttribute(name) !== value) return;
      const original = entry.original[name];
      if (original === null) node.removeAttribute(name); else node.setAttribute(name,original);
    });
  };
  events.forEach(name => root.addEventListener(name,guard,{capture:true,passive:false}));
  commands = runtime.roomCommands = {entries,restore,dispose() {
    events.forEach(name => root.removeEventListener(name,guard,true));
    entries.forEach((entry,node) => restore(node,entry)); entries.clear();
    if (runtime.roomCommands === this) delete runtime.roomCommands;
  }};
  if (!runtime.roomCommandsTeardown) {
    const current = runtime, dispose = current.dispose;
    current.dispose = () => {
      if (this._dpRuntime !== current) return;
      current.roomCommands?.dispose(); dispose();
    };
    current.roomCommandsTeardown = true;
  }
}
if (commands) {
  for (const [node,entry] of commands.entries) if (!commandNodes.has(node)) {
    commands.restore(node,entry); commands.entries.delete(node);
  }
  commandNodes.forEach(({b,spec},node) => {
    const active = render(spec.active,b.entity).trim().toLowerCase() === 'true';
    // Pending/invalid templates fail closed; only explicit false enables a
    // configured disabled expression. Absent disabled keeps the native action.
    const disabled = spec.disabled != null && render(spec.disabled,b.entity).trim().toLowerCase() !== 'false';
    let entry = commands.entries.get(node);
    const applied = {'data-dp-command':'yes','aria-disabled':String(disabled),'aria-pressed':String(active)};
    if (!entry) {
      entry = {original:Object.fromEntries(Object.keys(applied).map(name => [name,node.getAttribute(name)])),applied:{}};
      commands.entries.set(node,entry);
    }
    entry.disabled = disabled;
    Object.entries(applied).forEach(([name,value]) => {
      const current = node.getAttribute(name);
      if (name in entry.applied && current !== entry.applied[name]) entry.original[name] = current;
      if (current !== value) node.setAttribute(name,value);
    });
    entry.applied = applied;
    const fg = color(spec.color,accent,b.entity);
    const bg = color(spec.background,active ? 'color-mix(in srgb, '+fg+' 15%, '+neutralSurface+')'
      : 'var(--signature-control-background, color-mix(in srgb, var(--primary-text-color) 5%, '+neutralSurface+'))',b.entity);
    css += 'ha-card .'+commandNodes.get(node).cls+' { --dp-command-background:'+bg+'; --dp-command-foreground:'+(active ? fg : 'var(--primary-text-color)')+'; }';
  });
  if (!commandNodes.size) { commands.dispose(); commands = null; }
}
if (commandNodes.size) {
  const scope = 'ha-card[data-dp-layout="room"][data-dp-room-mode="illustrated"] :is([class*="room-control-"],.room-climate)[data-dp-command]';
  const named = scope+':has(.bubble-sub-button-name-container:not(:empty):not(.hidden):not([hidden]))';
  css += `
    ${named} {
      display: grid !important; grid-template-columns: minmax(0,1fr);
      grid-template-rows: 18px 16px; grid-template-areas: 'icon' 'label';
      gap: 2px; padding: 4px 2px !important;
      left: calc(11px + var(--room-control-column,var(--dp-room-column,0)) * (100% - 16px) / ${roomColumns});
      width: calc((100% - 16px) / ${roomColumns} - 6px);
      border-radius: var(--signature-control-border-radius,14px);
      background: var(--dp-command-background) !important;
      color: var(--dp-command-foreground);
    }
    ${named+' .bubble-sub-button-icon'} {
      justify-self: center; width: 18px !important; height: 18px !important; padding: 0 !important;
      --mdc-icon-size: 18px; border-radius: 0; background: transparent !important;
    }
    ${named+' .bubble-sub-button-name-container'} {
      justify-self: stretch; text-align: center; font-size: var(--signature-legend-font-size,11px);
      line-height: 16px; color: var(--dp-command-foreground); margin: 0 !important;
    }
    ${scope}[aria-disabled="true"] { cursor: default; }
    ${scope}[aria-disabled="true"][aria-pressed="false"] { opacity: .4; }
    ${scope}[aria-disabled="true"] > ha-ripple { display: none; }
    ${scope} > ha-ripple { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
  `;
}
if (o.room_state_as_value === true) css += `
  ha-card[data-dp-layout="room"] .bubble-state {
    font-size: var(--signature-value-font-size,28px); line-height: 1.15;
    font-weight: var(--signature-font-weight-medium,500); letter-spacing: -.7px;
    font-variant-numeric: tabular-nums;
  }
  ha-card[data-dp-layout="room"] .bubble-state:not(:has(.dp-unit:not(:empty))) {
    font-size: min(var(--signature-value-font-size,28px),22px); letter-spacing: -.4px;
  }
  ha-card[data-dp-layout="room"] .bubble-state .dp-unit {
    font-size: var(--signature-temperature-unit-font-size,13px);
  }
`;
