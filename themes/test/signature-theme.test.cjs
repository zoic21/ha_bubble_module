const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const YAML = require('yaml');

const document = YAML.parseDocument(fs.readFileSync(path.join(__dirname, '../signature.yaml'), 'utf8'));
const {Signature: theme} = document.toJS();

test('both theme modes have complete, non-circular CSS variable references', () => {
  assert.deepEqual(document.errors, []);
  assert.deepEqual(Object.keys(theme.modes).sort(), ['dark', 'light']);
  for (const mode of Object.values(theme.modes)) {
    const variables = {...theme, ...mode};
    delete variables.modes;
    const visited = new Set();
    const visit = (key, ancestors = new Set()) => {
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

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test('primary and secondary text retain readable contrast on both mode surfaces', () => {
  for (const [name, mode] of Object.entries(theme.modes)) {
    for (const textKey of ['primary-text-color', 'secondary-text-color']) {
      for (const surfaceKey of ['card-background-color', 'primary-background-color']) {
        const a = luminance(mode[textKey]), b = luminance(mode[surfaceKey]);
        const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        assert.ok(contrast >= 4.5, `${name}: ${textKey} on ${surfaceKey} has contrast ${contrast}`);
      }
    }
  }
});
