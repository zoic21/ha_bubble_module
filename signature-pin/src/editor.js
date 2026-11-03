/* @include shared/src/editor-base.js */
registerOptionsForm('ha-form-signature_pin_options', {
  _setup() {
    this._status = document.createElement('div');
    this._status.setAttribute('style', 'color:var(--secondary-text-color);font-size:13px;margin-top:8px');
    this.shadowRoot.append(this._status);
  },
  _display() { return {...this.data, enabled: this.data?.enabled ?? true}; },
  _valueChanged(event) {
    event.stopPropagation();
    const value = {...event.detail.value};
    if (value.code != null) value.code = String(value.code);
    if (this.data?.enabled === undefined && value.enabled === true) delete value.enabled;
    this._emit(value);
  },
  _formData(data) {
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
