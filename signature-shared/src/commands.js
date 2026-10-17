const commandNodes = new Map();
commandStyles.forEach(style => root.querySelectorAll('.bubble-sub-button.'+style.cls)
  .forEach(node => commandNodes.set(node,style)));
let commands = runtime.commandControls;
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
  commands = runtime.commandControls = {entries,restore,dispose() {
    events.forEach(name => root.removeEventListener(name,guard,true));
    entries.forEach((entry,node) => restore(node,entry)); entries.clear();
    if (runtime.commandControls === this) delete runtime.commandControls;
  }};
  if (!runtime.commandControlsTeardown) {
    const current = runtime, dispose = current.dispose;
    current.dispose = () => {
      if (this._dpRuntime !== current) return;
      current.commandControls?.dispose(); dispose();
    };
    current.commandControlsTeardown = true;
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
