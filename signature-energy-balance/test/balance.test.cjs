const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');
const source = fs.readFileSync(require.resolve('../src/balance.js'),'utf8');
const {balanceSources,calculateEnergyBalance} = vm.runInNewContext(source+';({balanceSources,calculateEnergyBalance})');
const config = {imports:['sensor.hc','sensor.hp'],solar:['sensor.roof','sensor.balcony'],
  discharges:['sensor.pro_out','sensor.ac_out'],exports:['sensor.export'],charges:['sensor.pro_in','sensor.ac_in']};
const sources = balanceSources(config);
const totalsFor = amounts => new Map(sources.ids.map((id,i) => [id,amounts[i]]));
const near = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-9,actual+' != '+expected);

test('the reported mismatch is removed by excluding exports and battery charging',()=>{
  // Synthetic reconstruction of 79.4% grid / 16.7% solar / 3.9% battery.
  const balance = calculateEnergyBalance(sources,totalsFor([4,3.94,1,.67,.2,.19,.1,.25,.2]));
  near(balance.total,9.45);
  near(balance.values[0],7.94);near(balance.values[1],1.12);near(balance.values[2],.39);
  assert.equal(Math.round(balance.selfSufficiency),16);
  near(100-100*balance.values[0]/balance.total,balance.selfSufficiency);
  assert.ok(balance.selfSufficiency<20.6);
});

test('contributions stay positive, sum to house consumption and match the actual Panel calculation',async()=>{
  const panelSource = fs.readFileSync(require.resolve('../../signature-panel/src/statistics.js'),'utf8');
  const scenarios = [
    [2,4,10,4,3,1,2,1,1], // mixed production, export and charge
    [5,5,1,1,1,0,0,4,4], // grid charging: imports exceed house consumption
    [0,0,0,0,3,2,0,0,0], // discharge stored before today's window
    [0,0,1,0,3,2,2,0,0], // exports exceed today's solar
    [1,3,0,0,0,0,0,0,0], // all grid
    [0,0,2,3,0,0,0,0,0], // all solar
    [0,0,0,0,0,0,0,0,0], // zero denominator
    [0,0,0,0,0,0,2,0,0] // invalid negative consumption
  ];
  for (const amounts of scenarios) {
    const totals = totalsFor(amounts), balance = calculateEnergyBalance(sources,totals);
    const runtime = {},ctx = {_dpRuntime:{information:[runtime]}};
    const hass = {config:{time_zone:'Europe/Paris'},states:{},callWS:async req => Object.fromEntries(
      req.statistic_ids.map(id=>[id,[{start:req.start_time,change:totals.get(id)}]]))};
    const factory = new Function('hass',panelSource+';return dailyPanelStatistics;');
    const statistics = {statistic_ids:[...config.imports,...config.solar,...config.discharges],
      subtract_statistic_ids:[...config.exports,...config.charges],part_statistic_ids:config.imports,
      operation:'remaining_percentage',time_zone:'Europe/Paris'};
    let percentage;
    factory.call(ctx,hass)({statistics},runtime,value=>percentage=value);
    await new Promise(resolve=>setImmediate(resolve));
    if (!balance) {assert.equal(percentage,null);continue;}
    near(balance.selfSufficiency,percentage);
    near(balance.values.reduce((a,b)=>a+b,0),balance.total);
    near(balance.values[0]/balance.total+percentage/100,1);
    assert.ok(balance.values.every(value=>value>=0&&value<=balance.total));
  }
});

test('missing meters never become partial totals or invented percentages',()=>{
  for (const bad of [NaN,Infinity,undefined,-1]) {
    const totals = totalsFor(Array(9).fill(1));totals.set('sensor.export',bad);
    assert.equal(calculateEnergyBalance(sources,totals),null);
  }
  assert.equal(balanceSources({imports:['sensor.a'],solar:['sensor.a']}),null);
  assert.equal(balanceSources({imports:['bad id']}),null);
  assert.equal(balanceSources({imports:'sensor.a'}),null);
  assert.equal(balanceSources({}),null);
});

test('a large range of valid flows preserves the bounded daily percentage',()=>{
  for (let grid=0;grid<=12;grid+=2) for(let solar=0;solar<=12;solar+=2)
    for(let discharge=0;discharge<=6;discharge+=2) for(let charge=0;charge<=12;charge+=3)
      for(let exported=0;exported<=12;exported+=3) {
        const balance=calculateEnergyBalance(sources,totalsFor([grid,0,solar,0,discharge,0,exported,charge,0]));
        const total=grid+solar+discharge-exported-charge;
        if(total<=0){assert.equal(balance,null);continue;}
        near(balance.total,total);near(balance.values.reduce((a,b)=>a+b,0),total);
        near(balance.selfSufficiency,Math.max(0,Math.min(100,100*(1-grid/total))));
        assert.ok(balance.values.every(value=>value>=0));
      }
});
