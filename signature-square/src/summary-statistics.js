// Optional daily total or percentage. Recorder's change accounts for meter
// resets; never subtract or sum the live cumulative entity states.
const statisticOptions = summary.statistics;
const sourceIds = value => Array.isArray(value)
  && value.every(id => typeof id === 'string' && id.length <= 200
    && /^[a-zA-Z0-9_]+[.:][a-zA-Z0-9_.:-]+$/.test(id))
  ? [...new Set(value)] : null;
const totalIds = sourceIds(statisticOptions?.statistic_ids);
const subtractIds = sourceIds(statisticOptions?.subtract_statistic_ids ?? []);
const partIds = sourceIds(statisticOptions?.part_statistic_ids ?? []);
const operation = statisticOptions?.operation ?? 'sum';
const statisticIds = [...new Set([...(totalIds || []),...(subtractIds || []),...(partIds || [])])];
const statisticsEnabled = !!totalIds?.length && subtractIds !== null && partIds !== null
  && statisticIds.length <= 16 && subtractIds.every(id => !totalIds.includes(id))
  && (operation === 'sum' && !partIds.length || operation === 'remaining_percentage'
    && partIds.length > 0 && partIds.every(id => totalIds.includes(id)));
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
  const zone = statisticOptions.time_zone || hass.config?.time_zone || 'UTC';
  let window;
  try { window = dailyWindow(Date.now(),zone); } catch { runtime.summaryStatistics = null; paint(null); return; }
  const key = JSON.stringify([totalIds,subtractIds,partIds,operation,zone,window.start]);
  let data = runtime.summaryStatistics;
  if (!data || data.key !== key) data = runtime.summaryStatistics = {key,value:null,lastAttempt:null,pending:false};
  data.paint = paint;
  paint(data.value);
  // Native hass updates drive refreshes. No timer, listener or observer is
  // added; a displayed summary makes at most one request per minute.
  if (data.pending || (data.lastAttempt !== null && window.end-data.lastAttempt < 60000)
      || typeof hass.callWS !== 'function') return;
  data.pending = true; data.lastAttempt = window.end;
  const current = () => this._dpRuntime === runtime && runtime.summaryStatistics === data;
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
      // Never display a partial result when one of the sources is missing.
      if (!values.length) { data.value = null; return; }
      totals.set(id,values.reduce((sum,row) => sum+row.change,0));
    }
    const sum = ids => ids.reduce((value,id) => value+totals.get(id),0);
    let total = sum(totalIds)-sum(subtractIds);
    if (operation === 'remaining_percentage') total = total > 0
      ? Math.max(0,Math.min(100,100*(1-sum(partIds)/total))) : NaN;
    data.value = Number.isFinite(total) && dailyWindow(Date.now(),zone).start === window.start ? total : null;
  }).catch(() => { if (current()) data.value = null; }).finally(() => {
    if (!current()) return;
    data.pending = false;
    data.paint(data.value);
  });
};
