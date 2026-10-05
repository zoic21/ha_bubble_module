  /* @include signature-flow/src/editor.js */
  const config = this.config || {};
  const options = config.signature_flow || {};
  const version = '@@MODULE_VERSION@@';
  const root = this.card;
  const host = this.elements?.mainContainer || root?.querySelector('.bubble-container');
  const enabled = root && host && (config.card_type || 'button') === 'button' && config.button_type !== 'slider';
  let runtime = this._signatureFlow;
  if (runtime && (runtime.version !== version || runtime.root !== root || runtime.host !== host || !enabled)) {
    runtime.dispose();
    runtime = null;
  }
  if (typeof onTeardown === 'function') onTeardown(() => this._signatureFlow?.dispose());
  if (!enabled) return '';
  const ids = [1,2,3,4,5,6];
  const slots = options.slots || {};
  const shown = id => Boolean(slots[id] && slots[id].enabled !== false);
  /* @include shared/src/dom.js */
  /* @include shared/src/color.js */
  /* @include shared/src/number-format.js */
  /* @include shared/src/number-precision.js */
  if (!runtime) {
    const canvas = create('div', 'sf-canvas');
    canvas.setAttribute('role', 'group');
    const wires = create('svg', 'sf-wires', true);
    wires.setAttribute('aria-hidden', 'true');
    canvas.appendChild(wires);
    runtime = this._signatureFlow = {version, root, host, canvas, wires, nodes: {}, edges: {}, sources: new Map(), formatters: new Map(), fitTargets: new Set()};
    const current = runtime;
    current.dispose = () => {
      current.observer?.disconnect();
      if (current.fitFrame !== undefined) cancelAnimationFrame(current.fitFrame);
      current.motionPreference?.removeEventListener('change', current.motionChanged);
      Object.values(current.edges).forEach(edge => edge.particles.forEach(particle => particle.animation?.cancel()));
      canvas.removeEventListener('keydown', current.keyboard);
      document.removeEventListener('keydown', current.modalityKey, true);
      document.removeEventListener('pointerdown', current.modalityPointer, true);
      canvas.remove();
      root.removeAttribute('data-signature-flow');
      if (this._signatureFlow === current) delete this._signatureFlow;
    };
    current.keyboard = event => {
      if (event.repeat || !['Enter', ' '].includes(event.key)) return;
      const target = event.target.closest?.('.bubble-action');
      if (!target || !canvas.contains(target) || target.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      event.stopPropagation();
      attr(canvas, 'data-sf-keyboard', '');
      const actionEvent = new Event('hass-action', {bubbles: true, composed: true});
      actionEvent.detail = {action: 'tap', config: {entity: target.dataset.entity,
        entity_id: target.dataset.entity, tap_action: JSON.parse(target.dataset.tapAction)}};
      target.dispatchEvent(actionEvent);
    };
    // HA can restore :focus-visible after a pointer-opened dialog closes.
    // Track the actual input mode without blurring the restored focus target.
    current.modalityKey = event => {if (event.key === 'Tab') attr(canvas, 'data-sf-keyboard', '');};
    current.modalityPointer = () => canvas.removeAttribute('data-sf-keyboard');
    document.addEventListener('keydown', current.modalityKey, true);
    document.addEventListener('pointerdown', current.modalityPointer, true);
    canvas.addEventListener('keydown', current.keyboard);
    host.appendChild(canvas);
    attr(root, 'data-signature-flow', '');
    current.motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const progress = particle => {
      const phase = (particle.animation?.currentTime ?? 0)%1000/1000;
      return particle.motionDirection < 0 ? 1-phase : phase;
    };
    const seek = (particle, position) => {
      particle.animation.currentTime = Math.min((particle.motionDirection < 0 ? 1-position : position)*1000,999.9999);
    };
    current.updateMotion = edge => {
      if (!edge.direction || edge.hidden || !edge.length || !edge.speed) {
        edge.particles.forEach(particle => {
          attr(particle.flow, 'display', 'none');
          if (current.motionPreference?.matches) {particle.animation?.cancel(); particle.animation = null;}
          else if (particle.animation && particle.animation.playState !== 'paused') particle.animation.pause();
        });
        return;
      }
      // Keep a readable gap even on short mobile connections. Allocate only
      // as needed, retaining the pool when the flow or available space falls.
      const count = Math.min(edge.demand,Math.max(1,Math.floor(edge.length/14)));
      const changed = edge.count !== count || edge.spacedLength !== edge.length;
      const anchor = edge.particles[0]?.animation ? progress(edge.particles[0]) : 0;
      while (edge.particles.length < count) {
        const flow = create('g', 'sf-flow', true), arrow = create('path', 'sf-arrow', true);
        attr(arrow, 'd', 'M-3 -3 L0 0 L-3 3'); flow.appendChild(arrow);
        flow.style.setProperty('offset-path', edge.motion);
        edge.group.appendChild(flow); edge.particles.push({flow});
      }
      const direction = edge.direction < 0 ? 'reverse' : 'normal';
      const rate = edge.speed/edge.length;
      edge.particles.forEach((particle,i) => {
        attr(particle.flow, 'display', i < count ? 'inline' : 'none');
        if (current.motionPreference?.matches) {
          particle.animation?.cancel(); particle.animation = null;
          const distance = (i+.5)/count*100+'%';
          if (particle.flow.style.getPropertyValue('offset-distance') !== distance)
            particle.flow.style.setProperty('offset-distance', distance);
          return;
        }
        if (i >= count) {
          if (particle.animation && particle.animation.playState !== 'paused') particle.animation.pause();
          return;
        }
        if (particle.flow.style.getPropertyValue('offset-distance') !== '0%')
          particle.flow.style.setProperty('offset-distance', '0%');
        const position = changed || !particle.animation ? (anchor+i/count)%1 : progress(particle);
        if (!particle.animation) {
          particle.animation = particle.flow.animate([{offsetDistance:'0%'},{offsetDistance:'100%'}],
            {duration:1000,iterations:Infinity,easing:'linear',direction});
          particle.motionDirection = edge.direction; particle.rate = null;
          seek(particle, position);
        } else if (particle.motionDirection !== edge.direction || changed) {
          // Reverse in place; count changes retain the first arrow and
          // redistribute the others evenly around it without restarting.
          if (particle.motionDirection !== edge.direction) particle.animation.effect.updateTiming({direction});
          particle.motionDirection = edge.direction; seek(particle, position);
        }
        if (particle.rate !== rate) {particle.animation.updatePlaybackRate(rate); particle.rate = rate;}
        if (particle.animation.playState === 'paused') particle.animation.play();
      });
      edge.count = count; edge.spacedLength = edge.length;
    };
    current.motionChanged = () => Object.values(current.edges).forEach(current.updateMotion);
    current.motionPreference?.addEventListener('change', current.motionChanged);
    // Fit only overflowing numbers. Batch text measurements into one frame.
    current.fitValues = id => {
      if (typeof requestAnimationFrame !== 'function') return;
      (id === undefined ? ids : [id]).forEach(key => current.fitTargets.add(key));
      if (current.fitFrame !== undefined) return;
      current.fitFrame = requestAnimationFrame(() => {
        delete current.fitFrame;
        const keys = [...current.fitTargets].filter(key => !current.nodes[key].el.hidden);
        const nodes = keys.map(key => current.nodes[key]);
        current.fitTargets.clear();
        nodes.forEach(node => {node.number.style.fontSize = '';});
        const sizes = nodes.map(node => {
          const width = node.number.getBoundingClientRect().width;
          const available = node.value.parentElement.getBoundingClientRect().width-node.unit.getBoundingClientRect().width-2;
          return width > available && available > 0 ? parseFloat(getComputedStyle(node.value).fontSize)*available/width : null;
        });
        nodes.forEach((node,i) => {if (sizes[i] !== null) node.number.style.fontSize = sizes[i]+'px';});
        current.updateLeftConnections(keys);
      });
    };
    current.updateLeftConnections = (keys = [1,2,3]) => {
      if (!current.center) return;
      const sources = keys.filter(key => [1,2,3].includes(key) && !current.edges[key].hidden &&
        (key === 2 || canvas.classList.contains('sf-narrow')));
      if (!sources.length) return;
      const {x,y} = current.center, left = canvas.getBoundingClientRect().left;
      const routes = sources.map(key => {
        const node = current.nodes[key], row = key === 2 ? y : current.center[key];
        const end = (node.unit.textContent ? node.unit : node.number).getBoundingClientRect().right;
        const start = Math.min(x-10,end-left+12);
        return [key,key === 2 ? [[start,y],[x,y]] : [[start,row],[x,row],[x,y]]];
      });
      routes.forEach(([key,points]) => current.route(key,points));
    };
    // Layout changes measure geometry; horizontal sources also follow their text.
    current.draw = () => {
      // Use the outer width so reduced padding cannot toggle itself on resize.
      const compact = host.getBoundingClientRect().width < 490;
      attr(root, 'data-signature-flow', compact ? 'compact' : '');
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      // Preserve density breakpoints while the canvas gains 8 horizontal pixels.
      const layoutWidth = box.width - (compact ? 8 : 0);
      canvas.classList.toggle('sf-narrow', layoutWidth < 460);
      canvas.classList.toggle('sf-small', layoutWidth < 352);
      const local = key => {
        const r = current.nodes[key].el.getBoundingClientRect();
        return {left:r.left-box.left, right:r.right-box.left, top:r.top-box.top,
          bottom:r.bottom-box.top, cx:(r.left+r.right)/2-box.left, cy:(r.top+r.bottom)/2-box.top};
      };
      const upper = local(1), lower = local(3), right = local(5);
      const x = box.width/2, y = box.height/2-4;
      current.center = {x,y,1:upper.cy,3:lower.cy};
      attr(wires, 'viewBox', '0 0 '+box.width+' '+box.height);
      const route = current.route = (key, points) => {
        const edge = current.edges[key];
        const d = points.map((p,i) => (i ? 'L' : 'M')+p.join(' ')).join(' ');
        if (edge.line.getAttribute('d') === d) return;
        // A moved origin retains the same path to the junction. Anchor the
        // arrow's distance from that end, including after the horizontal bend.
        const anchored = edge.length && edge.points?.length === points.length &&
          edge.points.slice(1).every((p,i) => p[0] === points[i+1][0] && p[1] === points[i+1][1]);
        const first = edge.particles[0];
        const remaining = anchored && first?.animation ? (1-progress(first))*edge.length : null;
        attr(edge.line, 'd', d);
        const motion = 'path("'+d+'")';
        edge.motion = motion;
        edge.particles.forEach(particle => particle.flow.style.setProperty('offset-path', motion));
        edge.length = points.slice(1).reduce((length,p,i) =>
          length+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
        edge.points = points; edge.start = points[0][0];
        if (remaining !== null && edge.length) seek(first,Math.max(0,Math.min(1,1-remaining/edge.length)));
        current.updateMotion(edge);
      };
      const narrow = canvas.classList.contains('sf-narrow');
      if (!current.edges[1].hidden && !narrow) route(1, canvas.classList.contains('sf-has-4') ?
        [[upper.right,upper.cy],[x,upper.cy],[x,y]] : [[x,upper.bottom],[x,y]]);
      current.updateLeftConnections();
      if (!current.edges[5].hidden) route(5, [[x,y],[right.left,y]]);
      if (!current.edges[3].hidden && !narrow) route(3, [[x,lower.top],[x,y]]);
      for (const id of [4,6]) {
        if (current.edges[id].hidden) continue;
        const r = local(id);
        route(id, id === 4 ? [[r.cx,r.bottom],[r.cx,right.top]] : [[r.cx,r.top],[r.cx,right.bottom]]);
      }
      current.fitValues();
      attr(current.junction, 'cx', x); attr(current.junction, 'cy', y);
    };
    for (const key of ids) {
      const el = create('div', 'sf-node sf-slot-'+key);
      const iconBox = create('span', 'sf-icon');
      const icon = create('ha-icon'); icon.setAttribute('aria-hidden', 'true'); iconBox.appendChild(icon);
      const content = create('span', 'sf-content');
      const label = create('span', 'sf-label');
      const value = create('span', 'sf-value');
      const number = create('span'); const unit = create('span', 'sf-unit'); value.append(number, unit);
      const secondary = create('span', 'sf-secondary');
      content.append(label, value, secondary); el.append(iconBox, content); canvas.appendChild(el);
      current.nodes[key] = {el, icon, label, value, number, unit, secondary};
      const line = create('path', 'sf-line', true), group = create('g', 'sf-edge', true);
      group.appendChild(line); wires.appendChild(group);
      current.edges[key] = {group, line, particles: []};
    }
    current.junction = create('circle', 'sf-junction', true); attr(current.junction, 'r', 3); wires.appendChild(current.junction);
    if (typeof ResizeObserver === 'function') {
      current.observer = new ResizeObserver(current.draw); current.observer.observe(canvas);
    }
  }
  const language = localeFor(hass);
  const french = language.toLowerCase().startsWith('fr');
  const labels = french ? {slot:'Emplacement',unavailable:'Indisponible',details:'Ouvrir les détails'} :
    {slot:'Slot',unavailable:'Unavailable',details:'Show details'};
  attr(runtime.canvas, 'aria-label', options.name || (french ? 'Flux' : 'Flows'));
  const render = (value,id = config.entity) => renderValue(value,id);
  /* @include shared/src/numeric-value.js */
  const read = id => id ? hass.states[id] : undefined;
  const source = value => {
    const input = String(value ?? '').trim();
    if (!runtime.sources.has(input)) {
      if (runtime.sources.size >= 32) runtime.sources.clear();
      runtime.sources.set(input,sourceFor(input));
    }
    const parsed = runtime.sources.get(input);
    return parsed.main ? {...parsed,entity:config.entity} : parsed;
  };
  const numberFormat = hass.locale?.number_format;
  const locale = numberLocaleFor(hass);
  const format = (value, digits) => {
    digits = Math.max(0, Math.min(6, numeric(digits) ?? 0));
    digits = Math.floor(digits);
    const key = [locale,numberFormat,digits].join('|');
    if (!runtime.formatters.has(key)) {
      if (runtime.formatters.size > 20) runtime.formatters.clear();
      runtime.formatters.set(key, formatterFor(hass,{minimumFractionDigits:digits,maximumFractionDigits:digits}));
    }
    return runtime.formatters.get(key).format(Object.is(value,-0) ? 0 : value);
  };
  const measurement = (cfg, prefix) => {
    const parsed = source(cfg[prefix]);
    const state = read(parsed.entity);
    const unit = cfg[prefix+'_unit'];
    let value, suffix = '';
    if (parsed.direct) {
      const raw = numeric(state?.state);
      const n = raw === null ? null : numeric(raw*(numeric(cfg[prefix+'_scale']) ?? 1));
      if (n !== null) {
        value = format(n,cfg[prefix+'_precision'] ?? precisionFor(hass,parsed.entity,state) ?? 0);
        suffix = String(unit ?? state?.attributes?.unit_of_measurement ?? '');
      } else {
        const unavailable = !state || ['','unknown','unavailable','NaN','Infinity','-Infinity'].includes(state.state);
        value = unavailable ? (prefix === 'primary' ? '—' : labels.unavailable) : state.state;
      }
    } else {
      value = render(parsed.input,parsed.entity).trim();
      if (value) suffix = String(unit ?? '');
      else if (prefix === 'primary') value = '—';
    }
    return {...parsed, state, value, unit:suffix};
  };
  const animation = options.animation || {};
  const defaultSpeed = Math.max(1,numeric(animation.speed) ?? 24);
  const defaultMaxArrows = Math.max(1,Math.min(12,Math.floor(numeric(animation.max_arrows) ?? 5)));
  const defaultReference = Math.max(1,numeric(animation.reference) ?? 10000);
  const bind = (el, id, cfg, fallback) => {
    const tap = cfg.tap_action || fallback;
    const hold = cfg.hold_action || (id ? {action:'more-info'} : {action:'none'});
    const double = cfg.double_tap_action || {action:'none'};
    const values = [['entity',id || ''],['tapAction',JSON.stringify(tap)],
      ['holdAction',JSON.stringify(hold)],['doubleTapAction',JSON.stringify(double)]];
    // Bubble caches a target's action handler after its first pointer use.
    // Replace only its shell when its binding changes, retaining the content.
    if (el.dataset.tapAction !== undefined && values.some(([key,value]) => el.dataset[key] !== value)) {
      const next = el.cloneNode(false);
      next.append(...el.childNodes); el.replaceWith(next); el = next;
    }
    el.classList.add('bubble-action');
    el.classList.toggle('bubble-action-enabled', [tap,hold,double].some(a => a.action !== 'none'));
    for (const [key,value] of values) if (el.dataset[key] !== value) el.dataset[key] = value;
    attr(el, 'role', 'button'); attr(el, 'tabindex', tap.action === 'none' ? -1 : 0);
    attr(el, 'aria-disabled', tap.action === 'none');
    return el;
  };
  const actions = (cfg,prefix) => ({tap_action:cfg[prefix+'_tap_action'],hold_action:cfg[prefix+'_hold_action'],
    double_tap_action:cfg[prefix+'_double_tap_action']});
  let geometryChanged = false;
  for (const key of ids) {
    const node = runtime.nodes[key], edge = runtime.edges[key], cfg = slots[key] || {};
    const hidden = !shown(key);
    if (node.el.hidden !== hidden) {node.el.hidden = hidden; geometryChanged = true;}
    const edgeHidden = hidden || ([4,6].includes(key) && !shown(5));
    if (edge.hidden !== edgeHidden) geometryChanged = true;
    edge.hidden = edgeHidden;
    attr(edge.group, 'display', edgeHidden ? 'none' : 'inline');
    if (hidden) {runtime.updateMotion(edge);continue;}
    const primary = measurement(cfg,'primary'), detail = measurement(cfg,'secondary');
    const flow = cfg.flow_entity ? read(cfg.flow_entity) : primary.direct ? primary.state : undefined;
    const rawFlow = numeric(flow?.state);
    const value = primary.value, unit = primary.unit;
    const name = render(cfg.name ?? primary.state?.attributes?.friendly_name ?? labels.slot+' '+key, primary.entity);
    const configuredColor = render(cfg.color ?? 'var(--secondary-text-color, #676767)', primary.entity).trim();
    const color = colorFor(configuredColor,'var(--secondary-text-color, #676767)');
    if (node.el.style.getPropertyValue('--sf-color') !== color) node.el.style.setProperty('--sf-color',color);
    if (edge.group.style.getPropertyValue('--sf-color') !== color) edge.group.style.setProperty('--sf-color',color);
    if (node.number.textContent !== value || node.unit.textContent !== (unit ? ' '+unit : '')) runtime.fitValues(key);
    text(node.label, name); text(node.number,value); text(node.unit,unit ? ' '+unit : '');
    const flowScale = numeric(cfg.flow_scale) ?? (cfg.flow_entity ? 1 : numeric(cfg.primary_scale) ?? 1);
    const signed = rawFlow === null ? null : numeric(rawFlow * flowScale * (cfg.invert_flow === true ? -1 : 1));
    const threshold = Math.max(0,numeric(cfg.deadband ?? options.deadband) ?? 0);
    const direction = cfg.animate === false || signed === null || Math.abs(signed) <= threshold ? 0 : Math.sign(signed);
    edge.direction = direction;
    attr(edge.group, 'data-direction', direction);
    const flowUnit = String(cfg.flow_unit ?? (cfg.flow_entity ? flow?.attributes?.unit_of_measurement :
      cfg.primary_unit ?? primary.state?.attributes?.unit_of_measurement) ?? '').trim();
    const slotAnimation = cfg.animation || {};
    const speed = Math.max(1,numeric(slotAnimation.speed) ?? defaultSpeed);
    const maxArrows = Math.max(1,Math.min(12,Math.floor(numeric(slotAnimation.max_arrows) ?? defaultMaxArrows)));
    const reference = Math.max(1,numeric(slotAnimation.reference) ?? defaultReference);
    const unitScale = flowUnit === 'kW' ? 1000 : flowUnit === 'MW' ? 1000000 : 1;
    const fraction = Math.min(1,Math.abs(signed ?? 0)*unitScale/reference);
    const level = 1+(maxArrows-1)*fraction;
    // A 0.1-arrow margin around each rounding boundary prevents flicker.
    if (edge.demand === undefined || Math.abs(level-edge.demand) > .6) edge.demand = Math.round(level);
    edge.demand = Math.min(maxArrows,Math.max(1,edge.demand));
    edge.speed = speed;
    runtime.updateMotion(edge);
    const secondary = detail.value+(detail.unit ? ' '+detail.unit : '');
    text(node.secondary,secondary); node.secondary.title = secondary;
    attr(node.icon, 'icon', render(cfg.icon ?? primary.state?.attributes?.icon ?? 'mdi:flash',primary.entity));
    attr(node.el, 'aria-label', name+' · '+value+(unit ? ' '+unit : '')+(secondary ? ' · '+secondary : ''));
    node.el = bind(node.el,primary.entity,cfg,primary.entity ? {action:'more-info'} : {action:'none'});
    node.value = bind(node.value,primary.entity,actions(cfg,'primary'),primary.entity ? {action:'more-info'} : {action:'none'});
    attr(node.value,'aria-label',labels.details+' · '+name);
    const secondaryActions = actions(cfg,'secondary');
    node.secondary = bind(node.secondary,detail.entity,secondaryActions,detail.entity ? {action:'more-info'} : {action:'none'});
    // Decorative secondary text must let taps reach its parent block.
    const secondaryInteractive = Boolean(secondary && (detail.entity || Object.values(secondaryActions).some(action => action && action.action !== 'none')));
    node.secondary.classList.toggle('sf-detail',secondaryInteractive);
    attr(node.secondary, 'tabindex', secondaryInteractive && node.secondary.getAttribute('aria-disabled') !== 'true' ? 0 : -1);
  }
  const hasUpperRight = shown(4);
  if (runtime.canvas.classList.contains('sf-has-4') !== hasUpperRight) {runtime.canvas.classList.toggle('sf-has-4',hasUpperRight);geometryChanged = true;}
  attr(runtime.junction,'display',[1,2,3,5].some(shown) ? 'inline' : 'none');
  if (!runtime.drawn || geometryChanged) {runtime.draw(); runtime.drawn = true;}
  const height = Math.max(280,Math.min(600,numeric(options.height) ?? 310));
  // Only configured height changes this CSS. Theme variables stay live in the browser.
  if (runtime.styleHeight === height) return runtime.styleCSS;
  runtime.styleHeight = height;
  runtime.styleCSS = `
/* @include signature-flow/src/presentation.css */
`;
  return runtime.styleCSS;
