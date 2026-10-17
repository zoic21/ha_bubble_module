  const key = Symbol.for('ha.signature.irrigation.@@MODULE_VERSION@@');
  if (!window[key]) {
    const services = new WeakMap();
    const formats = new Map();
    const formatter = (locale, options) => {
      const key = JSON.stringify([locale, options]);
      if (!formats.has(key)) {
        if (formats.size >= 32) formats.clear();
        formats.set(key, new Intl.DateTimeFormat(locale, options));
      }
      return formats.get(key);
    };
    const duration = seconds => {
      const hours = Math.floor(seconds / 3600);
      const clock = [Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
      return hours ? String(hours).padStart(2, '0') + ':' + clock : clock;
    };
    const parts = (date, tz) => Object.fromEntries(formatter('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
    const dayKey = (date, tz) => {
      const p = parts(date, tz);
      return [p.year, p.month, p.day].join('-');
    };
    const midnight = (date, shift, tz) => {
      const p = parts(date, tz);
      const day = Date.UTC(p.year, p.month - 1, p.day + shift);
      let result = day;
      for (let i = 0; i < 3; i++) {
        const q = parts(new Date(result), tz);
        const offset = Date.UTC(q.year, q.month - 1, q.day, q.hour, q.minute, q.second) - result;
        result = day - offset;
      }
      return result;
    };
    const days = new Map();
    const calendarDay = (now, tz) => {
      const key = JSON.stringify([tz, dayKey(now, tz)]);
      if (!days.has(key)) {
        if (days.size >= 8) days.clear();
        days.set(key, {cutoff: midnight(now, 0, tz), firstDay: midnight(now, -7, tz),
          today: dayKey(now, tz), tomorrow: dayKey(new Date(midnight(now, 1, tz)), tz)});
      }
      return days.get(key);
    };
    const active = ctx => ctx.isConnected && ctx.config.signature_irrigation
      && (ctx.editor || window.location.hash === ctx.config.signature_irrigation.popup);
    const bool = v => ['true', '1', 'on', 'yes'].includes(String(v).toLowerCase());
    const stamp = value => typeof value === 'string' ? Date.parse(value) : Date.parse(value?.dateTime);
    const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
    function createService() {
      const service = { events: [], status: 'loading', readAt: 0, signature: '', pending: false,
        roots: new Set(), registered: new WeakMap(), timer: null, generation: 0, views: new Map() };
      service.remove = ctx => {
        const ref = service.registered.get(ctx);
        if (ref) service.roots.delete(ref);
        service.registered.delete(ctx);
        if (!service.roots.size && service.timer) { clearTimeout(service.timer); service.timer = null; }
      };
      service.wake = () => {
        for (const ref of service.roots) {
          const ctx = ref.deref();
          if (!ctx) service.roots.delete(ref);
          else if (!active(ctx)) service.remove(ctx);
          else ctx.updateBubbleCard();
        }
        if (service.roots.size && !service.timer) service.timer = setTimeout(() => {
          service.timer = null;
          service.wake();
        }, 60000);
        if (!service.roots.size && service.timer) { clearTimeout(service.timer); service.timer = null; }
      };
      service.add = ctx => {
        if (!service.registered.has(ctx)) {
          const ref = new WeakRef(ctx); service.roots.add(ref); service.registered.set(ctx, ref);
        }
        if (!service.timer) service.timer = setTimeout(() => { service.timer = null; service.wake(); }, 60000);
      };
      service.read = (hass, entity, tz, config) => {
        const now = new Date();
        const calendar = hass.states[entity];
        if (!calendar || ['unknown', 'unavailable'].includes(calendar.state)) {
          service.status = calendar ? 'unavailable' : 'missing';
          service.events = [];
          service.signature = '';
          service.readAt = 0;
          service.pending = false;
          service.generation++;
          service.views.clear();
          return;
        }
        // Bubble tracks these state reads; programme/rain/station changes invalidate the cache.
        const day = dayKey(now, tz);
        const logging = bool(hass.states[config.logging_entity]?.attributes?.[config.logging_attribute || 'logging_enabled']);
        const historyChanged = service.day !== day || service.logging !== logging || service.timeZone !== tz;
        const elapsed = now.getTime() - service.readAt;
        // Check the throttle before scanning HA's state registry. All three
        // roles share this reader; pending/throttled renders need no signature.
        if ((service.pending && !historyChanged)
          || (!historyChanged && service.readAt && elapsed < (service.status === 'error' ? 60000 : 30000))) return;
        const signature = JSON.stringify([entity, day, tz, logging,
          ...Object.keys(hass.states).filter(id => id === entity || id.includes('opensprinkler'))
            .sort().map(id => [id, hass.states[id]?.last_updated])]);
        if (service.status === 'ready' && signature === service.signature && elapsed < 900000) return;
        const generation = ++service.generation;
        service.pending = true;
        service.readAt = now.getTime();
        service.signature = signature;
        service.day = day;
        service.logging = logging;
        service.timeZone = tz;
        service.status = 'loading';
        const start = new Date(midnight(now, -7, tz)).toISOString();
        const end = new Date(midnight(now, 366, tz)).toISOString();
        const url = 'calendars/' + entity + '?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end);
        Promise.resolve().then(() => hass.callApi('get', url)).then(events => {
          if (generation !== service.generation) return;
          if (!Array.isArray(events)) throw new Error('Invalid calendar response');
          service.events = events.map(event => {
            const start = stamp(event.start), end = stamp(event.end);
            return { start, end, station: String(event.summary || '').trim().toLowerCase(),
              seconds: Math.round((end - start) / 1000),
              manual: ['manual run', 'run once'].includes(String(event.description || '').trim().toLowerCase()) };
          // OpenSprinkler may forecast a zero-length run after weather adjustment.
          // Keep its planned departure; only completed history has a minimum duration.
          }).filter(event => Number.isFinite(event.start) && Number.isFinite(event.end) && event.end >= event.start)
            .sort((a, b) => a.start - b.start);
          service.views.clear();
          service.status = 'ready';
        }).catch(() => {
          if (generation !== service.generation) return;
          service.events = []; service.views.clear(); service.status = 'error';
        }).finally(() => {
          if (generation !== service.generation) return;
          service.pending = false;
          service.wake();
        });
      };
      return service;
    }
    window[key] = (ctx, card, hass, icon, onTeardown) => {
      if (!active(ctx)) { ctx._signatureIrrigation?.service.remove(ctx); return; }
      // Pop-up virtualization can leave an off-screen card with an older hass.
      hass = document.querySelector('home-assistant')?.hass || hass;
      const config = ctx.config.signature_irrigation;
      if (!config.calendar || !Array.isArray(config.stations) || !config.stations.length) {
        ctx._signatureIrrigation?.cleanup(); return;
      }
      const tz = hass.config?.time_zone || 'Europe/Paris';
      const connection = hass.connection || hass;
      let calendars = services.get(connection);
      if (!calendars) { calendars = new Map(); services.set(connection, calendars); }
      const serviceKey = JSON.stringify([config.calendar, config.logging_entity, config.logging_attribute]);
      let service = calendars.get(serviceKey);
      if (!service) { service = createService(); calendars.set(serviceKey, service); }
      if (ctx._signatureIrrigation?.service !== service || ctx._signatureIrrigation.role !== config.role) {
        ctx._signatureIrrigation?.cleanup();
        const runtime = {service, role:config.role, cleanup() {
          service.remove(ctx);
          if (ctx._signatureIrrigation !== runtime) return;
          card.querySelector('.arrosage-history')?.remove();
          delete card.dataset.arrosageFuture;
          ctx.style.display = '';
          const wrapper = ctx.closest?.('.card') || ctx.getRootNode?.().host?.closest?.('.card');
          if (wrapper?.parentElement?.classList.contains('bubble-cards-grid-container')) wrapper.style.display = '';
          card.style.removeProperty?.('--dp-accent');
          delete ctx._signatureIrrigation;
        }};
        ctx._signatureIrrigation = runtime;
        if (typeof onTeardown === 'function') onTeardown(runtime.cleanup);
      }
      service.add(ctx);
      service.read(hass, config.calendar, tz, config);
      const now = new Date(), {cutoff, firstDay, today, tomorrow} = calendarDay(now, tz);
      const logging = bool(hass.states[config.logging_entity]?.attributes?.[config.logging_attribute || 'logging_enabled']);
      const stations = config.stations.map(value => String(value).trim().toLowerCase());
      const viewKey = JSON.stringify([stations, tz, cutoff, logging]);
      let view = service.views.get(viewKey);
      if (!view) {
        const events = service.events.filter(event => stations.includes(event.station));
        const history = logging ? events.filter(event => event.start >= firstDay && event.end <= cutoff && event.end - event.start >= 60000).sort((a, b) => b.start - a.start) : [];
        if (service.views.size >= 32) service.views.clear();
        view = {events, history, signature: JSON.stringify([tz, parts(now, tz).year, history])};
        service.views.set(viewKey, view);
      }
      const {history} = view;
      const next = view.events.find(event => event.start >= now.getTime());
      const ready = service.status === 'ready';
      const time = ts => formatter('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ts);
      const date = (ts, long) => {
        const value = formatter('fr-FR', { timeZone: tz, ...(long ? { weekday: 'long' } : {}),
          day: 'numeric', month: long ? 'long' : 'short',
          ...(parts(new Date(ts), tz).year !== parts(now, tz).year ? { year: 'numeric' } : {}) }).format(ts);
        return value.charAt(0).toUpperCase() + value.slice(1);
      };
      const kind = event => event.manual ? 'Manuel / commande HA' : 'Programme automatique';
      let name = '', value = '', unit = '', secondary = '', glyph = 'mdi:calendar-alert', visible = true;
      if (config.role === 'next') {
        name = 'Prochain arrosage prévu'; glyph = 'mdi:calendar-clock';
        if (ready && next) {
          const day = dayKey(new Date(next.start), tz);
          const label = day === today ? 'Aujourd’hui' : day === tomorrow ? 'Demain' : date(next.start, false);
          value = label + '\n' + time(next.start);
        } else { value = ready ? 'Aucun prévu' : service.status === 'loading' ? 'Chargement…' : 'Indisponible'; }
        card.dataset.arrosageFuture = String(ready && !!next);
      } else if (config.role === 'history') {
        visible = ready && !!history.length;
        if (visible) {
          let table = card.querySelector('.arrosage-history');
          if (!table) {
            table = document.createElement('table'); table.className = 'arrosage-history';
            table.setAttribute('aria-label', 'Historique des arrosages');
            card.appendChild(table);
          }
          const signature = view.signature;
          if (table.dataset.events !== signature) {
            table.replaceChildren();
            for (const event of history) {
              const row = document.createElement('tr');
              for (const text of [date(event.start, false), time(event.start), kind(event), duration(event.seconds)]) {
                const cell = document.createElement('td'); cell.textContent = text; row.appendChild(cell);
              }
              table.appendChild(row);
            }
            table.dataset.events = signature;
          }
        }
      } else if (config.role === 'empty') {
        visible = !ready || !history.length;
        name = ready ? logging ? 'Aucun arrosage sur les 7 derniers jours' : 'Journalisation désactivée' : service.status === 'loading' ? 'Chargement de l’historique…' : service.status === 'missing' ? 'Calendrier introuvable' : 'Calendrier indisponible';
        secondary = ready ? logging ? 'Les commandes manuelles apparaissent le lendemain' : 'Activer les logs dans OpenSprinkler' : service.status === 'missing' ? config.calendar : service.status === 'loading' ? 'Lecture du calendrier' : 'Historique temporairement indisponible';
        glyph = ready ? 'mdi:history' : 'mdi:calendar-alert';
      }
      ctx.style.display = visible ? '' : 'none';
      const wrapper = ctx.closest?.('.card') || ctx.getRootNode?.().host?.closest?.('.card');
      if (wrapper?.parentElement?.classList.contains('bubble-cards-grid-container')) wrapper.style.display = visible ? '' : 'none';
      if (config.role !== 'history') {
        setText(card.querySelector('.bubble-name'), name);
        setText(card.querySelector('.dp-secondary'), secondary);
        setText(card.querySelector('.dp-value'), value);
        setText(card.querySelector('.dp-unit'), unit);
        icon?.setAttribute('icon', glyph);
        card.style.setProperty('--dp-accent', ready && config.role !== 'empty' ? '#29958A' : '#818181');
      }
      return '';
    };
  }
  window[key](this, this.card, hass, this.elements?.mainIcon || this.card?.querySelector('.bubble-main-icon'),
    typeof onTeardown === 'function' ? onTeardown : undefined);
