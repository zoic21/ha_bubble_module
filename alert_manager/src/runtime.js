      /* @include shared/src/editor-options.js */
      const c = this.config;
      const clearBadge = () => { this._amBadge?.remove(); delete this._amBadge; };
      if (!this.card || c.button_type === 'slider'
          || !['button','cover','climate','media-player'].includes(c.card_type || 'button')) {
        delete this._amConfig;
        clearBadge();
        return '';
      }
      /* @include shared/src/number-format.js */
      const options = c.alert_manager || {};
      let watched = this._amConfig;
      if (!watched || !watched.icons || watched.config !== c || watched.options !== c.alert_manager) {
        /* @include shared/src/color.js */
        const ids = new Set();
        const entityId = /^[a-z0-9_]+\.[a-z0-9_]+$/;
        const add = id => { if (typeof id === 'string' && entityId.test(id)) ids.add(id); };
        // Scan only this card, including grouped sub-buttons and literal template references.
        // Nested cards have their own module and must not color their parent.
        const collect = (value,field = '') => {
          if (typeof value === 'string') {
            if (/^(entity|entity_id|entities|entity_ids|primary|secondary)$|_entity$/.test(field)) add(value);
            if (/\{[\{%]|\$\{/.test(value)) {
              for (const match of value.matchAll(/['"]([a-z0-9_]+\.[a-z0-9_]+)['"]/g)) add(match[1]);
              for (const match of value.matchAll(/\bstates\.([a-z0-9_]+\.[a-z0-9_]+)/g)) add(match[1]);
            }
          } else if (Array.isArray(value)) value.forEach(entry => collect(entry,field));
          else if (value && typeof value === 'object') {
            for (const [key,entry] of Object.entries(value)) {
              if (!['alert_manager','alertManager','cards','card'].includes(key)) collect(entry,key);
            }
          }
        };
        collect(c);
        const exceptions = options.entities || {};
        Object.keys(exceptions).forEach(add);
        const list = value => Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];
        const readColors = (values,fallback = {}) => Object.fromEntries(
          ['active','pending'].map(state => [state,colorFor(values?.[state],fallback[state] ?? null)]));
        const readIcons = (values,fallback = {}) => Object.fromEntries(
          ['active','pending'].map(state => [state,
            typeof values?.[state] === 'string' && /^[a-z][a-z0-9_-]*:[a-z0-9_-]+$/i.test(values[state])
              ? values[state] : fallback[state] ?? null]));
        const packSettings = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const readPacks = (packs,colorFallback,iconFallback) => new Map(Object.entries(packSettings(packs))
          .map(([id,spec]) => [id,{colors:readColors(spec?.colors,colorFallback),
            icons:readIcons(spec?.icons,iconFallback),ignorePending:spec?.ignore_pending}]));
        const defaults = {active:'var(--red-color, #f44336)',pending:'var(--orange-color, #ff9800)'};
        const colors = readColors(options.colors,defaults);
        const icons = readIcons(options.icons,{active:'mdi:exclamation',pending:'mdi:clock-outline'});
        const packs = readPacks(options.packs,colors,icons);
        const entities = [];
        for (const id of ids) {
          const entry = exceptions[id] || {};
          if (entry.exclude === true) continue;
          const localPacks = readPacks(entry.packs);
          const entityColors = readColors(entry.colors);
          const entityIcons = readIcons(entry.icons);
          const enabledPacks = new Map();
          for (const pack of new Set([...packs.keys(),...localPacks.keys()])) {
            const general = packs.get(pack), local = localPacks.get(pack);
            enabledPacks.set(pack,{
              ignorePending:local?.ignorePending ?? entry.ignore_pending ?? general?.ignorePending ?? options.ignore_pending ?? false,
              colors:Object.fromEntries(['active','pending'].map(state =>
                [state,local?.colors[state] ?? entityColors[state] ?? general?.colors[state] ?? colors[state]])),
              icons:Object.fromEntries(['active','pending'].map(state =>
                [state,local?.icons[state] ?? entityIcons[state] ?? general?.icons[state] ?? icons[state]])),
            });
          }
          entities.push({id,
            ignorePending:entry.ignore_pending ?? options.ignore_pending ?? false,
            packs:enabledPacks,
            excluded:new Set(list(entry.exclude)),
            colors:entityColors,
            icons:entityIcons,
          });
        }
        const sensorIds = ['active','pending'].map(state =>
          options.sensors?.[state] || 'sensor.alert_manager_main_'+state);
        watched = this._amConfig = {config:c,options:c.alert_manager,entities,colors,icons,sensorIds,sensorKey:sensorIds.join('\u0001')};
      }
      if (typeof onTeardown === 'function') onTeardown(() => { clearBadge(); delete this._amConfig; });
      if (!watched.entities.length) { clearBadge(); return ''; }
      // Keep both reads outside the cache so Bubble observes active and pending alerts.
      const sources = watched.sensorIds.map(id => hass.states[id]);
      const key = Symbol.for('bubble.alertManager.v5');
      const shared = globalThis[key] || (globalThis[key] = new WeakMap());
      const connection = hass.connection || hass;
      let indices = shared.get(connection);
      if (!indices) shared.set(connection,indices = new Map());
      const versions = sources.map(state => {
        const count = Number(state?.state);
        if (!Number.isInteger(count) || count <= 0) return state?.state;
        const revision = state.attributes?.alerts_revision;
        // Source IDs separate indices; last_changed also detects a recreated sensor.
        // Sources without a revision retain state-object invalidation.
        return revision == null ? state : [state.state,revision,state.last_changed].join('\u0001');
      });
      let snapshot = indices.get(watched.sensorKey);
      if (!snapshot || versions.some((version,index) => version !== snapshot.versions[index])) {
        const byEntity = new Map();
        sources.forEach((state,index) => {
          const count = Number(state?.state);
          if (!Number.isInteger(count) || count <= 0) return;
          const alerts = state.attributes?.alerts;
          if (!Array.isArray(alerts)) return;
          for (const alert of alerts) {
            if (typeof alert?.id !== 'string' || typeof alert.entity_id !== 'string') continue;
            const [source,rule] = alert.id.split(':');
            if (!source || !rule) continue;
            let records = byEntity.get(alert.entity_id);
            if (!records) byEntity.set(alert.entity_id,records = []);
            // The prefix is the pack ID; custom rules use rule:<rule_id>:<entity_id>.
            records.push({id:alert.id,pack:source === 'rule' ? null : source,
              rule:source === 'rule' ? rule : null,severity:index === 1 ? 1 : 2});
          }
        });
        snapshot = {versions,byEntity};
        indices.set(watched.sensorKey,snapshot);
      }
      let selected = null;
      let policy = null;
      for (const entry of watched.entities) {
        let match = null;
        for (const alert of snapshot.byEntity.get(entry.id) || []) {
          const pack = entry.packs.get(alert.pack);
          if (entry.excluded.has(alert.pack ?? alert.rule) || (alert.pack && !pack)) continue;
          if (alert.severity === 1 && (pack?.ignorePending ?? entry.ignorePending) === true) continue;
          if (!match || alert.severity > match.severity
              || (alert.severity === match.severity && alert.id < match.id)) match = alert;
        }
        // Active wins; equal severity keeps the first entity in card order.
        if (match && (!selected || match.severity > selected.severity)) { selected = match; policy = entry; }
      }
      // Native Bubble remains responsible for availability and restores its own colors.
      if (!selected) { clearBadge(); return ''; }
      const state = selected.severity === 2 ? 'active' : 'pending';
      const accent = policy.packs.get(selected.pack)?.colors[state] ?? policy.colors[state] ?? watched.colors[state];
      const icon = policy.packs.get(selected.pack)?.icons[state] ?? policy.icons[state] ?? watched.icons[state];
      const surface = 'var(--signature-card-background, var(--ha-card-background, var(--card-background-color, #fff)))';
      let styles = '';
      if (options.color_card === true) styles += `
        ha-card .bubble-container, ha-card .bubble-background {
          background-color: color-mix(in srgb, ${accent} 16%, ${surface}) !important;
        }
      `;
      const container = options.show_badge === false ? null : this.card.querySelector('.bubble-main-icon-container');
      if (!container) { clearBadge(); return styles; }
      let badge = this._amBadge;
      if (!badge || badge.parentElement !== container) {
        clearBadge();
        badge = this._amBadge = document.createElement('span');
        badge.className = 'am-alert-badge';
        // Keep any leftover node hidden when Bubble removes this module's CSS.
        badge.style.display = 'none';
        badge.style.pointerEvents = 'none';
        badge.setAttribute('role','img');
        const glyph = document.createElement('ha-icon');
        glyph.setAttribute('aria-hidden','true');
        badge.appendChild(glyph);
        container.appendChild(badge);
      }
      if (badge.firstElementChild.getAttribute('icon') !== icon) badge.firstElementChild.setAttribute('icon',icon);
      badge.setAttribute('data-am-state',state);
      const french = localeFor(hass).toLowerCase().startsWith('fr');
      const label = state === 'active' ? (french ? 'Alerte active' : 'Active alert') : (french ? 'Alerte en attente' : 'Pending alert');
      badge.setAttribute('aria-label',label);
      badge.setAttribute('title',label);
      const badgeAccent = options.color_badge === false ? 'var(--signature-alert-badge-neutral-color, var(--primary-text-color, #000))' : accent;
      return styles + `
        ha-card .bubble-main-icon-container { overflow: visible !important; }
        ha-card .bubble-main-icon-container > .am-alert-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          width: 16px;
          height: 16px;
          box-sizing: border-box;
          display: flex !important;
          align-items: center;
          justify-content: center;
          border: 1.5px solid ${badgeAccent};
          border-radius: 50%;
          background: var(--signature-alert-badge-background, ${surface});
          box-shadow: 0 0 0 2px ${surface};
          color: ${badgeAccent};
          pointer-events: none;
          z-index: 2;
        }
        ha-card .bubble-main-icon-container > .am-alert-badge > ha-icon {
          --mdc-icon-size: 12px;
          width: 12px;
          height: 12px;
          display: flex;
          color: inherit;
          pointer-events: none;
        }
      `;
