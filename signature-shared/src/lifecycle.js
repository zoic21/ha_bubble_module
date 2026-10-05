let runtime = this._dpRuntime;
if (runtime && (runtime.root !== root || !tileEnabled)) {
  runtime.dispose();
  runtime = null;
}
if (tileEnabled && !runtime) {
  const iconOverrides = new Map();
  const restoreIcon = (icon, {original,applied}) => {
    if (icon.getAttribute('icon') !== applied || original === applied) return;
    if (original === null) icon.removeAttribute('icon');
    else icon.setAttribute('icon',original);
  };
  const restoreAction = binding => {
    if (!binding) return;
    const {el, data, classes} = binding;
    Object.entries(data).forEach(([key,value]) => {
      if (value === undefined) delete el.dataset[key]; else el.dataset[key] = value;
    });
    Object.entries(classes).forEach(([key,present]) => {
      if (!present) el.classList.remove(key);
    });
  };
  runtime = this._dpRuntime = {root,iconOverrides,restoreIcon,restoreAction};
  const current = runtime;
  current.dispose = () => {
    if (this._dpRuntime !== current) return;
    iconOverrides.forEach((value,icon) => restoreIcon(icon,value));
    iconOverrides.clear();
    this._dpNumber?.dispose();
    delete this._dpNumber;
    Object.values(this._dpActions || {}).forEach(restoreAction);
    delete this._dpActions;
    this._dpValueWatch?.observer.disconnect();
    delete this._dpValueWatch;
    this._dpRoomTemperatureWatch?.observer.disconnect();
    this._dpRoomTemperatureWatch?.restore();
    delete this._dpRoomTemperatureWatch;
    current.secondaryEl?.remove();
    for (const attr of [...root.attributes]) if (attr.name.startsWith('data-dp-')) root.removeAttribute(attr.name);
    if (current.stateEl) delete current.stateEl.dataset.dpSignature;
    delete this._dpStructure;
    delete this._dpRuntime;
  };
}
// Bubble keeps one teardown callback per module. Register before every early return.
if (typeof onTeardown === 'function') onTeardown(() => this._dpRuntime?.dispose());
