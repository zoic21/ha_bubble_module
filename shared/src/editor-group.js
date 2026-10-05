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
