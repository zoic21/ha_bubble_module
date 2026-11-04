// Local numeric keypad owned exclusively by Signature PIN.
const createPinKeypad = ({root, title, label = 'Code', submitLabel = 'Valider',
  available = () => true, onSubmit, onDismiss = () => {}}) => {
  const dialog = document.createElement('dialog');
  dialog.className = 'signature-pin-dialog';
  dialog.setAttribute('aria-label', title);
  dialog.innerHTML = '<form><div class="signature-pin-header"><button type="button" data-close aria-label="Annuler">×</button><h2></h2></div><div class="signature-pin-field"><input type="password" placeholder="Code" autocomplete="off" required><button type="button" data-reveal aria-label="Afficher le code" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="signature-pin-slash" d="m3 3 18 18"/></svg></button></div><p class="signature-pin-error" role="alert" hidden></p><div class="signature-pin-keypad">'
    + [1,2,3,4,5,6,7,8,9].map(digit => '<button type="button" data-digit="'+digit+'">'+digit+'</button>').join('')
    + '<button type="button" data-clear aria-label="Effacer le code">×</button><button type="button" data-digit="0">0</button><button type="submit" aria-label="Valider">✓</button></div></form>';
  const form = dialog.querySelector('form'), input = dialog.querySelector('input');
  const error = dialog.querySelector('.signature-pin-error');
  const reveal = dialog.querySelector('[data-reveal]'), clear = dialog.querySelector('[data-clear]');
  const digits = [...dialog.querySelectorAll('[data-digit]')];
  const submit = dialog.querySelector('button[type="submit"]');
  dialog.querySelector('h2').textContent = title;
  input.setAttribute('aria-label', label);
  submit.setAttribute('aria-label', submitLabel);
  input.inputMode = 'none';
  input.readOnly = true;
  let pending = false, locked = false, closed = false;
  const valid = () => /^[0-9]+$/.test(input.value);
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
  const dismiss = () => {
    if (closed) return;
    closed = true; input.value = ''; mask();
    if (dialog.open) dialog.close();
    dialog.remove(); onDismiss();
  };
  const enter = digit => { if (!pending && !locked && !closed) { input.value += digit; sync(); input.focus(); } };
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
    if (pending || locked || event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[0-9]$/.test(event.key)) { event.preventDefault(); enter(event.key); }
    else if (['Backspace','Delete'].includes(event.key)) {
      event.preventDefault(); input.value = event.key === 'Delete' ? '' : input.value.slice(0,-1); sync();
    } else if (event.key === 'Enter') {
      event.preventDefault(); if (!submit.disabled) form.requestSubmit();
    }
  });
  dialog.querySelector('[data-close]').addEventListener('click', dismiss);
  // Backdrop events target the dialog too; its padding must stay interactive.
  const onBackdrop = event => {
    const {left, right, top, bottom} = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < left || event.clientX > right ||
      event.clientY < top || event.clientY > bottom);
  };
  let backdropPress = false;
  dialog.addEventListener('pointerdown', event => { backdropPress = onBackdrop(event); });
  dialog.addEventListener('pointercancel', () => { backdropPress = false; });
  dialog.addEventListener('click', event => {
    const dismissBackdrop = backdropPress && onBackdrop(event);
    backdropPress = false;
    // A gesture starting inside the keypad and ending outside is not a dismissal.
    if (!dismissBackdrop) return;
    event.preventDefault(); event.stopPropagation(); dismiss();
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('close', dismiss);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (closed || pending || locked || !valid() || !form.reportValidity()) return;
    if (!available()) {
      input.value = ''; error.textContent = 'Cette commande n’est plus disponible.';
      error.hidden = false; locked = true; sync(); return;
    }
    pending = true; error.hidden = true;
    const code = input.value;
    input.value = ''; mask(); sync();
    try {
      const message = await onSubmit(code);
      if (closed) return;
      if (message) { error.textContent = message; error.hidden = false; }
      else dismiss();
    } catch (_) {
      if (closed) return;
      error.textContent = 'La commande a échoué. Réessayez.';
      error.hidden = false;
    } finally {
      pending = false;
      if (!closed) { sync(); input.focus(); }
    }
  });
  sync(); root.append(dialog);
  // Readonly numeric input avoids the tablet OS keyboard.
  try { dialog.showModal(); input.focus(); }
  catch (_) { dismiss(); }
  return {dialog, dismiss};
};
