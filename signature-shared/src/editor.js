// Signature editor bridge: native fields without an object item panel.
if (typeof customElements !== 'undefined' && !customElements.get('ha-form-signature_options')) {
  class SignatureOptionsForm extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({mode:'open'});
      const style = document.createElement('style');
      style.textContent = ':host{display:block}label{display:block;font-weight:500;margin-bottom:8px}';
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
      const Group = customElements.get('ha-form-bc_group');
      if (Group && !customElements.get('ha-form-signature_group')) {
        customElements.define('ha-form-signature_group',class extends Group {
          createRenderRoot() {
            const root = super.createRenderRoot();
            const style = document.createElement('style');
            style.textContent = ':host ha-expansion-panel{--ha-card-border-radius:inherit;border-radius:var(--ha-card-border-radius,var(--ha-border-radius-lg))}';
            root.append(style);
            return root;
          }
        });
      }
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
      const groups = entries => entries.map(field => field.schema
        ? {...field,type:field.type === 'bc_group' ? groupType : field.type,schema:groups(field.schema)}
        : field);
      this._labelEl.textContent = this.label || '';
      Object.assign(this._form,{
        hass:this.hass,data,
        schema:groups(engine._generateSchema(this.schema.fields,data,0)),
        warning:engine._warnTop?.[0] || {},computeWarning:warning => warning,
        disabled:this.disabled,
        computeLabel:schema => engine._computeLabel(schema,0),
        computeHelper:schema => engine._computeHelper(schema,0),
        localizeValue:this.localizeValue
      });
    }
  }
  for (const key of ['hass','data','schema','disabled','label','localizeValue']) {
    Object.defineProperty(SignatureOptionsForm.prototype,key,{
      get() { return this['_'+key]; },
      set(value) { this['_'+key] = value;this._scheduleUpdate(); }
    });
  }
  customElements.define('ha-form-signature_options',SignatureOptionsForm);
}
// End Signature editor bridge.
