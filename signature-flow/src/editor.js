// Signature Flow editor bridge: native fields without an object item panel.
if (typeof customElements !== 'undefined' && !customElements.get('ha-form-signature_flow_options')) {
  class SignatureFlowOptionsForm extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({mode:'open'});
      const style = document.createElement('style');
      style.textContent = ':host{display:block}label{display:block;font-weight:500;margin-bottom:8px}label[hidden]{display:none}';
      this._labelEl = document.createElement('label');
      this._form = document.createElement('ha-form');
      shadow.append(style,this._labelEl,this._form);
      this._form.addEventListener('value-changed',event => {
        event.stopPropagation();
        this._engine?._itemChanged(event,0);
      });
    }
    connectedCallback() { this._scheduleUpdate(); }
    _scheduleUpdate() {
      if (this._pending) return;
      this._pending = true;
      queueMicrotask(() => {
        this._pending = false;
        if (this.isConnected) this._updateForm();
      });
    }
    _updateForm() {
      if (!this.schema?.fields) return;
      if (!customElements.get('ha-selector-bc_object')) {
        if (!this._waiting) {
          this._waiting = true;
          customElements.whenDefined('ha-selector-bc_object').then(() => this._scheduleUpdate());
        }
        return;
      }
      /* @include shared/src/editor-group.js */
      const groupType = customElements.get('ha-form-signature_group') ? 'signature_group' : 'bc_group';
      if (!this._engine) {
        // Use Bubble's schema/default/event logic, without mounting its item UI.
        this._engine = document.createElement('ha-selector-bc_object');
        this._engine.getRootNode = () => this.getRootNode();
        this._engine.addEventListener('value-changed',event => {
          this.dispatchEvent(new CustomEvent('value-changed',{
            detail:event.detail,bubbles:true,composed:true
          }));
        });
      }
      const engine = this._engine;
      engine.hass = this.hass;
      engine.value = this.data || {};
      engine.selector = {bc_object:{fields:this.schema.fields}};
      engine.localizeValue = this.localizeValue;
      const data = engine._itemFormData(engine.value,0);
      for (const [key,field] of Object.entries(this.schema.fields)) {
        if (field.selector?.boolean && data[key] === undefined && field.default !== undefined)
          data[key] = field.default;
      }
      // Missing slots stay absent until explicitly enabled; existing slots default on.
      if (this.schema.slot) data.enabled = Boolean(this.data && this.data.enabled !== false);
      const expand = entries => entries.map(field => {
        if (field.schema) return {...field,type:field.type === 'bc_group' ? groupType : field.type,schema:expand(field.schema)};
        const meta = this.schema.fields[field.name];
        if (meta?.fields) {
          const {selector,...rest} = field;
          return {...rest,type:'signature_flow_options',fields:meta.fields,slot:meta.slot,show_label:false};
        }
        if (meta?.action_source) {
          const input = String(data[meta.action_source] ?? '').trim();
          const template = /\{[\{%#]/.test(input);
          const entity = !template && /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(input)
            || template && /(['"])([a-z_][a-z0-9_]*\.[a-z0-9_]+)\1|\bstates\.([a-z_][a-z0-9_]*\.[a-z0-9_]+)\b/.test(input);
          return {...field,selector:{ui_action:{...field.selector.ui_action,default_action:entity ? 'more-info' : 'none'}}};
        }
        return field;
      });
      this._labelEl.textContent = this.label || '';
      this._labelEl.hidden = this.schema.show_label === false || !this.label;
      Object.assign(this._form,{
        hass:this.hass,data,
        schema:expand(engine._generateSchema(this.schema.fields,data,0)),
        warning:engine._warnTop?.[0] || {},computeWarning:warning => warning,
        disabled:this.disabled,
        computeLabel:schema => engine._computeLabel(schema,0),
        computeHelper:schema => engine._computeHelper(schema,0),
        localizeValue:this.localizeValue
      });
    }
  }
  for (const key of ['hass','data','schema','disabled','label','localizeValue']) {
    Object.defineProperty(SignatureFlowOptionsForm.prototype,key,{
      get() { return this['_'+key]; },
      set(value) { this['_'+key] = value;this._scheduleUpdate(); }
    });
  }
  customElements.define('ha-form-signature_flow_options',SignatureFlowOptionsForm);
}

// End Signature Flow editor bridge.
