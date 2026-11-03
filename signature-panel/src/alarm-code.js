// Opt-in: collect a code for the selected native alarm command, never a stored PIN.
const localPin = Array.isArray(c.modules) ? c.modules.includes('signature_pin') : c.modules === 'signature_pin';
const alarmCodeEnabled = o.alarm_code === true && !localPin && kind === 'button'
  && typeof c.entity === 'string' && c.entity.startsWith('alarm_control_panel.');
let alarmCode = runtime.alarmCode;
if (alarmCode && !alarmCodeEnabled) { alarmCode.dispose(); alarmCode = null; }
if (alarmCodeEnabled && !alarmCode) {
  const current = runtime, isCurrent = () => this._dpRuntime === current;
  const labels = {
    alarm_disarm: ['Désarmer l’alarme', 'Désarmer'],
    alarm_arm_away: ['Armer l’alarme', 'Armer'],
    alarm_arm_night: ['Activer le mode nuit', 'Activer'],
    alarm_arm_home: ['Armer en mode maison', 'Armer'],
    alarm_arm_vacation: ['Armer en mode vacances', 'Armer'],
    alarm_arm_custom_bypass: ['Armer en mode personnalisé', 'Armer']
  };
  const requestFor = (action, entity) => {
    if (!action || !['call-service', 'perform-action'].includes(action.action)) return null;
    const service = action.perform_action || action.service;
    if (typeof service !== 'string' || !service.startsWith('alarm_control_panel.')) return null;
    const method = service.slice('alarm_control_panel.'.length);
    if (!Object.hasOwn(labels, method)) return null;
    const data = {...(action.data ?? action.service_data ?? {})};
    const target = action.target || {};
    if (Object.keys(target).some(key => key !== 'entity_id')) return null;
    let id = target.entity_id ?? data.entity_id ?? entity;
    if (Array.isArray(id) && id.length === 1) id = id[0];
    if (id === 'entity') id = entity;
    if (id !== alarmCode.entity) return null;
    delete data.entity_id;
    delete data.code;
    return {method, data, entity: id};
  };
  const latestRequest = (node, gesture) => {
    const button = alarmCode.nodes.get(node)?.b;
    return button ? requestFor(button[gesture + '_action'], button.entity || alarmCode.entity) : null;
  };
  const available = (node, gesture, request) => {
    const state = alarmCode.hass.states[request.entity];
    return isCurrent() && alarmCode.enabled && root.isConnected
      && node.isConnected && state && !['unknown', 'unavailable'].includes(state.state)
      && !current.commandControls?.entries.get(node)?.disabled
      && JSON.stringify(latestRequest(node, gesture)) === JSON.stringify(request);
  };
  /* @include shared/src/code-keypad.js */
  let keypad;
  const dismiss = () => { keypad?.dismiss(); };
  const open = (node, gesture, request) => {
    if (alarmCode.dialog || !available(node, gesture, request)) return;
    keypad = createCodeKeypad({root, title: labels[request.method][0],
      label: 'Code de l’alarme', submitLabel: labels[request.method][1],
      numeric: alarmCode.hass.states[request.entity].attributes.code_format !== 'text',
      available: () => available(node, gesture, request),
      onSubmit: code => alarmCode.hass.callService('alarm_control_panel', request.method,
        {...request.data, code}, {entity_id: request.entity}).then(() => undefined),
      onDismiss: () => { alarmCode.dialog = null; }
    });
    alarmCode.dialog = keypad.dialog.isConnected ? keypad.dialog : null;
  };
  const intercept = event => {
    const gesture = event.detail?.action;
    if (!['tap', 'hold', 'double_tap'].includes(gesture)) return;
    const node = (event.composedPath?.() || [event.target]).find(item => alarmCode.nodes.has(item));
    if (!node) return;
    const config = event.detail.config, action = config?.[gesture + '_action'];
    const service = action?.perform_action || action?.service;
    if (!['call-service', 'perform-action'].includes(action?.action)
      || typeof service !== 'string' || !service.startsWith('alarm_control_panel.')) return;
    // The original Bubble/HA handler must never send the unprotected command.
    event.preventDefault(); event.stopImmediatePropagation();
    const request = requestFor(action, config.entity || alarmCode.entity);
    if (request) open(node, gesture, request);
  };
  root.addEventListener('hass-action', intercept, true);
  alarmCode = runtime.alarmCode = {enabled: true, dismiss, dispose() {
    dismiss(); root.removeEventListener('hass-action', intercept, true);
    if (current.alarmCode === this) delete current.alarmCode;
  }};
  if (!current.alarmCodeTeardown) {
    const dispose = current.dispose;
    current.dispose = () => {
      if (!isCurrent()) return;
      current.alarmCode?.dispose(); dispose();
    };
    current.alarmCodeTeardown = true;
  }
}
if (alarmCode) Object.assign(alarmCode, {enabled: alarmCodeEnabled, hass, entity: c.entity, nodes: commandNodes});
