const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {test}=require('node:test');
const {loadModule}=require('./module.cjs');

test('all nine standalone distributions resolve by their declared module ID',()=>{
  for(const folder of ['signature-compact','signature-square','signature-room','signature-header','signature-flow','signature-weather','signature-wind-rose','signature-navigation','alert_manager']) {
    const definition=loadModule(folder);assert.ok(definition.name);assert.ok(definition.version);
  }
});
test('distribution loading rejects incomplete YAML and reads regenerated files afresh',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bubble-module-test-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,'module.yaml');
  fs.writeFileSync(file,'signature_flow: {code: first}');assert.equal(loadModule('signature-flow',file).code,'first');
  fs.writeFileSync(file,'signature_flow: {code: second}');assert.equal(loadModule('signature-flow',file).code,'second');
  fs.writeFileSync(file,'other_module: {code: ignored}');assert.throws(()=>loadModule('signature-flow',file),/Missing module signature_flow/);
  for(const code of ['null','false','42','""']) {
    fs.writeFileSync(file,'signature_flow: {code: '+code+'}');assert.throws(()=>loadModule('signature-flow',file),/Missing module code/);
  }
  fs.writeFileSync(file,'signature_flow: [');assert.throws(()=>loadModule('signature-flow',file));
});
