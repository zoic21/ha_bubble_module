// Recorder daily totals share the proven timezone/reset handling of energy summaries.
const dailyPanelStatistics = (summary, runtime, paint) => {
const panelRuntime = this._dpRuntime;
// Optional daily total or percentage. Recorder's change accounts for meter
// resets; never subtract or sum the live cumulative entity states.
const statisticOptions = summary.statistics;
const sourceIds = value => Array.isArray(value)
  && value.every(id => typeof id === 'string' && id.length <= 200
    && /^[a-zA-Z0-9_]+[.:][a-zA-Z0-9_.:-]+$/.test(id))
  ? [...new Set(value)] : null;
const statisticsConfig = options => {
  const totalIds = sourceIds(options?.statistic_ids);
  const subtractIds = sourceIds(options?.subtract_statistic_ids ?? []);
  const partIds = sourceIds(options?.part_statistic_ids ?? []);
  const operation = options?.operation ?? 'sum';
  const factor = options?.factor ?? 1;
  const ids = [...new Set([...(totalIds || []),...(subtractIds || []),...(partIds || [])])];
  return !!totalIds?.length && subtractIds !== null && partIds !== null
    && ids.length <= 16 && subtractIds.every(id => !totalIds.includes(id))
    && typeof factor === 'number' && Number.isFinite(factor) && factor > 0
    && (operation === 'sum' && !partIds.length || operation === 'remaining_percentage'
      && partIds.length > 0 && partIds.every(id => totalIds.includes(id)))
    ? {totalIds,subtractIds,partIds,operation,factor,ids} : null;
};
const primaryStatistics = statisticsConfig(statisticOptions);
const statisticsEnabled = !!primaryStatistics;
const statisticsZone = statisticOptions?.time_zone || hass.config?.time_zone || 'UTC';
const secondaryStatisticsMode = statisticsEnabled && summary.secondary_statistics != null;
let secondaryStatistics = secondaryStatisticsMode ? statisticsConfig(summary.secondary_statistics) : null;
if (secondaryStatistics && ((summary.secondary_statistics.time_zone || statisticsZone) !== statisticsZone
    || new Set([...primaryStatistics.ids,...secondaryStatistics.ids]).size > 16)) secondaryStatistics = null;
const statisticIds = [...new Set([...(primaryStatistics?.ids || []),...(secondaryStatistics?.ids || [])])];
// Keep source reads visible to Bubble's native dependency tracking.
for (const id of statisticIds) hass.states[id];
const dailyWindow = (stamp, zone) => {
  if (runtime.summaryStatisticsZone !== zone) {
    runtime.summaryStatisticsFormatter = new Intl.DateTimeFormat('en-CA', {timeZone:zone,
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    runtime.summaryStatisticsZone = zone;
    runtime.summaryStatisticsDay = null;
  }
  const formatter = runtime.summaryStatisticsFormatter;
  const parts = time => Object.fromEntries(formatter.formatToParts(time)
    .filter(part => part.type !== 'literal').map(part => [part.type,Number(part.value)]));
  const current = parts(stamp);
  const midnight = Date.UTC(current.year,current.month-1,current.day);
  if (runtime.summaryStatisticsDay === midnight) return {start:runtime.summaryStatisticsStart,end:stamp};
  let start = midnight;
  // Resolve local midnight with its own offset, including DST transition days.
  for (let i=0;i<3;i++) {
    const p = parts(start);
    const offset = Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-start;
    start = midnight-offset;
  }
  runtime.summaryStatisticsDay = midnight;
  runtime.summaryStatisticsStart = start;
  return {start,end:stamp};
};
const dailyStatistics = paint => {
  const zone = statisticsZone;
  let window;
  try { window = dailyWindow(Date.now(),zone); } catch { runtime.summaryStatistics = null; paint(null,null); return; }
  const connection = hass.connection || hass;
  const user = hass.user?.id || '';
  const key = JSON.stringify([primaryStatistics,secondaryStatistics,zone,window.start,user]);
  let data = runtime.summaryStatistics;
  if (!data || data.key !== key || data.connection !== connection)
    data = runtime.summaryStatistics = {key,connection,value:null,secondaryValue:null,awaiting:null};
  data.paint = paint;
  const current = () => this._dpRuntime === panelRuntime && runtime.summaryStatistics === data
    && panelRuntime.information.includes(runtime) && data.entry === entry;
  // Keep Recorder results, not card callbacks or operation-specific totals.
  // The connection/user/day boundary prevents cross-account or stale-day reuse.
  const symbol = Symbol.for('ha.signature.panel.statistics.v1');
  const shared = globalThis[symbol] || (globalThis[symbol] = new WeakMap());
  let cache = shared.get(connection);
  if (!cache) shared.set(connection,cache = new Map());
  const queryKey = JSON.stringify([user,zone,window.start,[...statisticIds].sort()]);
  let entry = cache.get(queryKey);
  if (!entry) {
    // Bounded across dashboard navigation; in-flight consumers retain their
    // own promise if an older entry must be evicted.
    for (const [id,value] of cache)
      if (!value.promise && window.end-value.lastAttempt >= 60000) cache.delete(id);
    while (cache.size >= 128) cache.delete(cache.keys().next().value);
    entry = {lastAttempt:null,totals:null,promise:null};
    cache.set(queryKey,entry);
  }
  data.entry = entry;
  const apply = (checkDay = true) => {
    if (!current()) return;
    let sameDay = !checkDay;
    if (checkDay) try { sameDay = dailyWindow(Date.now(),zone).start === window.start; } catch {}
    const calculate = config => {
      const totals = entry.totals;
      if (!config || !sameDay || !totals || config.ids.some(id => !Number.isFinite(totals.get(id)))) return null;
      const sum = ids => ids.reduce((value,id) => value+totals.get(id),0);
      let total = sum(config.totalIds)-sum(config.subtractIds);
      if (config.operation === 'remaining_percentage') total = total > 0
        ? Math.max(0,Math.min(100,100*(1-sum(config.partIds)/total))) : NaN;
      total *= config.factor;
      return Number.isFinite(total) ? total : null;
    };
    data.value = calculate(primaryStatistics);
    data.secondaryValue = calculate(secondaryStatistics);
    data.paint(data.value,data.secondaryValue);
  };
  // Reuse a fresh result synchronously when a card or operation is recreated.
  // Native hass updates still drive the one-minute refresh; no timer is added.
  if (!entry.promise && (entry.lastAttempt === null || window.end-entry.lastAttempt >= 60000)
      && typeof hass.callWS === 'function') {
    entry.lastAttempt = window.end;
    const request = {type:'recorder/statistics_during_period',
      start_time:new Date(window.start).toISOString(),end_time:new Date(window.end).toISOString(),
      statistic_ids:statisticIds,period:'5minute',types:['change']};
    entry.promise = Promise.resolve().then(() => hass.callWS(request)).then(result => {
      const totals = new Map();
      for (const id of statisticIds) {
        const rows = Array.isArray(result?.[id]) ? result[id] : [];
        let total = 0, found = false;
        for (const row of rows) {
          const time = new Date(row.start).getTime();
          if (time >= window.start && time < window.end && typeof row.change === 'number' && Number.isFinite(row.change)) {
            total += row.change; found = true;
          }
        }
        totals.set(id,found ? total : NaN);
      }
      entry.totals = totals;
    }).catch(() => { entry.totals = null; }).finally(() => { entry.promise = null; });
  }
  // Read the day once per style pass; async completion checks it again before paint.
  apply(false);
  if (entry.promise && data.awaiting !== entry.promise) {
    const pending = data.awaiting = entry.promise;
    pending.then(() => { if (data.awaiting === pending) data.awaiting = null; apply(); });
  }
};

if (statisticsEnabled) dailyStatistics(paint);
else { runtime.summaryStatistics = null; paint(null,null); }
};
