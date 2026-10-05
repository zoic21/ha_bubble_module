/* @include shared/src/editor-base.js */
/* @include shared/src/template-source.js */
registerOptionsForm('ha-form-signature_flow_options',{
  _formData(data) {
    for (const [key,field] of Object.entries(this.schema.fields)) {
      if (field.selector?.boolean && data[key] === undefined && field.default !== undefined)
        data[key] = field.default;
    }
    // Missing slots stay absent until explicitly enabled; existing slots default on.
    if (this.schema.slot) data.enabled = Boolean(this.data && this.data.enabled !== false);
    return data;
  },
  _expand(entries,fields,data) {
    const groupType = customElements.get('ha-form-signature_group') ? 'signature_group' : 'bc_group';
    return entries.map(field => {
      if (field.schema) return {...field,type:field.type === 'bc_group' ? groupType : field.type,schema:this._expand(field.schema,fields,data)};
      const meta = fields[field.name];
      if (meta?.fields) {
        const {selector,...rest} = field;
        return {...rest,type:'signature_flow_options',fields:meta.fields,slot:meta.slot,show_label:false};
      }
      if (meta?.action_source) {
        const source = sourceFor(data[meta.action_source]);
        const entity = !!(source.entity || source.main);
        return {...field,selector:{ui_action:{...field.selector.ui_action,default_action:entity ? 'more-info' : 'none'}}};
      }
      return field;
    });
  }
});
