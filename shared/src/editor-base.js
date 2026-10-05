// Shared native form lifecycle; module hooks own schema/data conversion.
const registerOptionsForm = (name,hooks = {}) => {
  if (typeof customElements === 'undefined' || customElements.get(name)) return;
  class OptionsForm extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({mode:'open'});
      const style = document.createElement('style');
      style.textContent = ':host{display:block}label{display:block;font-weight:500;margin-bottom:8px}[hidden]{display:none!important}';
      this._labelEl = document.createElement('label');
      this._form = document.createElement('ha-form');
      shadow.append(style,this._labelEl,this._form);
      this._setup();
      this._form.addEventListener('value-changed',event => {
        event.stopPropagation();
        this._engine?._itemChanged(event,0);
      });
    }
    _setup() {}
    connectedCallback() { this._scheduleUpdate(); }
    _scheduleUpdate() {
      if (this._pending) return;
      this._pending = true;
      queueMicrotask(() => {
        this._pending = false;
        if (this.isConnected) this._updateForm();
      });
    }
    _emit(value) {
      this.dispatchEvent(new CustomEvent('value-changed',{detail:{value},bubbles:true,composed:true}));
    }
    _valueChanged(event) {
      this.dispatchEvent(new CustomEvent('value-changed',{detail:event.detail,bubbles:true,composed:true}));
    }
    _display() { return this.data || {}; }
    _formData(data) { return data; }
    _showLabel() { return this.schema.show_label !== false && !!this.label; }
    _renderSpecial() { return false; }
    _expand(entries) {
      const groupType = customElements.get('ha-form-signature_group') ? 'signature_group' : 'bc_group';
      return entries.map(field => field.schema
        ? {...field,type:field.type === 'bc_group' ? groupType : field.type,schema:this._expand(field.schema)}
        : field);
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
      this._labelEl.textContent = this.label || '';
      this._labelEl.hidden = !this._showLabel();
      if (this._renderSpecial()) return;
      if (!this._engine) {
        this._engine = document.createElement('ha-selector-bc_object');
        this._engine.getRootNode = () => this.getRootNode();
        this._engine.addEventListener('value-changed',event => this._valueChanged(event));
      }
      const engine = this._engine;
      Object.assign(engine,{hass:this.hass,value:this._display(),
        selector:{bc_object:{fields:this.schema.fields}},localizeValue:this.localizeValue});
      const data = this._formData(engine._itemFormData(engine.value,0));
      Object.assign(this._form,{hass:this.hass,data,
        schema:this._expand(engine._generateSchema(this.schema.fields,data,0),this.schema.fields,data),
        warning:engine._warnTop?.[0] || {},computeWarning:warning => warning,
        disabled:this.disabled,computeLabel:schema => engine._computeLabel(schema,0),
        computeHelper:schema => engine._computeHelper(schema,0),localizeValue:this.localizeValue});
    }
  }
  Object.assign(OptionsForm.prototype,hooks);
  for (const key of ['hass','data','schema','disabled','label','localizeValue']) {
    Object.defineProperty(OptionsForm.prototype,key,{
      get() { return this['_'+key]; },
      set(value) { this['_'+key] = value;this._scheduleUpdate(); }
    });
  }
  customElements.define(name,OptionsForm);
};
