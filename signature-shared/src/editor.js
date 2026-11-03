/* @include shared/src/editor-guided.js */
registerOptionsForm('ha-form-signature_options_v2',{
  // Preserve the presentation editor's existing label spacing.
  _showLabel() { return true; },
  _display() { return guidedEditor.displayObject(this.data,this.schema); },
  _valueChanged(event) {
    event.stopPropagation();
    const value=guidedEditor.cleanObject(event.detail.value,this.data,this.schema);
    if(!guidedEditor.same(value,this.data||{}))this._emit(value);
  },
  _expand(entries,fields) { return guidedEditor.expand(this,entries,fields); }
});
