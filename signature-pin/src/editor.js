/* @include shared/src/editor-base.js */
// A new tag avoids reusing the old plaintext editor after a live module update.
registerOptionsForm('ha-form-signature_pin_hash_options', {
  _setup() {
    this._status = document.createElement('div');
    this._status.setAttribute('style', 'color:var(--secondary-text-color);font-size:13px;margin-top:8px');
    this._pinStatus = document.createElement('div');
    this._pinStatus.setAttribute('style', 'color:var(--secondary-text-color);font-size:13px;margin:8px 0');
    this._saveCode = document.createElement('ha-button');
    this._saveCode.setAttribute('appearance', 'filled');
    this._saveCode.addEventListener('click', () => {
      if (this.disabled || this._saveCode.disabled) return;
      const pin = this._pinDraft || '';
      if (!/^[0-9]+$/.test(pin)) return;
      const value = {...this.data, code_hash: hashPin(pin)};
      delete value.code; delete value.new_code;
      this._pinDraft = '';
      this._emit(value); this._scheduleUpdate();
    });
    this.shadowRoot.append(this._pinStatus,this._saveCode,this._status);
  },
  _display() {
    const {code, code_hash, new_code, ...settings} = this.data || {};
    return {...settings, enabled: settings.enabled ?? true, new_code: this._pinDraft || ''};
  },
  _valueChanged(event) {
    event.stopPropagation();
    const settings = {...event.detail.value};
    this._pinDraft = String(settings.new_code ?? '');
    delete settings.new_code; delete settings.code; delete settings.code_hash;
    const value = {...this.data,...settings};
    if (this.data?.enabled === undefined && value.enabled === true) delete value.enabled;
    delete value.new_code;
    // Typing a draft never saves a PIN (or a hash of each partial prefix).
    if (JSON.stringify(value) !== JSON.stringify(this.data || {})) {
      if (value.code_hash == null && /^[0-9]+$/.test(String(value.code ?? '')))
        value.code_hash = hashPin(String(value.code));
      // No emitted configuration may contain the old plaintext key.
      delete value.code;
      this._emit(value);
    }
    this._updatePinStatus();
    this._scheduleUpdate();
  },
  _updatePinStatus() {
    const legacy = /^[0-9]+$/.test(String(this.data?.code ?? ''));
    const configured = !!this.data?.code_hash;
    const draft = this._pinDraft || '';
    this._pinStatus.textContent = draft && !/^[0-9]+$/.test(draft) ? 'Le code doit contenir uniquement des chiffres.'
      : configured || legacy ? 'Un code PIN est défini. Il ne peut pas être affiché ; vous pouvez le remplacer.' : 'Aucun code PIN défini.';
    this._saveCode.textContent = configured || legacy ? 'Remplacer le code' : 'Enregistrer le code';
    this._saveCode.disabled = !!this.disabled || !/^[0-9]+$/.test(draft);
  },
  _formData(data) {
    this._updatePinStatus();
    const key = this.hass?.connection;
    if (key && this._usersConnection !== key) {
      this._usersConnection = key;
      this._users = [];
      // Account enumeration is editor-only and admin-only. Limited users need
      // only hass.user.id to enforce the saved selection at runtime.
      if (this.hass.user?.is_admin) {
        this._status.textContent = 'Chargement des utilisateurs…';
        this.hass.callWS({type: 'config/auth/list'}).then(users => {
          if (this._usersConnection !== key) return;
          this._users = users.filter(user => !user.system_generated && user.is_active !== false)
            .map(user => ({value: user.id, label: user.name || user.id}));
          this._status.textContent = '';
          this._scheduleUpdate();
        }).catch(() => {
          if (this._usersConnection !== key) return;
          this._status.textContent = 'Liste indisponible : vous pouvez saisir les identifiants des utilisateurs.';
        });
      } else this._status.textContent = 'La liste complète des utilisateurs nécessite un compte administrateur.';
    }
    return data;
  },
  _expand(entries) {
    const options = new Map((this._users || []).map(user => [user.value, user]));
    const current = this.hass?.user;
    if (current?.id && !options.has(current.id)) options.set(current.id, {value: current.id, label: current.name || current.id});
    for (const id of this.data?.users || []) if (!options.has(id)) options.set(id, {value: id, label: id});
    return entries.map(field => field.name === 'users'
      ? {...field, selector: {select: {multiple: true, custom_value: true, options: [...options.values()]}}}
      : field);
  }
});
