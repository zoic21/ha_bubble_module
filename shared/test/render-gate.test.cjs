const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../src/render-gate.js'),'utf8');
const gate = (runtime,hasChanged) => new Function('runtime','hasChanged',source+'\nreturn renderChanged;')(runtime,hasChanged);

test('render gates retain a local fallback and separate field boundaries',()=>{
  const changed=gate({});
  assert.equal(changed('value','a','b'),true);
  assert.equal(changed('value','a','b'),false);
  assert.equal(changed('value','a\\u0001b'),true);
  assert.equal(changed('value','a','b'),true);
  assert.equal(changed('other','a','b'),true);
});
test('a fresh runtime always paints when the native module gate remembers old inputs',()=>{
  const keys=new Map(),native=(label,key)=>{const changed=keys.get(label)!==key;keys.set(label,key);return changed;};
  const first=gate({},native);
  assert.equal(first('value','same'),true);assert.equal(first('value','same'),false);
  const replacement=gate({},native);
  assert.equal(replacement('value','same'),true);assert.equal(replacement('value','same'),false);
  assert.equal(replacement('value','new'),true);
});
