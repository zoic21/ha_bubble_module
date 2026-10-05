const assert=require('node:assert/strict');
const {test}=require('node:test');
const YAML=require('yaml');
const {resolveFields,readModuleDefinition}=require('../../scripts/module-definition.cjs');

test('shared editor fields retain local overrides, field order and explicit empty/false/zero/null values',()=>{
  const fields={common:{label:'Shared',default:1,selector:{text:{}},description:'Shared help'}};
  const source={first:{$field:'common',default:0,description:''},second:{$field:'common',default:false},third:{$field:'common',default:null},fourth:{$field:'common',selector:{boolean:{}}}};
  const result=resolveFields(source,fields);
  assert.deepEqual(Object.keys(result),['first','second','third','fourth']);
  assert.equal(result.first.label,'Shared');assert.equal(result.first.default,0);assert.equal(result.first.description,'');
  assert.equal(result.second.default,false);assert.equal(result.third.default,null);
  assert.deepEqual(result.fourth.selector,{boolean:{}});
  assert.equal(fields.common.default,1);assert.equal(source.first.$field,'common');
  assert.ok(!JSON.stringify(result).includes('$field'));
});

test('shared field resolution preserves YAML aliases so repeated schemas stay compact',()=>{
  const source=YAML.parse('first: &schema\n  selector:\n    text: {}\nsecond: *schema\n');
  const result=resolveFields(source,{});
  assert.equal(result.first,result.second);
  assert.match(YAML.stringify(result),/second: \*/);
});

test('unknown, non-object and circular field definitions fail during build',()=>{
  for(const name of ['missing','constructor',false])assert.throws(()=>resolveFields({$field:name},{}),/Unknown shared editor field/);
  for(const field of [null,3,[]])assert.throws(()=>resolveFields({$field:'bad'},{bad:field}),/must be an object/);
  assert.throws(()=>resolveFields({$field:'a'},{a:{$field:'b'},b:{$field:'a'}}),/Circular shared editor field: a -> b -> a/);
});

test('presentation fields keep media/header exceptions and custom Header help outside the shared catalogue',()=>{
  const fields=folder=>readModuleDefinition(folder+'/src/module.yaml').editor.find(field=>field.fields).fields;
  const compact=fields('signature-compact'),square=fields('signature-square'),room=fields('signature-room'),header=fields('signature-header');
  assert.equal(compact.color.label,square.color.label);assert.deepEqual(compact.color.selector,header.color.selector);
  assert.match(compact.color.visible_if,/media-player/);assert.doesNotMatch(compact.icon_color.visible_if,/media-player/);
  assert.equal(room.color_thresholds,undefined);assert.deepEqual(Object.keys(header),['color','sub_button_styles']);
  assert.match(header.sub_button_styles.description,/titres de section/i);
});
