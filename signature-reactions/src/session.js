const createReactionsSession = (connection,user,rules,signature,onDispose) => {
  const owners = new Set(), entries = [], subscriptions = new Map(), renders = new Set();
  const seconds = value => { const n=Number(value);return Number.isFinite(n) && n>0 ? Math.min(n,86400)*1000 : 0; };
  const path = () => window.location.pathname + window.location.search + window.location.hash;
  const truth = value => value === true || value === 1 || ['true','on','yes','1'].includes(String(value).trim().toLowerCase());
  const match = (actual,expected) => !expected || Object.entries(expected).every(([key,value]) =>
    value && typeof value === 'object' && !Array.isArray(value) ? match(actual?.[key],value)
      : JSON.stringify(actual?.[key]) === JSON.stringify(value));
  const eventOptions = {capture:true,passive:true};
  let disposed=false, cleanup, lastActivity=Date.now(), suspension=false, epoch=0, activeReturn;
  const live = () => [...owners].find(owner => owner.host.isConnected && owner.root.isConnected
    && !owner.host.editor && !owner.host.preview && !owner.host.inEditorPreview
    && owner.host._hass?.user?.id === user && owner.host.config?.signature_reactions?.enabled !== false
    && owner.host.config?.signature_reactions === owner.options
    && allowed(owner.host.config?.signature_reactions?.users,user));
  const ready = () => !disposed && !suspension && connection.connected !== false && !!live();
  const warn = (entry,message) => {
    if (entry.warning === message) return;
    entry.warning=message;console.warn('Signature Reactions [règle '+entry.number+']: '+message);
  };
  const cancel = entry => {
    clearTimeout(entry.delayTimer);entry.delayTimer=undefined;entry.generation++;
    for (const render of [...renders]) if (render.entry===entry) render.cancel();
  };
  const subscribe = (key,message,callback) => {
    let sub=subscriptions.get(key);
    if (!sub) {
      sub={active:true,callbacks:new Set([callback])};subscriptions.set(key,sub);
      Promise.resolve(connection.subscribeMessage(value => {
        if (sub.active && !disposed) for (const fn of sub.callbacks) fn(value);
      },message)).then(unsubscribe => {
        if (sub.active) sub.unsubscribe=unsubscribe;
        else Promise.resolve(unsubscribe()).catch(()=>{});
      }).catch(() => {
        if (!sub.active || disposed) return;
        for (const entry of entries.values()) if (entry.subscription===key)
          warn(entry,'abonnement refusé ou indisponible ; vérifier la configuration et les droits.');
      });
    }
    sub.callbacks.add(callback);
  };
  const dispatch = (entry,action) => {
    const owner=live();
    if (!ready() || !owner || !action || typeof action !== 'object' || !action.action || action.action==='none') return false;
    // Delegate to HA's native action handler, exactly as Bubble's callAction.
    // PIN/confirmation companions on the carrier card remain in the event path.
    return owner.root.dispatchEvent(new CustomEvent('hass-action',{bubbles:true,composed:true,cancelable:true,
      detail:{action:'tap',config:{entity:entry.rule.entity || owner.host.config.entity,tap_action:action}}}));
  };
  const resolveAction = async (entry,config,generation) => {
    // Plain native action objects pay no template subscription cost. Templates
    // in action parameters are one-shot, only after this targeted rule fires.
    let failed=false;
    const data=entry.data;
    const visit=async value => {
      if (Array.isArray(value)) return Promise.all(value.map(visit));
      if (value && typeof value==='object') return Object.fromEntries(await Promise.all(
        Object.entries(value).map(async ([key,item])=>[key,await visit(item)])));
      if (typeof value!=='string' || !/\{[\{%#]/.test(value)) return value;
      return new Promise(resolve => {
        const render={active:true,entry};renders.add(render);
        const finish=result => {
          if (!render.active) return;
          render.active=false;clearTimeout(render.timer);renders.delete(render);
          if (render.unsubscribe) Promise.resolve(render.unsubscribe()).catch(()=>{});
          resolve(result);
        };
        render.cancel=()=>{failed=true;finish(undefined);};
        render.timer=setTimeout(render.cancel,10000);
        Promise.resolve(connection.subscribeMessage(message => {
          if (message?.error || !ready() || generation!==entry.generation) render.cancel();
          else finish(message?.result);
        },{type:'render_template',template:value,variables:{event:{data},user_id:user},report_errors:true}))
          .then(unsubscribe=>{if (render.active) render.unsubscribe=unsubscribe;else Promise.resolve(unsubscribe()).catch(()=>{});})
          .catch(render.cancel);
      });
    };
    const action=await visit(config);
    if (failed) {if (ready() && generation===entry.generation) warn(entry,'paramètre Jinja invalide ou indisponible ; action annulée.');return null;}
    return action;
  };
  const stopReturn = () => {
    if (!activeReturn) return;
    clearTimeout(activeReturn.timer);activeReturn=null;
  };
  const scheduleIdle = () => {
    for (const entry of entries.values()) if (entry.rule.trigger==='idle') {
      if (activeReturn) {clearTimeout(entry.idleTimer);entry.idleTimer=undefined;}
      if (!entry.idleTimer && !entry.idleFired && !activeReturn && !disposed) entry.idleTimer=setTimeout(() => {
        entry.idleTimer=undefined;
        if (Date.now()<lastActivity+seconds(entry.rule.seconds)) {scheduleIdle();return;}
        if (ready()) {entry.idleFired=true;fire(entry,{});}
      },Math.max(0,lastActivity+seconds(entry.rule.seconds)-Date.now()));
    }
  };
  const returnNow = () => {
    const saved=activeReturn;
    if (!saved || !ready()) return;
    stopReturn();
    if ((!saved.expected || path()===saved.expected) && saved.epoch===epoch) dispatch(saved.entry,saved.action);
    lastActivity=Date.now();scheduleIdle();
  };
  const navigatePath = value => {
    if (typeof value !== 'string' || !value || !/^(\/|\?|#)/.test(value) || value.startsWith('//')) return null;
    const url=new URL(value,window.location.href);
    return url.origin===window.location.origin ? url.pathname+url.search+url.hash : null;
  };
  const run = async (entry) => {
    if (!ready()) return;
    const {rule}=entry;
    const generation=entry.generation;
    const action=await resolveAction(entry,rule.action,generation);
    const customReturn=rule.return_mode==='action' || !!rule.return_action;
    const explicitReturn=customReturn ? await resolveAction(entry,rule.return_action,generation) : null;
    if (!ready() || generation!==entry.generation || !action || (customReturn && !explicitReturn)) return;
    const target=action.action==='navigate' ? navigatePath(action.navigation_path) : null;
    if (action.action==='navigate' && !target) { warn(entry,'destination interne invalide.');return; }
    const origin=activeReturn?.entry===entry ? activeReturn.origin : path();
    const duration=seconds(rule.return_after);
    const returnAction=customReturn ? explicitReturn
      : {action:'navigate',navigation_path:origin,navigation_replace:true};
    if (!dispatch(entry,action)) return;
    // A more-info action has no URL we can reliably restore. Its explicit
    // return_action is supported; previous-page return belongs to navigation.
    if (duration || rule.return_on_false) {
      if (!target && !customReturn) { warn(entry,'le retour précédent nécessite une action de navigation.');return; }
      stopReturn();
      activeReturn={entry,origin,expected:target,action:returnAction,epoch,
        deadline:duration ? Date.now()+duration : 0,landed:!target || path()===target};
      if (duration) activeReturn.timer=setTimeout(returnNow,duration);
    }
    lastActivity=Date.now();scheduleIdle();
  };
  const fire = (entry,data) => {
    if (!ready()) return;
    cancel(entry);entry.data=data;
    const generation=entry.generation;
    const delay=seconds(entry.rule.delay);
    if (delay) entry.delayTimer=setTimeout(() => {
      if (entry.generation===generation) run(entry);
    },delay);
    else run(entry);
  };
  const templateResult = (entry,message) => {
    if (message?.error) {
      cancel(entry);entry.seeded=false;entry.initial=false;
      warn(entry,'template invalide ; aucune action exécutée.');return;
    }
    const current=truth(message?.result),previous=entry.value,seeded=entry.seeded;
    const initial=entry.initial!==false;entry.initial=false;
    entry.value=current;entry.seeded=true;
    if (!ready()) return;
    if (current && (seeded ? !previous : initial && entry.rule.fire_on_load===true)) fire(entry,{});
    if (!current) {
      cancel(entry);
      if (entry.rule.return_on_false && activeReturn?.entry===entry) returnNow();
    }
  };
  const handleRoute = () => {
    if (!ready()) return;
    if (activeReturn?.expected && path()!==activeReturn.expected) {
      stopReturn(); // Leaving manually must never pull the user back later.
      lastActivity=Date.now();scheduleIdle();
    } else if (activeReturn) activeReturn.landed=true;
  };
  const activity = event => {
    // Synthetic rendering and navigation are not human activity.
    if (event.isTrusted===false || !ready()) return;
    lastActivity=Date.now();
    for (const entry of entries.values()) entry.idleFired=false;
    // Input updates only a timestamp. A running timeout rechecks its deadline;
    // pointermove/scroll never create one new timer for every animation frame.
    scheduleIdle();
  };
  const onDisconnect = () => {
    suspension=true;
    for (const entry of entries.values()) {entry.seeded=false;cancel(entry);}
  };
  const onReady = () => {
    suspension=false;
    for (const entry of entries.values()) entry.seeded=false;
    if (activeReturn?.deadline) {
      clearTimeout(activeReturn.timer);
      activeReturn.timer=setTimeout(returnNow,Math.max(0,activeReturn.deadline-Date.now()));
    }
    lastActivity=Date.now();scheduleIdle();
  };
  const hasIdle=rules.some(rule=>rule.trigger==='idle');
  const inputs=['pointerdown','pointermove','keydown','touchstart','touchmove','wheel','scroll'];
  const session={owners,signature,
    add(owner) {
      clearTimeout(cleanup);owners.add(owner);
      if (activeReturn?.deadline && activeReturn.deadline<=Date.now()) activeReturn.timer=setTimeout(returnNow,0);
      if (!activeReturn) scheduleIdle();
    },
    remove(owner,immediate) {
      owners.delete(owner);
      if (!owners.size) {
        clearTimeout(cleanup);
        if (immediate) session.dispose();
        else cleanup=setTimeout(()=>session.dispose(),20000);
      }
    },
    update(owner) {
      for (const entry of entries.values()) if (entry.entityEvent) {
        // Use Bubble's tracked hass only AFTER the account and rule gates.
        const state=owner.hass.states[entry.rule.entity];
        const token=state?.state;
        if (!state || !token || ['unknown','unavailable'].includes(token)) {entry.seeded=false;continue;}
        // Cards can render different hass snapshots during a view handoff.
        // Never interpret an older snapshot as a new occurrence.
        const revision=Date.parse(state.last_updated || state.last_changed || '');
        if (Number.isFinite(revision) && Number.isFinite(entry.revision) && revision<entry.revision) continue;
        if (Number.isFinite(revision)) entry.revision=revision;
        const old=entry.value,seeded=entry.seeded;entry.value=token;entry.seeded=true;
        const data=state.attributes?.data ?? state.attributes ?? {};
        if (seeded && token!==old && (!entry.rule.entity_event_type || state.attributes?.event_type===entry.rule.entity_event_type)
            && match(data,entry.rule.event_data)) fire(entry,data);
      }
    },
    dispose() {
      if (disposed) return;disposed=true;epoch++;
      clearTimeout(cleanup);stopReturn();
      for (const entry of entries.values()) {cancel(entry);clearTimeout(entry.idleTimer);}
      for (const sub of subscriptions.values()) {
        sub.active=false;if (sub.unsubscribe) Promise.resolve(sub.unsubscribe()).catch(()=>{});
      }
      for (const render of [...renders]) render.cancel();
      if (hasIdle) for (const name of inputs) window.removeEventListener(name,activity,eventOptions);
      window.removeEventListener('location-changed',handleRoute);window.removeEventListener('popstate',handleRoute);
      window.removeEventListener('hashchange',handleRoute);
      connection.removeEventListener?.('disconnected',onDisconnect);connection.removeEventListener?.('ready',onReady);
      owners.clear();onDispose();
    }
  };
  for (const rule of rules) {
    if (!rule.action?.action || !['template','event','idle'].includes(rule.trigger)) continue;
    const entityEvent=rule.trigger==='event' && !rule.event_type;
    if (entityEvent && (typeof rule.entity!=='string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(rule.entity))) continue;
    if (rule.trigger==='idle' && !seconds(rule.seconds)) continue;
    const entry={rule,number:entries.length+1,entityEvent,generation:0,seeded:false};entries.push(entry);
    if (rule.trigger==='template' || (rule.trigger==='event' && !entityEvent)) entry.start=true;
  }
  const update=session.update;
  session.update=owner => {
    if (disposed) return;
    if (owner.hass.user?.id!==user) {session.dispose();return;}
    for (const entry of entries.values()) if (entry.start) {
      entry.start=false;
      if (entry.rule.trigger==='template') {
        if (typeof entry.rule.template!=='string' || !entry.rule.template.trim()) continue;
        entry.subscription='template:'+entry.rule.template;
        subscribe(entry.subscription,{type:'render_template',template:entry.rule.template,variables:{user_id:user},report_errors:true},
          message=>templateResult(entry,message));
        continue;
      }
      // No forbidden request, even once, from a limited user's session.
      if (!owner.hass.user?.is_admin) {warn(entry,'événement direct réservé aux administrateurs ; utiliser le relais Template.');continue;}
      if (!entry.rule.event_type) continue;
      entry.subscription='event:'+entry.rule.event_type;
      subscribe(entry.subscription,{type:'subscribe_events',event_type:entry.rule.event_type},event => {
        if (ready() && match(event?.data,entry.rule.event_data)) fire(entry,event.data || {});
      });
    }
    update(owner);
  };
  if (hasIdle) for (const name of inputs) window.addEventListener(name,activity,eventOptions);
  window.addEventListener('location-changed',handleRoute);window.addEventListener('popstate',handleRoute);
  window.addEventListener('hashchange',handleRoute);
  connection.addEventListener?.('disconnected',onDisconnect);connection.addEventListener?.('ready',onReady);
  scheduleIdle();
  return session;
};
