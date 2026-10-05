// Enrol values in Bubble's existing delegated action handler: no new listeners.
const bindings = this._dpActions || (this._dpActions = {});
const bindAction = (key, el, data, value = true) => {
  let binding = bindings[key];
  if (binding && binding.el !== el) { restoreAction(binding); delete bindings[key]; binding = null; }
  if (!el) return;
  const signature = JSON.stringify(data);
  if (binding?.signature === signature) return;
  if (!binding) {
    const classes = ['bubble-action','bubble-action-enabled',...(value ? ['dp-value-action'] : [])];
    binding = bindings[key] = {el, data:Object.fromEntries(Object.keys(data).map(k => [k,el.dataset[k]])),
      classes:Object.fromEntries(classes.map(k => [k,el.classList.contains(k)]))};
    el.classList.add(...classes);
  }
  Object.entries(data).forEach(([k,v]) => { if (el.dataset[k] !== v) el.dataset[k] = v; });
  binding.signature = signature;
};
const info = id => ({entity:id,tapAction:'{"action":"more-info"}',holdAction:'{"action":"more-info"}',doubleTapAction:'{"action":"none"}'});
bindAction('state', c.entity ? stateEl : null, info(c.entity));
bindAction('secondary', secondary && secondaryEntity ? secondaryEl : null, info(secondaryEntity));
if (kind === 'climate') {
  for (const key of ['tempDisplay','lowTempDisplay','highTempDisplay']) bindAction(key,this.elements?.[key],info(c.entity));
}
// The main icon belongs to the tile. Explicit control sub-buttons stay native.
const navigation = c.tap_action ?? c.button_action?.tap_action;
bindAction('icon', navigation?.action === 'navigate' && navigation.navigation_path ? this.elements?.iconContainer : null,
  {tapAction:JSON.stringify(navigation)}, false);
const visibleState = !!stateEl && !stateEl.classList.contains('hidden') && show;
attr('data-dp-has-state',visibleState ? 'yes' : 'no');
const valueTrailing = compactValue && visibleState && flat.length > 0 && !numberEnabled;
attr('data-dp-value-trailing',valueTrailing ? 'yes' : 'no');
