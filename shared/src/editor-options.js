/* @include shared/src/editor-base.js */
registerOptionsForm('ha-form-signature_module_options',{
  _setup() {
    this._errorEl = document.createElement('ha-alert');
    this._errorEl.setAttribute('alert-type','error');
    this._errorEl.hidden = true;
    this.shadowRoot.append(this._errorEl);
  },
  _valueChanged(event) {
    event.stopPropagation();
    this._emit(this._clean(event.detail.value || {}));
  },
  _renderSpecial() {
    this._form.hidden = !!this.schema.mapping;
    if (!this.schema.mapping) return false;
    this._updateMapping();
    return true;
  },
  _display() {
    if (this.schema.exclusion) return {mode:this.data === true ? 'all' : Array.isArray(this.data) ? 'rules' : 'none',rules:Array.isArray(this.data) ? this.data : []};
    if (this.schema.choice_list) return {mode:Array.isArray(this.data) ? 'custom' : 'auto',values:Array.isArray(this.data) ? this.data : []};
    const value = this.schema.source && typeof this.data === 'string' ? {entity:this.data} : this.data;
    const data = value && typeof value === 'object' && !Array.isArray(value) ? {...value} : {};
    for (const [key,field] of Object.entries(this.schema.fields)) {
      if (field.boolean_choice) data[key] = typeof data[key] === 'boolean' ? String(data[key]) : data[key] ?? 'auto';
      if (field.number_choice && data[key] !== undefined) data[key] = String(data[key]);
      if (field.selector?.boolean && data[key] === undefined && field.default !== undefined) data[key] = field.default;
    }
    return data;
  },
  _clean(value) {
    if (this.schema.exclusion) return value.mode === 'all' ? true : value.mode === 'rules' ? value.rules || [] : undefined;
    if (this.schema.choice_list) return value.mode === 'custom' ? value.values || [] : undefined;
    const clean = {...value};
    for (const [key,field] of Object.entries(this.schema.fields)) {
      if (field.boolean_choice) {
        if (clean[key] === 'auto' || clean[key] === '' || clean[key] == null) delete clean[key];
        else if (clean[key] === 'true' || clean[key] === 'false') clean[key] = clean[key] === 'true';
      }
      if (field.auto_choice && (clean[key] === 'auto' || clean[key] === '' || clean[key] == null)) delete clean[key];
      if (field.number_choice && (clean[key] === '' || clean[key] == null)) delete clean[key];
      if (field.number_choice && clean[key] !== undefined) {
        clean[key] = String(this.data?.[key]) === clean[key] ? this.data[key] : Number(clean[key]);
      }
      if (field.selector?.boolean && this.data?.[key] === undefined && clean[key] === field.default) delete clean[key];
      if (clean[key] === undefined) delete clean[key];
    }
    if (this.schema.source) {
      if (!clean.entity) delete clean.entity;
      if (!Object.keys(clean).length) return undefined;
      if (typeof this.data === 'string' && Object.keys(clean).every(key => key === 'entity')) return clean.entity;
    }
    if (this.schema.empty_undefined && !Object.keys(clean).length) return undefined;
    return clean;
  },
  _expand(entries,fields) {
    const groupType = customElements.get('ha-form-signature_group') ? 'signature_group' : 'bc_group';
    return entries.map(field => {
      if (field.schema) return {...field,type:field.type === 'bc_group' ? groupType : field.type,schema:this._expand(field.schema,fields)};
      const spec = fields[field.name];
      if (!spec?.fields) return field;
      const {selector,...native} = field;
      return {...native,type:'signature_module_options',...spec,show_label:false};
    });
  },
  _updateMapping() {
    if (!this._list) {
      this._list = document.createElement('ha-selector-bc_object');
      const generate = this._list._generateSchema.bind(this._list);
      this._list._generateSchema = (fields,data,index) => this._expand(generate(fields,data,index),fields);
      this._list.addEventListener('value-changed',event => {
        event.stopPropagation();
        this._rows = event.detail.value || [];
        this._list.value = this._rows;
        const value = {},ids = new Set();
        let invalid = false;
        for (const row of this._rows) {
          if (!row.id) continue;
          if (ids.has(row.id) || (this.schema.mapping === 'entities' && !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(row.id))) { invalid = true;break; }
          ids.add(row.id);
          Object.defineProperty(value,row.id,{value:row.value ?? {},enumerable:true,configurable:true,writable:true});
        }
        this._errorEl.hidden = !invalid;
        this._errorEl.textContent = invalid ? 'Chaque entrée doit avoir un identifiant valide et unique.' : '';
        if (invalid) return;
        const changed = JSON.stringify(value) !== JSON.stringify(this._mappingData || {});
        if (changed) { this._mappingData = value;this._emit(value); }
      });
      this.shadowRoot.append(this._list);
    }
    if (this._mappingData !== this.data) {
      this._mappingData = this.data;
      this._rows = Object.entries(this.data || {}).map(([id,value]) => ({id,value}));
      this._errorEl.hidden = true;
    }
    const fields = {id:this.schema.key_field,value:{label:'Réglages',fields:this.schema.fields}};
    Object.assign(this._list,{hass:this.hass,disabled:this.disabled,value:this._rows,
      selector:{bc_object:{multiple:true,label_field:'id',fields}},localizeValue:this.localizeValue});
  },
});
