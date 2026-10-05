const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readSource} = require('../../scripts/source-files.cjs');
const helpers = new Function('renderTemplate',readSource('shared/src/template-source.js')+'\n'+readSource('shared/src/number-precision.js')+'\n'+readSource('shared/src/number-format.js')+'\nreturn {sourceFor,renderValue,precisionFor,formatterFor};')((value,id)=>id+':'+value);

test('template sources resolve entity arguments, literal references and direct entities without guessing dynamic IDs',()=>{
  for (const input of ['{{ states(entity) }}',"{{ state_attr(entity, 'friendly_name') }}","{{ is_state(entity, 'on') }}","{{ is_state_attr(entity, 'mode', 'on') }}",'{{ has_value(entity) }}']) {
    const source=helpers.sourceFor(input,'sensor.main');
    assert.equal(source.entity,'sensor.main');assert.equal(source.main,true);assert.equal(source.direct,false);
  }
  for (const input of ["{{ states('sensor.other') }}",'{{ states.sensor.other.state }}',' sensor.other ']) assert.equal(helpers.sourceFor(input,'sensor.main').entity,'sensor.other');
  for (const input of ['Fixed text','{{ states(dynamic) }}','',null]) assert.equal(helpers.sourceFor(input,'sensor.main').entity,undefined);
  assert.equal(helpers.renderValue('{{ states(entity) }}','sensor.main'),'sensor.main:{{ states(entity) }}');
  assert.equal(helpers.renderValue(0),'0');
});

test('precision and locale honor registry choices including zero before suggestions and legacy metadata',()=>{
  const state={attributes:{suggested_display_precision:3,display_precision:4}};
  const hass={entities:{'sensor.main':{display_precision:0}},locale:{language:'fr-FR',number_format:'decimal_comma'}};
  assert.equal(helpers.precisionFor(hass,'sensor.main',state),0);
  delete hass.entities['sensor.main'];assert.equal(helpers.precisionFor(hass,'sensor.main',state),3);
  delete state.attributes.suggested_display_precision;assert.equal(helpers.precisionFor(hass,'sensor.main',state),4);
  assert.equal(helpers.formatterFor(hass,{maximumFractionDigits:2}).format(1234.56),'1.234,56');
  hass.locale.number_format='none';assert.equal(helpers.formatterFor(hass,{maximumFractionDigits:2}).format(1234.56),'1234.56');
});
