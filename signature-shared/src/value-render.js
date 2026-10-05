const plainState = !explicitState || c.state_content === 'state' || (Array.isArray(c.state_content) && c.state_content.length === 1 && c.state_content[0] === 'state');
const simple = kind === 'button' && c.button_type === 'state' && plainState && !legacy && ['sensor','number','input_number','counter'].includes(domain) && !['timestamp','date'].includes(entityState?.attributes?.device_class);
let owned = false;
if (stateEl && show && (custom || simple)) {
  let value, unit = '', duration = null;
  if (custom) {
    value = render(o.state);
    // Keep calculated labels literal; split only quantities and the explicit h/min duration format.
    const parts = value.trim().match(/^([+\-−]?(?:\d+(?:[ .,'’]\d+)*|[.,]\d+)(?:[eE][+\-]?\d+)?)[^\S\r\n]*([\p{L}°%€$£][^\d\s]*)$/u);
    if (parts) { value = parts[1]; unit = parts[2]; }
    else duration = value.match(/^([^\S\r\n]*\d+)([^\S\r\n]+h)([^\S\r\n]+\d+)([^\S\r\n]+min[^\S\r\n]*)$/);
  } else {
    ({value,unit} = displayState(entityState,c.entity,'stateFormat'));
  }
  const signature = String(value) + '\u0001' + unit + (duration ? '\u0001duration' : '');
  if (stateEl.dataset.dpSignature !== signature || !stateEl.querySelector('.dp-value')) {
    const val = document.createElement('span'); val.className = 'dp-value'; val.textContent = value;
    if (duration) {
      const durationUnit = text => {
        const el = document.createElement('span'); el.className = 'dp-unit dp-duration-unit'; el.textContent = text;
        return el;
      };
      val.replaceChildren(document.createTextNode(duration[1]),durationUnit(duration[2]),
        document.createTextNode(duration[3]),durationUnit(duration[4]));
    }
    const u = document.createElement('span'); u.className = 'dp-unit'; u.textContent = unit;
    stateEl.replaceChildren(val,u); stateEl.dataset.dpSignature = signature;
  }
  if (stateEl.classList.contains('hidden')) stateEl.classList.remove('hidden');
  if (!stateEl.classList.contains('display-state')) stateEl.classList.add('display-state');
  owned = true;
}
if (stateEl && !owned) delete stateEl.dataset.dpSignature;
