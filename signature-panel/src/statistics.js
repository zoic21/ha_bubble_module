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
  }
  const formatter = runtime.summaryStatisticsFormatter;
  const parts = time => Object.fromEntries(formatter.formatToParts(time)
    .filter(part => part.type !== 'literal').map(part => [part.type,Number(part.value)]));
  const current = parts(stamp);
  const midnight = Date.UTC(current.year,current.month-1,current.day);
  let start = midnight;
  // Resolve local midnight with its own offset, including DST transition days.
  for (let i=0;i<3;i++) {
    const p = parts(start);
    const offset = Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-start;
    start = midnight-offset;
  }
  return {start,end:stamp};
};
const dailyStatistics = paint => {
  const zone = statisticsZone;
  let window;
  try { window = dailyWindow(Date.now(),zone); } catch { runtime.summaryStatistics = null; paint(null,null); return; }
  const key = JSON.stringify([primaryStatistics,secondaryStatistics,zone,window.start]);
  let data = runtime.summaryStatistics;
  if (!data || data.key !== key) data = runtime.summaryStatistics = {key,value:null,secondaryValue:null,lastAttempt:null,pending:false};
  data.paint = paint;
  paint(data.value,data.secondaryValue);
  // Native hass updates drive refreshes. No timer, listener or observer is
  // added; a displayed summary makes at most one request per minute.
  if (data.pending || (data.lastAttempt !== null && window.end-data.lastAttempt < 60000)
      || typeof hass.callWS !== 'function') return;
  data.pending = true; data.lastAttempt = window.end;
  const current = () => this._dpRuntime === panelRuntime && runtime.summaryStatistics === data && panelRuntime.information.includes(runtime);
  const request = {type:'recorder/statistics_during_period',
    start_time:new Date(window.start).toISOString(),end_time:new Date(window.end).toISOString(),
    statistic_ids:statisticIds,period:'5minute',types:['change']};
  Promise.resolve().then(() => hass.callWS(request)).then(result => {
    if (!current()) return;
    const totals = new Map();
    for (const id of statisticIds) {
      const rows = Array.isArray(result?.[id]) ? result[id] : [];
      const values = rows.filter(row => {
        const time = new Date(row.start).getTime();
        return time >= window.start && time < window.end
          && typeof row.change === 'number' && Number.isFinite(row.change);
      });
      totals.set(id,values.length ? values.reduce((sum,row) => sum+row.change,0) : NaN);
    }
    const calculate = config => {
      if (!config || dailyWindow(Date.now(),zone).start !== window.start) return null;
      // Each measurement is complete or unavailable independently of the other.
      if (config.ids.some(id => !Number.isFinite(totals.get(id)))) return null;
      const sum = ids => ids.reduce((value,id) => value+totals.get(id),0);
      let total = sum(config.totalIds)-sum(config.subtractIds);
      if (config.operation === 'remaining_percentage') total = total > 0
        ? Math.max(0,Math.min(100,100*(1-sum(config.partIds)/total))) : NaN;
      total *= config.factor;
      return Number.isFinite(total) ? total : null;
    };
    data.value = calculate(primaryStatistics);
    data.secondaryValue = calculate(secondaryStatistics);
  }).catch(() => { if (current()) data.value = data.secondaryValue = null; }).finally(() => {
    if (!current()) return;
    data.pending = false;
    data.paint(data.value,data.secondaryValue);
  });
};

if (statisticsEnabled) dailyStatistics(paint);
else { runtime.summaryStatistics = null; paint(null,null); }
};
