const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const YAML = require('yaml');
const {build, modules} = require('../../scripts/build-modules.cjs');
const {root, readSource} = require('../../scripts/source-files.cjs');

test('all nine modules have reproducible, autonomous distributions built from sources', async () => {
  assert.deepEqual(modules(), ['alert_manager', 'signature-compact', 'signature-flow', 'signature-header',
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
      assert.match(definition.code, new RegExp('[\'"]' + source.version.replaceAll('.', '\\.') + '[\'"]'), folder + ' runtime version differs');
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

test('parameterized CSS includes keep defaults local and pass overrides through nested fragments', t => {
  const {file, write} = fixture(t);
  write('leaf.css', '/* @defaults {"PROPERTY":"border-radius","IMPORTANT":""} */\n@@PROPERTY@@: var(--signature-card-border-radius, 22px)@@IMPORTANT@@;\n');
  write('middle.css', '/* @defaults {"PROPERTY":"--bubble-border-radius"} */\n/* @include ' + file('leaf.css') + ' {"PROPERTY":"@@PROPERTY@@","IMPORTANT":" !important"} */\n');
  write('root.css', '.a {\n  /* @include ' + file('middle.css') + ' */\n}\n.b {\n  /* @include ' + file('leaf.css') + ' */\n}\n');
  assert.equal(readSource(file('root.css')), '.a {\n  --bubble-border-radius: var(--signature-card-border-radius, 22px) !important;\n}\n.b {\n  border-radius: var(--signature-card-border-radius, 22px);\n}\n');
  // A common CSS edit reaches each use without changing its selector or priority.
  write('leaf.css', '/* @defaults {"PROPERTY":"border-radius","IMPORTANT":""} */\n@@PROPERTY@@: var(--signature-card-border-radius, 24px)@@IMPORTANT@@;\n');
  assert.equal((readSource(file('root.css')).match(/24px/g) || []).length, 2);
});

test('bad CSS fragment arguments and unresolved required parameters stop the build', t => {
  const {file, write} = fixture(t);
  write('fragment.css', '/* @defaults {"IMPORTANT":""} */\ncolor: @@COLOR@@@@IMPORTANT@@;\n');
  for (const [argumentsJSON, message] of [
    ['{}', /Missing include parameter COLOR/],
    ['{"COLOR":"red","TYPO":""}', /Unused include parameter TYPO/],
    ['{"COLOR":3}', /single-line strings/],
    ['{"COLOR":"red\\nblue"}', /single-line strings/],
    ['{invalid}', /Invalid include parameters/]
  ]) {
    write('root.css', '/* @include ' + file('fragment.css') + ' ' + argumentsJSON + ' */\n');
    assert.throws(() => readSource(file('root.css')), message);
  }
  write('root.css', '/* @include ' + file('fragment.css') + ' {"COLOR":"var(--primary-text-color)","IMPORTANT":" !important"} */\n');
  assert.equal(readSource(file('root.css')), 'color: var(--primary-text-color) !important;\n');
  write('root.css', '.a { /* @include ' + file('fragment.css') + ' */ }\n');
  assert.throws(() => readSource(file('root.css')), /Malformed source directive/);
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
