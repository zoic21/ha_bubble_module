const root = this.card, host = this.elements?.mainContainer || root?.querySelector('.bubble-container');
const options = this.config?.signature_energy_balance;
const version = '@@MODULE_VERSION@@';
const enabled = root && host && options && (this.config.card_type || 'button') === 'button'
  && this.config.button_type !== 'slider';
let runtime = this._signatureEnergyBalance;
if (runtime && (runtime.version !== version || runtime.root !== root || runtime.host !== host || !enabled)) {
  runtime.dispose(); runtime = null;
}
if (typeof onTeardown === 'function') onTeardown(() => this._signatureEnergyBalance?.dispose());
if (!enabled) return '';
/* @include shared/src/dom.js */
/* @include shared/src/number-format.js */
/* @include signature-energy-balance/src/balance.js */
const hidden = (node,value) => {if (node.hidden !== value) node.hidden = value;};
// CSSOM rounds numbers and normalizes colors; compare inputs, not serialized CSS.
const style = (node,key,value) => {
  let cache = runtime.styles.get(node);
  if (!cache) runtime.styles.set(node,cache = {});
  if (cache[key] !== value) {cache[key] = value; node.style.setProperty(key,value);}
};
if (!runtime) {
  const bar = create('div','seb-bar'), tooltip = create('div','seb-tooltip'), empty = create('span','seb-empty');
  attr(bar,'role','group'); attr(tooltip,'role','tooltip'); attr(tooltip,'id','seb-tooltip');
  text(empty,'—'); host.append(bar,tooltip,empty); root.setAttribute('data-signature-energy-balance','');
  runtime = this._signatureEnergyBalance = {version,root,host,bar,tooltip,empty,buttons:[],data:null,disposed:false,styles:new WeakMap()};
  const current = runtime;
  const hide = () => {hidden(tooltip,true); current.active = null;};
  current.show = index => {
    if (!current.data?.balance) return hide();
    current.active = index;
    text(tooltip,current.buttons[index].getAttribute('aria-label'));
    hidden(tooltip,false);
  };
  for (let i=0;i<3;i++) {
    const button = create('button','seb-segment'), label = create('span','seb-label');
    attr(button,'type','button'); attr(button,'aria-describedby','seb-tooltip'); button.append(label); bar.append(button);
    button.addEventListener('pointerenter',event => {if (event.pointerType !== 'touch') current.show(i);});
    button.addEventListener('pointerleave',event => {if (event.pointerType !== 'touch' && document.activeElement !== button) hide();});
    button.addEventListener('focus',() => current.show(i)); button.addEventListener('blur',hide);
    button.addEventListener('pointerdown',event => {event.stopPropagation(); current.show(i);});
    button.addEventListener('click',event => {event.preventDefault(); event.stopPropagation(); current.show(i);});
    for (const type of ['touchstart','touchend','pointerup','mousedown','mouseup','dblclick','contextmenu'])
      button.addEventListener(type,event => event.stopPropagation());
    current.buttons.push(button);
  }
  current.outside = event => {if (!event.composedPath().includes(host)) hide();};
  current.keydown = event => {if (event.key === 'Escape') hide();};
  document.addEventListener('pointerdown',current.outside); host.addEventListener('keydown',current.keydown);
  current.dispose = () => {
    if (current.disposed) return;
    current.disposed = true; current.data = null;
    document.removeEventListener('pointerdown',current.outside); host.removeEventListener('keydown',current.keydown);
    bar.remove(); tooltip.remove(); empty.remove(); root.removeAttribute('data-signature-energy-balance');
    if (this._signatureEnergyBalance === current) delete this._signatureEnergyBalance;
  };
  hide();
}
const sources = balanceSources(options);
for (const id of sources?.ids || []) hass.states[id];
const zone = options.time_zone || hass.config?.time_zone || 'UTC';
let windowStart;
try {
  if (runtime.zone !== zone) {
    runtime.zone = zone;
    runtime.dateFormat = new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    runtime.dayFor = stamp => runtime.dateFormat.formatToParts(stamp)
      .filter(part => ['year','month','day'].includes(part.type)).map(part => part.value).join('-');
  }
  const parts = time => Object.fromEntries(runtime.dateFormat.formatToParts(time)
    .filter(part => part.type !== 'literal').map(part => [part.type,Number(part.value)]));
  const now = parts(Date.now()), midnight = Date.UTC(now.year,now.month-1,now.day);
  windowStart = midnight;
  for (let i=0;i<3;i++) {
    const p = parts(windowStart);
    windowStart = midnight-(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-windowStart);
  }
} catch { windowStart = null; }
const key = JSON.stringify([sources,zone,windowStart]);
if (!runtime.data || runtime.data.key !== key || runtime.connection !== hass.connection)
  runtime.data = {key,balance:null,lastAttempt:null,pending:false};
runtime.connection = hass.connection;
const data = runtime.data;
data.paint = () => {
  const valueFormat = formatterFor(hass,{minimumFractionDigits:1,maximumFractionDigits:1});
  const shareFormat = formatterFor(hass,{minimumFractionDigits:1,maximumFractionDigits:1});
  const names = ['Réseau','Solaire','Batterie'], colors = ['#4F91C5','#D29A36','#246B50'];
  const segments = Array.isArray(options.segments) ? options.segments : [];
  attr(runtime.bar,'aria-label',options.name || 'Répartition de la consommation maison');
  hidden(runtime.empty,!!data.balance); hidden(runtime.bar,!data.balance);
  if (!data.balance) {hidden(runtime.tooltip,true); runtime.active = null; return;}
  data.balance.values.forEach((value,index) => {
    const button = runtime.buttons[index], share = 100*value/data.balance.total;
    hidden(button,value <= 0); style(button,'flex-grow',String(share));
    style(button,'--seb-color',String(segments[index]?.color || colors[index]));
    const name = String(segments[index]?.name || names[index]);
    attr(button,'aria-label',name+' : '+valueFormat.format(value)+' '+(options.unit || 'kWh')+' · '+shareFormat.format(share)+' %');
    text(button.firstElementChild,shareFormat.format(share)+' %');
  });
  if (runtime.active != null) runtime.show(runtime.active);
};
data.paint();
if (!sources || windowStart === null || data.pending || typeof hass.callWS !== 'function'
    || data.lastAttempt !== null && Date.now()-data.lastAttempt < 60000) return '';
const end = Date.now(); data.lastAttempt = end; data.pending = true;
const current = () => !runtime.disposed && this._signatureEnergyBalance === runtime && runtime.data === data;
Promise.resolve().then(() => hass.callWS({type:'recorder/statistics_during_period',
  start_time:new Date(windowStart).toISOString(),end_time:new Date(end).toISOString(),
  statistic_ids:sources.ids,period:'5minute',types:['change']})).then(result => {
  if (!current()) return;
  const totals = new Map();
  for (const id of sources.ids) {
    const rows = (Array.isArray(result?.[id]) ? result[id] : []).filter(row => {
      const time = new Date(row.start).getTime();
      return time >= windowStart && time < end && typeof row.change === 'number' && Number.isFinite(row.change);
    });
    totals.set(id,rows.length ? rows.reduce((sum,row) => sum+row.change,0) : NaN);
  }
  data.balance = runtime.dayFor(Date.now()) === runtime.dayFor(end) ? calculateEnergyBalance(sources,totals) : null;
}).catch(() => {if (current()) data.balance = null;}).finally(() => {
  if (current()) {data.pending = false; data.paint();}
});
return '';
