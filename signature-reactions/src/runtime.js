const host = this, root = host.card, version = '@@MODULE_VERSION@@';
const allowed = (users,id) => !Array.isArray(users) || !users.length || users.includes(id);
const options = host.config?.signature_reactions;
const user = hass?.user?.id;
const included = Array.isArray(host.config?.modules) ? host.config.modules.includes('signature_reactions')
  : host.config?.modules === 'signature_reactions';
const drop = immediate => {
  host._signatureReactions?.release(immediate);
  delete host._signatureReactions;delete host._signatureReactionsSkipped;
};
if (typeof onTeardown === 'function') onTeardown(() => drop(false));
// This gate MUST precede rule parsing, state reads, subscriptions, listeners,
// timers and the session registry. Untargeted accounts do no runtime work.
if (!root || !host.isConnected || !root.isConnected || host.editor || host.preview || host.inEditorPreview
    || !included || !options || options.enabled === false || !user || !allowed(options.users,user)) {
  drop(true); return '';
}
let link = host._signatureReactions;
const admin = !!hass.user?.is_admin;
// Cache inactive configurations too: repeated hass updates never re-read
// rules that cannot run for this account. No runtime/resources are created.
const cached = link || host._signatureReactionsSkipped;
if (cached && cached.version === version && cached.options === options && cached.connection === hass.connection
    && cached.user === user && cached.admin === admin && cached.root === root) {
  if (link) link.hass=hass;
  return '';
}
delete host._signatureReactionsSkipped;
const rules = Array.isArray(options.rules) ? options.rules : [];
const targeted = rules.filter(rule => rule && rule.enabled !== false && allowed(rule.users,user)
  && ['template','event','idle'].includes(rule.trigger)
  // Reject admin-only events before reading their payload or action config.
  && (rule.trigger !== 'event' || (admin && typeof rule.event_type === 'string' && rule.event_type.trim())));
if (!targeted.length || !hass.connection) {
  drop(true);host._signatureReactionsSkipped={version,options,connection:hass.connection,user,admin,root};return '';
}

// Content, rather than user-supplied IDs/scopes, identifies a configuration.
// This work happens only after user filtering and on real config changes.
const stable = value => Array.isArray(value) ? value.map(stable)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key,stable(value[key])])) : value;
const unique = new Map();
for (const source of targeted) {
  const {id,name,users,enabled,...rule} = source;
  if (rule.return_mode === 'previous') delete rule.return_action;
  if (rule.return_mode === 'previous' || rule.return_action) delete rule.return_mode;
  const key = JSON.stringify(stable(rule));
  if (!unique.has(key)) unique.set(key,rule);
}
const activeRules = [...unique.values()];
const signature = JSON.stringify([...unique.keys()]);
if (link && link.version === version && link.connection === hass.connection && link.user === user
    && link.root === root && link.engine.signature === signature) {
  link.options=options;link.admin=admin;link.hass=hass;return '';
}

/* @include signature-reactions/src/session.js */

let registry = window.__signatureReactions;
if (registry?.version !== version) {
  registry?.engines.forEach(engine => engine.dispose());
  registry = window.__signatureReactions = {version,connections:new WeakMap(),engines:new Set()};
}
let sessions = registry.connections.get(hass.connection);
if (!sessions) registry.connections.set(hass.connection,sessions = new Map());
const key = user + ':' + signature;
// Configuration references are immutable in Bubble. Serialize only on a real
// configuration change, never for each unrelated hass update.
if (link && (link.version !== version || link.options !== options || link.connection !== hass.connection || link.user !== user || link.root !== root)) {
  drop(true); link = null;
}
if (!link) {
  let engine = sessions.get(key);
  if (!engine) {
    engine = createReactionsSession(hass.connection,user,activeRules,signature,() => {
      if (sessions.get(key) === engine) sessions.delete(key);
      registry.engines.delete(engine);
    });
    sessions.set(key,engine); registry.engines.add(engine);
  }
  link = host._signatureReactions = {version,options,connection:hass.connection,user,admin,root,host,engine,hass,
    release(immediate) { engine.remove(this,immediate); }};
  engine.add(link);
}
link.hass = hass;
link.engine.start(link);
return '';
