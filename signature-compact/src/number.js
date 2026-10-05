// Numeric controls are opt-in; never replace native climate/cover controls.
const numberEnabled = o.controls === 'number' && layout === 'compact' && kind === 'button'
  && c.button_type === 'state' && ['number','input_number'].includes(domain);
const numberHost = numberEnabled ? root.querySelector('.bubble-wrapper') : null;
let nc = this._dpNumber;
if (nc && (!numberHost || nc.host !== numberHost || nc.id !== c.entity)) {
  nc.dispose();
  delete this._dpNumber;
  nc = null;
}
if (numberHost) {
  if (!nc) {
    const group = document.createElement('div');
    group.className = 'dp-number-control bubble-temperature-container';
    const makeButton = (className, icon) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = className;
      if (icon) {
        const i = document.createElement('ha-icon'); i.setAttribute('icon',icon); b.append(i);
      }
      group.append(b); return b;
    };
    const minus = makeButton('bubble-climate-minus-button','mdi:minus');
    const display = makeButton('bubble-climate-temp-display');
    const plus = makeButton('bubble-climate-plus-button','mdi:plus');
    // Prevent the surrounding card's actions from also handling a control gesture.
    for (const event of ['click','dblclick','pointerdown','pointerup','touchstart','touchend','keydown','keyup'])
      group.addEventListener(event, e => e.stopPropagation());
    nc = this._dpNumber = {id:c.entity,host:numberHost,group,minus,plus,display,hass,pending:null,timer:null,disposed:false};
    nc.read = () => {
      const state = nc.hass.states[nc.id];
      const a = state?.attributes || {};
      const validNumber = v => v != null && String(v).trim() !== '' && Number.isFinite(Number(v));
      return {value:Number(state?.state),min:Number(a.min),max:Number(a.max),step:Number(a.step),
        unit:a.unit_of_measurement || '',valid:[state?.state,a.min,a.max,a.step].every(validNumber)
          && Number(a.step) > 0 && Number(a.min) <= Number(a.max)};
    };
    nc.refresh = () => {
      if (nc.disposed) return;
      const v = nc.read();
      // Devices may round the requested target; a changed value is enough to resume.
      if (nc.pending !== null && (!v.valid || v.value !== nc.pending.before)) {
        nc.pending = null; clearTimeout(nc.timer); nc.timer = null;
      }
      const locale = localeFor(nc.hass);
      const numberFormat = nc.hass.locale?.number_format;
      if (nc.locale !== locale || nc.numberFormat !== numberFormat || nc.localize !== nc.hass.localize) {
        nc.locale = locale;
        nc.numberFormat = numberFormat;
        nc.localize = nc.hass.localize;
        nc.formatter = formatterFor(nc.hass,{maximumFractionDigits:10});
        const french = locale.toLowerCase().split(/[-_]/)[0] === 'fr';
        const label = (key,fallback) => nc.hass.localize?.(key) || fallback;
        minus.setAttribute('aria-label',label('ui.card.counter.actions.decrement',french ? 'Diminuer' : 'Decrease'));
        display.setAttribute('aria-label',label('ui.dialogs.more_info_control.details',french ? 'Ouvrir les détails' : 'Show details'));
        plus.setAttribute('aria-label',label('ui.card.counter.actions.increment',french ? 'Augmenter' : 'Increase'));
      }
      display.textContent = (v.valid ? nc.formatter.format(v.value) : '—') + (v.unit ? ' '+v.unit : '');
      minus.disabled = !v.valid || nc.pending !== null || v.value <= v.min;
      plus.disabled = !v.valid || nc.pending !== null || v.value >= v.max;
      group.setAttribute('aria-busy',String(nc.pending !== null));
    };
    nc.dispose = () => { nc.disposed = true; clearTimeout(nc.timer); group.remove(); };
    display.addEventListener('click', () => group.dispatchEvent(new CustomEvent('hass-more-info',
      {detail:{entityId:nc.id},bubbles:true,composed:true})));
    const change = async direction => {
      const v = nc.read();
      if (nc.disposed || nc.pending !== null || !v.valid) return;
      const next = Math.min(v.max,Math.max(v.min,Number((v.value+direction*v.step).toFixed(10))));
      if (next === v.value) return;
      const request = {before:v.value,target:next};
      nc.pending = request;
      nc.refresh();
      // Wait for HA to acknowledge the state, avoiding repeated writes from a stale value.
      nc.timer = setTimeout(() => {
        if (nc.disposed || nc.pending !== request) return;
        nc.pending = null; nc.timer = null; nc.refresh();
      },5000);
      try {
        await nc.hass.callService(nc.id.split('.')[0],'set_value',{entity_id:nc.id,value:request.target});
      } catch (error) {
        // An old service rejection must not cancel a more recent request.
        if (nc.disposed || nc.pending !== request) return;
        clearTimeout(nc.timer); nc.timer = null; nc.pending = null; nc.refresh();
        if (!nc.disposed) {
          const message = nc.hass.localize?.('ui.notification_toast.action_failed',{service:nc.id.split('.')[0]+'.set_value'})
            || (localeFor(nc.hass).toLowerCase().split(/[-_]/)[0] === 'fr' ? 'Impossible de modifier la valeur.' : 'Failed to set the value.');
          group.dispatchEvent(new CustomEvent('hass-notification',
            {detail:{message:message+' '+(error?.message || error)},bubbles:true,composed:true}));
        }
      }
    };
    minus.addEventListener('click', () => change(-1));
    plus.addEventListener('click', () => change(1));
    numberHost.append(group);
  }
  nc.hass = hass;
  nc.refresh();
}
if (numberEnabled) attr('data-dp-controls','number');
