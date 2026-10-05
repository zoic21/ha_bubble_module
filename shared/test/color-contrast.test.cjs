const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const source = ['color-thresholds','color-contrast'].map(name => fs.readFileSync(path.join(__dirname,'../src',name+'.js'),'utf8')).join('\n');
const helper = vm.runInNewContext('(function(){'+source+';return {rgbLuminance,readableForegroundCSS};})()');

test('contrast uses linear-light sRGB luminance, not an average or display brightness',()=>{
  assert.equal(helper.rgbLuminance([0,0,0]),0);
  assert.equal(helper.rgbLuminance([255,255,255]),1);
  assert.equal(helper.rgbLuminance([255,0,0]),.2126);
  assert.ok(Math.abs(helper.rgbLuminance([128,128,128])-.2158605001)<1e-9);
});
test('contrast CSS preserves live theme tokens with an opaque accessible legacy fallback',()=>{
  for(const [background,fallback]of [['#fff','#000'],['#000','#fff'],['#2196f3','#000']]){
    const css=helper.readableForegroundCSS('.icon',background,'var(--primary-text-color,#212121)');
    assert.ok(css.startsWith('.icon { color:'+fallback+' !important; }'));
    assert.match(css,/@supports \(color:color\(from rgb\(from #fff/);
    assert.match(css,/color:color\(from rgb\(from var\(--primary-text-color,#212121\)/);
    assert.match(css,/r \* alpha/);
    assert.doesNotMatch(css,/getComputedStyle|MutationObserver|setInterval/);
  }
  assert.equal(helper.readableForegroundCSS('.icon','var(--neutral)','var(--primary-text-color)'),'.icon { color:var(--primary-text-color) !important; }');
});
