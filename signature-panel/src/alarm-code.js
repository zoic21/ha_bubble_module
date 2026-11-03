// Opt-in: collect a code for the selected native alarm command, never a stored PIN.
const alarmCodeEnabled = o.alarm_code === true && kind === 'button'
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
  const dismiss = () => {
    const dialog = alarmCode.dialog;
    if (!dialog) return;
    // Clear before removing, including cancel, option removal and teardown.
    dialog.querySelector('input').value = '';
    alarmCode.dialog = null;
    if (dialog.open) dialog.close();
    dialog.remove();
  };
  const open = (node, gesture, request) => {
    if (alarmCode.dialog || !available(node, gesture, request)) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'dp-alarm-code-dialog';
    dialog.setAttribute('aria-label', labels[request.method][0]);
    dialog.innerHTML = '<form><div class="dp-alarm-code-header"><button type="button" data-close aria-label="Annuler">×</button><h2></h2></div><div class="dp-alarm-code-field"><input type="password" placeholder="Code" aria-label="Code de l’alarme" autocomplete="off" required><button type="button" data-reveal aria-label="Afficher le code" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="dp-alarm-code-slash" d="m3 3 18 18"/></svg></button></div><p class="dp-alarm-code-error" role="alert" hidden></p><div class="dp-alarm-code-keypad">'
      + [1,2,3,4,5,6,7,8,9].map(digit => '<button type="button" data-digit="'+digit+'">'+digit+'</button>').join('')
      + '<button type="button" data-clear aria-label="Effacer le code">×</button><button type="button" data-digit="0">0</button><button type="submit" aria-label="Valider">✓</button></div></form>';
    const form = dialog.querySelector('form'), input = dialog.querySelector('input');
    const error = dialog.querySelector('.dp-alarm-code-error');
    const cancel = dialog.querySelector('[data-close]');
    const reveal = dialog.querySelector('[data-reveal]');
    const clear = dialog.querySelector('[data-clear]');
    const digits = [...dialog.querySelectorAll('[data-digit]')];
    const submit = dialog.querySelector('button[type="submit"]');
    dialog.querySelector('h2').textContent = labels[request.method][0];
    submit.setAttribute('aria-label', labels[request.method][1]);
    const numeric = alarmCode.hass.states[request.entity].attributes.code_format !== 'text';
    input.inputMode = numeric ? 'none' : 'text';
    input.readOnly = numeric;
    digits.forEach(button => { button.hidden = !numeric; });
    clear.hidden = !numeric;
    dialog.querySelector('.dp-alarm-code-keypad').classList.toggle('dp-alarm-code-text', !numeric);
    let pending = false, locked = false;
    const valid = () => numeric ? /^[0-9]+$/.test(input.value) : input.value.length > 0;
    const sync = () => {
      input.disabled = reveal.disabled = pending || locked;
      digits.forEach(button => { button.disabled = pending || locked; });
      clear.disabled = pending || locked || !input.value;
      submit.disabled = pending || locked || !valid();
    };
    const mask = () => {
      input.type = 'password'; reveal.setAttribute('aria-pressed', 'false');
      reveal.setAttribute('aria-label', 'Afficher le code');
    };
    const enter = digit => { if (!pending && !locked) { input.value += digit; sync(); input.focus(); } };
    digits.forEach(button => button.addEventListener('click', () => enter(button.dataset.digit)));
    clear.addEventListener('click', () => { input.value = ''; sync(); input.focus(); });
    input.addEventListener('input', sync);
    reveal.addEventListener('click', () => {
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      reveal.setAttribute('aria-pressed', String(visible));
      reveal.setAttribute('aria-label', visible ? 'Masquer le code' : 'Afficher le code');
      input.focus();
    });
    dialog.addEventListener('keydown', event => {
      if (!numeric || pending || locked || event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^[0-9]$/.test(event.key)) { event.preventDefault(); enter(event.key); }
      else if (['Backspace','Delete'].includes(event.key)) {
        event.preventDefault(); input.value = event.key === 'Delete' ? '' : input.value.slice(0,-1); sync();
      } else if (event.key === 'Enter') {
        event.preventDefault(); if (!submit.disabled) form.requestSubmit();
      }
    });
    sync();
    cancel.addEventListener('click', dismiss);
    dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
    dialog.addEventListener('close', () => { if (alarmCode.dialog === dialog) dismiss(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (pending || locked || alarmCode.dialog !== dialog || !valid() || !form.reportValidity()) return;
      if (!available(node, gesture, request)) {
        input.value = ''; error.textContent = 'Cette commande n’est plus disponible.';
        error.hidden = false; locked = true; sync(); return;
      }
      pending = true; error.hidden = true;
      const code = input.value;
      input.value = ''; mask(); sync();
      try {
        await alarmCode.hass.callService('alarm_control_panel', request.method,
          {...request.data, code}, {entity_id: request.entity});
        if (alarmCode.dialog === dialog) dismiss();
      } catch (_) {
        if (alarmCode.dialog !== dialog) return;
        // Do not expose backend data that could contain the supplied code.
        error.textContent = 'La commande a échoué. Vérifiez le code et réessayez.';
        error.hidden = false;
      } finally {
        pending = false;
        if (alarmCode.dialog === dialog) { sync(); input.focus(); }
      }
    });
    root.append(dialog); alarmCode.dialog = dialog;
    // Numeric input is readonly: the on-screen keypad avoids the OS keyboard.
    try { dialog.showModal(); input.focus(); }
    catch (_) { dismiss(); }
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
