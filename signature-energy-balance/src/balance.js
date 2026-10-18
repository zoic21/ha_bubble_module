// Match Panel's daily house balance and remaining_percentage operation.
// These are accounting contributions, not a claim about stored energy's origin.
const balanceGroups = ['imports','solar','discharges','exports','charges'];
const balanceSources = options => {
  const groups = {};
  for (const key of balanceGroups) {
    const ids = options[key] ?? [];
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || id.length > 200
        || !/^[a-zA-Z0-9_]+[.:][a-zA-Z0-9_.:-]+$/.test(id))) return null;
    groups[key] = [...new Set(ids)];
  }
  const ids = Object.values(groups).flat();
  return ids.length > 0 && ids.length <= 16 && new Set(ids).size === ids.length ? {groups,ids} : null;
};
const calculateEnergyBalance = (sources, totals) => {
  if (!sources || sources.ids.some(id => !Number.isFinite(totals.get(id)) || totals.get(id) < 0)) return null;
  const sum = key => sources.groups[key].reduce((value,id) => value + totals.get(id),0);
  const imports = sum('imports'), discharges = sum('discharges');
  const total = imports + sum('solar') + discharges - sum('exports') - sum('charges');
  if (!(total > 0) || !Number.isFinite(total)) return null;
  // Remove exports/storage input from solar first. If they exceed solar,
  // reduce the credited battery output, then cap grid at the house total.
  // This preserves Panel's bounded remaining share even during grid charging.
  const grid = Math.min(imports,total);
  const autonomous = Math.max(0,total-grid);
  const battery = Math.min(discharges,autonomous);
  const solar = Math.max(0,autonomous-battery);
  return {total,values:[grid,solar,battery],selfSufficiency:100*autonomous/total};
};
