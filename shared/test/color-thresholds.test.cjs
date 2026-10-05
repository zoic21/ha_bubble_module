const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const source = fs.readFileSync(path.resolve(__dirname,'../src/color-thresholds.js'),'utf8');
const {prepareColorThresholds,resolveThresholdColor,thresholdNumber} = new Function(source + '\nreturn {prepareColorThresholds,resolveThresholdColor,thresholdNumber};')();
const values = [
  {value:15,color:'#2196f3'}, {value:19,color:'#4caf50'},
  {value:22,color:'#4caf50'}, {value:30,color:'#ff9800'}
];

test('RGB scale matches reference chart colors at anchors, midpoints, comfort plateau and clamps',()=>{
  const scale = prepareColorThresholds({values});
  // Golden outputs of Statistics Graph Chart Card's resolveValueColor/_lerpColor,
  // upstream commit 505b86aff381dc1c876e48b46924538ce121864b.
  for (const [value,color] of [
    [-100,'#2196f3'],[15,'#2196f3'],[16,'rgb(44,156,202)'],
    [17,'rgb(55,163,162)'],[18,'rgb(65,169,121)'],[19,'rgb(76,175,80)'],
    [20,'rgb(76,175,80)'],[22,'rgb(76,175,80)'],[26,'rgb(166,164,40)'],
    [30,'rgb(255,152,0)'],[100,'#ff9800']
  ]) assert.equal(resolveThresholdColor(value,scale),color,String(value));
});

test('arbitrary scales handle sorting, negative and fractional thresholds, short hex and RGB',()=>{
  const input = {values:[{value:2.5,color:'rgb(255, 255, 255)'},{value:-2.5,color:'#000'}]};
  const before = JSON.stringify(input), scale = prepareColorThresholds(input);
  assert.equal(resolveThresholdColor(0,scale),'rgb(128,128,128)');
  assert.equal(JSON.stringify(input),before);
  assert.equal(resolveThresholdColor(50,prepareColorThresholds({values:[{value:0,color:'rgb(0 0 0)'},{value:100,color:'#fff'}]})),'rgb(128,128,128)');
  assert.equal(resolveThresholdColor(15,prepareColorThresholds({values:[{value:10,color:'#f00'}]})),'#f00');
});

test('invalid values are neutral; invalid/disabled scales retain the normal card appearance',()=>{
  const scale = prepareColorThresholds({values});
  for (const value of [undefined,null,true,false,'',' ','unknown','unavailable','NaN','12 °C','12,5',Infinity,{},[]]) {
    assert.equal(thresholdNumber(value),null);
    assert.equal(resolveThresholdColor(value,scale),'var(--secondary-text-color)');
  }
  assert.equal(thresholdNumber('0'),0);assert.equal(thresholdNumber('-1.5'),-1.5);
  for (const options of [undefined,{}, {enabled:false,values}, {values:[]}, {values:[null,{value:null,color:'#fff'},{value:0,color:'garbage'},{value:1,color:'rgb(256,0,0)'}]}]) {
    assert.equal(prepareColorThresholds(options),null);
  }
  assert.equal(resolveThresholdColor(0,null),null);
});

test('hard transitions preserve reference chart boundary semantics and repeated thresholds',()=>{
  const scale = prepareColorThresholds({transition:'hard',values});
  assert.equal(resolveThresholdColor(19,scale),'#2196f3');
  assert.equal(resolveThresholdColor(19.001,scale),'#4caf50');
  assert.equal(resolveThresholdColor(30,scale),'#4caf50');
  assert.equal(resolveThresholdColor(30.001,scale),'#ff9800');
  const duplicate = prepareColorThresholds({values:[{value:0,color:'#000'},{value:0,color:'#f00'},{value:10,color:'#fff'}]});
  assert.equal(resolveThresholdColor(0,duplicate),'#000');
  assert.equal(resolveThresholdColor(5,duplicate),'rgb(255,128,128)');
});
