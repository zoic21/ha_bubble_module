// Exercise the generated module with independent irrigation configurations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const expression = require('../../shared/test/module.cjs').loadModule('signature-irrigation').code;
const cards = Object.entries({potager:['potager'],haie:['haie'],fruit_rouge:['fruit rouge','fruits rouges'],citronnier:['citronnier']})
  .flatMap(([zone,stations])=>['next','history','empty'].map(role=>({card_type:'button',modules:['signature_irrigation'],signature_irrigation:{
    calendar:'calendar.opensprinkler_schedule',stations,popup:'#'+zone+'-details',role,logging_entity:'switch.opensprinkler_enabled'}})));
const nativeCompile = styles => new Function('card', 'hass', 'icon', 'window', 'document', 'setTimeout', 'Date', 'clearTimeout', 'onTeardown', 'return `' + styles + '`;');

class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.dataset = {}; this.className = ''; this.textContent = ''; this.style = { setProperty(k, v) { this[k] = v; } }; }
  appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
  replaceChildren(...children) { this.children = children; }
  remove() { if(this.parentElement) this.parentElement.children=this.parentElement.children.filter(e=>e!==this); }
  setAttribute(k, v) { this[k] = v; }
  querySelector(selector) { return this.children.flatMap(walkElement).find(e => selector.startsWith('.') ? e.className === selector.slice(1) : e.tagName === selector) || null; }
}
const walkElement = element => [element, ...element.children.flatMap(walkElement)];
const event = (start, end, summary = 'Potager', description = 'Potager') => ({ start: { dateTime: start }, end: { dateTime: end }, summary, description });
function fixture({ events = [], now = '2026-10-09T12:00:00Z', logging = true, calendar = 'off', reject = false, timeZone = 'Europe/Paris' } = {}) {
  let instant = new Date(now).getTime();
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [instant])); } static now() { return instant; } }
  const window = { location: { hash: '#potager-details' } }, timers = [], requests = [], connection = {};
  const hass = { connection, config: { time_zone: timeZone }, states: {
    'switch.opensprinkler_enabled': { state: 'on', attributes: { logging_enabled: logging }, last_updated: now },
    ...(calendar === null ? {} : { 'calendar.opensprinkler_schedule': { state: calendar, last_updated: now } })
  }, callApi(method, url) { requests.push({ method, url }); return reject ? Promise.reject(new Error('Unavailable')) : Promise.resolve(events); } };
  let latestHass = hass;
  const document = { createElement: tag => new Element(tag), querySelector: selector => selector === 'home-assistant' ? { hass: latestHass } : null };
  const contexts = [];
  function mount(role, zone = 'potager', index) {
    const station = {fruit_rouge:'fruit rouge'}[zone] || zone;
    const config = cards.find(c => c.signature_irrigation.stations[0] === station && c.signature_irrigation.role === role);
    const dom = new Element('ha-card'), icon = new Element('ha-icon');
    for (const name of ['bubble-name', 'dp-secondary', 'dp-value', 'dp-unit']) { const node = new Element(); node.className = name; dom.appendChild(node); }
    const wrapper = new Element(); wrapper.parentElement = { classList: { contains: s => s === 'bubble-cards-grid-container' } };
    const render = nativeCompile(expression);
    const ctx = { config, card:dom, elements:{mainIcon:icon}, isConnected: true, editor: false, style: {}, closest: () => wrapper, updateBubbleCard() {
      render.call(ctx, dom, hass, icon, window, document, fn => { timers.push(fn); return fn; }, Clock,
        fn => { const i = timers.indexOf(fn); if (i >= 0) timers.splice(i, 1); }, fn => { ctx.teardown = fn; });
    } };
    window.location.hash = config.signature_irrigation.popup;
    contexts.push(ctx); ctx.updateBubbleCard();
    return { ctx, dom, icon, wrapper, text: cls => dom.querySelector('.' + cls)?.textContent };
  }
  return { mount, hass, requests, timers, window, contexts, useSnapshot(value) { latestHass = value; }, advance(ms) { instant += ms; }, flush: () => new Promise(resolve => setImmediate(resolve)) };
}

const rows = card => card.dom.querySelector('table')?.children.map(row => row.children.map(cell => cell.textContent)) || [];

test('native calendar API event objects, sorted next departure, and one shared request', async () => {
  const f = fixture({ events: [event('2026-10-09T19:00:00Z', '2026-10-09T19:20:00Z'), event('2026-10-09T17:00:00Z', '2026-10-09T17:30:00Z')] });
  const next = f.mount('next'); f.mount('history'); const empty = f.mount('empty');
  assert.equal(next.text('dp-value'), 'Chargement…'); await f.flush();
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0].method, 'get');
  assert.equal(next.text('dp-value'), 'Aujourd’hui\n19:00'); assert.equal(empty.text('bubble-name'), 'Aucun arrosage sur les 7 derniers jours');
  const url = new URL('https://ha.invalid/api/' + f.requests[0].url);
  assert.equal(url.searchParams.get('start'), '2026-10-01T22:00:00.000Z');
  assert.equal(url.searchParams.get('end'), '2027-10-09T22:00:00.000Z');
});

test('today at 19:51 is kept even with zero duration, before tomorrow at 19:49', async () => {
  const f = fixture({ now: '2026-10-09T14:04:00Z', events: [
    event('2026-10-10T17:49:00Z', '2026-10-10T18:04:00Z', 'Haie'),
    event('2026-10-09T17:51:00Z', '2026-10-09T17:51:00Z', 'Haie'),
    event('2026-10-08T17:53:00Z', '2026-10-08T17:53:00Z', 'Haie'),
    event('2026-10-09T17:50:00Z', '2026-10-09T17:49:00Z', 'Haie')
  ] });
  const next = f.mount('next', 'haie'), history = f.mount('history', 'haie'); await f.flush();
  assert.equal(next.text('dp-value'), 'Aujourd’hui\n19:51');
  assert.equal(next.text('dp-secondary'), '');
  assert.equal(history.ctx.style.display, 'none');
});

test('exact station filtering for all four zones', async () => {
  for (const [zone, name] of [['potager', 'Potager'], ['haie', 'Haie'], ['fruit_rouge', ' Fruits Rouges '], ['citronnier', 'Citronnier']]) {
    const f = fixture({ events: [event('2026-10-09T17:00:00Z', '2026-10-09T17:20:00Z', name), event('2026-10-09T16:00:00Z', '2026-10-09T16:20:00Z', name.trim() + ' 2')] });
    const next = f.mount('next', zone); await f.flush(); assert.equal(next.text('dp-value'), 'Aujourd’hui\n19:00');
  }
});

test('history is until yesterday; real duration, minimum 60 seconds and seven calendar days', async () => {
  const f = fixture({ events: [
    event('2026-10-08T17:00:00Z', '2026-10-08T17:20:00Z'),
    event('2026-10-09T01:00:00Z', '2026-10-09T01:10:00Z', 'Potager', 'Manual Run'),
    event('2026-10-07T17:00:00Z', '2026-10-07T17:00:59.900Z'),
    event('2026-10-01T22:00:00Z', '2026-10-01T22:01:00Z', 'Potager', 'Run Once'),
    event('2026-10-01T21:59:00Z', '2026-10-01T22:01:00Z'),
    event('2026-10-08T21:59:00Z', '2026-10-08T22:01:00Z'), event('invalid', 'invalid')
  ] });
  const table = f.mount('history'); await f.flush();
  assert.deepEqual(rows(table), [['8 oct.', '19:00', 'Programme automatique', '20:00'], ['2 oct.', '00:00', 'Manuel / commande HA', '01:00']]);
});

test('a manual run today appears on the next local day', async () => {
  const f = fixture({ events: [event('2026-10-09T01:00:00Z', '2026-10-09T01:10:00Z', 'Potager', 'Manual Run')] });
  const row = f.mount('history'); await f.flush(); assert.equal(row.ctx.style.display, 'none');
  f.advance(86400000); f.contexts[0].updateBubbleCard(); await f.flush();
  assert.equal(row.ctx.style.display, ''); assert.equal(rows(row)[0][3], '10:00'); assert.equal(f.requests.length, 2);
});

test('logging disabled never presents forecasts as real history', async () => {
  for (const logging of [false, 0, 'False', undefined]) {
    const f = fixture({ logging, events: [event('2026-10-08T17:00:00Z', '2026-10-08T17:20:00Z')] });
    if (logging === undefined) delete f.hass.states['switch.opensprinkler_enabled'].attributes.logging_enabled;
    const row = f.mount('history'), empty = f.mount('empty'); await f.flush();
    assert.equal(row.ctx.style.display, 'none'); assert.equal(empty.text('bubble-name'), 'Journalisation désactivée');
  }
});

test('missing calendar, unavailable calendar and API failure are distinct from an empty history', async () => {
  for (const options of [{ calendar: null }, { calendar: 'unavailable' }, { reject: true }]) {
    const f = fixture(options), next = f.mount('next'), empty = f.mount('empty'); await f.flush();
    assert.equal(next.text('dp-value'), 'Indisponible'); assert.equal(empty.ctx.style.display, '');
    assert.match(empty.text('bubble-name'), /Calendrier (introuvable|indisponible)/);
    assert.equal(f.requests.length, options.reject ? 1 : 0);
  }
});

test('empty future and local tomorrow or a seasonal departure next year', async () => {
  for (const [start, expected] of [[null, 'Aucun prévu'], ['2026-10-10T17:00:00Z', 'Demain\n19:00'], ['2027-04-15T17:00:00Z', '15 avr. 2027\n19:00']]) {
    const f = fixture({ events: start ? [event(start, new Date(Date.parse(start) + 1200000).toISOString())] : [] });
    const next = f.mount('next'); await f.flush(); assert.equal(next.text('dp-value'), expected);
  }
});

test('elapsed departures are skipped without presenting an outdated future date', async () => {
  const f = fixture({ events: [event('2026-10-09T13:00:00Z', '2026-10-09T13:20:00Z'), event('2026-10-09T17:00:00Z', '2026-10-09T17:20:00Z')] });
  const next = f.mount('next'); await f.flush(); f.advance(7200000); next.ctx.updateBubbleCard(); await f.flush();
  assert.equal(next.text('dp-value'), 'Aujourd’hui\n19:00');
});

test('DST uses the HA timezone even when the browser uses a different timezone', async () => {
  for (const [now, start, end, hour, historyStart] of [
    ['2026-10-26T12:00:00Z', '2026-10-25T00:50:00Z', '2026-10-25T01:10:00Z', '02:50', '2026-10-18T22:00:00.000Z'],
    ['2026-03-30T12:00:00Z', '2026-03-29T00:50:00Z', '2026-03-29T01:10:00Z', '01:50', '2026-03-22T23:00:00.000Z']]) {
    const f = fixture({ now, events: [event(start, end)] }), row = f.mount('history'); await f.flush();
    assert.equal(rows(row)[0][3], '20:00'); assert.equal(rows(row)[0][1], hour);
    assert.equal(new URL('https://ha.invalid/' + f.requests[0].url).searchParams.get('start'), historyStart);
  }
});

test('all sessions are visible in one stable table, including the first three, without disclosure', async () => {
  const events = Array.from({ length: 5 }, (_, i) => event('2026-10-0' + (8 - i) + 'T17:00:00Z', '2026-10-0' + (8 - i) + 'T17:20:00Z'));
  const f = fixture({ events }), history = f.mount('history'); await f.flush();
  const table = history.dom.querySelector('table');
  assert.equal(table.children.length, 5); assert.equal(history.dom.querySelector('details'), null);
  assert.equal(rows(history)[0][0], '8 oct.'); assert.equal(rows(history)[4][0], '4 oct.');
  history.ctx.updateBubbleCard(); assert.equal(history.dom.querySelector('table'), table);
});

test('durations preserve seconds and add hours only from one hour', async () => {
  const seconds = [342, 3599, 3600, 3723, 7227];
  const events = seconds.map((duration, i) => {
    const start = Date.parse('2026-10-08T10:00:00Z') + i * 3600000;
    return event(new Date(start).toISOString(), new Date(start + duration * 1000).toISOString());
  });
  const f = fixture({ events }), history = f.mount('history'); await f.flush();
  assert.deepEqual(rows(history).map(row => row[3]), ['02:00:27', '01:02:03', '01:00:00', '59:59', '05:42']);
});

test('polling stops when the popup is closed and retries failures', async () => {
  const f = fixture({ reject: true }); f.mount('next'); await f.flush(); assert.equal(f.requests.length, 1);
  f.advance(61000); f.timers.shift()(); await f.flush(); assert.equal(f.requests.length, 2);
  f.window.location.hash = ''; const timerCount = f.timers.length; f.timers.shift()(); await f.flush();
  assert.equal(f.requests.length, 2); assert.equal(f.timers.length, timerCount - 1);
});

test('off-screen cards read the newest HA snapshot', async () => {
  const f = fixture({ events: [event('2026-10-08T17:00:00Z', '2026-10-08T17:20:00Z')] });
  const row = f.mount('history'), empty = f.mount('empty'); await f.flush();
  assert.equal(row.ctx.style.display, '');
  f.useSnapshot({ ...f.hass, states: { ...f.hass.states, 'switch.opensprinkler_enabled': { state: 'on', attributes: { logging_enabled: false }, last_updated: '2026-10-09T12:00:05Z' } } });
  row.ctx.updateBubbleCard(); await f.flush(); assert.equal(row.ctx.style.display, 'none');
  assert.equal(empty.text('bubble-name'), 'Journalisation désactivée'); assert.equal(f.requests.length, 2);
});

test('midnight bypasses the throttle before old forecasts become historical rows', async () => {
  const events = [event('2026-10-09T19:00:00Z', '2026-10-09T19:20:00Z')];
  const f = fixture({ now: '2026-10-09T21:59:50Z', events });
  const row = f.mount('history'); await f.flush(); assert.equal(row.ctx.style.display, 'none');
  events.length = 0; f.advance(15000); row.ctx.updateBubbleCard();
  assert.equal(row.ctx.style.display, 'none'); await f.flush();
  assert.equal(f.requests.length, 2); assert.equal(row.ctx.style.display, 'none');
});

test('teardown removes the table, grid hiding and last polling timer immediately', async () => {
  const f=fixture({events:[event('2026-10-08T17:00:00Z','2026-10-08T17:20:00Z')]});
  const history=f.mount('history'), empty=f.mount('empty');await f.flush();
  assert.ok(history.dom.querySelector('table'));assert.equal(empty.wrapper.style.display,'none');
  const service=history.ctx._signatureIrrigation.service;
  history.ctx.teardown();assert.equal(history.dom.querySelector('table'),null);
  assert.equal(service.roots.size,1);
  empty.ctx.teardown();assert.equal(empty.wrapper.style.display,'');
  assert.equal(service.roots.size,0);assert.equal(service.timer,null);assert.equal(f.timers.length,0);
});

test('a late API response cannot resurrect an unavailable calendar', async () => {
  const f=fixture();let resolve;
  f.hass.callApi=()=>new Promise(done=>resolve=done);
  const next=f.mount('next');await f.flush();
  f.hass.states['calendar.opensprinkler_schedule'].state='unavailable';next.ctx.updateBubbleCard();
  resolve([event('2026-10-09T17:00:00Z','2026-10-09T17:20:00Z')]);await f.flush();
  assert.equal(next.text('dp-value'),'Indisponible');
  assert.equal(next.ctx._signatureIrrigation.service.status,'unavailable');
  next.ctx.teardown();
});

test('shared views, day boundaries and date formatters are reused on ordinary updates', async () => {
  const f=fixture({events:[event('2026-10-08T17:00:00Z','2026-10-08T17:20:00Z')]});
  const row=f.mount('history'), next=f.mount('next');await f.flush();
  const service=row.ctx._signatureIrrigation.service, view=[...service.views.values()][0];
  for(let i=0;i<50;i++) { row.ctx.updateBubbleCard();next.ctx.updateBubbleCard(); }
  assert.equal(service.views.size,1);assert.equal([...service.views.values()][0],view);
  assert.equal(f.requests.length,1);
  row.ctx.config={...row.ctx.config,signature_irrigation:{role:'weekdays'}};row.ctx.updateBubbleCard();
  assert.equal(row.dom.querySelector('table'),null);assert.equal(service.roots.size,1);
  next.ctx.teardown();
});
