/* @include signature-pin/src/hash.js */
/* @include signature-pin/src/targets.js */
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
  const required = (index = 0) => {
    const {users, scope, sub_buttons: buttons} = options();
    const targeted = scope !== 'sub_buttons' || (index > 0 &&
      (!Array.isArray(buttons) || !buttons.length || buttons.some(value => String(value) === String(index))));
    return enabled() && targeted && (!Array.isArray(users) || !users.length || !userId() || users.includes(userId()));
  };
  const signature = () => JSON.stringify([userId(), host.config]);
  const alive = () => host._signaturePinRuntime === runtime && !runtime.disposed && root.isConnected && host.isConnected;
  let keypad, pendingResolve, bypass = 0;
  const authorized = new WeakSet();
  const dismiss = () => { keypad?.dismiss(); };
  const ask = (execute, available = () => true, index = 0) => {
    if (!alive()) return Promise.resolve();
    if (!required(index) || bypass) return execute();
    // Never queue unrelated actions behind a visible PIN prompt.
    if (keypad?.dialog.isConnected) return Promise.resolve();
    const original = signature();
    return new Promise(resolve => {
      pendingResolve = resolve;
      keypad = createPinKeypad({root, title: 'Code requis', label: 'Code PIN',
        available: () => alive() && required(index) && signature() === original && available(),
        onSubmit: async code => {
          const configured = options();
          // Existing plaintext YAML stays usable until explicitly edited/migrated.
          const expected = configured.code_hash ?? (/^[0-9]+$/.test(String(configured.code ?? ''))
            ? hashPin(String(configured.code)) : '');
          if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/i.test(expected))
            return 'Configurez un code PIN dans les réglages du module.';
          if (hashPin(code) !== expected.toLowerCase()) return 'Code incorrect. Réessayez.';
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
    const path = event.composedPath();
    const index = path.map(pinButtonIndex).find(value => value > 0) || 0;
    if (authorized.has(event) || bypass || !required(index) || !alive()) return;
    if (event.type === 'hass-action') {
      const {action, config} = event.detail || {};
      if (!['tap','hold','double_tap'].includes(action) || !config) return;
      if (config[action + '_action']?.action === 'none') return;
    }
    // Native selects call HA directly. Capture their choice as well as actions;
    // root capture also sees non-bubbling selected events from ha-select.
    if (event.type === 'click' && (!index || event.target?.value === undefined ||
        !path.some(node => node.localName === 'ha-select'))) return;
    if (event.type === 'selected' && !index) return;
    // Capture on the host, before native handlers and presentation companions.
    event.preventDefault(); event.stopImmediatePropagation();
    const node = path[0];
    const detail = structuredClone(event.detail);
    ask(() => {
      const replay = new CustomEvent(event.type, {detail, bubbles: true, composed: true, cancelable: true});
      authorized.add(replay); node.dispatchEvent(replay);
    }, () => node.isConnected && !node.closest?.('[aria-disabled="true"]'), index);
  };
  // Native controls (cover/media buttons, selects, climate and sliders) call
  // context._hass directly, without hass-action. Wrap only THIS card's handle;
  // never mutate the shared hass object or other cards/automations.
  const guardedService = (...args) => ask(() => rawHass.callService(...args));
  // Sub-sliders have their own context and may fire a service after the pointer
  // event. Give each one its own scope, even when two sliders share an entity.
  const subHandles = new WeakMap();
  const subHass = node => {
    if (options().scope !== 'sub_buttons') return getHass();
    if (!subHandles.has(node)) {
      const callService = (...args) => ask(() => rawHass.callService(...args),
        () => !!node.sliderContext?.elements?.mainContainer?.isConnected, pinButtonIndex(node));
      subHandles.set(node, new Proxy({}, {get: (_, key) => key === 'callService' ? callService : Reflect.get(rawHass, key)}));
    }
    return subHandles.get(node);
  };
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
    if (previous !== userId()) {
      dismiss();
      // Bubble may defer its next render. Do not let that render dismiss a
      // fresh request already opened under the new identity in the meantime.
      runtime.configSignature = runtime.signature();
    }
  };
  runtime = host._signaturePinRuntime = {root, version, required, signature, dismiss, subHass,
    get dialog() { return keypad?.dialog; }, disposed: false,
    dispose() {
      if (this.disposed) return;
      this.disposed = true; dismiss();
      host.removeEventListener('hass-action', intercept, true);
      host.removeEventListener('hass-more-info', intercept, true);
      root.removeEventListener('selected', intercept, true);
      root.removeEventListener('click', intercept, true);
      for (const node of controls()) if (node?.sliderContext) node.sliderContext._hass = rawHass;
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
  root.addEventListener('selected', intercept, true);
  root.addEventListener('click', intercept, true);
}
if (runtime.configSignature !== runtime.signature()) {
  runtime.dismiss(); runtime.configSignature = runtime.signature();
}
// Persistent native sub-sliders can keep a detached button host. Bubble stores
// both those hosts and grouped hosts in elements, not necessarily in the DOM.
function controls() { return [...Object.values(host.elements || {}),
  ...Object.values(host.elements?.groups || {}).flatMap(group => Object.values(group.buttons || {}))];
}
controls().forEach(node => { if (node?.sliderContext) node.sliderContext._hass = runtime.subHass(node); });
if (typeof onTeardown === 'function') onTeardown(() => runtime.dispose());
return `
  /* @include signature-pin/src/keypad.css */
`;
