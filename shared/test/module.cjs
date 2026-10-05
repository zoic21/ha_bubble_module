const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const YAML=require('yaml');

// Read the shipped YAML afresh; compilation and VM globals belong to each suite.
function loadModule(folder,file=path.resolve(__dirname,'../..',folder,'dist',folder+'.yaml')) {
  const id=folder.replaceAll('-','_');
  const definition=YAML.parse(fs.readFileSync(file,'utf8'))?.[id];
  assert.ok(definition && typeof definition==='object',`Missing module ${id} in ${file}`);
  assert.ok(typeof definition.code==='string' && definition.code.trim(),`Missing module code in ${file}`);
  return definition;
}
module.exports={loadModule};
