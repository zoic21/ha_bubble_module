/* @include signature-pin/src/editor.js */
const host = this, root = this.card, version = '@@MODULE_VERSION@@';
if (!root) return '';
const options = () => host.config?.signature_pin || {};
const enabled = () => options().enabled !== false && (Array.isArray(host.config?.modules)
  ? host.config.modules.includes('signature_pin') : host.config?.modules === 'signature_pin');
let runtime = host._signaturePinRuntime;
if (runtime && (runtime.root !== root || runtime.version !== version || !enabled())) {
  runtime.dispose(); runtime = null;
}
if (!enabled()) return '';
if (!runtime) {
  /* @include signature-pin/src/keypad.js */
  let rawHass = host._hass || hass, proxy, rawProxySource;
  const descriptor = Object.getOwnPropertyDescriptor(host, '_hass');
  const userId = () => rawHass?.user?.id;
  const required = () => {
    const users = options().users;
    return enabled() && (!Array.isArray(users) || !users.length || !userId() || users.includes(userId()));
  };
  const signature = () => JSON.stringify([userId(), host.config]);
  const alive = () => host._signaturePinRuntime === runtime && !runtime.disposed && root.isConnected && host.isConnected;
  let keypad, pendingResolve, bypass = 0;
  const authorized = new WeakSet();
  const dismiss = () => { keypad?.dismiss(); };
  const ask = (execute, available = () => true) => {
    if (!alive()) return Promise.resolve();
    if (!required() || bypass) return execute();
    // Never queue unrelated actions behind a visible PIN prompt.
    if (keypad?.dialog.isConnected) return Promise.resolve();
    const original = signature();
    return new Promise(resolve => {
      pendingResolve = resolve;
      keypad = createPinKeypad({root, title: 'Code requis', label: 'Code PIN',
        available: () => alive() && required() && signature() === original && available(),
        onSubmit: async code => {
          const expected = String(options().code ?? '');
          if (!/^[0-9]+$/.test(expected)) return 'Configurez un code PIN numérique dans les réglages du module.';
          if (code !== expected) return 'Code incorrect. Réessayez.';
          // Only the selected action is authorized, never the card/session.
          bypass++;
          try { resolve(await execute()); }
          finally { bypass--; }
        },
        onDismiss: () => { keypad = null; pendingResolve?.(); pendingResolve = null; }
      });
    });
  };
  const intercept = event => {
    if (authorized.has(event) || bypass || !required() || !alive()) return;
    if (event.type === 'hass-action') {
      const {action, config} = event.detail || {};
      if (!['tap','hold','double_tap'].includes(action) || !config) return;
      if (config[action + '_action']?.action === 'none') return;
    }
    // Capture on the host, before native handlers and presentation companions.
    event.preventDefault(); event.stopImmediatePropagation();
    const node = event.composedPath()[0];
    const detail = structuredClone(event.detail);
    ask(() => {
      const replay = new CustomEvent(event.type, {detail, bubbles: true, composed: true, cancelable: true});
      authorized.add(replay); node.dispatchEvent(replay);
    }, () => node.isConnected && !node.closest?.('[aria-disabled="true"]'));
  };
  // Native controls (cover/media buttons, selects, climate and sliders) call
  // context._hass directly, without hass-action. Wrap only THIS card's handle;
  // never mutate the shared hass object or other cards/automations.
  const guardedService = (...args) => ask(() => rawHass.callService(...args));
  const getHass = () => {
    if (rawProxySource !== rawHass) {
      rawProxySource = rawHass;
      proxy = new Proxy(rawHass, {get(target, key, receiver) {
        if (key !== 'callService') return Reflect.get(target, key, receiver);
        return guardedService;
      }});
    }
    return proxy;
  };
  const setHass = value => {
    const previous = userId(); rawHass = value;
    if (previous !== userId()) dismiss();
  };
  runtime = host._signaturePinRuntime = {root, version, required, signature, dismiss,
    get dialog() { return keypad?.dialog; }, disposed: false,
    dispose() {
      if (this.disposed) return;
      this.disposed = true; dismiss();
      host.removeEventListener('hass-action', intercept, true);
      host.removeEventListener('hass-more-info', intercept, true);
      if (Object.getOwnPropertyDescriptor(host, '_hass')?.get === getHass) {
        if (descriptor) Object.defineProperty(host, '_hass', {...descriptor, value: rawHass});
        else { delete host._hass; host._hass = rawHass; }
      }
      if (host._signaturePinRuntime === this) delete host._signaturePinRuntime;
    }
  };
  Object.defineProperty(host, '_hass', {configurable: true, enumerable: descriptor?.enumerable ?? true, get: getHass, set: setHass});
  host.addEventListener('hass-action', intercept, true);
  host.addEventListener('hass-more-info', intercept, true);
}
if (runtime.configSignature !== runtime.signature()) {
  runtime.dismiss(); runtime.configSignature = runtime.signature();
}
// Persistent native sub-sliders can keep a detached button host. Bubble stores
// both those hosts and grouped hosts in elements, not necessarily in the DOM.
const controls = [...Object.values(host.elements || {}),
  ...Object.values(host.elements?.groups || {}).flatMap(group => Object.values(group.buttons || {}))];
controls.forEach(node => { if (node?.sliderContext) node.sliderContext._hass = host._hass; });
if (typeof onTeardown === 'function') onTeardown(() => runtime.dispose());
return `
  /* @include signature-pin/src/keypad.css */
`;
