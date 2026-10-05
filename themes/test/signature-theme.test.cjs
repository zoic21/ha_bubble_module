const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const YAML = require('yaml');

const document = YAML.parseDocument(fs.readFileSync(path.join(__dirname, '../signature.yaml'), 'utf8'));
const {Signature: theme} = document.toJS();
const nativeVariables = new Set(['ha-card-background', 'card-background-color', 'primary-text-color']);

test('both theme modes have complete, non-circular CSS variable references', () => {
  assert.deepEqual(document.errors, []);
  assert.deepEqual(Object.keys(theme.modes).sort(), ['dark', 'light']);
  for (const mode of Object.values(theme.modes)) {
    const variables = {...theme, ...mode};
    delete variables.modes;
    const visited = new Set();
    const visit = (key, ancestors = new Set()) => {
      if (nativeVariables.has(key)) return;
      assert.ok(Object.hasOwn(variables, key), 'Undefined theme variable: ' + key);
      assert.ok(!ancestors.has(key), 'Circular theme variable: ' + key);
      if (visited.has(key)) return;
      const next = new Set(ancestors).add(key);
      for (const match of String(variables[key]).matchAll(/var\(--([a-z0-9-]+)/g)) visit(match[1], next);
      visited.add(key);
    };
    Object.keys(variables).forEach(key => visit(key));
  }
});

test('the theme preserves native colors and does not add global Bubble borders or shadows', () => {
  for (const variables of [theme, ...Object.values(theme.modes)]) {
    for (const key of Object.keys(variables)) {
      if (key.startsWith('signature-')) continue;
      assert.doesNotMatch(key, /(?:^|-)(?:color|background)(?:-|$)/, key);
      assert.ok(!['bubble-border', 'bubble-box-shadow'].includes(key), key);
    }
  }
  for (const mode of Object.values(theme.modes))
    assert.ok(Object.keys(mode).every(key => key.startsWith('signature-')));
});
