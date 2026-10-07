  /* @include shared/src/editor-options.js */
  const config = this.config || {};
  const root = this.card;
  const host = this.elements?.mainContainer || root?.querySelector('.bubble-container');
  const enabled = root && host && (config.card_type || 'button') === 'button' && config.button_type !== 'slider';
  const version = '@@MODULE_VERSION@@';
  let r = this._signatureWindRose;
  if (r && (r.version !== version || r.root !== root || r.host !== host || !enabled)) { r.dispose(); r = null; }
  if (typeof onTeardown === 'function') onTeardown(() => this._signatureWindRose?.dispose());
  if (!enabled) return '';
  const numeric = value => value != null && typeof value !== 'boolean' && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  /* @include shared/src/dom.js */
  /* @include shared/src/number-format.js */
  /* @include shared/src/color.js */
  /* @include shared/src/template-source.js */
  if (!r) {
    const canvas = create('div','swr-card'), toolbar = create('div','swr-toolbar'), tabs = create('div','swr-tabs');
    attr(tabs,'role','group'); toolbar.append(tabs);
    const chart = create('div','swr-chart'), svg = create('svg','swr-svg',true);
    attr(svg,'viewBox','0 0 320 320'); attr(svg,'role','group');
    for (const radius of [39,79,118]) {
      const circle = create('circle','swr-grid',true); attr(circle,'cx',160); attr(circle,'cy',160); attr(circle,'r',radius); svg.append(circle);
    }
    const axes = create('path','swr-grid',true); attr(axes,'d','M 160 42 V 278 M 42 160 H 278'); svg.append(axes);
    const bands = Array.from({length:16},() => Array.from({length:4},(_,index) => {
      const el = create('path','swr-band swr-band-'+index,true); attr(el,'aria-hidden',true); svg.append(el); return el;
    }));
    const sectors = Array.from({length:16},() => {
      const el = create('path','swr-sector',true); attr(el,'role','button'); svg.append(el); return el;
    });
    const cardinals = [[160,22],[298,160],[160,298],[22,160]].map(([x,y]) => {
      const el = create('text','swr-cardinal',true); attr(el,'x',x); attr(el,'y',y); svg.append(el); return el;
    });
    const tooltip = create('div','swr-tooltip'); attr(tooltip,'role','status'); tooltip.hidden = true;
    chart.append(svg,tooltip);
    const legend = create('div','swr-legend'); attr(legend,'role','img');
    const legendLabels = ['< 5','5–10','10–20','≥ 20'].map((label,index) => {
      const item = create('div','swr-legend-item'), swatch = create('span','swr-swatch swr-band-'+index), value = create('span');
      attr(swatch,'aria-hidden',true); text(value,label); item.append(swatch,value); legend.append(item); return value;
    });
    const legendUnit = create('div','swr-legend-unit'); text(legendUnit,'km/h'); legend.append(legendUnit);
    const status = create('div','swr-status'); attr(status,'role','status');
    const footer = create('div','swr-footer'), dominant = create('div'), frequency = create('div','swr-frequency');
    const dominantLabel = create('div','swr-label'), dominantValue = create('div','swr-value'); dominant.append(dominantLabel,dominantValue);
    const frequencyLabel = create('div','swr-label'), frequencyValue = create('div','swr-value'); frequency.append(frequencyLabel,frequencyValue);
    footer.append(dominant,frequency); canvas.append(toolbar,chart,legend,status,footer); host.append(canvas); attr(root,'data-signature-wind-rose','');
    r = this._signatureWindRose = {version,root,host,canvas,toolbar,tabs,chart,svg,sectors,bands,cardinals,tooltip,legend,legendLabels,status,footer,
      dominantLabel,dominantValue,frequencyLabel,frequencyValue,cache:new Map(),tabNodes:[],selected:null,hovered:null,generation:0};
    const runtime = r;
    r.clearTimer = () => { clearTimeout(r.timer); r.timer = null; };
    r.active = () => !r.disposed && host.isConnected && !document.hidden;
    r.schedule = () => {
      r.clearTimer();
      if (r.active() && r.directionEntity && typeof r.hass.callWS === 'function') {
        const entry = r.cache.get(r.period);
        const due = r.retryAt || ((entry?.loadedAt || Date.now()) + r.refresh*1000);
        const delay = r.inFlight ? r.refresh * 1000 : Math.max(1000,due - Date.now());
        r.timer = setTimeout(() => { if (r.active()) r.load(); },delay);
      }
    };
    r.dispose = () => {
      r.disposed = true; r.generation++; r.clearTimer(); r.cache.clear();
      document.removeEventListener('visibilitychange',r.visibility); canvas.remove(); root.removeAttribute('data-signature-wind-rose');
      if (this._signatureWindRose === runtime) delete this._signatureWindRose;
    };
    r.visibility = () => { if (document.hidden) r.clearTimer(); else if (r.active()) r.load(); };
    document.addEventListener('visibilitychange',r.visibility);
    canvas.addEventListener('click',event => { event.stopPropagation(); });
    chart.addEventListener('click',event => {
      if (!sectors.includes(event.target)) { r.selected = null; r.hovered = null; r.render(); }
    });
    sectors.forEach((el,index) => {
      const select = () => { r.hovered = null; r.selected = r.selected === index ? null : index; r.render(); };
      el.addEventListener('pointerenter',event => {
        if (event.pointerType === 'touch') return;
        r.hovered = index; r.render();
      });
      el.addEventListener('pointerleave',() => { r.hovered = null; r.render(); });
      el.addEventListener('click',event => { event.stopPropagation(); select(); });
      el.addEventListener('keydown',event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); select(); }
        else if (event.key === 'Escape') { r.selected = null; r.hovered = null; r.render(); }
      });
    });
    r.direction = value => {
      let bearing = numeric(value);
      if (bearing === null && typeof value === 'string') {
        const index = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'].indexOf(value.trim().toUpperCase().replaceAll('O','W'));
        if (index >= 0) bearing = index * 22.5;
      }
      return bearing === null ? null : ((bearing + r.offset) % 360 + 360) % 360;
    };
    r.points = (records,parse) => {
      if (!Array.isArray(records)) return [];
      const points = [];
      let ordered = true;
      for (const state of records) {
        const seconds = numeric(state.lu ?? state.lc);
        const time = seconds === null ? Date.parse(state.last_updated || state.last_changed) : seconds * 1000;
        if (!Number.isFinite(time)) continue;
        if (points.length && points[points.length-1].time > time) ordered = false;
        points.push({time,value:parse(state.s ?? state.state)});
      }
      return ordered ? points : points.sort((a,b) => a.time-b.time);
    };
    r.aggregate = (history,start,end) => {
      const directions = r.points(history?.[r.directionEntity],r.direction);
      const speeds = r.speedEntity ? r.points(history?.[r.speedEntity],numeric) : [];
      const bins = Array(16).fill(0);
      const speedBins = Array.from({length:16},() => Array(4).fill(0));
      const speedTotals = Array(16).fill(0), speedMaxima = Array(16).fill(null);
      let i = 0, j = 0, time = start, direction = null, speed = null, calm = 0, wind = 0;
      while (time < end) {
        while (i < directions.length && directions[i].time <= time) direction = directions[i++].value;
        while (j < speeds.length && speeds[j].time <= time) speed = speeds[j++].value;
        const next = Math.min(end,directions[i]?.time ?? end,speeds[j]?.time ?? end);
        const duration = next-time;
        if (!r.speedEntity || (speed !== null && speed >= 0)) {
          if (r.speedEntity && speed <= r.calmThreshold) calm += duration;
          else if (direction !== null) {
            const index = Math.round(direction/22.5)%16;
            bins[index] += duration; wind += duration;
            if (r.speedEntity && duration > 0) {
              speedTotals[index] += speed*duration;
              speedMaxima[index] = Math.max(speedMaxima[index] ?? speed,speed);
              if (r.speedFactor !== null) {
                const kmh = speed*r.speedFactor;
                speedBins[index][kmh < 5 ? 0 : kmh < 10 ? 1 : kmh < 20 ? 2 : 3] += duration;
              }
            }
          }
        }
        time = next;
      }
      const dominant = wind ? bins.indexOf(Math.max(...bins)) : null;
      return {bins,speedBins,speedTotals,speedMaxima,wind,calm,covered:wind+calm,dominant,start,end};
    };
    r.load = async () => {
      r.clearTimer();
      if (!r.active()) return;
      if (!r.directionEntity || typeof r.hass.callWS !== 'function') { r.phase = 'configuration'; r.render(); return; }
      const period = r.period, cached = r.cache.get(period);
      if (cached && Date.now()-cached.loadedAt < r.refresh*1000) { r.phase = 'ready'; r.render(); r.schedule(); return; }
      if (r.retryAt > Date.now()) { r.render(); r.schedule(); return; }
      if (r.inFlight) { r.schedule(); return; }
      const generation = ++r.generation;
      const end = Date.now(), start = end-period*3600000;
      r.inFlight = true; r.phase = cached ? 'ready' : 'loading'; r.render();
      try {
        const history = await r.hass.callWS({type:'history/history_during_period',start_time:new Date(start).toISOString(),
          end_time:new Date(end).toISOString(),entity_ids:[...new Set([r.directionEntity,r.speedEntity].filter(Boolean))],
          include_start_time_state:true,minimal_response:true,no_attributes:true,significant_changes_only:false});
        if (r.disposed || generation !== r.generation) return;
        r.cache.set(period,{data:r.aggregate(history,start,end),loadedAt:Date.now()}); r.retryAt = 0; r.phase = 'ready';
      } catch (_) {
        if (r.disposed || generation !== r.generation) return;
        r.phase = 'error'; r.retryAt = Date.now()+r.refresh*1000;
      } finally {
        if (!r.disposed && generation === r.generation) { r.inFlight = false; r.render(); r.schedule(); }
      }
    };
    r.format = value => r.number.format(value);
    r.duration = milliseconds => {
      const minutes = Math.round(milliseconds/60000);
      return minutes < 60 ? r.format(minutes)+' min' : r.format(Math.floor(minutes/60))+' h'+(minutes%60 ? ' '+r.format(minutes%60)+' min' : '');
    };
    r.sectorPath = (index,radius,inner = 6) => {
      const point = (radius,degrees) => { const angle = (degrees-90)*Math.PI/180; return [160+radius*Math.cos(angle),160+radius*Math.sin(angle)].map(v => v.toFixed(2)).join(' '); };
      const a = index*22.5-9.5, b = index*22.5+9.5;
      return 'M '+point(inner,a)+' L '+point(radius,a)+' A '+radius.toFixed(2)+' '+radius.toFixed(2)+' 0 0 1 '+point(radius,b)+' L '+point(inner,b)+' A '+inner.toFixed(2)+' '+inner.toFixed(2)+' 0 0 0 '+point(inner,a)+' Z';
    };
    r.render = () => {
      if (r.disposed) return;
      const renderKey = [r.phase,r.period,r.cache.get(r.period)?.loadedAt,r.selected,r.hovered,r.formatKey,r.inFlight,r.showPeriodButtons].join('|');
      if (r.renderKey === renderKey) return;
      r.renderKey = renderKey;
      toolbar.hidden = !r.showPeriodButtons;
      text(dominantLabel,r.labels.dominant); text(frequencyLabel,r.labels.frequency);
      attr(tabs,'aria-label',r.labels.period); attr(svg,'aria-label',r.labels.rose);
      [1,24,168].forEach((hours,index) => {
        let node = r.tabNodes[index];
        if (!node) {
          node = create('button','swr-tab'); node.type = 'button'; tabs.append(node); r.tabNodes[index] = node;
          node.addEventListener('click',event => {
            event.stopPropagation(); if (r.period === hours) return;
            r.period = hours; r.selected = null; r.hovered = null; r.generation++; r.inFlight = false; r.retryAt = 0; r.load();
          });
        }
        text(node,r.labels.tabs[index]); attr(node,'aria-pressed',r.period === hours);
      });
      cardinals.forEach((el,index) => text(el,r.labels.cardinals[index]));
      const entry = r.cache.get(r.period), data = entry?.data;
      const ready = r.phase === 'ready' && data?.wind > 0;
      chart.hidden = !ready; status.hidden = ready; tooltip.hidden = true;
      const showBands = ready && r.speedEntity && r.speedFactor !== null;
      legend.hidden = !showBands; attr(svg,'data-speed-bands',Boolean(showBands));
      attr(legend,'aria-label',r.labels.speedBands);
      attr(canvas,'aria-busy',Boolean(r.inFlight));
      text(status,r.phase === 'ready' ? (data?.calm > 0 ? r.labels.calm : r.labels.empty) : r.labels[r.phase] || r.labels.loading);
      text(dominantValue,ready ? r.labels.directions[data.dominant] : r.phase === 'ready' && data?.calm > 0 ? r.labels.calmShort : '—');
      text(frequencyValue,ready ? r.format(data.bins[data.dominant]/data.wind*100)+' %' : '—');
      attr(footer,'title',data && r.phase === 'ready' ? r.labels.coverage+' '+r.duration(data.covered)+' / '+r.duration(data.end-data.start)+' · '+r.labels.calmShort+' '+r.duration(data.calm) : '');
      attr(footer,'aria-description',footer.getAttribute('title'));
      if (!ready) return;
      const maximum = Math.max(...data.bins);
      sectors.forEach((el,index) => {
        const duration = data.bins[index], percent = duration/data.wind*100;
        const title = r.labels.directions[index]+' · '+r.format(percent)+' %';
        const speedDetail = r.speedEntity && duration ? '\n'+r.labels.mean+' : '+r.format(data.speedTotals[index]/duration)+(r.speedUnit ? ' '+r.speedUnit : '')+
          '\n'+r.labels.maximum+' : '+r.format(data.speedMaxima[index])+(r.speedUnit ? ' '+r.speedUnit : '') : '';
        const description = title+' · '+r.duration(duration)+speedDetail;
        let cumulative = 0;
        const radius = amount => Math.sqrt(36+(118*118-36)*amount/maximum);
        bands[index].forEach((band,bandIndex) => {
          const amount = showBands ? data.speedBins[index][bandIndex] : 0;
          attr(band,'d',amount ? r.sectorPath(index,radius(cumulative+amount),radius(cumulative)) : '');
          cumulative += amount;
        });
        attr(el,'d',duration ? r.sectorPath(index,Math.sqrt(36+(118*118-36)*duration/maximum)) : '');
        attr(el,'tabindex',duration ? 0 : -1); attr(el,'aria-hidden',!duration);
        attr(el,'aria-label',description); attr(el,'aria-pressed',r.selected === index);
        if ((r.hovered ?? r.selected) === index && duration) {
          text(tooltip,speedDetail ? title+'\n'+r.labels.duration+' : '+r.duration(duration)+speedDetail : description); tooltip.hidden = false;
        }
      });
    };
  }
  r.hass = hass;
  const options = config.signature_wind_rose || {};
  const directionEntity = options.direction_entity || config.entity;
  const speedEntity = options.speed_entity || null;
  const speedUnit = String(hass.states[speedEntity]?.attributes?.unit_of_measurement || '').trim();
  const speedFactor = ({'km/h':1,'kmh':1,'kph':1,'m/s':3.6,'mph':1.609344,'mi/h':1.609344,'kn':1.852,'kt':1.852,'knots':1.852})[speedUnit.toLowerCase()] ?? null;
  const offset = numeric(options.direction_offset) ?? 0;
  const calmThreshold = Math.max(0,numeric(options.calm_threshold) ?? 0);
  const refresh = Math.max(60,numeric(options.refresh_interval) ?? 300);
  const defaultPeriod = [1,24,168].includes(Number(options.hours)) ? Number(options.hours) : 24;
  const showPeriodButtons = options.show_period_buttons !== false;
  const key = [directionEntity,speedEntity,speedUnit,offset,calmThreshold].join('|');
  if (r.dataKey !== key || r.connection !== hass.connection) {
    r.generation++; r.inFlight = false; r.retryAt = 0; r.cache.clear(); r.selected = null; r.hovered = null; r.renderKey = null;
    r.dataKey = key; r.connection = hass.connection; r.loadKey = null;
  }
  r.directionEntity = directionEntity; r.speedEntity = speedEntity; r.speedUnit = speedUnit; r.speedFactor = speedFactor;
  r.offset = offset; r.calmThreshold = calmThreshold; r.refresh = refresh;
  if (!r.period || r.defaultPeriod !== defaultPeriod || (!showPeriodButtons && r.period !== defaultPeriod)) {
    r.period = defaultPeriod; r.selected = null; r.hovered = null; r.generation++; r.inFlight = false; r.retryAt = 0; r.loadKey = null;
  }
  r.defaultPeriod = defaultPeriod; r.showPeriodButtons = showPeriodButtons;
  const language = localeFor(hass);
  const french = language.toLowerCase().startsWith('fr');
  const numberFormat = hass.locale?.number_format;
  const formatKey = language+'|'+numberFormat;
  if (r.formatKey !== formatKey) {
    r.number = formatterFor(hass,{maximumFractionDigits:1});
    r.formatKey = formatKey;
  }
  if (!r.labels || r.french !== french) {
    r.french = french;
    r.labels = french ? {
    dominant:'Dominant',frequency:'Fréquence',period:'Période',tabs:['1 h','1 jour','1 semaine'],cardinals:['N','E','S','O'],
    speedBands:'Durée par plage de vitesse en km/h : moins de 5, de 5 à moins de 10, de 10 à moins de 20, 20 ou plus',duration:'Durée',mean:'Moyenne',maximum:'Maximum',
    directions:['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'],
    rose:'Rose des vents : provenance du vent, fréquences par durée hors calme',coverage:'Données exploitables :',
    loading:'Chargement de l’historique…',empty:'Aucun historique exploitable',calm:'Vent calme sur la période enregistrée',calmShort:'Calme',
    error:'Historique indisponible',configuration:'Configurez une entité de direction du vent'
  } : {
    dominant:'Dominant',frequency:'Frequency',period:'Period',tabs:['1 h','1 day','1 week'],cardinals:['N','E','S','W'],
    speedBands:'Duration by speed range in km/h: below 5, 5 to below 10, 10 to below 20, 20 or above',duration:'Duration',mean:'Mean',maximum:'Maximum',
    directions:['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'],
    rose:'Wind rose: wind origin, time-weighted frequencies excluding calm',coverage:'Usable history:',
    loading:'Loading history…',empty:'No usable history',calm:'Calm wind during the recorded period',calmShort:'Calm',
    error:'History unavailable',configuration:'Configure a wind direction entity'
  };
  }
  // Template reads stay live; validate and write only when their result changes.
  const colorInput = renderValue(options.color,config.entity);
  if (r.colorInput !== colorInput) {
    r.colorInput = colorInput;
    const color = colorFor(colorInput,null);
    if (color) r.canvas.style.setProperty('--swr-accent',color); else r.canvas.style.removeProperty('--swr-accent');
  }
  const loadKey = key+'|'+defaultPeriod+'|'+refresh;
  if (!r.active()) r.clearTimer();
  else if (r.loadKey !== loadKey || (!r.timer && !r.inFlight)) { r.loadKey = loadKey; r.load(); }
  else r.render();
  return '';
