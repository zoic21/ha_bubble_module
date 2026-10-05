const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const YAML = require('yaml');
const {build, modules} = require('../../scripts/build-modules.cjs');
const {root, readSource} = require('../../scripts/source-files.cjs');

test('all ten modules have reproducible, autonomous distributions built from sources', async () => {
  assert.deepEqual(modules(), ['alert_manager', 'signature', 'signature-compact', 'signature-flow', 'signature-header',
    'signature-navigation', 'signature-room', 'signature-square', 'signature-weather', 'signature-wind-rose']);
  for (const folder of modules()) {
    const first = await build(folder), second = await build(folder);
    assert.equal(first.content, second.content, folder + ' is not deterministic');
    assert.equal(first.content, fs.readFileSync(path.join(root, first.file), 'utf8'), folder + ' has a stale distribution');
    const id = folder.replaceAll('-', '_');
    const definition = YAML.parse(first.content)[id];
    const source = YAML.parse(readSource(folder + '/src/module.yaml'));
    assert.deepEqual({...definition, code: undefined}, {...source, code: undefined}, folder + ' changed metadata or editor fields');
    assert.doesNotMatch(definition.code, /@include|@@MODULE_VERSION@@/);
    new Function('hass', 'onTeardown', 'renderTemplate', 'return `' + definition.code + '`;');
    if (['signature-flow', 'signature-weather', 'signature-wind-rose'].includes(folder))
      assert.ok(definition.code.includes("const version = '" + source.version + "';"), folder + ' runtime version differs');
  }
});

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(root, 'shared/test/includes-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const file = name => path.relative(root, path.join(directory, name));
  const write = (name, value) => fs.writeFileSync(path.join(directory, name), value);
  return {file, write};
}

test('nested includes preserve indentation and pick up subsequent common-source changes', t => {
  const {file, write} = fixture(t);
  write('leaf.js', 'const value = 1;\n');
  write('middle.js', 'if (ready) {\n  /* @include ' + file('leaf.js') + ' */\n}\n');
  write('root.js', '  /* @include ' + file('middle.js') + ' */\n');
  assert.equal(readSource(file('root.js')), '  if (ready) {\n    const value = 1;\n  }\n');
  write('leaf.js', 'const value = 2;\n');
  assert.ok(readSource(file('root.js')).includes('const value = 2;'));
});

test('missing, cyclic and out-of-repository includes fail instead of generating partial code', t => {
  const {file, write} = fixture(t);
  write('a.js', '/* @include ' + file('b.js') + ' */\n');
  assert.throws(() => readSource(file('a.js')), /ENOENT/);
  write('b.js', '/* @include ' + file('a.js') + ' */\n');
  assert.throws(() => readSource(file('a.js')), /Circular source include/);
  for (const outside of ['..', '../outside.js', '/tmp/outside.js'])
    assert.throws(() => readSource(outside), /Source outside repository/);
});

test('the shared formatter keeps Home Assistant preferences and explicit ungrouped numbers', () => {
  const {formatterFor} = new Function(readSource('shared/src/number-format.js') + '\nreturn {formatterFor};')();
  for (const [preference, locale] of Object.entries({comma_decimal: 'en-US', decimal_comma: 'de', space_comma: 'fr', quote_decimal: 'de-CH', none: 'en-US'})) {
    const options = {maximumFractionDigits: 1};
    const hass = {locale: {language: 'fr', number_format: preference}};
    const expected = new Intl.NumberFormat(locale, {...options, useGrouping: preference !== 'none'}).format(1234.5);
    assert.equal(formatterFor(hass, options).format(1234.5), expected);
  }
});
