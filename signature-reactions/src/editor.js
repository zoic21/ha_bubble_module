/* @include shared/src/editor-base.js */
registerOptionsForm('ha-form-signature_reactions_options_v1', {
  _setup() {
    this._status = document.createElement('div');
    this._status.setAttribute('style', 'color:var(--secondary-text-color);font-size:13px;margin-top:8px');
    this.shadowRoot.append(this._status);
  },
  _display() { return {...this.data,enabled:this.data?.enabled ?? true}; },
  _valueChanged(event) {
    event.stopPropagation();
    const value={...event.detail.value};
    if (this.data?.enabled === undefined && value.enabled === true) delete value.enabled;
    if (JSON.stringify(value)!==JSON.stringify(this.data || {})) this._emit(value);
  },
  _formData(data) {
    const connection = this.hass?.connection;
    if (connection && this._usersConnection !== connection) {
      this._usersConnection = connection;
      this._users = [];
      // Account enumeration is confined to the editor, never the runtime.
      if (this.hass.user?.is_admin) {
        this._status.textContent = 'Chargement des utilisateurs…';
        this.hass.callWS({type:'config/auth/list'}).then(users => {
          if (this._usersConnection !== connection) return;
          this._users = users.filter(user => !user.system_generated && user.is_active !== false)
            .map(user => ({value:user.id,label:user.name || user.id}));
          this._status.textContent = ''; this._scheduleUpdate();
        }).catch(() => {
          if (this._usersConnection === connection) this._status.textContent = 'Liste indisponible : saisir les identifiants HA.';
        });
      } else this._status.textContent = 'Les identifiants enregistrés restent utilisables sans droits administrateur.';
    }
    return data;
  },
  _expand(entries) {
    const users = new Map((this._users || []).map(user => [user.value,user]));
    const current = this.hass?.user;
    if (current?.id && !users.has(current.id)) users.set(current.id,{value:current.id,label:current.name || current.id});
    for (const id of this.data?.users || []) if (!users.has(id)) users.set(id,{value:id,label:id});
    return entries.map(field => field.name === 'users'
      ? {...field,selector:{select:{multiple:true,custom_value:true,options:[...users.values()]}}} : field);
  }
});
