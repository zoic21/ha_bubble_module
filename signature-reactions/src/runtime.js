const host = this, root = host.card, version = '@@MODULE_VERSION@@';
const allowed = (users,id) => !Array.isArray(users) || !users.length || users.includes(id);
const options = host.config?.signature_reactions;
const user = hass?.user?.id;
const included = Array.isArray(host.config?.modules) ? host.config.modules.includes('signature_reactions')
  : host.config?.modules === 'signature_reactions';
const drop = immediate => { host._signatureReactions?.release(immediate); delete host._signatureReactions; };
if (typeof onTeardown === 'function') onTeardown(() => drop(false));
// This gate MUST precede rule parsing, state reads, subscriptions, listeners,
// timers and the session registry. Untargeted accounts do no runtime work.
if (!root || !host.isConnected || !root.isConnected || host.editor || host.preview || host.inEditorPreview
    || !included || !options || options.enabled === false || !user || !allowed(options.users,user)) {
  drop(true); return '';
}
let link = host._signatureReactions;
// Ordinary hass updates take this short path: no rule traversal, signatures,
// registry work or recreated session closures when configuration is unchanged.
if (link && link.version === version && link.options === options && link.connection === hass.connection
    && link.user === user && link.root === root) {
  link.hass=hass;link.engine.update(link);return '';
}
const rules = Array.isArray(options.rules) ? options.rules : [];
const targeted = rules.filter(rule => rule && rule.enabled !== false && allowed(rule.users,user));
if (!targeted.length || !hass.connection) { drop(true); return ''; }

/* @include signature-reactions/src/session.js */

let registry = window.__signatureReactions;
if (registry?.version !== version) {
  registry?.engines.forEach(engine => engine.dispose());
  registry = window.__signatureReactions = {version,connections:new WeakMap(),engines:new Set()};
}
let scopes = registry.connections.get(hass.connection);
if (!scopes) registry.connections.set(hass.connection,scopes = new Map());
const key = user + ':' + (options.scope || 'main');
// Configuration references are immutable in Bubble. Serialize only on a real
// configuration change, never for each unrelated hass update.
if (link && (link.version !== version || link.options !== options || link.connection !== hass.connection || link.user !== user || link.root !== root)) {
  drop(true); link = null;
}
if (!link) {
  const signature = JSON.stringify(targeted);
  let engine = scopes.get(key);
  if (engine && engine.signature !== signature) {
    if (!engine.owners.size) engine.dispose();
    else { console.warn('Signature Reactions: règles différentes pour la même portée ; copie ignorée.'); return ''; }
    engine = null;
  }
  if (!engine) {
    engine = createReactionsSession(hass.connection,user,targeted,signature,() => {
      if (scopes.get(key) === engine) scopes.delete(key);
      registry.engines.delete(engine);
    });
    scopes.set(key,engine); registry.engines.add(engine);
  }
  link = host._signatureReactions = {version,options,connection:hass.connection,user,root,host,engine,hass,
    release(immediate) { engine.remove(this,immediate); }};
  engine.add(link);
}
link.hass = hass;
link.engine.update(link);
return '';
